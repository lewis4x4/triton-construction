-- ============================================================================
-- MIGRATION 107: BID INTELLIGENCE PRICING ENGINE
-- Connects line items to master WVDOH items and enables AI cost adjustments
-- ============================================================================

-- ============================================================================
-- 1. ADD FK COLUMNS TO BID_LINE_ITEMS
-- Links extracted items to master WVDOH items for assembly lookup
-- ============================================================================

-- Add normalized WVDOH item code (e.g., '203101' format)
ALTER TABLE public.bid_line_items
ADD COLUMN IF NOT EXISTS wvdoh_item_code TEXT;

-- Add FK to master_wvdoh_items (using item_code as text match)
ALTER TABLE public.bid_line_items
ADD COLUMN IF NOT EXISTS matched_master_item_id UUID;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bid_line_items_wvdoh_code
ON public.bid_line_items(wvdoh_item_code);

CREATE INDEX IF NOT EXISTS idx_bid_line_items_master_item
ON public.bid_line_items(matched_master_item_id);

COMMENT ON COLUMN public.bid_line_items.wvdoh_item_code IS 'Normalized WVDOH item code (e.g., 203101) for matching to master items';
COMMENT ON COLUMN public.bid_line_items.matched_master_item_id IS 'FK to master_wvdoh_items for assembly template lookup';

-- ============================================================================
-- 2. ADD DEFAULT ASSEMBLY TEMPLATE FK TO MASTER ITEMS
-- Links each master item to its default cost assembly
-- ============================================================================

ALTER TABLE public.master_wvdoh_items
ADD COLUMN IF NOT EXISTS default_assembly_template_id UUID REFERENCES public.bid_assembly_templates(id);

CREATE INDEX IF NOT EXISTS idx_master_items_default_assembly
ON public.master_wvdoh_items(default_assembly_template_id);

COMMENT ON COLUMN public.master_wvdoh_items.default_assembly_template_id IS 'Default assembly template for calculating base cost';

-- ============================================================================
-- 3. CREATE COST ADJUSTMENT FACTORS TABLE
-- Stores AI-extracted cost modifiers from document analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_cost_adjustment_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES public.bid_documents(id) ON DELETE SET NULL,

    -- What type of cost does this affect?
    factor_type TEXT NOT NULL CHECK (factor_type IN (
        'LABOR', 'EQUIPMENT', 'MATERIAL', 'SUBCONTRACTOR', 'OVERALL',
        'MOBILIZATION', 'CONTINGENCY', 'OVERHEAD', 'PROFIT'
    )),

    -- The adjustment percentage (+15 means add 15%, -10 means reduce 10%)
    percentage_modifier NUMERIC(8,2) NOT NULL,

    -- What conditions triggered this adjustment?
    condition_description TEXT NOT NULL,
    condition_category TEXT, -- e.g., 'NIGHT_WORK', 'ROCK_EXCAVATION', 'SEASONAL', 'ACCESS'

    -- Which items does this apply to? NULL = all items
    affected_item_codes TEXT[], -- e.g., ['203101', '203%', '6%']
    affected_work_categories TEXT[], -- e.g., ['EARTHWORK', 'DRAINAGE']

    -- Source text that triggered this adjustment
    source_text TEXT,
    source_page_number INTEGER,

    -- Confidence and review status
    ai_confidence_score NUMERIC(3,2), -- 0.00 to 1.00
    is_user_confirmed BOOLEAN DEFAULT FALSE,
    confirmed_by UUID REFERENCES public.user_profiles(id),
    confirmed_at TIMESTAMPTZ,

    -- User can override the percentage
    original_percentage NUMERIC(8,2), -- Stores original AI suggestion if modified
    modified_by UUID REFERENCES public.user_profiles(id),
    modified_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cost_adj_project
ON public.bid_cost_adjustment_factors(bid_project_id);

CREATE INDEX IF NOT EXISTS idx_cost_adj_document
ON public.bid_cost_adjustment_factors(source_document_id);

CREATE INDEX IF NOT EXISTS idx_cost_adj_type
ON public.bid_cost_adjustment_factors(factor_type);

CREATE INDEX IF NOT EXISTS idx_cost_adj_confirmed
ON public.bid_cost_adjustment_factors(bid_project_id, is_user_confirmed);

