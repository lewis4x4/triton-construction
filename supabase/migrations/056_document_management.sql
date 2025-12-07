-- =============================================================================
-- Migration 056: Document Management
-- Per CLAUDE.md Roadmap Phase 2: Migration 010
-- =============================================================================

-- Document Type
DO $$ BEGIN
    CREATE TYPE public.document_type AS ENUM (
        'CONTRACT',
        'SPECIFICATION',
        'DRAWING',
        'SUBMITTAL',
        'TRANSMITTAL',
        'CORRESPONDENCE',
        'MEETING_MINUTES',
        'INSPECTION_REPORT',
        'TEST_REPORT',
        'PERMIT',
        'INSURANCE_CERTIFICATE',
        'BOND',
        'LIEN_WAIVER',
        'INVOICE',
        'CHANGE_ORDER',
        'RFI',
        'DAILY_REPORT',
        'PHOTO',
        'SAFETY_DOCUMENT',
        'TRAINING_RECORD',
        'CERTIFIED_PAYROLL',
        'DBE_REPORT',
        'CLOSEOUT',
        'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Document Status
DO $$ BEGIN
    CREATE TYPE public.document_status AS ENUM (
        'DRAFT',
        'PENDING_REVIEW',
        'UNDER_REVIEW',
        'APPROVED',
        'REJECTED',
        'SUPERSEDED',
        'VOID',
        'ARCHIVED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Submittal Status
DO $$ BEGIN
    CREATE TYPE public.submittal_status AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'UNDER_REVIEW',
        'APPROVED',
        'APPROVED_AS_NOTED',
        'REVISE_AND_RESUBMIT',
        'REJECTED',
        'FOR_RECORD_ONLY',
        'VOID'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Document Folders (Virtual folder structure)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.document_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Folder Details
    name TEXT NOT NULL,
    description TEXT,
    parent_folder_id UUID REFERENCES public.document_folders(id),
    path TEXT NOT NULL, -- Full path like /Contract Documents/Specifications

    -- Folder Type
    folder_type TEXT, -- 'CONTRACT', 'SUBMITTALS', 'RFI', 'DAILY_REPORTS', etc.
    is_system_folder BOOLEAN DEFAULT FALSE,

    -- Access Control
    restricted BOOLEAN DEFAULT FALSE,
    allowed_roles TEXT[],

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Documents
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    folder_id UUID REFERENCES public.document_folders(id),

    -- Document Details
    document_number TEXT,
    title TEXT NOT NULL,
    description TEXT,
    document_type document_type NOT NULL,

    -- File Information
    file_name TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    file_size_bytes BIGINT,
    mime_type TEXT,
    storage_path TEXT NOT NULL,
    storage_bucket TEXT NOT NULL DEFAULT 'documents',

    -- Versioning
    version INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT TRUE,
    previous_version_id UUID REFERENCES public.documents(id),

    -- Status
    status document_status NOT NULL DEFAULT 'DRAFT',

    -- Metadata
    tags TEXT[],
    spec_section TEXT,
    drawing_number TEXT,

    -- External References
    related_rfi_id UUID,
    related_submittal_id UUID,
    related_change_order_id UUID,

    -- Dates
    document_date DATE,
    received_date DATE,
    due_date DATE,

    -- Approval
    approved_by UUID REFERENCES public.user_profiles(id),
    approved_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Document Access Log (Who viewed/downloaded)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.document_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    access_type TEXT NOT NULL, -- 'VIEW', 'DOWNLOAD', 'PRINT', 'SHARE'
    accessed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- =============================================================================
-- Submittals
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.submittals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Submittal Details
    submittal_number TEXT NOT NULL,
    revision_number INTEGER DEFAULT 0,
    title TEXT NOT NULL,
    description TEXT,

    -- Specification Reference
    spec_section TEXT NOT NULL,
    spec_section_title TEXT,

    -- Type
    submittal_type TEXT NOT NULL, -- 'SHOP_DRAWING', 'PRODUCT_DATA', 'SAMPLE', 'MOCK_UP', 'DESIGN_DATA'

    -- Subcontractor
    subcontractor_id UUID REFERENCES public.subcontractors(id),
    subcontract_id UUID REFERENCES public.subcontract_agreements(id),

    -- Schedule
    required_date DATE,
    submitted_date DATE,
    required_on_site_date DATE,

    -- Status
    status submittal_status NOT NULL DEFAULT 'DRAFT',

    -- Review
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_comments TEXT,
    review_days INTEGER,

    -- Resubmittal tracking
    original_submittal_id UUID REFERENCES public.submittals(id),
    resubmittal_count INTEGER DEFAULT 0,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_submittal_number UNIQUE (project_id, submittal_number, revision_number)
);

-- =============================================================================
-- Submittal Attachments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.submittal_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submittal_id UUID NOT NULL REFERENCES public.submittals(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    attachment_type TEXT, -- 'SUBMITTAL', 'RESPONSE', 'MARKED_UP'
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Transmittals
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.transmittals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Transmittal Details
    transmittal_number TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT,

    -- Recipients
    to_company TEXT NOT NULL,
    to_contact TEXT NOT NULL,
    to_email TEXT,
    cc_contacts JSONB DEFAULT '[]',

    -- Sender
    from_user_id UUID REFERENCES public.user_profiles(id),

    -- Delivery
    sent_via TEXT, -- 'EMAIL', 'MAIL', 'HAND_DELIVERY', 'COURIER'
    sent_at TIMESTAMPTZ,
    tracking_number TEXT,

    -- Response Required
    response_required BOOLEAN DEFAULT FALSE,
    response_due_date DATE,
    response_received BOOLEAN DEFAULT FALSE,
    response_received_at TIMESTAMPTZ,

    -- Action Required
    for_action TEXT, -- 'APPROVAL', 'REVIEW', 'INFORMATION', 'SIGNATURE', 'DISTRIBUTION'

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_transmittal_number UNIQUE (project_id, transmittal_number)
);

-- =============================================================================
-- Transmittal Items (Documents included in transmittal)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.transmittal_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transmittal_id UUID NOT NULL REFERENCES public.transmittals(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id),

    -- Item Details
    copies INTEGER DEFAULT 1,
    description TEXT NOT NULL,
    document_number TEXT,
    revision TEXT,

    -- Sort
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Meeting Minutes
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.meeting_minutes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Meeting Details
    meeting_number INTEGER NOT NULL,
    meeting_type TEXT NOT NULL, -- 'PROGRESS', 'SAFETY', 'PRECONSTRUCTION', 'CLOSEOUT', 'SPECIAL'
    meeting_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,

    -- Participants
    attendees JSONB DEFAULT '[]',
    absent JSONB DEFAULT '[]',
    distribution JSONB DEFAULT '[]',

    -- Content
    agenda TEXT,
    minutes_content TEXT,
    action_items JSONB DEFAULT '[]',

    -- Next Meeting
    next_meeting_date DATE,
    next_meeting_location TEXT,

    -- Document
    document_id UUID REFERENCES public.documents(id),

    -- Status
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'DISTRIBUTED', 'APPROVED'

    -- Audit
    prepared_by UUID REFERENCES public.user_profiles(id),
    approved_by UUID REFERENCES public.user_profiles(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_meeting_number UNIQUE (project_id, meeting_type, meeting_number)
);

-- =============================================================================
-- Document Reviews (Approval workflow)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.document_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,

    -- Review Request
    requested_by UUID REFERENCES public.user_profiles(id),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    due_date DATE,

    -- Reviewer
    reviewer_id UUID NOT NULL REFERENCES public.user_profiles(id),
    review_order INTEGER DEFAULT 1, -- For sequential reviews

    -- Response
    response TEXT, -- 'APPROVED', 'REJECTED', 'APPROVED_AS_NOTED', 'NEEDS_REVISION'
    comments TEXT,
    responded_at TIMESTAMPTZ,

    -- Status
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'SKIPPED'

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_documents_project ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_folder ON public.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_submittals_project ON public.submittals(project_id);
CREATE INDEX IF NOT EXISTS idx_submittals_status ON public.submittals(status);
CREATE INDEX IF NOT EXISTS idx_submittals_spec_section ON public.submittals(spec_section);
CREATE INDEX IF NOT EXISTS idx_transmittals_project ON public.transmittals(project_id);
CREATE INDEX IF NOT EXISTS idx_meeting_minutes_project ON public.meeting_minutes(project_id);
CREATE INDEX IF NOT EXISTS idx_document_access_log_document ON public.document_access_log(document_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submittal_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmittals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmittal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "document_folders_org_access" ON public.document_folders
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "documents_org_access" ON public.documents
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "document_access_log_access" ON public.document_access_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_id
            AND d.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "submittals_org_access" ON public.submittals
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "submittal_attachments_access" ON public.submittal_attachments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.submittals s
            WHERE s.id = submittal_id
            AND s.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "transmittals_org_access" ON public.transmittals
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "transmittal_items_access" ON public.transmittal_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.transmittals t
            WHERE t.id = transmittal_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "meeting_minutes_org_access" ON public.meeting_minutes
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "document_reviews_access" ON public.document_reviews
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.documents d
            WHERE d.id = document_id
            AND d.organization_id = public.get_user_organization_id()
        )
    );

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Generate document number
CREATE OR REPLACE FUNCTION public.generate_document_number(p_project_id UUID, p_doc_type document_type)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_project_number TEXT;
    v_prefix TEXT;
    v_seq INTEGER;
