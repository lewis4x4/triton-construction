// =============================================================================
// Edge Function: dbe-report-generate
// Purpose: Generate monthly DBE utilization reports for federal-aid projects
// Per CLAUDE.md: DBE compliance tracking for WVDOH
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DBEReportRequest {
  project_id: string;
  report_month: string; // YYYY-MM format
  include_subcontractor_details?: boolean;
}

interface DBESubcontractor {
  company_name: string;
  dbe_type: string;
  naics_codes: string[];
  committed_amount: number;
  paid_to_date: number;
  current_month_amount: number;
  percent_of_goal: number;
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

    const {
      project_id,
      report_month,
      include_subcontractor_details = true,
    } = await req.json() as DBEReportRequest;

    if (!project_id || !report_month) {
      throw new Error('project_id and report_month are required');
    }

    console.log(`Generating DBE report for project ${project_id}, month ${report_month}`);

    // Get project details
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select(`
        *,
        organizations (name, address_line1, city, state, zip_code)
      `)
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${project_id}`);
    }

    // Calculate period dates
    const [year, month] = report_month.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0);

    // Get all DBE subcontracts
    const { data: subcontracts, error: subError } = await supabaseClient
      .from('subcontract_agreements')
      .select(`
        *,
        subcontractors (
          company_name,
          is_dbe_certified,
          dbe_certification_number,
          dbe_certification_expiration,
          minority_classification,
          primary_trade
        )
      `)
      .eq('project_id', project_id)
      .eq('is_dbe_contract', true);

    if (subError) {
      throw new Error(`Failed to get subcontracts: ${subError.message}`);
    }

    // Get DBE utilization records for the period
    const { data: utilization } = await supabaseClient
      .from('dbe_utilization_records')
      .select('*')
      .eq('project_id', project_id)
      .gte('period_end', periodStart.toISOString().split('T')[0])
      .lte('period_start', periodEnd.toISOString().split('T')[0]);

    // Get payments made this month
    const { data: payments } = await supabaseClient
      .from('subcontractor_invoices')
      .select(`
        *,
        subcontract_agreements!inner (
          id,
          is_dbe_contract,
          subcontractor_id
        )
      `)
      .eq('subcontract_agreements.is_dbe_contract', true)
      .eq('status', 'PAID')
      .gte('paid_at', periodStart.toISOString())
      .lte('paid_at', periodEnd.toISOString());

    // Calculate DBE metrics
    const dbeGoalAmount = (project.current_contract_value || 0) * ((project.dbe_goal_percentage || 0) / 100);

    let totalDBECommitted = 0;
    let totalDBEPaid = 0;
    let currentMonthDBE = 0;

    const dbeSubcontractors: DBESubcontractor[] = [];

    for (const sub of subcontracts || []) {
      const subPayments = payments?.filter(p =>
        p.subcontract_agreements?.subcontractor_id === sub.subcontractor_id
      ) || [];

      const currentMonthPaid = subPayments.reduce((sum, p) => sum + (p.current_payment_due || 0), 0);

      // Get total paid to date for this subcontract
      const { data: allPayments } = await supabaseClient
        .from('subcontractor_invoices')
        .select('current_payment_due')
        .eq('subcontract_id', sub.id)
        .eq('status', 'PAID');

      const paidToDate = allPayments?.reduce((sum, p) => sum + (p.current_payment_due || 0), 0) || 0;

      totalDBECommitted += sub.current_value || 0;
      totalDBEPaid += paidToDate;
      currentMonthDBE += currentMonthPaid;

      dbeSubcontractors.push({
        company_name: sub.subcontractors?.company_name || 'Unknown',
        dbe_type: sub.subcontractors?.minority_classification || 'DBE',
        naics_codes: [],
        committed_amount: sub.current_value || 0,
        paid_to_date: paidToDate,
        current_month_amount: currentMonthPaid,
        percent_of_goal: dbeGoalAmount > 0 ? ((sub.current_value || 0) / dbeGoalAmount) * 100 : 0,
      });
    }

    // Calculate percentages
    const contractValue = project.current_contract_value || 1;
    const dbeCommittedPercentage = (totalDBECommitted / contractValue) * 100;
    const dbePaidPercentage = (totalDBEPaid / contractValue) * 100;

    // Generate report summary
    const report = {
      project: {
        name: project.name,
        project_number: project.project_number,
        contract_number: project.contract_number,
        federal_aid_number: project.federal_aid_number,
        wvdoh_district: project.wvdoh_district,
      },
      contractor: {
        name: project.organizations?.name,
        address: `${project.organizations?.address_line1}, ${project.organizations?.city}, ${project.organizations?.state} ${project.organizations?.zip_code}`,
      },
      report_period: {
        month: report_month,
        start_date: periodStart.toISOString().split('T')[0],
        end_date: periodEnd.toISOString().split('T')[0],
      },
      contract_summary: {
        original_contract_value: project.original_contract_value,
        current_contract_value: project.current_contract_value,
        dbe_goal_percentage: project.dbe_goal_percentage,
        dbe_goal_amount: dbeGoalAmount,
      },
      dbe_summary: {
        total_dbe_committed: totalDBECommitted,
        total_dbe_committed_percentage: dbeCommittedPercentage,
        total_dbe_paid_to_date: totalDBEPaid,
        total_dbe_paid_percentage: dbePaidPercentage,
        current_month_dbe_payments: currentMonthDBE,
        goal_status: dbeCommittedPercentage >= (project.dbe_goal_percentage || 0) ? 'MEETING_GOAL' : 'BELOW_GOAL',
        shortfall_amount: Math.max(0, dbeGoalAmount - totalDBECommitted),
      },
      dbe_subcontractors: include_subcontractor_details ? dbeSubcontractors : undefined,
      subcontractor_count: dbeSubcontractors.length,
      generated_at: new Date().toISOString(),
    };

    // Store the report
    const { data: savedReport, error: saveError } = await supabaseClient
      .from('dbe_participation')
      .upsert({
        organization_id: project.organization_id,
        project_id,
        report_month,
        committed_amount: totalDBECommitted,
        paid_amount: totalDBEPaid,
        goal_amount: dbeGoalAmount,
        goal_percentage: project.dbe_goal_percentage,
        actual_percentage: dbeCommittedPercentage,
        subcontractor_count: dbeSubcontractors.length,
        report_data: report,
        status: 'GENERATED',
      }, {
        onConflict: 'project_id,report_month',
      })
      .select('id')
      .single();

    return new Response(
      JSON.stringify({
        success: true,
        report_id: savedReport?.id,
        report,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('DBE report error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
