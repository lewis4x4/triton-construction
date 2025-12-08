-- =============================================================================
-- Migration 088: Fix crew_members Constraints
-- =============================================================================
-- PURPOSE: Drop old CHECK constraints and update columns to use new ENUM types
-- DEPENDS ON: Migration 087 (which created the enum types)
-- NOTE: crew_members table is empty, so this is safe to run
-- IMPORTANT: Must drop views that depend on trade_classification column
-- =============================================================================

DO $$
DECLARE
    v_active_crew_def TEXT;
    v_crew_roster_def TEXT;
    v_weekly_timesheets_def TEXT;
    v_pending_time_approvals_def TEXT;
BEGIN
    -- =========================================================================
    -- PART 1: Save view definitions
    -- =========================================================================

    -- Get view definitions before dropping
    SELECT pg_get_viewdef('public.v_active_crew'::regclass, true) INTO v_active_crew_def;
    SELECT pg_get_viewdef('public.v_crew_roster'::regclass, true) INTO v_crew_roster_def;
    SELECT pg_get_viewdef('public.v_weekly_timesheets'::regclass, true) INTO v_weekly_timesheets_def;

    -- Try to get v_pending_time_approvals if it exists
    BEGIN
        SELECT pg_get_viewdef('public.v_pending_time_approvals'::regclass, true) INTO v_pending_time_approvals_def;
    EXCEPTION WHEN undefined_table THEN
        v_pending_time_approvals_def := NULL;
    END;

    RAISE NOTICE 'Saved view definitions';

    -- =========================================================================
    -- PART 2: Drop dependent views (in order of dependencies)
    -- =========================================================================

    DROP VIEW IF EXISTS public.v_pending_time_approvals CASCADE;
    DROP VIEW IF EXISTS public.v_weekly_timesheets CASCADE;
    DROP VIEW IF EXISTS public.v_crew_roster CASCADE;
    DROP VIEW IF EXISTS public.v_active_crew CASCADE;

    RAISE NOTICE 'Dropped dependent views';

    -- =========================================================================
    -- PART 3: Drop CHECK constraints
    -- =========================================================================

    ALTER TABLE public.crew_members
        DROP CONSTRAINT IF EXISTS crew_members_trade_classification_check;

    ALTER TABLE public.crew_members
        DROP CONSTRAINT IF EXISTS crew_members_employment_type_check;

    RAISE NOTICE 'Dropped CHECK constraints';

    -- =========================================================================
    -- PART 4: Alter columns to use ENUM types
    -- =========================================================================

    -- First, drop any existing defaults
    ALTER TABLE public.crew_members
        ALTER COLUMN trade_classification DROP DEFAULT;

    ALTER TABLE public.crew_members
        ALTER COLUMN employment_type DROP DEFAULT;

    -- Now alter the types
    ALTER TABLE public.crew_members
        ALTER COLUMN trade_classification TYPE public.trade_classification
        USING trade_classification::public.trade_classification;

    ALTER TABLE public.crew_members
        ALTER COLUMN employment_type TYPE public.employment_type
        USING employment_type::public.employment_type;

    -- Set the new defaults
    ALTER TABLE public.crew_members
        ALTER COLUMN employment_type SET DEFAULT 'full_time'::public.employment_type;

    RAISE NOTICE 'Altered column types to use ENUMs';

END $$;

-- =============================================================================
-- PART 5: Recreate views with TEXT cast for trade_classification
-- =============================================================================

-- Recreate v_active_crew view
CREATE OR REPLACE VIEW public.v_active_crew AS
SELECT
    cm.id,
    cm.organization_id,
    cm.employee_id,
    cm.display_name,
    cm.email,
    cm.phone,
    cm.trade_classification::TEXT as trade_classification,
    cm.default_project_id,
    p.name AS default_project_name,
    COUNT(cc.id) FILTER (WHERE cc.expiration_date > CURRENT_DATE OR cc.expiration_date IS NULL) AS active_cert_count,
    MIN(cc.expiration_date) FILTER (WHERE cc.expiration_date > CURRENT_DATE) AS next_cert_expiration
FROM public.crew_members cm
LEFT JOIN public.projects p ON cm.default_project_id = p.id
LEFT JOIN public.crew_certifications cc ON cm.id = cc.crew_member_id
WHERE cm.is_active = TRUE
GROUP BY
    cm.id,
    cm.organization_id,
    cm.employee_id,
    cm.display_name,
    cm.email,
    cm.phone,
    cm.trade_classification,
    cm.default_project_id,
    p.name;

COMMENT ON VIEW public.v_active_crew IS 'Active crew members with certification summary and default project';

