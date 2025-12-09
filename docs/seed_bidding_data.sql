-- ============================================================
-- TRITON CONSTRUCTION AI OPERATIONS PLATFORM
-- SEED DATA FOR SAMPLE BIDDING SYSTEM
-- ============================================================
-- 
-- Execute in order:
-- 1. Enums and base tables (009_bidding_engine.sql)
-- 2. This file (seed_bidding_data.sql)
--
-- Total seed data:
-- - 50+ WVDOH Master Item Codes
-- - 82 Internal Cost Codes (8 divisions)
-- - 15+ Assembly Templates with component lines
-- - Davis-Bacon Wage Rates (WV Highway Construction)
-- - Sample Equipment Fleet (20 pieces)
-- - Sample Suppliers (10 vendors)
-- - Sample Bid Proposal (Triplett Bridge)
-- - Indirect Cost Categories
-- - Markup Layer Defaults
-- ============================================================

-- ============================================================
-- PART 1: MASTER WVDOH ITEM CODES
-- ============================================================

INSERT INTO master_wvdoh_items (id, item_code, description, unit, division, category, spec_section, typical_unit_price_low, typical_unit_price_high, requires_assembly, common_related_items, notes, is_active) VALUES

-- DIVISION 100 - GENERAL REQUIREMENTS
(gen_random_uuid(), '109010-000', 'MOBILIZATION', 'LS', '100', 'GENERAL', 'Section 109', 50000.00, 500000.00, false, ARRAY['109020-000'], 'Typically 5-10% of project total', true),
(gen_random_uuid(), '109020-000', 'DEMOBILIZATION', 'LS', '100', 'GENERAL', 'Section 109', 10000.00, 100000.00, false, ARRAY['109010-000'], 'Usually included with mobilization', true),
(gen_random_uuid(), '104010-000', 'MAINTENANCE OF TRAFFIC', 'LS', '100', 'GENERAL', 'Section 104', 25000.00, 250000.00, true, ARRAY['104020-000'], 'Project-wide traffic control', true),
(gen_random_uuid(), '105010-000', 'FIELD OFFICE', 'MONTH', '100', 'GENERAL', 'Section 105', 2500.00, 8000.00, false, NULL, 'Monthly rental for WVDOH inspector', true),

-- DIVISION 200 - EARTHWORK
(gen_random_uuid(), '201001-000', 'CLEARING AND GRUBBING', 'ACRE', '200', 'EARTHWORK', 'Section 201', 3000.00, 15000.00, true, ARRAY['207001-000'], 'Includes disposal', true),
(gen_random_uuid(), '203001-000', 'DISMANTLING STRUCTURES', 'LS', '200', 'EARTHWORK', 'Section 203', 25000.00, 500000.00, true, NULL, 'Bridge demolition', true),
(gen_random_uuid(), '204001-000', 'MOBILIZATION', 'LS', '200', 'EARTHWORK', 'Section 204', 50000.00, 500000.00, false, NULL, 'Earthwork mobilization', true),
(gen_random_uuid(), '207001-000', 'EXCAVATION, UNCLASSIFIED', 'CY', '200', 'EARTHWORK', 'Section 207', 8.00, 25.00, true, ARRAY['207002-000', '211001-000'], 'Common excavation', true),
(gen_random_uuid(), '207002-000', 'EMBANKMENT', 'CY', '200', 'EARTHWORK', 'Section 207', 10.00, 30.00, true, ARRAY['207001-000'], 'Fill placement and compaction', true),
(gen_random_uuid(), '211001-000', 'BORROW EXCAVATION', 'CY', '200', 'EARTHWORK', 'Section 211', 15.00, 35.00, true, NULL, 'Off-site material', true),
(gen_random_uuid(), '212001-000', 'STRUCTURE EXCAVATION, UNCLASSIFIED', 'CY', '200', 'EARTHWORK', 'Section 212', 20.00, 75.00, true, ARRAY['212002-000', '212003-000'], 'Bridge foundation excavation', true),
(gen_random_uuid(), '212002-000', 'STRUCTURE EXCAVATION, ROCK', 'CY', '200', 'EARTHWORK', 'Section 212', 50.00, 150.00, true, NULL, 'Rock excavation at structures', true),
(gen_random_uuid(), '212003-000', 'STRUCTURE EXCAVATION, WET', 'CY', '200', 'EARTHWORK', 'Section 212', 35.00, 100.00, true, NULL, 'Dewatering required', true),

-- DIVISION 300 - BASES
(gen_random_uuid(), '307001-000', 'CRUSHED AGGREGATE BASE COURSE', 'TON', '300', 'BASE', 'Section 307', 20.00, 45.00, true, NULL, 'CABC material', true),
(gen_random_uuid(), '311001-000', 'OPEN GRADED FREE DRAINING BASE', 'TON', '300', 'BASE', 'Section 311', 25.00, 55.00, true, NULL, 'OGFDB material', true),

-- DIVISION 400 - ASPHALT
(gen_random_uuid(), '401001-000', 'ASPHALT BASE COURSE', 'TON', '400', 'ASPHALT', 'Section 401', 75.00, 120.00, true, ARRAY['408001-000'], 'Base mix', true),
(gen_random_uuid(), '401002-000', 'ASPHALT WEARING COURSE', 'TON', '400', 'ASPHALT', 'Section 401', 80.00, 130.00, true, ARRAY['408001-000'], 'Surface mix', true),
(gen_random_uuid(), '408001-000', 'TACK COAT', 'GAL', '400', 'ASPHALT', 'Section 408', 2.50, 5.00, true, NULL, 'Emulsion application', true),
(gen_random_uuid(), '415001-000', 'MILLING ASPHALT PAVEMENT', 'SY', '400', 'ASPHALT', 'Section 415', 2.00, 6.00, true, NULL, 'Surface removal', true),

-- DIVISION 500 - CONCRETE PAVEMENT
(gen_random_uuid(), '501001-000', 'PCC PAVEMENT', 'SY', '500', 'CONCRETE', 'Section 501', 50.00, 100.00, true, NULL, 'Concrete roadway', true),
(gen_random_uuid(), '502001-000', 'APPROACH SLABS', 'SY', '500', 'CONCRETE', 'Section 502', 150.00, 350.00, true, NULL, 'Bridge approach slabs', true),

