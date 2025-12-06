-- ============================================================================
-- MIGRATION 023: V4.1 ADDENDUM - COMPREHENSIVE VIEWS
-- Triton AI Bid Package Engine - Final views tying everything together
-- ============================================================================

-- ============================================================================
-- VIEW: v_bid_line_item_full
-- Purpose: Complete line item view with assembly, scenario, and link data
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_line_item_full AS
SELECT
    bli.id,
    bli.bid_project_id,
    bli.item_number,
    bli.description,
    bli.quantity,
    bli.unit,
    bli.work_category,
    bli.risk_level,

    -- Pricing Data
    bli.base_unit_cost,
    bli.ai_suggested_unit_price,
    bli.final_unit_price,
    COALESCE(bli.final_unit_price, bli.ai_suggested_unit_price) AS effective_unit_price,
    bli.final_extended_price,
    bli.estimation_method,
    bli.price_source,

    -- Cost Breakdown
    bli.unit_cost_breakdown,
    (bli.unit_cost_breakdown->>'labor')::NUMERIC AS labor_cost,
    (bli.unit_cost_breakdown->>'equipment')::NUMERIC AS equipment_cost,
    (bli.unit_cost_breakdown->>'material')::NUMERIC AS material_cost,
    (bli.unit_cost_breakdown->>'sub')::NUMERIC AS sub_cost,

    -- Markups
    bli.contingency_pct,
    bli.overhead_pct,
    bli.profit_pct,

    -- Review Status
    bli.review_priority_score,
    bli.pricing_reviewed,
    bli.pricing_reviewed_at,

    -- Assembly Info
    bia.id AS assembly_id,
    bia.productivity_factor,
    bia.is_ai_suggested AS assembly_ai_suggested,
    bia.ai_confidence_score AS assembly_confidence,
    bia.calculated_base_unit_cost AS assembly_calculated_cost,
    bat.name AS assembly_template_name,
    bat.code AS assembly_template_code,
    bat.work_category AS template_work_category,

    -- Structure Info
    bbs.id AS structure_id,
    bbs.structure_name,
    bbs.structure_type,

    -- Work Package Info
    bwp.id AS work_package_id,
    bwp.package_name,
    bwp.package_code,

    -- Link Counts
    (SELECT COUNT(*) FROM public.bid_risk_item_links ril WHERE ril.line_item_id = bli.id) AS linked_risk_count,
    (SELECT COUNT(*) FROM public.bid_prebid_question_items pqi WHERE pqi.line_item_id = bli.id) AS linked_question_count,
    (SELECT COUNT(*) FROM public.bid_environmental_commitment_items eci WHERE eci.line_item_id = bli.id) AS linked_env_count,
    (SELECT COUNT(*) FROM public.bid_structure_items si WHERE si.line_item_id = bli.id) AS linked_structure_count,

    -- AI Metadata
    bli.ai_confidence_score,
    bli.ai_categorization_confidence

FROM public.bid_line_items bli
LEFT JOIN public.bid_item_assemblies bia ON bli.id = bia.line_item_id
LEFT JOIN public.bid_assembly_templates bat ON bia.assembly_template_id = bat.id
LEFT JOIN public.bid_bridge_structures bbs ON bli.structure_id = bbs.id
LEFT JOIN public.bid_work_package_items bwpi ON bli.id = bwpi.line_item_id
LEFT JOIN public.bid_work_packages bwp ON bwpi.work_package_id = bwp.id;

