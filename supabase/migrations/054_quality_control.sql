-- =============================================================================
-- Migration: 054_quality_control.sql
-- Purpose: Quality Control module - inspections, testing, NCRs, punch lists
-- Per CLAUDE.md Roadmap: Migration 008 - Quality Control
-- Date: December 7, 2024
-- =============================================================================

-- =============================================================================
-- PART 1: Enums
-- =============================================================================

CREATE TYPE public.inspection_type AS ENUM (
  'pre_construction',
  'in_progress',
  'milestone',
  'final',
  'special',
  'wvdoh',
  'third_party'
);

CREATE TYPE public.inspection_status AS ENUM (
  'scheduled',
  'in_progress',
  'passed',
  'failed',
  'conditional',
  'cancelled'
);

CREATE TYPE public.test_category AS ENUM (
  'concrete',
  'asphalt',
  'soil',
  'aggregate',
  'steel',
  'weld',
  'coating',
  'compaction',
  'gradation',
  'other'
);

CREATE TYPE public.test_status AS ENUM (
  'pending',
  'in_progress',
  'passed',
  'failed',
  'retest_required',
  'waived'
);

CREATE TYPE public.ncr_severity AS ENUM (
  'minor',
  'major',
  'critical'
);

CREATE TYPE public.ncr_status AS ENUM (
  'open',
  'investigation',
  'corrective_action',
  'verification',
  'closed',
  'void'
);

CREATE TYPE public.punch_item_status AS ENUM (
  'open',
  'in_progress',
  'ready_for_inspection',
  'completed',
  'deferred',
  'not_applicable'
);

CREATE TYPE public.punch_item_priority AS ENUM (
  'critical',
  'high',
  'medium',
  'low'
);

-- =============================================================================
-- PART 2: Test Types (Reference Table)
-- =============================================================================

CREATE TABLE public.test_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Test identification
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category public.test_category NOT NULL,

  -- Specifications
  test_method TEXT, -- ASTM, AASHTO, etc.
  specification_reference TEXT,

  -- Requirements
  min_value DECIMAL(12, 4),
  max_value DECIMAL(12, 4),
  target_value DECIMAL(12, 4),
  unit_of_measure TEXT,

  -- Frequency
  required_frequency TEXT, -- e.g., "1 per 500 CY", "Daily"

  -- WVDOH specific
  wvdoh_form_number TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint
ALTER TABLE public.test_types
  ADD CONSTRAINT unique_test_type_code UNIQUE (organization_id, code);

-- Indexes
CREATE INDEX idx_test_types_org ON public.test_types(organization_id);
CREATE INDEX idx_test_types_category ON public.test_types(category);
CREATE INDEX idx_test_types_active ON public.test_types(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.test_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.test_types FOR ALL USING (false);

CREATE POLICY "test_types_select" ON public.test_types FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "test_types_manage" ON public.test_types FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'quality.create', NULL)
  );

-- =============================================================================
-- PART 3: Inspection Checklists (Templates)
-- =============================================================================

CREATE TABLE public.inspection_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Checklist identification
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,

  -- Type and scope
  inspection_type public.inspection_type NOT NULL,
  work_type TEXT, -- e.g., 'Bridge Deck', 'Paving', 'Earthwork'

  -- WVDOH specific
  wvdoh_form_number TEXT,
  wvdoh_division TEXT,

  -- Version control
  version INTEGER DEFAULT 1,
  effective_date DATE,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_checklists_org ON public.inspection_checklists(organization_id);
