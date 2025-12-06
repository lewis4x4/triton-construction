-- Migration 031: Role Access Control
-- Allows admins to configure which roles can access which modules/pages

-- ============================================================================
-- STEP 1: Create app_modules table to store all available pages
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Module identification
    module_key VARCHAR(100) NOT NULL UNIQUE,  -- e.g., 'dashboard', 'bids', 'specs'
    module_name VARCHAR(255) NOT NULL,         -- Display name
    module_path VARCHAR(255) NOT NULL,         -- Route path e.g., '/bids'
    module_icon VARCHAR(50),                   -- Emoji or icon identifier

    -- Grouping
    module_group VARCHAR(100) DEFAULT 'MAIN',  -- For grouping in UI
    sort_order INT DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,           -- System modules can't be deleted

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: Create role_module_access table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_module_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.app_modules(id) ON DELETE CASCADE,

    has_access BOOLEAN DEFAULT false,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),

    -- Ensure unique role-module combinations
    CONSTRAINT unique_role_module UNIQUE (role_id, module_id)
);

-- ============================================================================
-- STEP 3: Enable RLS
-- ============================================================================

ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_module_access ENABLE ROW LEVEL SECURITY;

-- App modules are readable by all authenticated users
CREATE POLICY "app_modules_read_all"
ON public.app_modules
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify app_modules
CREATE POLICY "app_modules_admin_write"
ON public.app_modules
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.code = 'ADMIN'
    )
);

-- Role module access is readable by all authenticated users
CREATE POLICY "role_module_access_read_all"
ON public.role_module_access
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify role_module_access
CREATE POLICY "role_module_access_admin_write"
ON public.role_module_access
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.code = 'ADMIN'
    )
);

-- ============================================================================
-- STEP 4: Create triggers for updated_at
-- ============================================================================

CREATE TRIGGER app_modules_updated_at
    BEFORE UPDATE ON public.app_modules
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER role_module_access_updated_at
    BEFORE UPDATE ON public.role_module_access
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- STEP 5: Seed initial modules based on current navigation
-- ============================================================================

INSERT INTO public.app_modules (module_key, module_name, module_path, module_icon, module_group, sort_order, is_system) VALUES
    ('dashboard', 'Dashboard', '/', '📊', 'MAIN', 1, true),
    ('bids', 'Bid Packages', '/bids', '📋', 'MAIN', 2, true),
    ('specs', 'Specifications', '/specs', '📚', 'MAIN', 3, true),
    ('projects', 'Projects', '/projects', '🏗️', 'OPERATIONS', 4, false),
    ('reports', 'Daily Reports', '/reports', '📝', 'OPERATIONS', 5, false),
    ('time', 'Time Tracking', '/time', '⏱️', 'OPERATIONS', 6, false),
    ('equipment', 'Equipment', '/equipment', '🚜', 'RESOURCES', 7, false),
    ('crew', 'Crew', '/crew', '👷', 'RESOURCES', 8, false),
    ('settings', 'Settings', '/settings', '⚙️', 'ADMIN', 100, true),
    ('role-access', 'Role Access Control', '/admin/role-access', '🔐', 'ADMIN', 101, true)
ON CONFLICT (module_key) DO NOTHING;

-- ============================================================================
-- STEP 6: Create default access for all roles (ADMIN gets everything)
-- ============================================================================

-- Give ADMIN access to all modules
INSERT INTO public.role_module_access (role_id, module_id, has_access)
SELECT r.id, m.id, true
FROM public.roles r
CROSS JOIN public.app_modules m
WHERE r.code = 'ADMIN'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- Give other roles access to non-admin modules
INSERT INTO public.role_module_access (role_id, module_id, has_access)
SELECT r.id, m.id,
    CASE
        WHEN m.module_group = 'ADMIN' THEN false
        ELSE true
    END
FROM public.roles r
CROSS JOIN public.app_modules m
WHERE r.code != 'ADMIN'
ON CONFLICT (role_id, module_id) DO NOTHING;

-- ============================================================================
-- STEP 7: Create helper function to check module access
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_has_module_access(p_module_key VARCHAR)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.role_module_access rma ON rma.role_id = ur.role_id
        JOIN public.app_modules m ON m.id = rma.module_id
        WHERE ur.user_id = auth.uid()
        AND m.module_key = p_module_key
        AND rma.has_access = true
        AND m.is_active = true
    )
    -- If user has no roles, check if they're an admin by role level
    OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.code = 'ADMIN'
    )
$$;

GRANT EXECUTE ON FUNCTION public.user_has_module_access(VARCHAR) TO authenticated;

-- ============================================================================
-- STEP 8: Create view for easy access checking
-- ============================================================================

CREATE OR REPLACE VIEW public.v_user_accessible_modules AS
SELECT DISTINCT
    m.module_key,
    m.module_name,
    m.module_path,
    m.module_icon,
    m.module_group,
    m.sort_order
FROM public.app_modules m
JOIN public.role_module_access rma ON rma.module_id = m.id
JOIN public.user_roles ur ON ur.role_id = rma.role_id
WHERE ur.user_id = auth.uid()
AND rma.has_access = true
AND m.is_active = true
ORDER BY m.sort_order;
