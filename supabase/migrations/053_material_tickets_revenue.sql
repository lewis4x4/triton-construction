-- =============================================================================
-- Migration: 053_material_tickets_revenue.sql
-- Purpose: Material ticket capture, OCR extraction, PO reconciliation
-- Revenue Protection: Auto-match deliveries to POs, flag variances
-- Date: December 6, 2024
-- =============================================================================

-- =============================================================================
-- PART 1: Enums
-- =============================================================================

CREATE TYPE public.material_category AS ENUM (
  'aggregate',
  'asphalt',
  'concrete',
  'steel',
  'lumber',
  'pipe',
  'electrical',
  'fuel',
  'equipment_rental',
  'other'
);

CREATE TYPE public.po_status AS ENUM (
  'draft',
  'submitted',
  'approved',
  'partially_received',
  'fully_received',
  'closed',
  'cancelled'
);

CREATE TYPE public.ticket_status AS ENUM (
  'pending_ocr',
  'ocr_complete',
  'verified',
  'matched',
  'variance_flagged',
  'disputed',
  'reconciled'
);

CREATE TYPE public.ocr_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'manual_entry'
);

-- =============================================================================
-- PART 2: Purchase Orders
-- =============================================================================

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- PO identification
  po_number TEXT NOT NULL,
  revision_number INTEGER DEFAULT 0,

  -- Vendor
  supplier_id UUID REFERENCES public.suppliers(id),
  vendor_name TEXT NOT NULL,
  vendor_contact TEXT,
  vendor_phone TEXT,
  vendor_email TEXT,

  -- Dates
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date DATE,
  expiration_date DATE,

  -- Amounts
  subtotal DECIMAL(12, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,
  freight_amount DECIMAL(12, 2) DEFAULT 0,
  total_amount DECIMAL(12, 2) DEFAULT 0,

  -- Received tracking
  total_received_amount DECIMAL(12, 2) DEFAULT 0,
  remaining_amount DECIMAL(12, 2) GENERATED ALWAYS AS (total_amount - total_received_amount) STORED,

  -- Status
  status public.po_status DEFAULT 'draft',

  -- Approval
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),

  -- Buy America compliance (for federal projects)
  requires_buy_america BOOLEAN DEFAULT false,
  buy_america_certified BOOLEAN DEFAULT false,
  buy_america_docs_url TEXT,

  -- Cost code
  default_cost_code TEXT,

  -- Notes
  notes TEXT,
  internal_notes TEXT,

  -- Documents
  po_document_url TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique constraint
ALTER TABLE public.purchase_orders
  ADD CONSTRAINT unique_po_number_per_org UNIQUE (organization_id, po_number);

-- Indexes
CREATE INDEX idx_pos_org ON public.purchase_orders(organization_id);
CREATE INDEX idx_pos_project ON public.purchase_orders(project_id);
CREATE INDEX idx_pos_supplier ON public.purchase_orders(supplier_id);
CREATE INDEX idx_pos_status ON public.purchase_orders(status);
CREATE INDEX idx_pos_date ON public.purchase_orders(po_date DESC);

-- RLS MANDATE
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.purchase_orders FOR ALL USING (false);

CREATE POLICY "pos_select" ON public.purchase_orders FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "pos_manage" ON public.purchase_orders FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'materials.create', project_id)
  );

-- =============================================================================
-- PART 3: PO Line Items
-- =============================================================================

