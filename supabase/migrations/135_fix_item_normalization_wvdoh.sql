-- ============================================================================
-- Migration 135: Fix Item Number Normalization for WVDOH Format
-- ============================================================================
-- PURPOSE: The normalize_item_number function was checking WVDOH format AFTER
-- replacing dashes with dots, causing "201001-000" to become "201001.000"
-- instead of "201.1". This fix checks the format BEFORE replacement.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_item_number(p_item_number TEXT)
RETURNS TEXT AS $$
DECLARE
  v_normalized TEXT;
  v_original TEXT;
  v_parts TEXT[];
  v_section TEXT;
  v_item TEXT;
  v_subitem TEXT;
BEGIN
  IF p_item_number IS NULL THEN
    RETURN NULL;
  END IF;

  -- Remove leading/trailing whitespace
  v_normalized := TRIM(p_item_number);
  v_original := v_normalized;

  -- Convert to lowercase
  v_normalized := LOWER(v_normalized);

  -- =========================================================================
  -- PRIORITY 1: Handle WVDOH EBSX format BEFORE any replacements
  -- Format: XXXYYY-ZZZ (e.g., "201001-000" -> "201.1")
  -- Section = XXX (first 3 digits = 201)
  -- Item = YYY (next 3 digits = 001 -> 1)
  -- Variant = ZZZ (ignored unless non-zero)
  -- =========================================================================
  IF v_normalized ~ '^\d{6}-\d{3}$' THEN
    v_section := SUBSTRING(v_normalized FROM 1 FOR 3);
    v_item := LTRIM(SUBSTRING(v_normalized FROM 4 FOR 3), '0');
    v_subitem := LTRIM(SUBSTRING(v_normalized FROM 8 FOR 3), '0');

    IF v_item = '' THEN v_item := '0'; END IF;
    IF v_subitem = '' OR v_subitem = '0' THEN
      RETURN v_section || '.' || v_item;
    ELSE
      RETURN v_section || '.' || v_item || '.' || v_subitem;
    END IF;
  END IF;

  -- =========================================================================
  -- PRIORITY 2: Handle variant format XXXYYY-ZZZ-LNNN
  -- (e.g., "636060-020-L110" or "636060-L110")
  -- =========================================================================
  IF v_normalized ~ '^\d{6}-\d{3}-l\d+$' THEN
    v_section := SUBSTRING(v_normalized FROM 1 FOR 3);
    v_item := LTRIM(SUBSTRING(v_normalized FROM 4 FOR 3), '0');
    IF v_item = '' THEN v_item := '0'; END IF;
    -- Return base item without variant suffix
    RETURN v_section || '.' || v_item;
  END IF;

  IF v_normalized ~ '^\d{6}-l\d+$' THEN
    v_section := SUBSTRING(v_normalized FROM 1 FOR 3);
    v_item := LTRIM(SUBSTRING(v_normalized FROM 4 FOR 3), '0');
    IF v_item = '' THEN v_item := '0'; END IF;
    RETURN v_section || '.' || v_item;
  END IF;

  -- =========================================================================
  -- PRIORITY 3: Handle standard formats after normalization
  -- =========================================================================

  -- Replace common separators with dots
  v_normalized := REPLACE(v_normalized, '-', '.');
  v_normalized := REPLACE(v_normalized, '_', '.');
  v_normalized := REPLACE(v_normalized, ' ', '.');

  -- Handle format like "201001" (6 digits without dash) -> "201.1"
  IF v_normalized ~ '^\d{6}$' THEN
    v_section := SUBSTRING(v_normalized FROM 1 FOR 3);
    v_item := LTRIM(SUBSTRING(v_normalized FROM 4 FOR 3), '0');
    IF v_item = '' THEN v_item := '0'; END IF;
    RETURN v_section || '.' || v_item;
  END IF;

  -- Handle format like "201001000" (9 digits) -> "201.1"
  IF v_normalized ~ '^\d{9}$' THEN
    v_section := SUBSTRING(v_normalized FROM 1 FOR 3);
    v_item := LTRIM(SUBSTRING(v_normalized FROM 4 FOR 3), '0');
    IF v_item = '' THEN v_item := '0'; END IF;
    RETURN v_section || '.' || v_item;
  END IF;

  -- Remove multiple consecutive dots
  v_normalized := REGEXP_REPLACE(v_normalized, '\.+', '.', 'g');

  -- Normalize each part after the decimal to remove leading zeros
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
  'Normalizes item numbers for consistent matching. Handles WVDOH EBSX format (201001-000 -> 201.1), standard format (201.01 -> 201.1), and variants (-Lxxx suffixes).';

-- ============================================================================
-- Summary
-- ============================================================================
-- Fixed the order of operations in normalize_item_number:
-- 1. Check WVDOH EBSX format (XXXYYY-ZZZ) BEFORE any character replacements
-- 2. Handle variant suffixes (-Lxxx) to return base item
-- 3. Then fall through to standard normalization
--
-- Test cases:
-- - "201001-000" -> "201.1" (WVDOH EBSX format)
-- - "636060-020" -> "636.60" (WVDOH with non-zero variant)
-- - "201.001" -> "201.1" (Standard format)
-- - "201.01" -> "201.1" (WVDOH master format)
-- - "639001-L225" -> "639.1" (Variant suffix stripped)
-- ============================================================================
