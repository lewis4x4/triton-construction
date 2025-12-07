-- =============================================================================
-- Migration: 052_crew_builder_davis_bacon.sql
-- Purpose: Crew builder, dispatcher, and Davis-Bacon compliant task logging
-- Note: Task-based wage tracking with locked rates per System Prompt v5.0
-- Date: December 6, 2024
-- =============================================================================

-- =============================================================================
-- PART 1: Enums
-- =============================================================================

CREATE TYPE public.crew_assignment_status AS ENUM (
  'scheduled',
  'active',
  'completed',
  'cancelled'
);

CREATE TYPE public.work_classification AS ENUM (
  'laborer',
  'carpenter',
  'cement_mason',
  'electrician',
  'equipment_operator',
  'ironworker',
  'painter',
  'pipefitter',
  'plumber',
  'roofer',
  'sheet_metal_worker',
  'truck_driver',
  'welder',
  'foreman',
  'superintendent',
  'other'
);

CREATE TYPE public.overtime_type AS ENUM (
  'regular',     -- 1.0x
  'overtime',    -- 1.5x
  'double_time'  -- 2.0x
);

-- =============================================================================
-- PART 2: Prevailing Wage Rates
-- =============================================================================

CREATE TABLE public.prevailing_wage_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Wage determination reference
  wage_determination_number TEXT NOT NULL, -- e.g., WV20240001
  modification_number INTEGER DEFAULT 0,

  -- Classification
  work_classification public.work_classification NOT NULL,
  classification_title TEXT NOT NULL, -- Full title from wage determination
  group_number TEXT, -- Some classifications have groups

  -- Rates
  base_rate DECIMAL(10, 2) NOT NULL,
  fringe_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_rate DECIMAL(10, 2) GENERATED ALWAYS AS (base_rate + fringe_rate) STORED,

  -- Overtime rates (computed)
  ot_base_rate DECIMAL(10, 2) GENERATED ALWAYS AS (base_rate * 1.5) STORED,
  dt_base_rate DECIMAL(10, 2) GENERATED ALWAYS AS (base_rate * 2.0) STORED,

  -- Effective dates
  effective_date DATE NOT NULL,
  expiration_date DATE,

  -- County/Region (WV specific)
  counties TEXT[], -- Array of county names this applies to

  -- Project association (optional - can be org-wide or project-specific)
  project_id UUID REFERENCES public.projects(id),

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Source document
  document_url TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wage_rates_org ON public.prevailing_wage_rates(organization_id);
CREATE INDEX idx_wage_rates_classification ON public.prevailing_wage_rates(work_classification);
CREATE INDEX idx_wage_rates_determination ON public.prevailing_wage_rates(wage_determination_number);
CREATE INDEX idx_wage_rates_active ON public.prevailing_wage_rates(is_active, effective_date)
  WHERE is_active = true;
CREATE INDEX idx_wage_rates_project ON public.prevailing_wage_rates(project_id);

-- RLS MANDATE
ALTER TABLE public.prevailing_wage_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.prevailing_wage_rates FOR ALL USING (false);

CREATE POLICY "wage_rates_select" ON public.prevailing_wage_rates FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "wage_rates_admin" ON public.prevailing_wage_rates FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'admin.system_settings', NULL)
  );

-- =============================================================================
-- PART 3: Crew Templates
-- =============================================================================

CREATE TABLE public.crew_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Template info
  name TEXT NOT NULL,
  description TEXT,
  work_type TEXT, -- e.g., 'Paving', 'Bridge', 'Excavation'

  -- Default composition
  default_size INTEGER DEFAULT 5,
  required_roles JSONB, -- [{classification: 'foreman', count: 1}, {classification: 'laborer', count: 3}]

  -- Safety requirements
  requires_competent_person public.competent_person_type[],
  minimum_certifications TEXT[], -- e.g., ['OSHA_10', 'FIRST_AID']

  -- Equipment requirements
  required_equipment_types TEXT[],

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_templates_org ON public.crew_templates(organization_id);
CREATE INDEX idx_templates_active ON public.crew_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_templates_work_type ON public.crew_templates(work_type);

-- RLS MANDATE
ALTER TABLE public.crew_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.crew_templates FOR ALL USING (false);

