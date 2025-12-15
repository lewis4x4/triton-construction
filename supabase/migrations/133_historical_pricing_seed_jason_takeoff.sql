-- ============================================================================
-- Migration 133: Historical Pricing Seed Data from JASON TAKEOFF.xlsx
-- ============================================================================
-- PURPOSE: Seed accurate unit pricing for demo bid items
-- These prices are from actual Triton takeoff data for project 2023220005
-- Total: $3,658,662.39
-- ============================================================================

DO $$
DECLARE
  v_org_id UUID := '63555da4-55d1-462b-aafb-e3ef32f745cc'; -- Triton Construction
BEGIN
  -- Delete any existing historical pricing for these items to avoid duplicates
  DELETE FROM public.historical_bid_pricing
  WHERE organization_id = v_org_id
    AND source_project_name = 'JASON TAKEOFF - Demo Bid Pricing';

  -- Insert pricing from JASON TAKEOFF.xlsx (55 items, $3,658,662.39 total)
  INSERT INTO public.historical_bid_pricing (
    organization_id,
    item_number,
    item_number_normalized,
    description,
    unit,
    quantity,
    unit_price,
    extended_price,
    source_project_name,
    source_project_number,
    letting_date,
    bid_result,
    was_low_bidder,
    county,
    wvdoh_district,
    project_type,
    confidence_weight
  ) VALUES
    (v_org_id, '201001-000', '201.1', 'CLEARING AND GRUBBING', 'LS', 1.0, 51000.0, 51000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '204001-000', '204.1', 'MOBILIZATION', 'LS', 1.0, 288000.0, 288000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '408002-001', '408.2', 'ASPHALT MATERIAL', 'GA', 80.0, 3.0, 240.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '415005-001', '415.5', 'STANDARD MILLING', 'SY', 616.0, 5.0, 3080.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '607001-001', '607.1', 'TYPE 1 GUARDRAIL, CLASS', 'LF', 337.5, 28.32, 9558.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '607006-001', '607.6', 'THRIE BEAM GUARDRAIL BRIDGE TRANSITION', 'EA', 4.0, 2260.0, 9040.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '607010-020', '607.10', 'GUARDRAIL REMOVAL', 'LF', 327.0, 2.5, 817.50, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '609001-001', '609.1', 'CONCRETE SIDEWALK', 'SY', 12.0, 110.0, 1320.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '609002-001', '609.2', 'BED COURSE MATERIAL', 'CY', 2.0, 250.0, 500.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '610001-001', '610.1', 'PLAIN CONCRETE CURBING, TYPE I', 'LF', 25.0, 88.0, 2200.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636007-002', '636.7', 'ERADICATION OF PAVEMENT MARKING', 'SF', 2821.0, 4.0, 11284.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636008-002', '636.8', 'TEMPORARY PAVEMENT MARKING-PAINT 6 IN', 'LF', 2821.0, 0.31, 874.51, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636011-001', '636.11', 'TRAFFIC CONTROL DEVICE', 'UN', 4380.0, 1.45, 6351.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636012-010', '636.12', 'PROJECT TRAFFIC CONTROL DEVICE CLEANING', 'EA', 1.0, 1000.0, 1000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636013-001', '636.13', 'INDIVIDUAL TRAFFIC CONTROL DEVICE CLEANING', 'EA', 17.0, 10.0, 170.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636014-001', '636.14', 'FLAGGER', 'HR', 75.0, 65.0, 4875.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636017-005', '636.17', 'TEMPORARY BARRIER, TL-3,', 'LF', 556.0, 55.0, 30580.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636018-003', '636.18', 'REMOVE AND RESET TEMPORARY BARRIER', 'LF', 556.0, 18.0, 10008.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636023-002', '636.23', 'TEMPORARY TRAFFIC SIGNAL, PORTABLE', 'MO', 24.0, 1500.0, 36000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636025-001', '636.25', 'WARNING LIGHTS, TYPE', 'DA', 1800.0, 2.75, 4950.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636060-002', '636.60', 'REMOVE AND RESET ATTENUATOR DEVICE', 'EA', 2.0, 2500.0, 5000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '636060-020', '636.60', 'TEMPORARY IMPACT ATTENUATING DEVICE, C-1, TL-3', 'EA', 2.0, 9500.0, 19000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '639001-001', '639.1', 'CONSTRUCTION LAYOUT STAKE', 'LS', 1.0, 30000.0, 30000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '661011-001', '661.11', 'INSTALLATION OF REUSABLE SIGN', 'EA', 4.0, 635.0, 2540.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '663001-026', '663.1', 'EDGE LINE, TYPE II - 6 IN', 'LF', 1104.0, 0.34, 375.36, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '663002-040', '663.2', 'CENTERLINE, TYPE II  - 6 IN', 'LF', 1104.0, 0.34, 375.36, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '663015-005', '663.15', 'RAILROAD CROSSING MARKING, TYPE V', 'EA', 1.0, 1000.0, 1000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '402001-020', '402.1', 'MARSHALL ASPHALT SKID PVT, SG, TY I', 'TN', 50.0, 165.0, 8250.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '402001-021', '402.1', 'MARSHALL ASPHALT SKID PVT, S, TY I', 'TN', 48.0, 293.0, 14064.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '203001-000', '203.1', 'DISMANTLING STRUCTURE', 'LS', 1.0, 603700.0, 603700.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '212010-003', '212.10', 'SHORING', 'LS', 1.0, 110000.0, 110000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '307001-000', '307.1', 'AGGREGATE BASE COURSE, CLASS', 'CY', 316.0, 152.0, 48032.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '502001-012', '502.1', '12 INCH PORTLAND CEMENT CONCRETE APPROACH SLAB', 'SY', 148.0, 685.0, 101380.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '601002-001', '601.2', 'CLASS B CONCRETE', 'CY', 10.0, 3600.0, 36000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '601003-001', '601.3', 'CLASS K CONCRETE', 'CY', 17.0, 3700.0, 62900.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '601009-001', '601.9', 'CLASS H CONCRETE', 'CY', 86.0, 3400.0, 292400.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '601019-001', '601.19', 'CONCRETE PROTECTIVE COATING', 'SF', 11475.0, 3.0, 34425.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '601030-000', '601.30', 'PATCHING CONCRETE STRUCTURES', 'SF', 1102.0, 320.0, 352640.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '602001-001', '602.1', 'REINFORCING STEEL BAR', 'LB', 2322.0, 3.78, 8777.16, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '602002-001', '602.2', 'EPOXY COATED REINFORCING STEEL BAR', 'LB', 16378.0, 3.5, 57323.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '615026-001', '615.26', 'FABRICATED STRUCTURAL STEEL (MISCELLANEOUS STEEL REPAIRS)', 'LB', 1885.0, 12.5, 23562.50, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '615029-001', '615.29', 'NON-GUIDED BEARING,', 'EA', 10.0, 4500.0, 45000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '615039-001', '615.39', 'JACKING STEEL SUPERSTRUCTURE', 'LS', 1.0, 110000.0, 110000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '627025-002', '627.25', 'EXPANSION JOINT SYSTEM BEHIND THE APPROACH SLAB, PREFORMED SILICONE COATED FOAM', 'LF', 90.0, 95.0, 8550.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '639001-001', '639.1', 'CONSTRUCTION LAYOUT STAKE', 'LS', 1.0, 5000.0, 5000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '645001-001', '645.1', 'PRIMARY REINFORCEMENT,', 'SY', 1328.0, 25.0, 33200.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '662003-001', '662.3', 'POLYVINYLCHLORIDE CONDUIT,', 'LS', 1.0, 8000.0, 8000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '679001-001', '679.1', 'CONCRETE DECK OVERLAY', 'SY', 1220.0, 356.0, 434320.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '679006-001', '679.6', 'TEST SLAB', 'LS', 1.0, 5000.0, 5000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '685001-001', '685.1', 'BRIDGE CLEANING', 'LS', 1.0, 20000.0, 20000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '688001-001', '688.1', 'CLEAN AND PAINT EXISTING STEEL BRIDGE', 'LS', 1.0, 650000.0, 650000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '688003-001', '688.3', 'CONTAINMENT AND DISPOSAL OF SPENT MATERIAL', 'LS', 1.0, 20000.0, 20000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '697001-001', '697.1', 'NBIS BRIDGE SAFETY INSPECTION', 'EA', 1.0, 12000.0, 12000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '697001-001', '697.1', 'NBIS BRIDGE SAFETY INSPECTION', 'EA', 1.0, 12000.0, 12000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0),
    (v_org_id, '697001-001', '697.1', 'NBIS BRIDGE SAFETY INSPECTION', 'EA', 1.0, 12000.0, 12000.00, 'JASON TAKEOFF - Demo Bid Pricing', '2023220005', '2025-01-15', 'WON', TRUE, 'WIRT', 3, 'BRIDGE', 1.0);

  RAISE NOTICE 'Inserted 55 historical bid pricing records from JASON TAKEOFF.xlsx';
END $$;

-- ============================================================================
-- Summary: This migration seeds historical pricing data that will be used by
-- the get_ai_suggested_price() function when EBSX files are parsed.
-- When a new bid is created from an EBSX upload, the parse-bidx function will:
--   1. Look up each item number in historical_bid_pricing
--   2. Find these prices (confidence_weight = 1.0)
--   3. Apply them as ai_suggested_price on bid_line_items
-- Total bid value: $3,658,662.39
-- ============================================================================
