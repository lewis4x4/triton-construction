-- =============================================================================
-- Migration 055: Subcontractor Management (Enhanced)
-- Per CLAUDE.md Roadmap Phase 2: Migration 009
-- =============================================================================

-- Subcontract Agreement Status
DO $$ BEGIN
    CREATE TYPE public.subcontract_status AS ENUM (
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'EXECUTED',
        'IN_PROGRESS',
        'COMPLETE',
        'TERMINATED',
        'SUSPENDED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Invoice Status
DO $$ BEGIN
    CREATE TYPE public.invoice_status AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'PARTIALLY_PAID',
        'PAID',
        'DISPUTED',
        'REJECTED',
        'VOID'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Performance Rating
DO $$ BEGIN
    CREATE TYPE public.performance_rating AS ENUM (
        'EXCELLENT',
        'GOOD',
        'SATISFACTORY',
        'NEEDS_IMPROVEMENT',
        'POOR',
        'UNACCEPTABLE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Subcontract Agreements
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subcontract_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE RESTRICT,

    -- Agreement Details
    agreement_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    scope_of_work TEXT NOT NULL,

    -- Financial
    original_value DECIMAL(15, 2) NOT NULL,
    current_value DECIMAL(15, 2) NOT NULL,
    retention_percentage DECIMAL(5, 2) DEFAULT 5.00,

    -- Schedule
    start_date DATE NOT NULL,
    completion_date DATE NOT NULL,
    actual_start_date DATE,
    actual_completion_date DATE,

    -- Status
    status subcontract_status NOT NULL DEFAULT 'DRAFT',

    -- Compliance
    is_dbe_contract BOOLEAN DEFAULT FALSE,
    dbe_credit_amount DECIMAL(15, 2),
    davis_bacon_required BOOLEAN DEFAULT FALSE,
    requires_certified_payroll BOOLEAN DEFAULT FALSE,

    -- Insurance Requirements
    required_gl_limit DECIMAL(15, 2) DEFAULT 1000000,
    required_auto_limit DECIMAL(15, 2) DEFAULT 1000000,
    required_workers_comp BOOLEAN DEFAULT TRUE,

    -- Bonds
    payment_bond_required BOOLEAN DEFAULT FALSE,
    payment_bond_amount DECIMAL(15, 2),
    performance_bond_required BOOLEAN DEFAULT FALSE,
    performance_bond_amount DECIMAL(15, 2),

    -- Documents
    signed_agreement_url TEXT,

    -- Approval
    approved_by UUID REFERENCES public.user_profiles(id),
    approved_at TIMESTAMPTZ,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_agreement_number UNIQUE (organization_id, agreement_number)
);

-- =============================================================================
-- Subcontract Change Orders
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subcontract_change_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subcontract_id UUID NOT NULL REFERENCES public.subcontract_agreements(id) ON DELETE CASCADE,

    -- Change Order Details
    change_order_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    reason TEXT NOT NULL,

    -- Financial Impact
    amount DECIMAL(15, 2) NOT NULL,
    time_extension_days INTEGER DEFAULT 0,

    -- Status
    status TEXT NOT NULL DEFAULT 'PENDING',

    -- Approval Chain
    submitted_by UUID REFERENCES public.user_profiles(id),
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.user_profiles(id),
    approved_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_sub_co_number UNIQUE (subcontract_id, change_order_number)
);

-- =============================================================================
-- Subcontractor Invoices (Pay Applications)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subcontractor_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subcontract_id UUID NOT NULL REFERENCES public.subcontract_agreements(id) ON DELETE CASCADE,

    -- Invoice Details
    invoice_number TEXT NOT NULL,
    pay_application_number INTEGER NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amounts
    scheduled_value DECIMAL(15, 2) NOT NULL,
    work_completed_previous DECIMAL(15, 2) DEFAULT 0,
    work_completed_this_period DECIMAL(15, 2) NOT NULL,
    materials_stored DECIMAL(15, 2) DEFAULT 0,
    total_completed_and_stored DECIMAL(15, 2) NOT NULL,
    retention_amount DECIMAL(15, 2) NOT NULL,
    total_earned_less_retention DECIMAL(15, 2) NOT NULL,
    less_previous_payments DECIMAL(15, 2) DEFAULT 0,
    current_payment_due DECIMAL(15, 2) NOT NULL,

    -- Status
    status invoice_status NOT NULL DEFAULT 'DRAFT',

    -- Lien Waivers
    conditional_waiver_received BOOLEAN DEFAULT FALSE,
    unconditional_waiver_received BOOLEAN DEFAULT FALSE,

    -- Certified Payroll (if required)
    certified_payroll_attached BOOLEAN DEFAULT FALSE,
    certified_payroll_verified BOOLEAN DEFAULT FALSE,

    -- Processing
    submitted_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.user_profiles(id),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    check_number TEXT,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_sub_invoice UNIQUE (subcontract_id, invoice_number)
);

