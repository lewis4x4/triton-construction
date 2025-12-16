-- Migration: 138_driver_onboarding.sql
-- Description: CDL & Non-CDL Driver Onboarding Module
-- Creates tables for driver applications, safety performance tracking, road tests, and e-signatures

-- ============================================
-- ENUMS
-- ============================================

-- Driver application type
CREATE TYPE driver_application_type AS ENUM ('CDL', 'NON_CDL');

-- Driver application status
CREATE TYPE driver_application_status AS ENUM (
  'DRAFT',
  'IN_PROGRESS',
  'PENDING_DOCUMENTS',
  'PENDING_VERIFICATION',
  'APPROVED',
  'REJECTED',
  'WITHDRAWN'
);

-- CDL License class
CREATE TYPE cdl_class_enum AS ENUM ('A', 'B', 'C');

-- Safety performance request status
CREATE TYPE safety_performance_status AS ENUM (
  'PENDING',
  'SENT',
  'RECEIVED',
  'NO_RESPONSE',
  'NOT_REQUIRED'
);

-- ============================================
-- TABLES
-- ============================================

-- Main driver application table
CREATE TABLE public.driver_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Application metadata
  application_type driver_application_type NOT NULL,
  status driver_application_status NOT NULL DEFAULT 'DRAFT',
  application_number TEXT, -- Auto-generated: ORG-CDL-2025-001

  -- Personal Information (Step 1)
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  suffix TEXT, -- Jr, Sr, III, etc.
  ssn_last_four TEXT, -- Encrypted, CDL only
  date_of_birth DATE NOT NULL,
  email TEXT,
  phone TEXT,
  alternate_phone TEXT,

  -- Address History (3-year, JSONB array)
  -- Format: [{street, city, state, zip, from_date, to_date, is_current}]
  addresses JSONB DEFAULT '[]'::jsonb,

  -- Emergency Contact
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,

  -- License Information (Step 2)
  license_number TEXT NOT NULL,
  license_state TEXT NOT NULL,
  license_expiration DATE NOT NULL,
  license_class cdl_class_enum, -- NULL for non-CDL
  endorsements TEXT[] DEFAULT '{}', -- H, N, P, T, X, S, etc.
  restrictions TEXT[] DEFAULT '{}',

  -- Driving Experience (CDL only, JSONB array)
  -- Format: [{equipment_type, class_required, years_experience, approximate_miles}]
  driving_experience JSONB DEFAULT '[]'::jsonb,

  -- Accident History (CDL only, last 3 years, JSONB array)
  -- Format: [{date, nature_of_accident, fatalities, injuries, location}]
  accidents JSONB DEFAULT '[]'::jsonb,
  has_accidents_last_3_years BOOLEAN DEFAULT false,

  -- Traffic Convictions/Forfeitures (CDL only, last 3 years, JSONB array)
  -- Format: [{date, location, charge, penalty}]
  convictions JSONB DEFAULT '[]'::jsonb,
  has_convictions_last_3_years BOOLEAN DEFAULT false,

  -- Employment History (CDL only, 3-10 years, JSONB array)
  -- Format: [{employer_name, address, city, state, zip, phone, from_date, to_date, position, reason_left, subject_to_fmcsr, drug_alcohol_testing}]
  employment_history JSONB DEFAULT '[]'::jsonb,

  -- Education (Optional)
  highest_education TEXT, -- 'HIGH_SCHOOL', 'SOME_COLLEGE', 'ASSOCIATES', 'BACHELORS', 'MASTERS', 'DOCTORATE'
  school_name TEXT,
  graduation_date DATE,

  -- Job Assignment (Non-CDL)
  job_number TEXT,
  job_assignment TEXT,

  -- Policy Acknowledgments (Step 4)
  fleet_policy_acknowledged_at TIMESTAMPTZ,
  fleet_policy_signature_id UUID, -- References driver_esignatures

  cmv_policy_acknowledged_at TIMESTAMPTZ,
  cmv_policy_signature_id UUID, -- References driver_esignatures
  -- CMV Policy Manual Initials (8 sections)
  -- Format: {section_1: true, section_2: true, ...}
  cmv_policy_initials JSONB DEFAULT '{}'::jsonb,

  -- Authorizations (Step 6)
  drug_test_authorized_at TIMESTAMPTZ,
  drug_test_signature_id UUID,

  mvr_authorized_at TIMESTAMPTZ,
  mvr_signature_id UUID,

  clearinghouse_authorized_at TIMESTAMPTZ,
  clearinghouse_signature_id UUID,

  -- Final Certification (Step 7)
  certified_accurate_at TIMESTAMPTZ,
  certification_signature_id UUID,
  applicant_signature TEXT, -- Base64 encoded signature image

  -- Wizard Progress Tracking
  current_step INTEGER DEFAULT 1,
  completed_steps INTEGER[] DEFAULT '{}',
  last_saved_at TIMESTAMPTZ,

  -- Verification Status
  mvr_requested_at TIMESTAMPTZ,
  mvr_received_at TIMESTAMPTZ,
  mvr_status TEXT, -- 'PENDING', 'CLEAR', 'VIOLATIONS_FOUND', 'DISQUALIFIED'
  mvr_document_id UUID, -- Reference to uploaded MVR

  clearinghouse_query_date DATE,
  clearinghouse_status TEXT, -- 'PENDING', 'CLEAR', 'VIOLATIONS_FOUND'
  clearinghouse_document_id UUID,

  medical_card_expiration DATE,
  medical_card_document_id UUID,

  -- Approval Workflow
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  rejection_reason TEXT,

  -- Link to DQF after approval
  dqf_id UUID REFERENCES public.driver_qualification_files(id),
  employee_id UUID REFERENCES public.employees(id),
  crew_member_id UUID REFERENCES public.crew_members(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID DEFAULT auth.uid()
);

