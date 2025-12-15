-- ============================================================================
-- Migration 136: Executive Handoff V2 Improvements
-- ============================================================================
-- PURPOSE: Fix work package values, line item categorization, and related issues
-- for the Executive Handoff feature
-- ============================================================================

-- ============================================================================
-- PHASE 1.1: Fix Work Package Values ($0 Issue)
-- ============================================================================
-- Problem: bid_work_packages.estimated_value is never populated
-- Solution: Create trigger to calculate sum of line item values

-- Function to update work package estimated_value from line items
CREATE OR REPLACE FUNCTION public.update_work_package_value()
RETURNS TRIGGER AS $$
BEGIN
  -- Update all work packages that contain the affected line item
  UPDATE public.bid_work_packages wp
  SET
    estimated_value = (
      SELECT COALESCE(SUM(bli.final_extended_price), 0)
      FROM public.bid_work_package_items wpi
      JOIN public.bid_line_items bli ON wpi.line_item_id = bli.id
      WHERE wpi.work_package_id = wp.id
    ),
    updated_at = NOW()
  WHERE wp.id IN (
    SELECT DISTINCT wpi.work_package_id
    FROM public.bid_work_package_items wpi
    WHERE wpi.line_item_id = COALESCE(NEW.id, OLD.id)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_work_package_value() IS
  'Updates bid_work_packages.estimated_value when line item prices change';

-- Trigger on bid_line_items for price changes
DROP TRIGGER IF EXISTS trg_update_work_package_value_on_line_item ON public.bid_line_items;
CREATE TRIGGER trg_update_work_package_value_on_line_item
  AFTER INSERT OR UPDATE OF final_extended_price, final_unit_price, quantity
  ON public.bid_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_work_package_value();

-- Function to update work package value when items are added/removed
CREATE OR REPLACE FUNCTION public.update_work_package_value_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the affected work package
  UPDATE public.bid_work_packages wp
  SET
    estimated_value = (
      SELECT COALESCE(SUM(bli.final_extended_price), 0)
      FROM public.bid_work_package_items wpi
      JOIN public.bid_line_items bli ON wpi.line_item_id = bli.id
      WHERE wpi.work_package_id = wp.id
    ),
    updated_at = NOW()
  WHERE wp.id = COALESCE(NEW.work_package_id, OLD.work_package_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_work_package_value_on_assignment() IS
  'Updates bid_work_packages.estimated_value when line items are assigned/unassigned';

-- Trigger on bid_work_package_items for assignment changes
DROP TRIGGER IF EXISTS trg_update_work_package_value_on_assignment ON public.bid_work_package_items;
CREATE TRIGGER trg_update_work_package_value_on_assignment
  AFTER INSERT OR DELETE
  ON public.bid_work_package_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_work_package_value_on_assignment();

-- Backfill: Calculate estimated_value for all existing work packages
UPDATE public.bid_work_packages wp
SET estimated_value = (
  SELECT COALESCE(SUM(bli.final_extended_price), 0)
  FROM public.bid_work_package_items wpi
  JOIN public.bid_line_items bli ON wpi.line_item_id = bli.id
  WHERE wpi.work_package_id = wp.id
)
WHERE estimated_value IS NULL OR estimated_value = 0;

-- ============================================================================
-- PHASE 1.2: Fix Line Item Categorization (all "OTHER" issue)
-- ============================================================================
-- Problem: bid_line_items.work_category is NULL for all items
-- Solution: Auto-categorize based on WVDOH item code prefix

-- Function to auto-categorize line items based on item number
CREATE OR REPLACE FUNCTION public.categorize_line_item_by_number(p_item_number TEXT)
RETURNS work_category_enum AS $$
DECLARE
  v_prefix TEXT;
  v_first_char TEXT;
BEGIN
  IF p_item_number IS NULL THEN
    RETURN 'OTHER'::work_category_enum;
  END IF;

  -- Get first character/digits for category determination
  v_first_char := SUBSTRING(p_item_number FROM 1 FOR 1);
  v_prefix := SUBSTRING(p_item_number FROM 1 FOR 3);

  -- WVDOH Standard Specification Sections:
  -- Division 100: General Provisions -> GENERAL_CONDITIONS
  -- Division 200: Earthwork -> EARTHWORK
  -- Division 300: Bases -> PAVEMENT (base courses)
  -- Division 400: Pavements -> PAVEMENT
  -- Division 500: Structures -> SUBSTRUCTURE/SUPERSTRUCTURE
  -- Division 600: Incidental Construction -> Various
  -- Division 700: Drainage -> DRAINAGE
  -- Division 800: Traffic Control -> MOT
  -- Division 900: Materials -> Various

  RETURN CASE
    -- Division 100: General Provisions
    WHEN v_first_char = '1' THEN 'GENERAL_CONDITIONS'::work_category_enum

    -- Division 200: Earthwork
    WHEN v_first_char = '2' THEN
      CASE
        WHEN v_prefix IN ('201', '202', '203', '204', '205', '206', '207', '208', '209') THEN 'EARTHWORK'::work_category_enum
        WHEN v_prefix IN ('210', '211', '212') THEN 'DEMOLITION'::work_category_enum
        ELSE 'EARTHWORK'::work_category_enum
      END

    -- Division 300: Bases
    WHEN v_first_char = '3' THEN 'PAVEMENT'::work_category_enum

    -- Division 400: Pavements
    WHEN v_first_char = '4' THEN 'PAVEMENT'::work_category_enum

    -- Division 500: Structures
    WHEN v_first_char = '5' THEN
      CASE
        WHEN v_prefix IN ('501', '502', '503', '504', '505') THEN 'SUBSTRUCTURE'::work_category_enum
        WHEN v_prefix IN ('506', '507', '508', '509', '510') THEN 'SUPERSTRUCTURE'::work_category_enum
        WHEN v_prefix IN ('511', '512') THEN 'DECK'::work_category_enum
        WHEN v_prefix = '513' THEN 'APPROACH_SLABS'::work_category_enum
        ELSE 'SUBSTRUCTURE'::work_category_enum
      END

    -- Division 600: Incidental Construction
    WHEN v_first_char = '6' THEN
      CASE
        WHEN v_prefix IN ('601', '602', '603', '604', '605') THEN 'DRAINAGE'::work_category_enum
        WHEN v_prefix IN ('606', '607', '608') THEN 'GUARDRAIL_BARRIER'::work_category_enum
        WHEN v_prefix IN ('609', '610', '611', '612') THEN 'UTILITIES'::work_category_enum
        WHEN v_prefix IN ('613', '614', '615') THEN 'ENVIRONMENTAL'::work_category_enum
        WHEN v_prefix IN ('616', '617', '618') THEN 'LANDSCAPING'::work_category_enum
        WHEN v_prefix IN ('619', '620') THEN 'SIGNING_STRIPING'::work_category_enum
        ELSE 'OTHER'::work_category_enum
      END

    -- Division 700: Drainage
    WHEN v_first_char = '7' THEN 'DRAINAGE'::work_category_enum

    -- Division 800: Traffic Control & Signing
    WHEN v_first_char = '8' THEN
      CASE
        WHEN v_prefix IN ('801', '802', '803', '804', '805') THEN 'MOT'::work_category_enum
        WHEN v_prefix IN ('806', '807', '808') THEN 'SIGNING_STRIPING'::work_category_enum
        ELSE 'MOT'::work_category_enum
      END

    -- Division 900: Materials (usually covered under other items)
    WHEN v_first_char = '9' THEN 'OTHER'::work_category_enum

    -- Mobilization items (often start with MOB or similar)
    WHEN UPPER(p_item_number) LIKE 'MOB%' THEN 'MOBILIZATION'::work_category_enum
    WHEN UPPER(p_item_number) LIKE '%MOBIL%' THEN 'MOBILIZATION'::work_category_enum

    ELSE 'OTHER'::work_category_enum
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.categorize_line_item_by_number(TEXT) IS
  'Auto-categorizes line items based on WVDOH item number prefix';

-- Trigger function to auto-categorize on insert/update
CREATE OR REPLACE FUNCTION public.auto_categorize_line_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-categorize if work_category is NULL
  IF NEW.work_category IS NULL AND NEW.item_number IS NOT NULL THEN
    NEW.work_category := public.categorize_line_item_by_number(NEW.item_number);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.auto_categorize_line_item() IS
  'Trigger function to auto-set work_category based on item_number';

-- Create trigger for auto-categorization
DROP TRIGGER IF EXISTS trg_auto_categorize_line_item ON public.bid_line_items;
CREATE TRIGGER trg_auto_categorize_line_item
  BEFORE INSERT OR UPDATE OF item_number
  ON public.bid_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_categorize_line_item();

-- Backfill: Categorize all existing line items that have NULL work_category
UPDATE public.bid_line_items
SET work_category = public.categorize_line_item_by_number(item_number)
WHERE work_category IS NULL AND item_number IS NOT NULL;

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration fixes two critical issues for Executive Handoff:
--
-- 1. Work Package Values ($0):
--    - Added trigger on bid_line_items to recalculate work package values
--    - Added trigger on bid_work_package_items for assignment changes
--    - Backfilled all existing work packages with calculated values
--
-- 2. Line Item Categorization (all "OTHER"):
--    - Created categorize_line_item_by_number() function for WVDOH mapping
--    - Added trigger to auto-categorize new line items
--    - Backfilled all existing line items with categories
--
-- WVDOH Division Mapping:
--   100s -> GENERAL_CONDITIONS
--   200s -> EARTHWORK/DEMOLITION
--   300s -> PAVEMENT (bases)
--   400s -> PAVEMENT
--   500s -> SUBSTRUCTURE/SUPERSTRUCTURE/DECK/APPROACH_SLABS
--   600s -> DRAINAGE/GUARDRAIL/UTILITIES/ENVIRONMENTAL/LANDSCAPING/SIGNING
--   700s -> DRAINAGE
--   800s -> MOT/SIGNING_STRIPING
-- ============================================================================
