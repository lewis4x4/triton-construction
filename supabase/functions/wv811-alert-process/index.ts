import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * WV811 Alert Process Edge Function
 *
 * Runs on a schedule (every 15 minutes) to:
 * 1. Find tickets that need alerts (48hr, 24hr, same-day, overdue)
 * 2. Get subscribed users for each ticket
 * 3. Filter based on role (OFFICE vs FIELD) and quiet mode
 * 4. Send alerts via configured channels (email, SMS, push)
 * 5. Create acknowledgement tracking for critical alerts
 * 6. Escalate unacknowledged critical alerts
 */

type AlertPriority = 'INFO' | 'WARNING' | 'CRITICAL';
type UserAlertRole = 'OFFICE' | 'FIELD';

interface TicketNeedingAlert {
  ticket_id: string;
  ticket_number: string;
  legal_dig_date: string;
  ticket_expires_at: string;
  hours_until_dig: number;
  hours_until_expire?: number;
  alert_type: string;
  priority?: AlertPriority;
  organization_id: string;
}

interface AlertSubscription {
  id: string;
  user_id: string;
  email_address: string | null;
  phone_number: string | null;
  push_token: string | null;
  channel_email: boolean;
  channel_sms: boolean;
  channel_push: boolean;
  channel_in_app: boolean;
  // Alert type preferences
  alert_48_hour: boolean;
  alert_24_hour: boolean;
  alert_4_hour: boolean;
  alert_2_hour: boolean;
  alert_same_day: boolean;
}

interface UserAlertPrefs {
  alert_role: UserAlertRole;
  quiet_mode_enabled: boolean;
  quiet_mode_until: string | null;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  always_alert_on_expired: boolean;
  always_alert_on_conflict: boolean;
  always_alert_on_emergency: boolean;
  override_enabled_by: string | null;
  override_expires_at: string | null;
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

    const results = {
      ticketsChecked: 0,
      alertsSent: 0,
      alertsFailed: 0,
      errors: [] as string[],
    };

    // Get tickets needing alerts
    const { data: ticketsNeedingAlerts, error: fetchError } = await supabaseAdmin.rpc(
      'get_tickets_needing_alerts'
    );

    if (fetchError) {
      console.error('Error fetching tickets needing alerts:', fetchError);
      throw fetchError;
    }

    results.ticketsChecked = ticketsNeedingAlerts?.length || 0;

