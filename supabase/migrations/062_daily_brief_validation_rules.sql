-- Migration 062: Daily Safety Brief & Assignment Validation Rules
-- Part of Safety Compliance Enforcement System - "The Gatekeeper"
--
-- This migration creates:
-- 1. Daily Safety Brief table (supervisor accountability - NOT toolbox talks)
-- 2. Assignment Validation Rules (data-driven rule engine, replaces hardcoded mappings)
-- 3. Modifications to compliance_overrides for tiered approval
--
-- Dependencies: Migration 049-052, Migration 061

-- ============================================================================
-- DAILY SAFETY BRIEFS (Supervisor Accountability Checklist)
-- ============================================================================
-- This is DIFFERENT from toolbox talks:
-- - Daily Brief: Quick supervisor checklist proving they did their job
-- - Toolbox Talk: Topic-based crew training (already exists in Migration 050)

CREATE TABLE IF NOT EXISTS public.daily_safety_briefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- When & Who
    brief_date DATE NOT NULL,
    supervisor_id UUID NOT NULL REFERENCES public.user_profiles(id),

    -- Link to crew assignment if applicable
    crew_assignment_id UUID REFERENCES public.crew_assignments(id),

    -- =========================================================================
    -- STANDARD CHECKLIST RESPONSES
    -- =========================================================================
    -- Stored as JSONB for flexibility to add/modify questions without migrations
    checklist_responses JSONB NOT NULL DEFAULT '{}'::JSONB,
    /*
    Standard checklist structure:
    {
        "ppe_verified": boolean,              // "Have you verified all crew have required PPE?"
        "equipment_inspected": boolean,       // "Have you inspected all equipment for safe operation?"
        "hazards_identified": boolean,        // "Have you identified and communicated today's hazards?"
        "emergency_plan_reviewed": boolean,   // "Is crew aware of emergency procedures/muster point?"
        "competent_person_present": boolean,  // "Is a competent person on site for today's work?"
        "utilities_marked": boolean,          // "Are all utilities marked/located?" (if excavation)
        "fall_protection_in_place": boolean,  // "Is fall protection in place?" (if elevated work)
        "traffic_control_set": boolean,       // "Is traffic control set up?" (if near roadway)
        "confined_space_permit": boolean,     // "Is permit in place?" (if confined space)
        "hot_work_permit": boolean,           // "Is hot work permit in place?" (if welding/cutting)
        "weather_acceptable": boolean,        // "Is weather suitable for planned work?"
        "first_aid_available": boolean        // "Is first aid kit and trained person on site?"
    }
    */

    -- Required questions (computed for quick filtering)
    all_required_complete BOOLEAN GENERATED ALWAYS AS (
        COALESCE((checklist_responses->>'ppe_verified')::boolean, false)
        AND COALESCE((checklist_responses->>'equipment_inspected')::boolean, false)
        AND COALESCE((checklist_responses->>'hazards_identified')::boolean, false)
        AND COALESCE((checklist_responses->>'emergency_plan_reviewed')::boolean, false)
    ) STORED,

    -- =========================================================================
    -- CREW ATTENDANCE (Quick Check-Off)
    -- =========================================================================
    attendee_count INTEGER NOT NULL DEFAULT 0,
    attendee_employee_ids UUID[] NOT NULL DEFAULT '{}',
    attendee_sub_worker_ids UUID[] DEFAULT '{}',

    -- =========================================================================
    -- SITE CONDITIONS
    -- =========================================================================
    weather_conditions TEXT,
    -- 'clear', 'partly_cloudy', 'overcast', 'rain', 'snow', 'fog', 'high_wind'

    temperature_f INTEGER,
    -- Actual or estimated temperature

    site_conditions TEXT,
    -- Free text: "Muddy from overnight rain, boards placed over wet areas"

    special_hazards TEXT,
    -- Free text: "Gas line being exposed at station 4+50"

    work_planned TEXT,
    -- Free text: "Continue excavation for storm drain, pour concrete bases"

    -- =========================================================================
    -- COMPLETION TRACKING
    -- =========================================================================
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    -- How long the brief took (should be ~30-60 seconds)

    -- =========================================================================
    -- GPS VERIFICATION
    -- =========================================================================
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    gps_accuracy_meters DECIMAL(6, 2),

    -- =========================================================================
    -- AUDIT
    -- =========================================================================
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- One brief per supervisor per project per day
    CONSTRAINT unique_daily_brief UNIQUE (project_id, brief_date, supervisor_id)
);

