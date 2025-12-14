-- =============================================================================
-- Migration 114: Safety Management Enhancements
-- =============================================================================
-- Part of comprehensive Safety Management module enhancement:
-- 1. Competent Person Validation with blocking triggers
-- 2. Safety Certification Alert system
-- 3. Work-type to competent person requirements mapping
-- 4. JSA-to-daily-work linking
-- 5. Auto-OSHA-300 trigger for recordable incidents
-- =============================================================================

-- ============================================================================
-- PART 1: Work Type to Competent Person Requirements
-- ============================================================================
-- Maps construction work types to required competent persons per OSHA

CREATE TABLE IF NOT EXISTS public.work_type_competent_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Work type identification
    work_type TEXT NOT NULL,  -- EXCAVATION, SCAFFOLDING, CONFINED_SPACE, etc.
    work_type_description TEXT,

    -- Required competent person types (from competent_person_type enum)
    required_competent_persons TEXT[] NOT NULL,

    -- OSHA reference
    osha_standard TEXT,       -- e.g., 29 CFR 1926.651(k)

    -- Enforcement
    is_blocking BOOLEAN DEFAULT true,  -- If true, work cannot start without competent person

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(organization_id, work_type)
);

-- Indexes
CREATE INDEX idx_work_comp_req_org ON public.work_type_competent_requirements(organization_id);
CREATE INDEX idx_work_comp_req_type ON public.work_type_competent_requirements(work_type);
CREATE INDEX idx_work_comp_req_active ON public.work_type_competent_requirements(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.work_type_competent_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_comp_req_org_access" ON public.work_type_competent_requirements
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 2: Default Work Type Requirements (OSHA-based)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_competent_requirements(p_organization_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Excavation/Trenching - 29 CFR 1926.651(k)
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'EXCAVATION', 'Excavation and trenching operations >5ft deep', ARRAY['excavation'], '29 CFR 1926.651(k)', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Scaffolding - 29 CFR 1926.451(f)
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'SCAFFOLDING', 'Scaffold erection, modification, or dismantling', ARRAY['scaffolding'], '29 CFR 1926.451(f)', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Confined Space - 29 CFR 1926.1204
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'CONFINED_SPACE', 'Permit-required confined space entry', ARRAY['confined_space'], '29 CFR 1926.1204', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Fall Protection - 29 CFR 1926.502
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'WORK_AT_HEIGHT', 'Work at heights >6ft requiring fall protection', ARRAY['fall_protection'], '29 CFR 1926.502', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Crane Operations - 29 CFR 1926.1404
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'CRANE_LIFT', 'Crane operations and rigging', ARRAY['crane_rigging'], '29 CFR 1926.1404', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Electrical Work - 29 CFR 1926.405
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'ELECTRICAL', 'Electrical installation or maintenance', ARRAY['electrical'], '29 CFR 1926.405', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Lockout/Tagout - 29 CFR 1910.147
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'LOTO', 'Equipment lockout/tagout procedures', ARRAY['lockout_tagout'], '29 CFR 1910.147', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Respiratory Hazards - 29 CFR 1926.103
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'RESPIRATORY', 'Work requiring respiratory protection', ARRAY['respiratory_protection'], '29 CFR 1926.103', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Hazmat - 29 CFR 1926.65
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'HAZMAT', 'Hazardous materials handling', ARRAY['hazmat'], '29 CFR 1926.65', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Traffic Control - MUTCD
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'TRAFFIC_CONTROL', 'Work zone traffic control setup', ARRAY['traffic_control'], 'MUTCD Part 6', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Demolition - 29 CFR 1926.850
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'DEMOLITION', 'Structural demolition', ARRAY['demolition'], '29 CFR 1926.850', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;

    -- Steel Erection - 29 CFR 1926.752
    INSERT INTO public.work_type_competent_requirements (organization_id, work_type, work_type_description, required_competent_persons, osha_standard, is_blocking)
    VALUES (p_organization_id, 'STEEL_ERECTION', 'Structural steel erection', ARRAY['steel_erection', 'fall_protection'], '29 CFR 1926.752', true)
    ON CONFLICT (organization_id, work_type) DO NOTHING;
END;
$$;

-- ============================================================================
-- PART 3: Validate Competent Person for Work
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_competent_person_for_work(
    p_organization_id UUID,
    p_project_id UUID,
    p_work_type TEXT,
    p_assigned_employee_ids UUID[]
)
RETURNS TABLE (
    is_valid BOOLEAN,
    missing_competent_persons TEXT[],
    violations JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_required TEXT[];
    v_missing TEXT[];
    v_violations JSONB := '[]'::JSONB;
    v_req_type TEXT;
    v_has_competent BOOLEAN;
BEGIN
    -- Get required competent person types for this work type
    SELECT wtcr.required_competent_persons INTO v_required
    FROM public.work_type_competent_requirements wtcr
    WHERE wtcr.organization_id = p_organization_id
      AND wtcr.work_type = p_work_type
      AND wtcr.is_active = true
      AND wtcr.is_blocking = true;

    -- If no requirements found, work is allowed
    IF v_required IS NULL OR array_length(v_required, 1) IS NULL THEN
        RETURN QUERY SELECT true, ARRAY[]::TEXT[], '[]'::JSONB;
        RETURN;
    END IF;

    v_missing := ARRAY[]::TEXT[];

    -- Check each required competent person type
    FOREACH v_req_type IN ARRAY v_required
    LOOP
        -- Check if any assigned employee has valid competent person designation
        SELECT EXISTS (
            SELECT 1 FROM public.competent_person_designations cpd
            WHERE cpd.employee_id = ANY(p_assigned_employee_ids)
              AND cpd.competent_person_type::TEXT = v_req_type
              AND cpd.is_active = true
              AND (cpd.expiration_date IS NULL OR cpd.expiration_date > CURRENT_DATE)
              AND cpd.revoked_at IS NULL
        ) INTO v_has_competent;

        IF NOT v_has_competent THEN
            v_missing := array_append(v_missing, v_req_type);
            v_violations := v_violations || jsonb_build_object(
                'violation_type', 'competent_person_missing',
                'work_type', p_work_type,
                'required_competent_person', v_req_type,
                'message', format('No valid %s competent person assigned to crew', v_req_type)
            );
        END IF;
    END LOOP;

    RETURN QUERY SELECT
        array_length(v_missing, 1) IS NULL OR array_length(v_missing, 1) = 0,
        v_missing,
        v_violations;
END;
$$;

-- ============================================================================
-- PART 4: Blocking Trigger for Daily Work Activities
-- ============================================================================
-- Blocks daily report entries for high-risk work without competent person

CREATE OR REPLACE FUNCTION public.validate_daily_report_competent_person()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org_id UUID;
    v_project_id UUID;
    v_crew_ids UUID[];
    v_work_type TEXT;
    v_validation RECORD;
BEGIN
    -- Only validate if entry_type is WORK_PERFORMED
    IF NEW.entry_type != 'WORK_PERFORMED' THEN
        RETURN NEW;
    END IF;

    -- Get project and org from daily report
    SELECT dr.organization_id, dr.project_id INTO v_org_id, v_project_id
    FROM public.daily_reports dr
    WHERE dr.id = NEW.daily_report_id;

    IF v_org_id IS NULL THEN
        RETURN NEW;  -- Can't validate without org
    END IF;

    -- Try to determine work type from description (keywords)
    v_work_type := CASE
        WHEN LOWER(NEW.description) ~ 'excavat|trench|dig' THEN 'EXCAVATION'
        WHEN LOWER(NEW.description) ~ 'scaffold' THEN 'SCAFFOLDING'
        WHEN LOWER(NEW.description) ~ 'confined\s*space|manhole|culvert entry' THEN 'CONFINED_SPACE'
        WHEN LOWER(NEW.description) ~ 'crane|lift|rigging' THEN 'CRANE_LIFT'
        WHEN LOWER(NEW.description) ~ 'electrical|wiring' THEN 'ELECTRICAL'
        WHEN LOWER(NEW.description) ~ 'demolition|demo' THEN 'DEMOLITION'
        WHEN LOWER(NEW.description) ~ 'steel erect|structural steel' THEN 'STEEL_ERECTION'
        WHEN LOWER(NEW.description) ~ 'traffic control|flagging|lane closure' THEN 'TRAFFIC_CONTROL'
        ELSE NULL
    END;

    -- If no high-risk work type detected, allow
    IF v_work_type IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get crew assigned to this daily report
    SELECT ARRAY_AGG(DISTINCT dm.employee_id) INTO v_crew_ids
    FROM public.daily_manpower dm
    WHERE dm.daily_report_id = NEW.daily_report_id
      AND dm.employee_id IS NOT NULL;

    -- If no crew assigned yet, skip validation (will be validated on submit)
    IF v_crew_ids IS NULL OR array_length(v_crew_ids, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- Validate competent person requirements
    SELECT * INTO v_validation
    FROM public.validate_competent_person_for_work(v_org_id, v_project_id, v_work_type, v_crew_ids);

    IF NOT v_validation.is_valid THEN
        -- Create compliance violation record
        INSERT INTO public.compliance_violations (
            organization_id,
            project_id,
            violation_type,
            severity,
            source_type,
            source_id,
            details,
            auto_generated,
            status
        ) VALUES (
            v_org_id,
            v_project_id,
            'competent_person_missing',
            'CRITICAL',
            'daily_report_entry',
            NEW.id,
            jsonb_build_object(
                'work_type', v_work_type,
                'missing_competent_persons', v_validation.missing_competent_persons,
                'description', NEW.description,
                'daily_report_id', NEW.daily_report_id
            ),
            true,
            'open'
        );

        -- Block the work entry with clear error message
        RAISE EXCEPTION 'SAFETY VIOLATION: % work requires competent person(s): %. No valid competent person found in assigned crew.',
            v_work_type,
            array_to_string(v_validation.missing_competent_persons, ', ')
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger (only for blocking mode - configurable)
DROP TRIGGER IF EXISTS daily_report_entry_competent_check ON public.daily_report_entries;
CREATE TRIGGER daily_report_entry_competent_check
    BEFORE INSERT OR UPDATE ON public.daily_report_entries
    FOR EACH ROW EXECUTE FUNCTION public.validate_daily_report_competent_person();

-- ============================================================================
-- PART 5: Safety Certification Expiration Alerts
-- ============================================================================

-- Add new violation type for safety cert expiration
-- Check if violation_type column allows this value
DO $$
BEGIN
    -- Try to add the value if it doesn't exist
    ALTER TYPE public.violation_type ADD VALUE IF NOT EXISTS 'safety_cert_expiring';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE public.violation_type ADD VALUE IF NOT EXISTS 'safety_cert_expired';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE public.violation_type ADD VALUE IF NOT EXISTS 'competent_person_missing';
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- Function to check for expiring safety certifications
CREATE OR REPLACE FUNCTION public.check_safety_certification_alerts()
RETURNS TABLE (
    alert_type TEXT,
    organization_id UUID,
    employee_id UUID,
    employee_name TEXT,
    certification_type TEXT,
    expiration_date DATE,
    days_until_expiration INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check competent person designations expiring in 30 days
    RETURN QUERY
    SELECT
        'competent_person_expiring'::TEXT as alert_type,
        cpd.organization_id,
        cpd.employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        cpd.competent_person_type::TEXT as certification_type,
        cpd.expiration_date,
        (cpd.expiration_date - CURRENT_DATE)::INTEGER as days_until_expiration
    FROM public.competent_person_designations cpd
    JOIN public.employees e ON e.id = cpd.employee_id
    WHERE cpd.is_active = true
      AND cpd.revoked_at IS NULL
      AND cpd.expiration_date IS NOT NULL
      AND cpd.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    ORDER BY cpd.expiration_date;

    -- Check crew certifications expiring in 30 days
    RETURN QUERY
    SELECT
        'crew_cert_expiring'::TEXT as alert_type,
        e.organization_id,
        cc.crew_member_id as employee_id,
        e.first_name || ' ' || e.last_name as employee_name,
        cc.certification_type as certification_type,
        cc.expiration_date,
        (cc.expiration_date - CURRENT_DATE)::INTEGER as days_until_expiration
    FROM public.crew_certifications cc
    JOIN public.employees e ON e.id = cc.crew_member_id
    WHERE cc.is_active = true
      AND cc.expiration_date IS NOT NULL
      AND cc.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    ORDER BY cc.expiration_date;
END;
$$;

-- ============================================================================
-- PART 6: Auto-Queue Safety Cert Notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION public.queue_safety_cert_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_alert RECORD;
    v_count INTEGER := 0;
    v_notification_exists BOOLEAN;
BEGIN
    FOR v_alert IN
        SELECT * FROM public.check_safety_certification_alerts()
        WHERE days_until_expiration IN (30, 14, 7, 3, 1, 0)  -- Alert at specific intervals
    LOOP
        -- Check if we already queued this alert today
        SELECT EXISTS (
            SELECT 1 FROM public.notification_queue nq
            WHERE nq.reference_type = 'safety_cert_alert'
              AND nq.reference_id = v_alert.employee_id::TEXT || '_' || v_alert.certification_type
              AND nq.created_at::DATE = CURRENT_DATE
        ) INTO v_notification_exists;

        IF NOT v_notification_exists THEN
            INSERT INTO public.notification_queue (
                organization_id,
                notification_type,
                priority,
                reference_type,
                reference_id,
                recipient_roles,
                channels,
                subject,
                body,
                data,
                status,
                scheduled_for
            ) VALUES (
                v_alert.organization_id,
                CASE
                    WHEN v_alert.days_until_expiration <= 0 THEN 'safety_cert_expired'
                    WHEN v_alert.days_until_expiration <= 7 THEN 'safety_cert_critical'
                    ELSE 'safety_cert_warning'
                END,
                CASE
                    WHEN v_alert.days_until_expiration <= 0 THEN 1
                    WHEN v_alert.days_until_expiration <= 7 THEN 2
                    ELSE 3
                END,
                'safety_cert_alert',
                v_alert.employee_id::TEXT || '_' || v_alert.certification_type,
                ARRAY['SAFETY_MANAGER', 'PROJECT_MANAGER'],
                ARRAY['email', 'in_app'],
                CASE
                    WHEN v_alert.days_until_expiration <= 0
                    THEN format('%s Certification EXPIRED for %s', v_alert.certification_type, v_alert.employee_name)
                    ELSE format('%s Certification expiring in %s days - %s',
                        v_alert.certification_type,
                        v_alert.days_until_expiration,
                        v_alert.employee_name)
                END,
                CASE
                    WHEN v_alert.days_until_expiration <= 0
                    THEN format('The %s certification for %s expired on %s. Worker cannot perform %s work until recertified.',
                        v_alert.certification_type, v_alert.employee_name, v_alert.expiration_date, v_alert.certification_type)
                    ELSE format('The %s certification for %s expires on %s (%s days). Please arrange for recertification.',
                        v_alert.certification_type, v_alert.employee_name, v_alert.expiration_date, v_alert.days_until_expiration)
                END,
                jsonb_build_object(
                    'employee_id', v_alert.employee_id,
                    'employee_name', v_alert.employee_name,
                    'certification_type', v_alert.certification_type,
                    'expiration_date', v_alert.expiration_date,
                    'days_until_expiration', v_alert.days_until_expiration,
                    'alert_type', v_alert.alert_type
                ),
                'pending',
                NOW()
            );

            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ============================================================================
-- PART 7: Auto OSHA 300 Entry on Recordable Incident
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_osha_300_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_org RECORD;
    v_employee_name TEXT := 'Unknown';
    v_job_title TEXT;
    v_case_number TEXT;
    v_next_case INTEGER;
BEGIN
    -- Only create OSHA 300 entry for recordable incidents
    IF NOT NEW.osha_recordable THEN
        RETURN NEW;
    END IF;

    -- Only on INSERT or when becoming recordable
    IF TG_OP = 'UPDATE' AND OLD.osha_recordable = true THEN
        RETURN NEW;
    END IF;

    -- Get organization info
    SELECT name, legal_name, address_line1, city, state, zip_code INTO v_org
    FROM public.organizations
    WHERE id = NEW.organization_id;

    -- Get employee info
    IF NEW.injured_employee_id IS NOT NULL THEN
        SELECT first_name || ' ' || last_name, job_title INTO v_employee_name, v_job_title
        FROM public.employees
        WHERE id = NEW.injured_employee_id;
    ELSIF NEW.injured_subcontractor_worker_id IS NOT NULL THEN
        SELECT first_name || ' ' || last_name, job_title INTO v_employee_name, v_job_title
        FROM public.subcontractor_workers
        WHERE id = NEW.injured_subcontractor_worker_id;
    ELSIF NEW.injured_third_party_name IS NOT NULL THEN
        v_employee_name := NEW.injured_third_party_name;
    END IF;

    -- Get next case number
    SELECT COALESCE(MAX(
        NULLIF(REGEXP_REPLACE(case_number, '[^0-9]', '', 'g'), '')::INTEGER
    ), 0) + 1 INTO v_next_case
    FROM public.osha_300_logs
    WHERE organization_id = NEW.organization_id
      AND log_year = EXTRACT(YEAR FROM NEW.incident_date);

    v_case_number := LPAD(v_next_case::TEXT, 3, '0');

    -- Update incident with case number
    NEW.osha_case_number := v_case_number;

    -- Insert OSHA 300 entry
    INSERT INTO public.osha_300_logs (
        organization_id,
        establishment_name,
        establishment_address,
        city,
        state,
        zip,
        log_year,
        incident_id,
        case_number,
        employee_name,
        job_title,
        date_of_injury,
        where_occurred,
        describe_injury,
        is_death,
        is_days_away,
        is_job_transfer_restriction,
        is_other_recordable,
        days_away_count,
        days_job_transfer_count,
        type_injury,
        is_privacy_case
    ) VALUES (
        NEW.organization_id,
        COALESCE(v_org.legal_name, v_org.name),
        v_org.address_line1,
        v_org.city,
        v_org.state,
        v_org.zip_code,
        EXTRACT(YEAR FROM NEW.incident_date),
        NEW.id,
        v_case_number,
        v_employee_name,
        v_job_title,
        NEW.incident_date,
        COALESCE(NEW.location_description, 'Job site'),
        COALESCE(NEW.injury_description, NEW.description),
        NEW.classification = 'fatality',
        NEW.days_away_from_work > 0,
        NEW.days_restricted_duty > 0 AND NEW.days_away_from_work = 0,
        NEW.days_away_from_work = 0 AND NEW.days_restricted_duty = 0,
        COALESCE(NEW.days_away_from_work, 0),
        COALESCE(NEW.days_restricted_duty, 0),
        true,  -- Default to injury type
        false
    );

    RETURN NEW;
END;
$$;

-- Create trigger for auto OSHA 300
DROP TRIGGER IF EXISTS incident_auto_osha_300 ON public.incidents;
CREATE TRIGGER incident_auto_osha_300
    BEFORE INSERT OR UPDATE ON public.incidents
    FOR EACH ROW
    WHEN (NEW.osha_recordable = true)
    EXECUTE FUNCTION public.auto_create_osha_300_entry();

-- ============================================================================
-- PART 8: JSA-Daily Work Linking Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.daily_work_jsa_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_report_id UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
    daily_report_entry_id UUID REFERENCES public.daily_report_entries(id) ON DELETE CASCADE,
    jsa_id UUID NOT NULL REFERENCES public.job_safety_analysis(id),

    -- Acknowledgment that JSA was reviewed
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,

    -- Any site-specific modifications noted
    site_modifications TEXT,
    additional_hazards_noted TEXT[],

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_jsa_report ON public.daily_work_jsa_links(daily_report_id);
CREATE INDEX idx_daily_jsa_entry ON public.daily_work_jsa_links(daily_report_entry_id);
CREATE INDEX idx_daily_jsa_jsa ON public.daily_work_jsa_links(jsa_id);

ALTER TABLE public.daily_work_jsa_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_jsa_links_access" ON public.daily_work_jsa_links
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.daily_reports dr
            WHERE dr.id = daily_report_id
            AND dr.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- PART 9: Competent Person Compliance View
-- ============================================================================

-- Ensure missing columns exist (may be missing in some deployments)
ALTER TABLE public.competent_person_designations
ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE public.competent_person_designations
ADD COLUMN IF NOT EXISTS training_provider TEXT;

ALTER TABLE public.competent_person_designations
ADD COLUMN IF NOT EXISTS certificate_number TEXT;

ALTER TABLE public.competent_person_designations
ADD COLUMN IF NOT EXISTS expiration_date DATE;

ALTER TABLE public.competent_person_designations
ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE public.competent_person_designations
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

CREATE OR REPLACE VIEW public.v_competent_person_compliance AS
SELECT
    cpd.organization_id,
    cpd.employee_id,
    e.first_name || ' ' || e.last_name as employee_name,
    e.job_title,
    cpd.competent_person_type,
    cpd.effective_date,
    cpd.expiration_date,
    cpd.training_provider,
    cpd.certificate_number,
    cpd.is_active,
    CASE
        WHEN cpd.revoked_at IS NOT NULL THEN 'REVOKED'
        WHEN cpd.expiration_date IS NULL THEN 'VALID'
        WHEN cpd.expiration_date < CURRENT_DATE THEN 'EXPIRED'
        WHEN cpd.expiration_date < CURRENT_DATE + INTERVAL '30 days' THEN 'EXPIRING_SOON'
        ELSE 'VALID'
    END as status,
    CASE
        WHEN cpd.expiration_date IS NOT NULL
        THEN (cpd.expiration_date - CURRENT_DATE)::INTEGER
        ELSE NULL
    END as days_until_expiration,
    -- Project assignments where this competent person is active
    (
        SELECT array_agg(DISTINCT p.name)
        FROM public.project_assignments pa
        JOIN public.projects p ON p.id = pa.project_id
        WHERE pa.user_id = (SELECT id FROM auth.users WHERE email = e.email LIMIT 1)
          AND p.status = 'ACTIVE'
    ) as active_projects
FROM public.competent_person_designations cpd
JOIN public.employees e ON e.id = cpd.employee_id
WHERE cpd.is_active = true
  AND cpd.revoked_at IS NULL;

-- ============================================================================
-- PART 10: Safety Metrics Refresh Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_safety_metrics(
    p_organization_id UUID,
    p_year INTEGER DEFAULT NULL,
    p_quarter INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year INTEGER := COALESCE(p_year, EXTRACT(YEAR FROM CURRENT_DATE));
    v_quarter INTEGER := COALESCE(p_quarter, EXTRACT(QUARTER FROM CURRENT_DATE));
    v_start_date DATE;
    v_end_date DATE;
BEGIN
    -- Calculate date range for quarter
    v_start_date := make_date(v_year, (v_quarter - 1) * 3 + 1, 1);
    v_end_date := (v_start_date + INTERVAL '3 months' - INTERVAL '1 day')::DATE;

    -- Upsert metrics
    INSERT INTO public.safety_metrics (
        organization_id,
        metric_year,
        metric_quarter,
        total_hours_worked,
        fatalities,
        hospitalizations,
        recordable_injuries,
        first_aid_cases,
        near_misses_reported,
        days_away_from_work,
        days_restricted_duty,
        safety_observations_positive,
        safety_observations_atrisk,
        hazards_identified,
        hazards_corrected,
        toolbox_talks_conducted,
        jsas_created,
        jsas_reviewed
    )
    SELECT
        p_organization_id,
        v_year,
        v_quarter,
        -- Hours from time entries (estimate)
        COALESCE((
            SELECT SUM(te.regular_hours + COALESCE(te.overtime_hours, 0))
            FROM public.time_entries te
            JOIN public.projects p ON p.id = te.project_id
            WHERE p.organization_id = p_organization_id
              AND te.work_date BETWEEN v_start_date AND v_end_date
        ), 0),
        -- Incidents
        (SELECT COUNT(*) FROM public.incidents WHERE organization_id = p_organization_id AND incident_date BETWEEN v_start_date AND v_end_date AND classification = 'fatality'),
        (SELECT COUNT(*) FROM public.incidents WHERE organization_id = p_organization_id AND incident_date BETWEEN v_start_date AND v_end_date AND classification = 'hospitalization'),
        (SELECT COUNT(*) FROM public.incidents WHERE organization_id = p_organization_id AND incident_date BETWEEN v_start_date AND v_end_date AND osha_recordable = true),
        (SELECT COUNT(*) FROM public.incidents WHERE organization_id = p_organization_id AND incident_date BETWEEN v_start_date AND v_end_date AND classification = 'first_aid_only'),
        (SELECT COUNT(*) FROM public.incidents WHERE organization_id = p_organization_id AND incident_date BETWEEN v_start_date AND v_end_date AND classification = 'near_miss'),
        (SELECT COALESCE(SUM(days_away_from_work), 0) FROM public.incidents WHERE organization_id = p_organization_id AND incident_date BETWEEN v_start_date AND v_end_date),
        (SELECT COALESCE(SUM(days_restricted_duty), 0) FROM public.incidents WHERE organization_id = p_organization_id AND incident_date BETWEEN v_start_date AND v_end_date),
        -- Observations
        (SELECT COUNT(*) FROM public.safety_observations WHERE organization_id = p_organization_id AND observation_date BETWEEN v_start_date AND v_end_date AND observation_type IN ('safe_behavior', 'positive_recognition')),
        (SELECT COUNT(*) FROM public.safety_observations WHERE organization_id = p_organization_id AND observation_date BETWEEN v_start_date AND v_end_date AND observation_type = 'at_risk_behavior'),
        (SELECT COUNT(*) FROM public.safety_observations WHERE organization_id = p_organization_id AND observation_date BETWEEN v_start_date AND v_end_date AND observation_type = 'hazard_identified'),
        (SELECT COUNT(*) FROM public.safety_observations WHERE organization_id = p_organization_id AND observation_date BETWEEN v_start_date AND v_end_date AND observation_type = 'condition_corrected'),
        -- Toolbox talks
        (SELECT COUNT(*) FROM public.toolbox_talks WHERE organization_id = p_organization_id AND talk_date BETWEEN v_start_date AND v_end_date AND is_completed = true),
        -- JSAs
        (SELECT COUNT(*) FROM public.job_safety_analysis WHERE organization_id = p_organization_id AND created_at::DATE BETWEEN v_start_date AND v_end_date),
        (SELECT COUNT(*) FROM public.job_safety_analysis WHERE organization_id = p_organization_id AND approved_at::DATE BETWEEN v_start_date AND v_end_date)
    ON CONFLICT (organization_id, metric_year, metric_quarter) DO UPDATE SET
        total_hours_worked = EXCLUDED.total_hours_worked,
        fatalities = EXCLUDED.fatalities,
        hospitalizations = EXCLUDED.hospitalizations,
        recordable_injuries = EXCLUDED.recordable_injuries,
        first_aid_cases = EXCLUDED.first_aid_cases,
        near_misses_reported = EXCLUDED.near_misses_reported,
        days_away_from_work = EXCLUDED.days_away_from_work,
        days_restricted_duty = EXCLUDED.days_restricted_duty,
        safety_observations_positive = EXCLUDED.safety_observations_positive,
        safety_observations_atrisk = EXCLUDED.safety_observations_atrisk,
        hazards_identified = EXCLUDED.hazards_identified,
        hazards_corrected = EXCLUDED.hazards_corrected,
        toolbox_talks_conducted = EXCLUDED.toolbox_talks_conducted,
        jsas_created = EXCLUDED.jsas_created,
        jsas_reviewed = EXCLUDED.jsas_reviewed,
        updated_at = NOW();
END;
$$;

-- ============================================================================
-- PART 11: Triggers
-- ============================================================================

CREATE TRIGGER work_comp_req_updated_at
    BEFORE UPDATE ON public.work_type_competent_requirements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- PART 12: Comments
-- ============================================================================

COMMENT ON TABLE public.work_type_competent_requirements IS 'Maps work types to required OSHA competent persons';
COMMENT ON TABLE public.daily_work_jsa_links IS 'Links daily work activities to applicable JSAs';
COMMENT ON FUNCTION public.validate_competent_person_for_work IS 'Validates crew has required competent person(s) for work type';
COMMENT ON FUNCTION public.check_safety_certification_alerts IS 'Returns expiring safety certifications for alerting';
COMMENT ON FUNCTION public.queue_safety_cert_alerts IS 'Queues notification alerts for expiring safety certs';
COMMENT ON FUNCTION public.refresh_safety_metrics IS 'Recalculates safety metrics for organization/period';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 114: Safety Management Enhancements completed successfully' as status;
