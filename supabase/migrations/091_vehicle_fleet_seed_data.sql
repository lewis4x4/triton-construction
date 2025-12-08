-- =============================================================================
-- Migration 091: Vehicle Fleet Management Seed Data
-- =============================================================================
-- PURPOSE: Generate comprehensive demo data for Vehicle Fleet Management module
--          including vehicles, trailers, fuel cards, transactions, inspections,
--          driver qualification files, and IFTA data
-- DEPENDS ON: Migration 090 (vehicle_fleet_management.sql)
--             Migration 089 (equipment_crew_seed_data.sql for crew_members)
-- =============================================================================

-- ============================================================================
-- PART 1: Vehicles (Dump Trucks, Pickups, Service Trucks, etc.)
-- ============================================================================

INSERT INTO public.vehicles (
  id, organization_id, vehicle_number, description, vehicle_type,
  year, make, model, vin,
  license_plate, license_plate_state, registration_expiry,
  gvwr_lbs, gcwr_lbs, axle_count,
  fuel_type, fuel_tank_capacity_gallons,
  requires_cdl, cdl_class_required, dot_number,
  irp_account_number, irp_cab_card_expiry, irp_base_state,
  ifta_account_number, ifta_license_expiry, ifta_decal_number,
  insurance_policy_number, insurance_expiry, insured_value,
  status, dot_status,
  current_project_id, current_driver_id,
  home_location, current_latitude, current_longitude,
  current_odometer, odometer_updated_at,
  gps_provider, gps_device_id,
  fuel_card_number, fuel_card_provider,
  last_service_date, last_service_odometer,
  next_service_due_date, next_service_due_odometer, service_interval_miles,
  last_dot_inspection_date, next_dot_inspection_date, dot_inspection_sticker,
  ownership_type, acquisition_date, acquisition_cost, current_book_value,
  target_mpg
) VALUES
-- VEH-001: 2022 Kenworth T880 Tri-Axle Dump
(
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'DT-001', '2022 Kenworth T880 Tri-Axle Dump', 'DUMP_TRUCK_TRI_AXLE',
  2022, 'Kenworth', 'T880', '1NKZL40X5NJ123456',
  'WV-DT001', 'WV', '2025-06-30',
  54000, 80000, 3,
  'DIESEL', 100.0,
  true, 'A', 'DOT-1234567',
  'IRP-WV-00001', '2025-12-31', 'WV',
  'IFTA-WV-00001', '2025-12-31', 'WV-IFTA-001',
  'INS-2024-001', '2025-12-31', 185000.00,
  'ACTIVE', 'COMPLIANT',
  'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
  'St. Albans Yard', 38.3854, -81.8362,
  45230, NOW() - INTERVAL '1 day',
  'GEOTAB', 'GT-DT001-2022',
  'WEX-100001', 'WEX',
  '2024-10-15', 42500,
  '2025-01-15', 57500, 15000,
  '2024-08-01', '2025-08-01', 'WV-DOT-2024-001',
  'OWNED', '2022-03-15', 185000.00, 155000.00,
  5.5
),
-- VEH-002: 2023 Freightliner 122SD Quad-Axle Dump
(
  'f0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'DT-002', '2023 Freightliner 122SD Quad-Axle Dump', 'DUMP_TRUCK_QUAD_AXLE',
  2023, 'Freightliner', '122SD', '1FVHG3DV7PHAB2345',
  'WV-DT002', 'WV', '2025-08-31',
  66000, 90000, 4,
  'DIESEL', 120.0,
  true, 'A', 'DOT-1234567',
  'IRP-WV-00002', '2025-12-31', 'WV',
  'IFTA-WV-00002', '2025-12-31', 'WV-IFTA-002',
  'INS-2024-002', '2025-12-31', 220000.00,
  'ACTIVE', 'COMPLIANT',
  'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002',
  'St. Albans Yard', 38.3860, -81.8370,
  28450, NOW() - INTERVAL '2 hours',
  'GEOTAB', 'GT-DT002-2023',
  'WEX-100002', 'WEX',
  '2024-11-20', 27000,
  '2025-02-20', 42000, 15000,
  '2024-09-15', '2025-09-15', 'WV-DOT-2024-002',
  'OWNED', '2023-01-20', 220000.00, 198000.00,
  5.0
),
-- VEH-003: 2021 Peterbilt 567 Tandem Dump
(
  'f0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'DT-003', '2021 Peterbilt 567 Tandem Dump', 'DUMP_TRUCK_TANDEM',
  2021, 'Peterbilt', '567', '1XPBDP9X0MD567890',
  'WV-DT003', 'WV', '2025-04-30',
  46000, 70000, 2,
  'DIESEL', 80.0,
  true, 'B', 'DOT-1234567',
  'IRP-WV-00003', '2025-12-31', 'WV',
  'IFTA-WV-00003', '2025-12-31', 'WV-IFTA-003',
  'INS-2024-003', '2025-12-31', 165000.00,
  'ACTIVE', 'COMPLIANT',
  'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003',
  'St. Albans Yard', 38.3848, -81.8355,
  67890, NOW() - INTERVAL '6 hours',
  'GEOTAB', 'GT-DT003-2021',
  'WEX-100003', 'WEX',
  '2024-09-10', 65000,
  '2024-12-10', 80000, 15000,
  '2024-06-01', '2025-06-01', 'WV-DOT-2024-003',
  'OWNED', '2021-06-10', 165000.00, 130000.00,
  6.0
),
-- VEH-004: 2020 International HX620 Tri-Axle Dump
(
  'f0000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'DT-004', '2020 International HX620 Tri-Axle Dump', 'DUMP_TRUCK_TRI_AXLE',
  2020, 'International', 'HX620', '3HSEDJZR0LN456789',
  'WV-DT004', 'WV', '2025-03-31',
  54000, 80000, 3,
  'DIESEL', 100.0,
  true, 'A', 'DOT-1234567',
  'IRP-WV-00004', '2025-12-31', 'WV',
  'IFTA-WV-00004', '2025-12-31', 'WV-IFTA-004',
  'INS-2024-004', '2025-12-31', 155000.00,
  'IN_MAINTENANCE', 'WARNING',
  NULL, NULL,
  'Shop', 38.3840, -81.8340,
  89200, NOW() - INTERVAL '3 days',
  'GEOTAB', 'GT-DT004-2020',
  'WEX-100004', 'WEX',
  '2024-08-25', 85000,
  '2024-11-25', 100000, 15000,
  '2024-03-15', '2025-03-15', 'WV-DOT-2024-004',
  'OWNED', '2020-04-22', 155000.00, 115000.00,
  5.5
),
-- VEH-005: 2024 Ford F-250 Super Duty Pickup
(
  'f0000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'PK-001', '2024 Ford F-250 Crew Cab 4x4', 'PICKUP_TRUCK',
  2024, 'Ford', 'F-250 Super Duty', '1FT8W2BT3RED12345',
  'WV-PK001', 'WV', '2025-11-30',
  10000, NULL, 2,
  'DIESEL', 34.0,
  false, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  'INS-2024-005', '2025-12-31', 68000.00,
  'ACTIVE', 'COMPLIANT',
  'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000009',
  'St. Albans Yard', 38.3852, -81.8358,
  8500, NOW() - INTERVAL '4 hours',
  'SAMSARA', 'SM-PK001-2024',
  'FUELMAN-200001', 'FUELMAN',
  '2024-10-01', 7500,
  '2025-01-01', 12500, 5000,
  NULL, NULL, NULL,
  'OWNED', '2024-02-01', 68000.00, 63000.00,
  18.0
),
-- VEH-006: 2023 Ford F-350 Service Truck
(
  'f0000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'SV-001', '2023 Ford F-350 Service Body', 'SERVICE_TRUCK',
  2023, 'Ford', 'F-350 Service Body', '1FD8W3HT5PED67890',
  'WV-SV001', 'WV', '2025-07-31',
  14000, NULL, 2,
  'DIESEL', 40.0,
  false, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  'INS-2024-006', '2025-12-31', 75000.00,
  'ACTIVE', 'COMPLIANT',
  NULL, NULL,
  'St. Albans Yard', 38.3856, -81.8360,
  22300, NOW() - INTERVAL '1 day',
  'SAMSARA', 'SM-SV001-2023',
  'FUELMAN-200002', 'FUELMAN',
  '2024-11-15', 21000,
  '2025-02-15', 26000, 5000,
  NULL, NULL, NULL,
  'OWNED', '2023-05-15', 75000.00, 67000.00,
  16.0
),
-- VEH-007: 2022 Freightliner M2 Water Truck
(
  'f0000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'WT-001', '2022 Freightliner M2 4000 Gal Water Truck', 'WATER_TRUCK',
  2022, 'Freightliner', 'M2 106', '1FVHCYBS1NHKL9012',
  'WV-WT001', 'WV', '2025-05-31',
  33000, NULL, 2,
  'DIESEL', 60.0,
  true, 'B', 'DOT-1234567',
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  'INS-2024-007', '2025-12-31', 125000.00,
  'ACTIVE', 'COMPLIANT',
  'b0000000-0000-0000-0000-000000000001', NULL,
  'St. Albans Yard', 38.3845, -81.8365,
  35600, NOW() - INTERVAL '8 hours',
  'GEOTAB', 'GT-WT001-2022',
  'WEX-100007', 'WEX',
  '2024-09-20', 33000,
  '2024-12-20', 48000, 15000,
  '2024-05-10', '2025-05-10', 'WV-DOT-2024-007',
  'OWNED', '2022-08-01', 125000.00, 105000.00,
  8.0
),
-- VEH-008: 2023 Peterbilt 389 Lowboy Truck (Tractor)
(
  'f0000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000001',
  'LB-001', '2023 Peterbilt 389 Lowboy Tractor', 'LOWBOY_TRUCK',
  2023, 'Peterbilt', '389', '1XPXD49X3PD901234',
  'WV-LB001', 'WV', '2025-09-30',
  52000, 150000, 3,
  'DIESEL', 150.0,
  true, 'A', 'DOT-1234567',
  'IRP-WV-00008', '2025-12-31', 'WV',
  'IFTA-WV-00008', '2025-12-31', 'WV-IFTA-008',
  'INS-2024-008', '2025-12-31', 195000.00,
  'ACTIVE', 'COMPLIANT',
  'b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
  'St. Albans Yard', 38.3850, -81.8350,
  42100, NOW() - INTERVAL '5 hours',
  'GEOTAB', 'GT-LB001-2023',
  'WEX-100008', 'WEX',
  '2024-10-05', 40000,
  '2025-01-05', 55000, 15000,
  '2024-09-01', '2025-09-01', 'WV-DOT-2024-008',
  'OWNED', '2023-03-10', 195000.00, 175000.00,
  5.0
),
-- VEH-009: 2021 Chevrolet Silverado 2500HD Pickup
(
  'f0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000001',
  'PK-002', '2021 Chevrolet Silverado 2500HD 4x4', 'PICKUP_TRUCK',
  2021, 'Chevrolet', 'Silverado 2500HD', '1GC4YPEY2MF234567',
  'WV-PK002', 'WV', '2025-02-28',
  10000, NULL, 2,
  'DIESEL', 36.0,
  false, NULL, NULL,
  NULL, NULL, NULL,
  NULL, NULL, NULL,
  'INS-2024-009', '2025-12-31', 55000.00,
  'ACTIVE', 'COMPLIANT',
  'b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000010',
  'Charleston Office', 38.3495, -81.6326,
  52800, NOW() - INTERVAL '12 hours',
  'SAMSARA', 'SM-PK002-2021',
  'FUELMAN-200003', 'FUELMAN',
  '2024-08-15', 50000,
  '2024-11-15', 55000, 5000,
  NULL, NULL, NULL,
  'OWNED', '2021-09-20', 55000.00, 42000.00,
  17.0
),
-- VEH-010: 2019 Mack Granite GR64F Tri-Axle (Older unit, higher mileage)
(
  'f0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000001',
  'DT-005', '2019 Mack Granite GR64F Tri-Axle Dump', 'DUMP_TRUCK_TRI_AXLE',
  2019, 'Mack', 'Granite GR64F', '1M2AX04C0KM012345',
  'WV-DT005', 'WV', '2025-01-31',
  54000, 80000, 3,
  'DIESEL', 100.0,
  true, 'A', 'DOT-1234567',
  'IRP-WV-00010', '2025-12-31', 'WV',
  'IFTA-WV-00010', '2025-12-31', 'WV-IFTA-010',
  'INS-2024-010', '2025-12-31', 120000.00,
  'AVAILABLE', 'WARNING',
  NULL, NULL,
  'St. Albans Yard', 38.3842, -81.8368,
  125400, NOW() - INTERVAL '2 days',
  'GEOTAB', 'GT-DT005-2019',
  'WEX-100010', 'WEX',
  '2024-07-20', 122000,
  '2024-10-20', 137000, 15000,
  '2024-01-15', '2025-01-15', 'WV-DOT-2024-010',
  'OWNED', '2019-07-01', 145000.00, 85000.00,
  5.2
)
ON CONFLICT (organization_id, vehicle_number) DO UPDATE SET
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  current_odometer = EXCLUDED.current_odometer;

