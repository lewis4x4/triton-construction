-- ============================================================================
-- MIGRATION 018: V4.1 ADDENDUM - ASSEMBLY TEMPLATES
-- Triton AI Bid Package Engine - Reusable recipes for building items
-- ============================================================================

-- ============================================================================
-- TABLE: bid_assembly_templates
-- Purpose: Reusable recipe to build one unit of a WVDOH item (or class of items)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_assembly_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization (can be global or org-specific)
    organization_id UUID REFERENCES public.organizations(id),  -- NULL = global template

    -- Template Identity
    name TEXT NOT NULL,                  -- e.g., "Bridge Deck – 8\" Slab, Steel Girders"
    code TEXT,                           -- Short code: "DECK-8-STL"
    description TEXT,

    -- WVDOH Item Mapping (optional)
    wvdoh_item_number TEXT,              -- Tied to standard item if applicable
    wvdoh_item_pattern TEXT,             -- Regex pattern for matching multiple items

    -- Categorization
    work_category work_category_enum NOT NULL,

    -- Default Estimation Settings
    default_estimation_method estimation_method_enum DEFAULT 'ASSEMBLY_BASED',

    -- Productivity Defaults
    default_productivity_unit TEXT,      -- e.g., "SF_PER_DAY", "CY_PER_HOUR"
    default_productivity_rate NUMERIC(12, 4),  -- e.g., 5000 SF/day

    -- Output Unit
    output_unit TEXT NOT NULL,           -- Unit this assembly produces (SF, CY, LF, etc.)
    output_description TEXT,             -- "One square foot of bridge deck"

    -- Conditions/Notes
    design_assumptions TEXT,             -- Design intent and limitations
    applicable_conditions TEXT,          -- When to use this template

    -- Calculated Totals (denormalized for quick display)
    total_labor_cost_per_unit NUMERIC(14, 4),
    total_equipment_cost_per_unit NUMERIC(14, 4),
    total_material_cost_per_unit NUMERIC(14, 4),
    total_sub_cost_per_unit NUMERIC(14, 4),
    total_cost_per_unit NUMERIC(14, 4),

    -- Versioning
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    superseded_by_id UUID REFERENCES public.bid_assembly_templates(id),

    -- Usage Stats
    times_used INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.user_profiles(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assembly_templates_org ON public.bid_assembly_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_assembly_templates_category ON public.bid_assembly_templates(work_category);
CREATE INDEX IF NOT EXISTS idx_assembly_templates_wvdoh ON public.bid_assembly_templates(wvdoh_item_number);
CREATE INDEX IF NOT EXISTS idx_assembly_templates_code ON public.bid_assembly_templates(code);
CREATE INDEX IF NOT EXISTS idx_assembly_templates_active ON public.bid_assembly_templates(is_active) WHERE is_active = TRUE;

-- Enable RLS
ALTER TABLE public.bid_assembly_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see global and own org templates" ON public.bid_assembly_templates;
CREATE POLICY "Users see global and own org templates" ON public.bid_assembly_templates
    FOR SELECT USING (
        organization_id IS NULL OR
        organization_id = public.get_user_organization_id(auth.uid())
    );

DROP POLICY IF EXISTS "Users manage own org templates" ON public.bid_assembly_templates;
CREATE POLICY "Users manage own org templates" ON public.bid_assembly_templates
    FOR ALL USING (
        organization_id = public.get_user_organization_id(auth.uid())
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_assembly_templates_updated_at ON public.bid_assembly_templates;
CREATE TRIGGER bid_assembly_templates_updated_at
    BEFORE UPDATE ON public.bid_assembly_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TABLE: bid_assembly_template_lines
-- Purpose: The line items inside an assembly (labor, equipment, materials, subs)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_assembly_template_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    assembly_template_id UUID NOT NULL REFERENCES public.bid_assembly_templates(id) ON DELETE CASCADE,

    -- Line Identification
    line_number INTEGER NOT NULL,
    resource_type assembly_resource_type_enum NOT NULL,

    -- Resource Reference
    resource_code TEXT,                  -- Links to cost code / resource library
    description TEXT NOT NULL,

    -- Quantity Calculation
    quantity_per_unit_output NUMERIC(14, 6) NOT NULL,  -- e.g., 0.1 equipment hours per SF
    unit_of_measure TEXT NOT NULL,       -- HOUR, TON, CY, EA, etc.

    -- Labor-Specific (if resource_type = LABOR)
    crew_role TEXT,                      -- e.g., "Carpenter", "Laborer"
    crew_size NUMERIC(4, 2),             -- Number of workers
    labor_class TEXT,                    -- Trade classification for prevailing wage

    -- Equipment-Specific (if resource_type = EQUIPMENT)
    equipment_class TEXT,                -- e.g., "Crane 100T", "Excavator 320"
    equipment_size TEXT,                 -- Size/capacity specification

    -- Material-Specific (if resource_type = MATERIAL)
    material_spec TEXT,                  -- Specification reference
    waste_factor_pct NUMERIC(5, 2),      -- Waste allowance percentage

    -- Cost Rate (default, can be overridden)
    default_unit_rate NUMERIC(12, 4),    -- Default $/unit
    rate_effective_date DATE,
    rate_source TEXT,                    -- Where rate came from

    -- Extended Cost (calculated)
    extended_cost_per_output NUMERIC(14, 6),  -- qty_per_unit × rate

    -- Flags
    is_optional BOOLEAN DEFAULT FALSE,   -- Optional resource (crane type may vary)
    is_subcontracted_default BOOLEAN DEFAULT FALSE,
    include_in_total BOOLEAN DEFAULT TRUE,

    -- Notes
    notes TEXT,

    -- Sort Order
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_template_line UNIQUE (assembly_template_id, line_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_lines_assembly ON public.bid_assembly_template_lines(assembly_template_id);
CREATE INDEX IF NOT EXISTS idx_template_lines_resource ON public.bid_assembly_template_lines(resource_type);

-- Enable RLS
ALTER TABLE public.bid_assembly_template_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see template lines via template" ON public.bid_assembly_template_lines;
CREATE POLICY "Users see template lines via template" ON public.bid_assembly_template_lines
    FOR SELECT USING (
        assembly_template_id IN (
            SELECT id FROM public.bid_assembly_templates
            WHERE organization_id IS NULL OR organization_id = public.get_user_organization_id(auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users manage own template lines" ON public.bid_assembly_template_lines;
CREATE POLICY "Users manage own template lines" ON public.bid_assembly_template_lines
    FOR ALL USING (
        assembly_template_id IN (
            SELECT id FROM public.bid_assembly_templates
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_template_lines_updated_at ON public.bid_assembly_template_lines;
CREATE TRIGGER bid_template_lines_updated_at
    BEFORE UPDATE ON public.bid_assembly_template_lines
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TRIGGER: Calculate extended cost on line insert/update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_template_line_extended()
RETURNS TRIGGER AS $$
BEGIN
    NEW.extended_cost_per_output := NEW.quantity_per_unit_output * COALESCE(NEW.default_unit_rate, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_template_line_extended ON public.bid_assembly_template_lines;
CREATE TRIGGER trg_template_line_extended
    BEFORE INSERT OR UPDATE OF quantity_per_unit_output, default_unit_rate
    ON public.bid_assembly_template_lines
    FOR EACH ROW EXECUTE FUNCTION public.calculate_template_line_extended();

-- ============================================================================
-- TRIGGER: Update template totals when lines change
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_assembly_template_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_template_id UUID;
BEGIN
    -- Get the template ID
    IF TG_OP = 'DELETE' THEN
        v_template_id := OLD.assembly_template_id;
    ELSE
        v_template_id := NEW.assembly_template_id;
    END IF;

    -- Update template totals
    UPDATE public.bid_assembly_templates SET
        total_labor_cost_per_unit = (
            SELECT COALESCE(SUM(extended_cost_per_output), 0)
            FROM public.bid_assembly_template_lines
            WHERE assembly_template_id = v_template_id
            AND resource_type = 'LABOR'
            AND include_in_total = TRUE
        ),
        total_equipment_cost_per_unit = (
            SELECT COALESCE(SUM(extended_cost_per_output), 0)
            FROM public.bid_assembly_template_lines
            WHERE assembly_template_id = v_template_id
            AND resource_type = 'EQUIPMENT'
            AND include_in_total = TRUE
        ),
        total_material_cost_per_unit = (
            SELECT COALESCE(SUM(extended_cost_per_output), 0)
            FROM public.bid_assembly_template_lines
            WHERE assembly_template_id = v_template_id
            AND resource_type = 'MATERIAL'
            AND include_in_total = TRUE
        ),
        total_sub_cost_per_unit = (
            SELECT COALESCE(SUM(extended_cost_per_output), 0)
            FROM public.bid_assembly_template_lines
            WHERE assembly_template_id = v_template_id
            AND resource_type = 'SUBCONTRACT'
            AND include_in_total = TRUE
        ),
        total_cost_per_unit = (
            SELECT COALESCE(SUM(extended_cost_per_output), 0)
            FROM public.bid_assembly_template_lines
            WHERE assembly_template_id = v_template_id
            AND include_in_total = TRUE
        ),
        updated_at = NOW()
    WHERE id = v_template_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_template_totals ON public.bid_assembly_template_lines;
CREATE TRIGGER trg_update_template_totals
    AFTER INSERT OR UPDATE OR DELETE
    ON public.bid_assembly_template_lines
    FOR EACH ROW EXECUTE FUNCTION public.update_assembly_template_totals();

-- ============================================================================
-- HELPER VIEW: Assembly templates with line counts
-- ============================================================================
CREATE OR REPLACE VIEW public.v_bid_assembly_templates AS
SELECT
    at.*,
    COUNT(atl.id) AS line_count,
    COUNT(atl.id) FILTER (WHERE atl.resource_type = 'LABOR') AS labor_lines,
    COUNT(atl.id) FILTER (WHERE atl.resource_type = 'EQUIPMENT') AS equipment_lines,
    COUNT(atl.id) FILTER (WHERE atl.resource_type = 'MATERIAL') AS material_lines,
    COUNT(atl.id) FILTER (WHERE atl.resource_type = 'SUBCONTRACT') AS subcontract_lines
FROM public.bid_assembly_templates at
LEFT JOIN public.bid_assembly_template_lines atl ON at.id = atl.assembly_template_id
GROUP BY at.id;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.bid_assembly_templates IS 'Reusable cost assemblies (recipes) for building bid items';
COMMENT ON TABLE public.bid_assembly_template_lines IS 'Individual resource lines within an assembly template';
COMMENT ON VIEW public.v_bid_assembly_templates IS 'Assembly templates with line count summary';
