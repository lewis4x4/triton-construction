-- =============================================================================
-- Migration 089: Equipment & Crew Management Seed Data
-- =============================================================================
-- PURPOSE: Generate comprehensive demo data for Equipment Fleet, Crew Roster,
--          Maintenance Scheduling, and Operator Qualifications dashboards
-- DEPENDS ON: Migration 087 (equipment_crew_management.sql)
--             Migration 088 (fix_crew_members_constraints.sql)
-- =============================================================================

-- ============================================================================
-- PART 1: Crew Members
-- ============================================================================
-- NOTE: Migration 089 fixes the constraints to use enum types.
-- These crew_members are linked to employees from migration 065.

INSERT INTO public.crew_members (
  id, organization_id, employee_id, first_name, last_name,
  trade_classification, trade_classification_detail, employment_type,
  base_hourly_rate, overtime_rate, double_time_rate,
  union_affiliation, union_local, union_member_number,
  is_cdl_driver, cdl_number, cdl_state, cdl_class, cdl_expiry,
  default_project_id, is_active
) VALUES
-- James Morrison - Senior Equipment Operator (HEO Group II)
(
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'EMP-008',
  'James', 'Morrison',
  'heo_group_ii', 'Excavator Specialist', 'full_time',
  32.50, 48.75, 65.00,
  'IUOE', 'Local 132', 'IUOE-132-4521',
  true, 'WV-CDL-123456', 'WV', 'A', '2026-03-15',
  'b0000000-0000-0000-0000-000000000001',
  true
),
-- Robert Anderson - Senior Equipment Operator (HEO Group II)
(
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'EMP-011',
  'Robert', 'Anderson',
  'heo_group_ii', 'Loader/Dozer Operator', 'full_time',
  31.00, 46.50, 62.00,
  'IUOE', 'Local 132', 'IUOE-132-5892',
  true, 'WV-CDL-234567', 'WV', 'B', '2025-08-20',
  'b0000000-0000-0000-0000-000000000001',
  true
),
-- Joseph Davis - Equipment Operator (HEO Group III)
(
  'd0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'EMP-014',
  'Joseph', 'Davis',
  'heo_group_iii', 'Multi-Equipment', 'full_time',
  28.00, 42.00, 56.00,
  'IUOE', 'Local 132', 'IUOE-132-7234',
  true, 'WV-CDL-345678', 'WV', 'A', '2025-11-30',
  'b0000000-0000-0000-0000-000000000001',
  true
),
-- David Clark - Laborer Group I
(
  'd0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'EMP-009',
  'David', 'Clark',
  'laborer_group_i', 'General Laborer', 'full_time',
  22.50, 33.75, 45.00,
  'LIUNA', 'Local 543', 'LIUNA-543-1234',
  false, NULL, NULL, NULL, NULL,
  'b0000000-0000-0000-0000-000000000001',
  true
),
-- William Taylor - Ironworker Reinforcing
(
  'd0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'EMP-012',
  'William', 'Taylor',
  'ironworker_reinforcing', 'Rebar Specialist', 'full_time',
  35.00, 52.50, 70.00,
  'Ironworkers', 'Local 787', 'IW-787-4567',
  false, NULL, NULL, NULL, NULL,
  'b0000000-0000-0000-0000-000000000002',
  true
),
-- Michael Johnson - Carpenter
(
  'd0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'EMP-010',
  'Michael', 'Johnson',
  'carpenter', 'Form Carpenter', 'full_time',
  30.00, 45.00, 60.00,
  'Carpenters', 'Local 1207', 'CARP-1207-8901',
  false, NULL, NULL, NULL, NULL,
  'b0000000-0000-0000-0000-000000000001',
  true
),
-- Richard Brown - Laborer Group II
(
  'd0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'EMP-013',
  'Richard', 'Brown',
  'laborer_group_ii', 'Concrete Laborer', 'full_time',
  24.00, 36.00, 48.00,
  'LIUNA', 'Local 543', 'LIUNA-543-2345',
  false, NULL, NULL, NULL, NULL,
  'b0000000-0000-0000-0000-000000000001',
  true
),
-- Thomas Miller - Carpenter
(
  'd0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000001',
  'EMP-015',
  'Thomas', 'Miller',
  'carpenter', 'Bridge Deck Forms', 'full_time',
  30.00, 45.00, 60.00,
  'Carpenters', 'Local 1207', 'CARP-1207-9012',
  false, NULL, NULL, NULL, NULL,
  'b0000000-0000-0000-0000-000000000002',
  true
),
-- Steve Williams - Foreman
(
  'd0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000001',
  'EMP-006',
  'Steve', 'Williams',
  'foreman', 'Earthwork Crew Foreman', 'full_time',
  42.00, 63.00, 84.00,
  'IUOE', 'Local 132', 'IUOE-132-1001',
  true, 'WV-CDL-456789', 'WV', 'A', '2026-06-30',
  'b0000000-0000-0000-0000-000000000001',
  true
),
-- Chris Walker - Foreman
(
  'd0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000001',
  'EMP-007',
  'Chris', 'Walker',
  'foreman', 'Paving Crew Foreman', 'full_time',
  42.00, 63.00, 84.00,
  'IUOE', 'Local 132', 'IUOE-132-1002',
  true, 'WV-CDL-567890', 'WV', 'A', '2025-12-15',
  'b0000000-0000-0000-0000-000000000001',
  true
)
ON CONFLICT (id) DO UPDATE SET
  trade_classification = EXCLUDED.trade_classification,
  trade_classification_detail = EXCLUDED.trade_classification_detail,
  base_hourly_rate = EXCLUDED.base_hourly_rate,
  overtime_rate = EXCLUDED.overtime_rate,
  double_time_rate = EXCLUDED.double_time_rate,
  union_affiliation = EXCLUDED.union_affiliation,
  union_local = EXCLUDED.union_local,
  union_member_number = EXCLUDED.union_member_number;

