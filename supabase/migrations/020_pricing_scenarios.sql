-- ============================================================================
-- MIGRATION 020: V4.1 ADDENDUM - PRICING SCENARIOS
-- Triton AI Bid Package Engine - Scenario-based pricing support
-- ============================================================================

-- ============================================================================
-- ENUM: pricing_scenario_type_enum
-- ============================================================================
CREATE TYPE pricing_scenario_type_enum AS ENUM (
    'AGGRESSIVE',     -- Lower margins, competitive pricing
    'BALANCED',       -- Standard margins
    'CONSERVATIVE'    -- Higher margins, risk-averse
);

COMMENT ON TYPE pricing_scenario_type_enum IS 'Predefined pricing strategy types';

-- ============================================================================
-- TABLE: bid_pricing_scenarios
-- Purpose: Define pricing strategies for a project
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_pricing_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent Project
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Scenario Identity
    name TEXT NOT NULL,                  -- "Aggressive", "Balanced", "Conservative"
    scenario_type pricing_scenario_type_enum NOT NULL,
    description TEXT,

    -- Default Markup Percentages
    default_contingency_pct NUMERIC(5, 2) DEFAULT 5.0,
    default_overhead_pct NUMERIC(5, 2) DEFAULT 10.0,
    default_profit_pct NUMERIC(5, 2) DEFAULT 8.0,
    default_risk_load_pct NUMERIC(5, 2) DEFAULT 0.0,

    -- Scenario Totals (calculated)
    total_base_cost NUMERIC(16, 4),
    total_with_markups NUMERIC(16, 4),
    effective_margin_pct NUMERIC(5, 2),

    -- Status
    is_primary BOOLEAN DEFAULT FALSE,    -- The "selected" scenario
    is_locked BOOLEAN DEFAULT FALSE,     -- Prevent further changes

    -- Notes
    strategy_notes TEXT,
    assumptions TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.user_profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_project ON public.bid_pricing_scenarios(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_type ON public.bid_pricing_scenarios(scenario_type);
CREATE INDEX IF NOT EXISTS idx_pricing_scenarios_primary ON public.bid_pricing_scenarios(bid_project_id, is_primary) WHERE is_primary = TRUE;

-- Enable RLS
ALTER TABLE public.bid_pricing_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see pricing scenarios" ON public.bid_pricing_scenarios;
CREATE POLICY "Users see pricing scenarios" ON public.bid_pricing_scenarios
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_pricing_scenarios_updated_at ON public.bid_pricing_scenarios;
CREATE TRIGGER bid_pricing_scenarios_updated_at
    BEFORE UPDATE ON public.bid_pricing_scenarios
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TABLE: bid_item_pricing_scenarios
-- Purpose: Per-item pricing knobs that differ by scenario
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_item_pricing_scenarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parents
    pricing_scenario_id UUID NOT NULL REFERENCES public.bid_pricing_scenarios(id) ON DELETE CASCADE,
    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,

    -- Cost Overrides (nullable = use calculated value)
    base_unit_cost_override NUMERIC(14, 4),
    productivity_factor_override NUMERIC(5, 3),

    -- Markup Knobs
    contingency_pct NUMERIC(5, 2),        -- e.g., 5.0 = 5%
    risk_load_pct NUMERIC(5, 2),          -- Separate from margin
    overhead_pct NUMERIC(5, 2),
    profit_pct NUMERIC(5, 2),             -- Target profit margin

    -- Calculated Scenario Price
    scenario_unit_price NUMERIC(14, 4),   -- Full calculated price
    scenario_extended_price NUMERIC(16, 4), -- Unit price × quantity

    -- Notes
    notes TEXT,                           -- "Sharpened to be competitive on MOT"

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_item_scenario UNIQUE (pricing_scenario_id, line_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_item_scenarios_scenario ON public.bid_item_pricing_scenarios(pricing_scenario_id);
CREATE INDEX IF NOT EXISTS idx_item_scenarios_item ON public.bid_item_pricing_scenarios(line_item_id);

-- Enable RLS
ALTER TABLE public.bid_item_pricing_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see item pricing scenarios" ON public.bid_item_pricing_scenarios;
CREATE POLICY "Users see item pricing scenarios" ON public.bid_item_pricing_scenarios
    FOR ALL USING (
        pricing_scenario_id IN (
            SELECT ps.id FROM public.bid_pricing_scenarios ps
            JOIN public.bid_projects bp ON ps.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_item_scenarios_updated_at ON public.bid_item_pricing_scenarios;
CREATE TRIGGER bid_item_scenarios_updated_at
    BEFORE UPDATE ON public.bid_item_pricing_scenarios
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TRIGGER: Calculate scenario prices
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_scenario_price()
RETURNS TRIGGER AS $$
DECLARE
    v_base_cost NUMERIC;
    v_quantity NUMERIC;
    v_contingency NUMERIC;
    v_overhead NUMERIC;
    v_profit NUMERIC;
    v_risk NUMERIC;
    v_scenario_defaults RECORD;
BEGIN
    -- Get line item details
    SELECT
        COALESCE(NEW.base_unit_cost_override, bli.base_unit_cost, 0),
        COALESCE(bli.quantity, 0)
    INTO v_base_cost, v_quantity
    FROM public.bid_line_items bli
    WHERE bli.id = NEW.line_item_id;

    -- Get scenario defaults if not overridden
    SELECT
        default_contingency_pct,
        default_overhead_pct,
        default_profit_pct,
        default_risk_load_pct
    INTO v_scenario_defaults
    FROM public.bid_pricing_scenarios
    WHERE id = NEW.pricing_scenario_id;

    -- Use item-specific or scenario defaults
    v_contingency := COALESCE(NEW.contingency_pct, v_scenario_defaults.default_contingency_pct, 0);
    v_overhead := COALESCE(NEW.overhead_pct, v_scenario_defaults.default_overhead_pct, 0);
    v_profit := COALESCE(NEW.profit_pct, v_scenario_defaults.default_profit_pct, 0);
    v_risk := COALESCE(NEW.risk_load_pct, v_scenario_defaults.default_risk_load_pct, 0);

    -- Calculate scenario unit price
    NEW.scenario_unit_price := v_base_cost * (1 + (v_contingency + v_overhead + v_profit + v_risk) / 100);

    -- Calculate extended price
    NEW.scenario_extended_price := NEW.scenario_unit_price * v_quantity;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_scenario_price ON public.bid_item_pricing_scenarios;
CREATE TRIGGER trg_calculate_scenario_price
    BEFORE INSERT OR UPDATE
    ON public.bid_item_pricing_scenarios
    FOR EACH ROW EXECUTE FUNCTION public.calculate_scenario_price();

-- ============================================================================
-- TRIGGER: Update scenario totals when item prices change
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_scenario_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_scenario_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_scenario_id := OLD.pricing_scenario_id;
    ELSE
        v_scenario_id := NEW.pricing_scenario_id;
    END IF;

    -- Update scenario totals
    UPDATE public.bid_pricing_scenarios SET
        total_base_cost = (
            SELECT COALESCE(SUM(
                COALESCE(ips.base_unit_cost_override, bli.base_unit_cost, 0) * COALESCE(bli.quantity, 0)
            ), 0)
            FROM public.bid_item_pricing_scenarios ips
            JOIN public.bid_line_items bli ON ips.line_item_id = bli.id
            WHERE ips.pricing_scenario_id = v_scenario_id
        ),
        total_with_markups = (
            SELECT COALESCE(SUM(scenario_extended_price), 0)
            FROM public.bid_item_pricing_scenarios
            WHERE pricing_scenario_id = v_scenario_id
        ),
        updated_at = NOW()
    WHERE id = v_scenario_id;

    -- Calculate effective margin
    UPDATE public.bid_pricing_scenarios SET
        effective_margin_pct = CASE
            WHEN total_base_cost > 0 THEN
                ((total_with_markups - total_base_cost) / total_base_cost) * 100
            ELSE 0
        END
    WHERE id = v_scenario_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_scenario_totals ON public.bid_item_pricing_scenarios;
CREATE TRIGGER trg_update_scenario_totals
    AFTER INSERT OR UPDATE OR DELETE
    ON public.bid_item_pricing_scenarios
    FOR EACH ROW EXECUTE FUNCTION public.update_scenario_totals();

-- ============================================================================
-- HELPER FUNCTION: Create default scenarios for a project
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_default_pricing_scenarios(p_bid_project_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Create AGGRESSIVE scenario
    INSERT INTO public.bid_pricing_scenarios (
        bid_project_id, name, scenario_type, description,
        default_contingency_pct, default_overhead_pct, default_profit_pct,
        created_by
    ) VALUES (
        p_bid_project_id, 'Aggressive', 'AGGRESSIVE',
        'Lower margins for competitive positioning',
        3.0, 8.0, 5.0, auth.uid()
    );

    -- Create BALANCED scenario (primary)
    INSERT INTO public.bid_pricing_scenarios (
        bid_project_id, name, scenario_type, description,
        default_contingency_pct, default_overhead_pct, default_profit_pct,
        is_primary, created_by
    ) VALUES (
        p_bid_project_id, 'Balanced', 'BALANCED',
        'Standard margins with balanced risk approach',
        5.0, 10.0, 8.0, TRUE, auth.uid()
    );

    -- Create CONSERVATIVE scenario
    INSERT INTO public.bid_pricing_scenarios (
        bid_project_id, name, scenario_type, description,
        default_contingency_pct, default_overhead_pct, default_profit_pct,
        created_by
    ) VALUES (
        p_bid_project_id, 'Conservative', 'CONSERVATIVE',
        'Higher margins for risk protection',
        8.0, 12.0, 10.0, auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEW: Scenario comparison
-- ============================================================================
CREATE OR REPLACE VIEW public.v_bid_scenario_comparison AS
SELECT
    bli.id AS line_item_id,
    bli.item_number,
    bli.description,
    bli.quantity,
    bli.unit,
    bli.base_unit_cost,
    ps.name AS scenario_name,
    ps.scenario_type,
    ips.contingency_pct,
    ips.overhead_pct,
    ips.profit_pct,
    ips.scenario_unit_price,
    ips.scenario_extended_price,
    -- Comparison to base
    ips.scenario_unit_price - COALESCE(bli.base_unit_cost, 0) AS markup_amount,
    CASE WHEN COALESCE(bli.base_unit_cost, 0) > 0
         THEN ((ips.scenario_unit_price / bli.base_unit_cost) - 1) * 100
         ELSE 0 END AS markup_percentage
FROM public.bid_line_items bli
CROSS JOIN public.bid_pricing_scenarios ps
LEFT JOIN public.bid_item_pricing_scenarios ips ON
    bli.id = ips.line_item_id AND
    ps.id = ips.pricing_scenario_id
WHERE ps.bid_project_id = bli.bid_project_id;

-- ============================================================================
-- VIEW: Project pricing summary by scenario
-- ============================================================================
CREATE OR REPLACE VIEW public.v_bid_pricing_summary AS
SELECT
    bp.id AS bid_project_id,
    bp.project_name,
    ps.id AS scenario_id,
    ps.name AS scenario_name,
    ps.scenario_type,
    ps.is_primary,
    COUNT(DISTINCT bli.id) AS total_items,
    COUNT(DISTINCT ips.id) AS items_with_scenario_pricing,
    ps.total_base_cost,
    ps.total_with_markups,
    ps.effective_margin_pct,
    ps.default_contingency_pct,
    ps.default_overhead_pct,
    ps.default_profit_pct
FROM public.bid_projects bp
JOIN public.bid_pricing_scenarios ps ON bp.id = ps.bid_project_id
LEFT JOIN public.bid_line_items bli ON bp.id = bli.bid_project_id
LEFT JOIN public.bid_item_pricing_scenarios ips ON ps.id = ips.pricing_scenario_id AND bli.id = ips.line_item_id
GROUP BY bp.id, bp.project_name, ps.id, ps.name, ps.scenario_type, ps.is_primary,
         ps.total_base_cost, ps.total_with_markups, ps.effective_margin_pct,
         ps.default_contingency_pct, ps.default_overhead_pct, ps.default_profit_pct;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.bid_pricing_scenarios IS 'Pricing strategies (Aggressive/Balanced/Conservative) for bid projects';
COMMENT ON TABLE public.bid_item_pricing_scenarios IS 'Per-item pricing adjustments for each pricing scenario';
COMMENT ON VIEW public.v_bid_scenario_comparison IS 'Compare pricing across scenarios for each line item';
COMMENT ON VIEW public.v_bid_pricing_summary IS 'Summary of pricing scenarios with totals';
