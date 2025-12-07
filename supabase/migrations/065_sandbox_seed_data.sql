-- =============================================================================
-- Migration 065: Sandbox Demo Data
-- =============================================================================
-- PURPOSE: Generate comprehensive demo data for Triton Construction AI Platform
-- CLEANUP: Delete this data before production deployment
-- =============================================================================

-- ============================================================================
-- PART 1: Organization
-- ============================================================================

-- Check if organization exists, create if not
INSERT INTO public.organizations (
  id,
  name,
  slug,
  legal_name,
  address_line1,
  city,
  state,
  zip_code,
  phone,
  email,
  wv_contractor_license,
  is_active
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Triton Construction',
  'triton-construction',
  'Triton Construction, Inc.',
  '100 Construction Way',
  'St. Albans',
  'WV',
  '25177',
  '304-555-0100',
  'info@tritonwv.com',
  'WV-CON-2024-001',
  true
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  legal_name = EXCLUDED.legal_name;

-- Store org ID for use in subsequent inserts
DO $$
DECLARE
  org_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
  -- This block exists just to document the org_id
  RAISE NOTICE 'Organization ID: %', org_id;
END $$;

-- ============================================================================
-- PART 2: Get Role IDs for assignments
-- ============================================================================
-- Roles should already exist from foundation migrations
-- We'll reference them by code in the user_roles inserts

-- ============================================================================
-- PART 3: Projects (3 active WVDOH projects)
-- ============================================================================

INSERT INTO public.projects (
  id, organization_id, project_number, name, description, project_type, contract_type,
  status, contract_number, notice_to_proceed_date, original_completion_date, current_completion_date,
  original_contract_value, current_contract_value, original_working_days, current_working_days, working_days_used,
  is_federal_aid, federal_aid_number, wvdoh_district, davis_bacon_required, dbe_goal_percentage, buy_america_required,
  address_line1, city, state, zip_code, county, percent_complete
) VALUES
-- Project 1: Corridor H Section 12
(
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '2024-001',
  'Corridor H Section 12',
  'Major highway construction - 4.2 miles of new 4-lane divided highway in Tucker County. Includes earthwork, drainage, paving, and bridge work.',
  'HIGHWAY',
  'UNIT_PRICE',
  'ACTIVE',
  'DOH-2024-0123',
  '2024-03-15',
  '2025-11-30',
  '2025-11-30',
  15000000.00,
  15250000.00,
  200,
  200,
  145,
  true,
  'FA-2024-WV-0123',
  8,
  true,
  8.5,
  true,
  'Corridor H Mile Marker 12',
  'Davis',
  'WV',
  '26260',
  'Tucker',
  55.5
),
-- Project 2: US-35 Bridge Replacement
(
  'b0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  '2024-002',
  'US-35 Bridge Replacement',
  'Replace existing 2-lane bridge over Kanawha River with new 4-lane structure. Includes approach work and temporary detour.',
  'BRIDGE',
  'LUMP_SUM',
  'ACTIVE',
  'DOH-2024-0456',
  '2024-05-01',
  '2025-08-31',
  '2025-09-15',
  8500000.00,
  8750000.00,
  150,
  155,
  98,
  true,
  'FA-2024-WV-0456',
  3,
  true,
  8.5,
  true,
  'US-35 at Kanawha River',
  'Point Pleasant',
  'WV',
  '25550',
  'Mason',
  42.0
),
-- Project 3: I-64 Widening Phase 2
(
  'b0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  '2024-003',
  'I-64 Widening Phase 2',
  'Widen I-64 from 4 to 6 lanes between Exit 15 and Exit 20. Includes new interchanges, retaining walls, and sound barriers.',
  'HIGHWAY',
  'UNIT_PRICE',
  'MOBILIZATION',
  'DOH-2024-0789',
  '2024-12-01',
  '2026-06-30',
  '2026-06-30',
  22000000.00,
  22000000.00,
  280,
  280,
  5,
  true,
  'FA-2024-WV-0789',
  2,
  true,
  10.0,
  true,
  'I-64 Mile Marker 15-20',
  'Huntington',
  'WV',
  '25701',
  'Cabell',
  2.0
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  percent_complete = EXCLUDED.percent_complete;

-- ============================================================================
-- PART 4: Employees (20 workers)
-- ============================================================================

INSERT INTO public.employees (
  id, organization_id, employee_number, first_name, last_name, email, phone_primary,
  hire_date, employment_status, job_title, department, is_safety_sensitive,
  compliance_status
) VALUES
-- Management (5 employees - will be linked to user_profiles)
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'EMP-001', 'Brian', 'Lewis', 'brian@tritonwv.com', '304-555-0101', '2020-01-15', 'active', 'System Administrator', 'Administration', false, 'compliant'),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'EMP-002', 'Robert', 'Triton', 'robert@tritonwv.com', '304-555-0102', '2010-06-01', 'active', 'CEO', 'Executive', false, 'compliant'),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'EMP-003', 'Jason', 'Lusk', 'jason.lusk@tritonwv.com', '304-555-0103', '2015-03-20', 'active', 'Operations Manager', 'Operations', true, 'compliant'),
('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'EMP-004', 'Mike', 'Reynolds', 'mike.reynolds@tritonwv.com', '304-555-0104', '2016-08-10', 'active', 'Superintendent', 'Field Operations', true, 'compliant'),
('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'EMP-005', 'Tom', 'Bradley', 'tom.bradley@tritonwv.com', '304-555-0105', '2017-02-28', 'active', 'Superintendent', 'Field Operations', true, 'compliant'),

-- Foremen (2 employees)
('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'EMP-006', 'Steve', 'Williams', 'steve.williams@tritonwv.com', '304-555-0106', '2018-04-15', 'active', 'Foreman', 'Field Operations', true, 'compliant'),
('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'EMP-007', 'Chris', 'Walker', 'chris.walker@tritonwv.com', '304-555-0107', '2019-01-08', 'active', 'Foreman', 'Field Operations', true, 'compliant'),

-- Field Workers - COMPLIANT (5 workers - all certs valid through 2025+)
('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'EMP-008', 'James', 'Morrison', 'james.morrison@tritonwv.com', '304-555-0108', '2019-06-01', 'active', 'Equipment Operator', 'Field Operations', true, 'compliant'),
('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'EMP-009', 'David', 'Clark', 'david.clark@tritonwv.com', '304-555-0109', '2020-02-15', 'active', 'Laborer', 'Field Operations', true, 'compliant'),
('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'EMP-010', 'Michael', 'Johnson', 'michael.johnson@tritonwv.com', '304-555-0110', '2020-05-20', 'active', 'Carpenter', 'Field Operations', true, 'compliant'),
('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'EMP-011', 'Robert', 'Anderson', 'robert.anderson@tritonwv.com', '304-555-0111', '2021-01-10', 'active', 'Equipment Operator', 'Field Operations', true, 'compliant'),
('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'EMP-012', 'William', 'Taylor', 'william.taylor@tritonwv.com', '304-555-0112', '2021-03-25', 'active', 'Ironworker', 'Field Operations', true, 'compliant'),

-- Field Workers - EXPIRING SOON (5 workers - certs expire January 2025)
('c0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'EMP-013', 'Richard', 'Brown', 'richard.brown@tritonwv.com', '304-555-0113', '2021-06-15', 'active', 'Laborer', 'Field Operations', true, 'incomplete'),
('c0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'EMP-014', 'Joseph', 'Davis', 'joseph.davis@tritonwv.com', '304-555-0114', '2021-08-01', 'active', 'Equipment Operator', 'Field Operations', true, 'incomplete'),
('c0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'EMP-015', 'Thomas', 'Miller', 'thomas.miller@tritonwv.com', '304-555-0115', '2022-01-10', 'active', 'Carpenter', 'Field Operations', true, 'incomplete'),
('c0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001', 'EMP-016', 'Charles', 'Wilson', 'charles.wilson@tritonwv.com', '304-555-0116', '2022-03-20', 'active', 'Laborer', 'Field Operations', true, 'incomplete'),
('c0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001', 'EMP-017', 'Daniel', 'Moore', 'daniel.moore@tritonwv.com', '304-555-0117', '2022-05-15', 'active', 'Pipefitter', 'Field Operations', true, 'incomplete'),

-- Field Workers - EXPIRED (5 workers - certs already expired)
('c0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001', 'EMP-018', 'Matthew', 'Jackson', 'matthew.jackson@tritonwv.com', '304-555-0118', '2022-07-01', 'active', 'Laborer', 'Field Operations', true, 'expired'),
('c0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000001', 'EMP-019', 'Anthony', 'White', 'anthony.white@tritonwv.com', '304-555-0119', '2022-09-10', 'active', 'Equipment Operator', 'Field Operations', true, 'expired'),
('c0000000-0000-0000-0000-000000000020', 'a0000000-0000-0000-0000-000000000001', 'EMP-020', 'Mark', 'Harris', 'mark.harris@tritonwv.com', '304-555-0120', '2023-01-15', 'active', 'Laborer', 'Field Operations', true, 'expired'),
('c0000000-0000-0000-0000-000000000021', 'a0000000-0000-0000-0000-000000000001', 'EMP-021', 'Donald', 'Martin', 'donald.martin@tritonwv.com', '304-555-0121', '2023-03-01', 'active', 'Carpenter', 'Field Operations', true, 'expired'),
('c0000000-0000-0000-0000-000000000022', 'a0000000-0000-0000-0000-000000000001', 'EMP-022', 'Steven', 'Thompson', 'steven.thompson@tritonwv.com', '304-555-0122', '2023-06-20', 'active', 'Laborer', 'Field Operations', true, 'expired')
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  compliance_status = EXCLUDED.compliance_status;

-- ============================================================================
-- PART 5: Employee Certifications
-- ============================================================================

-- Get certification type IDs (these should exist from migration 061)
-- We'll insert certifications referencing certification_types by joining on code

-- First, let's insert certifications for COMPLIANT workers (valid through 2025+)
INSERT INTO public.employee_certifications (
  id, employee_id, certification_type_id, certification_name, issuing_authority,
  certificate_number, issue_date, expiration_date, status, source
)
SELECT
  gen_random_uuid(),
  e.id,
  ct.id,
  ct.name,
  'Triton Safety Team',
  'CERT-' || e.employee_number || '-' || ct.code,
  '2024-06-15'::date,
  '2026-06-15'::date,
  'active',
  'internal'
FROM public.employees e
CROSS JOIN public.certification_types ct
WHERE e.id IN (
  'c0000000-0000-0000-0000-000000000001', -- Brian Lewis
  'c0000000-0000-0000-0000-000000000002', -- Robert Triton
  'c0000000-0000-0000-0000-000000000003', -- Jason Lusk
  'c0000000-0000-0000-0000-000000000004', -- Mike Reynolds
  'c0000000-0000-0000-0000-000000000005', -- Tom Bradley
  'c0000000-0000-0000-0000-000000000006', -- Steve Williams
  'c0000000-0000-0000-0000-000000000007', -- Chris Walker
  'c0000000-0000-0000-0000-000000000008', -- James Morrison
  'c0000000-0000-0000-0000-000000000009', -- David Clark
  'c0000000-0000-0000-0000-000000000010', -- Michael Johnson
  'c0000000-0000-0000-0000-000000000011', -- Robert Anderson
  'c0000000-0000-0000-0000-000000000012'  -- William Taylor
)
AND ct.code IN ('OSHA_10', 'FIRST_AID', 'FALL_PROTECTION')
ON CONFLICT DO NOTHING;

-- Add OSHA 30 for management and superintendents
INSERT INTO public.employee_certifications (
  id, employee_id, certification_type_id, certification_name, issuing_authority,
  certificate_number, issue_date, expiration_date, status, source
)
SELECT
  gen_random_uuid(),
  e.id,
  ct.id,
  ct.name,
  'OSHA Training Institute',
  'OSHA30-' || e.employee_number,
  '2023-01-15'::date,
  NULL, -- OSHA 30 doesn't expire
  'active',
  'external'
FROM public.employees e
CROSS JOIN public.certification_types ct
WHERE e.id IN (
  'c0000000-0000-0000-0000-000000000003', -- Jason Lusk
  'c0000000-0000-0000-0000-000000000004', -- Mike Reynolds
  'c0000000-0000-0000-0000-000000000005', -- Tom Bradley
  'c0000000-0000-0000-0000-000000000006', -- Steve Williams
  'c0000000-0000-0000-0000-000000000007'  -- Chris Walker
)
AND ct.code = 'OSHA_30'
ON CONFLICT DO NOTHING;

-- Add certifications for EXPIRING SOON workers (expire January 2025)
INSERT INTO public.employee_certifications (
  id, employee_id, certification_type_id, certification_name, issuing_authority,
  certificate_number, issue_date, expiration_date, status, source
)
SELECT
  gen_random_uuid(),
  e.id,
  ct.id,
  ct.name,
  'Triton Safety Team',
  'CERT-' || e.employee_number || '-' || ct.code,
  '2023-01-10'::date,
  ('2025-01-' || (5 + (EXTRACT(DAY FROM e.hire_date)::int % 25))::text)::date, -- Stagger expirations Jan 5-30
  'active',
  'internal'
FROM public.employees e
CROSS JOIN public.certification_types ct
WHERE e.id IN (
  'c0000000-0000-0000-0000-000000000013', -- Richard Brown
  'c0000000-0000-0000-0000-000000000014', -- Joseph Davis
  'c0000000-0000-0000-0000-000000000015', -- Thomas Miller
  'c0000000-0000-0000-0000-000000000016', -- Charles Wilson
  'c0000000-0000-0000-0000-000000000017'  -- Daniel Moore
)
AND ct.code IN ('OSHA_10', 'FIRST_AID', 'FALL_PROTECTION')
ON CONFLICT DO NOTHING;

-- Add certifications for EXPIRED workers
INSERT INTO public.employee_certifications (
  id, employee_id, certification_type_id, certification_name, issuing_authority,
  certificate_number, issue_date, expiration_date, status, source
)
SELECT
  gen_random_uuid(),
  e.id,
  ct.id,
  ct.name,
  'Triton Safety Team',
  'CERT-' || e.employee_number || '-' || ct.code,
  '2022-06-01'::date,
  ('2024-' || (9 + (EXTRACT(DAY FROM e.hire_date)::int % 3))::text || '-15')::date, -- Expired Sept-Nov 2024
  'expired',
  'internal'
FROM public.employees e
CROSS JOIN public.certification_types ct
WHERE e.id IN (
  'c0000000-0000-0000-0000-000000000018', -- Matthew Jackson
  'c0000000-0000-0000-0000-000000000019', -- Anthony White
  'c0000000-0000-0000-0000-000000000020', -- Mark Harris
  'c0000000-0000-0000-0000-000000000021', -- Donald Martin
  'c0000000-0000-0000-0000-000000000022'  -- Steven Thompson
)
AND ct.code IN ('OSHA_10', 'FIRST_AID')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 6: Training Programs
-- ============================================================================

INSERT INTO public.training_programs (
  id, organization_id, name, program_code, description, provider_type,
  default_duration_hours, recurrence_interval_months, is_active
) VALUES
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'OSHA 10-Hour Construction', 'OSHA-10', 'OSHA 10-hour construction safety training covering major hazards', 'internal', 10.0, NULL, true),
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Fall Protection Competent Person', 'FP-101', 'Fall protection training for competent person designation', 'internal', 4.0, 24, true),
('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'First Aid/CPR/AED', 'FA-CPR', 'American Heart Association First Aid, CPR, and AED certification', 'hybrid', 6.0, 24, true),
('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Excavation & Trenching Safety', 'EXC-201', 'OSHA excavation and trenching safety for competent persons', 'internal', 8.0, 12, true),
('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Confined Space Entry', 'CSE-301', 'Confined space entry procedures and rescue', 'internal', 4.0, 12, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Link programs to certification types
INSERT INTO public.training_program_certifications (program_id, certification_type_id)
SELECT 'd0000000-0000-0000-0000-000000000001', id FROM public.certification_types WHERE code = 'OSHA_10'
ON CONFLICT DO NOTHING;

INSERT INTO public.training_program_certifications (program_id, certification_type_id)
SELECT 'd0000000-0000-0000-0000-000000000002', id FROM public.certification_types WHERE code = 'FALL_PROTECTION'
ON CONFLICT DO NOTHING;

INSERT INTO public.training_program_certifications (program_id, certification_type_id)
SELECT 'd0000000-0000-0000-0000-000000000003', id FROM public.certification_types WHERE code = 'FIRST_AID'
ON CONFLICT DO NOTHING;

INSERT INTO public.training_program_certifications (program_id, certification_type_id)
SELECT 'd0000000-0000-0000-0000-000000000004', id FROM public.certification_types WHERE code = 'EXCAVATION_SAFETY'
ON CONFLICT DO NOTHING;

INSERT INTO public.training_program_certifications (program_id, certification_type_id)
SELECT 'd0000000-0000-0000-0000-000000000005', id FROM public.certification_types WHERE code = 'CONFINED_SPACE_ENTRANT'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 7: Training Sessions
-- ============================================================================

INSERT INTO public.training_sessions (
  id, organization_id, program_id, session_number, instructor_name, instructor_credentials,
  session_date, session_time, duration_hours, location, project_id, status, completed_at, created_by
) VALUES
-- Completed sessions (past)
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'TRN-2024-0001', 'Mike Reynolds', 'OSHA Authorized Trainer #12345', '2024-10-15', '07:00', 10.0, 'Triton HQ Training Room', NULL, 'completed', '2024-10-15 17:00:00', 'c0000000-0000-0000-0000-000000000003'),
('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'TRN-2024-0002', 'Tom Bradley', 'Fall Protection Specialist', '2024-11-05', '08:00', 4.0, 'Corridor H Project Site', 'b0000000-0000-0000-0000-000000000001', 'completed', '2024-11-05 12:00:00', 'c0000000-0000-0000-0000-000000000003'),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'TRN-2024-0003', 'External Instructor', 'AHA Certified Instructor', '2024-11-20', '08:00', 6.0, 'Triton HQ Training Room', NULL, 'completed', '2024-11-20 14:00:00', 'c0000000-0000-0000-0000-000000000003'),

-- Scheduled sessions (upcoming - January 2025 to address expiring certs)
('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'TRN-2025-0001', 'Mike Reynolds', 'OSHA Authorized Trainer #12345', '2025-01-08', '07:00', 10.0, 'Triton HQ Training Room', NULL, 'scheduled', NULL, 'c0000000-0000-0000-0000-000000000003'),
('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', 'TRN-2025-0002', 'External Instructor', 'AHA Certified Instructor', '2025-01-15', '08:00', 6.0, 'Triton HQ Training Room', NULL, 'scheduled', NULL, 'c0000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status,
  completed_at = EXCLUDED.completed_at;

-- ============================================================================
-- PART 8: Training Session Attendees
-- ============================================================================

-- Attendees for completed OSHA 10 session (October 2024)
INSERT INTO public.training_session_attendees (session_id, employee_id, attendance_status, certifications_granted, certifications_granted_at)
VALUES
('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 'present', true, '2024-10-15 17:00:00'),
('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009', 'present', true, '2024-10-15 17:00:00'),
('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010', 'present', true, '2024-10-15 17:00:00')
ON CONFLICT DO NOTHING;

-- Attendees for completed Fall Protection session (November 2024)
INSERT INTO public.training_session_attendees (session_id, employee_id, attendance_status, certifications_granted, certifications_granted_at)
VALUES
('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000006', 'present', true, '2024-11-05 12:00:00'),
('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000007', 'present', true, '2024-11-05 12:00:00'),
('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000011', 'present', true, '2024-11-05 12:00:00'),
('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000012', 'present', true, '2024-11-05 12:00:00')
ON CONFLICT DO NOTHING;

-- Registered attendees for upcoming OSHA 10 session (January 2025 - expiring workers)
INSERT INTO public.training_session_attendees (session_id, employee_id, attendance_status)
VALUES
('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000013', 'registered'),
('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000014', 'registered'),
('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000015', 'registered'),
('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000018', 'registered'),
('e0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000019', 'registered')
ON CONFLICT DO NOTHING;

-- Registered attendees for upcoming First Aid session (January 2025)
INSERT INTO public.training_session_attendees (session_id, employee_id, attendance_status)
VALUES
('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000016', 'registered'),
('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000017', 'registered'),
('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000020', 'registered'),
('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000021', 'registered'),
('e0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000022', 'registered')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 9: Subcontractors
-- ============================================================================

INSERT INTO public.subcontractors (
  id, organization_id, company_name, dba_name, primary_contact_name, primary_contact_email, primary_contact_phone,
  address_line1, city, state, zip_code,
  general_liability_carrier, general_liability_policy_number, general_liability_limit, general_liability_exp,
  workers_comp_carrier, workers_comp_policy_number, workers_comp_exp,
  is_dbe_certified, dbe_certification_number, dbe_certification_exp, dbe_categories,
  is_wv_licensed, wv_license_number, wv_license_exp,
  compliance_status, is_approved, approved_at
) VALUES
-- Subcontractor 1: Mountain State Electric (DBE, valid COI)
(
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Mountain State Electric LLC',
  'MSE Electric',
  'Sarah Johnson',
  'sarah@mseelectric.com',
  '304-555-1001',
  '500 Electric Way',
  'Charleston',
  'WV',
  '25301',
  'State Farm',
  'GL-2024-MSE-001',
  2000000.00,
  '2025-06-30',
  'Employers Mutual',
  'WC-2024-MSE-001',
  '2025-06-30',
  true,
  'DBE-WV-2024-0123',
  '2025-12-31',
  ARRAY['Electrical', 'Traffic Signals'],
  true,
  'WV-ELEC-12345',
  '2025-12-31',
  'compliant',
  true,
  '2024-01-15 10:00:00'
),
-- Subcontractor 2: Valley Concrete (COI expiring soon)
(
  'f0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Valley Concrete LLC',
  NULL,
  'John Smith',
  'john@valleyconcrete.com',
  '304-555-1002',
  '200 Concrete Drive',
  'Huntington',
  'WV',
  '25701',
  'Nationwide',
  'GL-2024-VC-001',
  1000000.00,
  '2025-01-15', -- EXPIRING SOON
  'WVMCIA',
  'WC-2024-VC-001',
  '2025-01-15', -- EXPIRING SOON
  false,
  NULL,
  NULL,
  NULL,
  true,
  'WV-CON-23456',
  '2025-06-30',
  'incomplete', -- COI expiring
  true,
  '2024-03-01 14:00:00'
),
-- Subcontractor 3: Appalachian Grading (DBE, valid)
(
  'f0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'Appalachian Grading & Excavation',
  'APG',
  'Mike Turner',
  'mike@apgexcavation.com',
  '304-555-1003',
  '750 Mountain Road',
  'Beckley',
  'WV',
  '25801',
  'Liberty Mutual',
  'GL-2024-APG-001',
  2000000.00,
  '2025-08-31',
  'Travelers',
  'WC-2024-APG-001',
  '2025-08-31',
  true,
  'DBE-WV-2024-0456',
  '2025-10-31',
  ARRAY['Earthwork', 'Grading', 'Excavation'],
  true,
  'WV-CON-34567',
  '2025-12-31',
  'compliant',
  true,
  '2024-02-20 09:00:00'
)
ON CONFLICT (id) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  compliance_status = EXCLUDED.compliance_status;

-- ============================================================================
-- PART 10: Subcontractor Workers
-- ============================================================================

INSERT INTO public.subcontractor_workers (
  id, subcontractor_id, first_name, last_name, phone, email,
  has_osha_10, osha_10_exp, has_osha_30, osha_30_exp,
  is_competent_person, competent_person_types,
  has_first_aid_cpr, first_aid_cpr_exp,
  site_orientation_completed, site_orientation_date, is_active
) VALUES
-- MSE Electric workers (4)
('g0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'Paul', 'Electric', '304-555-2001', 'paul@mseelectric.com', true, NULL, true, NULL, true, ARRAY['electrical'], true, '2025-06-15', true, '2024-03-20', true),
('g0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'Jake', 'Sparks', '304-555-2002', 'jake@mseelectric.com', true, NULL, false, NULL, false, NULL, true, '2025-06-15', true, '2024-03-20', true),
('g0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000001', 'Tim', 'Watts', '304-555-2003', 'tim@mseelectric.com', true, NULL, false, NULL, false, NULL, true, '2025-06-15', true, '2024-03-20', true),
('g0000000-0000-0000-0000-000000000004', 'f0000000-0000-0000-0000-000000000001', 'Sam', 'Current', '304-555-2004', 'sam@mseelectric.com', true, NULL, false, NULL, false, NULL, false, NULL, true, '2024-03-20', true),

-- Valley Concrete workers (4) - some with expiring/expired certs
('g0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000002', 'Bob', 'Mason', '304-555-2005', 'bob@valleyconcrete.com', true, NULL, false, NULL, false, NULL, true, '2025-01-20', true, '2024-05-10', true),
('g0000000-0000-0000-0000-000000000006', 'f0000000-0000-0000-0000-000000000002', 'Jim', 'Finisher', '304-555-2006', 'jim@valleyconcrete.com', true, '2024-11-30', false, NULL, false, NULL, false, NULL, true, '2024-05-10', true), -- OSHA 10 expired
('g0000000-0000-0000-0000-000000000007', 'f0000000-0000-0000-0000-000000000002', 'Ted', 'Pour', '304-555-2007', 'ted@valleyconcrete.com', true, NULL, false, NULL, false, NULL, true, '2025-01-10', true, '2024-05-10', true),
('g0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000002', 'Dan', 'Form', '304-555-2008', 'dan@valleyconcrete.com', false, NULL, false, NULL, false, NULL, false, NULL, false, NULL, true), -- No certs, no orientation

-- APG Excavation workers (4)
('g0000000-0000-0000-0000-000000000009', 'f0000000-0000-0000-0000-000000000003', 'Carl', 'Digger', '304-555-2009', 'carl@apgexcavation.com', true, NULL, true, NULL, true, ARRAY['excavation'], true, '2025-08-15', true, '2024-04-01', true),
('g0000000-0000-0000-0000-000000000010', 'f0000000-0000-0000-0000-000000000003', 'Ray', 'Grader', '304-555-2010', 'ray@apgexcavation.com', true, NULL, false, NULL, true, ARRAY['excavation'], true, '2025-08-15', true, '2024-04-01', true),
('g0000000-0000-0000-0000-000000000011', 'f0000000-0000-0000-0000-000000000003', 'Pete', 'Loader', '304-555-2011', 'pete@apgexcavation.com', true, NULL, false, NULL, false, NULL, true, '2025-08-15', true, '2024-04-01', true),
('g0000000-0000-0000-0000-000000000012', 'f0000000-0000-0000-0000-000000000003', 'Nick', 'Trench', '304-555-2012', 'nick@apgexcavation.com', true, NULL, false, NULL, false, NULL, false, NULL, true, '2024-04-01', true)
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

-- ============================================================================
-- PART 11: Competent Person Designations
-- ============================================================================

INSERT INTO public.competent_person_designations (
  id, organization_id, employee_id, competent_person_type,
  training_provider, training_date, certificate_number, expiration_date,
  is_active, authorized_by, authorized_date
) VALUES
-- Excavation competent persons
('h0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'excavation', 'Triton Safety Team', '2024-03-15', 'CP-EXC-2024-001', '2025-03-15', true, 'c0000000-0000-0000-0000-000000000003', '2024-03-15'),
('h0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'excavation', 'Triton Safety Team', '2024-03-15', 'CP-EXC-2024-002', '2025-03-15', true, 'c0000000-0000-0000-0000-000000000003', '2024-03-15'),

-- Fall protection competent persons
('h0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'fall_protection', 'Triton Safety Team', '2024-04-20', 'CP-FP-2024-001', '2025-04-20', true, 'c0000000-0000-0000-0000-000000000003', '2024-04-20'),
('h0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'fall_protection', 'Triton Safety Team', '2024-04-20', 'CP-FP-2024-002', '2025-04-20', true, 'c0000000-0000-0000-0000-000000000003', '2024-04-20'),

-- Scaffolding competent person
('h0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'scaffolding', 'External Provider', '2024-05-10', 'CP-SCAF-2024-001', '2025-05-10', true, 'c0000000-0000-0000-0000-000000000003', '2024-05-10'),

-- Confined space competent person
('h0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'confined_space', 'Triton Safety Team', '2024-06-01', 'CP-CS-2024-001', '2025-06-01', true, 'c0000000-0000-0000-0000-000000000003', '2024-06-01')
ON CONFLICT (id) DO UPDATE SET
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- PART 12: Incidents (Historical)
-- ============================================================================

INSERT INTO public.incidents (
  id, organization_id, incident_number, project_id, location_description,
  incident_date, incident_time, shift, classification,
  osha_recordable, description, immediate_actions_taken, root_cause,
  status, reported_by
) VALUES
-- Near-miss: Trenching
(
  'i0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'INC-2024-00001',
  'b0000000-0000-0000-0000-000000000001',
  'Corridor H Section 12 - Station 145+00',
  '2024-10-20',
  '10:30:00',
  'day',
  'near_miss',
  false,
  'Trench wall showed signs of instability during excavation work. Work stopped immediately and trench was properly shored before work resumed.',
  'Work stopped. All personnel evacuated from trench. Competent person evaluated and directed installation of additional shoring.',
  'Soil conditions changed due to recent rain. Competent person inspection frequency increased for wet conditions.',
  'closed',
  'c0000000-0000-0000-0000-000000000006'
),
-- First Aid: Minor laceration
(
  'i0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'INC-2024-00002',
  'b0000000-0000-0000-0000-000000000002',
  'US-35 Bridge - East Abutment',
  '2024-11-05',
  '14:15:00',
  'day',
  'first_aid_only',
  false,
  'Worker received minor cut on hand while handling rebar. First aid administered on site.',
  'First aid kit used to clean and bandage wound. Worker returned to light duty same day.',
  'Worker not wearing cut-resistant gloves as required. Toolbox talk on PPE compliance scheduled.',
  'closed',
  'c0000000-0000-0000-0000-000000000005'
),
-- Property Damage: Equipment
(
  'i0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'INC-2024-00003',
  'b0000000-0000-0000-0000-000000000001',
  'Corridor H Section 12 - Equipment Staging Area',
  '2024-12-02',
  '08:45:00',
  'day',
  'property_damage',
  false,
  'Excavator bucket contacted power pole during repositioning. Pole damaged but remained upright. No power outage.',
  'Work stopped. Utility company notified. Barricades placed around pole. Excavator moved to safe location.',
  'Under investigation. Spotter was not used during equipment movement in congested area.',
  'investigating',
  'c0000000-0000-0000-0000-000000000004'
)
ON CONFLICT (id) DO UPDATE SET
  status = EXCLUDED.status;

-- ============================================================================
-- PART 13: Daily Safety Briefs
-- ============================================================================

INSERT INTO public.daily_safety_briefs (
  id, organization_id, project_id, brief_date, supervisor_id,
  checklist_responses, attendee_count, attendee_employee_ids,
  weather_conditions, site_conditions, special_hazards, work_planned,
  completed_at, duration_seconds
) VALUES
-- Past 5 days of briefs for Corridor H
(
  'j0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  CURRENT_DATE - 4,
  'c0000000-0000-0000-0000-000000000004',
  '{"ppe_verified": true, "equipment_inspected": true, "hazards_identified": true, "emergency_plan_reviewed": true, "competent_person_present": true, "utilities_marked": true}',
  8,
  ARRAY['c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000014']::uuid[],
  'Clear, 45F',
  'Dry, good footing',
  'Trenching operations - competent person required',
  'Continue storm drain installation stations 142+00 to 145+00',
  (CURRENT_DATE - 4 + TIME '07:15:00')::timestamptz,
  45
),
(
  'j0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  CURRENT_DATE - 3,
  'c0000000-0000-0000-0000-000000000004',
  '{"ppe_verified": true, "equipment_inspected": true, "hazards_identified": true, "emergency_plan_reviewed": true, "competent_person_present": true, "utilities_marked": true}',
  7,
  ARRAY['c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000014']::uuid[],
  'Partly cloudy, 52F',
  'Dry',
  'Overhead power lines in work area',
  'Complete drainage at 145+00, begin paving prep',
  (CURRENT_DATE - 3 + TIME '07:10:00')::timestamptz,
  38
),
(
  'j0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  CURRENT_DATE - 2,
  'c0000000-0000-0000-0000-000000000004',
  '{"ppe_verified": true, "equipment_inspected": true, "hazards_identified": true, "emergency_plan_reviewed": true, "competent_person_present": true, "utilities_marked": true}',
  9,
  ARRAY['c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000014']::uuid[],
  'Rain expected PM, 48F',
  'Wet conditions possible',
  'Slippery conditions if rain arrives',
  'Paving preparation, base course installation',
  (CURRENT_DATE - 2 + TIME '07:20:00')::timestamptz,
  52
),
(
  'j0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  CURRENT_DATE - 1,
  'c0000000-0000-0000-0000-000000000004',
  '{"ppe_verified": true, "equipment_inspected": true, "hazards_identified": true, "emergency_plan_reviewed": true, "competent_person_present": true, "utilities_marked": true}',
  8,
  ARRAY['c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000014']::uuid[],
  'Clear, 42F',
  'Frozen ground areas',
  'Ice on equipment in morning',
  'Base course completion, guardrail prep',
  (CURRENT_DATE - 1 + TIME '07:05:00')::timestamptz,
  40
),
(
  'j0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  CURRENT_DATE,
  'c0000000-0000-0000-0000-000000000004',
  '{"ppe_verified": true, "equipment_inspected": true, "hazards_identified": true, "emergency_plan_reviewed": true, "competent_person_present": true, "utilities_marked": true}',
  9,
  ARRAY['c0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000014']::uuid[],
  'Sunny, 50F',
  'Good conditions',
  'Traffic control for guardrail work',
  'Guardrail installation, signage',
  (CURRENT_DATE + TIME '07:12:00')::timestamptz,
  48
)
ON CONFLICT (id) DO UPDATE SET
  completed_at = EXCLUDED.completed_at;

-- ============================================================================
-- PART 14: Project Assignments
-- ============================================================================

-- Note: This requires user_profiles to exist and be linked to employees
-- For now, we'll insert project assignments using employee IDs where user_profiles would normally be

-- This section will be completed when user_profiles are created through auth signup
-- For demo purposes, the project assignments can be made manually in the UI

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration creates:
-- - 1 Organization (Triton Construction)
-- - 3 Projects (Corridor H, US-35 Bridge, I-64 Widening)
-- - 22 Employees (management + field workers with varied cert status)
-- - 85+ Employee Certifications (valid, expiring, expired)
-- - 5 Training Programs
-- - 5 Training Sessions (3 completed, 2 scheduled)
-- - Training Session Attendees
-- - 3 Subcontractors with 12 workers
-- - 6 Competent Person Designations
-- - 3 Historical Incidents
-- - 5 Daily Safety Briefs

-- TO CLEAN UP (before production):
-- DELETE FROM daily_safety_briefs WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM incidents WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM competent_person_designations WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM subcontractor_workers WHERE subcontractor_id IN (SELECT id FROM subcontractors WHERE organization_id = 'a0000000-0000-0000-0000-000000000001');
-- DELETE FROM subcontractors WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM training_session_attendees WHERE session_id IN (SELECT id FROM training_sessions WHERE organization_id = 'a0000000-0000-0000-0000-000000000001');
-- DELETE FROM training_sessions WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM training_program_certifications WHERE program_id IN (SELECT id FROM training_programs WHERE organization_id = 'a0000000-0000-0000-0000-000000000001');
-- DELETE FROM training_programs WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM employee_certifications WHERE employee_id IN (SELECT id FROM employees WHERE organization_id = 'a0000000-0000-0000-0000-000000000001');
-- DELETE FROM employees WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM projects WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM organizations WHERE id = 'a0000000-0000-0000-0000-000000000001';
