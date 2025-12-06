import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OfflineTicketData {
  id: string;
  ticketNumber: string;
  status: string;
  digSiteAddress: string;
  digSiteCity: string;
  digSiteCounty: string;
  latitude: number | null;
  longitude: number | null;
  legalDigDate: string;
  expiresAt: string;
  workType: string;
  workDescription: string | null;
  utilities: OfflineUtilityData[];
  canDig: boolean;
  canDigReason: string;
  riskLevel: 'CLEAR' | 'CAUTION' | 'WARNING' | 'STOP';
}

interface OfflineUtilityData {
  id: string;
  utilityName: string;
  utilityCode: string;
  utilityType: string | null;
  responseStatus: string;
  responseWindowClosesAt: string | null;
  verifiedOnSite: boolean;
  verifiedAt: string | null;
  hasConflict: boolean;
  conflictReason: string | null;
}

interface OfflineDataPackage {
  userId: string;
  organizationId: string;
  generatedAt: string;
  expiresAt: string;
  dataVersion: number;
  tickets: OfflineTicketData[];
  projects: { id: string; name: string; projectNumber: string }[];
  holidays: { date: string; name: string }[];
  stats: {
    totalActiveTickets: number;
    clearToDig: number;
    needsAttention: number;
    doNotDig: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, projectIds } = await req.json();

    if (!userId) {
      throw new Error('userId is required');
    }

