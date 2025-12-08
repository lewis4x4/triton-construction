-- =============================================================================
-- Migration 069: Budget Tracking Tables and Functions
-- Pay Estimate + Bid Integration Module - Phase 3
-- =============================================================================
-- Per UNIFIED_MODULE_SPECIFICATION V7.0
-- Creates: budget_status enum, subcontract_budgets, budget_alerts,
--          project_financials, AI projection functions
-- =============================================================================

-- ============================================================================
-- PART 1: BUDGET TRACKING ENUM
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.budget_status AS ENUM (
        'ON_TRACK',
        'WARNING',      -- 80%+ of budget
        'CRITICAL',     -- 95%+ of budget
        'OVER_BUDGET'   -- 100%+ of budget
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.alert_severity AS ENUM (
        'INFO',
        'YELLOW',
        'ORANGE',
        'RED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: SUBCONTRACT_BUDGETS — Bid vs Negotiated vs Actual
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.subcontract_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE RESTRICT,

    -- From Bid (Estimators' assumption)
    -- NOTE: FK to bid_projects added conditionally at end of migration
    bid_project_id UUID,
    bid_description TEXT,
    bid_amount NUMERIC(18,2) NOT NULL,
    bid_notes TEXT,

    -- Negotiated (What subcontract was signed for)
    negotiated_amount NUMERIC(18,2),
    negotiated_date DATE,
    negotiated_by UUID REFERENCES auth.users(id),
    subcontract_number TEXT,

    -- Award Variance
    award_variance NUMERIC(18,2),               -- bid - negotiated (positive = savings)
    award_variance_pct NUMERIC(5,2),

    -- Alert Thresholds (customizable per sub)
    warning_threshold_pct NUMERIC(5,2) DEFAULT 80.00,
    critical_threshold_pct NUMERIC(5,2) DEFAULT 95.00,

    -- Current Status (updated by trigger)
    total_paid_to_date NUMERIC(18,2) DEFAULT 0,
    percent_of_budget NUMERIC(5,2) DEFAULT 0,
    budget_status public.budget_status DEFAULT 'ON_TRACK',

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),

    CONSTRAINT unique_sub_budget UNIQUE(project_id, subcontractor_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sb_org ON public.subcontract_budgets(organization_id);
CREATE INDEX IF NOT EXISTS idx_sb_project ON public.subcontract_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_sb_sub ON public.subcontract_budgets(subcontractor_id);
CREATE INDEX IF NOT EXISTS idx_sb_status ON public.subcontract_budgets(budget_status);
CREATE INDEX IF NOT EXISTS idx_sb_warning ON public.subcontract_budgets(budget_status)
    WHERE budget_status IN ('WARNING', 'CRITICAL', 'OVER_BUDGET');

-- ============================================================================
-- PART 3: BUDGET_ALERTS — AI Early Warning System
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.budget_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    subcontract_budget_id UUID REFERENCES public.subcontract_budgets(id) ON DELETE CASCADE,

    -- Alert Classification
    alert_type TEXT NOT NULL,                   -- WARNING, CRITICAL, OVER_BUDGET, PROJECTION
    severity public.alert_severity NOT NULL,

    -- Content
    title TEXT NOT NULL,
    message TEXT NOT NULL,

    -- Current State
    current_paid NUMERIC(18,2),
    budget_amount NUMERIC(18,2),
    percent_used NUMERIC(5,2),

    -- AI Projection
    projected_final_cost NUMERIC(18,2),
    projected_overage NUMERIC(18,2),
    confidence_level TEXT,
    projection_basis TEXT,

    -- Resolution
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    action_taken TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ba_org ON public.budget_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_ba_project ON public.budget_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_ba_budget ON public.budget_alerts(subcontract_budget_id);
CREATE INDEX IF NOT EXISTS idx_ba_severity ON public.budget_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_ba_unacked ON public.budget_alerts(is_acknowledged) WHERE is_acknowledged = FALSE;

-- ============================================================================
-- PART 4: PROJECT_FINANCIALS — Margin Snapshot
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_financials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    pay_period_id UUID REFERENCES public.pay_periods(id),
    as_of_date DATE NOT NULL,

    -- Revenue (State → Triton)
    total_revenue_to_date NUMERIC(18,2),
    revenue_this_period NUMERIC(18,2),
    stockpile_balance NUMERIC(18,2),
    imr_withheld NUMERIC(18,2),
    net_revenue NUMERIC(18,2),

    -- Cost (Triton → Subs)
    total_sub_cost_to_date NUMERIC(18,2),
    sub_cost_this_period NUMERIC(18,2),
    retainage_held_total NUMERIC(18,2),

    -- Self-Perform Costs (placeholder for future module)
    self_perform_labor NUMERIC(18,2) DEFAULT 0,
    self_perform_equipment NUMERIC(18,2) DEFAULT 0,
    self_perform_materials NUMERIC(18,2) DEFAULT 0,
    self_perform_total NUMERIC(18,2) DEFAULT 0,

    -- Margin
    gross_margin NUMERIC(18,2),
    gross_margin_pct NUMERIC(5,2),

    -- Comparison to Bid
    bid_margin_assumed NUMERIC(18,2),
    margin_variance NUMERIC(18,2),
    margin_variance_pct NUMERIC(5,2),

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pf_org ON public.project_financials(organization_id);
CREATE INDEX IF NOT EXISTS idx_pf_project ON public.project_financials(project_id);
CREATE INDEX IF NOT EXISTS idx_pf_date ON public.project_financials(as_of_date);
CREATE INDEX IF NOT EXISTS idx_pf_period ON public.project_financials(pay_period_id);

-- ============================================================================
-- PART 5: TRIGGERS
-- ============================================================================

-- Calculate award variance when negotiated amount is set
CREATE OR REPLACE FUNCTION public.calculate_award_variance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.negotiated_amount IS NOT NULL THEN
        NEW.award_variance := NEW.bid_amount - NEW.negotiated_amount;
        IF NEW.bid_amount > 0 THEN
            NEW.award_variance_pct := ROUND((NEW.award_variance / NEW.bid_amount * 100)::NUMERIC, 2);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_award_variance ON public.subcontract_budgets;
CREATE TRIGGER trg_award_variance
    BEFORE INSERT OR UPDATE ON public.subcontract_budgets
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_award_variance();

-- Update budget status when sub payment created
CREATE OR REPLACE FUNCTION public.update_subcontract_budget_status()
RETURNS TRIGGER AS $$
DECLARE
    v_budget RECORD;
    v_comparison_amount NUMERIC;
    v_project_id UUID;
BEGIN
    -- Get project_id from pay_period
    SELECT project_id INTO v_project_id
    FROM public.pay_periods WHERE id = NEW.pay_period_id;

    -- Get budget record
    SELECT * INTO v_budget
    FROM public.subcontract_budgets
    WHERE project_id = v_project_id
      AND subcontractor_id = NEW.subcontractor_id;

    IF v_budget IS NULL THEN
        RETURN NEW;
    END IF;

    -- Use negotiated amount if available
    v_comparison_amount := COALESCE(v_budget.negotiated_amount, v_budget.bid_amount);

    -- Update totals and status
    UPDATE public.subcontract_budgets
    SET
        total_paid_to_date = total_paid_to_date + NEW.net_amount,
        percent_of_budget = CASE
            WHEN v_comparison_amount > 0 THEN
                ROUND(((total_paid_to_date + NEW.net_amount) / v_comparison_amount * 100)::NUMERIC, 2)
            ELSE 0
        END,
        budget_status = CASE
            WHEN (total_paid_to_date + NEW.net_amount) > v_comparison_amount THEN 'OVER_BUDGET'
            WHEN v_comparison_amount > 0 AND ((total_paid_to_date + NEW.net_amount) / v_comparison_amount * 100) >= critical_threshold_pct THEN 'CRITICAL'
            WHEN v_comparison_amount > 0 AND ((total_paid_to_date + NEW.net_amount) / v_comparison_amount * 100) >= warning_threshold_pct THEN 'WARNING'
            ELSE 'ON_TRACK'
        END,
        updated_at = NOW()
    WHERE id = v_budget.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_sub_budget ON public.sub_payments;
CREATE TRIGGER trg_update_sub_budget
    AFTER INSERT ON public.sub_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_subcontract_budget_status();

-- Update timestamps
CREATE TRIGGER subcontract_budgets_updated_at
    BEFORE UPDATE ON public.subcontract_budgets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- PART 6: AI PROJECTION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_sub_projection(p_subcontract_budget_id UUID)
RETURNS TABLE (
    projected_final NUMERIC,
    projected_overage NUMERIC,
    confidence TEXT,
    basis TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_budget RECORD;
    v_project_percent_complete NUMERIC;
    v_payment_count INTEGER;
    v_comparison_amount NUMERIC;
BEGIN
    SELECT * INTO v_budget FROM public.subcontract_budgets WHERE id = p_subcontract_budget_id;

    IF v_budget IS NULL THEN
        RETURN QUERY SELECT NULL::NUMERIC, NULL::NUMERIC, 'NO_DATA'::TEXT, 'Budget record not found'::TEXT;
        RETURN;
    END IF;

    -- Get project completion percentage from pay estimates
    SELECT
        CASE
            WHEN p.current_contract_value > 0 THEN
                ROUND((COALESCE(SUM(pp.net_pay_amount), 0) / p.current_contract_value * 100)::NUMERIC, 1)
            ELSE 0
        END
    INTO v_project_percent_complete
    FROM public.projects p
    LEFT JOIN public.pay_periods pp ON pp.project_id = p.id AND pp.status NOT IN ('PRELIMINARY_RECEIVED', 'IMR_UNDER_REVIEW')
    WHERE p.id = v_budget.project_id
    GROUP BY p.id, p.current_contract_value;

    -- Count payments to this sub
    SELECT COUNT(*) INTO v_payment_count
    FROM public.sub_payments sp
    JOIN public.pay_periods pp ON sp.pay_period_id = pp.id
    WHERE pp.project_id = v_budget.project_id
      AND sp.subcontractor_id = v_budget.subcontractor_id;

    v_comparison_amount := COALESCE(v_budget.negotiated_amount, v_budget.bid_amount);

    -- Linear projection based on project completion
    IF v_project_percent_complete > 0 AND v_payment_count >= 2 THEN
        projected_final := ROUND((v_budget.total_paid_to_date / (v_project_percent_complete / 100))::NUMERIC, 2);
        projected_overage := projected_final - v_comparison_amount;
        confidence := CASE
            WHEN v_payment_count >= 5 AND v_project_percent_complete >= 30 THEN 'HIGH'
            WHEN v_payment_count >= 3 AND v_project_percent_complete >= 20 THEN 'MEDIUM'
            ELSE 'LOW'
        END;
        basis := format('Based on %s payments, project %s%% complete', v_payment_count, v_project_percent_complete);
    ELSE
        projected_final := NULL;
        projected_overage := NULL;
        confidence := 'INSUFFICIENT_DATA';
        basis := 'Need at least 2 payments and measurable project progress';
    END IF;

    RETURN QUERY SELECT projected_final, projected_overage, confidence, basis;
END;
$$;

-- ============================================================================
-- PART 7: BUDGET ALERT CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_budget_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_budget RECORD;
    v_projection RECORD;
BEGIN
    FOR v_budget IN
        SELECT sb.*, s.company_name, p.name as project_name, p.organization_id
        FROM public.subcontract_budgets sb
        JOIN public.subcontractors s ON sb.subcontractor_id = s.id
        JOIN public.projects p ON sb.project_id = p.id
        WHERE sb.budget_status IN ('WARNING', 'CRITICAL', 'OVER_BUDGET')
          AND NOT EXISTS (
              SELECT 1 FROM public.budget_alerts ba
              WHERE ba.subcontract_budget_id = sb.id
                AND ba.created_at > NOW() - INTERVAL '7 days'
                AND ba.is_acknowledged = FALSE
          )
    LOOP
        SELECT * INTO v_projection FROM public.calculate_sub_projection(v_budget.id);

        INSERT INTO public.budget_alerts (
            organization_id, project_id, subcontract_budget_id, alert_type, severity,
            title, message, current_paid, budget_amount, percent_used,
            projected_final_cost, projected_overage, confidence_level, projection_basis
        ) VALUES (
            v_budget.organization_id,
            v_budget.project_id,
            v_budget.id,
            v_budget.budget_status::TEXT,
            CASE v_budget.budget_status
                WHEN 'WARNING' THEN 'YELLOW'
                WHEN 'CRITICAL' THEN 'ORANGE'
                WHEN 'OVER_BUDGET' THEN 'RED'
            END::public.alert_severity,
            v_budget.company_name || ' Budget Alert',
            v_budget.company_name || ' on ' || v_budget.project_name ||
            ' is at ' || ROUND(v_budget.percent_of_budget, 1) || '% of budget.',
            v_budget.total_paid_to_date,
            COALESCE(v_budget.negotiated_amount, v_budget.bid_amount),
            v_budget.percent_of_budget,
            v_projection.projected_final,
            v_projection.projected_overage,
            v_projection.confidence,
            v_projection.basis
        );
    END LOOP;
END;
$$;

-- ============================================================================
-- PART 8: PROJECT FINANCIAL SNAPSHOT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_project_financial_snapshot(
    p_project_id UUID,
    p_pay_period_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_snapshot_id UUID;
    v_org_id UUID;
    v_revenue_data RECORD;
    v_cost_data RECORD;
    v_bid_margin NUMERIC;
BEGIN
    -- Get organization
    SELECT organization_id INTO v_org_id
    FROM public.projects WHERE id = p_project_id;

    -- Calculate revenue totals
    SELECT
        COALESCE(SUM(net_pay_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN id = p_pay_period_id THEN net_pay_amount ELSE 0 END), 0) as this_period,
        COALESCE(SUM(construction_stockpile), 0) as stockpile,
        COALESCE(SUM(material_withheld), 0) as withheld
    INTO v_revenue_data
    FROM public.pay_periods
    WHERE project_id = p_project_id
      AND status NOT IN ('PRELIMINARY_RECEIVED', 'IMR_UNDER_REVIEW', 'DISPUTED_WITH_STATE');

    -- Calculate cost totals
    SELECT
        COALESCE(SUM(net_amount), 0) as total_cost,
        COALESCE(SUM(CASE WHEN pay_period_id = p_pay_period_id THEN net_amount ELSE 0 END), 0) as this_period,
        COALESCE(SUM(retainage_held), 0) as retainage
    INTO v_cost_data
    FROM public.sub_payments
    WHERE pay_period_id IN (SELECT id FROM public.pay_periods WHERE project_id = p_project_id);

    -- Get bid margin assumption (placeholder - would come from bid_projects)
    v_bid_margin := 0;

    -- Create snapshot
    INSERT INTO public.project_financials (
        organization_id, project_id, pay_period_id, as_of_date,
        total_revenue_to_date, revenue_this_period, stockpile_balance, imr_withheld, net_revenue,
        total_sub_cost_to_date, sub_cost_this_period, retainage_held_total,
        gross_margin, gross_margin_pct,
        bid_margin_assumed, margin_variance
    ) VALUES (
        v_org_id, p_project_id, p_pay_period_id, CURRENT_DATE,
        v_revenue_data.total_revenue, v_revenue_data.this_period, v_revenue_data.stockpile, v_revenue_data.withheld,
        v_revenue_data.total_revenue - COALESCE(v_revenue_data.withheld, 0),
        v_cost_data.total_cost, v_cost_data.this_period, v_cost_data.retainage,
        v_revenue_data.total_revenue - v_cost_data.total_cost,
        CASE WHEN v_revenue_data.total_revenue > 0 THEN
            ROUND(((v_revenue_data.total_revenue - v_cost_data.total_cost) / v_revenue_data.total_revenue * 100)::NUMERIC, 2)
        ELSE 0 END,
        v_bid_margin,
        (v_revenue_data.total_revenue - v_cost_data.total_cost) - v_bid_margin
    )
    RETURNING id INTO v_snapshot_id;

    RETURN v_snapshot_id;
END;
$$;

-- ============================================================================
-- PART 9: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.subcontract_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_financials ENABLE ROW LEVEL SECURITY;

-- subcontract_budgets policies
CREATE POLICY "sb_select" ON public.subcontract_budgets FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "sb_insert" ON public.subcontract_budgets FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "sb_update" ON public.subcontract_budgets FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- budget_alerts policies
CREATE POLICY "ba_select" ON public.budget_alerts FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "ba_insert" ON public.budget_alerts FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "ba_update" ON public.budget_alerts FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- project_financials policies
CREATE POLICY "pf_select" ON public.project_financials FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "pf_insert" ON public.project_financials FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 10: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.subcontract_budgets IS 'Bid vs negotiated vs actual tracking with AI-powered alerts';
COMMENT ON TABLE public.budget_alerts IS 'AI early warning system for budget overruns';
COMMENT ON TABLE public.project_financials IS 'Point-in-time margin snapshots for project financial tracking';
COMMENT ON FUNCTION public.calculate_sub_projection IS 'AI projection of final subcontract cost based on progress';
COMMENT ON FUNCTION public.check_budget_alerts IS 'Daily check for budget alert conditions - call via pg_cron';
COMMENT ON FUNCTION public.create_project_financial_snapshot IS 'Create point-in-time financial snapshot for a project';

-- ============================================================================
-- PART 11: CONDITIONAL FK TO BID_PROJECTS
-- ============================================================================

-- Add FK constraint to bid_projects if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bid_projects') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'subcontract_budgets_bid_project_id_fkey'
        ) THEN
            ALTER TABLE public.subcontract_budgets
            ADD CONSTRAINT subcontract_budgets_bid_project_id_fkey
            FOREIGN KEY (bid_project_id) REFERENCES public.bid_projects(id);
        END IF;
        RAISE NOTICE 'Added FK constraint to bid_projects for subcontract_budgets';
    ELSE
        RAISE NOTICE 'bid_projects table not found - FK constraint will be added when table is created';
    END IF;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 069: Budget Tracking completed successfully' as status;
