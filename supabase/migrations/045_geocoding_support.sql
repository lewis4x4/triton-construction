-- ============================================================================
-- Migration 045: Geocoding Support
-- ============================================================================
-- Purpose: Add functions and triggers to support automatic geocoding of
--          WV811 ticket addresses using Geocodio API.
-- Dependencies: 036_wv811_tickets.sql (PostGIS extension)
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Function: update_ticket_location
-- Updates a ticket's dig_site_location with lat/lng coordinates
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_ticket_location(
    p_ticket_id UUID,
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.wv811_tickets
    SET
        dig_site_location = ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
        updated_at = NOW()
    WHERE id = p_ticket_id;
END;
$$;

COMMENT ON FUNCTION public.update_ticket_location IS 'Updates a ticket location with lat/lng coordinates. Called by geocode-ticket Edge Function.';

-- -----------------------------------------------------------------------------
-- Function: get_tickets_without_coordinates
-- Returns tickets that need geocoding
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tickets_without_coordinates(
    p_organization_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    ticket_number TEXT,
    dig_site_address TEXT,
    dig_site_city TEXT,
    dig_site_state TEXT,
    dig_site_zip TEXT,
    dig_site_county TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.ticket_number,
        t.dig_site_address,
        t.dig_site_city,
        t.dig_site_state,
        t.dig_site_zip,
        t.dig_site_county
    FROM public.wv811_tickets t
    WHERE t.dig_site_location IS NULL
        AND (p_organization_id IS NULL OR t.organization_id = p_organization_id)
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_tickets_without_coordinates IS 'Returns tickets that are missing coordinate data and need geocoding.';

-- -----------------------------------------------------------------------------
-- Function: get_ticket_coordinates
-- Returns lat/lng from a ticket's PostGIS point
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_ticket_coordinates(p_ticket_id UUID)
RETURNS TABLE (
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ST_Y(t.dig_site_location) AS latitude,
        ST_X(t.dig_site_location) AS longitude
    FROM public.wv811_tickets t
    WHERE t.id = p_ticket_id
        AND t.dig_site_location IS NOT NULL;
END;
$$;

COMMENT ON FUNCTION public.get_ticket_coordinates IS 'Extracts latitude and longitude from a ticket PostGIS point.';

-- -----------------------------------------------------------------------------
-- Function: count_tickets_without_coordinates
-- Returns count of tickets needing geocoding (for UI display)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.count_tickets_without_coordinates(
    p_organization_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO v_count
    FROM public.wv811_tickets t
    WHERE t.dig_site_location IS NULL
        AND (p_organization_id IS NULL OR t.organization_id = p_organization_id);

    RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.count_tickets_without_coordinates IS 'Returns the count of tickets that need geocoding.';

-- -----------------------------------------------------------------------------
-- Table: geocode_log
-- Tracks geocoding attempts for debugging and avoiding duplicate API calls
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.geocode_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.wv811_tickets(id) ON DELETE CASCADE,

    -- Input address
    input_address TEXT NOT NULL,

    -- Result
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'no_results', 'skipped')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    accuracy_type TEXT,
    formatted_address TEXT,

    -- Provider info
    provider TEXT DEFAULT 'geocodio',

    -- Error info
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups
CREATE INDEX IF NOT EXISTS idx_geocode_log_ticket ON public.geocode_log(ticket_id);
CREATE INDEX IF NOT EXISTS idx_geocode_log_created ON public.geocode_log(created_at);

-- RLS for geocode_log
ALTER TABLE public.geocode_log ENABLE ROW LEVEL SECURITY;

-- Service role can manage all logs
DROP POLICY IF EXISTS geocode_log_service ON public.geocode_log;
CREATE POLICY geocode_log_service ON public.geocode_log
    FOR ALL USING (auth.role() = 'service_role');

-- Users can view logs for their organization's tickets
DROP POLICY IF EXISTS geocode_log_select ON public.geocode_log;
CREATE POLICY geocode_log_select ON public.geocode_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

COMMENT ON TABLE public.geocode_log IS 'Tracks geocoding attempts for debugging and preventing duplicate API calls.';

-- -----------------------------------------------------------------------------
-- View: v_wv811_tickets_with_coords
-- Tickets with extracted lat/lng for easier querying
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_wv811_tickets_with_coords AS
SELECT
    t.*,
    ST_Y(t.dig_site_location) AS latitude,
    ST_X(t.dig_site_location) AS longitude,
    CASE
        WHEN t.dig_site_location IS NOT NULL THEN TRUE
        ELSE FALSE
    END AS has_coordinates
FROM public.wv811_tickets t;

COMMENT ON VIEW public.v_wv811_tickets_with_coords IS 'WV811 tickets with latitude/longitude extracted from PostGIS geometry.';

-- ============================================================================
-- NOTES FOR DEPLOYMENT
-- ============================================================================
-- After running this migration:
-- 1. Add GEOCODIO_API_KEY secret in Supabase Dashboard
-- 2. Deploy geocode-ticket Edge Function:
--    SUPABASE_ACCESS_TOKEN=... npx supabase functions deploy geocode-ticket
-- 3. Geocode existing tickets by calling the Edge Function with geocodeAll: true
-- ============================================================================