BEGIN
    SELECT project_number INTO v_project_number
    FROM public.projects WHERE id = p_project_id;

    v_prefix := CASE p_doc_type
        WHEN 'CONTRACT' THEN 'CON'
        WHEN 'SPECIFICATION' THEN 'SPEC'
        WHEN 'DRAWING' THEN 'DWG'
        WHEN 'SUBMITTAL' THEN 'SUB'
        WHEN 'TRANSMITTAL' THEN 'TRN'
        WHEN 'CORRESPONDENCE' THEN 'COR'
        WHEN 'RFI' THEN 'RFI'
        WHEN 'CHANGE_ORDER' THEN 'CO'
        ELSE 'DOC'
    END;

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(document_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1 INTO v_seq
    FROM public.documents
    WHERE project_id = p_project_id AND document_type = p_doc_type;

    RETURN v_project_number || '-' || v_prefix || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- Generate submittal number
CREATE OR REPLACE FUNCTION public.generate_submittal_number(p_project_id UUID, p_spec_section TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(submittal_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1 INTO v_seq
    FROM public.submittals
    WHERE project_id = p_project_id AND spec_section = p_spec_section;

    RETURN p_spec_section || '-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

-- Log document access
CREATE OR REPLACE FUNCTION public.log_document_access(
    p_document_id UUID,
    p_access_type TEXT,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO public.document_access_log (
        document_id, user_id, access_type, ip_address, user_agent
    ) VALUES (
        p_document_id, auth.uid(), p_access_type, p_ip_address, p_user_agent
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- =============================================================================
-- Views
-- =============================================================================

-- Recent Documents
CREATE OR REPLACE VIEW public.v_recent_documents AS
SELECT
    d.id,
    d.document_number,
    d.title,
    d.document_type,
    d.file_name,
    d.status,
    d.created_at,
    p.name AS project_name,
    up.first_name || ' ' || up.last_name AS uploaded_by
FROM public.documents d
LEFT JOIN public.projects p ON d.project_id = p.id
LEFT JOIN public.user_profiles up ON d.created_by = up.id
WHERE d.is_current_version = TRUE
ORDER BY d.created_at DESC
LIMIT 100;

-- Pending Submittals
CREATE OR REPLACE VIEW public.v_pending_submittals AS
SELECT
    s.id,
    s.submittal_number,
    s.title,
    s.spec_section,
    s.status,
    s.submitted_date,
    s.required_date,
    p.name AS project_name,
    sub.company_name AS subcontractor_name,
    CURRENT_DATE - s.submitted_date AS days_pending
FROM public.submittals s
JOIN public.projects p ON s.project_id = p.id
LEFT JOIN public.subcontractors sub ON s.subcontractor_id = sub.id
WHERE s.status IN ('SUBMITTED', 'UNDER_REVIEW')
ORDER BY s.submitted_date ASC;

-- Submittal Log (for tracking)
CREATE OR REPLACE VIEW public.v_submittal_log AS
SELECT
    s.id,
    s.submittal_number,
    s.revision_number,
    s.title,
    s.spec_section,
    s.spec_section_title,
    s.submittal_type,
    s.status,
    s.submitted_date,
    s.required_date,
    s.review_days,
    p.project_number,
    p.name AS project_name,
    sub.company_name AS subcontractor_name
FROM public.submittals s
JOIN public.projects p ON s.project_id = p.id
LEFT JOIN public.subcontractors sub ON s.subcontractor_id = sub.id
ORDER BY s.spec_section, s.submittal_number, s.revision_number;

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE TRIGGER documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER submittals_updated_at
    BEFORE UPDATE ON public.submittals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER transmittals_updated_at
    BEFORE UPDATE ON public.transmittals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER meeting_minutes_updated_at
    BEFORE UPDATE ON public.meeting_minutes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit logging
CREATE TRIGGER documents_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER submittals_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.submittals
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER transmittals_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.transmittals
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- =============================================================================
-- Calculate review days when submittal status changes
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_submittal_review_days()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IN ('APPROVED', 'APPROVED_AS_NOTED', 'REVISE_AND_RESUBMIT', 'REJECTED')
       AND OLD.status = 'UNDER_REVIEW'
       AND NEW.submitted_date IS NOT NULL
    THEN
        NEW.review_days := CURRENT_DATE - NEW.submitted_date;
        NEW.reviewed_at := NOW();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER submittals_review_days
    BEFORE UPDATE ON public.submittals
    FOR EACH ROW EXECUTE FUNCTION public.update_submittal_review_days();

COMMENT ON TABLE public.documents IS 'Central document repository with versioning';
COMMENT ON TABLE public.submittals IS 'Shop drawing and product data submittals';
COMMENT ON TABLE public.transmittals IS 'Document transmittals to external parties';
COMMENT ON TABLE public.meeting_minutes IS 'Project meeting minutes and action items';
