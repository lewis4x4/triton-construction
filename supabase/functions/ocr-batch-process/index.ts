// =============================================================================
// Edge Function: ocr-batch-process
// Purpose: Process multiple delivery tickets in batch with queued OCR
// Supports parallel processing with progress tracking
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchOCRRequest {
  documents: BatchDocument[];
  project_id: string;
  supplier_id?: string;
  batch_name?: string;
  priority?: 'low' | 'normal' | 'high';
  notify_on_complete?: boolean;
  created_by: string;
}

interface BatchDocument {
  document_url: string;
  document_type: 'DELIVERY_TICKET' | 'BATCH_TICKET' | 'ASPHALT_TICKET' | 'WEIGHT_TICKET';
  reference_number?: string;
  metadata?: Record<string, any>;
}

interface BatchJob {
  id: string;
  batch_name: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'PARTIAL' | 'FAILED';
  total_documents: number;
  processed_count: number;
  success_count: number;
  error_count: number;
  documents: BatchDocumentStatus[];
}

interface BatchDocumentStatus {
  id: string;
  document_url: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  ticket_id?: string;
  error_message?: string;
  processing_time_ms?: number;
  confidence?: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const request = await req.json() as BatchOCRRequest;

    if (!request.documents || request.documents.length === 0) {
      throw new Error('documents array is required and must not be empty');
    }

    if (!request.project_id || !request.created_by) {
      throw new Error('project_id and created_by are required');
    }

    if (request.documents.length > 50) {
      throw new Error('Maximum 50 documents per batch');
    }

    console.log(`Creating batch OCR job for ${request.documents.length} documents`);