-- DIVISION 600 - STRUCTURES (BRIDGES)
(gen_random_uuid(), '601001-000', 'STRUCTURAL CONCRETE, CLASS A', 'CY', '600', 'CONCRETE', 'Section 601', 600.00, 1200.00, true, ARRAY['602001-000', '607001-000'], 'General structural concrete', true),
(gen_random_uuid(), '601002-000', 'STRUCTURAL CONCRETE, CLASS AA', 'CY', '600', 'CONCRETE', 'Section 601', 650.00, 1300.00, true, ARRAY['602001-000'], 'High-strength structural', true),
(gen_random_uuid(), '601003-000', 'STRUCTURAL CONCRETE, CLASS DS', 'CY', '600', 'CONCRETE', 'Section 601', 700.00, 1400.00, true, ARRAY['602001-000'], 'Deck slab concrete', true),
(gen_random_uuid(), '601009-001', 'STRUCTURAL CONCRETE, CLASS H', 'CY', '600', 'CONCRETE', 'Section 601', 750.00, 1500.00, true, ARRAY['602001-000', '602002-000'], 'High-performance deck concrete', true),
(gen_random_uuid(), '602001-000', 'REINFORCING STEEL, EPOXY COATED', 'LB', '600', 'STEEL', 'Section 602', 0.80, 1.50, true, ARRAY['601009-001'], 'Epoxy-coated rebar', true),
(gen_random_uuid(), '602002-000', 'REINFORCING STEEL, UNCOATED', 'LB', '600', 'STEEL', 'Section 602', 0.60, 1.20, true, NULL, 'Standard rebar', true),
(gen_random_uuid(), '603001-000', 'STRUCTURAL STEEL', 'LB', '600', 'STEEL', 'Section 603', 2.00, 5.00, true, NULL, 'Bridge steel members', true),
(gen_random_uuid(), '607001-000', 'CONCRETE CURING COMPOUND', 'GAL', '600', 'CONCRETE', 'Section 607', 15.00, 35.00, true, NULL, 'Membrane curing', true),
(gen_random_uuid(), '615001-000', 'ELASTOMERIC BEARING PAD', 'EA', '600', 'BEARING', 'Section 615', 500.00, 3000.00, true, NULL, 'Bridge bearings', true),
(gen_random_uuid(), '615029-000', 'ELASTOMERIC BEARING ASSEMBLY', 'EA', '600', 'BEARING', 'Section 615', 1500.00, 8000.00, true, NULL, 'Complete bearing unit', true),
(gen_random_uuid(), '617001-000', 'CONCRETE DECK OVERLAY', 'SY', '600', 'CONCRETE', 'Section 617', 40.00, 100.00, true, ARRAY['679001-000'], 'Thin overlay', true),
(gen_random_uuid(), '625001-000', 'PRESTRESSED CONCRETE BEAM', 'LF', '600', 'CONCRETE', 'Section 625', 200.00, 500.00, true, NULL, 'Precast beams', true),
(gen_random_uuid(), '627001-000', 'EXPANSION JOINT, COMPRESSION SEAL', 'LF', '600', 'JOINT', 'Section 627', 50.00, 150.00, true, NULL, 'Compression seal joints', true),
(gen_random_uuid(), '627002-000', 'EXPANSION JOINT, SILICONE FOAM', 'LF', '600', 'JOINT', 'Section 627', 75.00, 200.00, true, NULL, 'Silicone foam joints (SP 627)', true),
(gen_random_uuid(), '679001-000', 'HYDRODEMOLITION', 'SY', '600', 'DEMOLITION', 'Section 679', 25.00, 75.00, true, ARRAY['617001-000'], 'Water blasting removal', true),

-- DIVISION 700 - INCIDENTALS
(gen_random_uuid(), '705001-000', 'GUARDRAIL, W-BEAM', 'LF', '700', 'GUARDRAIL', 'Section 705', 25.00, 50.00, true, ARRAY['705002-000'], 'Single-face W-beam', true),
(gen_random_uuid(), '705002-000', 'GUARDRAIL END TREATMENT', 'EA', '700', 'GUARDRAIL', 'Section 705', 1500.00, 4000.00, true, NULL, 'Crash-tested terminals', true),
(gen_random_uuid(), '705080-000', 'GUARDRAIL, W-BEAM, SINGLE FACE', 'LF', '700', 'GUARDRAIL', 'Section 705', 28.00, 55.00, true, NULL, 'Standard W-beam installation', true),
(gen_random_uuid(), '711001-000', 'TEMPORARY TRAFFIC CONTROL DEVICES', 'LS', '700', 'TRAFFIC', 'Section 711', 5000.00, 100000.00, true, NULL, 'Signs, barricades, etc.', true),
(gen_random_uuid(), '711002-000', 'TRAFFIC CONTROL, FLAGGING', 'HR', '700', 'TRAFFIC', 'Section 711', 35.00, 65.00, true, NULL, 'Flagger labor', true),
(gen_random_uuid(), '715001-000', 'TEMPORARY EROSION CONTROL', 'LS', '700', 'EROSION', 'Section 715', 10000.00, 50000.00, true, NULL, 'Silt fence, inlet protection', true),
(gen_random_uuid(), '716001-000', 'SEEDING AND MULCHING', 'ACRE', '700', 'SEEDING', 'Section 716', 2000.00, 6000.00, true, NULL, 'Permanent seeding', true),
(gen_random_uuid(), '720001-000', 'DRAINAGE PIPE, 18 IN', 'LF', '700', 'DRAINAGE', 'Section 720', 35.00, 80.00, true, NULL, 'Corrugated pipe', true),
(gen_random_uuid(), '720002-000', 'DRAINAGE PIPE, 24 IN', 'LF', '700', 'DRAINAGE', 'Section 720', 45.00, 100.00, true, NULL, 'Corrugated pipe', true),
(gen_random_uuid(), '725001-000', 'CONCRETE INLET', 'EA', '700', 'DRAINAGE', 'Section 725', 2000.00, 5000.00, true, NULL, 'Drop inlet structure', true),
(gen_random_uuid(), '729001-000', 'RIPRAP, CLASS 1', 'TON', '700', 'EROSION', 'Section 729', 40.00, 80.00, true, NULL, 'Slope protection', true),
(gen_random_uuid(), '729002-000', 'RIPRAP, CLASS 2', 'TON', '700', 'EROSION', 'Section 729', 45.00, 90.00, true, NULL, 'Channel protection', true);


-- ============================================================
-- PART 2: INTERNAL COST CODES (82 codes, 8 divisions)
-- ============================================================

INSERT INTO cost_codes (id, code, description, division, category, is_labor, is_equipment, is_material, is_subcontract, default_unit, typical_unit_cost, is_active) VALUES