COMMENT ON TABLE public.daily_safety_briefs IS 'Supervisor accountability checklist - quick pre-work safety verification';


-- ============================================================================
-- ASSIGNMENT VALIDATION RULES (Data-Driven Rules Engine)
-- ============================================================================
-- Replaces hardcoded work type → competent person mappings in validate-crew-assignment

CREATE TYPE validation_risk_level AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);

CREATE TYPE validation_blocking_behavior AS ENUM (
    'block',    -- Prevent assignment until resolved
    'warn',     -- Allow with warning, log for review
    'log'       -- Allow silently, record for audit
);

CREATE TABLE IF NOT EXISTS public.assignment_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    -- NULL organization_id = system-wide (federal requirements)

    -- =========================================================================
    -- RULE IDENTIFICATION
    -- =========================================================================
    rule_code TEXT NOT NULL,
    -- e.g., 'EXCAVATION_COMPETENT', 'CRANE_NCCCO', 'FALL_PROTECTION_4FT'

    rule_name TEXT NOT NULL,
    -- e.g., 'Excavation Competent Person Required'

    description TEXT,
    -- Detailed description for Safety Admin

    -- =========================================================================
    -- TRIGGER CONDITIONS
    -- =========================================================================
    work_type TEXT NOT NULL,
    -- Matches crew_assignment.work_type: 'excavation', 'trenching', 'scaffolding', etc.

    conditions JSONB DEFAULT '{}'::JSONB,
    -- Additional conditions beyond work type:
    -- {"depth_ft_gte": 5}           -- Only trigger if trench > 5 feet
    -- {"height_ft_gte": 6}          -- Only trigger if work > 6 feet
    -- {"equipment_type": "crane"}   -- Only trigger if crane in use

    -- =========================================================================
    -- REQUIREMENTS (What Must Be Present)
    -- =========================================================================
    required_certification_codes TEXT[] DEFAULT '{}',
    -- At least one crew member must have these certifications
    -- e.g., ['FALL_PROTECTION', 'OSHA_10']

    required_competent_person_types TEXT[] DEFAULT '{}',
    -- Competent person must be designated for these types
    -- e.g., ['excavation', 'scaffolding']

    required_equipment_operator_certs TEXT[] DEFAULT '{}',
    -- Equipment operators must have these certifications
    -- e.g., ['NCCCO_TLL'] for crane operation

    min_crew_with_cert INTEGER DEFAULT 1,
    -- How many crew members must have the required cert
    -- Usually 1, but could be higher for certain work

    require_site_orientation BOOLEAN DEFAULT true,
    -- All crew must have site orientation for this project

    require_daily_brief BOOLEAN DEFAULT true,
    -- Supervisor must complete daily brief before dispatch

    -- =========================================================================
    -- ENFORCEMENT
    -- =========================================================================
    risk_level validation_risk_level NOT NULL DEFAULT 'medium',
    -- How serious is non-compliance?

    blocking_behavior validation_blocking_behavior NOT NULL DEFAULT 'block',
    -- What happens when rule fails?

    -- =========================================================================
    -- OVERRIDE RULES
    -- =========================================================================
    override_allowed BOOLEAN NOT NULL DEFAULT true,
    -- Can this rule be overridden at all?

    override_max_hours INTEGER DEFAULT 4,
    -- Maximum duration for an override (NULL = no limit)

    override_approver_roles TEXT[] DEFAULT '{"SUPERINTENDENT"}',
    -- Which roles can approve overrides for this rule?
    -- Based on risk level:
    -- LOW: ['FOREMAN', 'SUPERINTENDENT', ...]
    -- MEDIUM: ['SUPERINTENDENT', 'PROJECT_MANAGER', ...]
    -- HIGH: ['PROJECT_MANAGER', 'SAFETY_MANAGER', 'SAFETY_DIRECTOR']
    -- CRITICAL: ['SAFETY_DIRECTOR'] only

    override_requires_documentation BOOLEAN DEFAULT false,
    -- Must document reason for override

    override_requires_photo BOOLEAN DEFAULT false,
    -- Must include photo evidence

    -- =========================================================================
    -- REGULATORY REFERENCE
    -- =========================================================================
    jurisdiction TEXT DEFAULT 'federal',
    -- 'federal', 'state', 'company', 'project'

    regulatory_reference TEXT,
    -- e.g., '29 CFR 1926.651(k)' for excavation competent person

    penalty_info TEXT,
    -- Optional: "OSHA serious violation, up to $15,625 per instance"

    -- =========================================================================
    -- LIFECYCLE
    -- =========================================================================
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- =========================================================================
    -- AUDIT
    -- =========================================================================
    created_by UUID REFERENCES public.user_profiles(id),
    updated_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_rule_code UNIQUE NULLS NOT DISTINCT (organization_id, rule_code)
);

