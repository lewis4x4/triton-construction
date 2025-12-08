-- =============================================================================
-- Migration 080: Materials & Deliveries Advanced
-- =============================================================================
-- Extends 053_material_tickets_revenue.sql with:
-- - Ticket line items (multi-item tickets)
-- - Material inventory tracking
-- - Concrete batch ticket details
-- - Asphalt delivery specifics
-- - Supplier quality scoring
-- - Material certifications (mill certs, test reports)
-- =============================================================================

-- ============================================================================
-- PART 0: CLEANUP
-- ============================================================================

DROP VIEW IF EXISTS public.v_material_inventory_status CASCADE;
DROP VIEW IF EXISTS public.v_supplier_quality_dashboard CASCADE;
DROP VIEW IF EXISTS public.v_concrete_delivery_summary CASCADE;

DROP TABLE IF EXISTS public.supplier_quality_scores CASCADE;
DROP TABLE IF EXISTS public.material_certifications CASCADE;
DROP TABLE IF EXISTS public.material_inventory_transactions CASCADE;
DROP TABLE IF EXISTS public.material_inventory CASCADE;
DROP TABLE IF EXISTS public.asphalt_delivery_details CASCADE;
DROP TABLE IF EXISTS public.concrete_batch_details CASCADE;
DROP TABLE IF EXISTS public.material_ticket_line_items CASCADE;

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE public.inventory_transaction_type AS ENUM (
        'RECEIVED',          -- Material delivered
        'ISSUED',            -- Used on work
        'RETURNED',          -- Returned to supplier
        'TRANSFERRED',       -- Moved to another project
        'ADJUSTED',          -- Inventory adjustment
        'WASTE',             -- Waste/loss
        'REJECTED'           -- Quality rejection
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.cert_type AS ENUM (
        'MILL_CERT',         -- Steel mill certificate
        'BATCH_CERT',        -- Concrete batch cert
        'MIX_DESIGN',        -- Asphalt/concrete mix design
        'TEST_REPORT',       -- Lab test results
        'BUY_AMERICA',       -- Buy America certification
        'INSPECTION_CERT',   -- Third-party inspection
        'COC',               -- Certificate of Compliance
        'MSDS_SDS'           -- Safety data sheet
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.quality_issue_type AS ENUM (
        'LATE_DELIVERY',
        'WRONG_MATERIAL',
        'WRONG_QUANTITY',
        'QUALITY_DEFECT',
        'DAMAGED',
        'MISSING_DOCS',
        'OUT_OF_SPEC',
        'CONTAMINATED'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- PART 2: TICKET LINE ITEMS
-- ============================================================================
-- For tickets with multiple materials (e.g., hardware store orders)

CREATE TABLE public.material_ticket_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_ticket_id UUID NOT NULL REFERENCES public.material_tickets(id) ON DELETE CASCADE,

    -- Line details
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    material_category public.material_category,

    -- Quantity
    quantity NUMERIC(12,3) NOT NULL,
    unit_of_measure TEXT NOT NULL,
    unit_price NUMERIC(12,4),
    extended_amount NUMERIC(12,2) GENERATED ALWAYS AS (quantity * COALESCE(unit_price, 0)) STORED,

    -- Specifications
    specification TEXT,
    part_number TEXT,
    manufacturer TEXT,

    -- PO matching (line-level)
    matched_po_line_id UUID REFERENCES public.po_line_items(id),

    -- Cost code
    cost_code TEXT,

    -- Notes
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ticket_lines_ticket ON public.material_ticket_line_items(material_ticket_id);
CREATE INDEX idx_ticket_lines_po ON public.material_ticket_line_items(matched_po_line_id);

-- ============================================================================
-- PART 3: CONCRETE BATCH DETAILS
-- ============================================================================
-- Extended concrete-specific data beyond material_tickets base fields

CREATE TABLE public.concrete_batch_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_ticket_id UUID NOT NULL REFERENCES public.material_tickets(id) ON DELETE CASCADE,

    -- Plant info
    plant_name TEXT NOT NULL,
    plant_number TEXT,
    plant_location TEXT,

    -- Batch identification
    batch_number TEXT NOT NULL,
    load_size_cy NUMERIC(5,2) NOT NULL,

    -- Mix design
    mix_design_number TEXT NOT NULL,
    mix_description TEXT,              -- "4000 PSI, 3/4 Stone, Type I/II"
    specified_strength_psi INTEGER,
    specified_slump NUMERIC(4,2),
    max_water_cement_ratio NUMERIC(4,3),

    -- Batch weights (lbs)
    cement_weight NUMERIC(8,1),
    fly_ash_weight NUMERIC(8,1),
    slag_weight NUMERIC(8,1),
    fine_aggregate_weight NUMERIC(8,1),
    coarse_aggregate_weight NUMERIC(8,1),
    water_weight NUMERIC(8,1),
    admixtures JSONB,                  -- [{name, dosage, unit}]

    -- Timing
    batch_time TIME NOT NULL,
    departure_time TIME,
    arrival_time TIME,
    pour_start_time TIME,
    pour_complete_time TIME,
    drum_revolutions INTEGER,

    -- Field tests at site
    slump_at_site NUMERIC(4,2),
    air_content NUMERIC(4,2),
    concrete_temp_f NUMERIC(5,1),
    ambient_temp_f NUMERIC(5,1),
    water_added_gal NUMERIC(4,1) DEFAULT 0,

    -- Cylinder specimens
    cylinders_made INTEGER DEFAULT 0,
    cylinder_set_ids TEXT[],          -- Lab tracking numbers

    -- Placement
    placement_location TEXT,
    placement_element TEXT,           -- Footing, Column, Slab, etc.
    placement_method TEXT,            -- Pump, Bucket, Chute

    -- Quality checks
    rejected BOOLEAN DEFAULT false,
    rejection_reason TEXT,
    inspector_name TEXT,
    inspector_approved BOOLEAN,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_concrete_batch_ticket ON public.concrete_batch_details(material_ticket_id);
CREATE INDEX idx_concrete_batch_mix ON public.concrete_batch_details(mix_design_number);
CREATE INDEX idx_concrete_batch_plant ON public.concrete_batch_details(plant_name);

-- ============================================================================
-- PART 4: ASPHALT DELIVERY DETAILS
-- ============================================================================
-- Extended asphalt-specific data

CREATE TABLE public.asphalt_delivery_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_ticket_id UUID NOT NULL REFERENCES public.material_tickets(id) ON DELETE CASCADE,

    -- Plant info
    plant_name TEXT NOT NULL,
    plant_number TEXT,
    mix_producer TEXT,

    -- Mix identification
    mix_type TEXT NOT NULL,            -- 9.5mm Superpave, 19mm Base, etc.
    mix_design_number TEXT NOT NULL,
    pggrade TEXT,                      -- PG 64-22, PG 76-22, etc.

    -- Production info
    production_date DATE,
    production_time TIME,
    silo_number TEXT,

    -- Weights (tons)
    gross_weight_tons NUMERIC(8,2),
    tare_weight_tons NUMERIC(8,2),
    net_weight_tons NUMERIC(8,2),

    -- Temperatures
    plant_temp_f NUMERIC(5,1),
    arrival_temp_f NUMERIC(5,1),
    laydown_temp_f NUMERIC(5,1),

    -- Mix properties
    asphalt_content_pct NUMERIC(4,2),
    air_voids_pct NUMERIC(4,2),
    vma_pct NUMERIC(4,2),
    vfa_pct NUMERIC(4,2),

    -- Placement
    placement_station_start TEXT,
    placement_station_end TEXT,
    lane TEXT,
    lift_number INTEGER,
    lift_thickness_in NUMERIC(4,2),

    -- Compaction
    initial_density_pct NUMERIC(5,2),
    final_density_pct NUMERIC(5,2),
    roller_passes INTEGER,

    -- Quality
    core_samples_taken INTEGER DEFAULT 0,
    core_sample_ids TEXT[],
    rejected BOOLEAN DEFAULT false,
    rejection_reason TEXT,

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_asphalt_delivery_ticket ON public.asphalt_delivery_details(material_ticket_id);
CREATE INDEX idx_asphalt_mix ON public.asphalt_delivery_details(mix_type);
CREATE INDEX idx_asphalt_plant ON public.asphalt_delivery_details(plant_name);

-- ============================================================================
-- PART 5: MATERIAL INVENTORY
-- ============================================================================
-- Track on-site material inventory

CREATE TABLE public.material_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Material identification
    material_code TEXT NOT NULL,
    description TEXT NOT NULL,
    material_category public.material_category,
    specification TEXT,

    -- Unit
    unit_of_measure TEXT NOT NULL,

    -- Quantities
    quantity_on_hand NUMERIC(15,3) DEFAULT 0,
    quantity_reserved NUMERIC(15,3) DEFAULT 0,  -- Reserved for upcoming work
    quantity_available NUMERIC(15,3) GENERATED ALWAYS AS (
        quantity_on_hand - COALESCE(quantity_reserved, 0)
    ) STORED,

    -- Thresholds
    reorder_point NUMERIC(15,3),
    min_stock_level NUMERIC(15,3),
    max_stock_level NUMERIC(15,3),

    -- Costing
    unit_cost NUMERIC(12,4),
    total_value NUMERIC(15,2) GENERATED ALWAYS AS (
        quantity_on_hand * COALESCE(unit_cost, 0)
    ) STORED,
    costing_method TEXT DEFAULT 'AVERAGE', -- AVERAGE, FIFO, LIFO

    -- Storage location
    storage_location TEXT,
    bin_number TEXT,

    -- Supplier info
    primary_supplier_id UUID REFERENCES public.suppliers(id),
    lead_time_days INTEGER,

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_count_date DATE,
    last_count_quantity NUMERIC(15,3),

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),

    UNIQUE(project_id, material_code)
);

CREATE INDEX idx_inventory_org ON public.material_inventory(organization_id);
CREATE INDEX idx_inventory_project ON public.material_inventory(project_id);
CREATE INDEX idx_inventory_category ON public.material_inventory(material_category);
CREATE INDEX idx_inventory_low_stock ON public.material_inventory(quantity_on_hand)
    WHERE quantity_on_hand <= reorder_point;

-- ============================================================================
-- PART 6: INVENTORY TRANSACTIONS
-- ============================================================================
-- Track all inventory movements

CREATE TABLE public.material_inventory_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.material_inventory(id) ON DELETE CASCADE,

    -- Transaction
    transaction_type public.inventory_transaction_type NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Quantities
    quantity NUMERIC(15,3) NOT NULL,     -- Positive for in, negative for out
    unit_cost NUMERIC(12,4),
    total_cost NUMERIC(15,2),

    -- Balance after
    balance_after NUMERIC(15,3) NOT NULL,

    -- References
    material_ticket_id UUID REFERENCES public.material_tickets(id),
    daily_report_id UUID REFERENCES public.daily_reports(id),
    transfer_to_project_id UUID REFERENCES public.projects(id),

    -- Details
    reference_number TEXT,
    cost_code TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_inv_trans_inventory ON public.material_inventory_transactions(inventory_id);
CREATE INDEX idx_inv_trans_date ON public.material_inventory_transactions(transaction_date);
CREATE INDEX idx_inv_trans_type ON public.material_inventory_transactions(transaction_type);
CREATE INDEX idx_inv_trans_ticket ON public.material_inventory_transactions(material_ticket_id);

-- ============================================================================
-- PART 7: MATERIAL CERTIFICATIONS
-- ============================================================================
-- Mill certs, test reports, Buy America docs

CREATE TABLE public.material_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,

    -- Certification type
    cert_type public.cert_type NOT NULL,
    cert_number TEXT,

    -- Material reference
    material_ticket_id UUID REFERENCES public.material_tickets(id),
    po_id UUID REFERENCES public.purchase_orders(id),
    inventory_id UUID REFERENCES public.material_inventory(id),

    -- Certification details
    description TEXT NOT NULL,
    material_description TEXT,
    specification_reference TEXT,       -- ASTM, AASHTO spec

    -- Supplier/source
    supplier_id UUID REFERENCES public.suppliers(id),
    manufacturer TEXT,
    country_of_origin TEXT,
    heat_number TEXT,                   -- Steel heat/lot
    lot_number TEXT,

    -- Dates
    cert_date DATE,
    expiration_date DATE,
    received_date DATE DEFAULT CURRENT_DATE,

    -- Document
    document_url TEXT,
    document_pages INTEGER,

    -- Verification
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),
    verification_notes TEXT,

    -- Buy America specific
    is_buy_america BOOLEAN DEFAULT false,
    domestic_content_pct NUMERIC(5,2),
    melting_location TEXT,
    manufacturing_location TEXT,

    -- Status
    status TEXT DEFAULT 'PENDING',      -- PENDING, VERIFIED, REJECTED, EXPIRED

    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_certs_org ON public.material_certifications(organization_id);
