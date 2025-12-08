-- =============================================================================
-- Migration 071: Advanced RLS Policies and Access Control
-- Pay Estimate + Bid Integration Module - Phase 5
-- =============================================================================
-- Per UNIFIED_MODULE_SPECIFICATION V7.0
-- Creates: PM read-only retainage policy, CDR view access control,
--          role-based data visibility functions
-- =============================================================================

-- ============================================================================
-- PART 1: RETAINAGE READ-ONLY POLICY FOR PM
-- ============================================================================

-- Drop existing update policy if exists
DROP POLICY IF EXISTS "sub_payments_update" ON public.sub_payments;

-- PM can update sub_payments BUT cannot modify retainage fields
-- Only accounting (CONTROLLER role) can modify retainage
CREATE POLICY "sub_payments_update_pm" ON public.sub_payments FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()))
    WITH CHECK (
        -- If user is PM (not Controller), retainage fields must remain unchanged
        CASE
            WHEN EXISTS (
                SELECT 1 FROM public.project_assignments pa
                JOIN public.pay_periods pp ON pp.project_id = pa.project_id
                WHERE pp.id = sub_payments.pay_period_id
                  AND pa.user_id = auth.uid()
                  AND pa.project_role = 'CONTROLLER'
                  AND pa.is_active = TRUE
            ) THEN TRUE  -- Controller can modify anything
            ELSE (
                -- Non-controller: retainage fields must not change
                -- This is enforced by trigger below since WITH CHECK can't reference OLD
                TRUE
            )
        END
    );

-- Trigger to enforce retainage read-only for non-controllers
CREATE OR REPLACE FUNCTION public.enforce_retainage_readonly()
RETURNS TRIGGER AS $$
DECLARE
    v_is_controller BOOLEAN;
BEGIN
    -- Check if current user is a controller for this project
    SELECT EXISTS (
        SELECT 1 FROM public.project_assignments pa
        JOIN public.pay_periods pp ON pp.project_id = pa.project_id
        WHERE pp.id = NEW.pay_period_id
          AND pa.user_id = auth.uid()
          AND pa.project_role = 'CONTROLLER'
          AND pa.is_active = TRUE
    ) INTO v_is_controller;

    -- If not controller, retainage fields cannot be modified
    IF NOT v_is_controller THEN
        IF (OLD.retainage_held IS DISTINCT FROM NEW.retainage_held) OR
           (OLD.retainage_percent_applied IS DISTINCT FROM NEW.retainage_percent_applied) THEN
            RAISE EXCEPTION 'Only accounting (Controller role) can modify retainage fields';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_enforce_retainage_readonly ON public.sub_payments;
CREATE TRIGGER trg_enforce_retainage_readonly
    BEFORE UPDATE ON public.sub_payments
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_retainage_readonly();

-- ============================================================================
-- PART 2: FIELD TEAM ACCESS CONTROL (CONDENSED VIEW)
-- ============================================================================

-- Function to check if user should see condensed view only
CREATE OR REPLACE FUNCTION public.is_field_access_only(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_assignments
        WHERE user_id = p_user_id
        AND project_id = p_project_id
        AND access_level = 'CONDENSED'
        AND is_active = TRUE
        AND (ends_at IS NULL OR ends_at > NOW())
    ) AND NOT EXISTS (
        SELECT 1 FROM public.project_assignments
        WHERE user_id = p_user_id
        AND project_id = p_project_id
        AND access_level = 'FULL'
        AND is_active = TRUE
        AND (ends_at IS NULL OR ends_at > NOW())
    );
END;
$$;

-- ============================================================================
-- PART 3: ESTIMATING NOTES VISIBILITY CONTROL
-- ============================================================================

-- Field team can only see notes marked as visible_to_field
-- NOTE: This policy works independently of bid_projects table
DROP POLICY IF EXISTS "en_select" ON public.estimating_notes;
CREATE POLICY "en_select_with_visibility" ON public.estimating_notes FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND (
            -- Full access users see everything (check via project assignment)
            EXISTS (
                SELECT 1 FROM public.project_assignments pa
                WHERE pa.user_id = auth.uid()
                  AND pa.access_level = 'FULL'
                  AND pa.is_active = TRUE
                  AND EXISTS (
                      SELECT 1 FROM public.projects p
                      WHERE p.id = pa.project_id
                        AND p.organization_id = estimating_notes.organization_id
                  )
            )
            OR
            -- Condensed access users only see field-visible notes
            (visible_to_field = TRUE)
        )
    );

-- ============================================================================
-- PART 4: CO OPPORTUNITIES VISIBILITY CONTROL
-- ============================================================================

