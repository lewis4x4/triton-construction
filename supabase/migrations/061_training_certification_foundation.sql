-- Migration 061: Training & Certification Foundation
-- Part of Safety Compliance Enforcement System - "The Gatekeeper"
--
-- This migration creates the training infrastructure needed to:
-- 1. Define certification types (convert from ENUM to reference table)
-- 2. Define training programs that grant certifications
-- 3. Track training sessions and attendees
-- 4. Auto-grant certifications when training completes
--
-- Dependencies: Migration 049 (employees), Migration 050 (subcontractor_workers)

-- ============================================================================
-- CERTIFICATION TYPES (Master Data)
-- ============================================================================
-- Convert from hardcoded ENUM to configurable reference table
-- Allows Safety Admin to add new cert types without database migrations

CREATE TABLE IF NOT EXISTS public.certification_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    -- NULL organization_id = system-wide (federal requirements)

    -- Identification
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,

    -- Classification
    category TEXT NOT NULL DEFAULT 'safety',
    -- Categories: 'safety', 'equipment', 'regulatory', 'competency', 'medical'

    -- Validity
    default_validity_months INTEGER,
    -- NULL = never expires (e.g., OSHA 10 doesn't expire, but refreshers recommended)

    -- Regulatory reference
    regulatory_reference TEXT,
    -- e.g., '29 CFR 1926.502' for fall protection

    -- Training requirements
    requires_signature BOOLEAN NOT NULL DEFAULT false,
    -- Does granting this cert require individual signature capture?

    requires_renewal_training BOOLEAN NOT NULL DEFAULT false,
    -- Can this be renewed by retaking training, or does it require new testing?

    -- Display
    display_order INTEGER DEFAULT 0,
    icon_name TEXT,
    color_code TEXT,

    -- Lifecycle
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique per organization (or globally for system certs)
    CONSTRAINT unique_cert_type_per_org UNIQUE NULLS NOT DISTINCT (organization_id, code)
);

-- Seed system-wide certification types (federal requirements)
INSERT INTO public.certification_types (organization_id, code, name, description, category, default_validity_months, regulatory_reference, requires_signature, display_order) VALUES
-- Safety Training (no expiration but refreshers recommended)
(NULL, 'OSHA_10', 'OSHA 10-Hour Construction', 'OSHA outreach training - 10 hour construction safety', 'safety', NULL, '29 CFR 1926', false, 1),
(NULL, 'OSHA_30', 'OSHA 30-Hour Construction', 'OSHA outreach training - 30 hour construction safety', 'safety', NULL, '29 CFR 1926', false, 2),

-- Safety Competencies (annual refresh typical)
(NULL, 'FALL_PROTECTION', 'Fall Protection Trained', 'Fall hazard awareness and equipment use', 'safety', 12, '29 CFR 1926.502', false, 10),
(NULL, 'CONFINED_SPACE_ENTRANT', 'Confined Space Entry', 'Permit-required confined space entry training', 'safety', 12, '29 CFR 1926.1204', true, 11),
(NULL, 'CONFINED_SPACE_ATTENDANT', 'Confined Space Attendant', 'Confined space attendant duties and responsibilities', 'safety', 12, '29 CFR 1926.1204', true, 12),
(NULL, 'EXCAVATION_SAFETY', 'Excavation Safety', 'Trenching and excavation hazard awareness', 'safety', 12, '29 CFR 1926.651', false, 13),
(NULL, 'SCAFFOLDING', 'Scaffolding Safety', 'Scaffold erection, use, and inspection', 'safety', 12, '29 CFR 1926.451', false, 14),
(NULL, 'LOCKOUT_TAGOUT', 'Lockout/Tagout (LOTO)', 'Control of hazardous energy', 'safety', 12, '29 CFR 1926.417', false, 15),
(NULL, 'HAZCOM', 'Hazard Communication', 'GHS and SDS understanding', 'safety', 12, '29 CFR 1926.59', false, 16),
(NULL, 'LEAD_SAFETY', 'Lead Safety Awareness', 'Lead exposure prevention in construction', 'safety', 12, '29 CFR 1926.62', false, 17),
(NULL, 'SILICA_SAFETY', 'Respirable Silica', 'Crystalline silica exposure control', 'safety', 12, '29 CFR 1926.1153', false, 18),

