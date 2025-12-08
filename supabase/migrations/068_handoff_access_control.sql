-- =============================================================================
-- Migration 068: Handoff & Access Control Tables
-- Pay Estimate + Bid Integration Module - Phase 2
-- =============================================================================
-- Per UNIFIED_MODULE_SPECIFICATION V7.0
-- Creates: Access enums, project_handoffs, project_assignments,
--          estimating_notes, co_opportunities, bid_issues, v_cost_detail_report
-- =============================================================================
-- NOTE: This migration is designed to work independently of bid_projects/bid_items.
--       FK constraints to those tables are added conditionally at the end.
-- =============================================================================

-- ============================================================================
-- PART 0: CLEANUP FROM PREVIOUS PARTIAL RUNS
-- ============================================================================
-- DROP in reverse dependency order to avoid FK issues
-- This handles cases where previous runs left incomplete table structures
-- Note: DROP TABLE CASCADE automatically drops triggers, so no explicit DROP TRIGGER needed

DROP VIEW IF EXISTS public.v_cost_detail_report CASCADE;
DROP TABLE IF EXISTS public.bid_issues CASCADE;
DROP TABLE IF EXISTS public.co_opportunities CASCADE;
DROP TABLE IF EXISTS public.estimating_notes CASCADE;
DROP TABLE IF EXISTS public.project_assignments CASCADE;
DROP TABLE IF EXISTS public.project_handoffs CASCADE;

-- Note: Enums are preserved with DO $$ ... EXCEPTION pattern below
-- ============================================================================

