-- =============================================================================
-- Migration 084: Add Missing Columns for Workforce/Safety Components
-- =============================================================================
-- This migration adds columns that are referenced by the application code but
-- missing from the remote database due to schema drift.
-- =============================================================================

-- =============================================================================
-- PART 1: Subcontractors Table - Add Insurance Expiration and Compliance Status
-- =============================================================================

-- Add general_liability_exp column for COI tracking
ALTER TABLE public.subcontractors
ADD COLUMN IF NOT EXISTS general_liability_exp DATE;

-- Add workers_comp_exp column for workers comp tracking
ALTER TABLE public.subcontractors
ADD COLUMN IF NOT EXISTS workers_comp_exp DATE;

-- Add auto_liability_exp column for auto liability tracking
ALTER TABLE public.subcontractors
ADD COLUMN IF NOT EXISTS auto_liability_exp DATE;

-- Add compliance_status column using existing enum
-- Note: compliance_status enum already exists with values:
-- compliant, incomplete, expired, pending_review, suspended
ALTER TABLE public.subcontractors
ADD COLUMN IF NOT EXISTS compliance_status public.compliance_status DEFAULT 'incomplete';

-- Add compliance_issues array for tracking specific issues
ALTER TABLE public.subcontractors
ADD COLUMN IF NOT EXISTS compliance_issues TEXT[];

-- Add last_compliance_check timestamp
ALTER TABLE public.subcontractors
ADD COLUMN IF NOT EXISTS last_compliance_check TIMESTAMPTZ;

-- =============================================================================
-- PART 2: Subcontractor Workers Table - Add OSHA and Competent Person Fields
-- =============================================================================

-- Add OSHA 10 fields
ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS has_osha_10 BOOLEAN DEFAULT false;

ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS osha_10_exp DATE;

ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS osha_10_card_url TEXT;

-- Add OSHA 30 fields
ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS has_osha_30 BOOLEAN DEFAULT false;

ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS osha_30_exp DATE;

ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS osha_30_card_url TEXT;

-- Add competent person fields
ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS is_competent_person BOOLEAN DEFAULT false;

ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS competent_person_types TEXT[];

-- Add First Aid/CPR fields
ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS has_first_aid_cpr BOOLEAN DEFAULT false;

ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS first_aid_cpr_exp DATE;

-- Add site orientation fields (may already exist as different columns)
ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS site_orientation_completed BOOLEAN DEFAULT false;

ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS badge_number TEXT;

ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS badge_issued_date DATE;

-- Add is_active column if missing
ALTER TABLE public.subcontractor_workers
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =============================================================================
-- PART 3: Add Indexes for New Columns
-- =============================================================================

-- Index for finding subs with expiring insurance
CREATE INDEX IF NOT EXISTS idx_subcontractors_gl_exp
ON public.subcontractors(general_liability_exp)
WHERE general_liability_exp IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subcontractors_wc_exp
ON public.subcontractors(workers_comp_exp)
WHERE workers_comp_exp IS NOT NULL;

-- Index for compliance status queries
CREATE INDEX IF NOT EXISTS idx_subcontractors_compliance
ON public.subcontractors(compliance_status);

-- Index for active subcontractor workers
CREATE INDEX IF NOT EXISTS idx_sub_workers_active
ON public.subcontractor_workers(is_active)
WHERE is_active = true;

-- Index for competent person queries
CREATE INDEX IF NOT EXISTS idx_sub_workers_competent
ON public.subcontractor_workers(is_competent_person)
WHERE is_competent_person = true;

-- =============================================================================
-- PART 4: Add Comments for Documentation
-- =============================================================================

COMMENT ON COLUMN public.subcontractors.general_liability_exp IS 'General liability insurance expiration date';
COMMENT ON COLUMN public.subcontractors.workers_comp_exp IS 'Workers compensation insurance expiration date';
COMMENT ON COLUMN public.subcontractors.auto_liability_exp IS 'Auto liability insurance expiration date';
COMMENT ON COLUMN public.subcontractors.compliance_status IS 'Overall compliance status: compliant, incomplete, expired, pending_review, suspended';
COMMENT ON COLUMN public.subcontractors.compliance_issues IS 'Array of current compliance issues';
COMMENT ON COLUMN public.subcontractors.last_compliance_check IS 'Timestamp of last compliance status check';

COMMENT ON COLUMN public.subcontractor_workers.has_osha_10 IS 'Whether worker has OSHA 10-hour certification';
COMMENT ON COLUMN public.subcontractor_workers.osha_10_exp IS 'OSHA 10 certification expiration date';
COMMENT ON COLUMN public.subcontractor_workers.has_osha_30 IS 'Whether worker has OSHA 30-hour certification';
COMMENT ON COLUMN public.subcontractor_workers.osha_30_exp IS 'OSHA 30 certification expiration date';
COMMENT ON COLUMN public.subcontractor_workers.is_competent_person IS 'Whether worker is designated as competent person';
COMMENT ON COLUMN public.subcontractor_workers.competent_person_types IS 'Types of work for which worker is competent person';
COMMENT ON COLUMN public.subcontractor_workers.is_active IS 'Whether worker is active and available for assignments';
