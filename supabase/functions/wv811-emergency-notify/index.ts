import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * WV811 Emergency Notify Edge Function
 *
 * Handles the notification escalation chain for emergency dig-up incidents.
 * Escalation order:
 * 1. WV811 emergency line (log for audit)
 * 2. Safety Director (SMS + Email)
 * 3. Project Manager (SMS + Email)
 * 4. Superintendent (SMS)
 * 5. VP of Operations (SMS for CRITICAL severity)
 */

interface EmergencyIncident {
  id: string;
  incident_number: string;
  incident_type: string;
  organization_id: string;
  latitude: number;
  longitude: number;
  address?: string;
  ticket_id?: string;
  project_id?: string;
  reported_by: string;
  reporter_phone?: string;
  crew_on_site: Array<{ id: string; name: string; role: string }>;
  description?: string;
  utility_type?: string;
  severity: string;
  status: string;
  created_at: string;
}

interface NotificationLog {
  role: string;
  user_id?: string;
  user_name?: string;
  method: string;
  sent_at: string;
  delivered_at?: string;
  error?: string;
}

interface DraftEmail {
  to: string;
  subject: string;
  body: string;
  replyTo?: string;
  mailto?: string; // mailto: URL for one-click sending
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request
    const { incidentId } = await req.json();
    if (!incidentId) {
      return new Response(JSON.stringify({ error: 'incidentId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch incident
    const { data: incident, error: incidentError } = await supabase
      .from('wv811_emergency_incidents')
      .select('*')
      .eq('id', incidentId)
      .single();

    if (incidentError || !incident) {
      return new Response(JSON.stringify({ error: 'Incident not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notificationLog: NotificationLog[] = [];
    const now = new Date().toISOString();

    // Get organization details
    const { data: org } = await supabase
      .from('organizations')
      .select('name, phone')
      .eq('id', incident.organization_id)
      .single();

    // Get reporter details
    const { data: reporter } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, phone')
      .eq('id', incident.reported_by)
      .single();

    const reporterName = reporter
      ? `${reporter.first_name || ''} ${reporter.last_name || ''}`.trim()
      : 'Unknown';

    // Get ticket number if available
    let ticketNumber = '';
    if (incident.ticket_id) {
      const { data: ticket } = await supabase
        .from('wv811_tickets')
        .select('ticket_number')
        .eq('id', incident.ticket_id)
        .single();
      ticketNumber = ticket?.ticket_number || '';
    }

    // Get project details if available
    let projectInfo = '';
    if (incident.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('project_number, name')
        .eq('id', incident.project_id)
        .single();
      if (project) {
        projectInfo = `${project.project_number} - ${project.name}`;
      }
    }

    // Build notification message
    const emergencyMessage = buildEmergencyMessage(incident, reporterName, ticketNumber, projectInfo, org?.name);

    // Generate draft email to WV811
    const draftEmail = generate811DraftEmail(
      incident,
      reporterName,
      reporter?.phone || incident.reporter_phone || '',
      ticketNumber,
      projectInfo,
      org?.name || ''
    );

    // Store draft email in incident record
    await supabase
      .from('wv811_emergency_incidents')
      .update({
        draft_email_to_811: draftEmail,
      })
      .eq('id', incidentId);

    // 1. Log WV811 notification (in production, would call their API or log for manual follow-up)
    notificationLog.push({
      role: 'WV811',
      method: 'LOGGED_FOR_CALL',
      sent_at: now,
    });
    await supabase
      .from('wv811_emergency_incidents')
      .update({ wv811_notified_at: now })
      .eq('id', incidentId);

    // 2. Notify Safety Director
    const safetyDirector = await findUserByRole(supabase, incident.organization_id, 'SAFETY_DIRECTOR');
    if (safetyDirector) {
      const result = await sendNotification(safetyDirector, emergencyMessage, 'SMS');
      notificationLog.push({
        role: 'SAFETY_DIRECTOR',
        user_id: safetyDirector.id,
        user_name: `${safetyDirector.first_name} ${safetyDirector.last_name}`,
        method: 'SMS',
        sent_at: now,
        delivered_at: result.delivered ? now : undefined,
        error: result.error,
      });
      await supabase
        .from('wv811_emergency_incidents')
        .update({ safety_director_notified_at: now })
        .eq('id', incidentId);
    }

    // 3. Notify Project Manager (if project is linked)
    if (incident.project_id) {
      const pm = await findProjectManager(supabase, incident.project_id);
      if (pm) {
        const result = await sendNotification(pm, emergencyMessage, 'SMS');
        notificationLog.push({
          role: 'PROJECT_MANAGER',
          user_id: pm.id,
          user_name: `${pm.first_name} ${pm.last_name}`,
          method: 'SMS',
          sent_at: now,
          delivered_at: result.delivered ? now : undefined,
          error: result.error,
        });
        await supabase
          .from('wv811_emergency_incidents')
          .update({ pm_notified_at: now })
          .eq('id', incidentId);
      }
    }

    // 4. Notify Superintendent
    const superintendent = await findUserByRole(supabase, incident.organization_id, 'SUPERINTENDENT');
    if (superintendent) {
      const result = await sendNotification(superintendent, emergencyMessage, 'SMS');
      notificationLog.push({
        role: 'SUPERINTENDENT',
        user_id: superintendent.id,
        user_name: `${superintendent.first_name} ${superintendent.last_name}`,
        method: 'SMS',
        sent_at: now,
        delivered_at: result.delivered ? now : undefined,
        error: result.error,
      });
      await supabase
        .from('wv811_emergency_incidents')
        .update({ superintendent_notified_at: now })
        .eq('id', incidentId);
    }

    // 5. Notify VP of Operations for CRITICAL severity
    if (incident.severity === 'CRITICAL' || incident.severity === 'SEVERE') {
      const vp = await findUserByRole(supabase, incident.organization_id, 'EXECUTIVE');
      if (vp) {
        const result = await sendNotification(vp, emergencyMessage, 'SMS');
        notificationLog.push({
          role: 'VP_OPERATIONS',
          user_id: vp.id,
          user_name: `${vp.first_name} ${vp.last_name}`,
          method: 'SMS',
          sent_at: now,
          delivered_at: result.delivered ? now : undefined,
          error: result.error,
        });
        await supabase
          .from('wv811_emergency_incidents')
          .update({ vp_notified_at: now })
          .eq('id', incidentId);
      }
    }

    // Update incident with notification log
    await supabase
      .from('wv811_emergency_incidents')
      .update({
        notification_log: notificationLog,
        status: 'RESPONDING',
        updated_at: now,
      })
      .eq('id', incidentId);

    console.log(`Emergency notifications sent for incident ${incident.incident_number}`);

    return new Response(
      JSON.stringify({
        success: true,
        incidentNumber: incident.incident_number,
        notificationsSent: notificationLog.length,
        notifications: notificationLog,
        draftEmail: draftEmail,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Emergency notify error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to send notifications' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildEmergencyMessage(
  incident: EmergencyIncident,
  reporterName: string,
  ticketNumber: string,
  projectInfo: string,
  orgName?: string
): string {
  const severityEmoji =
    incident.severity === 'CRITICAL'
      ? '🚨🚨🚨'
      : incident.severity === 'SEVERE'
        ? '🚨🚨'
        : incident.severity === 'MODERATE'
          ? '🚨'
          : '⚠️';

  const utilityType = incident.utility_type || 'UNKNOWN';
  const mapsUrl = `https://maps.google.com/?q=${incident.latitude},${incident.longitude}`;

  let message = `${severityEmoji} EMERGENCY DIG UP - ${utilityType}\n\n`;
  message += `Incident #${incident.incident_number}\n`;
  message += `Severity: ${incident.severity}\n`;
  message += `Reported by: ${reporterName}\n`;

  if (incident.reporter_phone) {
    message += `Callback: ${incident.reporter_phone}\n`;
  }

  message += `\n`;

  if (ticketNumber) {
    message += `Ticket: #${ticketNumber}\n`;
  }
  if (projectInfo) {
    message += `Project: ${projectInfo}\n`;
  }

  message += `\n`;

  if (incident.description) {
    message += `Details: ${incident.description}\n\n`;
  }

  if (incident.crew_on_site && incident.crew_on_site.length > 0) {
    message += `Crew on site: ${incident.crew_on_site.length}\n`;
  }

  message += `\nLocation: ${mapsUrl}\n`;

  if (orgName) {
    message += `\n${orgName}`;
  }

  return message;
}

interface UserContact {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
}

async function findUserByRole(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  roleCode: string
): Promise<UserContact | null> {
  // Find users with the specified role in this organization
  const { data: userRoles } = await supabase
    .from('user_roles')
    .select(
      `
      user_id,
      roles!inner(code)
    `
    )
    .eq('roles.code', roleCode);

  if (!userRoles || userRoles.length === 0) return null;

  // Get the first matching user's profile
  const userId = userRoles[0].user_id;
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, phone, email')
    .eq('id', userId)
    .eq('organization_id', organizationId)
    .single();

  return profile;
}

async function findProjectManager(
  supabase: ReturnType<typeof createClient>,
  projectId: string
): Promise<UserContact | null> {
  // Find the primary PM for this project
  const { data: assignment } = await supabase
    .from('project_assignments')
    .select(
      `
      user_id,
      user_profiles!inner(id, first_name, last_name, phone, email)
    `
    )
    .eq('project_id', projectId)
    .eq('project_role', 'PROJECT_MANAGER')
    .eq('is_primary', true)
    .single();

  if (!assignment) return null;

  return assignment.user_profiles as unknown as UserContact;
}

async function sendNotification(
  user: UserContact,
  message: string,
  method: 'SMS' | 'EMAIL'
): Promise<{ delivered: boolean; error?: string }> {
  if (method === 'SMS' && user.phone) {
    // Format phone to E.164 if needed
    let phone = user.phone.replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '+1' + phone;
    } else if (phone.length === 11 && phone.startsWith('1')) {
      phone = '+' + phone;
    } else if (!phone.startsWith('+')) {
      phone = '+' + phone;
    }

    // Get Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log(`[SMS to ${phone}]: ${message.substring(0, 100)}... (Twilio not configured)`);
      return { delivered: false, error: 'Twilio not configured' };
    }

    try {
      // Send via Twilio REST API directly (EMERGENCY = immediate, no batching)
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
      const credentials = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

      // Truncate message for SMS (keep under 1600 chars)
      const smsMessage = message.length > 1600 ? message.substring(0, 1597) + '...' : message;

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: twilioPhoneNumber,
          Body: smsMessage,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error(`Twilio error for ${phone}:`, result);
        return { delivered: false, error: result.message || 'Twilio API error' };
      }

      console.log(`[SMS SENT to ${phone}]: SID ${result.sid}`);
      return { delivered: true };
    } catch (error) {
      console.error(`SMS send error for ${phone}:`, error);
      return { delivered: false, error: error instanceof Error ? error.message : 'SMS failed' };
    }
  }

  if (method === 'EMAIL' && user.email) {
    console.log(`[EMAIL to ${user.email}]: Emergency notification`);
    // Email handled via mailto: link in the UI for now
    return { delivered: true };
  }

  return { delivered: false, error: `No ${method.toLowerCase()} contact available` };
}

/**
 * Generate a draft email to WV811 for emergency dig-up reporting
 * Based on WV811 emergency reporting requirements
 */
function generate811DraftEmail(
  incident: EmergencyIncident,
  reporterName: string,
  reporterPhone: string,
  ticketNumber: string,
  projectInfo: string,
  companyName: string
): DraftEmail {
  const timestamp = new Date(incident.created_at).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const mapsUrl = `https://maps.google.com/?q=${incident.latitude},${incident.longitude}`;
  const utilityType = incident.utility_type || 'UNKNOWN';

  // WV811 emergency email address
  const to = 'emergencies@wv811.com';

  // Subject line follows WV811 format
  const subject = `EMERGENCY DIG UP - ${utilityType}${ticketNumber ? ` - Ticket #${ticketNumber}` : ''} - ${companyName}`;

  // Email body - professional format for WV811
  const body = `EMERGENCY DIG UP NOTIFICATION
==============================

Incident Number: ${incident.incident_number}
Reported: ${timestamp}
Severity: ${incident.severity}

UTILITY INFORMATION
-------------------
Type Struck: ${utilityType}
${ticketNumber ? `Related Ticket #: ${ticketNumber}` : 'No prior ticket on file'}

LOCATION
--------
GPS Coordinates: ${incident.latitude.toFixed(6)}, ${incident.longitude.toFixed(6)}
Google Maps: ${mapsUrl}
${incident.address ? `Address: ${incident.address}` : ''}

INCIDENT DETAILS
----------------
${incident.description || 'Utility strike during excavation'}

EXCAVATOR INFORMATION
---------------------
Company: ${companyName}
Reporter: ${reporterName}
Callback Phone: ${reporterPhone || 'Not provided'}
${projectInfo ? `Project: ${projectInfo}` : ''}

PERSONNEL ON SITE
-----------------
${incident.crew_on_site && incident.crew_on_site.length > 0
    ? incident.crew_on_site.map((c) => `- ${c.name} (${c.role})`).join('\n')
    : 'Not specified'}

IMMEDIATE ACTIONS TAKEN
-----------------------
- Area secured
- Personnel evacuated from immediate vicinity
- Awaiting utility company response

---
This emergency notification was auto-generated by Triton AI Platform.
Incident #${incident.incident_number}
`;

  // Create mailto URL for one-click sending
  const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return {
    to,
    subject,
    body,
    replyTo: reporterPhone ? undefined : undefined, // Could add company email
    mailto,
  };
}
