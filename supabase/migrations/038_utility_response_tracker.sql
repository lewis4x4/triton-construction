-- ============================================================================
-- Migration 038: Utility Response Tracker (Post-CEO Review Pivot)
-- ============================================================================
-- Purpose: Implement the strategic pivot changes from CEO review
--   - Utility Response Tracker (honest about WV law - no true silent assent)
--   - Role-Based Alerting & Quiet Mode
--   - Audit Shield with alert acknowledgements
--   - Photo Verification at utility window close
--   - One-Click Dig Up emergency workflow
--   - 811 Audit Pack export tracking
--
-- LEGAL CONTEXT (from WV811 Excavator Manual):
--   - Utility has **2 business days** to respond (not 48 calendar hours)
--   - If no response, excavator may proceed **at their own risk**
--   - Excavator is NOT exempt from damages - WV does NOT have true silent assent
-- ============================================================================

-- -----------------------------------------------------------------------------
-- New Enums for Utility Response Tracker
-- -----------------------------------------------------------------------------

-- Response status workflow (replaces simple PENDING/CLEAR)
DO $$ BEGIN
    CREATE TYPE wv811_response_status AS ENUM (
        'PENDING',           -- Within 2 business day window, awaiting response
        'CLEAR',             -- Utility confirmed no conflict / clear to dig
        'MARKED',            -- Utility confirmed facilities marked on site
        'UNVERIFIED',        -- 2 business day window closed, no response (proceed at risk)
        'VERIFIED_ON_SITE',  -- Foreman verified marks in field
        'CONFLICT',          -- Utility or crew reported conflict - DO NOT DIG
        'NOT_APPLICABLE'     -- Utility has no facilities in area
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- User alert role type (for role-based alerting)
DO $$ BEGIN
    CREATE TYPE wv811_user_alert_role AS ENUM (
        'OFFICE',  -- PM, Dispatch, Admin - gets all admin/planning alerts
        'FIELD'    -- Foreman, Crew Lead - gets safety-critical only
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alert acknowledgement status
DO $$ BEGIN
    CREATE TYPE wv811_ack_status AS ENUM (
        'SENT',          -- Alert was dispatched
        'DELIVERED',     -- Carrier/push confirmed delivery (best effort)
        'OPENED',        -- User opened/viewed alert (if trackable)
        'ACKNOWLEDGED',  -- User explicitly acknowledged
        'ESCALATED'      -- No acknowledgement, escalated to supervisor
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Emergency incident type
DO $$ BEGIN
    CREATE TYPE wv811_incident_type AS ENUM (
        'DIG_UP',            -- One-Click Dig Up (utility strike)
        'UTILITY_DAMAGE',    -- Utility damaged during excavation
        'NEAR_MISS',         -- Near miss incident
        'EQUIPMENT_CONTACT', -- Equipment contacted utility
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- Extend wv811_utility_responses for Response Tracker
-- -----------------------------------------------------------------------------

-- Add new columns to track response window and verification
ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS response_status wv811_response_status DEFAULT 'PENDING';

-- When the 2 business day response window closes
ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS response_window_opens_at TIMESTAMPTZ;

ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS response_window_closes_at TIMESTAMPTZ;

-- On-site verification tracking
ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS verification_photo_id UUID; -- Links to wv811_photo_verifications

-- Conflict tracking
ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS conflict_logged_by UUID REFERENCES auth.users(id);

ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS conflict_logged_at TIMESTAMPTZ;

ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS conflict_reason TEXT;

ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS conflict_resolved_by UUID REFERENCES auth.users(id);

ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS conflict_resolved_at TIMESTAMPTZ;

ALTER TABLE public.wv811_utility_responses
ADD COLUMN IF NOT EXISTS conflict_resolution_notes TEXT;

-- Index for response window queries
CREATE INDEX IF NOT EXISTS idx_wv811_utility_responses_window
ON public.wv811_utility_responses(response_window_closes_at);

CREATE INDEX IF NOT EXISTS idx_wv811_utility_responses_status
ON public.wv811_utility_responses(response_status);

-- -----------------------------------------------------------------------------
-- User Alert Preferences (Role-Based & Quiet Mode)
-- -----------------------------------------------------------------------------

-- Extend existing wv811_alert_subscriptions or create new table
CREATE TABLE IF NOT EXISTS public.wv811_user_alert_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Role determines what alerts you receive
    alert_role wv811_user_alert_role NOT NULL DEFAULT 'OFFICE',

    -- Quiet Mode - only receive CRITICAL alerts
    quiet_mode_enabled BOOLEAN DEFAULT FALSE,
    quiet_mode_until TIMESTAMPTZ, -- Temporary quiet mode expiration

    -- Channel preferences
    email_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,

    -- For FIELD role, these override quiet mode
    always_alert_on_expired BOOLEAN DEFAULT TRUE,
    always_alert_on_conflict BOOLEAN DEFAULT TRUE,
    always_alert_on_emergency BOOLEAN DEFAULT TRUE,

    -- Daily radar subscription
    daily_radar_enabled BOOLEAN DEFAULT TRUE,
    daily_radar_time TIME DEFAULT '06:00:00', -- 6 AM default

    -- Crew lead override (superintendent can enable full alerts temporarily)
    override_enabled_by UUID REFERENCES auth.users(id),
    override_enabled_at TIMESTAMPTZ,
    override_expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_user_alert_prefs UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_wv811_alert_prefs_org ON public.wv811_user_alert_preferences(organization_id);
CREATE INDEX IF NOT EXISTS idx_wv811_alert_prefs_role ON public.wv811_user_alert_preferences(alert_role);

-- Enable RLS
ALTER TABLE public.wv811_user_alert_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wv811_alert_prefs_select ON public.wv811_user_alert_preferences;
CREATE POLICY wv811_alert_prefs_select ON public.wv811_user_alert_preferences
    FOR SELECT USING (
        user_id = auth.uid() OR
        organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS wv811_alert_prefs_update ON public.wv811_user_alert_preferences;
CREATE POLICY wv811_alert_prefs_update ON public.wv811_user_alert_preferences
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS wv811_alert_prefs_insert ON public.wv811_user_alert_preferences;
CREATE POLICY wv811_alert_prefs_insert ON public.wv811_user_alert_preferences
    FOR INSERT WITH CHECK (user_id = auth.uid() OR organization_id = public.get_user_organization_id());

-- Trigger for updated_at
DROP TRIGGER IF EXISTS wv811_user_alert_preferences_updated_at ON public.wv811_user_alert_preferences;
CREATE TRIGGER wv811_user_alert_preferences_updated_at
    BEFORE UPDATE ON public.wv811_user_alert_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- Alert Acknowledgements (Audit Shield)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wv811_alert_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    alert_id UUID NOT NULL REFERENCES public.wv811_ticket_alerts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Tracking layers (each can have different timestamps)
    status wv811_ack_status NOT NULL DEFAULT 'SENT',

    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_via TEXT[], -- ['email', 'sms', 'push', 'in_app']

    delivered_at TIMESTAMPTZ,
    delivered_via TEXT[], -- Which channels confirmed delivery

    opened_at TIMESTAMPTZ,
    opened_via TEXT, -- Which channel they opened it in

    acknowledged_at TIMESTAMPTZ,
    acknowledged_action TEXT, -- What they committed to do
    acknowledged_via TEXT, -- How they acknowledged (tap, click, etc.)

    -- Escalation tracking
    escalated_at TIMESTAMPTZ,
    escalated_to UUID REFERENCES auth.users(id),
    escalation_reason TEXT,

    -- For critical alerts requiring explicit acknowledgement
    requires_explicit_ack BOOLEAN DEFAULT FALSE,
    ack_deadline TIMESTAMPTZ, -- When to escalate if not acknowledged

    -- Metadata
    device_info JSONB, -- For mobile: device type, OS, app version
    ip_address INET,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wv811_acks_alert ON public.wv811_alert_acknowledgements(alert_id);
CREATE INDEX IF NOT EXISTS idx_wv811_acks_user ON public.wv811_alert_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_wv811_acks_status ON public.wv811_alert_acknowledgements(status);
CREATE INDEX IF NOT EXISTS idx_wv811_acks_pending ON public.wv811_alert_acknowledgements(ack_deadline)
    WHERE status NOT IN ('ACKNOWLEDGED', 'ESCALATED') AND requires_explicit_ack = TRUE;

-- Enable RLS
ALTER TABLE public.wv811_alert_acknowledgements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wv811_acks_select ON public.wv811_alert_acknowledgements;
CREATE POLICY wv811_acks_select ON public.wv811_alert_acknowledgements
    FOR SELECT USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_acks_insert ON public.wv811_alert_acknowledgements;
CREATE POLICY wv811_acks_insert ON public.wv811_alert_acknowledgements
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_acks_update ON public.wv811_alert_acknowledgements;
CREATE POLICY wv811_acks_update ON public.wv811_alert_acknowledgements
    FOR UPDATE USING (user_id = auth.uid() OR organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_acks_service ON public.wv811_alert_acknowledgements;
CREATE POLICY wv811_acks_service ON public.wv811_alert_acknowledgements
    FOR ALL USING (auth.role() = 'service_role');

-- Trigger for updated_at
DROP TRIGGER IF EXISTS wv811_alert_acknowledgements_updated_at ON public.wv811_alert_acknowledgements;
CREATE TRIGGER wv811_alert_acknowledgements_updated_at
    BEFORE UPDATE ON public.wv811_alert_acknowledgements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- Photo Verifications (At Utility Window Close)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wv811_photo_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES public.wv811_tickets(id) ON DELETE CASCADE,
    utility_response_id UUID REFERENCES public.wv811_utility_responses(id) ON DELETE SET NULL,

    -- Photo details
    storage_path TEXT NOT NULL, -- Path in Supabase Storage
    file_name TEXT NOT NULL,
    file_size_bytes INTEGER,
    mime_type TEXT,

    -- Capture metadata
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    captured_by UUID NOT NULL REFERENCES auth.users(id),

    -- GPS data (auto-captured)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    gps_accuracy_meters DECIMAL(8, 2),

    -- Verification details
    verification_type TEXT NOT NULL DEFAULT 'UTILITY_MARKS', -- 'UTILITY_MARKS', 'NO_MARKS_VISIBLE', 'OBSTRUCTION'
    notes TEXT,

    -- If an exception (couldn't take photo)
    is_exception BOOLEAN DEFAULT FALSE,
    exception_reason TEXT, -- 'RAIN', 'EQUIPMENT_BLOCKING', 'DARK', 'OTHER'

    -- Status
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wv811_photos_ticket ON public.wv811_photo_verifications(ticket_id);
CREATE INDEX IF NOT EXISTS idx_wv811_photos_utility ON public.wv811_photo_verifications(utility_response_id);
CREATE INDEX IF NOT EXISTS idx_wv811_photos_captured ON public.wv811_photo_verifications(captured_at);
CREATE INDEX IF NOT EXISTS idx_wv811_photos_exceptions ON public.wv811_photo_verifications(is_exception) WHERE is_exception = TRUE;

-- Enable RLS
ALTER TABLE public.wv811_photo_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wv811_photos_select ON public.wv811_photo_verifications;
CREATE POLICY wv811_photos_select ON public.wv811_photo_verifications
    FOR SELECT USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_photos_insert ON public.wv811_photo_verifications;
CREATE POLICY wv811_photos_insert ON public.wv811_photo_verifications
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_photos_update ON public.wv811_photo_verifications;
CREATE POLICY wv811_photos_update ON public.wv811_photo_verifications
    FOR UPDATE USING (organization_id = public.get_user_organization_id());

-- Update utility_responses to link to photo
ALTER TABLE public.wv811_utility_responses
DROP CONSTRAINT IF EXISTS wv811_utility_responses_photo_fk;

ALTER TABLE public.wv811_utility_responses
ADD CONSTRAINT wv811_utility_responses_photo_fk
FOREIGN KEY (verification_photo_id)
REFERENCES public.wv811_photo_verifications(id) ON DELETE SET NULL;

-- -----------------------------------------------------------------------------
-- Emergency Incidents (One-Click Dig Up)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wv811_emergency_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Incident identification
    incident_number TEXT NOT NULL, -- Auto-generated: ORG-YYYYMMDD-NNN
    incident_type wv811_incident_type NOT NULL,

    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    gps_accuracy_meters DECIMAL(8, 2),
    address TEXT,

    -- Related data
    ticket_id UUID REFERENCES public.wv811_tickets(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,

    -- Reporter info
    reported_by UUID NOT NULL REFERENCES auth.users(id),
    reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reporter_phone TEXT, -- For emergency callback

    -- Crew on site (from time entries or manual)
    crew_on_site JSONB DEFAULT '[]'::jsonb, -- [{user_id, name, role}]

    -- Initial description
    description TEXT,
    utility_type TEXT, -- GAS, ELECTRIC, WATER, TELECOM, etc.
    severity TEXT DEFAULT 'UNKNOWN', -- MINOR, MODERATE, SEVERE, CRITICAL

    -- Notifications sent
    wv811_notified_at TIMESTAMPTZ,
    safety_director_notified_at TIMESTAMPTZ,
    pm_notified_at TIMESTAMPTZ,
    superintendent_notified_at TIMESTAMPTZ,
    vp_notified_at TIMESTAMPTZ,

    -- Escalation chain log
    notification_log JSONB DEFAULT '[]'::jsonb, -- [{role, user_id, method, sent_at, delivered_at}]

    -- Resolution
    status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, RESPONDING, CONTAINED, RESOLVED, CLOSED
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id),
    resolution_notes TEXT,

    -- Photos (multiple)
    photo_ids UUID[] DEFAULT '{}',

    -- Follow-up tracking
    follow_up_required BOOLEAN DEFAULT TRUE,
    follow_up_completed_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wv811_incidents_org ON public.wv811_emergency_incidents(organization_id);
CREATE INDEX IF NOT EXISTS idx_wv811_incidents_status ON public.wv811_emergency_incidents(status);
CREATE INDEX IF NOT EXISTS idx_wv811_incidents_type ON public.wv811_emergency_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_wv811_incidents_reported ON public.wv811_emergency_incidents(reported_at);
CREATE INDEX IF NOT EXISTS idx_wv811_incidents_ticket ON public.wv811_emergency_incidents(ticket_id);

-- Enable RLS
ALTER TABLE public.wv811_emergency_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wv811_incidents_select ON public.wv811_emergency_incidents;
CREATE POLICY wv811_incidents_select ON public.wv811_emergency_incidents
    FOR SELECT USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_incidents_insert ON public.wv811_emergency_incidents;
CREATE POLICY wv811_incidents_insert ON public.wv811_emergency_incidents
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_incidents_update ON public.wv811_emergency_incidents;
CREATE POLICY wv811_incidents_update ON public.wv811_emergency_incidents
    FOR UPDATE USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_incidents_service ON public.wv811_emergency_incidents;
CREATE POLICY wv811_incidents_service ON public.wv811_emergency_incidents
    FOR ALL USING (auth.role() = 'service_role');

-- Trigger for updated_at
DROP TRIGGER IF EXISTS wv811_emergency_incidents_updated_at ON public.wv811_emergency_incidents;
CREATE TRIGGER wv811_emergency_incidents_updated_at
    BEFORE UPDATE ON public.wv811_emergency_incidents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- -----------------------------------------------------------------------------
-- Audit Packs (811 Audit Pack Export)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wv811_audit_packs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL REFERENCES public.wv811_tickets(id) ON DELETE CASCADE,

    -- Export details
    export_name TEXT NOT NULL,
    export_format TEXT NOT NULL DEFAULT 'PDF', -- PDF, ZIP
    storage_path TEXT, -- Path in Supabase Storage
    file_size_bytes INTEGER,

    -- Contents included
    includes_ticket_details BOOLEAN DEFAULT TRUE,
    includes_utility_responses BOOLEAN DEFAULT TRUE,
    includes_alert_log BOOLEAN DEFAULT TRUE,
    includes_acknowledgements BOOLEAN DEFAULT TRUE,
    includes_photos BOOLEAN DEFAULT TRUE,
    includes_field_notes BOOLEAN DEFAULT TRUE,
    includes_dig_checks BOOLEAN DEFAULT TRUE,

    -- Date range for included data
    data_start_date TIMESTAMPTZ,
    data_end_date TIMESTAMPTZ,

    -- Generation metadata
    generated_by UUID NOT NULL REFERENCES auth.users(id),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generation_duration_ms INTEGER,

    -- Download tracking
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMPTZ,
    last_downloaded_by UUID REFERENCES auth.users(id),

    -- Retention (7 years per legal requirement)
    retention_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '7 years'),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wv811_audit_packs_ticket ON public.wv811_audit_packs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_wv811_audit_packs_org ON public.wv811_audit_packs(organization_id);
CREATE INDEX IF NOT EXISTS idx_wv811_audit_packs_generated ON public.wv811_audit_packs(generated_at);

-- Enable RLS
ALTER TABLE public.wv811_audit_packs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wv811_audit_packs_select ON public.wv811_audit_packs;
CREATE POLICY wv811_audit_packs_select ON public.wv811_audit_packs
    FOR SELECT USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_audit_packs_insert ON public.wv811_audit_packs;
CREATE POLICY wv811_audit_packs_insert ON public.wv811_audit_packs
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

-- -----------------------------------------------------------------------------
-- Offline Sync Logs (Track offline data downloads)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wv811_offline_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Sync details
    sync_type TEXT NOT NULL, -- 'MORNING_DOWNLOAD', 'MANUAL_SYNC', 'AUTO_SYNC'
    sync_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_completed_at TIMESTAMPTZ,

    -- What was synced
    tickets_synced INTEGER DEFAULT 0,
    utility_responses_synced INTEGER DEFAULT 0,
    dig_checks_synced INTEGER DEFAULT 0,

    -- Data freshness
    data_as_of TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Device info
    device_id TEXT,
    device_type TEXT, -- 'ios', 'android', 'web'
    app_version TEXT,

    -- Network status
    was_online BOOLEAN DEFAULT TRUE,
    network_type TEXT, -- 'wifi', 'cellular', 'offline'

    -- Errors
    had_errors BOOLEAN DEFAULT FALSE,
    error_log JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_wv811_offline_sync_user ON public.wv811_offline_sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_wv811_offline_sync_date ON public.wv811_offline_sync_logs(sync_started_at);

-- Enable RLS
ALTER TABLE public.wv811_offline_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wv811_offline_sync_select ON public.wv811_offline_sync_logs;
CREATE POLICY wv811_offline_sync_select ON public.wv811_offline_sync_logs
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS wv811_offline_sync_insert ON public.wv811_offline_sync_logs;
CREATE POLICY wv811_offline_sync_insert ON public.wv811_offline_sync_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS wv811_offline_sync_service ON public.wv811_offline_sync_logs;
CREATE POLICY wv811_offline_sync_service ON public.wv811_offline_sync_logs
    FOR ALL USING (auth.role() = 'service_role');

-- -----------------------------------------------------------------------------
-- Helper Functions
-- -----------------------------------------------------------------------------

-- Calculate when the 2-business-day response window closes
CREATE OR REPLACE FUNCTION public.calculate_response_window_close(
    ticket_created_at TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
AS $$
DECLARE
    result_date DATE;
    business_days_to_add INTEGER := 2;
    current_date_check DATE;
BEGIN
    current_date_check := ticket_created_at::DATE;

    -- Add 2 business days
    WHILE business_days_to_add > 0 LOOP
        current_date_check := current_date_check + 1;

        -- Check if it's a business day (not weekend, not holiday)
        IF public.is_wv_business_day(current_date_check) THEN
            business_days_to_add := business_days_to_add - 1;
        END IF;
    END LOOP;

    -- Return end of that business day (5 PM Eastern)
    RETURN (current_date_check::TEXT || ' 17:00:00')::TIMESTAMPTZ AT TIME ZONE 'America/New_York';
END;
$$;

-- Check if utility response window has closed (for transitioning to UNVERIFIED)
CREATE OR REPLACE FUNCTION public.check_utility_response_windows()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_count INTEGER := 0;
BEGIN
    -- Update utility responses where window has closed and still PENDING
    UPDATE public.wv811_utility_responses
    SET response_status = 'UNVERIFIED',
        updated_at = NOW()
    WHERE response_status = 'PENDING'
    AND response_window_closes_at IS NOT NULL
    AND response_window_closes_at < NOW();

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$;

-- Get dig status with updated response tracker logic
CREATE OR REPLACE FUNCTION public.check_dig_status_v2(
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
    issues JSONB,
    utility_statuses JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket RECORD;
    v_issues JSONB := '[]'::jsonb;
    v_utility_statuses JSONB := '[]'::jsonb;
    v_result TEXT := 'FAIL';
    v_message TEXT := 'No valid ticket found for this location.';
    v_pending_count INTEGER;
    v_unverified_count INTEGER;
    v_conflict_count INTEGER;
    v_clear_count INTEGER;
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
            '["No matching ticket found"]'::JSONB,
            '[]'::JSONB;
        RETURN;
    END IF;

    -- Get utility status counts
    SELECT
        COUNT(*) FILTER (WHERE response_status = 'PENDING'),
        COUNT(*) FILTER (WHERE response_status = 'UNVERIFIED'),
        COUNT(*) FILTER (WHERE response_status = 'CONFLICT'),
        COUNT(*) FILTER (WHERE response_status IN ('CLEAR', 'MARKED', 'VERIFIED_ON_SITE', 'NOT_APPLICABLE'))
    INTO v_pending_count, v_unverified_count, v_conflict_count, v_clear_count
    FROM public.wv811_utility_responses
    WHERE ticket_id = v_ticket.id;

    -- Get detailed utility statuses
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'utility_name', utility_name,
        'utility_code', utility_code,
        'utility_type', utility_type,
        'status', response_status,
        'window_closes_at', response_window_closes_at
    )), '[]'::jsonb)
    INTO v_utility_statuses
    FROM public.wv811_utility_responses
    WHERE ticket_id = v_ticket.id;

    -- Check expiration first
    IF v_ticket.ticket_expires_at < p_check_date THEN
        v_issues := v_issues || '["Ticket expired"]'::jsonb;
        v_result := 'FAIL';
        v_message := 'Ticket #' || v_ticket.ticket_number || ' EXPIRED on ' ||
                     TO_CHAR(v_ticket.ticket_expires_at, 'Mon DD, YYYY') || '. Do not dig. Renew ticket first.';

    -- Check for conflicts (highest priority)
    ELSIF v_conflict_count > 0 THEN
        v_issues := v_issues || ('["' || v_conflict_count || ' utilities reported CONFLICT"]')::jsonb;
        v_result := 'FAIL';
        v_message := 'CONFLICT: ' || v_conflict_count || ' utilities reported conflicts on ticket #' ||
                     v_ticket.ticket_number || '. DO NOT DIG until resolved.';

    -- Check for pending utilities (window still open)
    ELSIF v_pending_count > 0 THEN
        v_issues := v_issues || ('["' || v_pending_count || ' utilities still in response window"]')::jsonb;
        v_result := 'WARNING';
        v_message := 'Ticket #' || v_ticket.ticket_number || ' valid. ' || v_pending_count ||
                     ' utilities still in 2-business-day response window. Wait or verify on site before digging.';

    -- Check for unverified (window closed, no response)
    ELSIF v_unverified_count > 0 THEN
        v_issues := v_issues || ('["' || v_unverified_count || ' utilities unverified (no response)"]')::jsonb;
        v_result := 'CAUTION';
        v_message := 'Ticket #' || v_ticket.ticket_number || ' valid through ' ||
                     TO_CHAR(v_ticket.ticket_expires_at, 'Mon DD, YYYY') || '. ' ||
                     v_unverified_count || ' utilities UNVERIFIED - may proceed AT YOUR OWN RISK. ' ||
                     'WV law does NOT exempt you from damages. Verify before digging.';

    -- All clear
    ELSE
        v_result := 'PASS';
        v_message := 'ALL CLEAR: Ticket #' || v_ticket.ticket_number || ' valid through ' ||
                     TO_CHAR(v_ticket.ticket_expires_at, 'Mon DD, YYYY') ||
                     '. All ' || v_clear_count || ' utilities confirmed clear.';
    END IF;

    RETURN QUERY SELECT
        v_result,
        v_message,
        v_ticket.id,
        v_ticket.ticket_number,
        v_issues,
        v_utility_statuses;
END;
$$;

-- Generate emergency incident number
CREATE OR REPLACE FUNCTION public.generate_incident_number(p_organization_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    org_prefix TEXT;
    today_count INTEGER;
    new_number TEXT;
BEGIN
    -- Get org prefix (first 3 chars of slug or name)
    SELECT UPPER(SUBSTRING(COALESCE(slug, name), 1, 3))
    INTO org_prefix
    FROM public.organizations
    WHERE id = p_organization_id;

    -- Count incidents today for this org
    SELECT COUNT(*) + 1
    INTO today_count
    FROM public.wv811_emergency_incidents
    WHERE organization_id = p_organization_id
    AND reported_at::DATE = CURRENT_DATE;

    new_number := org_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(today_count::TEXT, 3, '0');

    RETURN new_number;
END;
$$;

-- Trigger to auto-set incident number
CREATE OR REPLACE FUNCTION public.set_incident_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.incident_number IS NULL OR NEW.incident_number = '' THEN
        NEW.incident_number := public.generate_incident_number(NEW.organization_id);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wv811_emergency_incidents_number ON public.wv811_emergency_incidents;
CREATE TRIGGER wv811_emergency_incidents_number
    BEFORE INSERT ON public.wv811_emergency_incidents
    FOR EACH ROW EXECUTE FUNCTION public.set_incident_number();

-- Set response windows when utility response is created
CREATE OR REPLACE FUNCTION public.set_utility_response_window()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    ticket_created TIMESTAMPTZ;
BEGIN
    -- Get ticket creation date
    SELECT ticket_created_at INTO ticket_created
    FROM public.wv811_tickets
    WHERE id = NEW.ticket_id;

    -- Set response window (opens when ticket created, closes 2 business days later)
    NEW.response_window_opens_at := ticket_created;
    NEW.response_window_closes_at := public.calculate_response_window_close(ticket_created);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wv811_utility_response_window ON public.wv811_utility_responses;
CREATE TRIGGER wv811_utility_response_window
    BEFORE INSERT ON public.wv811_utility_responses
    FOR EACH ROW EXECUTE FUNCTION public.set_utility_response_window();

-- Check if user should receive alert based on role and alert type
CREATE OR REPLACE FUNCTION public.should_user_receive_alert(
    p_user_id UUID,
    p_alert_priority wv811_alert_priority,
    p_is_expired BOOLEAN DEFAULT FALSE,
    p_is_conflict BOOLEAN DEFAULT FALSE,
    p_is_emergency BOOLEAN DEFAULT FALSE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
    prefs RECORD;
BEGIN
    -- Get user preferences
    SELECT * INTO prefs
    FROM public.wv811_user_alert_preferences
    WHERE user_id = p_user_id;

    -- If no preferences, default to receiving all
    IF NOT FOUND THEN
        RETURN TRUE;
    END IF;

    -- Check override (superintendent enabled full alerts)
    IF prefs.override_enabled_by IS NOT NULL
       AND prefs.override_expires_at IS NOT NULL
       AND prefs.override_expires_at > NOW() THEN
        RETURN TRUE;
    END IF;

    -- Always override alerts
    IF p_is_expired AND prefs.always_alert_on_expired THEN
        RETURN TRUE;
    END IF;
    IF p_is_conflict AND prefs.always_alert_on_conflict THEN
        RETURN TRUE;
    END IF;
    IF p_is_emergency AND prefs.always_alert_on_emergency THEN
        RETURN TRUE;
    END IF;

    -- Quiet mode check
    IF prefs.quiet_mode_enabled THEN
        -- In quiet mode, only CRITICAL alerts
        IF prefs.quiet_mode_until IS NULL OR prefs.quiet_mode_until > NOW() THEN
            RETURN p_alert_priority = 'CRITICAL';
        END IF;
    END IF;

    -- Role-based filtering
    IF prefs.alert_role = 'FIELD' THEN
        -- Field users only get CRITICAL and WARNING
        RETURN p_alert_priority IN ('CRITICAL', 'WARNING');
    END IF;

    -- OFFICE role gets everything
    RETURN TRUE;
END;
$$;

-- -----------------------------------------------------------------------------
-- Comments
-- -----------------------------------------------------------------------------

COMMENT ON TYPE wv811_response_status IS 'Utility response status workflow per WV law (2 business day window)';
COMMENT ON TYPE wv811_user_alert_role IS 'User role for determining alert filtering (OFFICE=all, FIELD=safety-critical)';
COMMENT ON TYPE wv811_ack_status IS 'Alert acknowledgement lifecycle (sent→delivered→opened→acknowledged)';
COMMENT ON TYPE wv811_incident_type IS 'Emergency incident types for One-Click Dig Up feature';

COMMENT ON TABLE public.wv811_user_alert_preferences IS 'Role-based alert preferences with Quiet Mode support';
COMMENT ON TABLE public.wv811_alert_acknowledgements IS 'Audit Shield - track alert delivery and acknowledgement for compliance';
COMMENT ON TABLE public.wv811_photo_verifications IS 'Photo verification captures at utility response window close';
COMMENT ON TABLE public.wv811_emergency_incidents IS 'One-Click Dig Up emergency incident records';
COMMENT ON TABLE public.wv811_audit_packs IS '811 Audit Pack exports (7-year retention)';
COMMENT ON TABLE public.wv811_offline_sync_logs IS 'Track offline data downloads for field crews';

COMMENT ON FUNCTION public.calculate_response_window_close IS 'Calculate when the 2-business-day utility response window closes (per WV law)';
COMMENT ON FUNCTION public.check_utility_response_windows IS 'Check all pending utilities and transition to UNVERIFIED if window closed';
COMMENT ON FUNCTION public.check_dig_status_v2 IS 'Enhanced dig status check with utility response tracker logic';
COMMENT ON FUNCTION public.should_user_receive_alert IS 'Determine if user should receive alert based on role and preferences';

-- ============================================================================
-- IMPORTANT LEGAL NOTE (for developers):
--
-- WV does NOT have true "Silent Assent" like some states. When a utility does
-- not respond within 2 business days, the excavator MAY proceed but is NOT
-- exempt from damages. This is why we use "UNVERIFIED" status with clear
-- warnings about liability, not "ASSUMED_CLEAR" which would be misleading.
--
-- Reference: WV811 Excavator Manual, Page 12
-- "by law, you may proceed at your own risk. You will not be exempt from
-- damages resulting from your excavation."
-- ============================================================================