-- Enable RLS
ALTER TABLE public.bid_cost_adjustment_factors ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users see own org cost adjustments" ON public.bid_cost_adjustment_factors;
CREATE POLICY "Users see own org cost adjustments" ON public.bid_cost_adjustment_factors
    FOR SELECT USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

DROP POLICY IF EXISTS "Users manage own org cost adjustments" ON public.bid_cost_adjustment_factors;
CREATE POLICY "Users manage own org cost adjustments" ON public.bid_cost_adjustment_factors
    FOR ALL USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_cost_adjustment_factors_updated_at ON public.bid_cost_adjustment_factors;
CREATE TRIGGER bid_cost_adjustment_factors_updated_at
    BEFORE UPDATE ON public.bid_cost_adjustment_factors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.bid_cost_adjustment_factors IS 'AI-extracted cost adjustment factors from bid document analysis';

-- ============================================================================
-- 4. CREATE VIEW FOR AGGREGATED ADJUSTMENTS PER LINE ITEM
-- Calculates the total adjustment percentage for each line item
-- ============================================================================

CREATE OR REPLACE VIEW public.v_line_item_adjustments AS
SELECT
    li.id AS line_item_id,
    li.bid_project_id,
    li.item_number,
    li.wvdoh_item_code,
    li.work_category,
    li.base_unit_cost,

    -- Count of adjustments
    COUNT(caf.id) AS adjustment_count,

    -- Aggregate by factor type
    COALESCE(SUM(caf.percentage_modifier) FILTER (WHERE caf.factor_type = 'LABOR'), 0) AS labor_adjustment_pct,
    COALESCE(SUM(caf.percentage_modifier) FILTER (WHERE caf.factor_type = 'EQUIPMENT'), 0) AS equipment_adjustment_pct,
    COALESCE(SUM(caf.percentage_modifier) FILTER (WHERE caf.factor_type = 'MATERIAL'), 0) AS material_adjustment_pct,
    COALESCE(SUM(caf.percentage_modifier) FILTER (WHERE caf.factor_type = 'SUBCONTRACTOR'), 0) AS subcontractor_adjustment_pct,
    COALESCE(SUM(caf.percentage_modifier) FILTER (WHERE caf.factor_type = 'OVERALL'), 0) AS overall_adjustment_pct,

    -- Total adjustment percentage
    COALESCE(SUM(caf.percentage_modifier), 0) AS total_adjustment_pct,

    -- Calculated adjusted price
    CASE
        WHEN li.base_unit_cost IS NOT NULL THEN
            li.base_unit_cost * (1 + COALESCE(SUM(caf.percentage_modifier), 0) / 100.0)
        ELSE NULL
    END AS calculated_unit_price,

    -- Confidence indicator
    CASE
        WHEN COUNT(caf.id) = 0 THEN NULL
        ELSE AVG(caf.ai_confidence_score)
    END AS avg_confidence_score,

    -- Review status
    COUNT(caf.id) FILTER (WHERE NOT caf.is_user_confirmed) AS unconfirmed_count

FROM public.bid_line_items li
LEFT JOIN public.bid_cost_adjustment_factors caf ON (
    caf.bid_project_id = li.bid_project_id
    AND (
        -- Applies to all items
        (caf.affected_item_codes IS NULL AND caf.affected_work_categories IS NULL)
        -- Or matches specific item code
        OR li.wvdoh_item_code = ANY(caf.affected_item_codes)
        -- Or matches item code pattern (using LIKE for wildcards)
        OR EXISTS (
            SELECT 1 FROM UNNEST(caf.affected_item_codes) AS code
            WHERE code LIKE '%\%%' AND li.wvdoh_item_code LIKE REPLACE(code, '%', '') || '%'
        )
        -- Or matches work category
        OR li.work_category::TEXT = ANY(caf.affected_work_categories)
    )
)
GROUP BY li.id, li.bid_project_id, li.item_number, li.wvdoh_item_code, li.work_category, li.base_unit_cost;

COMMENT ON VIEW public.v_line_item_adjustments IS 'Aggregates all cost adjustment factors applicable to each line item';