CREATE INDEX idx_checklists_type ON public.inspection_checklists(inspection_type);
CREATE INDEX idx_checklists_work_type ON public.inspection_checklists(work_type);
CREATE INDEX idx_checklists_active ON public.inspection_checklists(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE public.inspection_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.inspection_checklists FOR ALL USING (false);

CREATE POLICY "checklists_select" ON public.inspection_checklists FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "checklists_manage" ON public.inspection_checklists FOR ALL
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- =============================================================================
-- PART 4: Checklist Items
-- =============================================================================

CREATE TABLE public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.inspection_checklists(id) ON DELETE CASCADE,

  -- Item details
  item_number INTEGER NOT NULL,
  section TEXT,
  description TEXT NOT NULL,

  -- Requirements
  is_required BOOLEAN DEFAULT true,
  requires_photo BOOLEAN DEFAULT false,
  requires_measurement BOOLEAN DEFAULT false,
  requires_signature BOOLEAN DEFAULT false,

  -- Acceptance criteria
  acceptance_criteria TEXT,
  specification_reference TEXT,

  -- Response type
  response_type TEXT DEFAULT 'pass_fail' CHECK (response_type IN ('pass_fail', 'yes_no', 'numeric', 'text', 'na_allowed')),

  -- For numeric responses
  min_value DECIMAL(12, 4),
  max_value DECIMAL(12, 4),
  unit_of_measure TEXT,

  -- Display order
  sort_order INTEGER,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_checklist_items_checklist ON public.checklist_items(checklist_id);
CREATE INDEX idx_checklist_items_order ON public.checklist_items(checklist_id, sort_order);

-- RLS
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.checklist_items FOR ALL USING (false);

CREATE POLICY "items_select" ON public.checklist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_checklists ic
      WHERE ic.id = checklist_id
      AND ic.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "items_manage" ON public.checklist_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inspection_checklists ic
      WHERE ic.id = checklist_id
      AND ic.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- =============================================================================
-- PART 5: Inspections
-- =============================================================================

CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- Inspection identification
  inspection_number TEXT NOT NULL,

  -- Type and checklist
  inspection_type public.inspection_type NOT NULL,
  checklist_id UUID REFERENCES public.inspection_checklists(id),

  -- Schedule
  scheduled_date DATE,
  scheduled_time TIME,
  actual_date DATE,
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,

  -- Location
  location_description TEXT,
  station_from TEXT,
  station_to TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Work being inspected
  work_description TEXT,
  cost_code TEXT,
  daily_report_id UUID REFERENCES public.daily_reports(id),

  -- Inspector(s)
  lead_inspector_id UUID REFERENCES auth.users(id),
  inspector_name TEXT,
  inspector_company TEXT, -- For third-party inspections

  -- WVDOH presence
  wvdoh_inspector_present BOOLEAN DEFAULT false,
  wvdoh_inspector_name TEXT,

  -- Status and result
  status public.inspection_status DEFAULT 'scheduled',
  overall_result TEXT CHECK (overall_result IN ('pass', 'fail', 'conditional', 'incomplete')),

  -- Scores (if applicable)
  items_passed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  items_na INTEGER DEFAULT 0,
  pass_percentage DECIMAL(5, 2),

  -- Conditions (if conditional pass)
  conditions_for_acceptance TEXT,
  conditions_due_date DATE,

  -- Photos and documents
  photos TEXT[],
  documents TEXT[],

  -- Signatures
  inspector_signature_url TEXT,
  inspector_signed_at TIMESTAMPTZ,
  contractor_rep_name TEXT,
  contractor_signature_url TEXT,
  contractor_signed_at TIMESTAMPTZ,

  -- Notes
  notes TEXT,
  wvdoh_comments TEXT,

  -- Follow-up
  requires_reinspection BOOLEAN DEFAULT false,
  reinspection_id UUID, -- References follow-up inspection

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inspections_org ON public.inspections(organization_id);
CREATE INDEX idx_inspections_project ON public.inspections(project_id);
CREATE INDEX idx_inspections_date ON public.inspections(scheduled_date);
CREATE INDEX idx_inspections_status ON public.inspections(status);
CREATE INDEX idx_inspections_type ON public.inspections(inspection_type);
CREATE INDEX idx_inspections_checklist ON public.inspections(checklist_id);
CREATE INDEX idx_inspections_daily_report ON public.inspections(daily_report_id);

-- RLS
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.inspections FOR ALL USING (false);

CREATE POLICY "inspections_select" ON public.inspections FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "inspections_manage" ON public.inspections FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'quality.create', project_id)
  );

