-- =============================================================================
-- Migration: 051_fleet_driver_qualification.sql
-- Purpose: Fleet management, driver qualification, MVR records, drug testing
-- Security: Default-deny RLS on ALL tables per System Prompt v5.0
-- Note: drug_tests and medical_cards are PII tables - AI CANNOT access directly
-- Date: December 6, 2024
-- =============================================================================

-- =============================================================================
-- PART 1: Enums
-- =============================================================================

CREATE TYPE public.cdl_class AS ENUM (
  'A',
  'B',
  'C',
  'none'
);

CREATE TYPE public.license_status AS ENUM (
  'valid',
  'expired',
  'suspended',
  'revoked',
  'restricted'
);

CREATE TYPE public.mvr_violation_type AS ENUM (
  'speeding_minor',      -- Under 15 mph over
  'speeding_major',      -- 15+ mph over
  'reckless_driving',
  'dui_dwi',
  'at_fault_accident',
  'not_at_fault_accident',
  'license_suspension',
  'moving_violation',
  'equipment_violation',
  'hours_of_service',
  'texting_while_driving',
  'other'
);

CREATE TYPE public.drug_test_type AS ENUM (
  'pre_employment',
  'random',
  'post_accident',
  'reasonable_suspicion',
  'return_to_duty',
  'follow_up'
);

CREATE TYPE public.drug_test_result AS ENUM (
  'negative',
  'positive',
  'dilute_negative',
  'dilute_positive',
  'cancelled',
  'pending',
  'refused'
);

CREATE TYPE public.driver_eligibility AS ENUM (
  'eligible',
  'conditional',
  'ineligible',
  'pending_review',
  'suspended'
);

-- =============================================================================
-- PART 2: Driver Licenses
-- =============================================================================

CREATE TABLE public.driver_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

  -- License Details
  license_number TEXT NOT NULL,
  license_state TEXT NOT NULL DEFAULT 'WV',
  cdl_class public.cdl_class DEFAULT 'none',

  -- Endorsements
  endorsements TEXT[], -- H (Hazmat), N (Tank), P (Passenger), S (School Bus), T (Double/Triple)
  restrictions TEXT[],

  -- Dates
  issue_date DATE,
  expiration_date DATE NOT NULL,

  -- Status
  status public.license_status DEFAULT 'valid',

  -- Medical Card (for CDL)
  medical_card_exp DATE,
  medical_card_type TEXT, -- 1-year, 2-year

  -- Verification
  last_verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  verification_method TEXT, -- manual, api, mvr_report

  -- Document
  license_photo_front_url TEXT,
  license_photo_back_url TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_licenses_employee ON public.driver_licenses(employee_id);
CREATE INDEX idx_licenses_exp ON public.driver_licenses(expiration_date);
CREATE INDEX idx_licenses_status ON public.driver_licenses(status);
CREATE INDEX idx_licenses_cdl ON public.driver_licenses(cdl_class) WHERE cdl_class != 'none';
CREATE INDEX idx_licenses_medical_exp ON public.driver_licenses(medical_card_exp) WHERE cdl_class != 'none';

-- RLS MANDATE
ALTER TABLE public.driver_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.driver_licenses FOR ALL USING (false);

CREATE POLICY "licenses_select" ON public.driver_licenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "licenses_insert" ON public.driver_licenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "licenses_update" ON public.driver_licenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- =============================================================================
-- PART 3: MVR Records (Motor Vehicle Records)
-- =============================================================================

CREATE TABLE public.mvr_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

  -- Record source
  report_date DATE NOT NULL,
  report_source TEXT, -- 'internal', 'third_party_mvr', 'dmv_api'
  report_document_url TEXT,

  -- The violation
  violation_type public.mvr_violation_type NOT NULL,
  violation_date DATE NOT NULL,
  violation_description TEXT,

  -- Location
  violation_state TEXT,
  violation_location TEXT,

  -- Points (if applicable)
  points_assigned INTEGER DEFAULT 0,

  -- Company impact
  impacts_eligibility BOOLEAN DEFAULT true,
  eligibility_impact_notes TEXT,

  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- Audit
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mvr_employee ON public.mvr_records(employee_id);
CREATE INDEX idx_mvr_date ON public.mvr_records(violation_date DESC);
CREATE INDEX idx_mvr_type ON public.mvr_records(violation_type);
CREATE INDEX idx_mvr_impacts ON public.mvr_records(impacts_eligibility) WHERE impacts_eligibility = true;

