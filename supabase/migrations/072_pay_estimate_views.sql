-- =============================================================================
-- Migration 072: Pay Estimate Views and Summary Functions
-- Pay Estimate + Bid Integration Module - Phase 6
-- =============================================================================
-- Per UNIFIED_MODULE_SPECIFICATION V7.0
-- Creates: Dashboard views, worksheet summary, API helper functions
-- =============================================================================

-- ============================================================================
-- PART 1: PAY PERIOD DASHBOARD VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.v_pay_period_dashboard AS
SELECT
    pp.id,
    pp.organization_id,
    pp.project_id,
    p.name as project_name,
    p.project_number,
    pp.estimate_number,
    pp.period_start_date,
    pp.period_end_date,
    pp.status,
    pp.funds_received_date,
    pp.payment_deadline_date,
    pp.payment_deadline_date - CURRENT_DATE as days_until_deadline,
    CASE
        WHEN pp.payment_deadline_date < CURRENT_DATE THEN 'OVERDUE'
        WHEN pp.payment_deadline_date = CURRENT_DATE THEN 'DUE_TODAY'
        WHEN pp.payment_deadline_date <= CURRENT_DATE + 3 THEN 'URGENT'
        WHEN pp.payment_deadline_date <= CURRENT_DATE + 7 THEN 'WARNING'
        ELSE 'ON_TRACK'
    END as deadline_status,
    pp.posted_item_pay,
    pp.asphalt_adjustment,
    pp.fuel_adjustment,
    pp.construction_stockpile,
    pp.material_withheld,
    pp.net_pay_amount,
    pp.cumulative_net_pay,
    -- Line item counts
    (SELECT COUNT(*) FROM public.pay_period_line_items WHERE pay_period_id = pp.id) as line_item_count,
    -- IMR status
    (SELECT COUNT(*) FROM public.imr_items WHERE pay_period_id = pp.id AND resolution_status = 'OPEN') as open_imr_count,
    COALESCE((SELECT SUM(amount_withheld) FROM public.imr_items WHERE pay_period_id = pp.id AND resolution_status = 'OPEN'), 0) as open_imr_amount,
    -- Sub payment status
    (SELECT COUNT(DISTINCT subcontractor_id) FROM public.sub_payment_allocations spa
     JOIN public.subcontract_line_items scli ON spa.subcontract_line_item_id = scli.id
     WHERE spa.pay_period_id = pp.id AND spa.current_qty > 0) as active_sub_count,
    (SELECT COUNT(*) FROM public.sub_payments WHERE pay_period_id = pp.id AND check_date IS NOT NULL) as paid_sub_count,
    COALESCE((SELECT SUM(net_amount) FROM public.sub_payments WHERE pay_period_id = pp.id), 0) as total_sub_payments,
    pp.created_at,
    pp.updated_at
FROM public.pay_periods pp
JOIN public.projects p ON pp.project_id = p.id;

COMMENT ON VIEW public.v_pay_period_dashboard IS 'Dashboard view for pay period management with status indicators';

-- ============================================================================
-- PART 2: SUB WORKSHEET SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.v_sub_worksheet_summary AS
SELECT
    spa.pay_period_id,
    pp.estimate_number,
    pp.project_id,
    p.name as project_name,
    scli.subcontractor_id,
    s.company_name as subcontractor_name,
    s.is_dbe_certified,
    -- Aggregated quantities
    SUM(spa.previous_qty) as total_previous_qty,
    SUM(spa.current_qty) as total_current_qty,
    SUM(spa.total_to_date_qty) as total_to_date_qty,
    -- Aggregated amounts
    SUM(spa.previous_amount) as total_previous_amount,
    SUM(spa.current_amount) as total_current_amount,
    SUM(spa.total_to_date_amount) as total_to_date_amount,
    -- Line counts
    COUNT(*) as line_count,
    COUNT(CASE WHEN spa.is_over_contract THEN 1 END) as over_contract_count,
    -- Status
    MAX(spa.status) as worksheet_status,
    BOOL_OR(spa.is_over_contract) as has_over_contract_items
