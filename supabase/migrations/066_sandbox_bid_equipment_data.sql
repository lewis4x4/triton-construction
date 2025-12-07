-- =============================================================================
-- Migration 066: Sandbox Bid Packages & Equipment Demo Data
-- =============================================================================
-- PURPOSE: Add bid opportunities and equipment fleet for demo purposes
-- CLEANUP: Delete with other sandbox data before production deployment
-- =============================================================================

-- ============================================================================
-- PART 1: Bid Projects (Active Bid Opportunities)
-- ============================================================================

-- Use the same organization ID from 065
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
-- PART 2: Bid Items for Triplett Project (Primary Bid)
-- ============================================================================

INSERT INTO public.bid_items (
  id, project_id, item_number, spec_reference, description,
  unit, original_quantity, current_quantity,
  unit_price, extended_price,
  material_cost, labor_cost, equipment_cost, subcontract_cost,
  overhead_percentage, profit_percentage,
  is_dbe_candidate, risk_level, category, sort_order
) VALUES
-- Earthwork items
(
  'd0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  '203.01', '203.01.01',
  'Unclassified Excavation',
  'CY', 45000.00, 45000.00,
  12.50, 562500.00,
  4.50, 3.50, 3.00, NULL,
  8.0, 6.0,
  false, 'MEDIUM', 'Earthwork', 1
),
(
  'd0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  '203.02', '203.02.01',
  'Rock Excavation',
  'CY', 8500.00, 8500.00,
  35.00, 297500.00,
  NULL, 8.50, 18.00, NULL,
  8.0, 6.0,
  false, 'HIGH', 'Earthwork', 2
),
(
  'd0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001',
  '207.01', '207.01.01',
  'Embankment-In-Place',
  'CY', 38000.00, 38000.00,
  8.75, 332500.00,
  3.25, 2.50, 2.00, NULL,
  8.0, 6.0,
  false, 'LOW', 'Earthwork', 3
),

-- Drainage items
(
  'd0000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000001',
  '601.10', '601.10.01',
  '24" RCP Storm Sewer',
  'LF', 850.00, 850.00,
  85.00, 72250.00,
  42.00, 18.00, 12.00, NULL,
  8.0, 6.0,
  true, 'LOW', 'Drainage', 4
),
(
  'd0000000-0000-0000-0000-000000000005',
  'c0000000-0000-0000-0000-000000000001',
  '601.20', '601.20.01',
  '36" RCP Storm Sewer',
  'LF', 450.00, 450.00,
  125.00, 56250.00,
  68.00, 25.00, 16.00, NULL,
  8.0, 6.0,
  true, 'LOW', 'Drainage', 5
),
(
  'd0000000-0000-0000-0000-000000000006',
  'c0000000-0000-0000-0000-000000000001',
  '602.01', '602.01.01',
  'Type C Drop Inlet',
  'EA', 12.00, 12.00,
  3500.00, 42000.00,
  1800.00, 850.00, 400.00, NULL,
  8.0, 6.0,
  false, 'LOW', 'Drainage', 6
),

-- Base and Subbase
(
  'd0000000-0000-0000-0000-000000000007',
  'c0000000-0000-0000-0000-000000000001',
  '304.01', '304.01.01',
  'Aggregate Base Course',
  'TON', 15000.00, 15000.00,
  28.50, 427500.00,
  18.00, 4.50, 4.00, NULL,
  8.0, 6.0,
  false, 'LOW', 'Base', 7
),

-- Paving items
(
  'd0000000-0000-0000-0000-000000000008',
  'c0000000-0000-0000-0000-000000000001',
  '401.02', '401.02.01',
  'Superpave Base Course, 19mm',
  'TON', 12500.00, 12500.00,
  78.00, 975000.00,
  52.00, 8.00, 10.00, NULL,
  8.0, 6.0,
  false, 'LOW', 'Paving', 8
),
(
  'd0000000-0000-0000-0000-000000000009',
  'c0000000-0000-0000-0000-000000000001',
  '401.04', '401.04.01',
  'Superpave Wearing Course, 9.5mm',
  'TON', 8500.00, 8500.00,
  85.00, 722500.00,
  58.00, 9.00, 10.00, NULL,
  8.0, 6.0,
  false, 'LOW', 'Paving', 9
),

-- Guardrail (DBE candidate)
(
  'd0000000-0000-0000-0000-000000000010',
  'c0000000-0000-0000-0000-000000000001',
  '606.01', '606.01.01',
  'Steel Beam Guardrail',
  'LF', 2400.00, 2400.00,
  32.00, 76800.00,
  NULL, NULL, NULL, 28.00,
  8.0, 6.0,
  true, 'LOW', 'Safety', 10
),
(
  'd0000000-0000-0000-0000-000000000011',
  'c0000000-0000-0000-0000-000000000001',
  '606.05', '606.05.01',
  'Guardrail Terminal Section',
  'EA', 24.00, 24.00,
  2800.00, 67200.00,
  NULL, NULL, NULL, 2450.00,
  8.0, 6.0,
  true, 'LOW', 'Safety', 11
),

