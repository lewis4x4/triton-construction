-- ============================================================================
-- MIGRATION 017: V4.1 ADDENDUM - ALTER RISKS
-- Triton AI Bid Package Engine - Add type and ownership fields, merge opportunities
-- ============================================================================

-- ============================================================================
-- First, add 'OTHER' to risk_category_enum
-- Note: ALTER TYPE ADD VALUE cannot run inside a transaction block in some contexts
-- We handle this by checking if it exists first and using IF NOT EXISTS
-- ============================================================================
ALTER TYPE risk_category_enum ADD VALUE IF NOT EXISTS 'OTHER';

-- ============================================================================
-- ALTER TABLE: bid_project_risks — Add type and ownership fields
-- ============================================================================

-- Add risk type (RISK or OPPORTUNITY)
ALTER TABLE public.bid_project_risks ADD COLUMN IF NOT EXISTS
    type risk_type_enum NOT NULL DEFAULT 'RISK';

-- Add risk ownership
ALTER TABLE public.bid_project_risks ADD COLUMN IF NOT EXISTS
    owner_vs_contractor risk_ownership_enum DEFAULT 'UNCLEAR';

-- Add recommended mitigation (separate from strategy for clarity)
ALTER TABLE public.bid_project_risks ADD COLUMN IF NOT EXISTS
    recommended_mitigation TEXT;

-- Add value fields (for opportunities: potential savings)
ALTER TABLE public.bid_project_risks ADD COLUMN IF NOT EXISTS
    estimated_value_low NUMERIC(12, 2);

ALTER TABLE public.bid_project_risks ADD COLUMN IF NOT EXISTS
    estimated_value_high NUMERIC(12, 2);

-- Add implementation difficulty (for opportunities)
ALTER TABLE public.bid_project_risks ADD COLUMN IF NOT EXISTS
    implementation_difficulty severity_enum;

-- Add action tracking (for opportunities requiring action)
ALTER TABLE public.bid_project_risks ADD COLUMN IF NOT EXISTS
    requires_prebid_question BOOLEAN DEFAULT FALSE;

ALTER TABLE public.bid_project_risks ADD COLUMN IF NOT EXISTS
    requires_ve_proposal BOOLEAN DEFAULT FALSE;

ALTER TABLE public.bid_project_risks ADD COLUMN IF NOT EXISTS
    action_notes TEXT;

-- ============================================================================
-- INDEX for type filtering
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_bid_risks_type ON public.bid_project_risks(type);
CREATE INDEX IF NOT EXISTS idx_bid_risks_ownership ON public.bid_project_risks(owner_vs_contractor);

-- ============================================================================
-- NOTE: Data migration from bid_project_opportunities is skipped
-- The tables are new, so there's no legacy data to migrate.
-- The bid_project_opportunities table will be deprecated and future
-- opportunities will be stored in bid_project_risks with type='OPPORTUNITY'.
-- If data migration is needed later, run it in a separate transaction.
-- ============================================================================

-- ============================================================================
-- DROP TABLE: bid_project_opportunities (merged into bid_project_risks)
-- Note: We keep the table for now but mark it deprecated
-- A future migration can drop it after data verification
-- ============================================================================

-- Add deprecation comment
COMMENT ON TABLE public.bid_project_opportunities IS 'DEPRECATED: Opportunities merged into bid_project_risks with type=OPPORTUNITY. This table will be removed in a future migration.';

-- ============================================================================
-- UPDATE VIEW: v_bid_risk_summary to include opportunities
-- Must DROP first because we're adding new columns
-- ============================================================================
DROP VIEW IF EXISTS public.v_bid_risk_summary;
CREATE VIEW public.v_bid_risk_summary AS
SELECT
    bp.id AS bid_project_id,
    bp.project_name,
    COUNT(bpr.id) FILTER (WHERE bpr.type = 'RISK') AS total_risks,
    COUNT(bpr.id) FILTER (WHERE bpr.type = 'OPPORTUNITY') AS total_opportunities,
    COUNT(CASE WHEN bpr.type = 'RISK' AND bpr.overall_severity = 'CRITICAL' THEN 1 END) AS critical_risks,
    COUNT(CASE WHEN bpr.type = 'RISK' AND bpr.overall_severity = 'HIGH' THEN 1 END) AS high_risks,
    COUNT(CASE WHEN bpr.type = 'RISK' AND bpr.overall_severity = 'MEDIUM' THEN 1 END) AS medium_risks,
    COUNT(CASE WHEN bpr.type = 'RISK' AND bpr.overall_severity = 'LOW' THEN 1 END) AS low_risks,
    COUNT(CASE WHEN bpr.review_status = 'PENDING' THEN 1 END) AS pending_review,
    COUNT(CASE WHEN bpr.prebid_question_recommended OR bpr.requires_prebid_question THEN 1 END) AS questions_recommended,
    COUNT(CASE WHEN bpr.owner_vs_contractor = 'OWNER' THEN 1 END) AS owner_risks,
    COUNT(CASE WHEN bpr.owner_vs_contractor = 'CONTRACTOR' THEN 1 END) AS contractor_risks,
    COUNT(CASE WHEN bpr.owner_vs_contractor = 'SHARED' THEN 1 END) AS shared_risks,
    SUM(COALESCE(bpr.estimated_value_low, 0)) FILTER (WHERE bpr.type = 'OPPORTUNITY') AS total_opportunity_value_low,
    SUM(COALESCE(bpr.estimated_value_high, 0)) FILTER (WHERE bpr.type = 'OPPORTUNITY') AS total_opportunity_value_high
FROM public.bid_projects bp
LEFT JOIN public.bid_project_risks bpr ON bp.id = bpr.bid_project_id
GROUP BY bp.id, bp.project_name;

-- ============================================================================
-- HELPER FUNCTION: Generate opportunity number (uses risk table now)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_opportunity_number(p_bid_project_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.bid_project_risks
    WHERE bid_project_id = p_bid_project_id
    AND type = 'OPPORTUNITY';

    RETURN 'O-' || LPAD(v_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON COLUMN public.bid_project_risks.type IS 'Whether this is a RISK (negative) or OPPORTUNITY (positive)';
COMMENT ON COLUMN public.bid_project_risks.owner_vs_contractor IS 'Who contractually bears this risk';
COMMENT ON COLUMN public.bid_project_risks.estimated_value_low IS 'For opportunities: low estimate of potential savings';
COMMENT ON COLUMN public.bid_project_risks.estimated_value_high IS 'For opportunities: high estimate of potential savings';
