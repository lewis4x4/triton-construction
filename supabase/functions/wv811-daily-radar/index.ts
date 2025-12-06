import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketSummary {
  id: string;
  ticket_number: string;
  dig_site_address: string;
  dig_site_city: string;
  status: string;
  legal_dig_date: string;
  ticket_expires_at: string;
  update_by_date: string | null;
  work_date: string | null;
  excavator_company: string | null;
  done_for: string | null;
  risk_score: number;
  has_gas_utility: boolean;
  has_electric_utility: boolean;
  project_name?: string;
}

interface RadarData {
  workingToday: TicketSummary[];
  expiringToday: TicketSummary[];
  updateDueToday: TicketSummary[];
  pendingResponses: TicketSummary[];
  unverifiedUtilities: TicketSummary[];
  highRisk: TicketSummary[];
  allClear: TicketSummary[];
  stats: {
    totalActive: number;
    workingToday: number;
    expiringToday: number;
    updateDueToday: number;
    pendingResponses: number;
    unverifiedUtilities: number;
    highRisk: number;
    allClear: number;
  };
}

interface RecipientInfo {
  user_id: string;
  email: string;
  first_name?: string;
}

/**
 * WV811 Morning Coffee Brief Edge Function
 *
 * "Good morning! Here's your 811 Safety Radar for today."
 *
 * A personalized daily briefing delivered at 6:00 AM to help PMs
 * start their day with complete visibility into 811 ticket status.
 *
 * Features:
 * - Personalized greeting with recipient's name
 * - Critical items requiring immediate action (red zone)
 * - Watch items for the week (yellow zone)
 * - All clear confirmations (green zone)
 * - High-risk digs with gas/electric utilities flagged
 * - Unverified utilities (proceed at risk warnings)
 * - Update-by deadline reminders
 */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const threeDaysOut = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

    // Fetch all active tickets with utility response counts
    const { data: tickets, error: fetchError } = await supabase
      .from('wv811_tickets')
      .select(`
        *,
        wv811_utility_responses(response_status)
      `)
      .not('status', 'in', '("EXPIRED","CANCELLED")')
      .order('ticket_expires_at', { ascending: true });

    if (fetchError) throw fetchError;

    const allTickets = (tickets || []).map((t) => {
      const responses = t.wv811_utility_responses || [];
      const hasUnverified = responses.some((r: { response_status: string }) => r.response_status === 'UNVERIFIED');
      const hasConflict = responses.some((r: { response_status: string }) => r.response_status === 'CONFLICT');
      const allClear = responses.every(
        (r: { response_status: string }) =>
          ['CLEAR', 'MARKED', 'VERIFIED_ON_SITE', 'NOT_APPLICABLE'].includes(r.response_status)
      );
      return {
        ...t,
        has_unverified: hasUnverified,
        has_conflict: hasConflict,
        all_utilities_clear: allClear && responses.length > 0,
      };
    }) as (TicketSummary & { has_unverified: boolean; has_conflict: boolean; all_utilities_clear: boolean })[];

    // Categorize tickets
    const workingToday = allTickets.filter((t) => t.work_date && t.work_date.startsWith(today));

    const expiringToday = allTickets.filter(
      (t) => t.ticket_expires_at && t.ticket_expires_at <= tomorrow
    );

    const updateDueToday = allTickets.filter(
      (t) => t.update_by_date && t.update_by_date.startsWith(today)
    );

    const pendingResponses = allTickets.filter((t) => t.status === 'PENDING');

    const unverifiedUtilities = allTickets.filter((t) => t.has_unverified);

    const highRisk = allTickets.filter(
      (t) => t.risk_score >= 70 || t.has_gas_utility || t.has_electric_utility || t.has_conflict
    );

    const allClear = allTickets.filter((t) => t.all_utilities_clear && t.status === 'CLEAR');

    // Tickets expiring within 3 days (for "watch this week" section)
    const expiringSoon = allTickets.filter(
      (t) => t.ticket_expires_at && t.ticket_expires_at <= threeDaysOut && t.ticket_expires_at > tomorrow
    );

    const radarData: RadarData = {
      workingToday,
      expiringToday,
      updateDueToday,
      pendingResponses,
      unverifiedUtilities,
      highRisk,
      allClear,
      stats: {
        totalActive: allTickets.length,
        workingToday: workingToday.length,
        expiringToday: expiringToday.length,
        updateDueToday: updateDueToday.length,
        pendingResponses: pendingResponses.length,
        unverifiedUtilities: unverifiedUtilities.length,
        highRisk: highRisk.length,
        allClear: allClear.length,
      },
    };

    // Get subscribed users for daily radar with their names
    const { data: subscriptions } = await supabase
      .from('wv811_user_alert_preferences')
      .select(`
        user_id,
        daily_radar_enabled,
        user_profiles:user_id (first_name, email)
      `)
      .eq('daily_radar_enabled', true);

    const recipients: RecipientInfo[] = (subscriptions || [])
      .filter((s) => s.user_profiles)
      .map((s) => ({
        user_id: s.user_id,
        email: s.user_profiles.email,
        first_name: s.user_profiles.first_name,
      }));

    // For now, generate a sample email for the first recipient
    const sampleRecipient = recipients[0] || { first_name: 'Team' };
    const emailHtml = generateMorningCoffeeEmail(radarData, today, sampleRecipient.first_name || 'Team', expiringSoon);

    console.log('Morning Coffee Brief Generated');
    console.log('Recipients:', recipients.length);

    // Record that we sent the radar
    await supabase.from('wv811_daily_radar_sends').insert({
      sent_at: new Date().toISOString(),
      recipient_count: recipients.length,
      stats: radarData.stats,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Morning Coffee Brief generated',
        stats: radarData.stats,
        recipientCount: recipients.length,
        emailHtml: emailHtml.substring(0, 500) + '...', // Preview only
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Morning Coffee Brief error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate brief' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateMorningCoffeeEmail(
  data: RadarData,
  dateStr: string,
  recipientName: string,
  expiringSoon: TicketSummary[]
): string {
  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (d: string | null) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const today = new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Determine greeting based on time
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Determine overall status message
  let statusMessage = '';
  let statusEmoji = '';
  if (data.stats.expiringToday > 0 || data.stats.updateDueToday > 0) {
    statusMessage = 'You have items requiring immediate attention.';
    statusEmoji = '';
  } else if (data.stats.unverifiedUtilities > 0) {
    statusMessage = 'Some tickets have unverified utilities. Verify before digging.';
    statusEmoji = '';
  } else if (data.stats.totalActive > 0 && data.stats.allClear > 0) {
    statusMessage = `${data.stats.allClear} of ${data.stats.totalActive} tickets fully cleared.`;
    statusEmoji = '';
  } else {
    statusMessage = 'All systems operational. Stay safe out there.';
    statusEmoji = '';
  }

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Morning Coffee Brief - ${today}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #faf5f0; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #78350f, #92400e); color: white; padding: 32px 24px; }
    .header-top { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .coffee-icon { font-size: 32px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 600; }
    .greeting { font-size: 18px; margin-bottom: 8px; opacity: 0.95; }
    .status-message { font-size: 14px; opacity: 0.85; }
    .date-line { font-size: 12px; opacity: 0.7; margin-top: 12px; }
    .quick-stats { display: flex; padding: 0; background: #fffbeb; }
    .quick-stat { flex: 1; text-align: center; padding: 16px 8px; border-right: 1px solid #fef3c7; }
    .quick-stat:last-child { border-right: none; }
    .quick-stat-value { font-size: 24px; font-weight: 700; }
    .quick-stat-label { font-size: 11px; color: #78350f; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
    .stat-critical .quick-stat-value { color: #dc2626; }
    .stat-warning .quick-stat-value { color: #ea580c; }
    .stat-info .quick-stat-value { color: #2563eb; }
    .stat-success .quick-stat-value { color: #16a34a; }
    .section { margin: 20px; }
    .section-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; }
    .section-icon { font-size: 18px; }
    .section-title { font-size: 14px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
    .section-count { font-size: 12px; color: #64748b; margin-left: auto; }
    .zone { border-radius: 10px; overflow: hidden; margin-bottom: 16px; }
    .zone-red { background: #fef2f2; border: 1px solid #fecaca; }
    .zone-red .zone-label { background: #dc2626; color: white; }
    .zone-orange { background: #fff7ed; border: 1px solid #fed7aa; }
    .zone-orange .zone-label { background: #ea580c; color: white; }
    .zone-yellow { background: #fefce8; border: 1px solid #fef08a; }
    .zone-yellow .zone-label { background: #ca8a04; color: white; }
    .zone-blue { background: #eff6ff; border: 1px solid #bfdbfe; }
    .zone-blue .zone-label { background: #2563eb; color: white; }
    .zone-green { background: #f0fdf4; border: 1px solid #bbf7d0; }
    .zone-green .zone-label { background: #16a34a; color: white; }
    .zone-label { padding: 8px 14px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; }
    .ticket { padding: 12px 14px; border-bottom: 1px solid rgba(0,0,0,0.05); }
    .ticket:last-child { border-bottom: none; }
    .ticket-header { display: flex; align-items: center; gap: 8px; }
    .ticket-number { font-weight: 600; color: #1e293b; font-size: 14px; }
    .flag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
    .flag-gas { background: #fef3c7; color: #92400e; }
    .flag-electric { background: #fef08a; color: #854d0e; }
    .flag-unverified { background: #fed7aa; color: #9a3412; }
    .flag-conflict { background: #fecaca; color: #991b1b; }
    .ticket-address { font-size: 13px; color: #64748b; margin-top: 4px; }
    .ticket-meta { font-size: 12px; color: #94a3b8; margin-top: 4px; display: flex; gap: 12px; flex-wrap: wrap; }
    .ticket-meta strong { color: #475569; }
    .urgent { color: #dc2626 !important; font-weight: 600; }
    .warning-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 12px; margin: 16px 20px; display: flex; align-items: flex-start; gap: 10px; }
    .warning-box-icon { font-size: 18px; }
    .warning-box-text { font-size: 13px; color: #92400e; line-height: 1.5; }
    .all-clear-box { background: #dcfce7; border: 1px solid #86efac; border-radius: 8px; padding: 20px; margin: 16px 20px; text-align: center; }
    .all-clear-icon { font-size: 32px; margin-bottom: 8px; }
    .all-clear-text { font-size: 15px; color: #166534; font-weight: 500; }
    .all-clear-sub { font-size: 13px; color: #15803d; margin-top: 4px; }
    .footer { padding: 24px 20px; text-align: center; background: #faf5f0; border-top: 1px solid #f5e6d3; }
    .cta { display: inline-block; padding: 14px 28px; background: #78350f; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .cta:hover { background: #92400e; }
    .footer-text { font-size: 12px; color: #78350f; margin-top: 16px; opacity: 0.8; }
    .footer-links { margin-top: 12px; font-size: 12px; }
    .footer-links a { color: #92400e; text-decoration: none; margin: 0 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-top">
        <span class="coffee-icon">☕</span>
        <h1>Morning Coffee Brief</h1>
      </div>
      <div class="greeting">${greeting}, ${recipientName}.</div>
      <div class="status-message">${statusEmoji} ${statusMessage}</div>
      <div class="date-line">${today}</div>
    </div>

    <div class="quick-stats">
      <div class="quick-stat stat-info">
        <div class="quick-stat-value">${data.stats.totalActive}</div>
        <div class="quick-stat-label">Active</div>
      </div>
      <div class="quick-stat ${data.stats.expiringToday > 0 ? 'stat-critical' : 'stat-success'}">
        <div class="quick-stat-value">${data.stats.expiringToday}</div>
        <div class="quick-stat-label">Expiring</div>
      </div>
      <div class="quick-stat ${data.stats.pendingResponses > 0 ? 'stat-warning' : 'stat-success'}">
        <div class="quick-stat-value">${data.stats.pendingResponses}</div>
        <div class="quick-stat-label">Pending</div>
      </div>
      <div class="quick-stat stat-success">
        <div class="quick-stat-value">${data.stats.allClear}</div>
        <div class="quick-stat-label">Clear</div>
      </div>
    </div>`;

  // Critical Section (Red Zone)
  const hasCritical = data.expiringToday.length > 0 || data.updateDueToday.length > 0;
  if (hasCritical) {
    html += `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">🔴</span>
        <span class="section-title">Critical - Needs Action Today</span>
      </div>
      <div class="zone zone-red">
        <div class="zone-label">IMMEDIATE ATTENTION REQUIRED</div>`;

    for (const ticket of data.expiringToday.slice(0, 4)) {
      html += `
        <div class="ticket">
          <div class="ticket-header">
            <span class="ticket-number">#${ticket.ticket_number}</span>
            ${ticket.has_gas_utility ? '<span class="flag flag-gas">GAS</span>' : ''}
            ${ticket.has_electric_utility ? '<span class="flag flag-electric">ELEC</span>' : ''}
          </div>
          <div class="ticket-address">${ticket.dig_site_address}${ticket.dig_site_city ? `, ${ticket.dig_site_city}` : ''}</div>
          <div class="ticket-meta">
            <span class="urgent">Expires: ${formatDate(ticket.ticket_expires_at)} ${formatTime(ticket.ticket_expires_at)}</span>
          </div>
        </div>`;
    }

    for (const ticket of data.updateDueToday.filter((t) => !data.expiringToday.includes(t)).slice(0, 3)) {
      html += `
        <div class="ticket">
          <div class="ticket-header">
            <span class="ticket-number">#${ticket.ticket_number}</span>
          </div>
          <div class="ticket-address">${ticket.dig_site_address}</div>
          <div class="ticket-meta">
            <span class="urgent">Update-By Deadline: TODAY</span>
          </div>
        </div>`;
    }

    html += `
      </div>
    </div>`;
  }

  // Unverified Utilities Warning
  if (data.unverifiedUtilities.length > 0) {
    html += `
    <div class="warning-box">
      <span class="warning-box-icon">⚠️</span>
      <div class="warning-box-text">
        <strong>${data.stats.unverifiedUtilities} ticket${data.stats.unverifiedUtilities > 1 ? 's' : ''} with unverified utilities.</strong>
        Utility response window closed without confirmation. May proceed at own risk per WV law, but verify marks before digging.
      </div>
    </div>`;
  }

  // Watch This Week (Yellow Zone)
  if (expiringSoon.length > 0 || data.pendingResponses.length > 0) {
    html += `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">🟡</span>
        <span class="section-title">Watch This Week</span>
        <span class="section-count">${expiringSoon.length + data.pendingResponses.length} items</span>
      </div>`;

    if (expiringSoon.length > 0) {
      html += `
      <div class="zone zone-yellow">
        <div class="zone-label">EXPIRING WITHIN 3 DAYS</div>`;
      for (const ticket of expiringSoon.slice(0, 3)) {
        html += `
        <div class="ticket">
          <div class="ticket-header">
            <span class="ticket-number">#${ticket.ticket_number}</span>
          </div>
          <div class="ticket-address">${ticket.dig_site_address}</div>
          <div class="ticket-meta">Expires: ${formatDate(ticket.ticket_expires_at)}</div>
        </div>`;
      }
      html += `</div>`;
    }

    if (data.pendingResponses.length > 0) {
      html += `
      <div class="zone zone-blue">
        <div class="zone-label">AWAITING UTILITY RESPONSE</div>`;
      for (const ticket of data.pendingResponses.slice(0, 3)) {
        html += `
        <div class="ticket">
          <div class="ticket-header">
            <span class="ticket-number">#${ticket.ticket_number}</span>
          </div>
          <div class="ticket-address">${ticket.dig_site_address}</div>
          <div class="ticket-meta">Dig Date: ${formatDate(ticket.legal_dig_date)}</div>
        </div>`;
      }
      if (data.pendingResponses.length > 3) {
        html += `<div class="ticket" style="text-align: center; color: #64748b; font-size: 13px;">+ ${data.pendingResponses.length - 3} more pending</div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
  }

  // High Risk Digs
  if (data.highRisk.length > 0) {
    const highRiskOnly = data.highRisk.filter(
      (t) => !data.expiringToday.includes(t) && !data.updateDueToday.includes(t)
    );
    if (highRiskOnly.length > 0) {
      html += `
    <div class="section">
      <div class="section-header">
        <span class="section-icon">⚡</span>
        <span class="section-title">High Risk Digs</span>
        <span class="section-count">${highRiskOnly.length} tickets</span>
      </div>
      <div class="zone zone-orange">
        <div class="zone-label">EXTRA CAUTION REQUIRED</div>`;
      for (const ticket of highRiskOnly.slice(0, 4)) {
        html += `
        <div class="ticket">
          <div class="ticket-header">
            <span class="ticket-number">#${ticket.ticket_number}</span>
            ${ticket.has_gas_utility ? '<span class="flag flag-gas">GAS</span>' : ''}
            ${ticket.has_electric_utility ? '<span class="flag flag-electric">ELEC</span>' : ''}
          </div>
          <div class="ticket-address">${ticket.dig_site_address}</div>
          <div class="ticket-meta">
            ${ticket.project_name ? `<span><strong>Project:</strong> ${ticket.project_name}</span>` : ''}
            ${ticket.excavator_company ? `<span>${ticket.excavator_company}</span>` : ''}
          </div>
        </div>`;
      }
      html += `
      </div>
    </div>`;
    }
  }

  // All Clear Section
  if (data.allClear.length > 0 && data.stats.expiringToday === 0) {
    html += `
    <div class="all-clear-box">
      <div class="all-clear-icon">✅</div>
      <div class="all-clear-text">${data.stats.allClear} ticket${data.stats.allClear > 1 ? 's' : ''} fully cleared</div>
      <div class="all-clear-sub">All utilities confirmed - safe to proceed</div>
    </div>`;
  }

  // If nothing to show
  if (data.stats.totalActive === 0) {
    html += `
    <div class="all-clear-box">
      <div class="all-clear-icon">☀️</div>
      <div class="all-clear-text">No active tickets requiring attention</div>
      <div class="all-clear-sub">Enjoy your coffee!</div>
    </div>`;
  }

  html += `
    <div class="footer">
      <a href="#" class="cta">View Full Dashboard</a>
      <p class="footer-text">This is your Morning Coffee Brief from Triton AI Platform.<br>Always call 811 before you dig!</p>
      <div class="footer-links">
        <a href="#">Manage Preferences</a> |
        <a href="#">Unsubscribe</a>
      </div>
    </div>
  </div>
</body>
</html>`;

  return html;
}
