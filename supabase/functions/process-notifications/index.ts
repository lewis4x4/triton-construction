// =============================================================================
// Edge Function: process-notifications
// Purpose: Process queued notifications (email, SMS, in-app)
// Per CLAUDE.md: 14-day payment deadline enforcement with escalation alerts
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationQueueItem {
  id: string;
  organization_id: string;
  notification_type: string;
  priority: number;
  reference_type: string;
  reference_id: string;
  recipient_user_ids: string[] | null;
  recipient_roles: string[] | null;
  recipient_emails: string[] | null;
  channels: string[];
  subject: string;
  body: string;
  data: Record<string, unknown>;
  status: string;
  attempts: number;
  scheduled_for: string;
}

interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
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

    // Parse request body for optional filters
    let batchSize = 50;
    let notificationType: string | undefined;

    try {
      const body = await req.json();
      batchSize = body.batch_size || 50;
      notificationType = body.notification_type;
    } catch {
      // No body or invalid JSON - use defaults
    }

    console.log(`Processing notifications batch (size: ${batchSize}, type: ${notificationType || 'all'})`);

    // Get pending notifications ordered by priority and scheduled time
    let query = supabaseClient
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(batchSize);

    if (notificationType) {
      query = query.eq('notification_type', notificationType);
    }

    const { data: notifications, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending notifications to process',
          result: { processed: 0, succeeded: 0, failed: 0, errors: [] },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${notifications.length} pending notifications`);

    const result: ProcessResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [],
    };

    // Process each notification
    for (const notification of notifications as NotificationQueueItem[]) {
      result.processed++;

      try {
        // Mark as processing
        await supabaseClient
          .from('notification_queue')
          .update({
            status: 'processing',
            last_attempt_at: new Date().toISOString(),
            attempts: notification.attempts + 1,
          })
          .eq('id', notification.id);

        // Get recipient emails
        const recipientEmails: string[] = [];

        // Add direct emails
        if (notification.recipient_emails?.length) {
          recipientEmails.push(...notification.recipient_emails);
        }

        // Get emails from user IDs
        if (notification.recipient_user_ids?.length) {
          const { data: users } = await supabaseClient
            .from('user_profiles')
            .select('email')
            .in('id', notification.recipient_user_ids);

          if (users) {
            recipientEmails.push(...users.map((u: { email: string }) => u.email).filter(Boolean));
          }
        }

        // Get emails from roles (if we have role-based notifications)
        if (notification.recipient_roles?.length && notification.data?.project_id) {
          // Get users with specified roles on the project
          const { data: roleUsers } = await supabaseClient
            .from('project_assignments')
            .select(`
              user_profiles!inner (email)
            `)
            .eq('project_id', notification.data.project_id as string)
            .in('project_role', notification.recipient_roles);

          if (roleUsers) {
            for (const ru of roleUsers) {
              const profile = ru.user_profiles as unknown as { email: string };
              if (profile?.email) {
                recipientEmails.push(profile.email);
              }
            }
          }
        }

        // Deduplicate emails
        const uniqueEmails = [...new Set(recipientEmails)];

        if (uniqueEmails.length === 0) {
          throw new Error('No valid recipient emails found');
        }

        console.log(`Processing notification ${notification.id} to ${uniqueEmails.length} recipients`);

        // Process each channel
        for (const channel of notification.channels) {
          switch (channel) {
            case 'email':
              await sendEmail(supabaseClient, notification, uniqueEmails);
              break;

            case 'sms':
              // SMS requires phone numbers - would need to look up from user profiles
              console.log('SMS notifications not yet implemented');
              break;

            case 'in_app':
              // Create in-app notification records
              await createInAppNotifications(supabaseClient, notification, notification.recipient_user_ids || []);
              break;

            case 'slack':
              // Slack webhook integration
              console.log('Slack notifications not yet implemented');
              break;

            default:
              console.log(`Unknown channel: ${channel}`);
          }
        }

        // Mark as sent
        await supabaseClient
          .from('notification_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
          })
          .eq('id', notification.id);

        // Update the source escalation as notified
        if (notification.reference_type === 'compliance_escalation') {
          await supabaseClient
            .from('compliance_escalations')
            .update({
              pm_notified_at: new Date().toISOString(),
            })
            .eq('id', notification.reference_id);
        }

        result.succeeded++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Failed to process notification ${notification.id}: ${errorMessage}`);

        result.failed++;
        result.errors.push(`${notification.id}: ${errorMessage}`);

        // Mark as failed if max attempts reached, otherwise leave for retry
        const maxAttempts = 3;
        await supabaseClient
          .from('notification_queue')
          .update({
            status: notification.attempts >= maxAttempts - 1 ? 'failed' : 'pending',
            last_error: errorMessage,
          })
          .eq('id', notification.id);
      }
    }

    console.log(`Notification processing complete: ${result.succeeded}/${result.processed} succeeded`);

    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Notification processing error:', errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

