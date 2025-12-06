-- ============================================================================
-- Migration 037: WV811 Enhancements
-- ============================================================================
-- Purpose: Add missing fields and enhance alert system based on POC spec
--   - update_by_date: Deadline to renew the ticket (before Good Until)
--   - portal_url: Direct link to WV811 portal ticket
--   - done_for: Client/owner the work is being done for (e.g., WVDOH)
--   - work_date: Planned excavation start date
--   - Enhanced alert types for granular notifications
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Add new columns to wv811_tickets
-- -----------------------------------------------------------------------------

-- Update By date - deadline to renew/update the ticket (different from expiration)
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS update_by_date TIMESTAMPTZ;

-- Portal URL - direct link to view ticket in WV811 portal
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS portal_url TEXT;

-- Done For - client/owner the work is being done for
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS done_for TEXT;

-- Work Date - planned excavation start date (from ticket)
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS work_date TIMESTAMPTZ;

-- Taken Date - when the ticket was taken/created in WV811 system
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS taken_date TIMESTAMPTZ;

-- Risk score for prioritization (calculated field)
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;

-- High risk flags
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS has_gas_utility BOOLEAN DEFAULT FALSE;
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS has_electric_utility BOOLEAN DEFAULT FALSE;
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS is_high_risk BOOLEAN DEFAULT FALSE;

-- Renewal tracking
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS renewal_requested_at TIMESTAMPTZ;
ALTER TABLE public.wv811_tickets
ADD COLUMN IF NOT EXISTS parent_ticket_id UUID REFERENCES public.wv811_tickets(id);

-- Add indexes for new date fields
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_update_by ON public.wv811_tickets(update_by_date);
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_work_date ON public.wv811_tickets(work_date);
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_risk_score ON public.wv811_tickets(risk_score DESC);

-- -----------------------------------------------------------------------------
-- Enhanced Alert Types
-- -----------------------------------------------------------------------------

-- Add new alert types for more granular notifications
DO $$ BEGIN
    -- Add new values to existing enum if they don't exist
    ALTER TYPE wv811_alert_type ADD VALUE IF NOT EXISTS '4_HOUR_UPDATE_BY';
    ALTER TYPE wv811_alert_type ADD VALUE IF NOT EXISTS '2_HOUR_UPDATE_BY';
    ALTER TYPE wv811_alert_type ADD VALUE IF NOT EXISTS 'AT_UPDATE_BY';
    ALTER TYPE wv811_alert_type ADD VALUE IF NOT EXISTS '4_HOUR_EXPIRATION';
    ALTER TYPE wv811_alert_type ADD VALUE IF NOT EXISTS '2_HOUR_EXPIRATION';
    ALTER TYPE wv811_alert_type ADD VALUE IF NOT EXISTS 'DAILY_RADAR';
    ALTER TYPE wv811_alert_type ADD VALUE IF NOT EXISTS 'RENEWAL_REMINDER';
    ALTER TYPE wv811_alert_type ADD VALUE IF NOT EXISTS 'UTILITY_FOLLOWUP';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- Alert Priority Levels