-- =============================================================================
-- PART 6: Inspection Responses (Checklist Item Answers)
-- =============================================================================

CREATE TABLE public.inspection_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  checklist_item_id UUID NOT NULL REFERENCES public.checklist_items(id),

  -- Response
  response TEXT CHECK (response IN ('pass', 'fail', 'yes', 'no', 'na', 'numeric', 'text')),
  numeric_value DECIMAL(12, 4),
  text_value TEXT,

  -- Compliance
  is_compliant BOOLEAN,

  -- Evidence
  photo_urls TEXT[],

  -- Notes
  notes TEXT,
  deficiency_description TEXT,

  -- Audit
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  responded_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_responses_inspection ON public.inspection_responses(inspection_id);
CREATE INDEX idx_responses_item ON public.inspection_responses(checklist_item_id);
CREATE INDEX idx_responses_compliant ON public.inspection_responses(is_compliant) WHERE is_compliant = false;

-- RLS
ALTER TABLE public.inspection_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.inspection_responses FOR ALL USING (false);

CREATE POLICY "responses_select" ON public.inspection_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id
      AND i.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "responses_manage" ON public.inspection_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.inspections i
      WHERE i.id = inspection_id
      AND i.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- =============================================================================
-- PART 7: Test Results
-- =============================================================================

CREATE TABLE public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- Test identification
  test_number TEXT NOT NULL,
  test_type_id UUID REFERENCES public.test_types(id),

  -- Sample info
  sample_id TEXT,
  sample_date DATE NOT NULL,
  sample_time TIME,
  sample_location TEXT,
  station TEXT,

  -- Material
  material_description TEXT,
  material_source TEXT, -- Supplier/plant
  material_ticket_id UUID REFERENCES public.material_tickets(id),

  -- For concrete
  batch_number TEXT,
  mix_design TEXT,
  slump DECIMAL(4, 2),
  air_content DECIMAL(4, 2),
  temperature DECIMAL(5, 2),

  -- For asphalt
  oil_content DECIMAL(4, 2),
  mat_temperature DECIMAL(5, 2),

  -- Test details
  test_date DATE,
  test_age_days INTEGER, -- For concrete breaks
  tested_by TEXT,
  lab_name TEXT,

  -- Results
  result_value DECIMAL(12, 4),
  result_unit TEXT,
  specification_min DECIMAL(12, 4),
  specification_max DECIMAL(12, 4),

  -- Status
  status public.test_status DEFAULT 'pending',
  meets_specification BOOLEAN,

  -- Multiple results (e.g., 3, 7, 28 day breaks)
  additional_results JSONB, -- [{age: 3, value: 2500}, {age: 7, value: 3200}]

  -- Documents
  lab_report_url TEXT,
  photos TEXT[],

  -- Notes
  notes TEXT,
  failure_notes TEXT,

  -- Linked inspection or NCR
  inspection_id UUID REFERENCES public.inspections(id),
  ncr_id UUID, -- References non_conformances

  -- WVDOH
  wvdoh_form_submitted BOOLEAN DEFAULT false,
  wvdoh_submission_date DATE,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_test_results_org ON public.test_results(organization_id);
CREATE INDEX idx_test_results_project ON public.test_results(project_id);
CREATE INDEX idx_test_results_type ON public.test_results(test_type_id);
CREATE INDEX idx_test_results_date ON public.test_results(sample_date DESC);
CREATE INDEX idx_test_results_status ON public.test_results(status);
CREATE INDEX idx_test_results_spec ON public.test_results(meets_specification) WHERE meets_specification = false;
CREATE INDEX idx_test_results_ticket ON public.test_results(material_ticket_id);

