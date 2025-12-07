-- =============================================================================
-- Migration 059: AI Query Infrastructure
-- Per CLAUDE.md Roadmap Phase 3: Migration 013
-- Natural language querying of project data
-- =============================================================================

-- =============================================================================
-- AI Conversations (Query sessions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,

    -- Context
    project_id UUID REFERENCES public.projects(id),
    context_type TEXT, -- 'PROJECT', 'ORGANIZATION', 'GLOBAL'

    -- Conversation Details
    title TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),

    -- Settings
    model_version TEXT DEFAULT 'claude-sonnet-4-20250514',
    temperature DECIMAL(3, 2) DEFAULT 0.7,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    archived_at TIMESTAMPTZ,

    -- Usage Tracking
    total_messages INTEGER DEFAULT 0,
    total_tokens_used INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AI Messages (Individual queries and responses)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,

    -- Message Content
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,

    -- For assistant messages
    query_type TEXT, -- 'DATA_LOOKUP', 'ANALYSIS', 'REPORT', 'CALCULATION', 'GENERAL'
    confidence_score DECIMAL(3, 2),

    -- Data References (what data was used to answer)
    referenced_tables TEXT[],
    referenced_records JSONB DEFAULT '[]',

    -- SQL Generated (if applicable)
    generated_sql TEXT,
    sql_executed BOOLEAN DEFAULT FALSE,
    sql_result JSONB,

    -- Charts/Visualizations
    visualization_type TEXT, -- 'BAR', 'LINE', 'PIE', 'TABLE', 'MAP'
    visualization_data JSONB,

    -- Tokens
    prompt_tokens INTEGER,
    completion_tokens INTEGER,

    -- Feedback
    user_rating INTEGER, -- 1-5
    user_feedback TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AI Query Templates (Common query patterns)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_query_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Template Details
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'DAILY_REPORTS', 'COST', 'SCHEDULE', 'SAFETY', 'QUALITY'

    -- Query Template
    query_template TEXT NOT NULL,
    parameters JSONB DEFAULT '[]', -- [{name, type, description, required}]

    -- Example
    example_query TEXT,
    example_response TEXT,

    -- Usage
    usage_count INTEGER DEFAULT 0,
    is_system_template BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- AI Context Snapshots (Point-in-time project data for AI)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_context_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Snapshot Details
    snapshot_date DATE NOT NULL,
    snapshot_type TEXT NOT NULL, -- 'DAILY', 'WEEKLY', 'MONTHLY', 'ON_DEMAND'

    -- Aggregated Data
    summary_data JSONB NOT NULL, -- Pre-computed summary stats
    key_metrics JSONB NOT NULL, -- KPIs
    recent_activities JSONB, -- Last N activities

    -- For embedding/search
    text_summary TEXT, -- Natural language summary
    embedding VECTOR(1536), -- OpenAI embedding for semantic search

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_project_snapshot UNIQUE (project_id, snapshot_date, snapshot_type)
);

-- =============================================================================
-- AI Data Access Rules (What AI can access)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_data_access_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Rule Details
    table_name TEXT NOT NULL,
    allowed_columns TEXT[], -- NULL = all columns
    excluded_columns TEXT[], -- Sensitive columns to never expose

    -- Access Level
    access_level TEXT NOT NULL DEFAULT 'READ', -- 'READ', 'AGGREGATE_ONLY', 'DENIED'

    -- Row Filters
    row_filter_sql TEXT, -- Additional SQL WHERE clause

    -- PII Handling
    contains_pii BOOLEAN DEFAULT FALSE,
    pii_handling TEXT, -- 'REDACT', 'MASK', 'EXCLUDE'

    -- Notes
    notes TEXT,

    updated_by UUID REFERENCES public.user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_ai_access_rule UNIQUE (organization_id, table_name)
);