-- Safety Performance History Request tracking
CREATE TABLE public.safety_performance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_application_id UUID NOT NULL REFERENCES public.driver_applications(id) ON DELETE CASCADE,

  -- Previous Employer Information
  employer_name TEXT NOT NULL,
  employer_address TEXT,
  employer_city TEXT,
  employer_state TEXT,
  employer_zip TEXT,
  employer_phone TEXT,
  employer_fax TEXT,
  employer_email TEXT,
  contact_person TEXT,

  -- Employment Period
  employed_from DATE,
  employed_to DATE,
  position_held TEXT,

  -- Request Tracking
  request_generated_at TIMESTAMPTZ,
  request_sent_at TIMESTAMPTZ,
  request_method TEXT, -- 'EMAIL', 'FAX', 'MAIL'
  request_tracking_number TEXT,

  -- Response Tracking
  response_received_at TIMESTAMPTZ,
  response_document_id UUID, -- Reference to uploaded response

  -- Safety Performance Results (from response)
  accidents_reported INTEGER DEFAULT 0,
  preventable_accidents INTEGER DEFAULT 0,
  drug_test_violations BOOLEAN DEFAULT false,
  alcohol_test_violations BOOLEAN DEFAULT false,
  refused_tests BOOLEAN DEFAULT false,
  positive_controlled_substance BOOLEAN DEFAULT false,
  other_violations TEXT,
  eligible_for_rehire BOOLEAN,
  notes TEXT,

  -- Status
  status safety_performance_status DEFAULT 'PENDING',

  -- Follow-up
  followup_count INTEGER DEFAULT 0,
  last_followup_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Road Test Records
CREATE TABLE public.road_test_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  driver_application_id UUID REFERENCES public.driver_applications(id) ON DELETE SET NULL,
  dqf_id UUID REFERENCES public.driver_qualification_files(id) ON DELETE SET NULL,
  employee_id UUID REFERENCES public.employees(id),

  -- Test Details
  test_date DATE NOT NULL,
  test_location TEXT,

  -- Vehicle Information
  vehicle_type TEXT NOT NULL, -- 'STRAIGHT_TRUCK', 'TRACTOR_TRAILER', 'BUS', etc.
  vehicle_description TEXT,
  vehicle_id UUID, -- Reference to fleet vehicle if applicable

  -- Pre-Trip Inspection (S=Satisfactory, U=Unsatisfactory, NA=Not Applicable)
  pretrip_defroster_heater CHAR(2),
  pretrip_mirrors CHAR(2),
  pretrip_steering CHAR(2),
  pretrip_lights CHAR(2),
  pretrip_brakes CHAR(2),
  pretrip_horn CHAR(2),
  pretrip_windshield_wipers CHAR(2),
  pretrip_tires CHAR(2),
  pretrip_coupling_devices CHAR(2),
  pretrip_emergency_equipment CHAR(2),
  pretrip_notes TEXT,

  -- Driving Skills (S=Satisfactory, U=Unsatisfactory)
  skill_starting_engine CHAR(1),
  skill_clutch_transmission CHAR(1),
  skill_turning CHAR(1),
  skill_backing CHAR(1),
  skill_parking CHAR(1),
  skill_passing CHAR(1),
  skill_railroad_crossing CHAR(1),
  skill_signals_lane_usage CHAR(1),
  skill_speed CHAR(1),
  skill_traffic_signs_signals CHAR(1),
  skill_braking CHAR(1),
  skill_general_driving CHAR(1),
  skill_notes TEXT,

  -- Overall Result
  passed BOOLEAN NOT NULL,
  examiner_remarks TEXT,

  -- Examiner Information
  examiner_id UUID REFERENCES auth.users(id),
  examiner_name TEXT NOT NULL,
  examiner_title TEXT,
  examiner_license_number TEXT,
  examiner_signature TEXT, -- Base64 encoded
  examiner_signature_id UUID, -- Reference to driver_esignatures

  -- Driver Signature
  driver_signature TEXT, -- Base64 encoded
  driver_signature_id UUID,

  -- Certificate Information
  certificate_number TEXT,
  certificate_issued_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- E-Signature Audit Trail