-- Pavement Markings (DBE candidate)
(
  'd0000000-0000-0000-0000-000000000012',
  'c0000000-0000-0000-0000-000000000001',
  '636.01', '636.01.01',
  'Thermoplastic Pavement Markings, 4"',
  'LF', 18500.00, 18500.00,
  1.25, 23125.00,
  NULL, NULL, NULL, 1.10,
  8.0, 6.0,
  true, 'LOW', 'Markings', 12
),

-- Mobilization
(
  'd0000000-0000-0000-0000-000000000013',
  'c0000000-0000-0000-0000-000000000001',
  '109.01', '109.01.01',
  'Mobilization',
  'LS', 1.00, 1.00,
  185000.00, 185000.00,
  25000.00, 45000.00, 85000.00, 15000.00,
  8.0, 6.0,
  false, 'LOW', 'General', 13
),

-- Traffic Control
(
  'd0000000-0000-0000-0000-000000000014',
  'c0000000-0000-0000-0000-000000000001',
  '701.01', '701.01.01',
  'Traffic Control',
  'LS', 1.00, 1.00,
  125000.00, 125000.00,
  NULL, NULL, NULL, 110000.00,
  8.0, 6.0,
  true, 'MEDIUM', 'Traffic', 14
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 3: Addenda for Triplett Project
-- ============================================================================

INSERT INTO public.project_addenda (
  id, project_id, addendum_number, issued_date, received_date,
  title, summary, total_quantity_impact, total_price_impact,
  reviewed, reviewed_at
) VALUES
(
  'e0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  1,
  '2024-12-10',
  '2024-12-10',
  'Quantity Revisions - Earthwork',
  'Revised earthwork quantities based on updated survey. Unclassified excavation reduced by 2,500 CY, embankment increased by 1,800 CY.',
  -700.00,
  -15750.00,
  true,
  '2024-12-11T09:30:00Z'
),
(
  'e0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  2,
  '2024-12-18',
  '2024-12-18',
  'Drainage Clarification',
  'Added detail for inlet connections. No quantity changes. Spec clarification for pipe bedding material.',
  0.00,
  0.00,
  true,
  '2024-12-18T14:15:00Z'
),
(
  'e0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001',
  3,
  '2025-01-02',
  '2025-01-02',
  'Guardrail Extension',
  'Extended guardrail limits by 200 LF on south approach based on safety review.',
  200.00,
  6400.00,
  false,
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 4: Equipment Fleet
-- ============================================================================

-- First, create the equipment table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Identification
  equipment_number TEXT NOT NULL,
  description TEXT NOT NULL,
  equipment_type TEXT NOT NULL,
  category TEXT NOT NULL, -- 'HEAVY', 'SUPPORT', 'VEHICLE', 'SMALL'

  -- Details
  make TEXT,
  model TEXT,
  year INTEGER,
  serial_number TEXT,
  vin TEXT,
  license_plate TEXT,

  -- Operational
  status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE'
  current_project_id UUID REFERENCES public.projects(id),
  current_hours DECIMAL(10, 2),
  current_miles DECIMAL(10, 2),

  -- Maintenance
  last_service_date DATE,
  next_service_date DATE,
  next_service_hours DECIMAL(10, 2),

  -- Financial
  purchase_date DATE,
  purchase_price DECIMAL(12, 2),
  hourly_rate DECIMAL(8, 2),
  daily_rate DECIMAL(8, 2),
  monthly_rate DECIMAL(10, 2),

  -- Insurance
  insured BOOLEAN DEFAULT true,
  insurance_expiry DATE,

  -- Notes
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, equipment_number)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_equipment_org ON public.equipment(organization_id);
CREATE INDEX IF NOT EXISTS idx_equipment_status ON public.equipment(status);
CREATE INDEX IF NOT EXISTS idx_equipment_project ON public.equipment(current_project_id);
CREATE INDEX IF NOT EXISTS idx_equipment_type ON public.equipment(equipment_type);

-- Enable RLS
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- RLS Policies
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
  id, organization_id, equipment_number, description, equipment_type, category,
  make, model, year, serial_number,
  status, current_project_id, current_hours, current_miles,
  last_service_date, next_service_date, next_service_hours,
  hourly_rate, daily_rate, monthly_rate,
  notes
) VALUES
-- Excavators
(
  'g0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'EX-001', 'CAT 336F Excavator', 'EXCAVATOR', 'HEAVY',
  'Caterpillar', '336F L', 2021, 'CAT0336FXDG12345',
  'IN_USE', 'b0000000-0000-0000-0000-000000000001', 4250.5, NULL,
  '2024-11-15', '2025-01-15', 4500.0,
  185.00, 1400.00, 28000.00,
  'Primary excavator for Corridor H. GPS grade control equipped.'
),
(
  'g0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'EX-002', 'CAT 320 Excavator', 'EXCAVATOR', 'HEAVY',
  'Caterpillar', '320 GC', 2022, 'CAT0320GCJK78901',
  'IN_USE', 'b0000000-0000-0000-0000-000000000002', 2890.0, NULL,
  '2024-10-20', '2025-01-20', 3000.0,
  145.00, 1100.00, 22000.00,
  'Secondary excavator. Assigned to Bridge #47 project.'
),
(
  'g0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'EX-003', 'Komatsu PC210LC Excavator', 'EXCAVATOR', 'HEAVY',
  'Komatsu', 'PC210LC-11', 2019, 'KMTPC210LCKL56789',
  'MAINTENANCE', NULL, 6120.0, NULL,
  '2024-12-01', '2024-12-20', 6250.0,
  135.00, 1000.00, 20000.00,
  'In shop for hydraulic cylinder rebuild.'
),

