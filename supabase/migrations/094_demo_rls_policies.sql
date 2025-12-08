-- =============================================================================
-- Migration 094: Demo RLS Policies
-- =============================================================================
-- PURPOSE: Add RLS policies for demo/anonymous access to key tables
-- =============================================================================

-- IFTA Reports - Allow public read for demo
DROP POLICY IF EXISTS "ifta_reports_public_select" ON public.ifta_reports;
CREATE POLICY "ifta_reports_public_select" ON public.ifta_reports
    FOR SELECT
    USING (
        -- Allow authenticated users from same org
        (auth.uid() IS NOT NULL AND organization_id = public.get_user_organization_id(auth.uid()))
        OR
        -- Allow anonymous access to demo organization
        (auth.uid() IS NULL AND organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid)
    );

-- Drop the old policy if it conflicts
DROP POLICY IF EXISTS "ifta_reports_org_isolation" ON public.ifta_reports;

-- Crew members - Allow public read for demo
DROP POLICY IF EXISTS "crew_members_public_select" ON public.crew_members;
CREATE POLICY "crew_members_public_select" ON public.crew_members
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            -- Allow authenticated users from same org
            (auth.uid() IS NOT NULL AND organization_id = public.get_user_organization_id(auth.uid()))
            OR
            -- Allow anonymous access to demo organization
            (auth.uid() IS NULL AND organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid)
        )
    );

-- Drop the old policy to avoid conflicts
DROP POLICY IF EXISTS "crew_members_select" ON public.crew_members;

-- =============================================================================
-- COMPLETION
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 094: Demo RLS Policies completed successfully';
    RAISE NOTICE 'Added public SELECT policies for:';
    RAISE NOTICE '  - ifta_reports (demo org access)';
    RAISE NOTICE '  - crew_members (demo org access)';
END $$;