-- ============================================================================
-- PART 1: HANDOFF & ACCESS ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.project_role AS ENUM (
        'VP_OPERATIONS',
        'PROJECT_MANAGER',
        'GENERAL_SUPERINTENDENT',
        'PROJECT_ENGINEER',
        'JOB_SUPERINTENDENT',
        'FOREMAN',
        'FIELD_ENGINEER',
        'ESTIMATOR',
        'CONTROLLER',
        'ADMIN'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.handoff_status AS ENUM (
        'PENDING_VP_ASSIGNMENT',
        'TEAM_ASSIGNED',
        'HANDOFF_SCHEDULED',
        'HANDOFF_COMPLETE',
        'IN_EXECUTION'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.access_level AS ENUM (
        'FULL',        -- All cost data, notes, opportunities (includes financial data)
        'CONDENSED',   -- Quantities, manhours, CDR (NO financial data)
        'READ_ONLY',
        'NONE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.note_type AS ENUM (
        'ASSUMPTION',
        'RISK',
        'OPPORTUNITY',
        'CONFLICT',
        'GENERAL'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.issue_type AS ENUM (
        'SPEC_CONFLICT',
        'PLAN_ERROR',
        'QUANTITY_CONCERN',
        'ACCESS',
        'UTILITY',
        'ENVIRONMENTAL',
        'SCHEDULING',
        'OTHER'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.co_opportunity_status AS ENUM (
        'IDENTIFIED',
        'PURSUING',
        'SUBMITTED',
        'APPROVED',
        'DENIED',
        'WITHDRAWN'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: PROJECT_HANDOFFS — Bid to Execution Transition
-- ============================================================================
-- NOTE: bid_project_id FK is added conditionally at end of migration

CREATE TABLE IF NOT EXISTS public.project_handoffs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    bid_project_id UUID,  -- FK added conditionally below

    status public.handoff_status DEFAULT 'PENDING_VP_ASSIGNMENT',

    -- VP Assignment
    assigned_vp_id UUID REFERENCES auth.users(id),
    vp_assigned_at TIMESTAMPTZ,
    region TEXT,                                -- 'Region 1' (Jason Hunter) or 'Region 2' (Bruce Dunlap)

    -- Management Team
    pm_id UUID REFERENCES auth.users(id),
    general_super_id UUID REFERENCES auth.users(id),
    pe_id UUID REFERENCES auth.users(id),
    team_assigned_at TIMESTAMPTZ,

    -- Handoff Meeting
    handoff_meeting_date TIMESTAMPTZ,
    handoff_meeting_location TEXT,
    handoff_meeting_notes TEXT,
    handoff_completed_at TIMESTAMPTZ,

    -- Estimator Reference
    lead_estimator_id UUID REFERENCES auth.users(id),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),

    CONSTRAINT unique_project_handoff UNIQUE(project_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_handoffs_org ON public.project_handoffs(organization_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_project ON public.project_handoffs(project_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_status ON public.project_handoffs(status);
CREATE INDEX IF NOT EXISTS idx_handoffs_pm ON public.project_handoffs(pm_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_vp ON public.project_handoffs(assigned_vp_id);

-- ============================================================================
-- PART 3: PROJECT_ASSIGNMENTS — Role-Based Access
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.project_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    project_role public.project_role NOT NULL,
    access_level public.access_level,

    -- Assignment Details
    assigned_by UUID REFERENCES auth.users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    ends_at TIMESTAMPTZ,

    is_primary BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_project_assignment UNIQUE(project_id, user_id, project_role)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pa_org ON public.project_assignments(organization_id);
CREATE INDEX IF NOT EXISTS idx_pa_project ON public.project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_pa_user ON public.project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_pa_role ON public.project_assignments(project_role);
CREATE INDEX IF NOT EXISTS idx_pa_active ON public.project_assignments(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- PART 4: ESTIMATING_NOTES — Passed to Management Team
-- ============================================================================
-- NOTE: bid_project_id and bid_item_id FKs are added conditionally at end

CREATE TABLE IF NOT EXISTS public.estimating_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bid_project_id UUID,  -- FK added conditionally below
    bid_item_id UUID,     -- FK added conditionally below

    -- Note Details
    note_type public.note_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority TEXT DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

    -- Visibility
    visible_to_field BOOLEAN DEFAULT FALSE,

    -- Reference
    spec_section TEXT,
    plan_sheet TEXT,

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_en_org ON public.estimating_notes(organization_id);
CREATE INDEX IF NOT EXISTS idx_en_bid ON public.estimating_notes(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_en_type ON public.estimating_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_en_field_visible ON public.estimating_notes(visible_to_field) WHERE visible_to_field = TRUE;

-- ============================================================================
-- PART 5: CO_OPPORTUNITIES — Change Order Opportunities from Bid
-- ============================================================================
-- NOTE: bid_project_id FK is added conditionally at end

CREATE TABLE IF NOT EXISTS public.co_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bid_project_id UUID,  -- FK added conditionally below
    project_id UUID REFERENCES public.projects(id),

    -- Opportunity Details
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    estimated_value_low NUMERIC(18,2),
    estimated_value_high NUMERIC(18,2),

    -- Reference
    spec_reference TEXT,
    plan_sheet_reference TEXT,
    bid_item_ids UUID[],

    -- Tracked through execution
    status public.co_opportunity_status DEFAULT 'IDENTIFIED',
    actual_value NUMERIC(18,2),
    change_order_id UUID,

    -- Visibility
    visible_to_field BOOLEAN DEFAULT FALSE,

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_co_org ON public.co_opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_co_bid ON public.co_opportunities(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_co_project ON public.co_opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_co_status ON public.co_opportunities(status);

-- ============================================================================
-- PART 6: BID_ISSUES — Issues/Conflicts from Bid Phase
-- ============================================================================
-- NOTE: bid_project_id FK is added conditionally at end

CREATE TABLE IF NOT EXISTS public.bid_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bid_project_id UUID,  -- FK added conditionally below
    project_id UUID REFERENCES public.projects(id),

    -- Issue Details
    issue_type public.issue_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'MEDIUM' CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

    -- Reference
    spec_section TEXT,
    plan_sheet TEXT,
    bid_item_ids UUID[],

    -- Status
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX', 'DEFERRED')),
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),

    -- Visibility
    visible_to_field BOOLEAN DEFAULT FALSE,

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bi_org ON public.bid_issues(organization_id);
CREATE INDEX IF NOT EXISTS idx_bi_bid ON public.bid_issues(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bi_project ON public.bid_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_bi_type ON public.bid_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_bi_status ON public.bid_issues(status);
CREATE INDEX IF NOT EXISTS idx_bi_severity ON public.bid_issues(severity);

-- ============================================================================
-- PART 7: TRIGGERS
-- ============================================================================

-- Auto-set access level based on role
CREATE OR REPLACE FUNCTION public.set_default_access_level()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.access_level IS NULL THEN
        NEW.access_level := CASE NEW.project_role
            WHEN 'VP_OPERATIONS' THEN 'FULL'
            WHEN 'PROJECT_MANAGER' THEN 'FULL'
            WHEN 'GENERAL_SUPERINTENDENT' THEN 'FULL'
            WHEN 'PROJECT_ENGINEER' THEN 'FULL'
            WHEN 'JOB_SUPERINTENDENT' THEN 'CONDENSED'
            WHEN 'FOREMAN' THEN 'CONDENSED'
            WHEN 'FIELD_ENGINEER' THEN 'CONDENSED'
            WHEN 'ESTIMATOR' THEN 'FULL'
            WHEN 'CONTROLLER' THEN 'FULL'
            WHEN 'ADMIN' THEN 'FULL'
            ELSE 'READ_ONLY'
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_default_access ON public.project_assignments;
CREATE TRIGGER trg_default_access
    BEFORE INSERT ON public.project_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_default_access_level();

-- Update timestamps
CREATE TRIGGER project_handoffs_updated_at
    BEFORE UPDATE ON public.project_handoffs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER project_assignments_updated_at
    BEFORE UPDATE ON public.project_assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER estimating_notes_updated_at
    BEFORE UPDATE ON public.estimating_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER co_opportunities_updated_at
    BEFORE UPDATE ON public.co_opportunities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER bid_issues_updated_at
    BEFORE UPDATE ON public.bid_issues
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- PART 8: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.project_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimating_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.co_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bid_issues ENABLE ROW LEVEL SECURITY;

-- project_handoffs policies
CREATE POLICY "handoffs_select" ON public.project_handoffs FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "handoffs_insert" ON public.project_handoffs FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "handoffs_update" ON public.project_handoffs FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- project_assignments policies
CREATE POLICY "pa_select" ON public.project_assignments FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "pa_insert" ON public.project_assignments FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "pa_update" ON public.project_assignments FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- estimating_notes policies
CREATE POLICY "en_select" ON public.estimating_notes FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "en_insert" ON public.estimating_notes FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "en_update" ON public.estimating_notes FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- co_opportunities policies
CREATE POLICY "co_select" ON public.co_opportunities FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "co_insert" ON public.co_opportunities FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "co_update" ON public.co_opportunities FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- bid_issues policies
CREATE POLICY "bi_select" ON public.bid_issues FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "bi_insert" ON public.bid_issues FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "bi_update" ON public.bid_issues FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 9: HELPER FUNCTIONS
-- ============================================================================

-- Check if user has FULL access to a project
CREATE OR REPLACE FUNCTION public.user_has_full_access(p_user_id UUID, p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.project_assignments
        WHERE user_id = p_user_id
        AND project_id = p_project_id
        AND access_level = 'FULL'
        AND is_active = TRUE
        AND (ends_at IS NULL OR ends_at > NOW())
    );
END;
$$;

-- Get user's access level for a project
CREATE OR REPLACE FUNCTION public.get_user_project_access_level(p_user_id UUID, p_project_id UUID)
RETURNS public.access_level
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_access public.access_level;
BEGIN
    SELECT access_level INTO v_access
    FROM public.project_assignments
    WHERE user_id = p_user_id
    AND project_id = p_project_id
    AND is_active = TRUE
    AND (ends_at IS NULL OR ends_at > NOW())
    ORDER BY
        CASE access_level
            WHEN 'FULL' THEN 1
            WHEN 'CONDENSED' THEN 2
            WHEN 'READ_ONLY' THEN 3
            ELSE 4
        END
    LIMIT 1;

    RETURN COALESCE(v_access, 'NONE');
END;
$$;

-- ============================================================================
-- PART 10: VIEW — Cost Detail Report (CDR) for Field Team
-- ============================================================================

-- Note: This view provides CONDENSED access - quantities and manhours only, NO $$$
-- It works independently of bid_items table

CREATE OR REPLACE VIEW public.v_cost_detail_report AS
SELECT
    p.id as project_id,
    p.organization_id,
    p.name as project_name,
    p.project_number,
    p.status as project_status,
    p.percent_complete,
    p.current_working_days,
    p.working_days_used,
    -- Placeholder fields for future bid_items integration
    NULL::TEXT as item_number,
    NULL::TEXT as description,
    NULL::TEXT as unit,
    0::NUMERIC as bid_quantity,
    NULL::TEXT as category,
    -- NO DOLLAR AMOUNTS IN THIS VIEW - Field team sees quantities only
    0::NUMERIC as estimated_manhours,
    NULL::TEXT as equipment_list,
    0::INTEGER as material_types
FROM public.projects p
WHERE p.status IN ('ACTIVE', 'MOBILIZATION', 'PUNCH_LIST');

COMMENT ON VIEW public.v_cost_detail_report IS
    'Cost Detail Report for field team - quantities and manhours only, NO dollar amounts. CONDENSED access level. Will be enhanced when bid_items is populated.';

-- ============================================================================
-- PART 11: CONDITIONAL FK CONSTRAINTS (only added if tables exist)
-- ============================================================================

-- Add FK to bid_projects if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bid_projects') THEN
        -- project_handoffs.bid_project_id
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'project_handoffs_bid_project_id_fkey'
        ) THEN
            ALTER TABLE public.project_handoffs
            ADD CONSTRAINT project_handoffs_bid_project_id_fkey
            FOREIGN KEY (bid_project_id) REFERENCES public.bid_projects(id);
        END IF;

        -- estimating_notes.bid_project_id
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'estimating_notes_bid_project_id_fkey'
        ) THEN
            ALTER TABLE public.estimating_notes
            ADD CONSTRAINT estimating_notes_bid_project_id_fkey
            FOREIGN KEY (bid_project_id) REFERENCES public.bid_projects(id) ON DELETE CASCADE;
        END IF;

        -- co_opportunities.bid_project_id
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'co_opportunities_bid_project_id_fkey'
        ) THEN
            ALTER TABLE public.co_opportunities
            ADD CONSTRAINT co_opportunities_bid_project_id_fkey
            FOREIGN KEY (bid_project_id) REFERENCES public.bid_projects(id) ON DELETE CASCADE;
        END IF;

        -- bid_issues.bid_project_id
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'bid_issues_bid_project_id_fkey'
        ) THEN
            ALTER TABLE public.bid_issues
            ADD CONSTRAINT bid_issues_bid_project_id_fkey
            FOREIGN KEY (bid_project_id) REFERENCES public.bid_projects(id) ON DELETE CASCADE;
        END IF;

        RAISE NOTICE 'Added FK constraints to bid_projects';
    ELSE
        RAISE NOTICE 'bid_projects table not found - FK constraints will be added later';
    END IF;
END $$;

-- Add FK to bid_items if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bid_items') THEN
        -- estimating_notes.bid_item_id
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'estimating_notes_bid_item_id_fkey'
        ) THEN
            ALTER TABLE public.estimating_notes
            ADD CONSTRAINT estimating_notes_bid_item_id_fkey
            FOREIGN KEY (bid_item_id) REFERENCES public.bid_items(id) ON DELETE SET NULL;
        END IF;

        RAISE NOTICE 'Added FK constraint to bid_items';
    ELSE
        RAISE NOTICE 'bid_items table not found - FK constraint will be added later';
    END IF;
END $$;

-- ============================================================================
-- PART 12: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.project_handoffs IS 'Bid to execution handoff workflow with VP assignment and team configuration';
COMMENT ON TABLE public.project_assignments IS 'Role-based project access with FULL vs CONDENSED data visibility';
COMMENT ON TABLE public.estimating_notes IS 'Estimator notes (assumptions, risks) passed to management team';
COMMENT ON TABLE public.co_opportunities IS 'Change order opportunities identified during bid phase';
COMMENT ON TABLE public.bid_issues IS 'Spec conflicts and issues identified during bid phase';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 068: Handoff & Access Control completed successfully' as status;
