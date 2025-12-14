import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Type Definitions
// ============================================================================

interface SyncRequest {
  userId: string;
  deviceId: string;
  lastSyncVersion?: number;
  projectIds?: string[];
  includeWv811?: boolean;
}

interface OfflineProject {
  id: string;
  name: string;
  projectNumber: string;
  contractNumber: string | null;
  status: string;
  address: string | null;
  city: string | null;
  county: string | null;
  davisBaconRequired: boolean;
  dbeGoalPercentage: number | null;
  syncVersion: number;
}

interface OfflineCrewMember {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  tradeClassification: string | null;
  hourlyRate: number | null;
  isActive: boolean;
  syncVersion: number;
}

interface OfflineCostCode {
  id: string;
  projectId: string;
  code: string;
  description: string | null;
  category: string | null;
  parentId: string | null;
  isActive: boolean;
  syncVersion: number;
}

interface OfflineEquipment {
  id: string;
  equipmentNumber: string;
  name: string;
  category: string | null;
  status: string;
  currentProjectId: string | null;
  hourlyRate: number | null;
  syncVersion: number;
}

interface OfflineTimeEntry {
  id: string;
  offlineId: string | null;
  projectId: string;
  crewMemberId: string;
  costCodeId: string | null;
  workDate: string;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  status: string;
  notes: string | null;
  createdByOffline: boolean;
  syncVersion: number;
}

interface OfflineDailyReport {
  id: string;
  offlineId: string | null;
  projectId: string;
  reportDate: string;
  reportNumber: string | null;
  status: string;
  weatherConditions: string | null;
  temperatureHigh: number | null;
  temperatureLow: number | null;
  windSpeed: number | null;
  precipitation: number | null;
  summary: string | null;
  createdByOffline: boolean;
  syncVersion: number;
}

interface OfflineDailyReportEntry {
  id: string;
  offlineId: string | null;
  dailyReportId: string;
  entryType: string;
  description: string | null;
  costCodeId: string | null;
  quantity: number | null;
  unit: string | null;
  sortOrder: number;
  syncVersion: number;
}

interface OfflineEquipmentLog {
  id: string;
  offlineId: string | null;
  dailyReportId: string;
  equipmentId: string;
  projectId: string;
  hoursUsed: number | null;
  hoursIdle: number | null;
  startMeter: number | null;
  endMeter: number | null;
  fuelAdded: number | null;
  notes: string | null;
  syncVersion: number;
}

interface BatchSyncResponse {
  userId: string;
  organizationId: string;
  deviceId: string;
  generatedAt: string;
  expiresAt: string;
  syncVersion: number;
  isFullSync: boolean;
  projects: OfflineProject[];
  crewMembers: OfflineCrewMember[];
  costCodes: OfflineCostCode[];
  equipment: OfflineEquipment[];
  timeEntries: OfflineTimeEntry[];
  dailyReports: OfflineDailyReport[];
  dailyReportEntries: OfflineDailyReportEntry[];
  equipmentLogs: OfflineEquipmentLog[];
  stats: {
    projectCount: number;
    crewMemberCount: number;
    timeEntryCount: number;
    dailyReportCount: number;
    totalRecords: number;
  };
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: SyncRequest = await req.json();
    const { userId, deviceId, lastSyncVersion, projectIds } = body;

    if (!userId) {
      throw new Error('userId is required');
    }
    if (!deviceId) {
      throw new Error('deviceId is required');
    }

