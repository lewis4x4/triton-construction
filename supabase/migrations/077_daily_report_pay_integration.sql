-- =============================================================================
-- Migration 077: Daily Report to Pay Estimate Integration
-- Links daily field reports to pay periods for quantity tracking
-- =============================================================================
-- Enables:
-- - Daily quantity tracking by item
-- - Automatic aggregation to pay estimates
-- - Variance analysis (reported vs paid)
-- - Field vs office reconciliation
-- =============================================================================

-- ============================================================================
-- PART 0: CLEANUP
-- ============================================================================

DROP VIEW IF EXISTS public.v_daily_pay_reconciliation CASCADE;
DROP VIEW IF EXISTS public.v_item_quantity_tracking CASCADE;
DROP TABLE IF EXISTS public.daily_report_quantities CASCADE;
DROP TABLE IF EXISTS public.quantity_dispute_notes CASCADE;

-- ============================================================================
-- PART 1: DAILY REPORT QUANTITIES
-- ============================================================================
-- Individual quantity entries by item from daily reports

CREATE TABLE public.daily_report_quantities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Source daily report
    daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,

    -- Item identification
    item_number TEXT NOT NULL,              -- WVDOH item code
    description TEXT NOT NULL,
    unit TEXT NOT NULL,

    -- Quantity reported
    quantity_installed NUMERIC(15,3) NOT NULL,
    unit_price NUMERIC(12,4),               -- From bid (for reference)
    calculated_amount NUMERIC(15,2) GENERATED ALWAYS AS (
        quantity_installed * COALESCE(unit_price, 0)
    ) STORED,

    -- Location/station info
    begin_station TEXT,
    end_station TEXT,
    location_description TEXT,
    gps_latitude NUMERIC(10,7),
    gps_longitude NUMERIC(10,7),

    -- Crew/equipment reference
    crew_size INTEGER,
    equipment_used TEXT[],

    -- Notes from field
    foreman_notes TEXT,
    superintendent_notes TEXT,

    -- Link to pay estimate (set after reconciliation)
    pay_period_id UUID REFERENCES public.pay_periods(id) ON DELETE SET NULL,
    pay_line_item_id UUID REFERENCES public.pay_period_line_items(id) ON DELETE SET NULL,

    -- Reconciliation status
    is_reconciled BOOLEAN DEFAULT false,
    reconciled_at TIMESTAMPTZ,
    reconciled_by UUID REFERENCES auth.users(id),
    reconciliation_variance NUMERIC(15,3),  -- Difference if any

    -- Dispute tracking
    is_disputed BOOLEAN DEFAULT false,
    dispute_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- PART 2: QUANTITY DISPUTE NOTES
-- ============================================================================
-- Track disputes between field-reported and DOH-paid quantities

CREATE TABLE public.quantity_dispute_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Reference to disputed quantities
    daily_quantity_id UUID REFERENCES public.daily_report_quantities(id) ON DELETE SET NULL,
    pay_period_id UUID REFERENCES public.pay_periods(id) ON DELETE SET NULL,
    item_number TEXT NOT NULL,

    -- Dispute details
    field_reported_qty NUMERIC(15,3) NOT NULL,
    doh_paid_qty NUMERIC(15,3) NOT NULL,
    variance_qty NUMERIC(15,3) GENERATED ALWAYS AS (field_reported_qty - doh_paid_qty) STORED,
    variance_amount NUMERIC(15,2),

    -- Resolution
    dispute_status TEXT DEFAULT 'OPEN',     -- OPEN, INVESTIGATING, RESOLVED, ACCEPTED
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),

    -- Outcome
    outcome TEXT,                           -- RE-MEASURED, ADJUSTED, ACCEPTED_DOH, CHANGE_ORDER
    final_qty NUMERIC(15,3),
    adjustment_reference TEXT,

    -- Communication log
    communication_log JSONB DEFAULT '[]',   -- [{date, type, notes, by}]

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- PART 3: ALTER EXISTING TABLES
-- ============================================================================
-- Add integration fields to existing tables

-- Add field quantities summary to pay_period_line_items
DO $$ BEGIN
    ALTER TABLE public.pay_period_line_items
        ADD COLUMN field_reported_qty NUMERIC(15,3),
        ADD COLUMN field_variance NUMERIC(15,3),
        ADD COLUMN field_reports_count INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add pay estimate link to daily_report_entries
DO $$ BEGIN
    ALTER TABLE public.daily_report_entries
        ADD COLUMN item_number TEXT,
        ADD COLUMN quantity_value NUMERIC(15,3),
        ADD COLUMN quantity_unit TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================================
-- PART 4: TRIGGERS
-- ============================================================================

-- Auto-populate organization and project from daily report
CREATE OR REPLACE FUNCTION public.set_daily_quantity_context()
RETURNS TRIGGER AS $$
BEGIN
    SELECT dr.organization_id, dr.project_id, dr.report_date
    INTO NEW.organization_id, NEW.project_id, NEW.report_date
    FROM public.daily_reports dr
    WHERE dr.id = NEW.daily_report_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_daily_quantity_context
    BEFORE INSERT ON public.daily_report_quantities
    FOR EACH ROW EXECUTE FUNCTION public.set_daily_quantity_context();

