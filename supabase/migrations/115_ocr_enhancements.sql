-- =============================================================================
-- Migration: 115_ocr_enhancements.sql
-- Purpose: Enhanced OCR processing with batch support, AI validation, auto-matching
-- =============================================================================

-- =====================================================
-- SECTION 1: OCR BATCH PROCESSING TABLES
-- =====================================================

-- OCR Batch Jobs - Track batch processing jobs
CREATE TABLE IF NOT EXISTS public.ocr_batch_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    batch_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETE', 'PARTIAL', 'FAILED', 'CANCELLED')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    total_documents INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    notify_on_complete BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OCR Queue - Individual documents in batch
CREATE TABLE IF NOT EXISTS public.ocr_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.ocr_batch_jobs(id) ON DELETE CASCADE,
    document_url TEXT NOT NULL,
    document_type TEXT NOT NULL CHECK (document_type IN ('DELIVERY_TICKET', 'BATCH_TICKET', 'ASPHALT_TICKET', 'WEIGHT_TICKET', 'INVOICE')),
    reference_number TEXT,
    sequence_number INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED', 'SKIPPED')),
    project_id UUID REFERENCES public.projects(id),
    supplier_id UUID REFERENCES public.suppliers(id),
    ticket_id UUID REFERENCES public.material_tickets(id),
    ocr_confidence NUMERIC(5,2),
    error_message TEXT,
    processing_time_ms INTEGER,
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- SECTION 2: ENHANCED OCR EXTRACTIONS TABLE
-- =====================================================

-- Drop and recreate ocr_extractions with enhanced fields
ALTER TABLE IF EXISTS public.ocr_extractions
    ADD COLUMN IF NOT EXISTS field_confidences JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS validation_issues JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS ai_corrections JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS ocr_provider TEXT,
    ADD COLUMN IF NOT EXISTS processing_duration_ms INTEGER;

-- =====================================================
-- SECTION 3: MATERIAL TICKET ENHANCEMENTS
-- =====================================================