-- ============================================================================
-- VIEW: v_bid_project_dashboard
-- Purpose: Executive dashboard data for a bid project
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_project_dashboard AS
SELECT
    bp.id AS bid_project_id,
    bp.project_name,
    bp.owner,
    bp.letting_date,
    bp.bid_due_date,
    bp.status,

    -- Line Item Summary
    COUNT(DISTINCT bli.id) AS total_line_items,
    COUNT(DISTINCT bli.id) FILTER (WHERE bli.pricing_reviewed) AS items_reviewed,
    COUNT(DISTINCT bli.id) FILTER (WHERE bli.estimation_method = 'ASSEMBLY_BASED') AS items_assembly_priced,
    COUNT(DISTINCT bli.id) FILTER (WHERE bli.estimation_method = 'SUBQUOTE') AS items_subquote_priced,
    COUNT(DISTINCT bli.id) FILTER (WHERE bli.estimation_method = 'MANUAL_ESTIMATOR_JUDGMENT') AS items_manual_priced,

    -- Financial Summary
    SUM(COALESCE(bli.base_unit_cost, 0) * COALESCE(bli.quantity, 0)) AS total_base_cost,
    SUM(COALESCE(bli.final_extended_price, 0)) AS total_bid_value,

    -- Risk Summary
    COUNT(DISTINCT bpr.id) FILTER (WHERE bpr.type = 'RISK') AS total_risks,
    COUNT(DISTINCT bpr.id) FILTER (WHERE bpr.type = 'RISK' AND bpr.overall_severity IN ('HIGH', 'CRITICAL')) AS high_critical_risks,
    COUNT(DISTINCT bpr.id) FILTER (WHERE bpr.type = 'OPPORTUNITY') AS total_opportunities,

    -- Questions Summary
    COUNT(DISTINCT bpq.id) AS total_questions,
    COUNT(DISTINCT bpq.id) FILTER (WHERE bpq.status = 'SUBMITTED') AS questions_submitted,
    COUNT(DISTINCT bpq.id) FILTER (WHERE bpq.status = 'ANSWERED') AS questions_answered,

    -- Environmental Summary
    COUNT(DISTINCT bec.id) AS total_env_commitments,
    COUNT(DISTINCT bhf.id) AS total_hazmat_findings,

    -- Work Package Summary
    COUNT(DISTINCT bwp.id) AS total_work_packages,

    -- Document Summary
    COUNT(DISTINCT bd.id) AS total_documents,
    COUNT(DISTINCT bd.id) FILTER (WHERE bd.processing_status = 'COMPLETED') AS documents_processed,

    -- Pricing Scenarios
    (SELECT COUNT(*) FROM public.bid_pricing_scenarios ps WHERE ps.bid_project_id = bp.id) AS pricing_scenarios_count,

    -- Completion Percentage (simple heuristic)
    ROUND(
        (
            (CASE WHEN COUNT(DISTINCT bli.id) > 0 THEN COUNT(DISTINCT bli.id) FILTER (WHERE bli.pricing_reviewed)::NUMERIC / COUNT(DISTINCT bli.id) * 25 ELSE 0 END) +
            (CASE WHEN COUNT(DISTINCT bd.id) > 0 THEN COUNT(DISTINCT bd.id) FILTER (WHERE bd.processing_status = 'COMPLETED')::NUMERIC / COUNT(DISTINCT bd.id) * 25 ELSE 0 END) +
            (CASE WHEN COUNT(DISTINCT bpr.id) > 0 THEN COUNT(DISTINCT bpr.id) FILTER (WHERE bpr.review_status != 'PENDING')::NUMERIC / COUNT(DISTINCT bpr.id) * 25 ELSE 0 END) +
            (CASE WHEN COUNT(DISTINCT bpq.id) > 0 THEN COUNT(DISTINCT bpq.id) FILTER (WHERE bpq.status != 'AI_SUGGESTED')::NUMERIC / COUNT(DISTINCT bpq.id) * 25 ELSE 0 END)
        ),
        1
    ) AS estimated_completion_pct

FROM public.bid_projects bp
LEFT JOIN public.bid_line_items bli ON bp.id = bli.bid_project_id
LEFT JOIN public.bid_project_risks bpr ON bp.id = bpr.bid_project_id
LEFT JOIN public.bid_prebid_questions bpq ON bp.id = bpq.bid_project_id
LEFT JOIN public.bid_environmental_commitments bec ON bp.id = bec.bid_project_id
LEFT JOIN public.bid_hazmat_findings bhf ON bp.id = bhf.bid_project_id
LEFT JOIN public.bid_work_packages bwp ON bp.id = bwp.bid_project_id
LEFT JOIN public.bid_documents bd ON bp.id = bd.bid_project_id
GROUP BY bp.id, bp.project_name, bp.owner, bp.letting_date, bp.bid_due_date, bp.status;

