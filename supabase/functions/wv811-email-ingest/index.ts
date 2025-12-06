import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * WV811 Email Ingest Edge Function
 *
 * Receives emails from SendGrid Inbound Parse webhook and stores them
 * for processing by the wv811-email-parse function.
 *
 * SendGrid webhook sends multipart/form-data with:
 * - from: Sender email
 * - to: Recipient email
 * - subject: Email subject
 * - text: Plain text body
 * - html: HTML body
 * - headers: Raw headers
 * - envelope: JSON envelope data
 * - attachments: Attachment count
 * - attachment-info: JSON info about attachments
 * - attachment1, attachment2, etc: Actual attachments
 */

interface SendGridInboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  headers: string;
  envelope: string;
  attachments?: string;
  'attachment-info'?: string;
  SPF?: string;
  dkim?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Parse the multipart form data from SendGrid
    const formData = await req.formData();

    // Extract email fields
    const from = formData.get('from') as string;
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const text = formData.get('text') as string;
    const html = formData.get('html') as string;
    const headers = formData.get('headers') as string;
    const envelope = formData.get('envelope') as string;

    // Log for debugging
    console.log('Received email ingest:', {
      from,
      to,
      subject: subject?.substring(0, 100),
    });

    // Validate required fields
    if (!from || !to) {
      console.error('Missing required fields: from or to');
      return new Response(
        JSON.stringify({ error: 'Missing required email fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine organization from recipient email
    // Expected format: tickets@{org-slug}.triton.app or similar
    // For now, we'll look up based on a configured email address
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .limit(1)
      .single();

    if (orgError || !orgData) {
      console.error('Could not determine organization:', orgError);
      // Still accept the email but log the issue
    }

    const organizationId = orgData?.id;

    // Parse headers into JSON
    let parsedHeaders: Record<string, string> = {};
    if (headers) {
      try {
        const headerLines = headers.split('\n');
        for (const line of headerLines) {
          const colonIndex = line.indexOf(':');
          if (colonIndex > 0) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            parsedHeaders[key] = value;
          }
        }
      } catch (e) {
        console.error('Error parsing headers:', e);
      }
    }

    // Extract SendGrid message ID from headers
    const sendgridMessageId = parsedHeaders['X-SendGrid-Message-Id'] ||
                              parsedHeaders['Message-ID'] ||
                              null;

    // Handle attachments - store paths for later retrieval
    const attachmentPaths: string[] = [];
    const attachmentCount = parseInt(formData.get('attachments') as string || '0', 10);

    if (attachmentCount > 0) {
      const attachmentInfo = formData.get('attachment-info');
      if (attachmentInfo) {
        try {
          const info = JSON.parse(attachmentInfo as string);
          // Store attachment info for later processing
          // Actual file storage would happen here if needed
          console.log('Attachment info:', info);
        } catch (e) {
          console.error('Error parsing attachment info:', e);
        }
      }
    }

    // Insert the email ingest record
    const { data: ingestData, error: insertError } = await supabaseAdmin
      .from('wv811_email_ingests')
      .insert({
        organization_id: organizationId,
        from_email: from,
        to_email: to,
        subject: subject,
        raw_body_text: text,
        raw_body_html: html,
        raw_headers: parsedHeaders,
        attachment_paths: attachmentPaths.length > 0 ? attachmentPaths : null,
        status: 'PENDING',
        sendgrid_message_id: sendgridMessageId,
        received_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error inserting email ingest:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to store email', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email ingest stored successfully:', ingestData.id);

    // Trigger the parse function asynchronously
    // This can be done via pg_notify or by directly calling the parse function
    try {
      const parseUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/wv811-email-parse`;
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      // Fire and forget - don't wait for parsing
      fetch(parseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ emailIngestId: ingestData.id }),
      }).catch(e => console.error('Error triggering parse:', e));
    } catch (e) {
      console.error('Error triggering parse function:', e);
      // Don't fail the ingest if parse trigger fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        ingestId: ingestData.id,
        message: 'Email received and queued for processing'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email ingest error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
