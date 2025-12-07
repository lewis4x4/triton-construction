// =============================================================================
// Edge Function: validate-crew-assignment
// Purpose: The "Gatekeeper" - validates crew assignments against compliance rules
// Per System Prompt v5.0: Checks COI, Competent Person, Equipment, Certifications
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrewMember {
  employee_id?: string;
  subcontractor_worker_id?: string;
  role_on_crew?: string;
  work_classification?: string;
}

interface ValidationRequest {
  project_id: string;
  work_type: string; // e.g., "Trenching > 5ft", "Scaffolding", "Confined Space"
  crew_members: CrewMember[];
  equipment_ids?: string[];
  assignment_date?: string;
}

interface ValidationResult {
  passed: boolean;
  blocking_issues: BlockingIssue[];
  warnings: Warning[];
  compliance_summary: ComplianceSummary;
}

interface BlockingIssue {
  code: string;
  severity: 'critical' | 'high';
  message: string;
  affected_entity: string;
  entity_id: string;
  remediation: string;
}

interface Warning {
  code: string;
  severity: 'medium' | 'low';
  message: string;
  affected_entity?: string;
}

interface ComplianceSummary {
  subcontractor_coi_valid: boolean;
  has_competent_person: boolean;
  equipment_cleared: boolean;
  all_certs_valid: boolean;
  all_orientations_valid: boolean;
  checked_at: string;
}

