-- =============================================================================
-- Migration 076: AASHTOWare CRL Export
-- Contractor Reported Lines (CRL) export functionality for WVDOH
-- =============================================================================
-- CRL is the contractor's quantity report submitted to WVDOH
-- Must match AASHTOWare Project format for import
-- =============================================================================

-- ============================================================================
-- PART 0: CLEANUP
-- ============================================================================

DROP VIEW IF EXISTS public.v_crl_export_ready CASCADE;
DROP TABLE IF EXISTS public.crl_export_history CASCADE;
DROP TABLE IF EXISTS public.crl_submissions CASCADE;
DROP TABLE IF EXISTS public.crl_line_items CASCADE;

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.crl_status AS ENUM (
        'DRAFT',
        'PENDING_REVIEW',
        'APPROVED',
        'SUBMITTED',
        'ACCEPTED',
        'REJECTED',
        'REVISED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.crl_export_format AS ENUM (
        'AASHTOWARE_XML',
        'AASHTOWARE_CSV',
        'PDF_REPORT'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: CRL SUBMISSIONS
-- ============================================================================
-- Header record for each CRL submission to WVDOH

CREATE TABLE public.crl_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Link to pay period (optional - CRL may be submitted before pay estimate)
    pay_period_id UUID REFERENCES public.pay_periods(id) ON DELETE SET NULL,

    -- CRL identifiers
    crl_number INTEGER NOT NULL,            -- Sequential per project
    submission_period_start DATE NOT NULL,
    submission_period_end DATE NOT NULL,

    -- Contract reference (from project)
    contract_number TEXT NOT NULL,
    federal_aid_number TEXT,

    -- Status workflow
    status crl_status DEFAULT 'DRAFT',

    -- Review/approval
    prepared_by UUID REFERENCES auth.users(id),
    prepared_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,

    -- Submission to WVDOH
    submitted_to_wvdoh_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES auth.users(id),
    wvdoh_confirmation_number TEXT,
    wvdoh_response_date DATE,
    wvdoh_response_status TEXT,             -- ACCEPTED, REJECTED, PARTIAL

    -- Rejection handling
    rejection_reason TEXT,
    revision_of UUID REFERENCES public.crl_submissions(id),

    -- Totals (calculated)
    total_line_items INTEGER DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(project_id, crl_number)
);

-- ============================================================================
-- PART 3: CRL LINE ITEMS
-- ============================================================================
-- Individual quantity reports by bid item

CREATE TABLE public.crl_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crl_submission_id UUID NOT NULL REFERENCES public.crl_submissions(id) ON DELETE CASCADE,

    -- Item identification (AASHTOWare format)
    line_number INTEGER NOT NULL,           -- Sequential within CRL
    item_number TEXT NOT NULL,              -- WVDOH item code
    description TEXT NOT NULL,
    unit TEXT NOT NULL,

    -- Contract quantities
    contract_qty NUMERIC(15,3),             -- Original contract quantity
    previous_qty NUMERIC(15,3) NOT NULL,    -- Qty reported in prior CLRs
    current_qty NUMERIC(15,3) NOT NULL,     -- Qty being reported this CRL
    total_to_date_qty NUMERIC(15,3) GENERATED ALWAYS AS (previous_qty + current_qty) STORED,

    -- Pricing
    unit_price NUMERIC(12,4) NOT NULL,
    current_amount NUMERIC(15,2) GENERATED ALWAYS AS (current_qty * unit_price) STORED,
    total_to_date_amount NUMERIC(15,2) GENERATED ALWAYS AS ((previous_qty + current_qty) * unit_price) STORED,

    -- Location/station (optional - for linear items)
    begin_station TEXT,
    end_station TEXT,
    location_description TEXT,

    -- Source of quantity
    source_type TEXT,                       -- 'DAILY_REPORT', 'MANUAL', 'SURVEY', 'TICKET'
    source_reference_id UUID,               -- Link to source record
    source_date DATE,

    -- Overrun flag
    is_overrun BOOLEAN GENERATED ALWAYS AS (
        contract_qty IS NOT NULL AND (previous_qty + current_qty) > contract_qty
    ) STORED,
    overrun_qty NUMERIC(15,3) GENERATED ALWAYS AS (
        CASE WHEN contract_qty IS NOT NULL AND (previous_qty + current_qty) > contract_qty
            THEN (previous_qty + current_qty) - contract_qty
            ELSE 0
        END
    ) STORED,

    -- Validation
    is_validated BOOLEAN DEFAULT false,
    validation_notes TEXT,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(crl_submission_id, line_number)
);

