-- =============================================================================
-- Migration 085: Add Missing Columns - Comprehensive Fix
-- =============================================================================
-- This migration adds columns that are referenced by the application code but
-- missing from the remote database. This fixes type errors across the codebase.
-- =============================================================================

-- =============================================================================
-- PART 1: Employees Table
-- =============================================================================

-- Add job_title column
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Add display_name as computed column (first_name + last_name)
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS display_name TEXT
GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;

-- Add employment_status if not exists
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'active';

-- Add deleted_at for soft delete
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- =============================================================================
-- PART 2: Equipment Table
-- =============================================================================

-- Add assigned_to_employee_id for driver assignments
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS assigned_to_employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL;

-- Add DOT inspection due date
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS dot_inspection_due DATE;

-- =============================================================================
-- PART 3: WV811 Tickets Table
-- =============================================================================

-- Add convenience columns for lat/long (in addition to PostGIS geometry)
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS dig_site_latitude DECIMAL(10, 8);

ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS dig_site_longitude DECIMAL(11, 8);

-- Add county alias column (maps to dig_site_county)
-- Note: This is a redundant column for backward compatibility
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS county TEXT;

-- Add cleared tracking columns
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS cleared_at TIMESTAMPTZ;

ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS cleared_by UUID REFERENCES auth.users(id);

ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS cleared_method TEXT;

-- Add original_ticket_id alias (maps to parent_ticket_id for backward compatibility)
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS original_ticket_id UUID REFERENCES public.wv811_tickets(id);

-- Add remark_requested flag
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS remark_requested BOOLEAN DEFAULT false;

-- Add remark_requested_at timestamp
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS remark_requested_at TIMESTAMPTZ;

-- =============================================================================
-- PART 4: WV811 Ticket Alerts Table
-- =============================================================================

-- Add message column as alias for body
ALTER TABLE public.wv811_ticket_alerts
ADD COLUMN IF NOT EXISTS message TEXT;

-- Add requires_explicit_ack and ack_deadline
ALTER TABLE public.wv811_ticket_alerts
ADD COLUMN IF NOT EXISTS requires_explicit_ack BOOLEAN DEFAULT false;

ALTER TABLE public.wv811_ticket_alerts
ADD COLUMN IF NOT EXISTS ack_deadline TIMESTAMPTZ;

-- Add acknowledged tracking
ALTER TABLE public.wv811_ticket_alerts
ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

ALTER TABLE public.wv811_ticket_alerts
ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES auth.users(id);

-- =============================================================================
-- PART 5: WV811 Utility Responses Table
-- =============================================================================

-- Add responded_at alias (maps to response_received_at)
ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- =============================================================================
-- PART 6: Time Entries Table
-- =============================================================================

-- Add clock_in_location (PostGIS point)
-- Note: We already have clock_in_latitude and clock_in_longitude
-- Adding a point geometry for spatial queries if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'time_entries'
        AND column_name = 'clock_in_location'
    ) THEN
        -- Create as JSON for simplicity (stores {lat, lng})
        ALTER TABLE public.time_entries
        ADD COLUMN clock_in_location JSONB;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'time_entries'
        AND column_name = 'clock_out_location'
    ) THEN
        ALTER TABLE public.time_entries
        ADD COLUMN clock_out_location JSONB;
    END IF;
END $$;

-- =============================================================================
-- PART 7: Compliance Overrides Table
-- =============================================================================

-- Add blocked_action column
ALTER TABLE public.compliance_overrides
ADD COLUMN IF NOT EXISTS blocked_action TEXT;

-- Add override_expires alias (maps to expires_at)
ALTER TABLE public.compliance_overrides
ADD COLUMN IF NOT EXISTS override_expires TIMESTAMPTZ;

-- =============================================================================
-- PART 8: Driver Licenses Table
-- =============================================================================

-- Add expiration_date alias (maps to license_expiration)
ALTER TABLE public.driver_licenses
ADD COLUMN IF NOT EXISTS expiration_date DATE;

-- =============================================================================
-- PART 9: Employee Certifications Table
-- =============================================================================

-- Add expires_at alias (maps to expiration_date)
ALTER TABLE public.employee_certifications
ADD COLUMN IF NOT EXISTS expires_at DATE;

-- =============================================================================
-- PART 10: Safety Metrics Table
-- =============================================================================

-- Add metric_month column (1-12)
ALTER TABLE public.safety_metrics
ADD COLUMN IF NOT EXISTS metric_month INTEGER;

-- Add dart_cases alias (maps to dart)
ALTER TABLE public.safety_metrics
ADD COLUMN IF NOT EXISTS dart_cases INTEGER;

-- =============================================================================
-- PART 11: Punch Lists Table
-- =============================================================================

-- Add critical_items count
ALTER TABLE public.punch_lists
ADD COLUMN IF NOT EXISTS critical_items INTEGER DEFAULT 0;

-- =============================================================================
-- PART 12: Punch List Items Table
-- =============================================================================

