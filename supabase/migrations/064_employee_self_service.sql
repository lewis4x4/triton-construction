-- =============================================================================
-- Migration 064: Employee Self-Service Features
-- Links employees to auth users and enables certification wallet
-- =============================================================================

-- ============================================================================
-- PART 1: Add user_id column to employees table
-- ============================================================================

-- Add user_id column to link employees to auth.users
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);

-- Unique constraint - one auth user can only be linked to one employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_user_id_unique
ON public.employees(user_id) WHERE user_id IS NOT NULL;

-- ============================================================================
-- PART 2: Self-Service RLS Policies for Employees
-- ============================================================================

-- Employees can view their own employee record
CREATE POLICY "employees_view_own_record"
ON public.employees
FOR SELECT
USING (
  user_id = auth.uid()
  OR
  public.user_has_permission(auth.uid(), 'workforce.read')
);

-- ============================================================================
-- PART 3: Self-Service RLS for Employee Certifications
-- ============================================================================

-- Employees can view their own certifications (certification wallet)
CREATE POLICY "employees_view_own_certifications"
ON public.employee_certifications
FOR SELECT
USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR
  public.user_has_permission(auth.uid(), 'workforce.read')
);

-- ============================================================================
-- PART 4: Self-Service RLS for Training Session Attendees
-- ============================================================================

-- Employees can view their own training history
CREATE POLICY "employees_view_own_training"
ON public.training_session_attendees
FOR SELECT
USING (
  employee_id IN (SELECT id FROM public.employees WHERE user_id = auth.uid())
  OR
  public.user_has_permission(auth.uid(), 'workforce.read')
);

-- ============================================================================
-- PART 5: Self-Service Views
-- ============================================================================

-- View: My Certifications (Certification Wallet)
CREATE OR REPLACE VIEW public.v_my_certifications AS
SELECT
  ec.id,
  ec.employee_id,
  ct.code AS certification_code,
  ct.name AS certification_name,
  ct.category,
  ec.issue_date,
  ec.expiration_date,
  ec.certificate_number,
  ec.issuing_authority,
  ec.verification_url,
  ec.status,
  CASE
    WHEN ec.expiration_date IS NULL THEN 'no_expiry'
    WHEN ec.expiration_date < CURRENT_DATE THEN 'expired'
    WHEN ec.expiration_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring_soon'
    ELSE 'valid'
  END AS expiry_status,
  CASE
    WHEN ec.expiration_date IS NOT NULL
    THEN ec.expiration_date - CURRENT_DATE
    ELSE NULL
  END AS days_until_expiry
FROM public.employee_certifications ec
JOIN public.certification_types ct ON ct.id = ec.certification_type_id
JOIN public.employees e ON e.id = ec.employee_id
WHERE e.user_id = auth.uid()
ORDER BY
  CASE
    WHEN ec.expiration_date IS NULL THEN 2
    WHEN ec.expiration_date < CURRENT_DATE THEN 0
    ELSE 1
  END,
  ec.expiration_date;

-- View: My Training History
CREATE OR REPLACE VIEW public.v_my_training_history AS
SELECT
  ts.id AS session_id,
  tp.name AS program_name,
  tp.program_code,
  ts.session_date,
  ts.duration_hours,
  ts.instructor_name,
  ts.location,
  tsa.attendance_status,
  tsa.signed_at,
  tsa.certifications_granted,
  ARRAY_AGG(ct.name) FILTER (WHERE ct.name IS NOT NULL) AS certifications_earned
FROM public.training_session_attendees tsa
JOIN public.training_sessions ts ON ts.id = tsa.session_id
JOIN public.training_programs tp ON tp.id = ts.program_id
JOIN public.employees e ON e.id = tsa.employee_id
LEFT JOIN public.training_program_certifications tpc ON tpc.program_id = tp.id
LEFT JOIN public.certification_types ct ON ct.id = tpc.certification_type_id
WHERE e.user_id = auth.uid()
GROUP BY ts.id, tp.name, tp.program_code, ts.session_date, ts.duration_hours,
         ts.instructor_name, ts.location, tsa.attendance_status, tsa.signed_at,
         tsa.certifications_granted
ORDER BY ts.session_date DESC;

-- View: My Upcoming Training (sessions I'm registered for)
CREATE OR REPLACE VIEW public.v_my_upcoming_training AS
SELECT
  ts.id AS session_id,
  tp.name AS program_name,
  ts.session_date,
  ts.session_time,
  ts.duration_hours,
  ts.location,
  ts.instructor_name,
  tsa.attendance_status
FROM public.training_session_attendees tsa
JOIN public.training_sessions ts ON ts.id = tsa.session_id
JOIN public.training_programs tp ON tp.id = ts.program_id
JOIN public.employees e ON e.id = tsa.employee_id
WHERE e.user_id = auth.uid()
  AND ts.status IN ('scheduled', 'in_progress')
  AND ts.session_date >= CURRENT_DATE
ORDER BY ts.session_date, ts.session_time;

-- ============================================================================
-- PART 6: Helper Function to Check User's Own Certifications
-- ============================================================================

-- Function to check if the current user has a valid certification
CREATE OR REPLACE FUNCTION public.user_has_valid_certification(cert_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_cert BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.employee_certifications ec
    JOIN public.certification_types ct ON ct.id = ec.certification_type_id
    JOIN public.employees e ON e.id = ec.employee_id
    WHERE e.user_id = auth.uid()
      AND ct.code = cert_code
      AND ec.status = 'active'
      AND (ec.expiration_date IS NULL OR ec.expiration_date > CURRENT_DATE)
  ) INTO has_cert;

  RETURN has_cert;
END;
$$;

-- ============================================================================
-- PART 7: Self-Service Permissions
-- ============================================================================

-- Add self-service permissions
INSERT INTO public.permissions (code, name, description, module, action)
VALUES
  ('my_profile.read', 'View My Profile', 'View own employee profile', 'my_profile', 'read'),
  ('my_profile.update', 'Update My Profile', 'Update own contact info', 'my_profile', 'update'),
  ('my_certs.read', 'View My Certifications', 'View certification wallet', 'my_certs', 'read'),
  ('my_training.read', 'View My Training', 'View training history', 'my_training', 'read')
ON CONFLICT (code) DO NOTHING;

-- Grant self-service permissions to all roles (every employee should have these)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.code IN ('my_profile.read', 'my_certs.read', 'my_training.read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration enables:
-- 1. employees.user_id - Links workforce records to auth users
-- 2. Self-service RLS - Employees can view their own data
-- 3. v_my_certifications - Certification wallet view
-- 4. v_my_training_history - Training history view
-- 5. v_my_upcoming_training - Upcoming training sessions
-- 6. user_has_valid_certification() - Check own cert status
--
-- To link an employee to an auth user:
-- UPDATE employees SET user_id = 'auth-user-uuid' WHERE id = 'employee-uuid';
-- ============================================================================