-- ============================================================================
-- PART 4: CRL EXPORT HISTORY
-- ============================================================================
-- Track all exports generated from CRL submissions

CREATE TABLE public.crl_export_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crl_submission_id UUID NOT NULL REFERENCES public.crl_submissions(id) ON DELETE CASCADE,

    -- Export details
    export_format crl_export_format NOT NULL,
    export_timestamp TIMESTAMPTZ DEFAULT now(),
    exported_by UUID REFERENCES auth.users(id),

    -- File storage
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,                -- Storage bucket path
    file_size_bytes INTEGER,

    -- Validation
    validation_passed BOOLEAN DEFAULT true,
    validation_errors JSONB,

    -- Download tracking
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,
    last_downloaded_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PART 5: TRIGGERS
-- ============================================================================

-- Auto-generate CRL number
CREATE OR REPLACE FUNCTION public.generate_crl_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.crl_number IS NULL THEN
        SELECT COALESCE(MAX(crl_number), 0) + 1
        INTO NEW.crl_number
        FROM public.crl_submissions
        WHERE project_id = NEW.project_id;
    END IF;

    -- Copy contract number from project
    SELECT contract_number, federal_aid_number
    INTO NEW.contract_number, NEW.federal_aid_number
    FROM public.projects
    WHERE id = NEW.project_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_crl_number
    BEFORE INSERT ON public.crl_submissions
    FOR EACH ROW EXECUTE FUNCTION public.generate_crl_number();

-- Update CRL totals when line items change
CREATE OR REPLACE FUNCTION public.update_crl_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_submission_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_submission_id := OLD.crl_submission_id;
    ELSE
        v_submission_id := NEW.crl_submission_id;
    END IF;

    UPDATE public.crl_submissions
    SET
        total_line_items = (
            SELECT COUNT(*) FROM public.crl_line_items
            WHERE crl_submission_id = v_submission_id
        ),
        total_amount = (
            SELECT COALESCE(SUM(current_qty * unit_price), 0)
            FROM public.crl_line_items
            WHERE crl_submission_id = v_submission_id
        ),
        updated_at = now()
    WHERE id = v_submission_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_crl_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.crl_line_items
    FOR EACH ROW EXECUTE FUNCTION public.update_crl_totals();

-- ============================================================================
-- PART 6: CRL GENERATION FUNCTION
-- ============================================================================
-- Generate CRL from daily reports for a date range