CREATE POLICY "templates_select" ON public.crew_templates FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "templates_manage" ON public.crew_templates FOR ALL
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- =============================================================================
-- PART 4: Crew Assignments
-- =============================================================================

CREATE TABLE public.crew_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- Schedule
  assignment_date DATE NOT NULL,
  shift TEXT DEFAULT 'day', -- day, night, swing
  scheduled_start_time TIME,
  scheduled_end_time TIME,

  -- Crew identification
  crew_name TEXT,
  template_id UUID REFERENCES public.crew_templates(id),

  -- Work details
  work_type TEXT,
  work_location TEXT,
  cost_code TEXT,
  work_description TEXT,

  -- Foreman/Lead
  foreman_employee_id UUID REFERENCES public.employees(id),

  -- Status
  status public.crew_assignment_status DEFAULT 'scheduled',

  -- Actual times
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,

  -- Compliance check results (cached)
  compliance_checked_at TIMESTAMPTZ,
  compliance_passed BOOLEAN,
  compliance_issues TEXT[],

  -- Weather
  weather_conditions TEXT,
  weather_delayed BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,
  supervisor_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assignments_org ON public.crew_assignments(organization_id);
CREATE INDEX idx_assignments_project ON public.crew_assignments(project_id);
CREATE INDEX idx_assignments_date ON public.crew_assignments(assignment_date);
CREATE INDEX idx_assignments_status ON public.crew_assignments(status);
CREATE INDEX idx_assignments_foreman ON public.crew_assignments(foreman_employee_id);

-- RLS MANDATE
ALTER TABLE public.crew_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.crew_assignments FOR ALL USING (false);

CREATE POLICY "assignments_select" ON public.crew_assignments FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "assignments_manage" ON public.crew_assignments FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'projects.update', project_id)
  );

-- =============================================================================
-- PART 5: Crew Assignment Members
-- =============================================================================

CREATE TABLE public.crew_assignment_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_assignment_id UUID NOT NULL REFERENCES public.crew_assignments(id) ON DELETE CASCADE,

  -- Who
  employee_id UUID REFERENCES public.employees(id),
  subcontractor_worker_id UUID REFERENCES public.subcontractor_workers(id),

  CONSTRAINT crew_member_has_worker CHECK (
    (employee_id IS NOT NULL AND subcontractor_worker_id IS NULL) OR
    (employee_id IS NULL AND subcontractor_worker_id IS NOT NULL)
  ),

  -- Role on crew
  role_on_crew TEXT, -- foreman, operator, laborer, etc.
  work_classification public.work_classification,

  -- Compliance at assignment time
  compliance_status_at_assignment public.compliance_status,
  certifications_verified TEXT[],

  -- Actual attendance
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  hours_worked DECIMAL(4, 2),

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_crew_members_assignment ON public.crew_assignment_members(crew_assignment_id);
CREATE INDEX idx_crew_members_employee ON public.crew_assignment_members(employee_id);
CREATE INDEX idx_crew_members_sub_worker ON public.crew_assignment_members(subcontractor_worker_id);

-- RLS MANDATE
ALTER TABLE public.crew_assignment_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.crew_assignment_members FOR ALL USING (false);

CREATE POLICY "crew_members_select" ON public.crew_assignment_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_assignments ca
      WHERE ca.id = crew_assignment_id
      AND ca.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "crew_members_manage" ON public.crew_assignment_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.crew_assignments ca
      WHERE ca.id = crew_assignment_id
      AND ca.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- =============================================================================
-- PART 6: Task Logs (Davis-Bacon Compliance)
-- =============================================================================

