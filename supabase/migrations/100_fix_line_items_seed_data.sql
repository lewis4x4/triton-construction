-- ============================================================================
-- Migration 100: Line Items Seed Data for Bid Module
-- ============================================================================
-- PURPOSE: Insert seed data directly into bid_line_items table
-- The UI queries bid_line_items but no data was ever inserted
-- This migration adds demo data for the Triplett Curve project
-- ============================================================================

-- ============================================================================
-- PART 1: Insert Line Items for Triplett Curve Safety Improvement Project
-- Project ID: c0000000-0000-0000-0000-000000000001
-- ============================================================================

INSERT INTO public.bid_line_items (
  id, bid_project_id, line_number, item_number, alt_item_number,
  description, short_description, quantity, unit,
  work_category, risk_level,
  base_unit_cost, ai_suggested_unit_price, final_unit_price, final_extended_price,
  overhead_pct, profit_pct, price_source, pricing_reviewed, estimator_notes,
  created_at, updated_at
) VALUES
-- Earthwork items
(
  'li000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  1, '203.01', '203.01.01',
  'Unclassified Excavation', 'Unclassified Excavation',
  45000.00, 'CY',
  'EARTHWORK', 'MEDIUM',
  11.00, 12.50, 12.50, 562500.00,
  8.0, 6.0, 'AI_GENERATED', false, 'Self-perform with owned fleet. GPS grade control available.',
  NOW(), NOW()
),
(
  'li000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  2, '203.02', '203.02.01',
  'Rock Excavation', 'Rock Excavation',
  8500.00, 'CY',
  'EARTHWORK', 'HIGH',
  26.50, 35.00, 35.00, 297500.00,
  8.0, 6.0, 'AI_GENERATED', false, 'HIGH RISK: Variable rock depths per geotech. Consider higher contingency.',
  NOW(), NOW()
),
(
  'li000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001',
  3, '207.01', '207.01.01',
  'Embankment-In-Place', 'Embankment-In-Place',
  38000.00, 'CY',
  'EARTHWORK', 'LOW',
  7.75, 8.75, 8.75, 332500.00,
  8.0, 6.0, 'AI_GENERATED', false, 'Borrow source TBD - await RFI response.',
  NOW(), NOW()
),

-- Drainage items
(
  'li000000-0000-0000-0000-000000000004',
  'c0000000-0000-0000-0000-000000000001',
  4, '601.10', '601.10.01',
  '24" RCP Storm Sewer', '24" RCP Storm Sewer',
  850.00, 'LF',
  'DRAINAGE', 'LOW',
  72.00, 85.00, 85.00, 72250.00,
  8.0, 6.0, 'AI_GENERATED', false, 'DBE candidate item. Material lead time 8-12 weeks.',
  NOW(), NOW()
),
(
  'li000000-0000-0000-0000-000000000005',
  'c0000000-0000-0000-0000-000000000001',
  5, '601.20', '601.20.01',
  '36" RCP Storm Sewer', '36" RCP Storm Sewer',
  450.00, 'LF',
  'DRAINAGE', 'LOW',
  109.00, 125.00, 125.00, 56250.00,
  8.0, 6.0, 'AI_GENERATED', false, 'DBE candidate item. Coordinate with inlet install.',
  NOW(), NOW()
),
(
  'li000000-0000-0000-0000-000000000006',
  'c0000000-0000-0000-0000-000000000001',
  6, '602.01', '602.01.01',
  'Type C Drop Inlet', 'Type C Drop Inlet',
  12.00, 'EA',
  'DRAINAGE', 'LOW',
  3050.00, 3500.00, 3500.00, 42000.00,
  8.0, 6.0, 'AI_GENERATED', false, 'Standard WVDOH Type C. Verify outlet size per RFI.',
  NOW(), NOW()
),

-- Base and Subbase
(
  'li000000-0000-0000-0000-000000000007',
  'c0000000-0000-0000-0000-000000000001',
  7, '304.01', '304.01.01',
  'Aggregate Base Course', 'Aggregate Base Course',
  15000.00, 'TON',
  'PAVEMENT', 'LOW',
  26.50, 28.50, 28.50, 427500.00,
  8.0, 6.0, 'AI_GENERATED', true, 'Self-perform. Local quarry pricing confirmed.',
  NOW(), NOW()
),

