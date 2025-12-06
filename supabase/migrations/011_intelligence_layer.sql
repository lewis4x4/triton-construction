-- ============================================================================
-- MIGRATION 011: INTELLIGENCE LAYER
-- Triton AI Bid Package Engine - Risk, Opportunity, and Question Tables
-- ============================================================================

-- ============================================================================
-- PROJECT_RISKS TABLE
-- Normalized risk register (not buried in JSON)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_project_risks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Risk Identification
    risk_number TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category risk_category_enum NOT NULL,

    -- Scoring
    probability severity_enum NOT NULL,
    cost_impact severity_enum NOT NULL,
    schedule_impact severity_enum NOT NULL,
    overall_severity severity_enum NOT NULL,

    -- Quantification (optional)
    estimated_cost_impact_low NUMERIC(12, 2),
    estimated_cost_impact_high NUMERIC(12, 2),
    estimated_schedule_impact_days INTEGER,

    -- Mitigation
    mitigation_strategy TEXT,
    mitigation_owner TEXT,
    contingency_recommended BOOLEAN DEFAULT FALSE,
    contingency_percentage NUMERIC(5, 2),

    -- Pre-Bid Question Recommendation
    prebid_question_recommended BOOLEAN DEFAULT FALSE,
    suggested_question TEXT,

    -- Source Traceability
    source_document_id UUID REFERENCES public.bid_documents(id),
    source_page_numbers TEXT,
    source_text_excerpt TEXT,

    -- AI Metadata
    ai_generated BOOLEAN DEFAULT TRUE,
    ai_confidence NUMERIC(5, 2),
    ai_reasoning TEXT,

    -- Human Review
    review_status TEXT DEFAULT 'PENDING',  -- 'PENDING', 'ACCEPTED', 'MODIFIED', 'REJECTED'
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_risks_project ON public.bid_project_risks(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_risks_category ON public.bid_project_risks(category);
CREATE INDEX IF NOT EXISTS idx_bid_risks_severity ON public.bid_project_risks(overall_severity);
CREATE INDEX IF NOT EXISTS idx_bid_risks_status ON public.bid_project_risks(review_status);

-- Enable RLS
ALTER TABLE public.bid_project_risks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid project risks" ON public.bid_project_risks;
CREATE POLICY "Users see bid project risks" ON public.bid_project_risks
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_project_risks_updated_at ON public.bid_project_risks;
CREATE TRIGGER bid_project_risks_updated_at
    BEFORE UPDATE ON public.bid_project_risks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- RISK_ITEM_LINKS TABLE
-- Link risks to specific line items
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_risk_item_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    risk_id UUID NOT NULL REFERENCES public.bid_project_risks(id) ON DELETE CASCADE,
    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,

    -- Relationship
    relationship_type TEXT,  -- 'DIRECTLY_AFFECTS', 'RELATED_TO', etc.
    notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_risk_item_link UNIQUE (risk_id, line_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_risk_items_risk ON public.bid_risk_item_links(risk_id);
CREATE INDEX IF NOT EXISTS idx_risk_items_item ON public.bid_risk_item_links(line_item_id);

-- Enable RLS
ALTER TABLE public.bid_risk_item_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see risk item links" ON public.bid_risk_item_links;
CREATE POLICY "Users see risk item links" ON public.bid_risk_item_links
    FOR ALL USING (
        risk_id IN (
            SELECT bpr.id FROM public.bid_project_risks bpr
            JOIN public.bid_projects bp ON bpr.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- PROJECT_OPPORTUNITIES TABLE
-- Track value engineering and other opportunities
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_project_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Opportunity Details
    opportunity_number TEXT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    opportunity_type opportunity_type_enum NOT NULL,

    -- Value Assessment
    potential_savings_low NUMERIC(12, 2),
    potential_savings_high NUMERIC(12, 2),
    implementation_difficulty severity_enum,

    -- Action Required
    requires_prebid_question BOOLEAN DEFAULT FALSE,
    requires_ve_proposal BOOLEAN DEFAULT FALSE,
    action_notes TEXT,

    -- Source
    source_document_id UUID REFERENCES public.bid_documents(id),
    source_page_numbers TEXT,

    -- AI Metadata
    ai_generated BOOLEAN DEFAULT TRUE,
    ai_confidence NUMERIC(5, 2),

    -- Human Review
    review_status TEXT DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_opportunities_project ON public.bid_project_opportunities(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_opportunities_type ON public.bid_project_opportunities(opportunity_type);

-- Enable RLS
ALTER TABLE public.bid_project_opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid opportunities" ON public.bid_project_opportunities;
CREATE POLICY "Users see bid opportunities" ON public.bid_project_opportunities
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_project_opportunities_updated_at ON public.bid_project_opportunities;
CREATE TRIGGER bid_project_opportunities_updated_at
    BEFORE UPDATE ON public.bid_project_opportunities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- PREBID_QUESTIONS TABLE
-- Centralized log of questions to submit to owner
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_prebid_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Question Details
    question_number TEXT,
    question_text TEXT NOT NULL,
    justification TEXT,

    -- Category
    category risk_category_enum,

    -- Linked Entities
    linked_risk_id UUID REFERENCES public.bid_project_risks(id),
    linked_line_item_id UUID REFERENCES public.bid_line_items(id),

    -- Source Reference
    source_document_id UUID REFERENCES public.bid_documents(id),
    source_page_numbers TEXT,
    source_text TEXT,

    -- Status Workflow
    status question_status_enum DEFAULT 'AI_SUGGESTED',

    -- AI Metadata
    ai_generated BOOLEAN DEFAULT TRUE,
    ai_confidence NUMERIC(5, 2),
    original_ai_text TEXT,

    -- Human Edits
    edited_by UUID REFERENCES public.user_profiles(id),
    edited_at TIMESTAMPTZ,
    edit_reason TEXT,

    -- Submission Tracking
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES public.user_profiles(id),
    submission_method TEXT,

    -- Response
    response_received_at TIMESTAMPTZ,
    response_text TEXT,
    response_document_id UUID REFERENCES public.bid_documents(id),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_questions_project ON public.bid_prebid_questions(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_questions_status ON public.bid_prebid_questions(status);
CREATE INDEX IF NOT EXISTS idx_bid_questions_category ON public.bid_prebid_questions(category);
CREATE INDEX IF NOT EXISTS idx_bid_questions_risk ON public.bid_prebid_questions(linked_risk_id);

-- Enable RLS
ALTER TABLE public.bid_prebid_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid prebid questions" ON public.bid_prebid_questions;
CREATE POLICY "Users see bid prebid questions" ON public.bid_prebid_questions
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_prebid_questions_updated_at ON public.bid_prebid_questions;
CREATE TRIGGER bid_prebid_questions_updated_at
    BEFORE UPDATE ON public.bid_prebid_questions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- HELPER VIEW: v_bid_risk_summary
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_risk_summary AS
SELECT
    bp.id AS bid_project_id,
    bp.project_name,
    COUNT(bpr.id) AS total_risks,
    COUNT(CASE WHEN bpr.overall_severity = 'CRITICAL' THEN 1 END) AS critical_risks,
    COUNT(CASE WHEN bpr.overall_severity = 'HIGH' THEN 1 END) AS high_risks,
    COUNT(CASE WHEN bpr.overall_severity = 'MEDIUM' THEN 1 END) AS medium_risks,
    COUNT(CASE WHEN bpr.overall_severity = 'LOW' THEN 1 END) AS low_risks,
    COUNT(CASE WHEN bpr.review_status = 'PENDING' THEN 1 END) AS pending_review,
    COUNT(CASE WHEN bpr.prebid_question_recommended THEN 1 END) AS questions_recommended
FROM public.bid_projects bp
LEFT JOIN public.bid_project_risks bpr ON bp.id = bpr.bid_project_id
GROUP BY bp.id, bp.project_name;

-- ============================================================================
-- HELPER VIEW: v_bid_questions_summary
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_questions_summary AS
SELECT
    bp.id AS bid_project_id,
    bp.project_name,
    COUNT(bpq.id) AS total_questions,
    COUNT(CASE WHEN bpq.status = 'AI_SUGGESTED' THEN 1 END) AS ai_suggested,
    COUNT(CASE WHEN bpq.status = 'APPROVED' THEN 1 END) AS approved,
    COUNT(CASE WHEN bpq.status = 'SUBMITTED' THEN 1 END) AS submitted,
    COUNT(CASE WHEN bpq.status = 'ANSWERED' THEN 1 END) AS answered
FROM public.bid_projects bp
LEFT JOIN public.bid_prebid_questions bpq ON bp.id = bpq.bid_project_id
GROUP BY bp.id, bp.project_name;

-- ============================================================================
-- HELPER FUNCTION: Generate risk number
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_risk_number(p_bid_project_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.bid_project_risks
    WHERE bid_project_id = p_bid_project_id;

    RETURN 'R-' || LPAD(v_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Generate question number
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_question_number(p_bid_project_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.bid_prebid_questions
    WHERE bid_project_id = p_bid_project_id;

    RETURN 'Q-' || LPAD(v_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Generate opportunity number
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_opportunity_number(p_bid_project_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO v_count
    FROM public.bid_project_opportunities
    WHERE bid_project_id = p_bid_project_id;

    RETURN 'O-' || LPAD(v_count::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.bid_project_risks IS 'Risk register for bid projects with AI scoring and human review';
COMMENT ON TABLE public.bid_risk_item_links IS 'Links risks to affected line items';
COMMENT ON TABLE public.bid_project_opportunities IS 'Value engineering and optimization opportunities';
COMMENT ON TABLE public.bid_prebid_questions IS 'Pre-bid questions with AI suggestions and submission tracking';