-- =============================================================================
-- AI Usage Logs (Billing and analytics)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    conversation_id UUID REFERENCES public.ai_conversations(id),
    message_id UUID REFERENCES public.ai_messages(id),

    -- Usage Details
    usage_type TEXT NOT NULL, -- 'QUERY', 'EMBEDDING', 'TRANSCRIPTION', 'REPORT_GENERATION'
    model_used TEXT NOT NULL,

    -- Tokens
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,

    -- Cost (estimated)
    estimated_cost_usd DECIMAL(10, 6),

    -- Performance
    latency_ms INTEGER,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Saved AI Reports (Generated reports saved for later)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),

    -- Report Details
    title TEXT NOT NULL,
    description TEXT,
    report_type TEXT NOT NULL, -- 'DAILY_SUMMARY', 'WEEKLY_SUMMARY', 'COST_ANALYSIS', 'CUSTOM'

    -- Content
    generated_content TEXT NOT NULL,
    source_query TEXT,
    data_snapshot JSONB,

    -- Schedule (for recurring reports)
    is_scheduled BOOLEAN DEFAULT FALSE,
    schedule_cron TEXT,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,

    -- Sharing
    is_shared BOOLEAN DEFAULT FALSE,
    shared_with UUID[],

    -- Export
    export_format TEXT, -- 'PDF', 'DOCX', 'HTML'
    export_url TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_project ON public.ai_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation ON public.ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_created ON public.ai_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_org ON public.ai_usage_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON public.ai_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_context_snapshots_project ON public.ai_context_snapshots(project_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_query_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_context_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_data_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_saved_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "ai_conversations_user_access" ON public.ai_conversations
    FOR ALL USING (user_id = auth.uid() OR organization_id = public.get_user_organization_id());

CREATE POLICY "ai_messages_conversation_access" ON public.ai_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.ai_conversations c
            WHERE c.id = conversation_id
            AND (c.user_id = auth.uid() OR c.organization_id = public.get_user_organization_id())
        )
    );

CREATE POLICY "ai_query_templates_org_access" ON public.ai_query_templates
    FOR ALL USING (
        organization_id IS NULL -- System templates
        OR organization_id = public.get_user_organization_id()
    );

