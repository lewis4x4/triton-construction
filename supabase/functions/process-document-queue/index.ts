import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  DEFAULT_BATCH_SIZE: 10,
  MAX_BATCH_SIZE: 50,
  PROCESSING_TIMEOUT_MINUTES: 10,
  MAX_PROCESSING_ATTEMPTS: 3,
  RETRY_DELAYS_MS: [1000, 2000, 4000], // Exponential backoff
};

// ============================================================================
// Types
// ============================================================================

interface QueueRequest {
  documentIds?: string[];
  batchSize?: number;
  resetStuck?: boolean;
}

interface ProcessingResult {
  documentId: string;
  fileName?: string;
  documentType?: string;
  success: boolean;
  message: string;
  duration_ms?: number;
  extractedData?: Record<string, unknown>;
}

interface QueueResponse {
  message: string;
  success: number;
  failed: number;
  skipped: number;
  stuck_reset: number;
  results: ProcessingResult[];
  duration_ms: number;
}

// Helper function for sleeping
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  const startTime = Date.now();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const results: ProcessingResult[] = [];
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let stuckResetCount = 0;

  try {
    // Parse request
    let body: QueueRequest = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is OK - will process all pending
    }

    const batchSize = Math.min(
      body.batchSize || CONFIG.DEFAULT_BATCH_SIZE,
      CONFIG.MAX_BATCH_SIZE
    );

    // Create admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Step 1: Reset stuck documents if requested or by default
    if (body.resetStuck !== false) {
      try {
        const { data: resetDocs } = await supabase.rpc('reset_stuck_documents', {
          p_stuck_threshold_minutes: CONFIG.PROCESSING_TIMEOUT_MINUTES,
          p_max_attempts: CONFIG.MAX_PROCESSING_ATTEMPTS,
        });

        stuckResetCount = resetDocs?.length || 0;

        if (stuckResetCount > 0) {
          console.log(`Reset ${stuckResetCount} stuck documents`);
        }
      } catch (resetError) {
        // Function might not exist yet, continue without resetting
        console.log('reset_stuck_documents not available:', resetError);
      }
    }

    // Step 2: Claim documents atomically using SKIP LOCKED
    const workerId = crypto.randomUUID();
    let documentsToProcess: Array<{
      id: string;
      bid_project_id: string;
      file_path: string;
      file_name: string;
      document_type: string;
      mime_type: string;
      processing_attempts: number;
    }> = [];

    if (body.documentIds && body.documentIds.length > 0) {
      // Process specific documents
      const { data, error } = await supabase
        .from('bid_documents')
        .update({
          processing_status: 'PROCESSING',
          processing_started_at: new Date().toISOString(),
          processing_worker_id: workerId,
        })
        .in('id', body.documentIds)
        .eq('processing_status', 'PENDING')
        .select('id, bid_project_id, file_path, file_name, document_type, mime_type, processing_attempts');

      if (error) {
        throw new Error(`Failed to claim documents: ${error.message}`);
      }

      documentsToProcess = data || [];
    } else {
      // Try atomic claim function first
      try {
        const { data, error } = await supabase.rpc('claim_documents_for_processing', {
          p_batch_size: batchSize,
          p_worker_id: workerId,
        });

        if (error) throw error;
        documentsToProcess = data || [];
      } catch {
        // Fallback to regular query if function doesn't exist
        const { data, error } = await supabase
          .from('bid_documents')
          .select('id, bid_project_id, file_path, file_name, document_type, mime_type, processing_attempts')
          .eq('processing_status', 'PENDING')
          .order('created_at', { ascending: true })
          .limit(batchSize);

        if (error) {
          throw new Error(`Failed to fetch documents: ${error.message}`);
        }

        // Update claimed documents
        if (data && data.length > 0) {
          await supabase
            .from('bid_documents')
            .update({
              processing_status: 'PROCESSING',
              processing_started_at: new Date().toISOString(),
              processing_worker_id: workerId,
            })
            .in(
              'id',
              data.map((d) => d.id)
            );

          documentsToProcess = data;
        }
      }
    }

    if (documentsToProcess.length === 0) {
      const response: QueueResponse = {
        message: 'No pending documents to process',
        success: 0,
        failed: 0,
        skipped: 0,
        stuck_reset: stuckResetCount,
        results: [],
        duration_ms: Date.now() - startTime,
      };
      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${documentsToProcess.length} documents with worker ${workerId}`);

    // Step 3: Process each document
    for (const doc of documentsToProcess) {
      const docStartTime = Date.now();

      try {
        let result: ProcessingResult;

        // Process based on document type
        if (doc.document_type === 'BIDX') {
          // Route to parse-bidx - it handles file download internally
          result = await processBidxDocument(supabaseUrl, supabaseServiceKey, doc);
        } else if (doc.mime_type === 'application/pdf') {
          // Route to analyze-bid-document (AI analysis) with retry
          result = await analyzeDocumentWithRetry(supabaseUrl, supabaseServiceKey, doc);
        } else {
          // Other file types - mark as completed without processing
          result = {
            documentId: doc.id,
            fileName: doc.file_name,
            documentType: doc.document_type,
            success: true,
            message: 'Document stored successfully (no AI processing required)',
          };

          await supabase
            .from('bid_documents')
            .update({
              processing_status: 'COMPLETED',
              processing_completed_at: new Date().toISOString(),
              processing_worker_id: null,
            })
            .eq('id', doc.id);
        }

        result.duration_ms = Date.now() - docStartTime;
        results.push(result);

        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`Error processing document ${doc.id}:`, error);

        // Update document as failed
        const newAttempts = (doc.processing_attempts || 0) + 1;
        const newStatus = newAttempts >= CONFIG.MAX_PROCESSING_ATTEMPTS ? 'FAILED_PERMANENT' : 'FAILED';

        await supabase
          .from('bid_documents')
          .update({
            processing_status: newStatus,
            processing_error: error instanceof Error ? error.message : 'Unknown error',
            processing_attempts: newAttempts,
            processing_started_at: null,
            processing_worker_id: null,
            processing_completed_at: new Date().toISOString(),
          })
          .eq('id', doc.id);

        results.push({
          documentId: doc.id,
          fileName: doc.file_name,
          documentType: doc.document_type,
          success: false,
          message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration_ms: Date.now() - docStartTime,
        });

        failedCount++;
      }
    }

    const response: QueueResponse = {
      message: `Processed ${documentsToProcess.length} documents`,
      success: successCount,
      failed: failedCount,
      skipped: skippedCount,
      stuck_reset: stuckResetCount,
      results,
      duration_ms: Date.now() - startTime,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Queue processing error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'QUEUE_PROCESSING_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        results,
        duration_ms: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Document Processors
// ============================================================================

async function processBidxDocument(
  supabaseUrl: string,
  serviceKey: string,
  doc: { id: string; bid_project_id: string; file_name: string; document_type: string }
): Promise<ProcessingResult> {
  // Call parse-bidx function
  const response = await fetch(`${supabaseUrl}/functions/v1/parse-bidx`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      documentId: doc.id,
      bidProjectId: doc.bid_project_id,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    return {
      documentId: doc.id,
      fileName: doc.file_name,
      documentType: doc.document_type,
      success: false,
      message: result.message || result.error || 'Bidx parsing failed',
    };
  }

  return {
    documentId: doc.id,
    fileName: doc.file_name,
    documentType: doc.document_type,
    success: true,
    message: result.message || `Extracted ${result.data?.lineItemsCreated || 0} line items`,
    extractedData: result.data,
  };
}

async function analyzeDocumentWithRetry(
  supabaseUrl: string,
  serviceKey: string,
  doc: { id: string; bid_project_id: string; file_name: string; document_type: string }
): Promise<ProcessingResult> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= CONFIG.RETRY_DELAYS_MS.length; attempt++) {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/analyze-bid-document`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document_id: doc.id,
          analysis_type: 'FULL_EXTRACTION',
        }),
      });

      // Check for rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        console.log(`Rate limited, waiting ${retryAfter}s before retry ${attempt + 1}`);
        await sleep(retryAfter * 1000);
        continue;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Document analysis failed');
      }

      return {
        documentId: doc.id,
        fileName: doc.file_name,
        documentType: doc.document_type,
        success: true,
        message: `AI analysis completed: ${result.analysis?.key_findings?.length || 0} key findings`,
        extractedData: {
          summary: result.analysis?.summary,
          document_category: result.analysis?.document_category,
          key_findings_count: result.analysis?.key_findings?.length || 0,
          confidence_score: result.analysis?.confidence_score,
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error');

      if (attempt < CONFIG.RETRY_DELAYS_MS.length) {
        const delay = CONFIG.RETRY_DELAYS_MS[attempt];
        console.log(`Retry ${attempt + 1} for doc ${doc.id} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }

  return {
    documentId: doc.id,
    fileName: doc.file_name,
    documentType: doc.document_type,
    success: false,
    message: `AI analysis failed after retries: ${lastError?.message || 'Unknown error'}`,
  };
}
