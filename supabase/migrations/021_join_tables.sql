-- ============================================================================
-- MIGRATION 021: V4.1 ADDENDUM - JOIN TABLES
-- Triton AI Bid Package Engine - Many-to-many relationship tables
-- ============================================================================

-- ============================================================================
-- TABLE: bid_environmental_commitment_items
-- Purpose: Link environmental commitments to pay items (or mark as "unpaid")
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_environmental_commitment_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    environmental_commitment_id UUID NOT NULL REFERENCES public.bid_environmental_commitments(id) ON DELETE CASCADE,
    line_item_id UUID REFERENCES public.bid_line_items(id) ON DELETE CASCADE,  -- NULL = unpaid obligation

    -- Relationship Details
    relationship_type TEXT,              -- 'PAID_BY', 'RELATED_TO', 'TRIGGERED_BY'
    coverage_assessment TEXT,            -- 'FULLY_COVERED', 'PARTIALLY_COVERED', 'NOT_COVERED'

    -- Cost Attribution
    allocated_cost NUMERIC(12, 2),       -- Portion of item cost for this commitment
    allocation_notes TEXT,

    -- AI Attribution
    ai_linked BOOLEAN DEFAULT FALSE,
    ai_confidence NUMERIC(5, 2),
    ai_reasoning TEXT,

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),

    CONSTRAINT unique_env_item UNIQUE (environmental_commitment_id, line_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_env_items_commitment ON public.bid_environmental_commitment_items(environmental_commitment_id);
CREATE INDEX IF NOT EXISTS idx_env_items_line ON public.bid_environmental_commitment_items(line_item_id);
CREATE INDEX IF NOT EXISTS idx_env_items_unpaid ON public.bid_environmental_commitment_items(environmental_commitment_id) WHERE line_item_id IS NULL;

-- Enable RLS
ALTER TABLE public.bid_environmental_commitment_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see env commitment items" ON public.bid_environmental_commitment_items;
CREATE POLICY "Users see env commitment items" ON public.bid_environmental_commitment_items
    FOR ALL USING (
        environmental_commitment_id IN (
            SELECT bec.id FROM public.bid_environmental_commitments bec
            JOIN public.bid_projects bp ON bec.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- TABLE: bid_prebid_question_items
-- Purpose: Link pre-bid questions to affected pay items
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_prebid_question_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    prebid_question_id UUID NOT NULL REFERENCES public.bid_prebid_questions(id) ON DELETE CASCADE,
    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,

    -- Relationship
    impact_type TEXT,                    -- 'QUANTITY_IMPACT', 'PRICE_IMPACT', 'SCOPE_CLARIFICATION', 'SPECIFICATION'
    impact_description TEXT,             -- How the answer affects this item
    potential_cost_impact NUMERIC(12, 2),

    -- AI Attribution
    ai_linked BOOLEAN DEFAULT FALSE,
    ai_confidence NUMERIC(5, 2),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),

    CONSTRAINT unique_question_item UNIQUE (prebid_question_id, line_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_question_items_question ON public.bid_prebid_question_items(prebid_question_id);
CREATE INDEX IF NOT EXISTS idx_question_items_item ON public.bid_prebid_question_items(line_item_id);

-- Enable RLS
ALTER TABLE public.bid_prebid_question_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see prebid question items" ON public.bid_prebid_question_items;
CREATE POLICY "Users see prebid question items" ON public.bid_prebid_question_items
    FOR ALL USING (
        prebid_question_id IN (
            SELECT bpq.id FROM public.bid_prebid_questions bpq
            JOIN public.bid_projects bp ON bpq.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- TABLE: bid_structure_items
-- Purpose: Formal many-to-many between structures and line items
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_structure_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    structure_id UUID NOT NULL REFERENCES public.bid_bridge_structures(id) ON DELETE CASCADE,
    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,

    -- Assignment Source
    assignment_source TEXT,              -- 'AI_EXTRACTED', 'MANUAL', 'IMPORTED', 'BIDX_PARSED'
    ai_confidence NUMERIC(5, 2),
    ai_reasoning TEXT,

    -- Quantity Allocation (for items split across structures)
    allocated_quantity NUMERIC(18, 4),   -- Portion of item qty for this structure
    allocation_percentage NUMERIC(5, 2), -- % of total item
    allocation_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),

    CONSTRAINT unique_structure_item UNIQUE (structure_id, line_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_structure_items_structure ON public.bid_structure_items(structure_id);
CREATE INDEX IF NOT EXISTS idx_structure_items_item ON public.bid_structure_items(line_item_id);

-- Enable RLS
ALTER TABLE public.bid_structure_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see structure items" ON public.bid_structure_items;
CREATE POLICY "Users see structure items" ON public.bid_structure_items
    FOR ALL USING (
        structure_id IN (
            SELECT bbs.id FROM public.bid_bridge_structures bbs
            JOIN public.bid_projects bp ON bbs.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- TABLE: bid_hazmat_items
-- Purpose: Link hazmat findings to pay items
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_hazmat_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    hazmat_finding_id UUID NOT NULL REFERENCES public.bid_hazmat_findings(id) ON DELETE CASCADE,
    line_item_id UUID REFERENCES public.bid_line_items(id) ON DELETE CASCADE,  -- NULL = not covered by bid item

    -- Relationship
    relationship_type TEXT,              -- 'ABATEMENT_ITEM', 'DISPOSAL_ITEM', 'RELATED_WORK'
    coverage_assessment TEXT,            -- 'FULLY_COVERED', 'PARTIALLY_COVERED', 'NOT_COVERED'

    -- Cost Attribution
    allocated_cost NUMERIC(12, 2),
    allocation_notes TEXT,

    -- AI Attribution
    ai_linked BOOLEAN DEFAULT FALSE,
    ai_confidence NUMERIC(5, 2),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),

    CONSTRAINT unique_hazmat_item UNIQUE (hazmat_finding_id, line_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hazmat_items_finding ON public.bid_hazmat_items(hazmat_finding_id);
CREATE INDEX IF NOT EXISTS idx_hazmat_items_line ON public.bid_hazmat_items(line_item_id);

-- Enable RLS
ALTER TABLE public.bid_hazmat_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see hazmat items" ON public.bid_hazmat_items;
CREATE POLICY "Users see hazmat items" ON public.bid_hazmat_items
    FOR ALL USING (
        hazmat_finding_id IN (
            SELECT bhf.id FROM public.bid_hazmat_findings bhf
            JOIN public.bid_projects bp ON bhf.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- UPDATE VIEW: Environmental summary with coverage info
-- Must DROP first because we're adding new columns
-- ============================================================================
DROP VIEW IF EXISTS public.v_bid_environmental_summary;
CREATE VIEW public.v_bid_environmental_summary AS
SELECT
    bp.id AS bid_project_id,
    bp.project_name,
    -- Environmental Commitments Summary
    COUNT(DISTINCT bec.id) AS total_commitments,
    COUNT(DISTINCT CASE WHEN bec.commitment_type = 'PERMIT' THEN bec.id END) AS permit_count,
    COUNT(DISTINCT CASE WHEN bec.commitment_type = 'WORK_WINDOW' THEN bec.id END) AS work_window_count,
    COUNT(DISTINCT CASE WHEN bec.has_cost_impact THEN bec.id END) AS cost_impacting_commitments,
    COUNT(DISTINCT CASE WHEN bec.has_schedule_impact THEN bec.id END) AS schedule_impacting_commitments,
    SUM(COALESCE(bec.estimated_cost_impact, 0)) AS total_env_cost_impact,
    MAX(bec.estimated_schedule_impact_days) AS max_schedule_impact_days,
    -- Coverage Analysis
    COUNT(DISTINCT beci.id) AS linked_item_count,
    COUNT(DISTINCT CASE WHEN beci.line_item_id IS NULL THEN beci.id END) AS unpaid_commitment_count,
    COUNT(DISTINCT CASE WHEN beci.coverage_assessment = 'NOT_COVERED' THEN beci.id END) AS not_covered_count,
    -- Hazmat Summary
    COUNT(DISTINCT bhf.id) AS total_hazmat_findings,
    COUNT(DISTINCT CASE WHEN bhf.hazmat_type = 'ASBESTOS' THEN bhf.id END) AS asbestos_findings,
    COUNT(DISTINCT CASE WHEN bhf.hazmat_type = 'LEAD' THEN bhf.id END) AS lead_findings,
    COUNT(DISTINCT CASE WHEN bhf.test_result = 'POSITIVE' THEN bhf.id END) AS positive_findings,
    COUNT(DISTINCT CASE WHEN bhf.requires_licensed_contractor THEN bhf.id END) AS licensed_contractor_required,
    SUM(COALESCE(bhf.estimated_abatement_cost, 0)) AS total_hazmat_cost
FROM public.bid_projects bp
LEFT JOIN public.bid_environmental_commitments bec ON bp.id = bec.bid_project_id
LEFT JOIN public.bid_environmental_commitment_items beci ON bec.id = beci.environmental_commitment_id
LEFT JOIN public.bid_hazmat_findings bhf ON bp.id = bhf.bid_project_id
GROUP BY bp.id, bp.project_name;

-- ============================================================================
-- HELPER VIEW: Items with linked entities
-- ============================================================================
CREATE OR REPLACE VIEW public.v_bid_line_item_links AS
SELECT
    bli.id AS line_item_id,
    bli.bid_project_id,
    bli.item_number,
    bli.description,
    -- Risk links
    COUNT(DISTINCT bril.id) AS risk_link_count,
    ARRAY_AGG(DISTINCT bpr.title) FILTER (WHERE bpr.id IS NOT NULL) AS linked_risk_titles,
    -- Structure links
    COUNT(DISTINCT bsi.id) AS structure_link_count,
    ARRAY_AGG(DISTINCT bbs.structure_name) FILTER (WHERE bbs.id IS NOT NULL) AS linked_structure_names,
    -- Environmental links
    COUNT(DISTINCT beci.id) AS env_link_count,
    -- Question links
    COUNT(DISTINCT bpqi.id) AS question_link_count,
    -- Hazmat links
    COUNT(DISTINCT bhi.id) AS hazmat_link_count
FROM public.bid_line_items bli
LEFT JOIN public.bid_risk_item_links bril ON bli.id = bril.line_item_id
LEFT JOIN public.bid_project_risks bpr ON bril.risk_id = bpr.id
LEFT JOIN public.bid_structure_items bsi ON bli.id = bsi.line_item_id
LEFT JOIN public.bid_bridge_structures bbs ON bsi.structure_id = bbs.id
LEFT JOIN public.bid_environmental_commitment_items beci ON bli.id = beci.line_item_id
LEFT JOIN public.bid_prebid_question_items bpqi ON bli.id = bpqi.line_item_id
LEFT JOIN public.bid_hazmat_items bhi ON bli.id = bhi.line_item_id
GROUP BY bli.id, bli.bid_project_id, bli.item_number, bli.description;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.bid_environmental_commitment_items IS 'Links environmental commitments to bid line items';
COMMENT ON TABLE public.bid_prebid_question_items IS 'Links pre-bid questions to affected bid line items';
COMMENT ON TABLE public.bid_structure_items IS 'Links bridge structures to bid line items with quantity allocation';
COMMENT ON TABLE public.bid_hazmat_items IS 'Links hazmat findings to bid line items';
COMMENT ON VIEW public.v_bid_line_item_links IS 'Summary of all entity links for each line item';
