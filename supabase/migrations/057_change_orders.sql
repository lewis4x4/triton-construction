-- =============================================================================
-- Migration 057: Change Order Tracking
-- Per CLAUDE.md Roadmap Phase 2: Migration 011
-- =============================================================================

-- Change Order Status
DO $$ BEGIN
    CREATE TYPE public.change_order_status AS ENUM (
        'DRAFT',
        'PENDING_INTERNAL_REVIEW',
        'INTERNAL_APPROVED',
        'SUBMITTED_TO_OWNER',
        'UNDER_NEGOTIATION',
        'OWNER_APPROVED',
        'EXECUTED',
        'REJECTED',
        'VOID',
        'WITHDRAWN'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Change Order Type
DO $$ BEGIN
    CREATE TYPE public.change_order_type AS ENUM (
        'OWNER_INITIATED',
        'CONTRACTOR_INITIATED',
        'DESIGN_CHANGE',
        'UNFORESEEN_CONDITIONS',
        'VALUE_ENGINEERING',
        'REGULATORY_REQUIREMENT',
        'FORCE_MAJEURE',
        'CORRECTION',
        'DEDUCTIVE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Potential Change Order Status
DO $$ BEGIN
    CREATE TYPE public.pco_status AS ENUM (
        'IDENTIFIED',
        'PRICING',
        'PRICED',
        'SUBMITTED',
        'APPROVED',
        'REJECTED',
        'INCORPORATED',
        'VOID'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- Change Order Requests (CORs) / Potential Change Orders (PCOs)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.change_order_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- PCO/COR Details
    cor_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Type and Reason
    change_type change_order_type NOT NULL,
    reason TEXT,

    -- Originator
    originated_by TEXT, -- 'OWNER', 'CONTRACTOR', 'DESIGNER', 'SUBCONTRACTOR'
    origination_date DATE NOT NULL,

    -- Related Documents
    related_rfi_id UUID,
    spec_section TEXT,
    drawing_reference TEXT,

    -- Pricing
    estimated_cost DECIMAL(15, 2),
    estimated_time_impact_days INTEGER DEFAULT 0,

    -- Actual Pricing (after detailed estimate)
    priced_cost DECIMAL(15, 2),
    priced_time_days INTEGER DEFAULT 0,
    pricing_submitted_at TIMESTAMPTZ,
    pricing_expires_at DATE,

    -- Supporting Documents
    backup_documents JSONB DEFAULT '[]',

    -- Status
    status pco_status NOT NULL DEFAULT 'IDENTIFIED',

    -- Incorporated into Change Order
    change_order_id UUID, -- Will reference change_orders table

    -- Notes
    internal_notes TEXT,
    owner_comments TEXT,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_cor_number UNIQUE (project_id, cor_number)
);

-- =============================================================================
-- Change Orders (Approved/Executed Changes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.change_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Change Order Details
    change_order_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Type
    change_type change_order_type NOT NULL,

    -- Financial Impact
    original_contract_value DECIMAL(15, 2) NOT NULL,
    previous_changes_total DECIMAL(15, 2) DEFAULT 0,
    this_change_amount DECIMAL(15, 2) NOT NULL,
    new_contract_value DECIMAL(15, 2) NOT NULL,

    -- Time Impact
    original_completion_date DATE,
    previous_time_extensions INTEGER DEFAULT 0,
    this_time_extension INTEGER DEFAULT 0,
    new_completion_date DATE,

    -- Cost Breakdown
    labor_cost DECIMAL(15, 2) DEFAULT 0,
    material_cost DECIMAL(15, 2) DEFAULT 0,
    equipment_cost DECIMAL(15, 2) DEFAULT 0,
    subcontractor_cost DECIMAL(15, 2) DEFAULT 0,
    overhead_percentage DECIMAL(5, 2) DEFAULT 0,
    overhead_amount DECIMAL(15, 2) DEFAULT 0,
    profit_percentage DECIMAL(5, 2) DEFAULT 0,
    profit_amount DECIMAL(15, 2) DEFAULT 0,
    bond_cost DECIMAL(15, 2) DEFAULT 0,

    -- Status
    status change_order_status NOT NULL DEFAULT 'DRAFT',

    -- Approval Chain
    internal_approved_by UUID REFERENCES public.user_profiles(id),
    internal_approved_at TIMESTAMPTZ,
    submitted_to_owner_at TIMESTAMPTZ,
    owner_approved_at TIMESTAMPTZ,
    owner_signature_name TEXT,
    executed_at TIMESTAMPTZ,

    -- Document
    document_id UUID REFERENCES public.documents(id),
    signed_document_url TEXT,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_co_number UNIQUE (project_id, change_order_number)
);

-- =============================================================================
-- Change Order Line Items (Detailed breakdown)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.change_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_order_id UUID NOT NULL REFERENCES public.change_orders(id) ON DELETE CASCADE,

    -- Item Details
    item_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    cost_code TEXT,

    -- Source
    cor_id UUID REFERENCES public.change_order_requests(id),

    -- Quantities
    quantity DECIMAL(15, 4),
    unit TEXT,
    unit_price DECIMAL(15, 4),

    -- Amounts
    amount DECIMAL(15, 2) NOT NULL,

    -- Time Impact
    time_impact_days INTEGER DEFAULT 0,

    -- Notes
    notes TEXT,

    -- Sort
    sort_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_co_item UNIQUE (change_order_id, item_number)
);

-- =============================================================================
-- Change Order Pricing History (Negotiation tracking)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.change_order_pricing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_order_id UUID REFERENCES public.change_orders(id) ON DELETE CASCADE,
    cor_id UUID REFERENCES public.change_order_requests(id) ON DELETE CASCADE,

    -- Pricing Round
    round_number INTEGER NOT NULL,
    submitted_by TEXT, -- 'CONTRACTOR', 'OWNER'
    submitted_at TIMESTAMPTZ DEFAULT NOW(),

    -- Amounts
    proposed_amount DECIMAL(15, 2) NOT NULL,
    proposed_time_days INTEGER DEFAULT 0,

    -- Response
    response TEXT, -- 'ACCEPTED', 'COUNTER', 'REJECTED'
    counter_amount DECIMAL(15, 2),
    counter_time_days INTEGER,
    response_notes TEXT,
    responded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Time Extension Requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.time_extension_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Request Details
    request_number TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,

    -- Reason
    reason TEXT NOT NULL, -- 'WEATHER', 'OWNER_DELAY', 'DESIGN_CHANGE', 'UNFORESEEN', 'OTHER'
    affected_activities TEXT,

    -- Dates
    delay_start_date DATE NOT NULL,
    delay_end_date DATE,
    days_requested INTEGER NOT NULL,

    -- Supporting Documentation
    daily_report_ids UUID[],
    weather_data JSONB,
    supporting_documents JSONB DEFAULT '[]',

    -- Status
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'PARTIALLY_APPROVED', 'DENIED'
    days_granted INTEGER,

    -- Related Change Order
    change_order_id UUID REFERENCES public.change_orders(id),

    -- Review
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Audit
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_ter_number UNIQUE (project_id, request_number)
);

