-- =============================================================================
-- Migration 081: Quality Control Advanced
-- =============================================================================
-- Extends 054_quality_control.sql with:
-- - Lab management and accreditations
-- - Specimen tracking (cylinders, cores)
-- - ITP templates
-- - Quality metrics and trending
-- - Corrective Action Requests (CARs)
-- - Quality audits
-- - Defect tracking
-- =============================================================================

-- ============================================================================
-- PART 0: CLEANUP
-- ============================================================================

DROP VIEW IF EXISTS public.v_quality_metrics_dashboard CASCADE;
DROP VIEW IF EXISTS public.v_test_trending CASCADE;
DROP VIEW IF EXISTS public.v_specimen_status CASCADE;

DROP TABLE IF EXISTS public.quality_metrics CASCADE;
DROP TABLE IF EXISTS public.corrective_action_requests CASCADE;
DROP TABLE IF EXISTS public.quality_audits CASCADE;
DROP TABLE IF EXISTS public.audit_findings CASCADE;
DROP TABLE IF EXISTS public.specimen_tracking CASCADE;
DROP TABLE IF EXISTS public.labs CASCADE;
DROP TABLE IF EXISTS public.itp_templates CASCADE;
DROP TABLE IF EXISTS public.itp_template_items CASCADE;
DROP TABLE IF EXISTS public.defect_categories CASCADE;

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.lab_type AS ENUM (
        'INTERNAL',          -- Company lab
        'THIRD_PARTY',       -- Independent testing lab
        'WVDOH',             -- WVDOH lab
        'PRODUCER',          -- Supplier/producer lab
        'FIELD'              -- Field testing
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.specimen_type AS ENUM (
        'CONCRETE_CYLINDER',
        'CONCRETE_BEAM',
        'CONCRETE_CORE',
        'ASPHALT_CORE',
        'SOIL_SAMPLE',
        'AGGREGATE_SAMPLE',
        'STEEL_COUPON',
        'WELD_COUPON',
        'COATING_SAMPLE',
        'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.specimen_status AS ENUM (
        'COLLECTED',
        'IN_TRANSIT',
        'AT_LAB',
        'CURING',
        'TESTING',
        'TESTED',
        'DISPOSED',
        'LOST'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.car_status AS ENUM (
        'DRAFT',
        'OPEN',
        'INVESTIGATION',
        'ACTION_PLANNED',
        'IN_PROGRESS',
        'VERIFICATION',
        'CLOSED',
        'VOID'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.audit_type AS ENUM (
        'INTERNAL',
        'EXTERNAL',
        'WVDOH',
        'OWNER',
        'CERTIFICATION',
        'SUPPLIER'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: LABS
-- ============================================================================

CREATE TABLE public.labs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Lab identification
    lab_name TEXT NOT NULL,
    lab_code TEXT,
    lab_type public.lab_type NOT NULL,

    -- Contact
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    phone TEXT,
    email TEXT,
    primary_contact TEXT,

    -- Accreditations
    aashto_accredited BOOLEAN DEFAULT false,
    aashto_number TEXT,
    aashto_expiration DATE,

    wvdoh_approved BOOLEAN DEFAULT false,
    wvdoh_approval_number TEXT,
    wvdoh_approval_expiration DATE,

    ccrl_accredited BOOLEAN DEFAULT false,
    ccrl_number TEXT,

    other_accreditations JSONB,         -- [{name, number, expiration}]

    -- Capabilities
    test_capabilities TEXT[],           -- Array of test type codes
    material_categories TEXT[],

    -- Performance
    avg_turnaround_days INTEGER,
    quality_rating NUMERIC(3,2),        -- 0-5 stars

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_labs_org ON public.labs(organization_id);
CREATE INDEX idx_labs_type ON public.labs(lab_type);
CREATE INDEX idx_labs_active ON public.labs(is_active) WHERE is_active = true;

-- ============================================================================
-- PART 3: SPECIMEN TRACKING
-- ============================================================================

CREATE TABLE public.specimen_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Specimen identification
    specimen_id TEXT NOT NULL,          -- Lab sample ID
    specimen_type public.specimen_type NOT NULL,
    set_number TEXT,                    -- For groups of specimens

    -- Collection
    collected_date DATE NOT NULL,
    collected_time TIME,
    collected_by TEXT,
    collection_location TEXT,
    station TEXT,

    -- Material reference
    material_ticket_id UUID REFERENCES public.material_tickets(id),
    batch_number TEXT,
    mix_design TEXT,

    -- For concrete
    cast_date DATE,
    cast_time TIME,
    slump NUMERIC(4,2),
    air_content NUMERIC(4,2),
    concrete_temp NUMERIC(5,1),
    cylinder_size TEXT,                 -- 4x8, 6x12

    -- Curing
    curing_method TEXT,                 -- Field, Lab, Accelerated
    curing_start_date DATE,
    curing_location TEXT,

    -- Lab assignment
    lab_id UUID REFERENCES public.labs(id),
    lab_received_date DATE,
    chain_of_custody_url TEXT,

    -- Testing schedule
    test_age_days INTEGER,              -- 3, 7, 28, etc.
    scheduled_test_date DATE,
    actual_test_date DATE,

    -- Results
    test_result_id UUID REFERENCES public.test_results(id),
    result_value NUMERIC(12,4),
    result_unit TEXT,
    meets_spec BOOLEAN,

    -- Status
    status public.specimen_status DEFAULT 'COLLECTED',

    -- Disposition
    disposed_date DATE,
    disposition_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX idx_specimen_id ON public.specimen_tracking(organization_id, specimen_id);
CREATE INDEX idx_specimen_org ON public.specimen_tracking(organization_id);
CREATE INDEX idx_specimen_project ON public.specimen_tracking(project_id);
CREATE INDEX idx_specimen_type ON public.specimen_tracking(specimen_type);
CREATE INDEX idx_specimen_status ON public.specimen_tracking(status);
CREATE INDEX idx_specimen_lab ON public.specimen_tracking(lab_id);
CREATE INDEX idx_specimen_test_date ON public.specimen_tracking(scheduled_test_date);
CREATE INDEX idx_specimen_ticket ON public.specimen_tracking(material_ticket_id);

-- ============================================================================
-- PART 4: ITP TEMPLATES
-- ============================================================================

CREATE TABLE public.itp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Template identification
    template_code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Scope
    work_type TEXT NOT NULL,            -- Bridge, Paving, Earthwork, etc.
    specification_section TEXT,

    -- Version
    version INTEGER DEFAULT 1,
    effective_date DATE,
    revision_date DATE,

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(organization_id, template_code)
);

CREATE TABLE public.itp_template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.itp_templates(id) ON DELETE CASCADE,

    -- Item details
    item_number INTEGER NOT NULL,
    activity TEXT NOT NULL,
    description TEXT,

    -- Hold point type
    hold_type TEXT DEFAULT 'MONITOR' CHECK (hold_type IN ('HOLD', 'WITNESS', 'MONITOR', 'REVIEW')),

    -- Requirements
    inspection_required BOOLEAN DEFAULT false,
    test_required BOOLEAN DEFAULT false,
    documentation_required BOOLEAN DEFAULT false,

    -- References
    test_type_ids UUID[],               -- Required tests
    checklist_ids UUID[],               -- Required checklists
    specification_reference TEXT,

    -- Notification
    advance_notice_days INTEGER DEFAULT 2,
    notify_wvdoh BOOLEAN DEFAULT false,
    notify_owner BOOLEAN DEFAULT false,

    -- Acceptance criteria
    acceptance_criteria TEXT,

    sort_order INTEGER,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_itp_templates_org ON public.itp_templates(organization_id);
CREATE INDEX idx_itp_templates_work ON public.itp_templates(work_type);
CREATE INDEX idx_itp_items_template ON public.itp_template_items(template_id);

-- ============================================================================
-- PART 5: DEFECT CATEGORIES
-- ============================================================================

CREATE TABLE public.defect_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Category
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Classification
    category_type TEXT,                 -- Workmanship, Material, Design, Process
    severity_default public.ncr_severity DEFAULT 'minor',

    -- Tracking
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(organization_id, code)
);

CREATE INDEX idx_defect_cat_org ON public.defect_categories(organization_id);

-- ============================================================================
-- PART 6: CORRECTIVE ACTION REQUESTS (CARs)
-- ============================================================================
-- Separate from NCRs - for systemic/process issues

CREATE TABLE public.corrective_action_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id),  -- Optional - can be org-wide

    -- CAR identification
    car_number TEXT NOT NULL,

    -- Source
    source_type TEXT CHECK (source_type IN ('ncr', 'audit', 'customer', 'internal', 'wvdoh', 'trend')),
    source_ncr_ids UUID[],              -- If from NCRs
    source_audit_id UUID,               -- If from audit

    -- Issue
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    issue_category TEXT,                -- Process, Training, Equipment, etc.

    -- Root cause analysis
    root_cause_method TEXT,             -- 5-Why, Fishbone, etc.
    root_cause_analysis TEXT,
    contributing_factors TEXT[],

    -- Corrective action
    corrective_action TEXT,
    corrective_action_owner UUID REFERENCES auth.users(id),
    corrective_action_due DATE,
    corrective_action_completed DATE,

    -- Preventive action
    preventive_action TEXT,
    preventive_action_owner UUID REFERENCES auth.users(id),
    preventive_action_due DATE,
    preventive_action_completed DATE,

    -- Verification
    verification_method TEXT,
    verification_criteria TEXT,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    verification_effective BOOLEAN,

    -- Status
    status public.car_status DEFAULT 'DRAFT',
    priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

    -- Closure
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id),
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),

    -- Documents
    documents TEXT[],

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(organization_id, car_number)
);

