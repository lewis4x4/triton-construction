-- ============================================================================
-- Migration 137: Comprehensive Dig Readiness Check
-- ============================================================================
-- PURPOSE: Extend the "Can I Dig?" feature to validate not just WV811 tickets
--          but also personnel certifications and competent person requirements
-- ============================================================================
-- Validates:
--   1. WV811 ticket status (uses existing check_dig_status_v2)
--   2. Employee certifications (OSHA 10/30, Excavation Safety)
--   3. Subcontractor worker compliance
--   4. Competent Person designation for excavation
-- ============================================================================

-- ============================================================================
-- PART 1: Audit Table for Dig Readiness Checks
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dig_readiness_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  location_query TEXT,
  check_date DATE NOT NULL,
  check_time TIME,

  -- Who was checked
  crew_member_ids UUID[],
  subcontractor_worker_ids UUID[],

  -- Overall result
  overall_status TEXT NOT NULL CHECK (overall_status IN ('PASS', 'CONDITIONAL', 'FAIL')),
  can_proceed BOOLEAN NOT NULL DEFAULT false,

  -- WV811 results
  wv811_status TEXT,
  wv811_ticket_id UUID,
  wv811_ticket_number TEXT,
  wv811_message TEXT,

  -- Personnel results
  personnel_status TEXT,
  personnel_issues JSONB DEFAULT '[]'::jsonb,

  -- Competent person results
  has_competent_person BOOLEAN DEFAULT false,
  competent_person_name TEXT,
  competent_person_type TEXT,

  -- Audit
  checked_by UUID DEFAULT auth.uid(),
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_dig_readiness_checks_org ON public.dig_readiness_checks(organization_id);
CREATE INDEX idx_dig_readiness_checks_project ON public.dig_readiness_checks(project_id);
CREATE INDEX idx_dig_readiness_checks_date ON public.dig_readiness_checks(check_date DESC);
CREATE INDEX idx_dig_readiness_checks_status ON public.dig_readiness_checks(overall_status);

-- Enable RLS
ALTER TABLE public.dig_readiness_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "dig_readiness_checks_select" ON public.dig_readiness_checks
  FOR SELECT USING (organization_id = public.get_user_organization_id());

CREATE POLICY "dig_readiness_checks_insert" ON public.dig_readiness_checks
  FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

-- Demo access policy
CREATE POLICY "dig_readiness_checks_demo_read" ON public.dig_readiness_checks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND email LIKE '%@triton.com'
    )
    AND organization_id = 'a0000000-0000-0000-0000-000000000001'::uuid
  );

COMMENT ON TABLE public.dig_readiness_checks IS
  'Audit log of dig readiness checks - tracks both WV811 and personnel validation';