CREATE TABLE public.po_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,

  -- Line details
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  material_category public.material_category,

  -- Quantity and pricing
  quantity DECIMAL(12, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL, -- ton, cy, lf, ea, etc.
  unit_price DECIMAL(12, 4) NOT NULL,
  extended_amount DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  -- Received tracking
  quantity_received DECIMAL(12, 3) DEFAULT 0,
  quantity_remaining DECIMAL(12, 3) GENERATED ALWAYS AS (quantity - COALESCE(quantity_received, 0)) STORED,

  -- Specifications
  specification TEXT, -- e.g., "9.5mm Superpave", "3000 PSI", "#57 Stone"
  mix_design_number TEXT,

  -- Cost code
  cost_code TEXT,

  -- Buy America
  buy_america_required BOOLEAN DEFAULT false,
  country_of_origin TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_po_lines_po ON public.po_line_items(purchase_order_id);
CREATE INDEX idx_po_lines_category ON public.po_line_items(material_category);

-- RLS MANDATE
ALTER TABLE public.po_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.po_line_items FOR ALL USING (false);

CREATE POLICY "po_lines_select" ON public.po_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
      AND po.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "po_lines_manage" ON public.po_line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
      AND po.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- =============================================================================
-- PART 4: Material Tickets (Delivery Tickets)
-- =============================================================================

CREATE TABLE public.material_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- Ticket identification
  ticket_number TEXT NOT NULL,
  vendor_ticket_number TEXT, -- Vendor's own ticket number

  -- Vendor/Source
  supplier_id UUID REFERENCES public.suppliers(id),
  vendor_name TEXT,
  source_location TEXT, -- Plant name, quarry, etc.

  -- Delivery info
  delivery_date DATE NOT NULL,
  delivery_time TIME,
  received_by UUID REFERENCES auth.users(id),
  receiver_name TEXT,

  -- Truck/Driver
  truck_number TEXT,
  driver_name TEXT,

  -- Material details
  material_category public.material_category,
  material_description TEXT,
  specification TEXT,
  mix_design_number TEXT,

  -- Quantities
  quantity DECIMAL(12, 3) NOT NULL,
  unit_of_measure TEXT NOT NULL,
  gross_weight DECIMAL(12, 2),
  tare_weight DECIMAL(12, 2),
  net_weight DECIMAL(12, 2),

  -- Location delivered
  delivery_location TEXT,
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),

  -- Concrete-specific
  batch_time TIME,
  load_number INTEGER,
  slump_ordered DECIMAL(4, 2),
  slump_at_site DECIMAL(4, 2),
  water_added_gallons DECIMAL(4, 1),
  air_content DECIMAL(4, 2),
  concrete_temp DECIMAL(5, 2),
  ambient_temp DECIMAL(5, 2),

  -- Asphalt-specific
  asphalt_temp DECIMAL(5, 2),
  oil_percentage DECIMAL(4, 2),

  -- Photos
  ticket_photo_url TEXT,
  additional_photos TEXT[],

  -- OCR
  ocr_status public.ocr_status DEFAULT 'pending',
  ocr_extraction_id UUID, -- References ocr_extractions

  -- Matching
  status public.ticket_status DEFAULT 'pending_ocr',
  matched_po_id UUID REFERENCES public.purchase_orders(id),
  matched_po_line_id UUID REFERENCES public.po_line_items(id),
  match_confidence DECIMAL(5, 2), -- 0-100%

  -- Variance
  has_variance BOOLEAN DEFAULT false,
  variance_amount DECIMAL(12, 3),
  variance_reason TEXT,
  variance_resolved_at TIMESTAMPTZ,
  variance_resolved_by UUID REFERENCES auth.users(id),

  -- Cost code
  cost_code TEXT,

  -- Verification
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tickets_org ON public.material_tickets(organization_id);
CREATE INDEX idx_tickets_project ON public.material_tickets(project_id);
CREATE INDEX idx_tickets_supplier ON public.material_tickets(supplier_id);
CREATE INDEX idx_tickets_date ON public.material_tickets(delivery_date DESC);
CREATE INDEX idx_tickets_status ON public.material_tickets(status);
CREATE INDEX idx_tickets_po ON public.material_tickets(matched_po_id);
CREATE INDEX idx_tickets_variance ON public.material_tickets(has_variance) WHERE has_variance = true;
CREATE INDEX idx_tickets_ocr ON public.material_tickets(ocr_status) WHERE ocr_status = 'pending';