-- DIVISION 01: GENERAL REQUIREMENTS (18 codes)
(gen_random_uuid(), '01-100', 'Project Management Labor', '01', 'GENERAL', true, false, false, false, 'HR', 85.00, true),
(gen_random_uuid(), '01-110', 'Superintendent Labor', '01', 'GENERAL', true, false, false, false, 'HR', 95.00, true),
(gen_random_uuid(), '01-120', 'Foreman Labor', '01', 'GENERAL', true, false, false, false, 'HR', 75.00, true),
(gen_random_uuid(), '01-200', 'Mobilization Equipment', '01', 'GENERAL', false, true, false, false, 'EA', 5000.00, true),
(gen_random_uuid(), '01-210', 'Demobilization Equipment', '01', 'GENERAL', false, true, false, false, 'EA', 3000.00, true),
(gen_random_uuid(), '01-300', 'Field Office Rental', '01', 'GENERAL', false, false, true, false, 'MONTH', 3500.00, true),
(gen_random_uuid(), '01-310', 'Field Office Utilities', '01', 'GENERAL', false, false, true, false, 'MONTH', 500.00, true),
(gen_random_uuid(), '01-320', 'Sanitary Facilities', '01', 'GENERAL', false, false, true, false, 'MONTH', 400.00, true),
(gen_random_uuid(), '01-400', 'Survey Labor', '01', 'GENERAL', true, false, false, false, 'HR', 65.00, true),
(gen_random_uuid(), '01-410', 'Survey Equipment', '01', 'GENERAL', false, true, false, false, 'DAY', 250.00, true),
(gen_random_uuid(), '01-500', 'Quality Control Labor', '01', 'GENERAL', true, false, false, false, 'HR', 55.00, true),
(gen_random_uuid(), '01-510', 'Testing Services', '01', 'GENERAL', false, false, false, true, 'EA', 150.00, true),
(gen_random_uuid(), '01-600', 'Safety Equipment', '01', 'GENERAL', false, false, true, false, 'LS', 5000.00, true),
(gen_random_uuid(), '01-610', 'Safety Training', '01', 'GENERAL', true, false, false, false, 'HR', 45.00, true),
(gen_random_uuid(), '01-700', 'Temporary Power', '01', 'GENERAL', false, false, true, false, 'MONTH', 1200.00, true),
(gen_random_uuid(), '01-710', 'Temporary Water', '01', 'GENERAL', false, false, true, false, 'MONTH', 400.00, true),
(gen_random_uuid(), '01-800', 'Small Tools & Consumables', '01', 'GENERAL', false, false, true, false, 'MONTH', 2000.00, true),
(gen_random_uuid(), '01-900', 'Bonds & Insurance', '01', 'GENERAL', false, false, true, false, 'LS', 25000.00, true),

-- DIVISION 02: EXISTING CONDITIONS (5 codes)
(gen_random_uuid(), '02-100', 'Clearing Labor', '02', 'EARTHWORK', true, false, false, false, 'HR', 45.00, true),
(gen_random_uuid(), '02-110', 'Clearing Equipment', '02', 'EARTHWORK', false, true, false, false, 'HR', 175.00, true),
(gen_random_uuid(), '02-200', 'Demolition Labor', '02', 'EARTHWORK', true, false, false, false, 'HR', 48.00, true),
(gen_random_uuid(), '02-210', 'Demolition Equipment', '02', 'EARTHWORK', false, true, false, false, 'HR', 225.00, true),
(gen_random_uuid(), '02-300', 'Debris Disposal', '02', 'EARTHWORK', false, false, true, false, 'CY', 35.00, true),

-- DIVISION 03: CONCRETE (23 codes)
(gen_random_uuid(), '03-100', 'Concrete Laborer', '03', 'CONCRETE', true, false, false, false, 'HR', 42.50, true),
(gen_random_uuid(), '03-110', 'Cement Mason', '03', 'CONCRETE', true, false, false, false, 'HR', 52.00, true),
(gen_random_uuid(), '03-120', 'Concrete Foreman', '03', 'CONCRETE', true, false, false, false, 'HR', 68.00, true),
(gen_random_uuid(), '03-200', 'Concrete Pump', '03', 'CONCRETE', false, true, false, false, 'HR', 275.00, true),
(gen_random_uuid(), '03-210', 'Concrete Bucket/Crane', '03', 'CONCRETE', false, true, false, false, 'HR', 325.00, true),
(gen_random_uuid(), '03-220', 'Concrete Vibrators', '03', 'CONCRETE', false, true, false, false, 'DAY', 85.00, true),
(gen_random_uuid(), '03-230', 'Concrete Finishing Equipment', '03', 'CONCRETE', false, true, false, false, 'DAY', 150.00, true),
(gen_random_uuid(), '03-300', 'Structural Concrete, Class H', '03', 'CONCRETE', false, false, true, false, 'CY', 185.00, true),
(gen_random_uuid(), '03-305', 'Structural Concrete, Class A', '03', 'CONCRETE', false, false, true, false, 'CY', 165.00, true),
(gen_random_uuid(), '03-310', 'Structural Concrete, Class AA', '03', 'CONCRETE', false, false, true, false, 'CY', 175.00, true),
(gen_random_uuid(), '03-315', 'Structural Concrete, Class DS', '03', 'CONCRETE', false, false, true, false, 'CY', 180.00, true),
(gen_random_uuid(), '03-400', 'Formwork Labor', '03', 'CONCRETE', true, false, false, false, 'HR', 55.00, true),
(gen_random_uuid(), '03-410', 'Formwork Materials', '03', 'CONCRETE', false, false, true, false, 'SF', 4.50, true),
(gen_random_uuid(), '03-420', 'Form Release Agent', '03', 'CONCRETE', false, false, true, false, 'GAL', 18.00, true),
(gen_random_uuid(), '03-500', 'Curing Compound', '03', 'CONCRETE', false, false, true, false, 'GAL', 22.00, true),
(gen_random_uuid(), '03-510', 'Curing Blankets', '03', 'CONCRETE', false, false, true, false, 'SF', 0.35, true),
(gen_random_uuid(), '03-600', 'Rebar Installation Labor', '03', 'CONCRETE', true, false, false, false, 'HR', 58.00, true),
(gen_random_uuid(), '03-610', 'Rebar, Epoxy Coated', '03', 'CONCRETE', false, false, true, false, 'LB', 0.95, true),
(gen_random_uuid(), '03-615', 'Rebar, Uncoated', '03', 'CONCRETE', false, false, true, false, 'LB', 0.75, true),
(gen_random_uuid(), '03-620', 'Rebar Accessories (Chairs, Ties)', '03', 'CONCRETE', false, false, true, false, 'LB', 0.12, true),
(gen_random_uuid(), '03-700', 'Concrete Testing', '03', 'CONCRETE', false, false, false, true, 'EA', 125.00, true),
(gen_random_uuid(), '03-800', 'Expansion Joint Material', '03', 'CONCRETE', false, false, true, false, 'LF', 45.00, true),
(gen_random_uuid(), '03-810', 'Expansion Joint Labor', '03', 'CONCRETE', true, false, false, false, 'HR', 52.00, true),

-- DIVISION 05: METALS/STEEL (6 codes)
(gen_random_uuid(), '05-100', 'Ironworker Labor', '05', 'STEEL', true, false, false, false, 'HR', 62.00, true),
(gen_random_uuid(), '05-110', 'Ironworker Foreman', '05', 'STEEL', true, false, false, false, 'HR', 75.00, true),
(gen_random_uuid(), '05-200', 'Crane, 50-Ton', '05', 'STEEL', false, true, false, false, 'HR', 325.00, true),
(gen_random_uuid(), '05-210', 'Crane, 100-Ton', '05', 'STEEL', false, true, false, false, 'HR', 475.00, true),
(gen_random_uuid(), '05-300', 'Structural Steel', '05', 'STEEL', false, false, true, false, 'LB', 2.25, true),
(gen_random_uuid(), '05-310', 'Misc Steel (Plates, Angles)', '05', 'STEEL', false, false, true, false, 'LB', 1.85, true),

