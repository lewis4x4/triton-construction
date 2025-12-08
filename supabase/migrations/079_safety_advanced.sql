-- =============================================================================
-- Migration 079: Advanced Safety Management
-- =============================================================================
-- Extends 050_safety_incidents.sql with:
-- - Toolbox talk templates
-- - Job Safety Analysis (JSA/JHA)
-- - OSHA 300 Log & 301 Form tracking
-- - Safety violations tracking
-- - EMR calculation support
-- - Leading indicator metrics
-- =============================================================================

-- ============================================================================
-- PART 0: CLEANUP
-- ============================================================================

DROP VIEW IF EXISTS public.v_osha_300_log CASCADE;
DROP VIEW IF EXISTS public.v_safety_metrics_dashboard CASCADE;
DROP VIEW IF EXISTS public.v_jsa_summary CASCADE;

DROP TABLE IF EXISTS public.safety_violation_corrective_actions CASCADE;
DROP TABLE IF EXISTS public.safety_violations CASCADE;
DROP TABLE IF EXISTS public.osha_301_forms CASCADE;
DROP TABLE IF EXISTS public.osha_300_logs CASCADE;
DROP TABLE IF EXISTS public.jsa_ppe_requirements CASCADE;
DROP TABLE IF EXISTS public.jsa_hazard_controls CASCADE;
DROP TABLE IF EXISTS public.job_safety_analysis CASCADE;
DROP TABLE IF EXISTS public.toolbox_talk_templates CASCADE;
DROP TABLE IF EXISTS public.safety_metrics CASCADE;

DROP FUNCTION IF EXISTS public.calculate_emr() CASCADE;
DROP FUNCTION IF EXISTS public.generate_osha_300_log() CASCADE;

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.jsa_status AS ENUM (
        'DRAFT',
        'PENDING_REVIEW',
        'APPROVED',
        'EXPIRED',
        'SUPERSEDED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.control_hierarchy AS ENUM (
        'ELIMINATION',       -- Most effective - remove the hazard
        'SUBSTITUTION',      -- Replace with less hazardous
        'ENGINEERING',       -- Isolate people from hazard
        'ADMINISTRATIVE',    -- Change the way people work
        'PPE'               -- Least effective - protect the worker
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.violation_severity AS ENUM (
        'WILLFUL',           -- Intentional disregard
        'REPEAT',            -- Same or similar violation
        'SERIOUS',           -- Death or serious harm probable
        'OTHER_THAN_SERIOUS', -- Direct relationship to safety
        'DE_MINIMIS'         -- No direct impact
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: TOOLBOX TALK TEMPLATES
-- ============================================================================

CREATE TABLE public.toolbox_talk_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Template info
    title TEXT NOT NULL,
    category TEXT NOT NULL,              -- Fall Protection, Excavation, Heat Illness, etc.
    description TEXT,

    -- Content
    talking_points TEXT[] NOT NULL,      -- Bullet points to cover
    discussion_questions TEXT[],
    hazards_to_review TEXT[],
    ppe_requirements TEXT[],

    -- References
    osha_references TEXT[],              -- OSHA regulation references
    source_url TEXT,                     -- Link to source material
    attachments JSONB,                   -- [{name, url, type}]

    -- Duration
    estimated_duration_minutes INTEGER DEFAULT 15,

    -- Metadata
    is_seasonal BOOLEAN DEFAULT false,   -- For weather-related topics
    applicable_seasons TEXT[],           -- WINTER, SPRING, SUMMER, FALL
    is_project_specific BOOLEAN DEFAULT false,
    applicable_project_types TEXT[],     -- HIGHWAY, BRIDGE, BUILDING, etc.

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- PART 3: JOB SAFETY ANALYSIS (JSA/JHA)
-- ============================================================================

CREATE TABLE public.job_safety_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

    -- JSA identification
    jsa_number TEXT NOT NULL,
    revision_number INTEGER DEFAULT 1,

    -- Job description
    job_title TEXT NOT NULL,
    job_description TEXT NOT NULL,
    work_location TEXT,

    -- Work breakdown
    job_steps JSONB NOT NULL,            -- [{step_number, description, hazards[], controls[]}]

    -- Scope
    work_type TEXT,                      -- Excavation, Concrete Pour, Steel Erection, etc.
    equipment_required TEXT[],
    materials_involved TEXT[],

    -- Personnel requirements
    minimum_crew_size INTEGER,
    competent_person_required TEXT[],    -- Array of competent person types needed
    training_required TEXT[],            -- Required training/certifications

    -- Status workflow
    status public.jsa_status DEFAULT 'DRAFT',

    -- Prepared/reviewed/approved
    prepared_by UUID REFERENCES auth.users(id),
    prepared_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,

    -- Validity
    effective_date DATE,
    expiration_date DATE,
    supersedes_id UUID REFERENCES public.job_safety_analysis(id),

    -- Usage tracking
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- AI generation
    ai_generated BOOLEAN DEFAULT false,
    ai_generation_source TEXT,          -- daily_report_id, work_description, etc.

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(project_id, jsa_number, revision_number)
);

-- JSA Hazard Controls (detailed breakdown)
CREATE TABLE public.jsa_hazard_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jsa_id UUID NOT NULL REFERENCES public.job_safety_analysis(id) ON DELETE CASCADE,

    step_number INTEGER NOT NULL,
    hazard_description TEXT NOT NULL,
    potential_consequence TEXT,          -- What could happen
    risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

    -- Control measures (hierarchy)
    control_hierarchy public.control_hierarchy NOT NULL,
    control_description TEXT NOT NULL,
    control_responsible TEXT,            -- Who ensures control is in place

    -- Verification
    verification_method TEXT,            -- How to verify control is working

    created_at TIMESTAMPTZ DEFAULT now()
);

