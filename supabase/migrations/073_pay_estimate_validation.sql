-- =============================================================================
-- Migration 073: Pay Estimate Ingestion Validation Layer
-- Pay Estimate + Bid Integration Module - Phase 7
-- =============================================================================
-- Per UNIFIED_MODULE_SPECIFICATION V7.0 Section 4.8
-- Creates: validation_status enum, pay_period_validations table,
--          validation columns on pay_periods, override functions
-- =============================================================================
--
-- VALIDATION RULES:
-- | Check           | Formula                                           | Tolerance |
-- |-----------------|---------------------------------------------------|-----------|
-- | Line Item Sum   | SUM(line_items.current_amount) = summary.total    | ±$0.02    |
-- | Previous Balance| SUM(line_items.previous_amount) = summary.prev    | ±$0.02    |
-- | To Date Total   | SUM(line_items.to_date_amount) = summary.to_date  | ±$0.02    |
-- | Quantity Check  | current_qty × unit_price = current_amount         | ±$0.01    |
-- | Stockpile Delta | previous_stockpile - current = stockpile_installed| ±$0.01    |
-- | Net Calculation | to_date - retainage - prev_payments = net_period  | ±$0.02    |
-- =============================================================================

-- ============================================================================
-- PART 1: VALIDATION STATUS ENUM
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.validation_status AS ENUM (
        'pending',           -- Not yet validated
        'passed',            -- All validations passed
        'failed_math',       -- Sum/calculation mismatch
        'failed_missing_data', -- Required fields missing
        'manual_override',   -- Approved despite failures
        'reprocessing'       -- Being re-extracted
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: ADD VALIDATION COLUMNS TO PAY_PERIODS
-- ============================================================================

ALTER TABLE public.pay_periods
    ADD COLUMN IF NOT EXISTS validation_status public.validation_status DEFAULT 'pending';

ALTER TABLE public.pay_periods
    ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]';

ALTER TABLE public.pay_periods
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

ALTER TABLE public.pay_periods
    ADD COLUMN IF NOT EXISTS validated_by UUID REFERENCES auth.users(id);

ALTER TABLE public.pay_periods
    ADD COLUMN IF NOT EXISTS override_reason TEXT;

-- Index for pending validations
CREATE INDEX IF NOT EXISTS idx_pay_periods_validation
    ON public.pay_periods(validation_status)
    WHERE validation_status IN ('pending', 'failed_math', 'failed_missing_data');

