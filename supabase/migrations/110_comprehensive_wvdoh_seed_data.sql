-- ============================================================================
-- Migration 110: Comprehensive WVDOH Item Seed Data
-- ============================================================================
-- PURPOSE: Add complete seed pricing data for all common WVDOH bid items
-- This provides sample pricing for proof of concept demos until real
-- historical bid data is available from client.
-- ============================================================================

-- Insert comprehensive WVDOH items with sample pricing
-- Using ON CONFLICT to avoid duplicates with existing seed data
INSERT INTO public.wvdoh_item_master (
  item_number,
  item_number_normalized,
  description,
  unit,
  work_category,
  base_unit_price,
  notes
) VALUES
  -- ============================================================================
  -- 100 SERIES: GENERAL REQUIREMENTS
  -- ============================================================================
  ('109.01', '109.1', 'MOBILIZATION', 'LS', 'GENERAL', 0.00, 'Typically 5-10% of total bid'),
  ('109.10', '109.10', 'MOBILIZATION, PARTIAL', 'LS', 'GENERAL', 0.00, 'Partial mobilization'),

  -- ============================================================================
  -- 200 SERIES: EARTHWORK
  -- ============================================================================
  ('201.01', '201.1', 'CLEARING AND GRUBBING', 'ACRE', 'EARTHWORK', 8500.00, 'Per acre clearing'),
  ('201.10', '201.10', 'CLEARING AND GRUBBING, LUMP SUM', 'LS', 'EARTHWORK', 0.00, 'Lump sum clearing'),
  ('204.01', '204.1', 'MOBILIZATION', 'LS', 'GENERAL', 0.00, 'Alternate mobilization item'),
  ('210.01', '210.1', 'FOUNDATION CONDITIONING', 'SY', 'EARTHWORK', 3.50, 'Foundation preparation'),
  ('212.01', '212.1', 'SHORING', 'SF', 'EARTHWORK', 18.00, 'Temporary shoring'),
  ('212.10', '212.10', 'SHORING', 'SF', 'EARTHWORK', 18.00, 'Shoring systems'),
  ('212.20', '212.20', 'SHORING, TRENCH', 'LF', 'EARTHWORK', 45.00, 'Trench shoring per LF'),

  -- ============================================================================
  -- 300 SERIES: BASES AND SUBBASES
  -- ============================================================================
  ('304.01', '304.1', 'AGGREGATE BASE COURSE', 'TON', 'BASE', 28.00, 'Standard aggregate base'),
  ('307.01', '307.1', 'AGGREGATE BASE COURSE, CLASS', 'TON', 'BASE', 32.00, 'Classified aggregate base'),
  ('307.10', '307.10', 'AGGREGATE BASE COURSE, CLASS 1', 'TON', 'BASE', 35.00, 'Class 1 aggregate'),
  ('307.20', '307.20', 'AGGREGATE BASE COURSE, CLASS 2', 'TON', 'BASE', 30.00, 'Class 2 aggregate'),
  ('307.30', '307.30', 'AGGREGATE BASE COURSE, CLASS 3', 'TON', 'BASE', 28.00, 'Class 3 aggregate'),
  ('310.01', '310.1', 'FULL DEPTH RECLAMATION', 'SY', 'BASE', 4.50, 'FDR stabilization'),

  -- ============================================================================
  -- 400 SERIES: ASPHALT PAVEMENTS
  -- ============================================================================
  ('402.01', '402.1', 'MARSHALL ASPHALT SKID PVT, SG, TY I', 'TON', 'ASPHALT', 95.00, 'Marshall mix Type I'),
  ('402.10', '402.10', 'MARSHALL ASPHALT SKID PVT, S, TY I', 'TON', 'ASPHALT', 92.00, 'Marshall mix S Type I'),
  ('402.20', '402.20', 'MARSHALL ASPHALT SKID PVT, TY II', 'TON', 'ASPHALT', 98.00, 'Marshall mix Type II'),
  ('408.01', '408.1', 'ASPHALT MATERIAL', 'TON', 'ASPHALT', 650.00, 'Liquid asphalt material'),
  ('408.02', '408.2', 'ASPHALT MATERIAL', 'GAL', 'ASPHALT', 3.50, 'Liquid asphalt per gallon'),
  ('408.10', '408.10', 'ASPHALT MATERIAL, TACK COAT', 'GAL', 'ASPHALT', 2.75, 'Tack coat material'),
  ('408.20', '408.20', 'ASPHALT MATERIAL, PRIME COAT', 'GAL', 'ASPHALT', 3.00, 'Prime coat material'),
  ('415.01', '415.1', 'MILLING', 'SY', 'ASPHALT', 3.50, 'Pavement milling'),
  ('415.05', '415.5', 'STANDARD MILLING', 'SY', 'ASPHALT', 4.00, 'Standard depth milling'),
  ('415.10', '415.10', 'MILLING, 1 INCH', 'SY', 'ASPHALT', 2.50, '1 inch milling depth'),
  ('415.20', '415.20', 'MILLING, 2 INCH', 'SY', 'ASPHALT', 4.50, '2 inch milling depth'),
  ('415.30', '415.30', 'MILLING, VARIABLE DEPTH', 'SY', 'ASPHALT', 5.50, 'Variable depth milling'),

  -- ============================================================================
  -- 500 SERIES: CONCRETE STRUCTURES
  -- ============================================================================
  ('502.01', '502.1', 'PORTLAND CEMENT CONCRETE', 'CY', 'CONCRETE', 750.00, 'Standard PCC'),
  ('502.10', '502.10', 'APPROACH SLAB, 12 INCH', 'SY', 'CONCRETE', 185.00, '12 inch approach slab'),

  -- ============================================================================
  -- 600 SERIES: DRAINAGE AND STRUCTURES
  -- ============================================================================
  ('601.02', '601.2', 'CLASS B CONCRETE', 'CY', 'CONCRETE', 650.00, 'Class B structural concrete'),
  ('601.03', '601.3', 'CLASS K CONCRETE', 'CY', 'CONCRETE', 850.00, 'Class K high strength concrete'),
  ('601.09', '601.9', 'CLASS H CONCRETE', 'CY', 'CONCRETE', 725.00, 'Class H concrete'),
  ('601.19', '601.19', 'CONCRETE PROTECTIVE COATING', 'SF', 'CONCRETE', 4.50, 'Protective coating'),
  ('601.18', '601.18', 'PIPE, RCP, 54 INCH', 'LF', 'DRAINAGE', 285.00, '54 inch RCP'),

  -- ============================================================================
  -- 606-607 SERIES: GUARDRAIL AND FENCING
  -- ============================================================================
  ('606.05', '606.5', 'GUARDRAIL TERMINAL SECTION', 'EACH', 'GUARDRAIL', 2200.00, 'Terminal end treatment'),
  ('607.01', '607.1', 'TYPE 1 GUARDRAIL, CLASS', 'LF', 'GUARDRAIL', 28.00, 'Type 1 guardrail'),
  ('607.06', '607.6', 'THRIE BEAM GUARDRAIL BRIDGE TRANSITION', 'LF', 'GUARDRAIL', 65.00, 'Bridge transition'),
  ('607.10', '607.10', 'GUARDRAIL REMOVAL', 'LF', 'GUARDRAIL', 8.50, 'Remove existing guardrail'),
  ('607.15', '607.15', 'GUARDRAIL RESET', 'LF', 'GUARDRAIL', 22.00, 'Reset existing guardrail'),
  ('607.20', '607.20', 'END ANCHOR', 'EACH', 'GUARDRAIL', 1800.00, 'End anchor assembly'),

  -- ============================================================================
  -- 609-610 SERIES: CURB AND SIDEWALK
  -- ============================================================================
  ('609.01', '609.1', 'CONCRETE SIDEWALK', 'SF', 'CONCRETE', 8.50, '4 inch sidewalk'),
  ('609.02', '609.2', 'BED COURSE MATERIAL', 'TON', 'BASE', 35.00, 'Sidewalk bed course'),
  ('609.05', '609.5', 'CONCRETE SIDEWALK, 6 INCH', 'SF', 'CONCRETE', 10.50, '6 inch sidewalk'),
  ('609.10', '609.10', 'CONCRETE DRIVEWAY', 'SF', 'CONCRETE', 12.00, 'Concrete driveway'),
  ('610.01', '610.1', 'PLAIN CONCRETE CURBING, TYPE I', 'LF', 'CONCRETE', 22.00, 'Type I curbing'),
  ('610.02', '610.2', 'PLAIN CONCRETE CURBING, TYPE II', 'LF', 'CONCRETE', 25.00, 'Type II curbing'),
  ('610.05', '610.5', 'COMBINATION CURB AND GUTTER', 'LF', 'CONCRETE', 32.00, 'Curb and gutter'),
  ('610.10', '610.10', 'CURB RAMP', 'EACH', 'CONCRETE', 1850.00, 'ADA curb ramp'),

  -- ============================================================================
  -- 615 SERIES: STRUCTURAL STEEL
  -- ============================================================================
  ('615.01', '615.1', 'STRUCTURAL STEEL', 'LB', 'STRUCTURAL', 3.25, 'Structural steel'),
  ('615.10', '615.10', 'HIGH STRENGTH BOLTS', 'EACH', 'STRUCTURAL', 8.50, 'HS bolts'),
  ('615.26', '615.26', 'FABRICATED STRUCTURAL STEEL', 'LB', 'STRUCTURAL', 4.50, 'Misc structural steel'),
  ('615.29', '615.29', 'NON-GUIDED BEARING', 'EACH', 'STRUCTURAL', 2500.00, 'Non-guided bearing assembly'),
  ('615.30', '615.30', 'GUIDED BEARING', 'EACH', 'STRUCTURAL', 3200.00, 'Guided bearing assembly'),
  ('615.39', '615.39', 'JACKING STEEL SUPERSTRUCTURE', 'LS', 'STRUCTURAL', 0.00, 'Lump sum jacking'),
  ('615.40', '615.40', 'STEEL DIAPHRAGM', 'LB', 'STRUCTURAL', 4.25, 'Steel diaphragm'),

  -- ============================================================================
  -- 627 SERIES: EXPANSION JOINTS
  -- ============================================================================
  ('627.01', '627.1', 'EXPANSION JOINT', 'LF', 'STRUCTURAL', 185.00, 'Standard expansion joint'),
  ('627.10', '627.10', 'EXPANSION JOINT SYSTEM', 'LF', 'STRUCTURAL', 225.00, 'Joint system'),
  ('627.25', '627.25', 'EXPANSION JOINT SYSTEM BEHIND APPROACH SLAB', 'LF', 'STRUCTURAL', 275.00, 'Approach slab joint'),
  ('627.30', '627.30', 'COMPRESSION SEAL', 'LF', 'STRUCTURAL', 65.00, 'Compression seal joint'),

  -- ============================================================================
  -- 636 SERIES: TRAFFIC CONTROL
  -- ============================================================================
  ('636.01', '636.1', 'THERMOPLASTIC PAVEMENT MARKINGS 4IN', 'LF', 'MARKINGS', 0.85, '4 inch thermo'),
  ('636.10', '636.10', 'TRAFFIC CONTROL, LUMP SUM', 'LS', 'TRAFFIC', 0.00, 'Lump sum traffic control'),
  ('636.11', '636.11', 'TRAFFIC CONTROL DEVICE', 'EACH', 'TRAFFIC', 125.00, 'Traffic control device'),
  ('636.12', '636.12', 'PROJECT TRAFFIC CONTROL DEVICE CLEANING', 'LS', 'TRAFFIC', 0.00, 'Device cleaning LS'),
  ('636.13', '636.13', 'INDIVIDUAL TRAFFIC CONTROL DEVICE CLEANING', 'EACH', 'TRAFFIC', 15.00, 'Per device cleaning'),
  ('636.14', '636.14', 'FLAGGER', 'HR', 'TRAFFIC', 45.00, 'Flagger per hour'),
  ('636.15', '636.15', 'PILOT CAR', 'HR', 'TRAFFIC', 75.00, 'Pilot car per hour'),
  ('636.17', '636.17', 'TEMPORARY BARRIER, TL-3', 'LF', 'TRAFFIC', 28.00, 'TL-3 barrier'),
  ('636.18', '636.18', 'REMOVE AND RESET TEMPORARY BARRIER', 'LF', 'TRAFFIC', 8.50, 'Reset barrier'),
  ('636.20', '636.20', 'TEMPORARY BARRIER, TL-4', 'LF', 'TRAFFIC', 35.00, 'TL-4 barrier'),
  ('636.23', '636.23', 'TEMPORARY TRAFFIC SIGNAL, PORTABLE', 'DAY', 'TRAFFIC', 450.00, 'Portable signal per day'),
  ('636.25', '636.25', 'WARNING LIGHTS, TYPE', 'EACH', 'TRAFFIC', 85.00, 'Warning light'),
  ('636.30', '636.30', 'ARROW BOARD', 'DAY', 'TRAFFIC', 125.00, 'Arrow board per day'),
  ('636.35', '636.35', 'CHANGEABLE MESSAGE SIGN', 'DAY', 'TRAFFIC', 175.00, 'CMS per day'),
  ('636.40', '636.40', 'TEMPORARY PAVEMENT MARKING', 'LF', 'TRAFFIC', 0.45, 'Temp marking'),
  ('636.50', '636.50', 'IMPACT ATTENUATOR', 'EACH', 'TRAFFIC', 8500.00, 'Impact attenuator'),
  ('636.60', '636.60', 'REMOVE AND RESET ATTENUATOR DEVICE', 'EACH', 'TRAFFIC', 1500.00, 'Reset attenuator'),
  ('636.65', '636.65', 'TEMPORARY IMPACT ATTENUATING DEVICE', 'EACH', 'TRAFFIC', 4500.00, 'Temp attenuator'),
  ('636.70', '636.7', 'ERADICATION OF PAVEMENT MARKING', 'SF', 'MARKINGS', 2.50, 'Remove marking'),
  ('636.75', '636.75', 'ERADICATION OF PAVEMENT MARKING, LINE', 'LF', 'MARKINGS', 0.85, 'Remove line marking'),
  ('636.80', '636.8', 'TEMPORARY PAVEMENT MARKING-PAINT 6 IN', 'LF', 'MARKINGS', 0.55, '6 inch temp paint'),

  -- ============================================================================
  -- 639 SERIES: SURVEY AND STAKING
  -- ============================================================================
  ('639.01', '639.1', 'CONSTRUCTION LAYOUT STAKE', 'LS', 'SURVEY', 0.00, 'Staking lump sum'),
  ('639.10', '639.10', 'CONSTRUCTION STAKING, ROADWAY', 'STA', 'SURVEY', 450.00, 'Roadway staking per station'),
  ('639.20', '639.20', 'CONSTRUCTION STAKING, STRUCTURE', 'EACH', 'SURVEY', 1500.00, 'Structure staking'),

  -- ============================================================================
  -- 645 SERIES: REINFORCING STEEL (STRUCTURES)
  -- ============================================================================
  ('645.01', '645.1', 'PRIMARY REINFORCEMENT', 'LB', 'STRUCTURAL', 1.35, 'Primary rebar'),
  ('645.02', '645.2', 'SECONDARY REINFORCEMENT', 'LB', 'STRUCTURAL', 1.25, 'Secondary rebar'),
  ('645.05', '645.5', 'EPOXY COATED REINFORCEMENT', 'LB', 'STRUCTURAL', 1.65, 'Epoxy coated rebar'),
  ('645.10', '645.10', 'DOWEL BARS', 'EACH', 'STRUCTURAL', 12.00, 'Dowel bar each'),

  -- ============================================================================
  -- 661-663 SERIES: SIGNS AND MARKINGS
  -- ============================================================================
  ('661.01', '661.1', 'SIGN', 'SF', 'SIGNS', 35.00, 'Sign per SF'),
  ('661.10', '661.10', 'SIGN POST', 'LF', 'SIGNS', 18.00, 'Sign post'),
  ('661.11', '661.11', 'INSTALLATION OF REUSABLE SIGN', 'EACH', 'SIGNS', 125.00, 'Install existing sign'),
  ('661.15', '661.15', 'REMOVE SIGN', 'EACH', 'SIGNS', 45.00, 'Remove sign'),
  ('661.20', '661.20', 'RESET SIGN', 'EACH', 'SIGNS', 85.00, 'Reset existing sign'),
  ('662.01', '662.1', 'CONDUIT', 'LF', 'ELECTRICAL', 8.50, 'Electrical conduit'),
  ('662.03', '662.3', 'POLYVINYLCHLORIDE CONDUIT', 'LF', 'ELECTRICAL', 6.50, 'PVC conduit'),
  ('662.05', '662.5', 'RIGID METAL CONDUIT', 'LF', 'ELECTRICAL', 12.00, 'RMC conduit'),
  ('662.10', '662.10', 'PULL BOX', 'EACH', 'ELECTRICAL', 450.00, 'Electrical pull box'),
  ('663.01', '663.1', 'EDGE LINE, TYPE II - 6 IN', 'LF', 'MARKINGS', 0.95, '6 inch edge line'),
  ('663.05', '663.5', 'EDGE LINE, TYPE II - 4 IN', 'LF', 'MARKINGS', 0.75, '4 inch edge line'),
  ('663.10', '663.10', 'LANE LINE, TYPE II - 6 IN', 'LF', 'MARKINGS', 0.95, '6 inch lane line'),
  ('663.15', '663.15', 'RAILROAD CROSSING MARKING, TYPE V', 'EACH', 'MARKINGS', 650.00, 'RR crossing marking'),
  ('663.20', '663.2', 'CENTERLINE, TYPE II - 6 IN', 'LF', 'MARKINGS', 0.95, '6 inch centerline'),
  ('663.25', '663.25', 'CENTERLINE, TYPE II - 4 IN', 'LF', 'MARKINGS', 0.75, '4 inch centerline'),
  ('663.30', '663.30', 'CROSSWALK MARKING', 'SF', 'MARKINGS', 8.50, 'Crosswalk per SF'),
  ('663.35', '663.35', 'STOP BAR', 'LF', 'MARKINGS', 12.00, 'Stop bar'),
  ('663.40', '663.40', 'ARROW', 'EACH', 'MARKINGS', 125.00, 'Directional arrow'),
  ('663.45', '663.45', 'WORD MARKING', 'EACH', 'MARKINGS', 185.00, 'Word marking (STOP, etc.)'),
  ('663.50', '663.50', 'RAISED PAVEMENT MARKER', 'EACH', 'MARKINGS', 8.50, 'RPM each'),

  -- ============================================================================
  -- 679 SERIES: BRIDGE DECK WORK
  -- ============================================================================
  ('679.01', '679.1', 'CONCRETE DECK OVERLAY', 'SY', 'BRIDGE', 125.00, 'Deck overlay'),
  ('679.05', '679.5', 'LATEX MODIFIED CONCRETE OVERLAY', 'SY', 'BRIDGE', 145.00, 'LMC overlay'),
  ('679.06', '679.6', 'TEST SLAB', 'EACH', 'BRIDGE', 2500.00, 'Test slab'),
  ('679.10', '679.10', 'DECK SCARIFICATION', 'SY', 'BRIDGE', 18.00, 'Scarify deck'),
  ('679.15', '679.15', 'HYDRO DEMOLITION', 'SY', 'BRIDGE', 65.00, 'Hydro demo'),

  -- ============================================================================
  -- 685-688 SERIES: BRIDGE CLEANING AND PAINTING
  -- ============================================================================
  ('685.01', '685.1', 'BRIDGE CLEANING', 'LS', 'BRIDGE', 0.00, 'Bridge cleaning LS'),
  ('685.05', '685.5', 'BRIDGE CLEANING', 'SF', 'BRIDGE', 2.25, 'Bridge cleaning per SF'),
  ('685.10', '685.10', 'PRESSURE WASHING', 'SF', 'BRIDGE', 1.50, 'Pressure wash'),
  ('688.01', '688.1', 'CLEAN AND PAINT EXISTING STEEL BRIDGE', 'SF', 'BRIDGE', 18.50, 'Clean and paint steel'),
  ('688.03', '688.3', 'CONTAINMENT AND DISPOSAL OF SPENT MATERIAL', 'SF', 'BRIDGE', 8.50, 'Lead paint containment'),
  ('688.05', '688.5', 'PAINT STEEL', 'SF', 'BRIDGE', 12.00, 'Paint steel only'),
  ('688.10', '688.10', 'TOUCH UP PAINT', 'GAL', 'BRIDGE', 125.00, 'Touch up paint'),

  -- ============================================================================
  -- 697 SERIES: BRIDGE INSPECTION
  -- ============================================================================
  ('697.01', '697.1', 'NBIS BR SAFETY INSP', 'LS', 'INSPECTION', 0.00, 'Bridge inspection LS'),
  ('697.05', '697.5', 'INTERIM BRIDGE INSPECTION', 'EACH', 'INSPECTION', 3500.00, 'Interim inspection'),
  ('697.10', '697.10', 'FRACTURE CRITICAL INSPECTION', 'EACH', 'INSPECTION', 5500.00, 'Fracture critical'),
  ('697.15', '697.15', 'UNDERWATER INSPECTION', 'EACH', 'INSPECTION', 4500.00, 'Underwater inspection'),

  -- ============================================================================
  -- 701 SERIES: TRAFFIC CONTROL (MAINTENANCE OF TRAFFIC)
  -- ============================================================================
  ('701.01', '701.1', 'TRAFFIC CONTROL', 'LS', 'TRAFFIC', 0.00, 'MOT lump sum')

