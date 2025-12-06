-- Migration 032: Fix Role Access RLS
-- The previous policies were too restrictive.
-- app_modules and role_module_access should be readable by all authenticated users.

-- ============================================================================
-- STEP 1: Drop existing policies
-- ============================================================================

DROP POLICY IF EXISTS "app_modules_read_all" ON public.app_modules;
DROP POLICY IF EXISTS "app_modules_admin_write" ON public.app_modules;
DROP POLICY IF EXISTS "role_module_access_read_all" ON public.role_module_access;
DROP POLICY IF EXISTS "role_module_access_admin_write" ON public.role_module_access;

-- ============================================================================
-- STEP 2: Create simpler policies that actually work
-- ============================================================================

-- App modules: Anyone authenticated can read
CREATE POLICY "app_modules_select"
ON public.app_modules
FOR SELECT
USING (true);  -- Allow anyone to read (this is config data, not sensitive)

-- App modules: Only service role can modify (done via migrations)
CREATE POLICY "app_modules_modify"
ON public.app_modules
FOR ALL
USING (auth.role() = 'service_role');

-- Role module access: Anyone authenticated can read
CREATE POLICY "role_module_access_select"
ON public.role_module_access
FOR SELECT
USING (true);  -- Allow anyone to read

-- Role module access: Authenticated users can insert/update
-- (We'll rely on app-level checks for admin-only)
CREATE POLICY "role_module_access_insert"
ON public.role_module_access
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "role_module_access_update"
ON public.role_module_access
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- STEP 3: Also fix the roles table RLS if needed
-- ============================================================================

-- Check if roles has RLS enabled and add a read policy
DO $$
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "roles_select" ON public.roles;
EXCEPTION
    WHEN undefined_table THEN NULL;
END $$;

CREATE POLICY "roles_select"
ON public.roles
FOR SELECT
USING (true);  -- Everyone can read roles