// Map work types to required competent person types
const WORK_TYPE_REQUIREMENTS: Record<string, string[]> = {
  'trenching': ['excavation'],
  'excavation': ['excavation'],
  'trenching > 5ft': ['excavation'],
  'scaffolding': ['scaffolding'],
  'confined space': ['confined_space'],
  'fall protection': ['fall_protection'],
  'crane work': ['crane_rigging'],
  'rigging': ['crane_rigging'],
  'electrical': ['electrical'],
  'lockout tagout': ['lockout_tagout'],
  'loto': ['lockout_tagout'],
  'respiratory': ['respiratory_protection'],
  'hazmat': ['hazmat'],
  'traffic control': ['traffic_control'],
  'demolition': ['demolition'],
  'steel erection': ['steel_erection'],
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: ValidationRequest = await req.json();
    const { project_id, work_type, crew_members, equipment_ids, assignment_date } = body;

    if (!project_id || !work_type || !crew_members || crew_members.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: project_id, work_type, crew_members' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const blocking_issues: BlockingIssue[] = [];
    const warnings: Warning[] = [];
    const workDate = assignment_date ? new Date(assignment_date) : new Date();

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('id, organization_id, name, davis_bacon_required')
      .eq('id', project_id)
      .single();

    if (!project) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Separate employees and subcontractor workers
    const employeeIds = crew_members
      .filter(m => m.employee_id)
      .map(m => m.employee_id!);

    const subWorkerIds = crew_members
      .filter(m => m.subcontractor_worker_id)
      .map(m => m.subcontractor_worker_id!);

    // ==========================================================================
    // CHECK 1: Subcontractor COI Validation
    // ==========================================================================
    let subcontractor_coi_valid = true;

    if (subWorkerIds.length > 0) {
      // Get subcontractors for these workers
      const { data: subWorkers } = await supabase
        .from('subcontractor_workers')
        .select('id, subcontractor_id, first_name, last_name')
        .in('id', subWorkerIds);

      if (subWorkers) {
        const subcontractorIds = [...new Set(subWorkers.map(w => w.subcontractor_id))];

        const { data: subcontractors } = await supabase
          .from('subcontractors')
          .select('id, company_name, general_liability_exp, workers_comp_exp, auto_liability_exp, compliance_status')
          .in('id', subcontractorIds);

        if (subcontractors) {
          for (const sub of subcontractors) {
            const today = new Date().toISOString().split('T')[0];

            if (!sub.general_liability_exp || sub.general_liability_exp < today) {
              blocking_issues.push({
                code: 'COI_GL_EXPIRED',
                severity: 'critical',
                message: `${sub.company_name}: General Liability insurance expired`,
                affected_entity: 'subcontractor',
                entity_id: sub.id,
                remediation: 'Update COI with current General Liability certificate',
              });
              subcontractor_coi_valid = false;
            }

            if (!sub.workers_comp_exp || sub.workers_comp_exp < today) {
              blocking_issues.push({
                code: 'COI_WC_EXPIRED',
                severity: 'critical',
                message: `${sub.company_name}: Workers Comp insurance expired`,
                affected_entity: 'subcontractor',
                entity_id: sub.id,
                remediation: 'Update COI with current Workers Comp certificate',
              });
              subcontractor_coi_valid = false;
            }

            if (!sub.auto_liability_exp || sub.auto_liability_exp < today) {
              blocking_issues.push({
                code: 'COI_AUTO_EXPIRED',
                severity: 'critical',
                message: `${sub.company_name}: Auto Liability insurance expired`,
                affected_entity: 'subcontractor',
                entity_id: sub.id,
                remediation: 'Update COI with current Auto Liability certificate',
              });
              subcontractor_coi_valid = false;
            }
          }
        }
      }
    }

    // ==========================================================================
    // CHECK 2: Competent Person Requirement
    // ==========================================================================
    let has_competent_person = true;
    const workTypeLower = work_type.toLowerCase();

    // Find matching requirements
    const requiredCompetentTypes: string[] = [];
    for (const [key, types] of Object.entries(WORK_TYPE_REQUIREMENTS)) {
      if (workTypeLower.includes(key)) {
        requiredCompetentTypes.push(...types);
      }
    }

    if (requiredCompetentTypes.length > 0) {
      // Check if any crew member has the required competent person designation
      for (const requiredType of requiredCompetentTypes) {
        const { data: competentPersons } = await supabase
          .from('competent_person_designations')
          .select('id, employee_id, subcontractor_worker_id')
          .in('employee_id', employeeIds.length > 0 ? employeeIds : ['00000000-0000-0000-0000-000000000000'])
          .eq('competent_person_type', requiredType)
          .eq('is_active', true)
          .is('revoked_at', null)
          .or(`expiration_date.is.null,expiration_date.gt.${workDate.toISOString().split('T')[0]}`);

        // Also check subcontractor workers
        const { data: subCompetentPersons } = await supabase
          .from('competent_person_designations')
          .select('id, employee_id, subcontractor_worker_id')
          .in('subcontractor_worker_id', subWorkerIds.length > 0 ? subWorkerIds : ['00000000-0000-0000-0000-000000000000'])
          .eq('competent_person_type', requiredType)
          .eq('is_active', true)
          .is('revoked_at', null)
          .or(`expiration_date.is.null,expiration_date.gt.${workDate.toISOString().split('T')[0]}`);

        const hasCompetentForType =
          (competentPersons && competentPersons.length > 0) ||
          (subCompetentPersons && subCompetentPersons.length > 0);

        if (!hasCompetentForType) {
          blocking_issues.push({
            code: 'NO_COMPETENT_PERSON',
            severity: 'critical',
            message: `No competent person for ${requiredType.replace('_', ' ')} on crew`,
            affected_entity: 'crew',
            entity_id: project_id,
            remediation: `Assign a worker with active ${requiredType.replace('_', ' ')} competent person designation`,
          });
          has_competent_person = false;
        }
      }
    }

    // ==========================================================================
    // CHECK 3: Equipment Green Tag Status
    // ==========================================================================
    let equipment_cleared = true;

    if (equipment_ids && equipment_ids.length > 0) {
      const { data: equipment } = await supabase
        .from('equipment')
        .select('id, name, equipment_number, status, next_service_date')
        .in('id', equipment_ids);

      if (equipment) {
        for (const eq of equipment) {
          // Check for "Do Not Operate" status
          if (eq.status === 'DO_NOT_OPERATE' || eq.status === 'OUT_OF_SERVICE') {
            blocking_issues.push({
              code: 'EQUIPMENT_DNO',
              severity: 'critical',
              message: `${eq.name} (${eq.equipment_number}): Equipment is tagged "Do Not Operate"`,
              affected_entity: 'equipment',
              entity_id: eq.id,
              remediation: 'Clear equipment maintenance issues before assignment',
            });
            equipment_cleared = false;
          }

          // Check for overdue maintenance (warning, not blocking)
          if (eq.next_service_date && eq.next_service_date < new Date().toISOString().split('T')[0]) {
            warnings.push({
              code: 'EQUIPMENT_MAINTENANCE_DUE',
              severity: 'medium',
              message: `${eq.name} (${eq.equipment_number}): Maintenance overdue`,
              affected_entity: eq.id,
            });
          }
        }
      }
    }

    // ==========================================================================
    // CHECK 4: Employee Certifications
    // ==========================================================================
    let all_certs_valid = true;

    if (employeeIds.length > 0) {
      // Check employee compliance status
      const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name, compliance_status, compliance_issues')
        .in('id', employeeIds);

      if (employees) {
        for (const emp of employees) {
          if (emp.compliance_status === 'expired' || emp.compliance_status === 'suspended') {
            blocking_issues.push({
              code: 'EMPLOYEE_NOT_COMPLIANT',
              severity: 'high',
              message: `${emp.first_name} ${emp.last_name}: Compliance status is ${emp.compliance_status}`,
              affected_entity: 'employee',
              entity_id: emp.id,
              remediation: emp.compliance_issues?.join('; ') || 'Update expired certifications',
            });
            all_certs_valid = false;
          } else if (emp.compliance_status === 'incomplete' || emp.compliance_status === 'pending_review') {
            warnings.push({
              code: 'EMPLOYEE_COMPLIANCE_PENDING',
              severity: 'medium',
              message: `${emp.first_name} ${emp.last_name}: Compliance status is ${emp.compliance_status}`,
              affected_entity: emp.id,
            });
          }
        }
      }

      // Check for required OSHA training
      const { data: certifications } = await supabase
        .from('employee_certifications')
        .select('employee_id, certification_type, expiration_date, status')
        .in('employee_id', employeeIds)
        .in('certification_type', ['OSHA_10', 'OSHA_30']);

      // Create a map of employees who have valid OSHA
      const employeesWithOsha = new Set(
        certifications
          ?.filter(c =>
            c.status === 'active' &&
            (!c.expiration_date || c.expiration_date >= new Date().toISOString().split('T')[0])
          )
          .map(c => c.employee_id)
      );

      if (employees) {
        for (const emp of employees) {
          if (!employeesWithOsha.has(emp.id)) {
            warnings.push({
              code: 'MISSING_OSHA_TRAINING',
              severity: 'medium',
              message: `${emp.first_name} ${emp.last_name}: No valid OSHA 10/30 on file`,
              affected_entity: emp.id,
            });
          }
        }
      }
    }

    // ==========================================================================
    // CHECK 5: Site Orientations
    // ==========================================================================
    let all_orientations_valid = true;

    if (employeeIds.length > 0) {
      const { data: orientations } = await supabase
        .from('safety_orientations')
        .select('employee_id, project_id, valid_until, acknowledged_at')
        .in('employee_id', employeeIds)
        .or(`project_id.eq.${project_id},is_site_specific.eq.false`)
        .not('acknowledged_at', 'is', null);

      const employeesWithOrientation = new Set(
        orientations
          ?.filter(o =>
            !o.valid_until || o.valid_until >= new Date().toISOString().split('T')[0]
          )
          .map(o => o.employee_id)
      );

      const { data: employees } = await supabase
        .from('employees')
        .select('id, first_name, last_name')
        .in('id', employeeIds);

      if (employees) {
        for (const emp of employees) {
          if (!employeesWithOrientation.has(emp.id)) {
            warnings.push({
              code: 'MISSING_SITE_ORIENTATION',
              severity: 'medium',
              message: `${emp.first_name} ${emp.last_name}: No valid site orientation`,
              affected_entity: emp.id,
            });
            all_orientations_valid = false;
          }
        }
      }
    }

    // Same check for subcontractor workers
    if (subWorkerIds.length > 0) {
      const { data: subOrientations } = await supabase
        .from('safety_orientations')
        .select('subcontractor_worker_id, project_id, valid_until, acknowledged_at')
        .in('subcontractor_worker_id', subWorkerIds)
        .or(`project_id.eq.${project_id},is_site_specific.eq.false`)
        .not('acknowledged_at', 'is', null);

      const subWorkersWithOrientation = new Set(
        subOrientations
          ?.filter(o =>
            !o.valid_until || o.valid_until >= new Date().toISOString().split('T')[0]
          )
          .map(o => o.subcontractor_worker_id)
      );

      const { data: subWorkers } = await supabase
        .from('subcontractor_workers')
        .select('id, first_name, last_name')
        .in('id', subWorkerIds);

      if (subWorkers) {
        for (const sw of subWorkers) {
          if (!subWorkersWithOrientation.has(sw.id)) {
            warnings.push({
              code: 'MISSING_SITE_ORIENTATION',
              severity: 'medium',
              message: `${sw.first_name} ${sw.last_name} (Sub): No valid site orientation`,
              affected_entity: sw.id,
            });
            all_orientations_valid = false;
          }
        }
      }
    }

    // ==========================================================================
    // BUILD RESULT
    // ==========================================================================
    const result: ValidationResult = {
      passed: blocking_issues.length === 0,
      blocking_issues,
      warnings,
      compliance_summary: {
        subcontractor_coi_valid,
        has_competent_person,
        equipment_cleared,
        all_certs_valid,
        all_orientations_valid,
        checked_at: new Date().toISOString(),
      },
    };

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Gatekeeper error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
