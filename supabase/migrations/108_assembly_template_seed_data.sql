-- ============================================================================
-- MIGRATION 108: Assembly Template Seed Data
-- Triton AI Bid Package Engine - Default cost assemblies for common WVDOH items
-- ============================================================================

-- This migration creates default assembly templates with detailed resource
-- breakdowns for the most common WVDOH construction bid items. These assemblies
-- enable automatic base cost calculation when BIDX/EBSX files are parsed.
--
-- FORMULA: Direct Cost + Overhead (15%) + Profit (10%) = Base Unit Cost
-- FINAL PRICE = Base Unit Cost × Adjustment Factors (from AI document analysis)

-- ============================================================================
-- SECTION 1: Insert Assembly Templates
-- ============================================================================

-- Generate UUIDs for each template (using pg_catalog functions)
DO $$
DECLARE
    -- Template IDs
    v_template_roadway_excavation UUID := gen_random_uuid();
    v_template_unclassified_excavation UUID := gen_random_uuid();
    v_template_rock_excavation UUID := gen_random_uuid();
    v_template_embankment UUID := gen_random_uuid();
    v_template_borrow_excavation UUID := gen_random_uuid();
    v_template_18_rcp UUID := gen_random_uuid();
    v_template_24_rcp UUID := gen_random_uuid();
    v_template_36_rcp UUID := gen_random_uuid();
    v_template_type_a_inlet UUID := gen_random_uuid();
    v_template_aggregate_base UUID := gen_random_uuid();
    v_template_asphalt_base UUID := gen_random_uuid();
    v_template_asphalt_intermediate UUID := gen_random_uuid();
    v_template_asphalt_surface UUID := gen_random_uuid();
    v_template_class_a_concrete UUID := gen_random_uuid();
    v_template_reinforcing_steel UUID := gen_random_uuid();
    v_template_guardrail_wbeam UUID := gen_random_uuid();
    v_template_thermo_4in UUID := gen_random_uuid();
    v_template_thermo_24in UUID := gen_random_uuid();
    v_template_clearing_grubbing UUID := gen_random_uuid();
    v_template_pavement_removal UUID := gen_random_uuid();

BEGIN

-- ============================================================================
-- EARTHWORK ASSEMBLIES
-- ============================================================================

-- Template: Roadway Excavation (203101)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_roadway_excavation, NULL,
    'Roadway Excavation - Self Perform',
    'EXCV-RW-01',
    'Standard roadway excavation with on-site haul using owned fleet. Assumes 80% common, 20% rock.',
    '203101', 'EARTHWORK', 'CY', 'One cubic yard of excavated material',
    'CY_PER_DAY', 800.00,
    'Assumes owner fleet: CAT 336 excavator, D6 dozer, 2x articulated trucks. 8-hour day production.',
    'Standard earth conditions, haul distance <2 miles, no water issues',
    TRUE, 1
);

