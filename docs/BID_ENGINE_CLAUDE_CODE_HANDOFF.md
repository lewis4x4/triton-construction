# TRITON BID ENGINE — CLAUDE CODE HANDOFF PACKAGE

**Date:** December 8, 2025  
**Status:** Ready for Implementation  
**Priority:** P0 — Critical Path for Customer Value  
**Estimated Effort:** 6-8 weeks full implementation

---

## EXECUTIVE SUMMARY

Build an enterprise-grade AI-powered bidding system for Triton Construction that:
1. Ingests WVDOH bid documents (PDFs) and extracts structured data
2. Manages line items with assembly-based cost estimation
3. Applies pre-built templates to accelerate pricing
4. Calculates final bid pricing with indirect costs and markup
5. Tracks bid outcomes for AI learning loop
6. Hands off won bids to execution with cost code mapping

**Business Value:** Transform 40-80 hour manual bid preparation into 8-16 hours with AI assistance.

---

## CURRENT STATE ANALYSIS

### What Exists (Verified from Codebase)

| Component | File | Status |
|-----------|------|--------|
| `bid_projects` table | Database | ✅ Basic metadata only |
| `v_bid_project_dashboard` view | Database | ⚠️ Exists but returns empty metrics |
| CreateBid form | `CreateBid.tsx` | ✅ Creates project shell |
| BidList view | `BidList.tsx` | ✅ Card listing with metrics display |
| BidDetail page | `BidDetail.tsx` | ✅ Tabbed interface (Overview/Documents/Line Items/Risks/Questions/Work Packages) |
| DocumentUpload | Component | ✅ File upload exists |
| LineItemsTab | Component | ⚠️ Imported but implementation unknown |

### What's Missing (Gap Analysis)

| Required Table | Status | Blocking |
|----------------|--------|----------|
| `master_wvdoh_items` | ❌ Missing | Line item lookup |
| `assembly_templates` | ❌ Missing | Cost estimation |
| `assembly_template_lines` | ❌ Missing | Resource breakdown |
| `cost_codes` | ❌ Missing | Financial integration |
| `proposal_line_items` | ❌ Missing | Core functionality |
| `item_assemblies` | ❌ Missing | Cost buildup |
| `project_indirect_costs` | ❌ Missing | Full pricing |
| `proposal_markup_layers` | ❌ Missing | O&P calculation |

### Schema Mismatch: `bid_projects` vs `bid_proposals`

The existing `bid_projects` table is a simplified version. It needs to be extended OR replaced with the full `bid_proposals` schema from the spec.

**Current `bid_projects` columns:**
```
id, project_name, owner, state_project_number, county, route, 
letting_date, bid_due_date, location_description, status, 
engineers_estimate, created_at
```

**Required `bid_proposals` columns (additions):**
```
federal_project_number, contract_id, project_description,
bid_time, pre_bid_date, proposal_document_url, plans_url, addenda_urls,
completion_days, liquidated_damages_per_day, wage_determination_id,
wage_determination_date, dbe_goal_percentage, total_direct_cost,
total_bid_amount, decision_date, decision_reason, actual_award_amount,
winner_name, our_rank, total_bidders, created_by, updated_at
```

---

## IMPLEMENTATION ROADMAP

### Phase 1: Database Foundation (Week 1)

**Objective:** Create all required tables, enums, functions, and seed data.

#### Migration 009: Core Bidding Engine

