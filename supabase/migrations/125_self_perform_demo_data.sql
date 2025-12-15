-- =============================================================================
-- Migration 125: Self-Perform Demo Data for User's Organization
-- =============================================================================
-- Adds labor, equipment, and material cost entries for the demo organization
-- Organization: 63555da4-55d1-462b-aafb-e3ef32f745cc
-- Project: b0000000-0000-0000-0000-000000000001 (Corridor H Section 12)
-- =============================================================================

-- ============================================================================
-- FIRST: Update cost codes to use correct organization_id
-- ============================================================================
UPDATE public.self_perform_cost_codes
SET organization_id = '63555da4-55d1-462b-aafb-e3ef32f745cc'
WHERE project_id = 'b0000000-0000-0000-0000-000000000001';

-- ============================================================================
-- LABOR ENTRIES - Past 2 weeks of work
-- ============================================================================
INSERT INTO public.self_perform_labor_entries (
    id, organization_id, project_id, cost_code_id,
    worker_name, trade_classification,
    work_date, hours_regular, hours_overtime, hours_double_time,
    base_rate, fringe_rate, burden_rate_pct,
    status, qty_installed, notes
) VALUES
-- James Morrison (Equipment Operator) - Excavation work
('e1000000-0000-0000-0000-000000000001', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'James Morrison', 'Equipment Operator',
 CURRENT_DATE - INTERVAL '10 days', 8.0, 2.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 420.0, 'Structural excavation at Bridge 1'),
('e1000000-0000-0000-0000-000000000002', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'James Morrison', 'Equipment Operator',
 CURRENT_DATE - INTERVAL '9 days', 8.0, 1.5, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 380.0, 'Continued excavation at Bridge 1'),
('e1000000-0000-0000-0000-000000000003', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'James Morrison', 'Equipment Operator',
 CURRENT_DATE - INTERVAL '8 days', 8.0, 2.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 510.0, 'Rock excavation - blasting prep'),
('e1000000-0000-0000-0000-000000000004', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'James Morrison', 'Equipment Operator',
 CURRENT_DATE - INTERVAL '7 days', 8.0, 0.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 290.0, 'Weather delay - partial day'),
('e1000000-0000-0000-0000-000000000005', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'James Morrison', 'Equipment Operator',
 CURRENT_DATE - INTERVAL '6 days', 8.0, 3.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 580.0, 'Extended shift - catching up'),
-- Robert Anderson (Equipment Operator) - Loader work
('e1000000-0000-0000-0000-000000000006', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'Robert Anderson', 'Equipment Operator',
 CURRENT_DATE - INTERVAL '10 days', 8.0, 1.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 220.0, 'Loading trucks with excavated material'),
('e1000000-0000-0000-0000-000000000007', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'Robert Anderson', 'Equipment Operator',
 CURRENT_DATE - INTERVAL '9 days', 8.0, 2.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 280.0, 'Continued loading operations'),
-- David Clark (Laborer) - Support
('e1000000-0000-0000-0000-000000000008', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'David Clark', 'Laborer',
 CURRENT_DATE - INTERVAL '10 days', 8.0, 2.0, 0.0,
 28.50, 15.25, 35.00,
 'APPROVED', NULL, 'Grade checking and cleanup'),
('e1000000-0000-0000-0000-000000000009', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'David Clark', 'Laborer',
 CURRENT_DATE - INTERVAL '9 days', 8.0, 1.5, 0.0,
 28.50, 15.25, 35.00,
 'APPROVED', NULL, 'Setting grade stakes'),
-- Pipe crew - Drainage work
('e1000000-0000-0000-0000-000000000010', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005',
 'William Taylor', 'Pipe Layer',
 CURRENT_DATE - INTERVAL '5 days', 8.0, 0.0, 0.0,
 35.00, 16.00, 35.00,
 'APPROVED', 80.0, 'Installing 36" RCP at STA 130+00'),
('e1000000-0000-0000-0000-000000000011', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005',
 'William Taylor', 'Pipe Layer',
 CURRENT_DATE - INTERVAL '4 days', 8.0, 1.0, 0.0,
 35.00, 16.00, 35.00,
 'APPROVED', 95.0, 'Continued pipe installation'),
