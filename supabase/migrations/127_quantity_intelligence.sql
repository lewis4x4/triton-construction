-- =============================================================================
-- Migration 127: Quantity Intelligence & Bid Unbalancing
-- Multi-source quantity tracking with variance analysis for strategic pricing
-- =============================================================================
-- Enables:
-- - Multi-source quantity tracking (EBSX, Plan Summary, Contractor Takeoff)
-- - Automatic variance calculation between sources
-- - Unbalancing strategy recommendations (SHORT/LONG)
-- - Required justification for unbalanced items
-- =============================================================================

-- ============================================================================
-- PART 1: ENUMS (with IF NOT EXISTS logic)
-- ============================================================================

-- Quantity source tracking
DO $$ BEGIN
    CREATE TYPE quantity_source_enum AS ENUM (
        'EBSX_IMPORT',
        'PLAN_SUMMARY',
        'CONTRACTOR_TAKEOFF',
        'SPECIAL_PROVISION',
        'ADDENDUM'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Variance significance levels
DO $$ BEGIN
    CREATE TYPE variance_significance_enum AS ENUM (
        'MATCH',      -- ±5%
        'MINOR',      -- 5-15%
        'MODERATE',   -- 15-30%
        'MAJOR',      -- 30-50%
        'CRITICAL'    -- >50%
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Variance direction
DO $$ BEGIN
    CREATE TYPE variance_direction_enum AS ENUM (
        'OVER',       -- Actual > Plan (potential overrun)
        'UNDER',      -- Actual < Plan (potential underrun)
        'MATCH'       -- Within threshold
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Unbalance strategy direction
DO $$ BEGIN
    CREATE TYPE unbalance_direction_enum AS ENUM (
        'SHORT',      -- Lower price (expect overrun, reduce exposure)
        'LONG',       -- Raise price (expect underrun, maximize early payment)
        'NEUTRAL'     -- No adjustment
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: LINE ITEM QUANTITIES TABLE
-- ============================================================================
-- Normalized storage for all quantity sources

CREATE TABLE IF NOT EXISTS public.line_item_quantities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to bid_line_items
    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,

    -- Source identification
    quantity_source quantity_source_enum NOT NULL,
    source_reference TEXT,                    -- Document reference (e.g., "Plan Sheet 15", "Addendum #2")
    source_date DATE,                         -- Date of source document

    -- Quantity data
    quantity NUMERIC(18,4) NOT NULL,
    unit TEXT,                                -- Should match bid_line_items.unit

    -- Additional context
    calculation_notes TEXT,                   -- How quantity was derived
    is_governing BOOLEAN DEFAULT false,       -- Is this the governing quantity for pricing?
    confidence NUMERIC(5,2) DEFAULT 100.00,   -- 0-100 confidence in this quantity

    -- Audit fields
    entered_by UUID REFERENCES auth.users(id),
    entered_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    -- Ensure only one quantity per source per line item
    CONSTRAINT uq_line_item_quantity_source UNIQUE (line_item_id, quantity_source)
);

-- ============================================================================
-- PART 3: ALTER BID_LINE_ITEMS
-- ============================================================================
-- Add denormalized quantity fields and variance tracking

-- Denormalized quantity fields for quick access
DO $$ BEGIN
    ALTER TABLE public.bid_line_items
        ADD COLUMN ebsx_quantity NUMERIC(18,4),
        ADD COLUMN plan_quantity NUMERIC(18,4),
        ADD COLUMN takeoff_quantity NUMERIC(18,4);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Governing source tracking
DO $$ BEGIN
    ALTER TABLE public.bid_line_items
        ADD COLUMN governing_source quantity_source_enum DEFAULT 'EBSX_IMPORT';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Variance tracking fields
DO $$ BEGIN
    ALTER TABLE public.bid_line_items
        ADD COLUMN quantity_variance_pct NUMERIC(10,2),
        ADD COLUMN variance_direction variance_direction_enum,
        ADD COLUMN variance_significance variance_significance_enum;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Unbalancing strategy fields
DO $$ BEGIN
    ALTER TABLE public.bid_line_items
        ADD COLUMN is_unbalanced BOOLEAN DEFAULT false,
        ADD COLUMN unbalance_direction unbalance_direction_enum,
        ADD COLUMN unbalance_justification TEXT,
        ADD COLUMN unbalance_confidence NUMERIC(5,2),
        ADD COLUMN unbalanced_by UUID REFERENCES auth.users(id),
        ADD COLUMN unbalanced_at TIMESTAMPTZ;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================================
-- PART 4: TRIGGER FUNCTIONS
-- ============================================================================

-- Function to calculate variance between plan and takeoff quantities
CREATE OR REPLACE FUNCTION public.fn_calculate_quantity_variance()
RETURNS TRIGGER AS $$
DECLARE
    v_plan_qty NUMERIC(18,4);
    v_takeoff_qty NUMERIC(18,4);
    v_ebsx_qty NUMERIC(18,4);
    v_base_qty NUMERIC(18,4);
    v_compare_qty NUMERIC(18,4);
    v_variance_pct NUMERIC(10,2);
    v_direction variance_direction_enum;
    v_significance variance_significance_enum;
BEGIN
    -- Get denormalized quantities
    v_ebsx_qty := NEW.ebsx_quantity;
    v_plan_qty := NEW.plan_quantity;
    v_takeoff_qty := NEW.takeoff_quantity;

    -- Determine base quantity (priority: plan > ebsx)
    v_base_qty := COALESCE(v_plan_qty, v_ebsx_qty);

    -- Determine comparison quantity (priority: takeoff > plan)
    v_compare_qty := COALESCE(v_takeoff_qty, v_plan_qty);

    -- Calculate variance if we have both base and comparison
    IF v_base_qty IS NOT NULL AND v_base_qty > 0 AND v_compare_qty IS NOT NULL THEN
        v_variance_pct := ((v_compare_qty - v_base_qty) / v_base_qty) * 100;

        -- Determine direction
        IF ABS(v_variance_pct) <= 5 THEN
            v_direction := 'MATCH';
        ELSIF v_variance_pct > 0 THEN
            v_direction := 'OVER';
        ELSE
            v_direction := 'UNDER';
        END IF;

        -- Determine significance based on absolute variance
        IF ABS(v_variance_pct) <= 5 THEN
            v_significance := 'MATCH';
        ELSIF ABS(v_variance_pct) <= 15 THEN
            v_significance := 'MINOR';
        ELSIF ABS(v_variance_pct) <= 30 THEN
            v_significance := 'MODERATE';
        ELSIF ABS(v_variance_pct) <= 50 THEN
            v_significance := 'MAJOR';
        ELSE
            v_significance := 'CRITICAL';
        END IF;

        NEW.quantity_variance_pct := v_variance_pct;
        NEW.variance_direction := v_direction;
        NEW.variance_significance := v_significance;
    ELSE
        -- Clear variance fields if we don't have enough data
        NEW.quantity_variance_pct := NULL;
        NEW.variance_direction := NULL;
        NEW.variance_significance := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for variance calculation
DROP TRIGGER IF EXISTS trg_calculate_quantity_variance ON public.bid_line_items;
CREATE TRIGGER trg_calculate_quantity_variance
    BEFORE INSERT OR UPDATE OF ebsx_quantity, plan_quantity, takeoff_quantity
    ON public.bid_line_items
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_calculate_quantity_variance();

-- Function to sync line_item_quantities to denormalized fields
CREATE OR REPLACE FUNCTION public.fn_sync_quantity_to_line_item()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- Clear the corresponding denormalized field
        UPDATE public.bid_line_items
        SET
            ebsx_quantity = CASE WHEN OLD.quantity_source = 'EBSX_IMPORT' THEN NULL ELSE ebsx_quantity END,
            plan_quantity = CASE WHEN OLD.quantity_source = 'PLAN_SUMMARY' THEN NULL ELSE plan_quantity END,
            takeoff_quantity = CASE WHEN OLD.quantity_source = 'CONTRACTOR_TAKEOFF' THEN NULL ELSE takeoff_quantity END,
            updated_at = now()
        WHERE id = OLD.line_item_id;

        RETURN OLD;
    ELSE
        -- Update the appropriate denormalized field based on source
        UPDATE public.bid_line_items
        SET
            ebsx_quantity = CASE WHEN NEW.quantity_source = 'EBSX_IMPORT' THEN NEW.quantity ELSE ebsx_quantity END,
            plan_quantity = CASE WHEN NEW.quantity_source = 'PLAN_SUMMARY' THEN NEW.quantity ELSE plan_quantity END,
            takeoff_quantity = CASE WHEN NEW.quantity_source = 'CONTRACTOR_TAKEOFF' THEN NEW.quantity ELSE takeoff_quantity END,
            governing_source = CASE
                WHEN NEW.is_governing THEN NEW.quantity_source
                ELSE governing_source
            END,
            updated_at = now()
        WHERE id = NEW.line_item_id;

        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for quantity sync
DROP TRIGGER IF EXISTS trg_sync_quantity_to_line_item ON public.line_item_quantities;
CREATE TRIGGER trg_sync_quantity_to_line_item
    AFTER INSERT OR UPDATE OR DELETE ON public.line_item_quantities
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_sync_quantity_to_line_item();

-- ============================================================================
-- PART 5: VIEWS
-- ============================================================================

-- View for unbalancing opportunities
CREATE OR REPLACE VIEW public.v_unbalancing_opportunities AS
SELECT
    li.id,
    li.bid_project_id,
    bp.project_name,
    bp.state_project_number AS project_number,
    li.line_number,
    li.item_number,
    li.description,
    li.unit,

    -- Quantities from all sources
    li.ebsx_quantity,
    li.plan_quantity,
    li.takeoff_quantity,

    -- Variance analysis
    li.quantity_variance_pct,
    li.variance_direction,
    li.variance_significance,

    -- Calculated amounts
    COALESCE(li.final_unit_price, li.ai_suggested_unit_price) AS unit_price,
    li.quantity AS bid_quantity,
    (li.quantity * COALESCE(li.final_unit_price, li.ai_suggested_unit_price)) AS bid_amount,

    -- Recommended strategy
    CASE
        WHEN li.variance_direction = 'OVER' AND li.variance_significance IN ('MAJOR', 'CRITICAL') THEN 'SHORT'
        WHEN li.variance_direction = 'UNDER' AND li.variance_significance IN ('MAJOR', 'CRITICAL') THEN 'LONG'
        ELSE 'NEUTRAL'
    END AS recommended_strategy,

    -- Strategy explanation
    CASE
        WHEN li.variance_direction = 'OVER' AND li.variance_significance IN ('MAJOR', 'CRITICAL')
            THEN 'Takeoff shows ' || ROUND(li.quantity_variance_pct, 1) || '% MORE than plan. Consider LOWERING unit price to reduce overrun exposure.'
        WHEN li.variance_direction = 'UNDER' AND li.variance_significance IN ('MAJOR', 'CRITICAL')
            THEN 'Takeoff shows ' || ROUND(ABS(li.quantity_variance_pct), 1) || '% LESS than plan. Consider RAISING unit price to maximize early payment.'
        ELSE 'Variance within acceptable range. No strategic adjustment recommended.'
    END AS strategy_explanation,

    -- Current unbalancing status
    li.is_unbalanced,
    li.unbalance_direction,
    li.unbalance_justification,
    li.unbalance_confidence,

    -- Prioritization score (higher = more actionable)
    CASE li.variance_significance
        WHEN 'CRITICAL' THEN 100
        WHEN 'MAJOR' THEN 75
        WHEN 'MODERATE' THEN 50
        WHEN 'MINOR' THEN 25
        ELSE 0
    END +
    CASE
        WHEN (li.quantity * COALESCE(li.final_unit_price, li.ai_suggested_unit_price)) > 100000 THEN 50
        WHEN (li.quantity * COALESCE(li.final_unit_price, li.ai_suggested_unit_price)) > 50000 THEN 30
        WHEN (li.quantity * COALESCE(li.final_unit_price, li.ai_suggested_unit_price)) > 10000 THEN 10
        ELSE 0
    END AS priority_score

FROM public.bid_line_items li
JOIN public.bid_projects bp ON li.bid_project_id = bp.id
WHERE li.variance_significance IN ('MODERATE', 'MAJOR', 'CRITICAL')
ORDER BY priority_score DESC, ABS(li.quantity_variance_pct) DESC;

-- View for quantity source comparison
CREATE OR REPLACE VIEW public.v_quantity_source_comparison AS
SELECT
    li.id AS line_item_id,
    li.bid_project_id,
    li.line_number,
    li.item_number,
    li.description,
    li.unit,

    -- EBSX quantity
    ebsx.quantity AS ebsx_quantity,
    ebsx.source_reference AS ebsx_reference,
    ebsx.entered_at AS ebsx_entered_at,

    -- Plan quantity
    plan.quantity AS plan_quantity,
    plan.source_reference AS plan_reference,
    plan.entered_at AS plan_entered_at,

    -- Takeoff quantity
    takeoff.quantity AS takeoff_quantity,
    takeoff.source_reference AS takeoff_reference,
    takeoff.calculation_notes AS takeoff_notes,
    takeoff.entered_at AS takeoff_entered_at,

    -- Governing quantity
    li.governing_source,
    CASE li.governing_source
        WHEN 'EBSX_IMPORT' THEN li.ebsx_quantity
        WHEN 'PLAN_SUMMARY' THEN li.plan_quantity
        WHEN 'CONTRACTOR_TAKEOFF' THEN li.takeoff_quantity
        ELSE li.quantity
    END AS governing_quantity,

    -- Variance
    li.quantity_variance_pct,
    li.variance_direction,
    li.variance_significance

FROM public.bid_line_items li
LEFT JOIN public.line_item_quantities ebsx
    ON li.id = ebsx.line_item_id AND ebsx.quantity_source = 'EBSX_IMPORT'
LEFT JOIN public.line_item_quantities plan
    ON li.id = plan.line_item_id AND plan.quantity_source = 'PLAN_SUMMARY'
LEFT JOIN public.line_item_quantities takeoff
    ON li.id = takeoff.line_item_id AND takeoff.quantity_source = 'CONTRACTOR_TAKEOFF';

-- ============================================================================
-- PART 6: RLS POLICIES
-- ============================================================================

ALTER TABLE public.line_item_quantities ENABLE ROW LEVEL SECURITY;

-- Users can view quantities for projects they have access to
DROP POLICY IF EXISTS "line_item_quantities_select" ON public.line_item_quantities;
CREATE POLICY "line_item_quantities_select" ON public.line_item_quantities
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bid_line_items li
            JOIN public.bid_projects bp ON li.bid_project_id = bp.id
            WHERE li.id = line_item_quantities.line_item_id
            AND bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Users can insert quantities for projects in their org
DROP POLICY IF EXISTS "line_item_quantities_insert" ON public.line_item_quantities;
CREATE POLICY "line_item_quantities_insert" ON public.line_item_quantities
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bid_line_items li
            JOIN public.bid_projects bp ON li.bid_project_id = bp.id
            WHERE li.id = line_item_quantities.line_item_id
            AND bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Users can update quantities for projects in their org
DROP POLICY IF EXISTS "line_item_quantities_update" ON public.line_item_quantities;
CREATE POLICY "line_item_quantities_update" ON public.line_item_quantities
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bid_line_items li
            JOIN public.bid_projects bp ON li.bid_project_id = bp.id
            WHERE li.id = line_item_quantities.line_item_id
            AND bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Users can delete quantities for projects in their org
DROP POLICY IF EXISTS "line_item_quantities_delete" ON public.line_item_quantities;
CREATE POLICY "line_item_quantities_delete" ON public.line_item_quantities
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bid_line_items li
            JOIN public.bid_projects bp ON li.bid_project_id = bp.id
            WHERE li.id = line_item_quantities.line_item_id
            AND bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- PART 6.5: QUANTITY CHANGE HISTORY (AUDIT TRAIL)
-- ============================================================================
-- Track all quantity changes over time for audit and analysis

CREATE TABLE IF NOT EXISTS public.quantity_change_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to the quantity record
    line_item_quantity_id UUID NOT NULL REFERENCES public.line_item_quantities(id) ON DELETE CASCADE,
    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,

    -- Change details
    quantity_source quantity_source_enum NOT NULL,
    old_quantity NUMERIC(18,4),
    new_quantity NUMERIC(18,4) NOT NULL,
    quantity_change NUMERIC(18,4) GENERATED ALWAYS AS (new_quantity - COALESCE(old_quantity, 0)) STORED,
    change_pct NUMERIC(10,2),

    -- Context
    change_reason TEXT,
    source_reference TEXT,

    -- Audit
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for quantity change history
ALTER TABLE public.quantity_change_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quantity_change_history_select" ON public.quantity_change_history;
CREATE POLICY "quantity_change_history_select" ON public.quantity_change_history
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bid_line_items li
            JOIN public.bid_projects bp ON li.bid_project_id = bp.id
            WHERE li.id = quantity_change_history.line_item_id
            AND bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger to log quantity changes
CREATE OR REPLACE FUNCTION public.fn_log_quantity_change()
RETURNS TRIGGER AS $$
DECLARE
    v_change_pct NUMERIC(10,2);
BEGIN
    -- Calculate percentage change
    IF OLD.quantity IS NOT NULL AND OLD.quantity > 0 THEN
        v_change_pct := ((NEW.quantity - OLD.quantity) / OLD.quantity) * 100;
    END IF;

    -- Log the change
    INSERT INTO public.quantity_change_history (
        line_item_quantity_id,
        line_item_id,
        quantity_source,
        old_quantity,
        new_quantity,
        change_pct,
        source_reference,
        changed_by
    ) VALUES (
        NEW.id,
        NEW.line_item_id,
        NEW.quantity_source,
        OLD.quantity,
        NEW.quantity,
        v_change_pct,
        NEW.source_reference,
        auth.uid()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only trigger on updates where quantity actually changed
DROP TRIGGER IF EXISTS trg_log_quantity_change ON public.line_item_quantities;
CREATE TRIGGER trg_log_quantity_change
    AFTER UPDATE OF quantity ON public.line_item_quantities
    FOR EACH ROW
    WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
    EXECUTE FUNCTION public.fn_log_quantity_change();

-- Also log initial insertion (new quantities)
CREATE OR REPLACE FUNCTION public.fn_log_quantity_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.quantity_change_history (
        line_item_quantity_id,
        line_item_id,
        quantity_source,
        old_quantity,
        new_quantity,
        change_pct,
        source_reference,
        changed_by
    ) VALUES (
        NEW.id,
        NEW.line_item_id,
        NEW.quantity_source,
        NULL,
        NEW.quantity,
        NULL,
        NEW.source_reference,
        COALESCE(NEW.entered_by, auth.uid())
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_quantity_insert ON public.line_item_quantities;
CREATE TRIGGER trg_log_quantity_insert
    AFTER INSERT ON public.line_item_quantities
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_log_quantity_insert();

-- Index for efficient history lookups
CREATE INDEX IF NOT EXISTS idx_quantity_change_history_line_item ON public.quantity_change_history(line_item_id);
CREATE INDEX IF NOT EXISTS idx_quantity_change_history_quantity_id ON public.quantity_change_history(line_item_quantity_id);
CREATE INDEX IF NOT EXISTS idx_quantity_change_history_changed_at ON public.quantity_change_history(changed_at DESC);

-- ============================================================================
-- PART 7: INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_line_item_quantities_line_item ON public.line_item_quantities(line_item_id);
CREATE INDEX IF NOT EXISTS idx_line_item_quantities_source ON public.line_item_quantities(quantity_source);
CREATE INDEX IF NOT EXISTS idx_line_item_quantities_governing ON public.line_item_quantities(line_item_id) WHERE is_governing = true;

CREATE INDEX IF NOT EXISTS idx_bid_line_items_variance ON public.bid_line_items(variance_significance)
    WHERE variance_significance IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bid_line_items_unbalanced ON public.bid_line_items(bid_project_id)
    WHERE is_unbalanced = true;

-- ============================================================================
-- PART 8: HELPER FUNCTIONS
-- ============================================================================

-- Function to set unbalancing status with required justification
CREATE OR REPLACE FUNCTION public.set_item_unbalanced(
    p_line_item_id UUID,
    p_direction unbalance_direction_enum,
    p_justification TEXT,
    p_confidence NUMERIC DEFAULT 80.00
)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_justification IS NULL OR LENGTH(TRIM(p_justification)) < 10 THEN
        RAISE EXCEPTION 'Justification is required and must be at least 10 characters';
    END IF;

    UPDATE public.bid_line_items
    SET
        is_unbalanced = true,
        unbalance_direction = p_direction,
        unbalance_justification = p_justification,
        unbalance_confidence = p_confidence,
        unbalanced_by = auth.uid(),
        unbalanced_at = now(),
        updated_at = now()
    WHERE id = p_line_item_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear unbalancing status
CREATE OR REPLACE FUNCTION public.clear_item_unbalanced(p_line_item_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE public.bid_line_items
    SET
        is_unbalanced = false,
        unbalance_direction = NULL,
        unbalance_justification = NULL,
        unbalance_confidence = NULL,
        unbalanced_by = NULL,
        unbalanced_at = NULL,
        updated_at = now()
    WHERE id = p_line_item_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add or update a quantity source
CREATE OR REPLACE FUNCTION public.upsert_quantity_source(
    p_line_item_id UUID,
    p_source quantity_source_enum,
    p_quantity NUMERIC,
    p_source_reference TEXT DEFAULT NULL,
    p_calculation_notes TEXT DEFAULT NULL,
    p_is_governing BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO public.line_item_quantities (
        line_item_id,
        quantity_source,
        quantity,
        source_reference,
        calculation_notes,
        is_governing,
        entered_by
    ) VALUES (
        p_line_item_id,
        p_source,
        p_quantity,
        p_source_reference,
        p_calculation_notes,
        p_is_governing,
        auth.uid()
    )
    ON CONFLICT (line_item_id, quantity_source)
    DO UPDATE SET
        quantity = EXCLUDED.quantity,
        source_reference = COALESCE(EXCLUDED.source_reference, line_item_quantities.source_reference),
        calculation_notes = COALESCE(EXCLUDED.calculation_notes, line_item_quantities.calculation_notes),
        is_governing = EXCLUDED.is_governing,
        updated_at = now()
    RETURNING id INTO v_id;

    -- If this is set as governing, clear governing flag on other sources
    IF p_is_governing THEN
        UPDATE public.line_item_quantities
        SET is_governing = false
        WHERE line_item_id = p_line_item_id
        AND quantity_source != p_source;
    END IF;

    RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 9: COMMENTS
-- ============================================================================

COMMENT ON TYPE quantity_source_enum IS 'Sources for bid line item quantities';
COMMENT ON TYPE variance_significance_enum IS 'Significance level of quantity variance between sources';
COMMENT ON TYPE variance_direction_enum IS 'Direction of quantity variance (over/under plan)';
COMMENT ON TYPE unbalance_direction_enum IS 'Strategic direction for bid unbalancing';

COMMENT ON TABLE public.line_item_quantities IS 'Multi-source quantity tracking for bid line items';
COMMENT ON VIEW public.v_unbalancing_opportunities IS 'Identifies items with significant variance for strategic pricing';
COMMENT ON VIEW public.v_quantity_source_comparison IS 'Side-by-side comparison of all quantity sources';

COMMENT ON FUNCTION public.set_item_unbalanced IS 'Mark a line item as strategically unbalanced with required justification';
COMMENT ON FUNCTION public.clear_item_unbalanced IS 'Remove unbalancing designation from a line item';
COMMENT ON FUNCTION public.upsert_quantity_source IS 'Add or update a quantity source for a line item';

-- ============================================================================
-- SUMMARY
-- ============================================================================

SELECT 'Migration 127: Quantity Intelligence completed successfully' AS status;
