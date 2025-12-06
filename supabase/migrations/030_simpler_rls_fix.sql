-- Migration 030: Simpler RLS Fix
-- The subquery approach in 029 can still cause recursion issues.
-- This migration uses the simplest possible approach: direct id = auth.uid() check.

-- ============================================================================
-- STEP 1: Drop ALL existing policies on user_profiles
-- ============================================================================

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
-- STEP 2: Create single simple SELECT policy for user_profiles
-- User can only read their own profile (no org-member visibility for now)
-- ============================================================================

CREATE POLICY "user_profiles_read_own"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "user_profiles_update_own"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- STEP 3: Drop ALL existing policies on organizations
-- ============================================================================

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
-- STEP 4: Create organization policies using a security definer function
-- This avoids recursion by using a function that bypasses RLS
-- ============================================================================

-- First create a helper function that bypasses RLS to get user's org_id
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.user_profiles
  WHERE id = auth.uid()
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_my_org_id() TO authenticated;

-- Now create organization policies using this function
CREATE POLICY "organizations_read_own"
ON public.organizations
FOR SELECT
TO authenticated
USING (id = public.get_my_org_id());

CREATE POLICY "organizations_update_own"
ON public.organizations
FOR UPDATE
TO authenticated
USING (id = public.get_my_org_id())
WITH CHECK (id = public.get_my_org_id());

-- ============================================================================
-- STEP 5: Ensure RLS is enabled
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