CREATE POLICY "ai_context_snapshots_project_access" ON public.ai_context_snapshots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND p.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "ai_data_access_rules_org_access" ON public.ai_data_access_rules
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "ai_usage_logs_org_access" ON public.ai_usage_logs
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "ai_saved_reports_access" ON public.ai_saved_reports
    FOR ALL USING (
        user_id = auth.uid()
        OR organization_id = public.get_user_organization_id()
        OR (is_shared = TRUE AND auth.uid() = ANY(shared_with))
    );

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Log AI usage
CREATE OR REPLACE FUNCTION public.log_ai_usage(
    p_conversation_id UUID,
    p_message_id UUID,
    p_usage_type TEXT,
    p_model TEXT,
    p_prompt_tokens INTEGER,
    p_completion_tokens INTEGER,
    p_latency_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_org_id UUID;
    v_cost DECIMAL(10, 6);
BEGIN
    -- Get org from conversation
    SELECT c.organization_id INTO v_org_id
    FROM public.ai_conversations c
    WHERE c.id = p_conversation_id;

    -- Estimate cost (rough OpenAI pricing)
    v_cost := (p_prompt_tokens * 0.000003) + (p_completion_tokens * 0.000015);

    INSERT INTO public.ai_usage_logs (
        organization_id, user_id, conversation_id, message_id,
        usage_type, model_used,
        prompt_tokens, completion_tokens, total_tokens,
        estimated_cost_usd, latency_ms
    ) VALUES (
        v_org_id, auth.uid(), p_conversation_id, p_message_id,
        p_usage_type, p_model,
        p_prompt_tokens, p_completion_tokens, p_prompt_tokens + p_completion_tokens,
        v_cost, p_latency_ms
    )
    RETURNING id INTO v_log_id;

    -- Update conversation totals
    UPDATE public.ai_conversations
    SET
        total_messages = total_messages + 1,
        total_tokens_used = total_tokens_used + p_prompt_tokens + p_completion_tokens,
        last_message_at = NOW()
    WHERE id = p_conversation_id;

    RETURN v_log_id;
END;
$$;

-- Get available tables for AI querying
CREATE OR REPLACE FUNCTION public.get_ai_available_tables(p_org_id UUID)
RETURNS TABLE (
    table_name TEXT,
    access_level TEXT,
    allowed_columns TEXT[],
    description TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.table_name::TEXT,
        COALESCE(r.access_level, 'READ')::TEXT,
        r.allowed_columns,
        obj_description((t.table_schema || '.' || t.table_name)::regclass)::TEXT
    FROM information_schema.tables t
    LEFT JOIN public.ai_data_access_rules r ON
        r.table_name = t.table_name AND r.organization_id = p_org_id
    WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND COALESCE(r.access_level, 'READ') != 'DENIED'
    ORDER BY t.table_name;
END;
$$;

-- =============================================================================
-- Views
-- =============================================================================

-- AI Usage Summary (for billing dashboard)
CREATE OR REPLACE VIEW public.v_ai_usage_summary AS
SELECT
    organization_id,
    DATE_TRUNC('month', created_at) AS month,
    COUNT(*) AS total_requests,
    SUM(total_tokens) AS total_tokens,
    SUM(estimated_cost_usd) AS estimated_cost,
    COUNT(DISTINCT user_id) AS unique_users,
    AVG(latency_ms) AS avg_latency_ms
FROM public.ai_usage_logs
GROUP BY organization_id, DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Recent AI Queries
CREATE OR REPLACE VIEW public.v_recent_ai_queries AS
SELECT
    m.id,
    m.content AS query,
    m.query_type,
    m.created_at,
    c.project_id,
    p.name AS project_name,
    u.first_name || ' ' || u.last_name AS user_name
FROM public.ai_messages m
JOIN public.ai_conversations c ON m.conversation_id = c.id
LEFT JOIN public.projects p ON c.project_id = p.id
LEFT JOIN public.user_profiles u ON c.user_id = u.id
WHERE m.role = 'user'
ORDER BY m.created_at DESC
LIMIT 100;

-- =============================================================================
-- Seed Default Query Templates
-- =============================================================================
INSERT INTO public.ai_query_templates (name, description, category, query_template, example_query, is_system_template)
VALUES
    ('Daily Report Summary', 'Get a summary of today''s work', 'DAILY_REPORTS',
     'Summarize the daily report for {{project}} on {{date}}',
     'Summarize the daily report for Corridor H on December 5th',
     TRUE),
    ('Weekly Progress', 'Weekly progress summary', 'DAILY_REPORTS',
     'Show me the weekly progress for {{project}} from {{start_date}} to {{end_date}}',
     'Show me the weekly progress for Project 2024-001 from Monday to Friday',
     TRUE),
    ('Cost to Date', 'Current cost status', 'COST',
     'What is the cost to date for {{project}}?',
     'What is the cost to date for the bridge project?',
     TRUE),
    ('Change Order Summary', 'Summary of all change orders', 'COST',
     'Show me all change orders for {{project}}',
     'Show me all change orders for Project ABC',
     TRUE),
    ('Safety Incidents', 'Recent safety incidents', 'SAFETY',
     'List safety incidents for {{project}} in the last {{days}} days',
     'List safety incidents for all projects in the last 30 days',
     TRUE),
    ('Open RFIs', 'Outstanding RFIs', 'QUALITY',
     'What RFIs are still open for {{project}}?',
     'What RFIs are still open for the Highway project?',
     TRUE),
    ('Pending Submittals', 'Submittals awaiting response', 'QUALITY',
     'Show pending submittals for {{project}}',
     'Show pending submittals for all active projects',
     TRUE),
    ('Schedule Status', 'Current schedule performance', 'SCHEDULE',
     'What is the schedule status for {{project}}?',
     'What is the schedule status for Corridor H?',
     TRUE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Seed Default Data Access Rules
-- =============================================================================
-- Note: These will be created per-organization when needed

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE TRIGGER ai_conversations_updated
    BEFORE UPDATE ON public.ai_conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER ai_query_templates_updated
    BEFORE UPDATE ON public.ai_query_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER ai_saved_reports_updated
    BEFORE UPDATE ON public.ai_saved_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

COMMENT ON TABLE public.ai_conversations IS 'AI query conversation sessions';
COMMENT ON TABLE public.ai_messages IS 'Individual messages in AI conversations';
COMMENT ON TABLE public.ai_query_templates IS 'Reusable AI query templates';
COMMENT ON TABLE public.ai_context_snapshots IS 'Point-in-time data snapshots for AI context';
COMMENT ON TABLE public.ai_data_access_rules IS 'Rules governing what data AI can access';