-- JSA PPE Requirements
CREATE TABLE public.jsa_ppe_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    jsa_id UUID NOT NULL REFERENCES public.job_safety_analysis(id) ON DELETE CASCADE,

    ppe_type TEXT NOT NULL,              -- Hard Hat, Safety Glasses, Gloves, etc.
    specification TEXT,                  -- ANSI Z89.1, Cut Level A4, etc.
    is_mandatory BOOLEAN DEFAULT true,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 4: OSHA 300 LOG
-- ============================================================================
-- OSHA 300 Log tracks all recordable injuries for a calendar year

CREATE TABLE public.osha_300_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Log identification
    establishment_name TEXT NOT NULL,     -- Name of establishment
    establishment_address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,

    -- Log period
    log_year INTEGER NOT NULL,

    -- Link to incident
    incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,

    -- Case information (OSHA 300 columns)
    case_number TEXT NOT NULL,           -- Sequential for the year
    employee_name TEXT NOT NULL,
    job_title TEXT,
    date_of_injury DATE NOT NULL,
    where_occurred TEXT,
    describe_injury TEXT NOT NULL,

    -- Classify the case (check one)
    is_death BOOLEAN DEFAULT false,
    is_days_away BOOLEAN DEFAULT false,
    is_job_transfer_restriction BOOLEAN DEFAULT false,
    is_other_recordable BOOLEAN DEFAULT false,

    -- Days counts
    days_away_count INTEGER DEFAULT 0,
    days_job_transfer_count INTEGER DEFAULT 0,

    -- Injury/Illness type (check one)
    type_injury BOOLEAN DEFAULT false,
    type_skin_disorder BOOLEAN DEFAULT false,
    type_respiratory BOOLEAN DEFAULT false,
    type_poisoning BOOLEAN DEFAULT false,
    type_hearing_loss BOOLEAN DEFAULT false,
    type_all_other BOOLEAN DEFAULT false,

    -- Privacy case
    is_privacy_case BOOLEAN DEFAULT false,

    -- Metadata
    entered_by UUID REFERENCES auth.users(id),
    entered_at TIMESTAMPTZ DEFAULT now(),

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(organization_id, log_year, case_number)
);

-- ============================================================================
-- PART 5: OSHA 301 FORM
-- ============================================================================
-- Detailed incident report form