-- ============================================================================
-- PART 2: Helper Function - Check Employee Certification
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_employee_dig_certs(
  p_employee_id UUID,
  p_check_date DATE
)
RETURNS TABLE (
  has_osha BOOLEAN,
  osha_type TEXT,
  osha_expires DATE,
  osha_status TEXT,
  has_excavation_safety BOOLEAN,
  excavation_safety_expires DATE,
  excavation_safety_status TEXT,
  is_competent_person BOOLEAN,
  competent_person_types TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_osha_cert RECORD;
  v_exc_cert RECORD;
  v_has_osha BOOLEAN := false;
  v_osha_type TEXT;
  v_osha_expires DATE;
  v_osha_status TEXT := 'MISSING';
  v_has_exc BOOLEAN := false;
  v_exc_expires DATE;
  v_exc_status TEXT := 'MISSING';
  v_is_competent BOOLEAN := false;
  v_competent_types TEXT[] := '{}';
BEGIN
  -- Check for OSHA 30 first (higher priority), then OSHA 10
  SELECT * INTO v_osha_cert
  FROM public.employee_certifications
  WHERE employee_id = p_employee_id
  AND certification_type IN ('OSHA_30', 'OSHA_10')
  AND status = 'active'
  ORDER BY
    CASE certification_type WHEN 'OSHA_30' THEN 1 ELSE 2 END,
    expiration_date DESC NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    v_has_osha := true;
    v_osha_type := v_osha_cert.certification_type;
    v_osha_expires := v_osha_cert.expiration_date;

    IF v_osha_expires IS NULL THEN
      v_osha_status := 'VALID';
    ELSIF v_osha_expires < p_check_date THEN
      v_osha_status := 'EXPIRED';
      v_has_osha := false;
    ELSIF v_osha_expires < p_check_date + INTERVAL '7 days' THEN
      v_osha_status := 'EXPIRING_SOON';
    ELSE
      v_osha_status := 'VALID';
    END IF;
  END IF;

  -- Check for Excavation Safety certification
  SELECT * INTO v_exc_cert
  FROM public.employee_certifications
  WHERE employee_id = p_employee_id
  AND certification_type = 'EXCAVATION_SAFETY'
  AND status = 'active'
  ORDER BY expiration_date DESC NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    v_has_exc := true;
    v_exc_expires := v_exc_cert.expiration_date;

    IF v_exc_expires IS NULL THEN
      v_exc_status := 'VALID';
    ELSIF v_exc_expires < p_check_date THEN
      v_exc_status := 'EXPIRED';
      v_has_exc := false;
    ELSIF v_exc_expires < p_check_date + INTERVAL '7 days' THEN
      v_exc_status := 'EXPIRING_SOON';
    ELSE
      v_exc_status := 'VALID';
    END IF;
  END IF;

  -- Check if competent person (look for COMPETENT_PERSON cert type)
  SELECT
    COUNT(*) > 0,
    ARRAY_AGG(DISTINCT certification_name)
  INTO v_is_competent, v_competent_types
  FROM public.employee_certifications
  WHERE employee_id = p_employee_id
  AND certification_type = 'COMPETENT_PERSON'
  AND status = 'active'
  AND (expiration_date IS NULL OR expiration_date >= p_check_date);

  RETURN QUERY SELECT
    v_has_osha,
    v_osha_type,
    v_osha_expires,
    v_osha_status,
    v_has_exc,
    v_exc_expires,
    v_exc_status,
    COALESCE(v_is_competent, false),
    COALESCE(v_competent_types, '{}');
END;
$$;

COMMENT ON FUNCTION public.check_employee_dig_certs(UUID, DATE) IS
  'Checks employee certifications required for excavation work';

-- ============================================================================
-- PART 3: Main Comprehensive Dig Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.comprehensive_dig_check(
  p_organization_id UUID,
  p_project_id UUID DEFAULT NULL,
  p_location TEXT DEFAULT NULL,
  p_check_date DATE DEFAULT CURRENT_DATE,
  p_check_time TIME DEFAULT NULL,
  p_crew_member_ids UUID[] DEFAULT '{}',
  p_subcontractor_worker_ids UUID[] DEFAULT '{}'
)
RETURNS TABLE (
  -- Overall result
  overall_status TEXT,
  can_proceed BOOLEAN,

  -- WV811 Section
  wv811_status TEXT,
  wv811_message TEXT,
  ticket_id UUID,
  ticket_number TEXT,
  ticket_expires DATE,
  utility_statuses JSONB,

  -- Personnel Section
  personnel_status TEXT,
  personnel_issues JSONB,

  -- Competent Person Section
  has_competent_person BOOLEAN,
  competent_person_name TEXT,
  competent_person_type TEXT,

  -- Audit
  check_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wv811 RECORD;
  v_overall_status TEXT := 'PASS';
  v_can_proceed BOOLEAN := true;
  v_wv811_status TEXT := 'NO_TICKET';
  v_wv811_message TEXT := 'No location specified for WV811 check';
  v_ticket_id UUID;
  v_ticket_number TEXT;
  v_ticket_expires DATE;
  v_utility_statuses JSONB := '[]'::jsonb;
  v_personnel_status TEXT := 'PASS';
  v_personnel_issues JSONB := '[]'::jsonb;
  v_has_competent BOOLEAN := false;
  v_competent_name TEXT;
  v_competent_type TEXT;
  v_check_id UUID;
  v_crew_member RECORD;
  v_sub_worker RECORD;
  v_cert_check RECORD;
  v_issue JSONB;
  v_employee_id UUID;
  v_blocking_issues INTEGER := 0;
  v_warning_issues INTEGER := 0;
BEGIN
  -- =========================================================================
  -- STEP 1: WV811 Check (if location provided)
  -- =========================================================================
  IF p_location IS NOT NULL AND p_location <> '' THEN
    SELECT * INTO v_wv811
    FROM public.check_dig_status_v2(
      p_organization_id,
      p_location,
      p_check_date,
      p_check_time
    );

    IF FOUND THEN
      v_wv811_status := v_wv811.result;
      v_wv811_message := v_wv811.result_message;
      v_ticket_id := v_wv811.ticket_id;
      v_ticket_number := v_wv811.ticket_number;
      v_utility_statuses := COALESCE(v_wv811.utility_statuses, '[]'::jsonb);

      -- Get ticket expiration date
      IF v_ticket_id IS NOT NULL THEN
        SELECT ticket_expires_at INTO v_ticket_expires
        FROM public.wv811_tickets
        WHERE id = v_ticket_id;
      END IF;

      -- WV811 FAIL is blocking
      IF v_wv811_status = 'FAIL' THEN
        v_overall_status := 'FAIL';
        v_can_proceed := false;
      ELSIF v_wv811_status IN ('WARNING', 'CAUTION') THEN
        IF v_overall_status = 'PASS' THEN
          v_overall_status := 'CONDITIONAL';
        END IF;
      END IF;
    END IF;
  END IF;

  -- =========================================================================
  -- STEP 2: Crew Member Certification Check
  -- =========================================================================
  IF array_length(p_crew_member_ids, 1) > 0 THEN
    FOR v_crew_member IN
      SELECT
        cm.id,
        cm.first_name,
        cm.last_name,
        cm.employee_id,
        cm.trade_classification
      FROM public.crew_members cm
      WHERE cm.id = ANY(p_crew_member_ids)
      AND cm.organization_id = p_organization_id
    LOOP
      -- Get employee_id from crew_member
      v_employee_id := v_crew_member.employee_id;

      IF v_employee_id IS NOT NULL THEN
        -- Check certifications using employee_id
        SELECT * INTO v_cert_check
        FROM public.check_employee_dig_certs(v_employee_id::UUID, p_check_date);

        IF FOUND THEN
          -- Check OSHA status
          IF v_cert_check.osha_status = 'MISSING' THEN
            v_issue := jsonb_build_object(
              'person_type', 'crew_member',
              'person_id', v_crew_member.id,
              'person_name', v_crew_member.first_name || ' ' || v_crew_member.last_name,
              'issue_type', 'MISSING_CERT',
              'cert_type', 'OSHA 10/30',
              'severity', 'BLOCKING',
              'message', 'Missing required OSHA 10 or OSHA 30 certification'
            );
            v_personnel_issues := v_personnel_issues || v_issue;
            v_blocking_issues := v_blocking_issues + 1;
          ELSIF v_cert_check.osha_status = 'EXPIRED' THEN
            v_issue := jsonb_build_object(
              'person_type', 'crew_member',
              'person_id', v_crew_member.id,
              'person_name', v_crew_member.first_name || ' ' || v_crew_member.last_name,
              'issue_type', 'EXPIRED_CERT',
              'cert_type', v_cert_check.osha_type,
              'expires', v_cert_check.osha_expires,
              'severity', 'BLOCKING',
              'message', v_cert_check.osha_type || ' expired on ' || TO_CHAR(v_cert_check.osha_expires, 'Mon DD, YYYY')
            );
            v_personnel_issues := v_personnel_issues || v_issue;
            v_blocking_issues := v_blocking_issues + 1;
          ELSIF v_cert_check.osha_status = 'EXPIRING_SOON' THEN
            v_issue := jsonb_build_object(
              'person_type', 'crew_member',
              'person_id', v_crew_member.id,
              'person_name', v_crew_member.first_name || ' ' || v_crew_member.last_name,
              'issue_type', 'EXPIRING_CERT',
              'cert_type', v_cert_check.osha_type,
              'expires', v_cert_check.osha_expires,
              'severity', 'WARNING',
              'message', v_cert_check.osha_type || ' expires on ' || TO_CHAR(v_cert_check.osha_expires, 'Mon DD, YYYY')
            );
            v_personnel_issues := v_personnel_issues || v_issue;
            v_warning_issues := v_warning_issues + 1;
          END IF;

          -- Check Excavation Safety (only for equipment operators)
          IF v_crew_member.trade_classification LIKE 'heo_%' OR
             v_crew_member.trade_classification LIKE '%operator%' THEN
            IF v_cert_check.excavation_safety_status = 'MISSING' THEN
              v_issue := jsonb_build_object(
                'person_type', 'crew_member',
                'person_id', v_crew_member.id,
                'person_name', v_crew_member.first_name || ' ' || v_crew_member.last_name,
                'issue_type', 'MISSING_CERT',
                'cert_type', 'Excavation Safety',
                'severity', 'BLOCKING',
                'message', 'Equipment operator missing required Excavation Safety certification (29 CFR 1926.651)'
              );
              v_personnel_issues := v_personnel_issues || v_issue;
              v_blocking_issues := v_blocking_issues + 1;
            ELSIF v_cert_check.excavation_safety_status = 'EXPIRED' THEN
              v_issue := jsonb_build_object(
                'person_type', 'crew_member',
                'person_id', v_crew_member.id,
                'person_name', v_crew_member.first_name || ' ' || v_crew_member.last_name,
                'issue_type', 'EXPIRED_CERT',
                'cert_type', 'Excavation Safety',
                'expires', v_cert_check.excavation_safety_expires,
                'severity', 'BLOCKING',
                'message', 'Excavation Safety certification expired on ' || TO_CHAR(v_cert_check.excavation_safety_expires, 'Mon DD, YYYY')
              );
              v_personnel_issues := v_personnel_issues || v_issue;
              v_blocking_issues := v_blocking_issues + 1;
            END IF;
          END IF;

          -- Track competent person
          IF v_cert_check.is_competent_person AND 'Excavation' = ANY(v_cert_check.competent_person_types) THEN
            v_has_competent := true;
            v_competent_name := v_crew_member.first_name || ' ' || v_crew_member.last_name;
            v_competent_type := 'Excavation';
          END IF;
        END IF;
      ELSE
        -- No employee_id linked - can't check certs, add warning
        v_issue := jsonb_build_object(
          'person_type', 'crew_member',
          'person_id', v_crew_member.id,
          'person_name', v_crew_member.first_name || ' ' || v_crew_member.last_name,
          'issue_type', 'NO_EMPLOYEE_LINK',
          'severity', 'WARNING',
          'message', 'Crew member not linked to employee record - unable to verify certifications'
        );
        v_personnel_issues := v_personnel_issues || v_issue;
        v_warning_issues := v_warning_issues + 1;
      END IF;
    END LOOP;
  END IF;

  -- =========================================================================
  -- STEP 3: Subcontractor Worker Check
  -- =========================================================================
  IF array_length(p_subcontractor_worker_ids, 1) > 0 THEN
    FOR v_sub_worker IN
      SELECT
        sw.id,
        sw.first_name,
        sw.last_name,
        sw.has_osha_10,
        sw.osha_10_exp,
        sw.has_osha_30,
        sw.osha_30_exp,
        sw.is_competent_person,
        sw.competent_person_types,
        s.company_name
      FROM public.subcontractor_workers sw
      JOIN public.subcontractors s ON s.id = sw.subcontractor_id
      WHERE sw.id = ANY(p_subcontractor_worker_ids)
      AND s.organization_id = p_organization_id
    LOOP
      -- Check OSHA status for subcontractor worker
      IF NOT COALESCE(v_sub_worker.has_osha_10, false) AND NOT COALESCE(v_sub_worker.has_osha_30, false) THEN
        v_issue := jsonb_build_object(
          'person_type', 'subcontractor_worker',
          'person_id', v_sub_worker.id,
          'person_name', v_sub_worker.first_name || ' ' || v_sub_worker.last_name,
          'company_name', v_sub_worker.company_name,
          'issue_type', 'MISSING_CERT',
          'cert_type', 'OSHA 10/30',
          'severity', 'BLOCKING',
          'message', 'Subcontractor worker missing required OSHA 10 or OSHA 30 certification'
        );
        v_personnel_issues := v_personnel_issues || v_issue;
        v_blocking_issues := v_blocking_issues + 1;
      ELSE
        -- Has at least one OSHA cert - check expiration
        -- Prefer OSHA 30 if available
        IF v_sub_worker.has_osha_30 THEN
          IF v_sub_worker.osha_30_exp IS NOT NULL AND v_sub_worker.osha_30_exp < p_check_date THEN
            v_issue := jsonb_build_object(
              'person_type', 'subcontractor_worker',
              'person_id', v_sub_worker.id,
              'person_name', v_sub_worker.first_name || ' ' || v_sub_worker.last_name,
              'company_name', v_sub_worker.company_name,
              'issue_type', 'EXPIRED_CERT',
              'cert_type', 'OSHA 30',
              'expires', v_sub_worker.osha_30_exp,
              'severity', 'BLOCKING',
              'message', 'OSHA 30 expired on ' || TO_CHAR(v_sub_worker.osha_30_exp, 'Mon DD, YYYY')
            );
            v_personnel_issues := v_personnel_issues || v_issue;
            v_blocking_issues := v_blocking_issues + 1;
          ELSIF v_sub_worker.osha_30_exp IS NOT NULL AND v_sub_worker.osha_30_exp < p_check_date + INTERVAL '7 days' THEN
            v_issue := jsonb_build_object(
              'person_type', 'subcontractor_worker',
              'person_id', v_sub_worker.id,
              'person_name', v_sub_worker.first_name || ' ' || v_sub_worker.last_name,
              'company_name', v_sub_worker.company_name,
              'issue_type', 'EXPIRING_CERT',
              'cert_type', 'OSHA 30',
              'expires', v_sub_worker.osha_30_exp,
              'severity', 'WARNING',
              'message', 'OSHA 30 expires on ' || TO_CHAR(v_sub_worker.osha_30_exp, 'Mon DD, YYYY')
            );
            v_personnel_issues := v_personnel_issues || v_issue;
            v_warning_issues := v_warning_issues + 1;
          END IF;
        ELSIF v_sub_worker.has_osha_10 THEN
          IF v_sub_worker.osha_10_exp IS NOT NULL AND v_sub_worker.osha_10_exp < p_check_date THEN
            v_issue := jsonb_build_object(
              'person_type', 'subcontractor_worker',
              'person_id', v_sub_worker.id,
              'person_name', v_sub_worker.first_name || ' ' || v_sub_worker.last_name,
              'company_name', v_sub_worker.company_name,
              'issue_type', 'EXPIRED_CERT',
              'cert_type', 'OSHA 10',
              'expires', v_sub_worker.osha_10_exp,
              'severity', 'BLOCKING',
              'message', 'OSHA 10 expired on ' || TO_CHAR(v_sub_worker.osha_10_exp, 'Mon DD, YYYY')
            );
            v_personnel_issues := v_personnel_issues || v_issue;
            v_blocking_issues := v_blocking_issues + 1;
          ELSIF v_sub_worker.osha_10_exp IS NOT NULL AND v_sub_worker.osha_10_exp < p_check_date + INTERVAL '7 days' THEN
            v_issue := jsonb_build_object(
              'person_type', 'subcontractor_worker',
              'person_id', v_sub_worker.id,
              'person_name', v_sub_worker.first_name || ' ' || v_sub_worker.last_name,
              'company_name', v_sub_worker.company_name,
              'issue_type', 'EXPIRING_CERT',
              'cert_type', 'OSHA 10',
              'expires', v_sub_worker.osha_10_exp,
              'severity', 'WARNING',
              'message', 'OSHA 10 expires on ' || TO_CHAR(v_sub_worker.osha_10_exp, 'Mon DD, YYYY')
            );
            v_personnel_issues := v_personnel_issues || v_issue;
            v_warning_issues := v_warning_issues + 1;
          END IF;
        END IF;
      END IF;

      -- Track competent person from subcontractor
      IF v_sub_worker.is_competent_person AND 'Excavation' = ANY(v_sub_worker.competent_person_types) THEN
        IF NOT v_has_competent THEN
          v_has_competent := true;
          v_competent_name := v_sub_worker.first_name || ' ' || v_sub_worker.last_name || ' (' || v_sub_worker.company_name || ')';
          v_competent_type := 'Excavation';
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- =========================================================================
  -- STEP 4: Competent Person Requirement Check
  -- =========================================================================
  -- Only require competent person if we're checking personnel
  IF (array_length(p_crew_member_ids, 1) > 0 OR array_length(p_subcontractor_worker_ids, 1) > 0)
     AND NOT v_has_competent THEN
    v_issue := jsonb_build_object(
      'person_type', 'general',
      'issue_type', 'NO_COMPETENT_PERSON',
      'severity', 'BLOCKING',
      'message', 'No designated Excavation Competent Person among selected personnel. OSHA requires a competent person for all excavation work (29 CFR 1926.651(k)).'
    );
    v_personnel_issues := v_personnel_issues || v_issue;
    v_blocking_issues := v_blocking_issues + 1;
  END IF;

  -- =========================================================================
  -- STEP 5: Determine Final Personnel Status
  -- =========================================================================
  IF v_blocking_issues > 0 THEN
    v_personnel_status := 'FAIL';
    v_overall_status := 'FAIL';
    v_can_proceed := false;
  ELSIF v_warning_issues > 0 THEN
    v_personnel_status := 'WARNING';
    IF v_overall_status = 'PASS' THEN
      v_overall_status := 'CONDITIONAL';
    END IF;
  ELSE
    v_personnel_status := 'PASS';
  END IF;

  -- =========================================================================
  -- STEP 6: Log to Audit Table
  -- =========================================================================
  INSERT INTO public.dig_readiness_checks (
    organization_id,
    project_id,
    location_query,
    check_date,
    check_time,
    crew_member_ids,
    subcontractor_worker_ids,
    overall_status,
    can_proceed,
    wv811_status,
    wv811_ticket_id,
    wv811_ticket_number,
    wv811_message,
    personnel_status,
    personnel_issues,
    has_competent_person,
    competent_person_name,
    competent_person_type
  ) VALUES (
    p_organization_id,
    p_project_id,
    p_location,
    p_check_date,
    p_check_time,
    p_crew_member_ids,
    p_subcontractor_worker_ids,
    v_overall_status,
    v_can_proceed,
    v_wv811_status,
    v_ticket_id,
    v_ticket_number,
    v_wv811_message,
    v_personnel_status,
    v_personnel_issues,
    v_has_competent,
    v_competent_name,
    v_competent_type
  ) RETURNING id INTO v_check_id;

  -- =========================================================================
  -- STEP 7: Return Results
  -- =========================================================================
  RETURN QUERY SELECT
    v_overall_status,
    v_can_proceed,
    v_wv811_status,
    v_wv811_message,
    v_ticket_id,
    v_ticket_number,
    v_ticket_expires,
    v_utility_statuses,
    v_personnel_status,
    v_personnel_issues,
    v_has_competent,
    v_competent_name,
    v_competent_type,
    v_check_id;
END;
$$;

COMMENT ON FUNCTION public.comprehensive_dig_check IS
  'Comprehensive dig readiness check - validates WV811 tickets, personnel certifications, and competent person requirements';

-- ============================================================================
-- PART 4: View for Recent Dig Checks
-- ============================================================================

CREATE OR REPLACE VIEW public.v_recent_dig_checks AS
SELECT
  drc.id,
  drc.organization_id,
  drc.project_id,
  p.name AS project_name,
  p.project_number,
  drc.location_query,
  drc.check_date,
  drc.check_time,
  drc.overall_status,
  drc.can_proceed,
  drc.wv811_status,
  drc.wv811_ticket_number,
  drc.personnel_status,
  drc.has_competent_person,
  drc.competent_person_name,
  array_length(drc.crew_member_ids, 1) AS crew_count,
  array_length(drc.subcontractor_worker_ids, 1) AS sub_worker_count,
  drc.checked_at,
  u.email AS checked_by_email
FROM public.dig_readiness_checks drc
LEFT JOIN public.projects p ON p.id = drc.project_id
LEFT JOIN auth.users u ON u.id = drc.checked_by
ORDER BY drc.checked_at DESC;

COMMENT ON VIEW public.v_recent_dig_checks IS
  'Recent dig readiness checks with project info for dashboard display';

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration adds comprehensive dig readiness checking:
--
-- 1. dig_readiness_checks table - Audit trail for all dig checks
-- 2. check_employee_dig_certs() - Helper to check employee certifications
-- 3. comprehensive_dig_check() - Main function combining:
--    - WV811 ticket validation (via existing check_dig_status_v2)
--    - Crew member certification validation (OSHA, Excavation Safety)
--    - Subcontractor worker compliance
--    - Competent Person requirement
--
-- Status Levels:
--   PASS - All clear, can dig
--   CONDITIONAL - Warnings present but can proceed
--   FAIL - Blocking issues, cannot dig
--
-- Blocking Issues (FAIL):
--   - WV811: No ticket, expired, or CONFLICT status
--   - Missing OSHA 10/30 certification
--   - Expired OSHA certification
--   - Missing Excavation Safety cert (for operators)
--   - No designated Competent Person
--
-- Warning Issues (CONDITIONAL):
--   - WV811: PENDING utilities in window
--   - Certifications expiring within 7 days
--   - Crew member not linked to employee record
-- ============================================================================