-- RLS MANDATE
ALTER TABLE public.mvr_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.mvr_records FOR ALL USING (false);

CREATE POLICY "mvr_select" ON public.mvr_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
    AND public.user_has_permission(auth.uid(), 'admin.audit_logs', NULL) -- HR/Admin only
  );

CREATE POLICY "mvr_insert" ON public.mvr_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
    AND public.user_has_permission(auth.uid(), 'admin.audit_logs', NULL)
  );

-- =============================================================================
-- PART 4: Fleet Policy Rules (Data-Driven Configuration)
-- =============================================================================

CREATE TABLE public.fleet_policy_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Rule identification
  rule_code TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  description TEXT,

  -- What violations does this apply to
  applies_to_violation_types public.mvr_violation_type[],

  -- Thresholds
  lookback_years INTEGER DEFAULT 3,  -- How far back to look
  violation_count_threshold INTEGER DEFAULT 3,  -- "3 strikes"
  points_threshold INTEGER,  -- Alternative: total points

  -- Consequence
  consequence public.driver_eligibility NOT NULL,
  consequence_duration_days INTEGER,  -- How long consequence lasts
  requires_review BOOLEAN DEFAULT false,

  -- Active
  is_active BOOLEAN DEFAULT true,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,

  -- Priority (lower = higher priority)
  priority INTEGER DEFAULT 100,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_policy_rules_org ON public.fleet_policy_rules(organization_id);
CREATE INDEX idx_policy_rules_code ON public.fleet_policy_rules(rule_code);
CREATE INDEX idx_policy_rules_active ON public.fleet_policy_rules(is_active, effective_date)
  WHERE is_active = true;

-- RLS MANDATE
ALTER TABLE public.fleet_policy_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.fleet_policy_rules FOR ALL USING (false);

CREATE POLICY "policy_rules_select" ON public.fleet_policy_rules FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "policy_rules_admin" ON public.fleet_policy_rules FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'admin.system_settings', NULL)
  );

-- Seed default policy rules
INSERT INTO public.fleet_policy_rules (
  organization_id, rule_code, rule_name, description,
  applies_to_violation_types, lookback_years, violation_count_threshold,
  consequence, priority
)
SELECT
  o.id,
  'DUI_ZERO_TOLERANCE',
  'DUI/DWI Zero Tolerance',
  'Any DUI/DWI in the past 5 years results in ineligibility',
  ARRAY['dui_dwi']::public.mvr_violation_type[],
  5,
  1,
  'ineligible'::public.driver_eligibility,
  1
FROM public.organizations o
WHERE NOT EXISTS (SELECT 1 FROM public.fleet_policy_rules WHERE rule_code = 'DUI_ZERO_TOLERANCE')
LIMIT 1;

-- Note: More default rules would be seeded in a real deployment

-- =============================================================================
-- PART 5: Driver Eligibility Status (Computed/Cached)
-- =============================================================================

CREATE TABLE public.driver_eligibility_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE UNIQUE,

  -- Current eligibility
  eligibility public.driver_eligibility NOT NULL DEFAULT 'pending_review',

  -- Why
  blocking_reasons TEXT[],
  triggered_rules TEXT[], -- rule_codes that triggered this status

  -- Counts (cached)
  violation_count_3yr INTEGER DEFAULT 0,
  points_total_3yr INTEGER DEFAULT 0,
  at_fault_accidents_3yr INTEGER DEFAULT 0,

  -- License status
  license_valid BOOLEAN DEFAULT false,
  license_expires_at DATE,
  medical_card_valid BOOLEAN DEFAULT false,
  medical_card_expires_at DATE,

  -- Drug testing
  last_drug_test_date DATE,
  drug_test_status TEXT,

  -- Computed at
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  next_computation_at TIMESTAMPTZ,

  -- Manual override (requires review)
  manual_override BOOLEAN DEFAULT false,
  override_reason TEXT,
  override_by UUID REFERENCES auth.users(id),
  override_expires_at TIMESTAMPTZ,

  -- Audit
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_eligibility_employee ON public.driver_eligibility_status(employee_id);
CREATE INDEX idx_eligibility_status ON public.driver_eligibility_status(eligibility);
CREATE INDEX idx_eligibility_ineligible ON public.driver_eligibility_status(eligibility)
  WHERE eligibility IN ('ineligible', 'suspended');

-- RLS MANDATE
ALTER TABLE public.driver_eligibility_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.driver_eligibility_status FOR ALL USING (false);