```sql
-- ============================================
-- MIGRATION 009: BIDDING ENGINE CORE SCHEMA
-- ============================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

-- Resource types for assembly lines
CREATE TYPE resource_type_enum AS ENUM (
    'LABOR', 
    'EQUIPMENT', 
    'MATERIAL', 
    'SUBCONTRACTOR', 
    'OTHER'
);

-- Bid status progression
CREATE TYPE bid_status_enum AS ENUM (
    'IDENTIFIED',      -- Opportunity spotted
    'REVIEWING',       -- Documents being reviewed
    'ANALYZING',       -- AI processing documents
    'READY_FOR_REVIEW',-- Analysis complete
    'IN_REVIEW',       -- Management reviewing
    'APPROVED',        -- Approved to bid
    'ESTIMATING',      -- Active estimation
    'SUBMITTED',       -- Bid submitted
    'WON',             -- Contract awarded to us
    'LOST',            -- Lost to competitor
    'NO_BID',          -- Decided not to bid
    'CANCELLED'        -- Bid cancelled by owner
);

-- Calculation methods for line items
CREATE TYPE calculation_method_enum AS ENUM (
    'ASSEMBLY_SUM',        -- Sum of item_assemblies
    'PERCENT_OF_SUBTOTAL', -- e.g., Mobilization = 5% of other items
    'PERCENT_OF_TOTAL',    -- Percentage of grand total
    'MANUAL_ENTRY',        -- User enters price directly
    'SUBCONTRACT_QUOTE'    -- Price from external quote
);

-- Confidence levels for AI pricing
CREATE TYPE confidence_level_enum AS ENUM (
    'VERY_LOW',   -- < 50% confidence
    'LOW',        -- 50-65%
    'MEDIUM',     -- 65-80%
    'HIGH',       -- 80-95%
    'VERY_HIGH'   -- > 95%
);

-- ============================================
-- TABLE: master_wvdoh_items
-- Purpose: Canonical WVDOH bid item codes
-- ============================================

CREATE TABLE IF NOT EXISTS master_wvdoh_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_code TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    division TEXT,
    category TEXT,
    spec_section TEXT,
    typical_unit_price_low NUMERIC(18,2),
    typical_unit_price_high NUMERIC(18,2),
    requires_assembly BOOLEAN DEFAULT TRUE,
    common_related_items TEXT[],
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wvdoh_items_code ON master_wvdoh_items(item_code);
CREATE INDEX idx_wvdoh_items_division ON master_wvdoh_items(division);
CREATE INDEX idx_wvdoh_items_category ON master_wvdoh_items(category);

-- ============================================
-- TABLE: cost_codes
-- Purpose: Triton internal financial tracking codes
-- ============================================

CREATE TABLE IF NOT EXISTS cost_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    division TEXT NOT NULL,
    category TEXT,
    is_labor BOOLEAN DEFAULT FALSE,
    is_equipment BOOLEAN DEFAULT FALSE,
    is_material BOOLEAN DEFAULT FALSE,
    is_subcontract BOOLEAN DEFAULT FALSE,
    default_unit TEXT,
    typical_unit_cost NUMERIC(18,4),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, code)
);

CREATE INDEX idx_cost_codes_org ON cost_codes(organization_id);
CREATE INDEX idx_cost_codes_division ON cost_codes(division);

-- ============================================
-- TABLE: assembly_templates
-- Purpose: Pre-built "recipes" for common items
-- ============================================

CREATE TABLE IF NOT EXISTS assembly_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id),
    wvdoh_item_code TEXT NOT NULL REFERENCES master_wvdoh_items(item_code),
    template_name TEXT NOT NULL,
    template_description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    region TEXT DEFAULT 'WV',
    project_type TEXT,
    conditions TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assembly_templates_item ON assembly_templates(wvdoh_item_code);
CREATE INDEX idx_assembly_templates_org ON assembly_templates(organization_id);

-- ============================================
-- TABLE: assembly_template_lines
-- Purpose: Resource lines within templates
-- ============================================

CREATE TABLE IF NOT EXISTS assembly_template_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES assembly_templates(id) ON DELETE CASCADE,
    resource_type resource_type_enum NOT NULL,
    resource_description TEXT NOT NULL,
    wage_classification TEXT,
    internal_cost_code_id UUID REFERENCES cost_codes(id),
    quantity_per_unit NUMERIC(18,6) NOT NULL,
    quantity_uom TEXT,
    waste_percentage NUMERIC(5,2) DEFAULT 0.00,
    default_unit_cost NUMERIC(18,4),
    cost_source TEXT,
    productivity_factor NUMERIC(5,2) DEFAULT 1.00,
    productivity_notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_template_lines_template ON assembly_template_lines(template_id);

-- ============================================
-- EXTEND: bid_projects → bid_proposals columns
-- ============================================

-- Add missing columns to existing bid_projects table
ALTER TABLE bid_projects 
ADD COLUMN IF NOT EXISTS federal_project_number TEXT,
ADD COLUMN IF NOT EXISTS contract_id TEXT,
ADD COLUMN IF NOT EXISTS project_description TEXT,
ADD COLUMN IF NOT EXISTS bid_time TIME,
ADD COLUMN IF NOT EXISTS pre_bid_date DATE,
ADD COLUMN IF NOT EXISTS proposal_document_url TEXT,
ADD COLUMN IF NOT EXISTS plans_url TEXT,
ADD COLUMN IF NOT EXISTS addenda_urls TEXT[],
ADD COLUMN IF NOT EXISTS completion_days INTEGER,
ADD COLUMN IF NOT EXISTS liquidated_damages_per_day NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS wage_determination_id TEXT,
ADD COLUMN IF NOT EXISTS wage_determination_date DATE,
ADD COLUMN IF NOT EXISTS dbe_goal_percentage NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS total_direct_cost NUMERIC(18,2),
ADD COLUMN IF NOT EXISTS total_bid_amount NUMERIC(18,2),
ADD COLUMN IF NOT EXISTS decision_date DATE,
ADD COLUMN IF NOT EXISTS decision_reason TEXT,
ADD COLUMN IF NOT EXISTS actual_award_amount NUMERIC(18,2),
ADD COLUMN IF NOT EXISTS winner_name TEXT,
ADD COLUMN IF NOT EXISTS our_rank INTEGER,
ADD COLUMN IF NOT EXISTS total_bidders INTEGER,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update status column to use enum (if not already)
-- Note: This may require data migration if existing values don't match
-- ALTER TABLE bid_projects ALTER COLUMN status TYPE bid_status_enum USING status::bid_status_enum;

-- ============================================
-- TABLE: proposal_line_items
-- Purpose: Individual bid items from proposal
-- ============================================

CREATE TABLE IF NOT EXISTS proposal_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_project_id UUID NOT NULL REFERENCES bid_projects(id) ON DELETE CASCADE,
    wvdoh_item_code TEXT REFERENCES master_wvdoh_items(item_code),
    item_number TEXT,
    description TEXT NOT NULL,
    unit TEXT NOT NULL,
    quantity NUMERIC(18,4) NOT NULL,
    calculation_method calculation_method_enum DEFAULT 'ASSEMBLY_SUM',
    calculation_percentage NUMERIC(5,2),
    calculation_basis TEXT,
    unit_price NUMERIC(18,4),
    total_price NUMERIC(18,2),
    direct_cost NUMERIC(18,2),
    overhead_amount NUMERIC(18,2),
    profit_amount NUMERIC(18,2),
    is_unbalanced BOOLEAN DEFAULT FALSE,
    unbalance_reason TEXT,
    pricing_confidence confidence_level_enum,
    confidence_factors TEXT[],
    has_historical_data BOOLEAN DEFAULT FALSE,
    similar_item_count INTEGER DEFAULT 0,
    work_package TEXT,
    location_tag TEXT,
    governing_spec TEXT,
    plan_sheet_refs TEXT[],
    is_reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_line_items_project ON proposal_line_items(bid_project_id);
CREATE INDEX idx_line_items_wvdoh ON proposal_line_items(wvdoh_item_code);
CREATE INDEX idx_line_items_work_package ON proposal_line_items(work_package);

-- ============================================
-- TABLE: item_assemblies
-- Purpose: Cost breakdown for each line item
-- ============================================

CREATE TABLE IF NOT EXISTS item_assemblies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    line_item_id UUID NOT NULL REFERENCES proposal_line_items(id) ON DELETE CASCADE,
    cost_code_id UUID REFERENCES cost_codes(id),
    resource_type resource_type_enum NOT NULL,
    resource_id UUID,
    resource_description TEXT,
    wage_rate_id UUID,
    wage_classification TEXT,
    davis_bacon_rate NUMERIC(10,2),
    fringes NUMERIC(10,2),
    quantity_per_unit NUMERIC(18,6) NOT NULL,
    quantity_uom TEXT,
    waste_percentage NUMERIC(5,2) DEFAULT 0.00,
    unit_cost NUMERIC(18,4) NOT NULL,
    cost_source TEXT,
    total_cost NUMERIC(18,2),
    is_historical BOOLEAN DEFAULT FALSE,
    historical_project_id UUID,
    is_ai_suggested BOOLEAN DEFAULT FALSE,
    is_manually_adjusted BOOLEAN DEFAULT FALSE,
    productivity_factor NUMERIC(5,2) DEFAULT 1.00,
    productivity_notes TEXT,
    template_line_id UUID REFERENCES assembly_template_lines(id),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_assemblies_line_item ON item_assemblies(line_item_id);
CREATE INDEX idx_assemblies_cost_code ON item_assemblies(cost_code_id);
CREATE INDEX idx_assemblies_resource_type ON item_assemblies(resource_type);

-- ============================================
-- TABLE: project_indirect_costs
-- Purpose: Job-specific indirect costs
-- ============================================

CREATE TABLE IF NOT EXISTS project_indirect_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_project_id UUID NOT NULL REFERENCES bid_projects(id) ON DELETE CASCADE,
    cost_category TEXT NOT NULL,
    description TEXT NOT NULL,
    calculation_type TEXT NOT NULL DEFAULT 'FIXED_AMOUNT',
    fixed_amount NUMERIC(18,2),
    percentage NUMERIC(5,2),
    rate_per_period NUMERIC(18,2),
    estimated_periods INTEGER,
    calculated_cost NUMERIC(18,2),
    cost_code_id UUID REFERENCES cost_codes(id),
    notes TEXT,
    source TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_indirect_costs_project ON project_indirect_costs(bid_project_id);

-- ============================================
-- TABLE: proposal_markup_layers
-- Purpose: Overhead, Profit, Contingency
-- ============================================

CREATE TABLE IF NOT EXISTS proposal_markup_layers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_project_id UUID NOT NULL REFERENCES bid_projects(id) ON DELETE CASCADE,
    layer_name TEXT NOT NULL,
    layer_order INTEGER NOT NULL,
    calculation_base TEXT NOT NULL DEFAULT 'CUMULATIVE',
    markup_percentage NUMERIC(5,2) NOT NULL,
    base_amount NUMERIC(18,2),
    markup_amount NUMERIC(18,2),
    justification TEXT,
    risk_factors TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_markup_layers_project ON proposal_markup_layers(bid_project_id);

-- ============================================
-- TABLE: bid_risks
-- Purpose: Risk register for bid analysis
-- ============================================

CREATE TABLE IF NOT EXISTS bid_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_project_id UUID NOT NULL REFERENCES bid_projects(id) ON DELETE CASCADE,
    risk_category TEXT NOT NULL,
    description TEXT NOT NULL,
    source_document TEXT,
    source_page INTEGER,
    severity TEXT DEFAULT 'MEDIUM',
    probability TEXT DEFAULT 'MEDIUM',
    cost_impact_low NUMERIC(18,2),
    cost_impact_high NUMERIC(18,2),
    schedule_impact_days INTEGER,
    mitigation_strategy TEXT,
    related_line_items UUID[],
    is_ai_identified BOOLEAN DEFAULT FALSE,
    is_addressed BOOLEAN DEFAULT FALSE,
    addressed_by UUID REFERENCES auth.users(id),
    addressed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_risks_project ON bid_risks(bid_project_id);
CREATE INDEX idx_risks_severity ON bid_risks(severity);

-- ============================================
-- TABLE: bid_questions
-- Purpose: Pre-bid questions
-- ============================================

CREATE TABLE IF NOT EXISTS bid_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_project_id UUID NOT NULL REFERENCES bid_projects(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    source_spec TEXT,
    source_page INTEGER,
    related_risk_id UUID REFERENCES bid_risks(id),
    related_line_items UUID[],
    is_ai_suggested BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'DRAFT',
    submitted_date DATE,
    response_text TEXT,
    response_date DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_project ON bid_questions(bid_project_id);
CREATE INDEX idx_questions_status ON bid_questions(status);

-- ============================================
-- TABLE: bid_documents
-- Purpose: Track uploaded bid documents
-- ============================================

CREATE TABLE IF NOT EXISTS bid_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bid_project_id UUID NOT NULL REFERENCES bid_projects(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    storage_bucket TEXT DEFAULT 'bid-documents',
    processing_status TEXT DEFAULT 'PENDING',
    processed_at TIMESTAMPTZ,
    extraction_data JSONB,
    page_count INTEGER,
    is_primary BOOLEAN DEFAULT FALSE,
    version INTEGER DEFAULT 1,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_project ON bid_documents(bid_project_id);
CREATE INDEX idx_documents_type ON bid_documents(document_type);
CREATE INDEX idx_documents_status ON bid_documents(processing_status);

-- ============================================
-- VIEW: v_bid_project_dashboard (Updated)
-- Purpose: Aggregated metrics for bid list
-- ============================================

CREATE OR REPLACE VIEW v_bid_project_dashboard AS
SELECT 
    bp.id AS bid_project_id,
    bp.project_name,
    bp.status,
    bp.bid_due_date,
    bp.owner,
    
    -- Line item counts
    COUNT(DISTINCT pli.id) AS total_line_items,
    COUNT(DISTINCT CASE WHEN pli.is_reviewed THEN pli.id END) AS items_reviewed,
    COUNT(DISTINCT CASE WHEN pli.calculation_method = 'ASSEMBLY_SUM' AND EXISTS(
        SELECT 1 FROM item_assemblies ia WHERE ia.line_item_id = pli.id
    ) THEN pli.id END) AS items_assembly_priced,
    COUNT(DISTINCT CASE WHEN pli.calculation_method = 'SUBCONTRACT_QUOTE' THEN pli.id END) AS items_subquote_priced,
    COUNT(DISTINCT CASE WHEN pli.calculation_method = 'MANUAL_ENTRY' THEN pli.id END) AS items_manual_priced,
    
    -- Financial totals
    COALESCE(SUM(pli.direct_cost), 0) AS total_base_cost,
    COALESCE(SUM(pli.total_price), 0) AS total_bid_value,
    
    -- Risks
    COUNT(DISTINCT br.id) AS total_risks,
    COUNT(DISTINCT CASE WHEN br.severity IN ('HIGH', 'CRITICAL') THEN br.id END) AS high_critical_risks,
    
    -- Opportunities (risks with positive impact or mitigation identified)
    COUNT(DISTINCT CASE WHEN br.mitigation_strategy IS NOT NULL THEN br.id END) AS total_opportunities,
    
    -- Questions
    COUNT(DISTINCT bq.id) AS total_questions,
    COUNT(DISTINCT CASE WHEN bq.status = 'SUBMITTED' THEN bq.id END) AS questions_submitted,
    COUNT(DISTINCT CASE WHEN bq.response_text IS NOT NULL THEN bq.id END) AS questions_answered,
    
    -- Documents
    COUNT(DISTINCT bd.id) AS total_documents,
    COUNT(DISTINCT CASE WHEN bd.processing_status = 'COMPLETED' THEN bd.id END) AS documents_processed,
    
    -- Work packages (unique values)
    COUNT(DISTINCT pli.work_package) FILTER (WHERE pli.work_package IS NOT NULL) AS total_work_packages,
    
    -- Completion percentage estimate
    CASE 
        WHEN COUNT(DISTINCT pli.id) = 0 THEN 0
        ELSE ROUND(
            (COUNT(DISTINCT CASE WHEN pli.is_reviewed THEN pli.id END)::NUMERIC / 
             NULLIF(COUNT(DISTINCT pli.id), 0)) * 100, 1
        )
    END AS estimated_completion_pct

FROM bid_projects bp
LEFT JOIN proposal_line_items pli ON pli.bid_project_id = bp.id
LEFT JOIN bid_risks br ON br.bid_project_id = bp.id
LEFT JOIN bid_questions bq ON bq.bid_project_id = bp.id
LEFT JOIN bid_documents bd ON bd.bid_project_id = bp.id

GROUP BY bp.id, bp.project_name, bp.status, bp.bid_due_date, bp.owner;

-- ============================================
-- FUNCTION: apply_assembly_template
-- Purpose: Copy template lines to line item
-- ============================================

CREATE OR REPLACE FUNCTION apply_assembly_template(
    p_line_item_id UUID,
    p_template_id UUID,
    p_wage_determination_id UUID DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INTEGER := 0;
    v_line_item RECORD;
    v_template_line RECORD;
BEGIN
    -- Get line item details
    SELECT * INTO v_line_item 
    FROM proposal_line_items 
    WHERE id = p_line_item_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Line item not found: %', p_line_item_id;
    END IF;
    
    -- Delete existing assemblies for this line item
    DELETE FROM item_assemblies WHERE line_item_id = p_line_item_id;
    
    -- Copy template lines
    FOR v_template_line IN 
        SELECT * FROM assembly_template_lines 
        WHERE template_id = p_template_id 
        ORDER BY sort_order
    LOOP
        INSERT INTO item_assemblies (
            line_item_id,
            cost_code_id,
            resource_type,
            resource_description,
            wage_classification,
            quantity_per_unit,
            quantity_uom,
            waste_percentage,
            unit_cost,
            cost_source,
            productivity_factor,
            productivity_notes,
            template_line_id,
            sort_order,
            is_ai_suggested
        ) VALUES (
            p_line_item_id,
            v_template_line.internal_cost_code_id,
            v_template_line.resource_type,
            v_template_line.resource_description,
            v_template_line.wage_classification,
            v_template_line.quantity_per_unit,
            v_template_line.quantity_uom,
            v_template_line.waste_percentage,
            v_template_line.default_unit_cost,
            v_template_line.cost_source,
            v_template_line.productivity_factor,
            v_template_line.productivity_notes,
            v_template_line.id,
            v_template_line.sort_order,
            TRUE
        );
        
        v_count := v_count + 1;
    END LOOP;
    
    -- Recalculate line item totals
    PERFORM calculate_line_item_price(p_line_item_id);
    
    RETURN v_count;
END;
$$;

-- ============================================
-- FUNCTION: calculate_line_item_price
-- Purpose: Sum assemblies to get line item price
-- ============================================

CREATE OR REPLACE FUNCTION calculate_line_item_price(
    p_line_item_id UUID
) RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_line_item RECORD;
    v_direct_cost NUMERIC := 0;
    v_total_price NUMERIC := 0;
BEGIN
    -- Get line item
    SELECT * INTO v_line_item 
    FROM proposal_line_items 
    WHERE id = p_line_item_id;
    
    IF v_line_item.calculation_method = 'ASSEMBLY_SUM' THEN
        -- Calculate total from assemblies
        SELECT COALESCE(SUM(
            (quantity_per_unit * (1 + waste_percentage/100) * unit_cost * productivity_factor) * v_line_item.quantity
        ), 0)
        INTO v_direct_cost
        FROM item_assemblies
        WHERE line_item_id = p_line_item_id;
        
        v_total_price := v_direct_cost;
        
    ELSIF v_line_item.calculation_method = 'MANUAL_ENTRY' THEN
        v_total_price := v_line_item.quantity * COALESCE(v_line_item.unit_price, 0);
        v_direct_cost := v_total_price;
        
    ELSIF v_line_item.calculation_method = 'SUBCONTRACT_QUOTE' THEN
        v_total_price := v_line_item.quantity * COALESCE(v_line_item.unit_price, 0);
        v_direct_cost := v_total_price;
    END IF;
    
    -- Update line item
    UPDATE proposal_line_items
    SET 
        direct_cost = v_direct_cost,
        total_price = v_total_price,
        unit_price = CASE WHEN quantity > 0 THEN v_total_price / quantity ELSE 0 END,
        updated_at = NOW()
    WHERE id = p_line_item_id;
    
    RETURN v_total_price;
END;
$$;

-- ============================================
-- FUNCTION: calculate_percentage_items
-- Purpose: Handle Mobilization circular dependency
-- ============================================

CREATE OR REPLACE FUNCTION calculate_percentage_items(
    p_bid_project_id UUID
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_subtotal NUMERIC := 0;
    v_pct_item RECORD;
BEGIN
    -- First pass: Calculate subtotal from non-percentage items
    SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
    FROM proposal_line_items
    WHERE bid_project_id = p_bid_project_id
    AND calculation_method NOT IN ('PERCENT_OF_SUBTOTAL', 'PERCENT_OF_TOTAL');
    
    -- Second pass: Calculate percentage-based items
    FOR v_pct_item IN 
        SELECT * FROM proposal_line_items
        WHERE bid_project_id = p_bid_project_id
        AND calculation_method = 'PERCENT_OF_SUBTOTAL'
        ORDER BY sort_order
    LOOP
        UPDATE proposal_line_items
        SET 
            total_price = v_subtotal * (calculation_percentage / 100),
            unit_price = v_subtotal * (calculation_percentage / 100), -- LS items
            direct_cost = v_subtotal * (calculation_percentage / 100),
            updated_at = NOW()
        WHERE id = v_pct_item.id;
    END LOOP;
END;
$$;

-- ============================================
-- FUNCTION: calculate_final_bid_price
-- Purpose: Master pricing calculation
-- ============================================

CREATE OR REPLACE FUNCTION calculate_final_bid_price(
    p_bid_project_id UUID
) RETURNS TABLE (
    direct_cost NUMERIC,
    indirect_cost NUMERIC,
    subtotal NUMERIC,
    markup_total NUMERIC,
    final_bid_price NUMERIC
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_direct_cost NUMERIC := 0;
    v_indirect_cost NUMERIC := 0;
    v_subtotal NUMERIC := 0;
    v_markup_total NUMERIC := 0;
    v_running_base NUMERIC := 0;
    v_markup_layer RECORD;
BEGIN
    -- Calculate percentage-based line items first
    PERFORM calculate_percentage_items(p_bid_project_id);
    
    -- Sum all line item prices
    SELECT COALESCE(SUM(pli.total_price), 0) INTO v_direct_cost
    FROM proposal_line_items pli
    WHERE pli.bid_project_id = p_bid_project_id;
    
    -- Sum indirect costs
    SELECT COALESCE(SUM(pic.calculated_cost), 0) INTO v_indirect_cost
    FROM project_indirect_costs pic
    WHERE pic.bid_project_id = p_bid_project_id;
    
    v_subtotal := v_direct_cost + v_indirect_cost;
    v_running_base := v_subtotal;
    
    -- Apply markup layers in order
    FOR v_markup_layer IN 
        SELECT * FROM proposal_markup_layers
        WHERE bid_project_id = p_bid_project_id
        ORDER BY layer_order
    LOOP
        -- Determine base for this layer
        IF v_markup_layer.calculation_base = 'DIRECT_COST' THEN
            v_running_base := v_direct_cost;
        ELSIF v_markup_layer.calculation_base = 'DIRECT_PLUS_INDIRECT' THEN
            v_running_base := v_subtotal;
        -- CUMULATIVE uses running base
        END IF;
        
        -- Calculate and accumulate markup
        UPDATE proposal_markup_layers
        SET 
            base_amount = v_running_base,
            markup_amount = v_running_base * (markup_percentage / 100),
            updated_at = NOW()
        WHERE id = v_markup_layer.id;
        
        v_markup_total := v_markup_total + (v_running_base * (v_markup_layer.markup_percentage / 100));
        v_running_base := v_running_base + (v_running_base * (v_markup_layer.markup_percentage / 100));
    END LOOP;
    
    -- Update project totals
    UPDATE bid_projects
    SET 
        total_direct_cost = v_direct_cost,
        total_bid_amount = v_subtotal + v_markup_total,
        updated_at = NOW()
    WHERE id = p_bid_project_id;
    
    RETURN QUERY SELECT 
        v_direct_cost,
        v_indirect_cost,
        v_subtotal,
        v_markup_total,
        v_subtotal + v_markup_total;
END;
$$;

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE master_wvdoh_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE assembly_template_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_assemblies ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_indirect_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposal_markup_layers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_documents ENABLE ROW LEVEL SECURITY;

-- WVDOH items are global read
CREATE POLICY "WVDOH items are readable by all" ON master_wvdoh_items
    FOR SELECT USING (true);

-- Cost codes by organization
CREATE POLICY "Cost codes by organization" ON cost_codes
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Templates by organization
CREATE POLICY "Templates by organization" ON assembly_templates
    FOR ALL USING (
        organization_id IS NULL OR
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Template lines inherit from template
CREATE POLICY "Template lines inherit access" ON assembly_template_lines
    FOR ALL USING (
        template_id IN (
            SELECT id FROM assembly_templates WHERE 
            organization_id IS NULL OR
            organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
        )
    );

-- Line items by project access
CREATE POLICY "Line items by project" ON proposal_line_items
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM bid_projects WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Item assemblies inherit from line item
CREATE POLICY "Assemblies by line item" ON item_assemblies
    FOR ALL USING (
        line_item_id IN (SELECT id FROM proposal_line_items)
    );

-- Indirect costs by project
CREATE POLICY "Indirect costs by project" ON project_indirect_costs
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM bid_projects WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Markup layers by project
CREATE POLICY "Markup by project" ON proposal_markup_layers
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM bid_projects WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Risks by project
CREATE POLICY "Risks by project" ON bid_risks
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM bid_projects WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Questions by project
CREATE POLICY "Questions by project" ON bid_questions
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM bid_projects WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

-- Documents by project
CREATE POLICY "Documents by project" ON bid_documents
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM bid_projects WHERE organization_id IN (
                SELECT organization_id FROM profiles WHERE id = auth.uid()
            )
        )
    );
```

