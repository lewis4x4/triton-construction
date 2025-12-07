-- =============================================================================
-- Migration: 050_safety_incidents.sql
-- Purpose: Safety management, incidents, competent persons, orientations
-- Security: Default-deny RLS on ALL tables per System Prompt v5.0
-- Date: December 6, 2024
-- =============================================================================

-- =============================================================================
-- PART 1: Enums
-- =============================================================================

CREATE TYPE public.incident_classification AS ENUM (
  'fatality',
  'hospitalization',
  'amputation',
  'loss_of_eye',
  'recordable_injury',
  'first_aid_only',
  'near_miss',
  'property_damage',
  'environmental',
  'third_party'
);

CREATE TYPE public.incident_status AS ENUM (
  'reported',
  'investigating',
  'root_cause_identified',
  'corrective_actions_assigned',
  'closed',
  'osha_reported'
);

CREATE TYPE public.competent_person_type AS ENUM (
  'excavation',
  'scaffolding',
  'confined_space',
  'fall_protection',
  'crane_rigging',
  'electrical',
  'lockout_tagout',
  'respiratory_protection',
  'hazmat',
  'traffic_control',
  'demolition',
  'steel_erection'
);

CREATE TYPE public.observation_type AS ENUM (
  'safe_behavior',
  'at_risk_behavior',
  'hazard_identified',
  'near_miss',
  'positive_recognition',
  'condition_corrected'
);

-- =============================================================================
-- PART 2: Incident Number Sequence
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.incident_number_seq START 1;

-- =============================================================================
-- PART 3: Incidents Table
-- =============================================================================

CREATE TABLE public.incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Auto-generated incident number
  incident_number TEXT UNIQUE NOT NULL,

  -- Location
  project_id UUID REFERENCES public.projects(id),
  location_description TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- When
  incident_date DATE NOT NULL,
  incident_time TIME,
  shift TEXT, -- Day, Night, Swing

  -- Classification
  classification public.incident_classification NOT NULL,
  osha_recordable BOOLEAN DEFAULT false,
  osha_case_number TEXT,
  osha_reported_at TIMESTAMPTZ,

  -- Description
  description TEXT NOT NULL,
  immediate_actions_taken TEXT,
  root_cause TEXT,
  contributing_factors TEXT[],

  -- Who was involved
  injured_employee_id UUID REFERENCES public.employees(id),
  injured_subcontractor_worker_id UUID REFERENCES public.subcontractor_workers(id),
  injured_third_party_name TEXT,
  injury_description TEXT,
  body_parts_affected TEXT[],
  treatment_provided TEXT,
  medical_facility TEXT,
  days_away_from_work INTEGER DEFAULT 0,
  days_restricted_duty INTEGER DEFAULT 0,

  -- Witnesses
  witness_names TEXT[],
  witness_statements TEXT,

  -- Investigation
  status public.incident_status DEFAULT 'reported',
  investigator_id UUID REFERENCES auth.users(id),
  investigation_started_at TIMESTAMPTZ,
  investigation_completed_at TIMESTAMPTZ,

  -- Reporting
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  supervisor_notified_at TIMESTAMPTZ,
  safety_director_notified_at TIMESTAMPTZ,
  executive_notified_at TIMESTAMPTZ,

  -- Documents
  photos TEXT[], -- URLs
  documents TEXT[], -- URLs

  -- Corrective Actions
  corrective_actions JSONB, -- Array of {action, assignee, due_date, completed_at}

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for safe incident number generation
CREATE OR REPLACE FUNCTION public.generate_incident_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.incident_number := 'INC-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
    LPAD(nextval('public.incident_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER incident_number_trigger
  BEFORE INSERT ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.generate_incident_number();

-- Indexes
CREATE INDEX idx_incidents_org ON public.incidents(organization_id);
CREATE INDEX idx_incidents_project ON public.incidents(project_id);
CREATE INDEX idx_incidents_date ON public.incidents(incident_date DESC);
CREATE INDEX idx_incidents_classification ON public.incidents(classification);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_incidents_osha ON public.incidents(osha_recordable) WHERE osha_recordable = true;

-- RLS MANDATE
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.incidents FOR ALL USING (false);

CREATE POLICY "incidents_select" ON public.incidents FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "incidents_insert" ON public.incidents FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "incidents_update" ON public.incidents FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'safety.update', project_id)
  );

