-- ============================================================================
-- Migration 134: Fix get_ai_suggested_price to Check historical_bid_pricing
-- ============================================================================
-- PURPOSE: The function was updated in migration 111 to only check bid_line_items.
-- This fix adds back the historical_bid_pricing lookup which is needed for:
-- 1. Demo bid pricing (seed data from JASON TAKEOFF)
-- 2. Future pricing imports from Excel
-- ============================================================================

-- Drop ALL existing versions of the function to avoid signature conflicts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT p.oid::regprocedure AS func_signature
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'get_ai_suggested_price'
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_signature || ' CASCADE';
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_ai_suggested_price(
  p_organization_id UUID,
  p_item_number TEXT,
  p_quantity NUMERIC DEFAULT NULL,
  p_county TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_normalized TEXT;
  v_base_number TEXT;
  v_historical_price NUMERIC;
  v_seeded_price NUMERIC;
  v_base_price NUMERIC;
  v_confidence NUMERIC;
  v_source TEXT;
BEGIN
  -- Normalize the input item number
  v_normalized := public.normalize_item_number(p_item_number);

  -- Also try extracting base item number (strip -Lxxx suffix)
  v_base_number := REGEXP_REPLACE(p_item_number, '-[Ll]\d+$', '');
  v_base_number := public.normalize_item_number(v_base_number);

  -- PRIORITY 1: Check historical_bid_pricing table (seeded pricing data)
  -- This is where demo pricing and imported Excel pricing lives
  SELECT
    SUM(hp.unit_price * hp.confidence_weight) / NULLIF(SUM(hp.confidence_weight), 0)
  INTO v_seeded_price
  FROM public.historical_bid_pricing hp
  WHERE hp.organization_id = p_organization_id
    AND (
      hp.item_number_normalized = v_normalized
      OR hp.item_number_normalized = v_base_number
    );

  IF v_seeded_price IS NOT NULL AND v_seeded_price > 0 THEN
    v_source := 'historical';
    v_confidence := 0.95;  -- High confidence for seeded data

    RETURN jsonb_build_object(
      'found', true,
      'suggested_price', ROUND(v_seeded_price::NUMERIC, 2),
      'source', v_source,
      'confidence', v_confidence,
      'normalized_item', v_normalized,
      'base_item', v_base_number
    );
  END IF;

  -- PRIORITY 2: Check bid_line_items from past submitted bids
  SELECT AVG(final_unit_price)::NUMERIC(12,2)
  INTO v_historical_price
  FROM public.bid_line_items bli
  JOIN public.bid_projects bp ON bli.bid_project_id = bp.id
  WHERE bp.organization_id = p_organization_id
    AND (
      public.normalize_item_number(bli.item_number) = v_normalized
      OR public.normalize_item_number(bli.item_number) = v_base_number
    )
    AND bli.final_unit_price IS NOT NULL
    AND bli.final_unit_price > 0
    AND bp.status IN ('WON', 'LOST', 'SUBMITTED');

  IF v_historical_price IS NOT NULL THEN
    v_source := 'bid_history';
    v_confidence := 0.85;

    RETURN jsonb_build_object(
      'found', true,
      'suggested_price', v_historical_price,
      'source', v_source,
      'confidence', v_confidence,
      'normalized_item', v_normalized,
      'base_item', v_base_number
    );
  END IF;

  -- PRIORITY 3: Check wvdoh_item_master base pricing
  SELECT base_unit_price
  INTO v_base_price
  FROM public.wvdoh_item_master
  WHERE item_number_normalized = v_normalized
    AND base_unit_price IS NOT NULL
    AND base_unit_price > 0
  LIMIT 1;

  -- If no match, try with base number (without -Lxxx suffix)
  IF v_base_price IS NULL AND v_base_number != v_normalized THEN
    SELECT base_unit_price
    INTO v_base_price
    FROM public.wvdoh_item_master
    WHERE item_number_normalized = v_base_number
      AND base_unit_price IS NOT NULL
      AND base_unit_price > 0
    LIMIT 1;
  END IF;

  IF v_base_price IS NOT NULL THEN
    v_source := 'base_price';
    v_confidence := 0.70;

    RETURN jsonb_build_object(
      'found', true,
      'suggested_price', v_base_price,
      'source', v_source,
      'confidence', v_confidence,
      'normalized_item', v_normalized,
      'base_item', v_base_number
    );
  END IF;

  -- No pricing found
  RETURN jsonb_build_object(
    'found', false,
    'suggested_price', NULL,
    'source', NULL,
    'confidence', 0,
    'normalized_item', v_normalized,
    'base_item', v_base_number
  );
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_ai_suggested_price IS
  'Returns AI-suggested pricing for a line item. Checks: 1) historical_bid_pricing (seeded/imported), 2) past bid_line_items, 3) wvdoh_item_master base prices. Handles variant suffixes (-Lxxx) by falling back to base item pricing.';

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration fixes get_ai_suggested_price to check historical_bid_pricing
-- BEFORE checking bid_line_items. This is needed for demo pricing and future
-- Excel imports. Priority order:
-- 1. historical_bid_pricing (seeded data, Excel imports) - confidence 0.95
-- 2. bid_line_items from past bids - confidence 0.85
-- 3. wvdoh_item_master base prices - confidence 0.70
-- ============================================================================