---

### Phase 1 Continued: Seed Data

#### Migration 009a: WVDOH Master Items

```sql
-- ============================================
-- MIGRATION 009a: WVDOH MASTER ITEMS SEED
-- ============================================

INSERT INTO master_wvdoh_items (item_code, description, unit, division, category, spec_section, typical_unit_price_low, typical_unit_price_high, requires_assembly) VALUES

-- Division 100: General
('109010-000', 'Mobilization', 'LS', '100', 'GENERAL', '109', NULL, NULL, FALSE),

-- Division 200: Earthwork  
('202004-000', 'Unclassified Excavation', 'CY', '200', 'EARTHWORK', '202', 8.00, 25.00, TRUE),
('203001-000', 'Borrow Excavation', 'CY', '200', 'EARTHWORK', '203', 12.00, 30.00, TRUE),
('212001-000', 'Structure Excavation', 'CY', '200', 'EARTHWORK', '212', 15.00, 85.00, TRUE),

-- Division 300: Bases
('302001-000', 'Aggregate Base Course', 'TON', '300', 'BASE', '302', 25.00, 45.00, TRUE),

-- Division 400: Asphalt
('401001-000', 'Hot Mix Asphalt Base', 'TON', '400', 'ASPHALT', '401', 75.00, 120.00, TRUE),
('411001-000', 'Superpave Asphalt', 'TON', '400', 'ASPHALT', '411', 85.00, 140.00, TRUE),

-- Division 500: Concrete Pavement
('501001-000', 'Portland Cement Concrete Pavement', 'SY', '500', 'CONCRETE', '501', 45.00, 85.00, TRUE),

-- Division 600: Structures (Bridge)
('601009-001', 'Class H Concrete (Bridge)', 'CY', '600', 'CONCRETE', '601', 450.00, 850.00, TRUE),
('601009-002', 'Class K Concrete (Bridge)', 'CY', '600', 'CONCRETE', '601', 500.00, 900.00, TRUE),
('602002-000', 'Reinforcing Steel, Epoxy Coated', 'LB', '600', 'STEEL', '602', 1.25, 2.50, TRUE),
('602003-000', 'Reinforcing Steel, Uncoated', 'LB', '600', 'STEEL', '602', 1.00, 2.00, TRUE),
('603001-000', 'Structural Steel', 'LB', '600', 'STEEL', '603', 2.50, 5.00, TRUE),
('615029-000', 'Elastomeric Bearing', 'EA', '600', 'BEARINGS', '615', 800.00, 2500.00, TRUE),
('617001-000', 'Concrete Deck Overlay', 'SY', '600', 'OVERLAY', '617', 35.00, 75.00, TRUE),
('620001-000', 'Concrete Pile', 'LF', '600', 'PILES', '620', 45.00, 120.00, TRUE),
('627002-000', 'Compression Seal Expansion Joint', 'LF', '600', 'JOINTS', '627', 75.00, 200.00, TRUE),
('627003-000', 'Silicone Foam Expansion Joint', 'LF', '600', 'JOINTS', '627', 85.00, 225.00, TRUE),

-- Division 700: Traffic Control & Safety
('679001-000', 'Hydrodemolition', 'SY', '600', 'DEMOLITION', '679', 25.00, 75.00, FALSE),
('705080-000', 'Guardrail, W-Beam Single Face', 'LF', '700', 'GUARDRAIL', '705', 28.00, 55.00, TRUE),
('705090-000', 'Guardrail Terminal', 'EA', '700', 'GUARDRAIL', '705', 1200.00, 3500.00, TRUE),
('711001-000', 'Permanent Signing', 'SF', '700', 'SIGNING', '711', 15.00, 40.00, TRUE),
('716001-000', 'Pavement Markings', 'LF', '700', 'MARKINGS', '716', 0.50, 2.00, TRUE),

-- Division 800: Incidentals
('801001-000', 'Seeding', 'SY', '800', 'LANDSCAPING', '801', 0.50, 2.00, TRUE),
('803001-000', 'Silt Fence', 'LF', '800', 'EROSION', '803', 3.00, 8.00, TRUE),
('805001-000', 'Inlet Protection', 'EA', '800', 'EROSION', '805', 75.00, 200.00, TRUE)

ON CONFLICT (item_code) DO UPDATE SET
    description = EXCLUDED.description,
    unit = EXCLUDED.unit,
    typical_unit_price_low = EXCLUDED.typical_unit_price_low,
    typical_unit_price_high = EXCLUDED.typical_unit_price_high;
```