FROM public.sub_payment_allocations spa
JOIN public.pay_periods pp ON spa.pay_period_id = pp.id
JOIN public.projects p ON pp.project_id = p.id
JOIN public.subcontract_line_items scli ON spa.subcontract_line_item_id = scli.id
JOIN public.subcontractors s ON scli.subcontractor_id = s.id
WHERE spa.current_qty > 0 OR spa.status != 'DRAFT'
GROUP BY spa.pay_period_id, pp.estimate_number, pp.project_id, p.name,
         scli.subcontractor_id, s.company_name, s.is_dbe_certified;

COMMENT ON VIEW public.v_sub_worksheet_summary IS 'Summary of sub worksheet by subcontractor per pay period';

-- ============================================================================
-- PART 3: PROJECT HANDOFF STATUS VIEW
-- ============================================================================
-- NOTE: This view works independently of bid_projects table.
-- If bid_projects exists, it will be joined; otherwise NULL values are used.

CREATE OR REPLACE VIEW public.v_project_handoff_status AS
SELECT
    ph.id as handoff_id,
    ph.organization_id,
    ph.project_id,
    p.name as project_name,
    p.project_number,
    p.status as project_status,
    ph.bid_project_id,
    NULL::TEXT as bid_project_name,  -- Will be populated when bid_projects table exists
    ph.status as handoff_status,
    ph.region,
    -- VP Assignment
    ph.assigned_vp_id,
    vp.email as vp_email,
    ph.vp_assigned_at,
    -- Team
    ph.pm_id,
    pm.email as pm_email,
    ph.general_super_id,
    gs.email as general_super_email,
    ph.pe_id,
    pe.email as pe_email,
    ph.team_assigned_at,
    -- Handoff Meeting
    ph.handoff_meeting_date,
    ph.handoff_meeting_location,
    ph.handoff_completed_at,
    -- Estimator
    ph.lead_estimator_id,
    est.email as estimator_email,
    -- Counts (uses COALESCE to handle NULL bid_project_id)
    COALESCE((SELECT COUNT(*) FROM public.estimating_notes WHERE bid_project_id = ph.bid_project_id AND ph.bid_project_id IS NOT NULL), 0) as note_count,
    COALESCE((SELECT COUNT(*) FROM public.co_opportunities WHERE bid_project_id = ph.bid_project_id AND ph.bid_project_id IS NOT NULL), 0) as opportunity_count,
    COALESCE((SELECT COUNT(*) FROM public.bid_issues WHERE bid_project_id = ph.bid_project_id AND status = 'OPEN' AND ph.bid_project_id IS NOT NULL), 0) as open_issue_count,
    ph.created_at
FROM public.project_handoffs ph
JOIN public.projects p ON ph.project_id = p.id
LEFT JOIN public.user_profiles vp ON ph.assigned_vp_id = vp.id
LEFT JOIN public.user_profiles pm ON ph.pm_id = pm.id
LEFT JOIN public.user_profiles gs ON ph.general_super_id = gs.id
LEFT JOIN public.user_profiles pe ON ph.pe_id = pe.id
LEFT JOIN public.user_profiles est ON ph.lead_estimator_id = est.id;

COMMENT ON VIEW public.v_project_handoff_status IS 'Complete handoff status with team assignments and counts. Works independently of bid_projects table.';

-- ============================================================================
-- PART 4: SUBCONTRACT BUDGET DASHBOARD VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.v_subcontract_budget_dashboard AS
SELECT
    sb.id as budget_id,
    sb.organization_id,
    sb.project_id,
    p.name as project_name,
    p.project_number,
    sb.subcontractor_id,
    s.company_name as subcontractor_name,
    s.is_dbe_certified,
    sb.bid_amount,
    sb.negotiated_amount,
    sb.award_variance,
    sb.award_variance_pct,
    sb.total_paid_to_date,
    COALESCE(sb.negotiated_amount, sb.bid_amount) as comparison_amount,
    COALESCE(sb.negotiated_amount, sb.bid_amount) - sb.total_paid_to_date as remaining_budget,
    sb.percent_of_budget,
    sb.budget_status,
    sb.warning_threshold_pct,
    sb.critical_threshold_pct,
    -- Projection
    proj.projected_final,
    proj.projected_overage,
    proj.confidence,
    -- Payment counts
    (SELECT COUNT(*) FROM public.sub_payments sp
     JOIN public.pay_periods pp ON sp.pay_period_id = pp.id
     WHERE pp.project_id = sb.project_id AND sp.subcontractor_id = sb.subcontractor_id) as payment_count,
    -- Active alerts
    (SELECT COUNT(*) FROM public.budget_alerts ba
     WHERE ba.subcontract_budget_id = sb.id AND ba.is_acknowledged = FALSE) as unacked_alert_count
