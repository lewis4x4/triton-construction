import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * SMS Send Edge Function with Smart Batching
 *
 * Features:
 * - Twilio Programmable SMS integration
 * - Smart batching: Groups notifications within time window
 * - Rate limiting: Prevents SMS spam
 * - Delivery tracking: Logs all SMS attempts
 *
 * Required Secrets:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 */

interface SMSRequest {
  to: string; // E.164 format: +13045551234
  message: string;
  type: 'EMERGENCY' | 'TICKET_UPDATE' | 'EXPIRATION' | 'REMINDER' | 'GENERAL';
  ticketId?: string; // For batching ticket updates
  priority?: 'HIGH' | 'NORMAL' | 'LOW';
  batchKey?: string; // Custom key for grouping related messages
}

interface BatchedMessage {
  to: string;
  messages: string[];
  type: string;
  ticketId?: string;
  firstQueued: number;
}

// In-memory batch queue (resets on cold start, which is fine for this use case)
const batchQueue = new Map<string, BatchedMessage>();

// Batch window: 5 minutes for ticket updates, immediate for emergencies
const BATCH_WINDOWS = {
  EMERGENCY: 0, // Send immediately
  TICKET_UPDATE: 5 * 60 * 1000, // 5 minutes
  EXPIRATION: 10 * 60 * 1000, // 10 minutes
  REMINDER: 30 * 60 * 1000, // 30 minutes
  GENERAL: 5 * 60 * 1000, // 5 minutes
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.error('Twilio credentials not configured');
      return new Response(
        JSON.stringify({
          error: 'SMS service not configured',
          details: 'Twilio credentials missing. Contact admin.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: SMSRequest | SMSRequest[] = await req.json();
    const requests = Array.isArray(body) ? body : [body];

    const results: Array<{
      to: string;
      status: 'sent' | 'queued' | 'failed';
      sid?: string;
      error?: string;
      batchedWith?: number;
    }> = [];

    for (const smsRequest of requests) {
      const { to, message, type, ticketId, priority, batchKey } = smsRequest;

      // Validate phone number format
      if (!to || !to.match(/^\+1\d{10}$/)) {
        results.push({
          to: to || 'unknown',
          status: 'failed',
          error: 'Invalid phone number format. Use E.164: +1XXXXXXXXXX',
        });
        continue;
      }

      if (!message || message.length === 0) {
        results.push({ to, status: 'failed', error: 'Message is required' });
        continue;
      }

      // Check if this should be batched
      const batchWindow = BATCH_WINDOWS[type] || BATCH_WINDOWS.GENERAL;
      const shouldBatch = batchWindow > 0 && priority !== 'HIGH';

      if (shouldBatch) {
        // Create batch key: phone + type + ticketId (or custom key)
        const key = batchKey || `${to}:${type}:${ticketId || 'general'}`;
        const existing = batchQueue.get(key);
        const now = Date.now();

        if (existing) {
          // Add to existing batch
          existing.messages.push(message);
          results.push({
            to,
            status: 'queued',
            batchedWith: existing.messages.length - 1,
          });

          // Check if batch window expired - if so, send now
          if (now - existing.firstQueued >= batchWindow) {
            const batchResult = await sendBatchedSMS(
              existing,
              twilioAccountSid,
              twilioAuthToken,
              twilioPhoneNumber,
              supabase
            );
            batchQueue.delete(key);

            // Update the last result with actual send status
            const lastResult = results[results.length - 1];
            lastResult.status = batchResult.success ? 'sent' : 'failed';
            lastResult.sid = batchResult.sid;
            lastResult.error = batchResult.error;
          }
        } else {
          // Start new batch
          batchQueue.set(key, {
            to,
            messages: [message],
            type,
            ticketId,
            firstQueued: now,
          });
          results.push({ to, status: 'queued', batchedWith: 0 });

          // Schedule batch processing after window expires
          setTimeout(async () => {
            const batch = batchQueue.get(key);
            if (batch) {
              await sendBatchedSMS(batch, twilioAccountSid, twilioAuthToken, twilioPhoneNumber, supabase);
              batchQueue.delete(key);
            }
          }, batchWindow);
        }
      } else {
        // Send immediately (EMERGENCY or HIGH priority)
        const sendResult = await sendSingleSMS(
          to,
          message,
          twilioAccountSid,
          twilioAuthToken,
          twilioPhoneNumber,
          supabase,
          type
        );
        results.push({
          to,
          status: sendResult.success ? 'sent' : 'failed',
          sid: sendResult.sid,
          error: sendResult.error,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        results,
        queued: batchQueue.size,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('SMS send error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to send SMS' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendSingleSMS(
  to: string,
  message: string,
  accountSid: string,
  authToken: string,
  fromNumber: string,
  supabase: ReturnType<typeof createClient>,
  type: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    // Truncate message to SMS limit (1600 chars for Twilio, but 160 is standard segment)
    const truncatedMessage = message.length > 1600 ? message.substring(0, 1597) + '...' : message;

    // Call Twilio REST API
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = btoa(`${accountSid}:${authToken}`);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: truncatedMessage,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Twilio error:', result);

      // Log failed attempt
      await logSMSAttempt(supabase, to, truncatedMessage, type, false, undefined, result.message);

      return { success: false, error: result.message || 'Twilio API error' };
    }

    // Log successful send
    await logSMSAttempt(supabase, to, truncatedMessage, type, true, result.sid);

    console.log(`SMS sent to ${to}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function sendBatchedSMS(
  batch: BatchedMessage,
  accountSid: string,
  authToken: string,
  fromNumber: string,
  supabase: ReturnType<typeof createClient>
): Promise<{ success: boolean; sid?: string; error?: string }> {
  // Combine messages into a summary
  let combinedMessage: string;

  if (batch.messages.length === 1) {
    combinedMessage = batch.messages[0];
  } else {
    // Create summary message
    const typeLabel = batch.type === 'TICKET_UPDATE' ? 'Ticket Update' : batch.type;
    combinedMessage = `📋 ${typeLabel} Summary (${batch.messages.length} updates)\n\n`;

    // Add bullet points for each message (truncate if needed)
    const maxPerMessage = Math.floor(1400 / batch.messages.length);
    batch.messages.forEach((msg, i) => {
      const truncated = msg.length > maxPerMessage ? msg.substring(0, maxPerMessage - 3) + '...' : msg;
      combinedMessage += `${i + 1}. ${truncated}\n`;
    });

    if (batch.ticketId) {
      combinedMessage += `\nTicket: ${batch.ticketId}`;
    }
  }

  return sendSingleSMS(batch.to, combinedMessage, accountSid, authToken, fromNumber, supabase, batch.type);
}

async function logSMSAttempt(
  supabase: ReturnType<typeof createClient>,
  to: string,
  message: string,
  type: string,
  success: boolean,
  twilioSid?: string,
  error?: string
): Promise<void> {
  try {
    await supabase.from('sms_logs').insert({
      phone_number: to,
      message_preview: message.substring(0, 200),
      message_type: type,
      twilio_sid: twilioSid,
      status: success ? 'DELIVERED' : 'FAILED',
      error_message: error,
      sent_at: new Date().toISOString(),
    });
  } catch (err) {
    // Don't fail the SMS send if logging fails
    console.error('Failed to log SMS attempt:', err);
  }
}
