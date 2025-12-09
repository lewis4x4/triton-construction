-- =============================================================================
-- Migration 090: Update Seed Data Dates to Q4 2025 / 2026
-- =============================================================================
-- PURPOSE: Update all sandbox demo data dates to be current as of December 2025
-- This ensures the demo data remains relevant and realistic
-- =============================================================================

-- ============================================================================
-- PART 1: Update Projects - Shift dates to Q4 2025 and into 2026
-- ============================================================================

UPDATE public.projects
SET
  project_number = '2025-001',
  notice_to_proceed_date = '2025-10-01',
  original_completion_date = '2027-03-31',
  current_completion_date = '2027-03-31',
  working_days_used = 45,
  percent_complete = 18.5,
  contract_number = 'DOH-2025-0123',
  federal_aid_number = 'FA-2025-WV-0123'
WHERE id = 'b0000000-0000-0000-0000-000000000001';

UPDATE public.projects
SET
  project_number = '2025-002',
  notice_to_proceed_date = '2025-09-15',
  original_completion_date = '2026-12-31',
  current_completion_date = '2027-01-15',
  working_days_used = 58,
  percent_complete = 32.0,
  contract_number = 'DOH-2025-0456',
  federal_aid_number = 'FA-2025-WV-0456'
WHERE id = 'b0000000-0000-0000-0000-000000000002';

UPDATE public.projects
SET
  project_number = '2025-003',
  notice_to_proceed_date = '2025-12-01',
  original_completion_date = '2027-06-30',
  current_completion_date = '2027-06-30',
  working_days_used = 5,
  percent_complete = 2.0,
  contract_number = 'DOH-2025-0789',
  federal_aid_number = 'FA-2025-WV-0789'
WHERE id = 'b0000000-0000-0000-0000-000000000003';

-- ============================================================================
-- PART 2: Add More Projects (5 additional projects)
-- ============================================================================

INSERT INTO public.projects (
  id, organization_id, project_number, name, description, project_type, contract_type,
  status, contract_number, notice_to_proceed_date, original_completion_date, current_completion_date,
  original_contract_value, current_contract_value, original_working_days, current_working_days, working_days_used,
  is_federal_aid, federal_aid_number, wvdoh_district, davis_bacon_required, dbe_goal_percentage, buy_america_required,
  address_line1, city, state, zip_code, county, percent_complete
) VALUES
-- Project 4: Route 50 Resurfacing (Active - 65% complete)
(
  'b0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  '2025-004',
  'Route 50 Resurfacing - Clarksburg',
  'Mill and overlay 8.5 miles of Route 50 from Clarksburg to Salem. Includes drainage repairs and guardrail upgrades.',
  'HIGHWAY',
  'UNIT_PRICE',
  'ACTIVE',
  'DOH-2025-0234',
  '2025-06-15',
  '2026-03-31',
  '2026-03-31',
  4200000.00,
  4350000.00,
  120,
  125,
  78,
  true,
  'FA-2025-WV-0234',
  7,
  true,
  7.5,
  true,
  'Route 50 Mile Marker 12-20',
  'Clarksburg',
  'WV',
  '26301',
  'Harrison',
  65.0
),
-- Project 5: Coalfield Expressway Section 4 (Active - 40% complete)
(
  'b0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  '2025-005',
  'Coalfield Expressway Section 4',
  'New construction of 3.2 miles of 4-lane divided highway. Includes 2 bridges and 1 interchange.',
  'HIGHWAY',
  'UNIT_PRICE',
  'ACTIVE',
  'DOH-2025-0345',
  '2025-07-01',
  '2027-05-31',
  '2027-05-31',
  28500000.00,
  28500000.00,
  320,
  320,
  110,
  true,
  'FA-2025-WV-0345',
  9,
  true,
  10.0,
  true,
  'Coalfield Expressway MM 45-48',
  'Welch',
  'WV',
  '24801',
  'McDowell',
  40.0
),
-- Project 6: I-77 Bridge Deck Replacement (Substantial Completion)
(
  'b0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  '2025-006',
  'I-77 Bridge Deck Replacement - Beckley',
  'Replace bridge deck on I-77 northbound over Harper Road. Night work required to minimize traffic impact.',
  'BRIDGE',
  'LUMP_SUM',
  'SUBSTANTIAL_COMPLETION',
  'DOH-2025-0567',
  '2025-04-01',
  '2025-11-30',
  '2025-12-05',
  3800000.00,
  3950000.00,
  90,
  95,
  92,
  true,
  'FA-2025-WV-0567',
  10,
  true,
  8.5,
  true,
  'I-77 NB over Harper Road',
  'Beckley',
  'WV',
  '25801',
  'Raleigh',
  98.0
),
-- Project 7: Parkersburg Intersection Improvement (Mobilization phase)
(
  'b0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  '2025-007',
  'Route 14 & Route 47 Intersection Improvement',
  'Convert at-grade intersection to roundabout. Includes utility relocations and drainage improvements.',
  'HIGHWAY',
  'UNIT_PRICE',
  'MOBILIZATION',
  'DOH-2025-0678',
  '2025-11-15',
  '2026-08-31',
  '2026-08-31',
  5600000.00,
  5600000.00,
  140,
  140,
  8,
  false,
  NULL,
  3,
  false,
  0.0,
  false,
  'Route 14 at Route 47',
  'Parkersburg',
  'WV',
  '26101',
  'Wood',
  3.0
),
-- Project 8: Wheeling Tunnel Rehabilitation (Punch List)
(
  'b0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000001',
  '2024-008',
  'Wheeling Tunnel Lighting & Safety Upgrade',
  'Replace tunnel lighting with LED fixtures, upgrade fire suppression system, install new traffic monitoring equipment.',
  'HIGHWAY',
  'LUMP_SUM',
  'PUNCH_LIST',
  'DOH-2024-0890',
  '2025-02-01',
  '2025-10-31',
  '2025-11-15',
  2100000.00,
  2250000.00,
  85,
  90,
  88,
  true,
  'FA-2024-WV-0890',
  6,
  true,
  8.0,
  true,
  'Wheeling Tunnel - Route 40',
  'Wheeling',
  'WV',
  '26003',
  'Ohio',
  96.0
)
ON CONFLICT (id) DO UPDATE SET
  project_number = EXCLUDED.project_number,
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  percent_complete = EXCLUDED.percent_complete;