FROM public.subcontract_budgets sb
JOIN public.projects p ON sb.project_id = p.id
JOIN public.subcontractors s ON sb.subcontractor_id = s.id
LEFT JOIN LATERAL public.calculate_sub_projection(sb.id) proj ON TRUE;

COMMENT ON VIEW public.v_subcontract_budget_dashboard IS 'Budget tracking dashboard with projections and alerts';

-- ============================================================================
-- PART 5: IMR RESOLUTION TRACKING VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.v_imr_tracking AS
SELECT
    imr.id,
    imr.pay_period_id,
    pp.estimate_number,
    pp.project_id,
    p.name as project_name,
    imr.dmir_number,
    imr.item_number,
    imr.item_description,
    imr.deficiency_type,
    imr.deficiency_description,
    imr.qty_withheld,
    imr.amount_withheld,
    imr.resolution_status,
    imr.resolution_notes,
    imr.resolved_at,
    CASE
        WHEN imr.resolution_status = 'OPEN' THEN CURRENT_DATE - pp.period_end_date
        ELSE NULL
    END as days_open,
    imr.created_at
FROM public.imr_items imr
JOIN public.pay_periods pp ON imr.pay_period_id = pp.id
JOIN public.projects p ON pp.project_id = p.id;

COMMENT ON VIEW public.v_imr_tracking IS 'IMR deficiency tracking with aging';

-- ============================================================================
-- PART 6: API HELPER FUNCTIONS
-- ============================================================================

-- Get pay period with full details for worksheet
CREATE OR REPLACE FUNCTION public.get_pay_period_worksheet(p_pay_period_id UUID)
RETURNS TABLE (
    pay_period JSONB,
    line_items JSONB,
    imr_items JSONB,
    allocations JSONB,
    payments JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Pay period header
        row_to_json(pp.*)::JSONB as pay_period,
        -- Line items
        COALESCE((
            SELECT jsonb_agg(row_to_json(li.*))
            FROM public.pay_period_line_items li
            WHERE li.pay_period_id = p_pay_period_id
        ), '[]'::JSONB) as line_items,
        -- IMR items
        COALESCE((
            SELECT jsonb_agg(row_to_json(imr.*))
            FROM public.imr_items imr
            WHERE imr.pay_period_id = p_pay_period_id
        ), '[]'::JSONB) as imr_items,
        -- Allocations with subcontractor info
        COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'allocation', row_to_json(spa.*),
                'line_item', row_to_json(scli.*),
                'subcontractor', row_to_json(s.*)
            ))
            FROM public.sub_payment_allocations spa
            JOIN public.subcontract_line_items scli ON spa.subcontract_line_item_id = scli.id
            JOIN public.subcontractors s ON scli.subcontractor_id = s.id
            WHERE spa.pay_period_id = p_pay_period_id
        ), '[]'::JSONB) as allocations,
        -- Payments
        COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
                'payment', row_to_json(sp.*),
                'subcontractor', row_to_json(s.*)
            ))
            FROM public.sub_payments sp
            JOIN public.subcontractors s ON sp.subcontractor_id = s.id
            WHERE sp.pay_period_id = p_pay_period_id
        ), '[]'::JSONB) as payments
    FROM public.pay_periods pp
    WHERE pp.id = p_pay_period_id;
END;
$$;