CREATE INDEX idx_car_org ON public.corrective_action_requests(organization_id);
CREATE INDEX idx_car_project ON public.corrective_action_requests(project_id);
CREATE INDEX idx_car_status ON public.corrective_action_requests(status);
CREATE INDEX idx_car_open ON public.corrective_action_requests(status)
    WHERE status NOT IN ('CLOSED', 'VOID');

-- ============================================================================
-- PART 7: QUALITY AUDITS
-- ============================================================================

CREATE TABLE public.quality_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id),  -- Optional

    -- Audit identification
    audit_number TEXT NOT NULL,
    audit_type public.audit_type NOT NULL,

    -- Scope
    title TEXT NOT NULL,
    scope_description TEXT,
    areas_audited TEXT[],               -- QC, Safety, Environmental, etc.

    -- Schedule
    scheduled_date DATE,
    actual_date DATE,
    duration_hours NUMERIC(4,1),

    -- Auditor(s)
    lead_auditor TEXT NOT NULL,
    auditor_company TEXT,               -- For external
    audit_team TEXT[],

    -- Auditee
    auditee_name TEXT,
    auditee_title TEXT,

    -- Results
    findings_count INTEGER DEFAULT 0,
    major_findings INTEGER DEFAULT 0,
    minor_findings INTEGER DEFAULT 0,
    observations INTEGER DEFAULT 0,

    overall_rating TEXT,                -- Satisfactory, Needs Improvement, Unsatisfactory
    strengths TEXT,
    weaknesses TEXT,

    -- Documents
    audit_plan_url TEXT,
    audit_report_url TEXT,
    checklist_url TEXT,

    -- Follow-up
    follow_up_required BOOLEAN DEFAULT false,
    follow_up_due_date DATE,
    follow_up_completed_date DATE,

    -- Status
    status TEXT DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'DRAFT_REPORT', 'FINAL', 'CLOSED')),

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(organization_id, audit_number)
);

