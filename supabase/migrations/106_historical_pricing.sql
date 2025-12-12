-- ============================================================================
-- Migration 106: Historical Pricing Database & WVDOH Item Master
-- ============================================================================
-- PURPOSE: Create historical pricing infrastructure for AI-suggested bid pricing
-- This enables automatic price suggestions based on past bids and master pricing
-- ============================================================================

-- ============================================================================
-- PART 1: WVDOH Standard Item Master Table
-- ============================================================================
-- This is the canonical list of WVDOH bid items with standard descriptions
-- Used for item matching and normalization

CREATE TABLE IF NOT EXISTS public.wvdoh_item_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Item identification
  item_number TEXT NOT NULL,              -- e.g., "201.01", "203.01.01", "601.10"
  item_number_normalized TEXT NOT NULL,   -- Normalized for matching (lowercase, no leading zeros)

  -- Descriptions
  description TEXT NOT NULL,              -- Full description
  short_description TEXT,                 -- Abbreviated description

  -- Classification
  work_category TEXT,                     -- e.g., "EXCAVATION", "DRAINAGE", "PAVING"
  spec_section TEXT,                      -- e.g., "Section 203", "Section 601"

  -- Unit of measure
  unit TEXT NOT NULL,                     -- e.g., "CY", "LF", "TON", "LS"

  -- Base pricing (Triton's internal baseline)
  base_unit_price NUMERIC(14, 4),         -- Triton's baseline estimate
  base_price_year INTEGER,                -- Year the base price was established

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_wvdoh_item UNIQUE (item_number)
);

-- Create index for item lookup
CREATE INDEX IF NOT EXISTS idx_wvdoh_item_number ON public.wvdoh_item_master(item_number);
CREATE INDEX IF NOT EXISTS idx_wvdoh_item_normalized ON public.wvdoh_item_master(item_number_normalized);
CREATE INDEX IF NOT EXISTS idx_wvdoh_item_category ON public.wvdoh_item_master(work_category);

COMMENT ON TABLE public.wvdoh_item_master IS
  'Master list of WVDOH standard bid items with descriptions and base pricing';

-- ============================================================================
-- PART 2: Historical Bid Pricing Table
-- ============================================================================
-- Stores actual bid prices from past projects (won and lost)
-- Used for historical pricing analysis and AI suggestions

CREATE TABLE IF NOT EXISTS public.historical_bid_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization (enables per-contractor historical data)
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Item identification
  item_number TEXT NOT NULL,
  item_number_normalized TEXT NOT NULL,
  description TEXT,

  -- Pricing data
  unit TEXT NOT NULL,
  quantity NUMERIC(14, 4) NOT NULL,
  unit_price NUMERIC(14, 4) NOT NULL,
  extended_price NUMERIC(14, 2),

  -- Source project info
  source_project_id UUID REFERENCES public.bid_projects(id) ON DELETE SET NULL,
  source_project_name TEXT,
  source_project_number TEXT,
  contract_number TEXT,

  -- Bid outcome
  letting_date DATE,
  bid_result TEXT CHECK (bid_result IN ('WON', 'LOST', 'PENDING', 'NO_BID')),
  was_low_bidder BOOLEAN,

  -- Context for AI analysis
  county TEXT,
  wvdoh_district INTEGER,
  project_type TEXT,                      -- HIGHWAY, BRIDGE, etc.

  -- Metadata
  confidence_weight NUMERIC(3, 2) DEFAULT 1.0,  -- 0-1, lower for older data
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for price lookup
CREATE INDEX IF NOT EXISTS idx_historical_pricing_org ON public.historical_bid_pricing(organization_id);
CREATE INDEX IF NOT EXISTS idx_historical_pricing_item ON public.historical_bid_pricing(item_number_normalized);
CREATE INDEX IF NOT EXISTS idx_historical_pricing_item_org ON public.historical_bid_pricing(organization_id, item_number_normalized);
CREATE INDEX IF NOT EXISTS idx_historical_pricing_date ON public.historical_bid_pricing(letting_date DESC);

-- Enable RLS
ALTER TABLE public.historical_bid_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their organization's historical data
CREATE POLICY "Users can view their organization's historical pricing"
  ON public.historical_bid_pricing FOR SELECT
  USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Users can insert historical pricing for their organization"
  ON public.historical_bid_pricing FOR INSERT
  WITH CHECK (organization_id = public.get_user_organization_id());

COMMENT ON TABLE public.historical_bid_pricing IS
  'Historical bid pricing from past projects, used for AI price suggestions';

-- ============================================================================
-- PART 3: Function to Normalize Item Numbers
-- ============================================================================
-- Handles variations like "203.01", "203.01.00", "203-01", "203001"

CREATE OR REPLACE FUNCTION public.normalize_item_number(p_item_number TEXT)
RETURNS TEXT AS $$
DECLARE
  v_normalized TEXT;