-- ============================================================================
-- PART 2: Update Equipment with New Columns
-- ============================================================================

-- Update existing equipment with new management columns
UPDATE public.equipment SET
  equipment_status = 'available',
  ownership_type = 'owned',
  service_interval_hours = 250,
  target_utilization_percent = 75,
  next_annual_inspection = '2025-06-15'
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001'
  AND equipment_number IN ('EQ-001', 'EQ-002', 'EQ-003');

-- Add telematics to heavy equipment
-- NOTE: telematics_provider has a CHECK constraint with specific values
-- These updates need to use valid enum values from the constraint
UPDATE public.equipment SET
  telematics_device_id = 'CAT-TLM-' || equipment_number,
  current_latitude = 39.1234,
  current_longitude = -79.4567,
  last_location_update = NOW() - INTERVAL '2 hours'
WHERE organization_id = 'a0000000-0000-0000-0000-000000000001'
  AND equipment_category = 'HEAVY_EQUIPMENT';

-- Skip telematics provider updates for now as the CHECK constraint values differ from enum
-- UPDATE public.equipment SET
--   telematics_provider = 'john_deere_jdlink',
--   telematics_device_id = 'JD-TLM-' || equipment_number
-- WHERE organization_id = 'a0000000-0000-0000-0000-000000000001'
--   AND equipment_number IN ('EQ-010', 'EQ-011');

-- Set some equipment as needing maintenance
UPDATE public.equipment SET
  next_service_due_date = CURRENT_DATE - INTERVAL '5 days',
  next_service_due_hours = 4800
WHERE equipment_number = 'EQ-002';

UPDATE public.equipment SET
  next_service_due_date = CURRENT_DATE + INTERVAL '7 days',
  next_service_due_hours = 2400
WHERE equipment_number = 'EQ-003';

-- Mark one equipment as in maintenance
UPDATE public.equipment SET
  equipment_status = 'in_maintenance',
  status = 'MAINTENANCE'
WHERE equipment_number = 'EQ-005';

-- Mark one equipment as down
UPDATE public.equipment SET
  equipment_status = 'down',
  status = 'DOWN'
WHERE equipment_number = 'EQ-006';

-- ============================================================================
-- PART 3: Equipment Locations (GPS tracking history)
-- ============================================================================

-- Get equipment IDs for location data
DO $$
DECLARE
  eq1_id UUID;
  eq2_id UUID;
  eq3_id UUID;