-- =============================================================================
-- PART 4: Competent Person Designations
-- =============================================================================

CREATE TABLE public.competent_person_designations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Who
  employee_id UUID REFERENCES public.employees(id),
  subcontractor_worker_id UUID REFERENCES public.subcontractor_workers(id),

  -- Check constraint: must have one or the other
  CONSTRAINT competent_person_has_worker CHECK (
    (employee_id IS NOT NULL AND subcontractor_worker_id IS NULL) OR
    (employee_id IS NULL AND subcontractor_worker_id IS NOT NULL)
  ),

  -- Designation
  competent_person_type public.competent_person_type NOT NULL,

  -- Training/Qualification
  training_provider TEXT,
  training_date DATE,
  certificate_number TEXT,
  certificate_url TEXT,

  -- Validity
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE,
  is_active BOOLEAN DEFAULT true,

  -- Designated by
  designated_by UUID NOT NULL REFERENCES auth.users(id),
  designation_notes TEXT,

  -- Revocation
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revocation_reason TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_comp_person_org ON public.competent_person_designations(organization_id);
CREATE INDEX idx_comp_person_employee ON public.competent_person_designations(employee_id);
CREATE INDEX idx_comp_person_sub_worker ON public.competent_person_designations(subcontractor_worker_id);
CREATE INDEX idx_comp_person_type ON public.competent_person_designations(competent_person_type);
CREATE INDEX idx_comp_person_active ON public.competent_person_designations(is_active, expiration_date)
  WHERE is_active = true;

-- RLS MANDATE
ALTER TABLE public.competent_person_designations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.competent_person_designations FOR ALL USING (false);

CREATE POLICY "comp_person_select" ON public.competent_person_designations FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "comp_person_insert" ON public.competent_person_designations FOR INSERT
  WITH CHECK (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'safety.create', NULL)
  );

CREATE POLICY "comp_person_update" ON public.competent_person_designations FOR UPDATE
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'safety.update', NULL)
  );

-- =============================================================================
-- PART 5: Safety Orientations
-- =============================================================================

CREATE TABLE public.safety_orientations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Who received orientation
  employee_id UUID REFERENCES public.employees(id),
  subcontractor_worker_id UUID REFERENCES public.subcontractor_workers(id),

  CONSTRAINT orientation_has_worker CHECK (
    (employee_id IS NOT NULL AND subcontractor_worker_id IS NULL) OR
    (employee_id IS NULL AND subcontractor_worker_id IS NOT NULL)
  ),

  -- Project-specific or general
  project_id UUID REFERENCES public.projects(id),
  is_site_specific BOOLEAN DEFAULT false,

  -- Orientation details
  orientation_type TEXT NOT NULL, -- new_hire, site_specific, annual_refresher, visitor
  orientation_date DATE NOT NULL,
  duration_minutes INTEGER,

  -- Topics covered
  topics_covered TEXT[],
  hazards_reviewed TEXT[],
  ppe_requirements_reviewed BOOLEAN DEFAULT false,
  emergency_procedures_reviewed BOOLEAN DEFAULT false,

  -- Conducted by
  conducted_by UUID REFERENCES auth.users(id),
  conductor_name TEXT,

  -- Acknowledgment
  acknowledged_at TIMESTAMPTZ,
  signature_url TEXT,
  badge_issued BOOLEAN DEFAULT false,
  badge_number TEXT,

  -- Documents
  orientation_materials_url TEXT,
  quiz_score INTEGER,
  quiz_passed BOOLEAN,

  -- Validity
  valid_until DATE,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orientations_org ON public.safety_orientations(organization_id);
