// =============================================================================
// Edge Function: send-push-notification
// Purpose: Send FCM push notifications to mobile devices
// Supports: Firebase Cloud Messaging (FCM) HTTP v1 API
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// FCM Configuration
const FCM_PROJECT_ID = Deno.env.get('FCM_PROJECT_ID') || '';
const FCM_PRIVATE_KEY = Deno.env.get('FCM_PRIVATE_KEY')?.replace(/\\n/g, '\n') || '';
const FCM_CLIENT_EMAIL = Deno.env.get('FCM_CLIENT_EMAIL') || '';

interface PushNotificationRequest {
  // Target - must provide one of these
  tokens?: string[];           // Specific FCM tokens
  user_ids?: string[];         // Fetch tokens for these users
  organization_id?: string;    // Broadcast to org (requires notification_type)

  // Notification content
  title: string;
  body: string;
  notification_type: 'high_risk_proximity' | 'general_alert' | 'system' | 'safety' | 'ticket_update';

  // Optional data payload
  data?: Record<string, string>;

  // Related entities for logging
  related_ticket_id?: string;
  related_alert_id?: string;

  // Notification options
  priority?: 'high' | 'normal';
  sound?: boolean;
  badge?: number;

  // Android specific
  android_channel_id?: string;
}

interface FCMMessage {
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
    };
    data?: Record<string, string>;
    android?: {
      priority: string;
      notification: {
        channel_id?: string;
        sound?: string;
        default_sound?: boolean;
      };
    };
    apns?: {
      payload: {
        aps: {
          sound?: string;
          badge?: number;
          'content-available'?: number;
        };
      };
    };
  };
}

interface SendResult {
  token: string;
  success: boolean;
  message_id?: string;
  error?: string;
}

// =============================================================================
// JWT Generation for FCM Authentication
// =============================================================================

async function generateJWT(): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: FCM_CLIENT_EMAIL,
    sub: FCM_CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(encoder.encode(JSON.stringify(payload)));

  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import the private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(FCM_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(signatureInput)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  return `${signatureInput}.${signatureB64}`;
}

function base64UrlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const lines = pem.split('\n');
  const base64 = lines
    .filter(line => !line.startsWith('-----'))
    .join('');
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