#### Migration 009b: Assembly Templates

```sql
-- ============================================
-- MIGRATION 009b: ASSEMBLY TEMPLATES SEED
-- ============================================

-- NOTE: These are default templates available to all organizations
-- Organization-specific templates should have organization_id set

-- Template: Class H Concrete (Standard Pump Pour)
INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
VALUES (
    'a0000001-0000-0000-0000-000000000001',
    '601009-001',
    'Class H Concrete - Standard Pump Pour',
    'Standard bridge concrete placement using pump. 4 labor, 3 equipment, 3 materials.',
    TRUE,
    'BRIDGE',
    'RS Means 2024'
);

INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, quantity_per_unit, quantity_uom, default_unit_cost, cost_source, sort_order) VALUES
('a0000001-0000-0000-0000-000000000001', 'LABOR', 'Cement Mason Foreman', 'Cement Mason', 0.50, 'HR/CY', 65.00, 'Davis-Bacon WV 2024', 1),
('a0000001-0000-0000-0000-000000000001', 'LABOR', 'Cement Mason', 'Cement Mason', 1.50, 'HR/CY', 58.00, 'Davis-Bacon WV 2024', 2),
('a0000001-0000-0000-0000-000000000001', 'LABOR', 'Laborer', 'Laborer', 2.00, 'HR/CY', 42.00, 'Davis-Bacon WV 2024', 3),
('a0000001-0000-0000-0000-000000000001', 'LABOR', 'Operator - Pump', 'Operating Engineer', 0.50, 'HR/CY', 62.00, 'Davis-Bacon WV 2024', 4),
('a0000001-0000-0000-0000-000000000001', 'EQUIPMENT', 'Concrete Pump (Line)', 'N/A', 0.50, 'HR/CY', 175.00, 'Rental Rate Blue Book', 5),
('a0000001-0000-0000-0000-000000000001', 'EQUIPMENT', 'Vibrators (2)', 'N/A', 0.50, 'HR/CY', 25.00, 'Owned', 6),
('a0000001-0000-0000-0000-000000000001', 'EQUIPMENT', 'Hand Tools/Misc', 'N/A', 0.25, 'HR/CY', 15.00, 'Allowance', 7),
('a0000001-0000-0000-0000-000000000001', 'MATERIAL', 'Class H Concrete', 'N/A', 1.05, 'CY/CY', 165.00, 'Supplier Quote', 8),
('a0000001-0000-0000-0000-000000000001', 'MATERIAL', 'Curing Compound', 'N/A', 0.15, 'GAL/CY', 28.00, 'Supplier Quote', 9),
('a0000001-0000-0000-0000-000000000001', 'MATERIAL', 'Form Oil/Release', 'N/A', 0.05, 'GAL/CY', 35.00, 'Supplier Quote', 10);

-- Template: Epoxy Coated Rebar
INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
VALUES (
    'a0000001-0000-0000-0000-000000000002',
    '602002-000',
    'Epoxy Coated Rebar - Standard Installation',
    'Standard rebar placement and tying. Includes material and labor.',
    TRUE,
    'ALL',
    'Historical'
);

INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, quantity_per_unit, quantity_uom, default_unit_cost, cost_source, sort_order) VALUES
('a0000001-0000-0000-0000-000000000002', 'LABOR', 'Ironworker Foreman', 'Ironworker', 0.008, 'HR/LB', 68.00, 'Davis-Bacon WV 2024', 1),
('a0000001-0000-0000-0000-000000000002', 'LABOR', 'Ironworker', 'Ironworker', 0.015, 'HR/LB', 62.00, 'Davis-Bacon WV 2024', 2),
('a0000001-0000-0000-0000-000000000002', 'EQUIPMENT', 'Crane Support', 'N/A', 0.005, 'HR/LB', 185.00, 'Rental', 3),
('a0000001-0000-0000-0000-000000000002', 'MATERIAL', 'Epoxy Coated Rebar (FOB)', 'N/A', 1.00, 'LB/LB', 0.85, 'Supplier Quote', 4),
('a0000001-0000-0000-0000-000000000002', 'MATERIAL', 'Tie Wire', 'N/A', 0.02, 'LB/LB', 1.50, 'Supplier Quote', 5),
('a0000001-0000-0000-0000-000000000002', 'MATERIAL', 'Chairs/Supports', 'N/A', 0.01, 'EA/LB', 0.75, 'Supplier Quote', 6);

-- Template: Structure Excavation - Standard
INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
VALUES (
    'a0000001-0000-0000-0000-000000000003',
    '212001-000',
    'Structure Excavation - Standard Soil',
    'Standard excavation for bridge footings in soil. No rock, no dewatering.',
    TRUE,
    'BRIDGE',
    'Historical'
);

INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, quantity_per_unit, quantity_uom, default_unit_cost, cost_source, sort_order) VALUES
('a0000001-0000-0000-0000-000000000003', 'LABOR', 'Operator - Excavator', 'Operating Engineer', 0.15, 'HR/CY', 62.00, 'Davis-Bacon WV 2024', 1),
('a0000001-0000-0000-0000-000000000003', 'LABOR', 'Operator - Loader', 'Operating Engineer', 0.10, 'HR/CY', 58.00, 'Davis-Bacon WV 2024', 2),
('a0000001-0000-0000-0000-000000000003', 'LABOR', 'Laborer (Grading)', 'Laborer', 0.20, 'HR/CY', 42.00, 'Davis-Bacon WV 2024', 3),
('a0000001-0000-0000-0000-000000000003', 'EQUIPMENT', 'Excavator 330 Class', 'N/A', 0.15, 'HR/CY', 185.00, 'Owned', 4),
('a0000001-0000-0000-0000-000000000003', 'EQUIPMENT', 'Wheel Loader', 'N/A', 0.10, 'HR/CY', 125.00, 'Owned', 5);

-- Template: W-Beam Guardrail
INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
VALUES (
    'a0000001-0000-0000-0000-000000000004',
    '705080-000',
    'W-Beam Guardrail Single Face - Standard',
    'Standard guardrail installation including posts, rail, and hardware.',
    TRUE,
    'HIGHWAY',
    'Historical'
);

INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, quantity_per_unit, quantity_uom, default_unit_cost, cost_source, sort_order) VALUES
('a0000001-0000-0000-0000-000000000004', 'LABOR', 'Guardrail Crew Foreman', 'Laborer', 0.08, 'HR/LF', 48.00, 'Davis-Bacon WV 2024', 1),
('a0000001-0000-0000-0000-000000000004', 'LABOR', 'Guardrail Installer', 'Laborer', 0.12, 'HR/LF', 42.00, 'Davis-Bacon WV 2024', 2),
('a0000001-0000-0000-0000-000000000004', 'EQUIPMENT', 'Post Driver', 'N/A', 0.05, 'HR/LF', 95.00, 'Rental', 3),
('a0000001-0000-0000-0000-000000000004', 'EQUIPMENT', 'Truck w/ Crane', 'N/A', 0.03, 'HR/LF', 125.00, 'Owned', 4),
('a0000001-0000-0000-0000-000000000004', 'MATERIAL', 'W-Beam Rail Section', 'N/A', 1.00, 'LF/LF', 12.50, 'Supplier', 5),
('a0000001-0000-0000-0000-000000000004', 'MATERIAL', 'Steel Post 6ft', 'N/A', 0.16, 'EA/LF', 28.00, 'Supplier', 6),
('a0000001-0000-0000-0000-000000000004', 'MATERIAL', 'Hardware Kit', 'N/A', 0.16, 'EA/LF', 8.50, 'Supplier', 7);

-- Template: Mobilization (Percentage-Based)
INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
VALUES (
    'a0000001-0000-0000-0000-000000000005',
    '109010-000',
    'Mobilization - 5% of Subtotal',
    'Standard mobilization as percentage of bid subtotal. WVDOH caps at 5%.',
    TRUE,
    'ALL',
    'WVDOH Standard'
);
-- Note: Mobilization uses PERCENT_OF_SUBTOTAL calculation method, no assembly lines needed

-- Template: Hydrodemolition (Subcontract)
INSERT INTO assembly_templates (id, wvdoh_item_code, template_name, template_description, is_default, project_type, source)
VALUES (
    'a0000001-0000-0000-0000-000000000006',
    '679001-000',
    'Hydrodemolition - Subcontract',
    'Specialty work typically subcontracted. Enter subcontractor quote.',
    TRUE,
    'BRIDGE',
    'Industry Standard'
);

INSERT INTO assembly_template_lines (template_id, resource_type, resource_description, wage_classification, quantity_per_unit, quantity_uom, default_unit_cost, cost_source, sort_order) VALUES
('a0000001-0000-0000-0000-000000000006', 'SUBCONTRACTOR', 'Hydrodemolition Subcontractor', 'N/A', 1.00, 'SY/SY', 45.00, 'Budget Estimate', 1);
```

