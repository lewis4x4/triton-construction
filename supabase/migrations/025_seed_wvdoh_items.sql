-- Migration: 025_seed_wvdoh_items.sql
-- Purpose: Seed master_wvdoh_items with common WVDOH bid items
-- This provides reference data for item categorization and pricing

-- Insert sample WVDOH construction bid items
-- These are common items found in WVDOH highway construction projects

INSERT INTO public.master_wvdoh_items (
    item_code,
    description,
    short_description,
    unit_of_measure,
    division,
    work_category,
    typical_unit_price_low,
    typical_unit_price_median,
    typical_unit_price_high,
    is_lump_sum,
    is_force_sub,
    is_weather_sensitive,
    is_critical_path_typical,
    common_risk_factors,
    typical_productivity_notes,
    specs_section
) VALUES
-- MOBILIZATION (Division 150)
('150101', 'MOBILIZATION', 'Mobilization', 'LS', '150', 'MOBILIZATION', NULL, NULL, NULL, TRUE, FALSE, FALSE, FALSE, ARRAY['Schedule delays', 'Equipment availability'], 'Typically 5-10% of total bid', '150'),
('150102', 'DEMOBILIZATION', 'Demobilization', 'LS', '150', 'MOBILIZATION', NULL, NULL, NULL, TRUE, FALSE, FALSE, FALSE, ARRAY['Schedule delays'], NULL, '150'),

