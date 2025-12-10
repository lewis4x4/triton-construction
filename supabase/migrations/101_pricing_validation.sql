-- ============================================================================
-- Migration 101: Line Items Pricing Validation Framework
-- ============================================================================
-- PURPOSE: Add pricing status tracking, auto-calculation trigger, and review queue
-- This enables the system to track pricing completeness and flag items needing attention
-- ============================================================================

-- ============================================================================
-- PART 1: Create Pricing Status Enum
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pricing_status_enum') THEN
    CREATE TYPE public.pricing_status_enum AS ENUM (
      'NEEDS_PRICING',      -- No pricing data at all (default for new extractions)
      'AI_SUGGESTED',       -- Has AI-suggested price, awaiting human review
      'MANUAL_REQUIRED',    -- Flagged for manual entry (no historical/AI match found)
      'INCOMPLETE',         -- Marked as reviewed but missing final_unit_price
      'COMPLETE'            -- Has final_unit_price AND pricing_reviewed = TRUE
    );
    RAISE NOTICE 'Created pricing_status_enum type';
  ELSE
    RAISE NOTICE 'pricing_status_enum already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 2: Add pricing_status Column to bid_line_items
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bid_line_items'
    AND column_name = 'pricing_status'
  ) THEN
    ALTER TABLE public.bid_line_items
    ADD COLUMN pricing_status public.pricing_status_enum DEFAULT 'NEEDS_PRICING';
    RAISE NOTICE 'Added pricing_status column to bid_line_items';
  ELSE
    RAISE NOTICE 'pricing_status column already exists';
  END IF;
END $$;

-- Add ai_suggested_extended_price column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bid_line_items'
    AND column_name = 'ai_suggested_extended_price'
  ) THEN
    ALTER TABLE public.bid_line_items
    ADD COLUMN ai_suggested_extended_price NUMERIC(14, 2);
    RAISE NOTICE 'Added ai_suggested_extended_price column to bid_line_items';
  ELSE
    RAISE NOTICE 'ai_suggested_extended_price column already exists';
  END IF;
END $$;

-- Add ai_pricing_metadata column for storing pricing source/confidence info
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'bid_line_items'
    AND column_name = 'ai_pricing_metadata'
  ) THEN
    ALTER TABLE public.bid_line_items
    ADD COLUMN ai_pricing_metadata JSONB;
    RAISE NOTICE 'Added ai_pricing_metadata column to bid_line_items';
  ELSE
    RAISE NOTICE 'ai_pricing_metadata column already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Create Pricing Status Auto-Calculation Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.calculate_pricing_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Priority order for status calculation:
  -- 1. COMPLETE: Has final price AND is reviewed
  -- 2. INCOMPLETE: Marked reviewed but no final price
  -- 3. AI_SUGGESTED: Has AI suggestion, awaiting review
  -- 4. MANUAL_REQUIRED: Explicitly flagged for manual entry
  -- 5. NEEDS_PRICING: Default when no pricing data exists

  IF NEW.final_unit_price IS NOT NULL AND NEW.pricing_reviewed = TRUE THEN
    NEW.pricing_status := 'COMPLETE';
  ELSIF NEW.pricing_reviewed = TRUE AND NEW.final_unit_price IS NULL THEN
    NEW.pricing_status := 'INCOMPLETE';
  ELSIF NEW.ai_suggested_unit_price IS NOT NULL THEN
    NEW.pricing_status := 'AI_SUGGESTED';
  ELSIF NEW.pricing_status = 'MANUAL_REQUIRED' THEN
    -- Keep MANUAL_REQUIRED if explicitly set (don't override)
    NEW.pricing_status := 'MANUAL_REQUIRED';
  ELSE
    NEW.pricing_status := 'NEEDS_PRICING';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-calculation
DROP TRIGGER IF EXISTS trigger_calculate_pricing_status ON public.bid_line_items;
CREATE TRIGGER trigger_calculate_pricing_status
  BEFORE INSERT OR UPDATE OF final_unit_price, ai_suggested_unit_price, base_unit_cost, pricing_reviewed
  ON public.bid_line_items
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_pricing_status();

COMMENT ON FUNCTION public.calculate_pricing_status() IS
  'Auto-calculates pricing_status based on pricing fields and review state';

-- ============================================================================
-- PART 4: Create Pricing Review Queue Table
-- ============================================================================
-- This table captures items that need manual review due to:
-- - Fuzzy matches with low confidence
-- - Ambiguous item numbers
-- - Items flagged during extraction

CREATE TABLE IF NOT EXISTS public.bid_pricing_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link to the line item
  line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,
  bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

  -- What was detected
  detected_pattern TEXT,                    -- e.g., "203.01" or "Excavation"
  detection_source TEXT,                    -- e.g., "item_number", "description"

  -- Suggested match (if any)
  suggested_match_item_number TEXT,
  suggested_match_project_id UUID REFERENCES public.bid_projects(id),
  suggested_match_unit_price NUMERIC(14, 4),
  confidence_score NUMERIC(5, 2),           -- 0-100 confidence in the match

  -- Review status
  requires_manual_review BOOLEAN DEFAULT TRUE,
  review_status TEXT DEFAULT 'PENDING' CHECK (review_status IN ('PENDING', 'APPROVED', 'REJECTED', 'MODIFIED')),

  -- Review details
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.user_profiles(id),
  review_notes TEXT,

  -- Applied action
  applied_unit_price NUMERIC(14, 4),        -- What was actually used

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one queue entry per line item
  CONSTRAINT unique_review_per_item UNIQUE (line_item_id)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_pricing_review_queue_project ON public.bid_pricing_review_queue(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_pricing_review_queue_pending ON public.bid_pricing_review_queue(bid_project_id) WHERE requires_manual_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_pricing_review_queue_status ON public.bid_pricing_review_queue(review_status);

-- Enable RLS
ALTER TABLE public.bid_pricing_review_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies (same as bid_line_items - organization-based access)
CREATE POLICY "Users can view review queue for their organization's projects"
  ON public.bid_pricing_review_queue FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bid_projects bp
      WHERE bp.id = bid_pricing_review_queue.bid_project_id
      AND bp.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "Users can insert review queue entries for their projects"
  ON public.bid_pricing_review_queue FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bid_projects bp
      WHERE bp.id = bid_pricing_review_queue.bid_project_id
      AND bp.organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "Users can update review queue entries for their projects"
  ON public.bid_pricing_review_queue FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.bid_projects bp
      WHERE bp.id = bid_pricing_review_queue.bid_project_id
      AND bp.organization_id = public.get_user_organization_id()
    )
  );

