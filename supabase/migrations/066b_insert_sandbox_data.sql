-- =============================================================================
-- Migration 066b: Insert Sandbox Bid Projects & Equipment Data
-- =============================================================================
-- RUN THIS AFTER 066a_add_enum_values.sql has been committed
-- =============================================================================

-- ============================================================================
-- PART 0: Organization (required for foreign keys)
-- ============================================================================

-- Use unique sandbox slug to avoid conflicts with existing 'triton-construction' org
-- Cleanup: DELETE FROM organizations WHERE id = 'a0000000-0000-0000-0000-000000000001' CASCADE
INSERT INTO public.organizations (
  id, name, slug, legal_name, address_line1, city, state, zip_code, phone, email, wv_contractor_license, is_active
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Triton Construction (Demo)',
  'triton-demo',
  'Triton Construction, Inc.',
  '100 Construction Way',
  'St. Albans',
  'WV',
  '25177',
  '304-555-0100',
  'demo@tritonwv.com',
  'WV-CON-DEMO-001',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug;

-- ============================================================================
-- PART 0.5: Projects (required for equipment foreign keys)
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
  'Major highway construction - 4.2 miles of new 4-lane divided highway.',
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
  'Replace structurally deficient bridge over Ohio River.',
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
  1,
  true,
  8.5,
  true,
  'US-35 Bridge #47',
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
  'Widen I-64 from 4 to 6 lanes in Cabell County.',
  'HIGHWAY',
  'UNIT_PRICE',
  'MOBILIZATION',
  'DOH-2024-0789',
  '2024-11-01',
  '2026-12-31',
  '2026-12-31',
  22000000.00,
  22000000.00,
  280,
  280,
  15,
  true,
  'FA-2024-WV-0789',
  2,
  true,
  8.5,
  true,
  'I-64 MM 15-22',
  'Huntington',
  'WV',
  '25701',
  'Cabell',
  5.0
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 1: Bid Projects
-- ============================================================================

INSERT INTO public.bid_projects (
  id, organization_id,
  project_name, state_project_number, federal_project_number, contract_id,
  county, route, location_description, latitude, longitude,
  owner, owner_contact, owner_email, owner_phone,
  contract_time_days, completion_date, dbe_goal_percentage, is_federal_aid,
  letting_date, prebid_meeting_date, bid_due_date,
  status, engineers_estimate, bid_amount
) VALUES
-- Bid 1: Triplett Curve Improvement (ESTIMATING - primary bid)
(
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'US-19 Triplett Curve Safety Improvement',
  'S319-19-0.12',
  'FA-2025-WV-0234',
  'WVDOH-2025-0156',
  'Braxton',
  'US-19',
  'US-19 Mile Marker 42.3 to 43.1 near Sutton, WV',
  38.6623,
  -80.7095,
  'WVDOH',
  'James Morrison',
  'james.morrison@wv.gov',
  '304-558-3505',
  150,
  '2025-10-31',
  8.0,
  true,
  '2025-01-15',
  '2024-12-20T10:00:00Z',
  '2025-01-15T10:00:00Z',
  'ESTIMATING',
  4500000.00,
  4250000.00
),
-- Bid 2: Bridge Rehabilitation (REVIEWING)
(
  'c0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'Elk River Bridge #47 Rehabilitation',
  'B402-4-0.45',
  'FA-2025-WV-0267',
  'WVDOH-2025-0189',
  'Clay',
  'Route 4',
  'Route 4 over Elk River, Clay County',
  38.4601,
  -81.0834,
  'WVDOH',
  'Patricia Chen',
  'patricia.chen@wv.gov',
  '304-558-3510',
  100,
  '2025-09-30',
  7.5,
  true,
  '2025-01-22',
  '2025-01-08T14:00:00Z',
  '2025-01-22T14:00:00Z',
  'REVIEWING',
  2800000.00,
  NULL
),
-- Bid 3: Drainage Project (IDENTIFIED)
(
  'c0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'I-79 Drainage System Improvements',
  'I079-79-15.2',
  'FA-2025-WV-0289',
  'WVDOH-2025-0201',
  'Braxton',
  'I-79',
  'I-79 MM 61 to MM 67',
  38.8234,
  -80.5423,
  'WVDOH',
  'Michael Stevens',
  'michael.stevens@wv.gov',
  '304-558-3515',
  180,
  '2025-12-15',
  8.5,
  true,
  '2025-02-05',
  '2025-01-20T10:00:00Z',
  '2025-02-05T10:00:00Z',
  'IDENTIFIED',
  6200000.00,
  NULL
),
-- Bid 4: Recent Win (WON)
(
  'c0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'Route 33 Resurfacing - Elkins',
  'S319-33-2.45',
  'FA-2024-WV-0892',
  'WVDOH-2024-0892',
  'Randolph',
  'Route 33',
  'Route 33 from Elkins city limits to Leadsville',
  38.9256,
  -79.8467,
  'WVDOH',
  'Robert Williams',
  'robert.williams@wv.gov',
  '304-558-3520',
  90,
  '2025-08-31',
  6.0,
  true,
  '2024-11-15',
  '2024-11-01T10:00:00Z',
  '2024-11-15T10:00:00Z',
  'WON',
  1850000.00,
  1780000.00
),
-- Bid 5: Recent Loss (LOST)
(
  'c0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'Coal River Road Reconstruction',
  'S319-94-5.12',
  'FA-2024-WV-0845',
  'WVDOH-2024-0845',
  'Kanawha',
  'Route 94',
  'Coal River Road from St. Albans to Tornado',
  38.3912,
  -81.8234,
  'WVDOH',
  'Jennifer Adams',
  'jennifer.adams@wv.gov',
  '304-558-3525',
  200,
  '2026-02-28',
  8.5,
  true,
  '2024-10-22',
  '2024-10-08T14:00:00Z',
  '2024-10-22T14:00:00Z',
  'LOST',
  8500000.00,
  8950000.00
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 2: Equipment Table + Data
-- ============================================================================

-- Create equipment table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  equipment_number TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  equipment_type TEXT NOT NULL,
  equipment_category TEXT NOT NULL,
  make TEXT,
  model TEXT,
  year INTEGER,
  serial_number TEXT,
  vin TEXT,
  license_plate TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  current_project_id UUID REFERENCES public.projects(id),
  current_hours DECIMAL(10, 2),
  current_miles DECIMAL(10, 2),
  last_service_date DATE,
  next_service_date DATE,
  next_service_hours DECIMAL(10, 2),
  purchase_date DATE,
  purchase_price DECIMAL(12, 2),
  hourly_rate DECIMAL(8, 2),
  daily_rate DECIMAL(8, 2),
  monthly_rate DECIMAL(10, 2),
  insured BOOLEAN DEFAULT true,
  insurance_expiry DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, equipment_number)
);