-- ============================================================================
-- PART 2: Trailers
-- ============================================================================

INSERT INTO public.trailers (
  id, organization_id, trailer_number, description, trailer_type,
  year, make, model, vin,
  license_plate, license_plate_state, registration_expiry,
  gvwr_lbs, length_ft, deck_height_inches,
  last_inspection_date, next_inspection_date,
  status, current_project_id, current_location,
  current_latitude, current_longitude
) VALUES
-- TR-001: 55-Ton Lowboy
(
  'f1000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'TR-001', '2021 Fontaine 55-Ton Lowboy', 'LOWBOY',
  2021, 'Fontaine', 'Magnitude 55', '13N148205M1234567',
  'WV-TR001', 'WV', '2025-06-30',
  110000, 53.0, 18,
  '2024-06-15', '2025-06-15',
  'ACTIVE', 'b0000000-0000-0000-0000-000000000001', 'Job Site - Corridor H',
  38.9200, -79.8500
),
-- TR-002: Step Deck
(
  'f1000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'TR-002', '2020 Fontaine Step Deck', 'STEP_DECK',
  2020, 'Fontaine', 'Infinity', '13N148205L2345678',
  'WV-TR002', 'WV', '2025-04-30',
  48000, 48.0, 34,
  '2024-04-20', '2025-04-20',
  'AVAILABLE', NULL, 'St. Albans Yard',
  38.3854, -81.8362
),
-- TR-003: Equipment Trailer
(
  'f1000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'TR-003', '2022 PJ 35ft Equipment Trailer', 'EQUIPMENT_TRAILER',
  2022, 'PJ Trailers', 'HD Equipment', '4P5FS3529N1234567',
  'WV-TR003', 'WV', '2025-08-31',
  25000, 35.0, 24,
  '2024-08-01', '2025-08-01',
  'ACTIVE', 'b0000000-0000-0000-0000-000000000001', 'Job Site - Corridor H',
  38.9205, -79.8510
),
-- TR-004: Dump Trailer
(
  'f1000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'TR-004', '2023 Ranco End Dump Trailer', 'DUMP_TRAILER',
  2023, 'Ranco', 'LW21-40', '1R9LW2123P1234567',
  'WV-TR004', 'WV', '2025-10-31',
  42000, 40.0, NULL,
  '2024-10-15', '2025-10-15',
  'ACTIVE', 'b0000000-0000-0000-0000-000000000001', 'Job Site - Corridor H',
  38.9210, -79.8520
),
-- TR-005: Utility Trailer
(
  'f1000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'TR-005', '2022 Big Tex 20ft Utility Trailer', 'UTILITY_TRAILER',
  2022, 'Big Tex', '70TV-20', '16HTL2026N1234567',
  'WV-TR005', 'WV', '2025-03-31',
  10000, 20.0, 18,
  '2024-03-10', '2025-03-10',
  'AVAILABLE', NULL, 'St. Albans Yard',
  38.3850, -81.8358
)
ON CONFLICT (organization_id, trailer_number) DO NOTHING;