-- =============================================================================
-- Contract Value History (Audit trail)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.contract_value_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Change Reference
    change_order_id UUID REFERENCES public.change_orders(id),

    -- Before/After
    previous_value DECIMAL(15, 2) NOT NULL,
    change_amount DECIMAL(15, 2) NOT NULL,
    new_value DECIMAL(15, 2) NOT NULL,

    previous_completion_date DATE,
    time_change_days INTEGER,
    new_completion_date DATE,

    -- Effective
    effective_date DATE NOT NULL,
    change_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_change_order_requests_project ON public.change_order_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_change_order_requests_status ON public.change_order_requests(status);
CREATE INDEX IF NOT EXISTS idx_change_orders_project ON public.change_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_change_orders_status ON public.change_orders(status);
CREATE INDEX IF NOT EXISTS idx_change_order_items_co ON public.change_order_items(change_order_id);
CREATE INDEX IF NOT EXISTS idx_time_extension_requests_project ON public.time_extension_requests(project_id);

-- =============================================================================
-- Row Level Security
-- =============================================================================
ALTER TABLE public.change_order_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.change_order_pricing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_extension_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_value_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "change_order_requests_org_access" ON public.change_order_requests
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "change_orders_org_access" ON public.change_orders
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "change_order_items_access" ON public.change_order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.change_orders co
            WHERE co.id = change_order_id
            AND co.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "change_order_pricing_history_access" ON public.change_order_pricing_history
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.change_orders co
            WHERE co.id = change_order_id
            AND co.organization_id = public.get_user_organization_id()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.change_order_requests cor
            WHERE cor.id = cor_id
            AND cor.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "time_extension_requests_org_access" ON public.time_extension_requests
    FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "contract_value_history_access" ON public.contract_value_history
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

-- Generate COR number
CREATE OR REPLACE FUNCTION public.generate_cor_number(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_project_number TEXT;
    v_seq INTEGER;
BEGIN
    SELECT project_number INTO v_project_number
    FROM public.projects WHERE id = p_project_id;

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(cor_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1 INTO v_seq
    FROM public.change_order_requests
    WHERE project_id = p_project_id;

    RETURN v_project_number || '-COR-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

-- Generate Change Order number
CREATE OR REPLACE FUNCTION public.generate_change_order_number(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_project_number TEXT;
    v_seq INTEGER;
BEGIN
    SELECT project_number INTO v_project_number
    FROM public.projects WHERE id = p_project_id;

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(change_order_number FROM '[0-9]+$') AS INTEGER)
    ), 0) + 1 INTO v_seq
    FROM public.change_orders
    WHERE project_id = p_project_id;

    RETURN v_project_number || '-CO-' || LPAD(v_seq::TEXT, 3, '0');