-- RLS
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.test_results FOR ALL USING (false);

CREATE POLICY "test_results_select" ON public.test_results FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "test_results_manage" ON public.test_results FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'quality.create', project_id)
  );

-- =============================================================================
-- PART 8: Non-Conformance Reports (NCRs)
-- =============================================================================

CREATE TABLE public.non_conformances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- NCR identification
  ncr_number TEXT NOT NULL,

  -- Discovery
  discovered_date DATE NOT NULL,
  discovered_by UUID REFERENCES auth.users(id),
  discoverer_name TEXT,

  -- Source
  source_type TEXT CHECK (source_type IN ('inspection', 'test', 'observation', 'audit', 'customer_complaint', 'other')),
  inspection_id UUID REFERENCES public.inspections(id),
  test_result_id UUID REFERENCES public.test_results(id),

  -- Location
  location_description TEXT,
  station TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Description
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  specification_reference TEXT,

  -- Classification
  severity public.ncr_severity NOT NULL,
  category TEXT, -- Workmanship, Material, Design, etc.

  -- Responsible party
  responsible_party TEXT, -- Triton, Subcontractor name, Supplier
  subcontractor_id UUID REFERENCES public.subcontractors(id),

  -- Cost impact
  estimated_cost DECIMAL(12, 2),
  actual_cost DECIMAL(12, 2),

  -- Status and workflow
  status public.ncr_status DEFAULT 'open',

  -- Investigation
  root_cause TEXT,
  investigation_notes TEXT,
  investigation_completed_at TIMESTAMPTZ,
  investigated_by UUID REFERENCES auth.users(id),

  -- Corrective action
  corrective_action TEXT,
  corrective_action_due_date DATE,
  corrective_action_completed_at TIMESTAMPTZ,
  corrective_action_by UUID REFERENCES auth.users(id),

  -- Verification
  verification_method TEXT,
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Closure
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),
  closure_notes TEXT,

  -- Preventive action
  preventive_action TEXT,
  lessons_learned TEXT,

  -- Photos and documents
  photos TEXT[],
  documents TEXT[],

  -- WVDOH notification
  wvdoh_notified BOOLEAN DEFAULT false,
  wvdoh_notification_date DATE,
  wvdoh_response TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint
ALTER TABLE public.non_conformances
  ADD CONSTRAINT unique_ncr_number UNIQUE (organization_id, ncr_number);

-- Indexes
CREATE INDEX idx_ncr_org ON public.non_conformances(organization_id);
CREATE INDEX idx_ncr_project ON public.non_conformances(project_id);
CREATE INDEX idx_ncr_date ON public.non_conformances(discovered_date DESC);
CREATE INDEX idx_ncr_status ON public.non_conformances(status);
CREATE INDEX idx_ncr_severity ON public.non_conformances(severity);
CREATE INDEX idx_ncr_open ON public.non_conformances(status) WHERE status NOT IN ('closed', 'void');
CREATE INDEX idx_ncr_inspection ON public.non_conformances(inspection_id);
CREATE INDEX idx_ncr_test ON public.non_conformances(test_result_id);

-- RLS
ALTER TABLE public.non_conformances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.non_conformances FOR ALL USING (false);

CREATE POLICY "ncr_select" ON public.non_conformances FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "ncr_manage" ON public.non_conformances FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'quality.create', project_id)
  );

-- =============================================================================
-- PART 9: Punch Lists
-- =============================================================================

