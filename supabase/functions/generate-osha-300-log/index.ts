// =============================================================================
// Edge Function: generate-osha-300-log
// Purpose: Automatically create OSHA 300 Log entries from recordable incidents
// Generates OSHA 300 and 301 form entries with proper categorization
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateOSHA300Request {
  incident_id: string;
  // Optional overrides
  employee_name?: string;
  job_title?: string;
}

interface IncidentData {
  id: string;
  organization_id: string;
  incident_number: string;
  project_id: string | null;
  incident_date: string;
  incident_time: string | null;
  classification: string;
  osha_recordable: boolean;
  description: string;
  location_description: string | null;
  injured_employee_id: string | null;
  injured_subcontractor_worker_id: string | null;
  injured_third_party_name: string | null;
  injury_description: string | null;
  body_parts_affected: string[] | null;
  days_away_from_work: number;
  days_restricted_duty: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { incident_id, employee_name, job_title } = await req.json() as GenerateOSHA300Request;

    if (!incident_id) {
      throw new Error('incident_id is required');
    }

    // Get incident details
    const { data: incident, error: incidentError } = await supabaseClient
      .from('incidents')
      .select('*')
      .eq('id', incident_id)
      .single();

    if (incidentError || !incident) {
      throw new Error(`Incident not found: ${incident_id}`);
    }

    const incidentData = incident as IncidentData;

    // Verify it's OSHA recordable
    if (!incidentData.osha_recordable) {
      throw new Error('Incident is not marked as OSHA recordable');
    }

    console.log(`Generating OSHA 300 entry for incident: ${incidentData.incident_number}`);

    // Get organization details for establishment info
    const { data: org, error: orgError } = await supabaseClient
      .from('organizations')
      .select('name, legal_name, address_line1, city, state, zip_code')
      .eq('id', incidentData.organization_id)
      .single();

    if (orgError || !org) {
      throw new Error('Organization not found');
    }

    // Get employee info if available
    let resolvedEmployeeName = employee_name || incidentData.injured_third_party_name || 'Unknown';
    let resolvedJobTitle = job_title;

    if (incidentData.injured_employee_id) {
      const { data: employee } = await supabaseClient
        .from('employees')
        .select('first_name, last_name, job_title')
        .eq('id', incidentData.injured_employee_id)
        .single();

      if (employee) {
        resolvedEmployeeName = `${employee.first_name} ${employee.last_name}`;
        resolvedJobTitle = resolvedJobTitle || employee.job_title;
      }
    } else if (incidentData.injured_subcontractor_worker_id) {
      const { data: worker } = await supabaseClient
        .from('subcontractor_workers')
        .select('first_name, last_name, job_title')
        .eq('id', incidentData.injured_subcontractor_worker_id)
        .single();

      if (worker) {
        resolvedEmployeeName = `${worker.first_name} ${worker.last_name}`;
        resolvedJobTitle = resolvedJobTitle || worker.job_title;
      }
    }

    // Determine case classification based on incident classification
    const isDeath = incidentData.classification === 'fatality';
    const isDaysAway = incidentData.days_away_from_work > 0;
    const isJobTransfer = incidentData.days_restricted_duty > 0 && !isDaysAway;
    const isOtherRecordable = !isDeath && !isDaysAway && !isJobTransfer;

    // Determine injury type from body parts affected
    let typeInjury = true;
    let typeSkinDisorder = false;
    let typeRespiratory = false;
    let typePoisoning = false;
    let typeHearingLoss = false;
    let typeAllOther = false;

    const bodyParts = incidentData.body_parts_affected?.map(p => p.toLowerCase()) || [];
    const description = (incidentData.description + ' ' + (incidentData.injury_description || '')).toLowerCase();

    if (bodyParts.some(p => p.includes('skin') || p.includes('rash') || p.includes('dermat'))) {
      typeInjury = false;
      typeSkinDisorder = true;
    } else if (bodyParts.some(p => p.includes('lung') || p.includes('breath')) || description.includes('respiratory')) {
      typeInjury = false;
      typeRespiratory = true;
    } else if (description.includes('poison') || description.includes('toxic') || description.includes('chemical exposure')) {
      typeInjury = false;
      typePoisoning = true;
    } else if (bodyParts.some(p => p.includes('ear') || p.includes('hearing'))) {
      typeInjury = false;
      typeHearingLoss = true;
    }

    const logYear = new Date(incidentData.incident_date).getFullYear();