END;
$$;

-- Update project contract value when CO is executed
CREATE OR REPLACE FUNCTION public.update_project_on_co_execution()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'EXECUTED' AND (OLD.status IS NULL OR OLD.status != 'EXECUTED') THEN
        -- Record history
        INSERT INTO public.contract_value_history (
            project_id, change_order_id,
            previous_value, change_amount, new_value,
            previous_completion_date, time_change_days, new_completion_date,
            effective_date, change_reason
        )
        SELECT
            NEW.project_id,
            NEW.id,
            p.current_contract_value,
            NEW.this_change_amount,
            NEW.new_contract_value,
            p.current_completion_date,
            NEW.this_time_extension,
            NEW.new_completion_date,
            CURRENT_DATE,
            NEW.title
        FROM public.projects p WHERE p.id = NEW.project_id;

        -- Update project
        UPDATE public.projects
        SET
            current_contract_value = NEW.new_contract_value,
            current_completion_date = NEW.new_completion_date
        WHERE id = NEW.project_id;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER change_orders_executed
    AFTER UPDATE ON public.change_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_project_on_co_execution();

-- =============================================================================
-- Views
-- =============================================================================

-- Pending CORs/PCOs
CREATE OR REPLACE VIEW public.v_pending_cors AS
SELECT
    cor.id,
    cor.cor_number,
    cor.title,
    cor.change_type,
    cor.originated_by,
    cor.origination_date,
    cor.estimated_cost,
    cor.priced_cost,
    cor.status,
    p.project_number,
    p.name AS project_name,
    CURRENT_DATE - cor.origination_date AS days_open
FROM public.change_order_requests cor
JOIN public.projects p ON cor.project_id = p.id
WHERE cor.status NOT IN ('INCORPORATED', 'VOID', 'REJECTED')
ORDER BY cor.origination_date ASC;

-- Change Order Summary by Project
CREATE OR REPLACE VIEW public.v_project_change_order_summary AS
SELECT
    p.id AS project_id,
    p.project_number,
    p.name AS project_name,
    p.original_contract_value,
    p.current_contract_value,
    p.current_contract_value - p.original_contract_value AS total_changes,
    CASE WHEN p.original_contract_value > 0 THEN
        ROUND(((p.current_contract_value - p.original_contract_value) / p.original_contract_value) * 100, 2)
    ELSE 0 END AS change_percentage,
    (SELECT COUNT(*) FROM public.change_orders WHERE project_id = p.id AND status = 'EXECUTED') AS executed_cos,
    (SELECT COUNT(*) FROM public.change_order_requests WHERE project_id = p.id AND status NOT IN ('INCORPORATED', 'VOID', 'REJECTED')) AS pending_cors,
    (SELECT COALESCE(SUM(priced_cost), 0) FROM public.change_order_requests WHERE project_id = p.id AND status NOT IN ('INCORPORATED', 'VOID', 'REJECTED')) AS pending_value
FROM public.projects p
WHERE p.status = 'ACTIVE';

-- Change Order Log
CREATE OR REPLACE VIEW public.v_change_order_log AS
SELECT
    co.id,
    co.change_order_number,
    co.title,
    co.change_type,
    co.this_change_amount,
    co.this_time_extension,
    co.status,
    co.executed_at,
    p.project_number,
    p.name AS project_name
FROM public.change_orders co
JOIN public.projects p ON co.project_id = p.id
ORDER BY co.change_order_number;

-- =============================================================================
-- Triggers
-- =============================================================================

CREATE TRIGGER change_order_requests_updated_at
    BEFORE UPDATE ON public.change_order_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER change_orders_updated_at
    BEFORE UPDATE ON public.change_orders
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER time_extension_requests_updated_at
    BEFORE UPDATE ON public.time_extension_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit logging
CREATE TRIGGER change_order_requests_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.change_order_requests
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER change_orders_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.change_orders
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER time_extension_requests_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.time_extension_requests
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

COMMENT ON TABLE public.change_order_requests IS 'Potential change orders (PCOs) and change order requests (CORs)';
COMMENT ON TABLE public.change_orders IS 'Approved and executed change orders';
COMMENT ON TABLE public.time_extension_requests IS 'Contract time extension requests';
COMMENT ON TABLE public.contract_value_history IS 'Audit trail of contract value changes';