CREATE TABLE public.driver_esignatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_application_id UUID REFERENCES public.driver_applications(id) ON DELETE CASCADE,
  road_test_id UUID REFERENCES public.road_test_records(id) ON DELETE CASCADE,

  -- Document Type
  document_type TEXT NOT NULL, -- 'APPLICATION', 'FLEET_POLICY', 'CMV_POLICY', 'DRUG_AUTH', 'MVR_AUTH', 'CLEARINGHOUSE_AUTH', 'CERTIFICATION', 'ROAD_TEST_DRIVER', 'ROAD_TEST_EXAMINER'

  -- Signature Data
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  typed_name TEXT, -- Typed name for record

  -- Legal/Audit Information
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_ip_address TEXT,
  signer_user_agent TEXT,

  -- Timestamp
  signed_at TIMESTAMPTZ DEFAULT NOW(),

  -- Document Integrity
  document_hash TEXT, -- SHA-256 hash of document content at signing time
  document_version TEXT,

  -- Location (if captured)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  CONSTRAINT chk_has_reference CHECK (
    driver_application_id IS NOT NULL OR road_test_id IS NOT NULL
  )
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_driver_apps_org ON driver_applications(organization_id);
CREATE INDEX idx_driver_apps_status ON driver_applications(status);
CREATE INDEX idx_driver_apps_type ON driver_applications(application_type);
CREATE INDEX idx_driver_apps_created ON driver_applications(created_at DESC);
CREATE INDEX idx_driver_apps_submitted ON driver_applications(submitted_at DESC);
CREATE INDEX idx_driver_apps_dqf ON driver_applications(dqf_id) WHERE dqf_id IS NOT NULL;

CREATE INDEX idx_safety_perf_app ON safety_performance_requests(driver_application_id);
CREATE INDEX idx_safety_perf_status ON safety_performance_requests(status);

CREATE INDEX idx_road_test_org ON road_test_records(organization_id);
CREATE INDEX idx_road_test_app ON road_test_records(driver_application_id);
CREATE INDEX idx_road_test_dqf ON road_test_records(dqf_id);
CREATE INDEX idx_road_test_date ON road_test_records(test_date DESC);

CREATE INDEX idx_esignatures_app ON driver_esignatures(driver_application_id);
CREATE INDEX idx_esignatures_road_test ON driver_esignatures(road_test_id);
CREATE INDEX idx_esignatures_type ON driver_esignatures(document_type);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE driver_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_performance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE road_test_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_esignatures ENABLE ROW LEVEL SECURITY;

-- Driver Applications RLS
CREATE POLICY "driver_apps_org_isolation" ON driver_applications
  FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "driver_apps_demo_read" ON driver_applications
  FOR SELECT USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@triton.com'
    AND organization_id = '63555da4-55d1-462b-aafb-e3ef32f745cc'::uuid
  );

-- Safety Performance Requests RLS (via application)
CREATE POLICY "safety_perf_org_isolation" ON safety_performance_requests
  FOR ALL USING (
    driver_application_id IN (
      SELECT id FROM driver_applications
      WHERE organization_id = public.get_user_organization_id()
    )
  );

CREATE POLICY "safety_perf_demo_read" ON safety_performance_requests
  FOR SELECT USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@triton.com'
    AND driver_application_id IN (
      SELECT id FROM driver_applications
      WHERE organization_id = '63555da4-55d1-462b-aafb-e3ef32f745cc'::uuid
    )
  );

-- Road Test Records RLS
CREATE POLICY "road_test_org_isolation" ON road_test_records
  FOR ALL USING (organization_id = public.get_user_organization_id());

