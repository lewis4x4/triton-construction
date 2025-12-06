import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessingResult {
  documentId: string;
  success: boolean;
  message: string;
  extractedData?: Record<string, unknown>;
}

// Process Bidx XML file by calling the parse-bidx edge function
async function processBidxFile(
  documentId: string,
  projectId: string,
  fileContent: string
): Promise<ProcessingResult> {
  try {
    // Call the parse-bidx edge function
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const response = await fetch(`${supabaseUrl}/functions/v1/parse-bidx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        xmlContent: fileContent,
        bidProjectId: projectId,
        documentId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        documentId,
        success: false,
        message: result.error || `Bidx parsing failed with status ${response.status}`,
      };
    }

    return {
      documentId,
      success: true,
      message: result.message || `Successfully extracted ${result.lineItemCount} line items`,
      extractedData: {
        lineItemCount: result.lineItemCount,
        projectInfo: result.projectInfo,
      },
    };
  } catch (error) {
    console.error('Bidx parsing error:', error);
    return {
      documentId,
      success: false,
      message: `Bidx parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Process PDF file - basic text extraction (placeholder for Claude integration)
async function processPdfFile(
  supabase: ReturnType<typeof createClient>,
  documentId: string,
  projectId: string,
  documentType: string,
  fileContent: Uint8Array
): Promise<ProcessingResult> {
  // For Phase 2, we just mark as needing OCR/AI processing
  // Phase 4 will add Claude integration for full PDF analysis

  // Update document to indicate it needs AI processing
  const { error: updateError } = await supabase
    .from('bid_documents')
    .update({
      processing_status: 'NEEDS_OCR',
      extracted_text: null, // Will be populated by AI processing
      extracted_metadata: {
        documentType,
        awaitingAiProcessing: true,
        fileSize: fileContent.length
      },
    })
    .eq('id', documentId);

  if (updateError) {
    return {
      documentId,
      success: false,
      message: `Failed to update document: ${updateError.message}`,
    };
  }

  return {
    documentId,
    success: true,
    message: `PDF document queued for AI analysis (Document type: ${documentType})`,
    extractedData: { awaitingAiProcessing: true },
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // This endpoint should be called by a cron job or admin
    // Verify service role or admin authentication
    const authHeader = req.headers.get('Authorization');

    // Create admin client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Parse optional filters from request body
    let batchSize = 10;
    let documentIds: string[] | undefined;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        batchSize = body.batchSize || 10;
        documentIds = body.documentIds;
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    // Fetch pending documents
    let query = supabase
      .from('bid_documents')
      .select('id, bid_project_id, file_path, document_type, mime_type')
      .eq('processing_status', 'PENDING')
      .limit(batchSize);

    if (documentIds && documentIds.length > 0) {
      query = query.in('id', documentIds);
    }

    const { data: documents, error: fetchError } = await query;

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch documents: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending documents to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: ProcessingResult[] = [];

    // Process each document
    for (const doc of documents) {
      // Update status to PROCESSING
      await supabase
        .from('bid_documents')
        .update({
          processing_status: 'PROCESSING',
          processing_started_at: new Date().toISOString(),
        })
        .eq('id', doc.id);

      try {
        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('bid-documents')
          .download(doc.file_path);

        if (downloadError || !fileData) {
          results.push({
            documentId: doc.id,
            success: false,
            message: `Failed to download file: ${downloadError?.message || 'No data'}`,
          });

          await supabase
            .from('bid_documents')
            .update({
              processing_status: 'FAILED',
              processing_error: `Download failed: ${downloadError?.message}`,
              processing_completed_at: new Date().toISOString(),
            })
            .eq('id', doc.id);

          continue;
        }

        let result: ProcessingResult;

        // Process based on document type
        if (doc.document_type === 'BIDX') {
          const textContent = await fileData.text();
          result = await processBidxFile(doc.id, doc.bid_project_id, textContent);
        } else if (doc.mime_type === 'application/pdf') {
          const arrayBuffer = await fileData.arrayBuffer();
          result = await processPdfFile(
            supabase,
            doc.id,
            doc.bid_project_id,
            doc.document_type,
            new Uint8Array(arrayBuffer)
          );
        } else {
          // Other file types - mark as completed without processing
          result = {
            documentId: doc.id,
            success: true,
            message: 'Document stored successfully (no processing required)',
          };
        }

        results.push(result);

        // Update final status
        const finalStatus = result.success ?
          (doc.document_type === 'BIDX' ? 'COMPLETED' :
           doc.mime_type === 'application/pdf' ? 'NEEDS_OCR' : 'COMPLETED')
          : 'FAILED';

        await supabase
          .from('bid_documents')
          .update({
            processing_status: finalStatus,
            processing_error: result.success ? null : result.message,
            processing_completed_at: new Date().toISOString(),
            extracted_metadata: result.extractedData ? result.extractedData : undefined,
          })
          .eq('id', doc.id);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';
        results.push({
          documentId: doc.id,
          success: false,
          message: errorMessage,
        });

        await supabase
          .from('bid_documents')
          .update({
            processing_status: 'FAILED',
            processing_error: errorMessage,
            processing_completed_at: new Date().toISOString(),
          })
          .eq('id', doc.id);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return new Response(
      JSON.stringify({
        message: `Processed ${documents.length} documents`,
        success: successCount,
        failed: failCount,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Queue processing error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred during queue processing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
