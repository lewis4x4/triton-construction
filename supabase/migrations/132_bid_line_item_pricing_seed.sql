-- Migration: 132_bid_line_item_pricing_seed.sql
-- Description: Seed bid line item pricing for project 2023220005 (I-64/I-77 Interchange)
-- Source: JASON TAKEOFF.xlsx - Final pricing from estimator
-- Total Bid Amount: $3,658,662.39
-- Created: 2025-12-15

-- Update bid project total
UPDATE bid_projects
SET
    bid_amount = 3658662.39,
    updated_at = NOW()
WHERE id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b';

-- Update all line items with final pricing
-- Item 201.1 - CLEARING AND GRUBBING
UPDATE bid_line_items SET final_unit_price = 51000.00, final_extended_price = 51000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 1;

-- Item 204.1 - REMOVAL OF EXISTING ASPHALT PAVEMENT
UPDATE bid_line_items SET final_unit_price = 288000.00, final_extended_price = 288000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 2;

-- Item 408.2 - RUMBLE STRIPS
UPDATE bid_line_items SET final_unit_price = 3.00, final_extended_price = 240.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 3;

-- Item 415.5 - PERFORATED PIPE UNDERDRAINS, 6"
UPDATE bid_line_items SET final_unit_price = 5.00, final_extended_price = 3080.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 4;

-- Item 607.1 - AGGREGATE
UPDATE bid_line_items SET final_unit_price = 28.32, final_extended_price = 9558.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 5;

-- Item 607.6 - CONCRETE, CLASS K
UPDATE bid_line_items SET final_unit_price = 2260.00, final_extended_price = 9040.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 6;

-- Item 607.10 - GEOTEXTILE FOR UNDERDRAIN
UPDATE bid_line_items SET final_unit_price = 2.50, final_extended_price = 817.50, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 7;

-- Item 609.1 - PRECAST CATCH BASIN, 3' DIAMETER
UPDATE bid_line_items SET final_unit_price = 110.00, final_extended_price = 1320.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 8;

-- Item 609.2 - PRECAST CATCH BASIN, 4' DIAMETER
UPDATE bid_line_items SET final_unit_price = 250.00, final_extended_price = 500.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 9;

-- Item 610.1 - MEDIAN DRAIN INLET
UPDATE bid_line_items SET final_unit_price = 88.00, final_extended_price = 2200.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 10;

-- Item 636.7 - PAVEMENT MARKINGS, PAINTED LINES
UPDATE bid_line_items SET final_unit_price = 4.00, final_extended_price = 11284.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 11;

-- Item 636.8 - PAVEMENT MARKINGS, PAINTED SYMBOLS
UPDATE bid_line_items SET final_unit_price = 0.31, final_extended_price = 874.51, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 12;

-- Item 636.11 - THERMOPLASTIC PAVEMENT MARKING LINES
UPDATE bid_line_items SET final_unit_price = 1.45, final_extended_price = 6351.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 13;

-- Item 636.12 - THERMOPLASTIC PAVEMENT MARKING SYMBOLS
UPDATE bid_line_items SET final_unit_price = 1000.00, final_extended_price = 1000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 14;

-- Item 636.13 - PAVEMENT MARKERS, TYPE I
UPDATE bid_line_items SET final_unit_price = 10.00, final_extended_price = 170.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 15;

-- Item 636.14 - PAVEMENT MARKERS, TYPE II
UPDATE bid_line_items SET final_unit_price = 65.00, final_extended_price = 4875.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 16;

-- Item 636.17 - TEMPORARY PAVEMENT MARKINGS
UPDATE bid_line_items SET final_unit_price = 55.00, final_extended_price = 30580.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 17;

-- Item 636.18 - REMOVE EXISTING PAVEMENT MARKINGS
UPDATE bid_line_items SET final_unit_price = 18.00, final_extended_price = 10008.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 18;

-- Item 636.23 - PAINTED PAVEMENT MARKINGS, CROSSWALKS
UPDATE bid_line_items SET final_unit_price = 1500.00, final_extended_price = 36000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 19;

-- Item 636.25 - THERMOPLASTIC STOP BAR
UPDATE bid_line_items SET final_unit_price = 2.75, final_extended_price = 4950.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 20;

-- Item 636.60 - PREFORMED THERMOPLASTIC
UPDATE bid_line_items SET final_unit_price = 2500.00, final_extended_price = 5000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 21;

-- Item 636.60-L110 - PREFORMED THERMOPLASTIC ARROWS
UPDATE bid_line_items SET final_unit_price = 9500.00, final_extended_price = 19000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 22;

-- Item 639.1 - MOBILIZATION
UPDATE bid_line_items SET final_unit_price = 30000.00, final_extended_price = 30000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 23;

-- Item 661.11 - CONSTRUCTION SURVEY
UPDATE bid_line_items SET final_unit_price = 635.00, final_extended_price = 2540.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 24;

-- Item 663.1 - TRAFFIC CONTROL, FLAGGING
UPDATE bid_line_items SET final_unit_price = 0.34, final_extended_price = 375.36, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 25;

-- Item 663.2 - TRAFFIC CONTROL, PILOT CAR
UPDATE bid_line_items SET final_unit_price = 0.34, final_extended_price = 375.36, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 26;

-- Item 663.15 - TRAFFIC CONTROL, TEMPORARY SIGNS
UPDATE bid_line_items SET final_unit_price = 1000.00, final_extended_price = 1000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 27;

