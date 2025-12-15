-- =============================================================================
-- Migration 128: Fix Bid Intelligence RLS Policies
-- =============================================================================
-- The RLS policies for bid_project_risks and bid_prebid_questions use subqueries
-- against bid_projects which also has RLS, causing a circular dependency.
-- This migration creates SECURITY DEFINER helper functions to bypass RLS
-- when looking up organization_id through bid_projects.
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTION: Get organization_id from bid_project_id
-- Uses SECURITY DEFINER to bypass RLS on bid_projects lookup
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_bid_project_organization_id(p_bid_project_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id
    FROM public.bid_projects
    WHERE id = p_bid_project_id
    LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_bid_project_organization_id(UUID) TO authenticated;

-- =============================================================================
-- FIX: bid_project_risks RLS Policy
-- =============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "Users see bid project risks" ON public.bid_project_risks;

-- Create new policy that uses the SECURITY DEFINER function
CREATE POLICY "Users see bid project risks" ON public.bid_project_risks
    FOR ALL USING (
        public.get_bid_project_organization_id(bid_project_id) = public.get_user_organization_id(auth.uid())
    );

-- =============================================================================
-- FIX: bid_prebid_questions RLS Policy
-- =============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "Users see bid prebid questions" ON public.bid_prebid_questions;

-- Create new policy that uses the SECURITY DEFINER function
CREATE POLICY "Users see bid prebid questions" ON public.bid_prebid_questions
    FOR ALL USING (
        public.get_bid_project_organization_id(bid_project_id) = public.get_user_organization_id(auth.uid())
    );

-- =============================================================================
-- FIX: bid_work_packages RLS Policy (if exists)
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'bid_work_packages' AND schemaname = 'public') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users see bid work packages" ON public.bid_work_packages';
        EXECUTE 'CREATE POLICY "Users see bid work packages" ON public.bid_work_packages
            FOR ALL USING (
                public.get_bid_project_organization_id(bid_project_id) = public.get_user_organization_id(auth.uid())
            )';
    END IF;
END $$;

-- =============================================================================
-- FIX: bid_line_items RLS Policy
-- =============================================================================

DROP POLICY IF EXISTS "Users see own org bid line items" ON public.bid_line_items;

CREATE POLICY "Users see own org bid line items" ON public.bid_line_items
    FOR ALL USING (
        public.get_bid_project_organization_id(bid_project_id) = public.get_user_organization_id(auth.uid())
    );

-- =============================================================================
-- FIX: bid_documents RLS Policy
-- =============================================================================

DROP POLICY IF EXISTS "Users see own org bid documents" ON public.bid_documents;

CREATE POLICY "Users see own org bid documents" ON public.bid_documents
    FOR ALL USING (
        public.get_bid_project_organization_id(bid_project_id) = public.get_user_organization_id(auth.uid())
    );

-- =============================================================================
-- COMPLETION
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 128: Fixed RLS policies for bid intelligence tables';
    RAISE NOTICE 'Created helper function: get_bid_project_organization_id(UUID)';
    RAISE NOTICE 'Updated tables: bid_project_risks, bid_prebid_questions, bid_work_packages, bid_line_items, bid_documents';
END $$;