CREATE INDEX idx_certs_project ON public.material_certifications(project_id);
CREATE INDEX idx_certs_type ON public.material_certifications(cert_type);
CREATE INDEX idx_certs_ticket ON public.material_certifications(material_ticket_id);
CREATE INDEX idx_certs_supplier ON public.material_certifications(supplier_id);
CREATE INDEX idx_certs_status ON public.material_certifications(status);

-- ============================================================================
-- PART 8: SUPPLIER QUALITY SCORES
-- ============================================================================
-- Track supplier performance metrics

CREATE TABLE public.supplier_quality_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,

    -- Scoring period
    score_year INTEGER NOT NULL,
    score_quarter INTEGER CHECK (score_quarter BETWEEN 1 AND 4),

    -- Delivery metrics
    total_deliveries INTEGER DEFAULT 0,
    on_time_deliveries INTEGER DEFAULT 0,
    on_time_pct NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_deliveries > 0
            THEN (on_time_deliveries::NUMERIC / total_deliveries) * 100
            ELSE 0 END
    ) STORED,

    -- Quality metrics
    total_quantity_ordered NUMERIC(15,3) DEFAULT 0,
    total_quantity_received NUMERIC(15,3) DEFAULT 0,
    total_quantity_rejected NUMERIC(15,3) DEFAULT 0,
    rejection_rate_pct NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN total_quantity_received > 0
            THEN (total_quantity_rejected / total_quantity_received) * 100
            ELSE 0 END
    ) STORED,

    -- Issue tracking
    quality_issues INTEGER DEFAULT 0,
    documentation_issues INTEGER DEFAULT 0,
    variance_issues INTEGER DEFAULT 0,

    -- Issues by type (JSONB)
    issues_by_type JSONB DEFAULT '{}',   -- {LATE_DELIVERY: 2, WRONG_QUANTITY: 1}

    -- Overall score (calculated)
    quality_score NUMERIC(5,2),          -- 0-100
    delivery_score NUMERIC(5,2),         -- 0-100
    documentation_score NUMERIC(5,2),    -- 0-100
    overall_score NUMERIC(5,2),          -- Weighted average

    -- Response metrics
    avg_issue_resolution_days NUMERIC(5,2),
    disputes_filed INTEGER DEFAULT 0,
    disputes_won INTEGER DEFAULT 0,

    -- Certification status
    certs_on_file BOOLEAN DEFAULT false,
    certs_current BOOLEAN DEFAULT false,
    buy_america_certified BOOLEAN DEFAULT false,
    dbe_certified BOOLEAN DEFAULT false,

    -- Notes
    notes TEXT,
    computed_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(organization_id, supplier_id, score_year, score_quarter)
);