#### Migration 009c: Cost Codes

```sql
-- ============================================
-- MIGRATION 009c: COST CODES SEED
-- ============================================

-- Note: organization_id should be set for Triton-specific codes
-- Using NULL for system defaults

INSERT INTO cost_codes (code, description, division, category, is_labor, is_equipment, is_material, is_subcontract, default_unit, typical_unit_cost) VALUES

-- Division 01: General Requirements
('01-100', 'Project Management', '01', 'GENERAL', TRUE, FALSE, FALSE, FALSE, 'HR', 85.00),
('01-110', 'Superintendent', '01', 'GENERAL', TRUE, FALSE, FALSE, FALSE, 'HR', 75.00),
('01-120', 'Project Engineer', '01', 'GENERAL', TRUE, FALSE, FALSE, FALSE, 'HR', 65.00),
('01-200', 'Field Office', '01', 'GENERAL', FALSE, FALSE, TRUE, FALSE, 'MO', 2500.00),
('01-210', 'Temporary Utilities', '01', 'GENERAL', FALSE, FALSE, TRUE, FALSE, 'MO', 800.00),
('01-220', 'Temporary Facilities', '01', 'GENERAL', FALSE, FALSE, TRUE, FALSE, 'MO', 1500.00),
('01-300', 'Safety Equipment', '01', 'GENERAL', FALSE, FALSE, TRUE, FALSE, 'MO', 1200.00),
('01-310', 'First Aid/Safety', '01', 'GENERAL', FALSE, FALSE, TRUE, FALSE, 'MO', 500.00),
('01-400', 'Survey/Layout', '01', 'GENERAL', TRUE, TRUE, FALSE, FALSE, 'HR', 125.00),
('01-500', 'Permits', '01', 'GENERAL', FALSE, FALSE, TRUE, FALSE, 'LS', NULL),
('01-510', 'Insurance', '01', 'GENERAL', FALSE, FALSE, TRUE, FALSE, 'PCT', NULL),
('01-520', 'Bonds', '01', 'GENERAL', FALSE, FALSE, TRUE, FALSE, 'PCT', NULL),
('01-600', 'Small Tools', '01', 'GENERAL', FALSE, TRUE, FALSE, FALSE, 'PCT', NULL),
('01-610', 'Consumables', '01', 'GENERAL', FALSE, FALSE, TRUE, FALSE, 'LS', NULL),

-- Division 02: Existing Conditions
('02-100', 'Demolition Labor', '02', 'DEMOLITION', TRUE, FALSE, FALSE, FALSE, 'HR', 42.00),
('02-110', 'Demolition Equipment', '02', 'DEMOLITION', FALSE, TRUE, FALSE, FALSE, 'HR', 185.00),
('02-200', 'Hazmat Abatement', '02', 'HAZMAT', FALSE, FALSE, FALSE, TRUE, 'LS', NULL),
('02-210', 'Asbestos Removal', '02', 'HAZMAT', FALSE, FALSE, FALSE, TRUE, 'SF', 15.00),
('02-220', 'Lead Paint Removal', '02', 'HAZMAT', FALSE, FALSE, FALSE, TRUE, 'SF', 12.00),

-- Division 03: Concrete
('03-100', 'Concrete Foreman', '03', 'CONCRETE', TRUE, FALSE, FALSE, FALSE, 'HR', 65.00),
('03-110', 'Cement Mason', '03', 'CONCRETE', TRUE, FALSE, FALSE, FALSE, 'HR', 58.00),
('03-120', 'Concrete Laborer', '03', 'CONCRETE', TRUE, FALSE, FALSE, FALSE, 'HR', 42.00),
('03-130', 'Concrete Finisher', '03', 'CONCRETE', TRUE, FALSE, FALSE, FALSE, 'HR', 55.00),
('03-200', 'Concrete Pump', '03', 'CONCRETE', FALSE, TRUE, FALSE, FALSE, 'HR', 175.00),
('03-210', 'Concrete Bucket', '03', 'CONCRETE', FALSE, TRUE, FALSE, FALSE, 'HR', 45.00),
('03-220', 'Vibrators', '03', 'CONCRETE', FALSE, TRUE, FALSE, FALSE, 'HR', 25.00),
('03-230', 'Finishing Equipment', '03', 'CONCRETE', FALSE, TRUE, FALSE, FALSE, 'HR', 35.00),
('03-300', 'Ready Mix Concrete', '03', 'CONCRETE', FALSE, FALSE, TRUE, FALSE, 'CY', 165.00),
('03-310', 'Curing Compound', '03', 'CONCRETE', FALSE, FALSE, TRUE, FALSE, 'GAL', 28.00),
('03-320', 'Form Release', '03', 'CONCRETE', FALSE, FALSE, TRUE, FALSE, 'GAL', 35.00),
('03-330', 'Admixtures', '03', 'CONCRETE', FALSE, FALSE, TRUE, FALSE, 'GAL', 45.00),
('03-400', 'Formwork Labor', '03', 'CONCRETE', TRUE, FALSE, FALSE, FALSE, 'HR', 52.00),
('03-410', 'Formwork Materials', '03', 'CONCRETE', FALSE, FALSE, TRUE, FALSE, 'SFCA', 8.50),
('03-420', 'Form Rental', '03', 'CONCRETE', FALSE, TRUE, FALSE, FALSE, 'SFCA', 3.50),
('03-500', 'Rebar Labor', '03', 'CONCRETE', TRUE, FALSE, FALSE, FALSE, 'HR', 62.00),
('03-510', 'Rebar Material - Epoxy', '03', 'CONCRETE', FALSE, FALSE, TRUE, FALSE, 'LB', 0.85),
('03-520', 'Rebar Material - Plain', '03', 'CONCRETE', FALSE, FALSE, TRUE, FALSE, 'LB', 0.65),
('03-530', 'Tie Wire', '03', 'CONCRETE', FALSE, FALSE, TRUE, FALSE, 'LB', 1.50),
('03-540', 'Rebar Supports', '03', 'CONCRETE', FALSE, FALSE, TRUE, FALSE, 'EA', 0.75),

-- Division 05: Metals/Steel
('05-100', 'Ironworker Foreman', '05', 'STEEL', TRUE, FALSE, FALSE, FALSE, 'HR', 68.00),
('05-110', 'Ironworker', '05', 'STEEL', TRUE, FALSE, FALSE, FALSE, 'HR', 62.00),
('05-200', 'Structural Steel Material', '05', 'STEEL', FALSE, FALSE, TRUE, FALSE, 'LB', 2.50),
('05-210', 'Steel Erection Sub', '05', 'STEEL', FALSE, FALSE, FALSE, TRUE, 'LB', 1.50),
('05-300', 'Bearings - Elastomeric', '05', 'STEEL', FALSE, FALSE, TRUE, FALSE, 'EA', 1500.00),
('05-310', 'Bearings - Pot', '05', 'STEEL', FALSE, FALSE, TRUE, FALSE, 'EA', 8500.00),

-- Division 07: Waterproofing/Joints
('07-100', 'Waterproofing Labor', '07', 'WATERPROOFING', TRUE, FALSE, FALSE, FALSE, 'HR', 48.00),
('07-200', 'Membrane Material', '07', 'WATERPROOFING', FALSE, FALSE, TRUE, FALSE, 'SY', 12.00),
('07-210', 'Expansion Joint Material', '07', 'WATERPROOFING', FALSE, FALSE, TRUE, FALSE, 'LF', 45.00),
('07-220', 'Joint Sealant', '07', 'WATERPROOFING', FALSE, FALSE, TRUE, FALSE, 'LF', 8.00),
('07-300', 'Waterproofing Sub', '07', 'WATERPROOFING', FALSE, FALSE, FALSE, TRUE, 'SY', 25.00),
('07-310', 'Joint Sub', '07', 'WATERPROOFING', FALSE, FALSE, FALSE, TRUE, 'LF', 85.00),
('07-320', 'Silicone Foam Joint', '07', 'WATERPROOFING', FALSE, FALSE, TRUE, FALSE, 'LF', 65.00),

-- Division 31: Earthwork
('31-100', 'Excavation Foreman', '31', 'EARTHWORK', TRUE, FALSE, FALSE, FALSE, 'HR', 55.00),
('31-110', 'Equipment Operator', '31', 'EARTHWORK', TRUE, FALSE, FALSE, FALSE, 'HR', 58.00),
('31-120', 'Laborer', '31', 'EARTHWORK', TRUE, FALSE, FALSE, FALSE, 'HR', 42.00),
('31-130', 'Truck Driver', '31', 'EARTHWORK', TRUE, FALSE, FALSE, FALSE, 'HR', 45.00),
('31-200', 'Excavator 330', '31', 'EARTHWORK', FALSE, TRUE, FALSE, FALSE, 'HR', 185.00),
('31-210', 'Excavator 200', '31', 'EARTHWORK', FALSE, TRUE, FALSE, FALSE, 'HR', 145.00),
('31-220', 'Dozer D6', '31', 'EARTHWORK', FALSE, TRUE, FALSE, FALSE, 'HR', 165.00),
('31-230', 'Loader 966', '31', 'EARTHWORK', FALSE, TRUE, FALSE, FALSE, 'HR', 125.00),
('31-240', 'Roller', '31', 'EARTHWORK', FALSE, TRUE, FALSE, FALSE, 'HR', 85.00),
('31-250', 'Haul Truck', '31', 'EARTHWORK', FALSE, TRUE, FALSE, FALSE, 'HR', 95.00),
('31-260', 'Water Truck', '31', 'EARTHWORK', FALSE, TRUE, FALSE, FALSE, 'HR', 75.00),
('31-300', 'Borrow Material', '31', 'EARTHWORK', FALSE, FALSE, TRUE, FALSE, 'CY', 8.00),
('31-310', 'Select Fill', '31', 'EARTHWORK', FALSE, FALSE, TRUE, FALSE, 'CY', 15.00),
('31-400', 'Dewatering Sub', '31', 'EARTHWORK', FALSE, FALSE, FALSE, TRUE, 'LS', NULL),
('31-410', 'Blasting Sub', '31', 'EARTHWORK', FALSE, FALSE, FALSE, TRUE, 'CY', 25.00),
('31-420', 'Rock Breaker', '31', 'EARTHWORK', FALSE, TRUE, FALSE, FALSE, 'HR', 225.00),

-- Division 32: Exterior/Guardrail
('32-100', 'Guardrail Foreman', '32', 'GUARDRAIL', TRUE, FALSE, FALSE, FALSE, 'HR', 48.00),
('32-110', 'Guardrail Installer', '32', 'GUARDRAIL', TRUE, FALSE, FALSE, FALSE, 'HR', 42.00),
('32-200', 'Post Driver', '32', 'GUARDRAIL', FALSE, TRUE, FALSE, FALSE, 'HR', 95.00),
('32-210', 'Truck w/ Crane', '32', 'GUARDRAIL', FALSE, TRUE, FALSE, FALSE, 'HR', 125.00),
('32-300', 'W-Beam Rail', '32', 'GUARDRAIL', FALSE, FALSE, TRUE, FALSE, 'LF', 12.50),
('32-310', 'Steel Posts', '32', 'GUARDRAIL', FALSE, FALSE, TRUE, FALSE, 'EA', 28.00),
('32-320', 'Hardware', '32', 'GUARDRAIL', FALSE, FALSE, TRUE, FALSE, 'EA', 8.50),
('32-330', 'End Terminal', '32', 'GUARDRAIL', FALSE, FALSE, TRUE, FALSE, 'EA', 1800.00),
('32-400', 'Guardrail Sub', '32', 'GUARDRAIL', FALSE, FALSE, FALSE, TRUE, 'LF', 35.00),
('32-500', 'Pavement Marking Material', '32', 'MARKINGS', FALSE, FALSE, TRUE, FALSE, 'LF', 0.45),
('32-510', 'Marking Sub', '32', 'MARKINGS', FALSE, FALSE, FALSE, TRUE, 'LF', 0.85),

-- Division 41: Equipment/Cranes
('41-100', 'Crane Operator', '41', 'EQUIPMENT', TRUE, FALSE, FALSE, FALSE, 'HR', 68.00),
('41-110', 'Oiler/Rigger', '41', 'EQUIPMENT', TRUE, FALSE, FALSE, FALSE, 'HR', 52.00),
('41-200', 'Crane 100 Ton', '41', 'EQUIPMENT', FALSE, TRUE, FALSE, FALSE, 'HR', 350.00),
('41-210', 'Crane 50 Ton', '41', 'EQUIPMENT', FALSE, TRUE, FALSE, FALSE, 'HR', 225.00),
('41-220', 'Crane Mobilization', '41', 'EQUIPMENT', FALSE, TRUE, FALSE, FALSE, 'LS', 5000.00)

ON CONFLICT (organization_id, code) DO UPDATE SET
    description = EXCLUDED.description,
    typical_unit_cost = EXCLUDED.typical_unit_cost;
```

