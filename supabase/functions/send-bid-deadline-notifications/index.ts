// Supabase Edge Function: send-bid-deadline-notifications
// Scheduled daily to check for bids with approaching deadlines and send notifications
// Sends both in-app notifications and emails via the email-send function

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BidNeedingNotification {
  bid_project_id: string;
  organization_id: string;
  project_name: string;
  letting_date: string;
  days_until: { days: number };
  incomplete_count: number;
  total_items: number;
  assigned_users: string[];
}

interface NotificationResult {
  userId: string;
  email: string | null;
  inAppCreated: boolean;
  emailSent: boolean;
  error?: string;
}

// Notification templates
const NOTIFICATION_TEMPLATES = {
  7: {
    type: 'BID_DEADLINE_7_DAYS',
    subject: (name: string) => `7 Days Until Bid Deadline: ${name}`,
    title: (name: string) => `7 Days Until Deadline`,
    message: (name: string, incomplete: number, total: number) =>
      `Bid "${name}" is due in 7 days. ${incomplete} of ${total} line items still need pricing.`,
    priority: 'normal' as const,
    icon: 'calendar',
  },
  3: {
    type: 'BID_DEADLINE_3_DAYS',
    subject: (name: string) => `3 Days Until Bid Deadline: ${name}`,
    title: (name: string) => `3 Days Until Deadline`,
    message: (name: string, incomplete: number, total: number) =>
      `Bid "${name}" is due in 3 days! ${incomplete} of ${total} line items still need pricing. Review now.`,
    priority: 'high' as const,
    icon: 'alert-triangle',
  },
  1: {
    type: 'BID_DEADLINE_1_DAY',
    subject: (name: string) => `URGENT: Bid Due Tomorrow - ${name}`,
    title: (name: string) => `Due Tomorrow!`,
    message: (name: string, incomplete: number, total: number) =>
      `URGENT: Bid "${name}" is due tomorrow! ${incomplete} of ${total} line items incomplete. Immediate action required.`,
    priority: 'urgent' as const,
    icon: 'alert-circle',
  },
  0: {
    type: 'BID_DEADLINE_TODAY',
    subject: (name: string) => `CRITICAL: Bid Due TODAY - ${name}`,
    title: (name: string) => `Due TODAY!`,
    message: (name: string, incomplete: number, total: number) =>
      `CRITICAL: Bid "${name}" is due TODAY! ${incomplete} of ${total} line items still incomplete.`,
    priority: 'urgent' as const,
    icon: 'alert-octagon',
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional parameters
    let targetDays: number[] = [7, 3, 1, 0];
    let dryRun = false;

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.targetDays && Array.isArray(body.targetDays)) {
          targetDays = body.targetDays;
        }
        if (body.dryRun === true) {
          dryRun = true;
        }
      } catch {
        // No body or invalid JSON, use defaults
      }
    }

    console.log(`Processing bid deadline notifications for days: ${targetDays.join(', ')}${dryRun ? ' (DRY RUN)' : ''}`);

    const results: {
      day: number;
      bidsProcessed: number;
      notificationsSent: number;
      errors: string[];
    }[] = [];

    // Process each deadline threshold
    for (const days of targetDays) {
      const template = NOTIFICATION_TEMPLATES[days as keyof typeof NOTIFICATION_TEMPLATES];
      if (!template) {
        console.warn(`No template for ${days} days, skipping`);
        continue;
      }

      // Get bids needing notifications for this deadline
      const { data: bids, error: bidsError } = await supabase.rpc(
        'get_bids_needing_deadline_notifications',
        { p_days_until_deadline: days }
      );

      if (bidsError) {
        console.error(`Error fetching bids for ${days} days:`, bidsError);
        results.push({
          day: days,
          bidsProcessed: 0,
          notificationsSent: 0,
          errors: [bidsError.message],
        });
        continue;
      }

      if (!bids || bids.length === 0) {
        console.log(`No bids found for ${days}-day deadline`);
        results.push({
          day: days,
          bidsProcessed: 0,
          notificationsSent: 0,
          errors: [],
        });
        continue;
      }

      console.log(`Found ${bids.length} bids for ${days}-day deadline`);

      let notificationsSent = 0;
      const errors: string[] = [];

      // Process each bid
      for (const bid of bids as BidNeedingNotification[]) {
        const assignedUsers = bid.assigned_users || [];

        if (assignedUsers.length === 0) {
          console.log(`No assigned users for bid ${bid.bid_project_id}, skipping`);
          continue;
        }

        // Get user details and notification preferences
        const { data: users, error: usersError } = await supabase
          .from('user_profiles')
          .select('user_id, email, first_name, last_name')
          .in('user_id', assignedUsers);

        if (usersError || !users) {
          console.error(`Error fetching users for bid ${bid.bid_project_id}:`, usersError);
          errors.push(`Failed to fetch users for bid ${bid.project_name}`);
          continue;
        }

        // Process each user
        for (const user of users) {
          // Check if user should receive this notification
          const { data: shouldNotify } = await supabase.rpc('should_notify_user', {
            p_user_id: user.user_id,
            p_organization_id: bid.organization_id,
            p_notification_type: template.type,
            p_channel: 'EMAIL',
          });

          // Generate dedup key to prevent duplicate notifications
          const dedupKey = `${template.type}:${bid.bid_project_id}:${new Date().toISOString().split('T')[0]}`;

          // Check if notification already sent today
          const { data: existingNotification } = await supabase
            .from('bid_notifications')
            .select('id')
            .eq('dedup_key', dedupKey)
            .eq('user_id', user.user_id)
            .single();

          if (existingNotification) {
            console.log(`Notification already sent for ${user.email} on bid ${bid.project_name}`);
            continue;
          }

          if (dryRun) {
            console.log(`[DRY RUN] Would notify ${user.email} about "${bid.project_name}" (${days} days)`);
            notificationsSent++;
            continue;
          }

          const notificationMessage = template.message(
            bid.project_name,
            bid.incomplete_count,
            bid.total_items
          );

          // Create in-app notification
          try {
            await supabase.rpc('create_in_app_notification', {
              p_user_id: user.user_id,
              p_organization_id: bid.organization_id,
              p_title: template.title(bid.project_name),
              p_message: notificationMessage,
              p_priority: template.priority,
              p_action_url: `/bids/${bid.bid_project_id}?tab=line-items`,
              p_action_label: 'Review Pricing',
              p_bid_project_id: bid.bid_project_id,
              p_icon: template.icon,
              p_expires_in_days: days + 7, // Expire a week after deadline
            });
            console.log(`Created in-app notification for ${user.email}`);
          } catch (inAppError) {
            console.error(`Failed to create in-app notification:`, inAppError);
          }

          // Send email if user should be notified via email
          if (shouldNotify && user.email) {
            try {
              const emailHtml = generateEmailHtml({
                userName: user.first_name || 'Team Member',
                projectName: bid.project_name,
                daysUntil: days,
                incompleteCount: bid.incomplete_count,
                totalItems: bid.total_items,
                lettingDate: bid.letting_date,
                bidUrl: `${Deno.env.get('APP_URL') || 'https://triton.app'}/bids/${bid.bid_project_id}?tab=line-items`,
              });

              const emailResponse = await fetch(`${supabaseUrl}/functions/v1/email-send`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${supabaseServiceKey}`,
                },
                body: JSON.stringify({
                  to: user.email,
                  subject: template.subject(bid.project_name),
                  html: emailHtml,
                  category: 'BID_DEADLINE',
                  relatedEntityType: 'BID_PROJECT',
                  relatedEntityId: bid.bid_project_id,
                  userId: user.user_id,
                  organizationId: bid.organization_id,
                  tags: [
                    { name: 'type', value: 'bid_deadline' },
                    { name: 'days_until', value: String(days) },
                  ],
                }),
              });

              if (emailResponse.ok) {
                console.log(`Email sent to ${user.email}`);
              } else {
                const emailError = await emailResponse.text();
                console.error(`Failed to send email to ${user.email}:`, emailError);
              }
            } catch (emailError) {
              console.error(`Email send error for ${user.email}:`, emailError);
            }
          }

          // Record notification in bid_notifications table
          try {
            await supabase.from('bid_notifications').insert({
              organization_id: bid.organization_id,
              bid_project_id: bid.bid_project_id,
              user_id: user.user_id,
              notification_type: template.type,
              channel: shouldNotify ? 'EMAIL' : 'IN_APP',
              subject: template.subject(bid.project_name),
              message: notificationMessage,
              metadata: {
                days_until_deadline: days,
                incomplete_count: bid.incomplete_count,
                total_items: bid.total_items,
                letting_date: bid.letting_date,
              },
              sent_at: new Date().toISOString(),
              dedup_key: dedupKey,
            });
          } catch (recordError) {
            console.error(`Failed to record notification:`, recordError);
          }

          notificationsSent++;
        }
      }

      results.push({
        day: days,
        bidsProcessed: bids.length,
        notificationsSent,
        errors,
      });
    }

    // Calculate totals
    const totalBids = results.reduce((sum, r) => sum + r.bidsProcessed, 0);
    const totalNotifications = results.reduce((sum, r) => sum + r.notificationsSent, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`Completed: ${totalBids} bids processed, ${totalNotifications} notifications sent, ${totalErrors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        dryRun,
        summary: {
          bidsProcessed: totalBids,
          notificationsSent: totalNotifications,
          errorsCount: totalErrors,
        },
        details: results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Notification processing error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to process notifications',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Generate HTML email template
function generateEmailHtml(params: {
  userName: string;
  projectName: string;
  daysUntil: number;
  incompleteCount: number;
  totalItems: number;
  lettingDate: string;
  bidUrl: string;
}): string {
  const { userName, projectName, daysUntil, incompleteCount, totalItems, lettingDate, bidUrl } = params;

  const urgencyColor = daysUntil === 0 ? '#dc2626' : daysUntil <= 1 ? '#ea580c' : daysUntil <= 3 ? '#d97706' : '#2563eb';
  const urgencyText = daysUntil === 0 ? 'TODAY' : daysUntil === 1 ? 'TOMORROW' : `in ${daysUntil} days`;
  const completionPercent = Math.round(((totalItems - incompleteCount) / totalItems) * 100);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bid Deadline Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${urgencyColor}; padding: 24px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Bid Due ${urgencyText}
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px;">
                Hi ${userName},
              </p>

              <p style="margin: 0 0 24px; color: #374151; font-size: 16px;">
                The bid for <strong>${projectName}</strong> is due ${urgencyText}${daysUntil > 0 ? ` on ${new Date(lettingDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}` : ''}.
              </p>

              <!-- Progress Box -->
              <table role="presentation" style="width: 100%; background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
                      Pricing Progress
                    </p>

                    <!-- Progress Bar -->
                    <div style="background-color: #e5e7eb; border-radius: 9999px; height: 8px; margin-bottom: 12px;">
                      <div style="background-color: ${completionPercent >= 80 ? '#10b981' : completionPercent >= 50 ? '#f59e0b' : '#ef4444'}; border-radius: 9999px; height: 8px; width: ${completionPercent}%;"></div>
                    </div>

                    <table role="presentation" style="width: 100%;">
                      <tr>
                        <td style="color: #111827; font-size: 24px; font-weight: 600;">
                          ${completionPercent}% Complete
                        </td>
                        <td style="text-align: right; color: #6b7280; font-size: 14px;">
                          ${incompleteCount} items need pricing
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center;">
                    <a href="${bidUrl}" style="display: inline-block; background-color: ${urgencyColor}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Review Pricing Now
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                Triton AI Platform
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                You're receiving this because you're assigned to this bid project.
                <br>
                <a href="${Deno.env.get('APP_URL') || 'https://triton.app'}/settings/notifications" style="color: #6b7280;">Manage notification preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}