COMMENT ON TABLE public.assignment_validation_rules IS 'Data-driven rules for crew assignment validation - replaces hardcoded logic';

-- ============================================================================
-- SEED FEDERAL OSHA RULES (System-Wide)
-- ============================================================================

INSERT INTO public.assignment_validation_rules (
    organization_id, rule_code, rule_name, description, work_type, conditions,
    required_competent_person_types, risk_level, blocking_behavior, override_allowed,
    override_max_hours, override_approver_roles, jurisdiction, regulatory_reference
) VALUES
-- Excavation & Trenching
(NULL, 'EXCAVATION_COMPETENT', 'Excavation Competent Person Required',
 'A competent person must be designated to inspect excavations, materials, and adjacent areas for possible cave-ins, failures, and hazards.',
 'excavation', '{}',
 '{"excavation"}', 'critical', 'block', true,
 4, '{"SAFETY_DIRECTOR"}', 'federal', '29 CFR 1926.651(k)'
),

(NULL, 'TRENCH_5FT_PROTECTION', 'Trenching >5ft Requires Protection System',
 'Trenches 5 feet or deeper require protective systems (sloping, shoring, or shielding) and competent person inspection.',
 'trenching', '{"depth_ft_gte": 5}',
 '{"excavation"}', 'critical', 'block', false,
 NULL, '{}', 'federal', '29 CFR 1926.652(a)(1)'
),

-- Scaffolding
(NULL, 'SCAFFOLD_COMPETENT', 'Scaffolding Competent Person Required',
 'Scaffolds must be erected, moved, dismantled, or altered under the supervision of a competent person.',
 'scaffolding', '{}',
 '{"scaffolding"}', 'high', 'block', true,
 4, '{"SUPERINTENDENT", "SAFETY_MANAGER", "SAFETY_DIRECTOR"}', 'federal', '29 CFR 1926.451(f)'
),

(NULL, 'SCAFFOLD_TRAINED_USER', 'Scaffold Users Must Be Trained',
 'Employees who perform work on scaffolds must be trained by a qualified person to recognize hazards.',
 'scaffolding', '{}',
 '{}', 'medium', 'block', true,
 4, '{"SUPERINTENDENT", "SAFETY_MANAGER"}', 'federal', '29 CFR 1926.454(a)'
),

-- Fall Protection
(NULL, 'FALL_PROTECTION_6FT', 'Fall Protection Required Above 6 Feet',
 'Construction workers must be protected from falls of 6 feet or more.',
 'elevated_work', '{"height_ft_gte": 6}',
 '{}', 'critical', 'block', true,
 2, '{"SAFETY_DIRECTOR"}', 'federal', '29 CFR 1926.501(b)(1)'
),

