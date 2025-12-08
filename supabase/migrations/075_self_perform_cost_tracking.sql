-- =============================================================================
-- Migration 075: Self-Perform Cost Tracking
-- Tracks labor, equipment, and materials costs for work Triton performs directly
-- =============================================================================
-- Per Pay Estimate Module - tracks self-perform costs against bid items
-- Links to pay_periods for reconciliation
-- =============================================================================

-- ============================================================================
-- PART 0: CLEANUP
-- ============================================================================

-- Drop indexes explicitly (in case they exist without tables)
DROP INDEX IF EXISTS public.idx_cost_codes_project;
DROP INDEX IF EXISTS public.idx_cost_codes_item;
DROP INDEX IF EXISTS public.idx_labor_entries_cost_code;
DROP INDEX IF EXISTS public.idx_labor_entries_date;
DROP INDEX IF EXISTS public.idx_labor_entries_status;
DROP INDEX IF EXISTS public.idx_labor_entries_daily_report;
DROP INDEX IF EXISTS public.idx_equipment_usage_cost_code;
DROP INDEX IF EXISTS public.idx_equipment_usage_date;
DROP INDEX IF EXISTS public.idx_equipment_usage_status;
DROP INDEX IF EXISTS public.idx_material_usage_cost_code;
DROP INDEX IF EXISTS public.idx_material_usage_date;
DROP INDEX IF EXISTS public.idx_material_usage_status;

-- Drop views
DROP VIEW IF EXISTS public.v_self_perform_summary CASCADE;
DROP VIEW IF EXISTS public.v_daily_cost_summary CASCADE;

-- Drop tables (CASCADE will drop triggers)
DROP TABLE IF EXISTS public.self_perform_material_usage CASCADE;
DROP TABLE IF EXISTS public.self_perform_equipment_usage CASCADE;
DROP TABLE IF EXISTS public.self_perform_labor_entries CASCADE;
DROP TABLE IF EXISTS public.self_perform_cost_codes CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS public.calculate_labor_costs() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_equipment_costs() CASCADE;
DROP FUNCTION IF EXISTS public.update_cost_code_totals() CASCADE;

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.cost_entry_status AS ENUM (
        'DRAFT',
        'SUBMITTED',
        'APPROVED',
        'REJECTED',
        'POSTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.labor_type AS ENUM (
        'REGULAR',
        'OVERTIME',
        'DOUBLE_TIME',
        'PREVAILING_WAGE'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: SELF-PERFORM COST CODES
-- ============================================================================
-- Maps internal cost tracking to bid items for reconciliation

CREATE TABLE public.self_perform_cost_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Link to bid/pay estimate item
    item_number TEXT NOT NULL,              -- WVDOH item number (e.g., 636060-002)
    description TEXT NOT NULL,
    unit TEXT NOT NULL,                     -- Unit of measure (CY, TON, LF, etc.)

    -- Budget tracking
    bid_qty NUMERIC(15,3),                  -- Original bid quantity
    bid_unit_price NUMERIC(12,4),           -- Original bid unit price
    bid_total NUMERIC(15,2) GENERATED ALWAYS AS (bid_qty * bid_unit_price) STORED,

    -- Cost breakdown targets (for variance analysis)
    estimated_labor_pct NUMERIC(5,2) DEFAULT 40.00,    -- Expected % for labor
    estimated_equipment_pct NUMERIC(5,2) DEFAULT 30.00, -- Expected % for equipment
    estimated_material_pct NUMERIC(5,2) DEFAULT 30.00,  -- Expected % for materials

    -- Calculated totals (updated by triggers)
    actual_labor_cost NUMERIC(15,2) DEFAULT 0,
    actual_equipment_cost NUMERIC(15,2) DEFAULT 0,
    actual_material_cost NUMERIC(15,2) DEFAULT 0,
    actual_total_cost NUMERIC(15,2) GENERATED ALWAYS AS (
        actual_labor_cost + actual_equipment_cost + actual_material_cost
    ) STORED,

    -- Installed quantity tracking
    installed_qty NUMERIC(15,3) DEFAULT 0,

    -- Flags
    is_active BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(project_id, item_number)
);