-- ============================================================================
-- VIEW: v_bid_items_needing_review
-- Purpose: Priority queue of items needing estimator attention
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_items_needing_review AS
SELECT
    bli.id,
    bli.bid_project_id,
    bp.project_name,
    bli.item_number,
    bli.description,
    bli.quantity,
    bli.unit,
    bli.base_unit_cost,
    COALESCE(bli.final_extended_price, bli.quantity * COALESCE(bli.ai_suggested_unit_price, 0)) AS extended_value,
    bli.estimation_method,
    bli.price_source,
    bli.risk_level,
    bli.review_priority_score,

    -- Why review is needed
    CASE
        WHEN bli.pricing_reviewed = FALSE AND bli.estimation_method = 'MANUAL_ESTIMATOR_JUDGMENT' THEN 'Manual price needs verification'
        WHEN bli.pricing_reviewed = FALSE AND bli.risk_level IN ('HIGH', 'CRITICAL') THEN 'High risk item'
        WHEN bli.pricing_reviewed = FALSE AND bli.ai_categorization_confidence < 0.7 THEN 'Low AI confidence'
        WHEN bli.pricing_reviewed = FALSE AND (SELECT COUNT(*) FROM public.bid_risk_item_links WHERE line_item_id = bli.id) > 0 THEN 'Has linked risks'
        WHEN bli.pricing_reviewed = FALSE THEN 'Not yet reviewed'
        ELSE 'Review complete'
    END AS review_reason,

    -- Context
    (SELECT COUNT(*) FROM public.bid_risk_item_links WHERE line_item_id = bli.id) AS linked_risks,
    (SELECT COUNT(*) FROM public.bid_prebid_question_items WHERE line_item_id = bli.id) AS linked_questions,

    -- Assembly info
    bia.assembly_template_id IS NOT NULL AS has_assembly,
    bat.name AS assembly_name

FROM public.bid_line_items bli
JOIN public.bid_projects bp ON bli.bid_project_id = bp.id
LEFT JOIN public.bid_item_assemblies bia ON bli.id = bia.line_item_id
LEFT JOIN public.bid_assembly_templates bat ON bia.assembly_template_id = bat.id
WHERE bli.pricing_reviewed = FALSE
ORDER BY
    COALESCE(bli.review_priority_score, 0) DESC,
    COALESCE(bli.final_extended_price, bli.quantity * COALESCE(bli.ai_suggested_unit_price, 0)) DESC;

-- ============================================================================
-- VIEW: v_bid_assembly_usage
-- Purpose: Which templates are used most and their effectiveness
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_assembly_usage AS
SELECT
    bat.id AS template_id,
    bat.name AS template_name,
    bat.code AS template_code,
    bat.work_category,
    bat.organization_id,
    CASE WHEN bat.organization_id IS NULL THEN 'Global' ELSE 'Organization' END AS template_scope,

    -- Usage Stats
    bat.times_used,
    bat.last_used_at,
    COUNT(DISTINCT bia.id) AS active_applications,
    COUNT(DISTINCT bli.bid_project_id) AS projects_used_in,

    -- Cost Stats
    bat.total_cost_per_unit AS template_unit_cost,
    AVG(bia.calculated_base_unit_cost) AS avg_applied_cost,
    AVG(bia.productivity_factor) AS avg_productivity_factor,

    -- AI Stats
    AVG(bia.ai_confidence_score) FILTER (WHERE bia.is_ai_suggested) AS avg_ai_confidence,
    COUNT(*) FILTER (WHERE bia.template_overridden) AS times_overridden,
    COUNT(*) FILTER (WHERE bia.is_manually_adjusted) AS times_adjusted

FROM public.bid_assembly_templates bat
LEFT JOIN public.bid_item_assemblies bia ON bat.id = bia.assembly_template_id
LEFT JOIN public.bid_line_items bli ON bia.line_item_id = bli.id
WHERE bat.is_active = TRUE
GROUP BY bat.id, bat.name, bat.code, bat.work_category, bat.organization_id,
         bat.times_used, bat.last_used_at, bat.total_cost_per_unit;