-- Add missing columns if table already exists
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS equipment_category TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS last_service_date DATE;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS next_service_date DATE;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS next_service_hours DECIMAL(10, 2);
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(8, 2);
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS daily_rate DECIMAL(8, 2);
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS monthly_rate DECIMAL(10, 2);
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS current_hours DECIMAL(10, 2);
ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS current_miles DECIMAL(10, 2);

CREATE INDEX IF NOT EXISTS idx_equipment_org ON public.equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_project ON public.equipment(current_project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON public.equipment(equipment_type);

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipment_select" ON public.equipment;
CREATE POLICY "equipment_select" ON public.equipment FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "equipment_insert" ON public.equipment;
CREATE POLICY "equipment_insert" ON public.equipment FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

DROP POLICY IF EXISTS "equipment_update" ON public.equipment;
CREATE POLICY "equipment_update" ON public.equipment FOR UPDATE
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Insert equipment fleet
INSERT INTO public.equipment (
  id, organization_id, equipment_number, name, description, equipment_type, equipment_category,
  make, model, year, serial_number,
  status, current_project_id, current_hours, current_miles,
  last_service_date, next_service_date, next_service_hours,
  hourly_rate, daily_rate, monthly_rate, notes
) VALUES
-- Excavators
('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
 'EX-001', 'CAT 336F Excavator', 'Primary excavator for Corridor H. GPS grade control equipped.', 'EXCAVATOR', 'HEAVY_EQUIPMENT',
 'Caterpillar', '336F L', 2021, 'CAT0336FXDG12345',
 'IN_USE', 'b0000000-0000-0000-0000-000000000001', 4250.5, NULL,
 '2024-11-15', '2025-01-15', 4500.0,
 185.00, 1400.00, 28000.00, 'GPS grade control equipped.'),
('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
 'EX-002', 'CAT 320 Excavator', 'Secondary excavator for bridge project.', 'EXCAVATOR', 'HEAVY_EQUIPMENT',
 'Caterpillar', '320 GC', 2022, 'CAT0320GCJK78901',
 'IN_USE', 'b0000000-0000-0000-0000-000000000002', 2890.0, NULL,
 '2024-10-20', '2025-01-20', 3000.0,
 145.00, 1100.00, 22000.00, 'Assigned to Bridge #47 project.'),
('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
 'EX-003', 'Komatsu PC210LC Excavator', 'Mid-size excavator for utility work.', 'EXCAVATOR', 'HEAVY_EQUIPMENT',
 'Komatsu', 'PC210LC-11', 2019, 'KMTPC210LCKL56789',
 'MAINTENANCE', NULL, 6120.0, NULL,
 '2024-12-01', '2024-12-20', 6250.0,
 135.00, 1000.00, 20000.00, 'In shop for hydraulic cylinder rebuild.'),
-- Dozers
('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
 'DZ-001', 'CAT D6T XW Dozer', 'Primary grading machine with GPS.', 'DOZER', 'HEAVY_EQUIPMENT',
 'Caterpillar', 'D6T XW', 2020, 'CAT0D6TXWMN34567',
 'IN_USE', 'b0000000-0000-0000-0000-000000000001', 3820.0, NULL,
 '2024-11-01', '2025-02-01', 4000.0,
 195.00, 1500.00, 30000.00, 'GPS equipped. Primary grading machine for Corridor H.'),
('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
 'DZ-002', 'John Deere 850L Dozer', 'Secondary dozer, available.', 'DOZER', 'HEAVY_EQUIPMENT',
 'John Deere', '850L', 2021, 'JD0850LXCPQ23456',
 'AVAILABLE', NULL, 2450.0, NULL,
 '2024-12-05', '2025-03-05', 2750.0,
 175.00, 1350.00, 27000.00, 'Available for assignment. Good condition.'),
-- Loaders
('e0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
 'WL-001', 'CAT 950M Wheel Loader', 'Aggregate loading with quick coupler.', 'LOADER', 'HEAVY_EQUIPMENT',
 'Caterpillar', '950M', 2022, 'CAT0950MXRS45678',
 'IN_USE', 'b0000000-0000-0000-0000-000000000001', 3150.0, NULL,
 '2024-10-15', '2025-01-15', 3500.0,
 155.00, 1200.00, 24000.00, 'Loading aggregate at Corridor H. Quick coupler equipped.'),
('e0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
 'WL-002', 'Volvo L90H Wheel Loader', 'General purpose loader.', 'LOADER', 'HEAVY_EQUIPMENT',
 'Volvo', 'L90H', 2020, 'VOL0L90HXTU67890',
 'AVAILABLE', NULL, 4580.0, NULL,
 '2024-11-20', '2025-02-20', 5000.0,
 145.00, 1100.00, 22000.00, 'Snow plow attachment available.'),
-- Trucks
('e0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
 'HT-001', 'Kenworth T880 Dump Truck', 'Tri-axle haul truck.', 'DUMP_TRUCK', 'HEAVY_EQUIPMENT',
 'Kenworth', 'T880', 2021, '1XKYD49X4LJ123456',
 'IN_USE', 'b0000000-0000-0000-0000-000000000001', NULL, 125000.0,
 '2024-11-10', '2025-02-10', NULL,
 95.00, 750.00, 15000.00, 'Tri-axle. Primary haul truck for Corridor H earthwork.'),
('e0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
 'HT-002', 'Kenworth T880 Dump Truck', 'Tri-axle haul truck.', 'DUMP_TRUCK', 'HEAVY_EQUIPMENT',
 'Kenworth', 'T880', 2021, '1XKYD49X4LJ123457',
 'IN_USE', 'b0000000-0000-0000-0000-000000000001', NULL, 118500.0,
 '2024-10-25', '2025-01-25', NULL,
 95.00, 750.00, 15000.00, 'Tri-axle. Corridor H earthwork.'),
('e0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
 'HT-003', 'Mack Granite Dump Truck', 'Tandem axle dump truck.', 'DUMP_TRUCK', 'HEAVY_EQUIPMENT',
 'Mack', 'Granite 64FR', 2019, '1M2AX09C5KM012345',
 'AVAILABLE', NULL, NULL, 156000.0,
 '2024-12-01', '2025-03-01', NULL,
 85.00, 650.00, 13000.00, 'Tandem axle. Available for short-term projects.'),
-- Rollers
('e0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001',
 'RL-001', 'CAT CB54B Tandem Roller', 'Primary paving roller.', 'ROLLER', 'HEAVY_EQUIPMENT',
 'Caterpillar', 'CB54B', 2022, 'CAT0CB54BXUV12345',
 'IN_USE', 'b0000000-0000-0000-0000-000000000001', 1850.0, NULL,
 '2024-11-05', '2025-02-05', 2000.0,
 125.00, 950.00, 19000.00, 'Primary paving roller. Water system recently serviced.'),
('e0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001',
 'RL-002', 'CAT CS56B Vibratory Compactor', 'Soil compaction roller.', 'ROLLER', 'HEAVY_EQUIPMENT',
 'Caterpillar', 'CS56B', 2021, 'CAT0CS56BXWX23456',
 'AVAILABLE', NULL, 2340.0, NULL,
 '2024-10-30', '2025-01-30', 2500.0,
 115.00, 875.00, 17500.00, 'Soil compaction. Padfoot shell available.'),
-- Support Vehicles
('e0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001',
 'PU-001', 'Ford F-250 Pickup', 'Superintendent vehicle.', 'PICKUP', 'TRUCKS',
 'Ford', 'F-250 XLT', 2023, '1FT7W2B66PEA12345',
 'IN_USE', 'b0000000-0000-0000-0000-000000000001', NULL, 28500.0,
 '2024-10-15', '2025-04-15', NULL,
 45.00, 150.00, 2800.00, 'Superintendent vehicle - Mike Reynolds.'),
('e0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001',
 'PU-002', 'Ford F-350 Service Truck', 'Field service with welder.', 'SERVICE_TRUCK', 'TRUCKS',
 'Ford', 'F-350 XL', 2022, '1FD8W3H66NEA67890',
 'IN_USE', NULL, NULL, 45200.0,
 '2024-11-20', '2025-05-20', NULL,
 55.00, 200.00, 3500.00, 'Field service truck. Welder and compressor equipped.'),
('e0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001',
 'PU-003', 'Chevrolet Silverado 2500', 'Superintendent vehicle.', 'PICKUP', 'TRUCKS',
 'Chevrolet', 'Silverado 2500 HD', 2023, '1GC4YLE70PF345678',
 'IN_USE', 'b0000000-0000-0000-0000-000000000002', NULL, 18900.0,
 '2024-09-30', '2025-03-30', NULL,
 45.00, 150.00, 2800.00, 'Superintendent vehicle - Tom Bradley.'),
-- Small Equipment
('e0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000001',
 'SK-001', 'Bobcat S650 Skid Steer', 'Skid steer with attachments.', 'SKID_STEER', 'SUPPORT_EQUIPMENT',
 'Bobcat', 'S650', 2022, 'BOB0S650XYZ98765',
 'IN_USE', 'b0000000-0000-0000-0000-000000000001', 1650.0, NULL,
 '2024-11-15', '2025-02-15', 1750.0,
 75.00, 350.00, 6500.00, 'Multiple attachments available: bucket, forks, auger.'),
('e0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000001',
 'MB-001', 'CAT 420F2 Backhoe', 'Backhoe for utility work.', 'BACKHOE', 'SUPPORT_EQUIPMENT',
 'Caterpillar', '420F2', 2021, 'CAT0420F2ABC34567',
 'IN_USE', 'b0000000-0000-0000-0000-000000000002', 2890.0, NULL,
 '2024-10-20', '2025-01-20', 3000.0,
 95.00, 550.00, 10000.00, 'Bridge project utility work.'),
('e0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000001',
 'GN-001', 'Wacker Neuson GP2500A Generator', 'Portable 2500W generator.', 'GENERATOR', 'SMALL_TOOLS',
 'Wacker Neuson', 'GP2500A', 2023, 'WN0GP2500ADEF12345',
 'AVAILABLE', NULL, 450.0, NULL,
 '2024-12-01', '2025-06-01', 500.0,
 15.00, 75.00, 1200.00, '2500W portable generator. Good for small tools.')
ON CONFLICT (organization_id, equipment_number) DO NOTHING;

-- Create update trigger
DROP TRIGGER IF EXISTS equipment_updated_at ON public.equipment;
CREATE TRIGGER equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- Summary
-- ============================================================================
SELECT 'Migration 066b completed successfully' as status;
SELECT COUNT(*) as bid_projects_count FROM public.bid_projects WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
SELECT COUNT(*) as equipment_count FROM public.equipment WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
