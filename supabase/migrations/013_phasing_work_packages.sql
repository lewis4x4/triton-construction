-- ============================================================================
-- MIGRATION 013: PHASING & WORK PACKAGES
-- Triton AI Bid Package Engine - MOT, Phasing, and Work Package Organization
-- ============================================================================

-- ============================================================================
-- MOT_PHASING_SUMMARIES TABLE
-- Store AI-generated MOT and phasing analysis
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_mot_phasing_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Overall MOT Strategy
    mot_strategy_summary TEXT NOT NULL,
    traffic_control_type TEXT,  -- 'FLAGGING', 'SIGNALS', 'DETOUR', 'LANE_CLOSURE', 'FULL_CLOSURE'

    -- Number of Phases
    total_phases INTEGER,

    -- Key Restrictions
    time_of_day_restrictions TEXT,
    day_of_week_restrictions TEXT,
    holiday_restrictions TEXT,
    seasonal_restrictions TEXT,

    -- Access Assessment
    access_summary TEXT,
    staging_area_notes TEXT,
    material_delivery_constraints TEXT,

    -- Temporary Works
    temporary_structures_required TEXT,
    temporary_drainage_required TEXT,
    temporary_pavement_required TEXT,

    -- Equipment Constraints
    equipment_constraints TEXT,
    crane_setup_notes TEXT,

    -- Source References
    source_document_ids UUID[],
    source_sheet_numbers TEXT,

    -- AI Metadata
    ai_generated BOOLEAN DEFAULT TRUE,
    ai_confidence NUMERIC(5, 2),

    -- Human Review
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES public.user_profiles(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT one_mot_summary_per_project UNIQUE (bid_project_id)
);

-- Enable RLS
ALTER TABLE public.bid_mot_phasing_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid mot summaries" ON public.bid_mot_phasing_summaries;
CREATE POLICY "Users see bid mot summaries" ON public.bid_mot_phasing_summaries
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_mot_summaries_updated_at ON public.bid_mot_phasing_summaries;
CREATE TRIGGER bid_mot_summaries_updated_at
    BEFORE UPDATE ON public.bid_mot_phasing_summaries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- CONSTRUCTION_PHASES TABLE
