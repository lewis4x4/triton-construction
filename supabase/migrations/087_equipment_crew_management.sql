-- =============================================================================
-- Migration 087: Equipment & Crew Management Module
-- =============================================================================
-- PURPOSE: Implement equipment fleet management, crew workforce tracking,
--          operator qualifications, and maintenance scheduling
-- DEPENDS ON: 049 (employees), 052 (crew builder), 061 (certifications),
--             066 (equipment base), 086 (platform core)
-- SPEC: EQUIPMENT_CREW_SPEC_V2.md
-- Date: December 7, 2024
-- =============================================================================

-- =============================================================================
-- PART 1: EQUIPMENT ENUMS (NEW)
-- =============================================================================

-- Equipment operational status
CREATE TYPE public.equipment_status AS ENUM (
    'active',
    'available',
    'in_maintenance',
    'down',
    'in_transit',
    'rented_out',
    'winterized',
    'sold_disposed'
);

-- Equipment category classification
CREATE TYPE public.equipment_category_enum AS ENUM (
    'earthmoving',
    'hauling',
    'lifting',
    'paving',
    'drilling_piling',
    'concrete',
    'support',
    'survey_grade_control',
    'other'
);

-- Ownership type
CREATE TYPE public.ownership_type AS ENUM (
    'owned',
    'financed',
    'leased',
    'rented',
    'customer_owned',
    'joint_venture'
);

-- Maintenance classification
CREATE TYPE public.maintenance_type AS ENUM (
    'preventive',
    'repair',
    'inspection',
    'warranty',
    'recall',
    'upgrade',
    'damage'
);

-- Maintenance priority levels
CREATE TYPE public.maintenance_priority AS ENUM (
    'emergency',
    'urgent',
    'high',
    'normal',
    'low'
);

-- Telematics provider integration
CREATE TYPE public.telematics_provider AS ENUM (
    'cat_visionlink',
    'john_deere_jdlink',
    'komatsu_komtrax',
    'volvo_caretrack',
    'hitachi_global_e_service',
    'case_sitewatch',
    'trimble',
    'topcon',
    'geotab',
    'manual'
);

-- Equipment fault severity
CREATE TYPE public.fault_severity AS ENUM (
    'info',
    'warning',
    'critical',
    'shutdown'
);

-- Location data source priority
CREATE TYPE public.location_source_priority AS ENUM (
    'telematics',
    'gps_manual',
    'daily_log',
    'manual_override'
);

-- =============================================================================
-- PART 2: CREW ENUMS
-- =============================================================================

-- Trade classification (Davis-Bacon compliant)
CREATE TYPE public.trade_classification AS ENUM (
    'heo_group_i',
    'heo_group_ii',
    'heo_group_iii',
    'heo_group_iv',
    'laborer_group_i',
    'laborer_group_ii',
    'laborer_group_iii',
    'laborer_group_iv',
    'carpenter',
    'bridge_carpenter',
    'pile_buck',
    'ironworker_structural',
    'ironworker_reinforcing',
    'cement_mason',
    'teamster',
    'mechanic',
    'welder',
    'foreman',
    'superintendent',
    'project_manager',
    'office_clerical',
    'professional',
    'apprentice',
    'other'
);

-- Employment type
CREATE TYPE public.employment_type AS ENUM (
    'full_time',
    'part_time',
    'seasonal',
    'temporary',
    'contract'
);

-- Operator proficiency level
CREATE TYPE public.proficiency_level AS ENUM (
    'trainee',
    'competent',
    'expert',
    'instructor'
);

-- EEO Race categories
CREATE TYPE public.eeo_race AS ENUM (
    'american_indian_alaska_native',
    'asian',
    'black_african_american',
    'hispanic_latino',
    'native_hawaiian_pacific_islander',
    'white',
    'two_or_more',
    'decline_to_state'
);

-- EEO Gender categories
CREATE TYPE public.eeo_gender AS ENUM (
    'male',
    'female',
    'non_binary',
    'decline_to_state'
);

-- Extend existing employment_status enum with new values (only if it exists)
-- NOTE: ALTER TYPE ADD VALUE cannot be in a transaction, but Supabase handles this
DO $$
BEGIN
    -- Check if the enum type exists before trying to extend it
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_status' AND typnamespace = 'public'::regnamespace) THEN
        -- Add new values if they don't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'on_leave' AND enumtypid = 'public.employment_status'::regtype) THEN
            ALTER TYPE public.employment_status ADD VALUE 'on_leave';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'laid_off' AND enumtypid = 'public.employment_status'::regtype) THEN
            ALTER TYPE public.employment_status ADD VALUE 'laid_off';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'retired' AND enumtypid = 'public.employment_status'::regtype) THEN
            ALTER TYPE public.employment_status ADD VALUE 'retired';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'seasonal_inactive' AND enumtypid = 'public.employment_status'::regtype) THEN
            ALTER TYPE public.employment_status ADD VALUE 'seasonal_inactive';
        END IF;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- Extend certification_status enum (only if it exists)
