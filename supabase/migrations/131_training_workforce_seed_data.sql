-- =============================================================================
-- Migration: 131_training_workforce_seed_data.sql
-- Purpose: Seed sample data for Training and Workforce Compliance dashboards
-- Date: December 14, 2025
-- =============================================================================

-- Use demo organization
DO $$
DECLARE
    v_org_id UUID := 'a0000000-0000-0000-0000-000000000001';
    v_user_id UUID := 'a1448b14-4425-41e7-a662-8b220eb284b6';
    v_project_1 UUID := 'b0000000-0000-0000-0000-000000000001';
    v_project_2 UUID := 'b0000000-0000-0000-0000-000000000002';
    v_project_3 UUID := 'b0000000-0000-0000-0000-000000000003';
BEGIN
    RAISE NOTICE 'Using organization: %, user: %', v_org_id, v_user_id;
END $$;

-- =============================================================================
-- PART 1: EMPLOYEES (Using actual remote schema columns)
-- =============================================================================

INSERT INTO public.employees (
    id, organization_id, employee_number, first_name, last_name, email, phone,
    employment_status, hire_date, job_title
) VALUES
    -- Construction Workers
    ('e0000000-0000-4000-a000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'EMP-001', 'Michael', 'Thompson', 'mthompson@triton.com', '304-555-1001',
     'active', '2021-03-15', 'Superintendent'),

    ('e0000000-0000-4000-a000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'EMP-002', 'James', 'Rodriguez', 'jrodriguez@triton.com', '304-555-1002',
     'active', '2022-06-01', 'Foreman'),

    ('e0000000-0000-4000-a000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'EMP-003', 'Sarah', 'Williams', 'swilliams@triton.com', '304-555-1003',
     'active', '2020-09-10', 'Safety Director'),

    ('e0000000-0000-4000-a000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     'EMP-004', 'David', 'Johnson', 'djohnson@triton.com', '304-555-1004',
     'active', '2023-01-20', 'Equipment Operator'),

    ('e0000000-0000-4000-a000-000000000005', 'a0000000-0000-0000-0000-000000000001',
     'EMP-005', 'Robert', 'Martinez', 'rmartinez@triton.com', '304-555-1005',
     'active', '2022-11-15', 'Laborer'),

    ('e0000000-0000-4000-a000-000000000006', 'a0000000-0000-0000-0000-000000000001',
     'EMP-006', 'Amanda', 'Davis', 'adavis@triton.com', '304-555-1006',
     'active', '2021-07-01', 'Project Coordinator'),

    ('e0000000-0000-4000-a000-000000000007', 'a0000000-0000-0000-0000-000000000001',
     'EMP-007', 'Carlos', 'Hernandez', 'chernandez@triton.com', '304-555-1007',
     'active', '2023-04-01', 'Crane Operator'),

    ('e0000000-0000-4000-a000-000000000008', 'a0000000-0000-0000-0000-000000000001',
     'EMP-008', 'Jennifer', 'Taylor', 'jtaylor@triton.com', '304-555-1008',
     'active', '2022-02-14', 'QC Inspector')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- PART 2: SUBCONTRACTORS - SKIPPED
-- =============================================================================
-- Note: Subcontractors table has a check constraint on primary_trade that requires
-- specific values from trade_classification enum. Skipping for now as it's not
-- essential for Training or Workforce Compliance dashboards.


-- =============================================================================
-- PART 3: EMPLOYEE CERTIFICATIONS
-- =============================================================================