-- First Aid/Medical (2-year typical)
(NULL, 'FIRST_AID', 'First Aid/CPR/AED', 'American Red Cross or equivalent certification', 'medical', 24, '29 CFR 1926.50', true, 20),
(NULL, 'BLOODBORNE_PATHOGENS', 'Bloodborne Pathogens', 'BBP exposure prevention', 'medical', 12, '29 CFR 1910.1030', false, 21),

-- Equipment Operator (varies by certification body)
(NULL, 'NCCCO_TLL', 'NCCCO Telescopic Boom Crane', 'Certified crane operator - telescopic boom', 'equipment', 60, '29 CFR 1926.1427', true, 30),
(NULL, 'NCCCO_LBC', 'NCCCO Lattice Boom Crane', 'Certified crane operator - lattice boom', 'equipment', 60, '29 CFR 1926.1427', true, 31),
(NULL, 'FORKLIFT', 'Powered Industrial Truck', 'Forklift operator certification', 'equipment', 36, '29 CFR 1910.178', true, 32),
(NULL, 'AERIAL_LIFT', 'Aerial Lift Operator', 'Scissor lift, boom lift, MEWP operation', 'equipment', 36, '29 CFR 1926.453', true, 33),

-- Driver/CDL (managed by fleet module but referenced here)
(NULL, 'CDL_A', 'CDL Class A', 'Commercial Driver License - Class A', 'regulatory', NULL, 'FMCSA 49 CFR', true, 40),
(NULL, 'CDL_B', 'CDL Class B', 'Commercial Driver License - Class B', 'regulatory', NULL, 'FMCSA 49 CFR', true, 41),
(NULL, 'DOT_MEDICAL', 'DOT Medical Card', 'DOT physical examination certification', 'medical', 24, 'FMCSA 49 CFR 391.41', true, 42),

-- Fire Safety
(NULL, 'FIRE_EXTINGUISHER', 'Fire Extinguisher Use', 'Portable fire extinguisher operation', 'safety', 12, '29 CFR 1926.352', false, 50),
(NULL, 'FIRE_WATCH', 'Fire Watch', 'Hot work fire watch responsibilities', 'safety', 12, '29 CFR 1926.352', false, 51)
ON CONFLICT DO NOTHING;


-- ============================================================================
-- TRAINING PROGRAMS
-- ============================================================================
-- Define reusable training programs that grant one or more certifications

CREATE TABLE IF NOT EXISTS public.training_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Identification
    name TEXT NOT NULL,
    program_code TEXT,
    -- e.g., 'FP-101' for Fall Protection 101
    description TEXT,

    -- Provider
    provider_type TEXT NOT NULL DEFAULT 'internal',
    -- 'internal' = Safety team teaches
    -- 'external' = Third-party provider
    -- 'hybrid' = Parts taught internally, parts external
    external_provider_name TEXT,
    external_provider_contact TEXT,

    -- Duration
    default_duration_hours DECIMAL(4,2),
    min_attendees INTEGER DEFAULT 1,
    max_attendees INTEGER,

    -- Recurrence
    recurrence_interval_months INTEGER,
    -- NULL = one-time, otherwise how often must be retaken

    -- Content
    topics_covered TEXT[],
    materials_required TEXT[],
    prerequisites TEXT[],

    -- Instructor requirements
    instructor_qualifications TEXT,
    default_instructor_notes TEXT,

    -- Lifecycle
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES public.user_profiles(id),

    CONSTRAINT unique_program_code_per_org UNIQUE (organization_id, program_code)
);


-- ============================================================================
-- TRAINING PROGRAM → CERTIFICATION MAPPING
-- ============================================================================
-- Many-to-many: One program can grant multiple certifications

