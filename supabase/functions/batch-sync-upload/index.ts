import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================================
// Type Definitions
// ============================================================================

interface SyncQueueItem {
  id: string;
  operationType: 'INSERT' | 'UPDATE' | 'DELETE';
  entityType: 'time_entry' | 'daily_report' | 'daily_report_entry' | 'equipment_log';
  offlineId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

interface SyncUploadRequest {
  userId: string;
  deviceId: string;
  organizationId: string;
  items: SyncQueueItem[];
}

interface SyncResult {
  offlineId: string;
  serverId: string | null;
  success: boolean;
  error: string | null;
  conflictData?: Record<string, unknown>;
}

interface SyncUploadResponse {
  success: boolean;
  processedAt: string;
  results: SyncResult[];
  syncVersion: number;
  stats: {
    total: number;
    succeeded: number;
    failed: number;
    conflicts: number;
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

    const body: SyncUploadRequest = await req.json();
    const { userId, deviceId, organizationId, items } = body;

    if (!userId) throw new Error('userId is required');
    if (!deviceId) throw new Error('deviceId is required');
    if (!organizationId) throw new Error('organizationId is required');
    if (!items || !Array.isArray(items)) throw new Error('items array is required');

    // Verify user belongs to organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', userId)
      .single();

    if (!userProfile || userProfile.organization_id !== organizationId) {
      throw new Error('User not authorized for this organization');
    }

    const now = new Date();
    const syncVersion = Date.now();
    const results: SyncResult[] = [];
    let succeeded = 0;
    let failed = 0;
    let conflicts = 0;

    // Process each item
    for (const item of items) {
      try {
        const result = await processQueueItem(supabase, item, userId, organizationId, syncVersion);
        results.push(result);

        if (result.success) {
          succeeded++;
        } else if (result.conflictData) {
          conflicts++;
          failed++;
        } else {
          failed++;
        }
      } catch (error) {
        results.push({
          offlineId: item.offlineId,
          serverId: null,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
      }
    }

    // Update device last sync
    await supabase
      .from('device_registrations')
      .upsert({
        user_id: userId,
        organization_id: organizationId,
        device_id: deviceId,
        last_sync_at: now.toISOString(),
        last_sync_version: syncVersion,
      }, {
        onConflict: 'user_id,device_id',
      });

    const response: SyncUploadResponse = {
      success: failed === 0,
      processedAt: now.toISOString(),
      results,
      syncVersion,
      stats: {
        total: items.length,
        succeeded,
        failed,
        conflicts,
      },
    };

    console.log(`Batch sync upload: ${succeeded}/${items.length} succeeded for user ${userId}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Batch sync upload error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Upload failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// Queue Item Processing
// ============================================================================

async function processQueueItem(
  supabase: SupabaseClient,
  item: SyncQueueItem,
  userId: string,
  organizationId: string,
  syncVersion: number
): Promise<SyncResult> {
  switch (item.entityType) {
    case 'time_entry':
      return processTimeEntry(supabase, item, userId, organizationId, syncVersion);
    case 'daily_report':
      return processDailyReport(supabase, item, userId, organizationId, syncVersion);
    case 'daily_report_entry':
      return processDailyReportEntry(supabase, item, userId, syncVersion);
    case 'equipment_log':
      return processEquipmentLog(supabase, item, userId, syncVersion);
    default:
      return {
        offlineId: item.offlineId,
        serverId: null,
        success: false,
        error: `Unknown entity type: ${item.entityType}`,
      };
  }
}

// ============================================================================
// Time Entry Processing
// ============================================================================

async function processTimeEntry(
  supabase: SupabaseClient,
  item: SyncQueueItem,
  userId: string,
  organizationId: string,
  syncVersion: number
): Promise<SyncResult> {
  const payload = item.payload;

  if (item.operationType === 'INSERT') {
    // Check if already synced (by offline_id)
    const { data: existing } = await supabase
      .from('time_entries')
      .select('id')
      .eq('offline_id', item.offlineId)
      .single();

    if (existing) {
      return {
        offlineId: item.offlineId,
        serverId: existing.id,
        success: true,
        error: null,
      };
    }

    // Insert new time entry
    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        offline_id: item.offlineId,
        organization_id: organizationId,
        project_id: payload.projectId,
        crew_member_id: payload.crewMemberId,
        cost_code_id: payload.costCodeId || null,
        work_date: payload.workDate,
        regular_hours: payload.regularHours || 0,
        overtime_hours: payload.overtimeHours || 0,
        double_time_hours: payload.doubleTimeHours || 0,
        status: 'PENDING',
        notes: payload.notes || null,
        created_by: userId,
        created_by_offline: true,
        sync_version: syncVersion,
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: data.id,
      success: true,
      error: null,
    };
  }

  if (item.operationType === 'UPDATE') {
    // Find the server record
    const { data: existing } = await supabase
      .from('time_entries')
      .select('id, sync_version, status')
      .eq('offline_id', item.offlineId)
      .single();

    if (!existing) {
      // Record doesn't exist, try to insert instead
      return processTimeEntry(supabase, { ...item, operationType: 'INSERT' }, userId, organizationId, syncVersion);
    }

    // Check for conflict (server version newer than client's base version)
    const clientBaseVersion = (payload._baseSyncVersion as number) || 0;
    if (existing.sync_version > clientBaseVersion && existing.sync_version !== syncVersion) {
      // Conflict detected - log and return conflict data
      await supabase.from('sync_conflicts').insert({
        organization_id: organizationId,
        user_id: userId,
        device_id: payload._deviceId as string || 'unknown',
        entity_type: 'time_entry',
        entity_id: existing.id,
        offline_id: item.offlineId,
        client_data: payload,
        server_data: existing,
        conflict_type: 'CONCURRENT_EDIT',
        status: 'pending',
      });

      return {
        offlineId: item.offlineId,
        serverId: existing.id,
        success: false,
        error: 'Conflict detected: server version is newer',
        conflictData: existing,
      };
    }

    // Can't update if already approved/paid
    if (['APPROVED', 'PAID'].includes(existing.status)) {
      return {
        offlineId: item.offlineId,
        serverId: existing.id,
        success: false,
        error: 'Cannot update approved or paid time entry',
      };
    }

    // Update the record
    const { error } = await supabase
      .from('time_entries')
      .update({
        cost_code_id: payload.costCodeId || null,
        regular_hours: payload.regularHours || 0,
        overtime_hours: payload.overtimeHours || 0,
        double_time_hours: payload.doubleTimeHours || 0,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
        sync_version: syncVersion,
      })
      .eq('id', existing.id);

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: existing.id,
      success: true,
      error: null,
    };
  }

  if (item.operationType === 'DELETE') {
    const { data: existing } = await supabase
      .from('time_entries')
      .select('id, status')
      .eq('offline_id', item.offlineId)
      .single();

    if (!existing) {
      // Already deleted or never synced
      return {
        offlineId: item.offlineId,
        serverId: null,
        success: true,
        error: null,
      };
    }

    if (['APPROVED', 'PAID'].includes(existing.status)) {
      return {
        offlineId: item.offlineId,
        serverId: existing.id,
        success: false,
        error: 'Cannot delete approved or paid time entry',
      };
    }

    const { error } = await supabase
      .from('time_entries')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: existing.id,
      success: true,
      error: null,
    };
  }

  return {
    offlineId: item.offlineId,
    serverId: null,
    success: false,
    error: `Unknown operation: ${item.operationType}`,
  };
}

// ============================================================================
// Daily Report Processing
// ============================================================================

async function processDailyReport(
  supabase: SupabaseClient,
  item: SyncQueueItem,
  userId: string,
  organizationId: string,
  syncVersion: number
): Promise<SyncResult> {
  const payload = item.payload;

  if (item.operationType === 'INSERT') {
    // Check if already synced
    const { data: existing } = await supabase
      .from('daily_reports')
      .select('id')
      .eq('offline_id', item.offlineId)
      .single();

    if (existing) {
      return {
        offlineId: item.offlineId,
        serverId: existing.id,
        success: true,
        error: null,
      };
    }

    // Insert new daily report
    const { data, error } = await supabase
      .from('daily_reports')
      .insert({
        offline_id: item.offlineId,
        organization_id: organizationId,
        project_id: payload.projectId,
        report_date: payload.reportDate,
        status: 'DRAFT',
        weather_conditions: payload.weatherConditions || null,
        temperature_high: payload.temperatureHigh || null,
        temperature_low: payload.temperatureLow || null,
        wind_speed: payload.windSpeed || null,
        precipitation: payload.precipitation || null,
        summary: payload.summary || null,
        created_by: userId,
        created_by_offline: true,
        sync_version: syncVersion,
      })
      .select('id, report_number')
      .single();

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: data.id,
      success: true,
      error: null,
    };
  }

  if (item.operationType === 'UPDATE') {
    const { data: existing } = await supabase
      .from('daily_reports')
      .select('id, sync_version, status')
      .eq('offline_id', item.offlineId)
      .single();

    if (!existing) {
      return processDailyReport(supabase, { ...item, operationType: 'INSERT' }, userId, organizationId, syncVersion);
    }

    // Check for conflict
    const clientBaseVersion = (payload._baseSyncVersion as number) || 0;
    if (existing.sync_version > clientBaseVersion && existing.sync_version !== syncVersion) {
      await supabase.from('sync_conflicts').insert({
        organization_id: organizationId,
        user_id: userId,
        device_id: payload._deviceId as string || 'unknown',
        entity_type: 'daily_report',
        entity_id: existing.id,
        offline_id: item.offlineId,
        client_data: payload,
        server_data: existing,
        conflict_type: 'CONCURRENT_EDIT',
        status: 'pending',
      });

      return {
        offlineId: item.offlineId,
        serverId: existing.id,
        success: false,
        error: 'Conflict detected: server version is newer',
        conflictData: existing,
      };
    }

    // Can't update if already approved/submitted
    if (['APPROVED', 'SUBMITTED'].includes(existing.status)) {
      return {
        offlineId: item.offlineId,
        serverId: existing.id,
        success: false,
        error: 'Cannot update approved or submitted daily report',
      };
    }

    const { error } = await supabase
      .from('daily_reports')
      .update({
        weather_conditions: payload.weatherConditions || null,
        temperature_high: payload.temperatureHigh || null,
        temperature_low: payload.temperatureLow || null,
        wind_speed: payload.windSpeed || null,
        precipitation: payload.precipitation || null,
        summary: payload.summary || null,
        updated_at: new Date().toISOString(),
        sync_version: syncVersion,
      })
      .eq('id', existing.id);

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: existing.id,
      success: true,
      error: null,
    };
  }

  return {
    offlineId: item.offlineId,
    serverId: null,
    success: false,
    error: `Unsupported operation for daily_report: ${item.operationType}`,
  };
}

// ============================================================================
// Daily Report Entry Processing
// ============================================================================

async function processDailyReportEntry(
  supabase: SupabaseClient,
  item: SyncQueueItem,
  userId: string,
  syncVersion: number
): Promise<SyncResult> {
  const payload = item.payload;

  if (item.operationType === 'INSERT') {
    // Check if already synced
    const { data: existing } = await supabase
      .from('daily_report_entries')
      .select('id')
      .eq('offline_id', item.offlineId)
      .single();

    if (existing) {
      return {
        offlineId: item.offlineId,
        serverId: existing.id,
        success: true,
        error: null,
      };
    }

    // Get the server report ID from the offline report ID
    let reportId = payload.dailyReportId as string;
    if (payload.dailyReportOfflineId) {
      const { data: report } = await supabase
        .from('daily_reports')
        .select('id')
        .eq('offline_id', payload.dailyReportOfflineId)
        .single();

      if (report) {
        reportId = report.id;
      }
    }

    const { data, error } = await supabase
      .from('daily_report_entries')
      .insert({
        offline_id: item.offlineId,
        daily_report_id: reportId,
        entry_type: payload.entryType,
        description: payload.description || null,
        cost_code_id: payload.costCodeId || null,
        quantity: payload.quantity || null,
        unit: payload.unit || null,
        sort_order: payload.sortOrder || 0,
        created_by: userId,
        sync_version: syncVersion,
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: data.id,
      success: true,
      error: null,
    };
  }

  if (item.operationType === 'UPDATE') {
    const { data: existing } = await supabase
      .from('daily_report_entries')
      .select('id')
      .eq('offline_id', item.offlineId)
      .single();

    if (!existing) {
      return processDailyReportEntry(supabase, { ...item, operationType: 'INSERT' }, userId, syncVersion);
    }

    const { error } = await supabase
      .from('daily_report_entries')
      .update({
        description: payload.description || null,
        cost_code_id: payload.costCodeId || null,
        quantity: payload.quantity || null,
        unit: payload.unit || null,
        sort_order: payload.sortOrder || 0,
        updated_at: new Date().toISOString(),
        sync_version: syncVersion,
      })
      .eq('id', existing.id);

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: existing.id,
      success: true,
      error: null,
    };
  }

  if (item.operationType === 'DELETE') {
    const { data: existing } = await supabase
      .from('daily_report_entries')
      .select('id')
      .eq('offline_id', item.offlineId)
      .single();

    if (!existing) {
      return {
        offlineId: item.offlineId,
        serverId: null,
        success: true,
        error: null,
      };
    }

    const { error } = await supabase
      .from('daily_report_entries')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: existing.id,
      success: true,
      error: null,
    };
  }

  return {
    offlineId: item.offlineId,
    serverId: null,
    success: false,
    error: `Unsupported operation: ${item.operationType}`,
  };
}

// ============================================================================
// Equipment Log Processing
// ============================================================================

async function processEquipmentLog(
  supabase: SupabaseClient,
  item: SyncQueueItem,
  userId: string,
  syncVersion: number
): Promise<SyncResult> {
  const payload = item.payload;

  if (item.operationType === 'INSERT') {
    // Check if already synced
    const { data: existing } = await supabase
      .from('daily_equipment_log')
      .select('id')
      .eq('offline_id', item.offlineId)
      .single();

    if (existing) {
      return {
        offlineId: item.offlineId,
        serverId: existing.id,
        success: true,
        error: null,
      };
    }

    // Get the server report ID from the offline report ID
    let reportId = payload.dailyReportId as string;
    if (payload.dailyReportOfflineId) {
      const { data: report } = await supabase
        .from('daily_reports')
        .select('id')
        .eq('offline_id', payload.dailyReportOfflineId)
        .single();

      if (report) {
        reportId = report.id;
      }
    }

    const { data, error } = await supabase
      .from('daily_equipment_log')
      .insert({
        offline_id: item.offlineId,
        daily_report_id: reportId,
        equipment_id: payload.equipmentId,
        project_id: payload.projectId,
        hours_used: payload.hoursUsed || null,
        hours_idle: payload.hoursIdle || null,
        start_meter: payload.startMeter || null,
        end_meter: payload.endMeter || null,
        fuel_added: payload.fuelAdded || null,
        notes: payload.notes || null,
        created_by: userId,
        sync_version: syncVersion,
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: data.id,
      success: true,
      error: null,
    };
  }

  if (item.operationType === 'UPDATE') {
    const { data: existing } = await supabase
      .from('daily_equipment_log')
      .select('id')
      .eq('offline_id', item.offlineId)
      .single();

    if (!existing) {
      return processEquipmentLog(supabase, { ...item, operationType: 'INSERT' }, userId, syncVersion);
    }

    const { error } = await supabase
      .from('daily_equipment_log')
      .update({
        hours_used: payload.hoursUsed || null,
        hours_idle: payload.hoursIdle || null,
        start_meter: payload.startMeter || null,
        end_meter: payload.endMeter || null,
        fuel_added: payload.fuelAdded || null,
        notes: payload.notes || null,
        updated_at: new Date().toISOString(),
        sync_version: syncVersion,
      })
      .eq('id', existing.id);

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: existing.id,
      success: true,
      error: null,
    };
  }

  if (item.operationType === 'DELETE') {
    const { data: existing } = await supabase
      .from('daily_equipment_log')
      .select('id')
      .eq('offline_id', item.offlineId)
      .single();

    if (!existing) {
      return {
        offlineId: item.offlineId,
        serverId: null,
        success: true,
        error: null,
      };
    }

    const { error } = await supabase
      .from('daily_equipment_log')
      .delete()
      .eq('id', existing.id);

    if (error) throw error;

    return {
      offlineId: item.offlineId,
      serverId: existing.id,
      success: true,
      error: null,
    };
  }

  return {
    offlineId: item.offlineId,
    serverId: null,
    success: false,
    error: `Unsupported operation: ${item.operationType}`,
  };
}