-- CLEARING & GRUBBING (Division 201)
('201101', 'CLEARING AND GRUBBING', 'Clearing & Grubbing', 'ACRE', '201', 'CLEARING', 2500.00, 4000.00, 8000.00, FALSE, FALSE, TRUE, FALSE, ARRAY['Environmental permits', 'Tree species restrictions', 'Nesting season'], 'Production varies by vegetation density', '201'),
('201102', 'REMOVAL OF EXISTING STRUCTURE', 'Structure Removal', 'LS', '201', 'CLEARING', NULL, NULL, NULL, TRUE, FALSE, FALSE, FALSE, ARRAY['Hazmat materials', 'Utility conflicts'], 'Plan for debris hauling', '201'),
('201103', 'REMOVAL OF EXISTING PAVEMENT', 'Pavement Removal', 'SY', '201', 'CLEARING', 3.00, 5.50, 10.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Asbestos in old pavement', 'Traffic control'], NULL, '201'),
('201104', 'REMOVAL OF EXISTING PIPE', 'Pipe Removal', 'LF', '201', 'CLEARING', 8.00, 15.00, 25.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Utility conflicts', 'Unknown depths'], NULL, '201'),

-- EARTHWORK (Division 203)
('203101', 'ROADWAY EXCAVATION', 'Roadway Excavation', 'CY', '203', 'EARTHWORK', 6.00, 12.00, 25.00, FALSE, FALSE, TRUE, TRUE, ARRAY['Rock quantities', 'Groundwater', 'Unsuitable material'], 'Weather dependent, track moisture content', '203'),
('203102', 'UNCLASSIFIED EXCAVATION', 'Unclassified Excavation', 'CY', '203', 'EARTHWORK', 8.00, 15.00, 30.00, FALSE, FALSE, TRUE, TRUE, ARRAY['Rock vs. common split', 'Spoil disposal'], NULL, '203'),
('203103', 'ROCK EXCAVATION', 'Rock Excavation', 'CY', '203', 'EARTHWORK', 20.00, 45.00, 85.00, FALSE, FALSE, FALSE, TRUE, ARRAY['Blasting permits', 'Rock type variability'], 'Requires drilling and blasting', '203'),
('203104', 'EMBANKMENT', 'Embankment', 'CY', '203', 'EARTHWORK', 3.00, 8.00, 15.00, FALSE, FALSE, TRUE, TRUE, ARRAY['Settlement', 'Moisture control', 'Compaction'], 'Lift thickness critical', '203'),
('203105', 'BORROW EXCAVATION', 'Borrow', 'CY', '203', 'EARTHWORK', 10.00, 18.00, 35.00, FALSE, FALSE, TRUE, FALSE, ARRAY['Borrow site permits', 'Haul distance', 'Material quality'], NULL, '203'),
('203106', 'UNSUITABLE MATERIAL', 'Unsuitable Material', 'CY', '203', 'EARTHWORK', 15.00, 25.00, 50.00, FALSE, FALSE, TRUE, FALSE, ARRAY['Unknown quantities', 'Disposal location'], 'Often underestimated quantity', '203'),

-- DRAINAGE (Division 601-610)
('601101', 'PIPE, CORRUGATED STEEL, 18"', '18" CMP', 'LF', '601', 'DRAINAGE', 35.00, 55.00, 85.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Depth of cover', 'Groundwater'], NULL, '601'),
('601102', 'PIPE, CORRUGATED STEEL, 24"', '24" CMP', 'LF', '601', 'DRAINAGE', 45.00, 70.00, 110.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Depth of cover', 'Groundwater'], NULL, '601'),
('601103', 'PIPE, CORRUGATED STEEL, 36"', '36" CMP', 'LF', '601', 'DRAINAGE', 75.00, 120.00, 185.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Depth of cover', 'Groundwater'], NULL, '601'),
('601201', 'PIPE, REINFORCED CONCRETE, 18"', '18" RCP', 'LF', '601', 'DRAINAGE', 50.00, 80.00, 125.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Depth of cover', 'Bedding requirements'], NULL, '601'),
('601202', 'PIPE, REINFORCED CONCRETE, 24"', '24" RCP', 'LF', '601', 'DRAINAGE', 65.00, 100.00, 160.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Depth of cover', 'Bedding requirements'], NULL, '601'),
('601203', 'PIPE, REINFORCED CONCRETE, 36"', '36" RCP', 'LF', '601', 'DRAINAGE', 95.00, 150.00, 240.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Depth of cover', 'Bedding requirements'], NULL, '601'),
('602101', 'INLET, TYPE A', 'Type A Inlet', 'EACH', '602', 'DRAINAGE', 2000.00, 3500.00, 5500.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Utility conflicts', 'Depth'], NULL, '602'),
('602102', 'INLET, TYPE B', 'Type B Inlet', 'EACH', '602', 'DRAINAGE', 2500.00, 4000.00, 6500.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Utility conflicts', 'Depth'], NULL, '602'),
('603101', 'HEADWALL, CONCRETE', 'Concrete Headwall', 'EACH', '603', 'DRAINAGE', 1500.00, 2500.00, 4500.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Forming complexity'], NULL, '603'),

-- SUBGRADE (Division 301)
('301101', 'LIME TREATMENT', 'Lime Treatment', 'SY', '301', 'SUBGRADE', 2.00, 4.00, 7.00, FALSE, FALSE, TRUE, TRUE, ARRAY['Weather windows', 'Material curing'], 'Cannot apply in rain', '301'),
('301102', 'CEMENT TREATMENT', 'Cement Treatment', 'SY', '301', 'SUBGRADE', 2.50, 5.00, 8.50, FALSE, FALSE, TRUE, TRUE, ARRAY['Weather windows', 'Material curing'], 'Cannot apply in rain', '301'),
('301103', 'PROOF ROLLING', 'Proof Rolling', 'SY', '301', 'SUBGRADE', 0.25, 0.50, 1.00, FALSE, FALSE, TRUE, FALSE, ARRAY['Soft spots discovery'], NULL, '301'),

-- BASE COURSE (Division 304-305)
('304101', 'AGGREGATE BASE COURSE', 'ABC', 'TON', '304', 'BASE', 18.00, 28.00, 45.00, FALSE, FALSE, TRUE, TRUE, ARRAY['Material availability', 'Moisture content'], 'Test gradation frequently', '304'),
('304102', 'CRUSHED AGGREGATE BASE COURSE', 'Crushed ABC', 'TON', '304', 'BASE', 22.00, 35.00, 55.00, FALSE, FALSE, TRUE, TRUE, ARRAY['Material availability', 'Moisture content'], NULL, '304'),
('305101', 'BITUMINOUS BASE COURSE', 'Asphalt Base', 'TON', '305', 'BASE', 75.00, 95.00, 130.00, FALSE, FALSE, TRUE, TRUE, ARRAY['Plant availability', 'Temperature windows'], NULL, '305'),

-- PAVING (Division 401-405)
('401101', 'BITUMINOUS CONCRETE, BASE COURSE, 19MM', 'Asphalt Base 19mm', 'TON', '401', 'PAVING', 70.00, 90.00, 120.00, FALSE, TRUE, TRUE, TRUE, ARRAY['Plant capacity', 'Haul distance', 'Weather windows'], 'Min temp 40F, no rain', '401'),
('401102', 'BITUMINOUS CONCRETE, INTERMEDIATE COURSE, 12.5MM', 'Asphalt Intermediate 12.5mm', 'TON', '401', 'PAVING', 75.00, 95.00, 125.00, FALSE, TRUE, TRUE, TRUE, ARRAY['Plant capacity', 'Haul distance', 'Weather windows'], 'Min temp 40F, no rain', '401'),
('401103', 'BITUMINOUS CONCRETE, SURFACE COURSE, 9.5MM', 'Asphalt Surface 9.5mm', 'TON', '401', 'PAVING', 80.00, 105.00, 140.00, FALSE, TRUE, TRUE, TRUE, ARRAY['Plant capacity', 'Haul distance', 'Weather windows'], 'Min temp 50F, no rain', '401'),
('401104', 'BITUMINOUS CONCRETE SURFACE COURSE, POLYMER MODIFIED', 'Polymer Modified Asphalt', 'TON', '401', 'PAVING', 95.00, 125.00, 170.00, FALSE, TRUE, TRUE, TRUE, ARRAY['Material availability', 'Weather windows'], 'Premium mix, tight specs', '401'),
('402101', 'PORTLAND CEMENT CONCRETE PAVEMENT', 'Concrete Paving', 'SY', '402', 'PAVING', 50.00, 75.00, 110.00, FALSE, TRUE, TRUE, TRUE, ARRAY['Weather', 'Curing time', 'Material supply'], '7-day cure minimum', '402'),
('403101', 'TACK COAT', 'Tack Coat', 'GAL', '403', 'PAVING', 2.00, 3.50, 5.50, FALSE, FALSE, TRUE, FALSE, ARRAY['Weather conditions'], 'Apply uniformly', '403'),
('404101', 'PRIME COAT', 'Prime Coat', 'GAL', '404', 'PAVING', 1.50, 2.75, 4.50, FALSE, FALSE, TRUE, FALSE, ARRAY['Weather conditions', 'Curing time'], 'Allow proper cure time', '404'),

-- STRUCTURES - CONCRETE (Division 501-510)
('501101', 'STRUCTURAL CONCRETE, CLASS A', 'Class A Concrete', 'CY', '501', 'STRUCTURES', 400.00, 650.00, 1000.00, FALSE, FALSE, TRUE, TRUE, ARRAY['Weather', 'Forming complexity', 'Reinforcement congestion'], '4000 psi, forms critical path', '501'),
('501102', 'STRUCTURAL CONCRETE, CLASS A-A', 'Class A-A Concrete', 'CY', '501', 'STRUCTURES', 450.00, 750.00, 1150.00, FALSE, FALSE, TRUE, TRUE, ARRAY['Weather', 'Forming complexity'], '5000 psi, bridge decks', '501'),
('502101', 'REINFORCING STEEL', 'Rebar', 'LB', '502', 'STRUCTURES', 0.80, 1.20, 1.80, FALSE, FALSE, FALSE, TRUE, ARRAY['Detailing errors', 'Schedule coordination'], 'Verify bar lists early', '502'),
('503101', 'STRUCTURAL STEEL', 'Structural Steel', 'LB', '503', 'STRUCTURES', 2.50, 4.00, 6.50, FALSE, TRUE, FALSE, TRUE, ARRAY['Fabrication lead time', 'Erection access'], '12-16 week lead time typical', '503'),

-- BRIDGE (Division 505-507)
('505101', 'PRESTRESSED CONCRETE BEAM, TYPE III', 'Type III Beam', 'LF', '505', 'BRIDGE', 150.00, 250.00, 400.00, FALSE, TRUE, FALSE, TRUE, ARRAY['Fabrication lead time', 'Delivery access'], 'Order early, long lead', '505'),
('505102', 'PRESTRESSED CONCRETE BEAM, TYPE IV', 'Type IV Beam', 'LF', '505', 'BRIDGE', 200.00, 350.00, 550.00, FALSE, TRUE, FALSE, TRUE, ARRAY['Fabrication lead time', 'Delivery access'], 'Order early, long lead', '505'),
('506101', 'BRIDGE DECK OVERLAY', 'Deck Overlay', 'SY', '506', 'BRIDGE', 45.00, 75.00, 120.00, FALSE, FALSE, TRUE, TRUE, ARRAY['Weather', 'Traffic control', 'Cure time'], 'Latex modified typical', '506'),
('507101', 'BRIDGE RAIL, CONCRETE', 'Concrete Bridge Rail', 'LF', '507', 'BRIDGE', 85.00, 140.00, 220.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Forming complexity'], 'F-shape standard', '507'),
('507102', 'BRIDGE EXPANSION JOINT', 'Expansion Joint', 'LF', '507', 'BRIDGE', 200.00, 350.00, 550.00, FALSE, TRUE, FALSE, FALSE, ARRAY['Type selection', 'Installation precision'], 'Critical detail', '507'),

-- GUARDRAIL & BARRIER (Division 606)
('606101', 'GUARDRAIL, W-BEAM', 'W-Beam Guardrail', 'LF', '606', 'GUARDRAIL', 18.00, 28.00, 42.00, FALSE, TRUE, FALSE, FALSE, ARRAY['Post driving conditions', 'End treatment selection'], NULL, '606'),
('606102', 'GUARDRAIL, THRIE BEAM', 'Thrie Beam Guardrail', 'LF', '606', 'GUARDRAIL', 25.00, 40.00, 60.00, FALSE, TRUE, FALSE, FALSE, ARRAY['Post driving conditions'], NULL, '606'),
('606201', 'GUARDRAIL END TREATMENT, TYPE I', 'End Treatment Type I', 'EACH', '606', 'GUARDRAIL', 1500.00, 2500.00, 4000.00, FALSE, TRUE, FALSE, FALSE, ARRAY['Site conditions', 'Product availability'], 'MASH approved', '606'),
('606301', 'TEMPORARY CONCRETE BARRIER', 'Temp Barrier', 'LF', '606', 'GUARDRAIL', 8.00, 15.00, 25.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Availability', 'Placement access'], 'Rental often cheaper', '606'),

-- SIGNING (Division 701-703)
('701101', 'PERMANENT SIGN, TYPE A', 'Sign Type A', 'SF', '701', 'SIGNING', 25.00, 45.00, 75.00, FALSE, TRUE, FALSE, FALSE, ARRAY['Fabrication lead time'], NULL, '701'),
('701102', 'PERMANENT SIGN, TYPE C', 'Sign Type C', 'SF', '701', 'SIGNING', 30.00, 55.00, 90.00, FALSE, TRUE, FALSE, FALSE, ARRAY['Fabrication lead time'], 'Reflective sheeting', '701'),
('702101', 'SIGN POST, BREAKAWAY', 'Breakaway Post', 'EACH', '702', 'SIGNING', 150.00, 275.00, 450.00, FALSE, TRUE, FALSE, FALSE, ARRAY['Foundation conditions'], NULL, '702'),
('703101', 'DELINEATOR POST', 'Delineator', 'EACH', '703', 'SIGNING', 30.00, 55.00, 90.00, FALSE, FALSE, FALSE, FALSE, NULL, NULL, '703'),

-- PAVEMENT MARKINGS (Division 705)
('705101', 'PAVEMENT MARKING, PAINT, 4"', '4" Paint Line', 'LF', '705', 'STRIPING', 0.08, 0.15, 0.25, FALSE, TRUE, TRUE, FALSE, ARRAY['Weather', 'Traffic control'], 'Min temp 50F', '705'),
('705102', 'PAVEMENT MARKING, PAINT, 8"', '8" Paint Line', 'LF', '705', 'STRIPING', 0.15, 0.28, 0.45, FALSE, TRUE, TRUE, FALSE, ARRAY['Weather', 'Traffic control'], 'Min temp 50F', '705'),
('705201', 'PAVEMENT MARKING, THERMOPLASTIC, 4"', '4" Thermo Line', 'LF', '705', 'STRIPING', 0.50, 0.85, 1.35, FALSE, TRUE, TRUE, FALSE, ARRAY['Weather', 'Surface temp'], 'Min temp 60F', '705'),
('705301', 'RAISED PAVEMENT MARKER', 'RPM', 'EACH', '705', 'STRIPING', 3.00, 5.50, 9.00, FALSE, TRUE, FALSE, FALSE, ARRAY['Adhesive conditions'], NULL, '705'),

-- TRAFFIC CONTROL (Division 901)
('901101', 'MAINTENANCE OF TRAFFIC', 'MOT', 'LS', '901', 'TRAFFIC_CONTROL', NULL, NULL, NULL, TRUE, TRUE, FALSE, FALSE, ARRAY['Complexity', 'Duration changes', 'Night work'], 'Critical for schedule', '901'),
('901102', 'CONSTRUCTION SIGNS', 'Const Signs', 'EACH', '901', 'TRAFFIC_CONTROL', 50.00, 100.00, 175.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Quantity changes'], NULL, '901'),
('901103', 'TEMPORARY PAVEMENT MARKING', 'Temp Striping', 'LF', '901', 'TRAFFIC_CONTROL', 0.20, 0.40, 0.65, FALSE, TRUE, TRUE, FALSE, ARRAY['Duration', 'Weather'], 'May need multiple applications', '901'),
('901104', 'FLAGGING', 'Flagging', 'HR', '901', 'TRAFFIC_CONTROL', 35.00, 55.00, 85.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Duration extensions'], 'Certified flaggers required', '901'),
('901105', 'PILOT CAR', 'Pilot Car', 'HR', '901', 'TRAFFIC_CONTROL', 45.00, 75.00, 115.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Duration extensions'], NULL, '901'),

-- LANDSCAPING (Division 801)
('801101', 'SEEDING', 'Seeding', 'SY', '801', 'LANDSCAPING', 0.30, 0.55, 0.95, FALSE, FALSE, TRUE, FALSE, ARRAY['Weather windows', 'Establishment'], 'Seasonal limitations', '801'),
('801102', 'MULCHING', 'Mulching', 'SY', '801', 'LANDSCAPING', 0.20, 0.35, 0.60, FALSE, FALSE, TRUE, FALSE, ARRAY['Wind', 'Rain'], NULL, '801'),
('801103', 'TOPSOIL', 'Topsoil', 'CY', '801', 'LANDSCAPING', 25.00, 45.00, 75.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Source availability'], NULL, '801'),
('801104', 'SOD', 'Sod', 'SY', '801', 'LANDSCAPING', 4.00, 7.50, 12.00, FALSE, TRUE, TRUE, FALSE, ARRAY['Availability', 'Weather'], 'Irrigation needed', '801'),
('801201', 'EROSION CONTROL BLANKET', 'EC Blanket', 'SY', '801', 'LANDSCAPING', 1.50, 2.75, 4.50, FALSE, FALSE, FALSE, FALSE, NULL, NULL, '801'),
('801202', 'SILT FENCE', 'Silt Fence', 'LF', '801', 'LANDSCAPING', 2.00, 3.50, 5.50, FALSE, FALSE, FALSE, FALSE, ARRAY['Maintenance requirements'], NULL, '801'),

-- UTILITIES (Division 802)
('802101', 'UTILITY RELOCATION ALLOWANCE', 'Utility Reloc', 'LS', '802', 'UTILITIES', NULL, NULL, NULL, TRUE, FALSE, FALSE, TRUE, ARRAY['Coordination', 'Permits', 'Unknown conditions'], 'Coordinate early', '802'),
('802102', 'ADJUSTMENT OF EXISTING MANHOLE', 'Adj Manhole', 'EACH', '802', 'UTILITIES', 800.00, 1400.00, 2200.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Utility coordination'], NULL, '802'),
('802103', 'ADJUSTMENT OF EXISTING VALVE BOX', 'Adj Valve Box', 'EACH', '802', 'UTILITIES', 350.00, 600.00, 950.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Utility coordination'], NULL, '802'),

-- ENVIRONMENTAL (Division 803)
('803101', 'ENVIRONMENTAL MONITORING', 'Env Monitoring', 'LS', '803', 'ENVIRONMENTAL', NULL, NULL, NULL, TRUE, FALSE, FALSE, FALSE, ARRAY['Permit conditions', 'Duration'], 'May require specialists', '803'),
('803102', 'STREAM DIVERSION', 'Stream Diversion', 'LS', '803', 'ENVIRONMENTAL', NULL, NULL, NULL, TRUE, FALSE, TRUE, FALSE, ARRAY['Permit timing', 'Flow conditions'], 'Seasonal restrictions', '803'),
('803103', 'WATER QUALITY MONITORING', 'WQ Monitoring', 'DAY', '803', 'ENVIRONMENTAL', 400.00, 700.00, 1100.00, FALSE, FALSE, FALSE, FALSE, ARRAY['Permit requirements', 'Duration'], NULL, '803')

ON CONFLICT (item_code) DO UPDATE SET
    description = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    unit_of_measure = EXCLUDED.unit_of_measure,
    division = EXCLUDED.division,
    work_category = EXCLUDED.work_category,
    typical_unit_price_low = EXCLUDED.typical_unit_price_low,
    typical_unit_price_median = EXCLUDED.typical_unit_price_median,
    typical_unit_price_high = EXCLUDED.typical_unit_price_high,
    is_lump_sum = EXCLUDED.is_lump_sum,
    is_force_sub = EXCLUDED.is_force_sub,
    is_weather_sensitive = EXCLUDED.is_weather_sensitive,
    is_critical_path_typical = EXCLUDED.is_critical_path_typical,
    common_risk_factors = EXCLUDED.common_risk_factors,
    typical_productivity_notes = EXCLUDED.typical_productivity_notes,
    specs_section = EXCLUDED.specs_section,
    updated_at = CURRENT_TIMESTAMP;

-- Update statistics
COMMENT ON TABLE public.master_wvdoh_items IS 'Master list of WVDOH bid items with pricing data and risk factors. Seeded with common highway construction items.';
