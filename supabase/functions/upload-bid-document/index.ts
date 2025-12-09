import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Allowed document types and their expected MIME types
const DOCUMENT_TYPE_MIME_MAP: Record<string, string[]> = {
  PROPOSAL: ['application/pdf'],
  BIDX: ['application/xml', 'text/xml'],
  PLANS: ['application/pdf', 'image/tiff'],
  EXISTING_PLANS: ['application/pdf', 'image/tiff'],
  SPECIAL_PROVISIONS: ['application/pdf'],
  ENVIRONMENTAL: ['application/pdf'],
  ASBESTOS: ['application/pdf'],
  HAZMAT: ['application/pdf'],
  GEOTECHNICAL: ['application/pdf'],
  TRAFFIC_STUDY: ['application/pdf'],
  ADDENDUM: ['application/pdf'],
  OTHER: ['application/pdf', 'application/xml', 'text/xml', 'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'image/png', 'image/jpeg', 'image/tiff'],
};

interface UploadRequest {
  bidProjectId: string;
  documentType: string;
  fileName: string;
  fileContent: string; // Base64 encoded
  mimeType: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Create admin client for storage operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { bidProjectId, documentType, fileName, fileContent, mimeType }: UploadRequest = await req.json();

    // Validate required fields
    if (!bidProjectId || !documentType || !fileName || !fileContent || !mimeType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: bidProjectId, documentType, fileName, fileContent, mimeType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate document type
    if (!DOCUMENT_TYPE_MIME_MAP[documentType]) {
      return new Response(
        JSON.stringify({ error: `Invalid document type: ${documentType}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate MIME type for document type
    const allowedMimes = DOCUMENT_TYPE_MIME_MAP[documentType];
    if (!allowedMimes.includes(mimeType)) {
      return new Response(
        JSON.stringify({ error: `Invalid MIME type ${mimeType} for document type ${documentType}. Allowed: ${allowedMimes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to the bid project (RLS will handle this)
    const { data: project, error: projectError } = await supabaseClient
      .from('bid_projects')
      .select('id, organization_id')
      .eq('id', bidProjectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Bid project not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode base64 file content
    const binaryContent = Uint8Array.from(atob(fileContent), c => c.charCodeAt(0));
    const fileSize = binaryContent.length;

    // Validate file size (100MB max)
    if (fileSize > 104857600) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 100MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique file path: {project_id}/{timestamp}_{sanitized_filename}
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${bidProjectId}/${timestamp}_${sanitizedFileName}`;

    // Upload to storage bucket
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from('bid-documents')
      .upload(filePath, binaryContent, {
        contentType: mimeType,
        upsert: false,
      });

    if (storageError) {
      console.error('Storage upload error:', storageError);
      return new Response(
        JSON.stringify({ error: `Storage upload failed: ${storageError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create bid_documents record
    const { data: document, error: docError } = await supabaseAdmin
      .from('bid_documents')
      .insert({
        bid_project_id: bidProjectId,
        file_name: fileName,
        file_path: storageData.path,
        file_size_bytes: fileSize,
        mime_type: mimeType,
        document_type: documentType,
        processing_status: 'PENDING',
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (docError) {
      // Rollback: delete the uploaded file
      await supabaseAdmin.storage.from('bid-documents').remove([storageData.path]);

      console.error('Document record creation error:', docError);
      return new Response(
        JSON.stringify({ error: `Failed to create document record: ${docError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auto-trigger document processing (async - don't wait for completion)
    let processingTriggered = false;
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

      // Fire and forget - call process-document-queue for this document
      fetch(`${supabaseUrl}/functions/v1/process-document-queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          documentIds: [document.id],
          batchSize: 1,
        }),
      }).catch((err) => {
        console.error('Auto-processing trigger failed (non-blocking):', err);
      });

      processingTriggered = true;
    } catch (triggerErr) {
      // Don't fail upload if auto-processing trigger fails
      console.error('Failed to trigger auto-processing:', triggerErr);
    }

    // Return success with document info
    return new Response(
      JSON.stringify({
        success: true,
        document: {
          id: document.id,
          fileName: document.file_name,
          filePath: document.file_path,
          documentType: document.document_type,
          processingStatus: document.processing_status,
          createdAt: document.created_at,
        },
        processingTriggered,
        message: processingTriggered
          ? 'Document uploaded successfully. AI processing has been triggered.'
          : 'Document uploaded successfully. Processing will begin shortly.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred during upload' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
