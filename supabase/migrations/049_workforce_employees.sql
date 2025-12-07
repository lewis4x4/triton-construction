-- =============================================================================
-- Migration: 049_workforce_employees.sql
-- Purpose: Core employee & subcontractor tables for Workforce Compliance Module
-- Security: Default-deny RLS on ALL tables per System Prompt v5.0
-- Date: December 6, 2024
-- =============================================================================

-- =============================================================================
-- PART 1: Employment Status Enum
-- =============================================================================

CREATE TYPE public.employment_status AS ENUM (
  'active',
  'inactive',
  'terminated',
  'leave_of_absence',
  'suspended'
);

CREATE TYPE public.compliance_status AS ENUM (
  'compliant',
  'incomplete',
  'expired',
  'pending_review',
  'suspended'
);

CREATE TYPE public.worker_classification AS ENUM (
  'employee',
  'subcontractor',
  'temp',
  'seasonal'
);

-- =============================================================================
-- PART 2: Employees Table (Core Workforce)
-- =============================================================================

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Identification
  employee_number TEXT UNIQUE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  suffix TEXT, -- Jr, Sr, III, etc.
  preferred_name TEXT,

  -- PII - Encrypted at application level
  ssn_encrypted TEXT, -- AES-256 encrypted SSN
  ssn_last_four TEXT, -- For display/verification
  date_of_birth DATE,

  -- Contact
  email TEXT,
  phone_primary TEXT,
  phone_secondary TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT DEFAULT 'WV',
  zip_code TEXT,

  -- Employment Details
  employment_status public.employment_status DEFAULT 'active',
  hire_date DATE,
  termination_date DATE,
  termination_reason TEXT,
  department TEXT,
  job_title TEXT,
  supervisor_id UUID REFERENCES public.employees(id),

  -- Classification for Compliance
  worker_classification public.worker_classification DEFAULT 'employee',
  is_safety_sensitive BOOLEAN DEFAULT false, -- Drug testing required
  is_cdl_required BOOLEAN DEFAULT false,

  -- EEO Data (Optional, for reporting)
  eeo_gender TEXT,
  eeo_ethnicity TEXT,
  eeo_veteran_status TEXT,
  eeo_disability_status TEXT,

  -- Compliance Status (Computed/Cached)
  compliance_status public.compliance_status DEFAULT 'incomplete',
  compliance_issues TEXT[], -- Array of current issues
  last_compliance_check TIMESTAMPTZ,
  next_compliance_check TIMESTAMPTZ,

  -- Photo/Avatar
  photo_url TEXT,

  -- Soft Delete
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_employees_org ON public.employees(organization_id);
CREATE INDEX idx_employees_status ON public.employees(employment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_compliance ON public.employees(compliance_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_supervisor ON public.employees(supervisor_id);
CREATE INDEX idx_employees_number ON public.employees(employee_number);
CREATE INDEX idx_employees_name ON public.employees(last_name, first_name);

-- RLS MANDATE - Default Deny
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.employees FOR ALL USING (false);

-- Explicit Grant: Users can see employees in their organization
CREATE POLICY "employees_select_org" ON public.employees FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND deleted_at IS NULL
  );

-- Explicit Grant: HR/Admin can insert employees
CREATE POLICY "employees_insert_hr" ON public.employees FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'users.create', NULL)
  );

-- Explicit Grant: HR/Admin can update employees
CREATE POLICY "employees_update_hr" ON public.employees FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'users.update', NULL)
  );

-- =============================================================================
-- PART 3: Subcontractors Table
-- =============================================================================

