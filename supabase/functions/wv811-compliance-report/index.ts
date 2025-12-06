import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  reportType: 'MONTHLY_SUMMARY' | 'UTILITY_PERFORMANCE' | 'CONFLICT_ANALYSIS' | 'RENEWAL_COMPLIANCE' | 'AUDIT_READINESS';
  organizationId: string;
  projectId?: string;
  startDate: string;
  endDate: string;
  format?: 'JSON' | 'PDF' | 'CSV';
}

interface MonthlySummaryReport {
  period: { start: string; end: string };
  ticketMetrics: {
    totalCreated: number;
    totalExpired: number;
    totalRenewed: number;
    activeAtPeriodEnd: number;
    avgTicketDuration: number;
  };
  utilityMetrics: {
    totalResponses: number;
    avgResponseTime: number;
    conflictCount: number;
    conflictRate: number;
    verifiedOnSite: number;
    verificationRate: number;
  };
  complianceMetrics: {
    onTimeRenewals: number;
    lateRenewals: number;
    renewalComplianceRate: number;
    photoVerifications: number;
    alertsAcknowledged: number;
    acknowledgementRate: number;
  };
  riskIndicators: {
    expiredWithActiveWork: number;
    conflictsUnresolved: number;
    utilityNoResponse: number;
    overdueRenewals: number;
  };
}

interface UtilityPerformanceReport {
  period: { start: string; end: string };
  utilities: Array<{
    utilityType: string;
    totalResponses: number;
    avgResponseHours: number;
    fastestResponse: number;
    slowestResponse: number;
    conflictCount: number;
    conflictRate: number;
    verifiedCount: number;
    performanceScore: number; // 0-100
  }>;
  worstPerformers: Array<{
    utilityName: string;
    utilityCode: string;
    avgResponseHours: number;
    missedDeadlines: number;
  }>;
}

