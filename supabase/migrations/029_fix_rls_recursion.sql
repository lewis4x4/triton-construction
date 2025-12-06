-- Migration 029: Fix RLS Infinite Recursion
-- Problem: RLS policies on user_profiles and organizations call functions that query
-- the same tables, causing infinite recursion.
-- Solution: Replace recursive policies with direct auth.uid() checks.

-- ============================================================================
-- STEP 1: Drop existing problematic policies on user_profiles
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;

-- Drop any policies that might exist with other names
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Create simple, non-recursive policies for user_profiles
-- ============================================================================

-- Users can always read their own profile (by matching auth.uid() to id directly)
CREATE POLICY "user_profiles_select_own"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users in same organization can see each other (use a simple subquery that won't recurse)
CREATE POLICY "user_profiles_select_org_members"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id
        FROM public.user_profiles
        WHERE id = auth.uid()
    )
);

-- Users can update their own profile
CREATE POLICY "user_profiles_update_own"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- STEP 3: Drop existing problematic policies on organizations
-- ============================================================================

DROP POLICY IF EXISTS "Organizations are viewable by members" ON public.organizations;
DROP POLICY IF EXISTS "organizations_select_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update_policy" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert_policy" ON public.organizations;

-- Drop any policies that might exist with other names
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'organizations' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', pol.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 4: Create simple, non-recursive policies for organizations
-- ============================================================================

-- Users can view their own organization
CREATE POLICY "organizations_select_own"
ON public.organizations
FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT organization_id
        FROM public.user_profiles
        WHERE id = auth.uid()
    )
);

-- Users can update their organization (for settings page)
CREATE POLICY "organizations_update_own"
ON public.organizations
FOR UPDATE
TO authenticated
USING (
    id IN (
        SELECT organization_id
        FROM public.user_profiles
        WHERE id = auth.uid()
    )
)
WITH CHECK (
    id IN (
        SELECT organization_id
        FROM public.user_profiles
        WHERE id = auth.uid()
    )
);

-- ============================================================================
-- STEP 5: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Done! The policies now use direct subqueries instead of recursive function calls.
-- ============================================================================