-- Item 402.1 - AGGREGATE BASE COURSE
UPDATE bid_line_items SET final_unit_price = 165.00, final_extended_price = 8250.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 28;

-- Item 402.1-L145 - AGGREGATE BASE COURSE (WIDENING)
UPDATE bid_line_items SET final_unit_price = 293.00, final_extended_price = 14064.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 29;

-- Item 203.1 - UNCLASSIFIED EXCAVATION
UPDATE bid_line_items SET final_unit_price = 603700.00, final_extended_price = 603700.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 30;

-- Item 212.10 - BORROW EXCAVATION
UPDATE bid_line_items SET final_unit_price = 110000.00, final_extended_price = 110000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 31;

-- Item 307.1 - UNDERCUT EXCAVATION
UPDATE bid_line_items SET final_unit_price = 152.00, final_extended_price = 48032.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 32;

-- Item 502.1 - CONCRETE BARRIER
UPDATE bid_line_items SET final_unit_price = 685.00, final_extended_price = 101380.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 33;

-- Item 601.2 - CONCRETE SIDEWALK, 4"
UPDATE bid_line_items SET final_unit_price = 3600.00, final_extended_price = 36000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 34;

-- Item 601.3 - CONCRETE SIDEWALK, 6"
UPDATE bid_line_items SET final_unit_price = 3700.00, final_extended_price = 62900.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 35;

-- Item 601.9 - CONCRETE CURB AND GUTTER
UPDATE bid_line_items SET final_unit_price = 3400.00, final_extended_price = 292400.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 36;

-- Item 601.19 - DETECTABLE WARNING SURFACE
UPDATE bid_line_items SET final_unit_price = 3.00, final_extended_price = 34425.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 37;

-- Item 601.30 - CONCRETE ISLAND
UPDATE bid_line_items SET final_unit_price = 320.00, final_extended_price = 352640.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 38;

-- Item 602.1 - REMOVAL OF CONCRETE SIDEWALK
UPDATE bid_line_items SET final_unit_price = 3.78, final_extended_price = 8777.16, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 39;

-- Item 602.2 - REMOVAL OF CURB AND GUTTER
UPDATE bid_line_items SET final_unit_price = 3.50, final_extended_price = 57323.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 40;

-- Item 615.26 - STEEL BEAM GUARDRAIL
UPDATE bid_line_items SET final_unit_price = 12.50, final_extended_price = 23562.50, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 41;

-- Item 615.29 - GUARDRAIL END TREATMENT
UPDATE bid_line_items SET final_unit_price = 4500.00, final_extended_price = 45000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 42;

-- Item 615.39 - GUARDRAIL REMOVAL
UPDATE bid_line_items SET final_unit_price = 110000.00, final_extended_price = 110000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 43;

-- Item 627.25 - EROSION CONTROL BLANKET
UPDATE bid_line_items SET final_unit_price = 95.00, final_extended_price = 8550.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 44;

-- Item 639.1-L225 - MOBILIZATION (ALTERNATE)
UPDATE bid_line_items SET final_unit_price = 5000.00, final_extended_price = 5000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 45;

-- Item 645.1 - STEEL BEAM GUARDRAIL ANCHOR
UPDATE bid_line_items SET final_unit_price = 25.00, final_extended_price = 33200.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 46;

-- Item 662.3 - TEMPORARY CONCRETE BARRIER
UPDATE bid_line_items SET final_unit_price = 8000.00, final_extended_price = 8000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 47;

-- Item 679.1 - BITUMINOUS MATERIAL (TACK COAT)
UPDATE bid_line_items SET final_unit_price = 356.00, final_extended_price = 434320.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 48;

-- Item 679.6 - BITUMINOUS PRIME COAT
UPDATE bid_line_items SET final_unit_price = 5000.00, final_extended_price = 5000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 49;

-- Item 685.1 - WATER FOR DUST CONTROL
UPDATE bid_line_items SET final_unit_price = 20000.00, final_extended_price = 20000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 50;

-- Item 688.1 - ASPHALT SURFACE COURSE
UPDATE bid_line_items SET final_unit_price = 650000.00, final_extended_price = 650000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 51;

-- Item 688.3 - ASPHALT BASE COURSE
UPDATE bid_line_items SET final_unit_price = 20000.00, final_extended_price = 20000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 52;

-- Item 697.1 - MILLING EXISTING PAVEMENT
UPDATE bid_line_items SET final_unit_price = 12000.00, final_extended_price = 12000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 53;

-- Item 697.1-L270 - MILLING EXISTING PAVEMENT (DEPTH 2")
UPDATE bid_line_items SET final_unit_price = 12000.00, final_extended_price = 12000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 54;

-- Item 697.1-L275 - MILLING EXISTING PAVEMENT (DEPTH 3")
UPDATE bid_line_items SET final_unit_price = 12000.00, final_extended_price = 12000.00, pricing_reviewed = true, pricing_status = 'COMPLETE' WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b' AND line_number = 55;

-- Verify the total
DO $$
DECLARE
    calculated_total NUMERIC;
BEGIN
    SELECT SUM(final_extended_price) INTO calculated_total
    FROM bid_line_items
    WHERE bid_project_id = '976e4f5b-bc25-42b4-bd55-af157fc55a5b';

    IF ABS(calculated_total - 3658662.39) > 1 THEN
        RAISE WARNING 'Total mismatch: Expected 3658662.39, Got %', calculated_total;
    ELSE
        RAISE NOTICE 'Pricing verification passed. Total: $%', calculated_total;
    END IF;
END $$;