(NULL, 'FALL_PROTECTION_TRAINED', 'Fall Protection Training Required',
 'Workers exposed to fall hazards must be trained on fall protection equipment and procedures.',
 'elevated_work', '{}',
 '{}', 'high', 'block', true,
 4, '{"SUPERINTENDENT", "SAFETY_MANAGER"}', 'federal', '29 CFR 1926.503'
),

-- Confined Space
(NULL, 'CONFINED_SPACE_PERMIT', 'Confined Space Entry Permit Required',
 'Permit-required confined space entry requires attendant, entrant training, and rescue provisions.',
 'confined_space', '{}',
 '{"confined_space"}', 'critical', 'block', false,
 NULL, '{}', 'federal', '29 CFR 1926.1204'
),

-- Crane Operations
(NULL, 'CRANE_OPERATOR_CERT', 'Certified Crane Operator Required',
 'Crane operators must be certified by an accredited certifying body (NCCCO, CIC, NCCER).',
 'crane_operation', '{}',
 '{}', 'critical', 'block', false,
 NULL, '{}', 'federal', '29 CFR 1926.1427'
),

(NULL, 'CRANE_SIGNAL_PERSON', 'Qualified Signal Person Required',
 'A qualified signal person must be provided when the operator cannot see the load or landing zone.',
 'crane_operation', '{}',
 '{}', 'high', 'block', true,
 4, '{"SUPERINTENDENT", "SAFETY_DIRECTOR"}', 'federal', '29 CFR 1926.1419'
),

(NULL, 'CRANE_RIGGER', 'Qualified Rigger Required',
 'Rigging must be performed by a qualified rigger.',
 'rigging', '{}',
 '{}', 'high', 'block', true,
 4, '{"SUPERINTENDENT", "SAFETY_DIRECTOR"}', 'federal', '29 CFR 1926.1404'
),

-- Electrical
(NULL, 'ELECTRICAL_QUALIFIED', 'Qualified Electrical Worker Required',
 'Only qualified persons may work on electrical circuits or equipment.',
 'electrical', '{}',
 '{}', 'critical', 'block', false,
 NULL, '{}', 'federal', '29 CFR 1926.405'
),

-- General
(NULL, 'FIRST_AID_AVAILABLE', 'First Aid Coverage Required',
 'First aid supplies and a person trained in first aid must be available on site.',
 'general', '{}',
 '{}', 'medium', 'warn', true,
 8, '{"SUPERINTENDENT", "PROJECT_MANAGER"}', 'federal', '29 CFR 1926.50'
)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- MODIFY COMPLIANCE_OVERRIDES FOR TIERED APPROVAL
-- ============================================================================

-- Add columns for tiered approval tracking
ALTER TABLE public.compliance_overrides
ADD COLUMN IF NOT EXISTS risk_level TEXT,
ADD COLUMN IF NOT EXISTS approved_by_role TEXT,
ADD COLUMN IF NOT EXISTS rule_id UUID REFERENCES public.assignment_validation_rules(id),
ADD COLUMN IF NOT EXISTS documentation TEXT,
ADD COLUMN IF NOT EXISTS photo_url TEXT;

COMMENT ON COLUMN public.compliance_overrides.risk_level IS 'Risk level of the rule being overridden';
COMMENT ON COLUMN public.compliance_overrides.approved_by_role IS 'Role of the person who approved the override';
COMMENT ON COLUMN public.compliance_overrides.rule_id IS 'Reference to the specific rule being overridden';


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.daily_safety_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_validation_rules ENABLE ROW LEVEL SECURITY;

-- Daily Safety Briefs: Organization-scoped + supervisor self-access
CREATE POLICY "daily_briefs_read" ON public.daily_safety_briefs
    FOR SELECT USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "daily_briefs_insert" ON public.daily_safety_briefs
    FOR INSERT WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND (
            supervisor_id = auth.uid()
            OR public.user_has_permission(auth.uid(), 'safety.create')
        )
    );

CREATE POLICY "daily_briefs_update" ON public.daily_safety_briefs
    FOR UPDATE USING (
        organization_id = public.get_user_organization_id()
        AND (
            supervisor_id = auth.uid()
            OR public.user_has_permission(auth.uid(), 'safety.update')
        )
    );

