-- =============================================================================
-- Migration 070: Compliance Engine
-- Pay Estimate + Bid Integration Module - Phase 4
-- =============================================================================
-- Per UNIFIED_MODULE_SPECIFICATION V7.0
-- Creates: 14-day payment deadline enforcement, escalation functions,
--          pg_cron job definitions for automated checks
-- =============================================================================

-- ============================================================================
-- PART 1: 14-DAY COMPLIANCE CHECK FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_payment_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_period RECORD;
    v_existing_escalation RECORD;
    v_escalation_level public.escalation_level;
BEGIN
    FOR v_period IN
        SELECT
            pp.id,
            pp.organization_id,
            pp.project_id,
            pp.estimate_number,
            pp.payment_deadline_date,
            pp.payment_deadline_date - CURRENT_DATE as days_remaining,
            p.name as project_name
        FROM public.pay_periods pp
        JOIN public.projects p ON pp.project_id = p.id
        WHERE pp.status IN ('FUNDS_RECEIVED', 'SUB_WS_IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED')
          AND pp.payment_deadline_date IS NOT NULL
    LOOP
        -- Check if we already have an escalation at this level today
        SELECT * INTO v_existing_escalation
        FROM public.compliance_escalations
        WHERE pay_period_id = v_period.id
          AND created_at::DATE = CURRENT_DATE
          AND is_resolved = FALSE
        LIMIT 1;

        -- Determine escalation level based on days remaining
        IF v_period.days_remaining = 7 THEN
            v_escalation_level := 'LEVEL_1_WARNING';
        ELSIF v_period.days_remaining = 3 THEN
            v_escalation_level := 'LEVEL_2_URGENT';
        ELSIF v_period.days_remaining = 0 THEN
            v_escalation_level := 'LEVEL_3_DEADLINE';
        ELSIF v_period.days_remaining < 0 THEN
            v_escalation_level := 'LEVEL_4_VIOLATION';
        ELSE
            CONTINUE; -- No escalation needed
        END IF;

        -- Skip if already escalated today at same level
        IF v_existing_escalation IS NOT NULL AND v_existing_escalation.escalation_level = v_escalation_level THEN
            CONTINUE;
        END IF;

        -- Create escalation record
        INSERT INTO public.compliance_escalations (
            organization_id,
            pay_period_id,
            escalation_level,
            escalation_reason,
            days_remaining
        ) VALUES (
            v_period.organization_id,
            v_period.id,
            v_escalation_level,
            CASE v_escalation_level
                WHEN 'LEVEL_1_WARNING' THEN
                    format('Estimate #%s for %s: Payment deadline in 7 days', v_period.estimate_number, v_period.project_name)
                WHEN 'LEVEL_2_URGENT' THEN
                    format('URGENT: Estimate #%s for %s: Payment deadline in 3 days', v_period.estimate_number, v_period.project_name)
                WHEN 'LEVEL_3_DEADLINE' THEN
                    format('DEADLINE TODAY: Estimate #%s for %s: Must process payments today', v_period.estimate_number, v_period.project_name)
                WHEN 'LEVEL_4_VIOLATION' THEN
                    format('VIOLATION: Estimate #%s for %s: Payment deadline exceeded by %s days',
                        v_period.estimate_number, v_period.project_name, ABS(v_period.days_remaining))
            END,
            v_period.days_remaining
        );

        -- Mark sub_payments as late if deadline passed
        IF v_period.days_remaining < 0 THEN
            UPDATE public.sub_payments
            SET is_late = TRUE
            WHERE pay_period_id = v_period.id
              AND check_date IS NULL;
        END IF;
    END LOOP;
END;
$$;