-- ============================================================================
-- PART 3: LABOR ENTRIES
-- ============================================================================
-- Daily labor cost tracking by worker, trade, and cost code

CREATE TABLE public.self_perform_labor_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    cost_code_id UUID NOT NULL REFERENCES public.self_perform_cost_codes(id) ON DELETE CASCADE,

    -- Link to daily report (optional)
    daily_report_id UUID REFERENCES public.daily_reports(id) ON DELETE SET NULL,

    -- Worker info
    crew_member_id UUID REFERENCES public.crew_members(id) ON DELETE SET NULL,
    worker_name TEXT NOT NULL,              -- Denormalized for reporting
    trade_classification TEXT NOT NULL,     -- Carpenter, Laborer, Operator, etc.

    -- Time tracking
    work_date DATE NOT NULL,
    hours_regular NUMERIC(5,2) DEFAULT 0,
    hours_overtime NUMERIC(5,2) DEFAULT 0,
    hours_double_time NUMERIC(5,2) DEFAULT 0,
    total_hours NUMERIC(5,2) GENERATED ALWAYS AS (
        hours_regular + hours_overtime + hours_double_time
    ) STORED,

    -- Rates and costs
    base_rate NUMERIC(10,2) NOT NULL,       -- Hourly rate
    ot_multiplier NUMERIC(3,2) DEFAULT 1.5,
    dt_multiplier NUMERIC(3,2) DEFAULT 2.0,
    fringe_rate NUMERIC(10,2) DEFAULT 0,    -- Davis-Bacon fringe
    burden_rate_pct NUMERIC(5,2) DEFAULT 35.00,  -- Payroll burden %

    -- Calculated costs (set by trigger - can't use generated columns in other generated columns)
    labor_cost NUMERIC(12,2),               -- Set by trigger
    burden_cost NUMERIC(12,2),              -- Set by trigger
    total_cost NUMERIC(12,2),               -- Set by trigger (labor + burden)

    -- Status workflow
    status cost_entry_status DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),

    -- Production tracking (optional)
    qty_installed NUMERIC(12,3),            -- Quantity installed this entry

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- PART 4: EQUIPMENT USAGE
-- ============================================================================
-- Daily equipment cost tracking by unit and cost code

CREATE TABLE public.self_perform_equipment_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    cost_code_id UUID NOT NULL REFERENCES public.self_perform_cost_codes(id) ON DELETE CASCADE,

    -- Link to daily report (optional)
    daily_report_id UUID REFERENCES public.daily_reports(id) ON DELETE SET NULL,

    -- Equipment info
    equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
    equipment_name TEXT NOT NULL,           -- Denormalized for reporting
    equipment_code TEXT,                    -- Internal equipment number

    -- Usage tracking
    work_date DATE NOT NULL,
    hours_operated NUMERIC(5,2) DEFAULT 0,
    hours_idle NUMERIC(5,2) DEFAULT 0,
    total_hours NUMERIC(5,2) GENERATED ALWAYS AS (hours_operated + hours_idle) STORED,

    -- Rates (from equipment table or override)
    hourly_rate NUMERIC(10,2) NOT NULL,     -- Internal hourly rate
    idle_rate_pct NUMERIC(5,2) DEFAULT 50.00, -- % of hourly for idle time

    -- Fuel tracking
    fuel_gallons NUMERIC(8,2) DEFAULT 0,
    fuel_cost_per_gallon NUMERIC(6,3),
    fuel_cost NUMERIC(10,2) GENERATED ALWAYS AS (fuel_gallons * COALESCE(fuel_cost_per_gallon, 0)) STORED,

    -- Calculated costs
    operating_cost NUMERIC(12,2) GENERATED ALWAYS AS (hours_operated * hourly_rate) STORED,
    idle_cost NUMERIC(12,2) GENERATED ALWAYS AS (hours_idle * hourly_rate * (idle_rate_pct / 100)) STORED,
    total_cost NUMERIC(12,2),               -- Set by trigger (operating + idle + fuel)

    -- Status workflow
    status cost_entry_status DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),

    -- Meter readings (optional)
    start_meter NUMERIC(10,1),
    end_meter NUMERIC(10,1),

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- PART 5: MATERIAL USAGE
-- ============================================================================
-- Material consumption tracking by cost code

