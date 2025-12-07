import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Email Send Edge Function
 *
 * Centralized email sending service using Resend API.
 * All outbound emails from the platform go through this function.
 *
 * Required Environment Variables:
 * - RESEND_API_KEY: Your Resend API key
 * - EMAIL_FROM_ADDRESS: Default from address (e.g., "alerts@triton.app")
 * - EMAIL_FROM_NAME: Default from name (e.g., "Triton AI")
 *
 * Supports:
 * - Plain text emails
 * - HTML emails
 * - Multiple recipients (to, cc, bcc)
 * - Reply-to addresses
 * - Tags for categorization
 * - Email logging for audit trail
 */

interface EmailRequest {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  tags?: { name: string; value: string }[];
  // Metadata for logging
  category?: string; // 'ALERT', 'DAILY_RADAR', 'NOTIFICATION', 'TRANSACTIONAL'
  relatedEntityType?: string; // 'TICKET', 'PROJECT', 'USER'
  relatedEntityId?: string;
  userId?: string;
  organizationId?: string;
}

interface ResendResponse {
  id: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const defaultFromAddress = Deno.env.get('EMAIL_FROM_ADDRESS') || 'blewis@lewisinsurance.com';
    const defaultFromName = Deno.env.get('EMAIL_FROM_NAME') || 'Triton AI Platform';

    const emailRequest: EmailRequest = await req.json();

    // Validate required fields
    if (!emailRequest.to) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: to' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!emailRequest.subject) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: subject' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!emailRequest.text && !emailRequest.html) {
      return new Response(
        JSON.stringify({ error: 'Must provide either text or html content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Resend payload
    const fromAddress = emailRequest.from || defaultFromAddress;
    const fromName = emailRequest.fromName || defaultFromName;

    const resendPayload: Record<string, unknown> = {
      from: `${fromName} <${fromAddress}>`,
      to: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to],
      subject: emailRequest.subject,
    };

    if (emailRequest.text) {
      resendPayload.text = emailRequest.text;
    }

    if (emailRequest.html) {
      resendPayload.html = emailRequest.html;
    }

    if (emailRequest.replyTo) {
      resendPayload.reply_to = emailRequest.replyTo;
    }

    if (emailRequest.cc) {
      resendPayload.cc = Array.isArray(emailRequest.cc) ? emailRequest.cc : [emailRequest.cc];
    }

    if (emailRequest.bcc) {
      resendPayload.bcc = Array.isArray(emailRequest.bcc) ? emailRequest.bcc : [emailRequest.bcc];
    }

    if (emailRequest.tags && emailRequest.tags.length > 0) {
      resendPayload.tags = emailRequest.tags;
    }

    // Send via Resend API
    console.log(`Sending email to ${emailRequest.to}: ${emailRequest.subject}`);

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify(resendPayload),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);
      return new Response(
        JSON.stringify({
          error: 'Failed to send email',
          details: resendResult
        }),
        { status: resendResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailId = (resendResult as ResendResponse).id;
    console.log(`Email sent successfully. Resend ID: ${emailId}`);

    // Log email to database for audit trail
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL');
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey);

        await supabase.from('email_logs').insert({
          resend_id: emailId,
          to_addresses: Array.isArray(emailRequest.to) ? emailRequest.to : [emailRequest.to],
          from_address: fromAddress,
          subject: emailRequest.subject,
          category: emailRequest.category || 'GENERAL',
          related_entity_type: emailRequest.relatedEntityType,
          related_entity_id: emailRequest.relatedEntityId,
          user_id: emailRequest.userId,
          organization_id: emailRequest.organizationId,
          status: 'SENT',
          sent_at: new Date().toISOString(),
        });
      }
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log email:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: emailId,
        message: 'Email sent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Email send error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to send email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