DO $$
BEGIN
    -- Check if the enum type exists before trying to extend it
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'certification_status' AND typnamespace = 'public'::regnamespace) THEN
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'expiring_soon' AND enumtypid = 'public.certification_status'::regtype) THEN
            ALTER TYPE public.certification_status ADD VALUE 'expiring_soon';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'pending_verification' AND enumtypid = 'public.certification_status'::regtype) THEN
            ALTER TYPE public.certification_status ADD VALUE 'pending_verification';
        END IF;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL; -- Handle case where type doesn't exist
END $$;

-- =============================================================================
-- PART 3: EXTEND EQUIPMENT TABLE
-- =============================================================================

-- Add new columns to existing equipment table
ALTER TABLE public.equipment
    ADD COLUMN IF NOT EXISTS equipment_status public.equipment_status,
    ADD COLUMN IF NOT EXISTS equipment_category_typed public.equipment_category_enum,
    ADD COLUMN IF NOT EXISTS subcategory TEXT,
    ADD COLUMN IF NOT EXISTS ownership_type public.ownership_type DEFAULT 'owned',
    ADD COLUMN IF NOT EXISTS operating_weight_lbs INTEGER,
    ADD COLUMN IF NOT EXISTS horsepower INTEGER,
    ADD COLUMN IF NOT EXISTS bucket_capacity_cy NUMERIC(6,2),
    ADD COLUMN IF NOT EXISTS reach_ft NUMERIC(6,1),
    ADD COLUMN IF NOT EXISTS lift_capacity_lbs INTEGER,
    ADD COLUMN IF NOT EXISTS acquisition_date DATE,
    ADD COLUMN IF NOT EXISTS acquisition_cost NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS current_book_value NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS salvage_value NUMERIC(14,2),
    ADD COLUMN IF NOT EXISTS useful_life_hours INTEGER,
    ADD COLUMN IF NOT EXISTS rental_company TEXT,
    ADD COLUMN IF NOT EXISTS rental_daily_rate NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS rental_weekly_rate NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS rental_monthly_rate NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS hourly_owning_cost NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS hourly_operating_cost NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS internal_rental_rate NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS current_operator_id UUID,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS home_location TEXT,
    ADD COLUMN IF NOT EXISTS current_latitude NUMERIC(10,6),
    ADD COLUMN IF NOT EXISTS current_longitude NUMERIC(10,6),
    ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS location_source public.location_source_priority,
    ADD COLUMN IF NOT EXISTS location_conflict_flagged BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS location_conflict_notes TEXT,
    ADD COLUMN IF NOT EXISTS current_engine_hours NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS hours_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS telematics_provider_typed public.telematics_provider,
    ADD COLUMN IF NOT EXISTS telematics_device_id TEXT,
    ADD COLUMN IF NOT EXISTS last_telematics_update TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_service_hours NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS next_service_due_hours NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS service_interval_hours INTEGER DEFAULT 500,
    ADD COLUMN IF NOT EXISTS last_annual_inspection DATE,
    ADD COLUMN IF NOT EXISTS next_annual_inspection DATE,
    ADD COLUMN IF NOT EXISTS target_utilization_percent NUMERIC(5,2) DEFAULT 75,
    ADD COLUMN IF NOT EXISTS target_monthly_hours NUMERIC(8,2),
    ADD COLUMN IF NOT EXISTS primary_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_equipment_status_typed ON public.equipment(equipment_status);
CREATE INDEX IF NOT EXISTS idx_equipment_category_typed ON public.equipment(equipment_category_typed);
CREATE INDEX IF NOT EXISTS idx_equipment_location ON public.equipment(current_latitude, current_longitude);
CREATE INDEX IF NOT EXISTS idx_equipment_telematics ON public.equipment(telematics_provider_typed, telematics_device_id);
CREATE INDEX IF NOT EXISTS idx_equipment_operator ON public.equipment(current_operator_id);
CREATE INDEX IF NOT EXISTS idx_equipment_deleted ON public.equipment(deleted_at) WHERE deleted_at IS NULL;