-- Add OCR-related fields to material_tickets if not exist
ALTER TABLE IF EXISTS public.material_tickets
    ADD COLUMN IF NOT EXISTS ocr_status TEXT DEFAULT 'PENDING' CHECK (ocr_status IN ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED', 'MANUAL')),
    ADD COLUMN IF NOT EXISTS ocr_confidence NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS ocr_provider TEXT,
    ADD COLUMN IF NOT EXISTS ocr_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS matched_po_id UUID REFERENCES public.purchase_orders(id),
    ADD COLUMN IF NOT EXISTS matched_po_confidence NUMERIC(3,2),
    ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW')),
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.user_profiles(id),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS has_variance BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS variance_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS variance_reason TEXT,
    ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'DELIVERY_TICKET';

-- =====================================================
-- SECTION 4: AUTO PO-MATCHING FUNCTION
-- =====================================================

-- Function to auto-match ticket to PO
CREATE OR REPLACE FUNCTION public.auto_match_ticket_to_po(p_ticket_id UUID)
RETURNS TABLE(
    po_id UUID,
    po_number TEXT,
    confidence NUMERIC,
    match_reason TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_ticket RECORD;
    v_match RECORD;
BEGIN
    -- Get ticket details
    SELECT mt.*, s.company_name as supplier_name
    INTO v_ticket
    FROM public.material_tickets mt
    LEFT JOIN public.suppliers s ON mt.supplier_id = s.id
    WHERE mt.id = p_ticket_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Try exact PO number match first
    IF v_ticket.matched_po_id IS NULL THEN
        -- Check for stored PO reference on ticket
        FOR v_match IN
            SELECT po.id, po.po_number, 0.95::NUMERIC as confidence, 'Exact PO number match' as match_reason
            FROM public.purchase_orders po
            WHERE po.project_id = v_ticket.project_id
              AND po.status IN ('ISSUED', 'PARTIAL')
              AND (
                  -- Match by any PO reference stored on ticket
                  po.po_number = v_ticket.vendor_ticket_number
                  OR v_ticket.vendor_ticket_number ILIKE '%' || po.po_number || '%'
              )
            LIMIT 1
        LOOP
            RETURN QUERY SELECT v_match.id, v_match.po_number, v_match.confidence, v_match.match_reason;
            RETURN;
        END LOOP;
    END IF;

    -- Try supplier + material type match
    FOR v_match IN
        SELECT DISTINCT ON (po.id)
            po.id,
            po.po_number,
            0.75::NUMERIC as confidence,
            'Supplier and material category match' as match_reason
        FROM public.purchase_orders po
        JOIN public.po_line_items pli ON po.id = pli.purchase_order_id
        WHERE po.project_id = v_ticket.project_id
          AND po.status IN ('ISSUED', 'PARTIAL')
          AND po.supplier_id = v_ticket.supplier_id
          AND (
              -- Material type/category match
              pli.material_category = v_ticket.material_type
              OR pli.description ILIKE '%' || COALESCE(v_ticket.material_type, '') || '%'
              OR v_ticket.material_description ILIKE '%' || COALESCE(pli.description, '') || '%'
          )
        ORDER BY po.id, po.created_at DESC
        LIMIT 1
    LOOP
        RETURN QUERY SELECT v_match.id, v_match.po_number, v_match.confidence, v_match.match_reason;
        RETURN;
    END LOOP;

    -- Try supplier-only match (lower confidence)
    FOR v_match IN
        SELECT po.id, po.po_number, 0.5::NUMERIC as confidence, 'Supplier match only' as match_reason
        FROM public.purchase_orders po
        WHERE po.project_id = v_ticket.project_id
          AND po.status IN ('ISSUED', 'PARTIAL')
          AND po.supplier_id = v_ticket.supplier_id
        ORDER BY po.created_at DESC
        LIMIT 1
    LOOP
        RETURN QUERY SELECT v_match.id, v_match.po_number, v_match.confidence, v_match.match_reason;
        RETURN;
    END LOOP;

    -- No match found
    RETURN;
END;
$$;

-- =====================================================
-- SECTION 5: AUTO-MATCH TRIGGER
-- =====================================================

-- Trigger function to auto-match on ticket insert/update
CREATE OR REPLACE FUNCTION public.trigger_auto_match_ticket()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_match RECORD;
BEGIN
    -- Only auto-match if OCR is complete and no PO matched yet
    IF NEW.ocr_status = 'COMPLETE' AND NEW.matched_po_id IS NULL THEN
        SELECT * INTO v_match FROM public.auto_match_ticket_to_po(NEW.id) LIMIT 1;

        IF v_match.po_id IS NOT NULL THEN
            NEW.matched_po_id := v_match.po_id;
            NEW.matched_po_confidence := v_match.confidence;

            -- Create reconciliation record if high confidence
            IF v_match.confidence >= 0.75 THEN
                INSERT INTO public.material_reconciliation (
                    ticket_id,
                    po_id,
                    ticket_quantity,
                    ticket_unit,
                    match_status,
                    match_confidence,
                    match_reason,
                    reconciled_at
                ) VALUES (
                    NEW.id,
                    v_match.po_id,
                    NEW.quantity,
                    NEW.unit_of_measure,
                    'AUTO_MATCHED',
                    v_match.confidence,
                    v_match.match_reason,
                    now()
                )
                ON CONFLICT (ticket_id, po_id) DO UPDATE SET
                    match_status = 'AUTO_MATCHED',
                    match_confidence = EXCLUDED.match_confidence,
                    match_reason = EXCLUDED.match_reason,
                    updated_at = now();
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS material_ticket_auto_match ON public.material_tickets;
CREATE TRIGGER material_ticket_auto_match
    BEFORE UPDATE ON public.material_tickets
    FOR EACH ROW
    WHEN (OLD.ocr_status IS DISTINCT FROM NEW.ocr_status)
    EXECUTE FUNCTION public.trigger_auto_match_ticket();

-- =====================================================
-- SECTION 6: VARIANCE DETECTION
-- =====================================================

-- Function to detect and flag variances
CREATE OR REPLACE FUNCTION public.detect_ticket_variance(p_ticket_id UUID)
RETURNS TABLE(
    has_variance BOOLEAN,
    variance_amount NUMERIC,
    variance_pct NUMERIC,
    variance_reason TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_ticket RECORD;
    v_po_line RECORD;
    v_variance_amount NUMERIC;
    v_variance_pct NUMERIC;
    v_tolerance NUMERIC := 0.05; -- 5% tolerance
BEGIN
    -- Get ticket with matched PO
    SELECT mt.*, po.po_number
    INTO v_ticket
    FROM public.material_tickets mt
    LEFT JOIN public.purchase_orders po ON mt.matched_po_id = po.id
    WHERE mt.id = p_ticket_id;

    IF NOT FOUND OR v_ticket.matched_po_id IS NULL THEN
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, NULL::TEXT;
        RETURN;
    END IF;

    -- Find matching PO line item
    SELECT pli.* INTO v_po_line
    FROM public.po_line_items pli
    WHERE pli.purchase_order_id = v_ticket.matched_po_id
      AND (
          pli.material_category = v_ticket.material_type
          OR pli.description ILIKE '%' || v_ticket.material_description || '%'
      )
    LIMIT 1;

    IF v_po_line IS NULL THEN
        -- No matching line item
        RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, 'No matching PO line item'::TEXT;
        RETURN;
    END IF;

    -- Check unit price variance
    IF v_ticket.unit_price IS NOT NULL AND v_po_line.unit_price IS NOT NULL THEN
        v_variance_amount := v_ticket.unit_price - v_po_line.unit_price;
        v_variance_pct := ABS(v_variance_amount) / v_po_line.unit_price;

        IF v_variance_pct > v_tolerance THEN
            RETURN QUERY SELECT true, v_variance_amount, v_variance_pct * 100,
                'Unit price variance: $' || v_variance_amount::TEXT || ' (' || (v_variance_pct * 100)::NUMERIC(5,1)::TEXT || '%)';
            RETURN;
        END IF;
    END IF;

    -- Check quantity against remaining on PO
    IF v_ticket.quantity > (v_po_line.quantity - COALESCE(v_po_line.received_quantity, 0)) * 1.1 THEN
        v_variance_amount := v_ticket.quantity - (v_po_line.quantity - COALESCE(v_po_line.received_quantity, 0));
        RETURN QUERY SELECT true, v_variance_amount,
            (v_variance_amount / GREATEST(v_po_line.quantity, 1)) * 100,
            'Quantity exceeds PO remaining: ' || v_variance_amount::TEXT || ' ' || v_ticket.unit_of_measure;
        RETURN;
    END IF;

    -- No variance
    RETURN QUERY SELECT false, 0::NUMERIC, 0::NUMERIC, NULL::TEXT;
END;
$$;

-- Trigger to auto-detect variance on reconciliation
CREATE OR REPLACE FUNCTION public.trigger_detect_variance()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_variance RECORD;
BEGIN
    IF NEW.matched_po_id IS NOT NULL THEN
        SELECT * INTO v_variance FROM public.detect_ticket_variance(NEW.id);

        IF v_variance.has_variance THEN
            NEW.has_variance := true;
            NEW.variance_amount := v_variance.variance_amount;
            NEW.variance_reason := v_variance.variance_reason;
            NEW.verification_status := 'NEEDS_REVIEW';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS material_ticket_variance_check ON public.material_tickets;
CREATE TRIGGER material_ticket_variance_check
    BEFORE INSERT OR UPDATE OF matched_po_id, quantity, unit_price ON public.material_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_detect_variance();

-- =====================================================
-- SECTION 7: OCR QUEUE STATUS VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.v_ocr_batch_status AS
SELECT
    bj.id as batch_id,
    bj.batch_name,
    bj.status,
    bj.priority,
    bj.total_documents,
    bj.processed_count,
    bj.success_count,
    bj.error_count,
    ROUND((bj.processed_count::NUMERIC / NULLIF(bj.total_documents, 0)) * 100, 1) as progress_pct,
    bj.created_at,
    bj.started_at,
    bj.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(bj.completed_at, now()) - bj.started_at))::INTEGER as duration_seconds,
    p.name as project_name,
    p.project_number,
    up.email as created_by_email,
    (
        SELECT json_agg(json_build_object(
            'id', q.id,
            'status', q.status,
            'document_type', q.document_type,
            'reference_number', q.reference_number,
            'ticket_id', q.ticket_id,
            'confidence', q.ocr_confidence,
            'error', q.error_message,
            'processing_time_ms', q.processing_time_ms
        ) ORDER BY q.sequence_number)
        FROM public.ocr_queue q
        WHERE q.batch_id = bj.id
    ) as documents
FROM public.ocr_batch_jobs bj
JOIN public.projects p ON bj.project_id = p.id
JOIN public.user_profiles up ON bj.created_by = up.id
ORDER BY bj.created_at DESC;

-- =====================================================
-- SECTION 8: PENDING VERIFICATION VIEW
-- =====================================================

CREATE OR REPLACE VIEW public.v_tickets_pending_verification AS
SELECT
    mt.id,
    mt.ticket_number,
    mt.vendor_ticket_number,
    mt.delivery_date,
    mt.material_description,
    mt.material_type,
    mt.quantity,
    mt.unit_of_measure,
    mt.unit_price,
    mt.net_weight,
    mt.truck_number,
    mt.driver_name,
    mt.ocr_status,
    mt.ocr_confidence,
    mt.verification_status,
    mt.has_variance,
    mt.variance_amount,
    mt.variance_reason,
    mt.created_at,
    p.name as project_name,
    p.project_number,
    s.company_name as supplier_name,
    po.po_number as matched_po_number,
    mt.matched_po_confidence,
    CASE
        WHEN mt.has_variance THEN 'HIGH'
        WHEN mt.ocr_confidence < 80 THEN 'MEDIUM'
        WHEN mt.verification_status = 'NEEDS_REVIEW' THEN 'MEDIUM'
        ELSE 'LOW'
    END as review_priority
FROM public.material_tickets mt
JOIN public.projects p ON mt.project_id = p.id
LEFT JOIN public.suppliers s ON mt.supplier_id = s.id
LEFT JOIN public.purchase_orders po ON mt.matched_po_id = po.id
WHERE mt.verification_status IN ('UNVERIFIED', 'NEEDS_REVIEW')
  AND mt.ocr_status = 'COMPLETE'
ORDER BY
    CASE WHEN mt.has_variance THEN 0 ELSE 1 END,
    mt.ocr_confidence ASC,
    mt.created_at DESC;

-- =====================================================
-- SECTION 9: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_ocr_batch_jobs_status ON public.ocr_batch_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ocr_batch_jobs_project ON public.ocr_batch_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_ocr_batch_jobs_created_by ON public.ocr_batch_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_ocr_queue_batch ON public.ocr_queue(batch_id);
CREATE INDEX IF NOT EXISTS idx_ocr_queue_status ON public.ocr_queue(status);
CREATE INDEX IF NOT EXISTS idx_material_tickets_ocr_status ON public.material_tickets(ocr_status);
CREATE INDEX IF NOT EXISTS idx_material_tickets_verification ON public.material_tickets(verification_status);
CREATE INDEX IF NOT EXISTS idx_material_tickets_variance ON public.material_tickets(has_variance) WHERE has_variance = true;
CREATE INDEX IF NOT EXISTS idx_material_tickets_matched_po ON public.material_tickets(matched_po_id) WHERE matched_po_id IS NOT NULL;

-- =====================================================
-- SECTION 10: RLS POLICIES
-- =====================================================

ALTER TABLE public.ocr_batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_queue ENABLE ROW LEVEL SECURITY;

-- Batch jobs - users can see jobs for their projects
CREATE POLICY "ocr_batch_jobs_select" ON public.ocr_batch_jobs
    FOR SELECT USING (
        project_id IN (
            SELECT project_id FROM public.project_assignments
            WHERE user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.level <= 20
        )
    );

CREATE POLICY "ocr_batch_jobs_insert" ON public.ocr_batch_jobs
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT project_id FROM public.project_assignments
            WHERE user_id = auth.uid()
        )
    );

