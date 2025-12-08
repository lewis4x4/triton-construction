-- =============================================================================
-- Migration 078: Seed Data for Self-Perform Cost Tracking & Pay Integration
-- =============================================================================
-- Adds demo data for:
-- - Self-perform cost codes (bid items)
-- - Labor entries (worker time)
-- - Equipment usage
-- - Material usage
-- - CRL submissions
-- - Daily report quantities
-- =============================================================================

-- ============================================================================
-- PART 1: SELF-PERFORM COST CODES
-- ============================================================================
-- Create bid items for Corridor H project (b0000000-0000-0000-0000-000000000001)

INSERT INTO public.self_perform_cost_codes (
    id, organization_id, project_id, item_number, description, unit,
    bid_qty, bid_unit_price,
    estimated_labor_pct, estimated_equipment_pct, estimated_material_pct,
    is_active
) VALUES
-- Earthwork items
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '203-001', 'Unclassified Excavation', 'CY',
 125000, 8.50,
 35.00, 45.00, 20.00, true),
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '203-002', 'Borrow Excavation', 'CY',
 45000, 12.00,
 30.00, 50.00, 20.00, true),
('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '206-001', 'Structural Excavation', 'CY',
 8500, 22.00,
 40.00, 40.00, 20.00, true),

-- Drainage items
('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '601-024', '24" RCP Pipe', 'LF',
 2400, 85.00,
 35.00, 25.00, 40.00, true),
('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '601-036', '36" RCP Pipe', 'LF',
 1200, 145.00,
 35.00, 25.00, 40.00, true),
('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '602-001', 'Type 3 Inlet', 'EA',
 45, 4500.00,
 45.00, 20.00, 35.00, true),

-- Paving items
('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '401-001', 'Aggregate Base Course', 'TON',
 35000, 32.00,
 25.00, 35.00, 40.00, true),
('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '411-001', 'Superpave Base Course', 'TON',
 28000, 85.00,
 20.00, 30.00, 50.00, true),
('d0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '411-002', 'Superpave Wearing Course', 'TON',
 18000, 95.00,
 20.00, 30.00, 50.00, true),

-- Concrete items
('d0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 '502-001', 'Class A Concrete', 'CY',
 2200, 650.00,
 45.00, 15.00, 40.00, true)
ON CONFLICT (project_id, item_number) DO NOTHING;

-- ============================================================================
-- PART 2: LABOR ENTRIES
-- ============================================================================
-- Recent labor entries for the past 2 weeks

INSERT INTO public.self_perform_labor_entries (
    id, organization_id, project_id, cost_code_id,
    worker_name, trade_classification,
    work_date, hours_regular, hours_overtime, hours_double_time,
    base_rate, fringe_rate, burden_rate_pct,
    status, qty_installed, notes
) VALUES
-- Week 1 - Dec 2-6, 2024
-- James Morrison (Equipment Operator) - Excavation
('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'James Morrison', 'Equipment Operator',
 '2024-12-02', 8.0, 2.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 850.0, 'CAT 336 excavation at Station 125+00'),
('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'James Morrison', 'Equipment Operator',
 '2024-12-03', 8.0, 1.5, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 780.0, 'Continued excavation STA 125+00 to 127+50'),
('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'James Morrison', 'Equipment Operator',
 '2024-12-04', 8.0, 2.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 920.0, 'Rock excavation at cut section'),
('f0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'James Morrison', 'Equipment Operator',
 '2024-12-05', 8.0, 0.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 650.0, 'Rain delay - half day production'),
('f0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'James Morrison', 'Equipment Operator',
 '2024-12-06', 8.0, 3.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 1050.0, 'Overtime to make up for rain delay'),

-- David Clark (Laborer) - Supporting excavation crew
('f0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'David Clark', 'Laborer',
 '2024-12-02', 8.0, 2.0, 0.0,
 28.50, 15.25, 35.00,
 'APPROVED', NULL, 'Grade checking and cleanup'),
('f0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'David Clark', 'Laborer',
 '2024-12-03', 8.0, 1.5, 0.0,
 28.50, 15.25, 35.00,
 'APPROVED', NULL, 'Setting grade stakes'),
('f0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'David Clark', 'Laborer',
 '2024-12-04', 8.0, 2.0, 0.0,
 28.50, 15.25, 35.00,
 'APPROVED', NULL, 'Traffic control support'),

-- Robert Anderson (Equipment Operator) - Dozer work
('f0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
 'Robert Anderson', 'Equipment Operator',
 '2024-12-02', 8.0, 1.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 420.0, 'D6 spreading borrow material'),