-- RLS MANDATE
ALTER TABLE public.material_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.material_tickets FOR ALL USING (false);

CREATE POLICY "tickets_select" ON public.material_tickets FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "tickets_insert" ON public.material_tickets FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "tickets_update" ON public.material_tickets FOR UPDATE
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- =============================================================================
-- PART 5: OCR Extractions
-- =============================================================================

CREATE TABLE public.ocr_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_ticket_id UUID NOT NULL REFERENCES public.material_tickets(id) ON DELETE CASCADE,

  -- Processing
  status public.ocr_status DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  processing_time_ms INTEGER,

  -- Source
  image_url TEXT NOT NULL,
  image_hash TEXT, -- For deduplication

  -- OCR Provider
  provider TEXT, -- 'google_document_ai', 'azure', 'manual'
  model_version TEXT,
  confidence_score DECIMAL(5, 2),

  -- Extracted fields (raw)
  extracted_ticket_number TEXT,
  extracted_vendor TEXT,
  extracted_date TEXT,
  extracted_time TEXT,
  extracted_quantity TEXT,
  extracted_unit TEXT,
  extracted_material TEXT,
  extracted_truck_number TEXT,
  extracted_gross_weight TEXT,
  extracted_tare_weight TEXT,
  extracted_net_weight TEXT,

  -- Structured extraction (after parsing)
  parsed_data JSONB,

  -- Validation
  validation_errors TEXT[],
  human_corrected BOOLEAN DEFAULT false,
  corrected_at TIMESTAMPTZ,
  corrected_by UUID REFERENCES auth.users(id),

  -- Raw response (for debugging)
  raw_response JSONB,

  -- Cost tracking
  api_cost_cents INTEGER,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ocr_ticket ON public.ocr_extractions(material_ticket_id);
CREATE INDEX idx_ocr_status ON public.ocr_extractions(status);
CREATE INDEX idx_ocr_provider ON public.ocr_extractions(provider);

-- RLS MANDATE
ALTER TABLE public.ocr_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.ocr_extractions FOR ALL USING (false);

CREATE POLICY "ocr_select" ON public.ocr_extractions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.material_tickets mt
      WHERE mt.id = material_ticket_id
      AND mt.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

CREATE POLICY "ocr_manage" ON public.ocr_extractions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.material_tickets mt
      WHERE mt.id = material_ticket_id
      AND mt.organization_id = public.get_user_organization_id(auth.uid())
    )
  );

-- =============================================================================
-- PART 6: Material Reconciliation Log
-- =============================================================================

CREATE TABLE public.material_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- What was reconciled
  material_ticket_id UUID NOT NULL REFERENCES public.material_tickets(id),
  po_line_item_id UUID REFERENCES public.po_line_items(id),

  -- Quantities
  ticket_quantity DECIMAL(12, 3) NOT NULL,
  po_line_quantity DECIMAL(12, 3),
  variance_quantity DECIMAL(12, 3),
  variance_percentage DECIMAL(5, 2),

  -- Pricing
  ticket_amount DECIMAL(12, 2),
  po_unit_price DECIMAL(12, 4),
  variance_amount DECIMAL(12, 2),

  -- Status
  reconciliation_type TEXT CHECK (reconciliation_type IN ('auto_match', 'manual_match', 'no_match', 'variance_accepted', 'disputed')),

  -- Approval
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),

  -- Notes
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_recon_org ON public.material_reconciliation(organization_id);
CREATE INDEX idx_recon_project ON public.material_reconciliation(project_id);
CREATE INDEX idx_recon_ticket ON public.material_reconciliation(material_ticket_id);
CREATE INDEX idx_recon_po_line ON public.material_reconciliation(po_line_item_id);

-- RLS MANDATE
ALTER TABLE public.material_reconciliation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.material_reconciliation FOR ALL USING (false);