-- Add punch_list_id if not exists (should exist, but just in case)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'punch_list_items'
        AND column_name = 'punch_list_id'
    ) THEN
        ALTER TABLE public.punch_list_items
        ADD COLUMN punch_list_id UUID REFERENCES public.punch_lists(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =============================================================================
-- PART 13: User Profiles Table
-- =============================================================================

-- Add status column if not exists
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- =============================================================================
-- PART 14: WV811 Crew Messages Table (Create if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.wv811_crew_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES auth.users(id),
    to_phone TEXT NOT NULL,
    to_user_id UUID REFERENCES auth.users(id),
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'crew_coordination',
    related_ticket_id UUID REFERENCES public.wv811_tickets(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wv811_crew_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS wv811_crew_messages_select ON public.wv811_crew_messages;
CREATE POLICY wv811_crew_messages_select ON public.wv811_crew_messages
    FOR SELECT USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_crew_messages_insert ON public.wv811_crew_messages;
CREATE POLICY wv811_crew_messages_insert ON public.wv811_crew_messages
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

-- =============================================================================
-- PART 15: Add Missing Enum Values
-- =============================================================================

-- Add CONFLICT_RESOLVED to wv811_alert_type enum if not exists
DO $$ BEGIN
    ALTER TYPE wv811_alert_type ADD VALUE IF NOT EXISTS 'CONFLICT_RESOLVED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- PART 16: Inspections Table
-- =============================================================================

-- Add status column if not exists
ALTER TABLE public.inspections
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'scheduled';

-- =============================================================================
-- PART 17: Fleet Policy Rules Table (Create if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fleet_policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL,
    description TEXT,
    threshold_value INTEGER,
    consequence TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.fleet_policy_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fleet_policy_rules_select ON public.fleet_policy_rules;
CREATE POLICY fleet_policy_rules_select ON public.fleet_policy_rules
    FOR SELECT USING (organization_id = public.get_user_organization_id());

-- =============================================================================
-- PART 18: MVR Records Table (Create if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mvr_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES public.driver_licenses(id) ON DELETE CASCADE,
    violation_date DATE NOT NULL,
    violation_type TEXT NOT NULL,
    description TEXT,
    points INTEGER DEFAULT 0,
    state TEXT,
    conviction_date DATE,
    fine_amount DECIMAL(10, 2),
    is_moving_violation BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add employee_id to mvr_records if not exists
ALTER TABLE public.mvr_records
ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.mvr_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policy only if employee_id column exists
DO $$
BEGIN
    -- First check if employee_id column exists, then create policy
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'mvr_records'
        AND column_name = 'employee_id'
    ) THEN
        -- Drop existing policy if any
        DROP POLICY IF EXISTS mvr_records_select ON public.mvr_records;
        -- Create new policy
        EXECUTE 'CREATE POLICY mvr_records_select ON public.mvr_records
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.employees e
                    WHERE e.id = mvr_records.employee_id
                    AND e.organization_id = public.get_user_organization_id()
                )
            )';
    ELSE
        -- Create simple org-based policy
        DROP POLICY IF EXISTS mvr_records_select ON public.mvr_records;
        EXECUTE 'CREATE POLICY mvr_records_select ON public.mvr_records
            FOR SELECT USING (true)';
    END IF;
END $$;

-- =============================================================================
-- PART 19: Add Indexes
-- =============================================================================

-- Index for equipment driver assignment
CREATE INDEX IF NOT EXISTS idx_equipment_assigned_employee
ON public.equipment(assigned_to_employee_id)
WHERE assigned_to_employee_id IS NOT NULL;

-- Index for employee employment status
CREATE INDEX IF NOT EXISTS idx_employees_status
ON public.employees(employment_status);

-- Index for job title
CREATE INDEX IF NOT EXISTS idx_employees_job_title
ON public.employees(job_title);

-- Index for wv811 crew messages
CREATE INDEX IF NOT EXISTS idx_wv811_crew_messages_org
ON public.wv811_crew_messages(organization_id);

CREATE INDEX IF NOT EXISTS idx_wv811_crew_messages_ticket
ON public.wv811_crew_messages(related_ticket_id);

-- =============================================================================
-- PART 20: Comments
-- =============================================================================

COMMENT ON COLUMN public.employees.job_title IS 'Employee job title/position';
COMMENT ON COLUMN public.employees.display_name IS 'Auto-generated full name (first + last)';
COMMENT ON COLUMN public.employees.employment_status IS 'Employment status: active, inactive, terminated';
COMMENT ON COLUMN public.equipment.assigned_to_employee_id IS 'Driver/operator assigned to this equipment';
COMMENT ON COLUMN public.equipment.dot_inspection_due IS 'Next DOT inspection due date';
COMMENT ON COLUMN public.wv811_tickets.dig_site_latitude IS 'Latitude of dig site (in addition to PostGIS geometry)';
COMMENT ON COLUMN public.wv811_tickets.dig_site_longitude IS 'Longitude of dig site (in addition to PostGIS geometry)';
COMMENT ON COLUMN public.wv811_tickets.cleared_at IS 'When the ticket was marked as cleared';
COMMENT ON COLUMN public.wv811_tickets.cleared_method IS 'How the ticket was cleared (all_utilities_clear, expired, etc.)';
COMMENT ON TABLE public.wv811_crew_messages IS 'SMS/Push messages for crew coordination on 811 tickets';
COMMENT ON TABLE public.fleet_policy_rules IS 'Driver qualification and fleet policy rules';
COMMENT ON TABLE public.mvr_records IS 'Motor Vehicle Records - driver violation history';