-- DIVISION 07: WATERPROOFING/JOINTS (7 codes)
(gen_random_uuid(), '07-100', 'Waterproofing Labor', '07', 'WATERPROOFING', true, false, false, false, 'HR', 48.00, true),
(gen_random_uuid(), '07-200', 'Waterproofing Membrane', '07', 'WATERPROOFING', false, false, true, false, 'SF', 3.50, true),
(gen_random_uuid(), '07-210', 'Joint Sealant', '07', 'WATERPROOFING', false, false, true, false, 'LF', 8.50, true),
(gen_random_uuid(), '07-220', 'Silicone Foam Joint System', '07', 'WATERPROOFING', false, false, true, false, 'LF', 65.00, true),
(gen_random_uuid(), '07-230', 'Compression Seal Joint', '07', 'WATERPROOFING', false, false, true, false, 'LF', 42.00, true),
(gen_random_uuid(), '07-300', 'Bearing Pad, Elastomeric', '07', 'WATERPROOFING', false, false, true, false, 'EA', 850.00, true),
(gen_random_uuid(), '07-310', 'Bearing Assembly, Complete', '07', 'WATERPROOFING', false, false, true, false, 'EA', 2800.00, true),

-- DIVISION 31: EARTHWORK (18 codes)
(gen_random_uuid(), '31-100', 'Equipment Operator', '31', 'EARTHWORK', true, false, false, false, 'HR', 52.00, true),
(gen_random_uuid(), '31-110', 'Laborer, Earthwork', '31', 'EARTHWORK', true, false, false, false, 'HR', 38.00, true),
(gen_random_uuid(), '31-120', 'Earthwork Foreman', '31', 'EARTHWORK', true, false, false, false, 'HR', 65.00, true),
(gen_random_uuid(), '31-200', 'Excavator, 30-Ton', '31', 'EARTHWORK', false, true, false, false, 'HR', 185.00, true),
(gen_random_uuid(), '31-210', 'Excavator, 50-Ton', '31', 'EARTHWORK', false, true, false, false, 'HR', 275.00, true),
(gen_random_uuid(), '31-220', 'Dozer, D6', '31', 'EARTHWORK', false, true, false, false, 'HR', 165.00, true),
(gen_random_uuid(), '31-230', 'Dozer, D8', '31', 'EARTHWORK', false, true, false, false, 'HR', 225.00, true),
(gen_random_uuid(), '31-240', 'Loader, 3 CY', '31', 'EARTHWORK', false, true, false, false, 'HR', 145.00, true),
(gen_random_uuid(), '31-250', 'Loader, 5 CY', '31', 'EARTHWORK', false, true, false, false, 'HR', 195.00, true),
(gen_random_uuid(), '31-260', 'Articulated Dump Truck', '31', 'EARTHWORK', false, true, false, false, 'HR', 135.00, true),
(gen_random_uuid(), '31-270', 'Off-Road Haul Truck', '31', 'EARTHWORK', false, true, false, false, 'HR', 175.00, true),
(gen_random_uuid(), '31-280', 'Compactor, Vibratory', '31', 'EARTHWORK', false, true, false, false, 'HR', 95.00, true),
(gen_random_uuid(), '31-290', 'Compactor, Sheepsfoot', '31', 'EARTHWORK', false, true, false, false, 'HR', 110.00, true),
(gen_random_uuid(), '31-300', 'Dewatering Pump', '31', 'EARTHWORK', false, true, false, false, 'DAY', 450.00, true),
(gen_random_uuid(), '31-310', 'Well Points', '31', 'EARTHWORK', false, true, false, false, 'DAY', 650.00, true),
(gen_random_uuid(), '31-400', 'Borrow Material', '31', 'EARTHWORK', false, false, true, false, 'CY', 12.00, true),
(gen_random_uuid(), '31-410', 'Select Fill Material', '31', 'EARTHWORK', false, false, true, false, 'CY', 18.00, true),
(gen_random_uuid(), '31-500', 'Trucking, Haul Material', '31', 'EARTHWORK', false, false, false, true, 'CY', 8.50, true),

-- DIVISION 32: EXTERIOR/GUARDRAIL (11 codes)
(gen_random_uuid(), '32-100', 'Guardrail Labor', '32', 'GUARDRAIL', true, false, false, false, 'HR', 45.00, true),
(gen_random_uuid(), '32-110', 'Guardrail Foreman', '32', 'GUARDRAIL', true, false, false, false, 'HR', 58.00, true),
(gen_random_uuid(), '32-200', 'Guardrail Post Driver', '32', 'GUARDRAIL', false, true, false, false, 'HR', 125.00, true),
(gen_random_uuid(), '32-300', 'W-Beam Guardrail', '32', 'GUARDRAIL', false, false, true, false, 'LF', 18.00, true),
(gen_random_uuid(), '32-310', 'Guardrail Posts', '32', 'GUARDRAIL', false, false, true, false, 'EA', 28.00, true),
(gen_random_uuid(), '32-320', 'Guardrail Hardware', '32', 'GUARDRAIL', false, false, true, false, 'LF', 4.50, true),
(gen_random_uuid(), '32-330', 'End Terminal, Crash-Tested', '32', 'GUARDRAIL', false, false, true, false, 'EA', 1850.00, true),
(gen_random_uuid(), '32-400', 'Seeding Labor', '32', 'SEEDING', true, false, false, false, 'HR', 38.00, true),
(gen_random_uuid(), '32-410', 'Hydroseeder', '32', 'SEEDING', false, true, false, false, 'HR', 185.00, true),
(gen_random_uuid(), '32-500', 'Seed Mix', '32', 'SEEDING', false, false, true, false, 'LB', 8.50, true),
(gen_random_uuid(), '32-510', 'Fertilizer', '32', 'SEEDING', false, false, true, false, 'LB', 0.45, true),

-- DIVISION 41: EQUIPMENT/CRANES (5 codes)
(gen_random_uuid(), '41-100', 'Crane Operator', '41', 'EQUIPMENT', true, false, false, false, 'HR', 68.00, true),
(gen_random_uuid(), '41-110', 'Crane Oiler', '41', 'EQUIPMENT', true, false, false, false, 'HR', 48.00, true),
(gen_random_uuid(), '41-200', 'Crane, 150-Ton', '41', 'EQUIPMENT', false, true, false, false, 'HR', 650.00, true),
(gen_random_uuid(), '41-210', 'Crane, 200-Ton', '41', 'EQUIPMENT', false, true, false, false, 'HR', 850.00, true),
(gen_random_uuid(), '41-300', 'Rigging & Slings', '41', 'EQUIPMENT', false, false, true, false, 'LS', 2500.00, true);


-- ============================================================
-- PART 3: DAVIS-BACON WAGE RATES (WV Highway Construction 2024)
-- ============================================================

