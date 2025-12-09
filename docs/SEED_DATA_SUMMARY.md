# Triton Bid Intelligence — Seed Data Summary

## Overview

The seed data file `seed_bidding_data.sql` contains everything needed to run a sample bidding scenario for the **Triplett Bridge** project. Execute after running `009_bidding_engine.sql`.

---

## Data Categories

| Category | Count | Purpose |
|----------|-------|---------|
| **WVDOH Master Items** | 50+ | Canonical bid item codes with historical price ranges |
| **Internal Cost Codes** | 82 | Triton's 8-division financial tracking codes |
| **Assembly Templates** | 8 | Pre-built "recipes" for common bid items |
| **Davis-Bacon Wage Rates** | 17 | WV Highway Construction classifications |
| **Equipment Fleet** | 20 | Triton-owned equipment with rental rates |
| **Suppliers** | 10 | Material vendors (3 are DBE-certified) |
| **Sample Bid Proposal** | 1 | Triplett Bridge with 22 line items |
| **Indirect Cost Categories** | 8 | Project overhead allocations |
| **Markup Layers** | 3 | Overhead, profit, contingency defaults |

---

## WVDOH Master Items (50+ items)

Covers Divisions 100-700:

| Division | Category | Sample Items |
|----------|----------|--------------|
| 100 | General | Mobilization, MOT, Field Office |
| 200 | Earthwork | Clearing, Excavation, Structure Excavation |
| 300 | Bases | CABC, OGFDB |
| 400 | Asphalt | Base Course, Wearing Course, Tack Coat |
| 500 | Concrete Paving | PCC Pavement, Approach Slabs |
| 600 | Structures | Concrete Classes A/AA/DS/H, Rebar, Bearings, Joints |
| 700 | Incidentals | Guardrail, Drainage, Erosion Control |

Each item includes:
- `typical_unit_price_low` / `typical_unit_price_high` — Historical pricing range
- `requires_assembly` — Whether the item needs detailed cost breakdown
- `common_related_items` — Items frequently bid together

---

## Internal Cost Codes (82 codes, 8 divisions)

| Division | Name | Code Range | Count |
|----------|------|------------|-------|
| 01 | General Requirements | 01-100 to 01-900 | 18 |
| 02 | Existing Conditions | 02-100 to 02-300 | 5 |
| 03 | Concrete | 03-100 to 03-810 | 23 |
| 05 | Metals/Steel | 05-100 to 05-310 | 6 |
| 07 | Waterproofing/Joints | 07-100 to 07-310 | 7 |
| 31 | Earthwork | 31-100 to 31-500 | 18 |
| 32 | Exterior/Guardrail | 32-100 to 32-510 | 11 |
| 41 | Equipment/Cranes | 41-100 to 41-300 | 5 |

Each code is flagged as `is_labor`, `is_equipment`, `is_material`, or `is_subcontract` for proper rollup.

---

## Assembly Templates

### Default Templates (is_default = TRUE)

| WVDOH Item | Template Name | Components |
|------------|---------------|------------|
| 601009-001 | Standard Bridge Concrete - Pump | 3 labor, 1 equipment, 2 materials |
| 602001-000 | Epoxy Coated Rebar - Standard | 2 labor, 2 materials |
| 212001-000 | Structure Excavation - Standard | 2 labor, 2 equipment |
| 212002-000 | Structure Excavation - Rock Breaker | 2 labor, 2 equipment |
| 627002-000 | Silicone Foam Joint - SP 627 | 2 labor, 2 materials |
| 705080-000 | W-Beam Guardrail - Standard | 2 labor, 1 equipment, 3 materials |
| 109010-000 | Mobilization - Percentage | Uses PERCENT_OF_SUBTOTAL |

### Alternate Templates (is_default = FALSE)

| WVDOH Item | Template Name | Use When |
|------------|---------------|----------|
| 601009-001 | Bridge Concrete - Crane & Bucket | Limited site access |

### Template Line Structure