-- Template Lines for Roadway Excavation
INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_roadway_excavation, 1, 'LABOR', 'L-OPR-EXC', 'Excavator Operator', 0.0125, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_roadway_excavation, 2, 'LABOR', 'L-OPR-DOZ', 'Dozer Operator', 0.0100, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_roadway_excavation, 3, 'LABOR', 'L-DRV-TRK', 'Haul Truck Drivers (2)', 0.0200, 'HR', 'Truck Driver', 2.00, 'Truck Driver', 52.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_roadway_excavation, 4, 'LABOR', 'L-LAB-GEN', 'General Laborer (grade work)', 0.0080, 'HR', 'Laborer', 1.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 4),
    (v_template_roadway_excavation, 5, 'EQUIPMENT', 'E-EXC-336', 'CAT 336 Excavator', 0.0125, 'HR', NULL, NULL, NULL, 185.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_roadway_excavation, 6, 'EQUIPMENT', 'E-DOZ-D6', 'CAT D6 Dozer', 0.0100, 'HR', NULL, NULL, NULL, 155.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_roadway_excavation, 7, 'EQUIPMENT', 'E-TRK-ART', 'Articulated Haul Trucks (2)', 0.0200, 'HR', NULL, NULL, NULL, 125.00, 'Internal Fleet Rate', FALSE, TRUE, 12),
    (v_template_roadway_excavation, 8, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 0.15, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Unclassified Excavation (203102)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_unclassified_excavation, NULL,
    'Unclassified Excavation - Self Perform',
    'EXCV-UNC-01',
    'Unclassified excavation including both earth and rock, typical 70/30 split.',
    '203102', 'EARTHWORK', 'CY', 'One cubic yard of excavated material',
    'CY_PER_DAY', 600.00,
    'Assumes mixed earth/rock conditions. Includes ripping for soft rock.',
    'Typical WVDOH unclassified with rippable rock, no blasting required',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_unclassified_excavation, 1, 'LABOR', 'L-OPR-EXC', 'Excavator Operator', 0.0167, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_unclassified_excavation, 2, 'LABOR', 'L-OPR-DOZ', 'Dozer Operator (ripper)', 0.0133, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_unclassified_excavation, 3, 'LABOR', 'L-DRV-TRK', 'Haul Truck Drivers (2)', 0.0267, 'HR', 'Truck Driver', 2.00, 'Truck Driver', 52.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_unclassified_excavation, 4, 'LABOR', 'L-LAB-GEN', 'General Laborer', 0.0100, 'HR', 'Laborer', 1.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 4),
    (v_template_unclassified_excavation, 5, 'EQUIPMENT', 'E-EXC-349', 'CAT 349 Excavator', 0.0167, 'HR', NULL, NULL, NULL, 210.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_unclassified_excavation, 6, 'EQUIPMENT', 'E-DOZ-D8', 'CAT D8 Dozer w/Ripper', 0.0133, 'HR', NULL, NULL, NULL, 195.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_unclassified_excavation, 7, 'EQUIPMENT', 'E-TRK-ART', 'Articulated Haul Trucks (2)', 0.0267, 'HR', NULL, NULL, NULL, 125.00, 'Internal Fleet Rate', FALSE, TRUE, 12),
    (v_template_unclassified_excavation, 8, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 0.20, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Rock Excavation (203103) - Requires Drill & Blast Sub
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_rock_excavation, NULL,
    'Rock Excavation - Drill & Blast',
    'EXCV-ROCK-01',
    'Solid rock excavation requiring drilling and blasting. Blasting subcontracted.',
    '203103', 'EARTHWORK', 'CY', 'One cubic yard of rock',
    'CY_PER_DAY', 200.00,
    'Assumes hard rock requiring full drill/blast. Sub provides drill crew, explosives, blaster.',
    'Solid rock conditions, blasting permits obtainable, adequate clearance',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_rock_excavation, 1, 'SUBCONTRACT', 'SUB-BLAST', 'Drill & Blast Subcontractor', 1.00, 'CY', NULL, NULL, NULL, 18.00, 'Typical Sub Quote', FALSE, TRUE, 1),
    (v_template_rock_excavation, 2, 'LABOR', 'L-OPR-EXC', 'Excavator Operator (load out)', 0.0400, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 5),
    (v_template_rock_excavation, 3, 'LABOR', 'L-DRV-TRK', 'Haul Truck Drivers (2)', 0.0600, 'HR', 'Truck Driver', 2.00, 'Truck Driver', 52.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 6),
    (v_template_rock_excavation, 4, 'LABOR', 'L-LAB-GEN', 'General Laborer', 0.0200, 'HR', 'Laborer', 1.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 7),
    (v_template_rock_excavation, 5, 'EQUIPMENT', 'E-EXC-349', 'CAT 349 Excavator w/breaker', 0.0400, 'HR', NULL, NULL, NULL, 235.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_rock_excavation, 6, 'EQUIPMENT', 'E-TRK-ART', 'Articulated Haul Trucks (2)', 0.0600, 'HR', NULL, NULL, NULL, 125.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_rock_excavation, 7, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 0.50, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Embankment (203104)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_embankment, NULL,
    'Embankment - Self Perform',
    'EMB-STD-01',
    'Embankment construction with material from on-site excavation.',
    '203104', 'EARTHWORK', 'CY', 'One cubic yard of compacted embankment',
    'CY_PER_DAY', 1200.00,
    'Assumes 8" lifts, 95% compaction required. Material from on-site cut.',
    'Suitable material available, no moisture issues, standard compaction specs',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_embankment, 1, 'LABOR', 'L-OPR-DOZ', 'Dozer Operator (spread)', 0.0067, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_embankment, 2, 'LABOR', 'L-OPR-CMP', 'Compactor Operator', 0.0067, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_embankment, 3, 'LABOR', 'L-OPR-GRD', 'Grader Operator', 0.0050, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_embankment, 4, 'LABOR', 'L-LAB-GEN', 'General Laborer (grade stakes)', 0.0050, 'HR', 'Laborer', 1.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 4),
    (v_template_embankment, 5, 'EQUIPMENT', 'E-DOZ-D6', 'CAT D6 Dozer', 0.0067, 'HR', NULL, NULL, NULL, 155.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_embankment, 6, 'EQUIPMENT', 'E-CMP-825', 'CAT 825 Compactor', 0.0067, 'HR', NULL, NULL, NULL, 165.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_embankment, 7, 'EQUIPMENT', 'E-GRD-140', 'CAT 140 Grader', 0.0050, 'HR', NULL, NULL, NULL, 145.00, 'Internal Fleet Rate', FALSE, TRUE, 12),
    (v_template_embankment, 8, 'EQUIPMENT', 'E-WTR-TRK', 'Water Truck', 0.0033, 'HR', NULL, NULL, NULL, 85.00, 'Internal Fleet Rate', FALSE, TRUE, 13),
    (v_template_embankment, 9, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Testing', 0.10, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Borrow Excavation (203105)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_borrow_excavation, NULL,
    'Borrow Excavation - Off-site',
    'EXCV-BORW-01',
    'Borrow material from off-site source with haul to project.',
    '203105', 'EARTHWORK', 'CY', 'One cubic yard of borrow material delivered',
    'CY_PER_DAY', 500.00,
    'Assumes 5-mile haul distance. Includes excavation at borrow site and haul.',
    'Approved borrow source available, haul route acceptable',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_borrow_excavation, 1, 'LABOR', 'L-OPR-EXC', 'Excavator Operator (borrow pit)', 0.0160, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_borrow_excavation, 2, 'LABOR', 'L-DRV-TRK', 'Haul Truck Drivers (3)', 0.0480, 'HR', 'Truck Driver', 3.00, 'Truck Driver', 52.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_borrow_excavation, 3, 'LABOR', 'L-LAB-GEN', 'General Laborer', 0.0080, 'HR', 'Laborer', 1.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_borrow_excavation, 4, 'EQUIPMENT', 'E-EXC-336', 'CAT 336 Excavator', 0.0160, 'HR', NULL, NULL, NULL, 185.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_borrow_excavation, 5, 'EQUIPMENT', 'E-TRK-ART', 'Articulated Haul Trucks (3)', 0.0480, 'HR', NULL, NULL, NULL, 125.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_borrow_excavation, 6, 'MATERIAL', 'M-BORW-RYL', 'Borrow Site Royalty', 1.00, 'CY', NULL, NULL, NULL, 2.50, 'Typical Royalty', FALSE, TRUE, 15),
    (v_template_borrow_excavation, 7, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 0.15, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- ============================================================================
-- DRAINAGE ASSEMBLIES
-- ============================================================================

-- Template: 18" RCP (601201)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_18_rcp, NULL,
    '18" RCP Installation',
    'PIPE-RCP-18',
    'Reinforced concrete pipe 18" diameter complete installation.',
    '601201', 'DRAINAGE', 'LF', 'One linear foot of 18" RCP installed',
    'LF_PER_DAY', 200.00,
    'Includes excavation, bedding, pipe, and backfill. 4-6 ft depth typical.',
    'Standard trench conditions, no rock, no groundwater',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_18_rcp, 1, 'LABOR', 'L-OPR-EXC', 'Excavator Operator', 0.0400, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_18_rcp, 2, 'LABOR', 'L-PIP-FTR', 'Pipe Layer/Fitter', 0.0500, 'HR', 'Pipe Layer', 2.00, 'Pipefitter', 58.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_18_rcp, 3, 'LABOR', 'L-LAB-GEN', 'General Laborer', 0.0400, 'HR', 'Laborer', 1.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_18_rcp, 4, 'EQUIPMENT', 'E-EXC-320', 'CAT 320 Excavator', 0.0400, 'HR', NULL, NULL, NULL, 165.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_18_rcp, 5, 'EQUIPMENT', 'E-CMP-VIB', 'Vibratory Compactor (walk behind)', 0.0300, 'HR', NULL, NULL, NULL, 35.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_18_rcp, 6, 'MATERIAL', 'M-PIPE-18RCP', '18" RCP Class III', 1.00, 'LF', NULL, NULL, NULL, 32.00, 'Supplier Quote', FALSE, TRUE, 15),
    (v_template_18_rcp, 7, 'MATERIAL', 'M-AGG-BED', 'Bedding Aggregate #57', 0.10, 'TON', NULL, NULL, NULL, 28.00, 'Supplier Quote', FALSE, TRUE, 16),
    (v_template_18_rcp, 8, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 0.25, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: 24" RCP (601202)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_24_rcp, NULL,
    '24" RCP Installation',
    'PIPE-RCP-24',
    'Reinforced concrete pipe 24" diameter complete installation.',
    '601202', 'DRAINAGE', 'LF', 'One linear foot of 24" RCP installed',
    'LF_PER_DAY', 175.00,
    'Includes excavation, bedding, pipe, and backfill. 5-7 ft depth typical.',
    'Standard trench conditions, no rock, no groundwater',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_24_rcp, 1, 'LABOR', 'L-OPR-EXC', 'Excavator Operator', 0.0457, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_24_rcp, 2, 'LABOR', 'L-PIP-FTR', 'Pipe Layer/Fitter', 0.0571, 'HR', 'Pipe Layer', 2.00, 'Pipefitter', 58.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_24_rcp, 3, 'LABOR', 'L-LAB-GEN', 'General Laborer', 0.0457, 'HR', 'Laborer', 1.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_24_rcp, 4, 'EQUIPMENT', 'E-EXC-320', 'CAT 320 Excavator', 0.0457, 'HR', NULL, NULL, NULL, 165.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_24_rcp, 5, 'EQUIPMENT', 'E-CMP-VIB', 'Vibratory Compactor', 0.0350, 'HR', NULL, NULL, NULL, 35.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_24_rcp, 6, 'MATERIAL', 'M-PIPE-24RCP', '24" RCP Class III', 1.00, 'LF', NULL, NULL, NULL, 48.00, 'Supplier Quote', FALSE, TRUE, 15),
    (v_template_24_rcp, 7, 'MATERIAL', 'M-AGG-BED', 'Bedding Aggregate #57', 0.15, 'TON', NULL, NULL, NULL, 28.00, 'Supplier Quote', FALSE, TRUE, 16),
    (v_template_24_rcp, 8, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 0.30, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: 36" RCP (601203)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_36_rcp, NULL,
    '36" RCP Installation',
    'PIPE-RCP-36',
    'Reinforced concrete pipe 36" diameter complete installation.',
    '601203', 'DRAINAGE', 'LF', 'One linear foot of 36" RCP installed',
    'LF_PER_DAY', 120.00,
    'Includes excavation, bedding, pipe, and backfill. 6-9 ft depth typical.',
    'Standard trench conditions, may require trench box',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_36_rcp, 1, 'LABOR', 'L-OPR-EXC', 'Excavator Operator', 0.0667, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_36_rcp, 2, 'LABOR', 'L-PIP-FTR', 'Pipe Layer/Fitter', 0.0833, 'HR', 'Pipe Layer', 2.00, 'Pipefitter', 58.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_36_rcp, 3, 'LABOR', 'L-LAB-GEN', 'General Laborer', 0.0667, 'HR', 'Laborer', 2.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_36_rcp, 4, 'EQUIPMENT', 'E-EXC-336', 'CAT 336 Excavator', 0.0667, 'HR', NULL, NULL, NULL, 185.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_36_rcp, 5, 'EQUIPMENT', 'E-CMP-VIB', 'Vibratory Compactor', 0.0500, 'HR', NULL, NULL, NULL, 35.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_36_rcp, 6, 'EQUIPMENT', 'E-TRN-BOX', 'Trench Box (rental)', 0.0667, 'HR', NULL, NULL, NULL, 25.00, 'Rental Rate', TRUE, TRUE, 12),
    (v_template_36_rcp, 7, 'MATERIAL', 'M-PIPE-36RCP', '36" RCP Class III', 1.00, 'LF', NULL, NULL, NULL, 85.00, 'Supplier Quote', FALSE, TRUE, 15),
    (v_template_36_rcp, 8, 'MATERIAL', 'M-AGG-BED', 'Bedding Aggregate #57', 0.25, 'TON', NULL, NULL, NULL, 28.00, 'Supplier Quote', FALSE, TRUE, 16),
    (v_template_36_rcp, 9, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 0.40, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Type A Inlet (602101)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_type_a_inlet, NULL,
    'Drainage Inlet Type A',
    'INLET-A-01',
    'WVDOH Type A drainage inlet, cast-in-place with grate.',
    '602101', 'DRAINAGE', 'EACH', 'One complete Type A inlet',
    'EA_PER_DAY', 2.00,
    'Standard Type A per WVDOH details. 4-6 ft depth typical.',
    'Standard conditions, accessible for concrete truck',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_type_a_inlet, 1, 'LABOR', 'L-OPR-EXC', 'Excavator Operator', 2.00, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_type_a_inlet, 2, 'LABOR', 'L-CARP', 'Carpenter (forms)', 4.00, 'HR', 'Carpenter', 1.00, 'Carpenter', 62.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_type_a_inlet, 3, 'LABOR', 'L-LAB-CON', 'Concrete Laborer', 6.00, 'HR', 'Laborer', 2.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_type_a_inlet, 4, 'EQUIPMENT', 'E-EXC-320', 'CAT 320 Excavator', 2.00, 'HR', NULL, NULL, NULL, 165.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_type_a_inlet, 5, 'EQUIPMENT', 'E-CMP-VIB', 'Vibratory Compactor', 1.00, 'HR', NULL, NULL, NULL, 35.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_type_a_inlet, 6, 'MATERIAL', 'M-CONC-4K', 'Concrete 4000 psi', 2.50, 'CY', NULL, NULL, NULL, 165.00, 'Ready-Mix Quote', FALSE, TRUE, 15),
    (v_template_type_a_inlet, 7, 'MATERIAL', 'M-REBAR', 'Reinforcing Steel', 150.00, 'LB', NULL, NULL, NULL, 1.20, 'Supplier Quote', FALSE, TRUE, 16),
    (v_template_type_a_inlet, 8, 'MATERIAL', 'M-GRATE-A', 'Type A Grate & Frame', 1.00, 'EA', NULL, NULL, NULL, 450.00, 'Supplier Quote', FALSE, TRUE, 17),
    (v_template_type_a_inlet, 9, 'MATERIAL', 'M-FORM-LBR', 'Form Lumber (rental)', 1.00, 'EA', NULL, NULL, NULL, 150.00, 'Allowance', FALSE, TRUE, 18),
    (v_template_type_a_inlet, 10, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 50.00, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- ============================================================================
-- PAVING ASSEMBLIES
-- ============================================================================

-- Template: Aggregate Base Course (304101)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_aggregate_base, NULL,
    'Aggregate Base Course',
    'BASE-AGG-01',
    'Aggregate base course placed and compacted.',
    '304101', 'PAVEMENT', 'TON', 'One ton of aggregate base installed',
    'TON_PER_DAY', 600.00,
    'Assumes material delivered to site. Standard 6" lift compacted.',
    'Subgrade approved, adequate access for trucks',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_aggregate_base, 1, 'LABOR', 'L-OPR-GRD', 'Grader Operator', 0.0133, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_aggregate_base, 2, 'LABOR', 'L-OPR-CMP', 'Roller Operator', 0.0133, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_aggregate_base, 3, 'LABOR', 'L-LAB-GEN', 'General Laborer', 0.0100, 'HR', 'Laborer', 1.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_aggregate_base, 4, 'EQUIPMENT', 'E-GRD-140', 'CAT 140 Grader', 0.0133, 'HR', NULL, NULL, NULL, 145.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_aggregate_base, 5, 'EQUIPMENT', 'E-RLR-VIB', 'Vibratory Roller', 0.0133, 'HR', NULL, NULL, NULL, 95.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_aggregate_base, 6, 'EQUIPMENT', 'E-WTR-TRK', 'Water Truck', 0.0067, 'HR', NULL, NULL, NULL, 85.00, 'Internal Fleet Rate', FALSE, TRUE, 12),
    (v_template_aggregate_base, 7, 'MATERIAL', 'M-AGG-ABC', 'Aggregate Base Course', 1.00, 'TON', NULL, NULL, NULL, 22.00, 'Quarry Quote', FALSE, TRUE, 15),
    (v_template_aggregate_base, 8, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Testing', 0.10, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Asphalt Base Course (401101) - SUBCONTRACTED
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_asphalt_base, NULL,
    'Bituminous Concrete Base Course 19MM - Subcontracted',
    'PAV-BASE-19',
    'Asphalt base course 19mm mix, typically subcontracted to paving sub.',
    '401101', 'PAVEMENT', 'TON', 'One ton of asphalt base course',
    'TON_PER_DAY', 800.00,
    'Sub provides paver, rollers, and crew. Material typically from sub plant.',
    'Min temp 40F, no rain, tack coat applied',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_asphalt_base, 1, 'SUBCONTRACT', 'SUB-PAV-BASE', 'Paving Subcontractor - Base Course', 1.00, 'TON', NULL, NULL, NULL, 82.00, 'Typical Sub Quote', FALSE, TRUE, 1),
    (v_template_asphalt_base, 2, 'LABOR', 'L-FORE', 'GC Foreman (coordination)', 0.0050, 'HR', 'Foreman', 1.00, 'Foreman', 75.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 5),
    (v_template_asphalt_base, 3, 'SMALL_TOOLS', 'ST-GEN', 'QC Testing Allowance', 0.50, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Asphalt Intermediate Course (401102) - SUBCONTRACTED
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_asphalt_intermediate, NULL,
    'Bituminous Concrete Intermediate Course 12.5MM - Subcontracted',
    'PAV-INT-125',
    'Asphalt intermediate/binder course 12.5mm mix, subcontracted.',
    '401102', 'PAVEMENT', 'TON', 'One ton of asphalt intermediate course',
    'TON_PER_DAY', 700.00,
    'Sub provides paver, rollers, and crew. Material typically from sub plant.',
    'Min temp 40F, no rain, tack coat applied',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_asphalt_intermediate, 1, 'SUBCONTRACT', 'SUB-PAV-INT', 'Paving Subcontractor - Intermediate Course', 1.00, 'TON', NULL, NULL, NULL, 88.00, 'Typical Sub Quote', FALSE, TRUE, 1),
    (v_template_asphalt_intermediate, 2, 'LABOR', 'L-FORE', 'GC Foreman (coordination)', 0.0060, 'HR', 'Foreman', 1.00, 'Foreman', 75.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 5),
    (v_template_asphalt_intermediate, 3, 'SMALL_TOOLS', 'ST-GEN', 'QC Testing Allowance', 0.50, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Asphalt Surface Course (401103) - SUBCONTRACTED
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_asphalt_surface, NULL,
    'Bituminous Concrete Surface Course 9.5MM - Subcontracted',
    'PAV-SFC-95',
    'Asphalt surface/wearing course 9.5mm mix, subcontracted.',
    '401103', 'PAVEMENT', 'TON', 'One ton of asphalt surface course',
    'TON_PER_DAY', 600.00,
    'Sub provides paver, rollers, and crew. Premium mix with tighter tolerances.',
    'Min temp 50F, no rain, tack coat applied',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_asphalt_surface, 1, 'SUBCONTRACT', 'SUB-PAV-SFC', 'Paving Subcontractor - Surface Course', 1.00, 'TON', NULL, NULL, NULL, 95.00, 'Typical Sub Quote', FALSE, TRUE, 1),
    (v_template_asphalt_surface, 2, 'LABOR', 'L-FORE', 'GC Foreman (coordination)', 0.0067, 'HR', 'Foreman', 1.00, 'Foreman', 75.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 5),
    (v_template_asphalt_surface, 3, 'SMALL_TOOLS', 'ST-GEN', 'QC Testing Allowance', 0.75, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- ============================================================================
-- STRUCTURAL ASSEMBLIES
-- ============================================================================

-- Template: Structural Concrete Class A (501101)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_class_a_concrete, NULL,
    'Structural Concrete Class A - Self Perform',
    'CONC-A-01',
    'Cast-in-place structural concrete 4000 psi, formed and finished.',
    '501101', 'SUBSTRUCTURE', 'CY', 'One cubic yard of Class A concrete in place',
    'CY_PER_DAY', 15.00,
    'Includes forming, placing, finishing, curing. Moderate complexity forms.',
    'Weather suitable for concrete placement, adequate access',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_class_a_concrete, 1, 'LABOR', 'L-CARP', 'Carpenter (forms)', 2.50, 'HR', 'Carpenter', 2.00, 'Carpenter', 62.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_class_a_concrete, 2, 'LABOR', 'L-IRON', 'Ironworker (rebar placement)', 1.00, 'HR', 'Ironworker', 1.00, 'Ironworker', 65.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_class_a_concrete, 3, 'LABOR', 'L-LAB-CON', 'Concrete Laborer', 2.00, 'HR', 'Laborer', 3.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_class_a_concrete, 4, 'LABOR', 'L-FIN-CON', 'Concrete Finisher', 0.75, 'HR', 'Finisher', 1.00, 'Cement Mason', 58.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 4),
    (v_template_class_a_concrete, 5, 'LABOR', 'L-OPR-CRN', 'Crane Operator (pump boom)', 0.50, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 5),
    (v_template_class_a_concrete, 6, 'EQUIPMENT', 'E-VIB-CON', 'Concrete Vibrators', 0.50, 'HR', NULL, NULL, NULL, 15.00, 'Internal Rate', FALSE, TRUE, 10),
    (v_template_class_a_concrete, 7, 'EQUIPMENT', 'E-PMP-CON', 'Concrete Pump (rental)', 0.50, 'HR', NULL, NULL, NULL, 185.00, 'Rental Rate', FALSE, TRUE, 11),
    (v_template_class_a_concrete, 8, 'MATERIAL', 'M-CONC-4K', 'Concrete 4000 psi Class A', 1.05, 'CY', NULL, NULL, NULL, 165.00, 'Ready-Mix Quote', FALSE, TRUE, 15),
    (v_template_class_a_concrete, 9, 'MATERIAL', 'M-FORM-SYS', 'Forming System (rental/amort)', 15.00, 'SF', NULL, NULL, NULL, 3.50, 'Form Cost', FALSE, TRUE, 16),
    (v_template_class_a_concrete, 10, 'MATERIAL', 'M-CURE', 'Curing Compound', 2.00, 'GAL', NULL, NULL, NULL, 18.00, 'Supplier Quote', FALSE, TRUE, 17),
    (v_template_class_a_concrete, 11, 'MATERIAL', 'M-TIES-ACC', 'Form Ties & Accessories', 1.00, 'EA', NULL, NULL, NULL, 25.00, 'Allowance', FALSE, TRUE, 18),
    (v_template_class_a_concrete, 12, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 15.00, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Reinforcing Steel (502101)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_reinforcing_steel, NULL,
    'Reinforcing Steel - Self Perform',
    'REBAR-01',
    'Reinforcing steel furnished and placed, includes tying.',
    '502101', 'SUBSTRUCTURE', 'LB', 'One pound of reinforcing steel in place',
    'LB_PER_DAY', 2000.00,
    'Assumes fabricated rebar delivered to site. Field tying and placement.',
    'Standard placement conditions, no confined spaces',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_reinforcing_steel, 1, 'LABOR', 'L-IRON', 'Ironworker', 0.0040, 'HR', 'Ironworker', 1.00, 'Ironworker', 65.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_reinforcing_steel, 2, 'LABOR', 'L-LAB-GEN', 'Laborer (handling)', 0.0020, 'HR', 'Laborer', 1.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_reinforcing_steel, 3, 'MATERIAL', 'M-REBAR', 'Reinforcing Steel (fabricated)', 1.00, 'LB', NULL, NULL, NULL, 0.85, 'Fabricator Quote', FALSE, TRUE, 15),
    (v_template_reinforcing_steel, 4, 'MATERIAL', 'M-TIE-WIRE', 'Tie Wire', 0.01, 'LB', NULL, NULL, NULL, 2.00, 'Supplier Quote', FALSE, TRUE, 16),
    (v_template_reinforcing_steel, 5, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 0.02, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- ============================================================================
-- GUARDRAIL & TRAFFIC ASSEMBLIES
-- ============================================================================

-- Template: W-Beam Guardrail (606101) - SUBCONTRACTED
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_guardrail_wbeam, NULL,
    'W-Beam Guardrail - Subcontracted',
    'GDRAIL-W-01',
    'W-beam guardrail complete installation, typically subcontracted.',
    '606101', 'GUARDRAIL_BARRIER', 'LF', 'One linear foot of W-beam guardrail',
    'LF_PER_DAY', 400.00,
    'Sub provides posts, rail, hardware, and installation crew.',
    'Post driving conditions suitable, no rock',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_guardrail_wbeam, 1, 'SUBCONTRACT', 'SUB-GDRAIL', 'Guardrail Subcontractor', 1.00, 'LF', NULL, NULL, NULL, 24.00, 'Typical Sub Quote', FALSE, TRUE, 1),
    (v_template_guardrail_wbeam, 2, 'LABOR', 'L-FORE', 'GC Foreman (coordination)', 0.0025, 'HR', 'Foreman', 1.00, 'Foreman', 75.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 5),
    (v_template_guardrail_wbeam, 3, 'SMALL_TOOLS', 'ST-GEN', 'Inspection/Documentation', 0.10, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Thermoplastic Pavement Marking 4" (705102) - SUBCONTRACTED
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_thermo_4in, NULL,
    'Thermoplastic Pavement Marking 4" - Subcontracted',
    'STRIPE-T4-01',
    'Thermoplastic pavement marking 4" line, subcontracted.',
    '705102', 'SIGNING_STRIPING', 'LF', 'One linear foot of 4" thermoplastic line',
    'LF_PER_DAY', 15000.00,
    'Sub provides thermoplastic equipment, material, and crew.',
    'Pavement surface clean and dry, min temp 50F',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_thermo_4in, 1, 'SUBCONTRACT', 'SUB-STRIPE', 'Striping Subcontractor - 4" Thermo', 1.00, 'LF', NULL, NULL, NULL, 1.10, 'Typical Sub Quote', FALSE, TRUE, 1),
    (v_template_thermo_4in, 2, 'LABOR', 'L-FORE', 'GC Foreman (coordination)', 0.0001, 'HR', 'Foreman', 1.00, 'Foreman', 75.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 5),
    (v_template_thermo_4in, 3, 'SMALL_TOOLS', 'ST-GEN', 'Traffic Control Support', 0.02, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Thermoplastic Pavement Marking 24" (705105) - SUBCONTRACTED
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_thermo_24in, NULL,
    'Thermoplastic Pavement Marking 24" - Subcontracted',
    'STRIPE-T24-01',
    'Thermoplastic pavement marking 24" line (crosswalks, stop bars), subcontracted.',
    '705105', 'SIGNING_STRIPING', 'LF', 'One linear foot of 24" thermoplastic line',
    'LF_PER_DAY', 3000.00,
    'Sub provides thermoplastic equipment, material, and crew. For crosswalks and stop bars.',
    'Pavement surface clean and dry, min temp 50F',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_thermo_24in, 1, 'SUBCONTRACT', 'SUB-STRIPE', 'Striping Subcontractor - 24" Thermo', 1.00, 'LF', NULL, NULL, NULL, 5.50, 'Typical Sub Quote', FALSE, TRUE, 1),
    (v_template_thermo_24in, 2, 'LABOR', 'L-FORE', 'GC Foreman (coordination)', 0.0005, 'HR', 'Foreman', 1.00, 'Foreman', 75.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 5),
    (v_template_thermo_24in, 3, 'SMALL_TOOLS', 'ST-GEN', 'Traffic Control Support', 0.05, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- ============================================================================
-- CLEARING ASSEMBLIES
-- ============================================================================

-- Template: Clearing and Grubbing (201101)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_clearing_grubbing, NULL,
    'Clearing and Grubbing - Self Perform',
    'CLR-GRB-01',
    'Clearing and grubbing including tree removal, stump removal, and disposal.',
    '201101', 'DEMOLITION', 'ACRE', 'One acre of clearing and grubbing',
    'ACRE_PER_DAY', 1.50,
    'Assumes medium density vegetation, disposal within 5 miles.',
    'No environmental restrictions, accessible terrain',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_clearing_grubbing, 1, 'LABOR', 'L-OPR-EXC', 'Excavator Operator', 5.33, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_clearing_grubbing, 2, 'LABOR', 'L-OPR-DOZ', 'Dozer Operator', 5.33, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_clearing_grubbing, 3, 'LABOR', 'L-OPR-TRK', 'Truck Driver', 5.33, 'HR', 'Truck Driver', 1.00, 'Truck Driver', 52.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_clearing_grubbing, 4, 'LABOR', 'L-LAB-GEN', 'General Laborer (chainsaw)', 5.33, 'HR', 'Laborer', 2.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 4),
    (v_template_clearing_grubbing, 5, 'EQUIPMENT', 'E-EXC-336', 'CAT 336 Excavator w/thumb', 5.33, 'HR', NULL, NULL, NULL, 195.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_clearing_grubbing, 6, 'EQUIPMENT', 'E-DOZ-D6', 'CAT D6 Dozer', 5.33, 'HR', NULL, NULL, NULL, 155.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_clearing_grubbing, 7, 'EQUIPMENT', 'E-TRK-DMP', 'Dump Truck (debris haul)', 5.33, 'HR', NULL, NULL, NULL, 85.00, 'Internal Fleet Rate', FALSE, TRUE, 12),
    (v_template_clearing_grubbing, 8, 'OTHER', 'O-DISP-VEG', 'Disposal Fees (landfill)', 1.00, 'ACRE', NULL, NULL, NULL, 500.00, 'Typical Fee', FALSE, TRUE, 15),
    (v_template_clearing_grubbing, 9, 'SMALL_TOOLS', 'ST-GEN', 'Chainsaws, Fuel, Consumables', 100.00, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- Template: Removal of Existing Pavement (201103)
INSERT INTO public.bid_assembly_templates (
    id, organization_id, name, code, description,
    wvdoh_item_number, work_category, output_unit, output_description,
    default_productivity_unit, default_productivity_rate,
    design_assumptions, applicable_conditions, is_active, version
) VALUES (
    v_template_pavement_removal, NULL,
    'Pavement Removal - Self Perform',
    'REM-PAV-01',
    'Removal and disposal of existing asphalt or concrete pavement.',
    '201103', 'DEMOLITION', 'SY', 'One square yard of pavement removed',
    'SY_PER_DAY', 800.00,
    'Assumes 4-6" pavement thickness, disposal within 10 miles.',
    'No hazmat, accessible site, adequate staging',
    TRUE, 1
);

INSERT INTO public.bid_assembly_template_lines (
    assembly_template_id, line_number, resource_type, resource_code, description,
    quantity_per_unit_output, unit_of_measure, crew_role, crew_size, labor_class,
    default_unit_rate, rate_source, is_optional, include_in_total, sort_order
) VALUES
    (v_template_pavement_removal, 1, 'LABOR', 'L-OPR-EXC', 'Excavator Operator', 0.0100, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 1),
    (v_template_pavement_removal, 2, 'LABOR', 'L-OPR-LDR', 'Loader Operator', 0.0075, 'HR', 'Equipment Operator', 1.00, 'Heavy Equipment Operator', 68.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 2),
    (v_template_pavement_removal, 3, 'LABOR', 'L-DRV-TRK', 'Haul Truck Driver', 0.0125, 'HR', 'Truck Driver', 1.00, 'Truck Driver', 52.00, 'WV Prevailing Wage 2024', FALSE, TRUE, 3),
    (v_template_pavement_removal, 4, 'LABOR', 'L-LAB-GEN', 'General Laborer', 0.0050, 'HR', 'Laborer', 1.00, 'Common Laborer', 42.50, 'WV Prevailing Wage 2024', FALSE, TRUE, 4),
    (v_template_pavement_removal, 5, 'EQUIPMENT', 'E-EXC-320', 'CAT 320 Excavator w/breaker', 0.0100, 'HR', NULL, NULL, NULL, 185.00, 'Internal Fleet Rate', FALSE, TRUE, 10),
    (v_template_pavement_removal, 6, 'EQUIPMENT', 'E-LDR-966', 'CAT 966 Loader', 0.0075, 'HR', NULL, NULL, NULL, 145.00, 'Internal Fleet Rate', FALSE, TRUE, 11),
    (v_template_pavement_removal, 7, 'EQUIPMENT', 'E-TRK-DMP', 'Dump Truck (haul)', 0.0125, 'HR', NULL, NULL, NULL, 85.00, 'Internal Fleet Rate', FALSE, TRUE, 12),
    (v_template_pavement_removal, 8, 'OTHER', 'O-DISP-PAV', 'Disposal Fees (recycler/landfill)', 0.015, 'TON', NULL, NULL, NULL, 15.00, 'Typical Fee', FALSE, TRUE, 15),
    (v_template_pavement_removal, 9, 'SMALL_TOOLS', 'ST-GEN', 'Small Tools & Consumables', 0.05, 'EA', NULL, NULL, NULL, 1.00, 'Allowance', FALSE, TRUE, 20);


-- ============================================================================
-- SECTION 2: Link Templates to Master WVDOH Items
-- ============================================================================

-- Update master_wvdoh_items to link to default assembly templates
UPDATE public.master_wvdoh_items mwi
SET default_assembly_template_id = bat.id
FROM public.bid_assembly_templates bat
WHERE bat.wvdoh_item_number = mwi.item_code
  AND bat.is_active = TRUE
  AND bat.organization_id IS NULL;  -- Only global templates

-- Log how many items were linked
RAISE NOTICE 'Assembly templates created and linked to master WVDOH items';

END $$;


-- ============================================================================
-- SECTION 3: Verify and Recalculate Template Totals
-- ============================================================================

-- Force recalculation of all template totals (triggers should handle this, but ensure consistency)
DO $$
DECLARE
    template_rec RECORD;
BEGIN
    FOR template_rec IN
        SELECT id FROM public.bid_assembly_templates WHERE organization_id IS NULL
    LOOP
        UPDATE public.bid_assembly_templates SET
            total_labor_cost_per_unit = (
                SELECT COALESCE(SUM(quantity_per_unit_output * COALESCE(default_unit_rate, 0)), 0)
                FROM public.bid_assembly_template_lines
                WHERE assembly_template_id = template_rec.id
                AND resource_type = 'LABOR'
                AND include_in_total = TRUE
            ),
            total_equipment_cost_per_unit = (
                SELECT COALESCE(SUM(quantity_per_unit_output * COALESCE(default_unit_rate, 0)), 0)
                FROM public.bid_assembly_template_lines
                WHERE assembly_template_id = template_rec.id
                AND resource_type = 'EQUIPMENT'
                AND include_in_total = TRUE
            ),
            total_material_cost_per_unit = (
                SELECT COALESCE(SUM(quantity_per_unit_output * COALESCE(default_unit_rate, 0)), 0)
                FROM public.bid_assembly_template_lines
                WHERE assembly_template_id = template_rec.id
                AND resource_type = 'MATERIAL'
                AND include_in_total = TRUE
            ),
            total_sub_cost_per_unit = (
                SELECT COALESCE(SUM(quantity_per_unit_output * COALESCE(default_unit_rate, 0)), 0)
                FROM public.bid_assembly_template_lines
                WHERE assembly_template_id = template_rec.id
                AND resource_type = 'SUBCONTRACT'
                AND include_in_total = TRUE
            ),
            total_cost_per_unit = (
                SELECT COALESCE(SUM(quantity_per_unit_output * COALESCE(default_unit_rate, 0)), 0)
                FROM public.bid_assembly_template_lines
                WHERE assembly_template_id = template_rec.id
                AND include_in_total = TRUE
            ),
            updated_at = NOW()
        WHERE id = template_rec.id;
    END LOOP;
END $$;


-- ============================================================================
-- SECTION 4: Create Helper View for Template Summary
-- ============================================================================

CREATE OR REPLACE VIEW public.v_assembly_template_summary AS
SELECT
    bat.id,
    bat.name,
    bat.code,
    bat.wvdoh_item_number,
    bat.work_category,
    bat.output_unit,
    bat.total_labor_cost_per_unit AS labor_cost,
    bat.total_equipment_cost_per_unit AS equipment_cost,
    bat.total_material_cost_per_unit AS material_cost,
    bat.total_sub_cost_per_unit AS subcontract_cost,
    bat.total_cost_per_unit AS direct_cost,
    -- Calculate base unit cost with OH&P
    ROUND(bat.total_cost_per_unit * 1.25, 2) AS base_unit_cost_with_ohp,
    -- Breakdown percentages
    CASE WHEN bat.total_cost_per_unit > 0 THEN
        ROUND((bat.total_labor_cost_per_unit / bat.total_cost_per_unit * 100), 1)
    ELSE 0 END AS labor_pct,
    CASE WHEN bat.total_cost_per_unit > 0 THEN
        ROUND((bat.total_equipment_cost_per_unit / bat.total_cost_per_unit * 100), 1)
    ELSE 0 END AS equipment_pct,
    CASE WHEN bat.total_cost_per_unit > 0 THEN
        ROUND((bat.total_material_cost_per_unit / bat.total_cost_per_unit * 100), 1)
    ELSE 0 END AS material_pct,
    CASE WHEN bat.total_cost_per_unit > 0 THEN
        ROUND((bat.total_sub_cost_per_unit / bat.total_cost_per_unit * 100), 1)
    ELSE 0 END AS subcontract_pct,
    -- Line counts
    (SELECT COUNT(*) FROM public.bid_assembly_template_lines WHERE assembly_template_id = bat.id) AS total_lines,
    bat.is_active,
    bat.version,
    bat.created_at
FROM public.bid_assembly_templates bat
WHERE bat.organization_id IS NULL  -- Global templates only
ORDER BY bat.work_category, bat.wvdoh_item_number;

COMMENT ON VIEW public.v_assembly_template_summary IS 'Summary of assembly templates with calculated base costs and cost breakdown percentages';


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.bid_assembly_templates IS 'Reusable cost assemblies (recipes) for building bid items - contains seed data for common WVDOH items';


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