CREATE TABLE public.punch_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- List identification
  name TEXT NOT NULL,
  description TEXT,

  -- Type
  list_type TEXT DEFAULT 'substantial_completion' CHECK (list_type IN ('substantial_completion', 'final', 'warranty', 'owner_requested', 'other')),

  -- Dates
  walkthrough_date DATE,
  due_date DATE,

  -- Participants
  owner_rep_name TEXT,
  contractor_rep_id UUID REFERENCES auth.users(id),

  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'pending_verification', 'closed')),

  -- Counts (cached)
  total_items INTEGER DEFAULT 0,
  completed_items INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5, 2) DEFAULT 0,

  -- Closure
  closed_at TIMESTAMPTZ,
  closed_by UUID REFERENCES auth.users(id),

  -- Documents
  walkthrough_notes TEXT,
  final_sign_off_url TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_punch_lists_org ON public.punch_lists(organization_id);
CREATE INDEX idx_punch_lists_project ON public.punch_lists(project_id);
CREATE INDEX idx_punch_lists_status ON public.punch_lists(status);
CREATE INDEX idx_punch_lists_due ON public.punch_lists(due_date);

-- RLS
ALTER TABLE public.punch_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.punch_lists FOR ALL USING (false);

CREATE POLICY "punch_lists_select" ON public.punch_lists FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "punch_lists_manage" ON public.punch_lists FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'quality.create', project_id)
  );

-- =============================================================================
-- PART 10: Punch List Items
-- =============================================================================

CREATE TABLE public.punch_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punch_list_id UUID NOT NULL REFERENCES public.punch_lists(id) ON DELETE CASCADE,

  -- Item identification
  item_number INTEGER NOT NULL,

  -- Location
  location TEXT NOT NULL,
  area TEXT,
  room TEXT,
  grid_reference TEXT,

  -- Description
  description TEXT NOT NULL,
  specification_reference TEXT,

  -- Classification
  trade TEXT, -- Electrical, Mechanical, Civil, etc.
  priority public.punch_item_priority DEFAULT 'medium',

  -- Responsibility
  responsible_party TEXT,
  subcontractor_id UUID REFERENCES public.subcontractors(id),
  assigned_to UUID REFERENCES auth.users(id),

  -- Status
  status public.punch_item_status DEFAULT 'open',

  -- Dates
  due_date DATE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),

  -- Verification
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Photos
  before_photos TEXT[],
  after_photos TEXT[],

  -- Notes
  notes TEXT,
  resolution_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_punch_items_list ON public.punch_list_items(punch_list_id);
CREATE INDEX idx_punch_items_status ON public.punch_list_items(status);
CREATE INDEX idx_punch_items_priority ON public.punch_list_items(priority);
CREATE INDEX idx_punch_items_assigned ON public.punch_list_items(assigned_to);
CREATE INDEX idx_punch_items_due ON public.punch_list_items(due_date);
CREATE INDEX idx_punch_items_open ON public.punch_list_items(status) WHERE status NOT IN ('completed', 'not_applicable');

-- RLS
ALTER TABLE public.punch_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.punch_list_items FOR ALL USING (false);

CREATE POLICY "punch_items_select" ON public.punch_list_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.punch_lists pl
      WHERE pl.id = punch_list_id
      AND pl.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "punch_items_manage" ON public.punch_list_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.punch_lists pl
      WHERE pl.id = punch_list_id
      AND pl.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- =============================================================================
-- PART 11: Hold Points (ITP - Inspection Test Plan)
-- =============================================================================

CREATE TABLE public.hold_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- Hold point identification
  hold_point_number TEXT NOT NULL,

  -- Work activity
  activity_description TEXT NOT NULL,
  specification_section TEXT,
  work_item TEXT,
  cost_code TEXT,

  -- Type
  hold_type TEXT DEFAULT 'hold' CHECK (hold_type IN ('hold', 'witness', 'monitor', 'review')),

  -- Requirements
  required_documentation TEXT[],
  required_tests TEXT[],
  required_inspections TEXT[],

  -- Notification
  advance_notice_days INTEGER DEFAULT 2,
  notify_wvdoh BOOLEAN DEFAULT false,
  notify_owner BOOLEAN DEFAULT false,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'ready', 'released', 'bypassed')),

  -- Release
  requested_date DATE,
  requested_by UUID REFERENCES auth.users(id),

  released_at TIMESTAMPTZ,
  released_by UUID REFERENCES auth.users(id),
  release_notes TEXT,

  -- If bypassed
  bypass_reason TEXT,
  bypass_approved_by UUID REFERENCES auth.users(id),

  -- Related records
  inspection_id UUID REFERENCES public.inspections(id),

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_hold_points_org ON public.hold_points(organization_id);
CREATE INDEX idx_hold_points_project ON public.hold_points(project_id);
CREATE INDEX idx_hold_points_status ON public.hold_points(status);
CREATE INDEX idx_hold_points_pending ON public.hold_points(status) WHERE status IN ('pending', 'notified', 'ready');

