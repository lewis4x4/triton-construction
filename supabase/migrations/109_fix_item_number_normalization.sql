-- ============================================================================
-- Migration 109: Fix Item Number Normalization
-- ============================================================================
-- PURPOSE: Fix normalize_item_number function to properly match EBSX format
-- items like "201.001" to master items like "201.01"
-- ============================================================================

-- Drop and recreate the function with improved normalization
CREATE OR REPLACE FUNCTION public.normalize_item_number(p_item_number TEXT)
RETURNS TEXT AS $$
DECLARE
  v_normalized TEXT;
  v_parts TEXT[];
  v_section TEXT;
  v_item TEXT;
BEGIN
  IF p_item_number IS NULL THEN
    RETURN NULL;
  END IF;

  -- Remove leading/trailing whitespace
  v_normalized := TRIM(p_item_number);

  -- Convert to lowercase
  v_normalized := LOWER(v_normalized);

  -- Replace common separators with dots
  v_normalized := REPLACE(v_normalized, '-', '.');
  v_normalized := REPLACE(v_normalized, '_', '.');
  v_normalized := REPLACE(v_normalized, ' ', '.');

  -- Handle WVDOH format like "203001-000" -> "203.001" -> "203.1"
  IF v_normalized ~ '^\d{6}-?\d{3}$' THEN
    v_normalized := SUBSTRING(v_normalized FROM 1 FOR 3) || '.' ||
                    SUBSTRING(v_normalized FROM 4 FOR 3);
  END IF;

  -- Handle format like "201001000" (9 digits) -> "201.001.000" -> "201.1"
  IF v_normalized ~ '^\d{9}$' THEN
    v_normalized := SUBSTRING(v_normalized FROM 1 FOR 3) || '.' ||
                    SUBSTRING(v_normalized FROM 4 FOR 3) || '.' ||
                    SUBSTRING(v_normalized FROM 7 FOR 3);
  END IF;

  -- Handle format like "201001" (6 digits) -> "201.001" -> "201.1"
  IF v_normalized ~ '^\d{6}$' THEN
    v_normalized := SUBSTRING(v_normalized FROM 1 FOR 3) || '.' ||
                    SUBSTRING(v_normalized FROM 4 FOR 3);
  END IF;

  -- Remove multiple consecutive dots
  v_normalized := REGEXP_REPLACE(v_normalized, '\.+', '.', 'g');

  -- NEW: Normalize each part after the decimal to remove leading zeros
  -- This converts "201.001" to "201.1" and "203.01" to "203.1"
  IF v_normalized ~ '^\d+\.\d+' THEN
    v_parts := STRING_TO_ARRAY(v_normalized, '.');
    IF array_length(v_parts, 1) >= 2 THEN
      v_section := v_parts[1];
      -- Remove leading zeros from item number part
      v_item := LTRIM(v_parts[2], '0');
      -- If all zeros, keep at least one
      IF v_item = '' THEN
        v_item := '0';
      END IF;
      -- Handle third part if exists (like "201.01.01")
      IF array_length(v_parts, 1) >= 3 THEN
        DECLARE
          v_subitem TEXT;
        BEGIN
          v_subitem := LTRIM(v_parts[3], '0');
          IF v_subitem = '' THEN
            v_subitem := '0';
          END IF;
          -- Only include third part if it's not "0"
          IF v_subitem <> '0' THEN
            v_normalized := v_section || '.' || v_item || '.' || v_subitem;
          ELSE
            v_normalized := v_section || '.' || v_item;
          END IF;
        END;
      ELSE
        v_normalized := v_section || '.' || v_item;
      END IF;
    END IF;
  END IF;

  -- Remove trailing .0 or .00 for cleaner matching
  v_normalized := REGEXP_REPLACE(v_normalized, '\.0+$', '');

  RETURN v_normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.normalize_item_number(TEXT) IS
  'Normalizes item numbers for consistent matching. Handles EBSX format (201.001) and WVDOH format (201.01) by removing leading zeros from decimal parts.';

-- Also update normalize_wvdoh_item_number in pricing_engine to be consistent
CREATE OR REPLACE FUNCTION public.normalize_wvdoh_item_number(p_item_number TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Just delegate to the main normalization function for consistency
  RETURN public.normalize_item_number(p_item_number);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.normalize_wvdoh_item_number IS 'Normalizes WVDOH item numbers by delegating to normalize_item_number';

-- Update the wvdoh_item_master normalized values to use new normalization
UPDATE public.wvdoh_item_master
SET item_number_normalized = public.normalize_item_number(item_number)
WHERE item_number_normalized IS DISTINCT FROM public.normalize_item_number(item_number);

-- Update existing bid_line_items wvdoh_item_code with new normalization
UPDATE public.bid_line_items
SET wvdoh_item_code = public.normalize_item_number(item_number)
WHERE item_number IS NOT NULL;

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration fixes the item number normalization to properly handle:
-- - EBSX format: "201.001" -> "201.1"
-- - WVDOH format: "201.01" -> "201.1"
-- - Six digit: "201001" -> "201.1"
-- Now both formats normalize to the same value for proper matching.
-- ============================================================================