-- ============================================================================
-- PART 3: PAY_PERIOD_VALIDATIONS — Audit Log for All Validation Attempts
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pay_period_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pay_period_id UUID REFERENCES public.pay_periods(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,

    -- Extracted Values (from Claude/OCR)
    extracted_line_item_sum NUMERIC(14,2),
    extracted_summary_total NUMERIC(14,2),
    extracted_previous_sum NUMERIC(14,2),
    extracted_previous_total NUMERIC(14,2),
    extracted_to_date_sum NUMERIC(14,2),
    extracted_to_date_total NUMERIC(14,2),
    extracted_stockpile_previous NUMERIC(14,2),
    extracted_stockpile_current NUMERIC(14,2),
    extracted_net_pay NUMERIC(14,2),

    -- Validation Results (per check)
    line_item_sum_valid BOOLEAN,
    previous_sum_valid BOOLEAN,
    to_date_sum_valid BOOLEAN,
    stockpile_delta_valid BOOLEAN,
    net_calculation_valid BOOLEAN,
    all_line_calcs_valid BOOLEAN,

    -- Discrepancies
    line_item_discrepancy NUMERIC(14,2),
    previous_discrepancy NUMERIC(14,2),
    to_date_discrepancy NUMERIC(14,2),
    net_discrepancy NUMERIC(14,2),
    failed_line_items JSONB DEFAULT '[]',  -- [{item_number, expected, actual, discrepancy}]

    -- Result
    overall_status public.validation_status NOT NULL,
    error_messages TEXT[],
    warning_messages TEXT[],

    -- Source
    source_document_url TEXT,
    extraction_method TEXT DEFAULT 'claude-pdf',  -- 'claude-pdf', 'ocr', 'manual'

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    raw_extraction JSONB  -- Full extraction response for debugging
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_validations_pay_period
    ON public.pay_period_validations(pay_period_id);
CREATE INDEX IF NOT EXISTS idx_validations_status
    ON public.pay_period_validations(overall_status);
CREATE INDEX IF NOT EXISTS idx_validations_created
    ON public.pay_period_validations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validations_failed
    ON public.pay_period_validations(overall_status)
    WHERE overall_status IN ('failed_math', 'failed_missing_data');

-- ============================================================================
-- PART 4: VALIDATION FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_pay_period(p_pay_period_id UUID)
RETURNS public.validation_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pp RECORD;
    v_line_sum NUMERIC;
    v_prev_sum NUMERIC;
    v_to_date_sum NUMERIC;
    v_errors TEXT[] := ARRAY[]::TEXT[];
    v_warnings TEXT[] := ARRAY[]::TEXT[];
    v_failed_lines JSONB := '[]'::JSONB;
    v_line RECORD;
    v_expected NUMERIC;
    v_discrepancy NUMERIC;
    v_status public.validation_status;
    v_tolerance NUMERIC := 0.02;
    v_line_tolerance NUMERIC := 0.01;
BEGIN
    -- Get pay period with summary totals
    SELECT * INTO v_pp FROM public.pay_periods WHERE id = p_pay_period_id;

    IF v_pp IS NULL THEN
        RAISE EXCEPTION 'Pay period not found: %', p_pay_period_id;
    END IF;

    -- Calculate sums from line items
    SELECT
        COALESCE(SUM(this_estimate_amount), 0),
        COALESCE(SUM(previous_qty * unit_price), 0),
        COALESCE(SUM(total_to_date_amount), 0)
    INTO v_line_sum, v_prev_sum, v_to_date_sum
    FROM public.pay_period_line_items
    WHERE pay_period_id = p_pay_period_id;

    -- Check 1: Line item sum vs posted item pay
    IF v_pp.posted_item_pay IS NOT NULL THEN
        v_discrepancy := ABS(v_line_sum - v_pp.posted_item_pay);
        IF v_discrepancy > v_tolerance THEN
            v_errors := array_append(v_errors,
                format('Line item sum ($%s) does not match posted item pay ($%s). Discrepancy: $%s',
                    v_line_sum, v_pp.posted_item_pay, v_discrepancy));
        END IF;
    END IF;

    -- Check 2: Cumulative totals
    IF v_pp.cumulative_posted_item_pay IS NOT NULL THEN
        v_discrepancy := ABS(v_to_date_sum - v_pp.cumulative_posted_item_pay);
        IF v_discrepancy > v_tolerance THEN
            v_errors := array_append(v_errors,
                format('To-date sum ($%s) does not match cumulative ($%s). Discrepancy: $%s',
                    v_to_date_sum, v_pp.cumulative_posted_item_pay, v_discrepancy));
        END IF;
    END IF;

    -- Check 3: Individual line items (qty × price = amount)
    FOR v_line IN
        SELECT line_number, item_number, this_estimate_qty, unit_price, this_estimate_amount
        FROM public.pay_period_line_items
        WHERE pay_period_id = p_pay_period_id
          AND this_estimate_qty IS NOT NULL
          AND this_estimate_qty != 0
    LOOP
        v_expected := v_line.this_estimate_qty * v_line.unit_price;
        v_discrepancy := ABS(v_expected - v_line.this_estimate_amount);

        IF v_discrepancy > v_line_tolerance THEN
            v_failed_lines := v_failed_lines || jsonb_build_object(
                'item_number', v_line.item_number,
                'line_number', v_line.line_number,
                'expected', v_expected,
                'actual', v_line.this_estimate_amount,
                'discrepancy', v_discrepancy
            );
        END IF;
    END LOOP;

    IF jsonb_array_length(v_failed_lines) > 0 THEN
        v_errors := array_append(v_errors,
            format('%s line items failed qty × price validation', jsonb_array_length(v_failed_lines)));
    END IF;

    -- Check 4: Required fields
    IF v_pp.estimate_number IS NULL THEN
        v_errors := array_append(v_errors, 'Missing estimate number');
    END IF;
    IF v_pp.period_end_date IS NULL THEN
        v_errors := array_append(v_errors, 'Missing period end date');
    END IF;
    IF v_line_sum = 0 AND v_pp.posted_item_pay > 0 THEN
        v_errors := array_append(v_errors, 'No line items found but posted item pay > 0');
    END IF;

    -- Determine status
    IF array_length(v_errors, 1) > 0 THEN
        IF EXISTS (SELECT 1 FROM unnest(v_errors) e WHERE e LIKE 'Missing%' OR e LIKE 'No line items%') THEN
            v_status := 'failed_missing_data';
        ELSE
            v_status := 'failed_math';
        END IF;
    ELSE
        v_status := 'passed';
    END IF;

    -- Log validation attempt
    INSERT INTO public.pay_period_validations (
        pay_period_id,
        attempt_number,
        extracted_line_item_sum,
        extracted_summary_total,
        extracted_to_date_sum,
        extracted_to_date_total,
        line_item_sum_valid,
        to_date_sum_valid,
        all_line_calcs_valid,
        line_item_discrepancy,
        to_date_discrepancy,
        failed_line_items,
        overall_status,
        error_messages,
        warning_messages,
        created_by
    ) VALUES (
        p_pay_period_id,
        COALESCE((SELECT MAX(attempt_number) + 1 FROM public.pay_period_validations WHERE pay_period_id = p_pay_period_id), 1),
        v_line_sum,
        v_pp.posted_item_pay,
        v_to_date_sum,
        v_pp.cumulative_posted_item_pay,
        v_pp.posted_item_pay IS NULL OR ABS(v_line_sum - v_pp.posted_item_pay) <= v_tolerance,
        v_pp.cumulative_posted_item_pay IS NULL OR ABS(v_to_date_sum - v_pp.cumulative_posted_item_pay) <= v_tolerance,
        jsonb_array_length(v_failed_lines) = 0,
        CASE WHEN v_pp.posted_item_pay IS NOT NULL THEN ABS(v_line_sum - v_pp.posted_item_pay) ELSE 0 END,
        CASE WHEN v_pp.cumulative_posted_item_pay IS NOT NULL THEN ABS(v_to_date_sum - v_pp.cumulative_posted_item_pay) ELSE 0 END,
        v_failed_lines,
        v_status,
        v_errors,
        v_warnings,
        auth.uid()
    );

    -- Update pay_period
    UPDATE public.pay_periods SET
        validation_status = v_status,
        validation_errors = to_jsonb(v_errors),
        validated_at = NOW(),
        validated_by = auth.uid()
    WHERE id = p_pay_period_id;

    RETURN v_status;
END;
$$;

-- ============================================================================
-- PART 5: MANUAL OVERRIDE FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_validation_override(
    p_pay_period_id UUID,
    p_override_reason TEXT,
    p_corrected_line_items JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pp RECORD;
BEGIN
    -- Check pay period exists and is in failed state
    SELECT * INTO v_pp FROM public.pay_periods WHERE id = p_pay_period_id;

    IF v_pp IS NULL THEN
        RAISE EXCEPTION 'Pay period not found: %', p_pay_period_id;
    END IF;

    IF v_pp.validation_status NOT IN ('failed_math', 'failed_missing_data') THEN
        RAISE EXCEPTION 'Pay period is not in a failed validation state. Current status: %', v_pp.validation_status;
    END IF;

    IF p_override_reason IS NULL OR length(trim(p_override_reason)) < 10 THEN
        RAISE EXCEPTION 'Override reason must be at least 10 characters';
    END IF;

    -- Update pay_period
    UPDATE public.pay_periods SET
        validation_status = 'manual_override',
        override_reason = p_override_reason,
        validated_at = NOW(),
        validated_by = auth.uid(),
        status = CASE
            WHEN status = 'PRELIMINARY_RECEIVED' THEN 'PRELIMINARY_RECEIVED'
            ELSE status
        END
    WHERE id = p_pay_period_id;

    -- If corrected line items provided, replace existing
    IF p_corrected_line_items IS NOT NULL AND jsonb_array_length(p_corrected_line_items) > 0 THEN
        -- Delete existing line items
        DELETE FROM public.pay_period_line_items WHERE pay_period_id = p_pay_period_id;

        -- Insert corrected line items
        INSERT INTO public.pay_period_line_items (
            pay_period_id,
            line_number,
            item_number,
            description,
            unit,
            unit_price,
            plan_qty,
            previous_qty,
            this_estimate_qty,
            this_estimate_amount,
            total_to_date_qty,
            total_to_date_amount
        )
        SELECT
            p_pay_period_id,
            item->>'line_number',
            item->>'item_number',
            item->>'description',
            item->>'unit',
            (item->>'unit_price')::NUMERIC,
            (item->>'plan_qty')::NUMERIC,
            (item->>'previous_qty')::NUMERIC,
            (item->>'this_estimate_qty')::NUMERIC,
            (item->>'this_estimate_amount')::NUMERIC,
            (item->>'total_to_date_qty')::NUMERIC,
            (item->>'total_to_date_amount')::NUMERIC
        FROM jsonb_array_elements(p_corrected_line_items) AS item;
    END IF;

    -- Log the override
    INSERT INTO public.pay_period_validations (
        pay_period_id,
        attempt_number,
        overall_status,
        error_messages,
        created_by
    ) VALUES (
        p_pay_period_id,
        COALESCE((SELECT MAX(attempt_number) + 1 FROM public.pay_period_validations WHERE pay_period_id = p_pay_period_id), 1),
        'manual_override',
        ARRAY['Override approved: ' || p_override_reason],
        auth.uid()
    );
END;
$$;

-- ============================================================================
-- PART 6: REPROCESS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reprocess_pay_period_validation(p_pay_period_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Mark as reprocessing
    UPDATE public.pay_periods SET
        validation_status = 'reprocessing',
        validation_errors = '[]'::JSONB,
        validated_at = NULL,
        validated_by = NULL
    WHERE id = p_pay_period_id;

    -- Log
    INSERT INTO public.pay_period_validations (
        pay_period_id,
        attempt_number,
        overall_status,
        error_messages,
        created_by
    ) VALUES (
        p_pay_period_id,
        COALESCE((SELECT MAX(attempt_number) + 1 FROM public.pay_period_validations WHERE pay_period_id = p_pay_period_id), 1),
        'reprocessing',
        ARRAY['Reprocessing initiated'],
        auth.uid()
    );
END;
$$;

-- ============================================================================
-- PART 7: PENDING VALIDATIONS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.v_pending_validations AS
SELECT
    pp.id AS pay_period_id,
    pp.organization_id,
    p.name AS project_name,
    p.contract_number,
    pp.estimate_number,
    pp.period_end_date AS period_ending_date,
    pp.validation_status,
    pp.validation_errors,
    pp.posted_item_pay,
    pp.net_pay_amount,
    ppv.line_item_discrepancy,
    ppv.to_date_discrepancy,
    jsonb_array_length(COALESCE(ppv.failed_line_items, '[]'::JSONB)) AS failed_line_count,
    ppv.failed_line_items,
    ppv.error_messages,
    ppv.created_at AS uploaded_at,
    up.email AS uploaded_by_email,
    up.first_name || ' ' || up.last_name AS uploaded_by_name,
    pp.preliminary_document_url AS pdf_url,
    ppv.attempt_number
FROM public.pay_periods pp
JOIN public.projects p ON pp.project_id = p.id
LEFT JOIN LATERAL (
    SELECT * FROM public.pay_period_validations
    WHERE pay_period_id = pp.id
    ORDER BY created_at DESC
    LIMIT 1
) ppv ON TRUE
LEFT JOIN public.user_profiles up ON pp.created_by = up.id
WHERE pp.validation_status IN ('pending', 'failed_math', 'failed_missing_data', 'reprocessing')
ORDER BY ppv.created_at DESC NULLS LAST;

COMMENT ON VIEW public.v_pending_validations IS 'Dashboard view of pay periods awaiting validation or review';

-- ============================================================================
-- PART 8: VALIDATION SUMMARY VIEW
-- ============================================================================

CREATE OR REPLACE VIEW public.v_validation_summary AS
SELECT
    pp.organization_id,
    p.id AS project_id,
    p.name AS project_name,
    COUNT(*) FILTER (WHERE pp.validation_status = 'passed') AS passed_count,
    COUNT(*) FILTER (WHERE pp.validation_status = 'failed_math') AS failed_math_count,
    COUNT(*) FILTER (WHERE pp.validation_status = 'failed_missing_data') AS failed_missing_count,
    COUNT(*) FILTER (WHERE pp.validation_status = 'manual_override') AS override_count,
    COUNT(*) FILTER (WHERE pp.validation_status = 'pending') AS pending_count,
    COUNT(*) AS total_count,
    ROUND(
        COUNT(*) FILTER (WHERE pp.validation_status = 'passed')::NUMERIC /
        NULLIF(COUNT(*) FILTER (WHERE pp.validation_status != 'pending'), 0) * 100,
        1
    ) AS pass_rate_pct
FROM public.pay_periods pp
JOIN public.projects p ON pp.project_id = p.id
GROUP BY pp.organization_id, p.id, p.name;

COMMENT ON VIEW public.v_validation_summary IS 'Summary statistics of validation outcomes by project';

-- ============================================================================
-- PART 9: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.pay_period_validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ppv_select" ON public.pay_period_validations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.pay_periods pp
            WHERE pp.id = pay_period_validations.pay_period_id
              AND pp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

CREATE POLICY "ppv_insert" ON public.pay_period_validations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pay_periods pp
            WHERE pp.id = pay_period_validations.pay_period_id
              AND pp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- PART 10: TRIGGER TO AUTO-VALIDATE ON LINE ITEM INSERT
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_validate_after_line_items()
RETURNS TRIGGER AS $$
DECLARE
    v_line_count INTEGER;
BEGIN
    -- Count total line items for this pay period
    SELECT COUNT(*) INTO v_line_count
    FROM public.pay_period_line_items
    WHERE pay_period_id = NEW.pay_period_id;

    -- If this is a batch insert (more than 5 items), trigger validation
    -- This assumes bulk inserts happen in a transaction
    IF v_line_count >= 5 THEN
        -- Only validate if still in pending status
        IF EXISTS (
            SELECT 1 FROM public.pay_periods
            WHERE id = NEW.pay_period_id
              AND validation_status = 'pending'
        ) THEN
            PERFORM public.validate_pay_period(NEW.pay_period_id);
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Don't auto-validate on every insert to avoid performance issues
-- Instead, call validate_pay_period() explicitly after bulk insert
-- DROP TRIGGER IF EXISTS trg_auto_validate ON public.pay_period_line_items;
-- CREATE TRIGGER trg_auto_validate
--     AFTER INSERT ON public.pay_period_line_items
--     FOR EACH ROW
--     EXECUTE FUNCTION public.auto_validate_after_line_items();

-- ============================================================================
-- PART 11: COMMENTS
-- ============================================================================

COMMENT ON TYPE public.validation_status IS 'Status of pay period data validation';
COMMENT ON TABLE public.pay_period_validations IS 'Audit log of all validation attempts for pay periods';
COMMENT ON FUNCTION public.validate_pay_period IS 'Run validation checks on a pay period and log results';
COMMENT ON FUNCTION public.approve_validation_override IS 'Approve a failed validation with manual override and reason';
COMMENT ON FUNCTION public.reprocess_pay_period_validation IS 'Mark a pay period for re-extraction and re-validation';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 073: Pay Estimate Validation Layer completed successfully' as status;