    // Get user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!userProfile) {
      throw new Error('User not found');
    }

    const organizationId = userProfile.organization_id;

    // Get user's assigned projects if not specified
    let targetProjectIds = projectIds;
    if (!targetProjectIds || targetProjectIds.length === 0) {
      const { data: assignments } = await supabase
        .from('project_assignments')
        .select('project_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      targetProjectIds = assignments?.map((a) => a.project_id) || [];
    }

    // Get all active tickets for user's projects
    const { data: tickets, error: ticketsError } = await supabase
      .from('wv811_tickets')
      .select(`
        id,
        ticket_number,
        status,
        dig_site_address,
        dig_site_city,
        dig_site_county,
        dig_site_latitude,
        dig_site_longitude,
        legal_dig_date,
        ticket_expires_at,
        work_type,
        work_description,
        wv811_utility_responses (
          id,
          utility_name,
          utility_code,
          utility_type,
          response_status,
          response_window_closes_at,
          verified_by,
          verified_at,
          conflict_logged_by,
          conflict_reason
        ),
        wv811_project_tickets (
          project_id
        )
      `)
      .eq('organization_id', organizationId)
      .in('status', ['ACTIVE', 'PENDING', 'NEEDS_RENEWAL'])
      .gte('ticket_expires_at', new Date().toISOString());

    if (ticketsError) throw ticketsError;

    // Filter to only tickets for user's projects
    const userTickets = tickets?.filter((ticket) => {
      const ticketProjectIds = ticket.wv811_project_tickets?.map((pt: { project_id: string }) => pt.project_id) || [];
      return ticketProjectIds.some((pid: string) => targetProjectIds.includes(pid));
    }) || [];

    // Get projects info
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .in('id', targetProjectIds);

    // Get upcoming holidays for business day calculations
    const today = new Date();
    const thirtyDaysOut = new Date(today);
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    const { data: holidays } = await supabase
      .from('wv811_holidays')
      .select('holiday_date, holiday_name')
      .gte('holiday_date', today.toISOString().split('T')[0])
      .lte('holiday_date', thirtyDaysOut.toISOString().split('T')[0]);

    // Process tickets for offline use
    const now = new Date();
    const offlineTickets: OfflineTicketData[] = userTickets.map((ticket) => {
      const utilities: OfflineUtilityData[] = (ticket.wv811_utility_responses || []).map((util: Record<string, unknown>) => ({
        id: util.id as string,
        utilityName: util.utility_name as string,
        utilityCode: util.utility_code as string,
        utilityType: util.utility_type as string | null,
        responseStatus: util.response_status as string,
        responseWindowClosesAt: util.response_window_closes_at as string | null,
        verifiedOnSite: !!(util.verified_by),
        verifiedAt: util.verified_at as string | null,
        hasConflict: util.response_status === 'CONFLICT',
        conflictReason: util.conflict_reason as string | null,
      }));

      // Determine "Can I Dig?" status
      const { canDig, reason, riskLevel } = calculateCanDigStatus(ticket, utilities, now);

      return {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        status: ticket.status,
        digSiteAddress: ticket.dig_site_address,
        digSiteCity: ticket.dig_site_city,
        digSiteCounty: ticket.dig_site_county,
        latitude: ticket.dig_site_latitude,
        longitude: ticket.dig_site_longitude,
        legalDigDate: ticket.legal_dig_date,
        expiresAt: ticket.ticket_expires_at,
        workType: ticket.work_type,
        workDescription: ticket.work_description,
        utilities,
        canDig,
        canDigReason: reason,
        riskLevel,
      };
    });

    // Calculate stats
    const stats = {
      totalActiveTickets: offlineTickets.length,
      clearToDig: offlineTickets.filter((t) => t.riskLevel === 'CLEAR').length,
      needsAttention: offlineTickets.filter((t) => t.riskLevel === 'CAUTION' || t.riskLevel === 'WARNING').length,
      doNotDig: offlineTickets.filter((t) => t.riskLevel === 'STOP').length,
    };

    // Build offline package
    const offlinePackage: OfflineDataPackage = {
      userId,
      organizationId,
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      dataVersion: Date.now(),
      tickets: offlineTickets,
      projects: projects?.map((p) => ({
        id: p.id,
        name: p.name,
        projectNumber: p.project_number,
      })) || [],
      holidays: holidays?.map((h) => ({
        date: h.holiday_date,
        name: h.holiday_name,
      })) || [],
      stats,
    };

    // Log the sync
    await supabase.from('wv811_offline_sync_logs').insert({
      user_id: userId,
      organization_id: organizationId,
      sync_type: 'DOWNLOAD',
      tickets_synced: offlineTickets.length,
      data_size_bytes: JSON.stringify(offlinePackage).length,
      success: true,
    });

    return new Response(JSON.stringify(offlinePackage), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Offline sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Sync failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateCanDigStatus(
  ticket: Record<string, unknown>,
  utilities: OfflineUtilityData[],
  now: Date
): { canDig: boolean; reason: string; riskLevel: 'CLEAR' | 'CAUTION' | 'WARNING' | 'STOP' } {
  const expiresAt = new Date(ticket.ticket_expires_at as string);
  const legalDigDate = new Date(ticket.legal_dig_date as string);

  // Check if ticket is expired
  if (expiresAt < now) {
    return {
      canDig: false,
      reason: 'Ticket has expired. Request a new ticket before digging.',
      riskLevel: 'STOP',
    };
  }

  // Check if before legal dig date
  if (now < legalDigDate) {
    const hoursUntil = Math.ceil((legalDigDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    return {
      canDig: false,
      reason: `Legal dig date not reached. Wait ${hoursUntil} hours.`,
      riskLevel: 'STOP',
    };
  }

  // Check for any conflicts
  const conflicts = utilities.filter((u) => u.hasConflict);
  if (conflicts.length > 0) {
    const names = conflicts.map((c) => c.utilityName).join(', ');
    return {
      canDig: false,
      reason: `CONFLICT reported for: ${names}. Do not dig until resolved.`,
      riskLevel: 'STOP',
    };
  }

  // Check utility statuses
  const pending = utilities.filter((u) => u.responseStatus === 'PENDING');
  const unverified = utilities.filter((u) => u.responseStatus === 'UNVERIFIED');
  const cleared = utilities.filter((u) =>
    ['CLEAR', 'MARKED', 'NO_CONFLICT', 'NOT_APPLICABLE', 'VERIFIED_ON_SITE'].includes(u.responseStatus)
  );

  // All utilities pending - can't dig yet
  if (pending.length === utilities.length && utilities.length > 0) {
    return {
      canDig: false,
      reason: 'All utilities still pending response. Wait for response window to close.',
      riskLevel: 'WARNING',
    };
  }

  // Some pending
  if (pending.length > 0) {
    return {
      canDig: false,
      reason: `${pending.length} utilities still pending. Check response windows.`,
      riskLevel: 'WARNING',
    };
  }

  // All clear or verified
  if (cleared.length === utilities.length) {
    return {
      canDig: true,
      reason: 'All utilities confirmed clear. Verify marks on site before digging.',
      riskLevel: 'CLEAR',
    };
  }

  // Some unverified (window closed, no response)
  if (unverified.length > 0) {
    const names = unverified.map((u) => u.utilityName).join(', ');
    return {
      canDig: true,
      reason: `${unverified.length} utilities unverified (${names}). May proceed AT YOUR OWN RISK. Verify on site.`,
      riskLevel: 'CAUTION',
    };
  }

  // Default case
  return {
    canDig: true,
    reason: 'Ticket valid. Verify marks on site before digging.',
    riskLevel: 'CLEAR',
  };
}