-- ============================================================================
-- PART 3: Update Employee Certifications - Shift dates forward 1 year
-- ============================================================================

-- Update valid certifications (compliant workers)
UPDATE public.employee_certifications
SET
  issue_date = issue_date + INTERVAL '1 year',
  expiration_date = CASE
    WHEN expiration_date IS NOT NULL THEN expiration_date + INTERVAL '1 year'
    ELSE NULL
  END
WHERE employee_id IN (
  'c0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000005',
  'c0000000-0000-0000-0000-000000000006',
  'c0000000-0000-0000-0000-000000000007',
  'c0000000-0000-0000-0000-000000000008',
  'c0000000-0000-0000-0000-000000000009',
  'c0000000-0000-0000-0000-000000000010',
  'c0000000-0000-0000-0000-000000000011',
  'c0000000-0000-0000-0000-000000000012'
);

-- Update expiring soon certifications
UPDATE public.employee_certifications
SET
  issue_date = '2024-10-01',
  expiration_date = expiration_date + INTERVAL '1 year'
WHERE employee_id IN (
  'c0000000-0000-0000-0000-000000000013',
  'c0000000-0000-0000-0000-000000000014',
  'c0000000-0000-0000-0000-000000000015',
  'c0000000-0000-0000-0000-000000000016',
  'c0000000-0000-0000-0000-000000000017'
)
AND status = 'active';

-- Update expired certifications
UPDATE public.employee_certifications
SET
  issue_date = '2024-01-01',
  expiration_date = expiration_date + INTERVAL '1 year'
WHERE employee_id IN (
  'c0000000-0000-0000-0000-000000000018',
  'c0000000-0000-0000-0000-000000000019',
  'c0000000-0000-0000-0000-000000000020',
  'c0000000-0000-0000-0000-000000000021',
  'c0000000-0000-0000-0000-000000000022'
)
AND status = 'expired';

-- ============================================================================
-- PART 4: Update Training Sessions - Shift dates forward 1 year
-- ============================================================================

UPDATE public.training_sessions
SET
  session_date = session_date + INTERVAL '1 year',
  completed_at = CASE
    WHEN completed_at IS NOT NULL THEN completed_at + INTERVAL '1 year'
    ELSE NULL
  END
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- Update session numbers to reflect 2025/2026
UPDATE public.training_sessions SET session_number = 'TRN-2025-0001' WHERE id = 'e0000000-0000-0000-0000-000000000001';
UPDATE public.training_sessions SET session_number = 'TRN-2025-0002' WHERE id = 'e0000000-0000-0000-0000-000000000002';
UPDATE public.training_sessions SET session_number = 'TRN-2025-0003' WHERE id = 'e0000000-0000-0000-0000-000000000003';
UPDATE public.training_sessions SET session_number = 'TRN-2026-0001' WHERE id = 'e0000000-0000-0000-0000-000000000004';
UPDATE public.training_sessions SET session_number = 'TRN-2026-0002' WHERE id = 'e0000000-0000-0000-0000-000000000005';

-- Update attendee granted dates
UPDATE public.training_session_attendees
SET certifications_granted_at = certifications_granted_at + INTERVAL '1 year'
WHERE certifications_granted_at IS NOT NULL
AND session_id IN (SELECT id FROM public.training_sessions WHERE organization_id = 'a0000000-0000-0000-0000-000000000001');

