-- ============================================================================
-- MIGRATION 014: DELIVERABLES & LEARNING
-- Triton AI Bid Package Engine - Output Generation and AI Learning Tables
-- ============================================================================

-- ============================================================================
-- EXECUTIVE_SNAPSHOTS TABLE
-- AI-generated executive summaries
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_executive_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Snapshot Content
    version_number INTEGER NOT NULL DEFAULT 1,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Executive Summary Sections
    project_overview TEXT,
    key_quantities_summary TEXT,
    risk_summary TEXT,
    environmental_summary TEXT,
    schedule_summary TEXT,
    cost_considerations TEXT,
    recommendations TEXT,

    -- Key Metrics (denormalized for quick display)
    total_line_items INTEGER,
    total_estimated_value NUMERIC(14, 2),
    critical_risks_count INTEGER,
    high_risks_count INTEGER,
    work_packages_count INTEGER,
    environmental_commitments_count INTEGER,
    hazmat_findings_count INTEGER,
    prebid_questions_count INTEGER,

    -- AI Generation Metadata
    ai_model_used TEXT,
    ai_prompt_version TEXT,
    generation_duration_ms INTEGER,
    tokens_used INTEGER,

    -- Status
    is_current BOOLEAN DEFAULT TRUE,
    superseded_by UUID REFERENCES public.bid_executive_snapshots(id),
    superseded_at TIMESTAMPTZ,

    -- Human Review
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_exec_snapshots_project ON public.bid_executive_snapshots(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_exec_snapshots_current ON public.bid_executive_snapshots(bid_project_id, is_current) WHERE is_current = TRUE;

-- Enable RLS
ALTER TABLE public.bid_executive_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid executive snapshots" ON public.bid_executive_snapshots;
CREATE POLICY "Users see bid executive snapshots" ON public.bid_executive_snapshots
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_exec_snapshots_updated_at ON public.bid_executive_snapshots;
CREATE TRIGGER bid_exec_snapshots_updated_at
    BEFORE UPDATE ON public.bid_executive_snapshots
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- EXPORT_PACKAGES TABLE
-- Track generated deliverables/exports
-- ============================================================================

CREATE TYPE export_type_enum AS ENUM (
    'EXECUTIVE_SNAPSHOT_PDF',
    'RISK_REGISTER_PDF',
    'RISK_REGISTER_EXCEL',
    'ENVIRONMENTAL_REPORT_PDF',
    'WORK_PACKAGES_EXCEL',
    'LINE_ITEMS_EXCEL',
    'PREBID_QUESTIONS_PDF',
    'FULL_BID_PACKAGE_ZIP'
);

CREATE TYPE export_status_enum AS ENUM (
    'QUEUED',
    'GENERATING',
    'COMPLETED',
    'FAILED',
    'EXPIRED'
);

CREATE TABLE IF NOT EXISTS public.bid_export_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Export Details
    export_type export_type_enum NOT NULL,
    export_name TEXT NOT NULL,
    description TEXT,

    -- Status
    status export_status_enum DEFAULT 'QUEUED',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,

    -- File Info
    file_path TEXT,
    file_size_bytes BIGINT,
    file_mime_type TEXT,
    file_checksum TEXT,

    -- Expiration
    expires_at TIMESTAMPTZ,
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,

    -- Generation Context
    snapshot_id UUID REFERENCES public.bid_executive_snapshots(id),
    included_sections TEXT[],
    generation_params JSONB,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_exports_project ON public.bid_export_packages(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_exports_type ON public.bid_export_packages(export_type);
CREATE INDEX IF NOT EXISTS idx_bid_exports_status ON public.bid_export_packages(status);
CREATE INDEX IF NOT EXISTS idx_bid_exports_expires ON public.bid_export_packages(expires_at) WHERE status = 'COMPLETED';

-- Enable RLS
ALTER TABLE public.bid_export_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid exports" ON public.bid_export_packages;
CREATE POLICY "Users see bid exports" ON public.bid_export_packages
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_exports_updated_at ON public.bid_export_packages;
CREATE TRIGGER bid_exports_updated_at
    BEFORE UPDATE ON public.bid_export_packages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- AI_CORRECTIONS TABLE
-- Track when users correct AI-generated data (for learning)
-- ============================================================================

CREATE TYPE correction_entity_enum AS ENUM (
    'LINE_ITEM',
    'RISK',
    'OPPORTUNITY',
    'ENVIRONMENTAL_COMMITMENT',
    'HAZMAT_FINDING',
    'PREBID_QUESTION',
    'WORK_PACKAGE',
    'PROJECT_METADATA',
    'BRIDGE_STRUCTURE',
    'EXECUTIVE_SNAPSHOT'
);

CREATE TABLE IF NOT EXISTS public.bid_ai_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Context
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- What was corrected
    entity_type correction_entity_enum NOT NULL,
    entity_id UUID NOT NULL,
    field_name TEXT NOT NULL,

    -- Before/After
    original_value TEXT,
    corrected_value TEXT,

    -- AI Context
    ai_model_used TEXT,
    ai_confidence NUMERIC(5, 2),
    ai_reasoning TEXT,

    -- Correction Metadata
    correction_type TEXT,  -- 'FACTUAL_ERROR', 'CATEGORIZATION', 'SEVERITY_CHANGE', 'ADDITION', 'REMOVAL', 'REWORDING'
    correction_reason TEXT,
    user_notes TEXT,

    -- Source Document Context
    source_document_id UUID REFERENCES public.bid_documents(id),
    source_page TEXT,
    source_excerpt TEXT,

    -- Learning Impact
    processed_for_learning BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    learning_batch_id TEXT,

    -- Audit
    corrected_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_corrections_project ON public.bid_ai_corrections(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_corrections_org ON public.bid_ai_corrections(organization_id);
CREATE INDEX IF NOT EXISTS idx_bid_corrections_entity ON public.bid_ai_corrections(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_bid_corrections_field ON public.bid_ai_corrections(entity_type, field_name);
CREATE INDEX IF NOT EXISTS idx_bid_corrections_unprocessed ON public.bid_ai_corrections(processed_for_learning) WHERE processed_for_learning = FALSE;

-- Enable RLS
ALTER TABLE public.bid_ai_corrections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid corrections" ON public.bid_ai_corrections;
CREATE POLICY "Users see bid corrections" ON public.bid_ai_corrections
    FOR ALL USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- ============================================================================
-- BID_OUTCOMES TABLE
-- Record actual bid results for predictive learning
-- ============================================================================

CREATE TYPE bid_result_enum AS ENUM (
    'WON',
    'LOST',
    'NO_BID',
    'WITHDRAWN',
    'PENDING'
);

CREATE TABLE IF NOT EXISTS public.bid_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Result
    result bid_result_enum NOT NULL,
    result_date DATE,

    -- Our Bid
    our_bid_amount NUMERIC(14, 2),
    our_bid_rank INTEGER,
    total_bidders INTEGER,

    -- Winning Bid (if we lost)
    winning_bid_amount NUMERIC(14, 2),
    winning_bidder_name TEXT,
    spread_percentage NUMERIC(6, 2),  -- How far off were we?

    -- Analysis
    loss_reason TEXT,
    lessons_learned TEXT,

    -- Prediction Accuracy
    ai_predicted_win_probability NUMERIC(5, 2),
    ai_predicted_winning_amount NUMERIC(14, 2),
    prediction_accuracy_score NUMERIC(5, 2),

    -- Risk Realization
    risks_that_materialized TEXT[],
    unforeseen_issues TEXT,

    -- Post-Award (if won)
    final_contract_value NUMERIC(14, 2),
    actual_profit_margin NUMERIC(6, 2),
    project_completion_date DATE,
    project_success_rating INTEGER,  -- 1-5

    -- Learning Flags
    processed_for_learning BOOLEAN DEFAULT FALSE,
    learning_insights JSONB,

    -- Audit
    recorded_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_outcomes_project ON public.bid_outcomes(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_outcomes_result ON public.bid_outcomes(result);
CREATE INDEX IF NOT EXISTS idx_bid_outcomes_date ON public.bid_outcomes(result_date);

-- Enable RLS
ALTER TABLE public.bid_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid outcomes" ON public.bid_outcomes;
CREATE POLICY "Users see bid outcomes" ON public.bid_outcomes
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_outcomes_updated_at ON public.bid_outcomes;
CREATE TRIGGER bid_outcomes_updated_at
    BEFORE UPDATE ON public.bid_outcomes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- LEARNING_FEEDBACK TABLE
-- General user feedback on AI quality
-- ============================================================================

CREATE TYPE feedback_rating_enum AS ENUM (
    'VERY_POOR',
    'POOR',
    'NEUTRAL',
    'GOOD',
    'EXCELLENT'
);

CREATE TABLE IF NOT EXISTS public.bid_learning_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Context
    bid_project_id UUID REFERENCES public.bid_projects(id) ON DELETE SET NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- What was rated
    feedback_type TEXT NOT NULL,  -- 'OVERALL_ANALYSIS', 'RISK_IDENTIFICATION', 'CATEGORIZATION', 'EXECUTIVE_SUMMARY', etc.
    entity_type correction_entity_enum,
    entity_id UUID,

    -- Rating
    rating feedback_rating_enum NOT NULL,
    rating_numeric INTEGER,  -- 1-5 for analytics

    -- Detailed Feedback
    feedback_text TEXT,
    what_was_good TEXT,
    what_needs_improvement TEXT,
    suggestions TEXT,

    -- Time Savings Estimate
    estimated_time_saved_minutes INTEGER,
    would_use_again BOOLEAN,

    -- Processing
    processed_for_learning BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,

    -- Audit
    submitted_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_feedback_project ON public.bid_learning_feedback(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_feedback_org ON public.bid_learning_feedback(organization_id);
CREATE INDEX IF NOT EXISTS idx_bid_feedback_type ON public.bid_learning_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_bid_feedback_rating ON public.bid_learning_feedback(rating);

-- Enable RLS
ALTER TABLE public.bid_learning_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid feedback" ON public.bid_learning_feedback;
CREATE POLICY "Users see bid feedback" ON public.bid_learning_feedback
    FOR ALL USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- ============================================================================
-- HELPER VIEW: v_bid_ai_accuracy
-- Track AI accuracy metrics per organization
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_ai_accuracy AS
SELECT
    c.organization_id,
    c.entity_type,
    c.field_name,
    COUNT(*) AS total_corrections,
    COUNT(DISTINCT c.bid_project_id) AS projects_with_corrections,
    AVG(c.ai_confidence) AS avg_original_confidence,
    COUNT(CASE WHEN c.correction_type = 'FACTUAL_ERROR' THEN 1 END) AS factual_errors,
    COUNT(CASE WHEN c.correction_type = 'CATEGORIZATION' THEN 1 END) AS categorization_changes,
    COUNT(CASE WHEN c.correction_type = 'SEVERITY_CHANGE' THEN 1 END) AS severity_changes
FROM public.bid_ai_corrections c
GROUP BY c.organization_id, c.entity_type, c.field_name;

-- ============================================================================
-- HELPER VIEW: v_bid_outcome_analytics
-- Win/loss analytics
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_outcome_analytics AS
SELECT
    bp.organization_id,
    COUNT(*) AS total_bids,
    COUNT(CASE WHEN bo.result = 'WON' THEN 1 END) AS wins,
    COUNT(CASE WHEN bo.result = 'LOST' THEN 1 END) AS losses,
    COUNT(CASE WHEN bo.result = 'NO_BID' THEN 1 END) AS no_bids,
    ROUND(
        COUNT(CASE WHEN bo.result = 'WON' THEN 1 END)::NUMERIC /
        NULLIF(COUNT(CASE WHEN bo.result IN ('WON', 'LOST') THEN 1 END), 0) * 100,
        2
    ) AS win_rate_percentage,
    AVG(bo.spread_percentage) FILTER (WHERE bo.result = 'LOST') AS avg_loss_spread,
    AVG(bo.ai_predicted_win_probability) AS avg_predicted_win_prob,
    AVG(bo.prediction_accuracy_score) AS avg_prediction_accuracy,
    SUM(bo.our_bid_amount) FILTER (WHERE bo.result = 'WON') AS total_won_value
FROM public.bid_projects bp
JOIN public.bid_outcomes bo ON bp.id = bo.bid_project_id
GROUP BY bp.organization_id;

-- ============================================================================
-- HELPER VIEW: v_bid_feedback_summary
-- Feedback analytics
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_feedback_summary AS
SELECT
    organization_id,
    feedback_type,
    COUNT(*) AS total_feedback,
    AVG(rating_numeric) AS avg_rating,
    COUNT(CASE WHEN rating IN ('GOOD', 'EXCELLENT') THEN 1 END) AS positive_count,
    COUNT(CASE WHEN rating IN ('POOR', 'VERY_POOR') THEN 1 END) AS negative_count,
    AVG(estimated_time_saved_minutes) AS avg_time_saved_minutes,
    COUNT(CASE WHEN would_use_again THEN 1 END) AS would_use_again_count,
    ROUND(
        COUNT(CASE WHEN would_use_again THEN 1 END)::NUMERIC /
        NULLIF(COUNT(*), 0) * 100,
        2
    ) AS would_use_again_percentage
FROM public.bid_learning_feedback
GROUP BY organization_id, feedback_type;

-- ============================================================================
-- HELPER FUNCTION: Record AI correction
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_ai_correction(
    p_bid_project_id UUID,
    p_entity_type correction_entity_enum,
    p_entity_id UUID,
    p_field_name TEXT,
    p_original_value TEXT,
    p_corrected_value TEXT,
    p_correction_type TEXT DEFAULT NULL,
    p_correction_reason TEXT DEFAULT NULL,
    p_ai_confidence NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
    v_correction_id UUID;
BEGIN
    -- Get organization ID
    SELECT organization_id INTO v_org_id
    FROM public.bid_projects
    WHERE id = p_bid_project_id;

    -- Insert correction record
    INSERT INTO public.bid_ai_corrections (
        bid_project_id,
        organization_id,
        entity_type,
        entity_id,
        field_name,
        original_value,
        corrected_value,
        correction_type,
        correction_reason,
        ai_confidence,
        corrected_by
    ) VALUES (
        p_bid_project_id,
        v_org_id,
        p_entity_type,
        p_entity_id,
        p_field_name,
        p_original_value,
        p_corrected_value,
        p_correction_type,
        p_correction_reason,
        p_ai_confidence,
        auth.uid()
    )
    RETURNING id INTO v_correction_id;

    RETURN v_correction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Submit learning feedback
-- ============================================================================

CREATE OR REPLACE FUNCTION public.submit_learning_feedback(
    p_feedback_type TEXT,
    p_rating feedback_rating_enum,
    p_feedback_text TEXT DEFAULT NULL,
    p_bid_project_id UUID DEFAULT NULL,
    p_entity_type correction_entity_enum DEFAULT NULL,
    p_entity_id UUID DEFAULT NULL,
    p_time_saved_minutes INTEGER DEFAULT NULL,
    p_would_use_again BOOLEAN DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_org_id UUID;
    v_feedback_id UUID;
    v_rating_numeric INTEGER;
BEGIN
    -- Get organization ID
    v_org_id := public.get_user_organization_id(auth.uid());

    -- Convert rating to numeric
    v_rating_numeric := CASE p_rating
        WHEN 'VERY_POOR' THEN 1
        WHEN 'POOR' THEN 2
        WHEN 'NEUTRAL' THEN 3
        WHEN 'GOOD' THEN 4
        WHEN 'EXCELLENT' THEN 5
    END;

    -- Insert feedback
    INSERT INTO public.bid_learning_feedback (
        bid_project_id,
        organization_id,
        feedback_type,
        entity_type,
        entity_id,
        rating,
        rating_numeric,
        feedback_text,
        estimated_time_saved_minutes,
        would_use_again,
        submitted_by
    ) VALUES (
        p_bid_project_id,
        v_org_id,
        p_feedback_type,
        p_entity_type,
        p_entity_id,
        p_rating,
        v_rating_numeric,
        p_feedback_text,
        p_time_saved_minutes,
        p_would_use_again,
        auth.uid()
    )
    RETURNING id INTO v_feedback_id;

    RETURN v_feedback_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Get project deliverables status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_bid_deliverables_status(p_bid_project_id UUID)
RETURNS TABLE (
    deliverable_type TEXT,
    status TEXT,
    last_generated TIMESTAMPTZ,
    export_id UUID
) AS $$
BEGIN
    RETURN QUERY
    WITH deliverable_types AS (
        SELECT unnest(ARRAY[
            'EXECUTIVE_SNAPSHOT_PDF',
            'RISK_REGISTER_PDF',
            'RISK_REGISTER_EXCEL',
            'ENVIRONMENTAL_REPORT_PDF',
            'WORK_PACKAGES_EXCEL',
            'LINE_ITEMS_EXCEL',
            'PREBID_QUESTIONS_PDF'
        ]) AS dtype
    ),
    latest_exports AS (
        SELECT DISTINCT ON (export_type)
            export_type,
            status,
            completed_at,
            id
        FROM public.bid_export_packages
        WHERE bid_project_id = p_bid_project_id
        ORDER BY export_type, created_at DESC
    )
    SELECT
        dt.dtype::TEXT AS deliverable_type,
        COALESCE(le.status::TEXT, 'NOT_GENERATED') AS status,
        le.completed_at AS last_generated,
        le.id AS export_id
    FROM deliverable_types dt
    LEFT JOIN latest_exports le ON dt.dtype = le.export_type::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.bid_executive_snapshots IS 'AI-generated executive summaries for bid projects';
COMMENT ON TABLE public.bid_export_packages IS 'Tracking of generated deliverable exports (PDFs, Excel files)';
COMMENT ON TABLE public.bid_ai_corrections IS 'User corrections to AI-generated data for learning improvement';
COMMENT ON TABLE public.bid_outcomes IS 'Bid results and outcome tracking for win/loss analysis';
COMMENT ON TABLE public.bid_learning_feedback IS 'User feedback on AI quality for continuous improvement';
COMMENT ON VIEW public.v_bid_ai_accuracy IS 'AI accuracy metrics aggregated by entity type and field';
COMMENT ON VIEW public.v_bid_outcome_analytics IS 'Win/loss analytics by organization';
COMMENT ON VIEW public.v_bid_feedback_summary IS 'Feedback summary statistics by organization and type';