    // Get next case number for this year
    const { data: existingCases } = await supabaseClient
      .from('osha_300_logs')
      .select('case_number')
      .eq('organization_id', incidentData.organization_id)
      .eq('log_year', logYear)
      .order('case_number', { ascending: false })
      .limit(1);

    let nextCaseNumber = 1;
    if (existingCases && existingCases.length > 0) {
      const lastCase = existingCases[0].case_number;
      const match = lastCase.match(/\d+/);
      if (match) {
        nextCaseNumber = parseInt(match[0]) + 1;
      }
    }
    const caseNumber = nextCaseNumber.toString().padStart(3, '0');

    // Check if OSHA 300 entry already exists for this incident
    const { data: existingEntry } = await supabaseClient
      .from('osha_300_logs')
      .select('id')
      .eq('incident_id', incident_id)
      .single();

    let osha300Id: string;

    if (existingEntry) {
      // Update existing entry
      const { data: updated, error: updateError } = await supabaseClient
        .from('osha_300_logs')
        .update({
          employee_name: resolvedEmployeeName,
          job_title: resolvedJobTitle,
          date_of_injury: incidentData.incident_date,
          where_occurred: incidentData.location_description || 'Job site',
          describe_injury: incidentData.injury_description || incidentData.description,
          is_death: isDeath,
          is_days_away: isDaysAway,
          is_job_transfer_restriction: isJobTransfer,
          is_other_recordable: isOtherRecordable,
          days_away_count: incidentData.days_away_from_work,
          days_job_transfer_count: incidentData.days_restricted_duty,
          type_injury: typeInjury,
          type_skin_disorder: typeSkinDisorder,
          type_respiratory: typeRespiratory,
          type_poisoning: typePoisoning,
          type_hearing_loss: typeHearingLoss,
          type_all_other: typeAllOther,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEntry.id)
        .select('id')
        .single();

      if (updateError) {
        throw new Error(`Failed to update OSHA 300 entry: ${updateError.message}`);
      }
      osha300Id = updated!.id;
      console.log(`Updated existing OSHA 300 entry: ${osha300Id}`);
    } else {
      // Create new OSHA 300 entry
      const { data: newEntry, error: insertError } = await supabaseClient
        .from('osha_300_logs')
        .insert({
          organization_id: incidentData.organization_id,
          establishment_name: org.legal_name || org.name,
          establishment_address: org.address_line1,
          city: org.city,
          state: org.state,
          zip: org.zip_code,
          log_year: logYear,
          incident_id: incident_id,
          case_number: caseNumber,
          employee_name: resolvedEmployeeName,
          job_title: resolvedJobTitle,
          date_of_injury: incidentData.incident_date,
          where_occurred: incidentData.location_description || 'Job site',
          describe_injury: incidentData.injury_description || incidentData.description,
          is_death: isDeath,
          is_days_away: isDaysAway,
          is_job_transfer_restriction: isJobTransfer,
          is_other_recordable: isOtherRecordable,
          days_away_count: incidentData.days_away_from_work,
          days_job_transfer_count: incidentData.days_restricted_duty,
          type_injury: typeInjury,
          type_skin_disorder: typeSkinDisorder,
          type_respiratory: typeRespiratory,
          type_poisoning: typePoisoning,
          type_hearing_loss: typeHearingLoss,
          type_all_other: typeAllOther,
          is_privacy_case: false,
        })
        .select('id')
        .single();

      if (insertError || !newEntry) {
        throw new Error(`Failed to create OSHA 300 entry: ${insertError?.message}`);
      }
      osha300Id = newEntry.id;
      console.log(`Created new OSHA 300 entry: ${osha300Id}`);
    }

    // Update incident with OSHA case number if not set
    if (!incident.osha_case_number) {
      await supabaseClient
        .from('incidents')
        .update({
          osha_case_number: caseNumber,
        })
        .eq('id', incident_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        osha_300_id: osha300Id,
        case_number: caseNumber,
        log_year: logYear,
        classification: {
          is_death: isDeath,
          is_days_away: isDaysAway,
          is_job_transfer: isJobTransfer,
          is_other_recordable: isOtherRecordable,
        },
        injury_type: {
          type_injury: typeInjury,
          type_skin_disorder: typeSkinDisorder,
          type_respiratory: typeRespiratory,
          type_poisoning: typePoisoning,
          type_hearing_loss: typeHearingLoss,
          type_all_other: typeAllOther,
        },
        message: existingEntry
          ? 'OSHA 300 log entry updated'
          : 'OSHA 300 log entry created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('OSHA 300 generation error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