-- ============================================================================
-- VIEW: v_bid_category_summary
-- Purpose: Summarize line items by work category
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_category_summary AS
SELECT
    bli.bid_project_id,
    bp.project_name,
    bli.work_category,
    COUNT(*) AS item_count,
    SUM(COALESCE(bli.quantity, 0)) AS total_quantity,
    SUM(COALESCE(bli.base_unit_cost, 0) * COALESCE(bli.quantity, 0)) AS total_base_cost,
    SUM(COALESCE(bli.final_extended_price, 0)) AS total_extended_price,
    AVG(COALESCE(bli.base_unit_cost, 0)) AS avg_unit_cost,

    -- Pricing Method Distribution
    COUNT(*) FILTER (WHERE bli.estimation_method = 'ASSEMBLY_BASED') AS assembly_count,
    COUNT(*) FILTER (WHERE bli.estimation_method = 'SUBQUOTE') AS subquote_count,
    COUNT(*) FILTER (WHERE bli.estimation_method = 'HISTORICAL_ANALOG') AS historical_count,
    COUNT(*) FILTER (WHERE bli.estimation_method = 'MANUAL_ESTIMATOR_JUDGMENT') AS manual_count,

    -- Risk Distribution
    COUNT(*) FILTER (WHERE bli.risk_level = 'HIGH' OR bli.risk_level = 'CRITICAL') AS high_risk_count,

    -- Review Status
    COUNT(*) FILTER (WHERE bli.pricing_reviewed) AS reviewed_count,
    ROUND(COUNT(*) FILTER (WHERE bli.pricing_reviewed)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 1) AS review_pct

FROM public.bid_line_items bli
JOIN public.bid_projects bp ON bli.bid_project_id = bp.id
GROUP BY bli.bid_project_id, bp.project_name, bli.work_category;

-- ============================================================================
-- HELPER FUNCTION: Get bid project metrics
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_bid_project_metrics(p_bid_project_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'project_id', bp.id,
        'project_name', bp.project_name,
        'status', bp.status,
        'bid_date', bp.bid_date,
        'line_items', jsonb_build_object(
            'total', COUNT(DISTINCT bli.id),
            'reviewed', COUNT(DISTINCT bli.id) FILTER (WHERE bli.pricing_reviewed),
            'with_assembly', COUNT(DISTINCT bli.id) FILTER (WHERE bia.id IS NOT NULL)
        ),
        'financials', jsonb_build_object(
            'total_base_cost', COALESCE(SUM(bli.base_unit_cost * bli.quantity), 0),
            'total_bid_value', COALESCE(SUM(bli.final_extended_price), 0)
        ),
        'risks', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM public.bid_project_risks WHERE bid_project_id = p_bid_project_id AND type = 'RISK'),
            'high_critical', (SELECT COUNT(*) FROM public.bid_project_risks WHERE bid_project_id = p_bid_project_id AND type = 'RISK' AND overall_severity IN ('HIGH', 'CRITICAL')),
            'opportunities', (SELECT COUNT(*) FROM public.bid_project_risks WHERE bid_project_id = p_bid_project_id AND type = 'OPPORTUNITY')
        ),
        'questions', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM public.bid_prebid_questions WHERE bid_project_id = p_bid_project_id),
            'submitted', (SELECT COUNT(*) FROM public.bid_prebid_questions WHERE bid_project_id = p_bid_project_id AND status = 'SUBMITTED'),
            'answered', (SELECT COUNT(*) FROM public.bid_prebid_questions WHERE bid_project_id = p_bid_project_id AND status = 'ANSWERED')
        ),
        'documents', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM public.bid_documents WHERE bid_project_id = p_bid_project_id),
            'processed', (SELECT COUNT(*) FROM public.bid_documents WHERE bid_project_id = p_bid_project_id AND processing_status = 'COMPLETED')
        ),
        'work_packages', (SELECT COUNT(*) FROM public.bid_work_packages WHERE bid_project_id = p_bid_project_id)
    ) INTO v_result
    FROM public.bid_projects bp
    LEFT JOIN public.bid_line_items bli ON bp.id = bli.bid_project_id
    LEFT JOIN public.bid_item_assemblies bia ON bli.id = bia.line_item_id
    WHERE bp.id = p_bid_project_id
    GROUP BY bp.id, bp.project_name, bp.status, bp.bid_date;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON VIEW public.v_bid_line_item_full IS 'Complete line item view with all related data';
COMMENT ON VIEW public.v_bid_project_dashboard IS 'Executive dashboard metrics for bid projects';
COMMENT ON VIEW public.v_bid_items_needing_review IS 'Priority queue of items requiring estimator review';
COMMENT ON VIEW public.v_bid_assembly_usage IS 'Assembly template usage statistics and effectiveness';
COMMENT ON VIEW public.v_bid_category_summary IS 'Line item summary by work category';
COMMENT ON FUNCTION public.get_bid_project_metrics IS 'Get comprehensive metrics for a bid project as JSON';
