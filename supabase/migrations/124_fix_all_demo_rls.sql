-- =============================================================================
-- Migration 124: Fix All Demo RLS Policies
-- =============================================================================
-- Ensures all key tables used in the demo have proper RLS policies that work
-- for authenticated users querying their organization's data.
-- Uses get_user_organization_id(auth.uid()) consistently.
-- =============================================================================

-- =============================================================================
-- PROJECTS TABLE RLS
-- =============================================================================
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Users can update projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "Admins can delete projects in their organization" ON public.projects;
DROP POLICY IF EXISTS "projects_select_policy" ON public.projects;
DROP POLICY IF EXISTS "projects_org_select" ON public.projects;
DROP POLICY IF EXISTS "projects_org_insert" ON public.projects;
DROP POLICY IF EXISTS "projects_org_update" ON public.projects;

-- Create SELECT policy for projects
CREATE POLICY "projects_org_select" ON public.projects FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- Create INSERT policy for projects
CREATE POLICY "projects_org_insert" ON public.projects FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- Create UPDATE policy for projects
CREATE POLICY "projects_org_update" ON public.projects FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
    )
    WITH CHECK (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- =============================================================================
-- EQUIPMENT TABLE RLS
-- =============================================================================
ALTER TABLE IF EXISTS public.equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_org_select" ON public.equipment;
DROP POLICY IF EXISTS "equipment_select" ON public.equipment;

CREATE POLICY "equipment_org_select" ON public.equipment FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- =============================================================================
-- CREW_MEMBERS TABLE RLS
-- =============================================================================
ALTER TABLE IF EXISTS public.crew_members ENABLE ROW LEVEL SECURITY;

-- Note: Don't drop crew_members_public_select as it may be needed
DROP POLICY IF EXISTS "crew_members_org_select" ON public.crew_members;

CREATE POLICY "crew_members_org_select" ON public.crew_members FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND deleted_at IS NULL
    );

-- =============================================================================
-- COMPLETION
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 124: Fixed RLS policies for demo tables';
    RAISE NOTICE 'Tables updated: projects, equipment, crew_members';
END $$;