---

### Phase 2: Frontend Components (Week 2-3)

**Objective:** Build the UI components for managing line items and assemblies.

#### Component 1: LineItemsTab (Complete Implementation)

**File:** `apps/web/src/components/bids/LineItemsTab.tsx`

```typescript
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';

interface LineItem {
  id: string;
  item_number: string | null;
  wvdoh_item_code: string | null;
  description: string;
  unit: string;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  calculation_method: string;
  is_reviewed: boolean;
  work_package: string | null;
  pricing_confidence: string | null;
  assembly_count?: number;
}

interface WVDOHItem {
  item_code: string;
  description: string;
  unit: string;
  typical_unit_price_low: number | null;
  typical_unit_price_high: number | null;
}

interface Props {
  projectId: string;
}

export function LineItemsTab({ projectId }: Props) {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LineItem | null>(null);
  const [wvdohItems, setWvdohItems] = useState<WVDOHItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchLineItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('proposal_line_items')
        .select(`
          *,
          item_assemblies(count)
        `)
        .eq('bid_project_id', projectId)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;

      const itemsWithCount = (data || []).map(item => ({
        ...item,
        assembly_count: item.item_assemblies?.[0]?.count || 0
      }));

      setLineItems(itemsWithCount);
    } catch (err) {
      console.error('Error fetching line items:', err);
      setError('Failed to load line items');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const fetchWVDOHItems = useCallback(async () => {
    const { data } = await supabase
      .from('master_wvdoh_items')
      .select('item_code, description, unit, typical_unit_price_low, typical_unit_price_high')
      .eq('is_active', true)
      .order('item_code');
    
    setWvdohItems(data || []);
  }, []);

  useEffect(() => {
    fetchLineItems();
    fetchWVDOHItems();
  }, [fetchLineItems, fetchWVDOHItems]);

  const handleAddItem = async (newItem: Partial<LineItem>) => {
    try {
      const { error: insertError } = await supabase
        .from('proposal_line_items')
        .insert({
          bid_project_id: projectId,
          ...newItem,
          sort_order: lineItems.length + 1
        });

      if (insertError) throw insertError;
      
      setShowAddModal(false);
      fetchLineItems();
    } catch (err) {
      console.error('Error adding line item:', err);
      setError('Failed to add line item');
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Delete this line item? This will also delete all assemblies.')) return;

    try {
      const { error: deleteError } = await supabase
        .from('proposal_line_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;
      fetchLineItems();
    } catch (err) {
      console.error('Error deleting line item:', err);
      setError('Failed to delete line item');
    }
  };

  const handleApplyTemplate = async (itemId: string, templateId: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('apply_assembly_template', {
        p_line_item_id: itemId,
        p_template_id: templateId
      });

      if (rpcError) throw rpcError;
      fetchLineItems();
    } catch (err) {
      console.error('Error applying template:', err);
      setError('Failed to apply template');
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const getConfidenceBadge = (confidence: string | null) => {
    if (!confidence) return null;
    const colors: Record<string, string> = {
      'VERY_LOW': 'badge-red',
      'LOW': 'badge-orange',
      'MEDIUM': 'badge-yellow',
      'HIGH': 'badge-green',
      'VERY_HIGH': 'badge-blue'
    };
    return <span className={`badge ${colors[confidence] || 'badge-gray'}`}>{confidence}</span>;
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
        <span>Loading line items...</span>
      </div>
    );
  }

  return (
    <div className="line-items-tab">
      {error && <div className="error-message">{error}</div>}

      <div className="tab-toolbar">
        <div className="toolbar-left">
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <span className="item-count">{lineItems.length} items</span>
        </div>
        <div className="toolbar-right">
          <button className="btn btn-secondary" onClick={() => {}}>
            Import from Excel
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            + Add Line Item
          </button>
        </div>
      </div>

      {lineItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3>No Line Items</h3>
          <p>Add line items manually or import from an Excel file</p>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            Add First Line Item
          </button>
        </div>
      ) : (
        <div className="line-items-table-container">
          <table className="line-items-table">
            <thead>
              <tr>
                <th className="col-item-num">#</th>
                <th className="col-code">Item Code</th>
                <th className="col-description">Description</th>
                <th className="col-unit">Unit</th>
                <th className="col-qty">Qty</th>
                <th className="col-unit-price">Unit Price</th>
                <th className="col-total">Total</th>
                <th className="col-assemblies">Assemblies</th>
                <th className="col-confidence">Confidence</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lineItems
                .filter(item => 
                  !searchQuery || 
                  item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  item.wvdoh_item_code?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((item, index) => (
                  <tr 
                    key={item.id} 
                    className={`${item.is_reviewed ? 'reviewed' : ''} ${selectedItem?.id === item.id ? 'selected' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <td className="col-item-num">{item.item_number || index + 1}</td>
                    <td className="col-code">
                      <code>{item.wvdoh_item_code || '-'}</code>
                    </td>
                    <td className="col-description">
                      <div className="description-cell">
                        <span className="description-text">{item.description}</span>
                        {item.work_package && (
                          <span className="work-package-tag">{item.work_package}</span>
                        )}
                      </div>
                    </td>
                    <td className="col-unit">{item.unit}</td>
                    <td className="col-qty">{item.quantity.toLocaleString()}</td>
                    <td className="col-unit-price">{formatCurrency(item.unit_price)}</td>
                    <td className="col-total">{formatCurrency(item.total_price)}</td>
                    <td className="col-assemblies">
                      <span className={`assembly-badge ${item.assembly_count > 0 ? 'has-assemblies' : ''}`}>
                        {item.assembly_count || 0}
                      </span>
                    </td>
                    <td className="col-confidence">
                      {getConfidenceBadge(item.pricing_confidence)}
                    </td>
                    <td className="col-actions">
                      <button 
                        className="btn-icon" 
                        onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button 
                        className="btn-icon" 
                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={6} className="totals-label">Total Bid Value</td>
                <td className="col-total">
                  {formatCurrency(lineItems.reduce((sum, item) => sum + (item.total_price || 0), 0))}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Add/Edit Modal - implement as separate component */}
      {showAddModal && (
        <LineItemModal
          wvdohItems={wvdohItems}
          onSave={handleAddItem}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Assembly Editor Panel - implement as separate component */}
      {selectedItem && (
        <AssemblyEditorPanel
          lineItem={selectedItem}
          onClose={() => setSelectedItem(null)}
          onUpdate={fetchLineItems}
          onApplyTemplate={handleApplyTemplate}
        />
      )}
    </div>
  );
}