INSERT INTO public.employee_certifications (
    id, employee_id, certification_type, certification_name, issuing_authority,
    certificate_number, issue_date, expiration_date, status, verified_at
) VALUES
    -- Michael Thompson (Superintendent) - All major certs
    ('c0000001-0000-0000-0000-000000000001', 'e0000000-0000-4000-a000-000000000001',
     'OSHA_30', 'OSHA 30-Hour Construction', 'OSHA', 'OSHA30-2023-001', '2023-02-15', NULL, 'active', NOW()),
    ('c0000001-0000-0000-0000-000000000002', 'e0000000-0000-4000-a000-000000000001',
     'FIRST_AID', 'First Aid/CPR/AED', 'American Red Cross', 'FA-2024-1234', '2024-01-10', '2026-01-10', 'active', NOW()),
    ('c0000001-0000-0000-0000-000000000003', 'e0000000-0000-4000-a000-000000000001',
     'FALL_PROTECTION', 'Fall Protection Trained', 'Triton Safety', 'FP-2024-001', '2024-03-15', '2025-03-15', 'active', NOW()),

    -- James Rodriguez (Foreman)
    ('c0000002-0000-0000-0000-000000000001', 'e0000000-0000-4000-a000-000000000002',
     'OSHA_30', 'OSHA 30-Hour Construction', 'OSHA', 'OSHA30-2022-056', '2022-07-20', NULL, 'active', NOW()),
    ('c0000002-0000-0000-0000-000000000002', 'e0000000-0000-4000-a000-000000000002',
     'EXCAVATION_SAFETY', 'Excavation Safety', 'Triton Safety', 'EX-2024-022', '2024-04-01', '2025-04-01', 'active', NOW()),
    ('c0000002-0000-0000-0000-000000000003', 'e0000000-0000-4000-a000-000000000002',
     'CONFINED_SPACE_ENTRANT', 'Confined Space Entry', 'Triton Safety', 'CS-2024-008', '2024-05-10', '2025-05-10', 'active', NOW()),

    -- Sarah Williams (Safety Director)
    ('c0000003-0000-0000-0000-000000000001', 'e0000000-0000-4000-a000-000000000003',
     'OSHA_30', 'OSHA 30-Hour Construction', 'OSHA', 'OSHA30-2020-189', '2020-10-01', NULL, 'active', NOW()),
    ('c0000003-0000-0000-0000-000000000002', 'e0000000-0000-4000-a000-000000000003',
     'FIRST_AID', 'First Aid/CPR/AED', 'American Red Cross', 'FA-2024-5678', '2024-02-20', '2026-02-20', 'active', NOW()),

    -- David Johnson (Equipment Operator) - Missing DOT Medical
    ('c0000004-0000-0000-0000-000000000001', 'e0000000-0000-4000-a000-000000000004',
     'OSHA_10', 'OSHA 10-Hour Construction', 'OSHA', 'OSHA10-2023-234', '2023-02-01', NULL, 'active', NOW()),
    ('c0000004-0000-0000-0000-000000000002', 'e0000000-0000-4000-a000-000000000004',
     'CDL_A', 'CDL Class A', 'WV DMV', 'CDL-WV-2023-8901', '2023-03-01', '2027-03-01', 'active', NOW()),
    ('c0000004-0000-0000-0000-000000000003', 'e0000000-0000-4000-a000-000000000004',
     'FORKLIFT', 'Powered Industrial Truck', 'Triton Safety', 'FL-2024-015', '2024-02-15', '2027-02-15', 'active', NOW()),

    -- Robert Martinez (Laborer) - Fall Protection expiring soon
    ('c0000005-0000-0000-0000-000000000001', 'e0000000-0000-4000-a000-000000000005',
     'OSHA_10', 'OSHA 10-Hour Construction', 'OSHA', 'OSHA10-2022-567', '2022-12-01', NULL, 'active', NOW()),
    ('c0000005-0000-0000-0000-000000000002', 'e0000000-0000-4000-a000-000000000005',
     'FALL_PROTECTION', 'Fall Protection Trained', 'Triton Safety', 'FP-2024-045', '2024-01-05', '2025-01-05', 'pending_renewal', NOW()),

    -- Carlos Hernandez (Crane Operator)
    ('c0000007-0000-0000-0000-000000000001', 'e0000000-0000-4000-a000-000000000007',
     'OSHA_30', 'OSHA 30-Hour Construction', 'OSHA', 'OSHA30-2023-333', '2023-05-01', NULL, 'active', NOW()),
    ('c0000007-0000-0000-0000-000000000002', 'e0000000-0000-4000-a000-000000000007',
     'NCCCO_TLL', 'NCCCO Telescopic Boom Crane', 'NCCCO', 'NCCCO-2023-TLL-789', '2023-06-15', '2028-06-15', 'active', NOW()),
    ('c0000007-0000-0000-0000-000000000003', 'e0000000-0000-4000-a000-000000000007',
     'CDL_A', 'CDL Class A', 'WV DMV', 'CDL-WV-2023-4567', '2023-04-10', '2027-04-10', 'active', NOW()),
    ('c0000007-0000-0000-0000-000000000004', 'e0000000-0000-4000-a000-000000000007',
     'DOT_MEDICAL', 'DOT Medical Card', 'Dr. Smith Medical', 'DOT-2024-1122', '2024-06-01', '2026-06-01', 'active', NOW()),

    -- Jennifer Taylor (QC Inspector)
    ('c0000008-0000-0000-0000-000000000001', 'e0000000-0000-4000-a000-000000000008',
     'OSHA_10', 'OSHA 10-Hour Construction', 'OSHA', 'OSHA10-2022-890', '2022-03-15', NULL, 'active', NOW())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- PART 4: TRAINING PROGRAMS