CREATE TABLE public.audit_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id UUID NOT NULL REFERENCES public.quality_audits(id) ON DELETE CASCADE,

    -- Finding details
    finding_number INTEGER NOT NULL,
    finding_type TEXT CHECK (finding_type IN ('MAJOR', 'MINOR', 'OBSERVATION', 'OPPORTUNITY')),

    -- Description
    requirement_reference TEXT,         -- Spec/procedure reference
    finding_description TEXT NOT NULL,
    objective_evidence TEXT,

    -- Classification
    area TEXT,                          -- QC, Safety, Documentation, etc.
    defect_category_id UUID REFERENCES public.defect_categories(id),

    -- Response required
    response_required BOOLEAN DEFAULT true,
    response_due_date DATE,
    response_text TEXT,
    response_date DATE,

    -- CAR link
    car_id UUID REFERENCES public.corrective_action_requests(id),

    -- Closure
    closed_at TIMESTAMPTZ,
    closed_by UUID REFERENCES auth.users(id),
    closure_notes TEXT,

    -- Status
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESPONDED', 'VERIFIED', 'CLOSED')),

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audits_org ON public.quality_audits(organization_id);
CREATE INDEX idx_audits_project ON public.quality_audits(project_id);
CREATE INDEX idx_audits_type ON public.quality_audits(audit_type);
CREATE INDEX idx_audits_date ON public.quality_audits(actual_date);
CREATE INDEX idx_audit_findings_audit ON public.audit_findings(audit_id);
CREATE INDEX idx_audit_findings_status ON public.audit_findings(status);

