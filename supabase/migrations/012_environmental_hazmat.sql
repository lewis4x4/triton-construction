-- ============================================================================
-- MIGRATION 012: ENVIRONMENTAL & HAZMAT
-- Triton AI Bid Package Engine - Environmental Commitments and Hazmat Findings
-- ============================================================================

-- ============================================================================
-- ENVIRONMENTAL_COMMITMENTS TABLE
-- Structured storage of environmental obligations
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_environmental_commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Commitment Type
    commitment_type TEXT NOT NULL,  -- 'PERMIT', 'WORK_WINDOW', 'MONITORING', 'RESTORATION', 'MITIGATION'

    -- Details
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Permit Information (if applicable)
    permit_number TEXT,
    permit_agency TEXT,
    permit_expiration DATE,

    -- Work Windows (if applicable)
    restriction_start_date DATE,
    restriction_end_date DATE,
    restriction_type TEXT,  -- 'NO_WORK', 'LIMITED_WORK', 'SPECIAL_MEASURES'
    restriction_notes TEXT,

    -- Monitoring Requirements
    monitoring_frequency TEXT,
    monitoring_parameters TEXT,
    reporting_requirements TEXT,

    -- Cost Impact Assessment
    has_cost_impact BOOLEAN DEFAULT FALSE,
    estimated_cost_impact NUMERIC(12, 2),
    cost_impact_notes TEXT,

    -- Schedule Impact Assessment
    has_schedule_impact BOOLEAN DEFAULT FALSE,
    estimated_schedule_impact_days INTEGER,
    schedule_impact_notes TEXT,

    -- Source Traceability
    source_document_id UUID REFERENCES public.bid_documents(id),
    source_page_numbers TEXT,
    source_text_excerpt TEXT,

    -- AI Metadata
    ai_generated BOOLEAN DEFAULT TRUE,
    ai_confidence NUMERIC(5, 2),

    -- Human Review
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES public.user_profiles(id),
    verified_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_env_commitments_project ON public.bid_environmental_commitments(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_env_commitments_type ON public.bid_environmental_commitments(commitment_type);

-- Enable RLS
ALTER TABLE public.bid_environmental_commitments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid environmental commitments" ON public.bid_environmental_commitments;
CREATE POLICY "Users see bid environmental commitments" ON public.bid_environmental_commitments
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_env_commitments_updated_at ON public.bid_environmental_commitments;
CREATE TRIGGER bid_env_commitments_updated_at
    BEFORE UPDATE ON public.bid_environmental_commitments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- HAZMAT_FINDINGS TABLE
-- Structured asbestos/hazmat assessment data
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_hazmat_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Finding Type
    hazmat_type TEXT NOT NULL,  -- 'ASBESTOS', 'LEAD', 'PCB', 'CONTAMINATED_SOIL', 'OTHER'

    -- Location
    location_description TEXT NOT NULL,
    structure_id UUID REFERENCES public.bid_bridge_structures(id),

    -- Assessment Details
    sample_id TEXT,
    sample_date DATE,
    material_description TEXT,
    test_result TEXT,  -- 'POSITIVE', 'NEGATIVE', 'ASSUMED_POSITIVE'
    concentration TEXT,

    -- Quantity Assessment
    estimated_quantity NUMERIC(12, 2),
    quantity_unit TEXT,

    -- Condition
    material_condition TEXT,  -- 'FRIABLE', 'NON_FRIABLE', 'DAMAGED', 'INTACT'
    friability TEXT,

    -- Required Action
    recommended_action TEXT,  -- 'ABATEMENT', 'ENCAPSULATION', 'AVOIDANCE', 'DISPOSAL'
    action_description TEXT,

    -- Regulatory
    requires_licensed_contractor BOOLEAN DEFAULT FALSE,
    requires_notification BOOLEAN DEFAULT FALSE,
    notification_agency TEXT,
    disposal_requirements TEXT,

    -- Cost Impact
    has_bid_item BOOLEAN DEFAULT FALSE,
    linked_line_item_id UUID REFERENCES public.bid_line_items(id),
    estimated_abatement_cost NUMERIC(12, 2),

    -- Risk Flag
    is_risk_flagged BOOLEAN DEFAULT FALSE,
    linked_risk_id UUID REFERENCES public.bid_project_risks(id),

    -- Source Traceability
    source_document_id UUID REFERENCES public.bid_documents(id),
    source_page_numbers TEXT,

    -- AI Metadata
    ai_generated BOOLEAN DEFAULT TRUE,
    ai_confidence NUMERIC(5, 2),

    -- Human Review
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES public.user_profiles(id),
    verified_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_hazmat_project ON public.bid_hazmat_findings(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_hazmat_type ON public.bid_hazmat_findings(hazmat_type);
CREATE INDEX IF NOT EXISTS idx_bid_hazmat_structure ON public.bid_hazmat_findings(structure_id);

-- Enable RLS
ALTER TABLE public.bid_hazmat_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid hazmat findings" ON public.bid_hazmat_findings;
CREATE POLICY "Users see bid hazmat findings" ON public.bid_hazmat_findings
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_hazmat_findings_updated_at ON public.bid_hazmat_findings;
CREATE TRIGGER bid_hazmat_findings_updated_at
    BEFORE UPDATE ON public.bid_hazmat_findings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- HELPER VIEW: v_bid_environmental_summary
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_environmental_summary AS
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
    -- Hazmat Summary
    COUNT(DISTINCT bhf.id) AS total_hazmat_findings,
    COUNT(DISTINCT CASE WHEN bhf.hazmat_type = 'ASBESTOS' THEN bhf.id END) AS asbestos_findings,
    COUNT(DISTINCT CASE WHEN bhf.hazmat_type = 'LEAD' THEN bhf.id END) AS lead_findings,
    COUNT(DISTINCT CASE WHEN bhf.test_result = 'POSITIVE' THEN bhf.id END) AS positive_findings,
    COUNT(DISTINCT CASE WHEN bhf.requires_licensed_contractor THEN bhf.id END) AS licensed_contractor_required,
    SUM(COALESCE(bhf.estimated_abatement_cost, 0)) AS total_hazmat_cost
FROM public.bid_projects bp
LEFT JOIN public.bid_environmental_commitments bec ON bp.id = bec.bid_project_id
LEFT JOIN public.bid_hazmat_findings bhf ON bp.id = bhf.bid_project_id
GROUP BY bp.id, bp.project_name;

-- ============================================================================
-- HELPER VIEW: v_bid_work_windows
-- Calendar view of all work restrictions
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_work_windows AS
SELECT
    bp.id AS bid_project_id,
    bp.project_name,
    'ENVIRONMENTAL' AS source_type,
    bec.title AS restriction_name,
    bec.restriction_start_date AS start_date,
    bec.restriction_end_date AS end_date,
    bec.restriction_type,
    bec.restriction_notes AS notes
FROM public.bid_projects bp
JOIN public.bid_environmental_commitments bec ON bp.id = bec.bid_project_id
WHERE bec.restriction_start_date IS NOT NULL

UNION ALL

SELECT
    bp.id AS bid_project_id,
    bp.project_name,
    'PROJECT_CONDITIONS' AS source_type,
    'Seasonal Restriction' AS restriction_name,
    bpc.seasonal_restriction_start AS start_date,
    bpc.seasonal_restriction_end AS end_date,
    'SEASONAL' AS restriction_type,
    bpc.seasonal_notes AS notes
FROM public.bid_projects bp
JOIN public.bid_project_conditions bpc ON bp.id = bpc.bid_project_id
WHERE bpc.seasonal_restrictions = TRUE

UNION ALL

SELECT
    bp.id AS bid_project_id,
    bp.project_name,
    'IN_WATER_WORK' AS source_type,
    'In-Water Work Window' AS restriction_name,
    bpc.in_water_work_window_start AS start_date,
    bpc.in_water_work_window_end AS end_date,
    'IN_WATER' AS restriction_type,
    bpc.in_water_notes AS notes
FROM public.bid_projects bp
JOIN public.bid_project_conditions bpc ON bp.id = bpc.bid_project_id
WHERE bpc.in_water_work = TRUE;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.bid_environmental_commitments IS 'Environmental permits, work windows, and compliance commitments';
COMMENT ON TABLE public.bid_hazmat_findings IS 'Asbestos, lead, and hazardous material findings from reports';
COMMENT ON VIEW public.v_bid_environmental_summary IS 'Summary of environmental and hazmat data per bid project';
COMMENT ON VIEW public.v_bid_work_windows IS 'Combined calendar of all work restrictions from various sources';