    // Get organization from project
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('organization_id, name, project_number')
      .eq('id', request.project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${request.project_id}`);
    }

    // Create batch job record
    const batchName = request.batch_name || `Batch-${new Date().toISOString().slice(0, 10)}-${request.documents.length}`;

    const { data: batchJob, error: batchError } = await supabaseClient
      .from('ocr_batch_jobs')
      .insert({
        organization_id: project.organization_id,
        project_id: request.project_id,
        batch_name: batchName,
        status: 'PENDING',
        priority: request.priority || 'normal',
        total_documents: request.documents.length,
        processed_count: 0,
        success_count: 0,
        error_count: 0,
        notify_on_complete: request.notify_on_complete || false,
        created_by: request.created_by,
      })
      .select('id')
      .single();

    if (batchError || !batchJob) {
      throw new Error(`Failed to create batch job: ${batchError?.message}`);
    }

    const batchId = batchJob.id;

    // Create document queue entries
    const documentQueue = request.documents.map((doc, index) => ({
      batch_id: batchId,
      document_url: doc.document_url,
      document_type: doc.document_type,
      reference_number: doc.reference_number,
      sequence_number: index + 1,
      status: 'PENDING',
      project_id: request.project_id,
      supplier_id: request.supplier_id,
      metadata: doc.metadata,
    }));

    const { error: queueError } = await supabaseClient
      .from('ocr_queue')
      .insert(documentQueue);

    if (queueError) {
      // Cleanup batch job if queue insert fails
      await supabaseClient.from('ocr_batch_jobs').delete().eq('id', batchId);
      throw new Error(`Failed to queue documents: ${queueError.message}`);
    }

    // Update batch status to PROCESSING
    await supabaseClient
      .from('ocr_batch_jobs')
      .update({ status: 'PROCESSING', started_at: new Date().toISOString() })
      .eq('id', batchId);

    // Process documents in parallel (max 5 concurrent)
    const CONCURRENCY_LIMIT = 5;
    const results: BatchDocumentStatus[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Get all queued documents
    const { data: queuedDocs } = await supabaseClient
      .from('ocr_queue')
      .select('id, document_url, document_type, sequence_number')
      .eq('batch_id', batchId)
      .order('sequence_number');

    if (!queuedDocs) {
      throw new Error('Failed to retrieve queued documents');
    }

    // Process in batches of CONCURRENCY_LIMIT
    for (let i = 0; i < queuedDocs.length; i += CONCURRENCY_LIMIT) {
      const batch = queuedDocs.slice(i, i + CONCURRENCY_LIMIT);

      const batchPromises = batch.map(async (doc) => {
        const startTime = Date.now();
        let result: BatchDocumentStatus;

        try {
          // Mark as processing
          await supabaseClient
            .from('ocr_queue')
            .update({ status: 'PROCESSING', started_at: new Date().toISOString() })
            .eq('id', doc.id);

          // Call enhanced OCR function
          const ocrResponse = await fetch(`${supabaseUrl}/functions/v1/ocr-process-enhanced`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              document_url: doc.document_url,
              document_type: doc.document_type,
              project_id: request.project_id,
              supplier_id: request.supplier_id,
            }),
          });

          const ocrResult = await ocrResponse.json();
          const processingTime = Date.now() - startTime;

          if (ocrResult.success) {
            // Mark as complete
            await supabaseClient
              .from('ocr_queue')
              .update({
                status: 'COMPLETE',
                completed_at: new Date().toISOString(),
                ticket_id: ocrResult.ticket_id,
                ocr_confidence: ocrResult.overall_confidence,
                processing_time_ms: processingTime,
              })
              .eq('id', doc.id);

            result = {
              id: doc.id,
              document_url: doc.document_url,
              status: 'COMPLETE',
              ticket_id: ocrResult.ticket_id,
              confidence: ocrResult.overall_confidence,
              processing_time_ms: processingTime,
            };
            successCount++;
          } else {
            throw new Error(ocrResult.error || 'OCR processing failed');
          }
        } catch (error: any) {
          const processingTime = Date.now() - startTime;

          // Mark as failed
          await supabaseClient
            .from('ocr_queue')
            .update({
              status: 'FAILED',
              completed_at: new Date().toISOString(),
              error_message: error.message,
              processing_time_ms: processingTime,
            })
            .eq('id', doc.id);

          result = {
            id: doc.id,
            document_url: doc.document_url,
            status: 'FAILED',
            error_message: error.message,
            processing_time_ms: processingTime,
          };
          errorCount++;
        }

        // Update batch progress
        await supabaseClient
          .from('ocr_batch_jobs')
          .update({
            processed_count: successCount + errorCount,
            success_count: successCount,
            error_count: errorCount,
          })
          .eq('id', batchId);

        return result;
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      console.log(`Processed ${results.length}/${queuedDocs.length} documents`);
    }

    // Determine final status
    const finalStatus = errorCount === 0
      ? 'COMPLETE'
      : successCount === 0
        ? 'FAILED'
        : 'PARTIAL';

    // Update batch job with final status
    await supabaseClient
      .from('ocr_batch_jobs')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        processed_count: results.length,
        success_count: successCount,
        error_count: errorCount,
      })
      .eq('id', batchId);

    // Send notification if requested
    if (request.notify_on_complete) {
      await sendBatchCompleteNotification(
        supabaseClient,
        batchId,
        batchName,
        finalStatus,
        successCount,
        errorCount,
        request.created_by
      );
    }

    console.log(`Batch OCR complete: ${successCount} success, ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        batch_id: batchId,
        batch_name: batchName,
        status: finalStatus,
        total_documents: request.documents.length,
        processed_count: results.length,
        success_count: successCount,
        error_count: errorCount,
        documents: results,
        message: `Batch processing ${finalStatus.toLowerCase()}: ${successCount} successful, ${errorCount} failed`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Batch OCR error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

// Send completion notification
async function sendBatchCompleteNotification(
  supabase: any,
  batchId: string,
  batchName: string,
  status: string,
  successCount: number,
  errorCount: number,
  userId: string
): Promise<void> {
  try {
    const { data: user } = await supabase
      .from('user_profiles')
      .select('email, first_name')
      .eq('id', userId)
      .single();

    if (!user) return;

    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'BATCH_OCR_COMPLETE',
        title: `Batch OCR ${status === 'COMPLETE' ? 'Complete' : status === 'PARTIAL' ? 'Partial' : 'Failed'}`,
        message: `"${batchName}" processing finished: ${successCount} successful, ${errorCount} failed`,
        data: { batch_id: batchId, status, success_count: successCount, error_count: errorCount },
        read: false,
      });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