-- -----------------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE wv811_alert_priority AS ENUM (
        'INFO',
        'WARNING',
        'CRITICAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add priority column to alerts
ALTER TABLE public.wv811_ticket_alerts
ADD COLUMN IF NOT EXISTS priority wv811_alert_priority DEFAULT 'INFO';

-- -----------------------------------------------------------------------------
-- Dig Check Results Table - for "Can I Dig Here Today?" audit trail
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wv811_dig_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Check parameters
    project_id UUID,
    location_query TEXT,
    check_date DATE NOT NULL,
    check_time TIME,

    -- Result
    result TEXT NOT NULL, -- 'PASS', 'FAIL', 'WARNING'
    result_message TEXT NOT NULL,

    -- Matched ticket (if any)
    ticket_id UUID REFERENCES public.wv811_tickets(id) ON DELETE SET NULL,

    -- Issues found
    issues JSONB DEFAULT '[]'::jsonb,

    -- Who ran the check
    checked_by UUID REFERENCES auth.users(id),
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- GPS if provided
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

CREATE INDEX IF NOT EXISTS idx_wv811_dig_checks_org ON public.wv811_dig_checks(organization_id);
CREATE INDEX IF NOT EXISTS idx_wv811_dig_checks_date ON public.wv811_dig_checks(check_date);
CREATE INDEX IF NOT EXISTS idx_wv811_dig_checks_result ON public.wv811_dig_checks(result);

-- Enable RLS
ALTER TABLE public.wv811_dig_checks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for dig checks
DROP POLICY IF EXISTS wv811_dig_checks_select ON public.wv811_dig_checks;
CREATE POLICY wv811_dig_checks_select ON public.wv811_dig_checks
    FOR SELECT USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_dig_checks_insert ON public.wv811_dig_checks;
CREATE POLICY wv811_dig_checks_insert ON public.wv811_dig_checks
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

-- -----------------------------------------------------------------------------
-- Daily Radar Sends Table - track when daily briefings were sent
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wv811_daily_radar_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Send details
    sent_date DATE NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Content summary
    tickets_expiring_3_days INTEGER DEFAULT 0,
    tickets_update_today INTEGER DEFAULT 0,
    tickets_pending_utilities INTEGER DEFAULT 0,
    high_risk_digs INTEGER DEFAULT 0,

    -- Delivery status
    email_sent BOOLEAN DEFAULT FALSE,
    push_sent BOOLEAN DEFAULT FALSE,

    CONSTRAINT unique_radar_per_user_day UNIQUE (user_id, sent_date)
);

CREATE INDEX IF NOT EXISTS idx_wv811_radar_sends_date ON public.wv811_daily_radar_sends(sent_date);