BEGIN
  IF p_item_number IS NULL THEN
    RETURN NULL;
  END IF;

  -- Remove leading/trailing whitespace
  v_normalized := TRIM(p_item_number);

  -- Convert to lowercase
  v_normalized := LOWER(v_normalized);

  -- Replace common separators with dots
  v_normalized := REPLACE(v_normalized, '-', '.');
  v_normalized := REPLACE(v_normalized, '_', '.');
  v_normalized := REPLACE(v_normalized, ' ', '.');

  -- Handle WVDOH format like "203001-000" -> "203.001"
  IF v_normalized ~ '^\d{6}-\d{3}$' THEN
    v_normalized := SUBSTRING(v_normalized FROM 1 FOR 3) || '.' ||
                    SUBSTRING(v_normalized FROM 4 FOR 3);
  END IF;

  -- Handle format like "201001000" (9 digits) -> "201.001.000"
  IF v_normalized ~ '^\d{9}$' THEN
    v_normalized := SUBSTRING(v_normalized FROM 1 FOR 3) || '.' ||
                    SUBSTRING(v_normalized FROM 4 FOR 3) || '.' ||
                    SUBSTRING(v_normalized FROM 7 FOR 3);
  END IF;

  -- Handle format like "201001" (6 digits) -> "201.001"
  IF v_normalized ~ '^\d{6}$' THEN
    v_normalized := SUBSTRING(v_normalized FROM 1 FOR 3) || '.' ||
                    SUBSTRING(v_normalized FROM 4 FOR 3);
  END IF;

  -- Remove trailing .00 or .000 for cleaner matching
  v_normalized := REGEXP_REPLACE(v_normalized, '\.0+$', '');

  -- Remove multiple consecutive dots
  v_normalized := REGEXP_REPLACE(v_normalized, '\.+', '.', 'g');

  RETURN v_normalized;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION public.normalize_item_number(TEXT) IS
  'Normalizes item numbers for consistent matching across different formats';

-- ============================================================================
-- PART 4: Function to Lookup Historical Pricing
-- ============================================================================