CREATE TABLE IF NOT EXISTS wage_determinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    determination_number TEXT NOT NULL,
    modification_number INTEGER DEFAULT 0,
    effective_date DATE NOT NULL,
    expiration_date DATE,
    state TEXT NOT NULL,
    county TEXT,
    construction_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wage_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    determination_id UUID REFERENCES wage_determinations(id),
    classification TEXT NOT NULL,
    base_rate NUMERIC(10,2) NOT NULL,
    fringe_rate NUMERIC(10,2) NOT NULL,
    total_rate NUMERIC(10,2) GENERATED ALWAYS AS (base_rate + fringe_rate) STORED,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- Sample Wage Determination
INSERT INTO wage_determinations (id, determination_number, modification_number, effective_date, state, construction_type) VALUES
('11111111-1111-1111-1111-111111111111', 'WV20240001', 3, '2024-01-05', 'WV', 'HIGHWAY');

-- Wage Rates for Highway Construction
INSERT INTO wage_rates (determination_id, classification, base_rate, fringe_rate, notes) VALUES
('11111111-1111-1111-1111-111111111111', 'Carpenter', 28.45, 14.82, 'Group 1 - General'),
('11111111-1111-1111-1111-111111111111', 'Cement Mason/Concrete Finisher', 26.85, 14.15, 'Includes finishing and curing'),
('11111111-1111-1111-1111-111111111111', 'Electrician', 32.50, 16.25, 'Journeyman'),
('11111111-1111-1111-1111-111111111111', 'Ironworker', 30.15, 15.75, 'Reinforcing'),
('11111111-1111-1111-1111-111111111111', 'Ironworker - Structural', 31.25, 16.15, 'Structural steel'),
('11111111-1111-1111-1111-111111111111', 'Laborer - General', 22.50, 11.85, 'Group 1'),
('11111111-1111-1111-1111-111111111111', 'Laborer - Skilled', 24.15, 12.45, 'Group 2 - Semi-skilled'),
('11111111-1111-1111-1111-111111111111', 'Laborer - Flagman', 21.50, 11.25, 'Traffic control'),
('11111111-1111-1111-1111-111111111111', 'Operating Engineer - Group 1', 32.85, 16.95, 'Crane, 50 ton+'),
('11111111-1111-1111-1111-111111111111', 'Operating Engineer - Group 2', 30.45, 15.85, 'Excavator, dozer'),
('11111111-1111-1111-1111-111111111111', 'Operating Engineer - Group 3', 28.25, 14.75, 'Loader, backhoe'),
('11111111-1111-1111-1111-111111111111', 'Operating Engineer - Group 4', 26.15, 13.85, 'Compactor, pump'),
('11111111-1111-1111-1111-111111111111', 'Painter', 27.50, 14.25, 'Structural'),
('11111111-1111-1111-1111-111111111111', 'Pile Driver', 31.85, 16.45, 'Including equipment'),
('11111111-1111-1111-1111-111111111111', 'Pipefitter', 33.25, 17.15, 'Including welding'),
('11111111-1111-1111-1111-111111111111', 'Teamster - Truck Driver', 25.85, 13.45, 'All trucks'),
('11111111-1111-1111-1111-111111111111', 'Survey Crew', 24.50, 12.75, 'All positions');


-- ============================================================
-- PART 4: ASSEMBLY TEMPLATES
-- ============================================================

-- Get cost code IDs for template lines
DO $$
DECLARE
    v_concrete_labor UUID;
    v_cement_mason UUID;
    v_concrete_pump UUID;
    v_concrete_material UUID;
    v_rebar_labor UUID;
    v_rebar_material UUID;
    v_equipment_operator UUID;
    v_excavator_30t UUID;
    v_excavator_50t UUID;
    v_joint_labor UUID;
    v_silicone_material UUID;
    v_guardrail_labor UUID;
    v_guardrail_material UUID;
    v_template_id UUID;