-- Update pay_period_line_items with field totals when quantities are reconciled
CREATE OR REPLACE FUNCTION public.update_field_quantities()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.pay_line_item_id IS NOT NULL AND NEW.is_reconciled THEN
        UPDATE public.pay_period_line_items
        SET
            field_reported_qty = COALESCE((
                SELECT SUM(quantity_installed)
                FROM public.daily_report_quantities
                WHERE pay_line_item_id = NEW.pay_line_item_id
                AND is_reconciled = true
            ), 0),
            field_reports_count = (
                SELECT COUNT(*)
                FROM public.daily_report_quantities
                WHERE pay_line_item_id = NEW.pay_line_item_id
                AND is_reconciled = true
            ),
            updated_at = now()
        WHERE id = NEW.pay_line_item_id;

        -- Calculate variance
        UPDATE public.pay_period_line_items
        SET field_variance = field_reported_qty - this_estimate_qty
        WHERE id = NEW.pay_line_item_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_field_quantities
    AFTER INSERT OR UPDATE ON public.daily_report_quantities
    FOR EACH ROW
    WHEN (NEW.is_reconciled = true)
    EXECUTE FUNCTION public.update_field_quantities();

-- ============================================================================
-- PART 5: RECONCILIATION FUNCTION
-- ============================================================================
-- Auto-match daily quantities to pay period line items

CREATE OR REPLACE FUNCTION public.reconcile_daily_to_pay_period(
    p_project_id UUID,
    p_pay_period_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_reconciled_by UUID DEFAULT NULL
)
RETURNS TABLE(
    item_number TEXT,
    field_qty NUMERIC,
    pay_qty NUMERIC,
    variance NUMERIC,
    matched BOOLEAN
) AS $$
BEGIN
    -- Update daily quantities with matching pay period line items
    UPDATE public.daily_report_quantities drq
    SET
        pay_period_id = p_pay_period_id,
        pay_line_item_id = pli.id,
        is_reconciled = true,
        reconciled_at = now(),
        reconciled_by = p_reconciled_by,
        reconciliation_variance = drq.quantity_installed - pli.this_estimate_qty
    FROM public.pay_period_line_items pli
    WHERE drq.project_id = p_project_id
    AND drq.report_date BETWEEN p_start_date AND p_end_date
    AND drq.item_number = pli.item_number
    AND pli.pay_period_id = p_pay_period_id
    AND drq.is_reconciled = false;

    -- Return reconciliation results
    RETURN QUERY
    SELECT
        COALESCE(d.item_number, p.item_number) as item_number,
        COALESCE(d.total_field_qty, 0) as field_qty,
        COALESCE(p.pay_qty, 0) as pay_qty,
        COALESCE(d.total_field_qty, 0) - COALESCE(p.pay_qty, 0) as variance,
        (d.item_number IS NOT NULL AND p.item_number IS NOT NULL) as matched
    FROM (
        SELECT
            drq.item_number,
            SUM(drq.quantity_installed) as total_field_qty
        FROM public.daily_report_quantities drq
        WHERE drq.project_id = p_project_id
        AND drq.report_date BETWEEN p_start_date AND p_end_date
        GROUP BY drq.item_number
    ) d
    FULL OUTER JOIN (
        SELECT
            pli.item_number,
            pli.this_estimate_qty as pay_qty
        FROM public.pay_period_line_items pli
        WHERE pli.pay_period_id = p_pay_period_id
    ) p ON d.item_number = p.item_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: VIEWS
-- ============================================================================

-- Daily to pay period reconciliation view
CREATE VIEW public.v_daily_pay_reconciliation AS
SELECT
    drq.project_id,
    p.name as project_name,
    p.contract_number,
    drq.item_number,
    drq.description,
    drq.unit,

    -- Date range
    MIN(drq.report_date) as first_report_date,
    MAX(drq.report_date) as last_report_date,

    -- Field totals
    COUNT(DISTINCT drq.daily_report_id) as daily_reports_count,
    SUM(drq.quantity_installed) as total_field_qty,
    SUM(drq.calculated_amount) as total_field_amount,

    -- Pay estimate (if linked)
    drq.pay_period_id,
    pp.estimate_number,
    pp.period_end_date as pay_period_end,
    pli.this_estimate_qty as pay_qty,
    pli.this_estimate_amount as pay_amount,

    -- Variance
    SUM(drq.quantity_installed) - COALESCE(pli.this_estimate_qty, 0) as qty_variance,
    CASE WHEN pli.this_estimate_qty > 0
        THEN ((SUM(drq.quantity_installed) - pli.this_estimate_qty) / pli.this_estimate_qty) * 100
        ELSE 0
    END as variance_pct,

    -- Reconciliation status
    BOOL_AND(drq.is_reconciled) as fully_reconciled,
    COUNT(*) FILTER (WHERE drq.is_disputed) as disputed_count