-- Individual phase details within MOT plan
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_construction_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    summary_id UUID NOT NULL REFERENCES public.bid_mot_phasing_summaries(id) ON DELETE CASCADE,
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Phase Identification
    phase_number INTEGER NOT NULL,
    phase_name TEXT NOT NULL,

    -- Description
    description TEXT NOT NULL,
    work_included TEXT,

    -- Duration
    estimated_duration_days INTEGER,

    -- Traffic Configuration
    traffic_configuration TEXT,
    traffic_notes TEXT,

    -- Structure Relationship
    structure_id UUID REFERENCES public.bid_bridge_structures(id),

    -- Sequence
    prerequisites TEXT,
    enables TEXT,

    -- Source
    source_sheet_numbers TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_phase_number_per_summary UNIQUE (summary_id, phase_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_phases_summary ON public.bid_construction_phases(summary_id);
CREATE INDEX IF NOT EXISTS idx_bid_phases_project ON public.bid_construction_phases(bid_project_id);

-- Enable RLS
ALTER TABLE public.bid_construction_phases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid construction phases" ON public.bid_construction_phases;
CREATE POLICY "Users see bid construction phases" ON public.bid_construction_phases
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- WORK_PACKAGES TABLE
-- Logical groupings of line items for estimating workflow
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_work_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Package Identification
    package_number INTEGER NOT NULL,
    package_name TEXT NOT NULL,
    package_code TEXT,

    -- Description
    description TEXT,

    -- Categorization
    work_category work_category_enum,

    -- Structure Association (if applicable)
    structure_id UUID REFERENCES public.bid_bridge_structures(id),

    -- Estimator Assignment
    assigned_estimator_id UUID REFERENCES public.user_profiles(id),

    -- Status
    status TEXT DEFAULT 'PENDING',  -- 'PENDING', 'IN_PROGRESS', 'COMPLETE', 'REVIEWED'

    -- Summary Totals (calculated)
    total_items INTEGER DEFAULT 0,

    -- Display Order
    sort_order INTEGER DEFAULT 0,

    -- AI vs Manual
    ai_generated BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_package_per_bid_project UNIQUE (bid_project_id, package_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_work_packages_project ON public.bid_work_packages(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_work_packages_category ON public.bid_work_packages(work_category);
CREATE INDEX IF NOT EXISTS idx_bid_work_packages_estimator ON public.bid_work_packages(assigned_estimator_id);

-- Enable RLS
ALTER TABLE public.bid_work_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid work packages" ON public.bid_work_packages;
CREATE POLICY "Users see bid work packages" ON public.bid_work_packages
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_work_packages_updated_at ON public.bid_work_packages;
CREATE TRIGGER bid_work_packages_updated_at
    BEFORE UPDATE ON public.bid_work_packages
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- WORK_PACKAGE_ITEMS TABLE
-- Link line items to work packages
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_work_package_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    work_package_id UUID NOT NULL REFERENCES public.bid_work_packages(id) ON DELETE CASCADE,
    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,

    -- Position within package
    sort_order INTEGER DEFAULT 0,

    -- Override tracking
    ai_suggested_package_id UUID REFERENCES public.bid_work_packages(id),
    manually_assigned BOOLEAN DEFAULT FALSE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each line item can only be in one package
    CONSTRAINT unique_item_in_package UNIQUE (line_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_wp_items_package ON public.bid_work_package_items(work_package_id);
CREATE INDEX IF NOT EXISTS idx_bid_wp_items_item ON public.bid_work_package_items(line_item_id);

-- Enable RLS
ALTER TABLE public.bid_work_package_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see bid work package items" ON public.bid_work_package_items;
CREATE POLICY "Users see bid work package items" ON public.bid_work_package_items
    FOR ALL USING (
        work_package_id IN (
            SELECT bwp.id FROM public.bid_work_packages bwp
            JOIN public.bid_projects bp ON bwp.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- WORK_PACKAGE_TEMPLATES TABLE
-- Predefined work package structures for common project types
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_work_package_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template Info
    template_name TEXT NOT NULL,
    project_type TEXT NOT NULL,  -- 'BRIDGE', 'HIGHWAY', 'CULVERT', 'INTERSECTION'
    description TEXT,

    -- Template Structure (JSON)
    package_structure JSONB NOT NULL,
    /*
    Example:
    [
        {"name": "Mobilization & General", "category": "MOBILIZATION", "sort_order": 1},
        {"name": "Bridge Demolition", "category": "DEMOLITION", "sort_order": 2},
        {"name": "Substructure", "category": "SUBSTRUCTURE", "sort_order": 3},
        ...
    ]
    */

    -- Item Assignment Rules (JSON)
    assignment_rules JSONB,
    /*
    Example:
    {
        "MOBILIZATION": {"item_patterns": ["^901", "^636"]},
        "DEMOLITION": {"item_patterns": ["^202", "^203"], "keywords": ["removal", "demolition"]},
        ...
    }
    */

    -- Usage
    is_default BOOLEAN DEFAULT FALSE,
    organization_id UUID REFERENCES public.organizations(id),  -- NULL = global template

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bid_wp_templates_type ON public.bid_work_package_templates(project_type);
CREATE INDEX IF NOT EXISTS idx_bid_wp_templates_org ON public.bid_work_package_templates(organization_id);

-- Enable RLS
ALTER TABLE public.bid_work_package_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see work package templates" ON public.bid_work_package_templates;
CREATE POLICY "Users see work package templates" ON public.bid_work_package_templates
    FOR SELECT USING (
        organization_id IS NULL OR
        organization_id = public.get_user_organization_id(auth.uid())
    );

DROP POLICY IF EXISTS "Users manage own org templates" ON public.bid_work_package_templates;
CREATE POLICY "Users manage own org templates" ON public.bid_work_package_templates
    FOR ALL USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_wp_templates_updated_at ON public.bid_work_package_templates;
CREATE TRIGGER bid_wp_templates_updated_at
    BEFORE UPDATE ON public.bid_work_package_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- HELPER FUNCTION: Update work package item counts
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_work_package_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the work package total_items count
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.bid_work_packages
        SET total_items = (
            SELECT COUNT(*) FROM public.bid_work_package_items
            WHERE work_package_id = NEW.work_package_id
        )
        WHERE id = NEW.work_package_id;
    END IF;

    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        UPDATE public.bid_work_packages
        SET total_items = (
            SELECT COUNT(*) FROM public.bid_work_package_items
            WHERE work_package_id = OLD.work_package_id
        )
        WHERE id = OLD.work_package_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update work package totals
DROP TRIGGER IF EXISTS update_wp_totals ON public.bid_work_package_items;
CREATE TRIGGER update_wp_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.bid_work_package_items
    FOR EACH ROW EXECUTE FUNCTION public.update_work_package_totals();

-- ============================================================================
-- HELPER VIEW: v_bid_work_packages_with_items
-- ============================================================================

CREATE OR REPLACE VIEW public.v_bid_work_packages_with_items AS
SELECT
    bwp.id,
    bwp.bid_project_id,
    bwp.package_number,
    bwp.package_name,
    bwp.package_code,
    bwp.work_category,
    bwp.status,
    bwp.assigned_estimator_id,
    up.first_name || ' ' || up.last_name AS estimator_name,
    bwp.total_items,
    bwp.sort_order,
    bwp.ai_generated,
    COALESCE(
        (SELECT jsonb_agg(
            jsonb_build_object(
                'id', bli.id,
                'line_number', bli.line_number,
                'item_number', bli.item_number,
                'description', bli.short_description,
                'quantity', bli.quantity,
                'unit', bli.unit,
                'risk_level', bli.risk_level
            ) ORDER BY bwpi.sort_order, bli.line_number
        )
        FROM public.bid_work_package_items bwpi
        JOIN public.bid_line_items bli ON bwpi.line_item_id = bli.id
        WHERE bwpi.work_package_id = bwp.id
        ), '[]'::jsonb
    ) AS items
FROM public.bid_work_packages bwp
LEFT JOIN public.user_profiles up ON bwp.assigned_estimator_id = up.id;

-- ============================================================================
-- SEED DATA: Default Work Package Templates
-- ============================================================================

INSERT INTO public.bid_work_package_templates (template_name, project_type, description, package_structure, assignment_rules, is_default)
VALUES
    (
        'Bridge Replacement - Standard',
        'BRIDGE',
        'Standard work package structure for bridge replacement projects',
        '[
            {"name": "Mobilization & General Conditions", "category": "MOBILIZATION", "sort_order": 1},
            {"name": "Demolition", "category": "DEMOLITION", "sort_order": 2},
            {"name": "Earthwork", "category": "EARTHWORK", "sort_order": 3},
            {"name": "Drainage", "category": "DRAINAGE", "sort_order": 4},
            {"name": "Substructure", "category": "SUBSTRUCTURE", "sort_order": 5},
            {"name": "Superstructure", "category": "SUPERSTRUCTURE", "sort_order": 6},
            {"name": "Deck", "category": "DECK", "sort_order": 7},
            {"name": "Approach Slabs", "category": "APPROACH_SLABS", "sort_order": 8},
            {"name": "Pavement", "category": "PAVEMENT", "sort_order": 9},
            {"name": "Guardrail & Barrier", "category": "GUARDRAIL_BARRIER", "sort_order": 10},
            {"name": "Signing & Striping", "category": "SIGNING_STRIPING", "sort_order": 11},
            {"name": "MOT", "category": "MOT", "sort_order": 12},
            {"name": "Environmental", "category": "ENVIRONMENTAL", "sort_order": 13},
            {"name": "Utilities", "category": "UTILITIES", "sort_order": 14}
        ]'::jsonb,
        '{
            "MOBILIZATION": {"item_patterns": ["^901", "^636", "^637"]},
            "DEMOLITION": {"item_patterns": ["^202", "^203"], "keywords": ["removal", "demolition", "salvage"]},
            "EARTHWORK": {"item_patterns": ["^203", "^206", "^207"], "keywords": ["excavation", "embankment", "backfill"]},
            "DRAINAGE": {"item_patterns": ["^601", "^602", "^603"], "keywords": ["pipe", "inlet", "manhole", "culvert"]},
            "SUBSTRUCTURE": {"item_patterns": ["^501", "^502", "^503"], "keywords": ["abutment", "pier", "footing", "pile"]},
            "SUPERSTRUCTURE": {"item_patterns": ["^504", "^505", "^506"], "keywords": ["beam", "girder", "bearing"]},
            "DECK": {"item_patterns": ["^507", "^508"], "keywords": ["deck", "overlay", "membrane"]},
            "MOT": {"item_patterns": ["^636", "^637", "^638"], "keywords": ["traffic", "sign", "barricade", "flagger"]}
        }'::jsonb,
        TRUE
    ),
    (
        'Highway Resurfacing',
        'HIGHWAY',
        'Standard work package structure for highway resurfacing projects',
        '[
            {"name": "Mobilization & General Conditions", "category": "MOBILIZATION", "sort_order": 1},
            {"name": "Milling & Patching", "category": "DEMOLITION", "sort_order": 2},
            {"name": "Paving", "category": "PAVEMENT", "sort_order": 3},
            {"name": "Drainage Repairs", "category": "DRAINAGE", "sort_order": 4},
            {"name": "Guardrail & Barrier", "category": "GUARDRAIL_BARRIER", "sort_order": 5},
            {"name": "Signing & Striping", "category": "SIGNING_STRIPING", "sort_order": 6},
            {"name": "MOT", "category": "MOT", "sort_order": 7}
        ]'::jsonb,
        '{
            "MOBILIZATION": {"item_patterns": ["^901", "^636"]},
            "DEMOLITION": {"item_patterns": ["^402"], "keywords": ["milling", "patching", "removal"]},
            "PAVEMENT": {"item_patterns": ["^401", "^403", "^404"], "keywords": ["asphalt", "base", "surface"]},
            "MOT": {"item_patterns": ["^636", "^637", "^638"], "keywords": ["traffic", "sign", "barricade"]}
        }'::jsonb,
        TRUE
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.bid_mot_phasing_summaries IS 'MOT strategy and phasing overview for bid projects';
COMMENT ON TABLE public.bid_construction_phases IS 'Individual construction phases within a project';
COMMENT ON TABLE public.bid_work_packages IS 'Logical groupings of line items for estimating workflow';
COMMENT ON TABLE public.bid_work_package_items IS 'Links line items to work packages';
COMMENT ON TABLE public.bid_work_package_templates IS 'Reusable work package templates by project type';
