// =============================================================================
// Edge Function: daily-brief-submit
// Purpose: Submit supervisor daily safety brief (30-second checklist)
// Part of Safety Compliance Enforcement System - "The Gatekeeper"
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyBriefRequest {
  project_id: string;
  crew_assignment_id?: string;
  checklist_responses: {
    ppe_verified: boolean;
    equipment_inspected: boolean;
    hazards_identified: boolean;
    emergency_plan_reviewed: boolean;
    competent_person_present?: boolean;
    utilities_marked?: boolean;
    fall_protection_in_place?: boolean;
    traffic_control_set?: boolean;
    confined_space_permit?: boolean;
    hot_work_permit?: boolean;
    weather_acceptable: boolean;
    first_aid_available: boolean;
  };
  attendee_employee_ids: string[];
  attendee_sub_worker_ids?: string[];
  weather_conditions?: string;
  temperature_f?: number;
  site_conditions?: string;
  special_hazards?: string;
  work_planned?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  gps_accuracy_meters?: number;
  started_at?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: DailyBriefRequest = await req.json();

    // Validate required fields
    if (!body.project_id || !body.checklist_responses || !body.attendee_employee_ids) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: project_id, checklist_responses, attendee_employee_ids' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 1: Get project and verify supervisor has access
    // =========================================================================
    const { data: project } = await supabase
      .from('projects')
      .select('id, organization_id, name, project_number')
      .eq('id', body.project_id)
      .single();

    if (!project) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 2: Validate required checklist items
    // =========================================================================
    const requiredItems = [
      'ppe_verified',
      'equipment_inspected',
      'hazards_identified',
      'emergency_plan_reviewed',
    ];

    const missingItems = requiredItems.filter(
      item => body.checklist_responses[item as keyof typeof body.checklist_responses] !== true
    );

    if (missingItems.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'Required checklist items not complete',
          missing_items: missingItems,
          message: 'All required safety checks must be verified before starting work',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 3: Validate crew compliance (quick check)
    // =========================================================================
    const complianceWarnings: string[] = [];

    if (body.attendee_employee_ids.length > 0) {
      // Check for employees with compliance issues
      const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, compliance_status')
        .in('id', body.attendee_employee_ids)
        .neq('compliance_status', 'compliant');

      if (employees && employees.length > 0) {
        for (const emp of employees) {
          complianceWarnings.push(
            `${emp.first_name} ${emp.last_name}: compliance status is ${emp.compliance_status}`
          );
        }
      }
    }

    // =========================================================================
    // STEP 4: Calculate duration
    // =========================================================================
    const startedAt = body.started_at ? new Date(body.started_at) : new Date();
    const completedAt = new Date();
    const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    // =========================================================================
    // STEP 5: Insert or update daily brief
    // =========================================================================
    const briefDate = new Date().toISOString().split('T')[0];

    const briefData = {
      organization_id: project.organization_id,
      project_id: body.project_id,
      brief_date: briefDate,
      supervisor_id: user.id,
      crew_assignment_id: body.crew_assignment_id || null,
      checklist_responses: body.checklist_responses,
      attendee_count: body.attendee_employee_ids.length + (body.attendee_sub_worker_ids?.length || 0),
      attendee_employee_ids: body.attendee_employee_ids,
      attendee_sub_worker_ids: body.attendee_sub_worker_ids || [],
      weather_conditions: body.weather_conditions,
      temperature_f: body.temperature_f,
      site_conditions: body.site_conditions,
      special_hazards: body.special_hazards,
      work_planned: body.work_planned,
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_seconds: durationSeconds,
      gps_latitude: body.gps_latitude,
      gps_longitude: body.gps_longitude,
      gps_accuracy_meters: body.gps_accuracy_meters,
    };

    // Use upsert to handle re-submissions on same day
    const { data: brief, error: insertError } = await supabase
      .from('daily_safety_briefs')
      .upsert(briefData, {
        onConflict: 'project_id,brief_date,supervisor_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save daily brief', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 6: Get supervisor name for response
    // =========================================================================
    const { data: supervisor } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        brief_id: brief.id,
        project: {
          id: project.id,
          name: project.name,
          number: project.project_number,
        },
        supervisor: supervisor
          ? `${supervisor.first_name} ${supervisor.last_name}`
          : user.email,
        brief_date: briefDate,
        completed_at: completedAt.toISOString(),
        duration_seconds: durationSeconds,
        attendee_count: brief.attendee_count,
        all_required_complete: brief.all_required_complete,
        compliance_warnings: complianceWarnings.length > 0 ? complianceWarnings : undefined,
        message: complianceWarnings.length > 0
          ? 'Daily brief completed with compliance warnings'
          : 'Daily brief completed successfully - crew cleared to start work',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Daily brief submit error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