Each `assembly_template_lines` record includes:
- `resource_type` — LABOR, EQUIPMENT, MATERIAL, SUBCONTRACTOR
- `wage_classification` — Links to Davis-Bacon wage rate
- `internal_cost_code_id` — Links to Triton cost code
- `quantity_per_unit` — e.g., 2.5 HR/CY
- `productivity_factor` — AI learning variable (default 1.00)

---

## Davis-Bacon Wage Rates

**Determination:** WV20240001 (Highway Construction)

| Classification | Base Rate | Fringe | Total |
|----------------|-----------|--------|-------|
| Operating Engineer - Group 1 | $32.85 | $16.95 | $49.80 |
| Ironworker - Structural | $31.25 | $16.15 | $47.40 |
| Cement Mason | $26.85 | $14.15 | $41.00 |
| Carpenter | $28.45 | $14.82 | $43.27 |
| Laborer - General | $22.50 | $11.85 | $34.35 |
| Teamster - Truck Driver | $25.85 | $13.45 | $39.30 |

---

## Sample Bid Proposal: Triplett Bridge

**State Project:** 2023220005  
**Federal Project:** HWI-0010(321)D  
**County:** Lincoln  
**Engineer's Estimate:** $4,250,000  
**Contract Days:** 180  
**DBE Goal:** 8%

### Line Items (22 items)

| # | Item Code | Description | Qty | Unit | Calc Method |
|---|-----------|-------------|-----|------|-------------|
| 1 | 109010-000 | Mobilization | 1 | LS | PERCENT_OF_SUBTOTAL (7%) |
| 2 | 104010-000 | Maintenance of Traffic | 1 | LS | ASSEMBLY_SUM |
| 3 | 105010-000 | Field Office | 6 | MONTH | MANUAL_ENTRY |
| 4 | 201001-000 | Clearing and Grubbing | 2.5 | ACRE | ASSEMBLY_SUM |
| 5 | 203001-000 | Dismantling Existing Bridge | 1 | LS | MANUAL_ENTRY |
| 6 | 207001-000 | Excavation, Unclassified | 3,500 | CY | ASSEMBLY_SUM |
| 7 | 212001-000 | Structure Excavation, Unclassified | 850 | CY | ASSEMBLY_SUM |
| 8 | 212002-000 | Structure Excavation, Rock | 250 | CY | ASSEMBLY_SUM |
| 9 | 601001-000 | Structural Concrete, Class A | 180 | CY | ASSEMBLY_SUM |
| 10 | 601009-001 | Structural Concrete, Class H | 420 | CY | ASSEMBLY_SUM |
| 11 | 602001-000 | Reinforcing Steel, Epoxy Coated | 185,000 | LB | ASSEMBLY_SUM |
| 12 | 625001-000 | Prestressed Concrete Beams | 720 | LF | SUBCONTRACT_QUOTE |
| 13 | 615029-000 | Elastomeric Bearing Assembly | 16 | EA | ASSEMBLY_SUM |
| 14 | 627002-000 | Expansion Joint, Silicone Foam | 88 | LF | ASSEMBLY_SUM |
| 15 | 307001-000 | Crushed Aggregate Base Course | 650 | TON | ASSEMBLY_SUM |
| 16 | 401002-000 | Asphalt Wearing Course | 480 | TON | ASSEMBLY_SUM |
| 17 | 502001-000 | Approach Slabs | 280 | SY | ASSEMBLY_SUM |
| 18 | 705080-000 | Guardrail, W-Beam | 450 | LF | ASSEMBLY_SUM |
| 19 | 705002-000 | Guardrail End Treatment | 4 | EA | ASSEMBLY_SUM |
| 20 | 715001-000 | Temporary Erosion Control | 1 | LS | ASSEMBLY_SUM |
| 21 | 716001-000 | Seeding and Mulching | 2.5 | ACRE | ASSEMBLY_SUM |
| 22 | 729001-000 | Riprap, Class 1 | 350 | TON | ASSEMBLY_SUM |

---

## Equipment Fleet (20 pieces)

