-- ============================================================================
-- MIGRATION 010: BID PACKAGE CORE
-- Triton AI Bid Package Engine - Foundation Tables
-- ============================================================================

-- ============================================================================
-- ENUM DEFINITIONS
-- ============================================================================

-- Bid Status (workflow states)
DO $$ BEGIN
    CREATE TYPE bid_status_enum AS ENUM (
        'IDENTIFIED',
        'REVIEWING',
        'ANALYZING',
        'READY_FOR_REVIEW',
        'IN_REVIEW',
        'APPROVED',
        'ESTIMATING',
        'SUBMITTED',
        'WON',
        'LOST',
        'NO_BID',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Document Types
DO $$ BEGIN
    CREATE TYPE document_type_enum AS ENUM (
        'PROPOSAL',
        'BIDX',
        'PLANS',
        'EXISTING_PLANS',
        'SPECIAL_PROVISIONS',
        'ENVIRONMENTAL',
        'ASBESTOS',
        'HAZMAT',
        'GEOTECHNICAL',
        'TRAFFIC_STUDY',
        'ADDENDUM',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Processing Status
DO $$ BEGIN
    CREATE TYPE processing_status_enum AS ENUM (
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'NEEDS_OCR',
        'PARTIAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Risk Categories
DO $$ BEGIN
    CREATE TYPE risk_category_enum AS ENUM (
        'SCOPE',
        'QUANTITY',
        'SITE_CONDITIONS',
        'ENVIRONMENTAL',
        'MOT',
        'SCHEDULE',
        'REGULATORY',
        'SUBCONTRACTOR',
        'MATERIAL',
        'OWNER',
        'COMPETITIVE',
        'WEATHER',
        'HAZMAT',
        'CONSTRUCTABILITY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Severity Levels
DO $$ BEGIN
    CREATE TYPE severity_enum AS ENUM (
        'LOW',
        'MEDIUM',
        'HIGH',
        'CRITICAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Opportunity Types
DO $$ BEGIN
    CREATE TYPE opportunity_type_enum AS ENUM (
        'VALUE_ENGINEERING',
        'MEANS_METHODS',
        'QUANTITY_UPSIDE',
        'EARLY_COMPLETION',
        'MATERIAL_SUBSTITUTION',
        'EQUIPMENT_EFFICIENCY',
        'CREW_OPTIMIZATION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Work Categories
DO $$ BEGIN
    CREATE TYPE work_category_enum AS ENUM (
        'MOBILIZATION',
        'DEMOLITION',
        'EARTHWORK',
        'DRAINAGE',
        'SUBSTRUCTURE',
        'SUPERSTRUCTURE',
        'DECK',
        'APPROACH_SLABS',
        'PAVEMENT',
        'GUARDRAIL_BARRIER',
        'SIGNING_STRIPING',
        'MOT',
        'ENVIRONMENTAL',
        'UTILITIES',
        'LANDSCAPING',
        'GENERAL_CONDITIONS',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Price Source Attribution
DO $$ BEGIN
    CREATE TYPE price_source_enum AS ENUM (
        'AI_GENERATED',
        'AI_APPROVED',
        'AI_MODIFIED',
        'SUBCONTRACT_QUOTE',
        'HISTORICAL',
        'MANUAL_ESTIMATOR',
        'RS_MEANS',
        'VENDOR_QUOTE'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Question Status
DO $$ BEGIN
    CREATE TYPE question_status_enum AS ENUM (
        'AI_SUGGESTED',
        'APPROVED',
        'MODIFIED',
        'DISCARDED',
        'SUBMITTED',
        'ANSWERED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Complexity Level
DO $$ BEGIN
    CREATE TYPE complexity_enum AS ENUM (
        'LOW',
        'MEDIUM',
        'HIGH',
        'EXTREME'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- BID_PROJECTS TABLE
-- Master record for each bid opportunity
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization (multi-tenant)
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Project Identification
    project_name TEXT NOT NULL,
    state_project_number TEXT,
    federal_project_number TEXT,
    contract_id TEXT,

    -- Location
    county TEXT,
    route TEXT,
    location_description TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),

    -- Owner Information
    owner TEXT DEFAULT 'WVDOH',
    owner_contact TEXT,
    owner_email TEXT,
    owner_phone TEXT,

    -- Contract Details (Extracted)
    contract_time_days INTEGER,
    contract_time_type TEXT,
    completion_date DATE,
    liquidated_damages_per_day NUMERIC(12, 2),
    dbe_goal_percentage NUMERIC(5, 2),
    is_federal_aid BOOLEAN DEFAULT FALSE,

    -- Dates
    letting_date DATE,
    prebid_meeting_date TIMESTAMPTZ,
    question_deadline TIMESTAMPTZ,
    bid_due_date TIMESTAMPTZ,

    -- AI-Generated Complexity Tags
    traffic_control_complexity complexity_enum,
    traffic_control_complexity_reason TEXT,
    environmental_sensitivity complexity_enum,
    environmental_sensitivity_reason TEXT,
    overall_complexity complexity_enum,

    -- Status & Workflow
    status bid_status_enum DEFAULT 'IDENTIFIED',
    assigned_estimator_id UUID REFERENCES public.user_profiles(id),
    assigned_pm_id UUID REFERENCES public.user_profiles(id),

    -- AI Analysis State
    ai_analysis_started_at TIMESTAMPTZ,
    ai_analysis_completed_at TIMESTAMPTZ,
    ai_analysis_version TEXT,

    -- Outcome (for learning)
    bid_amount NUMERIC(14, 2),
    winning_bid_amount NUMERIC(14, 2),
    winner_name TEXT,
    engineers_estimate NUMERIC(14, 2),

    -- Linked Active Project (if won)
    active_project_id UUID REFERENCES public.projects(id),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.user_profiles(id),

    CONSTRAINT unique_bid_project_number UNIQUE (organization_id, state_project_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_projects_org ON public.bid_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_bid_projects_status ON public.bid_projects(status);
CREATE INDEX IF NOT EXISTS idx_bid_projects_letting ON public.bid_projects(letting_date);
CREATE INDEX IF NOT EXISTS idx_bid_projects_estimator ON public.bid_projects(assigned_estimator_id);

-- Enable RLS
ALTER TABLE public.bid_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users see own org bid projects" ON public.bid_projects;
CREATE POLICY "Users see own org bid projects" ON public.bid_projects
    FOR SELECT USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

DROP POLICY IF EXISTS "Users create in own org bid projects" ON public.bid_projects;
CREATE POLICY "Users create in own org bid projects" ON public.bid_projects
    FOR INSERT WITH CHECK (
        organization_id = public.get_user_organization_id(auth.uid())
    );

DROP POLICY IF EXISTS "Users update own org bid projects" ON public.bid_projects;
CREATE POLICY "Users update own org bid projects" ON public.bid_projects
    FOR UPDATE USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

DROP POLICY IF EXISTS "Users delete own org bid projects" ON public.bid_projects;
CREATE POLICY "Users delete own org bid projects" ON public.bid_projects
    FOR DELETE USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_projects_updated_at ON public.bid_projects;
CREATE TRIGGER bid_projects_updated_at
    BEFORE UPDATE ON public.bid_projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- BID_DOCUMENTS TABLE
-- Track all uploaded documents for a bid
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- File Information
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type TEXT,
    document_type document_type_enum NOT NULL,

    -- Processing State
    processing_status processing_status_enum DEFAULT 'PENDING',
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_error TEXT,

    -- Extraction Results
    page_count INTEGER,
    extracted_text_path TEXT,
    is_ocr_required BOOLEAN DEFAULT FALSE,
    ocr_confidence NUMERIC(5, 2),

    -- Document Metadata (extracted)
    document_date DATE,
    document_title TEXT,
    document_author TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),

    CONSTRAINT unique_file_per_bid_project UNIQUE (bid_project_id, file_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_documents_project ON public.bid_documents(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_documents_type ON public.bid_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_bid_documents_status ON public.bid_documents(processing_status);

-- Enable RLS
ALTER TABLE public.bid_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid project documents" ON public.bid_documents;
CREATE POLICY "Users see bid project documents" ON public.bid_documents
    FOR SELECT USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users insert bid project documents" ON public.bid_documents;
CREATE POLICY "Users insert bid project documents" ON public.bid_documents
    FOR INSERT WITH CHECK (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users update bid project documents" ON public.bid_documents;
CREATE POLICY "Users update bid project documents" ON public.bid_documents
    FOR UPDATE USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users delete bid project documents" ON public.bid_documents;
CREATE POLICY "Users delete bid project documents" ON public.bid_documents
    FOR DELETE USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- PROJECT_CONDITIONS TABLE
-- Structured project context flags for AI analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_project_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Site Conditions
    in_floodplain BOOLEAN DEFAULT FALSE,
    floodplain_notes TEXT,

    steep_terrain BOOLEAN DEFAULT FALSE,
    terrain_notes TEXT,

    limited_access BOOLEAN DEFAULT FALSE,
    access_notes TEXT,

    urban_area BOOLEAN DEFAULT FALSE,
    urban_notes TEXT,

    -- Work Restrictions
    night_work_required BOOLEAN DEFAULT FALSE,
    night_work_notes TEXT,

    weekend_work_restricted BOOLEAN DEFAULT FALSE,
    weekend_notes TEXT,

    seasonal_restrictions BOOLEAN DEFAULT FALSE,
    seasonal_restriction_start DATE,
    seasonal_restriction_end DATE,
    seasonal_notes TEXT,

    in_water_work BOOLEAN DEFAULT FALSE,
    in_water_work_window_start DATE,
    in_water_work_window_end DATE,
    in_water_notes TEXT,

    -- Traffic
    traffic_regime TEXT,
    aadt INTEGER,
    detour_required BOOLEAN DEFAULT FALSE,
    detour_length_miles NUMERIC(5, 1),

    -- Environmental
    wetlands_present BOOLEAN DEFAULT FALSE,
    endangered_species BOOLEAN DEFAULT FALSE,
    cultural_resources BOOLEAN DEFAULT FALSE,
    environmental_notes TEXT,

    -- Utilities
    utility_relocations_required BOOLEAN DEFAULT FALSE,
    utility_companies TEXT[],
    utility_notes TEXT,

    -- Railroad
    railroad_involvement BOOLEAN DEFAULT FALSE,
    railroad_company TEXT,
    railroad_notes TEXT,

    -- Source References
    source_document_id UUID REFERENCES public.bid_documents(id),
    source_page_numbers TEXT,

    -- AI Confidence
    ai_confidence_score NUMERIC(5, 2),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT one_conditions_per_bid_project UNIQUE (bid_project_id)
);

-- Enable RLS
ALTER TABLE public.bid_project_conditions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid project conditions" ON public.bid_project_conditions;
CREATE POLICY "Users see bid project conditions" ON public.bid_project_conditions
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_project_conditions_updated_at ON public.bid_project_conditions;
CREATE TRIGGER bid_project_conditions_updated_at
    BEFORE UPDATE ON public.bid_project_conditions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- BRIDGE_STRUCTURES TABLE
-- Model individual structures within a contract
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_bridge_structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Structure Identification
    structure_number TEXT,
    structure_name TEXT NOT NULL,
    structure_type TEXT,

    -- Location
    route TEXT,
    milepost NUMERIC(8, 3),
    feature_crossed TEXT,

    -- Dimensions
    length_feet NUMERIC(10, 2),
    width_feet NUMERIC(10, 2),
    deck_area_sf NUMERIC(12, 2),
    number_of_spans INTEGER,

    -- Structure Details
    superstructure_type TEXT,
    substructure_type TEXT,
    foundation_type TEXT,
    deck_type TEXT,

    -- Condition (if rehabilitation)
    existing_condition_rating NUMERIC(3, 1),
    is_new_construction BOOLEAN DEFAULT TRUE,
    is_rehabilitation BOOLEAN DEFAULT FALSE,
    is_replacement BOOLEAN DEFAULT FALSE,

    -- Phasing
    construction_sequence INTEGER,

    -- Source
    source_document_id UUID REFERENCES public.bid_documents(id),
    source_page_numbers TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_bridge_structures_project ON public.bid_bridge_structures(bid_project_id);

-- Enable RLS
ALTER TABLE public.bid_bridge_structures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid bridge structures" ON public.bid_bridge_structures;
CREATE POLICY "Users see bid bridge structures" ON public.bid_bridge_structures
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_bridge_structures_updated_at ON public.bid_bridge_structures;
CREATE TRIGGER bid_bridge_structures_updated_at
    BEFORE UPDATE ON public.bid_bridge_structures
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- BID_LINE_ITEMS TABLE
-- Individual bid items extracted from Bidx/proposal
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Item Identification
    line_number INTEGER NOT NULL,
    item_number TEXT NOT NULL,
    alt_item_number TEXT,

    -- Description
    description TEXT NOT NULL,
    short_description TEXT,

    -- Quantities
    quantity NUMERIC(18, 4) NOT NULL,
    unit TEXT NOT NULL,

    -- AI-Generated Categorization
    work_category work_category_enum,
    structure_or_area TEXT,

    -- AI-Generated Risk Assessment
    risk_level severity_enum,
    risk_explanation TEXT,

    -- AI-Generated Opportunity Flags
    opportunity_flag opportunity_type_enum,
    opportunity_explanation TEXT,

    -- Governing Documents (AI-extracted)
    governing_spec_sections TEXT[],
    governing_plan_sheets TEXT[],
    governing_special_provisions TEXT[],

    -- Dependencies
    depends_on_items TEXT[],
    required_by_items TEXT[],

    -- Link to Structure (if applicable)
    structure_id UUID REFERENCES public.bid_bridge_structures(id),

    -- Calculation Method (for special items like Mobilization)
    calculation_method TEXT,
    calculation_percentage NUMERIC(5, 2),

    -- Price Source Attribution
    price_source price_source_enum DEFAULT 'AI_GENERATED',

    -- AI Confidence
    ai_confidence_score NUMERIC(5, 2),
    ai_categorization_confidence NUMERIC(5, 2),

    -- Human Override Tracking
    category_overridden BOOLEAN DEFAULT FALSE,
    original_ai_category work_category_enum,
    override_reason TEXT,
    overridden_by UUID REFERENCES public.user_profiles(id),
    overridden_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_line_per_bid_project UNIQUE (bid_project_id, line_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_line_items_project ON public.bid_line_items(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_line_items_category ON public.bid_line_items(work_category);
CREATE INDEX IF NOT EXISTS idx_bid_line_items_structure ON public.bid_line_items(structure_id);
CREATE INDEX IF NOT EXISTS idx_bid_line_items_risk ON public.bid_line_items(risk_level);
CREATE INDEX IF NOT EXISTS idx_bid_line_items_item_number ON public.bid_line_items(item_number);

-- Enable RLS
ALTER TABLE public.bid_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid line items" ON public.bid_line_items;
CREATE POLICY "Users see bid line items" ON public.bid_line_items
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_line_items_updated_at ON public.bid_line_items;
CREATE TRIGGER bid_line_items_updated_at
    BEFORE UPDATE ON public.bid_line_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ITEM_DOCUMENT_REFS TABLE
-- Detailed document references for each line item
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_item_document_refs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,

    -- Reference Details
    document_id UUID NOT NULL REFERENCES public.bid_documents(id),
    document_type document_type_enum NOT NULL,

    -- Location within Document
    page_numbers TEXT,
    sheet_numbers TEXT,
    section_reference TEXT,

    -- Reference Type
    reference_type TEXT,

    -- AI Extraction Info
    ai_extracted BOOLEAN DEFAULT TRUE,
    ai_confidence NUMERIC(5, 2),

    -- Human Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES public.user_profiles(id),
    verified_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_doc_refs_line_item ON public.bid_item_document_refs(line_item_id);
CREATE INDEX IF NOT EXISTS idx_bid_doc_refs_document ON public.bid_item_document_refs(document_id);

-- Enable RLS
ALTER TABLE public.bid_item_document_refs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid item document refs" ON public.bid_item_document_refs;
CREATE POLICY "Users see bid item document refs" ON public.bid_item_document_refs
    FOR ALL USING (
        line_item_id IN (
            SELECT bli.id FROM public.bid_line_items bli
            JOIN public.bid_projects bp ON bli.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- HELPER VIEW: v_bid_projects_summary
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_projects_summary AS
SELECT
    bp.id,
    bp.organization_id,
    bp.project_name,
    bp.state_project_number,
    bp.county,
    bp.route,
    bp.letting_date,
    bp.bid_due_date,
    bp.status,
    bp.overall_complexity,
    bp.assigned_estimator_id,
    up_est.first_name || ' ' || up_est.last_name AS estimator_name,
    bp.assigned_pm_id,
    up_pm.first_name || ' ' || up_pm.last_name AS pm_name,
    bp.dbe_goal_percentage,
    bp.contract_time_days,
    bp.liquidated_damages_per_day,
    bp.ai_analysis_completed_at,
    (SELECT COUNT(*) FROM public.bid_documents bd WHERE bd.bid_project_id = bp.id) AS document_count,
    (SELECT COUNT(*) FROM public.bid_line_items bli WHERE bli.bid_project_id = bp.id) AS line_item_count,
    bp.created_at,
    bp.updated_at
FROM public.bid_projects bp
LEFT JOIN public.user_profiles up_est ON bp.assigned_estimator_id = up_est.id
LEFT JOIN public.user_profiles up_pm ON bp.assigned_pm_id = up_pm.id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.bid_projects IS 'Master table for bid opportunities in the AI Bid Package Engine';
COMMENT ON TABLE public.bid_documents IS 'Documents uploaded for bid analysis (PDFs, Bidx files, etc.)';
COMMENT ON TABLE public.bid_project_conditions IS 'Site conditions and constraints extracted from bid documents';
COMMENT ON TABLE public.bid_bridge_structures IS 'Individual bridge/structure details within a bid project';
COMMENT ON TABLE public.bid_line_items IS 'Line items extracted from Bidx files with AI categorization';
COMMENT ON TABLE public.bid_item_document_refs IS 'Links line items to their source documents and locations';