async function getAccessToken(): Promise<string> {
  const jwt = await generateJWT();

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// =============================================================================
// FCM Send Function
// =============================================================================

async function sendFCMNotification(
  accessToken: string,
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  options?: {
    priority?: 'high' | 'normal';
    sound?: boolean;
    badge?: number;
    android_channel_id?: string;
  }
): Promise<SendResult> {
  const message: FCMMessage = {
    message: {
      token,
      notification: { title, body },
      android: {
        priority: options?.priority === 'high' ? 'HIGH' : 'NORMAL',
        notification: {
          channel_id: options?.android_channel_id || 'default',
          default_sound: options?.sound !== false,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: options?.sound !== false ? 'default' : undefined,
            badge: options?.badge,
            'content-available': 1,
          },
        },
      },
    },
  };

  if (data) {
    // FCM data must be string values
    message.message.data = Object.fromEntries(
      Object.entries(data).map(([k, v]) => [k, String(v)])
    );
  }

  try {
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      const errorCode = error.error?.details?.[0]?.errorCode || error.error?.code;

      // Handle specific FCM errors
      if (errorCode === 'UNREGISTERED' || errorCode === 'INVALID_ARGUMENT') {
        return { token, success: false, error: 'INVALID_TOKEN' };
      }

      return { token, success: false, error: error.error?.message || 'Unknown FCM error' };
    }

    const result = await response.json();
    return { token, success: true, message_id: result.name };
  } catch (error) {
    return { token, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================================================
// Main Handler
// =============================================================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Validate FCM configuration
    if (!FCM_PROJECT_ID || !FCM_PRIVATE_KEY || !FCM_CLIENT_EMAIL) {
      console.error('FCM configuration missing. Required: FCM_PROJECT_ID, FCM_PRIVATE_KEY, FCM_CLIENT_EMAIL');
      return new Response(
        JSON.stringify({
          error: 'FCM not configured',
          details: 'Firebase Cloud Messaging credentials not set up. See documentation for setup instructions.'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: PushNotificationRequest = await req.json();
    const {
      tokens: directTokens,
      user_ids,
      organization_id,
      title,
      body: notificationBody,
      notification_type,
      data,
      related_ticket_id,
      related_alert_id,
      priority = 'normal',
      sound = true,
      badge,
      android_channel_id,
    } = body;

    if (!title || !notificationBody) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Collect tokens to send to
    let tokensToSend: Array<{ token: string; user_id: string; token_id: string }> = [];

    if (directTokens && directTokens.length > 0) {
      // Direct tokens provided - lookup user info
      const { data: tokenRecords } = await supabase
        .from('user_push_tokens')
        .select('id, user_id, push_token')
        .in('push_token', directTokens)
        .eq('is_active', true);

      tokensToSend = (tokenRecords || []).map(t => ({
        token: t.push_token,
        user_id: t.user_id,
        token_id: t.id,
      }));
    } else if (user_ids && user_ids.length > 0) {
      // Fetch tokens for specific users
      const { data: userTokens } = await supabase
        .from('user_push_tokens')
        .select('id, user_id, push_token, high_risk_alerts_enabled, general_alerts_enabled')
        .in('user_id', user_ids)
        .eq('is_active', true)
        .eq('provider', 'fcm');

      // Filter by notification type preferences
      tokensToSend = (userTokens || [])
        .filter(t => {
          if (notification_type === 'high_risk_proximity') {
            return t.high_risk_alerts_enabled !== false;
          }
          return t.general_alerts_enabled !== false;
        })
        .map(t => ({
          token: t.push_token,
          user_id: t.user_id,
          token_id: t.id,
        }));
    } else if (organization_id) {
      // Broadcast to organization
      const { data: orgTokens } = await supabase.rpc('get_organization_push_tokens', {
        p_organization_id: organization_id,
        p_notification_type: notification_type,
      });

      tokensToSend = (orgTokens || []).map((t: { user_id: string; push_token: string }) => ({
        token: t.push_token,
        user_id: t.user_id,
        token_id: '', // Will need to lookup if logging
      }));
    }

    if (tokensToSend.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          sent: 0,
          message: 'No active tokens found for the specified targets'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending push notification to ${tokensToSend.length} tokens`);

    // Get FCM access token
    const accessToken = await getAccessToken();

    // Send notifications
    const results: SendResult[] = [];
    const invalidTokens: string[] = [];

    for (const { token, user_id, token_id } of tokensToSend) {
      const result = await sendFCMNotification(
        accessToken,
        token,
        title,
        notificationBody,
        data,
        { priority, sound, badge, android_channel_id }
      );

      results.push(result);

      // Log the notification
      await supabase.from('push_notification_logs').insert({
        user_id,
        push_token_id: token_id || null,
        title,
        body: notificationBody,
        notification_type,
        data,
        related_ticket_id,
        related_alert_id,
        status: result.success ? 'sent' : 'failed',
        fcm_message_id: result.message_id,
        error_message: result.error,
        sent_at: result.success ? new Date().toISOString() : null,
      });

      // Track invalid tokens for deactivation
      if (result.error === 'INVALID_TOKEN') {
        invalidTokens.push(token);
      }
    }

    // Deactivate invalid tokens
    if (invalidTokens.length > 0) {
      await supabase
        .from('user_push_tokens')
        .update({ is_active: false })
        .in('push_token', invalidTokens);

      console.log(`Deactivated ${invalidTokens.length} invalid tokens`);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Push notification results: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failureCount,
        invalid_tokens_removed: invalidTokens.length,
        results: results.map(r => ({
          success: r.success,
          message_id: r.message_id,
          error: r.error,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Push notification error:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
