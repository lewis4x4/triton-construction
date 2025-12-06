-- ============================================================================
-- MIGRATION 022: V4.1 ADDENDUM - AUDIT TABLES
-- Triton AI Bid Package Engine - Price change history and estimate snapshots
-- ============================================================================

-- ============================================================================
-- TABLE: bid_line_item_price_changes
-- Purpose: Fine-grained history of unit price and markup changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_line_item_price_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target
    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,

    -- Change Context
    pricing_scenario_id UUID REFERENCES public.bid_pricing_scenarios(id),  -- NULL = base price change

    -- User
    changed_by UUID REFERENCES public.user_profiles(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Price Changes
    old_unit_price NUMERIC(14, 4),
    new_unit_price NUMERIC(14, 4),
    old_base_unit_cost NUMERIC(14, 4),
    new_base_unit_cost NUMERIC(14, 4),

    -- Source Changes
    old_price_source price_source_enum,
    new_price_source price_source_enum,
    old_estimation_method estimation_method_enum,
    new_estimation_method estimation_method_enum,

    -- Markup Changes (JSON for flexibility)
    old_markups JSONB,                   -- {"contingency": 5.0, "overhead": 10.0, "profit": 8.0}
    new_markups JSONB,

    -- Quantity Changes (if applicable)
    old_quantity NUMERIC(18, 4),
    new_quantity NUMERIC(18, 4),

    -- Extended Value Changes
    old_extended NUMERIC(16, 4),
    new_extended NUMERIC(16, 4),

    -- Context
    change_reason TEXT,                  -- User-provided justification
    change_origin TEXT,                  -- 'USER_INTERFACE', 'AI_RECALC', 'IMPORT', 'SCENARIO_CHANGE', 'ASSEMBLY_UPDATE'

    -- Batch Tracking (for bulk updates)
    batch_id UUID,
    batch_description TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_price_changes_item ON public.bid_line_item_price_changes(line_item_id);
CREATE INDEX IF NOT EXISTS idx_price_changes_scenario ON public.bid_line_item_price_changes(pricing_scenario_id);
CREATE INDEX IF NOT EXISTS idx_price_changes_date ON public.bid_line_item_price_changes(changed_at);
CREATE INDEX IF NOT EXISTS idx_price_changes_user ON public.bid_line_item_price_changes(changed_by);
CREATE INDEX IF NOT EXISTS idx_price_changes_batch ON public.bid_line_item_price_changes(batch_id);

-- Enable RLS
ALTER TABLE public.bid_line_item_price_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see price changes" ON public.bid_line_item_price_changes;
CREATE POLICY "Users see price changes" ON public.bid_line_item_price_changes
    FOR SELECT USING (
        line_item_id IN (
            SELECT bli.id FROM public.bid_line_items bli
            JOIN public.bid_projects bp ON bli.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Insert-only policy (no updates/deletes on audit trail)
DROP POLICY IF EXISTS "Users insert price changes" ON public.bid_line_item_price_changes;
CREATE POLICY "Users insert price changes" ON public.bid_line_item_price_changes
    FOR INSERT WITH CHECK (
        line_item_id IN (
            SELECT bli.id FROM public.bid_line_items bli
            JOIN public.bid_projects bp ON bli.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- TABLE: bid_estimate_versions
-- Purpose: Snapshot header for estimate versioning
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_estimate_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent Project
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Version Identity
    version_number INTEGER NOT NULL,
    version_name TEXT NOT NULL,          -- "Initial Import", "Post-Prebid", "Final Submission"
    description TEXT,

    -- Trigger Context
    trigger_event TEXT,                  -- 'MANUAL', 'PRE_SUBMISSION', 'ADDENDUM_RECEIVED', 'MILESTONE'
    trigger_notes TEXT,

    -- Snapshot Totals
    total_items INTEGER,
    total_base_cost NUMERIC(16, 4),
    total_with_markups NUMERIC(16, 4),
    effective_margin_pct NUMERIC(5, 2),

    -- Pricing Scenario Reference
    pricing_scenario_id UUID REFERENCES public.bid_pricing_scenarios(id),
    scenario_name TEXT,

    -- Summary Stats (denormalized)
    items_with_assembly INTEGER,
    items_with_subquote INTEGER,
    items_manual_priced INTEGER,
    high_risk_items INTEGER,

    -- Full Snapshot Data (JSON backup)
    snapshot_data JSONB,

    -- Status
    is_current BOOLEAN DEFAULT FALSE,
    is_submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),

    CONSTRAINT unique_version_number UNIQUE (bid_project_id, version_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_estimate_versions_project ON public.bid_estimate_versions(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_estimate_versions_current ON public.bid_estimate_versions(bid_project_id, is_current) WHERE is_current = TRUE;

-- Enable RLS
ALTER TABLE public.bid_estimate_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see estimate versions" ON public.bid_estimate_versions;
CREATE POLICY "Users see estimate versions" ON public.bid_estimate_versions
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- TABLE: bid_estimate_version_items
-- Purpose: Capture per-item values at each estimate version snapshot
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_estimate_version_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parents
    estimate_version_id UUID NOT NULL REFERENCES public.bid_estimate_versions(id) ON DELETE CASCADE,
    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id),

    -- Snapshot of Key Values
    item_number TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity NUMERIC(18, 4) NOT NULL,
    unit TEXT NOT NULL,

    -- Pricing Snapshot
    base_unit_cost NUMERIC(14, 4),
    unit_price NUMERIC(14, 4),
    extended_price NUMERIC(16, 4),

    -- Cost Breakdown
    labor_cost NUMERIC(14, 4),
    equipment_cost NUMERIC(14, 4),
    material_cost NUMERIC(14, 4),
    sub_cost NUMERIC(14, 4),

    -- Markup Snapshot
    contingency_pct NUMERIC(5, 2),
    overhead_pct NUMERIC(5, 2),
    profit_pct NUMERIC(5, 2),

    -- Attribution Snapshot
    estimation_method estimation_method_enum,
    price_source price_source_enum,
    assembly_template_name TEXT,

    -- Risk Snapshot
    risk_level severity_enum,
    risk_notes TEXT,
    linked_risk_count INTEGER,

    -- Categorization Snapshot
    work_category work_category_enum,
    work_package_name TEXT,
    structure_name TEXT,

    -- BoE Notes
    boe_comments TEXT,                   -- Basis of Estimate notes for this item
    key_assumptions TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_version_item UNIQUE (estimate_version_id, line_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_version_items_version ON public.bid_estimate_version_items(estimate_version_id);
CREATE INDEX IF NOT EXISTS idx_version_items_item ON public.bid_estimate_version_items(line_item_id);

-- Enable RLS
ALTER TABLE public.bid_estimate_version_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see version items" ON public.bid_estimate_version_items;
CREATE POLICY "Users see version items" ON public.bid_estimate_version_items
    FOR SELECT USING (
        estimate_version_id IN (
            SELECT ev.id FROM public.bid_estimate_versions ev
            JOIN public.bid_projects bp ON ev.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- TRIGGER: Track price changes automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION public.track_price_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only track if relevant fields changed
    IF (OLD.base_unit_cost IS DISTINCT FROM NEW.base_unit_cost) OR
       (OLD.ai_suggested_unit_price IS DISTINCT FROM NEW.ai_suggested_unit_price) OR
       (OLD.final_unit_price IS DISTINCT FROM NEW.final_unit_price) OR
       (OLD.price_source IS DISTINCT FROM NEW.price_source) OR
       (OLD.estimation_method IS DISTINCT FROM NEW.estimation_method) OR
       (OLD.quantity IS DISTINCT FROM NEW.quantity) THEN

        INSERT INTO public.bid_line_item_price_changes (
            line_item_id,
            changed_by,
            old_base_unit_cost, new_base_unit_cost,
            old_unit_price, new_unit_price,
            old_price_source, new_price_source,
            old_estimation_method, new_estimation_method,
            old_quantity, new_quantity,
            old_extended, new_extended,
            change_origin
        ) VALUES (
            NEW.id,
            auth.uid(),
            OLD.base_unit_cost, NEW.base_unit_cost,
            COALESCE(OLD.final_unit_price, OLD.ai_suggested_unit_price),
            COALESCE(NEW.final_unit_price, NEW.ai_suggested_unit_price),
            OLD.price_source, NEW.price_source,
            OLD.estimation_method, NEW.estimation_method,
            OLD.quantity, NEW.quantity,
            OLD.final_extended_price, NEW.final_extended_price,
            'USER_INTERFACE'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger
DROP TRIGGER IF EXISTS trg_track_price_changes ON public.bid_line_items;
CREATE TRIGGER trg_track_price_changes
    AFTER UPDATE ON public.bid_line_items
    FOR EACH ROW EXECUTE FUNCTION public.track_price_change();

-- ============================================================================
-- HELPER FUNCTION: Create full estimate snapshot
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_estimate_snapshot(
    p_bid_project_id UUID,
    p_version_name TEXT,
    p_trigger_event TEXT DEFAULT 'MANUAL',
    p_description TEXT DEFAULT NULL,
    p_pricing_scenario_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_version_id UUID;
    v_version_number INTEGER;
    v_scenario RECORD;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
    FROM public.bid_estimate_versions
    WHERE bid_project_id = p_bid_project_id;

    -- Get scenario info if provided
    IF p_pricing_scenario_id IS NOT NULL THEN
        SELECT name, total_base_cost, total_with_markups, effective_margin_pct
        INTO v_scenario
        FROM public.bid_pricing_scenarios
        WHERE id = p_pricing_scenario_id;
    END IF;

    -- Mark previous current as not current
    UPDATE public.bid_estimate_versions
    SET is_current = FALSE
    WHERE bid_project_id = p_bid_project_id AND is_current = TRUE;

    -- Create version record
    INSERT INTO public.bid_estimate_versions (
        bid_project_id,
        version_number,
        version_name,
        description,
        trigger_event,
        pricing_scenario_id,
        scenario_name,
        is_current,
        created_by
    ) VALUES (
        p_bid_project_id,
        v_version_number,
        p_version_name,
        p_description,
        p_trigger_event,
        p_pricing_scenario_id,
        v_scenario.name,
        TRUE,
        auth.uid()
    )
    RETURNING id INTO v_version_id;

    -- Capture per-item snapshots
    INSERT INTO public.bid_estimate_version_items (
        estimate_version_id,
        line_item_id,
        item_number,
        description,
        quantity,
        unit,
        base_unit_cost,
        unit_price,
        extended_price,
        labor_cost,
        equipment_cost,
        material_cost,
        sub_cost,
        contingency_pct,
        overhead_pct,
        profit_pct,
        estimation_method,
        price_source,
        risk_level,
        work_category
    )
    SELECT
        v_version_id,
        bli.id,
        bli.item_number,
        bli.description,
        bli.quantity,
        bli.unit,
        bli.base_unit_cost,
        COALESCE(bli.final_unit_price, bli.ai_suggested_unit_price),
        bli.final_extended_price,
        (bli.unit_cost_breakdown->>'labor')::NUMERIC,
        (bli.unit_cost_breakdown->>'equipment')::NUMERIC,
        (bli.unit_cost_breakdown->>'material')::NUMERIC,
        (bli.unit_cost_breakdown->>'sub')::NUMERIC,
        bli.contingency_pct,
        bli.overhead_pct,
        bli.profit_pct,
        bli.estimation_method,
        bli.price_source,
        bli.risk_level,
        bli.work_category
    FROM public.bid_line_items bli
    WHERE bli.bid_project_id = p_bid_project_id;

    -- Update version with summary totals
    UPDATE public.bid_estimate_versions SET
        total_items = (
            SELECT COUNT(*) FROM public.bid_estimate_version_items
            WHERE estimate_version_id = v_version_id
        ),
        total_base_cost = (
            SELECT COALESCE(SUM(base_unit_cost * quantity), 0)
            FROM public.bid_estimate_version_items
            WHERE estimate_version_id = v_version_id
        ),
        total_with_markups = (
            SELECT COALESCE(SUM(extended_price), 0)
            FROM public.bid_estimate_version_items
            WHERE estimate_version_id = v_version_id
        ),
        items_with_assembly = (
            SELECT COUNT(*) FROM public.bid_estimate_version_items
            WHERE estimate_version_id = v_version_id
            AND estimation_method = 'ASSEMBLY_BASED'
        ),
        items_with_subquote = (
            SELECT COUNT(*) FROM public.bid_estimate_version_items
            WHERE estimate_version_id = v_version_id
            AND estimation_method = 'SUBQUOTE'
        ),
        items_manual_priced = (
            SELECT COUNT(*) FROM public.bid_estimate_version_items
            WHERE estimate_version_id = v_version_id
            AND estimation_method = 'MANUAL_ESTIMATOR_JUDGMENT'
        ),
        high_risk_items = (
            SELECT COUNT(*) FROM public.bid_estimate_version_items
            WHERE estimate_version_id = v_version_id
            AND risk_level IN ('HIGH', 'CRITICAL')
        )
    WHERE id = v_version_id;

    -- Calculate effective margin
    UPDATE public.bid_estimate_versions SET
        effective_margin_pct = CASE
            WHEN total_base_cost > 0 THEN
                ((total_with_markups - total_base_cost) / total_base_cost) * 100
            ELSE 0
        END
    WHERE id = v_version_id;

    RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEW: Price change history summary
-- ============================================================================
CREATE OR REPLACE VIEW public.v_bid_price_change_history AS
SELECT
    pc.line_item_id,
    bli.item_number,
    bli.description,
    pc.changed_at,
    up.email AS changed_by_email,
    pc.old_unit_price,
    pc.new_unit_price,
    pc.new_unit_price - COALESCE(pc.old_unit_price, 0) AS price_delta,
    CASE WHEN pc.old_unit_price > 0 THEN
        ((pc.new_unit_price - pc.old_unit_price) / pc.old_unit_price) * 100
    ELSE 0 END AS price_change_pct,
    pc.change_reason,
    pc.change_origin,
    pc.old_estimation_method,
    pc.new_estimation_method
FROM public.bid_line_item_price_changes pc
JOIN public.bid_line_items bli ON pc.line_item_id = bli.id
LEFT JOIN public.user_profiles up ON pc.changed_by = up.id
ORDER BY pc.changed_at DESC;

-- ============================================================================
-- VIEW: Estimate version comparison
-- ============================================================================
CREATE OR REPLACE VIEW public.v_bid_version_comparison AS
SELECT
    ev.bid_project_id,
    ev.version_number,
    ev.version_name,
    ev.trigger_event,
    ev.created_at,
    ev.total_items,
    ev.total_base_cost,
    ev.total_with_markups,
    ev.effective_margin_pct,
    ev.is_current,
    -- Comparison to previous version
    LAG(ev.total_with_markups) OVER (PARTITION BY ev.bid_project_id ORDER BY ev.version_number) AS prev_total,
    ev.total_with_markups - COALESCE(
        LAG(ev.total_with_markups) OVER (PARTITION BY ev.bid_project_id ORDER BY ev.version_number),
        0
    ) AS delta_from_previous
FROM public.bid_estimate_versions ev
ORDER BY ev.bid_project_id, ev.version_number;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.bid_line_item_price_changes IS 'Audit trail of all pricing changes to bid line items';
COMMENT ON TABLE public.bid_estimate_versions IS 'Snapshot headers for estimate versioning';
COMMENT ON TABLE public.bid_estimate_version_items IS 'Per-item snapshots at each estimate version';
COMMENT ON FUNCTION public.create_estimate_snapshot IS 'Create a full estimate snapshot with per-item details';
COMMENT ON VIEW public.v_bid_price_change_history IS 'Human-readable price change history';
COMMENT ON VIEW public.v_bid_version_comparison IS 'Compare estimate versions with deltas';