('f0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
 'Robert Anderson', 'Equipment Operator',
 '2024-12-03', 8.0, 2.0, 0.0,
 42.50, 18.75, 35.00,
 'APPROVED', 580.0, 'Fill placement and compaction support'),

-- Michael Johnson (Carpenter) - Concrete forms
('f0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010',
 'Michael Johnson', 'Carpenter',
 '2024-12-02', 8.0, 0.0, 0.0,
 38.00, 17.50, 35.00,
 'APPROVED', NULL, 'Setting forms for headwall'),
('f0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010',
 'Michael Johnson', 'Carpenter',
 '2024-12-03', 8.0, 2.0, 0.0,
 38.00, 17.50, 35.00,
 'APPROVED', NULL, 'Completed headwall forms, ready for pour'),

-- Week 2 entries (submitted, not yet approved)
('f0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004',
 'William Taylor', 'Pipe Layer',
 '2024-12-09', 8.0, 0.0, 0.0,
 35.00, 16.00, 35.00,
 'SUBMITTED', 120.0, 'Installing 24" RCP at STA 130+00'),
('f0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004',
 'William Taylor', 'Pipe Layer',
 '2024-12-10', 8.0, 1.0, 0.0,
 35.00, 16.00, 35.00,
 'SUBMITTED', 145.0, 'Continued pipe installation')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 3: EQUIPMENT USAGE
-- ============================================================================

INSERT INTO public.self_perform_equipment_usage (
    id, organization_id, project_id, cost_code_id,
    equipment_id, equipment_name, equipment_code,
    work_date, hours_operated, hours_idle,
    hourly_rate, idle_rate_pct,
    fuel_gallons, fuel_cost_per_gallon,
    status, notes
) VALUES
-- CAT 336F Excavator (e0000000-0000-0000-0000-000000000001)
('f1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 '2024-12-02', 9.5, 0.5,
 185.00, 50.00,
 85.0, 3.45,
 'APPROVED', 'Mass excavation at STA 125+00'),
('f1000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 '2024-12-03', 9.0, 0.5,
 185.00, 50.00,
 78.0, 3.45,
 'APPROVED', 'Continued excavation'),
('f1000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 '2024-12-04', 10.0, 0.0,
 185.00, 50.00,
 92.0, 3.45,
 'APPROVED', 'Rock excavation - high production'),
('f1000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 '2024-12-05', 4.0, 4.0,
 185.00, 50.00,
 45.0, 3.45,
 'APPROVED', 'Rain delay - limited work'),
('f1000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
 'e0000000-0000-0000-0000-000000000001', 'CAT 336F Excavator', 'EX-001',
 '2024-12-06', 11.0, 0.0,
 185.00, 50.00,
 98.0, 3.45,
 'APPROVED', 'Extended shift to recover'),

-- CAT D6T Dozer (e0000000-0000-0000-0000-000000000004)
('f1000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
 'e0000000-0000-0000-0000-000000000004', 'CAT D6T XW Dozer', 'DZ-001',
 '2024-12-02', 8.5, 0.5,
 195.00, 50.00,
 42.0, 3.45,
 'APPROVED', 'Spreading and grading borrow'),
('f1000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
 'e0000000-0000-0000-0000-000000000004', 'CAT D6T XW Dozer', 'DZ-001',
 '2024-12-03', 9.5, 0.5,
 195.00, 50.00,
 48.0, 3.45,
 'APPROVED', 'Fill placement'),

-- CAT 950M Loader (e0000000-0000-0000-0000-000000000006)
('f1000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007',
 'e0000000-0000-0000-0000-000000000006', 'CAT 950M Wheel Loader', 'WL-001',
 '2024-12-02', 8.0, 1.0,
 155.00, 50.00,
 35.0, 3.45,
 'APPROVED', 'Loading aggregate base material'),
('f1000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007',
 'e0000000-0000-0000-0000-000000000006', 'CAT 950M Wheel Loader', 'WL-001',
 '2024-12-03', 8.5, 0.5,
 155.00, 50.00,
 38.0, 3.45,
 'APPROVED', 'Continued aggregate loading')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 4: MATERIAL USAGE
-- ============================================================================

INSERT INTO public.self_perform_material_usage (
    id, organization_id, project_id, cost_code_id,
    material_name, material_code, supplier_name,
    work_date, quantity, unit, unit_cost,
    ticket_number, status, notes
) VALUES
-- Aggregate for base course
('f2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007',
 'Crushed Aggregate Base #57', 'AGG-57', 'Martin Marietta - Elkins',
 '2024-12-02', 450.0, 'TON', 18.50,
 'MM-2024-12345', 'APPROVED', 'Delivered to STA 125+00 stockpile'),