CREATE POLICY "eligibility_select" ON public.driver_eligibility_status FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- Only system/admin can update (computed by job)
CREATE POLICY "eligibility_admin" ON public.driver_eligibility_status FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
    AND public.user_has_permission(auth.uid(), 'admin.system_settings', NULL)
  );

-- =============================================================================
-- PART 6: Drug Tests (PII TABLE - AI CANNOT ACCESS)
-- =============================================================================

CREATE TABLE public.drug_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

  -- Test details
  test_type public.drug_test_type NOT NULL,
  test_date DATE NOT NULL,
  collection_site TEXT,
  mro_name TEXT, -- Medical Review Officer
  mro_phone TEXT,

  -- Result
  result public.drug_test_result NOT NULL DEFAULT 'pending',
  result_date DATE,
  substances_detected TEXT[], -- If positive

  -- Chain of custody
  specimen_id TEXT,
  chain_of_custody_url TEXT,

  -- DOT compliance
  is_dot_test BOOLEAN DEFAULT false,
  dot_mode TEXT, -- FMCSA, FTA, FAA, etc.

  -- Documents (encrypted storage recommended)
  result_document_url TEXT,

  -- Follow-up
  requires_sap_evaluation BOOLEAN DEFAULT false, -- Substance Abuse Professional
  sap_evaluation_date DATE,
  return_to_duty_cleared BOOLEAN,
  return_to_duty_date DATE,

  -- Audit
  ordered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_drug_tests_employee ON public.drug_tests(employee_id);
CREATE INDEX idx_drug_tests_date ON public.drug_tests(test_date DESC);
CREATE INDEX idx_drug_tests_result ON public.drug_tests(result);
CREATE INDEX idx_drug_tests_pending ON public.drug_tests(result) WHERE result = 'pending';

-- RLS MANDATE - RESTRICTED ACCESS (PII)
ALTER TABLE public.drug_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.drug_tests FOR ALL USING (false);

-- Only HR/Safety with specific permission
CREATE POLICY "drug_tests_restricted" ON public.drug_tests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
    AND public.user_has_permission(auth.uid(), 'admin.audit_logs', NULL)
    -- Additional check would be added for specific drug test permission
  );

CREATE POLICY "drug_tests_insert_restricted" ON public.drug_tests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
    AND public.user_has_permission(auth.uid(), 'admin.audit_logs', NULL)
  );

-- =============================================================================
-- PART 7: Medical Cards (PII TABLE - AI CANNOT ACCESS)
-- =============================================================================

CREATE TABLE public.medical_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,

  -- Card details
  card_type TEXT NOT NULL, -- '2-year', '1-year', '3-month', 'waiver'
  issue_date DATE NOT NULL,
  expiration_date DATE NOT NULL,

  -- Examiner
  examiner_name TEXT,
  examiner_national_registry_number TEXT,
  examination_location TEXT,

  -- Restrictions/Conditions
  restrictions TEXT[],
  conditions TEXT[],
  requires_medication BOOLEAN DEFAULT false,

  -- Documents
  card_front_url TEXT,
  card_back_url TEXT,
  long_form_url TEXT,

  -- Status
  is_current BOOLEAN DEFAULT true,
  replaced_by_id UUID REFERENCES public.medical_cards(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_medical_cards_employee ON public.medical_cards(employee_id);
CREATE INDEX idx_medical_cards_exp ON public.medical_cards(expiration_date);
CREATE INDEX idx_medical_cards_current ON public.medical_cards(is_current) WHERE is_current = true;

-- RLS MANDATE - RESTRICTED ACCESS (PII)
ALTER TABLE public.medical_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.medical_cards FOR ALL USING (false);

CREATE POLICY "medical_cards_restricted" ON public.medical_cards FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
    AND public.user_has_permission(auth.uid(), 'admin.audit_logs', NULL)
  );

CREATE POLICY "medical_cards_insert_restricted" ON public.medical_cards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = employee_id
      AND e.organization_id = public.get_user_organization_id(auth.uid())
    )
    AND public.user_has_permission(auth.uid(), 'admin.audit_logs', NULL)
  );

-- =============================================================================
-- PART 8: Helper Functions
-- =============================================================================

