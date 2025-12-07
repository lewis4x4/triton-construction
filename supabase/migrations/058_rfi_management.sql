-- =============================================================================
-- Migration 058: RFI Management
-- Per CLAUDE.md Roadmap Phase 2: Migration 012
-- =============================================================================

-- RFI Status
DO $$ BEGIN
    CREATE TYPE public.rfi_status AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'RESPONDED',
        'CLOSED',
        'VOID',
        'RESUBMITTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RFI Priority
DO $$ BEGIN
    CREATE TYPE public.rfi_priority AS ENUM (
        'CRITICAL',
        'HIGH',
        'MEDIUM',
        'LOW',
        'INFORMATION_ONLY'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RFI Category
DO $$ BEGIN
    CREATE TYPE public.rfi_category AS ENUM (
        'DESIGN_CLARIFICATION',
        'DESIGN_CONFLICT',
        'FIELD_CONDITION',
        'SPECIFICATION_CLARIFICATION',
        'SUBSTITUTION_REQUEST',
        'CODE_COMPLIANCE',
        'CONSTRUCTABILITY',
        'COORDINATION',
        'SCHEDULE',
        'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- RFIs (Requests for Information)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- RFI Details
    rfi_number TEXT NOT NULL,
    subject TEXT NOT NULL,
    question TEXT NOT NULL,

    -- Category and Priority
    category rfi_category NOT NULL,
    priority rfi_priority NOT NULL DEFAULT 'MEDIUM',

    -- References
    spec_section TEXT,
    drawing_reference TEXT,
    detail_reference TEXT,
    location TEXT,

    -- Schedule Impact
    schedule_impact BOOLEAN DEFAULT FALSE,
    schedule_impact_days INTEGER,
    schedule_impact_description TEXT,

    -- Cost Impact
    cost_impact BOOLEAN DEFAULT FALSE,
    cost_impact_estimate DECIMAL(15, 2),
    cost_impact_description TEXT,

    -- Suggested Answer
    contractor_suggestion TEXT,

    -- Status
    status rfi_status NOT NULL DEFAULT 'DRAFT',

    -- Dates
    submitted_at TIMESTAMPTZ,
    response_required_by DATE,
    responded_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,

    -- Ball in Court
    ball_in_court TEXT NOT NULL DEFAULT 'OWNER', -- 'CONTRACTOR', 'OWNER', 'ARCHITECT', 'ENGINEER'

    -- Response
    response TEXT,
    responded_by TEXT,
    response_attachment_url TEXT,

    -- Subcontractor (if originated by sub)
    subcontractor_id UUID REFERENCES public.subcontractors(id),
    subcontract_id UUID REFERENCES public.subcontract_agreements(id),

    -- Related Documents
    related_submittal_id UUID REFERENCES public.submittals(id),
    related_change_order_id UUID REFERENCES public.change_orders(id),

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_rfi_number UNIQUE (project_id, rfi_number)
);

-- =============================================================================
-- RFI Attachments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rfi_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfi_id UUID NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id),

    -- Attachment Details
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT, -- 'QUESTION', 'RESPONSE', 'SKETCH', 'PHOTO', 'MARKUP'
    description TEXT,

    -- Sort
    sort_order INTEGER DEFAULT 0,

    -- Audit
    uploaded_by UUID REFERENCES public.user_profiles(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- RFI Comments / Discussion Thread
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rfi_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfi_id UUID NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,

    -- Comment
    comment_text TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE, -- Internal notes not shared with owner

    -- Author
    author_id UUID REFERENCES public.user_profiles(id),
    author_name TEXT,
    author_company TEXT,

    -- Attachments
    attachments JSONB DEFAULT '[]',

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- RFI Distribution (Who needs to be notified)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rfi_distribution (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfi_id UUID NOT NULL REFERENCES public.rfis(id) ON DELETE CASCADE,

    -- Recipient
    recipient_type TEXT NOT NULL, -- 'USER', 'EXTERNAL'
    user_id UUID REFERENCES public.user_profiles(id),
    external_name TEXT,
    external_email TEXT,
    external_company TEXT,

    -- Role in RFI
    role TEXT, -- 'REVIEWER', 'CC', 'ACTION_REQUIRED'

    -- Notification
    notified_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_rfi_distribution UNIQUE (rfi_id, user_id)
);

-- =============================================================================
-- RFI Templates (Common RFI patterns)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rfi_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Template Details
    name TEXT NOT NULL,
    category rfi_category NOT NULL,
    subject_template TEXT NOT NULL,
    question_template TEXT NOT NULL,

    -- Suggested Fields
    suggested_priority rfi_priority,
    typical_response_days INTEGER,

    -- Usage
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- RFI Log Settings (Per project configuration)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.rfi_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Numbering
    number_prefix TEXT DEFAULT 'RFI',
    next_number INTEGER DEFAULT 1,

    -- Default Settings
    default_response_days INTEGER DEFAULT 7,
    auto_notify_on_submit BOOLEAN DEFAULT TRUE,
    auto_notify_on_response BOOLEAN DEFAULT TRUE,

    -- Distribution Lists
    default_distribution JSONB DEFAULT '[]',
    owner_contacts JSONB DEFAULT '[]',
    architect_contacts JSONB DEFAULT '[]',
    engineer_contacts JSONB DEFAULT '[]',

    -- Escalation
    escalation_enabled BOOLEAN DEFAULT TRUE,
    escalation_days INTEGER DEFAULT 3,
    escalation_contacts JSONB DEFAULT '[]',

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_rfi_settings UNIQUE (project_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_rfis_project ON public.rfis(project_id);
CREATE INDEX IF NOT EXISTS idx_rfis_status ON public.rfis(status);
CREATE INDEX IF NOT EXISTS idx_rfis_priority ON public.rfis(priority);
CREATE INDEX IF NOT EXISTS idx_rfis_category ON public.rfis(category);
CREATE INDEX IF NOT EXISTS idx_rfis_spec_section ON public.rfis(spec_section);
CREATE INDEX IF NOT EXISTS idx_rfi_attachments_rfi ON public.rfi_attachments(rfi_id);
CREATE INDEX IF NOT EXISTS idx_rfi_comments_rfi ON public.rfi_comments(rfi_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.rfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_distribution ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfi_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "rfis_org_access" ON public.rfis
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "rfi_attachments_access" ON public.rfi_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.rfis r
            WHERE r.id = rfi_id
            AND r.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "rfi_comments_access" ON public.rfi_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.rfis r
            WHERE r.id = rfi_id
            AND r.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "rfi_distribution_access" ON public.rfi_distribution
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.rfis r
            WHERE r.id = rfi_id
            AND r.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "rfi_templates_org_access" ON public.rfi_templates
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "rfi_settings_access" ON public.rfi_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND p.organization_id = public.get_user_organization_id()
        )
    );

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Generate RFI number
CREATE OR REPLACE FUNCTION public.generate_rfi_number(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix TEXT;
    v_next_num INTEGER;
BEGIN
    -- Get or create settings
    INSERT INTO public.rfi_settings (project_id)
    VALUES (p_project_id)
    ON CONFLICT (project_id) DO NOTHING;

    -- Get settings and increment
    UPDATE public.rfi_settings
    SET next_number = next_number + 1
    WHERE project_id = p_project_id
    RETURNING number_prefix, next_number - 1 INTO v_prefix, v_next_num;

    RETURN v_prefix || '-' || LPAD(v_next_num::TEXT, 4, '0');
END;
$$;

-- Calculate RFI response time
CREATE OR REPLACE FUNCTION public.get_rfi_response_time(p_rfi_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_submitted TIMESTAMPTZ;
    v_responded TIMESTAMPTZ;
BEGIN
    SELECT submitted_at, responded_at INTO v_submitted, v_responded
    FROM public.rfis WHERE id = p_rfi_id;

    IF v_submitted IS NULL THEN RETURN NULL; END IF;
    IF v_responded IS NULL THEN
        RETURN EXTRACT(DAY FROM (NOW() - v_submitted))::INTEGER;
    END IF;

    RETURN EXTRACT(DAY FROM (v_responded - v_submitted))::INTEGER;
END;
$$;

-- Update RFI status and ball-in-court on response
CREATE OR REPLACE FUNCTION public.update_rfi_on_response()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.response IS NOT NULL AND OLD.response IS NULL THEN
        NEW.status := 'RESPONDED';
        NEW.responded_at := NOW();
        NEW.ball_in_court := 'CONTRACTOR';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER rfis_on_response
    BEFORE UPDATE ON public.rfis
    FOR EACH ROW EXECUTE FUNCTION public.update_rfi_on_response();

-- =============================================================================
-- Views
-- =============================================================================

-- Open RFIs
CREATE OR REPLACE VIEW public.v_open_rfis AS
SELECT
    r.id,
    r.rfi_number,
    r.subject,
    r.category,
    r.priority,
    r.status,
    r.ball_in_court,
    r.submitted_at,
    r.response_required_by,
    r.spec_section,
    p.project_number,
    p.name AS project_name,
    public.get_rfi_response_time(r.id) AS days_open,
    CASE
        WHEN r.response_required_by < CURRENT_DATE AND r.status NOT IN ('RESPONDED', 'CLOSED') THEN TRUE
        ELSE FALSE
    END AS is_overdue
FROM public.rfis r
JOIN public.projects p ON r.project_id = p.id
WHERE r.status NOT IN ('CLOSED', 'VOID')
ORDER BY
    CASE r.priority
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5
    END,
    r.submitted_at ASC;

-- RFI Log (Full listing)
CREATE OR REPLACE VIEW public.v_rfi_log AS
SELECT
    r.id,
    r.rfi_number,
    r.subject,
    r.category,
    r.priority,
    r.status,
    r.spec_section,
    r.drawing_reference,
    r.submitted_at,
    r.response_required_by,
    r.responded_at,
    r.closed_at,
    r.schedule_impact,
    r.cost_impact,
    p.project_number,
    p.name AS project_name,
    up.first_name || ' ' || up.last_name AS created_by_name,
    public.get_rfi_response_time(r.id) AS response_days
FROM public.rfis r
JOIN public.projects p ON r.project_id = p.id
LEFT JOIN public.user_profiles up ON r.created_by = up.id
ORDER BY r.rfi_number;

-- RFI Statistics by Project
CREATE OR REPLACE VIEW public.v_project_rfi_stats AS
SELECT
    p.id AS project_id,
    p.project_number,
    p.name AS project_name,
    COUNT(*) AS total_rfis,
    COUNT(*) FILTER (WHERE r.status NOT IN ('CLOSED', 'VOID')) AS open_rfis,
    COUNT(*) FILTER (WHERE r.status = 'CLOSED') AS closed_rfis,
    COUNT(*) FILTER (WHERE r.response_required_by < CURRENT_DATE AND r.status NOT IN ('RESPONDED', 'CLOSED', 'VOID')) AS overdue_rfis,
    COUNT(*) FILTER (WHERE r.priority = 'CRITICAL') AS critical_rfis,
    COUNT(*) FILTER (WHERE r.schedule_impact = TRUE) AS schedule_impacting,
    COUNT(*) FILTER (WHERE r.cost_impact = TRUE) AS cost_impacting,
    ROUND(AVG(EXTRACT(DAY FROM (COALESCE(r.responded_at, NOW()) - r.submitted_at)))::NUMERIC, 1) AS avg_response_days
FROM public.projects p
LEFT JOIN public.rfis r ON p.id = r.project_id
WHERE p.status = 'ACTIVE'
GROUP BY p.id, p.project_number, p.name;

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE TRIGGER rfis_updated_at
    BEFORE UPDATE ON public.rfis
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER rfi_templates_updated_at
    BEFORE UPDATE ON public.rfi_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit logging
CREATE TRIGGER rfis_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.rfis
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER rfi_comments_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.rfi_comments
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

COMMENT ON TABLE public.rfis IS 'Requests for Information (RFIs)';
COMMENT ON TABLE public.rfi_attachments IS 'Documents attached to RFIs';
COMMENT ON TABLE public.rfi_comments IS 'Discussion thread on RFIs';
COMMENT ON TABLE public.rfi_templates IS 'Reusable RFI question templates';