BEGIN
    -- Get cost code IDs
    SELECT id INTO v_concrete_labor FROM cost_codes WHERE code = '03-100';
    SELECT id INTO v_cement_mason FROM cost_codes WHERE code = '03-110';
    SELECT id INTO v_concrete_pump FROM cost_codes WHERE code = '03-200';
    SELECT id INTO v_concrete_material FROM cost_codes WHERE code = '03-300';
    SELECT id INTO v_rebar_labor FROM cost_codes WHERE code = '03-600';
    SELECT id INTO v_rebar_material FROM cost_codes WHERE code = '03-610';
    SELECT id INTO v_equipment_operator FROM cost_codes WHERE code = '31-100';
    SELECT id INTO v_excavator_30t FROM cost_codes WHERE code = '31-200';
    SELECT id INTO v_excavator_50t FROM cost_codes WHERE code = '31-210';
    SELECT id INTO v_joint_labor FROM cost_codes WHERE code = '03-810';
    SELECT id INTO v_silicone_material FROM cost_codes WHERE code = '07-220';
    SELECT id INTO v_guardrail_labor FROM cost_codes WHERE code = '32-100';
    SELECT id INTO v_guardrail_material FROM cost_codes WHERE code = '32-300';

    -- Template 1: Structural Concrete Class H (Standard Pump Pour)
    v_template_id := gen_random_uuid();
    INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
    VALUES (v_template_id, '601009-001', 'Standard Bridge Concrete - Pump', 'Standard concrete pour using pump truck', true, 'BRIDGE', 'Triton Historical');
    
    INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, internal_cost_code_id, quantity_per_unit, quantity_uom, waste_percentage, default_unit_cost, productivity_factor)
    VALUES 
    (v_template_id, 'LABOR', 'Concrete Laborer', 'Laborer - General', v_concrete_labor, 2.5, 'HR/CY', 0, 34.35, 1.00),
    (v_template_id, 'LABOR', 'Cement Mason', 'Cement Mason/Concrete Finisher', v_cement_mason, 1.5, 'HR/CY', 0, 41.00, 1.00),
    (v_template_id, 'LABOR', 'Concrete Foreman', 'Laborer - Skilled', v_concrete_labor, 0.5, 'HR/CY', 0, 36.60, 1.00),
    (v_template_id, 'EQUIPMENT', 'Concrete Pump', NULL, v_concrete_pump, 0.4, 'HR/CY', 0, 275.00, 1.00),
    (v_template_id, 'MATERIAL', 'Class H Concrete', NULL, v_concrete_material, 1.05, 'CY/CY', 5, 185.00, 1.00),
    (v_template_id, 'MATERIAL', 'Curing Compound', NULL, NULL, 0.3, 'GAL/CY', 10, 22.00, 1.00);

    -- Template 2: Structural Concrete Class H (Crane & Bucket)
    v_template_id := gen_random_uuid();
    INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, conditions, source)
    VALUES (v_template_id, '601009-001', 'Bridge Concrete - Crane & Bucket', 'Concrete pour using crane and bucket for limited access', false, 'BRIDGE', 'Limited site access, no room for pump', 'Triton Historical');
    
    INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, internal_cost_code_id, quantity_per_unit, quantity_uom, waste_percentage, default_unit_cost, productivity_factor)
    VALUES 
    (v_template_id, 'LABOR', 'Concrete Laborer', 'Laborer - General', v_concrete_labor, 3.0, 'HR/CY', 0, 34.35, 1.20),
    (v_template_id, 'LABOR', 'Cement Mason', 'Cement Mason/Concrete Finisher', v_cement_mason, 1.5, 'HR/CY', 0, 41.00, 1.00),
    (v_template_id, 'EQUIPMENT', 'Crane with Operator', NULL, NULL, 0.6, 'HR/CY', 0, 375.00, 1.20),
    (v_template_id, 'EQUIPMENT', 'Concrete Bucket', NULL, NULL, 0.1, 'DAY/CY', 0, 150.00, 1.00),
    (v_template_id, 'MATERIAL', 'Class H Concrete', NULL, v_concrete_material, 1.08, 'CY/CY', 8, 185.00, 1.00);

    -- Template 3: Reinforcing Steel - Epoxy Coated
    v_template_id := gen_random_uuid();
    INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
    VALUES (v_template_id, '602001-000', 'Epoxy Coated Rebar - Standard', 'Standard rebar installation for bridge decks', true, 'BRIDGE', 'Triton Historical');
    
    INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, internal_cost_code_id, quantity_per_unit, quantity_uom, waste_percentage, default_unit_cost, productivity_factor)
    VALUES 
    (v_template_id, 'LABOR', 'Ironworker', 'Ironworker', v_rebar_labor, 0.012, 'HR/LB', 0, 45.90, 1.00),
    (v_template_id, 'LABOR', 'Ironworker Foreman', 'Ironworker', NULL, 0.003, 'HR/LB', 0, 47.40, 1.00),
    (v_template_id, 'MATERIAL', 'Epoxy Coated Rebar', NULL, v_rebar_material, 1.03, 'LB/LB', 3, 0.95, 1.00),
    (v_template_id, 'MATERIAL', 'Rebar Accessories', NULL, NULL, 0.15, 'LB/LB', 0, 0.12, 1.00);

    -- Template 4: Structure Excavation - Standard
    v_template_id := gen_random_uuid();
    INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
    VALUES (v_template_id, '212001-000', 'Structure Excavation - Standard', 'Standard unclassified excavation for bridge foundations', true, 'BRIDGE', 'Triton Historical');
    
    INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, internal_cost_code_id, quantity_per_unit, quantity_uom, waste_percentage, default_unit_cost, productivity_factor)
    VALUES 
    (v_template_id, 'LABOR', 'Equipment Operator', 'Operating Engineer - Group 2', v_equipment_operator, 0.15, 'HR/CY', 0, 46.30, 1.00),
    (v_template_id, 'LABOR', 'Laborer', 'Laborer - General', NULL, 0.10, 'HR/CY', 0, 34.35, 1.00),
    (v_template_id, 'EQUIPMENT', 'Excavator 30-Ton', NULL, v_excavator_30t, 0.15, 'HR/CY', 0, 185.00, 1.00),
    (v_template_id, 'EQUIPMENT', 'Haul Truck', NULL, NULL, 0.10, 'HR/CY', 0, 135.00, 1.00);

    -- Template 5: Structure Excavation - Rock
    v_template_id := gen_random_uuid();
    INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, conditions, source)
    VALUES (v_template_id, '212002-000', 'Structure Excavation - Rock Breaker', 'Rock excavation using hydraulic breaker', true, 'BRIDGE', 'Bore logs show rock, no blasting permitted', 'Triton Historical');
    
    INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, internal_cost_code_id, quantity_per_unit, quantity_uom, waste_percentage, default_unit_cost, productivity_factor)
    VALUES 
    (v_template_id, 'LABOR', 'Equipment Operator', 'Operating Engineer - Group 2', v_equipment_operator, 0.45, 'HR/CY', 0, 46.30, 1.00),
    (v_template_id, 'LABOR', 'Laborer', 'Laborer - General', NULL, 0.30, 'HR/CY', 0, 34.35, 1.00),
    (v_template_id, 'EQUIPMENT', 'Excavator 50-Ton w/Breaker', NULL, v_excavator_50t, 0.45, 'HR/CY', 0, 325.00, 1.00),
    (v_template_id, 'EQUIPMENT', 'Haul Truck', NULL, NULL, 0.25, 'HR/CY', 0, 135.00, 1.00);

    -- Template 6: Silicone Foam Expansion Joint (SP 627)
    v_template_id := gen_random_uuid();
    INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, conditions, source)
    VALUES (v_template_id, '627002-000', 'Silicone Foam Joint - SP 627', 'Silicone foam expansion joint per Special Provision 627', true, 'BRIDGE', 'When SP 627 specifies silicone foam', 'Triton Historical');
    
    INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, internal_cost_code_id, quantity_per_unit, quantity_uom, waste_percentage, default_unit_cost, productivity_factor)
    VALUES 
    (v_template_id, 'LABOR', 'Carpenter', 'Carpenter', v_joint_labor, 0.35, 'HR/LF', 0, 43.27, 1.00),
    (v_template_id, 'LABOR', 'Laborer', 'Laborer - General', NULL, 0.25, 'HR/LF', 0, 34.35, 1.00),
    (v_template_id, 'MATERIAL', 'Silicone Foam Joint System', NULL, v_silicone_material, 1.05, 'LF/LF', 5, 65.00, 1.00),
    (v_template_id, 'MATERIAL', 'Backer Rod', NULL, NULL, 1.10, 'LF/LF', 10, 1.50, 1.00);

    -- Template 7: W-Beam Guardrail
    v_template_id := gen_random_uuid();
    INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
    VALUES (v_template_id, '705080-000', 'W-Beam Guardrail - Standard', 'Standard single-face W-beam guardrail installation', true, 'ALL', 'Triton Historical');
    
    INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, internal_cost_code_id, quantity_per_unit, quantity_uom, waste_percentage, default_unit_cost, productivity_factor)
    VALUES 
    (v_template_id, 'LABOR', 'Guardrail Installer', 'Laborer - Skilled', v_guardrail_labor, 0.08, 'HR/LF', 0, 36.60, 1.00),
    (v_template_id, 'LABOR', 'Equipment Operator', 'Operating Engineer - Group 3', NULL, 0.04, 'HR/LF', 0, 43.00, 1.00),
    (v_template_id, 'EQUIPMENT', 'Post Driver', NULL, NULL, 0.04, 'HR/LF', 0, 125.00, 1.00),
    (v_template_id, 'MATERIAL', 'W-Beam Rail', NULL, v_guardrail_material, 1.02, 'LF/LF', 2, 18.00, 1.00),
    (v_template_id, 'MATERIAL', 'Posts (@ 6.25'' spacing)', NULL, NULL, 0.16, 'EA/LF', 0, 28.00, 1.00),
    (v_template_id, 'MATERIAL', 'Hardware', NULL, NULL, 1.00, 'LF/LF', 0, 4.50, 1.00);

    -- Template 8: Mobilization (Percentage-Based)
    v_template_id := gen_random_uuid();
    INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
    VALUES (v_template_id, '109010-000', 'Mobilization - Percentage', 'Mobilization calculated as percentage of bid subtotal', true, 'ALL', 'Industry Standard');
    -- No lines - uses PERCENT_OF_SUBTOTAL calculation method