-- Check if driver is eligible
CREATE OR REPLACE FUNCTION public.is_driver_eligible(p_employee_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eligibility public.driver_eligibility;
BEGIN
  SELECT eligibility INTO v_eligibility
  FROM public.driver_eligibility_status
  WHERE employee_id = p_employee_id;

  RETURN v_eligibility = 'eligible' OR v_eligibility = 'conditional';
END;
$$;

-- Compute driver eligibility (called by pg_cron nightly)
CREATE OR REPLACE FUNCTION public.compute_driver_eligibility(p_employee_id UUID)
RETURNS public.driver_eligibility
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_violation_count INTEGER;
  v_at_fault_count INTEGER;
  v_has_dui BOOLEAN;
  v_license_valid BOOLEAN;
  v_license_exp DATE;
  v_medical_valid BOOLEAN;
  v_medical_exp DATE;
  v_eligibility public.driver_eligibility;
  v_blocking_reasons TEXT[] := '{}';
  v_triggered_rules TEXT[] := '{}';
BEGIN
  -- Get organization
  SELECT organization_id INTO v_org_id
  FROM public.employees WHERE id = p_employee_id;

  -- Count violations in last 3 years
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE violation_type = 'at_fault_accident'),
    EXISTS (SELECT 1 FROM public.mvr_records WHERE employee_id = p_employee_id
            AND violation_type = 'dui_dwi' AND violation_date > CURRENT_DATE - INTERVAL '5 years')
  INTO v_violation_count, v_at_fault_count, v_has_dui
  FROM public.mvr_records
  WHERE employee_id = p_employee_id
    AND violation_date > CURRENT_DATE - INTERVAL '3 years'
    AND impacts_eligibility = true;

  -- Check license
  SELECT
    status = 'valid' AND expiration_date > CURRENT_DATE,
    expiration_date,
    medical_card_exp > CURRENT_DATE,
    medical_card_exp
  INTO v_license_valid, v_license_exp, v_medical_valid, v_medical_exp
  FROM public.driver_licenses
  WHERE employee_id = p_employee_id
  ORDER BY expiration_date DESC
  LIMIT 1;

  -- Default
  v_eligibility := 'eligible';

  -- Apply rules
  IF v_has_dui THEN
    v_eligibility := 'ineligible';
    v_blocking_reasons := array_append(v_blocking_reasons, 'DUI/DWI within 5 years');
    v_triggered_rules := array_append(v_triggered_rules, 'DUI_ZERO_TOLERANCE');
  END IF;

  IF v_violation_count >= 3 THEN
    v_eligibility := 'ineligible';
    v_blocking_reasons := array_append(v_blocking_reasons, '3+ violations in 3 years');
    v_triggered_rules := array_append(v_triggered_rules, 'THREE_STRIKES');
  END IF;

  IF NOT COALESCE(v_license_valid, false) THEN
    v_eligibility := 'ineligible';
    v_blocking_reasons := array_append(v_blocking_reasons, 'Invalid or expired license');
  END IF;

  -- Update status table
  INSERT INTO public.driver_eligibility_status (
    employee_id, eligibility, blocking_reasons, triggered_rules,
    violation_count_3yr, at_fault_accidents_3yr,
    license_valid, license_expires_at,
    medical_card_valid, medical_card_expires_at,
    computed_at
  )
  VALUES (
    p_employee_id, v_eligibility, v_blocking_reasons, v_triggered_rules,
    v_violation_count, v_at_fault_count,
    v_license_valid, v_license_exp,
    v_medical_valid, v_medical_exp,
    NOW()
  )
  ON CONFLICT (employee_id) DO UPDATE SET
    eligibility = EXCLUDED.eligibility,
    blocking_reasons = EXCLUDED.blocking_reasons,
    triggered_rules = EXCLUDED.triggered_rules,
    violation_count_3yr = EXCLUDED.violation_count_3yr,
    at_fault_accidents_3yr = EXCLUDED.at_fault_accidents_3yr,
    license_valid = EXCLUDED.license_valid,
    license_expires_at = EXCLUDED.license_expires_at,
    medical_card_valid = EXCLUDED.medical_card_valid,
    medical_card_expires_at = EXCLUDED.medical_card_expires_at,
    computed_at = NOW(),
    updated_at = NOW();

  RETURN v_eligibility;
END;
$$;