CREATE INDEX idx_supplier_scores_org ON public.supplier_quality_scores(organization_id);
CREATE INDEX idx_supplier_scores_supplier ON public.supplier_quality_scores(supplier_id);
CREATE INDEX idx_supplier_scores_period ON public.supplier_quality_scores(score_year, score_quarter);
CREATE INDEX idx_supplier_scores_overall ON public.supplier_quality_scores(overall_score DESC);

-- ============================================================================
-- PART 9: TRIGGERS
-- ============================================================================

-- Update inventory on transaction
CREATE OR REPLACE FUNCTION public.update_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.material_inventory
        SET
            quantity_on_hand = quantity_on_hand + NEW.quantity,
            updated_at = now()
        WHERE id = NEW.inventory_id;

        -- Set balance_after
        SELECT quantity_on_hand INTO NEW.balance_after
        FROM public.material_inventory
        WHERE id = NEW.inventory_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_inventory
    BEFORE INSERT ON public.material_inventory_transactions
    FOR EACH ROW EXECUTE FUNCTION public.update_inventory_on_transaction();

-- Auto-create inventory transaction from material ticket
CREATE OR REPLACE FUNCTION public.create_inventory_from_ticket()
RETURNS TRIGGER AS $$
DECLARE
    v_inventory_id UUID;