-- Paving items
(
  'li000000-0000-0000-0000-000000000008',
  'c0000000-0000-0000-0000-000000000001',
  8, '401.02', '401.02.01',
  'Superpave Base Course, 19mm', 'Superpave Base 19mm',
  12500.00, 'TON',
  'PAVEMENT', 'LOW',
  70.00, 78.00, 78.00, 975000.00,
  8.0, 6.0, 'AI_GENERATED', true, 'WV Paving quote locked. Critical path item.',
  NOW(), NOW()
),
(
  'li000000-0000-0000-0000-000000000009',
  'c0000000-0000-0000-0000-000000000001',
  9, '401.04', '401.04.01',
  'Superpave Wearing Course, 9.5mm', 'Superpave Wearing 9.5mm',
  8500.00, 'TON',
  'PAVEMENT', 'LOW',
  77.00, 85.00, 85.00, 722500.00,
  8.0, 6.0, 'AI_GENERATED', true, 'WV Paving quote locked. Must complete by Oct 15.',
  NOW(), NOW()
),

-- Guardrail (DBE candidate)
(
  'li000000-0000-0000-0000-000000000010',
  'c0000000-0000-0000-0000-000000000001',
  10, '606.01', '606.01.01',
  'Steel Beam Guardrail', 'Steel Beam Guardrail',
  2400.00, 'LF',
  'GUARDRAIL_BARRIER', 'LOW',
  28.00, 32.00, 32.00, 76800.00,
  8.0, 6.0, 'SUBCONTRACT_QUOTE', false, 'DBE subcontract - Mountain State Guardrail.',
  NOW(), NOW()
),
(
  'li000000-0000-0000-0000-000000000011',
  'c0000000-0000-0000-0000-000000000001',
  11, '606.05', '606.05.01',
  'Guardrail Terminal Section', 'Guardrail Terminal',
  24.00, 'EA',
  'GUARDRAIL_BARRIER', 'LOW',
  2450.00, 2800.00, 2800.00, 67200.00,
  8.0, 6.0, 'SUBCONTRACT_QUOTE', false, 'DBE subcontract - Mountain State Guardrail.',
  NOW(), NOW()
),

-- Pavement Markings (DBE candidate)
(
  'li000000-0000-0000-0000-000000000012',
  'c0000000-0000-0000-0000-000000000001',
  12, '636.01', '636.01.01',
  'Thermoplastic Pavement Markings, 4"', 'Thermo Markings 4"',
  18500.00, 'LF',
  'SIGNING_STRIPING', 'LOW',
  1.10, 1.25, 1.25, 23125.00,
  8.0, 6.0, 'SUBCONTRACT_QUOTE', false, 'DBE subcontract - Appalachian Striping Co.',
  NOW(), NOW()
),

-- Mobilization
(
  'li000000-0000-0000-0000-000000000013',
  'c0000000-0000-0000-0000-000000000001',
  13, '109.01', '109.01.01',
  'Mobilization', 'Mobilization',
  1.00, 'LS',
  'MOBILIZATION', 'LOW',
  170000.00, 185000.00, 185000.00, 185000.00,
  8.0, 6.0, 'AI_GENERATED', false, 'Includes bonds, insurance, site setup, and facilities.',
  NOW(), NOW()
),

-- Traffic Control
(
  'li000000-0000-0000-0000-000000000014',
  'c0000000-0000-0000-0000-000000000001',
  14, '701.01', '701.01.01',
  'Traffic Control', 'Traffic Control',
  1.00, 'LS',
  'MOT', 'MEDIUM',
  110000.00, 125000.00, 125000.00, 125000.00,
  8.0, 6.0, 'SUBCONTRACT_QUOTE', false, 'DBE subcontract - Valley Traffic Services. High AADT.',
  NOW(), NOW()
)
ON CONFLICT (bid_project_id, item_number) DO UPDATE SET
  description = EXCLUDED.description,
  quantity = EXCLUDED.quantity,
  unit = EXCLUDED.unit,
  work_category = EXCLUDED.work_category,
  risk_level = EXCLUDED.risk_level,
  base_unit_cost = EXCLUDED.base_unit_cost,
  ai_suggested_unit_price = EXCLUDED.ai_suggested_unit_price,
  final_unit_price = EXCLUDED.final_unit_price,
  final_extended_price = EXCLUDED.final_extended_price,
  overhead_pct = EXCLUDED.overhead_pct,
  profit_pct = EXCLUDED.profit_pct,
  estimator_notes = EXCLUDED.estimator_notes,
  updated_at = NOW();

-- ============================================================================
-- PART 2: Verify the data was inserted
-- ============================================================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.bid_line_items;
  RAISE NOTICE 'Total bid_line_items after migration: %', v_count;
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration inserts 14 line items for the Triplett Curve project:
-- - 3 Earthwork items (Excavation, Rock, Embankment)
-- - 3 Drainage items (24" RCP, 36" RCP, Drop Inlets)
-- - 1 Base Course item
-- - 2 Paving items (Base Course, Wearing Course)
-- - 2 Guardrail items (DBE subcontract)
-- - 1 Pavement Markings item (DBE subcontract)
-- - 1 Mobilization item
-- - 1 Traffic Control item (DBE subcontract)
-- Total estimated value: ~$4,250,000
-- ============================================================================