-- Dozers
(
  'g0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'DZ-001', 'CAT D6T XW Dozer', 'DOZER', 'HEAVY',
  'Caterpillar', 'D6T XW', 2020, 'CAT0D6TXWMN34567',
  'IN_USE', 'b0000000-0000-0000-0000-000000000001', 3820.0, NULL,
  '2024-11-01', '2025-02-01', 4000.0,
  195.00, 1500.00, 30000.00,
  'GPS equipped. Primary grading machine for Corridor H.'
),
(
  'g0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'DZ-002', 'John Deere 850L Dozer', 'DOZER', 'HEAVY',
  'John Deere', '850L', 2021, 'JD0850LXCPQ23456',
  'AVAILABLE', NULL, 2450.0, NULL,
  '2024-12-05', '2025-03-05', 2750.0,
  175.00, 1350.00, 27000.00,
  'Available for assignment. Good condition.'
),

-- Loaders
(
  'g0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'WL-001', 'CAT 950M Wheel Loader', 'LOADER', 'HEAVY',
  'Caterpillar', '950M', 2022, 'CAT0950MXRS45678',
  'IN_USE', 'b0000000-0000-0000-0000-000000000001', 3150.0, NULL,
  '2024-10-15', '2025-01-15', 3500.0,
  155.00, 1200.00, 24000.00,
  'Loading aggregate at Corridor H. Quick coupler equipped.'
),
(
  'g0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'WL-002', 'Volvo L90H Wheel Loader', 'LOADER', 'HEAVY',
  'Volvo', 'L90H', 2020, 'VOL0L90HXTU67890',
  'AVAILABLE', NULL, 4580.0, NULL,
  '2024-11-20', '2025-02-20', 5000.0,
  145.00, 1100.00, 22000.00,
  'Snow plow attachment available.'
),

-- Haul Trucks
(
  'g0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000001',
  'HT-001', 'Kenworth T880 Dump Truck', 'DUMP_TRUCK', 'HEAVY',
  'Kenworth', 'T880', 2021, '1XKYD49X4LJ123456',
  'IN_USE', 'b0000000-0000-0000-0000-000000000001', NULL, 125000.0,
  '2024-11-10', '2025-02-10', NULL,
  95.00, 750.00, 15000.00,
  'Tri-axle. Primary haul truck for Corridor H earthwork.'
),
(
  'g0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000001',
  'HT-002', 'Kenworth T880 Dump Truck', 'DUMP_TRUCK', 'HEAVY',
  'Kenworth', 'T880', 2021, '1XKYD49X4LJ123457',
  'IN_USE', 'b0000000-0000-0000-0000-000000000001', NULL, 118500.0,
  '2024-10-25', '2025-01-25', NULL,
  95.00, 750.00, 15000.00,
  'Tri-axle. Corridor H earthwork.'
),
(
  'g0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000001',
  'HT-003', 'Mack Granite Dump Truck', 'DUMP_TRUCK', 'HEAVY',
  'Mack', 'Granite 64FR', 2019, '1M2AX09C5KM012345',
  'AVAILABLE', NULL, NULL, 156000.0,
  '2024-12-01', '2025-03-01', NULL,
  85.00, 650.00, 13000.00,
  'Tandem axle. Available for short-term projects.'
),