CREATE TABLE IF NOT EXISTS public.training_program_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_id UUID NOT NULL REFERENCES public.training_programs(id) ON DELETE CASCADE,
    certification_type_id UUID NOT NULL REFERENCES public.certification_types(id) ON DELETE CASCADE,

    -- Optionally override validity for this specific program
    validity_months_override INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_program_cert_mapping UNIQUE (program_id, certification_type_id)
);


-- ============================================================================
-- TRAINING SESSIONS
-- ============================================================================
-- Actual training classes conducted

CREATE TYPE training_session_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
);

CREATE TABLE IF NOT EXISTS public.training_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    program_id UUID NOT NULL REFERENCES public.training_programs(id),

    -- Auto-generated session number: TRN-2024-0001
    session_number TEXT NOT NULL,

    -- Instructor (may or may not be a system user)
    instructor_user_id UUID REFERENCES public.user_profiles(id),
    instructor_name TEXT NOT NULL,
    instructor_credentials TEXT,
    -- e.g., 'OSHA Authorized Trainer #12345'

    -- Schedule
    session_date DATE NOT NULL,
    session_time TIME,
    duration_hours DECIMAL(4,2),

    -- Location
    location TEXT,
    project_id UUID REFERENCES public.projects(id),
    -- NULL = company-wide/office training
    -- project_id = on-site training for specific project

    -- Status
    status training_session_status NOT NULL DEFAULT 'scheduled',

    -- Notes
    notes TEXT,
    materials_provided TEXT[],

    -- Completion
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Audit
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT unique_session_number UNIQUE (organization_id, session_number)
);