    // Get user's organization
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      throw new Error('User not found');
    }

    const organizationId = userProfile.organization_id;
    const isFullSync = !lastSyncVersion || lastSyncVersion === 0;
    const now = new Date();
    const syncVersion = Date.now();

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

    if (targetProjectIds.length === 0) {
      // Return empty response if no projects assigned
      return new Response(JSON.stringify({
        userId,
        organizationId,
        deviceId,
        generatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
        syncVersion,
        isFullSync,
        projects: [],
        crewMembers: [],
        costCodes: [],
        equipment: [],
        timeEntries: [],
        dailyReports: [],
        dailyReportEntries: [],
        equipmentLogs: [],
        stats: {
          projectCount: 0,
          crewMemberCount: 0,
          timeEntryCount: 0,
          dailyReportCount: 0,
          totalRecords: 0,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parallel fetch all data
    const [
      projectsResult,
      crewResult,
      costCodesResult,
      equipmentResult,
      timeEntriesResult,
      dailyReportsResult,
    ] = await Promise.all([
      // Projects
      fetchProjects(supabase, targetProjectIds, lastSyncVersion),
      // Crew members (org-wide)
      fetchCrewMembers(supabase, organizationId, lastSyncVersion),
      // Cost codes (for assigned projects)
      fetchCostCodes(supabase, targetProjectIds, lastSyncVersion),
      // Equipment (org-wide, for assigned projects)
      fetchEquipment(supabase, organizationId, targetProjectIds, lastSyncVersion),
      // Time entries (for assigned projects, last 30 days for full sync, delta only for incremental)
      fetchTimeEntries(supabase, targetProjectIds, lastSyncVersion, isFullSync),
      // Daily reports (for assigned projects, last 30 days for full sync)
      fetchDailyReports(supabase, targetProjectIds, lastSyncVersion, isFullSync),
    ]);

    // Get report entries and equipment logs for the fetched daily reports
    const reportIds = dailyReportsResult.map((r) => r.id);
    const [entriesResult, logsResult] = await Promise.all([
      reportIds.length > 0 ? fetchDailyReportEntries(supabase, reportIds, lastSyncVersion) : [],
      reportIds.length > 0 ? fetchEquipmentLogs(supabase, reportIds, lastSyncVersion) : [],
    ]);

    // Build response
    const response: BatchSyncResponse = {
      userId,
      organizationId,
      deviceId,
      generatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      syncVersion,
      isFullSync,
      projects: projectsResult,
      crewMembers: crewResult,
      costCodes: costCodesResult,
      equipment: equipmentResult,
      timeEntries: timeEntriesResult,
      dailyReports: dailyReportsResult,
      dailyReportEntries: entriesResult,
      equipmentLogs: logsResult,
      stats: {
        projectCount: projectsResult.length,
        crewMemberCount: crewResult.length,
        timeEntryCount: timeEntriesResult.length,
        dailyReportCount: dailyReportsResult.length,
        totalRecords:
          projectsResult.length +
          crewResult.length +
          costCodesResult.length +
          equipmentResult.length +
          timeEntriesResult.length +
          dailyReportsResult.length +
          entriesResult.length +
          logsResult.length,
      },
    };

    // Update or create device registration
    await supabase
      .from('device_registrations')
      .upsert({
        user_id: userId,
        organization_id: organizationId,
        device_id: deviceId,
        last_sync_at: now.toISOString(),
        last_sync_version: syncVersion,
        sync_enabled: true,
      }, {
        onConflict: 'user_id,device_id',
      });

    // Update sync checkpoint
    await supabase
      .from('sync_checkpoints')
      .upsert({
        device_id: deviceId,
        user_id: userId,
        organization_id: organizationId,
        entity_type: 'all',
        last_sync_version: syncVersion,
        last_sync_at: now.toISOString(),
        records_synced: response.stats.totalRecords,
      }, {
        onConflict: 'device_id,entity_type',
      });

    console.log(`Batch sync download: ${response.stats.totalRecords} records for user ${userId}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Batch sync download error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Sync failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Data Fetching Functions
// ============================================================================

async function fetchProjects(
  supabase: ReturnType<typeof createClient>,
  projectIds: string[],
  lastSyncVersion?: number
): Promise<OfflineProject[]> {
  let query = supabase
    .from('projects')
    .select(`
      id,
      name,
      project_number,
      contract_number,
      status,
      address_line1,
      city,
      county,
      davis_bacon_required,
      dbe_goal_percentage,
      sync_version
    `)
    .in('id', projectIds);

  if (lastSyncVersion) {
    query = query.gt('sync_version', lastSyncVersion);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    projectNumber: p.project_number,
    contractNumber: p.contract_number,
    status: p.status,
    address: p.address_line1,
    city: p.city,
    county: p.county,
    davisBaconRequired: p.davis_bacon_required || false,
    dbeGoalPercentage: p.dbe_goal_percentage,
    syncVersion: p.sync_version || 0,
  }));
}

async function fetchCrewMembers(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  lastSyncVersion?: number
): Promise<OfflineCrewMember[]> {
  let query = supabase
    .from('crew_members')
    .select(`
      id,
      display_name,
      first_name,
      last_name,
      trade_classification,
      hourly_rate,
      status,
      sync_version
    `)
    .eq('organization_id', organizationId)
    .eq('status', 'ACTIVE');

  if (lastSyncVersion) {
    query = query.gt('sync_version', lastSyncVersion);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((c) => ({
    id: c.id,
    displayName: c.display_name,
    firstName: c.first_name,
    lastName: c.last_name,
    tradeClassification: c.trade_classification,
    hourlyRate: c.hourly_rate,
    isActive: c.status === 'ACTIVE',
    syncVersion: c.sync_version || 0,
  }));
}

async function fetchCostCodes(
  supabase: ReturnType<typeof createClient>,
  projectIds: string[],
  lastSyncVersion?: number
): Promise<OfflineCostCode[]> {
  let query = supabase
    .from('cost_codes')
    .select(`
      id,
      project_id,
      code,
      description,
      category,
      parent_id,
      is_active,
      sync_version
    `)
    .in('project_id', projectIds)
    .eq('is_active', true);

  if (lastSyncVersion) {
    query = query.gt('sync_version', lastSyncVersion);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((c) => ({
    id: c.id,
    projectId: c.project_id,
    code: c.code,
    description: c.description,
    category: c.category,
    parentId: c.parent_id,
    isActive: c.is_active,
    syncVersion: c.sync_version || 0,
  }));
}

async function fetchEquipment(
  supabase: ReturnType<typeof createClient>,
  organizationId: string,
  projectIds: string[],
  lastSyncVersion?: number
): Promise<OfflineEquipment[]> {
  // Get equipment assigned to user's projects or available
  let query = supabase
    .from('equipment')
    .select(`
      id,
      equipment_number,
      name,
      category,
      status,
      current_project_id,
      hourly_rate,
      sync_version
    `)
    .eq('organization_id', organizationId)
    .in('status', ['ACTIVE', 'IN_USE', 'AVAILABLE']);

  if (lastSyncVersion) {
    query = query.gt('sync_version', lastSyncVersion);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter to equipment on user's projects or unassigned
  const filtered = (data || []).filter((e) =>
    !e.current_project_id || projectIds.includes(e.current_project_id)
  );

  return filtered.map((e) => ({
    id: e.id,
    equipmentNumber: e.equipment_number,
    name: e.name,
    category: e.category,
    status: e.status,
    currentProjectId: e.current_project_id,
    hourlyRate: e.hourly_rate,
    syncVersion: e.sync_version || 0,
  }));
}

async function fetchTimeEntries(
  supabase: ReturnType<typeof createClient>,
  projectIds: string[],
  lastSyncVersion?: number,
  isFullSync?: boolean
): Promise<OfflineTimeEntry[]> {
  // For full sync, get last 30 days; for delta, get all changed
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query = supabase
    .from('time_entries')
    .select(`
      id,
      offline_id,
      project_id,
      crew_member_id,
      cost_code_id,
      work_date,
      regular_hours,
      overtime_hours,
      double_time_hours,
      status,
      notes,
      created_by_offline,
      sync_version
    `)
    .in('project_id', projectIds);

  if (isFullSync) {
    query = query.gte('work_date', thirtyDaysAgo.toISOString().split('T')[0]);
  } else if (lastSyncVersion) {
    query = query.gt('sync_version', lastSyncVersion);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((t) => ({
    id: t.id,
    offlineId: t.offline_id,
    projectId: t.project_id,
    crewMemberId: t.crew_member_id,
    costCodeId: t.cost_code_id,
    workDate: t.work_date,
    regularHours: Number(t.regular_hours) || 0,
    overtimeHours: Number(t.overtime_hours) || 0,
    doubleTimeHours: Number(t.double_time_hours) || 0,
    status: t.status,
    notes: t.notes,
    createdByOffline: t.created_by_offline || false,
    syncVersion: t.sync_version || 0,
  }));
}

async function fetchDailyReports(
  supabase: ReturnType<typeof createClient>,
  projectIds: string[],
  lastSyncVersion?: number,
  isFullSync?: boolean
): Promise<OfflineDailyReport[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  let query = supabase
    .from('daily_reports')
    .select(`
      id,
      offline_id,
      project_id,
      report_date,
      report_number,
      status,
      weather_conditions,
      temperature_high,
      temperature_low,
      wind_speed,
      precipitation,
      summary,
      created_by_offline,
      sync_version
    `)
    .in('project_id', projectIds);

  if (isFullSync) {
    query = query.gte('report_date', thirtyDaysAgo.toISOString().split('T')[0]);
  } else if (lastSyncVersion) {
    query = query.gt('sync_version', lastSyncVersion);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((r) => ({
    id: r.id,
    offlineId: r.offline_id,
    projectId: r.project_id,
    reportDate: r.report_date,
    reportNumber: r.report_number,
    status: r.status,
    weatherConditions: r.weather_conditions,
    temperatureHigh: r.temperature_high,
    temperatureLow: r.temperature_low,
    windSpeed: r.wind_speed,
    precipitation: r.precipitation,
    summary: r.summary,
    createdByOffline: r.created_by_offline || false,
    syncVersion: r.sync_version || 0,
  }));
}

async function fetchDailyReportEntries(
  supabase: ReturnType<typeof createClient>,
  reportIds: string[],
  lastSyncVersion?: number
): Promise<OfflineDailyReportEntry[]> {
  let query = supabase
    .from('daily_report_entries')
    .select(`
      id,
      offline_id,
      daily_report_id,
      entry_type,
      description,
      cost_code_id,
      quantity,
      unit,
      sort_order,
      sync_version
    `)
    .in('daily_report_id', reportIds);

  if (lastSyncVersion) {
    query = query.gt('sync_version', lastSyncVersion);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((e) => ({
    id: e.id,
    offlineId: e.offline_id,
    dailyReportId: e.daily_report_id,
    entryType: e.entry_type,
    description: e.description,
    costCodeId: e.cost_code_id,
    quantity: e.quantity,
    unit: e.unit,
    sortOrder: e.sort_order || 0,
    syncVersion: e.sync_version || 0,
  }));
}

async function fetchEquipmentLogs(
  supabase: ReturnType<typeof createClient>,
  reportIds: string[],
  lastSyncVersion?: number
): Promise<OfflineEquipmentLog[]> {
  let query = supabase
    .from('daily_equipment_log')
    .select(`
      id,
      offline_id,
      daily_report_id,
      equipment_id,
      project_id,
      hours_used,
      hours_idle,
      start_meter,
      end_meter,
      fuel_added,
      notes,
      sync_version
    `)
    .in('daily_report_id', reportIds);

  if (lastSyncVersion) {
    query = query.gt('sync_version', lastSyncVersion);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((l) => ({
    id: l.id,
    offlineId: l.offline_id,
    dailyReportId: l.daily_report_id,
    equipmentId: l.equipment_id,
    projectId: l.project_id,
    hoursUsed: l.hours_used,
    hoursIdle: l.hours_idle,
    startMeter: l.start_meter,
    endMeter: l.end_meter,
    fuelAdded: l.fuel_added,
    notes: l.notes,
    syncVersion: l.sync_version || 0,
  }));
}