CREATE TABLE public.subcontractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Company Info
  company_name TEXT NOT NULL,
  dba_name TEXT, -- Doing Business As
  tax_id_encrypted TEXT, -- EIN, encrypted

  -- Primary Contact
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  primary_contact_phone TEXT,

  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,

  -- Insurance Tracking (COI - Certificate of Insurance)
  general_liability_carrier TEXT,
  general_liability_policy_number TEXT,
  general_liability_limit DECIMAL(15,2),
  general_liability_exp DATE,

  workers_comp_carrier TEXT,
  workers_comp_policy_number TEXT,
  workers_comp_exp DATE,

  auto_liability_carrier TEXT,
  auto_liability_policy_number TEXT,
  auto_liability_limit DECIMAL(15,2),
  auto_liability_exp DATE,

  umbrella_carrier TEXT,
  umbrella_policy_number TEXT,
  umbrella_limit DECIMAL(15,2),
  umbrella_exp DATE,

  coi_document_url TEXT,
  coi_last_verified_at TIMESTAMPTZ,
  coi_verified_by UUID REFERENCES auth.users(id),

  -- Certifications
  is_dbe_certified BOOLEAN DEFAULT false,
  dbe_certification_number TEXT,
  dbe_certification_exp DATE,
  dbe_categories TEXT[], -- Types of work certified for

  is_wv_licensed BOOLEAN DEFAULT false,
  wv_license_number TEXT,
  wv_license_exp DATE,

  -- Compliance Status
  compliance_status public.compliance_status DEFAULT 'incomplete',
  compliance_issues TEXT[],
  last_compliance_check TIMESTAMPTZ,

  -- Performance Tracking
  safety_rating DECIMAL(3,2), -- 0.00 to 5.00
  quality_rating DECIMAL(3,2),
  schedule_rating DECIMAL(3,2),
  total_contract_value DECIMAL(15,2) DEFAULT 0,

  -- Status
  is_approved BOOLEAN DEFAULT false,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  is_suspended BOOLEAN DEFAULT false,
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,

  -- Notes
  internal_notes TEXT,

  -- Soft Delete
  deleted_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_subcontractors_org ON public.subcontractors(organization_id);
CREATE INDEX idx_subcontractors_compliance ON public.subcontractors(compliance_status);
CREATE INDEX idx_subcontractors_gl_exp ON public.subcontractors(general_liability_exp);
CREATE INDEX idx_subcontractors_wc_exp ON public.subcontractors(workers_comp_exp);
CREATE INDEX idx_subcontractors_dbe ON public.subcontractors(is_dbe_certified) WHERE is_dbe_certified = true;

-- RLS MANDATE - Default Deny
ALTER TABLE public.subcontractors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.subcontractors FOR ALL USING (false);

CREATE POLICY "subcontractors_select_org" ON public.subcontractors FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "subcontractors_insert" ON public.subcontractors FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
  );

CREATE POLICY "subcontractors_update" ON public.subcontractors FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
  );

-- =============================================================================
-- PART 4: Subcontractor Workers (Lightweight Profile)
-- =============================================================================

CREATE TABLE public.subcontractor_workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subcontractor_id UUID NOT NULL REFERENCES public.subcontractors(id) ON DELETE CASCADE,

  -- Basic Info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,

  -- Safety Credentials Only (We don't manage their full HR)
  has_osha_10 BOOLEAN DEFAULT false,
  osha_10_exp DATE,
  osha_10_card_url TEXT,

  has_osha_30 BOOLEAN DEFAULT false,
  osha_30_exp DATE,
  osha_30_card_url TEXT,

  is_competent_person BOOLEAN DEFAULT false,
  competent_person_types TEXT[], -- Excavation, Scaffolding, etc.

  has_first_aid_cpr BOOLEAN DEFAULT false,
  first_aid_cpr_exp DATE,

  -- Site Access
  site_orientation_completed BOOLEAN DEFAULT false,
  site_orientation_date DATE,
  badge_number TEXT,
  badge_issued_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sub_workers_sub ON public.subcontractor_workers(subcontractor_id);
CREATE INDEX idx_sub_workers_active ON public.subcontractor_workers(is_active) WHERE is_active = true;
CREATE INDEX idx_sub_workers_competent ON public.subcontractor_workers(is_competent_person) WHERE is_competent_person = true;

-- RLS MANDATE - Default Deny
ALTER TABLE public.subcontractor_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.subcontractor_workers FOR ALL USING (false);

CREATE POLICY "sub_workers_select" ON public.subcontractor_workers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.subcontractors s
      WHERE s.id = subcontractor_id
      AND s.organization_id = public.get_user_organization_id(auth.uid())
      AND s.deleted_at IS NULL
    )
  );

CREATE POLICY "sub_workers_insert" ON public.subcontractor_workers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.subcontractors s
      WHERE s.id = subcontractor_id
      AND s.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "sub_workers_update" ON public.subcontractor_workers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.subcontractors s
      WHERE s.id = subcontractor_id
      AND s.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- =============================================================================
-- PART 5: Employee Certifications Table
-- =============================================================================

CREATE TYPE public.certification_status AS ENUM (
  'active',
  'expired',
  'pending_renewal',
  'revoked',
  'not_applicable'
);

CREATE TABLE public.employee_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

  -- Certification Details
  certification_type TEXT NOT NULL, -- OSHA_10, OSHA_30, CDL_A, FIRST_AID, etc.
  certification_name TEXT NOT NULL,
  issuing_authority TEXT,
  certificate_number TEXT,

  -- Dates
  issue_date DATE,
  expiration_date DATE,

  -- Status
  status public.certification_status DEFAULT 'active',

  -- Documentation
  document_url TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_emp_certs_employee ON public.employee_certifications(employee_id);