BEGIN
    -- Only when status changes to verified
    IF NEW.status = 'verified' AND OLD.status != 'verified' THEN
        -- Find or create inventory record
        SELECT id INTO v_inventory_id
        FROM public.material_inventory
        WHERE project_id = NEW.project_id
        AND material_code = COALESCE(NEW.specification, NEW.material_description);

        IF v_inventory_id IS NOT NULL THEN
            -- Create transaction
            INSERT INTO public.material_inventory_transactions (
                organization_id, project_id, inventory_id,
                transaction_type, transaction_date, quantity,
                material_ticket_id, reference_number
            ) VALUES (
                NEW.organization_id, NEW.project_id, v_inventory_id,
                'RECEIVED', NEW.delivery_date, NEW.quantity,
                NEW.id, NEW.ticket_number
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_material_ticket_to_inventory
    AFTER UPDATE OF status ON public.material_tickets
    FOR EACH ROW
    WHEN (NEW.status = 'verified' AND OLD.status != 'verified')
    EXECUTE FUNCTION public.create_inventory_from_ticket();

-- Updated_at triggers
CREATE TRIGGER material_inventory_updated_at
    BEFORE UPDATE ON public.material_inventory
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- PART 10: FUNCTIONS
-- ============================================================================

-- Calculate supplier quality score
CREATE OR REPLACE FUNCTION public.calculate_supplier_score(
    p_supplier_id UUID,
    p_year INTEGER,
    p_quarter INTEGER DEFAULT NULL
)
RETURNS TABLE(
    quality_score NUMERIC,
    delivery_score NUMERIC,
    documentation_score NUMERIC,
    overall_score NUMERIC
) AS $$
DECLARE
    v_on_time_pct NUMERIC;
    v_rejection_rate NUMERIC;
    v_issue_count INTEGER;
    v_q_score NUMERIC;
    v_d_score NUMERIC;
    v_doc_score NUMERIC;
    v_overall NUMERIC;
BEGIN
    -- Get metrics from supplier_quality_scores
    SELECT
        sqs.on_time_pct,
        sqs.rejection_rate_pct,
        sqs.quality_issues + sqs.documentation_issues + sqs.variance_issues
    INTO v_on_time_pct, v_rejection_rate, v_issue_count
    FROM public.supplier_quality_scores sqs
    WHERE sqs.supplier_id = p_supplier_id
    AND sqs.score_year = p_year
    AND (p_quarter IS NULL OR sqs.score_quarter = p_quarter)
    ORDER BY sqs.score_quarter DESC
    LIMIT 1;

    -- Calculate individual scores
    v_d_score := GREATEST(0, 100 - ((100 - COALESCE(v_on_time_pct, 100)) * 2));
    v_q_score := GREATEST(0, 100 - (COALESCE(v_rejection_rate, 0) * 5));
    v_doc_score := GREATEST(0, 100 - (COALESCE(v_issue_count, 0) * 5));

    -- Weighted overall (40% quality, 35% delivery, 25% documentation)
    v_overall := (v_q_score * 0.40) + (v_d_score * 0.35) + (v_doc_score * 0.25);

    RETURN QUERY SELECT v_q_score, v_d_score, v_doc_score, v_overall;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get low stock materials
CREATE OR REPLACE FUNCTION public.get_low_stock_materials(
    p_project_id UUID
)
RETURNS TABLE(
    inventory_id UUID,
    material_code TEXT,
    description TEXT,
    quantity_on_hand NUMERIC,
    reorder_point NUMERIC,
    supplier_name TEXT,
    lead_time_days INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mi.id as inventory_id,
        mi.material_code,
        mi.description,
        mi.quantity_on_hand,
        mi.reorder_point,
        s.company_name as supplier_name,
        mi.lead_time_days
    FROM public.material_inventory mi
    LEFT JOIN public.suppliers s ON mi.primary_supplier_id = s.id
    WHERE mi.project_id = p_project_id
    AND mi.is_active = true
    AND mi.quantity_on_hand <= mi.reorder_point
    ORDER BY (mi.quantity_on_hand / NULLIF(mi.reorder_point, 0)) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get material usage by cost code
CREATE OR REPLACE FUNCTION public.get_material_usage_by_cost_code(
    p_project_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    cost_code TEXT,
    material_category public.material_category,
    total_quantity NUMERIC,
    total_cost NUMERIC,
    ticket_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        mt.cost_code,
        mt.material_category,
        SUM(mt.quantity) as total_quantity,
        SUM(mt.quantity * COALESCE(pli.unit_price, 0)) as total_cost,
        COUNT(*)::INTEGER as ticket_count
    FROM public.material_tickets mt
    LEFT JOIN public.po_line_items pli ON mt.matched_po_line_id = pli.id
    WHERE mt.project_id = p_project_id
    AND mt.delivery_date BETWEEN p_start_date AND p_end_date
    AND mt.status = 'verified'
    GROUP BY mt.cost_code, mt.material_category
    ORDER BY total_cost DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 11: VIEWS
-- ============================================================================

-- Material inventory status
CREATE VIEW public.v_material_inventory_status AS
SELECT
    mi.id,
    mi.project_id,
    p.name as project_name,
    mi.material_code,
    mi.description,
    mi.material_category,
    mi.unit_of_measure,
    mi.quantity_on_hand,
    mi.quantity_reserved,
    mi.quantity_available,
    mi.reorder_point,
    mi.unit_cost,
    mi.total_value,
    mi.storage_location,
    s.company_name as supplier_name,
    mi.lead_time_days,
    CASE
        WHEN mi.quantity_on_hand <= 0 THEN 'OUT_OF_STOCK'
        WHEN mi.quantity_on_hand <= mi.min_stock_level THEN 'CRITICAL'
        WHEN mi.quantity_on_hand <= mi.reorder_point THEN 'LOW'
        ELSE 'OK'
    END as stock_status,
    mi.last_count_date,
    mi.organization_id
FROM public.material_inventory mi
JOIN public.projects p ON mi.project_id = p.id
LEFT JOIN public.suppliers s ON mi.primary_supplier_id = s.id
WHERE mi.is_active = true;

-- Supplier quality dashboard
CREATE VIEW public.v_supplier_quality_dashboard AS
SELECT
    s.id as supplier_id,
    s.company_name as supplier_name,
    s.organization_id,
    sqs.score_year,
    sqs.score_quarter,
    sqs.total_deliveries,
    sqs.on_time_pct,
    sqs.rejection_rate_pct,
    sqs.quality_issues,
    sqs.overall_score,
    CASE
        WHEN sqs.overall_score >= 90 THEN 'EXCELLENT'
        WHEN sqs.overall_score >= 75 THEN 'GOOD'
        WHEN sqs.overall_score >= 60 THEN 'ACCEPTABLE'
        WHEN sqs.overall_score >= 40 THEN 'NEEDS_IMPROVEMENT'
        ELSE 'POOR'
    END as rating,
    sqs.certs_current,
    sqs.buy_america_certified,
    sqs.dbe_certified
FROM public.suppliers s
LEFT JOIN public.supplier_quality_scores sqs ON s.id = sqs.supplier_id
WHERE sqs.id IS NOT NULL;

-- Concrete delivery summary
CREATE VIEW public.v_concrete_delivery_summary AS
SELECT
    mt.project_id,
    p.name as project_name,
    cbd.plant_name,
    cbd.mix_design_number,
    cbd.mix_description,
    COUNT(*) as load_count,
    SUM(cbd.load_size_cy) as total_cy,
    AVG(cbd.slump_at_site) as avg_slump,
    AVG(cbd.air_content) as avg_air,
    AVG(cbd.concrete_temp_f) as avg_temp,
    SUM(cbd.water_added_gal) as total_water_added,
    COUNT(*) FILTER (WHERE cbd.rejected) as rejected_loads,
    SUM(cbd.cylinders_made) as total_cylinders,
    MIN(mt.delivery_date) as first_delivery,
    MAX(mt.delivery_date) as last_delivery,
    mt.organization_id
FROM public.material_tickets mt
JOIN public.concrete_batch_details cbd ON mt.id = cbd.material_ticket_id
JOIN public.projects p ON mt.project_id = p.id
GROUP BY
    mt.project_id, p.name, cbd.plant_name,
    cbd.mix_design_number, cbd.mix_description,
    mt.organization_id;

-- ============================================================================
-- PART 12: RLS POLICIES
-- ============================================================================

ALTER TABLE public.material_ticket_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concrete_batch_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asphalt_delivery_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_quality_scores ENABLE ROW LEVEL SECURITY;

-- Ticket line items - access via parent ticket
CREATE POLICY "ticket_lines_access" ON public.material_ticket_line_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.material_tickets mt
            WHERE mt.id = material_ticket_id
            AND mt.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Concrete batch - access via parent ticket
CREATE POLICY "concrete_batch_access" ON public.concrete_batch_details
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.material_tickets mt
            WHERE mt.id = material_ticket_id
            AND mt.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Asphalt delivery - access via parent ticket
CREATE POLICY "asphalt_delivery_access" ON public.asphalt_delivery_details
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.material_tickets mt
            WHERE mt.id = material_ticket_id
            AND mt.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Material inventory - org access
CREATE POLICY "material_inventory_org_access" ON public.material_inventory
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Inventory transactions - org access
CREATE POLICY "inv_transactions_org_access" ON public.material_inventory_transactions
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Material certifications - org access
CREATE POLICY "material_certs_org_access" ON public.material_certifications
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- Supplier scores - org access
CREATE POLICY "supplier_scores_org_access" ON public.supplier_quality_scores
    FOR ALL TO authenticated
    USING (organization_id = public.get_user_organization_id(auth.uid()));

-- ============================================================================
-- PART 13: COMMENTS
-- ============================================================================

COMMENT ON TABLE public.material_ticket_line_items IS 'Line items for multi-material delivery tickets';
COMMENT ON TABLE public.concrete_batch_details IS 'Extended concrete batch data beyond material_tickets';
COMMENT ON TABLE public.asphalt_delivery_details IS 'Extended asphalt delivery data beyond material_tickets';
COMMENT ON TABLE public.material_inventory IS 'On-site material inventory tracking per project';
COMMENT ON TABLE public.material_inventory_transactions IS 'All inventory movements with audit trail';
COMMENT ON TABLE public.material_certifications IS 'Mill certs, test reports, Buy America documentation';
COMMENT ON TABLE public.supplier_quality_scores IS 'Supplier performance metrics and scoring';

COMMENT ON FUNCTION public.calculate_supplier_score IS 'Calculate quality/delivery/documentation scores for supplier';
COMMENT ON FUNCTION public.get_low_stock_materials IS 'Get materials below reorder point for project';
COMMENT ON FUNCTION public.get_material_usage_by_cost_code IS 'Material usage summary by cost code';

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 080: Materials Advanced completed successfully' as status;