-- =============================================================================
-- Invoice Line Items (Schedule of Values breakdown)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subcontractor_invoice_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.subcontractor_invoices(id) ON DELETE CASCADE,

    -- Line Item Details
    item_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    cost_code TEXT,

    -- Amounts
    scheduled_value DECIMAL(15, 2) NOT NULL,
    previous_applications DECIMAL(15, 2) DEFAULT 0,
    this_period DECIMAL(15, 2) NOT NULL,
    materials_stored DECIMAL(15, 2) DEFAULT 0,
    total_completed DECIMAL(15, 2) NOT NULL,
    percent_complete DECIMAL(5, 2) NOT NULL,
    balance_to_finish DECIMAL(15, 2) NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_invoice_line UNIQUE (invoice_id, item_number)
);

-- =============================================================================
-- Subcontractor Daily Logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subcontractor_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    subcontract_id UUID NOT NULL REFERENCES public.subcontract_agreements(id) ON DELETE CASCADE,
    daily_report_id UUID REFERENCES public.daily_reports(id),

    -- Log Details
    log_date DATE NOT NULL,

    -- Manpower
    workers_on_site INTEGER NOT NULL DEFAULT 0,
    workers_by_trade JSONB DEFAULT '{}',

    -- Work Performed
    work_description TEXT,
    location TEXT,

    -- Equipment
    equipment_on_site JSONB DEFAULT '[]',

    -- Notes
    notes TEXT,
    issues TEXT,

    -- Verification
    verified_by UUID REFERENCES public.user_profiles(id),
    verified_at TIMESTAMPTZ,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_sub_daily_log UNIQUE (subcontract_id, log_date)
);