-- Rollers
(
  'g0000000-0000-0000-0000-000000000011',
  'a0000000-0000-0000-0000-000000000001',
  'RL-001', 'CAT CB54B Tandem Roller', 'ROLLER', 'HEAVY',
  'Caterpillar', 'CB54B', 2022, 'CAT0CB54BXUV12345',
  'IN_USE', 'b0000000-0000-0000-0000-000000000001', 1850.0, NULL,
  '2024-11-05', '2025-02-05', 2000.0,
  125.00, 950.00, 19000.00,
  'Primary paving roller. Water system recently serviced.'
),
(
  'g0000000-0000-0000-0000-000000000012',
  'a0000000-0000-0000-0000-000000000001',
  'RL-002', 'CAT CS56B Vibratory Compactor', 'ROLLER', 'HEAVY',
  'Caterpillar', 'CS56B', 2021, 'CAT0CS56BXWX23456',
  'AVAILABLE', NULL, 2340.0, NULL,
  '2024-10-30', '2025-01-30', 2500.0,
  115.00, 875.00, 17500.00,
  'Soil compaction. Padfoot shell available.'
),

-- Support Vehicles
(
  'g0000000-0000-0000-0000-000000000013',
  'a0000000-0000-0000-0000-000000000001',
  'PU-001', 'Ford F-250 Pickup', 'PICKUP', 'VEHICLE',
  'Ford', 'F-250 XLT', 2023, '1FT7W2B66PEA12345',
  'IN_USE', 'b0000000-0000-0000-0000-000000000001', NULL, 28500.0,
  '2024-10-15', '2025-04-15', NULL,
  45.00, 150.00, 2800.00,
  'Superintendent vehicle - Mike Reynolds.'
),
(
  'g0000000-0000-0000-0000-000000000014',
  'a0000000-0000-0000-0000-000000000001',
  'PU-002', 'Ford F-350 Service Truck', 'SERVICE_TRUCK', 'VEHICLE',
  'Ford', 'F-350 XL', 2022, '1FD8W3H66NEA67890',
  'IN_USE', NULL, NULL, 45200.0,
  '2024-11-20', '2025-05-20', NULL,
  55.00, 200.00, 3500.00,
  'Field service truck. Welder and compressor equipped.'
),
(
  'g0000000-0000-0000-0000-000000000015',
  'a0000000-0000-0000-0000-000000000001',
  'PU-003', 'Chevrolet Silverado 2500', 'PICKUP', 'VEHICLE',
  'Chevrolet', 'Silverado 2500 HD', 2023, '1GC4YLE70PF345678',
  'IN_USE', 'b0000000-0000-0000-0000-000000000002', NULL, 18900.0,
  '2024-09-30', '2025-03-30', NULL,
  45.00, 150.00, 2800.00,
  'Superintendent vehicle - Tom Bradley.'
),

-- Small Equipment
(
  'g0000000-0000-0000-0000-000000000016',
  'a0000000-0000-0000-0000-000000000001',
  'SK-001', 'Bobcat S650 Skid Steer', 'SKID_STEER', 'SUPPORT',
  'Bobcat', 'S650', 2022, 'BOB0S650XYZ98765',
  'IN_USE', 'b0000000-0000-0000-0000-000000000001', 1650.0, NULL,
  '2024-11-15', '2025-02-15', 1750.0,
  75.00, 350.00, 6500.00,
  'Multiple attachments available: bucket, forks, auger.'
),
(
  'g0000000-0000-0000-0000-000000000017',
  'a0000000-0000-0000-0000-000000000001',
  'MB-001', 'CAT 420F2 Backhoe', 'BACKHOE', 'SUPPORT',
  'Caterpillar', '420F2', 2021, 'CAT0420F2ABC34567',
  'IN_USE', 'b0000000-0000-0000-0000-000000000002', 2890.0, NULL,
  '2024-10-20', '2025-01-20', 3000.0,
  95.00, 550.00, 10000.00,
  'Bridge project utility work.'
),
(
  'g0000000-0000-0000-0000-000000000018',
  'a0000000-0000-0000-0000-000000000001',
  'GN-001', 'Wacker Neuson GP2500A Generator', 'GENERATOR', 'SMALL',
  'Wacker Neuson', 'GP2500A', 2023, 'WN0GP2500ADEF12345',
  'AVAILABLE', NULL, 450.0, NULL,
  '2024-12-01', '2025-06-01', 500.0,
  15.00, 75.00, 1200.00,
  '2500W portable generator. Good for small tools.'
)
ON CONFLICT (organization_id, equipment_number) DO NOTHING;

-- ============================================================================
-- PART 5: Update timestamps trigger for equipment
-- ============================================================================

DROP TRIGGER IF EXISTS equipment_updated_at ON public.equipment;
CREATE TRIGGER equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration adds:
-- - 5 bid projects (1 estimating, 1 reviewing, 1 identified, 1 awarded, 1 not bidding)
-- - 14 bid items for the Triplett project
-- - 3 addenda for the Triplett project
-- - 18 pieces of equipment with varied status
-- ============================================================================