('f2000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007',
 'Crushed Aggregate Base #57', 'AGG-57', 'Martin Marietta - Elkins',
 '2024-12-03', 520.0, 'TON', 18.50,
 'MM-2024-12346', 'APPROVED', 'Delivered to STA 127+00 stockpile'),
('f2000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000007',
 'Crushed Aggregate Base #57', 'AGG-57', 'Martin Marietta - Elkins',
 '2024-12-04', 480.0, 'TON', 18.50,
 'MM-2024-12347', 'APPROVED', 'Delivered to mainline stockpile'),

-- 24" RCP Pipe
('f2000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000004',
 '24" RCP Class III', 'RCP-24-III', 'Contech Engineered Solutions',
 '2024-12-09', 24.0, 'LF', 52.00,
 'CON-2024-8901', 'SUBMITTED', '12 sections delivered for cross drain'),

-- Concrete for headwall
('f2000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000010',
 'Class A Concrete 4000 PSI', 'CONC-4000', 'Valley Ready Mix - Davis',
 '2024-12-04', 18.0, 'CY', 185.00,
 'VRM-2024-5678', 'APPROVED', 'Headwall pour at STA 126+50'),

-- Superpave material (draft for future work)
('f2000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000008',
 'Superpave 19mm Base', 'SP-19B', 'WV Paving - Clarksburg',
 '2024-12-10', 850.0, 'TON', 72.00,
 'WVP-2024-2345', 'DRAFT', 'Estimated for upcoming paving operation')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 5: CRL SUBMISSIONS (AASHTOWare format)
-- ============================================================================

INSERT INTO public.crl_submissions (
    id, organization_id, project_id,
    crl_number, submission_period_start, submission_period_end,
    contract_number, federal_aid_number,
    status, submitted_to_wvdoh_at, notes
) VALUES
('f3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
 12, '2024-11-01', '2024-11-30',
 'DOH-2024-0123', 'FA-WV-2024-001',
 'SUBMITTED', '2024-12-05 14:30:00+00', 'November 2024 CRL - Corridor H Section 12')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.crl_line_items (
    id, crl_submission_id,
    line_number, item_number, description, unit,
    contract_qty, previous_qty, current_qty,
    unit_price
) VALUES
-- Line items for November CRL (total_to_date and amounts are GENERATED)
('f4000000-0000-0000-0000-000000000001', 'f3000000-0000-0000-0000-000000000001',
 1, '203-001', 'Unclassified Excavation', 'CY',
 125000, 53300, 15200,
 8.50),
('f4000000-0000-0000-0000-000000000002', 'f3000000-0000-0000-0000-000000000001',
 2, '203-002', 'Borrow Excavation', 'CY',
 45000, 14000, 8500,
 12.00),
('f4000000-0000-0000-0000-000000000003', 'f3000000-0000-0000-0000-000000000001',
 3, '206-001', 'Structural Excavation', 'CY',
 8500, 2350, 850,
 22.00),
('f4000000-0000-0000-0000-000000000004', 'f3000000-0000-0000-0000-000000000001',
 4, '401-001', 'Aggregate Base Course', 'TON',
 35000, 8300, 4200,
 32.00),
('f4000000-0000-0000-0000-000000000005', 'f3000000-0000-0000-0000-000000000001',
 5, '502-001', 'Class A Concrete', 'CY',
 2200, 230, 15,
 650.00)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PART 6: DAILY REPORT QUANTITIES
-- ============================================================================
-- NOTE: Skipped - daily_report_quantities requires linking to actual daily_reports
-- The table has a trigger that derives organization_id/project_id from daily_report_id
-- This data would be created through the daily reports workflow in the application

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 078: Self-Perform Seed Data completed successfully' as status;
SELECT 'Cost Codes: ' || COUNT(*) FROM public.self_perform_cost_codes WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
SELECT 'Labor Entries: ' || COUNT(*) FROM public.self_perform_labor_entries WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
SELECT 'Equipment Usage: ' || COUNT(*) FROM public.self_perform_equipment_usage WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
SELECT 'Material Usage: ' || COUNT(*) FROM public.self_perform_material_usage WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
SELECT 'CRL Submissions: ' || COUNT(*) FROM public.crl_submissions WHERE organization_id = 'a0000000-0000-0000-0000-000000000001';
SELECT 'CRL Line Items: ' || COUNT(*) FROM public.crl_line_items WHERE crl_submission_id = 'f3000000-0000-0000-0000-000000000001';
