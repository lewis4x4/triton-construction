-- ============================================================================
-- MIGRATION 016: V4.1 ADDENDUM - ALTER LINE ITEMS
-- Triton AI Bid Package Engine - Add pricing/estimation fields to bid_line_items
-- ============================================================================

-- ============================================================================
-- ALTER TABLE: bid_line_items — Add pricing/estimation fields
-- ============================================================================

-- Estimation method
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    estimation_method estimation_method_enum DEFAULT 'ASSEMBLY_BASED';

-- Base unit cost (direct cost only, no markups)
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    base_unit_cost NUMERIC(14, 4);

-- AI suggested unit price (full price including markups)
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    ai_suggested_unit_price NUMERIC(14, 4);

-- Final unit price (after estimator review)
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    final_unit_price NUMERIC(14, 4);

-- Unit cost breakdown snapshot
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    unit_cost_breakdown JSONB;
-- Example: {"labor": 45.00, "equipment": 30.00, "material": 25.00, "sub": 0}

-- Review priority score (impact × uncertainty for sorting)
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    review_priority_score NUMERIC(5, 2);

-- Price source tracking
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    price_source price_source_enum;

-- Markup percentages
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    contingency_pct NUMERIC(5, 2);

ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    overhead_pct NUMERIC(5, 2);

ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    profit_pct NUMERIC(5, 2);

-- Extended prices (calculated)
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    base_extended_cost NUMERIC(16, 4);

ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    final_extended_price NUMERIC(16, 4);

-- Subcontractor quote reference
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    subcontractor_quote_id UUID;

ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    subcontractor_name TEXT;

-- Historical reference
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    historical_project_id UUID;

ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    historical_item_id UUID;

ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    historical_unit_price NUMERIC(14, 4);

-- Estimator notes
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    estimator_notes TEXT;

ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    pricing_assumptions TEXT;

-- Review tracking
ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    pricing_reviewed BOOLEAN DEFAULT FALSE;

ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    pricing_reviewed_by UUID REFERENCES public.user_profiles(id);

ALTER TABLE public.bid_line_items ADD COLUMN IF NOT EXISTS
    pricing_reviewed_at TIMESTAMPTZ;

-- ============================================================================
-- INDEX for review priority sorting
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bid_line_items_priority
    ON public.bid_line_items(bid_project_id, review_priority_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_bid_line_items_estimation_method
    ON public.bid_line_items(estimation_method);

CREATE INDEX IF NOT EXISTS idx_bid_line_items_price_source
    ON public.bid_line_items(price_source);

CREATE INDEX IF NOT EXISTS idx_bid_line_items_unreviewed
    ON public.bid_line_items(bid_project_id, pricing_reviewed)
    WHERE pricing_reviewed = FALSE;

-- ============================================================================
-- HELPER FUNCTION: Calculate extended prices
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_line_item_extended()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate base extended cost
    IF NEW.base_unit_cost IS NOT NULL AND NEW.quantity IS NOT NULL THEN
        NEW.base_extended_cost := NEW.base_unit_cost * NEW.quantity;
    END IF;

    -- Calculate final extended price
    IF NEW.final_unit_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
        NEW.final_extended_price := NEW.final_unit_price * NEW.quantity;
    ELSIF NEW.ai_suggested_unit_price IS NOT NULL AND NEW.quantity IS NOT NULL THEN
        NEW.final_extended_price := NEW.ai_suggested_unit_price * NEW.quantity;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS trg_calculate_extended ON public.bid_line_items;
CREATE TRIGGER trg_calculate_extended
    BEFORE INSERT OR UPDATE OF base_unit_cost, final_unit_price, ai_suggested_unit_price, quantity
    ON public.bid_line_items
    FOR EACH ROW EXECUTE FUNCTION public.calculate_line_item_extended();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN public.bid_line_items.estimation_method IS 'Method used to determine price (assembly, subquote, historical, etc.)';
COMMENT ON COLUMN public.bid_line_items.base_unit_cost IS 'Direct cost per unit before markups';
COMMENT ON COLUMN public.bid_line_items.ai_suggested_unit_price IS 'AI-calculated full unit price including markups';
COMMENT ON COLUMN public.bid_line_items.final_unit_price IS 'Estimator-approved final unit price';
COMMENT ON COLUMN public.bid_line_items.unit_cost_breakdown IS 'JSON breakdown of cost components (labor, equipment, material, sub)';
COMMENT ON COLUMN public.bid_line_items.review_priority_score IS 'Priority score for review queue (higher = review first)';