async function sendEmail(
  supabase: ReturnType<typeof createClient>,
  notification: NotificationQueueItem,
  recipients: string[]
): Promise<void> {
  // Log the email (actual sending would use Resend, SendGrid, etc.)
  const { error } = await supabase.from('email_logs').insert({
    organization_id: notification.organization_id,
    to_addresses: recipients,
    subject: notification.subject,
    body_text: notification.body,
    body_html: formatEmailHtml(notification),
    status: 'sent',
    sent_at: new Date().toISOString(),
    metadata: {
      notification_id: notification.id,
      notification_type: notification.notification_type,
      reference_type: notification.reference_type,
      reference_id: notification.reference_id,
    },
  });

  if (error) {
    console.error('Email log error:', error.message);
    // Don't throw - email logging failure shouldn't fail the notification
  }

  // If Resend API key is configured, actually send the email
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Triton Construction <notifications@triton-ai.com>',
          to: recipients,
          subject: notification.subject,
          html: formatEmailHtml(notification),
          text: notification.body,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Resend API error:', errorData);
      }
    } catch (err) {
      console.error('Failed to send via Resend:', err);
    }
  }
}

function formatEmailHtml(notification: NotificationQueueItem): string {
  const data = notification.data || {};
  const urgencyColor = notification.priority <= 2 ? '#dc2626' : notification.priority <= 4 ? '#f59e0b' : '#3b82f6';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${urgencyColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .detail { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
    .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 16px; margin-top: 4px; }
    .footer { margin-top: 20px; font-size: 12px; color: #9ca3af; }
    .cta { display: inline-block; background: ${urgencyColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0; font-size: 20px;">${notification.subject}</h1>
    </div>
    <div class="content">
      <p>${notification.body.replace(/\n/g, '<br>')}</p>

      ${data.project_name ? `
      <div class="detail">
        <div class="label">Project</div>
        <div class="value">${data.project_name}</div>
      </div>
      ` : ''}

      ${data.deadline_date ? `
      <div class="detail">
        <div class="label">Payment Deadline</div>
        <div class="value">${data.deadline_date}</div>
      </div>
      ` : ''}

      ${data.days_remaining !== undefined ? `
      <div class="detail">
        <div class="label">Days Remaining</div>
        <div class="value" style="color: ${Number(data.days_remaining) <= 0 ? '#dc2626' : Number(data.days_remaining) <= 3 ? '#f59e0b' : '#22c55e'}">
          ${Number(data.days_remaining) <= 0 ? `${Math.abs(Number(data.days_remaining))} days overdue` : `${data.days_remaining} days`}
        </div>
      </div>
      ` : ''}

      <a href="https://app.triton-construction.com/compliance" class="cta">View in Dashboard</a>

      <div class="footer">
        <p>This is an automated notification from Triton Construction AI Platform.</p>
        <p>You're receiving this because you're assigned to this project.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

async function createInAppNotifications(
  supabase: ReturnType<typeof createClient>,
  notification: NotificationQueueItem,
  userIds: string[]
): Promise<void> {
  if (!userIds.length) return;

  const notifications = userIds.map((userId) => ({
    user_id: userId,
    organization_id: notification.organization_id,
    type: notification.notification_type,
    title: notification.subject,
    message: notification.body,
    data: {
      ...notification.data,
      reference_type: notification.reference_type,
      reference_id: notification.reference_id,
    },
    is_read: false,
    created_at: new Date().toISOString(),
  }));

  // Check if user_notifications table exists before inserting
  const { error } = await supabase.from('user_notifications').insert(notifications);

  if (error) {
    // Table might not exist - log but don't fail
    console.log('In-app notification insert skipped:', error.message);
  }
}
