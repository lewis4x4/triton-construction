// =============================================================================
// Edge Function: validate-crew-assignment
// Purpose: The "Gatekeeper" - validates crew assignments against compliance rules
// Updated: Now uses data-driven assignment_validation_rules table
// Part of Safety Compliance Enforcement System
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
  work_type: string;
  crew_members: CrewMember[];
  equipment_ids?: string[];
  assignment_date?: string;
  conditions?: {
    depth_ft?: number;
    height_ft?: number;
    equipment_type?: string;
  };
}

interface ValidationResult {
  passed: boolean;
  blocking_issues: BlockingIssue[];
  warnings: Warning[];
  rules_applied: AppliedRule[];
  compliance_summary: ComplianceSummary;
}

interface BlockingIssue {
  code: string;
  rule_code?: string;
  severity: 'critical' | 'high';
  risk_level: string;
  message: string;
  affected_entity: string;
  entity_id: string;
  remediation: string;
  override_allowed: boolean;
  override_approver_roles?: string[];
}

interface Warning {
  code: string;
  severity: 'medium' | 'low';
  message: string;
  affected_entity?: string;
}

interface AppliedRule {
  rule_code: string;
  rule_name: string;
  risk_level: string;
  passed: boolean;
  regulatory_reference?: string;
}

interface ComplianceSummary {
  subcontractor_coi_valid: boolean;
  has_required_competent_persons: boolean;
  equipment_cleared: boolean;
  all_certs_valid: boolean;
  all_orientations_valid: boolean;
  daily_brief_completed: boolean;
  total_rules_checked: number;
  rules_passed: number;
  checked_at: string;
}

interface ValidationRule {
  id: string;
  rule_code: string;
  rule_name: string;
  work_type: string;
  conditions: Record<string, unknown>;
  required_certification_codes: string[];
  required_competent_person_types: string[];
  required_equipment_operator_certs: string[];
  min_crew_with_cert: number;
  require_site_orientation: boolean;
  require_daily_brief: boolean;
  risk_level: string;
  blocking_behavior: string;
  override_allowed: boolean;
  override_max_hours: number;
  override_approver_roles: string[];
  regulatory_reference: string | null;
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

    const body: ValidationRequest = await req.json();
    const { project_id, work_type, crew_members, equipment_ids, assignment_date, conditions } = body;

