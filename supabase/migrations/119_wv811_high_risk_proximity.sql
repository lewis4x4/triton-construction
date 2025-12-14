-- =============================================================================
-- Migration 119: WV811 High-Risk Proximity Detection
-- Purpose: PostGIS function to find nearby high-risk 811 tickets for push notifications
-- Date: December 14, 2025
-- =============================================================================

-- =============================================================================
-- PART 1: ADD ALERT TYPE FOR HIGH-RISK PROXIMITY
-- =============================================================================

DO $$ BEGIN
    ALTER TYPE wv811_alert_type ADD VALUE IF NOT EXISTS 'HIGH_RISK_PROXIMITY';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- PART 2: HIGH-RISK PROXIMITY DETECTION FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.find_nearby_high_risk_tickets(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters INTEGER DEFAULT 500,
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    ticket_number TEXT,
    dig_site_address TEXT,
    dig_site_city TEXT,
    risk_score INTEGER,
    has_gas_utility BOOLEAN,
    has_electric_utility BOOLEAN,
    status wv811_ticket_status,
    legal_dig_date DATE,
    ticket_expires_at DATE,
    distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.ticket_number,
        t.dig_site_address,
        t.dig_site_city,
        t.risk_score,
        t.has_gas_utility,
        t.has_electric_utility,
        t.status,
        t.legal_dig_date,
        t.ticket_expires_at,
        ST_Distance(
            t.dig_site_location::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) AS distance_meters
    FROM public.wv811_tickets t
    WHERE
        -- Only active tickets (exclude EXPIRED and CANCELLED)
        t.status IN ('PENDING', 'IN_PROGRESS', 'RECEIVED', 'CONFLICT', 'CLEAR')
        -- Not expired
        AND t.ticket_expires_at >= CURRENT_DATE
        -- Has location data
        AND t.dig_site_location IS NOT NULL
        -- Within radius
        AND ST_DWithin(
            t.dig_site_location::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
            p_radius_meters
        )
        -- Is high-risk (any of these conditions)
        AND (
            t.risk_score >= 70
            OR t.has_gas_utility = TRUE
            OR t.has_electric_utility = TRUE
            OR t.is_high_risk = TRUE
        )
        -- Optional organization filter
        AND (p_organization_id IS NULL OR t.organization_id = p_organization_id)
    ORDER BY
        -- Prioritize by risk and distance
        CASE
            WHEN t.risk_score >= 80 THEN 1
            WHEN t.has_gas_utility AND t.has_electric_utility THEN 2
            WHEN t.has_gas_utility THEN 3
            WHEN t.has_electric_utility THEN 4
            ELSE 5
        END,
        ST_Distance(
            t.dig_site_location::geography,
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        )
    LIMIT 10;
END;
$$;

COMMENT ON FUNCTION public.find_nearby_high_risk_tickets IS
'Find high-risk WV811 tickets within a given radius of a GPS location. Used for push notifications when entering high-risk excavation areas.';

-- =============================================================================
-- PART 3: TRACK HIGH-RISK AREA ENTRIES (audit/analytics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.wv811_proximity_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Location that triggered the alert
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,

    -- Tickets that were nearby
    nearby_ticket_ids UUID[] NOT NULL,
    nearest_ticket_id UUID REFERENCES public.wv811_tickets(id) ON DELETE SET NULL,
    nearest_distance_meters DOUBLE PRECISION,

    -- Summary stats
    total_tickets_nearby INTEGER DEFAULT 0,
    gas_utility_count INTEGER DEFAULT 0,
    electric_utility_count INTEGER DEFAULT 0,
    max_risk_score INTEGER DEFAULT 0,

    -- Alert delivery
    notification_queued BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMPTZ,
    user_acknowledged_at TIMESTAMPTZ,

    -- Photo verification (for mandatory photo requirement)
    verification_photo_id UUID,
    verified_at TIMESTAMPTZ,

    -- Metadata
    device_id TEXT,
    app_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_wv811_proximity_alerts_org ON public.wv811_proximity_alerts(organization_id);
CREATE INDEX IF NOT EXISTS idx_wv811_proximity_alerts_user ON public.wv811_proximity_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_wv811_proximity_alerts_created ON public.wv811_proximity_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wv811_proximity_alerts_unverified ON public.wv811_proximity_alerts(verified_at) WHERE verified_at IS NULL;

-- Spatial index for location analytics
CREATE INDEX IF NOT EXISTS idx_wv811_proximity_alerts_location ON public.wv811_proximity_alerts
USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));