-- Get project financial summary
CREATE OR REPLACE FUNCTION public.get_project_financial_summary(p_project_id UUID)
RETURNS TABLE (
    project_info JSONB,
    revenue_summary JSONB,
    cost_summary JSONB,
    margin_summary JSONB,
    budget_status JSONB,
    compliance_status JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        -- Project info
        jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'project_number', p.project_number,
            'status', p.status,
            'contract_value', p.current_contract_value,
            'percent_complete', p.percent_complete
        ) as project_info,
        -- Revenue summary
        jsonb_build_object(
            'total_estimates', (SELECT COUNT(*) FROM public.pay_periods WHERE project_id = p_project_id),
            'total_revenue', COALESCE((SELECT SUM(net_pay_amount) FROM public.pay_periods WHERE project_id = p_project_id), 0),
            'stockpile_balance', COALESCE((SELECT SUM(construction_stockpile) FROM public.pay_periods WHERE project_id = p_project_id), 0),
            'imr_withheld', COALESCE((SELECT SUM(material_withheld) FROM public.pay_periods WHERE project_id = p_project_id), 0)
        ) as revenue_summary,
        -- Cost summary
        jsonb_build_object(
            'total_sub_cost', COALESCE((
                SELECT SUM(sp.net_amount)
                FROM public.sub_payments sp
                JOIN public.pay_periods pp ON sp.pay_period_id = pp.id
                WHERE pp.project_id = p_project_id
            ), 0),
            'retainage_held', COALESCE((
                SELECT SUM(sp.retainage_held)
                FROM public.sub_payments sp
                JOIN public.pay_periods pp ON sp.pay_period_id = pp.id
                WHERE pp.project_id = p_project_id
            ), 0),
            'sub_count', (SELECT COUNT(DISTINCT subcontractor_id) FROM public.subcontract_budgets WHERE project_id = p_project_id)
        ) as cost_summary,
        -- Margin summary
        jsonb_build_object(
            'gross_margin', COALESCE((
                SELECT SUM(net_pay_amount) FROM public.pay_periods WHERE project_id = p_project_id
            ), 0) - COALESCE((
                SELECT SUM(sp.net_amount)
                FROM public.sub_payments sp
                JOIN public.pay_periods pp ON sp.pay_period_id = pp.id
                WHERE pp.project_id = p_project_id
            ), 0),
            'margin_pct', CASE
                WHEN COALESCE((SELECT SUM(net_pay_amount) FROM public.pay_periods WHERE project_id = p_project_id), 0) > 0 THEN
                    ROUND((
                        (COALESCE((SELECT SUM(net_pay_amount) FROM public.pay_periods WHERE project_id = p_project_id), 0) -
                         COALESCE((SELECT SUM(sp.net_amount) FROM public.sub_payments sp JOIN public.pay_periods pp ON sp.pay_period_id = pp.id WHERE pp.project_id = p_project_id), 0))
                        / COALESCE((SELECT SUM(net_pay_amount) FROM public.pay_periods WHERE project_id = p_project_id), 1) * 100
                    )::NUMERIC, 2)
                ELSE 0
            END
        ) as margin_summary,
        -- Budget status
        jsonb_build_object(
            'on_track', (SELECT COUNT(*) FROM public.subcontract_budgets WHERE project_id = p_project_id AND budget_status = 'ON_TRACK'),
            'warning', (SELECT COUNT(*) FROM public.subcontract_budgets WHERE project_id = p_project_id AND budget_status = 'WARNING'),
            'critical', (SELECT COUNT(*) FROM public.subcontract_budgets WHERE project_id = p_project_id AND budget_status = 'CRITICAL'),
            'over_budget', (SELECT COUNT(*) FROM public.subcontract_budgets WHERE project_id = p_project_id AND budget_status = 'OVER_BUDGET')
        ) as budget_status,
        -- Compliance status
        jsonb_build_object(
            'pending_deadlines', (SELECT COUNT(*) FROM public.pay_periods WHERE project_id = p_project_id AND status IN ('FUNDS_RECEIVED', 'SUB_WS_IN_PROGRESS', 'PENDING_APPROVAL')),
            'overdue', (SELECT COUNT(*) FROM public.pay_periods WHERE project_id = p_project_id AND payment_deadline_date < CURRENT_DATE AND status NOT IN ('CHECKS_CUT', 'CRL_SUBMITTED', 'CLOSED')),
            'late_payments', (SELECT COUNT(*) FROM public.sub_payments sp JOIN public.pay_periods pp ON sp.pay_period_id = pp.id WHERE pp.project_id = p_project_id AND sp.is_late = TRUE)
        ) as compliance_status
    FROM public.projects p
    WHERE p.id = p_project_id;
END;
$$;

-- Bulk upsert allocations (for worksheet save)
CREATE OR REPLACE FUNCTION public.upsert_allocations(p_allocations JSONB)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
    v_allocation JSONB;