CREATE POLICY "recon_select" ON public.material_reconciliation FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

CREATE POLICY "recon_manage" ON public.material_reconciliation FOR ALL
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    AND public.user_has_permission(auth.uid(), 'materials.reconcile', project_id)
  );

-- =============================================================================
-- PART 7: Daily Material Summary
-- =============================================================================

CREATE TABLE public.daily_material_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id),

  -- Date
  summary_date DATE NOT NULL,

  -- Counts
  total_tickets INTEGER DEFAULT 0,
  tickets_verified INTEGER DEFAULT 0,
  tickets_with_variance INTEGER DEFAULT 0,

  -- By category (JSONB)
  category_totals JSONB, -- {aggregate: {quantity: 500, cost: 5000}, concrete: {...}}

  -- Totals
  total_quantity DECIMAL(15, 3) DEFAULT 0,
  total_cost DECIMAL(15, 2) DEFAULT 0,
  total_variance_amount DECIMAL(12, 2) DEFAULT 0,

  -- Computed at
  computed_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_daily_summary UNIQUE (project_id, summary_date)
);

-- Indexes
CREATE INDEX idx_daily_summary_project ON public.daily_material_summary(project_id);
CREATE INDEX idx_daily_summary_date ON public.daily_material_summary(summary_date DESC);

-- RLS MANDATE
ALTER TABLE public.daily_material_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny all by default" ON public.daily_material_summary FOR ALL USING (false);

CREATE POLICY "summary_select" ON public.daily_material_summary FOR SELECT
  USING (organization_id = public.get_user_organization_id(auth.uid()));

-- =============================================================================
-- PART 8: Helper Functions
-- =============================================================================

