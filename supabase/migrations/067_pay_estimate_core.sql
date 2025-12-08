-- =============================================================================
-- Migration 067: Pay Estimate Core Tables
-- Pay Estimate + Bid Integration Module - Phase 1
-- =============================================================================
-- Per UNIFIED_MODULE_SPECIFICATION V7.0
-- Creates: Enums, pay_periods, pay_period_line_items, imr_items,
--          subcontract_line_items, sub_payment_allocations, sub_payments,
--          compliance_escalations
-- =============================================================================
-- NOTE: This migration is IDEMPOTENT - safe to run multiple times
-- It will clean up any partial previous runs before creating objects
-- =============================================================================

-- ============================================================================
-- PART 0: CLEANUP FROM PREVIOUS PARTIAL RUNS
-- ============================================================================
-- Drop tables in reverse dependency order to start fresh
-- This ensures a clean state even if a previous run failed partway

DROP TABLE IF EXISTS public.compliance_escalations CASCADE;
DROP TABLE IF EXISTS public.sub_payments CASCADE;
DROP TABLE IF EXISTS public.sub_payment_allocations CASCADE;
DROP TABLE IF EXISTS public.subcontract_line_items CASCADE;
DROP TABLE IF EXISTS public.imr_items CASCADE;
DROP TABLE IF EXISTS public.pay_period_line_items CASCADE;
DROP TABLE IF EXISTS public.pay_periods CASCADE;

