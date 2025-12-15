-- =============================================================================
-- Migration 123: Fix Projects Table RLS Policies v2
-- =============================================================================
-- Use the no-argument version of get_user_organization_id() which uses
-- auth.uid() internally - this is consistent with other RLS policies
-- =============================================================================

-- Drop the policies from migration 122 (they might have wrong function signature)
DROP POLICY IF EXISTS "Users can view projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects in their organization" ON public.projects;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy using NO-argument function (consistent with other tables)
CREATE POLICY "Users can view projects in their organization"
    ON public.projects FOR SELECT
    USING (
        organization_id = public.get_user_organization_id()
    );

-- Create INSERT policy
CREATE POLICY "Users can create projects in their organization"
    ON public.projects FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

-- Create UPDATE policy
CREATE POLICY "Users can update projects in their organization"
    ON public.projects FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id()
    )
    WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

-- Create DELETE policy for admins only
CREATE POLICY "Admins can delete projects in their organization"
    ON public.projects FOR DELETE
    USING (
        organization_id = public.get_user_organization_id()
        AND public.get_user_role_level(auth.uid()) <= 10
    );