-- Queue items follow batch access
CREATE POLICY "ocr_queue_select" ON public.ocr_queue
    FOR SELECT USING (
        batch_id IN (
            SELECT id FROM public.ocr_batch_jobs
            WHERE project_id IN (
                SELECT project_id FROM public.project_assignments
                WHERE user_id = auth.uid()
            )
        )
    );

-- =====================================================
-- SECTION 11: UPDATE TIMESTAMPS TRIGGERS
-- =====================================================

CREATE TRIGGER ocr_batch_jobs_updated_at
    BEFORE UPDATE ON public.ocr_batch_jobs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.ocr_batch_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ocr_queue TO authenticated;
GRANT SELECT ON public.v_ocr_batch_status TO authenticated;
GRANT SELECT ON public.v_tickets_pending_verification TO authenticated;

COMMENT ON TABLE public.ocr_batch_jobs IS 'Batch OCR processing jobs for multiple ticket images';
COMMENT ON TABLE public.ocr_queue IS 'Individual documents queued for OCR processing within a batch';
COMMENT ON VIEW public.v_ocr_batch_status IS 'Real-time status of OCR batch processing jobs';
COMMENT ON VIEW public.v_tickets_pending_verification IS 'Material tickets awaiting human verification after OCR';
COMMENT ON FUNCTION public.auto_match_ticket_to_po IS 'Automatically matches material tickets to purchase orders';
COMMENT ON FUNCTION public.detect_ticket_variance IS 'Detects quantity/price variances between tickets and POs';
