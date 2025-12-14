-- =============================================================================
-- Migration: 117_davis_bacon_schema_completion.sql
-- Purpose: Complete Davis-Bacon schema - certified_payroll_lines table,
--          missing columns, and seed data for prevailing wage rates
-- Date: December 14, 2024
-- =============================================================================

-- =============================================================================
-- PART 1: Add missing columns to certified_payrolls
-- The Edge function certified-payroll-generate expects these columns
-- =============================================================================

-- Add all potentially missing columns
ALTER TABLE public.certified_payrolls
    ADD COLUMN IF NOT EXISTS contractor_name TEXT,
    ADD COLUMN IF NOT EXISTS contractor_address TEXT,
    ADD COLUMN IF NOT EXISTS project_name TEXT,
    ADD COLUMN IF NOT EXISTS project_location TEXT,
    ADD COLUMN IF NOT EXISTS total_workers INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gross_pay DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_fringe_owed DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS wage_determination_number TEXT,
    ADD COLUMN IF NOT EXISTS contract_number TEXT,
    ADD COLUMN IF NOT EXISTS total_employees INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_hours DECIMAL(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_gross DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_fringe DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_deductions DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_net DECIMAL(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS certifier_signature_url TEXT,
    ADD COLUMN IF NOT EXISTS submission_method TEXT,
    ADD COLUMN IF NOT EXISTS pdf_url TEXT,
    ADD COLUMN IF NOT EXISTS supporting_docs TEXT[],
    ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS certifier_name TEXT,
    ADD COLUMN IF NOT EXISTS certifier_title TEXT,
    ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS submitted_to TEXT,
    ADD COLUMN IF NOT EXISTS submitted_by UUID;

-- Change payroll_number to TEXT to support "CP-001" format (if it's INTEGER)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'certified_payrolls'
          AND column_name = 'payroll_number'
          AND data_type = 'integer'
    ) THEN
        ALTER TABLE public.certified_payrolls
            ALTER COLUMN payroll_number TYPE TEXT USING 'CP-' || LPAD(payroll_number::TEXT, 3, '0');
    END IF;
END $$;

-- Update status check constraint to match Edge function expectations (both cases)
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'certified_payrolls_status_check'
    ) THEN
        ALTER TABLE public.certified_payrolls DROP CONSTRAINT certified_payrolls_status_check;
    END IF;

    -- Add constraint that accepts both upper and lower case
    ALTER TABLE public.certified_payrolls
        ADD CONSTRAINT certified_payrolls_status_check
        CHECK (status IN ('DRAFT', 'GENERATED', 'REVIEWED', 'CERTIFIED', 'SUBMITTED', 'ACCEPTED', 'REJECTED',
                          'draft', 'generated', 'reviewed', 'certified', 'submitted', 'accepted', 'rejected'));
EXCEPTION
    WHEN others THEN
        -- Ignore if constraint already exists or other issues
        NULL;
END $$;

-- =============================================================================
-- PART 2: Create certified_payroll_lines table
-- WH-347 individual employee line items
-- =============================================================================

-- Drop if partially created from previous run
DROP TABLE IF EXISTS public.certified_payroll_lines CASCADE;

CREATE TABLE public.certified_payroll_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_id UUID NOT NULL REFERENCES public.certified_payrolls(id) ON DELETE CASCADE,

    -- Line identification
    line_number INTEGER NOT NULL,

    -- Employee information
    employee_name TEXT NOT NULL,
    crew_member_id UUID REFERENCES public.employees(id),
    address TEXT,
    ssn_last_four TEXT, -- Last 4 digits only for security

    -- Work classification (Davis-Bacon)
    work_classification TEXT NOT NULL,

    -- Wage rates
    hourly_rate DECIMAL(10, 2) NOT NULL,
    fringe_rate DECIMAL(10, 2) DEFAULT 0,

    -- Hours by day (Saturday - Friday, WH-347 format)
    sat_hours DECIMAL(4, 2) DEFAULT 0,
    sun_hours DECIMAL(4, 2) DEFAULT 0,
    mon_hours DECIMAL(4, 2) DEFAULT 0,
    tue_hours DECIMAL(4, 2) DEFAULT 0,
    wed_hours DECIMAL(4, 2) DEFAULT 0,
    thu_hours DECIMAL(4, 2) DEFAULT 0,
    fri_hours DECIMAL(4, 2) DEFAULT 0,

    -- Totals
    total_hours DECIMAL(6, 2) GENERATED ALWAYS AS (
        COALESCE(sat_hours, 0) + COALESCE(sun_hours, 0) + COALESCE(mon_hours, 0) +
        COALESCE(tue_hours, 0) + COALESCE(wed_hours, 0) + COALESCE(thu_hours, 0) +
        COALESCE(fri_hours, 0)
    ) STORED,
    regular_hours DECIMAL(6, 2) DEFAULT 0,
    overtime_hours DECIMAL(6, 2) DEFAULT 0,

    -- Pay calculations
    gross_pay DECIMAL(12, 2) NOT NULL,
    fringe_owed DECIMAL(12, 2) DEFAULT 0,

    -- Deductions
    fica_deduction DECIMAL(10, 2) DEFAULT 0,
    federal_tax DECIMAL(10, 2) DEFAULT 0,
    state_tax DECIMAL(10, 2) DEFAULT 0,
    other_deductions DECIMAL(10, 2) DEFAULT 0,
    total_deductions DECIMAL(10, 2) GENERATED ALWAYS AS (
        COALESCE(fica_deduction, 0) + COALESCE(federal_tax, 0) +
        COALESCE(state_tax, 0) + COALESCE(other_deductions, 0)
    ) STORED,

    -- Net pay
    net_pay DECIMAL(12, 2) NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payroll_lines_payroll ON public.certified_payroll_lines(payroll_id);
CREATE INDEX idx_payroll_lines_employee ON public.certified_payroll_lines(crew_member_id);
CREATE INDEX idx_payroll_lines_line_number ON public.certified_payroll_lines(payroll_id, line_number);

-- RLS
ALTER TABLE public.certified_payroll_lines ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Deny all by default" ON public.certified_payroll_lines;
DROP POLICY IF EXISTS "payroll_lines_select" ON public.certified_payroll_lines;
DROP POLICY IF EXISTS "payroll_lines_manage" ON public.certified_payroll_lines;

CREATE POLICY "payroll_lines_select" ON public.certified_payroll_lines FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.certified_payrolls cp
            WHERE cp.id = certified_payroll_lines.payroll_id
            AND cp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "payroll_lines_manage" ON public.certified_payroll_lines FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.certified_payrolls cp
            WHERE cp.id = certified_payroll_lines.payroll_id
            AND cp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Updated at trigger
DROP TRIGGER IF EXISTS payroll_lines_updated_at ON public.certified_payroll_lines;
CREATE TRIGGER payroll_lines_updated_at
    BEFORE UPDATE ON public.certified_payroll_lines
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PART 3: Seed prevailing wage rates for WV
-- Based on 2024 Davis-Bacon wage determinations for heavy construction
-- =============================================================================

-- Get sandbox organization ID
DO $$
DECLARE
    v_org_id UUID := 'a0000000-0000-0000-0000-000000000001';
BEGIN
    -- Only insert if organization exists and no wage rates yet
    IF EXISTS (SELECT 1 FROM public.organizations WHERE id = v_org_id) THEN
        IF NOT EXISTS (SELECT 1 FROM public.prevailing_wage_rates WHERE organization_id = v_org_id) THEN
            INSERT INTO public.prevailing_wage_rates (
                organization_id,
                wage_determination_number,
                modification_number,
                work_classification,
                classification_title,
                group_number,
                base_rate,
                fringe_rate,
                effective_date,
                counties,
                is_active
            ) VALUES
            -- Equipment Operators (Group 1 - Heavy)
            (v_org_id, 'WV20240001', 0, 'equipment_operator', 'Power Equipment Operator - Group 1', '1',
             34.25, 16.45, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Equipment Operators (Group 2 - Medium)
            (v_org_id, 'WV20240001', 0, 'equipment_operator', 'Power Equipment Operator - Group 2', '2',
             32.50, 15.85, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Laborers (Group 1 - General)
            (v_org_id, 'WV20240001', 0, 'laborer', 'Laborer - Group 1', '1',
             22.45, 12.85, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Laborers (Group 2 - Semi-Skilled)
            (v_org_id, 'WV20240001', 0, 'laborer', 'Laborer - Group 2', '2',
             24.15, 12.85, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Laborers (Group 3 - Skilled)
            (v_org_id, 'WV20240001', 0, 'laborer', 'Laborer - Group 3', '3',
             25.90, 12.85, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Truck Drivers
            (v_org_id, 'WV20240001', 0, 'truck_driver', 'Truck Driver - Heavy', NULL,
             24.50, 11.25, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Cement Masons
            (v_org_id, 'WV20240001', 0, 'cement_mason', 'Cement Mason/Concrete Finisher', NULL,
             27.90, 14.65, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Carpenters
            (v_org_id, 'WV20240001', 0, 'carpenter', 'Carpenter', NULL,
             28.45, 14.95, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Ironworkers
            (v_org_id, 'WV20240001', 0, 'ironworker', 'Ironworker - Structural', NULL,
             32.80, 18.50, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Electricians
            (v_org_id, 'WV20240001', 0, 'electrician', 'Electrician', NULL,
             35.75, 19.25, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Painters
            (v_org_id, 'WV20240001', 0, 'painter', 'Painter', NULL,
             23.50, 11.75, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Pipefitters/Plumbers
            (v_org_id, 'WV20240001', 0, 'pipefitter', 'Pipefitter', NULL,
             34.20, 18.90, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            (v_org_id, 'WV20240001', 0, 'plumber', 'Plumber', NULL,
             33.85, 18.50, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Roofers
            (v_org_id, 'WV20240001', 0, 'roofer', 'Roofer', NULL,
             26.40, 13.20, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Welders
            (v_org_id, 'WV20240001', 0, 'welder', 'Welder', NULL,
             31.50, 16.75, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Foreman (premium over trade base)
            (v_org_id, 'WV20240001', 0, 'foreman', 'Foreman', NULL,
             38.50, 18.50, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true),

            -- Superintendent
            (v_org_id, 'WV20240001', 0, 'superintendent', 'Superintendent', NULL,
             45.00, 20.00, '2024-01-01', ARRAY['Kanawha', 'Putnam', 'Cabell', 'Mason', 'Wayne'], true);
        END IF;
    END IF;
END $$;

-- =============================================================================
-- PART 4: View for certified payroll report
-- =============================================================================

CREATE OR REPLACE VIEW public.v_certified_payroll_report AS
SELECT
    cp.id AS payroll_id,
    cp.payroll_number,
    cp.week_ending_date,
    cp.contractor_name,
    cp.contractor_address,
    cp.project_name,
    cp.project_location,
    cp.contract_number,
    cp.wage_determination_number,
    cp.status,
    cp.total_workers,
    cp.total_hours,
    COALESCE(cp.total_gross_pay, cp.total_gross) AS total_gross_pay,
    COALESCE(cp.total_fringe_owed, cp.total_fringe) AS total_fringe_owed,
    cp.total_deductions,
    cp.total_net,
    cp.certified_at,
    cp.certifier_name,
    cp.certifier_title,
    cp.submitted_at,
    cp.submitted_to,
    p.name AS project_display_name,
    p.project_number,
    o.name AS organization_name
FROM public.certified_payrolls cp
JOIN public.projects p ON cp.project_id = p.id
JOIN public.organizations o ON cp.organization_id = o.id;

-- =============================================================================
-- PART 5: Comments
-- =============================================================================

COMMENT ON TABLE public.certified_payroll_lines IS
    'WH-347 certified payroll line items - individual employee records per payroll';

COMMENT ON COLUMN public.certified_payroll_lines.ssn_last_four IS
    'Last 4 digits of SSN only - full SSN should never be stored';

COMMENT ON COLUMN public.certified_payroll_lines.work_classification IS
    'Davis-Bacon work classification matching prevailing wage determination';

-- =============================================================================
-- Summary
-- =============================================================================
-- This migration:
-- 1. Adds missing columns to certified_payrolls (contractor_name, project_name, etc.)
-- 2. Creates certified_payroll_lines table for WH-347 line items
-- 3. Seeds WV prevailing wage rates for common construction trades
-- 4. Creates view for certified payroll reporting
-- =============================================================================