CREATE TABLE public.self_perform_material_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    cost_code_id UUID NOT NULL REFERENCES public.self_perform_cost_codes(id) ON DELETE CASCADE,

    -- Link to daily report (optional)
    daily_report_id UUID REFERENCES public.daily_reports(id) ON DELETE SET NULL,

    -- Link to delivery ticket (optional)
    delivery_ticket_id UUID,                -- From materials module when built

    -- Material info
    material_name TEXT NOT NULL,
    material_code TEXT,                     -- SKU or internal code
    supplier_name TEXT,

    -- Quantity and cost
    work_date DATE NOT NULL,
    quantity NUMERIC(12,3) NOT NULL,
    unit TEXT NOT NULL,
    unit_cost NUMERIC(12,4) NOT NULL,
    total_cost NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,

    -- Ticket reference
    ticket_number TEXT,

    -- Status workflow
    status cost_entry_status DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    submitted_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- PART 6: TRIGGERS
-- ============================================================================

-- Calculate labor_cost, burden and total cost for labor entries
CREATE OR REPLACE FUNCTION public.calculate_labor_costs()
RETURNS TRIGGER AS $$
DECLARE
    v_base_labor NUMERIC(12,2);
    v_total_hours NUMERIC(5,2);
BEGIN
    -- Calculate total hours
    v_total_hours := NEW.hours_regular + NEW.hours_overtime + NEW.hours_double_time;

    -- Calculate base labor cost (regular + OT + DT + fringe)
    v_base_labor := (
        (NEW.hours_regular * NEW.base_rate) +
        (NEW.hours_overtime * NEW.base_rate * NEW.ot_multiplier) +
        (NEW.hours_double_time * NEW.base_rate * NEW.dt_multiplier) +
        (v_total_hours * NEW.fringe_rate)
    );

    -- Set labor_cost
    NEW.labor_cost := v_base_labor;

    -- Calculate burden cost
    NEW.burden_cost := v_base_labor * (NEW.burden_rate_pct / 100);

    -- Calculate total cost (labor + burden)
    NEW.total_cost := v_base_labor + NEW.burden_cost;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_labor_costs
    BEFORE INSERT OR UPDATE ON public.self_perform_labor_entries
    FOR EACH ROW EXECUTE FUNCTION public.calculate_labor_costs();

-- Calculate total cost for equipment usage
CREATE OR REPLACE FUNCTION public.calculate_equipment_costs()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_cost :=
        (NEW.hours_operated * NEW.hourly_rate) +
        (NEW.hours_idle * NEW.hourly_rate * (NEW.idle_rate_pct / 100)) +
        (NEW.fuel_gallons * COALESCE(NEW.fuel_cost_per_gallon, 0));

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calculate_equipment_costs
    BEFORE INSERT OR UPDATE ON public.self_perform_equipment_usage
    FOR EACH ROW EXECUTE FUNCTION public.calculate_equipment_costs();

-- Update cost code totals when entries change
CREATE OR REPLACE FUNCTION public.update_cost_code_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_cost_code_id UUID;
BEGIN
    -- Determine which cost code to update
    IF TG_OP = 'DELETE' THEN
        v_cost_code_id := OLD.cost_code_id;
    ELSE
        v_cost_code_id := NEW.cost_code_id;
    END IF;

    -- Recalculate totals based on table type
    IF TG_TABLE_NAME = 'self_perform_labor_entries' THEN
        UPDATE public.self_perform_cost_codes
        SET
            actual_labor_cost = COALESCE((
                SELECT SUM(total_cost)
                FROM public.self_perform_labor_entries
                WHERE cost_code_id = v_cost_code_id
                AND status IN ('APPROVED', 'POSTED')
            ), 0),
            installed_qty = COALESCE((
                SELECT SUM(qty_installed)
                FROM public.self_perform_labor_entries
                WHERE cost_code_id = v_cost_code_id
                AND status IN ('APPROVED', 'POSTED')
            ), 0),
            updated_at = now()
        WHERE id = v_cost_code_id;

    ELSIF TG_TABLE_NAME = 'self_perform_equipment_usage' THEN
        UPDATE public.self_perform_cost_codes
        SET
            actual_equipment_cost = COALESCE((
                SELECT SUM(total_cost)
                FROM public.self_perform_equipment_usage
                WHERE cost_code_id = v_cost_code_id
                AND status IN ('APPROVED', 'POSTED')
            ), 0),
            updated_at = now()
        WHERE id = v_cost_code_id;

    ELSIF TG_TABLE_NAME = 'self_perform_material_usage' THEN
        UPDATE public.self_perform_cost_codes
        SET
            actual_material_cost = COALESCE((
                SELECT SUM(total_cost)
                FROM public.self_perform_material_usage
                WHERE cost_code_id = v_cost_code_id
                AND status IN ('APPROVED', 'POSTED')
            ), 0),
            updated_at = now()
        WHERE id = v_cost_code_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_labor_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.self_perform_labor_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_cost_code_totals();