CREATE TABLE public.osha_301_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Link to OSHA 300 entry
    osha_300_log_id UUID REFERENCES public.osha_300_logs(id) ON DELETE SET NULL,
    incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,

    -- Form identification
    form_number TEXT NOT NULL,
    log_year INTEGER NOT NULL,

    -- About the employee
    employee_name TEXT NOT NULL,
    employee_address TEXT,
    employee_city TEXT,
    employee_state TEXT,
    employee_zip TEXT,
    employee_dob DATE,
    employee_gender TEXT CHECK (employee_gender IN ('MALE', 'FEMALE', 'OTHER')),
    date_hired DATE,

    -- About the case
    time_employee_began_work TIME,
    time_of_event TIME,
    what_was_employee_doing TEXT,        -- Activity at time of injury
    what_happened TEXT,                  -- How injury occurred
    what_object_substance TEXT,          -- Object/substance that directly harmed

    -- About the injury/illness
    injury_description TEXT NOT NULL,
    body_part_affected TEXT,

    -- Treatment
    date_of_injury DATE NOT NULL,
    was_treated_emergency BOOLEAN DEFAULT false,
    emergency_facility_name TEXT,
    emergency_facility_address TEXT,
    was_hospitalized BOOLEAN DEFAULT false,
    hospitalization_days INTEGER,

    -- Physician information
    physician_name TEXT,
    physician_address TEXT,
    physician_phone TEXT,

    -- Case outcome
    did_employee_die BOOLEAN DEFAULT false,
    date_of_death DATE,

    -- Completed by
    completed_by_name TEXT,
    completed_by_title TEXT,
    completed_by_phone TEXT,
    completion_date DATE,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(organization_id, log_year, form_number)
);

-- ============================================================================
-- PART 6: SAFETY VIOLATIONS
-- ============================================================================

CREATE TABLE public.safety_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

    -- Citation information
    citation_number TEXT NOT NULL,
    issue_date DATE NOT NULL,
    issuing_agency TEXT DEFAULT 'OSHA', -- OSHA, State, Local

    -- Violation details
    violation_description TEXT NOT NULL,
    osha_standard_violated TEXT,         -- e.g., 29 CFR 1926.501(b)(1)
    severity public.violation_severity NOT NULL,

    -- Location
    location_description TEXT,
    inspection_number TEXT,

    -- Penalty
    initial_penalty NUMERIC(12,2),
    negotiated_penalty NUMERIC(12,2),
    final_penalty NUMERIC(12,2),
    penalty_paid BOOLEAN DEFAULT false,
    penalty_paid_date DATE,

    -- Contest status
    is_contested BOOLEAN DEFAULT false,
    contest_date DATE,
    contest_outcome TEXT,

    -- Abatement
    abatement_required BOOLEAN DEFAULT true,
    abatement_due_date DATE,
    abatement_completed_date DATE,
    abatement_verified BOOLEAN DEFAULT false,
    abatement_verified_by UUID REFERENCES auth.users(id),
    abatement_description TEXT,

    -- Status
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ABATED', 'CONTESTED', 'CLOSED', 'WITHDRAWN')),
    closed_date DATE,

    -- Documents
    citation_document_url TEXT,
    photos TEXT[],

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Corrective actions for violations
CREATE TABLE public.safety_violation_corrective_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_id UUID NOT NULL REFERENCES public.safety_violations(id) ON DELETE CASCADE,

    action_description TEXT NOT NULL,
    assigned_to UUID REFERENCES auth.users(id),
    due_date DATE,
    completed_at TIMESTAMPTZ,
    completed_by UUID REFERENCES auth.users(id),

    -- Verification
    verification_required BOOLEAN DEFAULT true,
    verification_method TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),

    -- Evidence
    evidence_photos TEXT[],
    evidence_documents TEXT[],
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 7: SAFETY METRICS (EMR & Leading Indicators)
-- ============================================================================