-- Enable RLS
ALTER TABLE public.wv811_daily_radar_sends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wv811_radar_sends_select ON public.wv811_daily_radar_sends;
CREATE POLICY wv811_radar_sends_select ON public.wv811_daily_radar_sends
    FOR SELECT USING (user_id = auth.uid() OR organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_radar_sends_service ON public.wv811_daily_radar_sends;
CREATE POLICY wv811_radar_sends_service ON public.wv811_daily_radar_sends
    FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- Draft Communications Table - for auto-drafted renewals and follow-ups
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wv811_draft_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES public.wv811_tickets(id) ON DELETE CASCADE,

    -- Draft type
    draft_type TEXT NOT NULL, -- 'RENEWAL', 'UTILITY_FOLLOWUP'

    -- Target
    target_email TEXT,
    target_utility_code TEXT,

    -- Content
    subject TEXT NOT NULL,
    body TEXT NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'REVIEWED', 'SENT', 'DISCARDED'

    -- Tracking
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    sent_at TIMESTAMPTZ,
    sent_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_wv811_drafts_ticket ON public.wv811_draft_communications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_wv811_drafts_status ON public.wv811_draft_communications(status);
CREATE INDEX IF NOT EXISTS idx_wv811_drafts_type ON public.wv811_draft_communications(draft_type);

-- Enable RLS
ALTER TABLE public.wv811_draft_communications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wv811_drafts_select ON public.wv811_draft_communications;
CREATE POLICY wv811_drafts_select ON public.wv811_draft_communications
    FOR SELECT USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_drafts_insert ON public.wv811_draft_communications;
CREATE POLICY wv811_drafts_insert ON public.wv811_draft_communications
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_drafts_update ON public.wv811_draft_communications;
CREATE POLICY wv811_drafts_update ON public.wv811_draft_communications
    FOR UPDATE USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_drafts_service ON public.wv811_draft_communications;
CREATE POLICY wv811_drafts_service ON public.wv811_draft_communications
    FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- Work Schedule Table - for 3-week lookahead integration
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wv811_work_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    project_id UUID,

    -- Work details
    work_description TEXT NOT NULL,
    planned_date DATE NOT NULL,
    planned_end_date DATE,

    -- Location
    location_address TEXT,
    location_city TEXT,
    location_county TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- 811 Readiness
    matched_ticket_id UUID REFERENCES public.wv811_tickets(id) ON DELETE SET NULL,
    readiness_status TEXT DEFAULT 'UNKNOWN', -- 'GREEN', 'YELLOW', 'RED', 'UNKNOWN'
    readiness_issues JSONB DEFAULT '[]'::jsonb,
    last_checked_at TIMESTAMPTZ,

    -- Metadata
    imported_from TEXT, -- 'MANUAL', 'CSV', 'API'
    external_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_wv811_schedule_org ON public.wv811_work_schedule(organization_id);
CREATE INDEX IF NOT EXISTS idx_wv811_schedule_date ON public.wv811_work_schedule(planned_date);
CREATE INDEX IF NOT EXISTS idx_wv811_schedule_readiness ON public.wv811_work_schedule(readiness_status);

-- Enable RLS
ALTER TABLE public.wv811_work_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wv811_schedule_select ON public.wv811_work_schedule;
CREATE POLICY wv811_schedule_select ON public.wv811_work_schedule
    FOR SELECT USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_schedule_insert ON public.wv811_work_schedule;
CREATE POLICY wv811_schedule_insert ON public.wv811_work_schedule
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_schedule_update ON public.wv811_work_schedule;
CREATE POLICY wv811_schedule_update ON public.wv811_work_schedule
    FOR UPDATE USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_schedule_delete ON public.wv811_work_schedule;
CREATE POLICY wv811_schedule_delete ON public.wv811_work_schedule
    FOR DELETE USING (organization_id = public.get_user_organization_id());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS wv811_work_schedule_updated_at ON public.wv811_work_schedule;
CREATE TRIGGER wv811_work_schedule_updated_at
    BEFORE UPDATE ON public.wv811_work_schedule
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- Helper Functions
-- -----------------------------------------------------------------------------

-- Calculate risk score for a ticket
CREATE OR REPLACE FUNCTION public.calculate_ticket_risk_score(ticket_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    ticket RECORD;
    score INTEGER := 0;
    hours_until_update DOUBLE PRECISION;
    hours_until_expire DOUBLE PRECISION;
    pending_utilities INTEGER;
BEGIN
    SELECT * INTO ticket FROM public.wv811_tickets WHERE id = ticket_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Hours until update_by_date
    IF ticket.update_by_date IS NOT NULL THEN
        hours_until_update := EXTRACT(EPOCH FROM (ticket.update_by_date - NOW())) / 3600;
        IF hours_until_update < 0 THEN
            score := score + 100; -- Past update deadline
        ELSIF hours_until_update < 4 THEN
            score := score + 80;
        ELSIF hours_until_update < 24 THEN
            score := score + 50;
        ELSIF hours_until_update < 48 THEN
            score := score + 20;
        END IF;
    END IF;

    -- Hours until expiration
    hours_until_expire := EXTRACT(EPOCH FROM (ticket.ticket_expires_at::TIMESTAMP - NOW())) / 3600;
    IF hours_until_expire < 0 THEN
        score := score + 100; -- Expired
    ELSIF hours_until_expire < 4 THEN
        score := score + 70;
    ELSIF hours_until_expire < 24 THEN
        score := score + 40;
    ELSIF hours_until_expire < 72 THEN
        score := score + 15;
    END IF;

    -- Pending utilities
    SELECT COUNT(*) INTO pending_utilities
    FROM public.wv811_utility_responses
    WHERE wv811_utility_responses.ticket_id = calculate_ticket_risk_score.ticket_id
    AND response_type IN ('PENDING', 'NO_RESPONSE');

    score := score + (pending_utilities * 10);

    -- High risk utilities
    IF ticket.has_gas_utility THEN
        score := score + 15;
    END IF;
    IF ticket.has_electric_utility THEN
        score := score + 10;
    END IF;

    -- Conflict status
    IF ticket.status = 'CONFLICT' THEN
        score := score + 50;
    END IF;

    RETURN score;
END;
$$;

-- Update risk scores for all active tickets
CREATE OR REPLACE FUNCTION public.update_all_ticket_risk_scores()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    UPDATE public.wv811_tickets
    SET risk_score = public.calculate_ticket_risk_score(id)
    WHERE status NOT IN ('EXPIRED', 'CANCELLED', 'CLEAR');

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- Check if digging is allowed for a location/date
CREATE OR REPLACE FUNCTION public.check_dig_status(
    p_organization_id UUID,
    p_location TEXT,
    p_check_date DATE,
    p_check_time TIME DEFAULT NULL
)
RETURNS TABLE (
    result TEXT,
    result_message TEXT,
    ticket_id UUID,
    ticket_number TEXT,
    issues JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket RECORD;
    v_issues JSONB := '[]'::jsonb;
    v_result TEXT := 'FAIL';
    v_message TEXT := 'No valid ticket found for this location.';
    v_pending_utilities INTEGER;
    v_conflicts INTEGER;
BEGIN
    -- Try to find a matching ticket
    SELECT t.* INTO v_ticket
    FROM public.wv811_tickets t
    WHERE t.organization_id = p_organization_id
    AND t.status NOT IN ('EXPIRED', 'CANCELLED')
    AND (
        LOWER(t.dig_site_address) LIKE '%' || LOWER(p_location) || '%'
        OR LOWER(p_location) LIKE '%' || LOWER(t.dig_site_address) || '%'
        OR t.ticket_number = p_location
    )
    ORDER BY t.ticket_expires_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            'FAIL'::TEXT,
            'No valid ticket found for location: ' || p_location,
            NULL::UUID,
            NULL::TEXT,
            '["No matching ticket found"]'::JSONB;
        RETURN;
    END IF;

    -- Check expiration
    IF v_ticket.ticket_expires_at < p_check_date THEN
        v_issues := v_issues || '["Ticket expired on ' || v_ticket.ticket_expires_at::TEXT || '"]'::jsonb;
        v_result := 'FAIL';
        v_message := 'Ticket #' || v_ticket.ticket_number || ' expired on ' ||
                     TO_CHAR(v_ticket.ticket_expires_at, 'Mon DD, YYYY') || '. Must renew before digging.';
    -- Check update_by deadline
    ELSIF v_ticket.update_by_date IS NOT NULL AND v_ticket.update_by_date < NOW() THEN
        v_issues := v_issues || '["Update By deadline passed on ' || v_ticket.update_by_date::TEXT || '"]'::jsonb;
        v_result := 'WARNING';
        v_message := 'Ticket #' || v_ticket.ticket_number || ' Update By deadline has passed. Consider renewal.';
    ELSE
        v_result := 'PASS';
        v_message := 'You are covered by ticket #' || v_ticket.ticket_number ||
                     ' through ' || TO_CHAR(v_ticket.ticket_expires_at, 'Mon DD, YYYY');
    END IF;

    -- Check pending utilities
    SELECT COUNT(*) INTO v_pending_utilities
    FROM public.wv811_utility_responses
    WHERE ticket_id = v_ticket.id
    AND response_type IN ('PENDING', 'NO_RESPONSE');

    IF v_pending_utilities > 0 THEN
        v_issues := v_issues || ('["' || v_pending_utilities || ' utilities have not responded"]')::jsonb;
        IF v_result = 'PASS' THEN
            v_result := 'WARNING';
            v_message := v_message || ' WARNING: ' || v_pending_utilities || ' utilities pending response.';
        END IF;
    END IF;

    -- Check for conflicts
    SELECT COUNT(*) INTO v_conflicts
    FROM public.wv811_utility_responses
    WHERE ticket_id = v_ticket.id
    AND response_type = 'CONFLICT';

    IF v_conflicts > 0 THEN
        v_issues := v_issues || ('["' || v_conflicts || ' utilities reported CONFLICT"]')::jsonb;
        v_result := 'FAIL';
        v_message := 'CONFLICT: ' || v_conflicts || ' utilities reported conflicts on ticket #' ||
                     v_ticket.ticket_number || '. Do not dig until resolved.';
    END IF;

    -- Add all clear note if passing
    IF v_result = 'PASS' AND v_pending_utilities = 0 THEN
        v_message := v_message || '. All utilities responded with Clear.';
    END IF;

    RETURN QUERY SELECT
        v_result,
        v_message,
        v_ticket.id,
        v_ticket.ticket_number,
        v_issues;
END;
$$;

-- Get tickets needing alerts with enhanced schedule
CREATE OR REPLACE FUNCTION public.get_tickets_needing_alerts_enhanced()
RETURNS TABLE (
    ticket_id UUID,
    ticket_number TEXT,
    update_by_date TIMESTAMPTZ,
    ticket_expires_at DATE,
    hours_until_update DOUBLE PRECISION,
    hours_until_expire DOUBLE PRECISION,
    alert_type wv811_alert_type,
    priority wv811_alert_priority,
    organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH ticket_timing AS (
        SELECT
            t.id,
            t.ticket_number,
            t.update_by_date,
            t.ticket_expires_at,
            t.organization_id,
            CASE
                WHEN t.update_by_date IS NOT NULL THEN
                    EXTRACT(EPOCH FROM (t.update_by_date - NOW())) / 3600
                ELSE NULL
            END AS hours_until_update,
            EXTRACT(EPOCH FROM (
                (t.ticket_expires_at::TIMESTAMP AT TIME ZONE 'America/New_York') -
                (NOW() AT TIME ZONE 'America/New_York')
            )) / 3600 AS hours_until_expire
        FROM public.wv811_tickets t
        WHERE t.status IN ('PENDING', 'IN_PROGRESS', 'RECEIVED')
    )
    -- Update By alerts
    SELECT
        tt.id AS ticket_id,
        tt.ticket_number,
        tt.update_by_date,
        tt.ticket_expires_at,
        tt.hours_until_update,
        tt.hours_until_expire,
        CASE
            WHEN tt.hours_until_update <= 0 THEN 'AT_UPDATE_BY'::wv811_alert_type
            WHEN tt.hours_until_update <= 2 THEN '2_HOUR_UPDATE_BY'::wv811_alert_type
            WHEN tt.hours_until_update <= 4 THEN '4_HOUR_UPDATE_BY'::wv811_alert_type
            WHEN tt.hours_until_update <= 24 THEN '24_HOUR'::wv811_alert_type
            ELSE '48_HOUR'::wv811_alert_type
        END AS alert_type,
        CASE
            WHEN tt.hours_until_update <= 0 THEN 'CRITICAL'::wv811_alert_priority
            WHEN tt.hours_until_update <= 4 THEN 'WARNING'::wv811_alert_priority
            ELSE 'INFO'::wv811_alert_priority
        END AS priority,
        tt.organization_id
    FROM ticket_timing tt
    WHERE tt.hours_until_update IS NOT NULL AND tt.hours_until_update <= 48

    UNION ALL

    -- Expiration alerts
    SELECT
        tt.id AS ticket_id,
        tt.ticket_number,
        tt.update_by_date,
        tt.ticket_expires_at,
        tt.hours_until_update,
        tt.hours_until_expire,
        CASE
            WHEN tt.hours_until_expire <= 0 THEN 'OVERDUE'::wv811_alert_type
            WHEN tt.hours_until_expire <= 2 THEN '2_HOUR_EXPIRATION'::wv811_alert_type
            WHEN tt.hours_until_expire <= 4 THEN '4_HOUR_EXPIRATION'::wv811_alert_type
            WHEN tt.hours_until_expire <= 24 THEN 'SAME_DAY'::wv811_alert_type
            ELSE 'EXPIRING_SOON'::wv811_alert_type
        END AS alert_type,
        CASE
            WHEN tt.hours_until_expire <= 0 THEN 'CRITICAL'::wv811_alert_priority
            WHEN tt.hours_until_expire <= 4 THEN 'CRITICAL'::wv811_alert_priority
            WHEN tt.hours_until_expire <= 24 THEN 'WARNING'::wv811_alert_priority
            ELSE 'INFO'::wv811_alert_priority
        END AS priority,
        tt.organization_id
    FROM ticket_timing tt
    WHERE tt.hours_until_expire <= 48;
END;
$$;

-- Get data for daily radar briefing
CREATE OR REPLACE FUNCTION public.get_daily_radar_data(p_organization_id UUID)
RETURNS TABLE (
    category TEXT,
    tickets JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Tickets expiring in 3 days
    RETURN QUERY
    SELECT
        'expiring_3_days'::TEXT,
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', t.id,
            'ticket_number', t.ticket_number,
            'address', t.dig_site_address,
            'expires_at', t.ticket_expires_at,
            'risk_score', t.risk_score
        )), '[]'::jsonb)
    FROM public.wv811_tickets t
    WHERE t.organization_id = p_organization_id
    AND t.status NOT IN ('EXPIRED', 'CANCELLED', 'CLEAR')
    AND t.ticket_expires_at <= CURRENT_DATE + 3;

    -- Tickets needing update today
    RETURN QUERY
    SELECT
        'update_today'::TEXT,
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', t.id,
            'ticket_number', t.ticket_number,
            'address', t.dig_site_address,
            'update_by', t.update_by_date
        )), '[]'::jsonb)
    FROM public.wv811_tickets t
    WHERE t.organization_id = p_organization_id
    AND t.status NOT IN ('EXPIRED', 'CANCELLED', 'CLEAR')
    AND t.update_by_date IS NOT NULL
    AND t.update_by_date::DATE = CURRENT_DATE;

    -- Tickets with pending utilities
    RETURN QUERY
    SELECT
        'pending_utilities'::TEXT,
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', t.id,
            'ticket_number', t.ticket_number,
            'address', t.dig_site_address,
            'pending_count', (
                SELECT COUNT(*) FROM public.wv811_utility_responses ur
                WHERE ur.ticket_id = t.id AND ur.response_type IN ('PENDING', 'NO_RESPONSE')
            )
        )), '[]'::jsonb)
    FROM public.wv811_tickets t
    WHERE t.organization_id = p_organization_id
    AND t.status NOT IN ('EXPIRED', 'CANCELLED', 'CLEAR')
    AND EXISTS (
        SELECT 1 FROM public.wv811_utility_responses ur
        WHERE ur.ticket_id = t.id AND ur.response_type IN ('PENDING', 'NO_RESPONSE')
    );

    -- High risk tickets
    RETURN QUERY
    SELECT
        'high_risk'::TEXT,
        COALESCE(jsonb_agg(jsonb_build_object(
            'id', t.id,
            'ticket_number', t.ticket_number,
            'address', t.dig_site_address,
            'risk_score', t.risk_score,
            'has_gas', t.has_gas_utility,
            'has_electric', t.has_electric_utility
        )), '[]'::jsonb)
    FROM public.wv811_tickets t
    WHERE t.organization_id = p_organization_id
    AND t.status NOT IN ('EXPIRED', 'CANCELLED', 'CLEAR')
    AND (t.is_high_risk = TRUE OR t.risk_score >= 50);
