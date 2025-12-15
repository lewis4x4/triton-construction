-- =============================================================================
-- Migration 129: Fix Dashboard View Row Multiplication Bug
-- =============================================================================
-- The v_bid_project_dashboard view has multiple LEFT JOINs that create a
-- Cartesian product. SUM(final_extended_price) was being calculated across
-- the multiplied rows, causing massively inflated totals.
--
-- For example: 55 items × 16 risks × 18 questions = 15,840 rows
-- This caused $60M to become $956B!
--
-- FIX: Use subqueries for financial calculations instead of aggregating
-- across the JOINed result set.
-- =============================================================================

CREATE OR REPLACE VIEW public.v_bid_project_dashboard AS
SELECT
    bp.id AS bid_project_id,
    bp.project_name,
    bp.owner,
    bp.letting_date,
    bp.bid_due_date,
    bp.status,

    -- Line Item Summary (using subqueries to avoid row multiplication)
    (SELECT COUNT(*) FROM public.bid_line_items WHERE bid_project_id = bp.id) AS total_line_items,
    (SELECT COUNT(*) FROM public.bid_line_items WHERE bid_project_id = bp.id AND pricing_reviewed) AS items_reviewed,
    (SELECT COUNT(*) FROM public.bid_line_items WHERE bid_project_id = bp.id AND estimation_method = 'ASSEMBLY_BASED') AS items_assembly_priced,
    (SELECT COUNT(*) FROM public.bid_line_items WHERE bid_project_id = bp.id AND estimation_method = 'SUBQUOTE') AS items_subquote_priced,
    (SELECT COUNT(*) FROM public.bid_line_items WHERE bid_project_id = bp.id AND estimation_method = 'MANUAL_ESTIMATOR_JUDGMENT') AS items_manual_priced,

    -- Financial Summary (FIXED: using subqueries)
    (SELECT COALESCE(SUM(COALESCE(base_unit_cost, 0) * COALESCE(quantity, 0)), 0)
     FROM public.bid_line_items WHERE bid_project_id = bp.id) AS total_base_cost,
    (SELECT COALESCE(SUM(COALESCE(final_extended_price, 0)), 0)
     FROM public.bid_line_items WHERE bid_project_id = bp.id) AS total_bid_value,

    -- Risk Summary
    (SELECT COUNT(*) FROM public.bid_project_risks WHERE bid_project_id = bp.id AND type = 'RISK') AS total_risks,
    (SELECT COUNT(*) FROM public.bid_project_risks WHERE bid_project_id = bp.id AND type = 'RISK' AND overall_severity IN ('HIGH', 'CRITICAL')) AS high_critical_risks,
    (SELECT COUNT(*) FROM public.bid_project_risks WHERE bid_project_id = bp.id AND type = 'OPPORTUNITY') AS total_opportunities,

    -- Questions Summary
    (SELECT COUNT(*) FROM public.bid_prebid_questions WHERE bid_project_id = bp.id) AS total_questions,
    (SELECT COUNT(*) FROM public.bid_prebid_questions WHERE bid_project_id = bp.id AND status = 'SUBMITTED') AS questions_submitted,
    (SELECT COUNT(*) FROM public.bid_prebid_questions WHERE bid_project_id = bp.id AND status = 'ANSWERED') AS questions_answered,

    -- Environmental Summary
    (SELECT COUNT(*) FROM public.bid_environmental_commitments WHERE bid_project_id = bp.id) AS total_env_commitments,
    (SELECT COUNT(*) FROM public.bid_hazmat_findings WHERE bid_project_id = bp.id) AS total_hazmat_findings,

    -- Work Package Summary
    (SELECT COUNT(*) FROM public.bid_work_packages WHERE bid_project_id = bp.id) AS total_work_packages,

    -- Document Summary
    (SELECT COUNT(*) FROM public.bid_documents WHERE bid_project_id = bp.id) AS total_documents,
    (SELECT COUNT(*) FROM public.bid_documents WHERE bid_project_id = bp.id AND processing_status = 'COMPLETED') AS documents_processed,

    -- Pricing Scenarios
    (SELECT COUNT(*) FROM public.bid_pricing_scenarios WHERE bid_project_id = bp.id) AS pricing_scenarios_count,

    -- Completion Percentage (simple heuristic)
    ROUND(
        (
            -- Items reviewed percentage (25%)
            COALESCE(
                (SELECT COUNT(*) FILTER (WHERE pricing_reviewed)::NUMERIC / NULLIF(COUNT(*), 0) * 25
                 FROM public.bid_line_items WHERE bid_project_id = bp.id),
                0
            ) +
            -- Documents processed percentage (25%)
            COALESCE(
                (SELECT COUNT(*) FILTER (WHERE processing_status = 'COMPLETED')::NUMERIC / NULLIF(COUNT(*), 0) * 25
                 FROM public.bid_documents WHERE bid_project_id = bp.id),
                0
            ) +
            -- Risks reviewed percentage (25%)
            COALESCE(
                (SELECT COUNT(*) FILTER (WHERE review_status != 'PENDING')::NUMERIC / NULLIF(COUNT(*), 0) * 25
                 FROM public.bid_project_risks WHERE bid_project_id = bp.id),
                0
            ) +
            -- Questions addressed percentage (25%)
            COALESCE(
                (SELECT COUNT(*) FILTER (WHERE status != 'AI_SUGGESTED')::NUMERIC / NULLIF(COUNT(*), 0) * 25
                 FROM public.bid_prebid_questions WHERE bid_project_id = bp.id),
                0
            )
        ),
        1
    ) AS estimated_completion_pct

FROM public.bid_projects bp;

-- =============================================================================
-- VERIFICATION
-- =============================================================================
DO $$
DECLARE
    v_count INT;
    v_sample_total NUMERIC;
BEGIN
    -- Check view exists
    SELECT COUNT(*) INTO v_count FROM pg_views WHERE viewname = 'v_bid_project_dashboard';
    IF v_count = 0 THEN
        RAISE EXCEPTION 'View v_bid_project_dashboard was not created';
    END IF;

    -- Log success
    RAISE NOTICE 'Migration 129: Fixed v_bid_project_dashboard row multiplication bug';
    RAISE NOTICE 'Financial totals now use subqueries instead of aggregating across JOINs';
END $$;