-- ============================================================================
-- PART 3: Fuel Cards
-- ============================================================================

INSERT INTO public.fuel_cards (
  id, organization_id, card_number, card_provider,
  assigned_to_vehicle_id, assigned_to_driver_id,
  daily_limit, weekly_limit, monthly_limit, per_transaction_limit,
  fuel_only, allowed_fuel_types, is_active, activated_date
) VALUES
-- WEX Cards for Dump Trucks
(
  'f2000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'WEX-100001', 'WEX',
  'f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
  500.00, 2500.00, 8000.00, 400.00,
  true, ARRAY['DIESEL', 'DEF'], true, '2022-04-01'
),
(
  'f2000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'WEX-100002', 'WEX',
  'f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
  500.00, 2500.00, 8000.00, 400.00,
  true, ARRAY['DIESEL', 'DEF'], true, '2023-02-01'
),
(
  'f2000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'WEX-100003', 'WEX',
  'f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003',
  500.00, 2500.00, 8000.00, 400.00,
  true, ARRAY['DIESEL', 'DEF'], true, '2021-07-01'
),
-- Fuelman Cards for Pickups
(
  'f2000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'FUELMAN-200001', 'FUELMAN',
  'f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000009',
  200.00, 800.00, 3000.00, 150.00,
  true, ARRAY['DIESEL', 'GASOLINE'], true, '2024-02-15'
),
(
  'f2000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'FUELMAN-200002', 'FUELMAN',
  'f0000000-0000-0000-0000-000000000006', NULL,
  200.00, 800.00, 3000.00, 150.00,
  true, ARRAY['DIESEL'], true, '2023-06-01'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 4: Fuel Anomaly Configuration
-- ============================================================================

INSERT INTO public.fuel_anomaly_config (
  id, organization_id,
  odometer_variance_threshold, tank_overfill_percent,
  location_variance_threshold, min_hours_between_fills,
  min_acceptable_mpg, max_acceptable_mpg
) VALUES (
  'f3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  500, 115, 100, 4, 3.5, 12.0
)
ON CONFLICT (organization_id) DO NOTHING;

-- ============================================================================
-- PART 5: Fuel Transactions (Recent month of data)
-- ============================================================================

-- Disable the anomaly check trigger temporarily to insert historical data
ALTER TABLE public.fuel_transactions DISABLE TRIGGER trg_check_fuel_anomalies;

INSERT INTO public.fuel_transactions (
  id, organization_id, fuel_card_id, vehicle_id, driver_id,
  transaction_date, transaction_time, transaction_id,
  merchant_name, merchant_address, merchant_city, merchant_state, merchant_zip,
  latitude, longitude,
  fuel_type, gallons, price_per_gallon, total_amount,
  odometer_reported, odometer_expected, odometer_variance,
  status, anomaly_flags, anomaly_score,
  project_id
) VALUES
-- DT-001 Transactions
(
  'f4000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '28 days', '07:15:00', 'WEX-TRX-20241110-001',
  'Pilot Travel Center', '1234 Highway 64', 'St. Albans', 'WV', '25177',
  38.3854, -81.8362,
  'DIESEL', 85.5, 3.459, 295.85,
  44100, 44100, 0,
  'RECONCILED', ARRAY[]::TEXT[], 0,
  'b0000000-0000-0000-0000-000000000001'
),
(
  'f4000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '25 days', '16:30:00', 'WEX-TRX-20241113-001',
  'Love''s Travel Stop', '5678 Interstate Dr', 'Charleston', 'WV', '25301',
  38.3495, -81.6326,
  'DIESEL', 92.0, 3.429, 315.47,
  44580, 44550, 30,
  'APPROVED', ARRAY[]::TEXT[], 0,
  'b0000000-0000-0000-0000-000000000001'
),
(
  'f4000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  CURRENT_DATE - INTERVAL '21 days', '08:00:00', 'WEX-TRX-20241117-001',
  'Pilot Travel Center', '1234 Highway 64', 'St. Albans', 'WV', '25177',
  38.3854, -81.8362,
  'DIESEL', 88.0, 3.479, 306.15,
  45050, 45000, 50,
  'APPROVED', ARRAY[]::TEXT[], 0,
  'b0000000-0000-0000-0000-000000000001'
),
-- DT-002 Transactions
(
  'f4000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000002',
  CURRENT_DATE - INTERVAL '26 days', '06:45:00', 'WEX-TRX-20241112-002',
  'Pilot Travel Center', '1234 Highway 64', 'St. Albans', 'WV', '25177',
  38.3854, -81.8362,
  'DIESEL', 105.0, 3.459, 363.20,
  27800, 27800, 0,
  'RECONCILED', ARRAY[]::TEXT[], 0,
  'b0000000-0000-0000-0000-000000000001'
),
(
  'f4000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000002',
  CURRENT_DATE - INTERVAL '20 days', '17:00:00', 'WEX-TRX-20241118-002',
  'TA Travel Center', '9012 Route 60', 'Huntington', 'WV', '25702',
  38.4192, -82.4452,
  'DIESEL', 110.0, 3.449, 379.39,
  28250, 28200, 50,
  'APPROVED', ARRAY[]::TEXT[], 0,
  'b0000000-0000-0000-0000-000000000001'
),
-- FLAGGED Transaction (Example anomaly)
(
  'f4000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000003',
  'f0000000-0000-0000-0000-000000000003',
  'd0000000-0000-0000-0000-000000000003',
  CURRENT_DATE - INTERVAL '15 days', '22:30:00', 'WEX-TRX-20241123-003',
  'Unknown Station', '1234 Unknown Rd', 'Somewhere', 'OH', '45678',
  39.9612, -82.9988,  -- Columbus OH - far from normal operating area
  'DIESEL', 95.0, 3.399, 322.91,
  67200, 67890, 690,  -- Large odometer variance
  'FLAGGED', ARRAY['ODOMETER_VARIANCE', 'LOCATION_MISMATCH'], 65,
  'b0000000-0000-0000-0000-000000000001'
),
-- Pickup Transactions
(
  'f4000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000004',
  'f0000000-0000-0000-0000-000000000005',
  'd0000000-0000-0000-0000-000000000009',
  CURRENT_DATE - INTERVAL '22 days', '12:15:00', 'FM-TRX-20241116-001',
  'Sheetz', '456 Main St', 'Charleston', 'WV', '25301',
  38.3510, -81.6340,
  'DIESEL', 28.5, 3.599, 102.57,
  8100, 8100, 0,
  'APPROVED', ARRAY[]::TEXT[], 0,
  'b0000000-0000-0000-0000-000000000001'
),
(
  'f4000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000001',
  'f2000000-0000-0000-0000-000000000004',
  'f0000000-0000-0000-0000-000000000005',
  'd0000000-0000-0000-0000-000000000009',
  CURRENT_DATE - INTERVAL '10 days', '14:30:00', 'FM-TRX-20241128-001',
  'Go Mart', '789 Route 119', 'Elkins', 'WV', '26241',
  38.9257, -79.8466,
  'DIESEL', 30.0, 3.579, 107.37,
  8400, 8400, 0,
  'APPROVED', ARRAY[]::TEXT[], 0,
  'b0000000-0000-0000-0000-000000000001'
)
ON CONFLICT DO NOTHING;

-- Re-enable the anomaly check trigger
ALTER TABLE public.fuel_transactions ENABLE TRIGGER trg_check_fuel_anomalies;

-- ============================================================================
-- PART 6: Vehicle Inspections
-- ============================================================================

-- Disable DOT status trigger to insert historical data
ALTER TABLE public.vehicle_inspections DISABLE TRIGGER trg_update_dot_status;

INSERT INTO public.vehicle_inspections (
  id, vehicle_id, inspection_type, inspection_date,
  inspector_name, inspector_company, inspector_certification,
  result, odometer_reading,
  defects, defect_count, critical_defects,
  sticker_number, expiration_date,
  inspection_cost, repair_cost,
  next_inspection_due, notes
) VALUES
-- DT-001 Inspections
(
  'f5000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'DOT_ANNUAL', '2024-08-01',
  'John Smith', 'WV State Inspection', 'WV-INSP-12345',
  'PASS', 42000,
  '[]'::jsonb, 0, 0,
  'WV-DOT-2024-001', '2025-08-01',
  85.00, 0.00,
  '2025-08-01', 'Annual DOT inspection - all items passed'
),
(
  'f5000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000001',
  'PRE_TRIP', CURRENT_DATE - INTERVAL '1 day',
  'James Morrison', NULL, NULL,
  'PASS', 45200,
  '[]'::jsonb, 0, 0,
  NULL, NULL,
  0.00, 0.00,
  NULL, 'Daily pre-trip inspection'
),
-- DT-002 Inspections
(
  'f5000000-0000-0000-0000-000000000003',
  'f0000000-0000-0000-0000-000000000002',
  'DOT_ANNUAL', '2024-09-15',
  'Mike Johnson', 'WV State Inspection', 'WV-INSP-23456',
  'PASS', 26500,
  '[]'::jsonb, 0, 0,
  'WV-DOT-2024-002', '2025-09-15',
  85.00, 0.00,
  '2025-09-15', 'Annual DOT inspection - passed'
),
-- DT-004 with defects (why it's in maintenance)
(
  'f5000000-0000-0000-0000-000000000004',
  'f0000000-0000-0000-0000-000000000004',
  'PRE_TRIP', CURRENT_DATE - INTERVAL '3 days',
  'Robert Anderson', NULL, NULL,
  'PASS_WITH_DEFECTS', 89150,
  '[{"defect": "Air brake pressure gauge fluctuating", "severity": "MAJOR", "corrected": false}, {"defect": "Left turn signal intermittent", "severity": "MINOR", "corrected": false}]'::jsonb,
  2, 0,
  NULL, NULL,
  0.00, 0.00,
  NULL, 'Found issues during pre-trip, sent to shop'
),
-- Water Truck
(
  'f5000000-0000-0000-0000-000000000005',
  'f0000000-0000-0000-0000-000000000007',
  'DOT_ANNUAL', '2024-05-10',
  'John Smith', 'WV State Inspection', 'WV-INSP-12345',
  'PASS', 32500,
  '[]'::jsonb, 0, 0,
  'WV-DOT-2024-007', '2025-05-10',
  85.00, 0.00,
  '2025-05-10', 'Annual DOT inspection - passed'
),
-- Lowboy
(
  'f5000000-0000-0000-0000-000000000006',
  'f0000000-0000-0000-0000-000000000008',
  'DOT_ANNUAL', '2024-09-01',
  'Mike Johnson', 'WV State Inspection', 'WV-INSP-23456',
  'PASS', 40000,
  '[]'::jsonb, 0, 0,
  'WV-DOT-2024-008', '2025-09-01',
  85.00, 0.00,
  '2025-09-01', 'Annual DOT inspection - passed'
),
-- DT-005 (older truck with upcoming inspection)
(
  'f5000000-0000-0000-0000-000000000007',
  'f0000000-0000-0000-0000-000000000010',
  'DOT_ANNUAL', '2024-01-15',
  'John Smith', 'WV State Inspection', 'WV-INSP-12345',
  'PASS', 115000,
  '[]'::jsonb, 0, 0,
  'WV-DOT-2024-010', '2025-01-15',
  85.00, 0.00,
  '2025-01-15', 'Annual DOT inspection - passed (due soon for renewal)'
)
ON CONFLICT DO NOTHING;

-- Re-enable DOT status trigger
ALTER TABLE public.vehicle_inspections ENABLE TRIGGER trg_update_dot_status;

-- ============================================================================
-- PART 7: Driver Qualification Files
-- ============================================================================

-- Disable DQF status trigger to insert data
ALTER TABLE public.driver_qualification_files DISABLE TRIGGER trg_update_dqf_status;

INSERT INTO public.driver_qualification_files (
  id, driver_id, organization_id,
  cdl_number, cdl_state, cdl_class, cdl_endorsements, cdl_restrictions,
  cdl_expiry, cdl_verified, cdl_verified_date,
  medical_card_expiry, medical_examiner_name, medical_examiner_npi,
  last_mvr_date, mvr_result, mvr_violations_count, mvr_accidents_count, next_mvr_due,
  clearinghouse_query_date, clearinghouse_status, clearinghouse_consent_on_file,
  psp_report_date, psp_inspection_count, psp_violation_count, psp_crash_count,
  dqf_status, status_updated_at,
  hire_date, application_date, road_test_date
) VALUES
-- James Morrison - Complete DQF
(
  'f6000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'WV-CDL-123456', 'WV', 'A', ARRAY['T', 'N'], ARRAY[]::TEXT[],
  '2026-03-15', true, '2024-01-15',
  '2025-06-30', 'Dr. Robert Smith', '1234567890',
  '2024-06-01', 'CLEAR', 0, 0, '2025-06-01',
  '2024-01-10', 'CLEAR', true,
  '2024-01-05', 8, 0, 0,
  'COMPLETE', NOW(),
  '2018-05-15', '2018-05-01', '2018-05-10'
),
-- Robert Anderson - Complete DQF
(
  'f6000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'WV-CDL-234567', 'WV', 'B', ARRAY['T'], ARRAY[]::TEXT[],
  '2025-08-20', true, '2024-02-10',
  '2025-04-15', 'Dr. Sarah Johnson', '2345678901',
  '2024-07-15', 'CLEAR', 0, 0, '2025-07-15',
  '2024-01-15', 'CLEAR', true,
  '2024-01-12', 5, 0, 0,
  'COMPLETE', NOW(),
  '2019-08-01', '2019-07-20', '2019-07-25'
),
-- Joseph Davis - Complete DQF
(
  'f6000000-0000-0000-0000-000000000003',
  'd0000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'WV-CDL-345678', 'WV', 'A', ARRAY['T', 'N', 'H'], ARRAY[]::TEXT[],
  '2025-11-30', true, '2024-03-01',
  '2025-09-01', 'Dr. Mike Williams', '3456789012',
  '2024-09-01', 'CLEAR', 0, 0, '2025-09-01',
  '2024-03-15', 'CLEAR', true,
  '2024-03-10', 3, 0, 0,
  'COMPLETE', NOW(),
  '2020-03-15', '2020-03-01', '2020-03-10'
),
-- Steve Williams (Foreman) - Complete DQF with minor violation
(
  'f6000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000001',
  'WV-CDL-456789', 'WV', 'A', ARRAY['T', 'N'], ARRAY[]::TEXT[],
  '2026-06-30', true, '2024-01-20',
  '2025-12-31', 'Dr. Robert Smith', '1234567890',
  '2024-08-01', 'VIOLATIONS', 1, 0, '2025-08-01',
  '2024-01-25', 'CLEAR', true,
  '2024-01-22', 12, 1, 0,
  'COMPLETE', NOW(),
  '2015-06-01', '2015-05-15', '2015-05-20'
),
-- Chris Walker (Foreman) - Medical expiring soon
(
  'f6000000-0000-0000-0000-000000000005',
  'd0000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000001',
  'WV-CDL-567890', 'WV', 'A', ARRAY['T'], ARRAY[]::TEXT[],
  '2025-12-15', true, '2024-02-01',
  CURRENT_DATE + INTERVAL '20 days', 'Dr. Sarah Johnson', '2345678901',  -- Expiring soon!
  '2024-05-15', 'CLEAR', 0, 0, '2025-05-15',
  '2024-02-05', 'CLEAR', true,
  '2024-02-02', 10, 0, 0,
  'EXPIRED', NOW(),  -- Will show as expiring due to medical
  '2016-09-01', '2016-08-15', '2016-08-20'
)
ON CONFLICT (driver_id) DO UPDATE SET
  cdl_expiry = EXCLUDED.cdl_expiry,
  medical_card_expiry = EXCLUDED.medical_card_expiry,
  dqf_status = EXCLUDED.dqf_status;

-- Re-enable DQF status trigger
ALTER TABLE public.driver_qualification_files ENABLE TRIGGER trg_update_dqf_status;

-- ============================================================================
-- PART 8: DQF Documents
-- ============================================================================

INSERT INTO public.dqf_documents (
  id, dqf_id, document_type, is_required,
  document_url, document_date, expiry_date,
  verified, verified_by, verified_at
) VALUES
-- James Morrison Documents
(
  'f7000000-0000-0000-0000-000000000001',
  'f6000000-0000-0000-0000-000000000001',
  'APPLICATION', true,
  'https://storage.triton.com/dqf/morrison-application.pdf', '2018-05-01', NULL,
  true, NULL, '2018-05-02'
),
(
  'f7000000-0000-0000-0000-000000000002',
  'f6000000-0000-0000-0000-000000000001',
  'CDL_COPY', true,
  'https://storage.triton.com/dqf/morrison-cdl.pdf', '2024-01-15', '2026-03-15',
  true, NULL, '2024-01-16'
),
(
  'f7000000-0000-0000-0000-000000000003',
  'f6000000-0000-0000-0000-000000000001',
  'MEDICAL_CARD', true,
  'https://storage.triton.com/dqf/morrison-medical.pdf', '2024-06-30', '2025-06-30',
  true, NULL, '2024-07-01'
),
(
  'f7000000-0000-0000-0000-000000000004',
  'f6000000-0000-0000-0000-000000000001',
  'MVR', true,
  'https://storage.triton.com/dqf/morrison-mvr.pdf', '2024-06-01', '2025-06-01',
  true, NULL, '2024-06-02'
),
-- Robert Anderson Documents
(
  'f7000000-0000-0000-0000-000000000005',
  'f6000000-0000-0000-0000-000000000002',
  'APPLICATION', true,
  'https://storage.triton.com/dqf/anderson-application.pdf', '2019-07-20', NULL,
  true, NULL, '2019-07-21'
),
(
  'f7000000-0000-0000-0000-000000000006',
  'f6000000-0000-0000-0000-000000000002',
  'CDL_COPY', true,
  'https://storage.triton.com/dqf/anderson-cdl.pdf', '2024-02-10', '2025-08-20',
  true, NULL, '2024-02-11'
),
(
  'f7000000-0000-0000-0000-000000000007',
  'f6000000-0000-0000-0000-000000000002',
  'MEDICAL_CARD', true,
  'https://storage.triton.com/dqf/anderson-medical.pdf', '2024-04-15', '2025-04-15',
  true, NULL, '2024-04-16'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 9: Vehicle Maintenance Records
-- ============================================================================

INSERT INTO public.vehicle_maintenance (
  id, vehicle_id, maintenance_type, priority,
  title, description, work_performed,
  status, scheduled_date, started_at, completed_at,
  odometer_at_service, service_location, vendor_name,
  labor_hours, labor_cost, parts_cost, total_cost,
  parts_used, next_service_odometer, next_service_date,
  project_id
) VALUES
-- DT-001 Recent Service
(
  'f8000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'preventive', 'normal',
  '15K Mile Service', 'Routine preventive maintenance service',
  'Changed oil and filters, inspected brakes, checked all fluid levels, lubed chassis',
  'completed', '2024-10-15', '2024-10-15 08:00:00', '2024-10-15 12:00:00',
  42500, 'St. Albans Shop', 'Triton Maintenance',
  4.0, 200.00, 350.00, 550.00,
  '[{"part": "Oil Filter", "qty": 1, "cost": 45.00}, {"part": "Engine Oil 15W-40", "qty": 12, "cost": 180.00}, {"part": "Fuel Filter", "qty": 2, "cost": 125.00}]'::jsonb,
  57500, '2025-01-15',
  'b0000000-0000-0000-0000-000000000001'
),
-- DT-004 In Progress (why it's IN_MAINTENANCE)
(
  'f8000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000004',
  'repair', 'high',
  'Air Brake System Repair', 'Air brake pressure gauge fluctuating, left turn signal intermittent',
  NULL,
  'in_progress', CURRENT_DATE - INTERVAL '2 days', (CURRENT_DATE - INTERVAL '2 days')::TIMESTAMP + TIME '09:00:00', NULL,
  89200, 'St. Albans Shop', 'Triton Maintenance',
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL
),
-- Scheduled Service for DT-002
(
  'f8000000-0000-0000-0000-000000000003',
  'f0000000-0000-0000-0000-000000000002',
  'preventive', 'normal',
  '15K Mile Service', 'Routine preventive maintenance service',
  NULL,
  'scheduled', '2025-02-20', NULL, NULL,
  NULL, 'St. Albans Shop', NULL,
  NULL, NULL, NULL, NULL,
  NULL, NULL, NULL,
  NULL
),
-- Past Service for DT-003
(
  'f8000000-0000-0000-0000-000000000004',
  'f0000000-0000-0000-0000-000000000003',
  'preventive', 'normal',
  '15K Mile Service', 'Routine preventive maintenance service',
  'Changed oil and filters, inspected brakes, topped off DEF',
  'completed', '2024-09-10', '2024-09-10 07:00:00', '2024-09-10 10:30:00',
  65000, 'St. Albans Shop', 'Triton Maintenance',
  3.5, 175.00, 310.00, 485.00,
  '[{"part": "Oil Filter", "qty": 1, "cost": 45.00}, {"part": "Engine Oil 15W-40", "qty": 12, "cost": 180.00}, {"part": "DEF", "qty": 5, "cost": 85.00}]'::jsonb,
  80000, '2024-12-10',
  'b0000000-0000-0000-0000-000000000001'
),
-- Pickup Service
(
  'f8000000-0000-0000-0000-000000000005',
  'f0000000-0000-0000-0000-000000000005',
  'preventive', 'normal',
  '5K Mile Service', 'Routine oil change and inspection',
  'Changed oil and filter, rotated tires, inspected brakes',
  'completed', '2024-10-01', '2024-10-01 08:00:00', '2024-10-01 09:30:00',
  7500, 'Ford Dealership', 'Joe Holland Ford',
  1.5, 75.00, 95.00, 170.00,
  '[{"part": "Oil Filter", "qty": 1, "cost": 25.00}, {"part": "Motorcraft Oil 5W-30", "qty": 8, "cost": 70.00}]'::jsonb,
  12500, '2025-01-01',
  NULL
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- PART 10: IFTA Report (Sample Quarter)
-- ============================================================================

INSERT INTO public.ifta_reports (
  id, organization_id,
  report_year, report_quarter, period_start, period_end,
  total_miles, total_gallons, avg_mpg,
  jurisdiction_details,
  net_tax_due, tax_credits, tax_owed,
  filed, filed_date, confirmation_number,
  paid, paid_date, paid_amount, payment_reference
) VALUES
(
  'f9000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  2024, 3, '2024-07-01', '2024-09-30',
  125000, 22500, 5.56,
  '[
    {"state": "WV", "miles": 85000, "gallons": 15300, "tax_rate": 0.35, "fuel_purchased": 18500, "tax_due": -1120.00},
    {"state": "VA", "miles": 22000, "gallons": 3960, "tax_rate": 0.262, "fuel_purchased": 2500, "tax_due": 382.59},
    {"state": "OH", "miles": 12000, "gallons": 2160, "tax_rate": 0.38, "fuel_purchased": 1000, "tax_due": 440.80},
    {"state": "PA", "miles": 6000, "gallons": 1080, "tax_rate": 0.75, "fuel_purchased": 500, "tax_due": 435.00}
  ]'::jsonb,
  138.39, 0.00, 138.39,
  true, '2024-10-31', 'IFTA-2024-Q3-001',
  true, '2024-11-01', 138.39, 'ACH-20241101-001'
)
ON CONFLICT (organization_id, report_year, report_quarter) DO NOTHING;

-- ============================================================================
-- PART 11: Vehicle Location Breadcrumbs (Sample GPS data)
-- ============================================================================

INSERT INTO public.vehicle_locations (
  id, vehicle_id, latitude, longitude, altitude_ft, heading_degrees, speed_mph,
  odometer, address, city, state, jurisdiction_state,
  geofence_id, project_id, source, engine_running, recorded_at
) VALUES
-- DT-001 Recent locations
(
  'fa000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  38.3854, -81.8362, 620, 45, 0,
  45200, '1234 Highway 64', 'St. Albans', 'WV', 'WV',
  NULL, 'b0000000-0000-0000-0000-000000000001', 'GEOTAB', false, NOW() - INTERVAL '1 day'
),
(
  'fa000000-0000-0000-0000-000000000002',
  'f0000000-0000-0000-0000-000000000001',
  38.9200, -79.8500, 2800, 90, 35,
  45180, 'Corridor H Job Site', 'Elkins', 'WV', 'WV',
  NULL, 'b0000000-0000-0000-0000-000000000001', 'GEOTAB', true, NOW() - INTERVAL '1 day' - INTERVAL '4 hours'
),
-- DT-002 locations
(
  'fa000000-0000-0000-0000-000000000003',
  'f0000000-0000-0000-0000-000000000002',
  38.3860, -81.8370, 618, 180, 0,
  28450, 'St. Albans Yard', 'St. Albans', 'WV', 'WV',
  NULL, 'b0000000-0000-0000-0000-000000000001', 'GEOTAB', false, NOW() - INTERVAL '2 hours'
),
(
  'fa000000-0000-0000-0000-000000000004',
  'f0000000-0000-0000-0000-000000000002',
  38.9205, -79.8510, 2795, 270, 42,
  28420, 'Corridor H Job Site', 'Elkins', 'WV', 'WV',
  NULL, 'b0000000-0000-0000-0000-000000000001', 'GEOTAB', true, NOW() - INTERVAL '6 hours'
),
-- Pickup locations
(
  'fa000000-0000-0000-0000-000000000005',
  'f0000000-0000-0000-0000-000000000005',
  38.3852, -81.8358, 622, 0, 0,
  8500, 'St. Albans Yard', 'St. Albans', 'WV', 'WV',
  NULL, 'b0000000-0000-0000-0000-000000000001', 'SAMSARA', false, NOW() - INTERVAL '4 hours'
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMPLETION NOTICE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 091: Vehicle Fleet Seed Data completed successfully';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 10 Vehicles (dump trucks, pickups, service trucks, water truck, lowboy)';
    RAISE NOTICE '  - 5 Trailers (lowboy, step deck, equipment, dump, utility)';
    RAISE NOTICE '  - 5 Fuel Cards';
    RAISE NOTICE '  - Fuel Anomaly Configuration';
    RAISE NOTICE '  - 8 Fuel Transactions (including 1 flagged anomaly)';
    RAISE NOTICE '  - 7 Vehicle Inspections (DOT annual and pre-trip)';
    RAISE NOTICE '  - 5 Driver Qualification Files';
    RAISE NOTICE '  - 7 DQF Documents';
    RAISE NOTICE '  - 5 Vehicle Maintenance Records';
    RAISE NOTICE '  - 1 IFTA Report (Q3 2024)';
    RAISE NOTICE '  - 5 Vehicle Location Breadcrumbs';
END $$;