CREATE TABLE public.task_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Who
  employee_id UUID NOT NULL REFERENCES public.employees(id),

  -- Where/What
  project_id UUID NOT NULL REFERENCES public.projects(id),
  crew_assignment_id UUID REFERENCES public.crew_assignments(id),

  -- When
  work_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,

  -- Hours breakdown
  hours_regular DECIMAL(4, 2) DEFAULT 0,
  hours_overtime DECIMAL(4, 2) DEFAULT 0,
  hours_double_time DECIMAL(4, 2) DEFAULT 0,
  hours_total DECIMAL(4, 2) GENERATED ALWAYS AS
    (COALESCE(hours_regular, 0) + COALESCE(hours_overtime, 0) + COALESCE(hours_double_time, 0)) STORED,

  -- Davis-Bacon Classification
  cost_code TEXT NOT NULL,
  work_classification public.work_classification NOT NULL,
  prevailing_wage_class TEXT NOT NULL, -- From wage determination

  -- LOCKED RATES AT TIME OF WORK (Crucial for Davis-Bacon audits)
  locked_base_rate DECIMAL(10, 2) NOT NULL,
  locked_fringe_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  locked_total_rate DECIMAL(10, 2) GENERATED ALWAYS AS (locked_base_rate + locked_fringe_rate) STORED,

  -- Computed pay
  gross_regular DECIMAL(10, 2) GENERATED ALWAYS AS (hours_regular * locked_base_rate) STORED,
  gross_overtime DECIMAL(10, 2) GENERATED ALWAYS AS (hours_overtime * locked_base_rate * 1.5) STORED,
  gross_double_time DECIMAL(10, 2) GENERATED ALWAYS AS (hours_double_time * locked_base_rate * 2.0) STORED,
  fringe_owed DECIMAL(10, 2) GENERATED ALWAYS AS
    ((COALESCE(hours_regular, 0) + COALESCE(hours_overtime, 0) + COALESCE(hours_double_time, 0)) * locked_fringe_rate) STORED,

  -- Task description
  task_description TEXT,

  -- Equipment used (affects classification)
  equipment_id UUID REFERENCES public.equipment(id),
  equipment_description TEXT,

  -- Location
  work_location TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  gps_verified BOOLEAN DEFAULT false,

  -- Approval workflow
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'rejected', 'paid')),
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,

  -- Certified payroll reference
  certified_payroll_id UUID, -- References certified_payrolls when generated

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_task_logs_org ON public.task_logs(organization_id);
CREATE INDEX idx_task_logs_employee ON public.task_logs(employee_id);
CREATE INDEX idx_task_logs_project ON public.task_logs(project_id);
CREATE INDEX idx_task_logs_date ON public.task_logs(work_date);
CREATE INDEX idx_task_logs_crew ON public.task_logs(crew_assignment_id);
CREATE INDEX idx_task_logs_status ON public.task_logs(status);
CREATE INDEX idx_task_logs_cost_code ON public.task_logs(cost_code);
CREATE INDEX idx_task_logs_payroll ON public.task_logs(certified_payroll_id);

-- RLS MANDATE
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.task_logs FOR ALL USING (false);

CREATE POLICY "task_logs_select" ON public.task_logs FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "task_logs_insert" ON public.task_logs FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "task_logs_update" ON public.task_logs FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND (
      -- Own pending entries
      (created_by = auth.uid() AND status = 'pending')
      -- Or have approval permission
      OR public.user_has_permission(auth.uid(), 'time_tracking.approve', project_id)
    )
  );

-- =============================================================================
-- PART 7: Certified Payrolls (WH-347)
-- =============================================================================

CREATE TABLE public.certified_payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- Payroll identification
  payroll_number INTEGER NOT NULL,
  week_ending_date DATE NOT NULL,

  -- Wage determination
  wage_determination_number TEXT NOT NULL,
  contract_number TEXT,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'reviewed', 'certified', 'submitted', 'accepted', 'rejected')),

  -- Totals (cached)
  total_employees INTEGER DEFAULT 0,
  total_hours DECIMAL(10, 2) DEFAULT 0,
  total_gross DECIMAL(12, 2) DEFAULT 0,
  total_fringe DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  total_net DECIMAL(12, 2) DEFAULT 0,

  -- Certification
  certified_at TIMESTAMPTZ,
  certified_by UUID REFERENCES auth.users(id),
  certifier_name TEXT,
  certifier_title TEXT,
  certifier_signature_url TEXT,

  -- Submission
  submitted_at TIMESTAMPTZ,
  submitted_to TEXT, -- Agency name
  submission_method TEXT, -- email, portal, mail

  -- Documents
  pdf_url TEXT,
  supporting_docs TEXT[],

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint
ALTER TABLE public.certified_payrolls
  ADD CONSTRAINT unique_payroll_per_project_week UNIQUE (project_id, week_ending_date);

-- Indexes
CREATE INDEX idx_payrolls_org ON public.certified_payrolls(organization_id);
CREATE INDEX idx_payrolls_project ON public.certified_payrolls(project_id);
CREATE INDEX idx_payrolls_week ON public.certified_payrolls(week_ending_date);
CREATE INDEX idx_payrolls_status ON public.certified_payrolls(status);