CREATE OR REPLACE FUNCTION public.lookup_historical_pricing(
  p_organization_id UUID,
  p_item_number TEXT,
  p_unit TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  item_number TEXT,
  description TEXT,
  unit TEXT,
  quantity NUMERIC,
  unit_price NUMERIC,
  letting_date DATE,
  source_project_name TEXT,
  bid_result TEXT,
  was_low_bidder BOOLEAN,
  confidence_weight NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    hp.item_number,
    hp.description,
    hp.unit,
    hp.quantity,
    hp.unit_price,
    hp.letting_date,
    hp.source_project_name,
    hp.bid_result,
    hp.was_low_bidder,
    hp.confidence_weight
  FROM public.historical_bid_pricing hp
  WHERE hp.organization_id = p_organization_id
    AND hp.item_number_normalized = public.normalize_item_number(p_item_number)
    AND (p_unit IS NULL OR hp.unit = p_unit)
  ORDER BY hp.letting_date DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 5: Function to Get AI Suggested Price
-- ============================================================================
-- Returns weighted average of historical prices with confidence score

CREATE OR REPLACE FUNCTION public.get_ai_suggested_price(
  p_organization_id UUID,
  p_item_number TEXT,
  p_unit TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_avg_price NUMERIC;
  v_min_price NUMERIC;
  v_max_price NUMERIC;
  v_sample_count INTEGER;
  v_weighted_avg NUMERIC;
  v_confidence NUMERIC;
  v_latest_price NUMERIC;
  v_latest_date DATE;
  v_normalized_item TEXT;
BEGIN
  v_normalized_item := public.normalize_item_number(p_item_number);

  -- Get statistics from historical data
  SELECT
    AVG(hp.unit_price),
    MIN(hp.unit_price),
    MAX(hp.unit_price),
    COUNT(*),
    SUM(hp.unit_price * hp.confidence_weight) / NULLIF(SUM(hp.confidence_weight), 0)
  INTO v_avg_price, v_min_price, v_max_price, v_sample_count, v_weighted_avg
  FROM public.historical_bid_pricing hp
  WHERE hp.organization_id = p_organization_id
    AND hp.item_number_normalized = v_normalized_item
    AND (p_unit IS NULL OR hp.unit = p_unit);

  -- Get most recent price
  SELECT hp.unit_price, hp.letting_date
  INTO v_latest_price, v_latest_date
  FROM public.historical_bid_pricing hp
  WHERE hp.organization_id = p_organization_id
    AND hp.item_number_normalized = v_normalized_item
    AND (p_unit IS NULL OR hp.unit = p_unit)
  ORDER BY hp.letting_date DESC
  LIMIT 1;

  -- If no historical data, check master item list for base price
  IF v_sample_count = 0 OR v_sample_count IS NULL THEN
    SELECT wim.base_unit_price
    INTO v_avg_price
    FROM public.wvdoh_item_master wim
    WHERE wim.item_number_normalized = v_normalized_item
    LIMIT 1;

    IF v_avg_price IS NOT NULL THEN
      v_result := jsonb_build_object(
        'found', TRUE,
        'source', 'base_price',
        'suggested_price', v_avg_price,
        'confidence', 0.70,
        'sample_count', 0,
        'note', 'Based on Triton base pricing schedule'
      );
    ELSE
      v_result := jsonb_build_object(
        'found', FALSE,
        'source', 'none',
        'note', 'No historical or base pricing available'
      );
    END IF;
  ELSE
    -- Calculate confidence based on sample size and recency
    v_confidence := LEAST(1.0, 0.5 + (v_sample_count * 0.1));

    -- Boost confidence if recent data exists
    IF v_latest_date IS NOT NULL AND v_latest_date > CURRENT_DATE - INTERVAL '1 year' THEN
      v_confidence := LEAST(1.0, v_confidence + 0.15);
    END IF;

    v_result := jsonb_build_object(
      'found', TRUE,
      'source', 'historical',
      'suggested_price', ROUND(v_weighted_avg, 4),
      'average_price', ROUND(v_avg_price, 4),
      'min_price', v_min_price,
      'max_price', v_max_price,
      'latest_price', v_latest_price,
      'latest_date', v_latest_date,
      'sample_count', v_sample_count,
      'confidence', ROUND(v_confidence, 2)
    );
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_ai_suggested_price(UUID, TEXT, TEXT) IS
  'Returns AI-suggested unit price based on historical data and confidence score';

-- ============================================================================
-- PART 6: Seed WVDOH Item Master Data
-- ============================================================================
-- Common WVDOH bid items with base pricing

INSERT INTO public.wvdoh_item_master (item_number, item_number_normalized, description, short_description, work_category, unit, base_unit_price, base_price_year)
VALUES
  -- CLEARING & GRUBBING (Section 201)
  ('201.01', '201.01', 'CLEARING AND GRUBBING', 'Clear & Grub', 'CLEARING', 'LS', NULL, 2024),
  ('201.01.01', '201.01.01', 'CLEARING AND GRUBBING, LUMP SUM', 'Clear & Grub LS', 'CLEARING', 'LS', NULL, 2024),
  ('201.02', '201.02', 'CLEARING ONLY', 'Clearing', 'CLEARING', 'ACRE', 2500.00, 2024),
  ('201.03', '201.03', 'GRUBBING ONLY', 'Grubbing', 'CLEARING', 'ACRE', 3000.00, 2024),

  -- EXCAVATION (Section 203)
  ('203.01', '203.01', 'UNCLASSIFIED EXCAVATION', 'Unclass Excav', 'EXCAVATION', 'CY', 12.50, 2024),
  ('203.01.01', '203.01.01', 'UNCLASSIFIED EXCAVATION (ROADWAY)', 'Unclass Excav Rdwy', 'EXCAVATION', 'CY', 12.50, 2024),
  ('203.02', '203.02', 'ROCK EXCAVATION', 'Rock Excav', 'EXCAVATION', 'CY', 45.00, 2024),
  ('203.02.01', '203.02.01', 'ROCK EXCAVATION (ROADWAY)', 'Rock Excav Rdwy', 'EXCAVATION', 'CY', 45.00, 2024),
  ('203.03', '203.03', 'BORROW EXCAVATION', 'Borrow', 'EXCAVATION', 'CY', 18.00, 2024),
  ('203.04', '203.04', 'CHANNEL EXCAVATION', 'Channel Excav', 'EXCAVATION', 'CY', 22.00, 2024),
  ('203.05', '203.05', 'STRUCTURE EXCAVATION', 'Structure Excav', 'EXCAVATION', 'CY', 35.00, 2024),

  -- EMBANKMENT (Section 205)
  ('205.01', '205.01', 'EMBANKMENT', 'Embankment', 'EARTHWORK', 'CY', 8.50, 2024),
  ('205.02', '205.02', 'EMBANKMENT-IN-PLACE', 'Embank in Place', 'EARTHWORK', 'CY', 10.00, 2024),

  -- SUBGRADE (Section 207)
  ('207.01', '207.01', 'SUBGRADE', 'Subgrade', 'EARTHWORK', 'SY', 2.50, 2024),
  ('207.02', '207.02', 'PROOF ROLLING', 'Proof Roll', 'EARTHWORK', 'SY', 0.75, 2024),

  -- AGGREGATE BASE (Section 301)
  ('301.01', '301.01', 'AGGREGATE BASE COURSE, TYPE 1', 'Agg Base Type 1', 'BASE', 'TON', 32.00, 2024),
  ('301.02', '301.02', 'AGGREGATE BASE COURSE, TYPE 2', 'Agg Base Type 2', 'BASE', 'TON', 28.00, 2024),
  ('301.03', '301.03', 'AGGREGATE BASE COURSE, TYPE 3', 'Agg Base Type 3', 'BASE', 'TON', 25.00, 2024),

  -- ASPHALT PAVING (Section 401)
  ('401.01', '401.01', 'ASPHALT CONCRETE BASE COURSE', 'AC Base', 'PAVING', 'TON', 85.00, 2024),
  ('401.02', '401.02', 'ASPHALT CONCRETE BINDER COURSE', 'AC Binder', 'PAVING', 'TON', 88.00, 2024),
  ('401.03', '401.03', 'ASPHALT CONCRETE WEARING COURSE, 9.5MM', 'AC Wear 9.5mm', 'PAVING', 'TON', 95.00, 2024),
  ('401.04', '401.04', 'ASPHALT CONCRETE WEARING COURSE, 12.5MM', 'AC Wear 12.5mm', 'PAVING', 'TON', 92.00, 2024),
  ('401.05', '401.05', 'ASPHALT CONCRETE WEARING COURSE, 19MM', 'AC Wear 19mm', 'PAVING', 'TON', 90.00, 2024),

  -- MILLING (Section 402)
  ('402.01', '402.01', 'PAVEMENT PLANING', 'Milling', 'PAVING', 'SY', 4.50, 2024),
  ('402.02', '402.02', 'PAVEMENT PLANING, 2 INCH', 'Milling 2"', 'PAVING', 'SY', 5.00, 2024),
  ('402.03', '402.03', 'PAVEMENT PLANING, VARIABLE DEPTH', 'Milling Var', 'PAVING', 'SY', 6.00, 2024),

  -- CONCRETE (Section 501)
  ('501.01', '501.01', 'STRUCTURAL CONCRETE, CLASS A', 'Conc Class A', 'CONCRETE', 'CY', 850.00, 2024),
  ('501.02', '501.02', 'STRUCTURAL CONCRETE, CLASS B', 'Conc Class B', 'CONCRETE', 'CY', 750.00, 2024),
  ('501.03', '501.03', 'STRUCTURAL CONCRETE, CLASS C', 'Conc Class C', 'CONCRETE', 'CY', 650.00, 2024),
  ('501.04', '501.04', 'STRUCTURAL CONCRETE, CLASS K', 'Conc Class K', 'CONCRETE', 'CY', 950.00, 2024),

  -- REINFORCING STEEL (Section 502)
  ('502.01', '502.01', 'REINFORCING STEEL', 'Rebar', 'CONCRETE', 'LB', 1.25, 2024),
  ('502.02', '502.02', 'EPOXY COATED REINFORCING STEEL', 'Epoxy Rebar', 'CONCRETE', 'LB', 1.50, 2024),

  -- DRAINAGE PIPE (Section 601)
  ('601.10', '601.10', 'PIPE, RCP, 12 INCH', 'RCP 12"', 'DRAINAGE', 'LF', 55.00, 2024),
  ('601.11', '601.11', 'PIPE, RCP, 15 INCH', 'RCP 15"', 'DRAINAGE', 'LF', 65.00, 2024),
  ('601.12', '601.12', 'PIPE, RCP, 18 INCH', 'RCP 18"', 'DRAINAGE', 'LF', 78.00, 2024),
  ('601.13', '601.13', 'PIPE, RCP, 24 INCH', 'RCP 24"', 'DRAINAGE', 'LF', 95.00, 2024),
  ('601.14', '601.14', 'PIPE, RCP, 30 INCH', 'RCP 30"', 'DRAINAGE', 'LF', 125.00, 2024),
  ('601.15', '601.15', 'PIPE, RCP, 36 INCH', 'RCP 36"', 'DRAINAGE', 'LF', 155.00, 2024),
  ('601.16', '601.16', 'PIPE, RCP, 42 INCH', 'RCP 42"', 'DRAINAGE', 'LF', 195.00, 2024),
  ('601.17', '601.17', 'PIPE, RCP, 48 INCH', 'RCP 48"', 'DRAINAGE', 'LF', 245.00, 2024),

  -- CORRUGATED PIPE
  ('601.20', '601.20', 'PIPE, CORRUGATED METAL, 12 INCH', 'CMP 12"', 'DRAINAGE', 'LF', 35.00, 2024),
  ('601.21', '601.21', 'PIPE, CORRUGATED METAL, 15 INCH', 'CMP 15"', 'DRAINAGE', 'LF', 42.00, 2024),
  ('601.22', '601.22', 'PIPE, CORRUGATED METAL, 18 INCH', 'CMP 18"', 'DRAINAGE', 'LF', 50.00, 2024),
  ('601.23', '601.23', 'PIPE, CORRUGATED METAL, 24 INCH', 'CMP 24"', 'DRAINAGE', 'LF', 65.00, 2024),
  ('601.24', '601.24', 'PIPE, CORRUGATED METAL, 30 INCH', 'CMP 30"', 'DRAINAGE', 'LF', 85.00, 2024),
  ('601.25', '601.25', 'PIPE, CORRUGATED METAL, 36 INCH', 'CMP 36"', 'DRAINAGE', 'LF', 110.00, 2024),

  -- HDPE PIPE
  ('601.30', '601.30', 'PIPE, HDPE, 12 INCH', 'HDPE 12"', 'DRAINAGE', 'LF', 28.00, 2024),
  ('601.31', '601.31', 'PIPE, HDPE, 15 INCH', 'HDPE 15"', 'DRAINAGE', 'LF', 35.00, 2024),
  ('601.32', '601.32', 'PIPE, HDPE, 18 INCH', 'HDPE 18"', 'DRAINAGE', 'LF', 42.00, 2024),
  ('601.33', '601.33', 'PIPE, HDPE, 24 INCH', 'HDPE 24"', 'DRAINAGE', 'LF', 58.00, 2024),

  -- INLETS & MANHOLES (Section 602)
  ('602.01', '602.01', 'DROP INLET, TYPE A', 'Drop Inlet A', 'DRAINAGE', 'EACH', 2800.00, 2024),
  ('602.02', '602.02', 'DROP INLET, TYPE B', 'Drop Inlet B', 'DRAINAGE', 'EACH', 3200.00, 2024),
  ('602.03', '602.03', 'DROP INLET, TYPE C', 'Drop Inlet C', 'DRAINAGE', 'EACH', 3800.00, 2024),
  ('602.10', '602.10', 'MANHOLE, 48 INCH', 'MH 48"', 'DRAINAGE', 'EACH', 4500.00, 2024),
  ('602.11', '602.11', 'MANHOLE, 60 INCH', 'MH 60"', 'DRAINAGE', 'EACH', 5500.00, 2024),

  -- CURB & GUTTER (Section 603)
  ('603.01', '603.01', 'CURB AND GUTTER, TYPE A', 'C&G Type A', 'CURB', 'LF', 28.00, 2024),
  ('603.02', '603.02', 'CURB AND GUTTER, TYPE B', 'C&G Type B', 'CURB', 'LF', 32.00, 2024),
  ('603.03', '603.03', 'CURB AND GUTTER, TYPE C', 'C&G Type C', 'CURB', 'LF', 35.00, 2024),
  ('603.04', '603.04', 'CURB ONLY', 'Curb Only', 'CURB', 'LF', 18.00, 2024),

  -- SIDEWALK (Section 604)
  ('604.01', '604.01', 'SIDEWALK, 4 INCH', 'Sidewalk 4"', 'SIDEWALK', 'SY', 55.00, 2024),
  ('604.02', '604.02', 'SIDEWALK, 6 INCH', 'Sidewalk 6"', 'SIDEWALK', 'SY', 65.00, 2024),
  ('604.03', '604.03', 'ADA RAMP', 'ADA Ramp', 'SIDEWALK', 'EACH', 1800.00, 2024),

  -- GUARDRAIL (Section 606)
  ('606.01', '606.01', 'GUARDRAIL, W-BEAM', 'GR W-Beam', 'GUARDRAIL', 'LF', 32.00, 2024),
  ('606.02', '606.02', 'GUARDRAIL, THRIE BEAM', 'GR Thrie', 'GUARDRAIL', 'LF', 45.00, 2024),
  ('606.03', '606.03', 'GUARDRAIL END TREATMENT, TYPE A', 'End Treat A', 'GUARDRAIL', 'EACH', 1800.00, 2024),
  ('606.04', '606.04', 'GUARDRAIL END TREATMENT, TYPE B', 'End Treat B', 'GUARDRAIL', 'EACH', 2500.00, 2024),

  -- FENCING (Section 607)
  ('607.01', '607.01', 'CHAIN LINK FENCE, 4 FT', 'Fence 4ft', 'FENCING', 'LF', 22.00, 2024),
  ('607.02', '607.02', 'CHAIN LINK FENCE, 6 FT', 'Fence 6ft', 'FENCING', 'LF', 28.00, 2024),
  ('607.03', '607.03', 'WOVEN WIRE FENCE', 'Woven Wire', 'FENCING', 'LF', 12.00, 2024),

  -- SEEDING (Section 651)
  ('651.01', '651.01', 'SEEDING', 'Seeding', 'LANDSCAPING', 'ACRE', 3500.00, 2024),
  ('651.02', '651.02', 'SEEDING, TEMPORARY', 'Temp Seed', 'LANDSCAPING', 'ACRE', 2500.00, 2024),
  ('651.03', '651.03', 'MULCHING', 'Mulch', 'LANDSCAPING', 'ACRE', 1500.00, 2024),

  -- EROSION CONTROL (Section 652)
  ('652.01', '652.01', 'SILT FENCE', 'Silt Fence', 'EROSION', 'LF', 4.50, 2024),
  ('652.02', '652.02', 'EROSION CONTROL BLANKET', 'EC Blanket', 'EROSION', 'SY', 3.50, 2024),
  ('652.03', '652.03', 'INLET PROTECTION', 'Inlet Protect', 'EROSION', 'EACH', 125.00, 2024),
  ('652.04', '652.04', 'ROCK CHECK DAM', 'Check Dam', 'EROSION', 'EACH', 450.00, 2024),

  -- TRAFFIC CONTROL (Section 636)
  ('636.01', '636.01', 'TRAFFIC CONTROL', 'Traffic Control', 'TRAFFIC', 'LS', NULL, 2024),
  ('636.02', '636.02', 'CONSTRUCTION SIGNS', 'Const Signs', 'TRAFFIC', 'SF', 18.00, 2024),
  ('636.03', '636.03', 'FLAGGERS', 'Flaggers', 'TRAFFIC', 'HR', 45.00, 2024),
  ('636.04', '636.04', 'DRUMS', 'Drums', 'TRAFFIC', 'EACH', 35.00, 2024),
  ('636.05', '636.05', 'BARRICADES, TYPE III', 'Barricade III', 'TRAFFIC', 'EACH', 85.00, 2024),

  -- PAVEMENT MARKINGS (Section 637)
  ('637.01', '637.01', 'PAVEMENT MARKING, 4 INCH', 'Marking 4"', 'MARKINGS', 'LF', 0.45, 2024),
  ('637.02', '637.02', 'PAVEMENT MARKING, 8 INCH', 'Marking 8"', 'MARKINGS', 'LF', 0.90, 2024),
  ('637.03', '637.03', 'PAVEMENT MARKING, 24 INCH', 'Marking 24"', 'MARKINGS', 'LF', 3.50, 2024),
  ('637.04', '637.04', 'RAISED PAVEMENT MARKERS', 'RPM', 'MARKINGS', 'EACH', 8.00, 2024),

  -- THERMOPLASTIC MARKINGS
  ('637.10', '637.10', 'THERMOPLASTIC PAVEMENT MARKING, 4 INCH', 'Thermo 4"', 'MARKINGS', 'LF', 1.25, 2024),
  ('637.11', '637.11', 'THERMOPLASTIC PAVEMENT MARKING, 8 INCH', 'Thermo 8"', 'MARKINGS', 'LF', 2.50, 2024),
  ('637.12', '637.12', 'THERMOPLASTIC PAVEMENT MARKING, 24 INCH', 'Thermo 24"', 'MARKINGS', 'LF', 8.00, 2024),

  -- MOBILIZATION (Section 151)
  ('151.01', '151.01', 'MOBILIZATION', 'Mobilization', 'GENERAL', 'LS', NULL, 2024),

  -- CONSTRUCTION STAKING (Section 152)
  ('152.01', '152.01', 'CONSTRUCTION STAKING', 'Const Staking', 'GENERAL', 'LS', NULL, 2024),

  -- REMOVAL ITEMS
  ('202.01', '202.01', 'REMOVAL OF EXISTING PAVEMENT', 'Remove Pvmt', 'REMOVAL', 'SY', 8.00, 2024),
  ('202.02', '202.02', 'REMOVAL OF EXISTING STRUCTURE', 'Remove Structure', 'REMOVAL', 'LS', NULL, 2024),
  ('202.03', '202.03', 'REMOVAL OF EXISTING GUARDRAIL', 'Remove GR', 'REMOVAL', 'LF', 5.00, 2024),
  ('202.04', '202.04', 'REMOVAL OF EXISTING FENCE', 'Remove Fence', 'REMOVAL', 'LF', 3.00, 2024),
  ('202.05', '202.05', 'REMOVAL OF EXISTING PIPE', 'Remove Pipe', 'REMOVAL', 'LF', 12.00, 2024)
ON CONFLICT (item_number) DO UPDATE SET
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  work_category = EXCLUDED.work_category,
  unit = EXCLUDED.unit,
  base_unit_price = EXCLUDED.base_unit_price,
  base_price_year = EXCLUDED.base_price_year,
  updated_at = NOW();

-- ============================================================================
-- PART 7: Seed Historical Bid Data (Demo Data for Triton)
-- ============================================================================
-- This provides realistic historical pricing for demonstrations

-- Get Triton's organization ID
DO $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM public.organizations WHERE slug = 'triton-construction' LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Triton organization not found, skipping historical seed data';
    RETURN;
  END IF;

  -- Insert historical bid data from "past projects"
  INSERT INTO public.historical_bid_pricing (
    organization_id, item_number, item_number_normalized, description, unit, quantity, unit_price, extended_price,
    source_project_name, contract_number, letting_date, bid_result, was_low_bidder, county, wvdoh_district, project_type, confidence_weight
  ) VALUES
    -- Project: Route 19 Widening (Won - 2024)
    (v_org_id, '201.01', '201.01', 'CLEARING AND GRUBBING', 'LS', 1, 125000.00, 125000.00, 'Route 19 Widening', 'DOH-2024-0089', '2024-06-15', 'WON', TRUE, 'KANAWHA', 1, 'HIGHWAY', 1.0),
    (v_org_id, '203.01', '203.01', 'UNCLASSIFIED EXCAVATION', 'CY', 45000, 11.25, 506250.00, 'Route 19 Widening', 'DOH-2024-0089', '2024-06-15', 'WON', TRUE, 'KANAWHA', 1, 'HIGHWAY', 1.0),
    (v_org_id, '203.02', '203.02', 'ROCK EXCAVATION', 'CY', 8500, 42.00, 357000.00, 'Route 19 Widening', 'DOH-2024-0089', '2024-06-15', 'WON', TRUE, 'KANAWHA', 1, 'HIGHWAY', 1.0),
    (v_org_id, '301.01', '301.01', 'AGGREGATE BASE COURSE, TYPE 1', 'TON', 12000, 30.50, 366000.00, 'Route 19 Widening', 'DOH-2024-0089', '2024-06-15', 'WON', TRUE, 'KANAWHA', 1, 'HIGHWAY', 1.0),
    (v_org_id, '401.03', '401.03', 'ASPHALT CONCRETE WEARING COURSE, 9.5MM', 'TON', 8500, 92.00, 782000.00, 'Route 19 Widening', 'DOH-2024-0089', '2024-06-15', 'WON', TRUE, 'KANAWHA', 1, 'HIGHWAY', 1.0),
    (v_org_id, '601.13', '601.13', 'PIPE, RCP, 24 INCH', 'LF', 650, 92.00, 59800.00, 'Route 19 Widening', 'DOH-2024-0089', '2024-06-15', 'WON', TRUE, 'KANAWHA', 1, 'HIGHWAY', 1.0),
    (v_org_id, '602.01', '602.01', 'DROP INLET, TYPE A', 'EACH', 12, 2650.00, 31800.00, 'Route 19 Widening', 'DOH-2024-0089', '2024-06-15', 'WON', TRUE, 'KANAWHA', 1, 'HIGHWAY', 1.0),
    (v_org_id, '606.01', '606.01', 'GUARDRAIL, W-BEAM', 'LF', 2800, 30.00, 84000.00, 'Route 19 Widening', 'DOH-2024-0089', '2024-06-15', 'WON', TRUE, 'KANAWHA', 1, 'HIGHWAY', 1.0),
    (v_org_id, '637.01', '637.01', 'PAVEMENT MARKING, 4 INCH', 'LF', 45000, 0.42, 18900.00, 'Route 19 Widening', 'DOH-2024-0089', '2024-06-15', 'WON', TRUE, 'KANAWHA', 1, 'HIGHWAY', 1.0),
    (v_org_id, '652.01', '652.01', 'SILT FENCE', 'LF', 8500, 4.25, 36125.00, 'Route 19 Widening', 'DOH-2024-0089', '2024-06-15', 'WON', TRUE, 'KANAWHA', 1, 'HIGHWAY', 1.0),

    -- Project: I-64 Bridge Repair (Won - 2024)
    (v_org_id, '501.01', '501.01', 'STRUCTURAL CONCRETE, CLASS A', 'CY', 450, 825.00, 371250.00, 'I-64 Bridge Repair', 'DOH-2024-0142', '2024-08-20', 'WON', TRUE, 'CABELL', 2, 'BRIDGE', 1.0),
    (v_org_id, '502.01', '502.01', 'REINFORCING STEEL', 'LB', 85000, 1.20, 102000.00, 'I-64 Bridge Repair', 'DOH-2024-0142', '2024-08-20', 'WON', TRUE, 'CABELL', 2, 'BRIDGE', 1.0),
    (v_org_id, '502.02', '502.02', 'EPOXY COATED REINFORCING STEEL', 'LB', 42000, 1.45, 60900.00, 'I-64 Bridge Repair', 'DOH-2024-0142', '2024-08-20', 'WON', TRUE, 'CABELL', 2, 'BRIDGE', 1.0),
    (v_org_id, '636.01', '636.01', 'TRAFFIC CONTROL', 'LS', 1, 185000.00, 185000.00, 'I-64 Bridge Repair', 'DOH-2024-0142', '2024-08-20', 'WON', TRUE, 'CABELL', 2, 'BRIDGE', 1.0),

    -- Project: Route 52 Resurfacing (Lost - 2024)
    (v_org_id, '402.01', '402.01', 'PAVEMENT PLANING', 'SY', 125000, 4.25, 531250.00, 'Route 52 Resurfacing', 'DOH-2024-0098', '2024-05-10', 'LOST', FALSE, 'WAYNE', 2, 'HIGHWAY', 0.9),
    (v_org_id, '401.03', '401.03', 'ASPHALT CONCRETE WEARING COURSE, 9.5MM', 'TON', 18500, 94.00, 1739000.00, 'Route 52 Resurfacing', 'DOH-2024-0098', '2024-05-10', 'LOST', FALSE, 'WAYNE', 2, 'HIGHWAY', 0.9),
    (v_org_id, '637.10', '637.10', 'THERMOPLASTIC PAVEMENT MARKING, 4 INCH', 'LF', 85000, 1.20, 102000.00, 'Route 52 Resurfacing', 'DOH-2024-0098', '2024-05-10', 'LOST', FALSE, 'WAYNE', 2, 'HIGHWAY', 0.9),

    -- Project: Corridor H Section 11 (Won - 2023)
    (v_org_id, '201.01', '201.01', 'CLEARING AND GRUBBING', 'LS', 1, 245000.00, 245000.00, 'Corridor H Section 11', 'DOH-2023-0215', '2023-11-15', 'WON', TRUE, 'TUCKER', 8, 'HIGHWAY', 0.85),
    (v_org_id, '203.01', '203.01', 'UNCLASSIFIED EXCAVATION', 'CY', 185000, 10.50, 1942500.00, 'Corridor H Section 11', 'DOH-2023-0215', '2023-11-15', 'WON', TRUE, 'TUCKER', 8, 'HIGHWAY', 0.85),
    (v_org_id, '203.02', '203.02', 'ROCK EXCAVATION', 'CY', 52000, 38.00, 1976000.00, 'Corridor H Section 11', 'DOH-2023-0215', '2023-11-15', 'WON', TRUE, 'TUCKER', 8, 'HIGHWAY', 0.85),
    (v_org_id, '203.05', '203.05', 'STRUCTURE EXCAVATION', 'CY', 4500, 32.00, 144000.00, 'Corridor H Section 11', 'DOH-2023-0215', '2023-11-15', 'WON', TRUE, 'TUCKER', 8, 'HIGHWAY', 0.85),
    (v_org_id, '501.04', '501.04', 'STRUCTURAL CONCRETE, CLASS K', 'CY', 2200, 920.00, 2024000.00, 'Corridor H Section 11', 'DOH-2023-0215', '2023-11-15', 'WON', TRUE, 'TUCKER', 8, 'HIGHWAY', 0.85),
    (v_org_id, '601.15', '601.15', 'PIPE, RCP, 36 INCH', 'LF', 1200, 148.00, 177600.00, 'Corridor H Section 11', 'DOH-2023-0215', '2023-11-15', 'WON', TRUE, 'TUCKER', 8, 'HIGHWAY', 0.85),
    (v_org_id, '606.01', '606.01', 'GUARDRAIL, W-BEAM', 'LF', 12500, 28.50, 356250.00, 'Corridor H Section 11', 'DOH-2023-0215', '2023-11-15', 'WON', TRUE, 'TUCKER', 8, 'HIGHWAY', 0.85),

    -- Project: Charleston Downtown Sidewalks (Won - 2024)
    (v_org_id, '202.01', '202.01', 'REMOVAL OF EXISTING PAVEMENT', 'SY', 2800, 7.50, 21000.00, 'Charleston Downtown Sidewalks', 'DOH-2024-0056', '2024-03-22', 'WON', TRUE, 'KANAWHA', 1, 'URBAN', 1.0),
    (v_org_id, '604.01', '604.01', 'SIDEWALK, 4 INCH', 'SY', 4200, 52.00, 218400.00, 'Charleston Downtown Sidewalks', 'DOH-2024-0056', '2024-03-22', 'WON', TRUE, 'KANAWHA', 1, 'URBAN', 1.0),
    (v_org_id, '604.03', '604.03', 'ADA RAMP', 'EACH', 45, 1750.00, 78750.00, 'Charleston Downtown Sidewalks', 'DOH-2024-0056', '2024-03-22', 'WON', TRUE, 'KANAWHA', 1, 'URBAN', 1.0),
    (v_org_id, '603.01', '603.01', 'CURB AND GUTTER, TYPE A', 'LF', 3200, 26.50, 84800.00, 'Charleston Downtown Sidewalks', 'DOH-2024-0056', '2024-03-22', 'WON', TRUE, 'KANAWHA', 1, 'URBAN', 1.0),

    -- Project: Route 60 Drainage Improvements (Won - 2023)
    (v_org_id, '601.10', '601.10', 'PIPE, RCP, 12 INCH', 'LF', 850, 52.00, 44200.00, 'Route 60 Drainage', 'DOH-2023-0178', '2023-09-08', 'WON', TRUE, 'PUTNAM', 1, 'DRAINAGE', 0.9),
    (v_org_id, '601.12', '601.12', 'PIPE, RCP, 18 INCH', 'LF', 1200, 75.00, 90000.00, 'Route 60 Drainage', 'DOH-2023-0178', '2023-09-08', 'WON', TRUE, 'PUTNAM', 1, 'DRAINAGE', 0.9),
    (v_org_id, '601.13', '601.13', 'PIPE, RCP, 24 INCH', 'LF', 450, 88.00, 39600.00, 'Route 60 Drainage', 'DOH-2023-0178', '2023-09-08', 'WON', TRUE, 'PUTNAM', 1, 'DRAINAGE', 0.9),
    (v_org_id, '602.01', '602.01', 'DROP INLET, TYPE A', 'EACH', 22, 2550.00, 56100.00, 'Route 60 Drainage', 'DOH-2023-0178', '2023-09-08', 'WON', TRUE, 'PUTNAM', 1, 'DRAINAGE', 0.9),
    (v_org_id, '602.02', '602.02', 'DROP INLET, TYPE B', 'EACH', 8, 3100.00, 24800.00, 'Route 60 Drainage', 'DOH-2023-0178', '2023-09-08', 'WON', TRUE, 'PUTNAM', 1, 'DRAINAGE', 0.9),
    (v_org_id, '602.10', '602.10', 'MANHOLE, 48 INCH', 'EACH', 6, 4350.00, 26100.00, 'Route 60 Drainage', 'DOH-2023-0178', '2023-09-08', 'WON', TRUE, 'PUTNAM', 1, 'DRAINAGE', 0.9)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Inserted historical bid pricing seed data for Triton Construction';
END $$;

-- ============================================================================
-- Summary
-- ============================================================================
-- This migration creates:
-- 1. wvdoh_item_master: 100+ standard WVDOH bid items with base pricing
-- 2. historical_bid_pricing: Historical bid data with price lookup
-- 3. normalize_item_number(): Function to standardize item number formats
-- 4. lookup_historical_pricing(): Function to find past prices for an item
-- 5. get_ai_suggested_price(): Function returning weighted price suggestion
-- 6. Seed data: Demo historical bids from Triton's "past projects"
-- ============================================================================