CREATE INDEX idx_orientations_employee ON public.safety_orientations(employee_id);
CREATE INDEX idx_orientations_sub_worker ON public.safety_orientations(subcontractor_worker_id);
CREATE INDEX idx_orientations_project ON public.safety_orientations(project_id);
CREATE INDEX idx_orientations_date ON public.safety_orientations(orientation_date DESC);

-- RLS MANDATE
ALTER TABLE public.safety_orientations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.safety_orientations FOR ALL USING (false);

CREATE POLICY "orientations_select" ON public.safety_orientations FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "orientations_insert" ON public.safety_orientations FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

-- =============================================================================
-- PART 6: Toolbox Talks
-- =============================================================================

CREATE TABLE public.toolbox_talks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),

  -- Talk details
  talk_date DATE NOT NULL,
  talk_time TIME,
  topic TEXT NOT NULL,
  description TEXT,

  -- Content
  template_id UUID, -- Reference to talk template
  content_url TEXT, -- Uploaded materials
  duration_minutes INTEGER DEFAULT 15,

  -- Conducted by
  conducted_by UUID NOT NULL REFERENCES auth.users(id),
  conductor_name TEXT,

  -- Weather/conditions discussed
  weather_discussed BOOLEAN DEFAULT false,
  site_conditions TEXT,
  hazards_identified TEXT[],

  -- Attendance count (detailed in separate table)
  employee_count INTEGER DEFAULT 0,
  subcontractor_count INTEGER DEFAULT 0,

  -- Status
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Toolbox Talk Attendees
CREATE TABLE public.toolbox_talk_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toolbox_talk_id UUID NOT NULL REFERENCES public.toolbox_talks(id) ON DELETE CASCADE,

  employee_id UUID REFERENCES public.employees(id),
  subcontractor_worker_id UUID REFERENCES public.subcontractor_workers(id),

  CONSTRAINT talk_attendee_has_worker CHECK (
    (employee_id IS NOT NULL AND subcontractor_worker_id IS NULL) OR
    (employee_id IS NULL AND subcontractor_worker_id IS NOT NULL)
  ),

  -- Acknowledgment
  acknowledged_at TIMESTAMPTZ,
  signature_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_talks_org ON public.toolbox_talks(organization_id);
CREATE INDEX idx_talks_project ON public.toolbox_talks(project_id);
CREATE INDEX idx_talks_date ON public.toolbox_talks(talk_date DESC);
CREATE INDEX idx_talk_attendees_talk ON public.toolbox_talk_attendees(toolbox_talk_id);
CREATE INDEX idx_talk_attendees_employee ON public.toolbox_talk_attendees(employee_id);

-- RLS MANDATE
ALTER TABLE public.toolbox_talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toolbox_talk_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.toolbox_talks FOR ALL USING (false);
CREATE POLICY "Deny all by default" ON public.toolbox_talk_attendees FOR ALL USING (false);

CREATE POLICY "talks_select" ON public.toolbox_talks FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "talks_insert" ON public.toolbox_talks FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "talks_update" ON public.toolbox_talks FOR UPDATE
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "talk_attendees_select" ON public.toolbox_talk_attendees FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.toolbox_talks t
      WHERE t.id = toolbox_talk_id
      AND t.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "talk_attendees_insert" ON public.toolbox_talk_attendees FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.toolbox_talks t
      WHERE t.id = toolbox_talk_id
      AND t.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- =============================================================================
-- PART 7: Safety Observations
-- =============================================================================