-- =============================================================================

INSERT INTO public.training_programs (
    id, organization_id, name, program_code, description, provider_type, default_duration_hours,
    min_attendees, max_attendees, recurrence_interval_months, topics_covered, is_active, created_by
) VALUES
    ('00000000-0001-4000-a000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'Fall Protection Safety', 'FP-101', 'Comprehensive fall protection training covering hazard recognition, equipment selection, and proper use',
     'internal', 4.0, 1, 20, 12,
     ARRAY['Fall hazard recognition', 'Guardrail systems', 'Personal fall arrest systems', 'Rescue procedures'],
     true, 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    ('00000000-0001-4000-a000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'Excavation & Trenching Safety', 'EX-101', 'OSHA-compliant excavation and trenching safety training',
     'internal', 4.0, 1, 15, 12,
     ARRAY['Soil classification', 'Protective systems', 'Hazard recognition', 'Competent person duties'],
     true, 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    ('00000000-0001-4000-a000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'First Aid/CPR/AED', 'FA-101', 'American Red Cross certified First Aid, CPR, and AED training',
     'external', 8.0, 5, 12, 24,
     ARRAY['Adult CPR', 'AED use', 'First aid for injuries', 'Emergency response'],
     true, 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    ('00000000-0001-4000-a000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     'Confined Space Entry', 'CS-101', 'Permit-required confined space entry and rescue training',
     'internal', 4.0, 1, 10, 12,
     ARRAY['Permit requirements', 'Atmospheric testing', 'Entry procedures', 'Rescue planning'],
     true, 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    ('00000000-0001-4000-a000-000000000005', 'a0000000-0000-0000-0000-000000000001',
     'Hazard Communication (HazCom)', 'HC-101', 'GHS-aligned hazard communication training',
     'internal', 2.0, 1, 30, 12,
     ARRAY['GHS labeling', 'SDS interpretation', 'Chemical handling', 'Emergency procedures'],
     true, 'a1448b14-4425-41e7-a662-8b220eb284b6')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- PART 5: TRAINING PROGRAM CERTIFICATIONS (Link programs to certs they grant)
-- =============================================================================

INSERT INTO public.training_program_certifications (id, program_id, certification_type_id)
SELECT
    gen_random_uuid(),
    '00000000-0001-4000-a000-000000000001',
    id
FROM public.certification_types WHERE code = 'FALL_PROTECTION'
ON CONFLICT DO NOTHING;

INSERT INTO public.training_program_certifications (id, program_id, certification_type_id)
SELECT
    gen_random_uuid(),
    '00000000-0001-4000-a000-000000000002',
    id
FROM public.certification_types WHERE code = 'EXCAVATION_SAFETY'
ON CONFLICT DO NOTHING;

INSERT INTO public.training_program_certifications (id, program_id, certification_type_id)
SELECT
    gen_random_uuid(),
    '00000000-0001-4000-a000-000000000003',
    id
FROM public.certification_types WHERE code = 'FIRST_AID'
ON CONFLICT DO NOTHING;

INSERT INTO public.training_program_certifications (id, program_id, certification_type_id)
SELECT
    gen_random_uuid(),
    '00000000-0001-4000-a000-000000000004',
    id
FROM public.certification_types WHERE code = 'CONFINED_SPACE_ENTRANT'
ON CONFLICT DO NOTHING;

INSERT INTO public.training_program_certifications (id, program_id, certification_type_id)
SELECT
    gen_random_uuid(),
    '00000000-0001-4000-a000-000000000005',
    id
FROM public.certification_types WHERE code = 'HAZCOM'
ON CONFLICT DO NOTHING;


-- =============================================================================
-- PART 6: TRAINING SESSIONS
-- =============================================================================

INSERT INTO public.training_sessions (
    id, organization_id, program_id, session_number, instructor_user_id, instructor_name,
    instructor_credentials, session_date, session_time, duration_hours, location,
    project_id, status, notes, created_by
) VALUES
    -- Completed session last month
    ('00000000-0002-4000-a000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     '00000000-0001-4000-a000-000000000001', 'TRN-2024-0001', 'a1448b14-4425-41e7-a662-8b220eb284b6',
     'Sarah Williams', 'OSHA Authorized Trainer',
     CURRENT_DATE - INTERVAL '30 days', '08:00', 4.0, 'Main Office Conference Room',
     NULL, 'completed', 'Annual fall protection refresher completed successfully', 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    -- Completed session 2 weeks ago
    ('00000000-0002-4000-a000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     '00000000-0001-4000-a000-000000000002', 'TRN-2024-0002', 'a1448b14-4425-41e7-a662-8b220eb284b6',
     'Sarah Williams', 'OSHA Authorized Trainer',
     CURRENT_DATE - INTERVAL '14 days', '07:00', 4.0, 'Corridor H Project Site',
     'b0000000-0000-0000-0000-000000000001', 'completed', 'Project-specific excavation training', 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    -- Scheduled session for next week
    ('00000000-0002-4000-a000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     '00000000-0001-4000-a000-000000000003', 'TRN-2024-0003', NULL,
     'American Red Cross Instructor', 'Certified ARC Instructor',
     CURRENT_DATE + INTERVAL '7 days', '08:00', 8.0, 'Main Office Training Room',
     NULL, 'scheduled', 'First Aid/CPR recertification class', 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    -- Scheduled session for next month
    ('00000000-0002-4000-a000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     '00000000-0001-4000-a000-000000000004', 'TRN-2024-0004', 'a1448b14-4425-41e7-a662-8b220eb284b6',
     'Sarah Williams', 'OSHA Authorized Trainer',
     CURRENT_DATE + INTERVAL '21 days', '07:00', 4.0, 'US-35 Bridge Project Site',
     'b0000000-0000-0000-0000-000000000002', 'scheduled', 'Confined space training for bridge work', 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    -- Scheduled HazCom session
    ('00000000-0002-4000-a000-000000000005', 'a0000000-0000-0000-0000-000000000001',
     '00000000-0001-4000-a000-000000000005', 'TRN-2024-0005', 'a1448b14-4425-41e7-a662-8b220eb284b6',
     'Sarah Williams', 'OSHA Authorized Trainer',
     CURRENT_DATE + INTERVAL '14 days', '13:00', 2.0, 'Main Office Conference Room',
     NULL, 'scheduled', 'Annual HazCom refresher', 'a1448b14-4425-41e7-a662-8b220eb284b6')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- PART 7: TRAINING SESSION ATTENDEES
-- =============================================================================

INSERT INTO public.training_session_attendees (
    id, session_id, employee_id, attendance_status, certifications_granted, certifications_granted_at
) VALUES
    -- Fall Protection (completed)
    ('00000000-0003-4000-a000-000000000001', '00000000-0002-4000-a000-000000000001', 'e0000000-0000-4000-a000-000000000001', 'present', true, NOW() - INTERVAL '30 days'),
    ('00000000-0003-4000-a000-000000000002', '00000000-0002-4000-a000-000000000001', 'e0000000-0000-4000-a000-000000000002', 'present', true, NOW() - INTERVAL '30 days'),
    ('00000000-0003-4000-a000-000000000003', '00000000-0002-4000-a000-000000000001', 'e0000000-0000-4000-a000-000000000004', 'present', true, NOW() - INTERVAL '30 days'),
    ('00000000-0003-4000-a000-000000000004', '00000000-0002-4000-a000-000000000001', 'e0000000-0000-4000-a000-000000000005', 'absent', false, NULL),

    -- Excavation Safety (completed)
    ('00000000-0003-4000-a000-000000000005', '00000000-0002-4000-a000-000000000002', 'e0000000-0000-4000-a000-000000000002', 'present', true, NOW() - INTERVAL '14 days'),
    ('00000000-0003-4000-a000-000000000006', '00000000-0002-4000-a000-000000000002', 'e0000000-0000-4000-a000-000000000005', 'present', true, NOW() - INTERVAL '14 days'),
    ('00000000-0003-4000-a000-000000000007', '00000000-0002-4000-a000-000000000002', 'e0000000-0000-4000-a000-000000000007', 'present', true, NOW() - INTERVAL '14 days'),

    -- First Aid (scheduled)
    ('00000000-0003-4000-a000-000000000008', '00000000-0002-4000-a000-000000000003', 'e0000000-0000-4000-a000-000000000001', 'registered', false, NULL),
    ('00000000-0003-4000-a000-000000000009', '00000000-0002-4000-a000-000000000003', 'e0000000-0000-4000-a000-000000000002', 'registered', false, NULL),
    ('00000000-0003-4000-a000-000000000010', '00000000-0002-4000-a000-000000000003', 'e0000000-0000-4000-a000-000000000003', 'registered', false, NULL),
    ('00000000-0003-4000-a000-000000000011', '00000000-0002-4000-a000-000000000003', 'e0000000-0000-4000-a000-000000000006', 'registered', false, NULL),

    -- Confined Space (scheduled)
    ('00000000-0003-4000-a000-000000000012', '00000000-0002-4000-a000-000000000004', 'e0000000-0000-4000-a000-000000000002', 'registered', false, NULL),
    ('00000000-0003-4000-a000-000000000013', '00000000-0002-4000-a000-000000000004', 'e0000000-0000-4000-a000-000000000004', 'registered', false, NULL),
    ('00000000-0003-4000-a000-000000000014', '00000000-0002-4000-a000-000000000004', 'e0000000-0000-4000-a000-000000000005', 'registered', false, NULL),

    -- HazCom (scheduled)
    ('00000000-0003-4000-a000-000000000015', '00000000-0002-4000-a000-000000000005', 'e0000000-0000-4000-a000-000000000004', 'registered', false, NULL),
    ('00000000-0003-4000-a000-000000000016', '00000000-0002-4000-a000-000000000005', 'e0000000-0000-4000-a000-000000000005', 'registered', false, NULL),
    ('00000000-0003-4000-a000-000000000017', '00000000-0002-4000-a000-000000000005', 'e0000000-0000-4000-a000-000000000007', 'registered', false, NULL),
    ('00000000-0003-4000-a000-000000000018', '00000000-0002-4000-a000-000000000005', 'e0000000-0000-4000-a000-000000000008', 'registered', false, NULL)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- PART 8: INCIDENTS (For Workforce Compliance Dashboard - Using actual schema)
-- =============================================================================

INSERT INTO public.incidents (
    id, organization_id, project_id, incident_number, incident_date, incident_time,
    classification, description, status, reported_by_id
) VALUES
    ('10000000-0000-4000-a000-000000000001', 'a0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001', 'INC-2024-001', CURRENT_DATE - INTERVAL '45 days', '10:30',
     'near_miss', 'Unsecured load on flatbed nearly fell during unloading. No injuries. Location: Station 147+00.',
     'closed', 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    ('10000000-0000-4000-a000-000000000002', 'a0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000002', 'INC-2024-002', CURRENT_DATE - INTERVAL '30 days', '14:15',
     'first_aid', 'Worker received minor laceration from sheet metal edge. First aid administered on site. Location: Bridge Deck Section B.',
     'closed', 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    ('10000000-0000-4000-a000-000000000003', 'a0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000003', 'INC-2024-003', CURRENT_DATE - INTERVAL '15 days', '08:45',
     'near_miss', 'Excavation wall showed signs of instability. Work stopped and area evacuated. Location: Trench at Station 89+50.',
     'investigation', 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    ('10000000-0000-4000-a000-000000000004', 'a0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000001', 'INC-2024-004', CURRENT_DATE - INTERVAL '7 days', '11:00',
     'property_damage', 'Delivery truck struck overhead power line. No injuries, minor vehicle damage. Location: Corridor H Access Road.',
     'open', 'a1448b14-4425-41e7-a662-8b220eb284b6'),

    ('10000000-0000-4000-a000-000000000005', 'a0000000-0000-0000-0000-000000000001',
     'b0000000-0000-0000-0000-000000000002', 'INC-2024-005', CURRENT_DATE - INTERVAL '3 days', '15:30',
     'near_miss', 'Crane load swung unexpectedly due to wind gust. No one in swing radius. Location: Bridge Pier 3.',
     'open', 'a1448b14-4425-41e7-a662-8b220eb284b6')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- PART 9: DRIVER LICENSES - SKIPPED
-- =============================================================================
-- Note: driver_licenses table on remote has different schema (missing license_type column).
-- Skipping for now - employee certifications above already cover CDL credentials.


-- =============================================================================
-- PART 10: Update session completion timestamps
-- =============================================================================

UPDATE public.training_sessions
SET completed_at = session_date + INTERVAL '4 hours', started_at = session_date::timestamp
WHERE status = 'completed' AND completed_at IS NULL;


COMMENT ON TABLE public.employees IS 'Sample employee data for workforce compliance demonstration';
