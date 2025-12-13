-- ============================================================================
-- Migration 112: Populate Prices from WVDOH Item Master
-- ============================================================================
-- PURPOSE: Create function to lookup and populate prices from wvdoh_item_master
-- This fixes the issue where bid_line_items have no prices because the lookup
-- was using master_wvdoh_items (wrong table) instead of wvdoh_item_master
-- ============================================================================

-- ============================================================================
-- 1. CREATE FUNCTION TO POPULATE PRICES FOR A PROJECT
-- ============================================================================
CREATE OR REPLACE FUNCTION public.populate_line_item_prices_from_master(p_project_id UUID DEFAULT NULL)
RETURNS TABLE(
    updated_count INTEGER,
    matched_count INTEGER,
    unmatched_count INTEGER
) AS $$
DECLARE
    v_updated INTEGER := 0;
    v_matched INTEGER := 0;
    v_unmatched INTEGER := 0;
BEGIN
    -- Update bid_line_items with prices from wvdoh_item_master
    -- Match on normalized item number
    WITH price_updates AS (
        UPDATE public.bid_line_items li
        SET
            base_unit_cost = COALESCE(li.base_unit_cost, wm.base_unit_price),
            ai_suggested_unit_price = COALESCE(li.ai_suggested_unit_price, wm.base_unit_price),
            final_unit_price = COALESCE(li.final_unit_price, wm.base_unit_price),
            final_extended_price = COALESCE(li.final_extended_price, li.quantity * wm.base_unit_price),
            updated_at = NOW()
        FROM public.wvdoh_item_master wm
        WHERE
            (p_project_id IS NULL OR li.bid_project_id = p_project_id)
            AND (
                -- Match on normalized item number
                public.normalize_item_number(li.item_number) = wm.item_number_normalized
                -- OR match directly
                OR li.item_number = wm.item_number_normalized
                OR li.item_number = wm.item_number
            )
            -- Only update items that don't have a price yet
            AND li.base_unit_cost IS NULL
        RETURNING li.id
    )
    SELECT COUNT(*)::INTEGER INTO v_updated FROM price_updates;

    -- Count matched items (have price now)
    SELECT COUNT(*)::INTEGER INTO v_matched
    FROM public.bid_line_items li
    WHERE (p_project_id IS NULL OR li.bid_project_id = p_project_id)
    AND li.base_unit_cost IS NOT NULL;

    -- Count unmatched items (still no price)
    SELECT COUNT(*)::INTEGER INTO v_unmatched
    FROM public.bid_line_items li
    WHERE (p_project_id IS NULL OR li.bid_project_id = p_project_id)
    AND li.base_unit_cost IS NULL;

    RETURN QUERY SELECT v_updated, v_matched, v_unmatched;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.populate_line_item_prices_from_master IS
'Populates bid_line_items prices from wvdoh_item_master by matching normalized item numbers.
Pass NULL for p_project_id to update all projects.';

-- ============================================================================
-- 2. CREATE FUNCTION TO GET PRICE FOR A SINGLE ITEM
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_wvdoh_item_price(p_item_number TEXT)
RETURNS NUMERIC AS $$
DECLARE
    v_price NUMERIC;
    v_normalized TEXT;
BEGIN
    v_normalized := public.normalize_item_number(p_item_number);

    -- Try to find matching price
    SELECT wm.base_unit_price INTO v_price
    FROM public.wvdoh_item_master wm
    WHERE wm.item_number_normalized = v_normalized
       OR wm.item_number = p_item_number
       OR wm.item_number_normalized = p_item_number
    LIMIT 1;

    RETURN v_price;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.get_wvdoh_item_price IS
'Returns the base unit price from wvdoh_item_master for a given item number';

-- ============================================================================
-- 3. CREATE TRIGGER TO AUTO-POPULATE PRICES ON NEW LINE ITEMS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.auto_populate_line_item_price()
RETURNS TRIGGER AS $$
DECLARE
    v_price NUMERIC;
BEGIN
    -- Only populate if no price is set
    IF NEW.base_unit_cost IS NULL THEN
        v_price := public.get_wvdoh_item_price(NEW.item_number);

        IF v_price IS NOT NULL THEN
            NEW.base_unit_cost := v_price;
            NEW.ai_suggested_unit_price := COALESCE(NEW.ai_suggested_unit_price, v_price);
            NEW.final_unit_price := COALESCE(NEW.final_unit_price, v_price);
            NEW.final_extended_price := COALESCE(NEW.final_extended_price, NEW.quantity * v_price);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_auto_populate_line_item_price ON public.bid_line_items;
CREATE TRIGGER trg_auto_populate_line_item_price
    BEFORE INSERT ON public.bid_line_items
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_populate_line_item_price();

COMMENT ON FUNCTION public.auto_populate_line_item_price IS
'Trigger function that auto-populates prices from wvdoh_item_master when line items are inserted';

-- ============================================================================
-- 4. POPULATE EXISTING LINE ITEMS WITH PRICES
-- ============================================================================
-- Run the population function for all existing line items
DO $$
DECLARE
    v_result RECORD;
BEGIN
    SELECT * INTO v_result FROM public.populate_line_item_prices_from_master(NULL);
    RAISE NOTICE 'Price population complete. Updated: %, Matched: %, Unmatched: %',
        v_result.updated_count, v_result.matched_count, v_result.unmatched_count;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration:
-- 1. Creates populate_line_item_prices_from_master() function to bulk update prices
-- 2. Creates get_wvdoh_item_price() function for single item lookups
-- 3. Creates a trigger to auto-populate prices on new line items
-- 4. Runs the population function on all existing line items
-- ============================================================================