-- Auto-generate session number
CREATE OR REPLACE FUNCTION generate_training_session_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    seq_num INTEGER;
BEGIN
    year_part := to_char(NEW.session_date, 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(session_number FROM 'TRN-' || year_part || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO seq_num
    FROM public.training_sessions
    WHERE organization_id = NEW.organization_id
      AND session_number LIKE 'TRN-' || year_part || '-%';

    NEW.session_number := 'TRN-' || year_part || '-' || LPAD(seq_num::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_sessions_auto_number
    BEFORE INSERT ON public.training_sessions
    FOR EACH ROW
    WHEN (NEW.session_number IS NULL OR NEW.session_number = '')
    EXECUTE FUNCTION generate_training_session_number();


-- ============================================================================
-- TRAINING SESSION ATTENDEES
-- ============================================================================
-- Who attended each training session

CREATE TYPE attendance_status AS ENUM (
    'registered',
    'present',
    'absent',
    'excused',
    'no_show'
);

CREATE TABLE IF NOT EXISTS public.training_session_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,

    -- Polymorphic: Either employee OR subcontractor worker (not both)
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    subcontractor_worker_id UUID REFERENCES public.subcontractor_workers(id) ON DELETE CASCADE,

    -- Attendance
    attendance_status attendance_status NOT NULL DEFAULT 'registered',

    -- Acknowledgment (quick check-off by supervisor)
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES public.user_profiles(id),

    -- Formal Signature (for certification-granting training)
    signed_at TIMESTAMPTZ,
    signature_url TEXT,
    -- Path to signature image in storage

    -- Certification grant status
    certifications_granted BOOLEAN NOT NULL DEFAULT false,
    certifications_granted_at TIMESTAMPTZ,

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ensure exactly one person type
    CONSTRAINT one_person_per_attendance CHECK (
        (employee_id IS NOT NULL AND subcontractor_worker_id IS NULL) OR
        (employee_id IS NULL AND subcontractor_worker_id IS NOT NULL)
    ),

    -- Unique attendance per session
    CONSTRAINT unique_employee_per_session UNIQUE (session_id, employee_id),
    CONSTRAINT unique_sub_worker_per_session UNIQUE (session_id, subcontractor_worker_id)
);


-- ============================================================================
-- MODIFY EMPLOYEE_CERTIFICATIONS
-- ============================================================================
-- Add columns to link certifications to training sessions and certification types

-- Add training_session_id to track source
ALTER TABLE public.employee_certifications
ADD COLUMN IF NOT EXISTS training_session_id UUID REFERENCES public.training_sessions(id);

-- Add certification_type_id for normalized reference
ALTER TABLE public.employee_certifications
ADD COLUMN IF NOT EXISTS certification_type_id UUID REFERENCES public.certification_types(id);

-- Add source tracking
ALTER TABLE public.employee_certifications
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
-- 'internal' = From internal training session
-- 'external' = From external provider (uploaded/verified)
-- 'manual' = Manually entered (legacy data import)
-- 'imported' = Bulk imported from paper records

-- Add verification status for external certs
ALTER TABLE public.employee_certifications
ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'unverified';
-- 'unverified', 'pending', 'verified', 'rejected'

ALTER TABLE public.employee_certifications
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.employee_certifications
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.user_profiles(id);


-- ============================================================================
-- AUTO-GRANT CERTIFICATIONS ON SESSION COMPLETE
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_cert_number(cert_code TEXT, issue_date DATE)
RETURNS TEXT AS $$
BEGIN
    RETURN cert_code || '-' || to_char(issue_date, 'YYYYMMDD') || '-' ||
           LPAD(floor(random() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION grant_certifications_on_session_complete()
RETURNS TRIGGER AS $$
DECLARE
    attendee RECORD;
    cert_mapping RECORD;
    validity_months INTEGER;
    expires_date DATE;
    org_name TEXT;
BEGIN
    -- Only trigger when status changes to 'completed'
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN

        -- Get organization name for issuing authority
        SELECT name INTO org_name FROM public.organizations WHERE id = NEW.organization_id;

        -- For each program → certification mapping
        FOR cert_mapping IN
            SELECT
                pc.certification_type_id,
                ct.code,
                ct.name,
                ct.default_validity_months,
                pc.validity_months_override
            FROM public.training_program_certifications pc
            JOIN public.certification_types ct ON ct.id = pc.certification_type_id
            WHERE pc.program_id = NEW.program_id
        LOOP
            -- Determine validity period
            validity_months := COALESCE(cert_mapping.validity_months_override, cert_mapping.default_validity_months);

            IF validity_months IS NOT NULL THEN
                expires_date := NEW.session_date + (validity_months || ' months')::INTERVAL;
            ELSE
                expires_date := NULL; -- Never expires
            END IF;

            -- For each attendee marked present
            FOR attendee IN
                SELECT id, employee_id, subcontractor_worker_id
                FROM public.training_session_attendees
                WHERE session_id = NEW.id
                  AND attendance_status = 'present'
                  AND certifications_granted = false
            LOOP
                -- Insert certification for employees
                IF attendee.employee_id IS NOT NULL THEN
                    INSERT INTO public.employee_certifications (
                        employee_id,
                        certification_type,
                        certification_type_id,
                        issue_date,
                        expiration_date,
                        issuing_authority,
                        certificate_number,
                        source,
                        training_session_id,
                        verification_status,
                        verified_at
                    ) VALUES (
                        attendee.employee_id,
                        cert_mapping.code::employee_certification_type,
                        cert_mapping.certification_type_id,
                        NEW.session_date,
                        expires_date,
                        COALESCE(org_name, 'Triton Construction') || ' Safety Team',
                        generate_cert_number(cert_mapping.code, NEW.session_date),
                        'internal',
                        NEW.id,
                        'verified',
                        now()
                    )
                    ON CONFLICT (employee_id, certification_type)
                    DO UPDATE SET
                        issue_date = EXCLUDED.issue_date,
                        expiration_date = EXCLUDED.expiration_date,
                        issuing_authority = EXCLUDED.issuing_authority,
                        certificate_number = EXCLUDED.certificate_number,
                        source = EXCLUDED.source,
                        training_session_id = EXCLUDED.training_session_id,
                        verification_status = EXCLUDED.verification_status,
                        verified_at = EXCLUDED.verified_at,
                        updated_at = now();
                END IF;

                -- For subcontractor workers, update their certification tracking
                IF attendee.subcontractor_worker_id IS NOT NULL THEN
                    -- Update subcontractor_workers certification fields
                    -- (These are simpler columns, not a separate table)
                    IF cert_mapping.code = 'OSHA_10' THEN
                        UPDATE public.subcontractor_workers
                        SET osha_10_certified = true,
                            osha_10_cert_date = NEW.session_date,
                            updated_at = now()
                        WHERE id = attendee.subcontractor_worker_id;
                    ELSIF cert_mapping.code = 'OSHA_30' THEN
                        UPDATE public.subcontractor_workers
                        SET osha_30_certified = true,
                            osha_30_cert_date = NEW.session_date,
                            updated_at = now()
                        WHERE id = attendee.subcontractor_worker_id;
                    END IF;
                END IF;
            END LOOP;
        END LOOP;

        -- Mark all present attendees as certifications granted
        UPDATE public.training_session_attendees
        SET certifications_granted = true,
            certifications_granted_at = now()
        WHERE session_id = NEW.id
          AND attendance_status = 'present'
          AND certifications_granted = false;

        -- Set session completed timestamp
        NEW.completed_at := now();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_sessions_grant_certs
    BEFORE UPDATE ON public.training_sessions
    FOR EACH ROW
    EXECUTE FUNCTION grant_certifications_on_session_complete();


-- ============================================================================
-- VIEWS
-- ============================================================================

-- Upcoming training sessions
CREATE OR REPLACE VIEW public.v_upcoming_training_sessions AS
SELECT
    ts.id,
    ts.organization_id,
    ts.session_number,
    ts.session_date,
    ts.session_time,
    ts.duration_hours,
    ts.location,
    ts.status,
    ts.instructor_name,
    tp.name AS program_name,
    tp.program_code,
    tp.provider_type,
    p.name AS project_name,
    p.project_number,
    (SELECT COUNT(*) FROM public.training_session_attendees WHERE session_id = ts.id) AS attendee_count,
    (SELECT COUNT(*) FROM public.training_session_attendees WHERE session_id = ts.id AND attendance_status = 'registered') AS registered_count,
    array_agg(DISTINCT ct.name) FILTER (WHERE ct.name IS NOT NULL) AS certifications_granted
FROM public.training_sessions ts
JOIN public.training_programs tp ON tp.id = ts.program_id
LEFT JOIN public.projects p ON p.id = ts.project_id
LEFT JOIN public.training_program_certifications tpc ON tpc.program_id = tp.id
LEFT JOIN public.certification_types ct ON ct.id = tpc.certification_type_id
WHERE ts.session_date >= CURRENT_DATE
  AND ts.status IN ('scheduled', 'in_progress')
GROUP BY ts.id, ts.organization_id, ts.session_number, ts.session_date, ts.session_time,
         ts.duration_hours, ts.location, ts.status, ts.instructor_name,
         tp.name, tp.program_code, tp.provider_type, p.name, p.project_number
ORDER BY ts.session_date, ts.session_time;

-- Expiring certifications (30-day lookahead)
CREATE OR REPLACE VIEW public.v_expiring_certifications AS
SELECT
    ec.id,
    ec.employee_id,
    (e.first_name || ' ' || e.last_name) AS employee_name,
    e.email AS employee_email,
    ct.code AS certification_code,
    ct.name AS certification_name,
    ec.expiration_date,
    (ec.expiration_date - CURRENT_DATE) AS days_until_expiry,
    CASE
        WHEN ec.expiration_date < CURRENT_DATE THEN 'expired'
        WHEN (ec.expiration_date - CURRENT_DATE) <= 7 THEN 'critical'
        WHEN (ec.expiration_date - CURRENT_DATE) <= 14 THEN 'warning'
        ELSE 'upcoming'
    END AS urgency,
    tp.name AS renewal_program,
    tp.id AS renewal_program_id
FROM public.employee_certifications ec
JOIN public.employees e ON e.id = ec.employee_id
LEFT JOIN public.certification_types ct ON ct.id = ec.certification_type_id
LEFT JOIN public.training_program_certifications tpc ON tpc.certification_type_id = ct.id
LEFT JOIN public.training_programs tp ON tp.id = tpc.program_id AND tp.is_active = true
WHERE ec.expiration_date IS NOT NULL
  AND ec.expiration_date <= (CURRENT_DATE + INTERVAL '30 days')
  AND e.status = 'active'
ORDER BY ec.expiration_date;


-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.certification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_program_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session_attendees ENABLE ROW LEVEL SECURITY;

-- Certification Types: Read all (including system types), write own org only
CREATE POLICY "cert_types_read" ON public.certification_types
    FOR SELECT USING (
        organization_id IS NULL -- System types readable by all
        OR organization_id = public.get_user_organization_id()
    );

CREATE POLICY "cert_types_write" ON public.certification_types
    FOR ALL USING (
        organization_id = public.get_user_organization_id()
        AND public.user_has_permission(auth.uid(), 'admin.system_settings')
    );

-- Training Programs: Read/write within organization
CREATE POLICY "training_programs_read" ON public.training_programs
    FOR SELECT USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "training_programs_write" ON public.training_programs
    FOR ALL USING (
        organization_id = public.get_user_organization_id()
        AND public.user_has_permission(auth.uid(), 'safety.create')
    );

-- Training Program Certifications: Follows program access
CREATE POLICY "training_program_certs_read" ON public.training_program_certifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.training_programs tp
            WHERE tp.id = program_id
            AND tp.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "training_program_certs_write" ON public.training_program_certifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.training_programs tp
            WHERE tp.id = program_id
            AND tp.organization_id = public.get_user_organization_id()
        )
        AND public.user_has_permission(auth.uid(), 'safety.create')
    );

-- Training Sessions: Read/write within organization
CREATE POLICY "training_sessions_read" ON public.training_sessions
    FOR SELECT USING (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY "training_sessions_insert" ON public.training_sessions
    FOR INSERT WITH CHECK (
        organization_id = public.get_user_organization_id()
        AND public.user_has_permission(auth.uid(), 'safety.create')
    );

CREATE POLICY "training_sessions_update" ON public.training_sessions
    FOR UPDATE USING (
        organization_id = public.get_user_organization_id()
        AND (
            public.user_has_permission(auth.uid(), 'safety.update')
            OR created_by = auth.uid()
            OR instructor_user_id = auth.uid()
        )
    );

-- Training Session Attendees: Follow session access + self-service
CREATE POLICY "attendees_read" ON public.training_session_attendees
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.training_sessions ts
            WHERE ts.id = session_id
            AND ts.organization_id = public.get_user_organization_id()
        )
    );

CREATE POLICY "attendees_write" ON public.training_session_attendees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.training_sessions ts
            WHERE ts.id = session_id
            AND ts.organization_id = public.get_user_organization_id()
        )
        AND public.user_has_permission(auth.uid(), 'safety.create')
    );

