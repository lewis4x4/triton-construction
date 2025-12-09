-- ============================================================================
-- Migration: Bid Intelligence Module Schema Fixes v1.1
-- Date: 2024-12-10
-- Description: Adds missing tables, columns, and constraints identified in review
-- ============================================================================

-- ============================================================================
-- PART 1: Add updated_at trigger function (if not exists)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 2: bid_project_members table (CRITICAL - needed for RLS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS bid_project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_project_id UUID NOT NULL REFERENCES bid_projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Role determines access level
  role VARCHAR(50) NOT NULL CHECK (role IN (
    'ESTIMATOR',       -- Can view/edit line items, risks, questions
    'PROJECT_MANAGER', -- Full edit access except delete project
    'EXECUTIVE',       -- Read-only with executive snapshot access
    'VIEWER'           -- Read-only access
  )),

  -- Permissions flags for granular control
  can_edit_line_items BOOLEAN DEFAULT false,
  can_edit_risks BOOLEAN DEFAULT false,
  can_edit_questions BOOLEAN DEFAULT false,
  can_run_ai_analysis BOOLEAN DEFAULT false,
  can_generate_snapshots BOOLEAN DEFAULT false,
  can_upload_documents BOOLEAN DEFAULT false,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT unique_project_member UNIQUE(bid_project_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bid_project_members_project ON bid_project_members(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_project_members_user ON bid_project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_bid_project_members_role ON bid_project_members(role);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_bid_project_members_updated_at ON bid_project_members;
CREATE TRIGGER update_bid_project_members_updated_at
  BEFORE UPDATE ON bid_project_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE bid_project_members ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships
DROP POLICY IF EXISTS "Users see own memberships" ON bid_project_members;
CREATE POLICY "Users see own memberships" ON bid_project_members
  FOR SELECT USING (user_id = auth.uid());

-- Project managers can manage members
DROP POLICY IF EXISTS "PMs manage members" ON bid_project_members;
CREATE POLICY "PMs manage members" ON bid_project_members
  FOR ALL USING (
    bid_project_id IN (
      SELECT bpm.bid_project_id FROM bid_project_members bpm
      WHERE bpm.user_id = auth.uid() AND bpm.role IN ('PROJECT_MANAGER')
    )
  );

-- Set default permissions based on role
CREATE OR REPLACE FUNCTION set_member_permissions()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.role
    WHEN 'ESTIMATOR' THEN
      NEW.can_edit_line_items := true;
      NEW.can_edit_risks := true;
      NEW.can_edit_questions := true;
      NEW.can_run_ai_analysis := true;
      NEW.can_upload_documents := true;
      NEW.can_generate_snapshots := false;
    WHEN 'PROJECT_MANAGER' THEN
      NEW.can_edit_line_items := true;
      NEW.can_edit_risks := true;
      NEW.can_edit_questions := true;
      NEW.can_run_ai_analysis := true;
      NEW.can_upload_documents := true;
      NEW.can_generate_snapshots := true;
    WHEN 'EXECUTIVE' THEN
      NEW.can_edit_line_items := false;
      NEW.can_edit_risks := false;
      NEW.can_edit_questions := false;
      NEW.can_run_ai_analysis := false;
      NEW.can_upload_documents := false;
      NEW.can_generate_snapshots := true;
    WHEN 'VIEWER' THEN
      NEW.can_edit_line_items := false;
      NEW.can_edit_risks := false;
      NEW.can_edit_questions := false;
      NEW.can_run_ai_analysis := false;
      NEW.can_upload_documents := false;
      NEW.can_generate_snapshots := false;
  END CASE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_member_permissions_trigger ON bid_project_members;
CREATE TRIGGER set_member_permissions_trigger
  BEFORE INSERT ON bid_project_members
  FOR EACH ROW EXECUTE FUNCTION set_member_permissions();

-- ============================================================================
-- PART 3: Extend bid_projects with missing fields
-- ============================================================================

-- Add columns that were in AI output examples but missing from schema
ALTER TABLE bid_projects
  ADD COLUMN IF NOT EXISTS federal_aid_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS working_days INTEGER,
  ADD COLUMN IF NOT EXISTS liquidated_damages_per_day DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS is_federal_aid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS prebid_question_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bid_bond_percentage DECIMAL(5,2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS performance_bond_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_bond_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS prequalification_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_value_low DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS estimated_value_high DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS project_metadata JSONB DEFAULT '{}';

-- Add audit columns if missing
ALTER TABLE bid_projects
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_bid_projects_updated_at ON bid_projects;
CREATE TRIGGER update_bid_projects_updated_at
  BEFORE UPDATE ON bid_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 4: Extend bid_documents with processing improvements
-- ============================================================================

ALTER TABLE bid_documents
  ADD COLUMN IF NOT EXISTS processing_worker_id UUID,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processing_error TEXT,
  ADD COLUMN IF NOT EXISTS ai_analysis_metadata JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS page_count INTEGER,
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

-- Add new processing status value (recreate constraint to include FAILED_PERMANENT)
DO $$
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bid_documents_processing_status_check'
  ) THEN
    ALTER TABLE bid_documents DROP CONSTRAINT bid_documents_processing_status_check;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Ignore if constraint doesn't exist
  NULL;
END $$;

-- Add the new constraint with FAILED_PERMANENT
DO $$
BEGIN
  ALTER TABLE bid_documents
    ADD CONSTRAINT bid_documents_processing_status_check
    CHECK (processing_status IN (
      'PENDING',           -- Awaiting processing
      'PROCESSING',        -- Currently being analyzed
      'COMPLETED',         -- Successfully processed
      'FAILED',            -- Failed, will retry
      'FAILED_PERMANENT'   -- Exceeded retries, requires manual intervention
    ));
EXCEPTION WHEN OTHERS THEN
  -- Ignore if already exists
  NULL;
END $$;

-- Index for queue processing
CREATE INDEX IF NOT EXISTS idx_bid_documents_processing_queue
  ON bid_documents(processing_status, processing_started_at)
  WHERE processing_status IN ('PENDING', 'PROCESSING');

-- ============================================================================
-- PART 5: Extend bid_line_items with AI provenance
-- ============================================================================

ALTER TABLE bid_line_items
  ADD COLUMN IF NOT EXISTS ai_price_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ai_price_source_details JSONB,
  ADD COLUMN IF NOT EXISTS ai_model_used VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ai_categorization_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS ai_pricing_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
  ADD COLUMN IF NOT EXISTS ai_categorized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manually_reviewed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Add check constraints for confidence values
DO $$
BEGIN
  ALTER TABLE bid_line_items
    ADD CONSTRAINT bid_line_items_ai_categorization_confidence_check
    CHECK (ai_categorization_confidence IS NULL OR (ai_categorization_confidence BETWEEN 0 AND 100));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE bid_line_items
    ADD CONSTRAINT bid_line_items_ai_pricing_confidence_check
    CHECK (ai_pricing_confidence IS NULL OR (ai_pricing_confidence BETWEEN 0 AND 100));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- PART 6: Extend bid_project_risks with audit fields
-- ============================================================================

ALTER TABLE bid_project_risks
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS source_document_ids UUID[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_run_id UUID;

DROP TRIGGER IF EXISTS update_bid_project_risks_updated_at ON bid_project_risks;
CREATE TRIGGER update_bid_project_risks_updated_at
  BEFORE UPDATE ON bid_project_risks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 7: Extend bid_prebid_questions with audit and deadline
-- ============================================================================

ALTER TABLE bid_prebid_questions
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS answer_received_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS answer_text TEXT,
  ADD COLUMN IF NOT EXISTS answer_document_id UUID REFERENCES bid_documents(id),
  ADD COLUMN IF NOT EXISTS linked_risk_id UUID REFERENCES bid_project_risks(id);

DROP TRIGGER IF EXISTS update_bid_prebid_questions_updated_at ON bid_prebid_questions;
CREATE TRIGGER update_bid_prebid_questions_updated_at
  BEFORE UPDATE ON bid_prebid_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 8: Extend bid_work_packages with locking
-- ============================================================================

ALTER TABLE bid_work_packages
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lock_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS assigned_subcontractor_id UUID,
  ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS notes TEXT;

DROP TRIGGER IF EXISTS update_bid_work_packages_updated_at ON bid_work_packages;
CREATE TRIGGER update_bid_work_packages_updated_at
  BEFORE UPDATE ON bid_work_packages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 9: Fix bid_executive_snapshots metrics
-- ============================================================================

ALTER TABLE bid_executive_snapshots
  ADD COLUMN IF NOT EXISTS metrics JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_line_items INTEGER,
  ADD COLUMN IF NOT EXISTS total_estimated_value DECIMAL(15,2),
  ADD COLUMN IF NOT EXISTS critical_risks_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS high_risks_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS medium_risks_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_risks_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS work_packages_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS environmental_commitments_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hazmat_findings_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prebid_questions_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS documents_analyzed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_model_used VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ai_prompt_version VARCHAR(20),
  ADD COLUMN IF NOT EXISTS generation_duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- PART 10: Create ai_runs audit table (for future use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  organization_id UUID NOT NULL,
  bid_project_id UUID REFERENCES bid_projects(id) ON DELETE SET NULL,
  document_id UUID REFERENCES bid_documents(id) ON DELETE SET NULL,

  -- Run details
  run_type VARCHAR(50) NOT NULL CHECK (run_type IN (
    'DOCUMENT_ANALYSIS',
    'RISK_EXTRACTION',
    'QUESTION_GENERATION',
    'LINE_ITEM_CATEGORIZATION',
    'WORK_PACKAGE_GENERATION',
    'EXECUTIVE_SNAPSHOT',
    'BIDX_PARSING'
  )),

  -- AI configuration
  model VARCHAR(100) NOT NULL,
  prompt_version VARCHAR(20),
  temperature DECIMAL(3,2),
  max_tokens INTEGER,

  -- Usage tracking
  input_tokens INTEGER,
  output_tokens INTEGER,
  total_tokens INTEGER,
  estimated_cost_usd DECIMAL(10,6),

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'RUNNING' CHECK (status IN (
    'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'
  )),
  error_message TEXT,
  error_code VARCHAR(50),

  -- Anthropic tracking
  anthropic_request_id VARCHAR(100),

  -- Audit
  triggered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_runs_project ON ai_runs(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_ai_runs_type ON ai_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_ai_runs_status ON ai_runs(status);
CREATE INDEX IF NOT EXISTS idx_ai_runs_created ON ai_runs(created_at DESC);

-- RLS
ALTER TABLE ai_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own org AI runs" ON ai_runs;
CREATE POLICY "Users see own org AI runs" ON ai_runs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- ============================================================================
-- PART 11: Helper function for project access check
-- ============================================================================

CREATE OR REPLACE FUNCTION user_has_project_access(
  p_user_id UUID,
  p_project_id UUID,
  p_required_permission VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN := false;
  v_member_record RECORD;
BEGIN
  -- Check direct membership
  SELECT * INTO v_member_record
  FROM bid_project_members
  WHERE user_id = p_user_id AND bid_project_id = p_project_id;

  IF FOUND THEN
    -- If no specific permission required, membership is enough
    IF p_required_permission IS NULL THEN
      RETURN true;
    END IF;

    -- Check specific permission
    CASE p_required_permission
      WHEN 'edit_line_items' THEN RETURN v_member_record.can_edit_line_items;
      WHEN 'edit_risks' THEN RETURN v_member_record.can_edit_risks;
      WHEN 'edit_questions' THEN RETURN v_member_record.can_edit_questions;
      WHEN 'run_ai_analysis' THEN RETURN v_member_record.can_run_ai_analysis;
      WHEN 'generate_snapshots' THEN RETURN v_member_record.can_generate_snapshots;
      WHEN 'upload_documents' THEN RETURN v_member_record.can_upload_documents;
      ELSE RETURN false;
    END CASE;
  END IF;

  -- Check org-level admin access via user_profiles
  SELECT EXISTS(
    SELECT 1 FROM user_profiles up
    JOIN bid_projects bp ON bp.organization_id = up.organization_id
    WHERE up.id = p_user_id
    AND bp.id = p_project_id
  ) INTO v_has_access;

  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 12: View for pending document processing (updated)
-- ============================================================================

DROP VIEW IF EXISTS v_pending_document_processing;

CREATE VIEW v_pending_document_processing AS
SELECT
  d.id,
  d.bid_project_id,
  p.project_name,
  d.file_name,
  d.document_type,
  d.processing_status,
  d.processing_attempts,
  d.processing_error,
  d.processing_started_at,
  d.created_at,
  EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 60 AS minutes_since_upload,
  EXTRACT(EPOCH FROM (NOW() - d.processing_started_at)) / 60 AS minutes_processing,
  CASE
    WHEN d.processing_status = 'PROCESSING'
      AND d.processing_started_at < NOW() - INTERVAL '10 minutes'
    THEN true
    ELSE false
  END AS is_stuck
FROM bid_documents d
JOIN bid_projects p ON p.id = d.bid_project_id
WHERE d.processing_status IN ('PENDING', 'PROCESSING', 'FAILED')
ORDER BY
  CASE d.processing_status
    WHEN 'PROCESSING' THEN 1
    WHEN 'FAILED' THEN 2
    WHEN 'PENDING' THEN 3
  END,
  d.created_at ASC;

GRANT SELECT ON v_pending_document_processing TO authenticated;

-- ============================================================================
-- PART 13: Function to reset stuck documents
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_stuck_documents(
  p_stuck_threshold_minutes INTEGER DEFAULT 10,
  p_max_attempts INTEGER DEFAULT 3
) RETURNS TABLE(
  document_id UUID,
  file_name TEXT,
  previous_status TEXT,
  new_status TEXT,
  attempts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  UPDATE bid_documents
  SET
    processing_status = CASE
      WHEN processing_attempts >= p_max_attempts THEN 'FAILED_PERMANENT'
      ELSE 'PENDING'
    END,
    processing_started_at = NULL,
    processing_worker_id = NULL,
    processing_attempts = processing_attempts + 1,
    updated_at = NOW()
  WHERE processing_status = 'PROCESSING'
    AND processing_started_at < NOW() - (p_stuck_threshold_minutes || ' minutes')::INTERVAL
  RETURNING
    id AS document_id,
    file_name,
    'PROCESSING' AS previous_status,
    processing_status AS new_status,
    processing_attempts AS attempts;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 14: Create document processing claim function
-- ============================================================================

CREATE OR REPLACE FUNCTION claim_documents_for_processing(
  p_batch_size INTEGER DEFAULT 10,
  p_worker_id UUID DEFAULT gen_random_uuid()
) RETURNS SETOF bid_documents AS $$
BEGIN
  RETURN QUERY
  UPDATE bid_documents
  SET
    processing_status = 'PROCESSING',
    processing_started_at = NOW(),
    processing_worker_id = p_worker_id,
    updated_at = NOW()
  WHERE id IN (
    SELECT id FROM bid_documents
    WHERE processing_status = 'PENDING'
    ORDER BY created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 15: Create unique constraint for line items
-- ============================================================================

-- Add unique constraint for upsert operations
DO $$
BEGIN
  ALTER TABLE bid_line_items
    ADD CONSTRAINT bid_line_items_project_item_unique
    UNIQUE(bid_project_id, item_number);
EXCEPTION WHEN OTHERS THEN
  -- Ignore if already exists
  NULL;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================

COMMENT ON TABLE bid_project_members IS 'Project membership and permissions for RLS';
COMMENT ON TABLE ai_runs IS 'Audit log of all AI operations for debugging and cost tracking';
COMMENT ON FUNCTION claim_documents_for_processing IS 'Atomic document claiming with SKIP LOCKED to prevent duplicate processing';
COMMENT ON FUNCTION reset_stuck_documents IS 'Resets documents stuck in PROCESSING state';
COMMENT ON FUNCTION user_has_project_access IS 'Check if user has access to project with optional permission check';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Bid Intelligence Schema Fixes v1.1 completed successfully';
END $$;