('e1000000-0000-0000-0000-000000000012', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005',
 'William Taylor', 'Pipe Layer',
 CURRENT_DATE - INTERVAL '3 days', 8.0, 0.0, 0.0,
 35.00, 16.00, 35.00,
 'APPROVED', 75.0, 'Pipe bedding and backfill'),
-- Type 3 Inlet work
('e1000000-0000-0000-0000-000000000013', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006',
 'Michael Johnson', 'Carpenter',
 CURRENT_DATE - INTERVAL '4 days', 8.0, 0.0, 0.0,
 38.00, 17.50, 35.00,
 'APPROVED', 2.0, 'Setting forms for Type 3 inlets'),
('e1000000-0000-0000-0000-000000000014', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006',
 'Michael Johnson', 'Carpenter',
 CURRENT_DATE - INTERVAL '3 days', 8.0, 2.0, 0.0,
 38.00, 17.50, 35.00,
 'APPROVED', 3.0, 'Completed inlet forms, ready for pour')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EQUIPMENT USAGE - Past 2 weeks
-- ============================================================================
INSERT INTO public.self_perform_equipment_usage (
    id, organization_id, project_id, cost_code_id,
    equipment_id, equipment_name, equipment_code,
    work_date, hours_operated, hours_idle,
    hourly_rate, idle_rate_pct,
    fuel_gallons, fuel_cost_per_gallon,
    status, notes
) VALUES
-- CAT 336F Excavator - Structural Excavation
('e2000000-0000-0000-0000-000000000001', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 CURRENT_DATE - INTERVAL '10 days', 9.5, 0.5,
 185.00, 50.00,
 85.0, 3.45,
 'APPROVED', 'Structural excavation at Bridge 1'),
('e2000000-0000-0000-0000-000000000002', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 CURRENT_DATE - INTERVAL '9 days', 9.0, 0.5,
 185.00, 50.00,
 78.0, 3.45,
 'APPROVED', 'Continued excavation'),
('e2000000-0000-0000-0000-000000000003', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 CURRENT_DATE - INTERVAL '8 days', 10.0, 0.0,
 185.00, 50.00,
 92.0, 3.45,
 'APPROVED', 'Rock excavation - high production'),
('e2000000-0000-0000-0000-000000000004', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 CURRENT_DATE - INTERVAL '7 days', 4.0, 4.0,
 185.00, 50.00,
 45.0, 3.45,
 'APPROVED', 'Rain delay - limited work'),
('e2000000-0000-0000-0000-000000000005', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 CURRENT_DATE - INTERVAL '6 days', 11.0, 0.0,
 185.00, 50.00,
 98.0, 3.45,
 'APPROVED', 'Extended shift to recover'),
-- CAT 950M Loader
('e2000000-0000-0000-0000-000000000006', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'e0000000-0000-0000-0000-000000000006', 'CAT 950M Wheel Loader', 'WL-001',
 CURRENT_DATE - INTERVAL '10 days', 8.0, 1.0,
 155.00, 50.00,
 35.0, 3.45,
 'APPROVED', 'Loading trucks'),
('e2000000-0000-0000-0000-000000000007', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
 'e0000000-0000-0000-0000-000000000006', 'CAT 950M Wheel Loader', 'WL-001',
 CURRENT_DATE - INTERVAL '9 days', 8.5, 0.5,
 155.00, 50.00,
 38.0, 3.45,
 'APPROVED', 'Continued loading'),
-- CAT 420F2 Backhoe - Pipe work
('e2000000-0000-0000-0000-000000000008', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005',
 'e0000000-0000-0000-0000-000000000017', 'CAT 420F2 Backhoe', 'BH-001',
 CURRENT_DATE - INTERVAL '5 days', 7.0, 1.0,
 125.00, 50.00,
 22.0, 3.45,
 'APPROVED', 'Pipe trench excavation'),
('e2000000-0000-0000-0000-000000000009', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005',
 'e0000000-0000-0000-0000-000000000017', 'CAT 420F2 Backhoe', 'BH-001',
 CURRENT_DATE - INTERVAL '4 days', 8.0, 0.5,
 125.00, 50.00,
 25.0, 3.45,
 'APPROVED', 'Pipe installation support'),