-- Recreate v_crew_roster view
CREATE OR REPLACE VIEW public.v_crew_roster AS
SELECT
    cm.id,
    cm.employee_id,
    cm.first_name,
    cm.last_name,
    cm.first_name || ' ' || cm.last_name AS full_name,
    cm.email,
    cm.phone,
    cm.trade_classification::TEXT AS trade_classification,
    cm.trade_classification_detail,
    cm.employment_type::TEXT AS employment_type,
    cm.base_hourly_rate,
    cm.overtime_rate,
    cm.hire_date,
    cm.is_cdl_driver,
    cm.cdl_expiry,
    cm.dot_medical_expiry,
    cm.current_project_id,
    p.name AS project_name,
    p.project_number,
    cm.is_active,
    cm.can_operate_equipment,
    -- Certification summary (using expiration_date since there's no status column)
    COUNT(cc.id) FILTER (WHERE cc.expiration_date > CURRENT_DATE OR cc.expiration_date IS NULL) AS active_cert_count,
    COUNT(cc.id) FILTER (WHERE cc.expiration_date <= CURRENT_DATE + INTERVAL '30 days' AND cc.expiration_date > CURRENT_DATE) AS expiring_cert_count,
    COUNT(cc.id) FILTER (WHERE cc.expiration_date IS NOT NULL AND cc.expiration_date <= CURRENT_DATE) AS expired_cert_count,
    -- Overall certification status
    CASE
        WHEN COUNT(cc.id) FILTER (WHERE cc.expiration_date IS NOT NULL AND cc.expiration_date <= CURRENT_DATE) > 0 THEN 'expired'
        WHEN COUNT(cc.id) FILTER (WHERE cc.expiration_date <= CURRENT_DATE + INTERVAL '30 days' AND cc.expiration_date > CURRENT_DATE) > 0 THEN 'expiring_soon'
        WHEN COUNT(cc.id) FILTER (WHERE cc.expiration_date > CURRENT_DATE OR cc.expiration_date IS NULL) > 0 THEN 'current'
        ELSE 'no_certs'
    END AS certification_status,
    -- Certifications as JSON array
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', cc.id,
                'certification_type', cc.certification_type,
                'certification_number', cc.certificate_number,
                'expiration_date', cc.expiration_date,
                'is_verified', cc.is_verified
            )
        ) FILTER (WHERE cc.id IS NOT NULL),
        '[]'::jsonb
    ) AS certifications
FROM public.crew_members cm
LEFT JOIN public.projects p ON cm.current_project_id = p.id
LEFT JOIN public.crew_certifications cc ON cm.id = cc.crew_member_id
GROUP BY
    cm.id,
    cm.employee_id,
    cm.first_name,
    cm.last_name,
    cm.email,
    cm.phone,
    cm.trade_classification,
    cm.trade_classification_detail,
    cm.employment_type,
    cm.base_hourly_rate,
    cm.overtime_rate,
    cm.hire_date,
    cm.is_cdl_driver,
    cm.cdl_expiry,
    cm.dot_medical_expiry,
    cm.current_project_id,
    p.name,
    p.project_number,
    cm.is_active,
    cm.can_operate_equipment;

COMMENT ON VIEW public.v_crew_roster IS 'Comprehensive crew roster with certification status and project assignments';

-- Recreate v_weekly_timesheets view
CREATE OR REPLACE VIEW public.v_weekly_timesheets AS
SELECT
    cm.id AS crew_member_id,
    cm.display_name AS worker_name,
    cm.trade_classification::TEXT AS trade_classification,
    cm.organization_id,
    DATE_TRUNC('week', te.work_date)::DATE AS week_start,
    SUM(te.regular_hours) AS total_regular,
    SUM(te.overtime_hours) AS total_overtime,
    SUM(te.double_time_hours) AS total_double_time,
    SUM(te.regular_hours + te.overtime_hours + te.double_time_hours) AS total_hours,
    COUNT(DISTINCT te.work_date) AS days_worked,
    COUNT(DISTINCT te.project_id) AS projects_worked,
    ARRAY_AGG(DISTINCT p.name) AS project_names
FROM public.crew_members cm
JOIN public.time_entries te ON cm.id = te.crew_member_id
JOIN public.projects p ON te.project_id = p.id
GROUP BY
    cm.id,
    cm.display_name,
    cm.trade_classification,
    cm.organization_id,
    DATE_TRUNC('week', te.work_date);

COMMENT ON VIEW public.v_weekly_timesheets IS 'Weekly timesheet summary by crew member';

-- Recreate v_pending_time_approvals view
CREATE OR REPLACE VIEW public.v_pending_time_approvals AS
SELECT
    te.id,
    te.crew_member_id,
    cm.display_name AS worker_name,
    cm.trade_classification::TEXT AS trade_classification,
    te.project_id,
    p.name AS project_name,
    p.project_number,
    te.work_date,
    te.regular_hours,
    te.overtime_hours,
    te.double_time_hours,
    te.regular_hours + te.overtime_hours + te.double_time_hours AS total_hours,
    te.status,
    te.submitted_at,
    te.entered_by_user_id
FROM public.time_entries te
JOIN public.crew_members cm ON te.crew_member_id = cm.id
JOIN public.projects p ON te.project_id = p.id
WHERE te.status IN ('pending', 'submitted');

COMMENT ON VIEW public.v_pending_time_approvals IS 'Time entries pending approval';

-- =============================================================================
-- PART 6: Add column comments
-- =============================================================================

COMMENT ON COLUMN public.crew_members.trade_classification IS
    'Davis-Bacon compliant trade classification using public.trade_classification enum';

COMMENT ON COLUMN public.crew_members.employment_type IS
    'Employment type using public.employment_type enum (full_time, part_time, seasonal, temporary, contract)';

-- =============================================================================
-- SUMMARY
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 088: Fixed crew_members constraints';
    RAISE NOTICE '  - Dropped dependent views (v_active_crew, v_crew_roster, v_weekly_timesheets, v_pending_time_approvals)';
    RAISE NOTICE '  - Dropped old CHECK constraints for trade_classification and employment_type';
    RAISE NOTICE '  - Altered columns to use ENUM types from migration 087';
    RAISE NOTICE '  - Recreated all dependent views with TEXT cast for trade_classification';
    RAISE NOTICE '  - crew_members now accepts values like: heo_group_ii, carpenter, laborer_group_i, etc.';
END $$;
