-- ============================================================================
-- Migration 048: Bid Intelligence Platform
-- ============================================================================
-- Purpose: Create schema for AI-powered bid estimation, spec search,
--          addendum tracking, DBE calculations, and RFI management.
-- Dependencies: pgvector extension for semantic search
-- ============================================================================

-- Enable pgvector extension for semantic embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Bid status lifecycle
DO $$ BEGIN
    CREATE TYPE bid_status AS ENUM (
        'IDENTIFIED',       -- Potential bid opportunity
        'REVIEWING',        -- Under active review
        'ESTIMATING',       -- Preparing estimate
        'SUBMITTED',        -- Bid submitted
        'WON',             -- Contract awarded to us
        'LOST',            -- Contract awarded to competitor
        'NO_BID',          -- Decided not to bid
        'CANCELLED'        -- Bid was cancelled by owner
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Project owner types
DO $$ BEGIN
    CREATE TYPE project_owner_type AS ENUM (
        'WVDOH',           -- WV Dept of Highways
        'MUNICIPAL',       -- City/Town
        'COUNTY',          -- County government
        'FEDERAL',         -- Federal (FHWA, Corps, etc)
        'PRIVATE',         -- Private developer
        'UTILITY'          -- Utility company
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Addendum change types
DO $$ BEGIN
    CREATE TYPE addendum_change_type AS ENUM (
        'QUANTITY_INCREASE',
        'QUANTITY_DECREASE',
        'ITEM_ADDED',
        'ITEM_REMOVED',
        'SPEC_CHANGE',
        'DATE_CHANGE',
        'CLARIFICATION',
        'DRAWING_REVISION'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- RFI status
DO $$ BEGIN
    CREATE TYPE rfi_status AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'PENDING_RESPONSE',
        'ANSWERED',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- DBE certification types
DO $$ BEGIN
    CREATE TYPE dbe_certification_type AS ENUM (
        'DBE',             -- Disadvantaged Business Enterprise
        'MBE',             -- Minority Business Enterprise
        'WBE',             -- Women Business Enterprise
        'SDVOB',           -- Service-Disabled Veteran-Owned
        'SBE'              -- Small Business Enterprise
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- bid_projects: Main bid opportunity tracking
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bid_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Project identification
    project_number TEXT NOT NULL,
    project_name TEXT NOT NULL,
    description TEXT,

    -- Owner information
    owner_type project_owner_type NOT NULL DEFAULT 'WVDOH',
    owner_name TEXT,
    owner_contact TEXT,
    owner_phone TEXT,
    owner_email TEXT,

    -- WVDOH specific fields
    wvdoh_district INTEGER,
    wvdoh_county TEXT,
    federal_aid_number TEXT,
    state_project_number TEXT,

    -- Location
    location_description TEXT,
    latitude DECIMAL(10, 7),
    longitude DECIMAL(10, 7),

    -- Dates
    bid_date DATE NOT NULL,
    bid_time TIME,
    pre_bid_date DATE,
    pre_bid_mandatory BOOLEAN DEFAULT FALSE,
    estimated_start_date DATE,
    estimated_completion_date DATE,
    working_days INTEGER,

    -- Financials
    engineers_estimate DECIMAL(14, 2),
    our_estimate DECIMAL(14, 2),
    submitted_bid DECIMAL(14, 2),
    winning_bid DECIMAL(14, 2),

    -- DBE Requirements
    dbe_goal_percentage DECIMAL(5, 2) DEFAULT 0,
    dbe_committed_percentage DECIMAL(5, 2) DEFAULT 0,

    -- Status
    status bid_status NOT NULL DEFAULT 'IDENTIFIED',
    confidence_score INTEGER, -- 0-100 bid confidence

    -- Documents
    bid_documents_url TEXT,
    plans_url TEXT,
    specs_url TEXT,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_projects_org ON public.bid_projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_bid_projects_status ON public.bid_projects(status);
CREATE INDEX IF NOT EXISTS idx_bid_projects_bid_date ON public.bid_projects(bid_date);
CREATE INDEX IF NOT EXISTS idx_bid_projects_wvdoh ON public.bid_projects(wvdoh_district, wvdoh_county);

-- -----------------------------------------------------------------------------
-- bid_items: Schedule of items (quantities and prices)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bid_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Item identification
    item_number TEXT NOT NULL,
    spec_reference TEXT,           -- e.g., "601.10.01"
    description TEXT NOT NULL,

    -- Quantities
    unit TEXT NOT NULL,            -- e.g., "CY", "TON", "LF", "LS"
    original_quantity DECIMAL(12, 2) NOT NULL,
    current_quantity DECIMAL(12, 2) NOT NULL,

    -- Pricing
    unit_price DECIMAL(12, 4),
    extended_price DECIMAL(14, 2),

    -- Cost breakdown (internal)
    material_cost DECIMAL(12, 4),
    labor_cost DECIMAL(12, 4),
    equipment_cost DECIMAL(12, 4),
    subcontract_cost DECIMAL(12, 4),
    overhead_percentage DECIMAL(5, 2),
    profit_percentage DECIMAL(5, 2),

    -- DBE tracking
    is_dbe_candidate BOOLEAN DEFAULT FALSE,
    dbe_subcontractor_id UUID,

    -- Risk assessment
    risk_level TEXT CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    risk_notes TEXT,

    -- Metadata
    category TEXT,                 -- e.g., "Earthwork", "Paving", "Drainage"
    sort_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bid_items_project ON public.bid_items(project_id);
CREATE INDEX IF NOT EXISTS idx_bid_items_spec ON public.bid_items(spec_reference);
CREATE INDEX IF NOT EXISTS idx_bid_items_category ON public.bid_items(category);

-- -----------------------------------------------------------------------------
-- project_addenda: Addendum tracking with change history
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_addenda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Addendum info
    addendum_number INTEGER NOT NULL,
    issued_date DATE NOT NULL,
    received_date DATE,

    -- Summary
    title TEXT,
    summary TEXT,

    -- Document
    document_url TEXT,

    -- Impact assessment
    total_quantity_impact DECIMAL(14, 2),
    total_price_impact DECIMAL(14, 2),
    schedule_impact_days INTEGER,

    -- Review status
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(project_id, addendum_number)
);

CREATE INDEX IF NOT EXISTS idx_addenda_project ON public.project_addenda(project_id);

-- -----------------------------------------------------------------------------
-- addendum_changes: Individual changes within an addendum
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.addendum_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    addendum_id UUID NOT NULL REFERENCES public.project_addenda(id) ON DELETE CASCADE,
    bid_item_id UUID REFERENCES public.bid_items(id) ON DELETE SET NULL,

    -- Change details
    change_type addendum_change_type NOT NULL,
    description TEXT NOT NULL,

    -- For quantity changes
    original_value TEXT,
    new_value TEXT,

    -- Impact
    quantity_delta DECIMAL(12, 2),
    price_impact DECIMAL(14, 2),

    -- Reference
    plan_sheet TEXT,
    spec_section TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_addendum_changes_addendum ON public.addendum_changes(addendum_id);

-- -----------------------------------------------------------------------------
-- spec_embeddings: Vector embeddings for semantic spec search
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spec_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Source document
    document_type TEXT NOT NULL,   -- 'WVDOH_STANDARD', 'SPECIAL_PROVISION', 'PROJECT_SPEC'
    document_name TEXT NOT NULL,
    project_id UUID REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Content
    section_number TEXT,           -- e.g., "601.10"
    section_title TEXT,
    content TEXT NOT NULL,
    page_number INTEGER,

    -- Vector embedding (1536 dimensions for OpenAI ada-002)
    embedding vector(1536),

    -- Metadata
    keywords TEXT[],
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_spec_embeddings_vector ON public.spec_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_spec_embeddings_doc ON public.spec_embeddings(document_type, document_name);
CREATE INDEX IF NOT EXISTS idx_spec_embeddings_section ON public.spec_embeddings(section_number);

-- -----------------------------------------------------------------------------
-- haul_resources: Known plants, quarries, and disposal sites
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.haul_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Resource info
    name TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN (
        'ASPHALT_PLANT', 'CONCRETE_PLANT', 'QUARRY', 'AGGREGATE_SUPPLIER',
        'WASTE_DISPOSAL', 'BORROW_PIT', 'LAYDOWN_YARD', 'EQUIPMENT_YARD'
    )),

    -- Location
    address TEXT,
    city TEXT,
    county TEXT,
    state TEXT DEFAULT 'WV',
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,

    -- Contact
    contact_name TEXT,
    phone TEXT,
    email TEXT,

    -- Operational
    is_active BOOLEAN DEFAULT TRUE,
    is_wvdoh_approved BOOLEAN DEFAULT FALSE,
    approval_number TEXT,

    -- Capacity
    daily_capacity TEXT,
    operating_hours TEXT,

    -- Notes
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_haul_resources_type ON public.haul_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_haul_resources_location ON public.haul_resources(latitude, longitude);

-- -----------------------------------------------------------------------------
-- dbe_subcontractors: DBE/MBE/WBE certified subcontractors
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.dbe_subcontractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Company info
    company_name TEXT NOT NULL,
    dba_name TEXT,

    -- Certifications
    certification_types dbe_certification_type[] NOT NULL,
    certification_number TEXT,
    certification_expiry DATE,
    certifying_agency TEXT,

    -- Contact
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,

    -- Capabilities
    naics_codes TEXT[],
    work_categories TEXT[],        -- e.g., ['Guardrail', 'Flagging', 'Seeding']
    bonding_capacity DECIMAL(14, 2),

    -- Performance
    previous_projects INTEGER DEFAULT 0,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    notes TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_verified DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dbe_subs_org ON public.dbe_subcontractors(organization_id);
CREATE INDEX IF NOT EXISTS idx_dbe_subs_certs ON public.dbe_subcontractors USING GIN(certification_types);
CREATE INDEX IF NOT EXISTS idx_dbe_subs_categories ON public.dbe_subcontractors USING GIN(work_categories);

-- -----------------------------------------------------------------------------
-- bid_dbe_commitments: DBE commitments for a specific bid
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bid_dbe_commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,
    subcontractor_id UUID NOT NULL REFERENCES public.dbe_subcontractors(id) ON DELETE CASCADE,

    -- Work scope
    work_description TEXT NOT NULL,
    bid_item_ids UUID[],           -- Which bid items this covers

    -- Commitment
    committed_amount DECIMAL(14, 2) NOT NULL,
    certification_type dbe_certification_type NOT NULL,

    -- Status
    status TEXT DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED', 'COMMITTED', 'AWARDED', 'COMPLETED')),

    -- Documentation
    quote_received BOOLEAN DEFAULT FALSE,
    quote_amount DECIMAL(14, 2),
    quote_date DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dbe_commitments_project ON public.bid_dbe_commitments(project_id);

-- -----------------------------------------------------------------------------
-- project_rfis: Request for Information tracking
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_rfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- RFI identification
    rfi_number TEXT NOT NULL,
    subject TEXT NOT NULL,

    -- Content
    question TEXT NOT NULL,
    background TEXT,
    suggested_resolution TEXT,

    -- References
    plan_sheet_references TEXT[],
    spec_references TEXT[],
    bid_item_references TEXT[],

    -- AI-generated draft (stored for editing)
    ai_draft TEXT,

    -- Submission
    status rfi_status NOT NULL DEFAULT 'DRAFT',
    submitted_date DATE,
    submitted_to TEXT,
    submitted_by UUID REFERENCES auth.users(id),

    -- Response
    response TEXT,
    response_date DATE,
    responded_by TEXT,

    -- Impact
    cost_impact DECIMAL(14, 2),
    schedule_impact_days INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(project_id, rfi_number)
);

CREATE INDEX IF NOT EXISTS idx_rfis_project ON public.project_rfis(project_id);
CREATE INDEX IF NOT EXISTS idx_rfis_status ON public.project_rfis(status);

-- -----------------------------------------------------------------------------
-- bid_risks: Risk register for bid analysis
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bid_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Risk identification
    risk_category TEXT NOT NULL,   -- 'SCOPE', 'SCHEDULE', 'COST', 'TECHNICAL', 'RESOURCE'
    description TEXT NOT NULL,

    -- Assessment
    likelihood INTEGER CHECK (likelihood >= 1 AND likelihood <= 5),
    impact INTEGER CHECK (impact >= 1 AND impact <= 5),
    risk_score INTEGER GENERATED ALWAYS AS (likelihood * impact) STORED,

    -- Mitigation
    mitigation_strategy TEXT,
    contingency_amount DECIMAL(14, 2),

    -- Status
    status TEXT DEFAULT 'IDENTIFIED' CHECK (status IN ('IDENTIFIED', 'MITIGATED', 'ACCEPTED', 'TRANSFERRED')),
    owner TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bid_risks_project ON public.bid_risks(project_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to search specs using vector similarity
CREATE OR REPLACE FUNCTION search_specs(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 5,
    filter_doc_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_type TEXT,
    document_name TEXT,
    section_number TEXT,
    section_title TEXT,
    content TEXT,
    page_number INTEGER,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        se.id,
        se.document_type,
        se.document_name,
        se.section_number,
        se.section_title,
        se.content,
        se.page_number,
        1 - (se.embedding <=> query_embedding) as similarity
    FROM public.spec_embeddings se
    WHERE (filter_doc_type IS NULL OR se.document_type = filter_doc_type)
    AND 1 - (se.embedding <=> query_embedding) > match_threshold
    ORDER BY se.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to calculate DBE commitment total
CREATE OR REPLACE FUNCTION calculate_dbe_totals(p_project_id UUID)
RETURNS TABLE (
    total_committed DECIMAL(14, 2),
    dbe_count INTEGER,
    percentage_of_bid DECIMAL(5, 2)
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_bid_total DECIMAL(14, 2);
BEGIN
    -- Get the total bid amount
    SELECT COALESCE(our_estimate, engineers_estimate, 0) INTO v_bid_total
    FROM public.bid_projects WHERE id = p_project_id;

    RETURN QUERY
    SELECT
        COALESCE(SUM(committed_amount), 0)::DECIMAL(14, 2) as total_committed,
        COUNT(DISTINCT subcontractor_id)::INTEGER as dbe_count,
        CASE WHEN v_bid_total > 0
            THEN ROUND((COALESCE(SUM(committed_amount), 0) / v_bid_total * 100)::NUMERIC, 2)
            ELSE 0
        END::DECIMAL(5, 2) as percentage_of_bid
    FROM public.bid_dbe_commitments
    WHERE project_id = p_project_id
    AND status IN ('COMMITTED', 'AWARDED', 'COMPLETED');
END;
$$;

-- Function to get addendum impact summary
CREATE OR REPLACE FUNCTION get_addendum_impact(p_project_id UUID)
RETURNS TABLE (
    addendum_number INTEGER,
    issued_date DATE,
    quantity_changes INTEGER,
    spec_changes INTEGER,
    total_price_impact DECIMAL(14, 2)
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        pa.addendum_number,
        pa.issued_date,
        COUNT(CASE WHEN ac.change_type IN ('QUANTITY_INCREASE', 'QUANTITY_DECREASE') THEN 1 END)::INTEGER as quantity_changes,
        COUNT(CASE WHEN ac.change_type = 'SPEC_CHANGE' THEN 1 END)::INTEGER as spec_changes,
        COALESCE(SUM(ac.price_impact), 0)::DECIMAL(14, 2) as total_price_impact
    FROM public.project_addenda pa
    LEFT JOIN public.addendum_changes ac ON ac.addendum_id = pa.id
    WHERE pa.project_id = p_project_id
    GROUP BY pa.id, pa.addendum_number, pa.issued_date
    ORDER BY pa.addendum_number;
END;
$$;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.bid_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_addenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addendum_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spec_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haul_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dbe_subcontractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_dbe_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_risks ENABLE ROW LEVEL SECURITY;

-- Policies for bid_projects
CREATE POLICY "Users can view their org bid projects"
    ON public.bid_projects FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can create bid projects in their org"
    ON public.bid_projects FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "Users can update their org bid projects"
    ON public.bid_projects FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Similar policies for other tables (simplified for brevity)
CREATE POLICY "bid_items_select" ON public.bid_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.bid_projects bp WHERE bp.id = project_id
           AND bp.organization_id = public.get_user_organization_id(auth.uid())));

CREATE POLICY "bid_items_insert" ON public.bid_items FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.bid_projects bp WHERE bp.id = project_id
           AND bp.organization_id = public.get_user_organization_id(auth.uid())));

CREATE POLICY "bid_items_update" ON public.bid_items FOR UPDATE
    USING (EXISTS (SELECT 1 FROM public.bid_projects bp WHERE bp.id = project_id
           AND bp.organization_id = public.get_user_organization_id(auth.uid())));

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
CREATE TRIGGER bid_projects_updated_at
    BEFORE UPDATE ON public.bid_projects
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER bid_items_updated_at
    BEFORE UPDATE ON public.bid_items
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER project_addenda_updated_at
    BEFORE UPDATE ON public.project_addenda
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER dbe_subcontractors_updated_at
    BEFORE UPDATE ON public.dbe_subcontractors
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER bid_dbe_commitments_updated_at
    BEFORE UPDATE ON public.bid_dbe_commitments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER project_rfis_updated_at
    BEFORE UPDATE ON public.project_rfis
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- SEED DATA: Common haul resources in WV
-- ============================================================================

INSERT INTO public.haul_resources (name, resource_type, city, county, state, latitude, longitude, is_wvdoh_approved) VALUES
-- Asphalt Plants
('West Virginia Paving - Charleston', 'ASPHALT_PLANT', 'Charleston', 'Kanawha', 'WV', 38.3498, -81.6326, true),
('Greer Industries - Morgantown', 'ASPHALT_PLANT', 'Morgantown', 'Monongalia', 'WV', 39.6295, -79.9559, true),
('Tri-State Asphalt - Huntington', 'ASPHALT_PLANT', 'Huntington', 'Cabell', 'WV', 38.4192, -82.4452, true),
('Kelly Paving - Parkersburg', 'ASPHALT_PLANT', 'Parkersburg', 'Wood', 'WV', 39.2667, -81.5615, true),

-- Concrete Plants
('Redi-Mix Concrete - Charleston', 'CONCRETE_PLANT', 'Charleston', 'Kanawha', 'WV', 38.3519, -81.6295, true),
('Martin Marietta - Morgantown', 'CONCRETE_PLANT', 'Morgantown', 'Monongalia', 'WV', 39.6350, -79.9545, true),
('Bluegrass Materials - Huntington', 'CONCRETE_PLANT', 'Huntington', 'Cabell', 'WV', 38.4112, -82.4358, true),

-- Quarries
('Greer Limestone - Morgantown', 'QUARRY', 'Morgantown', 'Monongalia', 'WV', 39.6412, -79.9234, true),
('Martin Marietta Aggregates - Charleston', 'QUARRY', 'Charleston', 'Kanawha', 'WV', 38.3612, -81.5987, true),

-- Waste Disposal
('WV Solid Waste - Charleston', 'WASTE_DISPOSAL', 'Charleston', 'Kanawha', 'WV', 38.3234, -81.6512, true),
('Meadowfill Landfill - Bridgeport', 'WASTE_DISPOSAL', 'Bridgeport', 'Harrison', 'WV', 39.2867, -80.2545, true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SEED DATA: Sample DBE Subcontractors
-- ============================================================================

INSERT INTO public.dbe_subcontractors (
    company_name, certification_types, city, state, work_categories, is_active
) VALUES
('Mountain State Guardrail LLC', ARRAY['DBE']::dbe_certification_type[], 'Charleston', 'WV',
 ARRAY['Guardrail', 'Fencing', 'Safety Barriers'], true),
('Valley Traffic Services', ARRAY['DBE', 'WBE']::dbe_certification_type[], 'Huntington', 'WV',
 ARRAY['Flagging', 'Traffic Control', 'Signage'], true),
('Green Hills Landscaping', ARRAY['DBE', 'MBE']::dbe_certification_type[], 'Morgantown', 'WV',
 ARRAY['Seeding', 'Erosion Control', 'Landscaping'], true),
('Appalachian Striping Co', ARRAY['DBE']::dbe_certification_type[], 'Parkersburg', 'WV',
 ARRAY['Pavement Marking', 'Striping'], true),
('Coal Country Concrete', ARRAY['DBE', 'SDVOB']::dbe_certification_type[], 'Beckley', 'WV',
 ARRAY['Concrete Flatwork', 'Curb & Gutter', 'Sidewalks'], true),
('Mountaineer Electric', ARRAY['DBE', 'MBE']::dbe_certification_type[], 'Fairmont', 'WV',
 ARRAY['Electrical', 'Lighting', 'Signal Installation'], true),
('River City Hauling', ARRAY['DBE', 'WBE']::dbe_certification_type[], 'Wheeling', 'WV',
 ARRAY['Trucking', 'Material Hauling'], true)
ON CONFLICT DO NOTHING;