CREATE POLICY "road_test_demo_read" ON road_test_records
  FOR SELECT USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@triton.com'
    AND organization_id = '63555da4-55d1-462b-aafb-e3ef32f745cc'::uuid
  );

-- E-Signatures RLS (via application or road test)
CREATE POLICY "esignatures_org_isolation" ON driver_esignatures
  FOR ALL USING (
    (driver_application_id IN (
      SELECT id FROM driver_applications
      WHERE organization_id = public.get_user_organization_id()
    ))
    OR
    (road_test_id IN (
      SELECT id FROM road_test_records
      WHERE organization_id = public.get_user_organization_id()
    ))
  );

CREATE POLICY "esignatures_demo_read" ON driver_esignatures
  FOR SELECT USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) LIKE '%@triton.com'
    AND (
      driver_application_id IN (
        SELECT id FROM driver_applications
        WHERE organization_id = '63555da4-55d1-462b-aafb-e3ef32f745cc'::uuid
      )
      OR road_test_id IN (
        SELECT id FROM road_test_records
        WHERE organization_id = '63555da4-55d1-462b-aafb-e3ef32f745cc'::uuid
      )
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Generate application number
CREATE OR REPLACE FUNCTION public.generate_application_number()
RETURNS TRIGGER AS $$
DECLARE
  org_code TEXT;
  type_code TEXT;
  year_code TEXT;
  seq_num INTEGER;
BEGIN
  -- Get organization code (first 3 chars)
  SELECT UPPER(SUBSTRING(name, 1, 3)) INTO org_code
  FROM organizations WHERE id = NEW.organization_id;

  -- Type code
  type_code := CASE NEW.application_type
    WHEN 'CDL' THEN 'CDL'
    WHEN 'NON_CDL' THEN 'NCL'
  END;

  -- Year
  year_code := TO_CHAR(NOW(), 'YYYY');

  -- Sequence number for this org/type/year
  SELECT COALESCE(MAX(
    NULLIF(SPLIT_PART(application_number, '-', 4), '')::INTEGER
  ), 0) + 1 INTO seq_num
  FROM driver_applications
  WHERE organization_id = NEW.organization_id
    AND application_type = NEW.application_type
    AND application_number LIKE org_code || '-' || type_code || '-' || year_code || '-%';

  NEW.application_number := org_code || '-' || type_code || '-' || year_code || '-' || LPAD(seq_num::TEXT, 4, '0');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_application_number
  BEFORE INSERT ON driver_applications
  FOR EACH ROW
  WHEN (NEW.application_number IS NULL)
  EXECUTE FUNCTION generate_application_number();

-- Update timestamp trigger
CREATE TRIGGER trg_driver_apps_updated
  BEFORE UPDATE ON driver_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_safety_perf_updated
  BEFORE UPDATE ON safety_performance_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_road_test_updated
  BEFORE UPDATE ON road_test_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Submit application function
CREATE OR REPLACE FUNCTION public.submit_driver_application(
  p_application_id UUID,
  p_signature_data TEXT
)
RETURNS driver_applications AS $$
DECLARE
  v_app driver_applications;
  v_sig_id UUID;
BEGIN
  -- Get application
  SELECT * INTO v_app FROM driver_applications WHERE id = p_application_id;

  IF v_app IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  -- Validate status
  IF v_app.status NOT IN ('DRAFT', 'IN_PROGRESS') THEN
    RAISE EXCEPTION 'Application cannot be submitted in current status: %', v_app.status;
  END IF;

  -- Create certification signature
  INSERT INTO driver_esignatures (
    driver_application_id,
    document_type,
    signature_data,
    signer_name,
    signed_at,
    signer_ip_address
  ) VALUES (
    p_application_id,
    'CERTIFICATION',
    p_signature_data,
    v_app.first_name || ' ' || v_app.last_name,
    NOW(),
    current_setting('request.headers', true)::json->>'x-forwarded-for'
  ) RETURNING id INTO v_sig_id;

  -- Update application
  UPDATE driver_applications
  SET
    status = CASE
      WHEN application_type = 'NON_CDL' THEN 'PENDING_VERIFICATION'
      ELSE 'PENDING_DOCUMENTS'
    END,
    certified_accurate_at = NOW(),
    certification_signature_id = v_sig_id,
    applicant_signature = p_signature_data,
    submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = p_application_id
  RETURNING * INTO v_app;

  RETURN v_app;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve application and create DQF
CREATE OR REPLACE FUNCTION public.approve_driver_application(
  p_application_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS driver_applications AS $$
DECLARE
  v_app driver_applications;
  v_dqf_id UUID;
  v_license_id UUID;
BEGIN
  -- Get application
  SELECT * INTO v_app FROM driver_applications WHERE id = p_application_id;

  IF v_app IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.status NOT IN ('PENDING_DOCUMENTS', 'PENDING_VERIFICATION') THEN
    RAISE EXCEPTION 'Application cannot be approved in current status: %', v_app.status;
  END IF;

  -- Create DQF record
  INSERT INTO driver_qualification_files (
    organization_id,
    employee_id,
    status,
    hire_date,
    created_at
  ) VALUES (
    v_app.organization_id,
    v_app.employee_id,
    'ACTIVE',
    CURRENT_DATE,
    NOW()
  ) RETURNING id INTO v_dqf_id;

  -- Create driver license record
  INSERT INTO driver_licenses (
    dqf_id,
    license_number,
    state,
    class,
    endorsements,
    restrictions,
    expiration_date,
    created_at
  ) VALUES (
    v_dqf_id,
    v_app.license_number,
    v_app.license_state,
    v_app.license_class::TEXT,
    v_app.endorsements,
    v_app.restrictions,
    v_app.license_expiration,
    NOW()
  ) RETURNING id INTO v_license_id;

  -- Update application
  UPDATE driver_applications
  SET
    status = 'APPROVED',
    dqf_id = v_dqf_id,
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    review_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_application_id
  RETURNING * INTO v_app;

  RETURN v_app;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject application
CREATE OR REPLACE FUNCTION public.reject_driver_application(
  p_application_id UUID,
  p_reason TEXT
)
RETURNS driver_applications AS $$
DECLARE
  v_app driver_applications;
BEGIN
  UPDATE driver_applications
  SET
    status = 'REJECTED',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_application_id
  RETURNING * INTO v_app;

  RETURN v_app;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get application summary for list view
CREATE OR REPLACE FUNCTION public.get_driver_application_summary(
  p_organization_id UUID,
  p_status driver_application_status DEFAULT NULL,
  p_type driver_application_type DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  application_number TEXT,
  application_type driver_application_type,
  status driver_application_status,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  license_state TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  current_step INTEGER,
  total_steps INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    da.id,
    da.application_number,
    da.application_type,
    da.status,
    TRIM(COALESCE(da.first_name, '') || ' ' || COALESCE(da.last_name, '')) AS full_name,
    da.email,
    da.phone,
    da.license_state,
    da.submitted_at,
    da.created_at,
    da.current_step,
    CASE da.application_type
      WHEN 'CDL' THEN 7
      WHEN 'NON_CDL' THEN 3
    END AS total_steps
  FROM driver_applications da
  WHERE da.organization_id = p_organization_id
    AND (p_status IS NULL OR da.status = p_status)
    AND (p_type IS NULL OR da.application_type = p_type)
  ORDER BY da.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- GRANTS
-- ============================================

GRANT SELECT, INSERT, UPDATE ON driver_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON safety_performance_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON road_test_records TO authenticated;
GRANT SELECT, INSERT ON driver_esignatures TO authenticated;

GRANT USAGE ON TYPE driver_application_type TO authenticated;
GRANT USAGE ON TYPE driver_application_status TO authenticated;
GRANT USAGE ON TYPE cdl_class_enum TO authenticated;
GRANT USAGE ON TYPE safety_performance_status TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE driver_applications IS 'CDL and Non-CDL driver onboarding applications with full DOT compliance tracking';
COMMENT ON TABLE safety_performance_requests IS 'Tracking for Safety Performance History requests to previous employers (49 CFR 391.23)';
COMMENT ON TABLE road_test_records IS 'Driver road test examination records (49 CFR 391.31)';
COMMENT ON TABLE driver_esignatures IS 'E-signature audit trail for all driver onboarding documents';

COMMENT ON COLUMN driver_applications.application_type IS 'CDL requires full DOT packet, NON_CDL only requires SP-030 acknowledgment';
COMMENT ON COLUMN driver_applications.cmv_policy_initials IS 'JSONB tracking which sections of CMV policy have been initialed';
COMMENT ON COLUMN driver_applications.driving_experience IS 'Equipment type experience: [{equipment_type, class_required, years_experience, approximate_miles}]';
COMMENT ON COLUMN driver_applications.employment_history IS '3-10 years of employment history for CDL applicants per DOT requirements';