    if (!project_id || !work_type || !crew_members || crew_members.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: project_id, work_type, crew_members' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const blocking_issues: BlockingIssue[] = [];
    const warnings: Warning[] = [];
    const rules_applied: AppliedRule[] = [];
    const workDate = assignment_date ? new Date(assignment_date) : new Date();
    const workDateStr = workDate.toISOString().split('T')[0];

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
    // FETCH APPLICABLE RULES FROM DATABASE
    // ==========================================================================
    const workTypeLower = work_type.toLowerCase();

    const { data: rules } = await supabase
      .from('assignment_validation_rules')
      .select('*')
      .eq('is_active', true)
      .lte('effective_date', workDateStr)
      .or('organization_id.is.null,organization_id.eq.' + project.organization_id);

    // Filter rules by work type (partial match for flexibility)
    const applicableRules: ValidationRule[] = (rules || []).filter((rule: ValidationRule) => {
      // Check work type match
      if (!workTypeLower.includes(rule.work_type.toLowerCase()) &&
          !rule.work_type.toLowerCase().includes(workTypeLower)) {
        return false;
      }

      // Check additional conditions
      if (rule.conditions && Object.keys(rule.conditions).length > 0) {
        const cond = rule.conditions as Record<string, number>;
        if (cond.depth_ft_gte && (!conditions?.depth_ft || conditions.depth_ft < cond.depth_ft_gte)) {
          return false;
        }
        if (cond.height_ft_gte && (!conditions?.height_ft || conditions.height_ft < cond.height_ft_gte)) {
          return false;
        }
      }

      // Check expiration
      if (rule.expiration_date && rule.expiration_date < workDateStr) {
        return false;
      }

      return true;
    });

    // ==========================================================================
    // CHECK 1: Subcontractor COI Validation
    // ==========================================================================
    let subcontractor_coi_valid = true;

    if (subWorkerIds.length > 0) {
      const { data: subWorkers } = await supabase
        .from('subcontractor_workers')
        .select('id, subcontractor_id, first_name, last_name')
        .in('id', subWorkerIds);

      if (subWorkers) {
        const subcontractorIds = [...new Set(subWorkers.map(w => w.subcontractor_id))];

        const { data: subcontractors } = await supabase
          .from('subcontractors')
          .select('id, company_name, general_liability_exp, workers_comp_exp, auto_liability_exp')
          .in('id', subcontractorIds);

        if (subcontractors) {
          const today = new Date().toISOString().split('T')[0];

          for (const sub of subcontractors) {
            if (!sub.general_liability_exp || sub.general_liability_exp < today) {
              blocking_issues.push({
                code: 'COI_GL_EXPIRED',
                severity: 'critical',
                risk_level: 'critical',
                message: `${sub.company_name}: General Liability insurance expired`,
                affected_entity: 'subcontractor',
                entity_id: sub.id,
                remediation: 'Update COI with current General Liability certificate',
                override_allowed: false,
              });
              subcontractor_coi_valid = false;
            }

            if (!sub.workers_comp_exp || sub.workers_comp_exp < today) {
              blocking_issues.push({
                code: 'COI_WC_EXPIRED',
                severity: 'critical',
                risk_level: 'critical',
                message: `${sub.company_name}: Workers Comp insurance expired`,
                affected_entity: 'subcontractor',
                entity_id: sub.id,
                remediation: 'Update COI with current Workers Comp certificate',
                override_allowed: false,
              });
              subcontractor_coi_valid = false;
            }

            if (!sub.auto_liability_exp || sub.auto_liability_exp < today) {
              blocking_issues.push({
                code: 'COI_AUTO_EXPIRED',
                severity: 'critical',
                risk_level: 'critical',
                message: `${sub.company_name}: Auto Liability insurance expired`,
                affected_entity: 'subcontractor',
                entity_id: sub.id,
                remediation: 'Update COI with current Auto Liability certificate',
                override_allowed: false,
              });
              subcontractor_coi_valid = false;
            }
          }
        }
      }
    }

    // ==========================================================================
    // CHECK 2: Apply Data-Driven Rules
    // ==========================================================================
    let has_required_competent_persons = true;
    let all_certs_valid = true;

    for (const rule of applicableRules) {
      let rulePassed = true;

      // Check competent person requirements
      if (rule.required_competent_person_types && rule.required_competent_person_types.length > 0) {
        for (const cpType of rule.required_competent_person_types) {
          // Check employees
          const { data: competentPersons } = await supabase
            .from('competent_person_designations')
            .select('id, employee_id, subcontractor_worker_id')
            .eq('competent_person_type', cpType)
            .eq('is_active', true)
            .is('revoked_at', null)
            .or(`expiration_date.is.null,expiration_date.gt.${workDateStr}`)
            .or(
              employeeIds.length > 0
                ? `employee_id.in.(${employeeIds.join(',')})`
                : 'employee_id.is.null'
            );

          // Check subcontractor workers
          const { data: subCompetentPersons } = await supabase
            .from('competent_person_designations')
            .select('id, employee_id, subcontractor_worker_id')
            .eq('competent_person_type', cpType)
            .eq('is_active', true)
            .is('revoked_at', null)
            .or(`expiration_date.is.null,expiration_date.gt.${workDateStr}`)
            .or(
              subWorkerIds.length > 0
                ? `subcontractor_worker_id.in.(${subWorkerIds.join(',')})`
                : 'subcontractor_worker_id.is.null'
            );

          const hasCompetentForType =
            (competentPersons && competentPersons.length > 0) ||
            (subCompetentPersons && subCompetentPersons.length > 0);

          if (!hasCompetentForType) {
            const issue: BlockingIssue = {
              code: 'NO_COMPETENT_PERSON',
              rule_code: rule.rule_code,
              severity: rule.risk_level === 'critical' ? 'critical' : 'high',
              risk_level: rule.risk_level,
              message: `No competent person for ${cpType.replace(/_/g, ' ')} on crew`,
              affected_entity: 'crew',
              entity_id: project_id,
              remediation: `Assign a worker with active ${cpType.replace(/_/g, ' ')} competent person designation`,
              override_allowed: rule.override_allowed,
              override_approver_roles: rule.override_approver_roles,
            };

            if (rule.blocking_behavior === 'block') {
              blocking_issues.push(issue);
              has_required_competent_persons = false;
            } else if (rule.blocking_behavior === 'warn') {
              warnings.push({
                code: 'COMPETENT_PERSON_WARNING',
                severity: 'medium',
                message: issue.message,
                affected_entity: project_id,
              });
            }
            rulePassed = false;
          }
        }
      }

      // Check certification requirements
      if (rule.required_certification_codes && rule.required_certification_codes.length > 0) {
        for (const certCode of rule.required_certification_codes) {
          // Get certifications for crew
          const { data: certifications } = await supabase
            .from('employee_certifications')
            .select('employee_id, certification_type, expires_at, status')
            .in('employee_id', employeeIds.length > 0 ? employeeIds : ['00000000-0000-0000-0000-000000000000'])
            .or(`certification_type.eq.${certCode},certification_type_id.in.(select id from certification_types where code = '${certCode}')`)
            .eq('status', 'active')
            .or(`expires_at.is.null,expires_at.gte.${workDateStr}`);

          const crewWithCert = certifications?.length || 0;

          if (crewWithCert < rule.min_crew_with_cert) {
            const issue: BlockingIssue = {
              code: 'MISSING_CERTIFICATION',
              rule_code: rule.rule_code,
              severity: rule.risk_level === 'critical' ? 'critical' : 'high',
              risk_level: rule.risk_level,
              message: `Crew missing required certification: ${certCode.replace(/_/g, ' ')}`,
              affected_entity: 'crew',
              entity_id: project_id,
              remediation: `Ensure at least ${rule.min_crew_with_cert} crew member(s) have valid ${certCode.replace(/_/g, ' ')} certification`,
              override_allowed: rule.override_allowed,
              override_approver_roles: rule.override_approver_roles,
            };

            if (rule.blocking_behavior === 'block') {
              blocking_issues.push(issue);
              all_certs_valid = false;
            } else if (rule.blocking_behavior === 'warn') {
              warnings.push({
                code: 'CERTIFICATION_WARNING',
                severity: 'medium',
                message: issue.message,
                affected_entity: project_id,
              });
            }
            rulePassed = false;
          }
        }
      }

      // Track applied rule
      rules_applied.push({
        rule_code: rule.rule_code,
        rule_name: rule.rule_name,
        risk_level: rule.risk_level,
        passed: rulePassed,
        regulatory_reference: rule.regulatory_reference || undefined,
      });
    }

    // ==========================================================================
    // CHECK 3: Equipment Status
    // ==========================================================================
    let equipment_cleared = true;

    if (equipment_ids && equipment_ids.length > 0) {
      const { data: equipment } = await supabase
        .from('equipment')
        .select('id, name, equipment_number, status, next_service_date')
        .in('id', equipment_ids);

      if (equipment) {
        for (const eq of equipment) {
          if (eq.status === 'DO_NOT_OPERATE' || eq.status === 'OUT_OF_SERVICE') {
            blocking_issues.push({
              code: 'EQUIPMENT_DNO',
              severity: 'critical',
              risk_level: 'critical',
              message: `${eq.name} (${eq.equipment_number}): Equipment is tagged "Do Not Operate"`,
              affected_entity: 'equipment',
              entity_id: eq.id,
              remediation: 'Clear equipment maintenance issues before assignment',
              override_allowed: false,
            });
            equipment_cleared = false;
          }

          if (eq.next_service_date && eq.next_service_date < workDateStr) {
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
    // CHECK 4: Site Orientations
    // ==========================================================================
    let all_orientations_valid = true;

    // Check employees
    if (employeeIds.length > 0) {
      const { data: orientations } = await supabase
        .from('safety_orientations')
        .select('employee_id, valid_until, acknowledged_at')
        .in('employee_id', employeeIds)
        .eq('project_id', project_id)
        .not('acknowledged_at', 'is', null);

      const employeesWithOrientation = new Set(
        orientations
          ?.filter(o => !o.valid_until || o.valid_until >= workDateStr)
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

    // Check subcontractor workers
    if (subWorkerIds.length > 0) {
      const { data: subOrientations } = await supabase
        .from('safety_orientations')
        .select('subcontractor_worker_id, valid_until, acknowledged_at')
        .in('subcontractor_worker_id', subWorkerIds)
        .eq('project_id', project_id)
        .not('acknowledged_at', 'is', null);

      const subWorkersWithOrientation = new Set(
        subOrientations
          ?.filter(o => !o.valid_until || o.valid_until >= workDateStr)
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
    // CHECK 5: Daily Safety Brief (if required by any rule)
    // ==========================================================================
    let daily_brief_completed = true;
    const requiresDailyBrief = applicableRules.some(r => r.require_daily_brief);

    if (requiresDailyBrief) {
      const { data: todaysBriefs } = await supabase
        .from('daily_safety_briefs')
        .select('id, completed_at, all_required_complete')
        .eq('project_id', project_id)
        .eq('brief_date', workDateStr)
        .not('completed_at', 'is', null)
        .eq('all_required_complete', true);

      if (!todaysBriefs || todaysBriefs.length === 0) {
        warnings.push({
          code: 'NO_DAILY_BRIEF',
          severity: 'medium',
          message: 'No completed daily safety brief for today',
          affected_entity: project_id,
        });
        daily_brief_completed = false;
      }
    }

    // ==========================================================================
    // CHECK 6: Active Overrides
    // ==========================================================================
    // Check if any blocking issues have active overrides
    if (blocking_issues.length > 0) {
      const { data: activeOverrides } = await supabase
        .from('compliance_overrides')
        .select('*')
        .eq('project_id', project_id)
        .eq('status', 'ACTIVE')
        .gt('expires_at', new Date().toISOString());

      if (activeOverrides && activeOverrides.length > 0) {
        // Remove blocking issues that have active overrides
        const overriddenRuleCodes = new Set(
          activeOverrides.map(o => o.rule_code || o.override_type)
        );

        for (let i = blocking_issues.length - 1; i >= 0; i--) {
          const issue = blocking_issues[i];
          if (issue.rule_code && overriddenRuleCodes.has(issue.rule_code)) {
            warnings.push({
              code: 'OVERRIDE_ACTIVE',
              severity: 'low',
              message: `Override active for: ${issue.message}`,
              affected_entity: issue.entity_id,
            });
            blocking_issues.splice(i, 1);
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
      rules_applied,
      compliance_summary: {
        subcontractor_coi_valid,
        has_required_competent_persons,
        equipment_cleared,
        all_certs_valid,
        all_orientations_valid,
        daily_brief_completed,
        total_rules_checked: applicableRules.length,
        rules_passed: rules_applied.filter(r => r.passed).length,
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