-- ============================================================================
-- PART 1: PAY ESTIMATE ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.pay_period_status AS ENUM (
        'PRELIMINARY_RECEIVED',
        'IMR_UNDER_REVIEW',
        'DISPUTED_WITH_STATE',
        'FINAL_RECEIVED',
        'FUNDS_RECEIVED',          -- 14-day clock starts
        'SUB_WS_IN_PROGRESS',
        'PENDING_APPROVAL',
        'APPROVED',
        'CHECKS_CUT',
        'CRL_SUBMITTED',
        'CLOSED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.imr_deficiency_type AS ENUM (
        'LAB_QC',
        'LAB_QA',
        'LAB_QAD',
        'FIELD_QC',
        'FIELD_QA',
        'COMPACTION_QC',
        'COMPACTION_QA',
        'PWL_CORES_SAMPLES',
        'PCC_SIM',
        'APL_AS',
        'DC_DOC',
        'CERT_MISSING',
        'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.imr_resolution_status AS ENUM (
        'OPEN',
        'DOCUMENTATION_SUBMITTED',
        'PENDING_STATE_REVIEW',
        'RESOLVED_RELEASED',
        'ACCEPTED_DEDUCTION',
        'DISPUTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.sub_payment_status AS ENUM (
        'DRAFT',
        'FLAGGED_OVER_CONTRACT',
        'PENDING_APPROVAL',
        'APPROVED',
        'CHECK_CUT',
        'NOTIFIED',
        'CRL_REPORTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.escalation_level AS ENUM (
        'LEVEL_1_WARNING',      -- 7 days remaining
        'LEVEL_2_URGENT',       -- 3 days remaining
        'LEVEL_3_DEADLINE',     -- 0 days - must pay today
        'LEVEL_4_VIOLATION'     -- -1+ days - late
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: PAY_PERIODS — The Financial Bucket per Estimate
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pay_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Identification
    estimate_number INTEGER NOT NULL,
    period_start_date DATE,
    period_end_date DATE NOT NULL,

    -- Status
    status public.pay_period_status DEFAULT 'PRELIMINARY_RECEIVED',

    -- Document Tracking
    preliminary_received_at TIMESTAMPTZ,
    preliminary_email_id TEXT,
    final_received_at TIMESTAMPTZ,
    final_email_id TEXT,
    source_email TEXT DEFAULT 'pay.estimates@tritonwv.com',

    -- Financial Summary (from PE Summary Page)
    posted_item_pay NUMERIC(18,2),              -- Posted Item Pay This Estimate
    asphalt_adjustment NUMERIC(18,2),           -- Price adjustment
    fuel_adjustment NUMERIC(18,2),              -- Price adjustment
    construction_stockpile NUMERIC(18,2),       -- STORED MATERIALS (revenue side)
    material_withheld NUMERIC(18,2),            -- IMR withholding (negative)
    material_credit NUMERIC(18,2),              -- IMR releases (positive)
    liquidated_damages NUMERIC(18,2) DEFAULT 0,
    incentive NUMERIC(18,2) DEFAULT 0,
    disincentive NUMERIC(18,2) DEFAULT 0,
    gross_item_pay NUMERIC(18,2),               -- Calculated gross
    net_pay_amount NUMERIC(18,2),               -- Final amount from State

    -- Cumulative Totals (for reference)
    cumulative_posted_item_pay NUMERIC(18,2),
    cumulative_stockpile NUMERIC(18,2),
    cumulative_material_withheld NUMERIC(18,2),
    cumulative_material_credit NUMERIC(18,2),
    cumulative_net_pay NUMERIC(18,2),

    -- 14-Day Payment Clock
    funds_received_date DATE,
    payment_deadline_date DATE,                 -- Auto-calculated: funds + 14 days

    -- Document Storage
    preliminary_document_url TEXT,
    final_document_url TEXT,
    imr_document_url TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),

    CONSTRAINT unique_pay_period UNIQUE(project_id, estimate_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pay_periods_org ON public.pay_periods(organization_id);
CREATE INDEX IF NOT EXISTS idx_pay_periods_project ON public.pay_periods(project_id);
CREATE INDEX IF NOT EXISTS idx_pay_periods_status ON public.pay_periods(status);
CREATE INDEX IF NOT EXISTS idx_pay_periods_deadline ON public.pay_periods(payment_deadline_date)
    WHERE status IN ('FUNDS_RECEIVED', 'SUB_WS_IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED');

-- ============================================================================
-- PART 3: PAY_PERIOD_LINE_ITEMS — State Revenue Detail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pay_period_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pay_period_id UUID NOT NULL REFERENCES public.pay_periods(id) ON DELETE CASCADE,

    -- WVDOH Identifiers
    line_number TEXT NOT NULL,                  -- '0645', '0650'
    item_number TEXT NOT NULL,                  -- '636060-002' (WVDOH code)

    -- Item Details
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    unit_price NUMERIC(18,4) NOT NULL,
    plan_qty NUMERIC(18,4),

    -- This Period
    previous_qty NUMERIC(18,4) DEFAULT 0,
    this_estimate_qty NUMERIC(18,4) DEFAULT 0,
    this_estimate_amount NUMERIC(18,2) DEFAULT 0,

    -- Totals
    total_to_date_qty NUMERIC(18,4) DEFAULT 0,
    total_to_date_amount NUMERIC(18,2) DEFAULT 0,

    -- Overrun Tracking
    remaining_qty NUMERIC(18,4),                -- plan_qty - total_to_date
    is_overrun BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_ppli UNIQUE(pay_period_id, line_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ppli_item ON public.pay_period_line_items(item_number);
CREATE INDEX IF NOT EXISTS idx_ppli_period ON public.pay_period_line_items(pay_period_id);

-- ============================================================================
-- PART 4: IMR_ITEMS — Deficiency Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.imr_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pay_period_id UUID NOT NULL REFERENCES public.pay_periods(id) ON DELETE CASCADE,

    -- DMIR Identification
    dmir_number TEXT NOT NULL,                  -- 'M1C0709'
    contract_line_number TEXT,
    item_number TEXT NOT NULL,
    item_description TEXT,

    -- Quantities
    qty_posted_to_date NUMERIC(18,4),
    qty_paid_to_date NUMERIC(18,4),
    qty_withheld NUMERIC(18,4),
    qty_remaining NUMERIC(18,4),

    -- Amounts
    amount_withheld NUMERIC(18,2),
    amount_remaining NUMERIC(18,2),

    -- Deficiency Detail
    deficiency_type public.imr_deficiency_type NOT NULL,
    deficiency_description TEXT,
    material_set_item TEXT,

    -- Resolution Tracking
    resolution_status public.imr_resolution_status DEFAULT 'OPEN',
    resolution_document_url TEXT,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_imr_item UNIQUE(pay_period_id, dmir_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_imr_period ON public.imr_items(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_imr_status ON public.imr_items(resolution_status);
CREATE INDEX IF NOT EXISTS idx_imr_item_number ON public.imr_items(item_number);

-- ============================================================================
-- PART 5: SUBCONTRACT_LINE_ITEMS — Contract Detail
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subcontract_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE RESTRICT,

    -- Sub Worksheet Reference
    sub_number TEXT NOT NULL,                   -- '23.10.S01'
    line_number INTEGER NOT NULL,

    -- Item Identification
    internal_item_number TEXT NOT NULL,         -- Triton internal: '9999', '255'
    wvdoh_item_number TEXT,                     -- State code: '636060-002'
    item_description TEXT NOT NULL,

    -- Contract Values
    unit TEXT NOT NULL,
    original_qty NUMERIC(18,4) NOT NULL,
    unit_cost NUMERIC(18,4) NOT NULL,
    original_amount NUMERIC(18,2) GENERATED ALWAYS AS (original_qty * unit_cost) STORED,

    -- Cost Code (for budget rollup)
    cost_code_id UUID,

    -- Retainage Terms (default, may vary by sub)
    retainage_percent NUMERIC(5,2) DEFAULT 10.00,

    -- Tracking
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),

    CONSTRAINT unique_sub_line UNIQUE(project_id, subcontractor_id, line_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scli_org ON public.subcontract_line_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_scli_project ON public.subcontract_line_items(project_id);
CREATE INDEX IF NOT EXISTS idx_scli_sub ON public.subcontract_line_items(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_scli_wvdoh ON public.subcontract_line_items(wvdoh_item_number);

-- ============================================================================
-- PART 6: SUB_PAYMENT_ALLOCATIONS — PM's Digital Worksheet
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sub_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pay_period_id UUID NOT NULL REFERENCES public.pay_periods(id) ON DELETE CASCADE,
    subcontract_line_item_id UUID NOT NULL REFERENCES public.subcontract_line_items(id) ON DELETE CASCADE,

    -- Quantities (mirrors Excel columns)
    previous_qty NUMERIC(18,4) DEFAULT 0,       -- Column I
    current_qty NUMERIC(18,4) DEFAULT 0,        -- Column K (PM entry)
    total_to_date_qty NUMERIC(18,4),            -- Calculated: prev + current
    remaining_qty NUMERIC(18,4),                -- Calculated: orig - total

    -- Amounts (calculated based on unit_cost)
    previous_amount NUMERIC(18,2),
    current_amount NUMERIC(18,2),
    total_to_date_amount NUMERIC(18,2),

    -- Over-Contract Flag (Column M logic)
    is_over_contract BOOLEAN DEFAULT FALSE,
    over_contract_explanation TEXT,
    over_contract_approved_by UUID REFERENCES auth.users(id),
    over_contract_approved_at TIMESTAMPTZ,

    -- State Reconciliation
    state_paid_qty_this_period NUMERIC(18,4),
    variance_from_state NUMERIC(18,4),
    variance_explanation TEXT,

    -- Status
    status public.sub_payment_status DEFAULT 'DRAFT',

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),

    CONSTRAINT unique_allocation UNIQUE(pay_period_id, subcontract_line_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spa_period ON public.sub_payment_allocations(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_spa_line ON public.sub_payment_allocations(subcontract_line_item_id);
CREATE INDEX IF NOT EXISTS idx_spa_status ON public.sub_payment_allocations(status);
CREATE INDEX IF NOT EXISTS idx_spa_over_contract ON public.sub_payment_allocations(is_over_contract) WHERE is_over_contract = TRUE;

-- ============================================================================
-- PART 7: SUB_PAYMENTS — Final Payment Records
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.sub_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    pay_period_id UUID NOT NULL REFERENCES public.pay_periods(id) ON DELETE CASCADE,
    subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE RESTRICT,

    -- Summary
    gross_amount NUMERIC(18,2) NOT NULL,

    -- RETAINAGE: Populated by ACCOUNTING, not PM
    -- PM sees this as read-only after check is cut
    retainage_held NUMERIC(18,2) DEFAULT 0,
    retainage_percent_applied NUMERIC(5,2),

    deductions NUMERIC(18,2) DEFAULT 0,
    deduction_description TEXT,
    net_amount NUMERIC(18,2) NOT NULL,

    -- Payment Details (populated by accounting)
    check_number TEXT,
    check_date DATE,
    payment_method TEXT DEFAULT 'CHECK',

    -- 14-Day Compliance
    payment_deadline DATE,
    days_until_deadline INTEGER,
    is_late BOOLEAN DEFAULT FALSE,

    -- CRL Reporting
    crl_submitted_at TIMESTAMPTZ,
    crl_confirmation_number TEXT,

    -- Sub Notification
    sub_notified_at TIMESTAMPTZ,
    notification_method TEXT,

    -- Approval
    status public.sub_payment_status DEFAULT 'APPROVED',
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),

    CONSTRAINT unique_sub_payment UNIQUE(pay_period_id, subcontractor_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sub_payments_org ON public.sub_payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_period ON public.sub_payments(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_sub ON public.sub_payments(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_sub_payments_status ON public.sub_payments(status);
CREATE INDEX IF NOT EXISTS idx_sub_payments_deadline ON public.sub_payments(payment_deadline) WHERE is_late = FALSE;

COMMENT ON COLUMN public.sub_payments.retainage_held IS
    'Populated by accounting when check is cut. Read-only for PM.';

-- ============================================================================
-- PART 8: COMPLIANCE_ESCALATIONS — 14-Day Deadline Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.compliance_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    pay_period_id UUID NOT NULL REFERENCES public.pay_periods(id) ON DELETE CASCADE,

    -- Escalation Details
    escalation_level public.escalation_level NOT NULL,
    escalation_reason TEXT NOT NULL,
    days_remaining INTEGER,

    -- Notification Tracking
    pm_notified_at TIMESTAMPTZ,
    controller_notified_at TIMESTAMPTZ,
    vp_notified_at TIMESTAMPTZ,
    executive_notified_at TIMESTAMPTZ,

    -- Resolution
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_escalations_org ON public.compliance_escalations(organization_id);
CREATE INDEX IF NOT EXISTS idx_escalations_period ON public.compliance_escalations(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_escalations_level ON public.compliance_escalations(escalation_level);
CREATE INDEX IF NOT EXISTS idx_escalations_unresolved ON public.compliance_escalations(is_resolved) WHERE is_resolved = FALSE;

-- ============================================================================
-- PART 9: TRIGGERS
-- ============================================================================

-- Auto-calculate payment deadline when funds received
CREATE OR REPLACE FUNCTION public.calculate_payment_deadline()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.funds_received_date IS NOT NULL AND (OLD.funds_received_date IS NULL OR OLD.funds_received_date != NEW.funds_received_date) THEN
        NEW.payment_deadline_date := NEW.funds_received_date + INTERVAL '14 days';
        IF NEW.status = 'FINAL_RECEIVED' THEN
            NEW.status := 'FUNDS_RECEIVED';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_payment_deadline ON public.pay_periods;
CREATE TRIGGER trg_payment_deadline
    BEFORE UPDATE ON public.pay_periods
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_payment_deadline();

-- Auto-calculate amounts and over-contract flag for allocations
CREATE OR REPLACE FUNCTION public.calculate_allocation_amounts()
RETURNS TRIGGER AS $$
DECLARE
    v_unit_cost NUMERIC;
    v_original_qty NUMERIC;
BEGIN
    SELECT unit_cost, original_qty
    INTO v_unit_cost, v_original_qty
    FROM public.subcontract_line_items
    WHERE id = NEW.subcontract_line_item_id;

    NEW.previous_amount := NEW.previous_qty * v_unit_cost;
    NEW.current_amount := NEW.current_qty * v_unit_cost;
    NEW.total_to_date_qty := NEW.previous_qty + NEW.current_qty;
    NEW.total_to_date_amount := NEW.total_to_date_qty * v_unit_cost;
    NEW.remaining_qty := v_original_qty - NEW.total_to_date_qty;

    -- Over-contract check
    IF NEW.current_qty > 0 AND NEW.remaining_qty < 0 THEN
        NEW.is_over_contract := TRUE;
        IF NEW.over_contract_explanation IS NULL AND NEW.status = 'DRAFT' THEN
            NEW.status := 'FLAGGED_OVER_CONTRACT';
        END IF;
    ELSE
        NEW.is_over_contract := FALSE;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_allocation_amounts ON public.sub_payment_allocations;
CREATE TRIGGER trg_allocation_amounts
    BEFORE INSERT OR UPDATE ON public.sub_payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_allocation_amounts();

-- Update timestamps
CREATE TRIGGER pay_periods_updated_at
    BEFORE UPDATE ON public.pay_periods
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subcontract_line_items_updated_at
    BEFORE UPDATE ON public.subcontract_line_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER sub_payment_allocations_updated_at
    BEFORE UPDATE ON public.sub_payment_allocations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER sub_payments_updated_at
    BEFORE UPDATE ON public.sub_payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- PART 10: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_period_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imr_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontract_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sub_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_escalations ENABLE ROW LEVEL SECURITY;

-- pay_periods policies
CREATE POLICY "pay_periods_select" ON public.pay_periods FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "pay_periods_insert" ON public.pay_periods FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "pay_periods_update" ON public.pay_periods FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- pay_period_line_items policies
CREATE POLICY "ppli_select" ON public.pay_period_line_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.pay_periods pp
        WHERE pp.id = pay_period_id
        AND pp.organization_id = public.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "ppli_insert" ON public.pay_period_line_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.pay_periods pp
        WHERE pp.id = pay_period_id
        AND pp.organization_id = public.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "ppli_update" ON public.pay_period_line_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.pay_periods pp
        WHERE pp.id = pay_period_id
        AND pp.organization_id = public.get_user_organization_id(auth.uid())
    ));

-- imr_items policies
CREATE POLICY "imr_select" ON public.imr_items FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.pay_periods pp
        WHERE pp.id = pay_period_id
        AND pp.organization_id = public.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "imr_insert" ON public.imr_items FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.pay_periods pp
        WHERE pp.id = pay_period_id
        AND pp.organization_id = public.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "imr_update" ON public.imr_items FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.pay_periods pp
        WHERE pp.id = pay_period_id
        AND pp.organization_id = public.get_user_organization_id(auth.uid())
    ));

-- subcontract_line_items policies
CREATE POLICY "scli_select" ON public.subcontract_line_items FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "scli_insert" ON public.subcontract_line_items FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "scli_update" ON public.subcontract_line_items FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- sub_payment_allocations policies
CREATE POLICY "spa_select" ON public.sub_payment_allocations FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.pay_periods pp
        WHERE pp.id = pay_period_id
        AND pp.organization_id = public.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "spa_insert" ON public.sub_payment_allocations FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.pay_periods pp
        WHERE pp.id = pay_period_id
        AND pp.organization_id = public.get_user_organization_id(auth.uid())
    ));

CREATE POLICY "spa_update" ON public.sub_payment_allocations FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.pay_periods pp
        WHERE pp.id = pay_period_id
        AND pp.organization_id = public.get_user_organization_id(auth.uid())
    ));

-- sub_payments policies
CREATE POLICY "sub_payments_select" ON public.sub_payments FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "sub_payments_insert" ON public.sub_payments FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "sub_payments_update" ON public.sub_payments FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- compliance_escalations policies
CREATE POLICY "escalations_select" ON public.compliance_escalations FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "escalations_insert" ON public.compliance_escalations FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 11: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.pay_periods IS 'Pay estimate periods from WVDOH with financial summaries and 14-day compliance tracking';
COMMENT ON TABLE public.pay_period_line_items IS 'Individual line items from state pay estimate documents';
COMMENT ON TABLE public.imr_items IS 'Insufficient Materials Report deficiency tracking';
COMMENT ON TABLE public.subcontract_line_items IS 'Subcontract line items linking internal items to WVDOH codes';
COMMENT ON TABLE public.sub_payment_allocations IS 'PM digital worksheet for allocating quantities to pay periods';
COMMENT ON TABLE public.sub_payments IS 'Final subcontractor payment records with retainage and compliance';
COMMENT ON TABLE public.compliance_escalations IS '14-day payment deadline escalation tracking';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 067: Pay Estimate Core Tables completed successfully' as status;