CREATE OR REPLACE FUNCTION public.generate_crl_from_daily_reports(
    p_project_id UUID,
    p_start_date DATE,
    p_end_date DATE,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_crl_id UUID;
    v_org_id UUID;
    v_line_num INTEGER := 0;
BEGIN
    -- Get organization
    SELECT organization_id INTO v_org_id
    FROM public.projects
    WHERE id = p_project_id;

    -- Create CRL submission
    INSERT INTO public.crl_submissions (
        organization_id,
        project_id,
        submission_period_start,
        submission_period_end,
        status,
        prepared_by,
        prepared_at,
        created_by
    ) VALUES (
        v_org_id,
        p_project_id,
        p_start_date,
        p_end_date,
        'DRAFT',
        p_created_by,
        now(),
        p_created_by
    ) RETURNING id INTO v_crl_id;

    -- Generate line items from daily manpower entries
    -- (This aggregates quantities from daily reports by item number)
    INSERT INTO public.crl_line_items (
        crl_submission_id,
        line_number,
        item_number,
        description,
        unit,
        contract_qty,
        previous_qty,
        current_qty,
        unit_price,
        source_type
    )
    SELECT
        v_crl_id,
        ROW_NUMBER() OVER (ORDER BY pli.item_number),
        pli.item_number,
        pli.description,
        pli.unit,
        pli.plan_qty,
        COALESCE(pli.previous_qty, 0),
        COALESCE(SUM(CASE
            WHEN dr.report_date BETWEEN p_start_date AND p_end_date
            THEN pli.this_estimate_qty
            ELSE 0
        END), 0),
        pli.unit_price,
        'DAILY_REPORT'
    FROM public.pay_period_line_items pli
    JOIN public.pay_periods pp ON pli.pay_period_id = pp.id
    LEFT JOIN public.daily_reports dr ON dr.project_id = pp.project_id
        AND dr.report_date BETWEEN p_start_date AND p_end_date
        AND dr.status = 'APPROVED'
    WHERE pp.project_id = p_project_id
    GROUP BY pli.item_number, pli.description, pli.unit, pli.plan_qty,
             pli.previous_qty, pli.unit_price
    HAVING SUM(CASE
        WHEN dr.report_date BETWEEN p_start_date AND p_end_date
        THEN pli.this_estimate_qty
        ELSE 0
    END) > 0;

    RETURN v_crl_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 7: EXPORT FUNCTIONS
-- ============================================================================

-- Generate AASHTOWare-compatible XML export
CREATE OR REPLACE FUNCTION public.generate_crl_xml(p_crl_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_xml TEXT;
    v_submission RECORD;
    v_project RECORD;
BEGIN
    -- Get submission and project details
    SELECT cs.*, p.name as project_name, p.contract_number, p.federal_aid_number,
           o.name as contractor_name
    INTO v_submission
    FROM public.crl_submissions cs
    JOIN public.projects p ON cs.project_id = p.id
    JOIN public.organizations o ON cs.organization_id = o.id
    WHERE cs.id = p_crl_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Build XML header
    v_xml := '<?xml version="1.0" encoding="UTF-8"?>' || E'\n';
    v_xml := v_xml || '<ContractorReportedLines xmlns="http://www.aashtoware.org/project">' || E'\n';
    v_xml := v_xml || '  <Header>' || E'\n';
    v_xml := v_xml || '    <ContractNumber>' || v_submission.contract_number || '</ContractNumber>' || E'\n';
    v_xml := v_xml || '    <FederalAidNumber>' || COALESCE(v_submission.federal_aid_number, '') || '</FederalAidNumber>' || E'\n';
    v_xml := v_xml || '    <ContractorName>' || v_submission.contractor_name || '</ContractorName>' || E'\n';
    v_xml := v_xml || '    <ReportNumber>' || v_submission.crl_number || '</ReportNumber>' || E'\n';
    v_xml := v_xml || '    <PeriodStart>' || v_submission.submission_period_start || '</PeriodStart>' || E'\n';
    v_xml := v_xml || '    <PeriodEnd>' || v_submission.submission_period_end || '</PeriodEnd>' || E'\n';
    v_xml := v_xml || '    <TotalAmount>' || v_submission.total_amount || '</TotalAmount>' || E'\n';
    v_xml := v_xml || '  </Header>' || E'\n';
    v_xml := v_xml || '  <LineItems>' || E'\n';

    -- Add line items
    FOR v_project IN
        SELECT *
        FROM public.crl_line_items
        WHERE crl_submission_id = p_crl_id
        ORDER BY line_number
    LOOP
        v_xml := v_xml || '    <LineItem>' || E'\n';
        v_xml := v_xml || '      <LineNumber>' || v_project.line_number || '</LineNumber>' || E'\n';
        v_xml := v_xml || '      <ItemNumber>' || v_project.item_number || '</ItemNumber>' || E'\n';
        v_xml := v_xml || '      <Description>' || v_project.description || '</Description>' || E'\n';
        v_xml := v_xml || '      <Unit>' || v_project.unit || '</Unit>' || E'\n';
        v_xml := v_xml || '      <UnitPrice>' || v_project.unit_price || '</UnitPrice>' || E'\n';
        v_xml := v_xml || '      <ContractQty>' || COALESCE(v_project.contract_qty::text, '') || '</ContractQty>' || E'\n';
        v_xml := v_xml || '      <PreviousQty>' || v_project.previous_qty || '</PreviousQty>' || E'\n';
        v_xml := v_xml || '      <CurrentQty>' || v_project.current_qty || '</CurrentQty>' || E'\n';
        v_xml := v_xml || '      <TotalToDateQty>' || v_project.total_to_date_qty || '</TotalToDateQty>' || E'\n';
        v_xml := v_xml || '      <CurrentAmount>' || v_project.current_amount || '</CurrentAmount>' || E'\n';
        v_xml := v_xml || '      <TotalToDateAmount>' || v_project.total_to_date_amount || '</TotalToDateAmount>' || E'\n';
        IF v_project.begin_station IS NOT NULL THEN
            v_xml := v_xml || '      <BeginStation>' || v_project.begin_station || '</BeginStation>' || E'\n';
        END IF;
        IF v_project.end_station IS NOT NULL THEN
            v_xml := v_xml || '      <EndStation>' || v_project.end_station || '</EndStation>' || E'\n';
        END IF;
        v_xml := v_xml || '    </LineItem>' || E'\n';
    END LOOP;

    v_xml := v_xml || '  </LineItems>' || E'\n';
    v_xml := v_xml || '</ContractorReportedLines>';

    RETURN v_xml;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 8: VIEW FOR EXPORT-READY CRLs
-- ============================================================================

CREATE VIEW public.v_crl_export_ready AS
SELECT
    cs.id as crl_id,
    cs.organization_id,
    cs.project_id,
    p.name as project_name,
    p.contract_number,
    cs.crl_number,
    cs.submission_period_start,
    cs.submission_period_end,
    cs.status,
    cs.total_line_items,
    cs.total_amount,
    cs.prepared_at,
    u_prep.email as prepared_by_email,
    cs.approved_at,
    u_appr.email as approved_by_email,
    cs.submitted_to_wvdoh_at,
    cs.wvdoh_confirmation_number,

    -- Export status
    (SELECT COUNT(*) FROM public.crl_export_history
     WHERE crl_submission_id = cs.id) as export_count,
    (SELECT MAX(export_timestamp) FROM public.crl_export_history
     WHERE crl_submission_id = cs.id) as last_exported_at,

    -- Overrun summary
    (SELECT COUNT(*) FROM public.crl_line_items
     WHERE crl_submission_id = cs.id AND is_overrun = true) as overrun_items_count,
    (SELECT COALESCE(SUM(overrun_qty * unit_price), 0) FROM public.crl_line_items
     WHERE crl_submission_id = cs.id AND is_overrun = true) as overrun_amount

FROM public.crl_submissions cs
JOIN public.projects p ON cs.project_id = p.id
LEFT JOIN auth.users u_prep ON cs.prepared_by = u_prep.id
LEFT JOIN auth.users u_appr ON cs.approved_by = u_appr.id;

-- ============================================================================
-- PART 9: RLS POLICIES
-- ============================================================================

ALTER TABLE public.crl_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crl_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crl_export_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "crl_submissions_org_access" ON public.crl_submissions
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "crl_line_items_access" ON public.crl_line_items
    FOR ALL TO authenticated
    USING (
        crl_submission_id IN (
            SELECT id FROM public.crl_submissions
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "crl_export_history_access" ON public.crl_export_history
    FOR ALL TO authenticated
    USING (
        crl_submission_id IN (
            SELECT id FROM public.crl_submissions
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- PART 10: INDEXES
-- ============================================================================

CREATE INDEX idx_crl_submissions_project ON public.crl_submissions(project_id);
CREATE INDEX idx_crl_submissions_status ON public.crl_submissions(status);
CREATE INDEX idx_crl_submissions_period ON public.crl_submissions(submission_period_start, submission_period_end);

CREATE INDEX idx_crl_line_items_submission ON public.crl_line_items(crl_submission_id);
CREATE INDEX idx_crl_line_items_item ON public.crl_line_items(item_number);

CREATE INDEX idx_crl_export_history_submission ON public.crl_export_history(crl_submission_id);

-- ============================================================================
-- PART 11: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.crl_submissions IS 'Contractor Reported Lines submissions to WVDOH';
COMMENT ON TABLE public.crl_line_items IS 'Individual line items in CRL submissions';
COMMENT ON TABLE public.crl_export_history IS 'History of CRL exports in various formats';
COMMENT ON FUNCTION public.generate_crl_xml IS 'Generate AASHTOWare-compatible XML from CRL';
COMMENT ON FUNCTION public.generate_crl_from_daily_reports IS 'Auto-generate CRL from approved daily reports';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 076: AASHTOWare CRL Export completed successfully' as status;