| Category | Equipment | Hourly Rate |
|----------|-----------|-------------|
| Excavator | 330 (30-ton) x2 | $185 |
| Excavator | 352/PC490 (50-ton) x2 | $275 |
| Dozer | D6T x2 | $165 |
| Dozer | D8T | $225 |
| Loader | 950M (3CY) | $145 |
| Loader | 966M (5CY) | $195 |
| ADT | 730 (30T) x2, 740 (40T) | $135-155 |
| Crane | 50-ton, 100-ton, 150-ton | $325-650 |
| Compactor | Vibratory, Sheepsfoot | $95-110 |
| Concrete | Pump, 2CY Bucket | $275, $150/day |

---

## Suppliers (10 vendors)

| Supplier | Type | DBE |
|----------|------|-----|
| Martin Marietta Materials | Aggregate | No |
| Lehigh Hanson | Concrete | No |
| Nucor Rebar | Rebar | No |
| Marathon Petroleum | Asphalt | No |
| WV Steel | Steel | No |
| **Valley Supply** | General | **Yes** |
| Mountain State Guardrail | Guardrail | No |
| **Appalachian Traffic Control** | Traffic | **Yes** |
| Eastern Bearing & Seal | Bearing | No |
| **Tri-State Seeding** | Seeding | **Yes** |

---

## Indirect Costs & Markup

### Indirect Cost Categories

| Code | Name | Typical % | Basis |
|------|------|-----------|-------|
| PROJECT_MGMT | Project Management | 3.00% | Direct Cost |
| FIELD_OFFICE | Field Office | 1.50% | Direct Cost |
| SUPERVISION | General Supervision | 2.50% | Direct Cost |
| SMALL_TOOLS | Small Tools | 1.00% | Direct Cost |
| TEMP_FACILITIES | Temporary Facilities | 0.75% | Direct Cost |
| QC_TESTING | QC/Testing | 0.50% | Direct Cost |
| INSURANCE | Project Insurance | 1.25% | Direct Cost |
| BONDS | Performance/Payment Bonds | 1.50% | Bid Total |

### Default Markup Layers

| Order | Layer | % | Basis |
|-------|-------|---|-------|
| 1 | Home Office Overhead | 5.00% | After Indirect |
| 2 | Profit | 6.00% | After Overhead |
| 3 | Contingency | 3.00% | After Profit |

---

## Execution Order

```sql
-- 1. Core schema (tables, enums, functions)
\i 009_bidding_engine.sql

-- 2. Seed data (this file)
\i seed_bidding_data.sql

-- 3. Verify
SELECT COUNT(*) FROM master_wvdoh_items;  -- Should be 50+
SELECT COUNT(*) FROM cost_codes;           -- Should be 82
SELECT COUNT(*) FROM assembly_templates;   -- Should be 8
SELECT COUNT(*) FROM proposal_line_items WHERE proposal_id = '22222222-2222-2222-2222-222222222222';  -- Should be 22
```

---

## Sample Workflow: Price the Triplett Bridge

```sql
-- 1. Apply templates to line items
SELECT apply_assembly_template(
    li.id, 
    at.id, 
    '11111111-1111-1111-1111-111111111111'  -- Wage determination
)
FROM proposal_line_items li
JOIN assembly_templates at ON at.wvdoh_item_code = li.wvdoh_item_code AND at.is_default = TRUE
WHERE li.proposal_id = '22222222-2222-2222-2222-222222222222'
  AND li.calculation_method = 'ASSEMBLY_SUM';

-- 2. Calculate percentage-based items (Mobilization)
SELECT calculate_percentage_items('22222222-2222-2222-2222-222222222222');

-- 3. Calculate final bid price
SELECT * FROM calculate_final_bid_price('22222222-2222-2222-2222-222222222222');
```

---

## Key UUIDs for Testing

| Entity | UUID |
|--------|------|
| Wage Determination | `11111111-1111-1111-1111-111111111111` |
| Triplett Bridge Proposal | `22222222-2222-2222-2222-222222222222` |

---

*This seed data provides a complete, realistic dataset for testing the Triton Bid Intelligence system.*