    if (!ticketsNeedingAlerts || ticketsNeedingAlerts.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No tickets need alerts at this time',
          ...results,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each ticket
    for (const ticket of ticketsNeedingAlerts as TicketNeedingAlert[]) {
      try {
        // Check if we already sent this alert type for this ticket today
        const today = new Date().toISOString().split('T')[0];
        const { data: existingAlert } = await supabaseAdmin
          .from('wv811_ticket_alerts')
          .select('id')
          .eq('ticket_id', ticket.ticket_id)
          .eq('alert_type', ticket.alert_type)
          .gte('created_at', `${today}T00:00:00Z`)
          .limit(1);

        if (existingAlert && existingAlert.length > 0) {
          // Already sent this alert today
          continue;
        }

        // Get subscribed users for this organization
        const { data: subscriptions, error: subError } = await supabaseAdmin
          .from('wv811_alert_subscriptions')
          .select('*')
          .eq('organization_id', ticket.organization_id)
          .eq('is_active', true);

        if (subError) {
          console.error('Error fetching subscriptions:', subError);
          continue;
        }

        if (!subscriptions || subscriptions.length === 0) {
          continue;
        }

        // Filter subscriptions based on alert type preference AND role-based filtering
        const alertTypeField = `alert_${ticket.alert_type.toLowerCase().replace('_hour', '_hour')}`;
        const priority = getAlertPriority(ticket.alert_type);

        const eligibleSubscriptions: AlertSubscription[] = [];

        for (const sub of subscriptions as AlertSubscription[]) {
          // Check if user wants this type of alert
          const wantsAlert = (sub as Record<string, unknown>)[alertTypeField] !== false;
          if (!wantsAlert) continue;

          // Get user's role-based preferences
          const { data: prefs } = await supabaseAdmin
            .from('wv811_user_alert_preferences')
            .select('*')
            .eq('user_id', sub.user_id)
            .single();

          const userPrefs: UserAlertPrefs = prefs || {
            alert_role: 'OFFICE',
            quiet_mode_enabled: false,
            quiet_mode_until: null,
            email_enabled: true,
            sms_enabled: true,
            push_enabled: true,
            in_app_enabled: true,
            always_alert_on_expired: true,
            always_alert_on_conflict: true,
            always_alert_on_emergency: true,
            override_enabled_by: null,
            override_expires_at: null,
          };

          // Check if user should receive this alert based on role and preferences
          if (shouldUserReceiveAlert(userPrefs, priority, ticket.alert_type)) {
            eligibleSubscriptions.push(sub);
          }
        }

        // Get ticket details for the alert message
        const { data: ticketDetails } = await supabaseAdmin
          .from('wv811_tickets')
          .select('dig_site_address, dig_site_city, excavator_company')
          .eq('id', ticket.ticket_id)
          .single();

        // Send alerts to each subscribed user
        for (const sub of eligibleSubscriptions as AlertSubscription[]) {
          // Prepare alert content
          const alertSubject = getAlertSubject(ticket.alert_type, ticket.ticket_number);
          const alertBody = getAlertBody(
            ticket.alert_type,
            ticket.ticket_number,
            ticket.legal_dig_date,
            ticketDetails?.dig_site_address || 'Unknown location',
            ticketDetails?.dig_site_city
          );

          // Get appropriate channels based on alert urgency
          const channels = getChannelsForAlertType(ticket.alert_type, sub);

          for (const channel of channels) {
            if (!channel.enabled) continue;

            try {
              // Log the alert
              const { data: alertRecord, error: alertError } = await supabaseAdmin
                .from('wv811_ticket_alerts')
                .insert({
                  ticket_id: ticket.ticket_id,
                  subscription_id: sub.id,
                  user_id: sub.user_id,
                  alert_type: ticket.alert_type,
                  channel: channel.type,
                  priority: priority,
                  subject: alertSubject,
                  body: alertBody,
                  sent_at: new Date().toISOString(),
                })
                .select()
                .single();

              if (alertError) {
                console.error('Error logging alert:', alertError);
                results.alertsFailed++;
                continue;
              }

              // Create acknowledgement tracking for CRITICAL alerts
              if (priority === 'CRITICAL' && alertRecord) {
                const ackDeadline = new Date();
                ackDeadline.setMinutes(ackDeadline.getMinutes() + 15); // 15 min to acknowledge

                await supabaseAdmin.from('wv811_alert_acknowledgements').insert({
                  organization_id: ticket.organization_id,
                  alert_id: alertRecord.id,
                  user_id: sub.user_id,
                  status: 'SENT',
                  sent_at: new Date().toISOString(),
                  sent_via: [channel.type],
                  requires_explicit_ack: true,
                  ack_deadline: ackDeadline.toISOString(),
                });
              }

              // Send the actual alert based on channel
              if (channel.type === 'EMAIL' && sub.email_address) {
                await sendEmailAlert(
                  sub.email_address,
                  alertSubject,
                  alertBody,
                  ticket.ticket_id,
                  sub.user_id,
                  ticket.organization_id
                );
              } else if (channel.type === 'SMS' && sub.phone_number) {
                // SMS sending would be implemented with Twilio
                // For now, just log it
                console.log(`Would send SMS to ${sub.phone_number}: ${alertSubject}`);
              }
              // IN_APP alerts are handled by the frontend polling the alerts table

              results.alertsSent++;
            } catch (channelError) {
              console.error(`Error sending ${channel.type} alert:`, channelError);
              results.alertsFailed++;
            }
          }
        }

        // Update ticket last_alert_sent_at
        await supabaseAdmin
          .from('wv811_tickets')
          .update({
            last_alert_sent_at: new Date().toISOString(),
            alert_count: (await getTicketAlertCount(supabaseAdmin, ticket.ticket_id)) + 1,
          })
          .eq('id', ticket.ticket_id);
      } catch (ticketError) {
        console.error(`Error processing ticket ${ticket.ticket_id}:`, ticketError);
        results.errors.push(`Ticket ${ticket.ticket_number}: ${ticketError}`);
      }
    }

    // Run auto-expire for overdue tickets
    const { data: expiredCount } = await supabaseAdmin.rpc('auto_expire_tickets');
    console.log(`Auto-expired ${expiredCount} tickets`);

    // Check utility response windows and transition PENDING → UNVERIFIED
    const { data: unverifiedCount } = await supabaseAdmin.rpc('check_utility_response_windows');
    console.log(`Transitioned ${unverifiedCount} utilities to UNVERIFIED status`);

    // Escalate unacknowledged critical alerts
    const escalatedCount = await escalateUnacknowledgedAlerts(supabaseAdmin);
    console.log(`Escalated ${escalatedCount} unacknowledged critical alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${results.ticketsChecked} tickets, sent ${results.alertsSent} alerts`,
        expiredTickets: expiredCount || 0,
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Alert process error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getAlertSubject(alertType: string, ticketNumber: string): string {
  switch (alertType) {
    case '48_HOUR':
      return `WV811 Reminder: Ticket #${ticketNumber} - Legal dig date in 48 hours`;
    case '24_HOUR':
      return `WV811 Alert: Ticket #${ticketNumber} - Legal dig date TOMORROW`;
    case '4_HOUR':
      return `WV811 ALERT: Ticket #${ticketNumber} - Dig date in 4 hours!`;
    case '2_HOUR':
      return `WV811 CRITICAL: Ticket #${ticketNumber} - Dig date in 2 HOURS!`;
    case 'SAME_DAY':
      return `WV811 URGENT: Ticket #${ticketNumber} - Legal dig date is TODAY`;
    case 'OVERDUE':
      return `WV811 EXPIRED: Ticket #${ticketNumber} has expired`;
    case 'CONFLICT':
      return `WV811 CONFLICT: Ticket #${ticketNumber} - Utility conflict reported`;
    case 'RESPONSE_RECEIVED':
      return `WV811 Update: Ticket #${ticketNumber} - New utility response`;
    case 'EXPIRING_SOON':
      return `WV811 Warning: Ticket #${ticketNumber} - Expiring soon`;
    case 'HIGH_RISK':
      return `WV811 HIGH RISK: Ticket #${ticketNumber} - Requires attention`;
    default:
      return `WV811 Alert: Ticket #${ticketNumber}`;
  }
}

/**
 * Determine which channels to use based on alert type and urgency
 * More urgent alerts use more immediate channels (SMS, push)
 */
function getChannelsForAlertType(alertType: string, sub: AlertSubscription): Array<{ type: string; enabled: boolean }> {
  const baseChannels = [
    { type: 'EMAIL', enabled: sub.channel_email && !!sub.email_address },
    { type: 'SMS', enabled: sub.channel_sms && !!sub.phone_number },
    { type: 'PUSH', enabled: sub.channel_push },
    { type: 'IN_APP', enabled: sub.channel_in_app },
  ];

  // Filter channels based on alert urgency
  switch (alertType) {
    case '2_HOUR':
      // Critical: SMS + Push + In-App (skip email for speed)
      return baseChannels.filter(c => c.type !== 'EMAIL');
    case '4_HOUR':
      // Urgent: SMS + In-App
      return baseChannels.filter(c => c.type === 'SMS' || c.type === 'IN_APP');
    case 'SAME_DAY':
    case 'CONFLICT':
    case 'HIGH_RISK':
      // Important: All channels
      return baseChannels;
    case '24_HOUR':
      // Reminder: Email + In-App
      return baseChannels.filter(c => c.type === 'EMAIL' || c.type === 'IN_APP');
    case '48_HOUR':
      // Early warning: Email only
      return baseChannels.filter(c => c.type === 'EMAIL');
    default:
      return baseChannels;
  }
}

function getAlertBody(
  alertType: string,
  ticketNumber: string,
  legalDigDate: string,
  address: string,
  city?: string
): string {
  const location = city ? `${address}, ${city}` : address;
  const digDate = new Date(legalDigDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  switch (alertType) {
    case '48_HOUR':
      return `Your WV811 locate ticket #${ticketNumber} at ${location} has a legal dig date of ${digDate} (in approximately 48 hours). Ensure all utilities have responded before excavation.`;
    case '24_HOUR':
      return `REMINDER: Your WV811 locate ticket #${ticketNumber} at ${location} has a legal dig date of ${digDate} (TOMORROW). Verify all utility responses before excavation.`;
    case '4_HOUR':
      return `ALERT: Ticket #${ticketNumber} at ${location} - dig date in 4 HOURS! Verify markings and utility responses NOW.`;
    case '2_HOUR':
      return `CRITICAL: Ticket #${ticketNumber} at ${location} - only 2 HOURS until dig date! Final check - confirm all utilities clear.`;
    case 'SAME_DAY':
      return `URGENT: Your WV811 locate ticket #${ticketNumber} at ${location} has a legal dig date of TODAY (${digDate}). Confirm all utilities have responded and markings are visible.`;
    case 'OVERDUE':
      return `Your WV811 locate ticket #${ticketNumber} at ${location} has EXPIRED. You must request a new ticket before any excavation work.`;
    case 'CONFLICT':
      return `A utility has reported a CONFLICT on your WV811 locate ticket #${ticketNumber} at ${location}. Please review the conflict details and contact the utility before excavation.`;
    case 'EXPIRING_SOON':
      return `Your WV811 ticket #${ticketNumber} at ${location} is expiring soon. Consider requesting a renewal if work is not yet complete.`;
    case 'HIGH_RISK':
      return `HIGH RISK TICKET: #${ticketNumber} at ${location} involves gas or electric utilities. Exercise extreme caution and ensure all markings are visible.`;
    default:
      return `Update for WV811 ticket #${ticketNumber} at ${location}. Legal dig date: ${digDate}.`;
  }
}

async function getTicketAlertCount(
  supabase: ReturnType<typeof createClient>,
  ticketId: string
): Promise<number> {
  const { count } = await supabase
    .from('wv811_ticket_alerts')
    .select('*', { count: 'exact', head: true })
    .eq('ticket_id', ticketId);

  return count || 0;
}

async function sendEmailAlert(
  to: string,
  subject: string,
  body: string,
  ticketId?: string,
  userId?: string,
  organizationId?: string
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials for email sending');
    return;
  }

  try {
    // Call the email-send edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/email-send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        to,
        subject,
        text: body,
        html: generateAlertEmailHtml(subject, body),
        category: 'ALERT',
        relatedEntityType: 'TICKET',
        relatedEntityId: ticketId,
        userId,
        organizationId,
        tags: [
          { name: 'type', value: 'wv811-alert' },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to send email:', error);
    } else {
      const result = await response.json();
      console.log(`Email sent successfully. ID: ${result.id}`);
    }
  } catch (error) {
    console.error('Email send error:', error);
  }
}

function generateAlertEmailHtml(subject: string, body: string): string {
  // Determine alert level from subject
  const isCritical = subject.includes('CRITICAL') || subject.includes('EXPIRED');
  const isUrgent = subject.includes('URGENT') || subject.includes('ALERT') || subject.includes('CONFLICT');
  const isWarning = subject.includes('Warning') || subject.includes('Reminder');

  const alertColor = isCritical ? '#dc2626' : isUrgent ? '#ea580c' : isWarning ? '#ca8a04' : '#2563eb';
  const alertBg = isCritical ? '#fef2f2' : isUrgent ? '#fff7ed' : isWarning ? '#fefce8' : '#eff6ff';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
    <div style="background: ${alertColor}; color: white; padding: 24px;">
      <h1 style="margin: 0; font-size: 18px; font-weight: 600;">WV811 Alert</h1>
    </div>
    <div style="padding: 24px;">
      <div style="background: ${alertBg}; border-left: 4px solid ${alertColor}; padding: 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
        <h2 style="margin: 0 0 8px 0; font-size: 16px; color: #1e293b;">${subject}</h2>
      </div>
      <p style="font-size: 15px; line-height: 1.6; color: #475569; margin: 0 0 20px 0;">
        ${body}
      </p>
      <a href="#" style="display: inline-block; padding: 12px 24px; background: ${alertColor}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
        View Ticket Details
      </a>
    </div>
    <div style="padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #64748b;">
        Triton Construction AI Platform<br>
        Always call 811 before you dig!
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Determine alert priority based on type
 */
function getAlertPriority(alertType: string): AlertPriority {
  switch (alertType) {
    case 'OVERDUE':
    case '2_HOUR':
    case '2_HOUR_EXPIRATION':
    case '2_HOUR_UPDATE_BY':
    case 'AT_UPDATE_BY':
    case 'CONFLICT':
    case 'EMERGENCY':
    case 'DIG_UP':
      return 'CRITICAL';

    case '4_HOUR':
    case '4_HOUR_EXPIRATION':
    case '4_HOUR_UPDATE_BY':
    case 'SAME_DAY':
    case 'HIGH_RISK':
      return 'WARNING';

    default:
      return 'INFO';
  }
}

/**
 * Determine if user should receive alert based on role and preferences
 */
function shouldUserReceiveAlert(
  prefs: UserAlertPrefs,
  priority: AlertPriority,
  alertType: string
): boolean {
  // Check for override (superintendent enabled full alerts)
  if (
    prefs.override_enabled_by &&
    prefs.override_expires_at &&
    new Date(prefs.override_expires_at) > new Date()
  ) {
    return true;
  }

  // Check always-alert conditions
  const isExpiredAlert = alertType === 'OVERDUE' || alertType.includes('EXPIRATION');
  const isConflictAlert = alertType === 'CONFLICT';
  const isEmergencyAlert = alertType === 'EMERGENCY' || alertType === 'DIG_UP';

  if (isExpiredAlert && prefs.always_alert_on_expired) return true;
  if (isConflictAlert && prefs.always_alert_on_conflict) return true;
  if (isEmergencyAlert && prefs.always_alert_on_emergency) return true;

  // Check quiet mode
  if (prefs.quiet_mode_enabled) {
    const quietModeActive =
      !prefs.quiet_mode_until || new Date(prefs.quiet_mode_until) > new Date();
    if (quietModeActive) {
      // In quiet mode, only CRITICAL alerts
      return priority === 'CRITICAL';
    }
  }

  // Role-based filtering
  if (prefs.alert_role === 'FIELD') {
    // Field users only get CRITICAL and WARNING
    return priority === 'CRITICAL' || priority === 'WARNING';
  }

  // OFFICE role gets everything
  return true;
}

/**
 * Escalate unacknowledged critical alerts past their deadline
 */
async function escalateUnacknowledgedAlerts(
  supabase: ReturnType<typeof createClient>
): Promise<number> {
  // Find critical alerts past their acknowledgement deadline
  const { data: unackedAlerts } = await supabase
    .from('wv811_alert_acknowledgements')
    .select(`
      *,
      wv811_ticket_alerts!inner(
        ticket_id,
        message,
        user_id
      )
    `)
    .eq('requires_explicit_ack', true)
    .eq('status', 'SENT')
    .lt('ack_deadline', new Date().toISOString());

  let escalatedCount = 0;

  for (const ack of unackedAlerts || []) {
    // Mark as escalated
    await supabase
      .from('wv811_alert_acknowledgements')
      .update({
        status: 'ESCALATED',
        escalated_at: new Date().toISOString(),
        escalation_reason: 'No acknowledgement received within 15 minutes',
      })
      .eq('id', ack.id);

    // TODO: Find supervisor and send escalation alert
    console.log(`Escalated alert ${ack.id} - user did not acknowledge within deadline`);
    escalatedCount++;
  }

  return escalatedCount;
}