-- =============================================================================
-- Subcontractor Performance Evaluations
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subcontractor_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE RESTRICT,
    subcontract_id UUID REFERENCES public.subcontract_agreements(id),
    project_id UUID REFERENCES public.projects(id),

    -- Evaluation Period
    evaluation_date DATE NOT NULL,
    evaluation_type TEXT NOT NULL, -- 'MONTHLY', 'PROJECT_COMPLETION', 'ANNUAL'

    -- Ratings (1-5 scale internally, maps to enum)
    quality_rating performance_rating NOT NULL,
    schedule_rating performance_rating NOT NULL,
    safety_rating performance_rating NOT NULL,
    communication_rating performance_rating NOT NULL,
    documentation_rating performance_rating NOT NULL,
    overall_rating performance_rating NOT NULL,

    -- Comments
    quality_comments TEXT,
    schedule_comments TEXT,
    safety_comments TEXT,
    communication_comments TEXT,
    documentation_comments TEXT,
    overall_comments TEXT,

    -- Would hire again?
    would_hire_again BOOLEAN,
    recommendation_notes TEXT,

    -- Evaluator
    evaluated_by UUID NOT NULL REFERENCES public.user_profiles(id),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- DBE Utilization Tracking (Enhanced)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.dbe_utilization_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE RESTRICT,
    subcontract_id UUID REFERENCES public.subcontract_agreements(id),

    -- Reporting Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Amounts
    committed_amount DECIMAL(15, 2) NOT NULL,
    paid_to_date DECIMAL(15, 2) DEFAULT 0,
    current_period_amount DECIMAL(15, 2) DEFAULT 0,

    -- DBE Type
    dbe_type TEXT NOT NULL, -- 'MBE', 'WBE', 'DBE', 'SDVOB', etc.
    naics_codes TEXT[],

    -- Verification
    certification_verified BOOLEAN DEFAULT FALSE,
    certification_expiry DATE,

    -- Notes
    notes TEXT,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Subcontractor Compliance Checklist
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.subcontractor_compliance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    subcontract_id UUID NOT NULL REFERENCES public.subcontract_agreements(id) ON DELETE CASCADE,

    -- Pre-Work Requirements
    contract_signed BOOLEAN DEFAULT FALSE,
    insurance_verified BOOLEAN DEFAULT FALSE,
    bonds_verified BOOLEAN DEFAULT FALSE,
    safety_orientation_complete BOOLEAN DEFAULT FALSE,
    drug_testing_compliant BOOLEAN DEFAULT FALSE,

    -- Ongoing Requirements
    weekly_certified_payroll BOOLEAN DEFAULT FALSE,
    monthly_dbe_reports BOOLEAN DEFAULT FALSE,
    safety_meetings_attended BOOLEAN DEFAULT FALSE,

    -- Documents Received
    w9_received BOOLEAN DEFAULT FALSE,
    certificate_of_insurance_url TEXT,
    payment_bond_url TEXT,
    performance_bond_url TEXT,

    -- Verification Dates
    last_insurance_check DATE,
    last_safety_check DATE,
    last_payroll_check DATE,

    -- Notes
    compliance_notes TEXT,
    issues TEXT,

    -- Audit
    updated_by UUID REFERENCES public.user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_subcontract_agreements_project ON public.subcontract_agreements(project_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_agreements_subcontractor ON public.subcontract_agreements(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_subcontract_agreements_status ON public.subcontract_agreements(status);
CREATE INDEX IF NOT EXISTS idx_subcontractor_invoices_subcontract ON public.subcontractor_invoices(subcontract_id);
CREATE INDEX IF NOT EXISTS idx_subcontractor_invoices_status ON public.subcontractor_invoices(status);
CREATE INDEX IF NOT EXISTS idx_subcontractor_daily_logs_date ON public.subcontractor_daily_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_subcontractor_evaluations_subcontractor ON public.subcontractor_evaluations(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_dbe_utilization_project ON public.dbe_utilization_records(project_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.subcontract_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontract_change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dbe_utilization_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_compliance ENABLE ROW LEVEL SECURITY;

-- Default deny policies
CREATE POLICY "subcontract_agreements_org_access" ON public.subcontract_agreements
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "subcontract_change_orders_org_access" ON public.subcontract_change_orders
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "subcontractor_invoices_org_access" ON public.subcontractor_invoices
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "subcontractor_invoice_lines_access" ON public.subcontractor_invoice_lines
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.subcontractor_invoices i
            WHERE i.id = invoice_id
            AND i.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "subcontractor_daily_logs_org_access" ON public.subcontractor_daily_logs
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "subcontractor_evaluations_org_access" ON public.subcontractor_evaluations
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "dbe_utilization_records_org_access" ON public.dbe_utilization_records
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "subcontractor_compliance_org_access" ON public.subcontractor_compliance
    FOR ALL USING (organization_id = public.get_user_organization_id());

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Generate next agreement number
CREATE OR REPLACE FUNCTION public.generate_subcontract_number(p_org_id UUID, p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_project_number TEXT;
    v_seq INTEGER;
BEGIN
    SELECT project_number INTO v_project_number
    FROM public.projects WHERE id = p_project_id;

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(agreement_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1 INTO v_seq
    FROM public.subcontract_agreements
    WHERE project_id = p_project_id;

    RETURN v_project_number || '-SUB-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

-- Calculate subcontract completion percentage
CREATE OR REPLACE FUNCTION public.get_subcontract_completion(p_subcontract_id UUID)
RETURNS DECIMAL(5, 2)
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_paid DECIMAL(15, 2);
    v_contract_value DECIMAL(15, 2);
BEGIN
    SELECT current_value INTO v_contract_value
    FROM public.subcontract_agreements WHERE id = p_subcontract_id;

    SELECT COALESCE(SUM(current_payment_due), 0) INTO v_total_paid
    FROM public.subcontractor_invoices
    WHERE subcontract_id = p_subcontract_id AND status = 'PAID';

    IF v_contract_value = 0 THEN RETURN 0; END IF;

    RETURN ROUND((v_total_paid / v_contract_value) * 100, 2);
END;
$$;

-- =============================================================================
-- Views
-- =============================================================================

-- Active subcontracts with status
CREATE OR REPLACE VIEW public.v_active_subcontracts AS
SELECT
    sa.id,
    sa.agreement_number,
    sa.title,
    s.company_name AS subcontractor_name,
    s.is_dbe_certified,
    p.name AS project_name,
    p.project_number,
    sa.current_value,
    sa.status,
    sa.start_date,
    sa.completion_date,
    public.get_subcontract_completion(sa.id) AS percent_complete,
    (
        SELECT COUNT(*) FROM public.subcontractor_invoices
        WHERE subcontract_id = sa.id AND status = 'SUBMITTED'
    ) AS pending_invoices
FROM public.subcontract_agreements sa
JOIN public.subcontractors s ON sa.subcontractor_id = s.id
JOIN public.projects p ON sa.project_id = p.id
WHERE sa.status IN ('EXECUTED', 'IN_PROGRESS');

-- DBE Summary by Project
CREATE OR REPLACE VIEW public.v_project_dbe_summary AS
SELECT
    p.id AS project_id,
    p.project_number,
    p.name AS project_name,
    p.dbe_goal_percentage,
    p.current_contract_value,
    p.current_contract_value * (p.dbe_goal_percentage / 100) AS dbe_goal_amount,
    COALESCE(SUM(CASE WHEN s.is_dbe_certified THEN sa.current_value ELSE 0 END), 0) AS dbe_committed,
    COALESCE(SUM(CASE WHEN s.is_dbe_certified THEN
        (SELECT COALESCE(SUM(current_payment_due), 0)
         FROM public.subcontractor_invoices
         WHERE subcontract_id = sa.id AND status = 'PAID')
    ELSE 0 END), 0) AS dbe_paid,
    CASE WHEN p.current_contract_value > 0 THEN
        ROUND(
            (COALESCE(SUM(CASE WHEN s.is_dbe_certified THEN sa.current_value ELSE 0 END), 0)
             / p.current_contract_value) * 100, 2
        )
    ELSE 0 END AS dbe_committed_percentage
FROM public.projects p
LEFT JOIN public.subcontract_agreements sa ON p.id = sa.project_id
LEFT JOIN public.subcontractors s ON sa.subcontractor_id = s.id
WHERE p.status = 'ACTIVE'
GROUP BY p.id, p.project_number, p.name, p.dbe_goal_percentage, p.current_contract_value;

-- Pending Subcontractor Payments
CREATE OR REPLACE VIEW public.v_pending_sub_payments AS
SELECT
    si.id AS invoice_id,
    si.invoice_number,
    si.pay_application_number,
    sa.agreement_number,
    s.company_name AS subcontractor_name,
    p.name AS project_name,
    si.current_payment_due,
    si.status,
    si.submitted_at,
    CURRENT_DATE - si.submitted_at::DATE AS days_pending
FROM public.subcontractor_invoices si
JOIN public.subcontract_agreements sa ON si.subcontract_id = sa.id
JOIN public.subcontractors s ON sa.subcontractor_id = s.id
JOIN public.projects p ON sa.project_id = p.id
WHERE si.status IN ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED')
ORDER BY si.submitted_at ASC;

-- =============================================================================
-- Triggers
-- =============================================================================

-- Update timestamps
CREATE TRIGGER subcontract_agreements_updated_at
    BEFORE UPDATE ON public.subcontract_agreements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subcontract_change_orders_updated_at
    BEFORE UPDATE ON public.subcontract_change_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subcontractor_invoices_updated_at
    BEFORE UPDATE ON public.subcontractor_invoices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subcontractor_daily_logs_updated_at
    BEFORE UPDATE ON public.subcontractor_daily_logs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subcontractor_evaluations_updated_at
    BEFORE UPDATE ON public.subcontractor_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit logging
CREATE TRIGGER subcontract_agreements_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.subcontract_agreements
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER subcontractor_invoices_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.subcontractor_invoices
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER subcontractor_evaluations_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.subcontractor_evaluations
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =============================================================================
-- Update subcontract value when change orders are approved
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_subcontract_value_on_co()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'APPROVED' AND (OLD.status IS NULL OR OLD.status != 'APPROVED') THEN
        UPDATE public.subcontract_agreements
        SET current_value = current_value + NEW.amount,
            completion_date = completion_date + (NEW.time_extension_days || ' days')::INTERVAL
        WHERE id = NEW.subcontract_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER subcontract_co_approved
    AFTER UPDATE ON public.subcontract_change_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_subcontract_value_on_co();

COMMENT ON TABLE public.subcontract_agreements IS 'Subcontract agreements with subcontractors';
COMMENT ON TABLE public.subcontractor_invoices IS 'Pay applications from subcontractors';
COMMENT ON TABLE public.subcontractor_evaluations IS 'Performance evaluations of subcontractors';
COMMENT ON TABLE public.dbe_utilization_records IS 'DBE utilization tracking for federal projects';