-- =============================================================================
-- PART 4: EQUIPMENT LOCATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,

    -- Position
    latitude NUMERIC(10,6) NOT NULL,
    longitude NUMERIC(10,6) NOT NULL,
    altitude_ft NUMERIC(10,2),
    heading_degrees INTEGER,
    speed_mph NUMERIC(6,2),
    accuracy_meters NUMERIC(8,2),

    -- Context
    address TEXT,
    geofence_id UUID REFERENCES public.geofences(id),
    project_id UUID REFERENCES public.projects(id),

    -- Source tracking
    source public.location_source_priority NOT NULL,
    source_device_id TEXT,

    -- Engine state
    engine_running BOOLEAN,
    engine_hours NUMERIC(12,2),

    -- Timestamps
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_loc_equipment ON public.equipment_locations(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_loc_time ON public.equipment_locations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_equip_loc_project ON public.equipment_locations(project_id);
CREATE INDEX IF NOT EXISTS idx_equip_loc_geofence ON public.equipment_locations(geofence_id);

-- RLS for equipment_locations
ALTER TABLE public.equipment_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_locations_select" ON public.equipment_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.equipment e
            WHERE e.id = equipment_locations.equipment_id
              AND e.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "equipment_locations_insert" ON public.equipment_locations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.equipment e
            WHERE e.id = equipment_locations.equipment_id
              AND e.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- =============================================================================
-- PART 5: EQUIPMENT DAILY LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.equipment_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id),

    log_date DATE NOT NULL,

    -- Hours tracking (KEY: includes scheduled_hours for utilization calc)
    start_hours NUMERIC(12,2),
    end_hours NUMERIC(12,2),
    working_hours NUMERIC(8,2),
    idle_hours NUMERIC(8,2),
    scheduled_hours NUMERIC(8,2),
    available_hours NUMERIC(8,2) DEFAULT 10,

    -- Operator
    operator_id UUID REFERENCES public.employees(id),
    operator_name TEXT,

    -- Location
    work_location TEXT,
    latitude NUMERIC(10,6),
    longitude NUMERIC(10,6),

    -- Fuel
    fuel_added_gallons NUMERIC(10,2),
    fuel_cost NUMERIC(10,2),

    -- Cost tracking
    cost_code_id UUID REFERENCES public.cost_codes(id),

    -- Work details
    work_performed TEXT,
    issues_reported TEXT,
    maintenance_needed BOOLEAN DEFAULT FALSE,
    maintenance_notes TEXT,

    -- Weather impact
    weather_delay_hours NUMERIC(6,2) DEFAULT 0,
    weather_notes TEXT,

    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,

    -- Sync status
    source TEXT DEFAULT 'MANUAL',
    sync_status TEXT DEFAULT 'SYNCED',
    local_id TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(equipment_id, log_date)
);