('e2000000-0000-0000-0000-000000000010', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005',
 'e0000000-0000-0000-0000-000000000017', 'CAT 420F2 Backhoe', 'BH-001',
 CURRENT_DATE - INTERVAL '3 days', 6.5, 1.5,
 125.00, 50.00,
 20.0, 3.45,
 'APPROVED', 'Backfill and compaction')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- MATERIAL USAGE
-- ============================================================================
INSERT INTO public.self_perform_material_usage (
    id, organization_id, project_id, cost_code_id,
    material_name, material_code, supplier_name,
    work_date, quantity, unit, unit_cost,
    ticket_number, status, notes
) VALUES
-- 36" RCP Pipe
('e3000000-0000-0000-0000-000000000001', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005',
 '36" RCP Class III', 'RCP-36-III', 'Contech Engineered Solutions',
 CURRENT_DATE - INTERVAL '5 days', 80.0, 'LF', 95.00,
 'CON-2024-9101', 'APPROVED', '10 sections delivered for cross drain'),
('e3000000-0000-0000-0000-000000000002', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005',
 '36" RCP Class III', 'RCP-36-III', 'Contech Engineered Solutions',
 CURRENT_DATE - INTERVAL '4 days', 96.0, 'LF', 95.00,
 'CON-2024-9102', 'APPROVED', '12 sections delivered'),
('e3000000-0000-0000-0000-000000000003', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000005',
 'Pipe Bedding Stone #57', 'AGG-57-BD', 'Martin Marietta - Elkins',
 CURRENT_DATE - INTERVAL '5 days', 85.0, 'TON', 22.00,
 'MM-2024-15001', 'APPROVED', 'Bedding for 36" RCP'),
-- Type 3 Inlet Materials
('e3000000-0000-0000-0000-000000000004', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006',
 'Type 3 Inlet Precast', 'INL-T3-PC', 'Oldcastle Infrastructure',
 CURRENT_DATE - INTERVAL '4 days', 5.0, 'EA', 2800.00,
 'OLD-2024-3456', 'APPROVED', 'Precast inlet sections'),
('e3000000-0000-0000-0000-000000000005', '63555da4-55d1-462b-aafb-e3ef32f745cc', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000006',
 'Class A Concrete 4000 PSI', 'CONC-4000', 'Valley Ready Mix - Davis',
 CURRENT_DATE - INTERVAL '3 days', 12.0, 'CY', 185.00,
 'VRM-2024-6789', 'APPROVED', 'Inlet collars and adjustments')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- UPDATE COST CODE TOTALS
-- ============================================================================
-- Force recalculation of actual costs by updating a trigger-watched column

-- For each cost code, sum the approved labor entries
UPDATE public.self_perform_cost_codes cc
SET actual_labor_cost = COALESCE((
    SELECT SUM(total_cost)
    FROM public.self_perform_labor_entries le
    WHERE le.cost_code_id = cc.id
    AND le.status = 'APPROVED'
), 0),
actual_equipment_cost = COALESCE((
    SELECT SUM(total_cost)
    FROM public.self_perform_equipment_usage eu
    WHERE eu.cost_code_id = cc.id
    AND eu.status = 'APPROVED'
), 0),
actual_material_cost = COALESCE((
    SELECT SUM(total_cost)
    FROM public.self_perform_material_usage mu
    WHERE mu.cost_code_id = cc.id
    AND mu.status = 'APPROVED'
), 0),
installed_qty = COALESCE((
    SELECT SUM(qty_installed)
    FROM public.self_perform_labor_entries le
    WHERE le.cost_code_id = cc.id
    AND le.status = 'APPROVED'
    AND le.qty_installed IS NOT NULL
), 0)
WHERE cc.organization_id = '63555da4-55d1-462b-aafb-e3ef32f745cc';

-- ============================================================================
-- SUMMARY
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 125: Self-Perform Demo Data completed';
    RAISE NOTICE 'Added labor, equipment, and material entries for demo org';
END $$;
