// WV811 Weekly Safety Report - Monday Morning Briefing
// Automated email report sent every Monday at 6:00 AM
// Includes: Risk Score, At-Risk Projects, Hero of the Week, Vendor of Shame

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WeeklyMetrics {
  riskScore: number;
  totalActiveTickets: number;
  fullyDocumented: number;
  noPhotos: number;
  evidenceCoverageRatio: number;
  expiringThisWeek: Array<{
    ticketNumber: string;
    address: string;
    expiresAt: string;
    daysLeft: number;
  }>;
  heroOfTheWeek: {
    name: string;
    photoCount: number;
    ticketsDocumented: number;
  } | null;
  vendorOfShame: {
    name: string;
    conflicts: number;
    avgResponseHours: number;
  } | null;
  weeklyStats: {
    newTickets: number;
    resolved: number;
    conflicts: number;
    photosUploaded: number;
  };
  silentAssentPercentage: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, email } = await req.json();

    // Calculate metrics
    const metrics = await calculateWeeklyMetrics(supabase);

    if (action === 'preview') {
      // Just return the metrics for preview
      return new Response(
        JSON.stringify({ success: true, metrics }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get recipients - users who have weekly report enabled
    let recipients: string[] = [];

    if (email) {
      // Single email override for testing
      recipients = [email];
    } else {
      // Get all users with weekly report enabled
      const { data: prefs } = await supabase
        .from('wv811_user_alert_preferences')
        .select('user_id, user_profiles(email)')
        .eq('weekly_report_enabled', true);

      if (prefs && prefs.length > 0) {
        recipients = prefs
          .map((p: any) => p.user_profiles?.email)
          .filter(Boolean);
      }

      // If no preferences set, send to admins
      if (recipients.length === 0) {
        const { data: admins } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('role', 'admin');

        recipients = (admins || []).map((a: any) => a.email).filter(Boolean);
      }
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No recipients configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate and send the email
    const html = generateWeeklyReportEmail(metrics);
    const subject = `📊 Weekly 811 Safety Pulse - Risk Score: ${metrics.riskScore}/100`;

    // Send via email-send function
    const emailResponse = await fetch(`${supabaseUrl}/functions/v1/email-send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: recipients,
        subject,
        html,
      }),
    });

    const emailResult = await emailResponse.json();

    // Log the report
    await supabase.from('email_logs').insert({
      to_addresses: recipients,
      subject,
      status: emailResult.success ? 'sent' : 'failed',
      email_type: 'weekly_report',
      metadata: { metrics, recipients_count: recipients.length },
    });

    return new Response(
      JSON.stringify({
        success: true,
        recipientCount: recipients.length,
        metrics,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Weekly report error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate report' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function calculateWeeklyMetrics(supabase: any): Promise<WeeklyMetrics> {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Fetch all active tickets
  const { data: tickets } = await supabase
    .from('wv811_tickets')
    .select('*')
    .not('status', 'in', '("CANCELLED")');

  const allTickets = tickets || [];

  // Fetch photos with uploader info (last week)
  const { data: photos } = await supabase
    .from('wv811_ticket_photos')
    .select('*, user_profiles(first_name, last_name)')
    .gte('created_at', oneWeekAgo.toISOString());

  const allPhotos = photos || [];

  // Fetch utility responses
  const { data: utilities } = await supabase
    .from('wv811_ticket_utilities')
    .select('*');

  const allUtilities = utilities || [];

  // Calculate Evidence Coverage Ratio
  const activeTickets = allTickets.filter((t: any) =>
    ['ACTIVE', 'PENDING', 'GREEN', 'CLEAR_TO_DIG', 'RECEIVED'].includes(t.status)
  );

  const { data: allTicketPhotos } = await supabase
    .from('wv811_ticket_photos')
    .select('ticket_id, category, ai_categories');

  const photosByTicket = new Map<string, any[]>();
  (allTicketPhotos || []).forEach((p: any) => {
    const existing = photosByTicket.get(p.ticket_id) || [];
    existing.push(p);
    photosByTicket.set(p.ticket_id, existing);
  });

  let fullyDocumented = 0;
  let noPhotos = 0;

  activeTickets.forEach((ticket: any) => {
    const ticketPhotos = photosByTicket.get(ticket.id) || [];
    if (ticketPhotos.length === 0) {
      noPhotos++;
    } else {
      const categories = ticketPhotos.flatMap((p: any) =>
        p.ai_categories || [p.category]
      ).filter(Boolean);

      const hasEvidence = categories.some((c: string) =>
        c?.toLowerCase().includes('white') ||
        c?.toLowerCase().includes('paint') ||
        c?.toLowerCase().includes('mark') ||
        c?.toLowerCase().includes('line')
      );

      if (hasEvidence) {
        fullyDocumented++;
      }
    }
  });

  const evidenceCoverageRatio = activeTickets.length > 0
    ? Math.round((fullyDocumented / activeTickets.length) * 100)
    : 100;

  // Calculate Risk Score (0-100, higher is better)
  // Factors: ECR, conflict rate, expiring tickets, photo coverage
  const conflictRate = activeTickets.length > 0
    ? (allTickets.filter((t: any) => t.status === 'CONFLICT').length / activeTickets.length) * 100
    : 0;

  const expiringCount = allTickets.filter((t: any) => {
    if (!t.ticket_expires_at) return false;
    const expires = new Date(t.ticket_expires_at);
    return expires <= oneWeekFromNow && !['EXPIRED', 'CANCELLED', 'CLEAR'].includes(t.status);
  }).length;

  const expiringPenalty = Math.min(expiringCount * 5, 25);
  const conflictPenalty = Math.min(conflictRate * 2, 25);
  const coveragePenalty = Math.max(0, (100 - evidenceCoverageRatio) / 2);

  const riskScore = Math.max(0, Math.round(100 - expiringPenalty - conflictPenalty - coveragePenalty));

  // Expiring this week
  const expiringThisWeek = allTickets
    .filter((t: any) => {
      if (!t.ticket_expires_at) return false;
      const expires = new Date(t.ticket_expires_at);
      return expires <= oneWeekFromNow && !['EXPIRED', 'CANCELLED', 'CLEAR'].includes(t.status);
    })
    .map((t: any) => {
      const expires = new Date(t.ticket_expires_at);
      const daysLeft = Math.ceil((expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        ticketNumber: t.ticket_number,
        address: t.dig_site_address,
        expiresAt: t.ticket_expires_at,
        daysLeft: Math.max(0, daysLeft),
      };
    })
    .sort((a: any, b: any) => a.daysLeft - b.daysLeft)
    .slice(0, 10);

  // Hero of the Week - most photos uploaded
  const photoCountByUser = new Map<string, { name: string; count: number; tickets: Set<string> }>();

  allPhotos.forEach((p: any) => {
    if (!p.uploaded_by) return;
    const existing = photoCountByUser.get(p.uploaded_by) || {
      name: p.user_profiles
        ? `${p.user_profiles.first_name || ''} ${p.user_profiles.last_name || ''}`.trim()
        : 'Unknown',
      count: 0,
      tickets: new Set<string>(),
    };
    existing.count++;
    existing.tickets.add(p.ticket_id);
    photoCountByUser.set(p.uploaded_by, existing);
  });

  let heroOfTheWeek = null;
  let maxPhotos = 0;

  photoCountByUser.forEach((data, _userId) => {
    if (data.count > maxPhotos) {
      maxPhotos = data.count;
      heroOfTheWeek = {
        name: data.name || 'Unknown User',
        photoCount: data.count,
        ticketsDocumented: data.tickets.size,
      };
    }
  });

  // Vendor of Shame - most conflicts or slowest response
  const utilityMetrics = new Map<string, { conflicts: number; responseTimes: number[] }>();

  allUtilities.forEach((u: any) => {
    const name = u.utility_name || 'Unknown';
    const existing = utilityMetrics.get(name) || { conflicts: 0, responseTimes: [] };

    if (u.response_status === 'CONFLICT') {
      existing.conflicts++;
    }

    if (u.response_date && u.created_at) {
      const responseTime = (new Date(u.response_date).getTime() - new Date(u.created_at).getTime()) / (1000 * 60 * 60);
      if (responseTime > 0 && responseTime < 720) {
        existing.responseTimes.push(responseTime);
      }
    }

    utilityMetrics.set(name, existing);
  });

  let vendorOfShame = null;
  let worstScore = 0;

  utilityMetrics.forEach((data, name) => {
    const avgResponse = data.responseTimes.length > 0
      ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length
      : 0;

    const score = data.conflicts * 10 + avgResponse;

    if (score > worstScore && (data.conflicts > 0 || avgResponse > 48)) {
      worstScore = score;
      vendorOfShame = {
        name,
        conflicts: data.conflicts,
        avgResponseHours: Math.round(avgResponse),
      };
    }
  });

  // Weekly stats
  const newTicketsThisWeek = allTickets.filter((t: any) =>
    new Date(t.created_at) >= oneWeekAgo
  ).length;

  const resolvedThisWeek = allTickets.filter((t: any) =>
    t.cleared_at && new Date(t.cleared_at) >= oneWeekAgo
  ).length;

  const conflictsThisWeek = allTickets.filter((t: any) =>
    t.status === 'CONFLICT' && new Date(t.updated_at) >= oneWeekAgo
  ).length;

  // Silent Assent percentage
  const clearedTickets = allTickets.filter((t: any) =>
    ['GREEN', 'CLEAR', 'CLEAR_TO_DIG'].includes(t.status)
  );

  const silentAssentCount = clearedTickets.filter((t: any) =>
    t.cleared_method === 'TIME_EXPIRATION' || t.cleared_method === 'SILENT_ASSENT'
  ).length;

  const silentAssentPercentage = clearedTickets.length > 0
    ? Math.round((silentAssentCount / clearedTickets.length) * 100)
    : 0;

  return {
    riskScore,
    totalActiveTickets: activeTickets.length,
    fullyDocumented,
    noPhotos,
    evidenceCoverageRatio,
    expiringThisWeek,
    heroOfTheWeek,
    vendorOfShame,
    weeklyStats: {
      newTickets: newTicketsThisWeek,
      resolved: resolvedThisWeek,
      conflicts: conflictsThisWeek,
      photosUploaded: allPhotos.length,
    },
    silentAssentPercentage,
  };
}

function generateWeeklyReportEmail(metrics: WeeklyMetrics): string {
  const riskColor = metrics.riskScore >= 80 ? '#10b981' : metrics.riskScore >= 50 ? '#f59e0b' : '#ef4444';
  const riskLabel = metrics.riskScore >= 80 ? 'GOOD' : metrics.riskScore >= 50 ? 'MODERATE' : 'AT RISK';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #ffffff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 8px;">📊</div>
      <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Weekly Safety Pulse</h1>
      <p style="margin: 8px 0 0 0; opacity: 0.9;">${today}</p>
    </div>

    <!-- Risk Score -->
    <div style="padding: 24px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <div style="display: inline-block; width: 140px; height: 140px; border-radius: 50%; border: 6px solid ${riskColor}; background: rgba(255,255,255,0.05);">
        <div style="padding-top: 35px;">
          <span style="font-size: 48px; font-weight: 700; color: ${riskColor};">${metrics.riskScore}</span>
          <br>
          <span style="font-size: 12px; color: #9ca3af; text-transform: uppercase;">Risk Score</span>
        </div>
      </div>
      <div style="margin-top: 16px;">
        <span style="display: inline-block; padding: 6px 16px; background: ${riskColor}20; color: ${riskColor}; border-radius: 16px; font-weight: 600; font-size: 14px;">
          ${riskLabel}
        </span>
      </div>
    </div>

    <!-- Quick Stats -->
    <div style="padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">This Week's Activity</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px 0 0 8px; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #3b82f6;">${metrics.weeklyStats.newTickets}</div>
            <div style="font-size: 12px; color: #9ca3af;">New Tickets</div>
          </td>
          <td style="padding: 12px; background: rgba(16, 185, 129, 0.1); text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #10b981;">${metrics.weeklyStats.resolved}</div>
            <div style="font-size: 12px; color: #9ca3af;">Resolved</div>
          </td>
          <td style="padding: 12px; background: rgba(239, 68, 68, 0.1); text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #ef4444;">${metrics.weeklyStats.conflicts}</div>
            <div style="font-size: 12px; color: #9ca3af;">Conflicts</div>
          </td>
          <td style="padding: 12px; background: rgba(139, 92, 246, 0.1); border-radius: 0 8px 8px 0; text-align: center;">
            <div style="font-size: 28px; font-weight: 700; color: #8b5cf6;">${metrics.weeklyStats.photosUploaded}</div>
            <div style="font-size: 12px; color: #9ca3af;">Photos</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Evidence Coverage -->
    <div style="padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">Evidence Coverage</h2>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <span style="font-size: 36px; font-weight: 700; color: ${metrics.evidenceCoverageRatio >= 80 ? '#10b981' : metrics.evidenceCoverageRatio >= 50 ? '#f59e0b' : '#ef4444'};">
            ${metrics.evidenceCoverageRatio}%
          </span>
          <span style="font-size: 14px; color: #9ca3af;"> documented</span>
        </div>
        <div style="text-align: right; font-size: 13px; color: #9ca3af;">
          <div>✅ ${metrics.fullyDocumented} with evidence</div>
          <div>⚠️ ${metrics.noPhotos} exposed (no photos)</div>
        </div>
      </div>
      ${metrics.silentAssentPercentage > 50 ? `
      <div style="margin-top: 16px; padding: 12px; background: rgba(245, 158, 11, 0.15); border-radius: 8px; font-size: 13px; color: #fcd34d;">
        ⚠️ ${metrics.silentAssentPercentage}% of clearances are via Silent Assent - consider requesting human confirmation
      </div>
      ` : ''}
    </div>

    <!-- At Risk Projects -->
    ${metrics.expiringThisWeek.length > 0 ? `
    <div style="padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #ef4444; text-transform: uppercase; letter-spacing: 1px;">⚠️ At Risk This Week (${metrics.expiringThisWeek.length})</h2>
      <div style="background: rgba(239, 68, 68, 0.1); border-radius: 8px; padding: 4px;">
        ${metrics.expiringThisWeek.slice(0, 5).map(t => `
        <div style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-family: monospace; font-weight: 600;">${t.ticketNumber}</span>
            <span style="color: ${t.daysLeft <= 1 ? '#ef4444' : t.daysLeft <= 3 ? '#f59e0b' : '#9ca3af'}; font-size: 13px; font-weight: 600;">
              ${t.daysLeft === 0 ? 'TODAY!' : t.daysLeft === 1 ? 'TOMORROW' : `${t.daysLeft} days`}
            </span>
          </div>
          <div style="font-size: 13px; color: #9ca3af; margin-top: 4px;">${t.address}</div>
        </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Hero of the Week -->
    ${metrics.heroOfTheWeek ? `
    <div style="padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #10b981; text-transform: uppercase; letter-spacing: 1px;">🏆 Hero of the Week</h2>
      <div style="background: rgba(16, 185, 129, 0.1); border-radius: 8px; padding: 20px; text-align: center;">
        <div style="font-size: 24px; font-weight: 700; color: #10b981;">${metrics.heroOfTheWeek.name}</div>
        <div style="margin-top: 12px; display: flex; justify-content: center; gap: 24px;">
          <div>
            <span style="font-size: 28px; font-weight: 700;">${metrics.heroOfTheWeek.photoCount}</span>
            <div style="font-size: 12px; color: #9ca3af;">Photos</div>
          </div>
          <div>
            <span style="font-size: 28px; font-weight: 700;">${metrics.heroOfTheWeek.ticketsDocumented}</span>
            <div style="font-size: 12px; color: #9ca3af;">Tickets</div>
          </div>
        </div>
        <div style="margin-top: 12px; font-size: 13px; color: #9ca3af;">Most evidence photos uploaded this week!</div>
      </div>
    </div>
    ` : ''}

    <!-- Vendor of Shame -->
    ${metrics.vendorOfShame ? `
    <div style="padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.1);">
      <h2 style="margin: 0 0 16px 0; font-size: 16px; color: #f59e0b; text-transform: uppercase; letter-spacing: 1px;">🐌 Vendor Spotlight</h2>
      <div style="background: rgba(245, 158, 11, 0.1); border-radius: 8px; padding: 20px;">
        <div style="font-size: 20px; font-weight: 700; color: #f59e0b;">${metrics.vendorOfShame.name}</div>
        <div style="margin-top: 12px; font-size: 14px; color: #9ca3af;">
          ${metrics.vendorOfShame.conflicts > 0 ? `<div>❌ ${metrics.vendorOfShame.conflicts} conflicts this period</div>` : ''}
          ${metrics.vendorOfShame.avgResponseHours > 0 ? `<div>⏱️ ${metrics.vendorOfShame.avgResponseHours}hr avg response time</div>` : ''}
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: #9ca3af;">Consider escalating if issues persist</div>
      </div>
    </div>
    ` : ''}

    <!-- CTA -->
    <div style="padding: 32px; text-align: center;">
      <a href="https://triton.app/locate-tickets/analytics" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
        View Full Analytics →
      </a>
    </div>

    <!-- Footer -->
    <div style="background: #16162a; padding: 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
      <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 13px;">Triton AI Platform • Weekly Safety Report</p>
      <p style="margin: 0; color: #6b7280; font-size: 11px;">
        This automated report helps ensure 811 compliance and reduce liability exposure.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}