-- ============================================================================
-- PART 2: ESCALATION NOTIFICATION HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_pending_escalations(p_organization_id UUID)
RETURNS TABLE (
    escalation_id UUID,
    project_id UUID,
    project_name TEXT,
    estimate_number INTEGER,
    escalation_level public.escalation_level,
    escalation_reason TEXT,
    days_remaining INTEGER,
    deadline_date DATE,
    pm_id UUID,
    pm_email TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ce.id as escalation_id,
        pp.project_id,
        p.name as project_name,
        pp.estimate_number,
        ce.escalation_level,
        ce.escalation_reason,
        ce.days_remaining,
        pp.payment_deadline_date as deadline_date,
        ph.pm_id,
        up.email as pm_email,
        ce.created_at
    FROM public.compliance_escalations ce
    JOIN public.pay_periods pp ON ce.pay_period_id = pp.id
    JOIN public.projects p ON pp.project_id = p.id
    LEFT JOIN public.project_handoffs ph ON ph.project_id = p.id
    LEFT JOIN public.user_profiles up ON up.id = ph.pm_id
    WHERE ce.organization_id = p_organization_id
      AND ce.is_resolved = FALSE
    ORDER BY ce.escalation_level DESC, ce.days_remaining ASC;
END;
$$;

-- ============================================================================
-- PART 3: MARK ESCALATION NOTIFICATIONS SENT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_escalation_notified(
    p_escalation_id UUID,
    p_notification_type TEXT  -- 'pm', 'controller', 'vp', 'executive'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.compliance_escalations
    SET
        pm_notified_at = CASE WHEN p_notification_type = 'pm' THEN NOW() ELSE pm_notified_at END,
        controller_notified_at = CASE WHEN p_notification_type = 'controller' THEN NOW() ELSE controller_notified_at END,
        vp_notified_at = CASE WHEN p_notification_type = 'vp' THEN NOW() ELSE vp_notified_at END,
        executive_notified_at = CASE WHEN p_notification_type = 'executive' THEN NOW() ELSE executive_notified_at END
    WHERE id = p_escalation_id;

    RETURN FOUND;
END;
$$;

-- ============================================================================
-- PART 4: RESOLVE ESCALATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.resolve_escalation(
    p_escalation_id UUID,
    p_resolution_notes TEXT,
    p_resolved_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.compliance_escalations
    SET
        is_resolved = TRUE,
        resolved_at = NOW(),
        resolved_by = p_resolved_by,
        resolution_notes = p_resolution_notes
    WHERE id = p_escalation_id;

    RETURN FOUND;
END;
$$;

-- ============================================================================
-- PART 5: PAYMENT DEADLINE SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.v_payment_deadline_summary AS
SELECT
    pp.organization_id,
    pp.project_id,
    p.name as project_name,
    p.project_number,
    pp.id as pay_period_id,
    pp.estimate_number,
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
    pp.net_pay_amount as total_to_distribute,
    COALESCE(sp_totals.total_payments, 0) as payments_completed,
    COALESCE(sp_totals.payment_count, 0) as subs_paid,
    COALESCE(sp_totals.pending_count, 0) as subs_pending
FROM public.pay_periods pp
JOIN public.projects p ON pp.project_id = p.id
LEFT JOIN (
    SELECT
        pay_period_id,
        SUM(net_amount) as total_payments,
        COUNT(CASE WHEN check_date IS NOT NULL THEN 1 END) as payment_count,
        COUNT(CASE WHEN check_date IS NULL THEN 1 END) as pending_count
    FROM public.sub_payments
    GROUP BY pay_period_id
) sp_totals ON sp_totals.pay_period_id = pp.id
WHERE pp.status IN ('FUNDS_RECEIVED', 'SUB_WS_IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED', 'CHECKS_CUT')
  AND pp.payment_deadline_date IS NOT NULL;

COMMENT ON VIEW public.v_payment_deadline_summary IS '14-day payment deadline status for all active pay periods';

-- ============================================================================
-- PART 6: LATE PAYMENTS REPORT VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.v_late_payments AS
SELECT
    sp.organization_id,
    p.name as project_name,
    p.project_number,
    s.company_name as subcontractor_name,
    pp.estimate_number,
    pp.payment_deadline_date,
    CURRENT_DATE - pp.payment_deadline_date as days_late,
    sp.gross_amount,
    sp.net_amount,
    sp.status as payment_status,
    ph.pm_id,
    up.email as pm_email
FROM public.sub_payments sp
JOIN public.pay_periods pp ON sp.pay_period_id = pp.id
JOIN public.projects p ON pp.project_id = p.id
JOIN public.subcontractors s ON sp.subcontractor_id = s.id
LEFT JOIN public.project_handoffs ph ON ph.project_id = p.id
LEFT JOIN public.user_profiles up ON up.id = ph.pm_id
WHERE sp.is_late = TRUE
  AND sp.check_date IS NULL
ORDER BY (CURRENT_DATE - pp.payment_deadline_date) DESC;

COMMENT ON VIEW public.v_late_payments IS 'All late subcontractor payments requiring immediate attention';

-- ============================================================================
-- PART 7: COMPLIANCE DASHBOARD SUMMARY FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_compliance_dashboard(p_organization_id UUID)
RETURNS TABLE (
    total_pending_periods INTEGER,
    due_today INTEGER,
    overdue INTEGER,
    urgent_3_days INTEGER,
    warning_7_days INTEGER,
    on_track INTEGER,
    total_pending_amount NUMERIC,
    total_late_amount NUMERIC,
    unacknowledged_alerts INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(DISTINCT pp.id)::INTEGER as total_pending_periods,
        COUNT(DISTINCT CASE WHEN pp.payment_deadline_date = CURRENT_DATE THEN pp.id END)::INTEGER as due_today,
        COUNT(DISTINCT CASE WHEN pp.payment_deadline_date < CURRENT_DATE THEN pp.id END)::INTEGER as overdue,
        COUNT(DISTINCT CASE WHEN pp.payment_deadline_date > CURRENT_DATE
            AND pp.payment_deadline_date <= CURRENT_DATE + 3 THEN pp.id END)::INTEGER as urgent_3_days,
        COUNT(DISTINCT CASE WHEN pp.payment_deadline_date > CURRENT_DATE + 3
            AND pp.payment_deadline_date <= CURRENT_DATE + 7 THEN pp.id END)::INTEGER as warning_7_days,
        COUNT(DISTINCT CASE WHEN pp.payment_deadline_date > CURRENT_DATE + 7 THEN pp.id END)::INTEGER as on_track,
        COALESCE(SUM(pp.net_pay_amount), 0)::NUMERIC as total_pending_amount,
        COALESCE((
            SELECT SUM(net_amount) FROM public.sub_payments sp2
            JOIN public.pay_periods pp2 ON sp2.pay_period_id = pp2.id
            WHERE pp2.organization_id = p_organization_id
              AND sp2.is_late = TRUE
              AND sp2.check_date IS NULL
        ), 0)::NUMERIC as total_late_amount,
        (SELECT COUNT(*) FROM public.compliance_escalations ce
         WHERE ce.organization_id = p_organization_id
           AND ce.is_resolved = FALSE)::INTEGER as unacknowledged_alerts
    FROM public.pay_periods pp
    WHERE pp.organization_id = p_organization_id
      AND pp.status IN ('FUNDS_RECEIVED', 'SUB_WS_IN_PROGRESS', 'PENDING_APPROVAL', 'APPROVED')
      AND pp.payment_deadline_date IS NOT NULL;
END;
$$;

-- ============================================================================
-- PART 8: CRON JOB DEFINITIONS (Documentation)
-- ============================================================================

-- These would be set up via Supabase Dashboard > Database > Extensions > pg_cron
-- Or via SQL after enabling the extension

-- Enable pg_cron extension (run in Supabase SQL editor with proper permissions)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Daily deadline check at 6:00 AM EST
-- SELECT cron.schedule('check-payment-deadlines', '0 11 * * *', 'SELECT public.check_payment_deadlines()');

-- Daily budget alert check at 7:00 AM EST
-- SELECT cron.schedule('check-budget-alerts', '0 12 * * *', 'SELECT public.check_budget_alerts()');

-- Document the cron setup requirements
COMMENT ON FUNCTION public.check_payment_deadlines IS
    'Daily check for 14-day payment deadline compliance. Set up via pg_cron: SELECT cron.schedule(''check-payment-deadlines'', ''0 11 * * *'', ''SELECT public.check_payment_deadlines()'')';

COMMENT ON FUNCTION public.check_budget_alerts IS
    'Daily check for budget alert conditions. Set up via pg_cron: SELECT cron.schedule(''check-budget-alerts'', ''0 12 * * *'', ''SELECT public.check_budget_alerts()'')';

-- ============================================================================
-- PART 9: CRL (Contractor Reporting & Liaison) SUBMISSION TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.crl_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    pay_period_id UUID NOT NULL REFERENCES public.pay_periods(id) ON DELETE CASCADE,

    -- Submission Details
    submission_date DATE NOT NULL,
    reporting_period_start DATE NOT NULL,
    reporting_period_end DATE NOT NULL,

    -- DBE Summary
    total_dbe_payments NUMERIC(18,2) DEFAULT 0,
    dbe_subcontractor_count INTEGER DEFAULT 0,

    -- Non-DBE Summary
    total_non_dbe_payments NUMERIC(18,2) DEFAULT 0,
    non_dbe_subcontractor_count INTEGER DEFAULT 0,

    -- Status
    confirmation_number TEXT,
    submitted_by UUID REFERENCES auth.users(id),
    submitted_at TIMESTAMPTZ,

    -- Document
    report_document_url TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crl_org ON public.crl_submissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_crl_period ON public.crl_submissions(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_crl_date ON public.crl_submissions(submission_date);

-- RLS
ALTER TABLE public.crl_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crl_select" ON public.crl_submissions FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "crl_insert" ON public.crl_submissions FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "crl_update" ON public.crl_submissions FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 10: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.crl_submissions IS 'WVDOH Contractor Reporting & Liaison (CRL) submission tracking';
COMMENT ON FUNCTION public.get_pending_escalations IS 'Get all unresolved escalations for an organization';
COMMENT ON FUNCTION public.get_compliance_dashboard IS 'Summary statistics for compliance dashboard';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 070: Compliance Engine completed successfully' as status;