CREATE TRIGGER trg_update_equipment_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.self_perform_equipment_usage
    FOR EACH ROW EXECUTE FUNCTION public.update_cost_code_totals();

CREATE TRIGGER trg_update_material_totals
    AFTER INSERT OR UPDATE OR DELETE ON public.self_perform_material_usage
    FOR EACH ROW EXECUTE FUNCTION public.update_cost_code_totals();

-- ============================================================================
-- PART 7: VIEWS
-- ============================================================================

-- Daily cost summary by project
CREATE VIEW public.v_daily_cost_summary AS
SELECT
    p.id as project_id,
    p.name as project_name,
    p.contract_number,
    d.work_date,

    -- Labor summary
    COALESCE(l.labor_entries, 0) as labor_entries,
    COALESCE(l.labor_hours, 0) as labor_hours,
    COALESCE(l.labor_cost, 0) as labor_cost,

    -- Equipment summary
    COALESCE(e.equipment_entries, 0) as equipment_entries,
    COALESCE(e.equipment_hours, 0) as equipment_hours,
    COALESCE(e.equipment_cost, 0) as equipment_cost,

    -- Material summary
    COALESCE(m.material_entries, 0) as material_entries,
    COALESCE(m.material_cost, 0) as material_cost,

    -- Totals
    COALESCE(l.labor_cost, 0) + COALESCE(e.equipment_cost, 0) + COALESCE(m.material_cost, 0) as total_daily_cost

FROM public.projects p
CROSS JOIN (
    SELECT DISTINCT work_date FROM public.self_perform_labor_entries
    UNION
    SELECT DISTINCT work_date FROM public.self_perform_equipment_usage
    UNION
    SELECT DISTINCT work_date FROM public.self_perform_material_usage
) d
LEFT JOIN (
    SELECT
        project_id,
        work_date,
        COUNT(*) as labor_entries,
        SUM(hours_regular + hours_overtime + hours_double_time) as labor_hours,
        SUM(total_cost) as labor_cost
    FROM public.self_perform_labor_entries
    WHERE status IN ('APPROVED', 'POSTED')
    GROUP BY project_id, work_date
) l ON p.id = l.project_id AND d.work_date = l.work_date
LEFT JOIN (
    SELECT
        project_id,
        work_date,
        COUNT(*) as equipment_entries,
        SUM(hours_operated + hours_idle) as equipment_hours,
        SUM(total_cost) as equipment_cost
    FROM public.self_perform_equipment_usage
    WHERE status IN ('APPROVED', 'POSTED')
    GROUP BY project_id, work_date
) e ON p.id = e.project_id AND d.work_date = e.work_date
LEFT JOIN (
    SELECT
        project_id,
        work_date,
        COUNT(*) as material_entries,
        SUM(total_cost) as material_cost
    FROM public.self_perform_material_usage
    WHERE status IN ('APPROVED', 'POSTED')
    GROUP BY project_id, work_date
) m ON p.id = m.project_id AND d.work_date = m.work_date
WHERE l.project_id IS NOT NULL OR e.project_id IS NOT NULL OR m.project_id IS NOT NULL;