FROM public.daily_report_quantities drq
JOIN public.projects p ON drq.project_id = p.id
LEFT JOIN public.pay_periods pp ON drq.pay_period_id = pp.id
LEFT JOIN public.pay_period_line_items pli ON drq.pay_line_item_id = pli.id
GROUP BY
    drq.project_id, p.name, p.contract_number,
    drq.item_number, drq.description, drq.unit,
    drq.pay_period_id, pp.estimate_number, pp.period_end_date,
    pli.this_estimate_qty, pli.this_estimate_amount;

-- Item quantity tracking view (cumulative)
CREATE VIEW public.v_item_quantity_tracking AS
SELECT
    p.id as project_id,
    p.name as project_name,
    p.contract_number,
    items.item_number,
    items.description,
    items.unit,

    -- Contract/bid quantity
    items.plan_qty as contract_qty,

    -- Field reported (from daily reports)
    COALESCE(field.total_qty, 0) as field_reported_qty,
    field.last_report_date,

    -- Pay estimate quantities
    COALESCE(pay.paid_qty, 0) as paid_qty,
    pay.last_estimate_number,

    -- Variances
    COALESCE(field.total_qty, 0) - COALESCE(pay.paid_qty, 0) as field_vs_paid_variance,

    -- Completion %
    CASE WHEN items.plan_qty > 0
        THEN (COALESCE(pay.paid_qty, 0) / items.plan_qty) * 100
        ELSE 0
    END as paid_complete_pct,
    CASE WHEN items.plan_qty > 0
        THEN (COALESCE(field.total_qty, 0) / items.plan_qty) * 100
        ELSE 0
    END as field_complete_pct,

    -- Remaining
    GREATEST(items.plan_qty - COALESCE(pay.paid_qty, 0), 0) as remaining_qty

FROM public.projects p
CROSS JOIN LATERAL (
    SELECT DISTINCT
        pli.item_number,
        pli.description,
        pli.unit,
        pli.plan_qty
    FROM public.pay_period_line_items pli
    JOIN public.pay_periods pp ON pli.pay_period_id = pp.id
    WHERE pp.project_id = p.id
) items
LEFT JOIN LATERAL (
    SELECT
        SUM(drq.quantity_installed) as total_qty,
        MAX(drq.report_date) as last_report_date
    FROM public.daily_report_quantities drq
    WHERE drq.project_id = p.id
    AND drq.item_number = items.item_number
) field ON true
LEFT JOIN LATERAL (
    SELECT
        SUM(pli.total_to_date_qty) as paid_qty,
        MAX(pp.estimate_number) as last_estimate_number
    FROM public.pay_period_line_items pli
    JOIN public.pay_periods pp ON pli.pay_period_id = pp.id
    WHERE pp.project_id = p.id
    AND pli.item_number = items.item_number
    AND pp.status IN ('FINAL_RECEIVED', 'FUNDS_RECEIVED', 'APPROVED', 'CHECKS_CUT')
    GROUP BY pli.item_number
    ORDER BY MAX(pp.estimate_number) DESC
    LIMIT 1
) pay ON true;

-- ============================================================================
-- PART 7: RLS POLICIES
-- ============================================================================

ALTER TABLE public.daily_report_quantities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quantity_dispute_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_quantities_org_access" ON public.daily_report_quantities
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "dispute_notes_org_access" ON public.quantity_dispute_notes
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 8: INDEXES
-- ============================================================================

CREATE INDEX idx_daily_quantities_report ON public.daily_report_quantities(daily_report_id);
CREATE INDEX idx_daily_quantities_project ON public.daily_report_quantities(project_id);
CREATE INDEX idx_daily_quantities_date ON public.daily_report_quantities(report_date);
CREATE INDEX idx_daily_quantities_item ON public.daily_report_quantities(item_number);
CREATE INDEX idx_daily_quantities_pay_period ON public.daily_report_quantities(pay_period_id);
CREATE INDEX idx_daily_quantities_reconciled ON public.daily_report_quantities(is_reconciled);

CREATE INDEX idx_dispute_notes_project ON public.quantity_dispute_notes(project_id);
CREATE INDEX idx_dispute_notes_item ON public.quantity_dispute_notes(item_number);
CREATE INDEX idx_dispute_notes_status ON public.quantity_dispute_notes(dispute_status);

-- ============================================================================
-- PART 9: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.daily_report_quantities IS 'Daily quantity entries by item from field reports';
COMMENT ON TABLE public.quantity_dispute_notes IS 'Track disputes between field-reported and DOH-paid quantities';
COMMENT ON FUNCTION public.reconcile_daily_to_pay_period IS 'Auto-match daily quantities to pay period line items';
COMMENT ON VIEW public.v_daily_pay_reconciliation IS 'Reconciliation view between daily reports and pay estimates';
COMMENT ON VIEW public.v_item_quantity_tracking IS 'Cumulative item quantity tracking - field vs paid';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 077: Daily Report Pay Integration completed successfully' as status;