-- ============================================================================
-- PART 5: Add Index on pricing_status for Fast Filtering
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bid_line_items_pricing_status
  ON public.bid_line_items(bid_project_id, pricing_status);

CREATE INDEX IF NOT EXISTS idx_bid_line_items_incomplete_pricing
  ON public.bid_line_items(bid_project_id)
  WHERE pricing_status != 'COMPLETE';

-- ============================================================================
-- PART 6: Create View for Pricing Summary by Project
-- ============================================================================

-- Drop existing view if it exists with different schema
DROP VIEW IF EXISTS public.v_bid_pricing_summary;

CREATE OR REPLACE VIEW public.v_bid_pricing_summary AS
SELECT
  bp.id AS bid_project_id,
  bp.project_name,
  bp.letting_date,
  bp.status AS project_status,

  -- Total counts
  COUNT(bli.id) AS total_items,

  -- Status breakdown
  COUNT(CASE WHEN bli.pricing_status = 'COMPLETE' THEN 1 END) AS complete_count,
  COUNT(CASE WHEN bli.pricing_status = 'AI_SUGGESTED' THEN 1 END) AS ai_suggested_count,
  COUNT(CASE WHEN bli.pricing_status = 'MANUAL_REQUIRED' THEN 1 END) AS manual_required_count,
  COUNT(CASE WHEN bli.pricing_status = 'INCOMPLETE' THEN 1 END) AS incomplete_count,
  COUNT(CASE WHEN bli.pricing_status = 'NEEDS_PRICING' THEN 1 END) AS needs_pricing_count,

  -- Percentages
  ROUND(
    COUNT(CASE WHEN bli.pricing_status = 'COMPLETE' THEN 1 END)::NUMERIC /
    NULLIF(COUNT(bli.id), 0) * 100,
    1
  ) AS completion_percentage,

  -- Items needing attention (not complete)
  COUNT(CASE WHEN bli.pricing_status != 'COMPLETE' THEN 1 END) AS needs_attention_count,

  -- Financial totals
  SUM(bli.final_extended_price) AS total_extended_price,
  SUM(CASE WHEN bli.pricing_status = 'COMPLETE' THEN bli.final_extended_price ELSE 0 END) AS complete_extended_price,

  -- Days until deadline
  CASE
    WHEN bp.letting_date IS NOT NULL
    THEN (bp.letting_date - CURRENT_DATE)
    ELSE NULL
  END AS days_until_deadline,

  -- Urgency flag
  CASE
    WHEN bp.letting_date IS NOT NULL
      AND bp.letting_date - CURRENT_DATE <= 3
      AND COUNT(CASE WHEN bli.pricing_status != 'COMPLETE' THEN 1 END) > 0
    THEN TRUE
    ELSE FALSE
  END AS is_urgent

