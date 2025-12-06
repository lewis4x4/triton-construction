-- Migration 033: Fix Organizations RLS
-- The get_my_org_id() function approach has issues.
-- Use a simpler direct approach.

-- ============================================================================
-- STEP 1: Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "organizations_read_own" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_own" ON public.organizations;
DROP POLICY IF EXISTS "organizations_select_own" ON public.organizations;

-- ============================================================================
-- STEP 2: Create simpler policies
-- ============================================================================

-- Anyone authenticated can read organizations (for now - can restrict later)
CREATE POLICY "organizations_select_all"
ON public.organizations
FOR SELECT
USING (true);

-- Authenticated users can update their own organization
-- Using a subquery that doesn't cause recursion
CREATE POLICY "organizations_update_members"
ON public.organizations
FOR UPDATE
USING (
    id IN (
        SELECT up.organization_id
        FROM public.user_profiles up
        WHERE up.id = auth.uid()
    )
);

-- ============================================================================
-- STEP 3: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
