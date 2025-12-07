-- =============================================================================
-- Migration 063: RLS Policies for Training & Safety Modules
-- Part of Safety Compliance Enforcement System - "The Gatekeeper"
-- =============================================================================
--
-- NOTE: Employee self-service features (certification wallet, training history)
-- require adding a user_id column to the employees table to link employees to
-- auth users. This will be addressed in a future migration.
-- For now, this migration provides organization-based access controls.
-- =============================================================================

-- ============================================================================
-- PART 1: Training Programs & Certification Types (Public Read)
-- ============================================================================

-- Allow users to view active training programs in their org
CREATE POLICY "users_view_training_programs"
ON public.training_programs
FOR SELECT
USING (
  organization_id = public.get_user_organization_id()
);

-- Allow users to view active certification types (org + system-wide)
CREATE POLICY "users_view_certification_types"
ON public.certification_types
FOR SELECT
USING (
  organization_id IS NULL
  OR organization_id = public.get_user_organization_id()
);

-- ============================================================================
-- PART 2: Daily Safety Brief Policies
-- ============================================================================

-- Supervisors can create briefs for their projects
CREATE POLICY "supervisors_create_daily_briefs"
ON public.daily_safety_briefs
FOR INSERT
WITH CHECK (
  supervisor_id = auth.uid()
  AND
  project_id IN (
    SELECT project_id FROM public.project_assignments WHERE user_id = auth.uid()
  )
);

-- Users can view briefs for projects they're assigned to
CREATE POLICY "users_view_project_daily_briefs"
ON public.daily_safety_briefs
FOR SELECT
USING (
  project_id IN (
    SELECT project_id FROM public.project_assignments WHERE user_id = auth.uid()
  )
  OR
  public.user_has_permission(auth.uid(), 'safety.read')
);

-- Supervisors can update their own briefs
CREATE POLICY "supervisors_update_own_briefs"
ON public.daily_safety_briefs
FOR UPDATE
USING (
  supervisor_id = auth.uid()
)
WITH CHECK (
  supervisor_id = auth.uid()
);

-- ============================================================================
-- PART 3: Assignment Validation Rules Policies
-- ============================================================================

-- Everyone can read active rules (needed for validation)
CREATE POLICY "all_users_view_active_rules"
ON public.assignment_validation_rules
FOR SELECT
USING (
  is_active = true
  OR
  public.user_has_permission(auth.uid(), 'admin.system_settings')
);

-- Only admins can modify rules
CREATE POLICY "admins_manage_rules"
ON public.assignment_validation_rules
FOR ALL
USING (
  public.user_has_permission(auth.uid(), 'admin.system_settings')
)
WITH CHECK (
  public.user_has_permission(auth.uid(), 'admin.system_settings')
);

-- ============================================================================
-- PART 4: Training Session Management Policies
-- ============================================================================

-- Users with workforce permissions can manage training sessions
CREATE POLICY "workforce_manage_training_sessions"
ON public.training_sessions
FOR ALL
USING (
  public.user_has_permission(auth.uid(), 'workforce.create')
  OR
  public.user_has_permission(auth.uid(), 'workforce.update')
)
WITH CHECK (
  public.user_has_permission(auth.uid(), 'workforce.create')
  OR
  public.user_has_permission(auth.uid(), 'workforce.update')
);

-- Users with workforce permissions can manage attendees
CREATE POLICY "workforce_manage_attendees"
ON public.training_session_attendees
FOR ALL
USING (
  public.user_has_permission(auth.uid(), 'workforce.create')
  OR
  public.user_has_permission(auth.uid(), 'workforce.update')
)
WITH CHECK (
  public.user_has_permission(auth.uid(), 'workforce.create')
  OR
  public.user_has_permission(auth.uid(), 'workforce.update')
);

-- ============================================================================
-- PART 5: Competent Person Designations (org-based access)
-- ============================================================================

-- Users with workforce.read can see competent person designations
CREATE POLICY "workforce_view_cp_designations"
ON public.competent_person_designations
FOR SELECT
USING (
  public.user_has_permission(auth.uid(), 'workforce.read')
);

-- ============================================================================
-- PART 6: Add workforce and training permissions if not exist
-- ============================================================================

INSERT INTO public.permissions (code, name, description, module, action)
VALUES
  ('training.read', 'View Training', 'View training programs and sessions', 'training', 'read'),
  ('training.create', 'Create Training', 'Create training sessions', 'training', 'create'),
  ('training.update', 'Update Training', 'Update training sessions', 'training', 'update'),
  ('training.complete', 'Complete Training', 'Complete sessions and grant certs', 'training', 'complete'),
  ('safety_briefs.create', 'Create Safety Brief', 'Submit daily safety briefs', 'safety_briefs', 'create'),
  ('safety_briefs.read', 'View Safety Briefs', 'View daily safety briefs', 'safety_briefs', 'read'),
  ('safety_rules.manage', 'Manage Safety Rules', 'Configure assignment validation rules', 'safety_rules', 'manage')
ON CONFLICT (code) DO NOTHING;

-- Grant training permissions to appropriate roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code IN ('ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT')
  AND p.code IN ('training.read', 'training.create', 'training.update', 'training.complete')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant brief permissions to supervisory roles
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code IN ('ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT', 'FOREMAN')
  AND p.code IN ('safety_briefs.create', 'safety_briefs.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Grant rules management to admins only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.code = 'ADMIN'
  AND p.code = 'safety_rules.manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- FUTURE: Employee Self-Service Features
-- ============================================================================
-- The following features require adding a user_id column to the employees table
-- to link employees to auth.users:
--
-- 1. v_my_certifications view - Employee certification wallet
-- 2. v_my_training_history view - Employee training history
-- 3. user_has_valid_certification() function - Check user's own certs
-- 4. Self-service RLS policies on employee_certifications
-- 5. Self-service RLS policies on training_session_attendees
--
-- These will be implemented when employees.user_id is added to establish the
-- link between workforce records and authenticated users.
-- ============================================================================

-- ============================================================================
-- Summary of what this migration provides:
-- ============================================================================
-- 1. Training programs and certification types are viewable by org users
-- 2. Supervisors can create/update daily safety briefs for their projects
-- 3. Assignment validation rules are readable by all (needed for validation)
-- 4. Only admins can modify validation rules
-- 5. New permissions for training and safety modules
-- 6. Role-based access for training session management