CREATE TABLE public.safety_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Period
    metric_year INTEGER NOT NULL,
    metric_quarter INTEGER CHECK (metric_quarter BETWEEN 1 AND 4),

    -- Hours worked
    total_hours_worked NUMERIC(15,2) NOT NULL,

    -- Lagging indicators (outcomes)
    fatalities INTEGER DEFAULT 0,
    hospitalizations INTEGER DEFAULT 0,
    recordable_injuries INTEGER DEFAULT 0,
    first_aid_cases INTEGER DEFAULT 0,
    near_misses_reported INTEGER DEFAULT 0,
    property_damage_incidents INTEGER DEFAULT 0,

    -- Days counts
    days_away_from_work INTEGER DEFAULT 0,
    days_restricted_duty INTEGER DEFAULT 0,
    days_job_transfer INTEGER DEFAULT 0,

    -- Calculated rates (per 200,000 hours)
    trir NUMERIC(5,2),                   -- Total Recordable Incident Rate
    dart NUMERIC(5,2),                   -- Days Away, Restricted, Transfer Rate
    ltir NUMERIC(5,2),                   -- Lost Time Incident Rate
    severity_rate NUMERIC(8,2),          -- Days lost per recordable

    -- Leading indicators (proactive)
    safety_observations_positive INTEGER DEFAULT 0,
    safety_observations_atrisk INTEGER DEFAULT 0,
    hazards_identified INTEGER DEFAULT 0,
    hazards_corrected INTEGER DEFAULT 0,
    toolbox_talks_conducted INTEGER DEFAULT 0,
    toolbox_talk_attendance_pct NUMERIC(5,2),
    jsas_created INTEGER DEFAULT 0,
    jsas_reviewed INTEGER DEFAULT 0,
    site_inspections_conducted INTEGER DEFAULT 0,
    training_hours_completed NUMERIC(10,2) DEFAULT 0,
    near_miss_ratio NUMERIC(5,2),        -- Near misses per recordable

    -- EMR (Experience Modification Rate)
    emr NUMERIC(4,3),                    -- Typically 0.5 to 2.0
    emr_effective_date DATE,
    emr_expiration_date DATE,

    -- Workers comp
    workers_comp_claims INTEGER DEFAULT 0,
    workers_comp_costs NUMERIC(12,2) DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(organization_id, metric_year, metric_quarter)
);

-- ============================================================================
-- PART 8: TRIGGERS
-- ============================================================================