END $$;


-- ============================================================
-- PART 5: SAMPLE EQUIPMENT FLEET
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_number TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    make TEXT,
    model TEXT,
    year INTEGER,
    serial_number TEXT,
    category TEXT NOT NULL,
    status TEXT DEFAULT 'AVAILABLE',
    hourly_rate NUMERIC(10,2),
    daily_rate NUMERIC(10,2),
    monthly_rate NUMERIC(10,2),
    current_project_id UUID,
    current_location TEXT,
    is_owned BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO equipment (equipment_number, description, make, model, year, category, status, hourly_rate, daily_rate, monthly_rate, is_owned) VALUES
-- Excavators
('EX-001', 'Excavator 30-Ton', 'Caterpillar', '330', 2021, 'EXCAVATOR', 'AVAILABLE', 185.00, 1480.00, 28000.00, true),
('EX-002', 'Excavator 30-Ton', 'Caterpillar', '330', 2022, 'EXCAVATOR', 'AVAILABLE', 185.00, 1480.00, 28000.00, true),
('EX-003', 'Excavator 50-Ton', 'Caterpillar', '352', 2020, 'EXCAVATOR', 'AVAILABLE', 275.00, 2200.00, 42000.00, true),
('EX-004', 'Excavator 50-Ton', 'Komatsu', 'PC490', 2021, 'EXCAVATOR', 'AVAILABLE', 275.00, 2200.00, 42000.00, true),

-- Dozers
('DZ-001', 'Dozer D6', 'Caterpillar', 'D6T', 2020, 'DOZER', 'AVAILABLE', 165.00, 1320.00, 25000.00, true),
('DZ-002', 'Dozer D6', 'Caterpillar', 'D6T', 2021, 'DOZER', 'AVAILABLE', 165.00, 1320.00, 25000.00, true),
('DZ-003', 'Dozer D8', 'Caterpillar', 'D8T', 2019, 'DOZER', 'AVAILABLE', 225.00, 1800.00, 35000.00, true),

-- Loaders
('LD-001', 'Wheel Loader 3CY', 'Caterpillar', '950M', 2021, 'LOADER', 'AVAILABLE', 145.00, 1160.00, 22000.00, true),
('LD-002', 'Wheel Loader 5CY', 'Caterpillar', '966M', 2020, 'LOADER', 'AVAILABLE', 195.00, 1560.00, 30000.00, true),

-- Trucks
('TR-001', 'Articulated Dump Truck 30T', 'Caterpillar', '730', 2021, 'TRUCK', 'AVAILABLE', 135.00, 1080.00, 20000.00, true),
('TR-002', 'Articulated Dump Truck 30T', 'Caterpillar', '730', 2022, 'TRUCK', 'AVAILABLE', 135.00, 1080.00, 20000.00, true),
('TR-003', 'Articulated Dump Truck 40T', 'Caterpillar', '740', 2020, 'TRUCK', 'AVAILABLE', 155.00, 1240.00, 24000.00, true),

-- Cranes
('CR-001', 'Crane 50-Ton', 'Liebherr', 'LTM 1050', 2019, 'CRANE', 'AVAILABLE', 325.00, 2600.00, 50000.00, true),
('CR-002', 'Crane 100-Ton', 'Liebherr', 'LTM 1100', 2020, 'CRANE', 'AVAILABLE', 475.00, 3800.00, 75000.00, true),
('CR-003', 'Crane 150-Ton', 'Liebherr', 'LTM 1150', 2018, 'CRANE', 'AVAILABLE', 650.00, 5200.00, 100000.00, true),

-- Compactors
('CP-001', 'Vibratory Roller', 'Caterpillar', 'CS56B', 2021, 'COMPACTOR', 'AVAILABLE', 95.00, 760.00, 14000.00, true),
('CP-002', 'Sheepsfoot Compactor', 'Caterpillar', 'CP56B', 2020, 'COMPACTOR', 'AVAILABLE', 110.00, 880.00, 16500.00, true),

-- Concrete Equipment
('CN-001', 'Concrete Pump', 'Putzmeister', 'BSF 36', 2021, 'CONCRETE', 'AVAILABLE', 275.00, 2200.00, 35000.00, true),
('CN-002', 'Concrete Bucket 2CY', NULL, NULL, 2020, 'CONCRETE', 'AVAILABLE', 0, 150.00, 2500.00, true),

-- Misc
('MS-001', 'Guardrail Post Driver', NULL, NULL, 2019, 'MISC', 'AVAILABLE', 125.00, 1000.00, 15000.00, true);


-- ============================================================
-- PART 6: SAMPLE SUPPLIERS
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    supplier_type TEXT NOT NULL,
    is_dbe BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO suppliers (name, contact_name, phone, supplier_type, city, state, is_dbe, notes) VALUES
('Martin Marietta Materials', 'Mike Thompson', '304-555-0101', 'AGGREGATE', 'Charleston', 'WV', false, 'Primary aggregate supplier'),
('Lehigh Hanson', 'Sarah Williams', '304-555-0102', 'CONCRETE', 'Huntington', 'WV', false, 'Ready-mix concrete'),
('Nucor Rebar', 'Jim Davis', '304-555-0103', 'REBAR', 'Parkersburg', 'WV', false, 'Epoxy-coated rebar'),
('Marathon Petroleum', 'Bill Johnson', '304-555-0104', 'ASPHALT', 'South Charleston', 'WV', false, 'Asphalt plant'),
('WV Steel', 'Tom Anderson', '304-555-0105', 'STEEL', 'Weirton', 'WV', false, 'Structural steel'),
('Valley Supply', 'Lisa Brown', '304-555-0106', 'GENERAL', 'Beckley', 'WV', true, 'DBE - General construction supplies'),
('Mountain State Guardrail', 'Bob Martin', '304-555-0107', 'GUARDRAIL', 'Morgantown', 'WV', false, 'Guardrail materials'),
('Appalachian Traffic Control', 'Mary Wilson', '304-555-0108', 'TRAFFIC', 'Clarksburg', 'WV', true, 'DBE - Signs and barricades'),
('Eastern Bearing & Seal', 'Dave Clark', '304-555-0109', 'BEARING', 'Wheeling', 'WV', false, 'Bridge bearings and joints'),
('Tri-State Seeding', 'Karen Miller', '304-555-0110', 'SEEDING', 'Charleston', 'WV', true, 'DBE - Seeding and erosion control');


-- ============================================================
-- PART 7: SAMPLE BID PROPOSAL (Triplett Bridge)
-- ============================================================