CREATE TABLE public.safety_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),

  -- Observation details
  observation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  observation_time TIME,
  observation_type public.observation_type NOT NULL,

  -- Location
  location_description TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Description
  description TEXT NOT NULL,
  immediate_action_taken TEXT,

  -- Who observed
  observed_by UUID NOT NULL REFERENCES auth.users(id),
  observer_name TEXT,

  -- Who was observed (optional - for behaviors)
  observed_employee_id UUID REFERENCES public.employees(id),
  observed_subcontractor_worker_id UUID REFERENCES public.subcontractor_workers(id),
  observed_trade TEXT,

  -- Category
  category TEXT, -- Fall Protection, Housekeeping, PPE, etc.
  subcategory TEXT,

  -- Risk level
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  -- Photos
  photos TEXT[],

  -- Follow-up
  requires_followup BOOLEAN DEFAULT false,
  followup_assigned_to UUID REFERENCES auth.users(id),
  followup_due_date DATE,
  followup_completed_at TIMESTAMPTZ,
  followup_notes TEXT,

  -- Recognition (for positive observations)
  recognition_given BOOLEAN DEFAULT false,
  recognition_type TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_observations_org ON public.safety_observations(organization_id);
CREATE INDEX idx_observations_project ON public.safety_observations(project_id);
CREATE INDEX idx_observations_date ON public.safety_observations(observation_date DESC);
CREATE INDEX idx_observations_type ON public.safety_observations(observation_type);
CREATE INDEX idx_observations_risk ON public.safety_observations(risk_level) WHERE risk_level IN ('high', 'critical');
CREATE INDEX idx_observations_followup ON public.safety_observations(requires_followup, followup_completed_at)
  WHERE requires_followup = true AND followup_completed_at IS NULL;

-- RLS MANDATE
ALTER TABLE public.safety_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.safety_observations FOR ALL USING (false);

CREATE POLICY "observations_select" ON public.safety_observations FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "observations_insert" ON public.safety_observations FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "observations_update" ON public.safety_observations FOR UPDATE
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- =============================================================================
-- PART 8: Helper Functions
-- =============================================================================

-- Check if crew has competent person for work type
CREATE OR REPLACE FUNCTION public.crew_has_competent_person(
  p_project_id UUID,
  p_competent_person_type public.competent_person_type,
  p_employee_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.competent_person_designations cpd
    WHERE
      cpd.employee_id = ANY(p_employee_ids)
      AND cpd.competent_person_type = p_competent_person_type
      AND cpd.is_active = true
      AND (cpd.expiration_date IS NULL OR cpd.expiration_date > CURRENT_DATE)
      AND cpd.revoked_at IS NULL
  );
END;
$$;

-- Check if worker has valid site orientation
CREATE OR REPLACE FUNCTION public.has_valid_site_orientation(
  p_employee_id UUID DEFAULT NULL,
  p_subcontractor_worker_id UUID DEFAULT NULL,
  p_project_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.safety_orientations so
    WHERE
      (
        (p_employee_id IS NOT NULL AND so.employee_id = p_employee_id) OR
        (p_subcontractor_worker_id IS NOT NULL AND so.subcontractor_worker_id = p_subcontractor_worker_id)
      )
      AND (p_project_id IS NULL OR so.project_id = p_project_id OR so.is_site_specific = false)
      AND (so.valid_until IS NULL OR so.valid_until > CURRENT_DATE)
      AND so.acknowledged_at IS NOT NULL
  );
END;
$$;