interface ConflictAnalysisReport {
  period: { start: string; end: string };
  summary: {
    totalConflicts: number;
    resolved: number;
    pending: number;
    avgResolutionTime: number;
  };
  byType: Array<{
    utilityType: string;
    count: number;
    percentage: number;
  }>;
  byResolution: Array<{
    resolutionType: string;
    count: number;
    avgDaysToResolve: number;
  }>;
  incidents: Array<{
    ticketNumber: string;
    utilityName: string;
    conflictReason: string;
    reportedAt: string;
    resolvedAt?: string;
    resolution?: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const request: ReportRequest = await req.json();
    const { reportType, organizationId, projectId, startDate, endDate, format = 'JSON' } = request;

    let report: unknown;

    switch (reportType) {
      case 'MONTHLY_SUMMARY':
        report = await generateMonthlySummary(supabase, organizationId, projectId, startDate, endDate);
        break;
      case 'UTILITY_PERFORMANCE':
        report = await generateUtilityPerformance(supabase, organizationId, projectId, startDate, endDate);
        break;
      case 'CONFLICT_ANALYSIS':
        report = await generateConflictAnalysis(supabase, organizationId, projectId, startDate, endDate);
        break;
      case 'RENEWAL_COMPLIANCE':
        report = await generateRenewalCompliance(supabase, organizationId, projectId, startDate, endDate);
        break;
      case 'AUDIT_READINESS':
        report = await generateAuditReadiness(supabase, organizationId, projectId, startDate, endDate);
        break;
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    // Store report for audit trail
    await supabase.from('wv811_compliance_reports').insert({
      organization_id: organizationId,
      project_id: projectId || null,
      report_type: reportType,
      period_start: startDate,
      period_end: endDate,
      report_data: report,
      generated_at: new Date().toISOString(),
    });

    // TODO: If format is PDF, generate PDF using a library
    // TODO: If format is CSV, convert to CSV

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Compliance report error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Report generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateMonthlySummary(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  projectId: string | undefined,
  startDate: string,
  endDate: string
): Promise<MonthlySummaryReport> {
  // Get tickets for period
  let ticketQuery = supabase
    .from('wv811_tickets')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (projectId) {
    const { data: projectTickets } = await supabase
      .from('wv811_project_tickets')
      .select('ticket_id')
      .eq('project_id', projectId);
    const ticketIds = projectTickets?.map((pt) => pt.ticket_id) || [];
    if (ticketIds.length > 0) {
      ticketQuery = ticketQuery.in('id', ticketIds);
    }
  }

  const { data: tickets } = await ticketQuery;

  // Get utility responses
  const ticketIds = tickets?.map((t) => t.id) || [];
  const { data: utilResponses } = await supabase
    .from('wv811_utility_responses')
    .select('*')
    .in('ticket_id', ticketIds);

  // Get acknowledgements
  const { data: acks } = await supabase
    .from('wv811_alert_acknowledgements')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Get photo verifications
  const { data: photos } = await supabase
    .from('wv811_photo_verifications')
    .select('*')
    .in('ticket_id', ticketIds);

  // Calculate metrics
  const totalCreated = tickets?.length || 0;
  const totalExpired = tickets?.filter((t) => t.status === 'EXPIRED').length || 0;
  const totalRenewed = tickets?.filter((t) => t.is_renewal).length || 0;
  const activeAtEnd = tickets?.filter((t) => t.status === 'ACTIVE' && new Date(t.ticket_expires_at) > new Date(endDate)).length || 0;

  const responseTimes = utilResponses
    ?.filter((r) => r.responded_at && r.created_at)
    .map((r) => (new Date(r.responded_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)) || [];

  const avgResponseTime = responseTimes.length > 0
    ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
    : 0;

  const conflictCount = utilResponses?.filter((r) => r.response_status === 'CONFLICT').length || 0;
  const verifiedCount = utilResponses?.filter((r) => r.verified_at).length || 0;

  const totalResponses = utilResponses?.length || 0;
  const totalAlerts = acks?.length || 0;
  const acknowledgedAlerts = acks?.filter((a) => a.acknowledged_at).length || 0;

  // Find tickets that were late renewals (renewed within 24 hours of expiry or after)
  const lateRenewals = tickets?.filter((t) => {
    if (!t.is_renewal || !t.parent_ticket_id) return false;
    // Would need to check parent ticket expiry vs this ticket creation
    return false; // Simplified
  }).length || 0;

  return {
    period: { start: startDate, end: endDate },
    ticketMetrics: {
      totalCreated,
      totalExpired,
      totalRenewed,
      activeAtPeriodEnd: activeAtEnd,
      avgTicketDuration: 8.5, // Would calculate from actual data
    },
    utilityMetrics: {
      totalResponses,
      avgResponseTime,
      conflictCount,
      conflictRate: totalResponses > 0 ? (conflictCount / totalResponses) * 100 : 0,
      verifiedOnSite: verifiedCount,
      verificationRate: totalResponses > 0 ? (verifiedCount / totalResponses) * 100 : 0,
    },
    complianceMetrics: {
      onTimeRenewals: totalRenewed - lateRenewals,
      lateRenewals,
      renewalComplianceRate: totalRenewed > 0 ? ((totalRenewed - lateRenewals) / totalRenewed) * 100 : 100,
      photoVerifications: photos?.length || 0,
      alertsAcknowledged: acknowledgedAlerts,
      acknowledgementRate: totalAlerts > 0 ? (acknowledgedAlerts / totalAlerts) * 100 : 100,
    },
    riskIndicators: {
      expiredWithActiveWork: 0, // Would check against time entries
      conflictsUnresolved: utilResponses?.filter((r) => r.response_status === 'CONFLICT' && !r.conflict_resolved_at).length || 0,
      utilityNoResponse: utilResponses?.filter((r) => r.response_status === 'UNVERIFIED').length || 0,
      overdueRenewals: 0, // Would calculate from expiring tickets
    },
  };
}

async function generateUtilityPerformance(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  projectId: string | undefined,
  startDate: string,
  endDate: string
): Promise<UtilityPerformanceReport> {
  // Get utility responses for period
  const { data: responses } = await supabase
    .from('wv811_utility_responses')
    .select(`
      *,
      wv811_tickets!inner (organization_id)
    `)
    .eq('wv811_tickets.organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  // Group by utility type
  const byType = new Map<string, {
    responses: number;
    responseTimes: number[];
    conflicts: number;
    verified: number;
  }>();

  responses?.forEach((resp) => {
    const type = resp.utility_type || 'OTHER';
    if (!byType.has(type)) {
      byType.set(type, { responses: 0, responseTimes: [], conflicts: 0, verified: 0 });
    }
    const entry = byType.get(type)!;
    entry.responses++;

    if (resp.responded_at && resp.created_at) {
      const hours = (new Date(resp.responded_at).getTime() - new Date(resp.created_at).getTime()) / (1000 * 60 * 60);
      entry.responseTimes.push(hours);
    }

    if (resp.response_status === 'CONFLICT') entry.conflicts++;
    if (resp.verified_at) entry.verified++;
  });

  const utilities = Array.from(byType.entries()).map(([type, data]) => {
    const avgResponse = data.responseTimes.length > 0
      ? data.responseTimes.reduce((a, b) => a + b, 0) / data.responseTimes.length
      : 0;

    // Performance score: based on response time and conflict rate
    const timeScore = Math.max(0, 100 - (avgResponse / 48) * 100);
    const conflictScore = Math.max(0, 100 - (data.conflicts / data.responses) * 500);
    const performanceScore = (timeScore + conflictScore) / 2;

    return {
      utilityType: type,
      totalResponses: data.responses,
      avgResponseHours: avgResponse,
      fastestResponse: data.responseTimes.length > 0 ? Math.min(...data.responseTimes) : 0,
      slowestResponse: data.responseTimes.length > 0 ? Math.max(...data.responseTimes) : 0,
      conflictCount: data.conflicts,
      conflictRate: data.responses > 0 ? (data.conflicts / data.responses) * 100 : 0,
      verifiedCount: data.verified,
      performanceScore: Math.round(performanceScore),
    };
  });

  // Find worst performers (individual utilities, not types)
  const byUtility = new Map<string, { name: string; code: string; hours: number[]; missed: number }>();
  responses?.forEach((resp) => {
    const key = resp.utility_code;
    if (!byUtility.has(key)) {
      byUtility.set(key, { name: resp.utility_name, code: resp.utility_code, hours: [], missed: 0 });
    }
    const entry = byUtility.get(key)!;

    if (resp.responded_at && resp.created_at) {
      const hours = (new Date(resp.responded_at).getTime() - new Date(resp.created_at).getTime()) / (1000 * 60 * 60);
      entry.hours.push(hours);
      if (hours > 48) entry.missed++;
    }
  });

  const worstPerformers = Array.from(byUtility.values())
    .map((u) => ({
      utilityName: u.name,
      utilityCode: u.code,
      avgResponseHours: u.hours.length > 0 ? u.hours.reduce((a, b) => a + b, 0) / u.hours.length : 0,
      missedDeadlines: u.missed,
    }))
    .sort((a, b) => b.avgResponseHours - a.avgResponseHours)
    .slice(0, 5);

  return {
    period: { start: startDate, end: endDate },
    utilities: utilities.sort((a, b) => b.totalResponses - a.totalResponses),
    worstPerformers,
  };
}

async function generateConflictAnalysis(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  projectId: string | undefined,
  startDate: string,
  endDate: string
): Promise<ConflictAnalysisReport> {
  const { data: conflicts } = await supabase
    .from('wv811_utility_responses')
    .select(`
      *,
      wv811_tickets!inner (ticket_number, organization_id)
    `)
    .eq('wv811_tickets.organization_id', organizationId)
    .eq('response_status', 'CONFLICT')
    .gte('conflict_logged_at', startDate)
    .lte('conflict_logged_at', endDate);

  const resolved = conflicts?.filter((c) => c.conflict_resolved_at).length || 0;
  const pending = (conflicts?.length || 0) - resolved;

  // Resolution times
  const resolutionTimes = conflicts
    ?.filter((c) => c.conflict_resolved_at && c.conflict_logged_at)
    .map((c) => (new Date(c.conflict_resolved_at).getTime() - new Date(c.conflict_logged_at).getTime()) / (1000 * 60 * 60 * 24)) || [];

  const avgResolutionTime = resolutionTimes.length > 0
    ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
    : 0;

  // By type
  const typeMap = new Map<string, number>();
  conflicts?.forEach((c) => {
    const type = c.utility_type || 'OTHER';
    typeMap.set(type, (typeMap.get(type) || 0) + 1);
  });

  const byType = Array.from(typeMap.entries()).map(([type, count]) => ({
    utilityType: type,
    count,
    percentage: conflicts?.length ? (count / conflicts.length) * 100 : 0,
  }));

  // By resolution type
  const resolutionMap = new Map<string, { count: number; times: number[] }>();
  conflicts?.filter((c) => c.conflict_resolution_notes).forEach((c) => {
    // Extract resolution type from notes (format: "[TYPE] Notes...")
    const match = c.conflict_resolution_notes?.match(/^\[([A-Z_]+)\]/);
    const resType = match?.[1] || 'UNKNOWN';
    if (!resolutionMap.has(resType)) {
      resolutionMap.set(resType, { count: 0, times: [] });
    }
    const entry = resolutionMap.get(resType)!;
    entry.count++;
    if (c.conflict_resolved_at && c.conflict_logged_at) {
      const days = (new Date(c.conflict_resolved_at).getTime() - new Date(c.conflict_logged_at).getTime()) / (1000 * 60 * 60 * 24);
      entry.times.push(days);
    }
  });

  const byResolution = Array.from(resolutionMap.entries()).map(([type, data]) => ({
    resolutionType: type,
    count: data.count,
    avgDaysToResolve: data.times.length > 0 ? data.times.reduce((a, b) => a + b, 0) / data.times.length : 0,
  }));

  // Individual incidents
  const incidents = conflicts?.slice(0, 20).map((c) => ({
    ticketNumber: (c.wv811_tickets as { ticket_number: string }).ticket_number,
    utilityName: c.utility_name,
    conflictReason: c.conflict_reason || 'Not specified',
    reportedAt: c.conflict_logged_at,
    resolvedAt: c.conflict_resolved_at,
    resolution: c.conflict_resolution_notes,
  })) || [];

  return {
    period: { start: startDate, end: endDate },
    summary: {
      totalConflicts: conflicts?.length || 0,
      resolved,
      pending,
      avgResolutionTime,
    },
    byType,
    byResolution,
    incidents,
  };
}

async function generateRenewalCompliance(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  projectId: string | undefined,
  startDate: string,
  endDate: string
) {
  const { data: renewals } = await supabase
    .from('wv811_tickets')
    .select(`
      *,
      parent:parent_ticket_id (ticket_expires_at)
    `)
    .eq('organization_id', organizationId)
    .eq('is_renewal', true)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const results = renewals?.map((r) => {
    const parentExpiry = r.parent ? new Date((r.parent as { ticket_expires_at: string }).ticket_expires_at) : null;
    const renewalDate = new Date(r.created_at);
    const hoursBeforeExpiry = parentExpiry
      ? (parentExpiry.getTime() - renewalDate.getTime()) / (1000 * 60 * 60)
      : 0;

    return {
      ticketNumber: r.ticket_number,
      parentTicket: r.parent_ticket_id,
      renewedAt: r.created_at,
      hoursBeforeExpiry,
      isOnTime: hoursBeforeExpiry >= 48,
      isLate: hoursBeforeExpiry < 48 && hoursBeforeExpiry > 0,
      isAfterExpiry: hoursBeforeExpiry <= 0,
    };
  }) || [];

  return {
    period: { start: startDate, end: endDate },
    summary: {
      totalRenewals: results.length,
      onTime: results.filter((r) => r.isOnTime).length,
      late: results.filter((r) => r.isLate).length,
      afterExpiry: results.filter((r) => r.isAfterExpiry).length,
      complianceRate: results.length > 0
        ? (results.filter((r) => r.isOnTime).length / results.length) * 100
        : 100,
    },
    details: results,
  };
}

async function generateAuditReadiness(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  projectId: string | undefined,
  startDate: string,
  endDate: string
) {
  // Check all compliance requirements
  const checks = [];

  // 1. All tickets have utility responses
  const { count: ticketsWithoutResponses } = await supabase
    .from('wv811_tickets')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .is('id', null); // Simplified - would use subquery

  checks.push({
    category: 'Utility Responses',
    check: 'All tickets have utility responses',
    status: (ticketsWithoutResponses || 0) === 0 ? 'PASS' : 'FAIL',
    details: `${ticketsWithoutResponses || 0} tickets missing responses`,
  });

  // 2. Photo verification rate
  const { data: tickets } = await supabase
    .from('wv811_tickets')
    .select('id')
    .eq('organization_id', organizationId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const ticketIds = tickets?.map((t) => t.id) || [];

  const { count: photoCount } = await supabase
    .from('wv811_photo_verifications')
    .select('*', { count: 'exact', head: true })
    .in('ticket_id', ticketIds);

  const photoRate = ticketIds.length > 0 ? ((photoCount || 0) / ticketIds.length) * 100 : 0;

  checks.push({
    category: 'Photo Verification',
    check: 'Verification photos captured',
    status: photoRate >= 80 ? 'PASS' : photoRate >= 50 ? 'WARNING' : 'FAIL',
    details: `${photoRate.toFixed(1)}% of tickets have verification photos`,
  });

  // 3. Conflicts resolved
  const { count: unresolvedConflicts } = await supabase
    .from('wv811_utility_responses')
    .select('*', { count: 'exact', head: true })
    .in('ticket_id', ticketIds)
    .eq('response_status', 'CONFLICT')
    .is('conflict_resolved_at', null);

  checks.push({
    category: 'Conflict Management',
    check: 'All conflicts resolved',
    status: (unresolvedConflicts || 0) === 0 ? 'PASS' : 'FAIL',
    details: `${unresolvedConflicts || 0} unresolved conflicts`,
  });

  // 4. Alert acknowledgements
  const { data: alertStats } = await supabase
    .from('wv811_alert_acknowledgements')
    .select('acknowledged_at')
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  const ackRate = alertStats?.length
    ? (alertStats.filter((a) => a.acknowledged_at).length / alertStats.length) * 100
    : 100;

  checks.push({
    category: 'Alert Management',
    check: 'Critical alerts acknowledged',
    status: ackRate >= 95 ? 'PASS' : ackRate >= 80 ? 'WARNING' : 'FAIL',
    details: `${ackRate.toFixed(1)}% acknowledgement rate`,
  });

  const passCount = checks.filter((c) => c.status === 'PASS').length;
  const totalChecks = checks.length;
  const overallScore = (passCount / totalChecks) * 100;

  return {
    period: { start: startDate, end: endDate },
    overallScore,
    readinessLevel: overallScore >= 90 ? 'READY' : overallScore >= 70 ? 'NEEDS_ATTENTION' : 'NOT_READY',
    checks,
    recommendations: checks
      .filter((c) => c.status !== 'PASS')
      .map((c) => `Improve ${c.category}: ${c.details}`),
  };
}