ON CONFLICT (item_number) DO UPDATE SET
  description = EXCLUDED.description,
  unit = EXCLUDED.unit,
  work_category = EXCLUDED.work_category,
  base_unit_price = EXCLUDED.base_unit_price,
  notes = EXCLUDED.notes,
  item_number_normalized = EXCLUDED.item_number_normalized;

-- Ensure all normalized values are updated using the normalization function
UPDATE public.wvdoh_item_master
SET item_number_normalized = public.normalize_item_number(item_number)
WHERE item_number_normalized IS NULL
   OR item_number_normalized IS DISTINCT FROM public.normalize_item_number(item_number);

-- ============================================================================
-- Add items with variant suffixes (like -L145, -L225, etc.)
-- These are line-specific variants that should map to base items
-- ============================================================================
-- Create a function to find base item pricing for variant items
CREATE OR REPLACE FUNCTION public.get_base_item_price(p_item_number TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_base_number TEXT;
  v_price NUMERIC;
BEGIN
  -- Extract base item number (remove -Lxxx suffix)
  v_base_number := REGEXP_REPLACE(p_item_number, '-[Ll]\d+$', '');
  v_base_number := public.normalize_item_number(v_base_number);

  -- Look up price
  SELECT base_unit_price INTO v_price
  FROM public.wvdoh_item_master
  WHERE item_number_normalized = v_base_number
  LIMIT 1;

  RETURN v_price;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_base_item_price IS
  'Returns base unit price for variant items (e.g., 636.60-L110 returns price for 636.60)';

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration adds ~120+ additional WVDOH item codes covering:
-- - General requirements (100s)
-- - Earthwork (200s)
-- - Bases and subbases (300s)
-- - Asphalt pavements (400s)
-- - Concrete (500-600s)
-- - Drainage structures (600s)
-- - Guardrail and fencing (606-607s)
-- - Curb and sidewalk (609-610s)
-- - Structural steel (615s)
-- - Expansion joints (627s)
-- - Traffic control (636s)
-- - Survey and staking (639s)
-- - Reinforcing steel (645s)
-- - Signs and markings (661-663s)
-- - Bridge deck work (679s)
-- - Bridge cleaning/painting (685-688s)
-- - Bridge inspection (697s)
-- - Maintenance of traffic (701s)
-- ============================================================================