// Implement these as separate components:
function LineItemModal({ wvdohItems, onSave, onClose }: any) {
  // Modal form for adding/editing line items
  return <div>TODO: Implement LineItemModal</div>;
}

function AssemblyEditorPanel({ lineItem, onClose, onUpdate, onApplyTemplate }: any) {
  // Side panel for editing assemblies
  return <div>TODO: Implement AssemblyEditorPanel</div>;
}
```

#### Component 2: AssemblyEditorPanel

**File:** `apps/web/src/components/bids/AssemblyEditorPanel.tsx`

```typescript
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';

interface Assembly {
  id: string;
  resource_type: 'LABOR' | 'EQUIPMENT' | 'MATERIAL' | 'SUBCONTRACTOR' | 'OTHER';
  resource_description: string;
  wage_classification: string | null;
  quantity_per_unit: number;
  quantity_uom: string | null;
  waste_percentage: number;
  unit_cost: number;
  total_cost: number | null;
  productivity_factor: number;
  is_ai_suggested: boolean;
  is_manually_adjusted: boolean;
  cost_code_id: string | null;
  sort_order: number;
}

interface Template {
  id: string;
  template_name: string;
  template_description: string | null;
  is_default: boolean;
  source: string | null;
}

interface Props {
  lineItem: {
    id: string;
    wvdoh_item_code: string | null;
    description: string;
    quantity: number;
    unit: string;
  };
  onClose: () => void;
  onUpdate: () => void;
}