-- RLS
ALTER TABLE public.hold_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.hold_points FOR ALL USING (false);

CREATE POLICY "hold_points_select" ON public.hold_points FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "hold_points_manage" ON public.hold_points FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'quality.create', project_id)
  );

-- =============================================================================
-- PART 12: Helper Functions
-- =============================================================================

-- Generate inspection number
CREATE OR REPLACE FUNCTION public.generate_inspection_number(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_number TEXT;
  v_count INTEGER;
BEGIN
  SELECT project_number INTO v_project_number
  FROM public.projects WHERE id = p_project_id;

  SELECT COUNT(*) + 1 INTO v_count
  FROM public.inspections WHERE project_id = p_project_id;

  RETURN COALESCE(v_project_number, 'INSP') || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(v_count::TEXT, 3, '0');
END;
$$;

-- Generate NCR number
CREATE OR REPLACE FUNCTION public.generate_ncr_number(p_project_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_project_number TEXT;
  v_count INTEGER;
BEGIN
  SELECT project_number INTO v_project_number
  FROM public.projects WHERE id = p_project_id;

  SELECT COUNT(*) + 1 INTO v_count
  FROM public.non_conformances WHERE project_id = p_project_id;

  RETURN 'NCR-' || COALESCE(v_project_number, '') || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

-- Update punch list totals
CREATE OR REPLACE FUNCTION public.update_punch_list_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.punch_lists
  SET
    total_items = (SELECT COUNT(*) FROM public.punch_list_items WHERE punch_list_id = COALESCE(NEW.punch_list_id, OLD.punch_list_id)),
    completed_items = (SELECT COUNT(*) FROM public.punch_list_items WHERE punch_list_id = COALESCE(NEW.punch_list_id, OLD.punch_list_id) AND status IN ('completed', 'not_applicable')),
    completion_percentage = (
      SELECT CASE WHEN COUNT(*) > 0 THEN
        (COUNT(*) FILTER (WHERE status IN ('completed', 'not_applicable'))::DECIMAL / COUNT(*)::DECIMAL * 100)
      ELSE 0 END
      FROM public.punch_list_items WHERE punch_list_id = COALESCE(NEW.punch_list_id, OLD.punch_list_id)
    )
  WHERE id = COALESCE(NEW.punch_list_id, OLD.punch_list_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER punch_items_update_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.punch_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_punch_list_totals();

-- Update inspection scores
CREATE OR REPLACE FUNCTION public.update_inspection_scores()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.inspections
  SET
    items_passed = (SELECT COUNT(*) FROM public.inspection_responses WHERE inspection_id = COALESCE(NEW.inspection_id, OLD.inspection_id) AND is_compliant = true),
    items_failed = (SELECT COUNT(*) FROM public.inspection_responses WHERE inspection_id = COALESCE(NEW.inspection_id, OLD.inspection_id) AND is_compliant = false),
    items_na = (SELECT COUNT(*) FROM public.inspection_responses WHERE inspection_id = COALESCE(NEW.inspection_id, OLD.inspection_id) AND response = 'na'),
    pass_percentage = (
      SELECT CASE WHEN COUNT(*) FILTER (WHERE response != 'na') > 0 THEN
        (COUNT(*) FILTER (WHERE is_compliant = true)::DECIMAL / COUNT(*) FILTER (WHERE response != 'na')::DECIMAL * 100)
      ELSE 0 END
      FROM public.inspection_responses WHERE inspection_id = COALESCE(NEW.inspection_id, OLD.inspection_id)
    )
  WHERE id = COALESCE(NEW.inspection_id, OLD.inspection_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER responses_update_scores
  AFTER INSERT OR UPDATE OR DELETE ON public.inspection_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_inspection_scores();

-- =============================================================================
-- PART 13: Triggers
-- =============================================================================

CREATE TRIGGER test_types_updated_at
  BEFORE UPDATE ON public.test_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER checklists_updated_at
  BEFORE UPDATE ON public.inspection_checklists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER inspections_updated_at
  BEFORE UPDATE ON public.inspections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER test_results_updated_at
  BEFORE UPDATE ON public.test_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER ncr_updated_at
  BEFORE UPDATE ON public.non_conformances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER punch_lists_updated_at
  BEFORE UPDATE ON public.punch_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER punch_items_updated_at
  BEFORE UPDATE ON public.punch_list_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER hold_points_updated_at
  BEFORE UPDATE ON public.hold_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PART 14: Views
-- =============================================================================

-- Open NCRs view
CREATE OR REPLACE VIEW public.v_open_ncrs AS
SELECT
  nc.id,
  nc.ncr_number,
  nc.title,
  nc.severity,
  nc.status,
  nc.discovered_date,
  nc.corrective_action_due_date,
  p.name AS project_name,
  nc.project_id,
  nc.organization_id,
  CASE
    WHEN nc.corrective_action_due_date < CURRENT_DATE AND nc.status NOT IN ('closed', 'void') THEN true
    ELSE false
  END AS is_overdue
FROM public.non_conformances nc
JOIN public.projects p ON p.id = nc.project_id
WHERE nc.status NOT IN ('closed', 'void');

-- Failed test results view
CREATE OR REPLACE VIEW public.v_failed_tests AS
SELECT
  tr.id,
  tr.test_number,
  tt.name AS test_type,
  tr.sample_date,
  tr.result_value,
  tr.result_unit,
  tr.specification_min,
  tr.specification_max,
  p.name AS project_name,
  tr.project_id,
  tr.organization_id
FROM public.test_results tr
LEFT JOIN public.test_types tt ON tt.id = tr.test_type_id
JOIN public.projects p ON p.id = tr.project_id
WHERE tr.meets_specification = false;

-- Punch list summary view
CREATE OR REPLACE VIEW public.v_punch_list_summary AS
SELECT
  pl.id,
  pl.name,
  pl.list_type,
  pl.due_date,
  pl.status,
  pl.total_items,
  pl.completed_items,
  pl.completion_percentage,
  p.name AS project_name,
  pl.project_id,
  pl.organization_id,
  (pl.total_items - pl.completed_items) AS remaining_items
FROM public.punch_lists pl
JOIN public.projects p ON p.id = pl.project_id;

-- =============================================================================
-- PART 15: Comments
-- =============================================================================

COMMENT ON TABLE public.test_types IS 'Reference table for test type definitions with specifications';
COMMENT ON TABLE public.inspection_checklists IS 'Reusable inspection checklist templates';
COMMENT ON TABLE public.inspections IS 'Field inspection records with checklist responses';
COMMENT ON TABLE public.test_results IS 'Lab and field test results with pass/fail tracking';
COMMENT ON TABLE public.non_conformances IS 'Non-conformance reports with corrective action workflow';
COMMENT ON TABLE public.punch_lists IS 'Punch list headers for substantial/final completion';
COMMENT ON TABLE public.punch_list_items IS 'Individual punch list items with status tracking';
COMMENT ON TABLE public.hold_points IS 'ITP hold points requiring release before proceeding';