-- Get incident stats for project
CREATE OR REPLACE FUNCTION public.get_project_safety_stats(
  p_project_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  total_incidents INTEGER,
  recordable_incidents INTEGER,
  first_aid_only INTEGER,
  near_misses INTEGER,
  days_away INTEGER,
  days_restricted INTEGER,
  trir DECIMAL(5,2), -- Total Recordable Incident Rate
  dart DECIMAL(5,2)  -- Days Away Restricted Transfer Rate
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hours_worked DECIMAL;
BEGIN
  -- Get total hours from time entries (placeholder - would need real hours)
  v_hours_worked := 100000; -- Default for calculation

  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_incidents,
    COUNT(*) FILTER (WHERE i.osha_recordable = true)::INTEGER AS recordable_incidents,
    COUNT(*) FILTER (WHERE i.classification = 'first_aid_only')::INTEGER AS first_aid_only,
    COUNT(*) FILTER (WHERE i.classification = 'near_miss')::INTEGER AS near_misses,
    COALESCE(SUM(i.days_away_from_work), 0)::INTEGER AS days_away,
    COALESCE(SUM(i.days_restricted_duty), 0)::INTEGER AS days_restricted,
    CASE WHEN v_hours_worked > 0 THEN
      (COUNT(*) FILTER (WHERE i.osha_recordable = true)::DECIMAL * 200000 / v_hours_worked)
    ELSE 0 END AS trir,
    CASE WHEN v_hours_worked > 0 THEN
      ((COALESCE(SUM(i.days_away_from_work), 0) + COALESCE(SUM(i.days_restricted_duty), 0))::DECIMAL * 200000 / v_hours_worked)
    ELSE 0 END AS dart
  FROM public.incidents i
  WHERE
    i.project_id = p_project_id
    AND (p_start_date IS NULL OR i.incident_date >= p_start_date)
    AND (p_end_date IS NULL OR i.incident_date <= p_end_date);
END;
$$;

-- =============================================================================
-- PART 9: Triggers
-- =============================================================================

CREATE TRIGGER incidents_updated_at
  BEFORE UPDATE ON public.incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER comp_person_updated_at
  BEFORE UPDATE ON public.competent_person_designations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER talks_updated_at
  BEFORE UPDATE ON public.toolbox_talks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER observations_updated_at
  BEFORE UPDATE ON public.safety_observations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PART 10: Views
-- =============================================================================

-- Active competent persons by type
CREATE OR REPLACE VIEW public.v_active_competent_persons AS
SELECT
  cpd.id,
  cpd.organization_id,
  cpd.competent_person_type,
  cpd.effective_date,
  cpd.expiration_date,
  CASE
    WHEN cpd.employee_id IS NOT NULL THEN e.first_name || ' ' || e.last_name
    ELSE sw.first_name || ' ' || sw.last_name
  END AS person_name,
  CASE
    WHEN cpd.employee_id IS NOT NULL THEN 'employee'
    ELSE 'subcontractor'
  END AS worker_type,
  cpd.employee_id,
  cpd.subcontractor_worker_id,
  s.company_name AS subcontractor_name
FROM public.competent_person_designations cpd
LEFT JOIN public.employees e ON e.id = cpd.employee_id
LEFT JOIN public.subcontractor_workers sw ON sw.id = cpd.subcontractor_worker_id
LEFT JOIN public.subcontractors s ON s.id = sw.subcontractor_id
WHERE
  cpd.is_active = true
  AND cpd.revoked_at IS NULL
  AND (cpd.expiration_date IS NULL OR cpd.expiration_date > CURRENT_DATE);

-- =============================================================================
-- PART 11: Comments
-- =============================================================================

COMMENT ON TABLE public.incidents IS 'OSHA-ready incident tracking with auto-generated incident numbers';
COMMENT ON TABLE public.competent_person_designations IS 'Competent person registry per OSHA requirements';
COMMENT ON TABLE public.safety_orientations IS 'New hire and site-specific orientation tracking';
COMMENT ON TABLE public.toolbox_talks IS 'Daily safety meetings with attendance tracking';
COMMENT ON TABLE public.safety_observations IS 'Behavioral safety observations - positive and at-risk';

COMMENT ON COLUMN public.incidents.incident_number IS 'Auto-generated: INC-YYYY-NNNNN format';
COMMENT ON COLUMN public.incidents.trir IS 'Total Recordable Incident Rate: (Recordables * 200000) / Hours Worked';