-- ============================================================================
-- 5. CREATE FUNCTION TO RECALCULATE LINE ITEM PRICES
-- Called after adjustments change to update ai_suggested_unit_price
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_line_item_prices(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Update ai_suggested_unit_price based on base_unit_cost × adjustments
    UPDATE public.bid_line_items li
    SET
        ai_suggested_unit_price = adj.calculated_unit_price,
        updated_at = NOW()
    FROM public.v_line_item_adjustments adj
    WHERE li.id = adj.line_item_id
    AND li.bid_project_id = p_project_id
    AND li.base_unit_cost IS NOT NULL
    AND adj.calculated_unit_price IS NOT NULL
    AND (li.ai_suggested_unit_price IS NULL OR li.ai_suggested_unit_price != adj.calculated_unit_price);

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.recalculate_line_item_prices IS 'Recalculates ai_suggested_unit_price for all line items in a project based on adjustments';

-- ============================================================================
-- 6. CREATE TRIGGER TO AUTO-RECALCULATE PRICES
-- Fires when adjustment factors are added/modified/deleted
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_recalculate_prices()
RETURNS TRIGGER AS $$
DECLARE
    v_project_id UUID;
BEGIN
    -- Get the project ID
    IF TG_OP = 'DELETE' THEN
        v_project_id := OLD.bid_project_id;
    ELSE
        v_project_id := NEW.bid_project_id;
    END IF;

    -- Recalculate prices for affected project
    PERFORM public.recalculate_line_item_prices(v_project_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recalculate_prices ON public.bid_cost_adjustment_factors;
CREATE TRIGGER trg_recalculate_prices
    AFTER INSERT OR UPDATE OR DELETE ON public.bid_cost_adjustment_factors
    FOR EACH ROW EXECUTE FUNCTION public.trigger_recalculate_prices();

-- ============================================================================
-- 7. CREATE SUMMARY VIEW FOR PROJECT PRICING STATUS
-- Shows pricing completeness for bid projects
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_pricing_summary AS
SELECT
    bp.id AS bid_project_id,
    bp.project_name AS project_name,
    bp.letting_date,

    -- Line item counts
    COUNT(li.id) AS total_items,
    COUNT(li.id) FILTER (WHERE li.base_unit_cost IS NOT NULL) AS items_with_base_cost,
    COUNT(li.id) FILTER (WHERE li.ai_suggested_unit_price IS NOT NULL) AS items_with_ai_price,
    COUNT(li.id) FILTER (WHERE li.final_unit_price IS NOT NULL) AS items_with_final_price,
    COUNT(li.id) FILTER (WHERE li.pricing_reviewed = TRUE) AS items_reviewed,

    -- Completion percentages
    CASE
        WHEN COUNT(li.id) > 0 THEN
            ROUND((COUNT(li.id) FILTER (WHERE li.final_unit_price IS NOT NULL)::NUMERIC / COUNT(li.id) * 100), 1)
        ELSE 0
    END AS pricing_completion_pct,

    -- Cost adjustment summary
    (
        SELECT COUNT(*)
        FROM public.bid_cost_adjustment_factors caf
        WHERE caf.bid_project_id = bp.id
    ) AS total_adjustments,
    (
        SELECT COUNT(*)
        FROM public.bid_cost_adjustment_factors caf
        WHERE caf.bid_project_id = bp.id AND NOT caf.is_user_confirmed
    ) AS unconfirmed_adjustments,

    -- Totals
    COALESCE(SUM(li.final_extended_price), 0) AS total_bid_amount,
    COALESCE(SUM(li.base_extended_cost), 0) AS total_base_cost

FROM public.bid_projects bp
LEFT JOIN public.bid_line_items li ON li.bid_project_id = bp.id
GROUP BY bp.id, bp.project_name, bp.letting_date;

COMMENT ON VIEW public.v_bid_pricing_summary IS 'Summary of pricing status for each bid project';

-- ============================================================================
-- 8. HELPER FUNCTION: NORMALIZE ITEM NUMBER FROM EBSX FORMAT
-- Converts "201001-000" to "201001" for matching to master items
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_wvdoh_item_number(p_item_number TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Handle EBSX format: "201001-000" -> "201001"
    IF p_item_number ~ '^\d{6}-\d{3}$' THEN
        RETURN SUBSTRING(p_item_number FROM 1 FOR 6);
    END IF;

    -- Handle dot format: "201.001" -> "201001"
    IF p_item_number ~ '^\d{3}\.\d{3}$' THEN
        RETURN REPLACE(p_item_number, '.', '');
    END IF;

    -- Handle short format: "203.01" -> "203010" (pad with zero)
    IF p_item_number ~ '^\d{3}\.\d{2}$' THEN
        RETURN REPLACE(p_item_number, '.', '') || '0';
    END IF;

    -- Remove any dashes or dots for simple cleanup
    RETURN REGEXP_REPLACE(p_item_number, '[.-]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.normalize_wvdoh_item_number IS 'Normalizes various WVDOH item number formats to standard 6-digit code';

-- ============================================================================
-- 9. FUNCTION: APPLY DEFAULT ASSEMBLY TO LINE ITEM
-- Calculates base cost from assembly template
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_assembly_to_line_item(
    p_line_item_id UUID,
    p_assembly_template_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_line_item RECORD;
    v_assembly RECORD;
    v_result JSONB;
    v_overhead_pct NUMERIC := 15.0;
    v_profit_pct NUMERIC := 10.0;
    v_base_unit_cost NUMERIC;
BEGIN
    -- Get line item
    SELECT * INTO v_line_item FROM public.bid_line_items WHERE id = p_line_item_id;

    IF v_line_item IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Line item not found');
    END IF;

    -- Find assembly template
    IF p_assembly_template_id IS NULL THEN
        -- Try to find via master item
        SELECT bat.* INTO v_assembly
        FROM public.master_wvdoh_items mwi
        JOIN public.bid_assembly_templates bat ON bat.id = mwi.default_assembly_template_id
        WHERE mwi.item_code = v_line_item.wvdoh_item_code
        AND bat.is_active = TRUE;

        IF v_assembly IS NULL THEN
            -- Try matching by item number pattern
            SELECT bat.* INTO v_assembly
            FROM public.bid_assembly_templates bat
            WHERE bat.wvdoh_item_number = v_line_item.wvdoh_item_code
            AND bat.is_active = TRUE
            LIMIT 1;
        END IF;
    ELSE
        SELECT * INTO v_assembly
        FROM public.bid_assembly_templates
        WHERE id = p_assembly_template_id;
    END IF;

    IF v_assembly IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No assembly template found');
    END IF;

    -- Calculate base cost from assembly totals
    v_base_unit_cost := COALESCE(v_assembly.total_cost_per_unit, 0) * (1 + v_overhead_pct/100 + v_profit_pct/100);

    -- Update line item
    UPDATE public.bid_line_items
    SET
        base_unit_cost = v_base_unit_cost,
        unit_cost_breakdown = jsonb_build_object(
            'labor', COALESCE(v_assembly.total_labor_cost_per_unit, 0),
            'equipment', COALESCE(v_assembly.total_equipment_cost_per_unit, 0),
            'material', COALESCE(v_assembly.total_material_cost_per_unit, 0),
            'subcontractor', COALESCE(v_assembly.total_sub_cost_per_unit, 0),
            'direct_cost', COALESCE(v_assembly.total_cost_per_unit, 0),
            'overhead_pct', v_overhead_pct,
            'profit_pct', v_profit_pct,
            'base_unit_cost', v_base_unit_cost,
            'assembly_template_id', v_assembly.id,
            'assembly_template_name', v_assembly.name
        ),
        overhead_pct = v_overhead_pct,
        profit_pct = v_profit_pct,
        updated_at = NOW()
    WHERE id = p_line_item_id;

    -- Update usage stats on template
    UPDATE public.bid_assembly_templates
    SET times_used = times_used + 1, last_used_at = NOW()
    WHERE id = v_assembly.id;

    RETURN jsonb_build_object(
        'success', true,
        'base_unit_cost', v_base_unit_cost,
        'assembly_template_id', v_assembly.id,
        'assembly_template_name', v_assembly.name
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.apply_assembly_to_line_item IS 'Applies an assembly template to calculate base unit cost for a line item';

-- ============================================================================
-- 10. FUNCTION: MATCH LINE ITEMS TO MASTER ITEMS
-- Updates wvdoh_item_code based on item_number
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_line_items_to_master(p_project_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Update line items with normalized WVDOH codes
    UPDATE public.bid_line_items li
    SET
        wvdoh_item_code = public.normalize_wvdoh_item_number(li.item_number),
        updated_at = NOW()
    WHERE li.bid_project_id = p_project_id
    AND li.wvdoh_item_code IS NULL;

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.match_line_items_to_master IS 'Normalizes item numbers and matches line items to master WVDOH items';

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.bid_cost_adjustment_factors IS
'Stores AI-extracted and user-defined cost adjustment factors that modify base prices.
Each factor has a percentage modifier (+15 means add 15% to cost) and can target specific
items by code, pattern, or work category. The v_line_item_adjustments view aggregates all
applicable factors for each line item.';