-- ============================================================================
-- PART 5: Update Subcontractor Insurance Dates
-- ============================================================================

UPDATE public.subcontractors
SET
  general_liability_exp = general_liability_exp + INTERVAL '1 year',
  workers_comp_exp = workers_comp_exp + INTERVAL '1 year',
  dbe_certification_exp = CASE
    WHEN dbe_certification_exp IS NOT NULL THEN dbe_certification_exp + INTERVAL '1 year'
    ELSE NULL
  END,
  wv_license_exp = CASE
    WHEN wv_license_exp IS NOT NULL THEN wv_license_exp + INTERVAL '1 year'
    ELSE NULL
  END,
  approved_at = approved_at + INTERVAL '1 year',
  -- Update cert numbers to reflect 2025/2026
  general_liability_policy_number = REPLACE(general_liability_policy_number, '2024', '2025'),
  workers_comp_policy_number = REPLACE(workers_comp_policy_number, '2024', '2025'),
  dbe_certification_number = CASE
    WHEN dbe_certification_number IS NOT NULL THEN REPLACE(dbe_certification_number, '2024', '2025')
    ELSE NULL
  END
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- PART 6: Update Subcontractor Worker Certification Dates
-- ============================================================================

UPDATE public.subcontractor_workers
SET
  osha_10_exp = CASE
    WHEN osha_10_exp IS NOT NULL THEN osha_10_exp + INTERVAL '1 year'
    ELSE NULL
  END,
  osha_30_exp = CASE
    WHEN osha_30_exp IS NOT NULL THEN osha_30_exp + INTERVAL '1 year'
    ELSE NULL
  END,
  first_aid_cpr_exp = CASE
    WHEN first_aid_cpr_exp IS NOT NULL THEN first_aid_cpr_exp + INTERVAL '1 year'
    ELSE NULL
  END,
  site_orientation_date = CASE
    WHEN site_orientation_date IS NOT NULL THEN site_orientation_date + INTERVAL '1 year'
    ELSE NULL
  END
WHERE subcontractor_id IN (
  SELECT id FROM public.subcontractors WHERE organization_id = 'a0000000-0000-0000-0000-000000000001'
);

-- ============================================================================
-- PART 7: Update Competent Person Designations
-- ============================================================================

UPDATE public.competent_person_designations
SET
  training_date = training_date + INTERVAL '1 year',
  expiration_date = expiration_date + INTERVAL '1 year',
  authorized_date = authorized_date + INTERVAL '1 year',
  certificate_number = REPLACE(certificate_number, '2024', '2025')
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- PART 8: Update Incidents
-- ============================================================================

UPDATE public.incidents
SET
  incident_date = incident_date + INTERVAL '1 year',
  incident_number = REPLACE(incident_number, '2024', '2025')
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- PART 9: Update Bid Projects
-- ============================================================================

UPDATE public.bid_projects
SET
  letting_date = letting_date + INTERVAL '1 year',
  prebid_meeting_date = prebid_meeting_date + INTERVAL '1 year',
  bid_due_date = bid_due_date + INTERVAL '1 year',
  completion_date = completion_date + INTERVAL '1 year',
  federal_project_number = REPLACE(federal_project_number, '2024', '2025'),
  federal_project_number = REPLACE(federal_project_number, '2025', '2026'),
  contract_id = REPLACE(contract_id, '2024', '2025'),
  contract_id = REPLACE(contract_id, '2025', '2026')
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- PART 10: Update Addenda
-- ============================================================================

UPDATE public.project_addenda
SET
  issued_date = issued_date + INTERVAL '1 year',
  received_date = received_date + INTERVAL '1 year',
  reviewed_at = CASE
    WHEN reviewed_at IS NOT NULL THEN reviewed_at + INTERVAL '1 year'
    ELSE NULL
  END
WHERE project_id IN (
  SELECT id FROM public.bid_projects WHERE organization_id = 'a0000000-0000-0000-0000-000000000001'
);

-- ============================================================================
-- PART 11: Update Equipment Service Dates
-- ============================================================================

UPDATE public.equipment
SET
  last_service_date = last_service_date + INTERVAL '1 year',
  next_service_date = next_service_date + INTERVAL '1 year'
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration updates all seed data dates to be current as of Q4 2025:
-- - 3 existing projects updated with Q4 2025 / 2026-2027 dates
-- - 5 new projects added with various statuses and realistic dates
-- - Employee certifications shifted forward 1 year
-- - Training sessions shifted forward 1 year
-- - Subcontractor insurance/certifications shifted forward 1 year
-- - Competent person designations shifted forward 1 year
-- - Incidents shifted forward 1 year
-- - Bid projects shifted forward 1 year
-- - Equipment service dates shifted forward 1 year
-- ============================================================================