CREATE INDEX IF NOT EXISTS idx_equip_daily_log_equipment ON public.equipment_daily_logs(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equip_daily_log_project ON public.equipment_daily_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_equip_daily_log_date ON public.equipment_daily_logs(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_equip_daily_log_operator ON public.equipment_daily_logs(operator_id);

-- RLS for equipment_daily_logs
ALTER TABLE public.equipment_daily_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "equipment_daily_logs_select" ON public.equipment_daily_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.equipment e
            WHERE e.id = equipment_daily_logs.equipment_id
              AND e.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "equipment_daily_logs_insert" ON public.equipment_daily_logs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.equipment e
            WHERE e.id = equipment_daily_logs.equipment_id
              AND e.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "equipment_daily_logs_update" ON public.equipment_daily_logs FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.equipment e
            WHERE e.id = equipment_daily_logs.equipment_id
              AND e.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- =============================================================================
-- PART 6: MAINTENANCE RECORDS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),

    -- Classification
    maintenance_type public.maintenance_type NOT NULL,
    priority public.maintenance_priority NOT NULL DEFAULT 'normal',

    -- Details
    title TEXT NOT NULL,
    description TEXT,
    work_performed TEXT,

    -- Status workflow
    status TEXT NOT NULL DEFAULT 'scheduled',

    -- Scheduling
    scheduled_date DATE,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Engine hours at service
    hours_at_service NUMERIC(12,2),

    -- Location/vendor
    service_location TEXT,
    vendor_name TEXT,
    work_order_number TEXT,
    invoice_number TEXT,

    -- Costs
    labor_hours NUMERIC(8,2),
    labor_cost NUMERIC(12,2),
    parts_cost NUMERIC(12,2),
    outside_service_cost NUMERIC(12,2),
    total_cost NUMERIC(12,2),

    -- Parts used (JSONB for flexibility)
    parts_used JSONB,

    -- Warranty
    is_warranty BOOLEAN DEFAULT FALSE,
    warranty_claim_number TEXT,

    -- Next service scheduling
    next_service_hours NUMERIC(12,2),
    next_service_date DATE,

    -- Documents
    document_urls TEXT[],
    photo_urls TEXT[],

    -- Project/cost code association
    project_id UUID REFERENCES public.projects(id),
    cost_code_id UUID REFERENCES public.cost_codes(id),

    -- Workflow
    requested_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    completed_by UUID REFERENCES auth.users(id),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON public.maintenance_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_org ON public.maintenance_records(organization_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON public.maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_scheduled ON public.maintenance_records(scheduled_date) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_maintenance_type ON public.maintenance_records(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_priority ON public.maintenance_records(priority);

-- RLS for maintenance_records
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_records_select" ON public.maintenance_records FOR SELECT
    USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "maintenance_records_insert" ON public.maintenance_records FOR INSERT
    WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "maintenance_records_update" ON public.maintenance_records FOR UPDATE
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- =============================================================================
-- PART 7: EXTEND EXISTING CREW MEMBERS TABLE
-- =============================================================================
-- NOTE: crew_members table already exists with different schema
-- Adding new columns to extend functionality

ALTER TABLE public.crew_members
    ADD COLUMN IF NOT EXISTS secondary_classifications TEXT[],
    ADD COLUMN IF NOT EXISTS union_affiliation TEXT,
    ADD COLUMN IF NOT EXISTS union_local TEXT,
    ADD COLUMN IF NOT EXISTS union_member_number TEXT,
    ADD COLUMN IF NOT EXISTS pay_type TEXT DEFAULT 'hourly',
    ADD COLUMN IF NOT EXISTS current_project_id UUID REFERENCES public.projects(id),
    ADD COLUMN IF NOT EXISTS current_supervisor_id UUID REFERENCES public.crew_members(id),
    ADD COLUMN IF NOT EXISTS department TEXT,
    ADD COLUMN IF NOT EXISTS is_cdl_driver BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS cdl_number TEXT,
    ADD COLUMN IF NOT EXISTS cdl_state TEXT,
    ADD COLUMN IF NOT EXISTS cdl_class TEXT,
    ADD COLUMN IF NOT EXISTS cdl_endorsements TEXT[],
    ADD COLUMN IF NOT EXISTS cdl_expiry DATE,
    ADD COLUMN IF NOT EXISTS dot_medical_expiry DATE,
    ADD COLUMN IF NOT EXISTS is_dbe_employee BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS can_operate_equipment BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS equipment_certifications JSONB,
    ADD COLUMN IF NOT EXISTS photo_url TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add indexes using existing column names from crew_members table
CREATE INDEX IF NOT EXISTS idx_crew_members_org ON public.crew_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_employee ON public.crew_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_trade ON public.crew_members(trade_classification);
CREATE INDEX IF NOT EXISTS idx_crew_members_project ON public.crew_members(default_project_id);
CREATE INDEX IF NOT EXISTS idx_crew_members_cdl ON public.crew_members(is_cdl_driver) WHERE is_cdl_driver = TRUE;
CREATE INDEX IF NOT EXISTS idx_crew_members_deleted ON public.crew_members(deleted_at) WHERE deleted_at IS NULL;

-- RLS for crew_members (may already exist, so use DROP IF EXISTS first)
ALTER TABLE public.crew_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crew_members_select" ON public.crew_members;
CREATE POLICY "crew_members_select" ON public.crew_members FOR SELECT
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND deleted_at IS NULL
    );

DROP POLICY IF EXISTS "crew_members_insert" ON public.crew_members;
CREATE POLICY "crew_members_insert" ON public.crew_members FOR INSERT
    WITH CHECK (
        organization_id = public.get_user_organization_id(auth.uid())
        AND public.user_has_permission(auth.uid(), 'users.create', NULL)
    );

DROP POLICY IF EXISTS "crew_members_update" ON public.crew_members;
CREATE POLICY "crew_members_update" ON public.crew_members FOR UPDATE
    USING (
        organization_id = public.get_user_organization_id(auth.uid())
        AND public.user_has_permission(auth.uid(), 'users.update', NULL)
    );

-- =============================================================================
-- PART 8: EXTEND EMPLOYEE_CERTIFICATIONS TABLE
-- =============================================================================

-- Add verification and tracking columns
ALTER TABLE public.employee_certifications
    ADD COLUMN IF NOT EXISTS verification_method TEXT,
    ADD COLUMN IF NOT EXISTS verification_reference TEXT,
    ADD COLUMN IF NOT EXISTS renewal_required BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS renewal_reminder_sent BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS training_cost NUMERIC(10,2),
    ADD COLUMN IF NOT EXISTS paid_by TEXT;

-- =============================================================================
-- PART 9: OPERATOR QUALIFICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.operator_qualifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crew_member_id UUID NOT NULL REFERENCES public.crew_members(id) ON DELETE CASCADE,

    -- Equipment scope
    equipment_category equipment_category_enum,
    equipment_make TEXT,
    equipment_model TEXT,
    specific_equipment_id UUID REFERENCES public.equipment(id),

    -- Qualification details
    qualification_type TEXT NOT NULL,
    certification_number TEXT,
    certifying_body TEXT,

    -- Dates
    qualified_date DATE NOT NULL,
    expiry_date DATE,

    -- Proficiency
    proficiency_level public.proficiency_level DEFAULT 'competent',
    training_hours NUMERIC(8,2),

    -- Restrictions
    restrictions TEXT,

    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    verification_method TEXT,

    -- Documentation
    certificate_url TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_op_qual_crew ON public.operator_qualifications(crew_member_id);
CREATE INDEX IF NOT EXISTS idx_op_qual_category ON public.operator_qualifications(equipment_category);
CREATE INDEX IF NOT EXISTS idx_op_qual_equipment ON public.operator_qualifications(specific_equipment_id);
CREATE INDEX IF NOT EXISTS idx_op_qual_expiry ON public.operator_qualifications(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_op_qual_active ON public.operator_qualifications(is_active) WHERE is_active = TRUE;

-- RLS for operator_qualifications
ALTER TABLE public.operator_qualifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operator_qualifications_select" ON public.operator_qualifications FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.crew_members cm
            WHERE cm.id = operator_qualifications.crew_member_id
              AND cm.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "operator_qualifications_insert" ON public.operator_qualifications FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.crew_members cm
            WHERE cm.id = operator_qualifications.crew_member_id
              AND cm.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "operator_qualifications_update" ON public.operator_qualifications FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.crew_members cm
            WHERE cm.id = operator_qualifications.crew_member_id
              AND cm.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- =============================================================================
-- PART 10: WAGE RATES SCD TYPE 2 ENHANCEMENT
-- =============================================================================

-- Add SCD Type 2 versioning column (supersedes_rate_id) to wage_rates
-- NOTE: wage_rates already has effective_date and expiration_date columns
ALTER TABLE public.wage_rates
    ADD COLUMN IF NOT EXISTS supersedes_rate_id UUID REFERENCES public.wage_rates(id);

-- Create index for current rate lookups (partial index on null expiration_date)
CREATE INDEX IF NOT EXISTS idx_wage_rates_current
    ON public.wage_rates(organization_id, state, county, trade_classification)
    WHERE expiration_date IS NULL;

-- Function to get wage rate as of a specific date
-- Uses existing effective_date/expiration_date columns
CREATE OR REPLACE FUNCTION public.get_wage_rate_as_of(
    p_org_id UUID,
    p_state TEXT,
    p_county TEXT,
    p_classification TEXT,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    rate_id UUID,
    base_hourly_rate NUMERIC,
    fringe_rate NUMERIC,
    total_rate NUMERIC,
    determination_number TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wr.id,
        wr.base_hourly_rate,
        wr.fringe_rate,
        COALESCE(wr.total_hourly_rate, wr.base_hourly_rate + COALESCE(wr.fringe_rate, 0)) AS total_rate,
        wr.wage_determination_number
    FROM public.wage_rates wr
    WHERE wr.organization_id = p_org_id
      AND wr.state = p_state
      AND LOWER(wr.county) = LOWER(p_county)
      AND LOWER(wr.trade_classification) = LOWER(p_classification)
      AND p_as_of_date >= wr.effective_date
      AND (wr.expiration_date IS NULL OR p_as_of_date <= wr.expiration_date)
      AND wr.is_active = TRUE
    ORDER BY wr.effective_date DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 11: VIEWS
-- =============================================================================

-- Equipment Utilization View (CORRECTED: scheduled/available formula)
CREATE OR REPLACE VIEW public.v_equipment_utilization AS
SELECT
    e.id AS equipment_id,
    e.equipment_number,
    e.description,
    e.equipment_category,
    e.equipment_category_typed,
    DATE_TRUNC('month', edl.log_date) AS month,

    SUM(edl.working_hours) AS working_hours,
    SUM(edl.idle_hours) AS idle_hours,
    SUM(edl.scheduled_hours) AS scheduled_hours,
    SUM(edl.available_hours) AS available_hours,

    COUNT(DISTINCT edl.log_date) AS days_logged,

    -- CORRECTED: Utilization = Scheduled / Available
    ROUND(
        (SUM(COALESCE(edl.scheduled_hours, edl.working_hours)) /
         NULLIF(SUM(edl.available_hours), 0)) * 100,
        1
    ) AS utilization_percent,

    -- Efficiency = Working / Scheduled
    ROUND(
        (SUM(edl.working_hours) /
         NULLIF(SUM(COALESCE(edl.scheduled_hours, edl.working_hours + edl.idle_hours)), 0)) * 100,
        1
    ) AS efficiency_percent,

    e.target_utilization_percent,
    ROUND(
        (SUM(COALESCE(edl.scheduled_hours, edl.working_hours)) /
         NULLIF(SUM(edl.available_hours), 0)) * 100 - COALESCE(e.target_utilization_percent, 0),
        1
    ) AS utilization_variance

FROM public.equipment e
LEFT JOIN public.equipment_daily_logs edl ON e.id = edl.equipment_id
WHERE e.deleted_at IS NULL
GROUP BY e.id, e.equipment_number, e.description, e.equipment_category,
         e.equipment_category_typed, e.target_utilization_percent,
         DATE_TRUNC('month', edl.log_date);

-- Equipment Fleet Overview View
CREATE OR REPLACE VIEW public.v_equipment_fleet_overview AS
SELECT
    e.id,
    e.equipment_number,
    e.description,
    e.equipment_category,
    e.equipment_category_typed,
    e.make,
    e.model,
    e.status,
    e.equipment_status,
    e.ownership_type,
    e.current_hours AS current_engine_hours,
    e.current_project_id,
    p.project_number,
    p.name AS project_name,
    e.current_latitude,
    e.current_longitude,
    e.current_location_updated_at AS last_location_update,
    e.location_conflict_flagged,
    COALESCE(e.hourly_owning_cost, 0) + COALESCE(e.hourly_operating_cost, 0) AS hourly_total_cost,
    e.next_service_due_date,
    e.next_service_due_hours,
    e.dot_inspection_due AS next_annual_inspection,

    CASE
        WHEN e.next_service_due_date < CURRENT_DATE THEN 'OVERDUE'
        WHEN e.next_service_due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'DUE_SOON'
        WHEN e.next_service_due_hours IS NOT NULL
             AND e.current_hours >= e.next_service_due_hours - 50 THEN 'HOURS_DUE_SOON'
        ELSE 'OK'
    END AS maintenance_status,

    CASE
        WHEN e.dot_inspection_due < CURRENT_DATE THEN 'OVERDUE'
        WHEN e.dot_inspection_due <= CURRENT_DATE + INTERVAL '30 days' THEN 'DUE_SOON'
        ELSE 'OK'
    END AS inspection_status

FROM public.equipment e
LEFT JOIN public.projects p ON e.current_project_id = p.id
WHERE e.deleted_at IS NULL
  AND e.status != 'SOLD_DISPOSED';

-- Crew Roster View
-- NOTE: Uses existing crew_members table structure which stores crew data directly
CREATE OR REPLACE VIEW public.v_crew_roster AS
SELECT
    cm.id,
    cm.employee_id,
    cm.first_name,
    cm.last_name,
    COALESCE(cm.display_name, cm.first_name || ' ' || cm.last_name) AS full_name,
    cm.employment_type,
    cm.trade_classification,
    cm.trade_classification_detail,
    cm.hire_date,
    cm.default_project_id AS current_project_id,
    p.project_number,
    p.name AS project_name,
    cm.phone,
    cm.email,
    cm.is_active,
    cm.is_cdl_driver,
    cm.cdl_expiry,
    cm.dot_medical_expiry,
    cm.can_operate_equipment,
    cm.base_hourly_rate,
    cm.overtime_rate,
    cm.certifications,

    -- Certification counts (via employee_certifications if linked)
    CASE WHEN cm.employee_id IS NOT NULL THEN
        (SELECT COUNT(*) FROM public.employee_certifications ec
         WHERE ec.employee_id = cm.employee_id::UUID AND ec.status = 'active')
    ELSE 0 END AS active_cert_count,

    CASE WHEN cm.employee_id IS NOT NULL THEN
        (SELECT COUNT(*) FROM public.employee_certifications ec
         WHERE ec.employee_id = cm.employee_id::UUID AND ec.status = 'expiring_soon')
    ELSE 0 END AS expiring_cert_count,

    CASE WHEN cm.employee_id IS NOT NULL THEN
        (SELECT COUNT(*) FROM public.employee_certifications ec
         WHERE ec.employee_id = cm.employee_id::UUID AND ec.status = 'expired')
    ELSE 0 END AS expired_cert_count,

    CASE
        WHEN cm.employee_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.employee_certifications ec
            WHERE ec.employee_id = cm.employee_id::UUID AND ec.status = 'expired'
        ) THEN 'EXPIRED'
        WHEN cm.employee_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.employee_certifications ec
            WHERE ec.employee_id = cm.employee_id::UUID AND ec.status = 'expiring_soon'
        ) THEN 'EXPIRING_SOON'
        ELSE 'COMPLIANT'
    END AS certification_status

FROM public.crew_members cm
LEFT JOIN public.projects p ON cm.default_project_id = p.id
WHERE cm.deleted_at IS NULL;

-- =============================================================================
-- PART 12: FUNCTIONS
-- =============================================================================

-- Location Conflict Detection Trigger Function
CREATE OR REPLACE FUNCTION public.check_equipment_location_conflict()
RETURNS TRIGGER AS $$
DECLARE
    v_telematics_location RECORD;
    v_distance_miles NUMERIC;
    v_conflict_threshold_miles NUMERIC := 5;
    v_equipment RECORD;
BEGIN
    -- Skip if this is a telematics source
    IF NEW.source = 'telematics' THEN
        RETURN NEW;
    END IF;

    -- Get the most recent telematics location
    SELECT * INTO v_telematics_location
    FROM public.equipment_locations
    WHERE equipment_id = NEW.equipment_id
      AND source = 'telematics'
      AND recorded_at > NOW() - INTERVAL '2 hours'
    ORDER BY recorded_at DESC
    LIMIT 1;

    IF v_telematics_location.id IS NOT NULL THEN
        -- Calculate distance using Haversine formula
        v_distance_miles := 3959 * acos(
            LEAST(1, GREATEST(-1,
                cos(radians(v_telematics_location.latitude)) * cos(radians(NEW.latitude)) *
                cos(radians(NEW.longitude) - radians(v_telematics_location.longitude)) +
                sin(radians(v_telematics_location.latitude)) * sin(radians(NEW.latitude))
            ))
        );

        IF v_distance_miles > v_conflict_threshold_miles THEN
            -- Flag the equipment record
            UPDATE public.equipment
            SET location_conflict_flagged = TRUE,
                location_conflict_notes = format(
                    'Manual location %.1f miles from telematics at %s',
                    v_distance_miles,
                    v_telematics_location.recorded_at
                )
            WHERE id = NEW.equipment_id
            RETURNING * INTO v_equipment;

            -- Create platform alert
            INSERT INTO public.platform_alerts (
                organization_id, alert_type, severity, category,
                entity_type, entity_id, entity_identifier,
                title, description, metadata
            )
            SELECT
                v_equipment.organization_id,
                'LOCATION_CONFLICT',
                'MEDIUM'::platform_alert_severity,
                'OPERATIONAL'::platform_alert_category,
                'EQUIPMENT',
                v_equipment.id,
                v_equipment.equipment_number,
                'Location Conflict: ' || v_equipment.equipment_number,
                format('Reported location is %.1f miles from telematics location', v_distance_miles),
                jsonb_build_object(
                    'telematics_lat', v_telematics_location.latitude,
                    'telematics_lng', v_telematics_location.longitude,
                    'reported_lat', NEW.latitude,
                    'reported_lng', NEW.longitude,
                    'distance_miles', v_distance_miles
                );
        ELSE
            -- Clear conflict flag if within threshold
            UPDATE public.equipment
            SET location_conflict_flagged = FALSE,
                location_conflict_notes = NULL
            WHERE id = NEW.equipment_id
              AND location_conflict_flagged = TRUE;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply location conflict trigger
DROP TRIGGER IF EXISTS trg_check_equipment_location_conflict ON public.equipment_locations;
CREATE TRIGGER trg_check_equipment_location_conflict
    AFTER INSERT ON public.equipment_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.check_equipment_location_conflict();

-- Certification Alert Generator Function
CREATE OR REPLACE FUNCTION public.generate_certification_alerts()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_cert RECORD;
BEGIN
    FOR v_cert IN
        SELECT
            emp.id AS employee_id,
            emp.organization_id,
            emp.first_name || ' ' || emp.last_name AS employee_name,
            ec.certification_type,
            ec.expiration_date AS expiry_date,
            (ec.expiration_date - CURRENT_DATE) AS days_until_expiry,
            CASE
                WHEN ec.expiration_date < CURRENT_DATE THEN 'CRITICAL'
                WHEN ec.expiration_date < CURRENT_DATE + INTERVAL '7 days' THEN 'HIGH'
                WHEN ec.expiration_date < CURRENT_DATE + INTERVAL '30 days' THEN 'MEDIUM'
                ELSE 'LOW'
            END AS severity
        FROM public.employees emp
        JOIN public.employee_certifications ec ON emp.id = ec.employee_id
        WHERE emp.deleted_at IS NULL
          AND emp.employment_status = 'active'
          AND ec.expiration_date IS NOT NULL
          AND ec.expiration_date <= CURRENT_DATE + INTERVAL '60 days'
    LOOP
        -- Check if alert already exists
        IF NOT EXISTS (
            SELECT 1 FROM public.platform_alerts
            WHERE entity_type = 'EMPLOYEE'
              AND entity_id = v_cert.employee_id
              AND alert_type = 'CERT_EXPIRING'
              AND metadata->>'certification_type' = v_cert.certification_type
              AND status IN ('ACTIVE', 'ACKNOWLEDGED', 'SNOOZED')
        ) THEN
            INSERT INTO public.platform_alerts (
                organization_id, alert_type, severity, category,
                entity_type, entity_id, entity_identifier,
                title, description, due_date, metadata
            ) VALUES (
                v_cert.organization_id,
                'CERT_EXPIRING',
                v_cert.severity::platform_alert_severity,
                'COMPLIANCE'::platform_alert_category,
                'EMPLOYEE',
                v_cert.employee_id,
                v_cert.employee_name,
                v_cert.certification_type || ' Expiring: ' || v_cert.employee_name,
                format('%s certification %s for %s',
                    v_cert.certification_type,
                    CASE
                        WHEN v_cert.days_until_expiry < 0 THEN 'EXPIRED ' || abs(v_cert.days_until_expiry) || ' days ago'
                        ELSE 'expires in ' || v_cert.days_until_expiry || ' days'
                    END,
                    v_cert.employee_name
                ),
                v_cert.expiry_date,
                jsonb_build_object(
                    'certification_type', v_cert.certification_type,
                    'expiry_date', v_cert.expiry_date
                )
            );

            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Find Qualified Operators Function
CREATE OR REPLACE FUNCTION public.find_qualified_operators(
    p_equipment_id UUID,
    p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
    crew_member_id UUID,
    operator_name TEXT,
    proficiency public.proficiency_level,
    is_on_project BOOLEAN,
    qualification_type TEXT
) AS $$
DECLARE
    v_equipment RECORD;
BEGIN
    SELECT * INTO v_equipment FROM public.equipment WHERE id = p_equipment_id;

    RETURN QUERY
    SELECT
        cm.id,
        emp.first_name || ' ' || emp.last_name,
        oq.proficiency_level,
        CASE WHEN p_project_id IS NOT NULL THEN cm.current_project_id = p_project_id ELSE FALSE END,
        oq.qualification_type
    FROM public.crew_members cm
    JOIN public.employees emp ON cm.employee_id = emp.id
    JOIN public.operator_qualifications oq ON cm.id = oq.crew_member_id
    WHERE cm.deleted_at IS NULL
      AND emp.employment_status = 'active'
      AND oq.is_active = TRUE
      AND (oq.expiry_date IS NULL OR oq.expiry_date >= CURRENT_DATE)
      AND (
          oq.specific_equipment_id = p_equipment_id
          OR (
              oq.equipment_category = v_equipment.equipment_category_typed
              AND (oq.equipment_make IS NULL OR oq.equipment_make = v_equipment.make)
              AND (oq.equipment_model IS NULL OR oq.equipment_model = v_equipment.model)
          )
      )
    ORDER BY
        CASE oq.proficiency_level
            WHEN 'instructor' THEN 1
            WHEN 'expert' THEN 2
            WHEN 'competent' THEN 3
            WHEN 'trainee' THEN 4
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- PART 13: TRIGGERS AND AUDIT
-- =============================================================================

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS trg_equipment_daily_logs_updated_at ON public.equipment_daily_logs;
CREATE TRIGGER trg_equipment_daily_logs_updated_at
    BEFORE UPDATE ON public.equipment_daily_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_maintenance_records_updated_at ON public.maintenance_records;
CREATE TRIGGER trg_maintenance_records_updated_at
    BEFORE UPDATE ON public.maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_crew_members_updated_at ON public.crew_members;
CREATE TRIGGER trg_crew_members_updated_at
    BEFORE UPDATE ON public.crew_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_operator_qualifications_updated_at ON public.operator_qualifications;
CREATE TRIGGER trg_operator_qualifications_updated_at
    BEFORE UPDATE ON public.operator_qualifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Audit triggers (if audit_trigger_function exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_trigger_function') THEN
        DROP TRIGGER IF EXISTS trg_audit_crew_members ON public.crew_members;
        CREATE TRIGGER trg_audit_crew_members
            AFTER INSERT OR UPDATE OR DELETE ON public.crew_members
            FOR EACH ROW
            EXECUTE FUNCTION public.audit_trigger_function();

        DROP TRIGGER IF EXISTS trg_audit_maintenance_records ON public.maintenance_records;
        CREATE TRIGGER trg_audit_maintenance_records
            AFTER INSERT OR UPDATE OR DELETE ON public.maintenance_records
            FOR EACH ROW
            EXECUTE FUNCTION public.audit_trigger_function();

        DROP TRIGGER IF EXISTS trg_audit_operator_qualifications ON public.operator_qualifications;
        CREATE TRIGGER trg_audit_operator_qualifications
            AFTER INSERT OR UPDATE OR DELETE ON public.operator_qualifications
            FOR EACH ROW
            EXECUTE FUNCTION public.audit_trigger_function();
    END IF;
END $$;

-- =============================================================================
-- COMPLETE
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 087: Equipment & Crew Management Module completed successfully';
    RAISE NOTICE 'Created:';
    RAISE NOTICE '  - 8 Equipment enums (equipment_status, equipment_category_enum, ownership_type, etc.)';
    RAISE NOTICE '  - 5 Crew enums (trade_classification, employment_type, proficiency_level, etc.)';
    RAISE NOTICE '  - Extended employment_status with 4 new values';
    RAISE NOTICE '  - Extended equipment table with 40+ new columns';
    RAISE NOTICE '  - equipment_locations table';
    RAISE NOTICE '  - equipment_daily_logs table';
    RAISE NOTICE '  - maintenance_records table';
    RAISE NOTICE '  - crew_members table (linked to employees)';
    RAISE NOTICE '  - operator_qualifications table';
    RAISE NOTICE '  - Extended employee_certifications with verification fields';
    RAISE NOTICE '  - SCD Type 2 wage rate support';
    RAISE NOTICE '  - 3 views (v_equipment_utilization, v_equipment_fleet_overview, v_crew_roster)';
    RAISE NOTICE '  - 4 functions (location conflict, cert alerts, qualified operators, wage rate lookup)';
    RAISE NOTICE '  - RLS policies on all new tables';
    RAISE NOTICE '  - Audit triggers on key tables';
END $$;