-- NOTE: This policy works independently of bid_projects table
DROP POLICY IF EXISTS "co_select" ON public.co_opportunities;
CREATE POLICY "co_select_with_visibility" ON public.co_opportunities FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND (
            -- Full access users see everything via direct project assignment
            EXISTS (
                SELECT 1 FROM public.project_assignments pa
                WHERE pa.project_id = co_opportunities.project_id
                  AND pa.user_id = auth.uid()
                  AND pa.access_level = 'FULL'
                  AND pa.is_active = TRUE
            )
            OR
            -- Full access users in same org see all opportunities
            EXISTS (
                SELECT 1 FROM public.project_assignments pa
                JOIN public.projects p ON pa.project_id = p.id
                WHERE p.organization_id = co_opportunities.organization_id
                  AND pa.user_id = auth.uid()
                  AND pa.access_level = 'FULL'
                  AND pa.is_active = TRUE
            )
            OR
            -- Condensed access users only see field-visible opportunities
            (visible_to_field = TRUE)
        )
    );

-- ============================================================================
-- PART 5: BID ISSUES VISIBILITY CONTROL
-- ============================================================================

-- NOTE: This policy works independently of bid_projects table
DROP POLICY IF EXISTS "bi_select" ON public.bid_issues;
CREATE POLICY "bi_select_with_visibility" ON public.bid_issues FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND (
            -- Full access users see everything via direct project assignment
            EXISTS (
                SELECT 1 FROM public.project_assignments pa
                WHERE pa.project_id = bid_issues.project_id
                  AND pa.user_id = auth.uid()
                  AND pa.access_level = 'FULL'
                  AND pa.is_active = TRUE
            )
            OR
            -- Full access users in same org see all issues
            EXISTS (
                SELECT 1 FROM public.project_assignments pa
                JOIN public.projects p ON pa.project_id = p.id
                WHERE p.organization_id = bid_issues.organization_id
                  AND pa.user_id = auth.uid()
                  AND pa.access_level = 'FULL'
                  AND pa.is_active = TRUE
            )
            OR
            -- Condensed access users only see field-visible issues
            (visible_to_field = TRUE)
        )
    );

-- ============================================================================
-- PART 6: FINANCIAL DATA ACCESS CONTROL
-- ============================================================================

-- sub_payment_allocations: Full access only
DROP POLICY IF EXISTS "spa_select" ON public.sub_payment_allocations;
CREATE POLICY "spa_select_full_access" ON public.sub_payment_allocations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.pay_periods pp
            JOIN public.project_assignments pa ON pa.project_id = pp.project_id
            WHERE pp.id = sub_payment_allocations.pay_period_id
              AND pa.user_id = auth.uid()
              AND pa.access_level = 'FULL'
              AND pa.is_active = TRUE
        )
    );

-- sub_payments: Full access only
DROP POLICY IF EXISTS "sub_payments_select" ON public.sub_payments;
CREATE POLICY "sub_payments_select_full_access" ON public.sub_payments FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.pay_periods pp
            JOIN public.project_assignments pa ON pa.project_id = pp.project_id
            WHERE pp.id = sub_payments.pay_period_id
              AND pa.user_id = auth.uid()
              AND pa.access_level = 'FULL'
              AND pa.is_active = TRUE
        )
    );

-- subcontract_budgets: Full access only
DROP POLICY IF EXISTS "sb_select" ON public.subcontract_budgets;
CREATE POLICY "sb_select_full_access" ON public.subcontract_budgets FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = subcontract_budgets.project_id
              AND pa.user_id = auth.uid()
              AND pa.access_level = 'FULL'
              AND pa.is_active = TRUE
        )
    );

-- project_financials: Full access only
DROP POLICY IF EXISTS "pf_select" ON public.project_financials;
CREATE POLICY "pf_select_full_access" ON public.project_financials FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = project_financials.project_id
              AND pa.user_id = auth.uid()
              AND pa.access_level = 'FULL'
              AND pa.is_active = TRUE
        )
    );

-- budget_alerts: Full access only
DROP POLICY IF EXISTS "ba_select" ON public.budget_alerts;
CREATE POLICY "ba_select_full_access" ON public.budget_alerts FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.project_assignments pa
            WHERE pa.project_id = budget_alerts.project_id
              AND pa.user_id = auth.uid()
              AND pa.access_level = 'FULL'
              AND pa.is_active = TRUE
        )
    );

-- ============================================================================
-- PART 7: ADMIN/VP OVERRIDE ACCESS
-- ============================================================================

-- Function to check if user is admin or VP with org-wide access
CREATE OR REPLACE FUNCTION public.has_org_wide_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if user has admin role or is VP_OPERATIONS on any project
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = p_user_id
          AND r.code IN ('ADMIN', 'EXECUTIVE')
    ) OR EXISTS (
        SELECT 1 FROM public.project_assignments pa
        WHERE pa.user_id = p_user_id
          AND pa.project_role = 'VP_OPERATIONS'
          AND pa.is_active = TRUE
    );