CREATE INDEX idx_emp_certs_type ON public.employee_certifications(certification_type);
CREATE INDEX idx_emp_certs_exp ON public.employee_certifications(expiration_date);
CREATE INDEX idx_emp_certs_status ON public.employee_certifications(status);

-- RLS MANDATE
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.employee_certifications FOR ALL USING (false);

CREATE POLICY "emp_certs_select" ON public.employee_certifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "emp_certs_insert" ON public.employee_certifications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "emp_certs_update" ON public.employee_certifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- =============================================================================
-- PART 6: Compliance Overrides Table (Emergency Override Protocol)
-- =============================================================================

CREATE TYPE public.override_status AS ENUM (
  'active',
  'expired',
  'revoked',
  'reviewed'
);

CREATE TABLE public.compliance_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- What was overridden
  override_type TEXT NOT NULL, -- crew_assignment, equipment_use, certification_check, etc.
  blocked_action TEXT NOT NULL, -- Description of what was blocked
  blocking_reason TEXT NOT NULL, -- Why it was blocked

  -- Related entities
  project_id UUID REFERENCES public.projects(id),
  employee_id UUID REFERENCES public.employees(id),
  subcontractor_id UUID REFERENCES public.subcontractors(id),
  equipment_id UUID REFERENCES public.equipment(id),

  -- Override details
  justification TEXT NOT NULL, -- User's reason for override
  digital_signature TEXT NOT NULL, -- Base64 signature image or typed name confirmation

  -- Time window (4 hours per spec)
  override_start TIMESTAMPTZ DEFAULT NOW(),
  override_expires TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 hours'),

  -- Status
  status public.override_status DEFAULT 'active',

  -- Notifications
  safety_director_notified_at TIMESTAMPTZ,
  safety_director_sms_sent BOOLEAN DEFAULT false,
  safety_director_email_sent BOOLEAN DEFAULT false,

  -- Review (after the fact)
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  review_outcome TEXT, -- approved, violation_issued, training_required
  review_notes TEXT,

  -- Who requested
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requester_role TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_overrides_org ON public.compliance_overrides(organization_id);
CREATE INDEX idx_overrides_status ON public.compliance_overrides(status);
CREATE INDEX idx_overrides_expires ON public.compliance_overrides(override_expires) WHERE status = 'active';
CREATE INDEX idx_overrides_project ON public.compliance_overrides(project_id);
CREATE INDEX idx_overrides_employee ON public.compliance_overrides(employee_id);

-- RLS MANDATE
ALTER TABLE public.compliance_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.compliance_overrides FOR ALL USING (false);

CREATE POLICY "overrides_select" ON public.compliance_overrides FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
  );

CREATE POLICY "overrides_insert" ON public.compliance_overrides FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
  );

-- Only safety directors can update (review)
CREATE POLICY "overrides_update_safety" ON public.compliance_overrides FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'safety.approve', NULL)
  );

-- =============================================================================
-- PART 7: Helper Functions
-- =============================================================================