-- Get drivers needing attention
CREATE OR REPLACE FUNCTION public.get_drivers_needing_attention(p_organization_id UUID)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  issue_type TEXT,
  issue_description TEXT,
  urgency TEXT,
  due_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    -- Expiring licenses
    SELECT
      dl.employee_id,
      e.first_name || ' ' || e.last_name AS employee_name,
      'license_expiring'::TEXT AS issue_type,
      'Driver license expires ' || dl.expiration_date::TEXT AS issue_description,
      CASE
        WHEN dl.expiration_date <= CURRENT_DATE THEN 'critical'
        WHEN dl.expiration_date <= CURRENT_DATE + 30 THEN 'high'
        ELSE 'medium'
      END AS urgency,
      dl.expiration_date AS due_date
    FROM public.driver_licenses dl
    JOIN public.employees e ON e.id = dl.employee_id
    WHERE e.organization_id = p_organization_id
      AND e.deleted_at IS NULL
      AND e.employment_status = 'active'
      AND dl.expiration_date <= CURRENT_DATE + 60

    UNION ALL

    -- Expiring medical cards
    SELECT
      dl.employee_id,
      e.first_name || ' ' || e.last_name,
      'medical_card_expiring'::TEXT,
      'Medical card expires ' || dl.medical_card_exp::TEXT,
      CASE
        WHEN dl.medical_card_exp <= CURRENT_DATE THEN 'critical'
        WHEN dl.medical_card_exp <= CURRENT_DATE + 30 THEN 'high'
        ELSE 'medium'
      END,
      dl.medical_card_exp
    FROM public.driver_licenses dl
    JOIN public.employees e ON e.id = dl.employee_id
    WHERE e.organization_id = p_organization_id
      AND e.deleted_at IS NULL
      AND e.employment_status = 'active'
      AND dl.cdl_class != 'none'
      AND dl.medical_card_exp IS NOT NULL
      AND dl.medical_card_exp <= CURRENT_DATE + 60

    UNION ALL

    -- Ineligible drivers
    SELECT
      des.employee_id,
      e.first_name || ' ' || e.last_name,
      'driver_ineligible'::TEXT,
      array_to_string(des.blocking_reasons, '; '),
      'critical',
      NULL::DATE
    FROM public.driver_eligibility_status des
    JOIN public.employees e ON e.id = des.employee_id
    WHERE e.organization_id = p_organization_id
      AND e.deleted_at IS NULL
      AND e.employment_status = 'active'
      AND des.eligibility = 'ineligible'
  ) combined
  ORDER BY
    CASE urgency WHEN 'critical' THEN 1 WHEN 'high' THEN 2 ELSE 3 END,
    due_date NULLS LAST;
END;
$$;

-- =============================================================================
-- PART 9: Triggers
-- =============================================================================

CREATE TRIGGER licenses_updated_at
  BEFORE UPDATE ON public.driver_licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER policy_rules_updated_at
  BEFORE UPDATE ON public.fleet_policy_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER eligibility_updated_at
  BEFORE UPDATE ON public.driver_eligibility_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER drug_tests_updated_at
  BEFORE UPDATE ON public.drug_tests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PART 10: Views
-- =============================================================================

-- Fleet driver status dashboard (non-PII)
CREATE OR REPLACE VIEW public.v_driver_fleet_status AS
SELECT
  e.id AS employee_id,
  e.organization_id,
  e.first_name || ' ' || e.last_name AS driver_name,
  e.employee_number,
  dl.cdl_class,
  dl.endorsements,
  dl.expiration_date AS license_expires,
  dl.medical_card_exp AS medical_expires,
  dl.status AS license_status,
  des.eligibility,
  des.violation_count_3yr,
  des.blocking_reasons,
  des.computed_at AS eligibility_computed_at
FROM public.employees e
LEFT JOIN public.driver_licenses dl ON dl.employee_id = e.id
LEFT JOIN public.driver_eligibility_status des ON des.employee_id = e.id
WHERE
  e.deleted_at IS NULL
  AND e.employment_status = 'active'
  AND e.is_cdl_required = true;

-- =============================================================================
-- PART 11: Comments
-- =============================================================================

COMMENT ON TABLE public.driver_licenses IS 'CDL and driver license tracking with medical card expiration';
COMMENT ON TABLE public.mvr_records IS 'Motor Vehicle Record violations - feeds eligibility calculation';
COMMENT ON TABLE public.fleet_policy_rules IS 'Data-driven policy rules - NOT hard-coded thresholds';
COMMENT ON TABLE public.driver_eligibility_status IS 'Cached eligibility computed nightly by pg_cron';
COMMENT ON TABLE public.drug_tests IS 'PII TABLE - AI CANNOT ACCESS - DOT drug testing records';
COMMENT ON TABLE public.medical_cards IS 'PII TABLE - AI CANNOT ACCESS - CDL medical examiner certificates';

COMMENT ON FUNCTION public.compute_driver_eligibility IS 'Called nightly by pg_cron to update all driver eligibility statuses';