-- Self-perform summary by cost code
CREATE VIEW public.v_self_perform_summary AS
SELECT
    cc.id as cost_code_id,
    cc.organization_id,
    cc.project_id,
    p.name as project_name,
    p.contract_number,
    cc.item_number,
    cc.description,
    cc.unit,

    -- Budget
    cc.bid_qty,
    cc.bid_unit_price,
    cc.bid_total,

    -- Actual costs
    cc.actual_labor_cost,
    cc.actual_equipment_cost,
    cc.actual_material_cost,
    cc.actual_total_cost,

    -- Installed quantity
    cc.installed_qty,

    -- Calculated unit cost
    CASE WHEN cc.installed_qty > 0
        THEN cc.actual_total_cost / cc.installed_qty
        ELSE 0
    END as actual_unit_cost,

    -- Variance
    CASE WHEN cc.bid_total > 0
        THEN ((cc.actual_total_cost - cc.bid_total) / cc.bid_total) * 100
        ELSE 0
    END as cost_variance_pct,

    -- Cost breakdown %
    CASE WHEN cc.actual_total_cost > 0
        THEN (cc.actual_labor_cost / cc.actual_total_cost) * 100
        ELSE 0
    END as labor_pct,
    CASE WHEN cc.actual_total_cost > 0
        THEN (cc.actual_equipment_cost / cc.actual_total_cost) * 100
        ELSE 0
    END as equipment_pct,
    CASE WHEN cc.actual_total_cost > 0
        THEN (cc.actual_material_cost / cc.actual_total_cost) * 100
        ELSE 0
    END as material_pct,

    -- Estimated vs actual breakdown variance
    cc.estimated_labor_pct,
    cc.estimated_equipment_pct,
    cc.estimated_material_pct,

    cc.is_active

FROM public.self_perform_cost_codes cc
JOIN public.projects p ON cc.project_id = p.id;

-- ============================================================================
-- PART 8: RLS POLICIES
-- ============================================================================

ALTER TABLE public.self_perform_cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_perform_labor_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_perform_equipment_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.self_perform_material_usage ENABLE ROW LEVEL SECURITY;

-- Cost codes policies
CREATE POLICY "cost_codes_org_access" ON public.self_perform_cost_codes
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Labor entries policies
CREATE POLICY "labor_entries_org_access" ON public.self_perform_labor_entries
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Equipment usage policies
CREATE POLICY "equipment_usage_org_access" ON public.self_perform_equipment_usage
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Material usage policies
CREATE POLICY "material_usage_org_access" ON public.self_perform_material_usage
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 9: INDEXES
-- ============================================================================

CREATE INDEX idx_cost_codes_project ON public.self_perform_cost_codes(project_id);
CREATE INDEX idx_cost_codes_item ON public.self_perform_cost_codes(item_number);

CREATE INDEX idx_labor_entries_cost_code ON public.self_perform_labor_entries(cost_code_id);
CREATE INDEX idx_labor_entries_date ON public.self_perform_labor_entries(work_date);
CREATE INDEX idx_labor_entries_status ON public.self_perform_labor_entries(status);
CREATE INDEX idx_labor_entries_daily_report ON public.self_perform_labor_entries(daily_report_id);

CREATE INDEX idx_equipment_usage_cost_code ON public.self_perform_equipment_usage(cost_code_id);
CREATE INDEX idx_equipment_usage_date ON public.self_perform_equipment_usage(work_date);
CREATE INDEX idx_equipment_usage_status ON public.self_perform_equipment_usage(status);

CREATE INDEX idx_material_usage_cost_code ON public.self_perform_material_usage(cost_code_id);
CREATE INDEX idx_material_usage_date ON public.self_perform_material_usage(work_date);
CREATE INDEX idx_material_usage_status ON public.self_perform_material_usage(status);

-- ============================================================================
-- PART 10: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.self_perform_cost_codes IS 'Cost codes for self-perform work, maps to bid items';
COMMENT ON TABLE public.self_perform_labor_entries IS 'Daily labor cost entries by worker and cost code';
COMMENT ON TABLE public.self_perform_equipment_usage IS 'Daily equipment usage and costs by unit';
COMMENT ON TABLE public.self_perform_material_usage IS 'Material consumption tracking by cost code';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 075: Self-Perform Cost Tracking completed successfully' as status;