-- Assignment Validation Rules: Read all (including system), write org only
CREATE POLICY "rules_read" ON public.assignment_validation_rules
    FOR SELECT USING (
        organization_id IS NULL -- System rules readable by all
        OR organization_id = public.get_user_organization_id()
    );

CREATE POLICY "rules_write" ON public.assignment_validation_rules
    FOR ALL USING (
        organization_id = public.get_user_organization_id()
        AND public.user_has_permission(auth.uid(), 'admin.system_settings')
    );


-- ============================================================================
-- VIEWS
-- ============================================================================

-- Today's briefs by project
CREATE OR REPLACE VIEW public.v_todays_safety_briefs AS
SELECT
    dsb.id,
    dsb.organization_id,
    dsb.project_id,
    p.name AS project_name,
    p.project_number,
    dsb.brief_date,
    dsb.supervisor_id,
    up.first_name || ' ' || up.last_name AS supervisor_name,
    dsb.attendee_count,
    dsb.all_required_complete,
    dsb.completed_at IS NOT NULL AS is_complete,
    dsb.duration_seconds,
    dsb.weather_conditions,
    dsb.special_hazards
FROM public.daily_safety_briefs dsb
JOIN public.projects p ON p.id = dsb.project_id
JOIN public.user_profiles up ON up.id = dsb.supervisor_id
WHERE dsb.brief_date = CURRENT_DATE
ORDER BY p.name, up.last_name;

-- Active rules by work type
CREATE OR REPLACE VIEW public.v_active_validation_rules AS
SELECT
    avr.id,
    avr.organization_id,
    avr.rule_code,
    avr.rule_name,
    avr.description,
    avr.work_type,
    avr.conditions,
    avr.required_certification_codes,
    avr.required_competent_person_types,
    avr.required_equipment_operator_certs,
    avr.risk_level,
    avr.blocking_behavior,
    avr.override_allowed,
    avr.override_max_hours,
    avr.override_approver_roles,
    avr.regulatory_reference
FROM public.assignment_validation_rules avr
WHERE avr.is_active = true
  AND avr.effective_date <= CURRENT_DATE
  AND (avr.expiration_date IS NULL OR avr.expiration_date >= CURRENT_DATE)