BEGIN
    FOR v_allocation IN SELECT * FROM jsonb_array_elements(p_allocations)
    LOOP
        INSERT INTO public.sub_payment_allocations (
            pay_period_id,
            subcontract_line_item_id,
            previous_qty,
            current_qty,
            state_paid_qty_this_period,
            variance_from_state,
            variance_explanation,
            over_contract_explanation,
            status,
            created_by,
            updated_by
        ) VALUES (
            (v_allocation->>'pay_period_id')::UUID,
            (v_allocation->>'subcontract_line_item_id')::UUID,
            COALESCE((v_allocation->>'previous_qty')::NUMERIC, 0),
            COALESCE((v_allocation->>'current_qty')::NUMERIC, 0),
            (v_allocation->>'state_paid_qty_this_period')::NUMERIC,
            (v_allocation->>'variance_from_state')::NUMERIC,
            v_allocation->>'variance_explanation',
            v_allocation->>'over_contract_explanation',
            COALESCE((v_allocation->>'status')::public.sub_payment_status, 'DRAFT'),
            auth.uid(),
            auth.uid()
        )
        ON CONFLICT (pay_period_id, subcontract_line_item_id)
        DO UPDATE SET
            previous_qty = EXCLUDED.previous_qty,
            current_qty = EXCLUDED.current_qty,
            state_paid_qty_this_period = EXCLUDED.state_paid_qty_this_period,
            variance_from_state = EXCLUDED.variance_from_state,
            variance_explanation = EXCLUDED.variance_explanation,
            over_contract_explanation = EXCLUDED.over_contract_explanation,
            status = EXCLUDED.status,
            updated_by = auth.uid(),
            updated_at = NOW();

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ============================================================================
-- PART 7: REPORTING FUNCTIONS
-- ============================================================================

-- Generate sub payment summary for a pay period
CREATE OR REPLACE FUNCTION public.generate_sub_payment_summary(p_pay_period_id UUID)
RETURNS TABLE (
    subcontractor_id UUID,
    company_name TEXT,
    is_dbe BOOLEAN,
    line_count INTEGER,
    gross_amount NUMERIC,
    retainage_amount NUMERIC,
    net_amount NUMERIC,
    over_contract_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id as subcontractor_id,
        s.company_name,
        s.is_dbe_certified as is_dbe,
        COUNT(spa.id)::INTEGER as line_count,
        SUM(spa.current_amount)::NUMERIC as gross_amount,
        ROUND(SUM(spa.current_amount) * COALESCE(MAX(scli.retainage_percent), 10) / 100, 2)::NUMERIC as retainage_amount,
        ROUND(SUM(spa.current_amount) * (1 - COALESCE(MAX(scli.retainage_percent), 10) / 100), 2)::NUMERIC as net_amount,
        COUNT(CASE WHEN spa.is_over_contract THEN 1 END)::INTEGER as over_contract_count
    FROM public.sub_payment_allocations spa
    JOIN public.subcontract_line_items scli ON spa.subcontract_line_item_id = scli.id
    JOIN public.subcontractors s ON scli.subcontractor_id = s.id
    WHERE spa.pay_period_id = p_pay_period_id
      AND spa.current_qty > 0
    GROUP BY s.id, s.company_name, s.is_dbe_certified
    ORDER BY s.company_name;
END;
$$;

-- ============================================================================
-- PART 8: COMMENTS
-- ============================================================================

COMMENT ON VIEW public.v_pay_period_dashboard IS 'Complete pay period dashboard with status indicators and counts';
COMMENT ON VIEW public.v_sub_worksheet_summary IS 'Aggregated worksheet data by subcontractor';
COMMENT ON VIEW public.v_project_handoff_status IS 'Handoff status with team and document counts';
COMMENT ON VIEW public.v_subcontract_budget_dashboard IS 'Budget tracking with projections';
COMMENT ON VIEW public.v_imr_tracking IS 'IMR deficiency tracking and aging';
COMMENT ON FUNCTION public.get_pay_period_worksheet IS 'Get complete worksheet data for a pay period';
COMMENT ON FUNCTION public.get_project_financial_summary IS 'Get complete financial summary for a project';
COMMENT ON FUNCTION public.upsert_allocations IS 'Bulk save worksheet allocations';
COMMENT ON FUNCTION public.generate_sub_payment_summary IS 'Generate payment summary by subcontractor';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 072: Pay Estimate Views completed successfully' as status;