INSERT INTO bid_proposals (
    id, 
    state_project_number, 
    federal_project_number,
    project_name, 
    project_description,
    county,
    route,
    bid_date,
    bid_time,
    engineer_estimate,
    completion_days,
    liquidated_damages_per_day,
    wage_determination_id,
    dbe_goal_percentage,
    status,
    created_at
) VALUES (
    '22222222-2222-2222-2222-222222222222',
    '2023220005',
    'HWI-0010(321)D',
    'US Army SP 4 Darrell Gregory Triplett Memorial Bridge',
    'Bridge replacement over Mud River in Lincoln County. Includes demolition of existing structure, new prestressed concrete beam bridge, approach work, and associated roadway improvements.',
    'Lincoln',
    'CR 36',
    '2025-01-15',
    '10:00:00',
    4250000.00,
    180,
    2500.00,
    'WV20240001',
    8.00,
    'ESTIMATING',
    NOW()
);

-- Sample Line Items for Triplett Bridge
INSERT INTO proposal_line_items (
    id,
    proposal_id,
    wvdoh_item_code,
    item_number,
    description,
    unit,
    quantity,
    calculation_method,
    calculation_percentage
) VALUES
-- General
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '109010-000', '1', 'MOBILIZATION', 'LS', 1.00, 'PERCENT_OF_SUBTOTAL', 7.00),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '104010-000', '2', 'MAINTENANCE OF TRAFFIC', 'LS', 1.00, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '105010-000', '3', 'FIELD OFFICE', 'MONTH', 6.00, 'MANUAL_ENTRY', NULL),

-- Earthwork
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '201001-000', '4', 'CLEARING AND GRUBBING', 'ACRE', 2.50, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '203001-000', '5', 'DISMANTLING EXISTING BRIDGE', 'LS', 1.00, 'MANUAL_ENTRY', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '207001-000', '6', 'EXCAVATION, UNCLASSIFIED', 'CY', 3500.00, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '212001-000', '7', 'STRUCTURE EXCAVATION, UNCLASSIFIED', 'CY', 850.00, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '212002-000', '8', 'STRUCTURE EXCAVATION, ROCK', 'CY', 250.00, 'ASSEMBLY_SUM', NULL),

-- Concrete
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '601001-000', '9', 'STRUCTURAL CONCRETE, CLASS A', 'CY', 180.00, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '601009-001', '10', 'STRUCTURAL CONCRETE, CLASS H', 'CY', 420.00, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '602001-000', '11', 'REINFORCING STEEL, EPOXY COATED', 'LB', 185000.00, 'ASSEMBLY_SUM', NULL),

-- Steel/Beams
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '625001-000', '12', 'PRESTRESSED CONCRETE BEAMS', 'LF', 720.00, 'SUBCONTRACT_QUOTE', NULL),

-- Bearings/Joints
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '615029-000', '13', 'ELASTOMERIC BEARING ASSEMBLY', 'EA', 16.00, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '627002-000', '14', 'EXPANSION JOINT, SILICONE FOAM', 'LF', 88.00, 'ASSEMBLY_SUM', NULL),

-- Approach/Roadway
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '307001-000', '15', 'CRUSHED AGGREGATE BASE COURSE', 'TON', 650.00, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '401002-000', '16', 'ASPHALT WEARING COURSE', 'TON', 480.00, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '502001-000', '17', 'APPROACH SLABS', 'SY', 280.00, 'ASSEMBLY_SUM', NULL),

-- Guardrail
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '705080-000', '18', 'GUARDRAIL, W-BEAM, SINGLE FACE', 'LF', 450.00, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '705002-000', '19', 'GUARDRAIL END TREATMENT', 'EA', 4.00, 'ASSEMBLY_SUM', NULL),

-- Erosion/Seeding
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '715001-000', '20', 'TEMPORARY EROSION CONTROL', 'LS', 1.00, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '716001-000', '21', 'SEEDING AND MULCHING', 'ACRE', 2.50, 'ASSEMBLY_SUM', NULL),
(gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '729001-000', '22', 'RIPRAP, CLASS 1', 'TON', 350.00, 'ASSEMBLY_SUM', NULL);


-- ============================================================
-- PART 8: INDIRECT COST CATEGORIES
-- ============================================================

CREATE TABLE IF NOT EXISTS indirect_cost_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_code TEXT NOT NULL UNIQUE,
    category_name TEXT NOT NULL,
    description TEXT,
    typical_percentage NUMERIC(5,2),
    calculation_basis TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO indirect_cost_categories (category_code, category_name, description, typical_percentage, calculation_basis) VALUES
('PROJECT_MGMT', 'Project Management', 'PM, scheduling, admin support', 3.00, 'DIRECT_COST'),
('FIELD_OFFICE', 'Field Office', 'Trailer, utilities, supplies', 1.50, 'DIRECT_COST'),
('SUPERVISION', 'General Supervision', 'General super, safety director time', 2.50, 'DIRECT_COST'),
('SMALL_TOOLS', 'Small Tools & Consumables', 'Hand tools, fuel, etc.', 1.00, 'DIRECT_COST'),
('TEMP_FACILITIES', 'Temporary Facilities', 'Fencing, access roads, laydown', 0.75, 'DIRECT_COST'),
('QC_TESTING', 'QC/Testing', 'Testing services not in direct items', 0.50, 'DIRECT_COST'),
('INSURANCE', 'Project Insurance', 'Builder''s risk, additional coverage', 1.25, 'DIRECT_COST'),
('BONDS', 'Performance & Payment Bonds', 'Bond premium', 1.50, 'BID_TOTAL');


-- ============================================================
-- PART 9: DEFAULT MARKUP LAYERS
-- ============================================================

CREATE TABLE IF NOT EXISTS default_markup_layers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layer_name TEXT NOT NULL,
    layer_order INTEGER NOT NULL,
    default_percentage NUMERIC(5,2) NOT NULL,
    calculation_basis TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO default_markup_layers (layer_name, layer_order, default_percentage, calculation_basis, description) VALUES
('Home Office Overhead', 1, 5.00, 'SUBTOTAL_AFTER_INDIRECT', 'Corporate overhead allocation'),
('Profit', 2, 6.00, 'SUBTOTAL_AFTER_OVERHEAD', 'Target profit margin'),
('Contingency', 3, 3.00, 'SUBTOTAL_AFTER_PROFIT', 'Risk contingency for unknowns');


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Run these to verify seed data:
-- SELECT COUNT(*) as item_count FROM master_wvdoh_items;
-- SELECT COUNT(*) as code_count FROM cost_codes;
-- SELECT COUNT(*) as template_count FROM assembly_templates;
-- SELECT COUNT(*) as wage_rate_count FROM wage_rates;
-- SELECT COUNT(*) as equipment_count FROM equipment;
-- SELECT COUNT(*) as supplier_count FROM suppliers;
-- SELECT * FROM bid_proposals WHERE id = '22222222-2222-2222-2222-222222222222';
-- SELECT COUNT(*) as line_item_count FROM proposal_line_items WHERE proposal_id = '22222222-2222-2222-2222-222222222222';

COMMIT;