-- ============================================================================
-- PART 8: QUALITY METRICS
-- ============================================================================

CREATE TABLE public.quality_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id),  -- NULL for org-wide

    -- Period
    metric_year INTEGER NOT NULL,
    metric_month INTEGER CHECK (metric_month BETWEEN 1 AND 12),
    metric_quarter INTEGER CHECK (metric_quarter BETWEEN 1 AND 4),

    -- Inspection metrics
    inspections_total INTEGER DEFAULT 0,
    inspections_passed INTEGER DEFAULT 0,
    inspections_failed INTEGER DEFAULT 0,
    inspection_pass_rate NUMERIC(5,2),

    -- Test metrics
    tests_total INTEGER DEFAULT 0,
    tests_passed INTEGER DEFAULT 0,
    tests_failed INTEGER DEFAULT 0,
    test_pass_rate NUMERIC(5,2),
    retest_count INTEGER DEFAULT 0,

    -- NCR metrics
    ncrs_opened INTEGER DEFAULT 0,
    ncrs_closed INTEGER DEFAULT 0,
    ncrs_overdue INTEGER DEFAULT 0,
    avg_ncr_closure_days NUMERIC(5,1),

    -- Punch list metrics
    punch_items_opened INTEGER DEFAULT 0,
    punch_items_closed INTEGER DEFAULT 0,
    avg_punch_closure_days NUMERIC(5,1),

    -- Cost of quality
    rework_cost NUMERIC(12,2) DEFAULT 0,
    ncr_cost NUMERIC(12,2) DEFAULT 0,
    testing_cost NUMERIC(12,2) DEFAULT 0,
    total_coq NUMERIC(12,2) DEFAULT 0,

    -- Defect metrics by category
    defects_by_category JSONB,          -- {workmanship: 5, material: 2}
    defects_by_trade JSONB,             -- {electrical: 3, civil: 8}

    -- First-time quality rate
    ftq_rate NUMERIC(5,2),              -- First-time quality %

    -- Computed at
    computed_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(organization_id, project_id, metric_year, metric_month)
);

CREATE INDEX idx_quality_metrics_org ON public.quality_metrics(organization_id);
CREATE INDEX idx_quality_metrics_project ON public.quality_metrics(project_id);
CREATE INDEX idx_quality_metrics_period ON public.quality_metrics(metric_year, metric_month);

-- ============================================================================
-- PART 9: TRIGGERS
-- ============================================================================

CREATE TRIGGER labs_updated_at
    BEFORE UPDATE ON public.labs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER specimen_updated_at
    BEFORE UPDATE ON public.specimen_tracking
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER itp_templates_updated_at
    BEFORE UPDATE ON public.itp_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER car_updated_at
    BEFORE UPDATE ON public.corrective_action_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER audits_updated_at
    BEFORE UPDATE ON public.quality_audits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Update audit finding counts