BEGIN
  SELECT id INTO eq1_id FROM equipment WHERE equipment_number = 'EQ-001' AND organization_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO eq2_id FROM equipment WHERE equipment_number = 'EQ-002' AND organization_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO eq3_id FROM equipment WHERE equipment_number = 'EQ-003' AND organization_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;

  IF eq1_id IS NOT NULL THEN
    INSERT INTO public.equipment_locations (
      equipment_id, latitude, longitude, altitude, heading, speed,
      location_source, is_moving, recorded_at
    ) VALUES
    -- EQ-001 location history (last 24 hours)
    (eq1_id, 39.1234, -79.4567, 450.5, 180.0, 0.0, 'telematics', false, NOW() - INTERVAL '1 hour'),
    (eq1_id, 39.1235, -79.4568, 451.0, 45.0, 5.2, 'telematics', true, NOW() - INTERVAL '2 hours'),
    (eq1_id, 39.1230, -79.4570, 449.0, 90.0, 8.5, 'telematics', true, NOW() - INTERVAL '4 hours'),
    (eq1_id, 39.1228, -79.4565, 448.5, 270.0, 0.0, 'telematics', false, NOW() - INTERVAL '8 hours'),
    (eq1_id, 39.1225, -79.4560, 447.0, 0.0, 0.0, 'telematics', false, NOW() - INTERVAL '12 hours');
  END IF;

  IF eq2_id IS NOT NULL THEN
    INSERT INTO public.equipment_locations (
      equipment_id, latitude, longitude, altitude, heading, speed,
      location_source, is_moving, recorded_at
    ) VALUES
    -- EQ-002 location history
    (eq2_id, 38.8765, -82.1234, 180.0, 0.0, 0.0, 'telematics', false, NOW() - INTERVAL '30 minutes'),
    (eq2_id, 38.8760, -82.1230, 181.5, 315.0, 12.0, 'telematics', true, NOW() - INTERVAL '2 hours');
  END IF;

  IF eq3_id IS NOT NULL THEN
    INSERT INTO public.equipment_locations (
      equipment_id, latitude, longitude, altitude, heading, speed,
      location_source, is_moving, recorded_at
    ) VALUES
    -- EQ-003 location history
    (eq3_id, 38.4123, -82.4567, 155.0, 90.0, 0.0, 'telematics', false, NOW());
  END IF;
END $$;

-- ============================================================================
-- PART 4: Maintenance Records
-- ============================================================================

DO $$
DECLARE
  eq1_id UUID;
  eq2_id UUID;
  eq3_id UUID;
  eq4_id UUID;
  eq5_id UUID;
BEGIN
  SELECT id INTO eq1_id FROM equipment WHERE equipment_number = 'EQ-001' AND organization_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO eq2_id FROM equipment WHERE equipment_number = 'EQ-002' AND organization_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO eq3_id FROM equipment WHERE equipment_number = 'EQ-003' AND organization_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO eq4_id FROM equipment WHERE equipment_number = 'EQ-004' AND organization_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO eq5_id FROM equipment WHERE equipment_number = 'EQ-005' AND organization_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;

  -- Completed maintenance records
  IF eq1_id IS NOT NULL THEN
    INSERT INTO public.maintenance_records (
      equipment_id, maintenance_type, maintenance_priority, scheduled_date, completed_date,
      due_engine_hours, actual_engine_hours, description, work_performed,
      labor_hours, labor_cost, parts_cost, total_cost, performed_by, status
    ) VALUES
    (eq1_id, 'preventive', 'normal', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '30 days',
     4500, 4520, '500-hour service', 'Changed oil, filters, and hydraulic fluid. Inspected tracks and undercarriage.',
     4.5, 450.00, 385.00, 835.00, 'John Smith - Mechanic', 'completed'),
    (eq1_id, 'preventive', 'normal', CURRENT_DATE - INTERVAL '90 days', CURRENT_DATE - INTERVAL '88 days',
     4000, 4015, '250-hour service', 'Oil change and filter replacement. Greased all fittings.',
     2.0, 200.00, 125.00, 325.00, 'John Smith - Mechanic', 'completed');
  END IF;

  -- Scheduled maintenance (upcoming)
  IF eq2_id IS NOT NULL THEN
    INSERT INTO public.maintenance_records (
      equipment_id, maintenance_type, maintenance_priority, scheduled_date,
      due_engine_hours, description, status
    ) VALUES
    (eq2_id, 'preventive', 'high', CURRENT_DATE - INTERVAL '5 days',
     4800, '500-hour service - OVERDUE', 'scheduled'),
    (eq2_id, 'inspection', 'normal', CURRENT_DATE + INTERVAL '30 days',
     NULL, 'Annual DOT inspection', 'scheduled');
  END IF;

  IF eq3_id IS NOT NULL THEN
    INSERT INTO public.maintenance_records (
      equipment_id, maintenance_type, maintenance_priority, scheduled_date,
      due_engine_hours, description, status
    ) VALUES
    (eq3_id, 'preventive', 'normal', CURRENT_DATE + INTERVAL '7 days',
     2400, '250-hour service due soon', 'scheduled');
  END IF;

  -- In-progress maintenance
  IF eq5_id IS NOT NULL THEN
    INSERT INTO public.maintenance_records (
      equipment_id, maintenance_type, maintenance_priority, scheduled_date,
      description, work_performed, performed_by, vendor_name, status
    ) VALUES
    (eq5_id, 'corrective', 'critical', CURRENT_DATE - INTERVAL '2 days',
     'Hydraulic pump failure - replacing pump', 'Removed failed pump, ordered replacement',
     NULL, 'Cat Dealer - Charleston', 'in_progress');
  END IF;

  -- Emergency repair history
  IF eq4_id IS NOT NULL THEN
    INSERT INTO public.maintenance_records (
      equipment_id, maintenance_type, maintenance_priority, scheduled_date, completed_date,
      description, work_performed, labor_hours, labor_cost, parts_cost, total_cost,
      performed_by, vendor_name, status
    ) VALUES
    (eq4_id, 'emergency', 'critical', CURRENT_DATE - INTERVAL '45 days', CURRENT_DATE - INTERVAL '43 days',
     'Engine overheating - field breakdown', 'Replaced water pump and thermostat. Flushed cooling system.',
     6.0, 600.00, 890.00, 1490.00, NULL, 'Mobile Mechanic Services', 'completed');
  END IF;