-- RLS MANDATE
ALTER TABLE public.certified_payrolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.certified_payrolls FOR ALL USING (false);

CREATE POLICY "payrolls_select" ON public.certified_payrolls FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "payrolls_manage" ON public.certified_payrolls FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'time_tracking.approve', project_id)
  );

-- =============================================================================
-- PART 8: Helper Functions
-- =============================================================================

-- Get applicable wage rate at time of work
CREATE OR REPLACE FUNCTION public.get_wage_rate_for_work(
  p_organization_id UUID,
  p_project_id UUID,
  p_work_classification public.work_classification,
  p_work_date DATE
)
RETURNS TABLE (
  base_rate DECIMAL(10, 2),
  fringe_rate DECIMAL(10, 2),
  wage_determination_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pwr.base_rate,
    pwr.fringe_rate,
    pwr.wage_determination_number
  FROM public.prevailing_wage_rates pwr
  WHERE
    pwr.organization_id = p_organization_id
    AND pwr.work_classification = p_work_classification
    AND pwr.is_active = true
    AND pwr.effective_date <= p_work_date
    AND (pwr.expiration_date IS NULL OR pwr.expiration_date > p_work_date)
    AND (pwr.project_id IS NULL OR pwr.project_id = p_project_id)
  ORDER BY
    -- Project-specific rates take priority
    CASE WHEN pwr.project_id = p_project_id THEN 0 ELSE 1 END,
    -- Most recent effective date
    pwr.effective_date DESC
  LIMIT 1;
END;
$$;

-- Calculate weekly overtime (40+ hours = OT)
CREATE OR REPLACE FUNCTION public.calculate_weekly_overtime(
  p_employee_id UUID,
  p_week_ending_date DATE
)
RETURNS TABLE (
  total_hours DECIMAL(10, 2),
  regular_hours DECIMAL(10, 2),
  overtime_hours DECIMAL(10, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_total DECIMAL(10, 2);
BEGIN
  v_week_start := p_week_ending_date - INTERVAL '6 days';

  SELECT COALESCE(SUM(tl.hours_total), 0) INTO v_total
  FROM public.task_logs tl
  WHERE
    tl.employee_id = p_employee_id
    AND tl.work_date BETWEEN v_week_start AND p_week_ending_date;

  RETURN QUERY
  SELECT
    v_total AS total_hours,
    LEAST(v_total, 40.00) AS regular_hours,
    GREATEST(v_total - 40.00, 0.00) AS overtime_hours;
END;
$$;

-- Generate certified payroll
CREATE OR REPLACE FUNCTION public.generate_certified_payroll(
  p_project_id UUID,
  p_week_ending_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payroll_id UUID;
  v_org_id UUID;
  v_payroll_number INTEGER;
  v_wage_det TEXT;
BEGIN
  -- Get organization
  SELECT organization_id INTO v_org_id
  FROM public.projects WHERE id = p_project_id;

  -- Get next payroll number
  SELECT COALESCE(MAX(payroll_number), 0) + 1 INTO v_payroll_number
  FROM public.certified_payrolls
  WHERE project_id = p_project_id;

  -- Get wage determination (from project or first task log)
  SELECT DISTINCT prevailing_wage_class INTO v_wage_det
  FROM public.task_logs
  WHERE project_id = p_project_id
  LIMIT 1;

  -- Create payroll record
  INSERT INTO public.certified_payrolls (
    organization_id, project_id, payroll_number, week_ending_date,
    wage_determination_number, status
  )
  VALUES (
    v_org_id, p_project_id, v_payroll_number, p_week_ending_date,
    COALESCE(v_wage_det, 'TBD'), 'generated'
  )
  RETURNING id INTO v_payroll_id;

  -- Link task logs to payroll
  UPDATE public.task_logs
  SET certified_payroll_id = v_payroll_id
  WHERE
    project_id = p_project_id
    AND work_date BETWEEN (p_week_ending_date - INTERVAL '6 days') AND p_week_ending_date
    AND certified_payroll_id IS NULL
    AND status IN ('approved', 'submitted');

  -- Update payroll totals
  UPDATE public.certified_payrolls cp
  SET
    total_employees = (
      SELECT COUNT(DISTINCT employee_id)
      FROM public.task_logs WHERE certified_payroll_id = v_payroll_id
    ),
    total_hours = (
      SELECT COALESCE(SUM(hours_total), 0)
      FROM public.task_logs WHERE certified_payroll_id = v_payroll_id
    ),
    total_gross = (
      SELECT COALESCE(SUM(gross_regular + gross_overtime + gross_double_time), 0)
      FROM public.task_logs WHERE certified_payroll_id = v_payroll_id
    ),
    total_fringe = (
      SELECT COALESCE(SUM(fringe_owed), 0)
      FROM public.task_logs WHERE certified_payroll_id = v_payroll_id
    )
  WHERE cp.id = v_payroll_id;

  RETURN v_payroll_id;
END;
$$;

-- Validate crew compliance for assignment
CREATE OR REPLACE FUNCTION public.validate_crew_assignment_compliance(
  p_crew_assignment_id UUID
)
RETURNS TABLE (
  is_compliant BOOLEAN,
  issues TEXT[],
  has_competent_person BOOLEAN,
  all_orientations_valid BOOLEAN,
  all_certs_valid BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_issues TEXT[] := '{}';
  v_assignment RECORD;
  v_has_cp BOOLEAN := true;
  v_all_oriented BOOLEAN := true;
  v_all_certs BOOLEAN := true;
  v_template RECORD;
BEGIN
  -- Get assignment details
  SELECT * INTO v_assignment FROM public.crew_assignments WHERE id = p_crew_assignment_id;

  -- Check template requirements if using a template
  IF v_assignment.template_id IS NOT NULL THEN
    SELECT * INTO v_template FROM public.crew_templates WHERE id = v_assignment.template_id;

    -- Check competent person requirements
    IF v_template.requires_competent_person IS NOT NULL THEN
      FOR i IN 1..array_length(v_template.requires_competent_person, 1) LOOP
        IF NOT public.crew_has_competent_person(
          v_assignment.project_id,
          v_template.requires_competent_person[i],
          (SELECT ARRAY_AGG(employee_id) FROM public.crew_assignment_members WHERE crew_assignment_id = p_crew_assignment_id AND employee_id IS NOT NULL)
        ) THEN
          v_has_cp := false;
          v_issues := array_append(v_issues, 'Missing competent person for: ' || v_template.requires_competent_person[i]::TEXT);
        END IF;
      END LOOP;
    END IF;
  END IF;

  -- Check each crew member
  FOR v_member IN (
    SELECT cam.*, e.compliance_status
    FROM public.crew_assignment_members cam
    LEFT JOIN public.employees e ON e.id = cam.employee_id
    WHERE cam.crew_assignment_id = p_crew_assignment_id
  ) LOOP
    -- Check employee compliance status
    IF v_member.employee_id IS NOT NULL AND v_member.compliance_status != 'compliant' THEN
      v_all_certs := false;
      v_issues := array_append(v_issues, 'Employee not compliant: ' || v_member.employee_id::TEXT);
    END IF;

    -- Check orientation
    IF v_member.employee_id IS NOT NULL THEN
      IF NOT public.has_valid_site_orientation(v_member.employee_id, NULL, v_assignment.project_id) THEN
        v_all_oriented := false;
        v_issues := array_append(v_issues, 'Missing site orientation: ' || v_member.employee_id::TEXT);
      END IF;
    END IF;
  END LOOP;

  -- Update assignment with results
  UPDATE public.crew_assignments
  SET
    compliance_checked_at = NOW(),
    compliance_passed = (array_length(v_issues, 1) IS NULL OR array_length(v_issues, 1) = 0),
    compliance_issues = v_issues
  WHERE id = p_crew_assignment_id;

  RETURN QUERY SELECT
    (array_length(v_issues, 1) IS NULL OR array_length(v_issues, 1) = 0) AS is_compliant,
    v_issues AS issues,
    v_has_cp AS has_competent_person,
    v_all_oriented AS all_orientations_valid,
    v_all_certs AS all_certs_valid;
END;
$$;

-- =============================================================================
-- PART 9: Triggers
-- =============================================================================

CREATE TRIGGER wage_rates_updated_at
  BEFORE UPDATE ON public.prevailing_wage_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER templates_updated_at
  BEFORE UPDATE ON public.crew_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER assignments_updated_at
  BEFORE UPDATE ON public.crew_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER task_logs_updated_at
  BEFORE UPDATE ON public.task_logs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER payrolls_updated_at
  BEFORE UPDATE ON public.certified_payrolls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-set locked wage rate on task log insert
CREATE OR REPLACE FUNCTION public.set_task_log_wage_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_rate RECORD;
BEGIN
  -- Only set if not already set
  IF NEW.locked_base_rate IS NULL THEN
    SELECT * INTO v_rate FROM public.get_wage_rate_for_work(
      NEW.organization_id,
      NEW.project_id,
      NEW.work_classification,
      NEW.work_date
    );

    IF v_rate.base_rate IS NOT NULL THEN
      NEW.locked_base_rate := v_rate.base_rate;
      NEW.locked_fringe_rate := COALESCE(v_rate.fringe_rate, 0);
      NEW.prevailing_wage_class := v_rate.wage_determination_number;
    ELSE
      -- Require wage rate
      RAISE EXCEPTION 'No applicable wage rate found for classification % on %',
        NEW.work_classification, NEW.work_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_logs_set_wage_rate
  BEFORE INSERT ON public.task_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_task_log_wage_rate();

-- =============================================================================
-- PART 10: Views
-- =============================================================================

-- Daily crew schedule view
CREATE OR REPLACE VIEW public.v_daily_crew_schedule AS
SELECT
  ca.id AS assignment_id,
  ca.organization_id,
  ca.project_id,
  p.name AS project_name,
  ca.assignment_date,
  ca.shift,
  ca.crew_name,
  ca.work_type,
  ca.status,
  ca.compliance_passed,
  ca.compliance_issues,
  e.first_name || ' ' || e.last_name AS foreman_name,
  (SELECT COUNT(*) FROM public.crew_assignment_members WHERE crew_assignment_id = ca.id) AS crew_size
FROM public.crew_assignments ca
JOIN public.projects p ON p.id = ca.project_id
LEFT JOIN public.employees e ON e.id = ca.foreman_employee_id;

-- Weekly timesheet summary view
CREATE OR REPLACE VIEW public.v_weekly_timesheet_summary AS
SELECT
  tl.employee_id,
  e.first_name || ' ' || e.last_name AS employee_name,
  e.employee_number,
  tl.project_id,
  p.name AS project_name,
  DATE_TRUNC('week', tl.work_date)::DATE AS week_start,
  (DATE_TRUNC('week', tl.work_date) + INTERVAL '6 days')::DATE AS week_end,
  SUM(tl.hours_regular) AS total_regular,
  SUM(tl.hours_overtime) AS total_overtime,
  SUM(tl.hours_double_time) AS total_double_time,
  SUM(tl.hours_total) AS total_hours,
  SUM(tl.gross_regular + tl.gross_overtime + tl.gross_double_time) AS total_gross,
  SUM(tl.fringe_owed) AS total_fringe
FROM public.task_logs tl
JOIN public.employees e ON e.id = tl.employee_id
JOIN public.projects p ON p.id = tl.project_id
GROUP BY
  tl.employee_id, e.first_name, e.last_name, e.employee_number,
  tl.project_id, p.name,
  DATE_TRUNC('week', tl.work_date);

-- =============================================================================
-- PART 11: Comments
-- =============================================================================

COMMENT ON TABLE public.prevailing_wage_rates IS 'Davis-Bacon prevailing wage rates by classification and county';
COMMENT ON TABLE public.crew_templates IS 'Reusable crew composition templates with safety requirements';
COMMENT ON TABLE public.crew_assignments IS 'Daily crew assignments to projects with compliance tracking';
COMMENT ON TABLE public.task_logs IS 'Davis-Bacon compliant task logs with LOCKED wage rates at time of work';
COMMENT ON TABLE public.certified_payrolls IS 'WH-347 certified payroll records for federal projects';

COMMENT ON COLUMN public.task_logs.locked_base_rate IS 'CRITICAL: Wage rate locked at time of work - never changes for audit trail';
COMMENT ON COLUMN public.task_logs.locked_fringe_rate IS 'CRITICAL: Fringe rate locked at time of work - never changes for audit trail';