ORDER BY avr.risk_level DESC, avr.work_type, avr.rule_name;


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get applicable rules for a work type
CREATE OR REPLACE FUNCTION get_applicable_rules(
    p_organization_id UUID,
    p_work_type TEXT,
    p_conditions JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE (
    rule_id UUID,
    rule_code TEXT,
    rule_name TEXT,
    risk_level TEXT,
    blocking_behavior TEXT,
    required_certification_codes TEXT[],
    required_competent_person_types TEXT[],
    override_allowed BOOLEAN,
    override_approver_roles TEXT[],
    regulatory_reference TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        avr.id,
        avr.rule_code,
        avr.rule_name,
        avr.risk_level::TEXT,
        avr.blocking_behavior::TEXT,
        avr.required_certification_codes,
        avr.required_competent_person_types,
        avr.override_allowed,
        avr.override_approver_roles,
        avr.regulatory_reference
    FROM public.assignment_validation_rules avr
    WHERE (avr.organization_id IS NULL OR avr.organization_id = p_organization_id)
      AND avr.work_type = p_work_type
      AND avr.is_active = true
      AND avr.effective_date <= CURRENT_DATE
      AND (avr.expiration_date IS NULL OR avr.expiration_date >= CURRENT_DATE)
      -- Check additional conditions
      AND (
          avr.conditions = '{}'::JSONB
          OR (
              -- Check depth condition
              (avr.conditions->>'depth_ft_gte' IS NULL
               OR (p_conditions->>'depth_ft')::INTEGER >= (avr.conditions->>'depth_ft_gte')::INTEGER)
              -- Check height condition
              AND (avr.conditions->>'height_ft_gte' IS NULL
               OR (p_conditions->>'height_ft')::INTEGER >= (avr.conditions->>'height_ft_gte')::INTEGER)
          )
      )
    ORDER BY avr.risk_level DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can approve override for risk level
CREATE OR REPLACE FUNCTION can_approve_override(
    p_user_id UUID,
    p_risk_level TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_user_roles TEXT[];
    v_allowed_roles TEXT[];
BEGIN
    -- Get user's role codes
    SELECT array_agg(r.code)
    INTO v_user_roles
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id;

    -- Define allowed roles by risk level
    v_allowed_roles := CASE p_risk_level
        WHEN 'low' THEN ARRAY['FOREMAN', 'SUPERINTENDENT', 'PROJECT_MANAGER', 'SAFETY_MANAGER', 'SAFETY_DIRECTOR', 'ADMIN']
        WHEN 'medium' THEN ARRAY['SUPERINTENDENT', 'PROJECT_MANAGER', 'SAFETY_MANAGER', 'SAFETY_DIRECTOR', 'ADMIN']
        WHEN 'high' THEN ARRAY['PROJECT_MANAGER', 'SAFETY_MANAGER', 'SAFETY_DIRECTOR', 'VP_OPERATIONS', 'ADMIN']
        WHEN 'critical' THEN ARRAY['SAFETY_DIRECTOR', 'ADMIN']
        ELSE ARRAY[]::TEXT[]
    END;

    -- Check if user has any allowed role
    RETURN v_user_roles && v_allowed_roles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if supervisor has completed today's brief
CREATE OR REPLACE FUNCTION has_completed_daily_brief(
    p_project_id UUID,
    p_supervisor_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.daily_safety_briefs
        WHERE project_id = p_project_id
          AND supervisor_id = p_supervisor_id
          AND brief_date = p_date
          AND completed_at IS NOT NULL
          AND all_required_complete = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get brief status for a project
CREATE OR REPLACE FUNCTION get_project_brief_status(p_project_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    supervisor_id UUID,
    supervisor_name TEXT,
    brief_completed BOOLEAN,
    attendee_count INTEGER,
    completed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dsb.supervisor_id,
        up.first_name || ' ' || up.last_name,
        dsb.completed_at IS NOT NULL AND dsb.all_required_complete,
        dsb.attendee_count,
        dsb.completed_at
    FROM public.daily_safety_briefs dsb
    JOIN public.user_profiles up ON up.id = dsb.supervisor_id
    WHERE dsb.project_id = p_project_id
      AND dsb.brief_date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_daily_briefs_org ON public.daily_safety_briefs(organization_id);
CREATE INDEX IF NOT EXISTS idx_daily_briefs_project ON public.daily_safety_briefs(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_briefs_date ON public.daily_safety_briefs(brief_date);
CREATE INDEX IF NOT EXISTS idx_daily_briefs_supervisor ON public.daily_safety_briefs(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_daily_briefs_project_date ON public.daily_safety_briefs(project_id, brief_date);

CREATE INDEX IF NOT EXISTS idx_rules_org ON public.assignment_validation_rules(organization_id);
CREATE INDEX IF NOT EXISTS idx_rules_work_type ON public.assignment_validation_rules(work_type);
CREATE INDEX IF NOT EXISTS idx_rules_active ON public.assignment_validation_rules(is_active, effective_date, expiration_date);
CREATE INDEX IF NOT EXISTS idx_rules_risk_level ON public.assignment_validation_rules(risk_level);


-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

CREATE TRIGGER daily_safety_briefs_updated_at
    BEFORE UPDATE ON public.daily_safety_briefs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER assignment_validation_rules_updated_at
    BEFORE UPDATE ON public.assignment_validation_rules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER daily_safety_briefs_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.daily_safety_briefs
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER assignment_validation_rules_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.assignment_validation_rules
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


COMMENT ON COLUMN public.daily_safety_briefs.checklist_responses IS 'JSONB containing supervisor safety checklist responses';
COMMENT ON COLUMN public.assignment_validation_rules.conditions IS 'Additional conditions like {"depth_ft_gte": 5} for triggering rule';
COMMENT ON COLUMN public.assignment_validation_rules.override_approver_roles IS 'Role codes that can approve overrides for this rule';
