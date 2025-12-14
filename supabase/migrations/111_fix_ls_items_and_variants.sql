-- ============================================================================
-- Migration 111: Fix Lump Sum Items and Variant Suffix Handling
-- ============================================================================
-- PURPOSE:
-- 1. Update LS items from $0.00 to reasonable demo prices
-- 2. Improve get_ai_suggested_price to handle variant suffixes (-Lxxx)
-- ============================================================================

-- ============================================================================
-- PART 1: Update Lump Sum items with reasonable demo prices
-- These were $0.00 which shows as "No Price" in the UI
-- ============================================================================

UPDATE public.wvdoh_item_master SET base_unit_price = 50000.00, notes = 'Lump sum - typically 5-10% of total bid'
WHERE item_number IN ('109.01', '109.10', '204.01') AND base_unit_price = 0;

UPDATE public.wvdoh_item_master SET base_unit_price = 15000.00, notes = 'Lump sum clearing - varies by site'
WHERE item_number = '201.10' AND base_unit_price = 0;

UPDATE public.wvdoh_item_master SET base_unit_price = 25000.00, notes = 'Lump sum staking'
WHERE item_number = '639.01' AND base_unit_price = 0;

UPDATE public.wvdoh_item_master SET base_unit_price = 75000.00, notes = 'Lump sum traffic control'
WHERE item_number IN ('636.10', '701.01') AND base_unit_price = 0;

UPDATE public.wvdoh_item_master SET base_unit_price = 5000.00, notes = 'Lump sum device cleaning'
WHERE item_number = '636.12' AND base_unit_price = 0;

UPDATE public.wvdoh_item_master SET base_unit_price = 25000.00, notes = 'Lump sum bridge cleaning'
WHERE item_number = '685.01' AND base_unit_price = 0;

UPDATE public.wvdoh_item_master SET base_unit_price = 8500.00, notes = 'Lump sum NBIS bridge inspection'
WHERE item_number = '697.01' AND base_unit_price = 0;

UPDATE public.wvdoh_item_master SET base_unit_price = 75000.00, notes = 'Lump sum jacking operation'
WHERE item_number = '615.39' AND base_unit_price = 0;

-- ============================================================================
-- PART 2: Improve get_ai_suggested_price to handle variant suffixes
-- Variants like 697.1-L270 should fall back to base item 697.1
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
  v_base_price NUMERIC;
  v_confidence NUMERIC;
  v_source TEXT;
BEGIN
  -- Normalize the input item number
  v_normalized := public.normalize_item_number(p_item_number);

  -- Also try extracting base item number (strip -Lxxx suffix)
  v_base_number := REGEXP_REPLACE(p_item_number, '-[Ll]\d+$', '');
  v_base_number := public.normalize_item_number(v_base_number);

  -- First, try to find historical pricing from past bids
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
    v_source := 'historical';
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

  -- Second, try to find base price from master items
  -- Try exact normalized match first
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
  'Returns AI-suggested pricing for a line item. Handles variant suffixes (-Lxxx) by falling back to base item pricing.';

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration:
-- 1. Updates LS items from $0.00 to reasonable demo prices
-- 2. Improves get_ai_suggested_price to handle variant items (-Lxxx suffixes)
--    by falling back to base item pricing when exact match not found
-- ============================================================================