CREATE OR REPLACE FUNCTION public.update_audit_finding_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.quality_audits
    SET
        findings_count = (SELECT COUNT(*) FROM public.audit_findings WHERE audit_id = COALESCE(NEW.audit_id, OLD.audit_id)),
        major_findings = (SELECT COUNT(*) FROM public.audit_findings WHERE audit_id = COALESCE(NEW.audit_id, OLD.audit_id) AND finding_type = 'MAJOR'),
        minor_findings = (SELECT COUNT(*) FROM public.audit_findings WHERE audit_id = COALESCE(NEW.audit_id, OLD.audit_id) AND finding_type = 'MINOR'),
        observations = (SELECT COUNT(*) FROM public.audit_findings WHERE audit_id = COALESCE(NEW.audit_id, OLD.audit_id) AND finding_type = 'OBSERVATION')
    WHERE id = COALESCE(NEW.audit_id, OLD.audit_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_findings_update_counts
    AFTER INSERT OR UPDATE OR DELETE ON public.audit_findings
    FOR EACH ROW EXECUTE FUNCTION public.update_audit_finding_counts();

-- ============================================================================
-- PART 10: FUNCTIONS
-- ============================================================================

-- Calculate quality metrics for a period
CREATE OR REPLACE FUNCTION public.calculate_quality_metrics(
    p_org_id UUID,
    p_project_id UUID,
    p_year INTEGER,
    p_month INTEGER
)
RETURNS UUID AS $$
DECLARE
    v_metric_id UUID;
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    v_start_date := make_date(p_year, p_month, 1);
    v_end_date := (v_start_date + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    INSERT INTO public.quality_metrics (
        organization_id, project_id, metric_year, metric_month, metric_quarter,
        inspections_total, inspections_passed, inspections_failed, inspection_pass_rate,
        tests_total, tests_passed, tests_failed, test_pass_rate,
        ncrs_opened, ncrs_closed, computed_at
    )
    SELECT
        p_org_id,
        p_project_id,
        p_year,
        p_month,
        CEIL(p_month / 3.0)::INTEGER,
        -- Inspections
        COALESCE((SELECT COUNT(*) FROM public.inspections
            WHERE organization_id = p_org_id
            AND (p_project_id IS NULL OR project_id = p_project_id)
            AND actual_date BETWEEN v_start_date AND v_end_date), 0),
        COALESCE((SELECT COUNT(*) FROM public.inspections
            WHERE organization_id = p_org_id
            AND (p_project_id IS NULL OR project_id = p_project_id)
            AND actual_date BETWEEN v_start_date AND v_end_date
            AND status = 'passed'), 0),
        COALESCE((SELECT COUNT(*) FROM public.inspections
            WHERE organization_id = p_org_id
            AND (p_project_id IS NULL OR project_id = p_project_id)
            AND actual_date BETWEEN v_start_date AND v_end_date
            AND status = 'failed'), 0),
        NULL, -- calculated below
        -- Tests
        COALESCE((SELECT COUNT(*) FROM public.test_results
            WHERE organization_id = p_org_id
            AND (p_project_id IS NULL OR project_id = p_project_id)
            AND test_date BETWEEN v_start_date AND v_end_date), 0),
        COALESCE((SELECT COUNT(*) FROM public.test_results
            WHERE organization_id = p_org_id
            AND (p_project_id IS NULL OR project_id = p_project_id)
            AND test_date BETWEEN v_start_date AND v_end_date
            AND meets_specification = true), 0),
        COALESCE((SELECT COUNT(*) FROM public.test_results
            WHERE organization_id = p_org_id
            AND (p_project_id IS NULL OR project_id = p_project_id)
            AND test_date BETWEEN v_start_date AND v_end_date
            AND meets_specification = false), 0),
        NULL, -- calculated below
        -- NCRs
        COALESCE((SELECT COUNT(*) FROM public.non_conformances
            WHERE organization_id = p_org_id
            AND (p_project_id IS NULL OR project_id = p_project_id)
            AND discovered_date BETWEEN v_start_date AND v_end_date), 0),
        COALESCE((SELECT COUNT(*) FROM public.non_conformances
            WHERE organization_id = p_org_id
            AND (p_project_id IS NULL OR project_id = p_project_id)
            AND closed_at BETWEEN v_start_date AND v_end_date), 0),
        now()
    ON CONFLICT (organization_id, project_id, metric_year, metric_month)
    DO UPDATE SET
        inspections_total = EXCLUDED.inspections_total,
        inspections_passed = EXCLUDED.inspections_passed,
        inspections_failed = EXCLUDED.inspections_failed,
        tests_total = EXCLUDED.tests_total,
        tests_passed = EXCLUDED.tests_passed,
        tests_failed = EXCLUDED.tests_failed,
        ncrs_opened = EXCLUDED.ncrs_opened,
        ncrs_closed = EXCLUDED.ncrs_closed,
        computed_at = now()
    RETURNING id INTO v_metric_id;

    -- Calculate rates
    UPDATE public.quality_metrics
    SET
        inspection_pass_rate = CASE WHEN inspections_total > 0
            THEN (inspections_passed::NUMERIC / inspections_total) * 100
            ELSE NULL END,
        test_pass_rate = CASE WHEN tests_total > 0
            THEN (tests_passed::NUMERIC / tests_total) * 100
            ELSE NULL END
    WHERE id = v_metric_id;

    RETURN v_metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get specimens due for testing
CREATE OR REPLACE FUNCTION public.get_specimens_due_for_testing(
    p_project_id UUID,
    p_days_ahead INTEGER DEFAULT 7
)
RETURNS TABLE(
    specimen_id TEXT,
    specimen_type public.specimen_type,
    scheduled_test_date DATE,
    test_age_days INTEGER,
    lab_name TEXT,
    days_until_test INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        st.specimen_id,
        st.specimen_type,
        st.scheduled_test_date,
        st.test_age_days,
        l.lab_name,
        (st.scheduled_test_date - CURRENT_DATE)::INTEGER as days_until_test
    FROM public.specimen_tracking st
    LEFT JOIN public.labs l ON st.lab_id = l.id
    WHERE st.project_id = p_project_id
    AND st.status IN ('COLLECTED', 'IN_TRANSIT', 'AT_LAB', 'CURING')
    AND st.scheduled_test_date <= CURRENT_DATE + p_days_ahead
    ORDER BY st.scheduled_test_date ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get test trending data
CREATE OR REPLACE FUNCTION public.get_test_trending(
    p_project_id UUID,
    p_test_type_id UUID,
    p_months INTEGER DEFAULT 6
)
RETURNS TABLE(
    month_year TEXT,
    total_tests INTEGER,
    passed INTEGER,
    failed INTEGER,
    pass_rate NUMERIC,
    avg_result NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        TO_CHAR(tr.test_date, 'YYYY-MM') as month_year,
        COUNT(*)::INTEGER as total_tests,
        COUNT(*) FILTER (WHERE tr.meets_specification = true)::INTEGER as passed,
        COUNT(*) FILTER (WHERE tr.meets_specification = false)::INTEGER as failed,
        CASE WHEN COUNT(*) > 0
            THEN (COUNT(*) FILTER (WHERE tr.meets_specification = true)::NUMERIC / COUNT(*)) * 100
            ELSE 0 END as pass_rate,
        AVG(tr.result_value) as avg_result
    FROM public.test_results tr
    WHERE tr.project_id = p_project_id
    AND (p_test_type_id IS NULL OR tr.test_type_id = p_test_type_id)
    AND tr.test_date >= CURRENT_DATE - (p_months * INTERVAL '1 month')
    GROUP BY TO_CHAR(tr.test_date, 'YYYY-MM')
    ORDER BY month_year;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 11: VIEWS
-- ============================================================================

-- Quality metrics dashboard
CREATE VIEW public.v_quality_metrics_dashboard AS
SELECT
    qm.organization_id,
    qm.project_id,
    p.name as project_name,
    qm.metric_year,
    qm.metric_month,
    qm.metric_quarter,
    qm.inspections_total,
    qm.inspection_pass_rate,
    qm.tests_total,
    qm.test_pass_rate,
    qm.ncrs_opened,
    qm.ncrs_closed,
    qm.ncrs_opened - qm.ncrs_closed as ncr_net_change,
    qm.total_coq,
    qm.ftq_rate,
    qm.computed_at
FROM public.quality_metrics qm
LEFT JOIN public.projects p ON qm.project_id = p.id;

-- Specimen status view
CREATE VIEW public.v_specimen_status AS
SELECT
    st.id,
    st.project_id,
    p.name as project_name,
    st.specimen_id,
    st.specimen_type,
    st.set_number,
    st.collected_date,
    st.batch_number,
    st.mix_design,
    st.lab_id,
    l.lab_name,
    st.test_age_days,
    st.scheduled_test_date,
    st.status,
    st.result_value,
    st.meets_spec,
    CASE
        WHEN st.status = 'TESTED' THEN 'COMPLETE'
        WHEN st.scheduled_test_date < CURRENT_DATE AND st.status != 'TESTED' THEN 'OVERDUE'
        WHEN st.scheduled_test_date <= CURRENT_DATE + 3 THEN 'DUE_SOON'
        ELSE 'ON_TRACK'
    END as tracking_status,
    st.organization_id
FROM public.specimen_tracking st
JOIN public.projects p ON st.project_id = p.id
LEFT JOIN public.labs l ON st.lab_id = l.id;

-- Test trending view
CREATE VIEW public.v_test_trending AS
SELECT
    tr.project_id,
    p.name as project_name,
    tt.code as test_type_code,
    tt.name as test_type_name,
    tt.category as test_category,
    DATE_TRUNC('month', tr.test_date)::DATE as month,
    COUNT(*) as test_count,
    COUNT(*) FILTER (WHERE tr.meets_specification = true) as passed,
    COUNT(*) FILTER (WHERE tr.meets_specification = false) as failed,
    AVG(tr.result_value) as avg_result,
    MIN(tr.result_value) as min_result,
    MAX(tr.result_value) as max_result,
    tt.min_value as spec_min,
    tt.max_value as spec_max,
    tr.organization_id
FROM public.test_results tr
JOIN public.projects p ON tr.project_id = p.id
LEFT JOIN public.test_types tt ON tr.test_type_id = tt.id
WHERE tr.test_date IS NOT NULL
GROUP BY
    tr.project_id, p.name, tt.code, tt.name, tt.category,
    DATE_TRUNC('month', tr.test_date), tt.min_value, tt.max_value,
    tr.organization_id;

-- ============================================================================
-- PART 12: RLS POLICIES
-- ============================================================================

ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specimen_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itp_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defect_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corrective_action_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "labs_org_access" ON public.labs
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "specimen_org_access" ON public.specimen_tracking
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "itp_templates_org_access" ON public.itp_templates
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "itp_items_access" ON public.itp_template_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.itp_templates t
            WHERE t.id = template_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "defect_cat_org_access" ON public.defect_categories
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "car_org_access" ON public.corrective_action_requests
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "audits_org_access" ON public.quality_audits
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "audit_findings_access" ON public.audit_findings
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.quality_audits a
            WHERE a.id = audit_id
            AND a.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "quality_metrics_org_access" ON public.quality_metrics
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 13: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.labs IS 'Testing laboratories with accreditations';
COMMENT ON TABLE public.specimen_tracking IS 'Track test specimens from collection to results';
COMMENT ON TABLE public.itp_templates IS 'Inspection Test Plan templates';
COMMENT ON TABLE public.defect_categories IS 'Defect classification categories';
COMMENT ON TABLE public.corrective_action_requests IS 'CARs for systemic quality issues';
COMMENT ON TABLE public.quality_audits IS 'Internal and external quality audits';
COMMENT ON TABLE public.audit_findings IS 'Audit findings and observations';
COMMENT ON TABLE public.quality_metrics IS 'Aggregated quality metrics by period';

COMMENT ON FUNCTION public.calculate_quality_metrics IS 'Calculate quality metrics for a given period';
COMMENT ON FUNCTION public.get_specimens_due_for_testing IS 'Get specimens with upcoming test dates';
COMMENT ON FUNCTION public.get_test_trending IS 'Get test result trends over time';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 081: Quality Control Advanced completed successfully' as status;
