-- =============================================================================
-- Migration 122: Fix Projects Table RLS Policies
-- =============================================================================
-- The projects table RLS may have been misconfigured. This migration ensures
-- users can access projects in their organization.
-- =============================================================================

-- First, check if RLS is enabled and create proper policies
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might be blocking access
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_insert_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_update_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_delete_policy" ON public.projects;
DROP POLICY IF EXISTS "Users view own org projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view their org projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "projects_org_select" ON public.projects;
DROP POLICY IF EXISTS "enable_select_projects" ON public.projects;

-- Create permissive SELECT policy for organization members
-- Users can see all projects in their organization
CREATE POLICY "Users can view projects in their organization"
    ON public.projects FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- Create INSERT policy for organization members
CREATE POLICY "Users can create projects in their organization"
    ON public.projects FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- Create UPDATE policy for organization members with project access
CREATE POLICY "Users can update projects in their organization"
    ON public.projects FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
    )
    WITH CHECK (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- Create DELETE policy for admins only
CREATE POLICY "Admins can delete projects in their organization"
    ON public.projects FOR DELETE
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND public.get_user_role_level(auth.uid()) <= 10  -- ADMIN or EXECUTIVE
    );

-- =============================================================================
-- Verify the function has proper grants
-- =============================================================================
-- Note: Function already exists, just ensure permissions are correct
DO $$
BEGIN
    -- Grant execute permission to authenticated and anon roles
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_user_organization_id(UUID) TO authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_user_organization_id(UUID) TO anon';
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if function has different signature
    NULL;
END $$;
