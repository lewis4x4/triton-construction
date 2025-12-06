-- ============================================================================
-- MIGRATION 019: V4.1 ADDENDUM - ITEM ASSEMBLIES
-- Triton AI Bid Package Engine - Project-specific application of templates
-- ============================================================================

-- ============================================================================
-- TABLE: bid_item_assemblies
-- Purpose: Project-specific application of a template to a bid item with tweaks
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_item_assemblies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent Line Item
    line_item_id UUID NOT NULL REFERENCES public.bid_line_items(id) ON DELETE CASCADE,

    -- Template Reference
    assembly_template_id UUID NOT NULL REFERENCES public.bid_assembly_templates(id),

    -- Productivity Adjustments
    productivity_factor NUMERIC(5, 3) DEFAULT 1.000,  -- Multiplier: 0.8 = slower, 1.2 = faster
    adjusted_productivity_rate NUMERIC(12, 4),        -- Calculated: template rate × factor
    productivity_adjustment_reason TEXT,              -- "Night work, limited access"

    -- AI Tracking
    is_ai_suggested BOOLEAN DEFAULT TRUE,
    is_manually_adjusted BOOLEAN DEFAULT FALSE,
    ai_confidence_score NUMERIC(5, 2),
    ai_template_match_reason TEXT,                    -- Why AI chose this template

    -- Override Tracking
    original_ai_template_id UUID REFERENCES public.bid_assembly_templates(id),
    template_overridden BOOLEAN DEFAULT FALSE,
    override_reason TEXT,
    overridden_by UUID REFERENCES public.user_profiles(id),
    overridden_at TIMESTAMPTZ,

    -- Calculated Costs (from lines)
    calculated_labor_cost NUMERIC(14, 4),
    calculated_equipment_cost NUMERIC(14, 4),
    calculated_material_cost NUMERIC(14, 4),
    calculated_sub_cost NUMERIC(14, 4),
    calculated_base_unit_cost NUMERIC(14, 4),
    calculated_at TIMESTAMPTZ,

    -- Cost Breakdown JSON (for quick access)
    cost_breakdown JSONB,  -- {"labor": 45.00, "equipment": 30.00, "material": 25.00, "sub": 0}

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES public.user_profiles(id),

    -- One assembly per line item
    CONSTRAINT one_assembly_per_item UNIQUE (line_item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_item_assemblies_line_item ON public.bid_item_assemblies(line_item_id);
CREATE INDEX IF NOT EXISTS idx_item_assemblies_template ON public.bid_item_assemblies(assembly_template_id);
CREATE INDEX IF NOT EXISTS idx_item_assemblies_ai_suggested ON public.bid_item_assemblies(is_ai_suggested);

-- Enable RLS
ALTER TABLE public.bid_item_assemblies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see item assemblies via line item" ON public.bid_item_assemblies;
CREATE POLICY "Users see item assemblies via line item" ON public.bid_item_assemblies
    FOR ALL USING (
        line_item_id IN (
            SELECT bli.id FROM public.bid_line_items bli
            JOIN public.bid_projects bp ON bli.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_item_assemblies_updated_at ON public.bid_item_assemblies;
CREATE TRIGGER bid_item_assemblies_updated_at
    BEFORE UPDATE ON public.bid_item_assemblies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TABLE: bid_item_assembly_lines
-- Purpose: Project-specific copy of template lines with adjustments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_item_assembly_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent
    item_assembly_id UUID NOT NULL REFERENCES public.bid_item_assemblies(id) ON DELETE CASCADE,

    -- Source Template Line (for reference)
    template_line_id UUID REFERENCES public.bid_assembly_template_lines(id),

    -- Line Details (copied from template, can be adjusted)
    line_number INTEGER NOT NULL,
    resource_type assembly_resource_type_enum NOT NULL,
    resource_code TEXT,
    description TEXT NOT NULL,

    -- Quantities (may differ from template)
    quantity_per_unit_output NUMERIC(14, 6) NOT NULL,
    unit_of_measure TEXT NOT NULL,

    -- Rates (project-specific)
    unit_rate NUMERIC(12, 4),            -- Actual rate for this project
    rate_source TEXT,                    -- Where rate came from

    -- Calculated Extended (per output unit)
    extended_cost NUMERIC(14, 6),        -- quantity_per_unit × rate

    -- Labor-Specific
    crew_role TEXT,
    crew_size NUMERIC(4, 2),
    labor_class TEXT,

    -- Equipment-Specific
    equipment_class TEXT,
    equipment_size TEXT,

    -- Material-Specific
    material_spec TEXT,
    waste_factor_pct NUMERIC(5, 2),

    -- Flags
    is_adjusted BOOLEAN DEFAULT FALSE,   -- Changed from template
    adjustment_reason TEXT,
    is_excluded BOOLEAN DEFAULT FALSE,   -- Removed from this instance
    is_added BOOLEAN DEFAULT FALSE,      -- Added (not from template)

    -- Sort Order
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_assembly_line UNIQUE (item_assembly_id, line_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assembly_lines_assembly ON public.bid_item_assembly_lines(item_assembly_id);
CREATE INDEX IF NOT EXISTS idx_assembly_lines_resource ON public.bid_item_assembly_lines(resource_type);
CREATE INDEX IF NOT EXISTS idx_assembly_lines_template ON public.bid_item_assembly_lines(template_line_id);

-- Enable RLS
ALTER TABLE public.bid_item_assembly_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see assembly lines via assembly" ON public.bid_item_assembly_lines;
CREATE POLICY "Users see assembly lines via assembly" ON public.bid_item_assembly_lines
    FOR ALL USING (
        item_assembly_id IN (
            SELECT ia.id FROM public.bid_item_assemblies ia
            JOIN public.bid_line_items bli ON ia.line_item_id = bli.id
            JOIN public.bid_projects bp ON bli.bid_project_id = bp.id
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS bid_assembly_lines_updated_at ON public.bid_item_assembly_lines;
CREATE TRIGGER bid_assembly_lines_updated_at
    BEFORE UPDATE ON public.bid_item_assembly_lines
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TRIGGER: Calculate extended cost on line insert/update
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_assembly_line_extended()
RETURNS TRIGGER AS $$
BEGIN
    NEW.extended_cost := NEW.quantity_per_unit_output * COALESCE(NEW.unit_rate, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assembly_line_extended ON public.bid_item_assembly_lines;
CREATE TRIGGER trg_assembly_line_extended
    BEFORE INSERT OR UPDATE OF quantity_per_unit_output, unit_rate
    ON public.bid_item_assembly_lines
    FOR EACH ROW EXECUTE FUNCTION public.calculate_assembly_line_extended();

-- ============================================================================
-- TRIGGER: Update item assembly totals when lines change
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_item_assembly_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_assembly_id UUID;
    v_labor NUMERIC;
    v_equipment NUMERIC;
    v_material NUMERIC;
    v_sub NUMERIC;
    v_total NUMERIC;
BEGIN
    -- Get the assembly ID
    IF TG_OP = 'DELETE' THEN
        v_assembly_id := OLD.item_assembly_id;
    ELSE
        v_assembly_id := NEW.item_assembly_id;
    END IF;

    -- Calculate totals
    SELECT
        COALESCE(SUM(extended_cost) FILTER (WHERE resource_type = 'LABOR' AND NOT is_excluded), 0),
        COALESCE(SUM(extended_cost) FILTER (WHERE resource_type = 'EQUIPMENT' AND NOT is_excluded), 0),
        COALESCE(SUM(extended_cost) FILTER (WHERE resource_type = 'MATERIAL' AND NOT is_excluded), 0),
        COALESCE(SUM(extended_cost) FILTER (WHERE resource_type = 'SUBCONTRACT' AND NOT is_excluded), 0),
        COALESCE(SUM(extended_cost) FILTER (WHERE NOT is_excluded), 0)
    INTO v_labor, v_equipment, v_material, v_sub, v_total
    FROM public.bid_item_assembly_lines
    WHERE item_assembly_id = v_assembly_id;

    -- Update assembly totals
    UPDATE public.bid_item_assemblies SET
        calculated_labor_cost = v_labor,
        calculated_equipment_cost = v_equipment,
        calculated_material_cost = v_material,
        calculated_sub_cost = v_sub,
        calculated_base_unit_cost = v_total,
        calculated_at = NOW(),
        cost_breakdown = jsonb_build_object(
            'labor', v_labor,
            'equipment', v_equipment,
            'material', v_material,
            'sub', v_sub
        ),
        updated_at = NOW()
    WHERE id = v_assembly_id;

    -- Also update the parent line item's base_unit_cost
    UPDATE public.bid_line_items SET
        base_unit_cost = v_total,
        unit_cost_breakdown = jsonb_build_object(
            'labor', v_labor,
            'equipment', v_equipment,
            'material', v_material,
            'sub', v_sub
        ),
        updated_at = NOW()
    WHERE id = (SELECT line_item_id FROM public.bid_item_assemblies WHERE id = v_assembly_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_assembly_totals ON public.bid_item_assembly_lines;
CREATE TRIGGER trg_update_assembly_totals
    AFTER INSERT OR UPDATE OR DELETE
    ON public.bid_item_assembly_lines
    FOR EACH ROW EXECUTE FUNCTION public.update_item_assembly_totals();

-- ============================================================================
-- HELPER FUNCTION: Apply template to line item
-- ============================================================================
CREATE OR REPLACE FUNCTION public.apply_assembly_template(
    p_line_item_id UUID,
    p_template_id UUID,
    p_productivity_factor NUMERIC DEFAULT 1.0,
    p_is_ai_suggested BOOLEAN DEFAULT FALSE,
    p_ai_confidence NUMERIC DEFAULT NULL,
    p_ai_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_assembly_id UUID;
    v_template RECORD;
BEGIN
    -- Get template info
    SELECT * INTO v_template
    FROM public.bid_assembly_templates
    WHERE id = p_template_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found: %', p_template_id;
    END IF;

    -- Create item assembly
    INSERT INTO public.bid_item_assemblies (
        line_item_id,
        assembly_template_id,
        productivity_factor,
        adjusted_productivity_rate,
        is_ai_suggested,
        ai_confidence_score,
        ai_template_match_reason,
        created_by
    ) VALUES (
        p_line_item_id,
        p_template_id,
        p_productivity_factor,
        v_template.default_productivity_rate * p_productivity_factor,
        p_is_ai_suggested,
        p_ai_confidence,
        p_ai_reason,
        auth.uid()
    )
    ON CONFLICT (line_item_id) DO UPDATE SET
        assembly_template_id = p_template_id,
        productivity_factor = p_productivity_factor,
        adjusted_productivity_rate = v_template.default_productivity_rate * p_productivity_factor,
        is_ai_suggested = p_is_ai_suggested,
        ai_confidence_score = p_ai_confidence,
        ai_template_match_reason = p_ai_reason,
        updated_at = NOW(),
        updated_by = auth.uid()
    RETURNING id INTO v_assembly_id;

    -- Delete existing lines (if updating)
    DELETE FROM public.bid_item_assembly_lines WHERE item_assembly_id = v_assembly_id;

    -- Copy template lines to assembly lines
    INSERT INTO public.bid_item_assembly_lines (
        item_assembly_id,
        template_line_id,
        line_number,
        resource_type,
        resource_code,
        description,
        quantity_per_unit_output,
        unit_of_measure,
        unit_rate,
        rate_source,
        crew_role,
        crew_size,
        labor_class,
        equipment_class,
        equipment_size,
        material_spec,
        waste_factor_pct,
        sort_order
    )
    SELECT
        v_assembly_id,
        atl.id,
        atl.line_number,
        atl.resource_type,
        atl.resource_code,
        atl.description,
        atl.quantity_per_unit_output * p_productivity_factor,  -- Adjust for productivity
        atl.unit_of_measure,
        atl.default_unit_rate,
        'TEMPLATE_DEFAULT',
        atl.crew_role,
        atl.crew_size,
        atl.labor_class,
        atl.equipment_class,
        atl.equipment_size,
        atl.material_spec,
        atl.waste_factor_pct,
        atl.sort_order
    FROM public.bid_assembly_template_lines atl
    WHERE atl.assembly_template_id = p_template_id
    AND atl.is_optional = FALSE;  -- Only copy non-optional lines

    -- Update template usage stats
    UPDATE public.bid_assembly_templates SET
        times_used = times_used + 1,
        last_used_at = NOW()
    WHERE id = p_template_id;

    RETURN v_assembly_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- HELPER FUNCTION: Calculate item assembly cost
-- ============================================================================
CREATE OR REPLACE FUNCTION public.calculate_item_assembly_cost(p_item_assembly_id UUID)
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC := 0;
BEGIN
    SELECT COALESCE(SUM(quantity_per_unit_output * COALESCE(unit_rate, 0)), 0)
    INTO v_total
    FROM public.bid_item_assembly_lines
    WHERE item_assembly_id = p_item_assembly_id
    AND is_excluded = FALSE;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.bid_item_assemblies IS 'Project-specific application of assembly templates to bid line items';
COMMENT ON TABLE public.bid_item_assembly_lines IS 'Project-specific copy of template lines with adjustments';
COMMENT ON FUNCTION public.apply_assembly_template(UUID, UUID, NUMERIC, BOOLEAN, NUMERIC, TEXT) IS 'Apply an assembly template to a bid line item, copying lines and adjusting for productivity';
COMMENT ON FUNCTION public.calculate_item_assembly_cost(UUID) IS 'Sum assembly lines to get base unit cost for an item';