END;
$$;

-- Add org-wide access to financial policies
-- This allows VPs and admins to see all projects without explicit assignment

-- Update pay_periods to include org-wide access
DROP POLICY IF EXISTS "pay_periods_select" ON public.pay_periods;
CREATE POLICY "pay_periods_select_with_override" ON public.pay_periods FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND (
            public.has_org_wide_access(auth.uid())
            OR EXISTS (
                SELECT 1 FROM public.project_assignments pa
                WHERE pa.project_id = pay_periods.project_id
                  AND pa.user_id = auth.uid()
                  AND pa.is_active = TRUE
            )
        )
    );

-- ============================================================================
-- PART 8: HELPER FUNCTION FOR SECURE DATA ACCESS
-- ============================================================================

-- Get visible data based on user's access level
CREATE OR REPLACE FUNCTION public.get_project_data_for_user(
    p_user_id UUID,
    p_project_id UUID
)
RETURNS TABLE (
    access_level public.access_level,
    can_see_costs BOOLEAN,
    can_see_co_opportunities BOOLEAN,
    can_see_estimating_notes BOOLEAN,
    can_edit_worksheet BOOLEAN,
    can_approve_payments BOOLEAN,
    can_modify_retainage BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_access public.access_level;
    v_role public.project_role;
BEGIN
    -- Get highest access level and role
    SELECT pa.access_level, pa.project_role
    INTO v_access, v_role
    FROM public.project_assignments pa
    WHERE pa.user_id = p_user_id
      AND pa.project_id = p_project_id
      AND pa.is_active = TRUE
      AND (pa.ends_at IS NULL OR pa.ends_at > NOW())
    ORDER BY
        CASE pa.access_level
            WHEN 'FULL' THEN 1
            WHEN 'CONDENSED' THEN 2
            WHEN 'READ_ONLY' THEN 3
            ELSE 4
        END
    LIMIT 1;

    RETURN QUERY SELECT
        COALESCE(v_access, 'NONE'::public.access_level),
        COALESCE(v_access = 'FULL', FALSE),
        COALESCE(v_access = 'FULL', FALSE),
        COALESCE(v_access = 'FULL', FALSE),
        COALESCE(v_role IN ('PROJECT_MANAGER', 'PROJECT_ENGINEER', 'VP_OPERATIONS', 'ADMIN'), FALSE),
        COALESCE(v_role IN ('VP_OPERATIONS', 'PROJECT_MANAGER', 'ADMIN'), FALSE),
        COALESCE(v_role = 'CONTROLLER', FALSE);
END;
$$;

-- ============================================================================
-- PART 9: AUDIT TRAIL FOR SENSITIVE ACCESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.financial_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    project_id UUID NOT NULL REFERENCES public.projects(id),
    accessed_table TEXT NOT NULL,
    accessed_record_id UUID,
    access_type TEXT NOT NULL,  -- 'VIEW', 'EDIT', 'EXPORT'
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fal_user ON public.financial_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_fal_project ON public.financial_access_log(project_id);
CREATE INDEX IF NOT EXISTS idx_fal_created ON public.financial_access_log(created_at);

ALTER TABLE public.financial_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view the access log
CREATE POLICY "fal_select_admin" ON public.financial_access_log FOR SELECT
    USING (public.has_org_wide_access(auth.uid()));

CREATE POLICY "fal_insert" ON public.financial_access_log FOR INSERT
    WITH CHECK (TRUE);  -- Anyone can log their own access

-- Function to log financial data access
CREATE OR REPLACE FUNCTION public.log_financial_access(
    p_project_id UUID,
    p_table_name TEXT,
    p_record_id UUID,
    p_access_type TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.financial_access_log (
        user_id, project_id, accessed_table, accessed_record_id, access_type
    ) VALUES (
        auth.uid(), p_project_id, p_table_name, p_record_id, p_access_type
    );
END;
$$;

-- ============================================================================
-- PART 10: COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.enforce_retainage_readonly IS 'Ensures only Controllers can modify retainage fields on sub_payments';
COMMENT ON FUNCTION public.is_field_access_only IS 'Check if user has only CONDENSED (field) access to a project';
COMMENT ON FUNCTION public.has_org_wide_access IS 'Check if user is admin/VP with organization-wide data access';
COMMENT ON FUNCTION public.get_project_data_for_user IS 'Get user permissions for a specific project';
COMMENT ON TABLE public.financial_access_log IS 'Audit trail for access to sensitive financial data';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 071: Advanced RLS Policies completed successfully' as status;