export function AssemblyEditorPanel({ lineItem, onClose, onUpdate }: Props) {
  const [assemblies, setAssemblies] = useState<Assembly[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState<Assembly | null>(null);

  const fetchAssemblies = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('item_assemblies')
        .select('*')
        .eq('line_item_id', lineItem.id)
        .order('sort_order');

      if (error) throw error;
      setAssemblies(data || []);
    } catch (err) {
      console.error('Error fetching assemblies:', err);
    } finally {
      setIsLoading(false);
    }
  }, [lineItem.id]);

  const fetchTemplates = useCallback(async () => {
    if (!lineItem.wvdoh_item_code) return;

    const { data } = await supabase
      .from('assembly_templates')
      .select('id, template_name, template_description, is_default, source')
      .eq('wvdoh_item_code', lineItem.wvdoh_item_code)
      .order('is_default', { ascending: false });

    setTemplates(data || []);
  }, [lineItem.wvdoh_item_code]);

  useEffect(() => {
    fetchAssemblies();
    fetchTemplates();
  }, [fetchAssemblies, fetchTemplates]);

  const handleApplyTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase.rpc('apply_assembly_template', {
        p_line_item_id: lineItem.id,
        p_template_id: templateId
      });

      if (error) throw error;
      
      setShowTemplateSelector(false);
      fetchAssemblies();
      onUpdate();
    } catch (err) {
      console.error('Error applying template:', err);
    }
  };

  const handleAddAssembly = async (assembly: Partial<Assembly>) => {
    try {
      const { error } = await supabase
        .from('item_assemblies')
        .insert({
          line_item_id: lineItem.id,
          ...assembly,
          sort_order: assemblies.length + 1
        });

      if (error) throw error;
      fetchAssemblies();
      onUpdate();
    } catch (err) {
      console.error('Error adding assembly:', err);
    }
  };

  const handleUpdateAssembly = async (assemblyId: string, updates: Partial<Assembly>) => {
    try {
      const { error } = await supabase
        .from('item_assemblies')
        .update({
          ...updates,
          is_manually_adjusted: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', assemblyId);

      if (error) throw error;
      fetchAssemblies();
      onUpdate();
    } catch (err) {
      console.error('Error updating assembly:', err);
    }
  };

  const handleDeleteAssembly = async (assemblyId: string) => {
    try {
      const { error } = await supabase
        .from('item_assemblies')
        .delete()
        .eq('id', assemblyId);

      if (error) throw error;
      fetchAssemblies();
      onUpdate();
    } catch (err) {
      console.error('Error deleting assembly:', err);
    }
  };

  const calculateTotalCost = () => {
    return assemblies.reduce((sum, a) => {
      const cost = a.quantity_per_unit * (1 + a.waste_percentage / 100) * a.unit_cost * a.productivity_factor * lineItem.quantity;
      return sum + cost;
    }, 0);
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'LABOR': return '👷';
      case 'EQUIPMENT': return '🚜';
      case 'MATERIAL': return '📦';
      case 'SUBCONTRACTOR': return '🏢';
      default: return '📋';
    }
  };

  return (
    <div className="assembly-editor-panel">
      <div className="panel-header">
        <div className="panel-title">
          <h3>Assembly Editor</h3>
          <span className="item-code">{lineItem.wvdoh_item_code}</span>
        </div>
        <button className="btn-close" onClick={onClose}>×</button>
      </div>

      <div className="panel-item-info">
        <p className="item-description">{lineItem.description}</p>
        <div className="item-meta">
          <span>{lineItem.quantity.toLocaleString()} {lineItem.unit}</span>
          <span className="total-cost">
            Total: ${calculateTotalCost().toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <div className="panel-toolbar">
        {templates.length > 0 && (
          <button 
            className="btn btn-secondary"
            onClick={() => setShowTemplateSelector(!showTemplateSelector)}
          >
            📋 Apply Template ({templates.length} available)
          </button>
        )}
        <button className="btn btn-primary" onClick={() => setEditingAssembly({} as Assembly)}>
          + Add Resource
        </button>
      </div>

      {showTemplateSelector && (
        <div className="template-selector">
          <h4>Select Template</h4>
          {templates.map(template => (
            <div 
              key={template.id}
              className={`template-option ${template.is_default ? 'default' : ''}`}
              onClick={() => handleApplyTemplate(template.id)}
            >
              <div className="template-name">
                {template.template_name}
                {template.is_default && <span className="badge badge-blue">Default</span>}
              </div>
              {template.template_description && (
                <div className="template-description">{template.template_description}</div>
              )}
              {template.source && (
                <div className="template-source">Source: {template.source}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
        </div>
      ) : assemblies.length === 0 ? (
        <div className="empty-assemblies">
          <p>No cost breakdown defined.</p>
          <p>Apply a template or add resources manually.</p>
        </div>
      ) : (
        <div className="assemblies-list">
          {['LABOR', 'EQUIPMENT', 'MATERIAL', 'SUBCONTRACTOR', 'OTHER'].map(type => {
            const typeAssemblies = assemblies.filter(a => a.resource_type === type);
            if (typeAssemblies.length === 0) return null;

            return (
              <div key={type} className="assembly-group">
                <h4 className="group-header">
                  {getResourceIcon(type)} {type}
                  <span className="group-subtotal">
                    ${typeAssemblies.reduce((sum, a) => 
                      sum + (a.quantity_per_unit * (1 + a.waste_percentage/100) * a.unit_cost * a.productivity_factor * lineItem.quantity), 0
                    ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </h4>
                {typeAssemblies.map(assembly => (
                  <div key={assembly.id} className="assembly-row">
                    <div className="assembly-info">
                      <span className="assembly-description">{assembly.resource_description}</span>
                      {assembly.wage_classification && (
                        <span className="wage-class">{assembly.wage_classification}</span>
                      )}
                      {assembly.is_ai_suggested && <span className="badge badge-purple">AI</span>}
                      {assembly.is_manually_adjusted && <span className="badge badge-yellow">Modified</span>}
                    </div>
                    <div className="assembly-values">
                      <span className="qty">
                        {assembly.quantity_per_unit} {assembly.quantity_uom || 'EA'}
                      </span>
                      <span className="rate">${assembly.unit_cost.toFixed(2)}</span>
                      {assembly.productivity_factor !== 1.0 && (
                        <span className="productivity">×{assembly.productivity_factor.toFixed(2)}</span>
                      )}
                      <span className="subtotal">
                        ${(assembly.quantity_per_unit * (1 + assembly.waste_percentage/100) * assembly.unit_cost * assembly.productivity_factor * lineItem.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="assembly-actions">
                      <button onClick={() => setEditingAssembly(assembly)} title="Edit">✏️</button>
                      <button onClick={() => handleDeleteAssembly(assembly.id)} title="Delete">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <div className="panel-footer">
        <div className="cost-summary">
          <div className="summary-row">
            <span>Unit Cost:</span>
            <span>${(calculateTotalCost() / lineItem.quantity).toFixed(2)} / {lineItem.unit}</span>
          </div>
          <div className="summary-row total">
            <span>Extended Total:</span>
            <span>${calculateTotalCost().toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Assembly Edit Modal */}
      {editingAssembly && (
        <AssemblyEditModal
          assembly={editingAssembly}
          onSave={(data) => {
            if (editingAssembly.id) {
              handleUpdateAssembly(editingAssembly.id, data);
            } else {
              handleAddAssembly(data);
            }
            setEditingAssembly(null);
          }}
          onClose={() => setEditingAssembly(null)}
        />
      )}
    </div>
  );
}

function AssemblyEditModal({ assembly, onSave, onClose }: any) {
  // Implement modal for editing assembly details
  return <div>TODO: Implement AssemblyEditModal</div>;
}
```

---

### Phase 3: AI Document Processing (Week 4-5)

**Objective:** Build Edge Functions for document ingestion and AI extraction.

#### Edge Function: Document Processing

**File:** `supabase/functions/bid-document-process/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.24.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProcessRequest {
  documentId: string;
  documentType: 'PROPOSAL' | 'PLANS' | 'ADDENDUM' | 'SPECIAL_PROVISIONS';
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { documentId, documentType } = await req.json() as ProcessRequest;

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Get document record
    const { data: document, error: docError } = await supabaseClient
      .from('bid_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error('Document not found');
    }

    // Update status to processing
    await supabaseClient
      .from('bid_documents')
      .update({ processing_status: 'PROCESSING' })
      .eq('id', documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from(document.storage_bucket)
      .download(document.file_path);

    if (downloadError) throw downloadError;

    // Convert to base64 for Claude
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });

    // Process with Claude based on document type
    let extractionPrompt = '';
    
    if (documentType === 'PROPOSAL') {
      extractionPrompt = `Analyze this WVDOH bid proposal document and extract the following structured data:

1. PROJECT METADATA:
   - Project Name
   - State Project Number
   - Federal Project Number (if any)
   - County
   - Route
   - Bid Date and Time
   - Pre-Bid Date (if specified)
   - Engineer's Estimate (if shown)
   - Contract Time (days)
   - Liquidated Damages per day
   - DBE Goal percentage
   - Wage Determination ID and Date

2. BID ITEMS (for each item):
   - Item Number
   - WVDOH Item Code
   - Description
   - Unit
   - Quantity
   - Any special notes or conditions

3. SPECIAL PROVISIONS:
   - List of SP numbers and their titles
   - Any non-standard requirements

4. RISKS IDENTIFIED:
   - Unusual quantities
   - Non-standard items
   - Tight completion schedule
   - Complex phasing requirements
   - Environmental constraints
   - Any red flags

Return the data as JSON with these keys:
{
  "project_metadata": {...},
  "bid_items": [...],
  "special_provisions": [...],
  "risks": [...],
  "confidence_notes": "..."
}`;
    }

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: extractionPrompt,
            },
          ],
        },
      ],
    });

    // Parse Claude's response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Claude response');
    }
    
    const extractedData = JSON.parse(jsonMatch[0]);

    // Update document with extraction data
    await supabaseClient
      .from('bid_documents')
      .update({
        processing_status: 'COMPLETED',
        processed_at: new Date().toISOString(),
        extraction_data: extractedData,
      })
      .eq('id', documentId);

    // If proposal, create line items
    if (documentType === 'PROPOSAL' && extractedData.bid_items) {
      const lineItems = extractedData.bid_items.map((item: any, index: number) => ({
        bid_project_id: document.bid_project_id,
        item_number: item.item_number || String(index + 1),
        wvdoh_item_code: item.item_code,
        description: item.description,
        unit: item.unit,
        quantity: parseFloat(item.quantity) || 0,
        is_ai_suggested: true,
        sort_order: index + 1,
      }));

      await supabaseClient
        .from('proposal_line_items')
        .insert(lineItems);

      // Update project metadata if extracted
      if (extractedData.project_metadata) {
        const pm = extractedData.project_metadata;
        await supabaseClient
          .from('bid_projects')
          .update({
            state_project_number: pm.state_project_number,
            federal_project_number: pm.federal_project_number,
            county: pm.county,
            route: pm.route,
            bid_due_date: pm.bid_date,
            pre_bid_date: pm.pre_bid_date,
            engineers_estimate: pm.engineers_estimate ? parseFloat(pm.engineers_estimate) : null,
            completion_days: pm.contract_time ? parseInt(pm.contract_time) : null,
            liquidated_damages_per_day: pm.liquidated_damages ? parseFloat(pm.liquidated_damages) : null,
            dbe_goal_percentage: pm.dbe_goal ? parseFloat(pm.dbe_goal) : null,
            wage_determination_id: pm.wage_determination_id,
            status: 'ANALYZING',
          })
          .eq('id', document.bid_project_id);
      }

      // Create risks if identified
      if (extractedData.risks && extractedData.risks.length > 0) {
        const risks = extractedData.risks.map((risk: any) => ({
          bid_project_id: document.bid_project_id,
          risk_category: risk.category || 'GENERAL',
          description: risk.description,
          source_document: document.file_name,
          severity: risk.severity || 'MEDIUM',
          is_ai_identified: true,
        }));

        await supabaseClient
          .from('bid_risks')
          .insert(risks);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        extractedItems: extractedData.bid_items?.length || 0,
        risksIdentified: extractedData.risks?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing document:", error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

### Phase 4: Integration & Polish (Week 5-6)

#### Update CreateBid Form

Add fields for all new columns in bid_projects:

```typescript
// Add to FormData interface
interface FormData {
  project_name: string;
  state_project_number: string;
  federal_project_number: string;
  owner: string;
  county: string;
  route: string;
  letting_date: string;
  bid_due_date: string;
  bid_time: string;
  pre_bid_date: string;
  project_description: string;
  completion_days: string;
  liquidated_damages_per_day: string;
  dbe_goal_percentage: string;
  engineers_estimate: string;
}
```

#### Add Indirect Costs Management

Create component for managing project indirect costs with standard categories.

#### Add Markup Configuration

Create component for overhead, profit, contingency layers with justification.

#### Implement Excel Import

Use SheetJS to parse uploaded Excel files containing line items from BidX or similar.

---

## TESTING CHECKLIST

### Database Tests

- [ ] All migrations run without error
- [ ] RLS policies correctly restrict access
- [ ] Functions calculate prices correctly
- [ ] Templates apply without data loss
- [ ] Cascade deletes work properly

### Frontend Tests

- [ ] Line items CRUD operations
- [ ] Assembly editor saves changes
- [ ] Template application works
- [ ] Totals calculate correctly
- [ ] Search/filter works

### AI Processing Tests

- [ ] PDF upload triggers processing
- [ ] Line items extracted correctly
- [ ] Metadata parsed accurately
- [ ] Risks identified appropriately
- [ ] Error handling graceful

### Integration Tests

- [ ] Dashboard metrics update after changes
- [ ] Document processing updates project status
- [ ] Final pricing calculation includes all components

---

## SUCCESS CRITERIA

The Bid Engine is complete when:

1. ✅ User can create new bid project with full WVDOH metadata
2. ✅ User can upload proposal PDF and have it auto-processed
3. ✅ AI extracts line items, metadata, and risks from PDF
4. ✅ User can manually add/edit/delete line items
5. ✅ User can apply assembly templates to line items
6. ✅ User can edit individual assembly lines (labor, equipment, materials)
7. ✅ System calculates unit prices from assemblies
8. ✅ User can configure indirect costs (PM, super, field office, etc.)
9. ✅ User can set markup layers (overhead, profit, contingency)
10. ✅ Mobilization calculated as percentage of subtotal
11. ✅ Final bid price calculated correctly
12. ✅ Dashboard shows accurate metrics
13. ✅ User can export bid to Excel
14. ✅ Bid outcome (WIN/LOST) can be recorded for AI learning

---

## FILES TO IMPLEMENT

### Migrations (Execute in Order)

1. `supabase/migrations/009_bidding_engine.sql` — Core schema
2. `supabase/migrations/009a_seed_wvdoh_master_items.sql` — WVDOH items
3. `supabase/migrations/009b_seed_assembly_templates.sql` — Templates
4. `supabase/migrations/009c_seed_cost_codes.sql` — Cost codes

### Frontend Components

1. `apps/web/src/components/bids/LineItemsTab.tsx` — Main line items view
2. `apps/web/src/components/bids/AssemblyEditorPanel.tsx` — Assembly editor
3. `apps/web/src/components/bids/LineItemModal.tsx` — Add/edit line item
4. `apps/web/src/components/bids/AssemblyEditModal.tsx` — Edit assembly line
5. `apps/web/src/components/bids/TemplateSelector.tsx` — Template picker
6. `apps/web/src/components/bids/IndirectCostsTab.tsx` — Indirect costs
7. `apps/web/src/components/bids/MarkupConfigTab.tsx` — Markup layers
8. `apps/web/src/components/bids/ExcelImport.tsx` — Import from Excel

### Edge Functions

1. `supabase/functions/bid-document-process/index.ts` — AI document extraction
2. `supabase/functions/calculate-bid-price/index.ts` — Price calculation RPC

### Styles

1. `apps/web/src/styles/bid-engine.css` — Bid module specific styles

---

## REFERENCE DOCUMENTS

| Document | Purpose |
|----------|---------|
| `AI_BID_INTELLIGENCE_STRATEGY_V3.md` | Complete schema specification |
| `AIBidPackageforWVDOHProjects.pdf` | User stories and requirements |
| `UNIFIED_PAY_ESTIMATE_SPEC_V7.md` | Related Pay Estimate module |
| `BID_TO_EXECUTION_INTEGRATION.md` | Handoff workflow spec |

---

*Hand this document to Claude Code with the instruction: "Implement the Triton Bid Engine following this specification. Start with the database migrations, then build the frontend components, then the Edge Functions."*
