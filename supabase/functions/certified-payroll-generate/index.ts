// =============================================================================
// Edge Function: certified-payroll-generate
// Purpose: Generate WH-347 Certified Payroll from time entries
// Per CLAUDE.md: Davis-Bacon compliance for federal-aid projects
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PayrollRequest {
  project_id: string;
  pay_period_id?: string;
  week_ending_date: string;
  include_subcontractors?: boolean;
}

interface PayrollLine {
  employee_name: string;
  employee_id: string;
  address: string;
  ssn_last_four: string;
  work_classification: string;
  hourly_rate: number;
  fringe_rate: number;
  hours_by_day: number[];
  total_hours: number;
  overtime_hours: number;
  gross_pay: number;
  deductions: {
    fica: number;
    federal_tax: number;
    state_tax: number;
    other: number;
  };
  net_pay: number;
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
      pay_period_id,
      week_ending_date,
      include_subcontractors = false,
    } = await req.json() as PayrollRequest;

    if (!project_id || !week_ending_date) {
      throw new Error('project_id and week_ending_date are required');
    }

    console.log(`Generating certified payroll for project ${project_id}, week ending ${week_ending_date}`);

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

    if (!project.davis_bacon_required) {
      throw new Error('This project does not require Davis-Bacon certified payroll');
    }

    // Calculate week start (Saturday to Friday for WH-347)
    const weekEnd = new Date(week_ending_date);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekEnd.getDate() - 6);

    // Get time entries for the week
    const { data: timeEntries, error: timeError } = await supabaseClient
      .from('time_entries')
      .select(`
        *,
        crew_members (
          id, display_name, last_name, first_name,
          address_line1, city, state, zip_code,
          ssn_last_four, trade_classification
        ),
        prevailing_wage_rates (
          base_rate, fringe_rate, trade_classification
        )
      `)
      .eq('project_id', project_id)
      .gte('work_date', weekStart.toISOString().split('T')[0])
      .lte('work_date', weekEnd.toISOString().split('T')[0])
      .eq('status', 'APPROVED');

    if (timeError) {
      throw new Error(`Failed to get time entries: ${timeError.message}`);
    }

    // Group time entries by employee
    const employeeHours: Record<string, {
      employee: any;
      wage_rate: any;
      entries: any[];
      hours_by_day: number[];
    }> = {};

    for (const entry of timeEntries || []) {
      const empId = entry.crew_member_id;
      if (!employeeHours[empId]) {
        employeeHours[empId] = {
          employee: entry.crew_members,
          wage_rate: entry.prevailing_wage_rates,
          entries: [],
          hours_by_day: [0, 0, 0, 0, 0, 0, 0], // Sat-Fri
        };
      }

      employeeHours[empId].entries.push(entry);

      // Map date to day index (0 = Saturday)
      const entryDate = new Date(entry.work_date);
      const dayIndex = (entryDate.getDay() + 1) % 7; // Shift Sunday=0 to Saturday=0
      employeeHours[empId].hours_by_day[dayIndex] += entry.regular_hours + (entry.overtime_hours || 0);
    }

    // Generate payroll lines
    const payrollLines: PayrollLine[] = [];

    for (const [empId, data] of Object.entries(employeeHours)) {
      const emp = data.employee;
      const wage = data.wage_rate;

      const totalHours = data.hours_by_day.reduce((a, b) => a + b, 0);
      const regularHours = Math.min(totalHours, 40);
      const overtimeHours = Math.max(0, totalHours - 40);

      const baseRate = wage?.base_rate || 0;
      const fringeRate = wage?.fringe_rate || 0;

      const regularPay = regularHours * baseRate;
      const overtimePay = overtimeHours * (baseRate * 1.5);
      const fringePay = totalHours * fringeRate;
      const grossPay = regularPay + overtimePay + fringePay;

      // Estimate deductions (simplified - real system would use actual withholding tables)
      const fica = grossPay * 0.0765; // 7.65% FICA
      const federalTax = grossPay * 0.12; // Estimated federal
      const stateTax = grossPay * 0.05; // Estimated state
      const netPay = grossPay - fica - federalTax - stateTax;

      payrollLines.push({
        employee_name: `${emp.last_name}, ${emp.first_name}`,
        employee_id: empId,
        address: `${emp.address_line1 || ''}, ${emp.city || ''}, ${emp.state || ''} ${emp.zip_code || ''}`,
        ssn_last_four: emp.ssn_last_four || 'XXXX',
        work_classification: emp.trade_classification || wage?.trade_classification || 'LABORER',
        hourly_rate: baseRate,
        fringe_rate: fringeRate,
        hours_by_day: data.hours_by_day,
        total_hours: totalHours,
        overtime_hours: overtimeHours,
        gross_pay: grossPay,
        deductions: {
          fica,
          federal_tax: federalTax,
          state_tax: stateTax,
          other: 0,
        },
        net_pay: netPay,
      });
    }

    // Create or update certified payroll record
    const payrollNumber = await getNextPayrollNumber(supabaseClient, project_id);

    const { data: payroll, error: payrollError } = await supabaseClient
      .from('certified_payrolls')
      .insert({
        organization_id: project.organization_id,
        project_id,
        payroll_number: payrollNumber,
        week_ending_date: week_ending_date,
        contractor_name: project.organizations.name,
        contractor_address: `${project.organizations.address_line1}, ${project.organizations.city}, ${project.organizations.state} ${project.organizations.zip_code}`,
        project_name: project.name,
        project_location: project.address || '',
        contract_number: project.contract_number,
        total_workers: payrollLines.length,
        total_hours: payrollLines.reduce((sum, line) => sum + line.total_hours, 0),
        total_gross_pay: payrollLines.reduce((sum, line) => sum + line.gross_pay, 0),
        status: 'DRAFT',
      })
      .select('id')
      .single();

    if (payrollError) {
      throw new Error(`Failed to create payroll record: ${payrollError.message}`);
    }

    // Insert payroll lines
    const lineInserts = payrollLines.map((line, index) => ({
      payroll_id: payroll.id,
      line_number: index + 1,
      employee_name: line.employee_name,
      crew_member_id: line.employee_id,
      address: line.address,
      ssn_last_four: line.ssn_last_four,
      work_classification: line.work_classification,
      hourly_rate: line.hourly_rate,
      fringe_rate: line.fringe_rate,
      sat_hours: line.hours_by_day[0],
      sun_hours: line.hours_by_day[1],
      mon_hours: line.hours_by_day[2],
      tue_hours: line.hours_by_day[3],
      wed_hours: line.hours_by_day[4],
      thu_hours: line.hours_by_day[5],
      fri_hours: line.hours_by_day[6],
      total_hours: line.total_hours,
      regular_hours: line.total_hours - line.overtime_hours,
      overtime_hours: line.overtime_hours,
      gross_pay: line.gross_pay,
      fica_deduction: line.deductions.fica,
      federal_tax: line.deductions.federal_tax,
      state_tax: line.deductions.state_tax,
      other_deductions: line.deductions.other,
      net_pay: line.net_pay,
    }));

    await supabaseClient.from('certified_payroll_lines').insert(lineInserts);

    return new Response(
      JSON.stringify({
        success: true,
        payroll_id: payroll.id,
        payroll_number: payrollNumber,
        week_ending_date,
        summary: {
          total_workers: payrollLines.length,
          total_hours: payrollLines.reduce((sum, line) => sum + line.total_hours, 0),
          total_gross_pay: payrollLines.reduce((sum, line) => sum + line.gross_pay, 0),
        },
        lines: payrollLines,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Certified payroll error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function getNextPayrollNumber(supabase: any, projectId: string): Promise<string> {
  const { data } = await supabase
    .from('certified_payrolls')
    .select('payroll_number')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (data && data.length > 0) {
    const lastNum = parseInt(data[0].payroll_number.split('-').pop() || '0');
    return `CP-${String(lastNum + 1).padStart(3, '0')}`;
  }

  return 'CP-001';
}