CREATE TRIGGER toolbox_templates_updated_at
    BEFORE UPDATE ON public.toolbox_talk_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER jsa_updated_at
    BEFORE UPDATE ON public.job_safety_analysis
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER osha_300_updated_at
    BEFORE UPDATE ON public.osha_300_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER osha_301_updated_at
    BEFORE UPDATE ON public.osha_301_forms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER violations_updated_at
    BEFORE UPDATE ON public.safety_violations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER metrics_updated_at
    BEFORE UPDATE ON public.safety_metrics
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-generate JSA number
CREATE OR REPLACE FUNCTION public.generate_jsa_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.jsa_number IS NULL THEN
        NEW.jsa_number := 'JSA-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
            LPAD((
                SELECT COALESCE(MAX(
                    NULLIF(REGEXP_REPLACE(jsa_number, '[^0-9]', '', 'g'), '')::INTEGER
                ), 0) + 1
                FROM public.job_safety_analysis
                WHERE organization_id = NEW.organization_id
            )::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER jsa_number_trigger
    BEFORE INSERT ON public.job_safety_analysis
    FOR EACH ROW EXECUTE FUNCTION public.generate_jsa_number();

-- Calculate safety rates
CREATE OR REPLACE FUNCTION public.calculate_safety_rates()
RETURNS TRIGGER AS $$
BEGIN
    -- TRIR = (Recordable Injuries × 200,000) / Hours Worked
    IF NEW.total_hours_worked > 0 THEN
        NEW.trir := (NEW.recordable_injuries::NUMERIC * 200000) / NEW.total_hours_worked;

        -- DART = ((Days Away + Days Restricted + Days Transfer) × 200,000) / Hours Worked
        NEW.dart := ((NEW.days_away_from_work + NEW.days_restricted_duty + NEW.days_job_transfer)::NUMERIC * 200000) / NEW.total_hours_worked;

        -- LTIR = (Lost Time Injuries × 200,000) / Hours Worked
        -- Lost time = injuries with days away
        NEW.ltir := CASE WHEN NEW.days_away_from_work > 0 THEN
            (NEW.recordable_injuries::NUMERIC * 200000) / NEW.total_hours_worked
        ELSE 0 END;

        -- Severity Rate = Days Lost / Recordable Injuries
        NEW.severity_rate := CASE WHEN NEW.recordable_injuries > 0 THEN
            NEW.days_away_from_work::NUMERIC / NEW.recordable_injuries
        ELSE 0 END;

        -- Near Miss Ratio = Near Misses / Recordable Injuries
        NEW.near_miss_ratio := CASE WHEN NEW.recordable_injuries > 0 THEN
            NEW.near_misses_reported::NUMERIC / NEW.recordable_injuries
        ELSE NEW.near_misses_reported END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_safety_rates_trigger
    BEFORE INSERT OR UPDATE ON public.safety_metrics
    FOR EACH ROW EXECUTE FUNCTION public.calculate_safety_rates();

-- ============================================================================
-- PART 9: INDEXES
-- ============================================================================

-- Toolbox talk templates
CREATE INDEX idx_talk_templates_org ON public.toolbox_talk_templates(organization_id);
CREATE INDEX idx_talk_templates_category ON public.toolbox_talk_templates(category);
CREATE INDEX idx_talk_templates_active ON public.toolbox_talk_templates(is_active) WHERE is_active = true;

-- JSA
CREATE INDEX idx_jsa_org ON public.job_safety_analysis(organization_id);
CREATE INDEX idx_jsa_project ON public.job_safety_analysis(project_id);
CREATE INDEX idx_jsa_status ON public.job_safety_analysis(status);
CREATE INDEX idx_jsa_work_type ON public.job_safety_analysis(work_type);
CREATE INDEX idx_jsa_hazard_controls_jsa ON public.jsa_hazard_controls(jsa_id);
CREATE INDEX idx_jsa_ppe_jsa ON public.jsa_ppe_requirements(jsa_id);

-- OSHA 300
CREATE INDEX idx_osha300_org ON public.osha_300_logs(organization_id);
CREATE INDEX idx_osha300_year ON public.osha_300_logs(log_year);
CREATE INDEX idx_osha300_incident ON public.osha_300_logs(incident_id);
CREATE INDEX idx_osha300_date ON public.osha_300_logs(date_of_injury);

-- OSHA 301
CREATE INDEX idx_osha301_org ON public.osha_301_forms(organization_id);
CREATE INDEX idx_osha301_year ON public.osha_301_forms(log_year);
CREATE INDEX idx_osha301_log ON public.osha_301_forms(osha_300_log_id);

-- Violations
CREATE INDEX idx_violations_org ON public.safety_violations(organization_id);
CREATE INDEX idx_violations_project ON public.safety_violations(project_id);
CREATE INDEX idx_violations_status ON public.safety_violations(status);
CREATE INDEX idx_violations_severity ON public.safety_violations(severity);
CREATE INDEX idx_violations_abatement ON public.safety_violations(abatement_due_date) WHERE abatement_completed_date IS NULL;
CREATE INDEX idx_violation_actions_violation ON public.safety_violation_corrective_actions(violation_id);

-- Metrics
CREATE INDEX idx_metrics_org ON public.safety_metrics(organization_id);
CREATE INDEX idx_metrics_year ON public.safety_metrics(metric_year);
CREATE INDEX idx_metrics_period ON public.safety_metrics(metric_year, metric_quarter);

-- ============================================================================
-- PART 10: RLS POLICIES
-- ============================================================================

ALTER TABLE public.toolbox_talk_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_safety_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jsa_hazard_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jsa_ppe_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osha_300_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osha_301_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_violation_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_metrics ENABLE ROW LEVEL SECURITY;

-- Toolbox talk templates
CREATE POLICY "talk_templates_org_access" ON public.toolbox_talk_templates
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- JSA
CREATE POLICY "jsa_org_access" ON public.job_safety_analysis
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "jsa_controls_access" ON public.jsa_hazard_controls
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.job_safety_analysis j
            WHERE j.id = jsa_id
            AND j.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "jsa_ppe_access" ON public.jsa_ppe_requirements
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.job_safety_analysis j
            WHERE j.id = jsa_id
            AND j.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- OSHA logs
CREATE POLICY "osha300_org_access" ON public.osha_300_logs
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "osha301_org_access" ON public.osha_301_forms
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Violations
CREATE POLICY "violations_org_access" ON public.safety_violations
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "violation_actions_access" ON public.safety_violation_corrective_actions
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.safety_violations v
            WHERE v.id = violation_id
            AND v.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Metrics
CREATE POLICY "metrics_org_access" ON public.safety_metrics
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 11: VIEWS
-- ============================================================================

-- OSHA 300 Log View (formatted for printing)
CREATE VIEW public.v_osha_300_log AS
SELECT
    o.organization_id,
    o.establishment_name,
    o.log_year,
    o.case_number,
    o.employee_name,
    o.job_title,
    o.date_of_injury,
    o.where_occurred,
    o.describe_injury,
    -- Classify case (one column with description)
    CASE
        WHEN o.is_death THEN 'Death'
        WHEN o.is_days_away THEN 'Days Away'
        WHEN o.is_job_transfer_restriction THEN 'Job Transfer/Restriction'
        WHEN o.is_other_recordable THEN 'Other Recordable'
        ELSE 'Unknown'
    END as case_classification,
    o.days_away_count,
    o.days_job_transfer_count,
    -- Injury type
    CASE
        WHEN o.type_injury THEN 'Injury'
        WHEN o.type_skin_disorder THEN 'Skin Disorder'
        WHEN o.type_respiratory THEN 'Respiratory'
        WHEN o.type_poisoning THEN 'Poisoning'
        WHEN o.type_hearing_loss THEN 'Hearing Loss'
        WHEN o.type_all_other THEN 'All Other'
        ELSE 'Unknown'
    END as injury_type,
    o.is_privacy_case
FROM public.osha_300_logs o
ORDER BY o.log_year DESC, o.case_number;

-- Safety metrics dashboard
CREATE VIEW public.v_safety_metrics_dashboard AS
SELECT
    m.organization_id,
    m.metric_year,
    m.metric_quarter,
    m.total_hours_worked,

    -- Lagging indicators
    m.recordable_injuries,
    m.near_misses_reported,
    m.trir,
    m.dart,
    m.severity_rate,

    -- Leading indicators
    m.safety_observations_positive + m.safety_observations_atrisk as total_observations,
    CASE WHEN m.safety_observations_positive + m.safety_observations_atrisk > 0
        THEN (m.safety_observations_positive::NUMERIC /
              (m.safety_observations_positive + m.safety_observations_atrisk) * 100)
        ELSE 0
    END as positive_observation_pct,
    m.hazards_identified,
    m.hazards_corrected,
    CASE WHEN m.hazards_identified > 0
        THEN (m.hazards_corrected::NUMERIC / m.hazards_identified * 100)
        ELSE 0
    END as hazard_correction_rate,
    m.toolbox_talks_conducted,
    m.toolbox_talk_attendance_pct,
    m.near_miss_ratio,

    -- EMR
    m.emr,
    m.emr_effective_date,

    -- Trend indicators (compare to previous quarter)
    LAG(m.trir) OVER (PARTITION BY m.organization_id ORDER BY m.metric_year, m.metric_quarter) as prev_trir,
    LAG(m.dart) OVER (PARTITION BY m.organization_id ORDER BY m.metric_year, m.metric_quarter) as prev_dart

FROM public.safety_metrics m
ORDER BY m.metric_year DESC, m.metric_quarter DESC;

-- JSA summary view
CREATE VIEW public.v_jsa_summary AS
SELECT
    j.id,
    j.organization_id,
    j.project_id,
    p.name as project_name,
    j.jsa_number,
    j.revision_number,
    j.job_title,
    j.work_type,
    j.status,
    j.effective_date,
    j.expiration_date,
    j.times_used,
    j.last_used_at,

    -- Counts
    (SELECT COUNT(*) FROM public.jsa_hazard_controls h WHERE h.jsa_id = j.id) as hazard_count,
    (SELECT COUNT(*) FROM public.jsa_ppe_requirements r WHERE r.jsa_id = j.id) as ppe_count,

    -- High risk hazards
    (SELECT COUNT(*) FROM public.jsa_hazard_controls h
     WHERE h.jsa_id = j.id AND h.risk_level IN ('HIGH', 'CRITICAL')) as high_risk_hazards,

    -- Prepared/approved info
    u_prepared.email as prepared_by_email,
    j.prepared_at,
    u_approved.email as approved_by_email,
    j.approved_at

FROM public.job_safety_analysis j
LEFT JOIN public.projects p ON p.id = j.project_id
LEFT JOIN auth.users u_prepared ON u_prepared.id = j.prepared_by
LEFT JOIN auth.users u_approved ON u_approved.id = j.approved_by;

-- ============================================================================
-- PART 12: HELPER FUNCTIONS
-- ============================================================================

-- Generate OSHA 300A Summary
CREATE OR REPLACE FUNCTION public.generate_osha_300a_summary(
    p_organization_id UUID,
    p_year INTEGER
)
RETURNS TABLE (
    total_deaths INTEGER,
    total_days_away_cases INTEGER,
    total_job_transfer_cases INTEGER,
    total_other_recordable_cases INTEGER,
    total_days_away INTEGER,
    total_days_job_transfer INTEGER,
    total_injuries INTEGER,
    total_skin_disorders INTEGER,
    total_respiratory INTEGER,
    total_poisoning INTEGER,
    total_hearing_loss INTEGER,
    total_all_other INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE is_death)::INTEGER as total_deaths,
        COUNT(*) FILTER (WHERE is_days_away)::INTEGER as total_days_away_cases,
        COUNT(*) FILTER (WHERE is_job_transfer_restriction)::INTEGER as total_job_transfer_cases,
        COUNT(*) FILTER (WHERE is_other_recordable)::INTEGER as total_other_recordable_cases,
        COALESCE(SUM(days_away_count), 0)::INTEGER as total_days_away,
        COALESCE(SUM(days_job_transfer_count), 0)::INTEGER as total_days_job_transfer,
        COUNT(*) FILTER (WHERE type_injury)::INTEGER as total_injuries,
        COUNT(*) FILTER (WHERE type_skin_disorder)::INTEGER as total_skin_disorders,
        COUNT(*) FILTER (WHERE type_respiratory)::INTEGER as total_respiratory,
        COUNT(*) FILTER (WHERE type_poisoning)::INTEGER as total_poisoning,
        COUNT(*) FILTER (WHERE type_hearing_loss)::INTEGER as total_hearing_loss,
        COUNT(*) FILTER (WHERE type_all_other)::INTEGER as total_all_other
    FROM public.osha_300_logs
    WHERE organization_id = p_organization_id
    AND log_year = p_year;
END;
$$;

-- Get applicable JSAs for a work type
CREATE OR REPLACE FUNCTION public.get_applicable_jsas(
    p_project_id UUID,
    p_work_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    jsa_id UUID,
    jsa_number TEXT,
    job_title TEXT,
    work_type TEXT,
    status public.jsa_status,
    hazard_count INTEGER,
    high_risk_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        j.id as jsa_id,
        j.jsa_number,
        j.job_title,
        j.work_type,
        j.status,
        (SELECT COUNT(*)::INTEGER FROM public.jsa_hazard_controls h WHERE h.jsa_id = j.id) as hazard_count,
        (SELECT COUNT(*)::INTEGER FROM public.jsa_hazard_controls h
         WHERE h.jsa_id = j.id AND h.risk_level IN ('HIGH', 'CRITICAL')) as high_risk_count
    FROM public.job_safety_analysis j
    WHERE j.project_id = p_project_id
    AND j.status = 'APPROVED'
    AND (j.expiration_date IS NULL OR j.expiration_date > CURRENT_DATE)
    AND (p_work_type IS NULL OR j.work_type = p_work_type)
    ORDER BY j.times_used DESC, j.jsa_number;
END;
$$;

-- ============================================================================
-- PART 13: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.toolbox_talk_templates IS 'Reusable templates for daily safety meetings';
COMMENT ON TABLE public.job_safety_analysis IS 'Job Safety Analysis (JSA/JHA) documents per OSHA requirements';
COMMENT ON TABLE public.jsa_hazard_controls IS 'Detailed hazard controls using hierarchy of controls';
COMMENT ON TABLE public.osha_300_logs IS 'OSHA Form 300 - Log of Work-Related Injuries and Illnesses';
COMMENT ON TABLE public.osha_301_forms IS 'OSHA Form 301 - Injury and Illness Incident Report';
COMMENT ON TABLE public.safety_violations IS 'OSHA citations and safety violations tracking';
COMMENT ON TABLE public.safety_metrics IS 'Safety performance metrics including EMR and leading indicators';

COMMENT ON COLUMN public.safety_metrics.trir IS 'Total Recordable Incident Rate = (Recordables × 200,000) / Hours';
COMMENT ON COLUMN public.safety_metrics.dart IS 'Days Away Restricted Transfer Rate';
COMMENT ON COLUMN public.safety_metrics.emr IS 'Experience Modification Rate - affects workers comp premiums';
COMMENT ON COLUMN public.safety_metrics.near_miss_ratio IS 'Near misses per recordable - higher is better (indicates reporting culture)';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 079: Advanced Safety Management completed successfully' as status;