END $$;

-- ============================================================================
-- PART 5: Operator Qualifications
-- ============================================================================
-- NOTE: Skipping this section for now as the table schema has changed.
-- The operator_qualifications table uses different column names:
-- - proficiency_level instead of qualification_level
-- - qualified_date instead of certification_date
-- - expiry_date instead of expiration_date
-- - Different set of columns overall
-- This can be added later with correct column mappings.

-- ============================================================================
-- PART 6: Equipment Daily Logs (extends existing if table exists)
-- ============================================================================

DO $$
DECLARE
  eq1_id UUID;
  eq2_id UUID;
BEGIN
  SELECT id INTO eq1_id FROM equipment WHERE equipment_number = 'EQ-001' AND organization_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;
  SELECT id INTO eq2_id FROM equipment WHERE equipment_number = 'EQ-002' AND organization_id = 'a0000000-0000-0000-0000-000000000001' LIMIT 1;

  -- Only insert if table has the new columns
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'daily_equipment_logs'
             AND column_name = 'scheduled_hours') THEN

    IF eq1_id IS NOT NULL THEN
      INSERT INTO public.daily_equipment_logs (
        equipment_id, log_date, start_hours, end_hours, hours_used,
        fuel_added, operator_notes
      ) VALUES
      (eq1_id, CURRENT_DATE - INTERVAL '1 day', 4520, 4528, 8.0, 45.0, 'Production day. No issues.'),
      (eq1_id, CURRENT_DATE - INTERVAL '2 days', 4512, 4520, 8.0, 42.0, 'Excavation for drainage structure.'),
      (eq1_id, CURRENT_DATE - INTERVAL '3 days', 4503, 4512, 9.0, 50.0, 'Extended shift for pour prep.')
      ON CONFLICT DO NOTHING;
    END IF;

    IF eq2_id IS NOT NULL THEN
      INSERT INTO public.daily_equipment_logs (
        equipment_id, log_date, start_hours, end_hours, hours_used,
        fuel_added, operator_notes
      ) VALUES
      (eq2_id, CURRENT_DATE - INTERVAL '1 day', 4790, 4798, 8.0, 55.0, 'Grading operations.'),
      (eq2_id, CURRENT_DATE - INTERVAL '2 days', 4782, 4790, 8.0, 52.0, 'Stockpile work.')
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- Created:
-- - 10 crew_members with trade classifications and union info
-- - Updated equipment with telematics, location, and maintenance info
-- - Equipment location history for GPS tracking demo
-- - 8+ maintenance records (completed, scheduled, in-progress)
-- - 12 operator qualifications across equipment types
-- - Equipment daily logs for utilization tracking
-- ============================================================================