-- Auto-match ticket to PO
CREATE OR REPLACE FUNCTION public.auto_match_material_ticket(p_ticket_id UUID)
RETURNS TABLE (
  matched BOOLEAN,
  po_id UUID,
  po_line_id UUID,
  confidence DECIMAL(5, 2),
  match_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ticket RECORD;
  v_best_match RECORD;
BEGIN
  -- Get ticket details
  SELECT * INTO v_ticket FROM public.material_tickets WHERE id = p_ticket_id;

  -- Find best matching PO line
  SELECT
    po.id AS po_id,
    pli.id AS po_line_id,
    CASE
      WHEN v_ticket.vendor_name = po.vendor_name AND v_ticket.specification = pli.specification THEN 95
      WHEN v_ticket.vendor_name = po.vendor_name THEN 80
      WHEN v_ticket.specification = pli.specification THEN 70
      ELSE 50
    END AS confidence
  INTO v_best_match
  FROM public.purchase_orders po
  JOIN public.po_line_items pli ON pli.purchase_order_id = po.id
  WHERE
    po.project_id = v_ticket.project_id
    AND po.status IN ('approved', 'partially_received')
    AND pli.quantity_remaining > 0
    AND (
      -- Match by vendor
      po.vendor_name ILIKE '%' || v_ticket.vendor_name || '%'
      OR v_ticket.vendor_name ILIKE '%' || po.vendor_name || '%'
      -- Or by material description
      OR pli.description ILIKE '%' || v_ticket.material_description || '%'
      OR pli.specification = v_ticket.specification
    )
  ORDER BY
    CASE
      WHEN v_ticket.vendor_name = po.vendor_name AND v_ticket.specification = pli.specification THEN 1
      WHEN v_ticket.vendor_name = po.vendor_name THEN 2
      ELSE 3
    END
  LIMIT 1;

  IF v_best_match.po_id IS NOT NULL THEN
    -- Update ticket with match
    UPDATE public.material_tickets
    SET
      matched_po_id = v_best_match.po_id,
      matched_po_line_id = v_best_match.po_line_id,
      match_confidence = v_best_match.confidence,
      status = CASE WHEN v_best_match.confidence >= 80 THEN 'matched' ELSE 'variance_flagged' END
    WHERE id = p_ticket_id;

    RETURN QUERY SELECT
      true AS matched,
      v_best_match.po_id,
      v_best_match.po_line_id,
      v_best_match.confidence::DECIMAL(5,2),
      'Matched by vendor and/or specification'::TEXT AS match_reason;
  ELSE
    -- No match found
    UPDATE public.material_tickets
    SET status = 'variance_flagged', has_variance = true
    WHERE id = p_ticket_id;

    RETURN QUERY SELECT
      false AS matched,
      NULL::UUID AS po_id,
      NULL::UUID AS po_line_id,
      0::DECIMAL(5,2) AS confidence,
      'No matching PO found'::TEXT AS match_reason;
  END IF;
END;
$$;

-- Update PO received quantities after ticket verification
CREATE OR REPLACE FUNCTION public.update_po_received_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Only when ticket is verified and matched
  IF NEW.status = 'verified' AND NEW.matched_po_line_id IS NOT NULL THEN
    -- Update PO line received quantity
    UPDATE public.po_line_items
    SET quantity_received = COALESCE(quantity_received, 0) + NEW.quantity
    WHERE id = NEW.matched_po_line_id;

    -- Update PO total received
    UPDATE public.purchase_orders po
    SET
      total_received_amount = (
        SELECT COALESCE(SUM(pli.quantity_received * pli.unit_price), 0)
        FROM public.po_line_items pli
        WHERE pli.purchase_order_id = po.id
      ),
      status = CASE
        WHEN (
          SELECT COUNT(*) FROM public.po_line_items pli
          WHERE pli.purchase_order_id = po.id AND pli.quantity_remaining > 0
        ) = 0 THEN 'fully_received'
        ELSE 'partially_received'
      END
    WHERE id = NEW.matched_po_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER material_tickets_update_po
  AFTER UPDATE OF status ON public.material_tickets
  FOR EACH ROW
  WHEN (NEW.status = 'verified' AND OLD.status != 'verified')
  EXECUTE FUNCTION public.update_po_received_quantity();

-- Get materials variance report
CREATE OR REPLACE FUNCTION public.get_materials_variance_report(
  p_project_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  ticket_id UUID,
  ticket_number TEXT,
  delivery_date DATE,
  vendor_name TEXT,
  material_description TEXT,
  ticket_quantity DECIMAL(12, 3),
  po_quantity DECIMAL(12, 3),
  variance_quantity DECIMAL(12, 3),
  variance_percentage DECIMAL(5, 2),
  status public.ticket_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mt.id AS ticket_id,
    mt.ticket_number,
    mt.delivery_date,
    mt.vendor_name,
    mt.material_description,
    mt.quantity AS ticket_quantity,
    pli.quantity AS po_quantity,
    (mt.quantity - COALESCE(pli.quantity, 0)) AS variance_quantity,
    CASE WHEN pli.quantity > 0 THEN
      ((mt.quantity - pli.quantity) / pli.quantity * 100)
    ELSE NULL END AS variance_percentage,
    mt.status
  FROM public.material_tickets mt
  LEFT JOIN public.po_line_items pli ON pli.id = mt.matched_po_line_id
  WHERE
    mt.project_id = p_project_id
    AND mt.has_variance = true
    AND (p_start_date IS NULL OR mt.delivery_date >= p_start_date)
    AND (p_end_date IS NULL OR mt.delivery_date <= p_end_date)
  ORDER BY mt.delivery_date DESC;
END;
$$;

-- Compute daily material summary
CREATE OR REPLACE FUNCTION public.compute_daily_material_summary(
  p_project_id UUID,
  p_date DATE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary_id UUID;
  v_org_id UUID;
  v_category_totals JSONB;
BEGIN
  -- Get organization
  SELECT organization_id INTO v_org_id FROM public.projects WHERE id = p_project_id;

  -- Compute category totals
  SELECT jsonb_object_agg(
    category::TEXT,
    jsonb_build_object(
      'quantity', total_qty,
      'ticket_count', ticket_count
    )
  ) INTO v_category_totals
  FROM (
    SELECT
      material_category AS category,
      SUM(quantity) AS total_qty,
      COUNT(*) AS ticket_count
    FROM public.material_tickets
    WHERE project_id = p_project_id AND delivery_date = p_date
    GROUP BY material_category
  ) sub;

  -- Upsert summary
  INSERT INTO public.daily_material_summary (
    organization_id, project_id, summary_date,
    total_tickets, tickets_verified, tickets_with_variance,
    category_totals, total_quantity, computed_at
  )
  SELECT
    v_org_id,
    p_project_id,
    p_date,
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'verified'),
    COUNT(*) FILTER (WHERE has_variance = true),
    COALESCE(v_category_totals, '{}'::JSONB),
    COALESCE(SUM(quantity), 0),
    NOW()
  FROM public.material_tickets
  WHERE project_id = p_project_id AND delivery_date = p_date
  ON CONFLICT (project_id, summary_date) DO UPDATE SET
    total_tickets = EXCLUDED.total_tickets,
    tickets_verified = EXCLUDED.tickets_verified,
    tickets_with_variance = EXCLUDED.tickets_with_variance,
    category_totals = EXCLUDED.category_totals,
    total_quantity = EXCLUDED.total_quantity,
    computed_at = NOW()
  RETURNING id INTO v_summary_id;

  RETURN v_summary_id;
END;
$$;

-- =============================================================================
-- PART 9: Triggers
-- =============================================================================

CREATE TRIGGER pos_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.material_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- PART 10: Views
-- =============================================================================

-- Material tickets pending verification
CREATE OR REPLACE VIEW public.v_tickets_pending_verification AS
SELECT
  mt.id,
  mt.ticket_number,
  mt.delivery_date,
  mt.vendor_name,
  mt.material_description,
  mt.quantity,
  mt.unit_of_measure,
  mt.status,
  mt.ocr_status,
  mt.ticket_photo_url,
  p.name AS project_name,
  mt.project_id,
  mt.organization_id
FROM public.material_tickets mt
JOIN public.projects p ON p.id = mt.project_id
WHERE mt.status IN ('pending_ocr', 'ocr_complete')
ORDER BY mt.delivery_date DESC, mt.created_at DESC;

-- PO summary with received totals
CREATE OR REPLACE VIEW public.v_purchase_order_summary AS
SELECT
  po.id,
  po.po_number,
  po.vendor_name,
  po.po_date,
  po.total_amount,
  po.total_received_amount,
  po.remaining_amount,
  po.status,
  p.name AS project_name,
  po.project_id,
  po.organization_id,
  (SELECT COUNT(*) FROM public.po_line_items WHERE purchase_order_id = po.id) AS line_count,
  (SELECT COUNT(*) FROM public.material_tickets WHERE matched_po_id = po.id) AS ticket_count
FROM public.purchase_orders po
JOIN public.projects p ON p.id = po.project_id;

-- =============================================================================
-- PART 11: Comments
-- =============================================================================

COMMENT ON TABLE public.purchase_orders IS 'Purchase orders for material procurement with Buy America tracking';
COMMENT ON TABLE public.material_tickets IS 'Delivery tickets with OCR extraction and PO matching';
COMMENT ON TABLE public.ocr_extractions IS 'OCR processing results from ticket photos';
COMMENT ON TABLE public.material_reconciliation IS 'Audit trail of ticket-to-PO matching decisions';

COMMENT ON FUNCTION public.auto_match_material_ticket IS 'Automatically match ticket to best PO line based on vendor and specs';
COMMENT ON FUNCTION public.compute_daily_material_summary IS 'Aggregate daily material receipts for dashboard';