-- Enable RLS
ALTER TABLE public.wv811_proximity_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY wv811_proximity_alerts_select ON public.wv811_proximity_alerts
    FOR SELECT USING (
        organization_id = public.get_user_organization_id()
        OR user_id = auth.uid()
    );

CREATE POLICY wv811_proximity_alerts_insert ON public.wv811_proximity_alerts
    FOR INSERT WITH CHECK (
        organization_id = public.get_user_organization_id()
    );

CREATE POLICY wv811_proximity_alerts_service ON public.wv811_proximity_alerts
    FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- PART 4: SUMMARY VIEW FOR DASHBOARD
-- =============================================================================

CREATE OR REPLACE VIEW public.v_wv811_high_risk_summary AS
SELECT
    organization_id,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) AS alerts_today,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS alerts_this_week,
    COUNT(*) FILTER (WHERE verified_at IS NULL AND created_at >= CURRENT_DATE - INTERVAL '24 hours') AS pending_verifications,
    AVG(max_risk_score) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS avg_risk_score,
    SUM(gas_utility_count) FILTER (WHERE created_at >= CURRENT_DATE) AS gas_encounters_today,
    SUM(electric_utility_count) FILTER (WHERE created_at >= CURRENT_DATE) AS electric_encounters_today
FROM public.wv811_proximity_alerts
GROUP BY organization_id;

COMMENT ON VIEW public.v_wv811_high_risk_summary IS 'Dashboard summary of high-risk area proximity alerts';

-- =============================================================================
-- PART 5: LOG PROXIMITY ALERT FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.log_wv811_proximity_alert(
    p_organization_id UUID,
    p_user_id UUID,
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_nearby_tickets JSONB,
    p_device_id TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_alert_id UUID;
    v_ticket_ids UUID[];
    v_nearest_ticket_id UUID;
    v_nearest_distance DOUBLE PRECISION;
    v_gas_count INTEGER := 0;
    v_electric_count INTEGER := 0;
    v_max_risk INTEGER := 0;
    v_ticket JSONB;
BEGIN
    -- Extract ticket IDs and stats from JSON
    FOR v_ticket IN SELECT * FROM jsonb_array_elements(p_nearby_tickets)
    LOOP
        v_ticket_ids := array_append(v_ticket_ids, (v_ticket->>'id')::UUID);

        IF (v_ticket->>'has_gas')::BOOLEAN THEN
            v_gas_count := v_gas_count + 1;
        END IF;

        IF (v_ticket->>'has_electric')::BOOLEAN THEN
            v_electric_count := v_electric_count + 1;
        END IF;

        IF (v_ticket->>'risk_score')::INTEGER > v_max_risk THEN
            v_max_risk := (v_ticket->>'risk_score')::INTEGER;
        END IF;
    END LOOP;

    -- Get nearest ticket
    SELECT (ticket->>'id')::UUID, (ticket->>'distance_meters')::DOUBLE PRECISION
    INTO v_nearest_ticket_id, v_nearest_distance
    FROM jsonb_array_elements(p_nearby_tickets) AS ticket
    ORDER BY (ticket->>'distance_meters')::DOUBLE PRECISION
    LIMIT 1;

    -- Insert alert record
    INSERT INTO public.wv811_proximity_alerts (
        organization_id,
        user_id,
        latitude,
        longitude,
        nearby_ticket_ids,
        nearest_ticket_id,
        nearest_distance_meters,
        total_tickets_nearby,
        gas_utility_count,
        electric_utility_count,
        max_risk_score,
        notification_queued,
        device_id
    ) VALUES (
        p_organization_id,
        p_user_id,
        p_latitude,
        p_longitude,
        v_ticket_ids,
        v_nearest_ticket_id,
        v_nearest_distance,
        jsonb_array_length(p_nearby_tickets),
        v_gas_count,
        v_electric_count,
        v_max_risk,
        TRUE,
        p_device_id
    )
    RETURNING id INTO v_alert_id;

    RETURN v_alert_id;
END;
$$;

COMMENT ON FUNCTION public.log_wv811_proximity_alert IS 'Log a proximity alert when user enters high-risk 811 ticket area';

-- =============================================================================
-- PART 6: COMMENTS
-- =============================================================================

COMMENT ON TABLE public.wv811_proximity_alerts IS
'Audit trail of high-risk area proximity alerts for 811 ticket compliance tracking';

SELECT 'Migration 119: WV811 High-Risk Proximity Detection completed successfully' AS status;