FROM public.bid_projects bp
LEFT JOIN public.bid_line_items bli ON bli.bid_project_id = bp.id
WHERE bp.status NOT IN ('WON', 'LOST', 'NO_BID', 'CANCELLED')
GROUP BY bp.id, bp.project_name, bp.letting_date, bp.status;

COMMENT ON VIEW public.v_bid_pricing_summary IS
  'Aggregated pricing status and completion metrics by bid project';

-- ============================================================================
-- PART 7: Backfill Existing Records with Correct Status
-- ============================================================================

-- Update existing records to calculate their pricing_status
UPDATE public.bid_line_items
SET pricing_status =
  CASE
    WHEN final_unit_price IS NOT NULL AND pricing_reviewed = TRUE THEN 'COMPLETE'::public.pricing_status_enum
    WHEN pricing_reviewed = TRUE AND final_unit_price IS NULL THEN 'INCOMPLETE'::public.pricing_status_enum
    WHEN ai_suggested_unit_price IS NOT NULL THEN 'AI_SUGGESTED'::public.pricing_status_enum
    ELSE 'NEEDS_PRICING'::public.pricing_status_enum
  END
WHERE pricing_status IS NULL OR pricing_status = 'NEEDS_PRICING';

-- ============================================================================
-- PART 8: Helper Function to Get Incomplete Items for a Project
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_incomplete_line_items(p_bid_project_id UUID)
RETURNS TABLE (
  id UUID,
  line_number INTEGER,
  item_number TEXT,
  description TEXT,
  quantity NUMERIC,
  unit TEXT,
  pricing_status public.pricing_status_enum,
  ai_suggested_unit_price NUMERIC,
  final_unit_price NUMERIC,
  pricing_reviewed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    bli.id,
    bli.line_number,
    bli.item_number,
    bli.description,
    bli.quantity,
    bli.unit,
    bli.pricing_status,
    bli.ai_suggested_unit_price,
    bli.final_unit_price,
    bli.pricing_reviewed
  FROM public.bid_line_items bli
  WHERE bli.bid_project_id = p_bid_project_id
    AND bli.pricing_status != 'COMPLETE'
  ORDER BY
    CASE bli.pricing_status
      WHEN 'NEEDS_PRICING' THEN 1
      WHEN 'MANUAL_REQUIRED' THEN 2
      WHEN 'INCOMPLETE' THEN 3
      WHEN 'AI_SUGGESTED' THEN 4
      ELSE 5
    END,
    bli.line_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_incomplete_line_items(UUID) IS
  'Returns line items that need pricing attention, ordered by urgency';

-- ============================================================================
-- PART 9: Validation Function for Bid Submission
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_bid_for_submission(p_bid_project_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_incomplete_count INTEGER;
  v_total_count INTEGER;
  v_result JSONB;
BEGIN
  -- Count total and incomplete items
  SELECT
    COUNT(*),
    COUNT(CASE WHEN pricing_status != 'COMPLETE' THEN 1 END)
  INTO v_total_count, v_incomplete_count
  FROM public.bid_line_items
  WHERE bid_project_id = p_bid_project_id;

  -- Build result
  IF v_incomplete_count = 0 THEN
    v_result := jsonb_build_object(
      'valid', TRUE,
      'total_items', v_total_count,
      'incomplete_count', 0,
      'message', 'All line items have complete pricing'
    );
  ELSE
    v_result := jsonb_build_object(
      'valid', FALSE,
      'total_items', v_total_count,
      'incomplete_count', v_incomplete_count,
      'completion_percentage', ROUND((v_total_count - v_incomplete_count)::NUMERIC / v_total_count * 100, 1),
      'message', format('%s of %s items need pricing attention', v_incomplete_count, v_total_count),
      'incomplete_items', (
        SELECT jsonb_agg(jsonb_build_object(
          'id', bli.id,
          'item_number', bli.item_number,
          'description', bli.description,
          'pricing_status', bli.pricing_status,
          'ai_suggested_unit_price', bli.ai_suggested_unit_price,
          'final_unit_price', bli.final_unit_price
        ))
        FROM public.bid_line_items bli
        WHERE bli.bid_project_id = p_bid_project_id
          AND bli.pricing_status != 'COMPLETE'
        ORDER BY bli.line_number
      )
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.validate_bid_for_submission(UUID) IS
  'Validates that all line items have complete pricing before bid submission';

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration adds:
-- 1. pricing_status_enum: NEEDS_PRICING, AI_SUGGESTED, MANUAL_REQUIRED, INCOMPLETE, COMPLETE
-- 2. pricing_status column on bid_line_items with auto-calculation trigger
-- 3. bid_pricing_review_queue table for flagged items needing manual review
-- 4. v_bid_pricing_summary view for dashboard metrics
-- 5. get_incomplete_line_items() function for fetching items needing attention
-- 6. validate_bid_for_submission() function for submission validation
-- ============================================================================