END;
$$;

-- -----------------------------------------------------------------------------
-- Comments
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN public.wv811_tickets.update_by_date IS 'Deadline to renew/update the ticket (before Good Until expiration)';
COMMENT ON COLUMN public.wv811_tickets.portal_url IS 'Direct URL to view ticket in WV811 portal';
COMMENT ON COLUMN public.wv811_tickets.done_for IS 'Client/owner the work is being done for (e.g., WVDOH)';
COMMENT ON COLUMN public.wv811_tickets.work_date IS 'Planned excavation start date from ticket';
COMMENT ON COLUMN public.wv811_tickets.risk_score IS 'Calculated risk score for prioritization (higher = more urgent)';

COMMENT ON TABLE public.wv811_dig_checks IS 'Audit trail for "Can I Dig Here Today?" checks';
COMMENT ON TABLE public.wv811_daily_radar_sends IS 'Track daily 811 Safety Radar briefing sends';
COMMENT ON TABLE public.wv811_draft_communications IS 'Auto-drafted renewal and follow-up communications';
COMMENT ON TABLE public.wv811_work_schedule IS 'Work schedule for 3-week lookahead integration';

COMMENT ON FUNCTION public.check_dig_status IS 'Check if digging is allowed for a location and date';
COMMENT ON FUNCTION public.calculate_ticket_risk_score IS 'Calculate risk score for a ticket based on deadlines and utilities';
COMMENT ON FUNCTION public.get_daily_radar_data IS 'Get data for daily 811 Safety Radar briefing';