-- Check if employee is compliant for work
CREATE OR REPLACE FUNCTION public.is_employee_compliant(p_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.compliance_status;
BEGIN
  SELECT compliance_status INTO v_status
  FROM public.employees
  WHERE id = p_employee_id AND deleted_at IS NULL;

  RETURN v_status = 'compliant';
END;
$$;

-- Check if subcontractor COI is valid
CREATE OR REPLACE FUNCTION public.is_subcontractor_coi_valid(p_subcontractor_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  SELECT * INTO v_sub
  FROM public.subcontractors
  WHERE id = p_subcontractor_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check all required insurance is current
  RETURN (
    v_sub.general_liability_exp > CURRENT_DATE
    AND v_sub.workers_comp_exp > CURRENT_DATE
    AND v_sub.auto_liability_exp > CURRENT_DATE
  );
END;
$$;

-- Get expiring certifications
CREATE OR REPLACE FUNCTION public.get_expiring_employee_certs(
  p_organization_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  certification_type TEXT,
  certification_name TEXT,
  expiration_date DATE,
  days_until_expiry INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id AS employee_id,
    e.first_name || ' ' || e.last_name AS employee_name,
    c.certification_type,
    c.certification_name,
    c.expiration_date,
    (c.expiration_date - CURRENT_DATE)::INTEGER AS days_until_expiry
  FROM public.employee_certifications c
  JOIN public.employees e ON e.id = c.employee_id
  WHERE
    e.organization_id = p_organization_id
    AND e.deleted_at IS NULL
    AND e.employment_status = 'active'
    AND c.status = 'active'
    AND c.expiration_date IS NOT NULL
    AND c.expiration_date <= (CURRENT_DATE + p_days_ahead)
  ORDER BY c.expiration_date ASC;
END;
$$;

-- Get expiring subcontractor insurance
CREATE OR REPLACE FUNCTION public.get_expiring_sub_insurance(
  p_organization_id UUID,
  p_days_ahead INTEGER DEFAULT 30
)
RETURNS TABLE (
  subcontractor_id UUID,
  company_name TEXT,
  insurance_type TEXT,
  expiration_date DATE,
  days_until_expiry INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    -- General Liability
    SELECT
      s.id AS subcontractor_id,
      s.company_name,
      'General Liability'::TEXT AS insurance_type,
      s.general_liability_exp AS expiration_date,
      (s.general_liability_exp - CURRENT_DATE)::INTEGER AS days_until_expiry
    FROM public.subcontractors s
    WHERE
      s.organization_id = p_organization_id
      AND s.deleted_at IS NULL
      AND s.general_liability_exp IS NOT NULL
      AND s.general_liability_exp <= (CURRENT_DATE + p_days_ahead)

    UNION ALL

    -- Workers Comp
    SELECT
      s.id,
      s.company_name,
      'Workers Comp'::TEXT,
      s.workers_comp_exp,
      (s.workers_comp_exp - CURRENT_DATE)::INTEGER
    FROM public.subcontractors s
    WHERE
      s.organization_id = p_organization_id
      AND s.deleted_at IS NULL
      AND s.workers_comp_exp IS NOT NULL
      AND s.workers_comp_exp <= (CURRENT_DATE + p_days_ahead)

    UNION ALL

    -- Auto Liability
    SELECT
      s.id,
      s.company_name,
      'Auto Liability'::TEXT,
      s.auto_liability_exp,
      (s.auto_liability_exp - CURRENT_DATE)::INTEGER
    FROM public.subcontractors s
    WHERE
      s.organization_id = p_organization_id
      AND s.deleted_at IS NULL
      AND s.auto_liability_exp IS NOT NULL
      AND s.auto_liability_exp <= (CURRENT_DATE + p_days_ahead)
  ) combined
  ORDER BY expiration_date ASC;
END;
$$;

-- Check for active override
CREATE OR REPLACE FUNCTION public.has_active_override(
  p_override_type TEXT,
  p_employee_id UUID DEFAULT NULL,
  p_subcontractor_id UUID DEFAULT NULL,
  p_equipment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.compliance_overrides
    WHERE
      override_type = p_override_type
      AND status = 'active'
      AND override_expires > NOW()
      AND (p_employee_id IS NULL OR employee_id = p_employee_id)
      AND (p_subcontractor_id IS NULL OR subcontractor_id = p_subcontractor_id)
      AND (p_equipment_id IS NULL OR equipment_id = p_equipment_id)
  );
END;
$$;

-- =============================================================================
-- PART 8: Triggers
-- =============================================================================

-- Auto-update timestamps
CREATE TRIGGER employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER subcontractors_updated_at
  BEFORE UPDATE ON public.subcontractors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER sub_workers_updated_at
  BEFORE UPDATE ON public.subcontractor_workers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER emp_certs_updated_at
  BEFORE UPDATE ON public.employee_certifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PART 9: Comments
-- =============================================================================

COMMENT ON TABLE public.employees IS 'Core employee records with PII encryption and compliance tracking';
COMMENT ON TABLE public.subcontractors IS 'Subcontractor companies with COI tracking per System Prompt v5.0';
COMMENT ON TABLE public.subcontractor_workers IS 'Lightweight profiles for sub workers - safety credentials only';
COMMENT ON TABLE public.employee_certifications IS 'Training and certification records with expiration tracking';
COMMENT ON TABLE public.compliance_overrides IS 'Emergency override log - 4 hour window with Safety Director notification';

COMMENT ON COLUMN public.employees.ssn_encrypted IS 'AES-256 encrypted SSN - decrypt only at application level';
COMMENT ON COLUMN public.employees.compliance_status IS 'Cached compliance status - computed by background job';
COMMENT ON COLUMN public.compliance_overrides.digital_signature IS 'Required for override - Base64 signature or typed confirmation';