-- Note: Self-service RLS for employee_certifications requires adding user_id column to employees table
-- This will be addressed in a future migration to link employees to auth users


-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_cert_types_org ON public.certification_types(organization_id);
CREATE INDEX IF NOT EXISTS idx_cert_types_code ON public.certification_types(code);
CREATE INDEX IF NOT EXISTS idx_cert_types_category ON public.certification_types(category);

CREATE INDEX IF NOT EXISTS idx_training_programs_org ON public.training_programs(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_programs_active ON public.training_programs(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_training_sessions_org ON public.training_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON public.training_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_training_sessions_status ON public.training_sessions(status);
CREATE INDEX IF NOT EXISTS idx_training_sessions_project ON public.training_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_program ON public.training_sessions(program_id);

CREATE INDEX IF NOT EXISTS idx_attendees_session ON public.training_session_attendees(session_id);
CREATE INDEX IF NOT EXISTS idx_attendees_employee ON public.training_session_attendees(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendees_sub_worker ON public.training_session_attendees(subcontractor_worker_id);
CREATE INDEX IF NOT EXISTS idx_attendees_status ON public.training_session_attendees(attendance_status);

CREATE INDEX IF NOT EXISTS idx_employee_certs_training_session ON public.employee_certifications(training_session_id);
CREATE INDEX IF NOT EXISTS idx_employee_certs_type_id ON public.employee_certifications(certification_type_id);
CREATE INDEX IF NOT EXISTS idx_employee_certs_source ON public.employee_certifications(source);
CREATE INDEX IF NOT EXISTS idx_employee_certs_expires ON public.employee_certifications(expiration_date);


-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

CREATE TRIGGER certification_types_updated_at
    BEFORE UPDATE ON public.certification_types
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER training_programs_updated_at
    BEFORE UPDATE ON public.training_programs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER training_sessions_updated_at
    BEFORE UPDATE ON public.training_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER training_session_attendees_updated_at
    BEFORE UPDATE ON public.training_session_attendees
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Audit logging
CREATE TRIGGER certification_types_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.certification_types
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER training_programs_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.training_programs
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER training_sessions_audit
    AFTER INSERT OR UPDATE OR DELETE ON public.training_sessions
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get employee's current valid certifications
CREATE OR REPLACE FUNCTION get_employee_certifications(p_employee_id UUID)
RETURNS TABLE (
    certification_code TEXT,
    certification_name TEXT,
    category TEXT,
    issued_date DATE,
    expires_at DATE,
    is_valid BOOLEAN,
    days_until_expiry INTEGER,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ct.code,
        ct.name,
        ct.category,
        ec.issue_date,
        ec.expiration_date,
        (ec.expiration_date IS NULL OR ec.expiration_date > CURRENT_DATE) AS is_valid,
        CASE WHEN ec.expiration_date IS NOT NULL
             THEN (ec.expiration_date - CURRENT_DATE)::INTEGER
             ELSE NULL
        END AS days_until_expiry,
        ec.source
    FROM public.employee_certifications ec
    LEFT JOIN public.certification_types ct ON ct.id = ec.certification_type_id
    WHERE ec.employee_id = p_employee_id
    ORDER BY ct.display_order, ct.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if employee has valid certification
CREATE OR REPLACE FUNCTION employee_has_valid_cert(
    p_employee_id UUID,
    p_cert_code TEXT
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.employee_certifications ec
        JOIN public.certification_types ct ON ct.id = ec.certification_type_id
        WHERE ec.employee_id = p_employee_id
          AND ct.code = p_cert_code
          AND (ec.expiration_date IS NULL OR ec.expiration_date > CURRENT_DATE)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get training history for employee
CREATE OR REPLACE FUNCTION get_employee_training_history(p_employee_id UUID)
RETURNS TABLE (
    session_id UUID,
    session_date DATE,
    program_name TEXT,
    instructor_name TEXT,
    attendance_status TEXT,
    certifications_granted BOOLEAN,
    certifications TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ts.id,
        ts.session_date,
        tp.name,
        ts.instructor_name,
        tsa.attendance_status::TEXT,
        tsa.certifications_granted,
        array_agg(ct.name) FILTER (WHERE ct.name IS NOT NULL)
    FROM public.training_session_attendees tsa
    JOIN public.training_sessions ts ON ts.id = tsa.session_id
    JOIN public.training_programs tp ON tp.id = ts.program_id
    LEFT JOIN public.training_program_certifications tpc ON tpc.program_id = tp.id
    LEFT JOIN public.certification_types ct ON ct.id = tpc.certification_type_id
    WHERE tsa.employee_id = p_employee_id
    GROUP BY ts.id, ts.session_date, tp.name, ts.instructor_name,
             tsa.attendance_status, tsa.certifications_granted
    ORDER BY ts.session_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


COMMENT ON TABLE public.certification_types IS 'Master table of certification types (replaces hardcoded ENUMs)';
COMMENT ON TABLE public.training_programs IS 'Reusable training program definitions that grant certifications';
COMMENT ON TABLE public.training_program_certifications IS 'Many-to-many mapping of which certifications a program grants';
COMMENT ON TABLE public.training_sessions IS 'Actual training classes conducted';
COMMENT ON TABLE public.training_session_attendees IS 'Attendance records for training sessions';
