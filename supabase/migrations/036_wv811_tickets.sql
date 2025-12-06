-- ============================================================================
-- Migration 036: WV811 Locate Ticket Management System
-- ============================================================================
-- Purpose: Create comprehensive schema for managing WV811 utility locate
--          tickets with email ingestion, AI parsing, deadline tracking,
--          multi-channel alerts, and geographic visualization.
-- Dependencies: PostGIS extension for geographic data
-- ============================================================================

-- Enable PostGIS extension for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================================
-- ENUMS
-- ============================================================================

-- Ticket lifecycle status
DO $$ BEGIN
    CREATE TYPE wv811_ticket_status AS ENUM (
        'RECEIVED',      -- Email received, not yet parsed
        'PENDING',       -- Parsed, awaiting utility responses
        'IN_PROGRESS',   -- Work is underway
        'CLEAR',         -- All utilities marked clear/responded
        'CONFLICT',      -- Utility conflict reported
        'EXPIRED',       -- Ticket has expired (10 business days)
        'CANCELLED'      -- Ticket was cancelled
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Utility company response types
DO $$ BEGIN
    CREATE TYPE wv811_utility_response_type AS ENUM (
        'CLEAR',           -- No facilities in area
        'MARKED',          -- Facilities marked on site
        'CONFLICT',        -- Conflict with excavation plan
        'NO_RESPONSE',     -- Utility has not responded
        'NOT_APPLICABLE',  -- Utility not applicable to area
        'PENDING'          -- Awaiting response
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alert notification channels
DO $$ BEGIN
    CREATE TYPE wv811_alert_channel AS ENUM (
        'EMAIL',
        'SMS',
        'PUSH',
        'IN_APP'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alert types based on deadline proximity
DO $$ BEGIN
    CREATE TYPE wv811_alert_type AS ENUM (
        '48_HOUR',           -- 48 hours before legal dig date
        '24_HOUR',           -- 24 hours before legal dig date
        'SAME_DAY',          -- Day of legal dig date
        'OVERDUE',           -- Past expiration date
        'RESPONSE_RECEIVED', -- Utility response received
        'CONFLICT',          -- Conflict reported by utility
        'EXPIRING_SOON',     -- Approaching expiration
        'NEW_TICKET'         -- New ticket created
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Email ingest processing status
DO $$ BEGIN
    CREATE TYPE wv811_email_status AS ENUM (
        'PENDING',      -- Awaiting parsing
        'PROCESSING',   -- Currently being parsed
        'COMPLETED',    -- Successfully parsed
        'FAILED',       -- Parsing failed
        'DUPLICATE'     -- Duplicate ticket detected
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Work type categories
DO $$ BEGIN
    CREATE TYPE wv811_work_type AS ENUM (
        'EXCAVATION',
        'BORING',
        'TRENCHING',
        'DEMOLITION',
        'GRADING',
        'LANDSCAPING',
        'UTILITY_INSTALL',
        'UTILITY_REPAIR',
        'ROAD_WORK',
        'CONSTRUCTION',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Digest frequency options
DO $$ BEGIN
    CREATE TYPE wv811_digest_frequency AS ENUM (
        'NONE',
        'DAILY',
        'WEEKLY',
        'REAL_TIME'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- wv811_holidays: West Virginia state holidays for business day calculations
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wv811_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    holiday_date DATE NOT NULL UNIQUE,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for date lookups
CREATE INDEX IF NOT EXISTS idx_wv811_holidays_date ON public.wv811_holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_wv811_holidays_year ON public.wv811_holidays(year);

-- -----------------------------------------------------------------------------
-- wv811_email_ingests: Raw email storage for audit and reprocessing
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wv811_email_ingests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Email metadata
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Raw content
    raw_body_text TEXT,
    raw_body_html TEXT,
    raw_headers JSONB,

    -- Attachments stored in Supabase Storage
    attachment_paths TEXT[],

    -- Processing status
    status wv811_email_status NOT NULL DEFAULT 'PENDING',
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Parsed ticket reference (after successful processing)
    ticket_id UUID,

    -- Metadata
    sendgrid_message_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for processing queries
CREATE INDEX IF NOT EXISTS idx_wv811_email_ingests_status ON public.wv811_email_ingests(status);
CREATE INDEX IF NOT EXISTS idx_wv811_email_ingests_org ON public.wv811_email_ingests(organization_id);
CREATE INDEX IF NOT EXISTS idx_wv811_email_ingests_received ON public.wv811_email_ingests(received_at);

-- -----------------------------------------------------------------------------
-- wv811_tickets: Main ticket records with parsed data
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wv811_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    original_email_id UUID REFERENCES public.wv811_email_ingests(id) ON DELETE SET NULL,

    -- Ticket identification
    ticket_number TEXT NOT NULL,
    ticket_type TEXT,                       -- Normal, Emergency, Remark, etc.

    -- Dig site location
    dig_site_address TEXT NOT NULL,
    dig_site_city TEXT,
    dig_site_county TEXT,
    dig_site_state TEXT DEFAULT 'WV',
    dig_site_zip TEXT,
    dig_site_location GEOMETRY(POINT, 4326),      -- PostGIS point
    dig_area_polygon GEOMETRY(POLYGON, 4326),     -- PostGIS polygon boundary

    -- Cross streets / landmarks
    cross_street_1 TEXT,
    cross_street_2 TEXT,
    location_description TEXT,

    -- Excavator information
    excavator_company TEXT,
    excavator_name TEXT,
    excavator_phone TEXT,
    excavator_email TEXT,
    excavator_address TEXT,

    -- Work details
    work_type wv811_work_type,
    work_description TEXT,
    depth_in_inches INTEGER,
    extent_description TEXT,

    -- Key dates (all in Eastern Time)
    ticket_created_at TIMESTAMPTZ NOT NULL,
    legal_dig_date DATE NOT NULL,           -- 2 full business days after created
    ticket_expires_at DATE NOT NULL,        -- 10 business days after legal dig date
    work_start_date DATE,
    work_end_date DATE,

    -- Status tracking
    status wv811_ticket_status NOT NULL DEFAULT 'RECEIVED',
    status_changed_at TIMESTAMPTZ DEFAULT NOW(),

    -- AI parsing metadata
    parsed_at TIMESTAMPTZ,
    parsing_confidence DECIMAL(3, 2),       -- 0.00 to 1.00
    parsing_model TEXT,
    raw_parsed_data JSONB,                  -- Full AI response for debugging

    -- Utility tracking
    total_utilities INTEGER DEFAULT 0,
    responded_utilities INTEGER DEFAULT 0,

    -- Project linking (optional)
    project_id UUID,                        -- Foreign key added separately

    -- Notifications
    last_alert_sent_at TIMESTAMPTZ,
    alert_count INTEGER DEFAULT 0,

    -- Metadata
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT unique_ticket_per_org UNIQUE (organization_id, ticket_number)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_org ON public.wv811_tickets(organization_id);
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_status ON public.wv811_tickets(status);
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_legal_dig ON public.wv811_tickets(legal_dig_date);
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_expires ON public.wv811_tickets(ticket_expires_at);
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_number ON public.wv811_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_project ON public.wv811_tickets(project_id);

-- Spatial index for geographic queries
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_location ON public.wv811_tickets USING GIST (dig_site_location);
CREATE INDEX IF NOT EXISTS idx_wv811_tickets_polygon ON public.wv811_tickets USING GIST (dig_area_polygon);

-- Add foreign key to email_ingests after tickets table exists (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_email_ticket'
        AND table_name = 'wv811_email_ingests'
    ) THEN
        ALTER TABLE public.wv811_email_ingests
            ADD CONSTRAINT fk_email_ticket
            FOREIGN KEY (ticket_id) REFERENCES public.wv811_tickets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- -----------------------------------------------------------------------------
-- wv811_utility_responses: Individual utility company responses
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wv811_utility_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.wv811_tickets(id) ON DELETE CASCADE,

    -- Utility information
    utility_code TEXT NOT NULL,             -- Utility's 811 code
    utility_name TEXT NOT NULL,
    utility_type TEXT,                      -- Gas, Electric, Telecom, Water, Sewer, etc.

    -- Response details
    response_type wv811_utility_response_type NOT NULL DEFAULT 'PENDING',
    response_received_at TIMESTAMPTZ,
    response_message TEXT,

    -- Contact for this utility
    contact_name TEXT,
    contact_phone TEXT,
    contact_email TEXT,

    -- Marking details (if applicable)
    marking_instructions TEXT,
    marked_at TIMESTAMPTZ,
    marked_by TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_utility_per_ticket UNIQUE (ticket_id, utility_code)
);

-- Index for response status
CREATE INDEX IF NOT EXISTS idx_wv811_responses_ticket ON public.wv811_utility_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_wv811_responses_type ON public.wv811_utility_responses(response_type);

-- -----------------------------------------------------------------------------
-- wv811_alert_subscriptions: User notification preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wv811_alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Subscription scope (all tickets, specific project, or specific area)
    scope_type TEXT NOT NULL DEFAULT 'ALL', -- ALL, PROJECT, AREA
    project_id UUID,                         -- If scope is PROJECT
    area_polygon GEOMETRY(POLYGON, 4326),   -- If scope is AREA

    -- Alert preferences by type
    alert_48_hour BOOLEAN DEFAULT TRUE,
    alert_24_hour BOOLEAN DEFAULT TRUE,
    alert_same_day BOOLEAN DEFAULT TRUE,
    alert_overdue BOOLEAN DEFAULT TRUE,
    alert_response_received BOOLEAN DEFAULT TRUE,
    alert_conflict BOOLEAN DEFAULT TRUE,
    alert_new_ticket BOOLEAN DEFAULT TRUE,

    -- Channel preferences
    channel_email BOOLEAN DEFAULT TRUE,
    channel_sms BOOLEAN DEFAULT FALSE,
    channel_push BOOLEAN DEFAULT TRUE,
    channel_in_app BOOLEAN DEFAULT TRUE,

    -- Contact info for alerts
    email_address TEXT,
    phone_number TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for finding subscriptions
CREATE INDEX IF NOT EXISTS idx_wv811_subscriptions_user ON public.wv811_alert_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_wv811_subscriptions_org ON public.wv811_alert_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_wv811_subscriptions_active ON public.wv811_alert_subscriptions(is_active);

-- -----------------------------------------------------------------------------
-- wv811_ticket_alerts: Alert history and status
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wv811_ticket_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.wv811_tickets(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.wv811_alert_subscriptions(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Alert details
    alert_type wv811_alert_type NOT NULL,
    channel wv811_alert_channel NOT NULL,

    -- Delivery status
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,

    -- Alert content
    subject TEXT,
    body TEXT,

    -- External IDs (for tracking delivery)
    external_message_id TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for alert queries
CREATE INDEX IF NOT EXISTS idx_wv811_alerts_ticket ON public.wv811_ticket_alerts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_wv811_alerts_user ON public.wv811_ticket_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_wv811_alerts_type ON public.wv811_ticket_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_wv811_alerts_sent ON public.wv811_ticket_alerts(sent_at);

-- -----------------------------------------------------------------------------
-- wv811_project_tickets: Link tickets to construction projects
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wv811_project_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.wv811_tickets(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,               -- References projects table

    -- Link metadata
    linked_by UUID REFERENCES auth.users(id),
    linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,

    CONSTRAINT unique_ticket_project UNIQUE (ticket_id, project_id)
);

-- Index for project lookups
CREATE INDEX IF NOT EXISTS idx_wv811_project_tickets_project ON public.wv811_project_tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_wv811_project_tickets_ticket ON public.wv811_project_tickets(ticket_id);

-- -----------------------------------------------------------------------------
-- wv811_ticket_notes: Comments and activity log
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wv811_ticket_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.wv811_tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Note content
    note_type TEXT NOT NULL DEFAULT 'COMMENT', -- COMMENT, STATUS_CHANGE, SYSTEM
    content TEXT NOT NULL,

    -- For status changes
    old_status wv811_ticket_status,
    new_status wv811_ticket_status,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ticket notes
CREATE INDEX IF NOT EXISTS idx_wv811_notes_ticket ON public.wv811_ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_wv811_notes_created ON public.wv811_ticket_notes(created_at);

-- -----------------------------------------------------------------------------
-- wv811_ticket_attachments: Uploaded files/photos
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wv811_ticket_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.wv811_tickets(id) ON DELETE CASCADE,

    -- File details
    file_name TEXT NOT NULL,
    file_type TEXT,
    file_size_bytes INTEGER,
    storage_path TEXT NOT NULL,             -- Path in Supabase Storage

    -- GPS data (if photo)
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    taken_at TIMESTAMPTZ,

    -- Description
    description TEXT,

    -- Metadata
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for ticket attachments
CREATE INDEX IF NOT EXISTS idx_wv811_attachments_ticket ON public.wv811_ticket_attachments(ticket_id);

-- -----------------------------------------------------------------------------
-- wv811_digest_preferences: Daily/weekly digest settings
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wv811_digest_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Digest settings
    frequency wv811_digest_frequency NOT NULL DEFAULT 'DAILY',
    send_time TIME DEFAULT '07:00',         -- Time to send digest (Eastern)
    send_day_of_week INTEGER,               -- 0-6 for weekly (0=Sunday)

    -- Content preferences
    include_pending BOOLEAN DEFAULT TRUE,
    include_expiring BOOLEAN DEFAULT TRUE,
    include_conflicts BOOLEAN DEFAULT TRUE,
    include_summary BOOLEAN DEFAULT TRUE,

    -- Contact
    email_address TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_sent_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_user_digest UNIQUE (user_id, organization_id)
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- is_wv_business_day: Check if a date is a WV business day
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_wv_business_day(check_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Check if weekend
    IF EXTRACT(DOW FROM check_date) IN (0, 6) THEN
        RETURN FALSE;
    END IF;

    -- Check if holiday
    IF EXISTS (SELECT 1 FROM public.wv811_holidays WHERE holiday_date = check_date) THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

-- -----------------------------------------------------------------------------
-- add_wv_business_days: Add business days to a date
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_wv_business_days(
    start_date DATE,
    num_days INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    working_date DATE := start_date;
    days_added INTEGER := 0;
BEGIN
    WHILE days_added < num_days LOOP
        working_date := working_date + 1;
        IF public.is_wv_business_day(working_date) THEN
            days_added := days_added + 1;
        END IF;
    END LOOP;

    RETURN working_date;
END;
$$;

-- -----------------------------------------------------------------------------
-- calculate_legal_dig_date: Calculate legal dig date (2 full business days)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_legal_dig_date(ticket_created TIMESTAMPTZ)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    start_date DATE;
BEGIN
    -- Get the date portion in Eastern Time
    start_date := (ticket_created AT TIME ZONE 'America/New_York')::DATE;

    -- Add 2 full business days
    RETURN public.add_wv_business_days(start_date, 2);
END;
$$;

-- -----------------------------------------------------------------------------
-- calculate_ticket_expiration: Calculate ticket expiration (10 business days after legal dig)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_ticket_expiration(legal_dig DATE)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN public.add_wv_business_days(legal_dig, 10);
END;
$$;

-- -----------------------------------------------------------------------------
-- get_tickets_needing_alerts: Find tickets that need alerts sent
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_tickets_needing_alerts()
RETURNS TABLE (
    ticket_id UUID,
    ticket_number TEXT,
    legal_dig_date DATE,
    ticket_expires_at DATE,
    hours_until_dig DOUBLE PRECISION,
    alert_type wv811_alert_type,
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
            t.legal_dig_date,
            t.ticket_expires_at,
            t.organization_id,
            EXTRACT(EPOCH FROM (
                (t.legal_dig_date::TIMESTAMP AT TIME ZONE 'America/New_York') -
                (NOW() AT TIME ZONE 'America/New_York')
            )) / 3600 AS hours_until
        FROM public.wv811_tickets t
        WHERE t.status IN ('PENDING', 'IN_PROGRESS')
    )
    SELECT
        tt.id AS ticket_id,
        tt.ticket_number,
        tt.legal_dig_date,
        tt.ticket_expires_at,
        tt.hours_until AS hours_until_dig,
        CASE
            WHEN tt.hours_until <= 0 AND tt.hours_until > -24 THEN 'SAME_DAY'::wv811_alert_type
            WHEN tt.hours_until <= 24 AND tt.hours_until > 0 THEN '24_HOUR'::wv811_alert_type
            WHEN tt.hours_until <= 48 AND tt.hours_until > 24 THEN '48_HOUR'::wv811_alert_type
            WHEN NOW()::DATE > tt.ticket_expires_at THEN 'OVERDUE'::wv811_alert_type
            ELSE 'EXPIRING_SOON'::wv811_alert_type
        END AS alert_type,
        tt.organization_id
    FROM ticket_timing tt
    WHERE
        -- Within 48 hours of legal dig date
        tt.hours_until <= 48
        OR
        -- Past expiration
        NOW()::DATE > tt.ticket_expires_at;
END;
$$;

-- -----------------------------------------------------------------------------
-- auto_expire_tickets: Mark expired tickets
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auto_expire_tickets()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    WITH expired AS (
        UPDATE public.wv811_tickets
        SET
            status = 'EXPIRED',
            status_changed_at = NOW(),
            updated_at = NOW()
        WHERE
            status IN ('PENDING', 'IN_PROGRESS')
            AND ticket_expires_at < CURRENT_DATE
        RETURNING id
    )
    SELECT COUNT(*) INTO expired_count FROM expired;

    RETURN expired_count;
END;
$$;

-- -----------------------------------------------------------------------------
-- update_ticket_utility_counts: Update utility response counts
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_ticket_utility_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.wv811_tickets
    SET
        total_utilities = (
            SELECT COUNT(*) FROM public.wv811_utility_responses
            WHERE ticket_id = COALESCE(NEW.ticket_id, OLD.ticket_id)
        ),
        responded_utilities = (
            SELECT COUNT(*) FROM public.wv811_utility_responses
            WHERE ticket_id = COALESCE(NEW.ticket_id, OLD.ticket_id)
            AND response_type NOT IN ('PENDING', 'NO_RESPONSE')
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.ticket_id, OLD.ticket_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- -----------------------------------------------------------------------------
-- check_ticket_all_clear: Check if all utilities have responded and mark clear
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_ticket_all_clear()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    pending_count INTEGER;
    conflict_count INTEGER;
BEGIN
    -- Count pending responses
    SELECT COUNT(*) INTO pending_count
    FROM public.wv811_utility_responses
    WHERE ticket_id = NEW.ticket_id
    AND response_type IN ('PENDING', 'NO_RESPONSE');

    -- Count conflicts
    SELECT COUNT(*) INTO conflict_count
    FROM public.wv811_utility_responses
    WHERE ticket_id = NEW.ticket_id
    AND response_type = 'CONFLICT';

    -- Update ticket status if appropriate
    IF pending_count = 0 THEN
        IF conflict_count > 0 THEN
            UPDATE public.wv811_tickets
            SET status = 'CONFLICT', status_changed_at = NOW(), updated_at = NOW()
            WHERE id = NEW.ticket_id AND status = 'PENDING';
        ELSE
            UPDATE public.wv811_tickets
            SET status = 'CLEAR', status_changed_at = NOW(), updated_at = NOW()
            WHERE id = NEW.ticket_id AND status = 'PENDING';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update timestamps
DROP TRIGGER IF EXISTS wv811_email_ingests_updated_at ON public.wv811_email_ingests;
CREATE TRIGGER wv811_email_ingests_updated_at
    BEFORE UPDATE ON public.wv811_email_ingests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS wv811_tickets_updated_at ON public.wv811_tickets;
CREATE TRIGGER wv811_tickets_updated_at
    BEFORE UPDATE ON public.wv811_tickets
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS wv811_utility_responses_updated_at ON public.wv811_utility_responses;
CREATE TRIGGER wv811_utility_responses_updated_at
    BEFORE UPDATE ON public.wv811_utility_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS wv811_alert_subscriptions_updated_at ON public.wv811_alert_subscriptions;
CREATE TRIGGER wv811_alert_subscriptions_updated_at
    BEFORE UPDATE ON public.wv811_alert_subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS wv811_digest_preferences_updated_at ON public.wv811_digest_preferences;
CREATE TRIGGER wv811_digest_preferences_updated_at
    BEFORE UPDATE ON public.wv811_digest_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Utility response triggers
DROP TRIGGER IF EXISTS wv811_utility_counts_insert ON public.wv811_utility_responses;
CREATE TRIGGER wv811_utility_counts_insert
    AFTER INSERT ON public.wv811_utility_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_ticket_utility_counts();

DROP TRIGGER IF EXISTS wv811_utility_counts_update ON public.wv811_utility_responses;
CREATE TRIGGER wv811_utility_counts_update
    AFTER UPDATE ON public.wv811_utility_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_ticket_utility_counts();

DROP TRIGGER IF EXISTS wv811_utility_counts_delete ON public.wv811_utility_responses;
CREATE TRIGGER wv811_utility_counts_delete
    AFTER DELETE ON public.wv811_utility_responses
    FOR EACH ROW EXECUTE FUNCTION public.update_ticket_utility_counts();

-- Check all clear on response update
DROP TRIGGER IF EXISTS wv811_check_all_clear ON public.wv811_utility_responses;
CREATE TRIGGER wv811_check_all_clear
    AFTER UPDATE OF response_type ON public.wv811_utility_responses
    FOR EACH ROW
    WHEN (OLD.response_type IS DISTINCT FROM NEW.response_type)
    EXECUTE FUNCTION public.check_ticket_all_clear();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- v_wv811_active_tickets: Active tickets with key metrics
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_wv811_active_tickets AS
SELECT
    t.id,
    t.organization_id,
    t.ticket_number,
    t.dig_site_address,
    t.dig_site_city,
    t.dig_site_county,
    t.excavator_company,
    t.work_type,
    t.ticket_created_at,
    t.legal_dig_date,
    t.ticket_expires_at,
    t.status,
    t.total_utilities,
    t.responded_utilities,
    t.total_utilities - t.responded_utilities AS pending_utilities,
    EXTRACT(EPOCH FROM (
        (t.legal_dig_date::TIMESTAMP AT TIME ZONE 'America/New_York') -
        (NOW() AT TIME ZONE 'America/New_York')
    )) / 3600 AS hours_until_dig,
    CASE
        WHEN t.legal_dig_date < CURRENT_DATE THEN 'PAST_DIG_DATE'
        WHEN t.legal_dig_date = CURRENT_DATE THEN 'DIG_TODAY'
        WHEN t.legal_dig_date = CURRENT_DATE + 1 THEN 'DIG_TOMORROW'
        ELSE 'UPCOMING'
    END AS dig_urgency,
    t.project_id,
    t.created_at
FROM public.wv811_tickets t
WHERE t.status NOT IN ('EXPIRED', 'CANCELLED');

-- -----------------------------------------------------------------------------
-- v_wv811_expiring_soon: Tickets expiring within 3 days
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_wv811_expiring_soon AS
SELECT
    t.*,
    t.ticket_expires_at - CURRENT_DATE AS days_until_expiration
FROM public.wv811_tickets t
WHERE
    t.status NOT IN ('EXPIRED', 'CANCELLED', 'CLEAR')
    AND t.ticket_expires_at <= CURRENT_DATE + 3;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.wv811_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wv811_email_ingests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wv811_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wv811_utility_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wv811_alert_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wv811_ticket_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wv811_project_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wv811_ticket_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wv811_ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wv811_digest_preferences ENABLE ROW LEVEL SECURITY;

-- Holidays: Read-only for all authenticated users
DROP POLICY IF EXISTS wv811_holidays_select ON public.wv811_holidays;
CREATE POLICY wv811_holidays_select ON public.wv811_holidays
    FOR SELECT USING (true);

-- Email ingests: Organization members only
DROP POLICY IF EXISTS wv811_email_ingests_select ON public.wv811_email_ingests;
CREATE POLICY wv811_email_ingests_select ON public.wv811_email_ingests
    FOR SELECT USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_email_ingests_insert ON public.wv811_email_ingests;
CREATE POLICY wv811_email_ingests_insert ON public.wv811_email_ingests
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

-- Service role policy for webhook ingestion
DROP POLICY IF EXISTS wv811_email_ingests_service ON public.wv811_email_ingests;
CREATE POLICY wv811_email_ingests_service ON public.wv811_email_ingests
    FOR ALL USING (auth.role() = 'service_role');

-- Tickets: Organization members can read, write based on role
DROP POLICY IF EXISTS wv811_tickets_select ON public.wv811_tickets;
CREATE POLICY wv811_tickets_select ON public.wv811_tickets
    FOR SELECT USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_tickets_insert ON public.wv811_tickets;
CREATE POLICY wv811_tickets_insert ON public.wv811_tickets
    FOR INSERT WITH CHECK (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_tickets_update ON public.wv811_tickets;
CREATE POLICY wv811_tickets_update ON public.wv811_tickets
    FOR UPDATE USING (organization_id = public.get_user_organization_id());

DROP POLICY IF EXISTS wv811_tickets_delete ON public.wv811_tickets;
CREATE POLICY wv811_tickets_delete ON public.wv811_tickets
    FOR DELETE USING (
        organization_id = public.get_user_organization_id()
        AND public.get_user_role_level() <= 20  -- PM or higher
    );

DROP POLICY IF EXISTS wv811_tickets_service ON public.wv811_tickets;
CREATE POLICY wv811_tickets_service ON public.wv811_tickets
    FOR ALL USING (auth.role() = 'service_role');

-- Utility responses: Inherit from ticket
DROP POLICY IF EXISTS wv811_responses_select ON public.wv811_utility_responses;
CREATE POLICY wv811_responses_select ON public.wv811_utility_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

DROP POLICY IF EXISTS wv811_responses_insert ON public.wv811_utility_responses;
CREATE POLICY wv811_responses_insert ON public.wv811_utility_responses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

DROP POLICY IF EXISTS wv811_responses_update ON public.wv811_utility_responses;
CREATE POLICY wv811_responses_update ON public.wv811_utility_responses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

DROP POLICY IF EXISTS wv811_responses_service ON public.wv811_utility_responses;
CREATE POLICY wv811_responses_service ON public.wv811_utility_responses
    FOR ALL USING (auth.role() = 'service_role');

-- Alert subscriptions: Users can manage their own
DROP POLICY IF EXISTS wv811_subscriptions_select ON public.wv811_alert_subscriptions;
CREATE POLICY wv811_subscriptions_select ON public.wv811_alert_subscriptions
    FOR SELECT USING (
        user_id = auth.uid()
        OR (
            organization_id = public.get_user_organization_id()
            AND public.get_user_role_level() <= 10  -- Admin can see all
        )
    );

DROP POLICY IF EXISTS wv811_subscriptions_insert ON public.wv811_alert_subscriptions;
CREATE POLICY wv811_subscriptions_insert ON public.wv811_alert_subscriptions
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS wv811_subscriptions_update ON public.wv811_alert_subscriptions;
CREATE POLICY wv811_subscriptions_update ON public.wv811_alert_subscriptions
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS wv811_subscriptions_delete ON public.wv811_alert_subscriptions;
CREATE POLICY wv811_subscriptions_delete ON public.wv811_alert_subscriptions
    FOR DELETE USING (user_id = auth.uid());

-- Alerts: Users can see their own
DROP POLICY IF EXISTS wv811_alerts_select ON public.wv811_ticket_alerts;
CREATE POLICY wv811_alerts_select ON public.wv811_ticket_alerts
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
            AND public.get_user_role_level() <= 20
        )
    );

DROP POLICY IF EXISTS wv811_alerts_service ON public.wv811_ticket_alerts;
CREATE POLICY wv811_alerts_service ON public.wv811_ticket_alerts
    FOR ALL USING (auth.role() = 'service_role');

-- Project tickets: Inherit from ticket
DROP POLICY IF EXISTS wv811_project_tickets_select ON public.wv811_project_tickets;
CREATE POLICY wv811_project_tickets_select ON public.wv811_project_tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

DROP POLICY IF EXISTS wv811_project_tickets_insert ON public.wv811_project_tickets;
CREATE POLICY wv811_project_tickets_insert ON public.wv811_project_tickets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

DROP POLICY IF EXISTS wv811_project_tickets_delete ON public.wv811_project_tickets;
CREATE POLICY wv811_project_tickets_delete ON public.wv811_project_tickets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

-- Notes: Inherit from ticket
DROP POLICY IF EXISTS wv811_notes_select ON public.wv811_ticket_notes;
CREATE POLICY wv811_notes_select ON public.wv811_ticket_notes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

DROP POLICY IF EXISTS wv811_notes_insert ON public.wv811_ticket_notes;
CREATE POLICY wv811_notes_insert ON public.wv811_ticket_notes
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

-- Attachments: Inherit from ticket
DROP POLICY IF EXISTS wv811_attachments_select ON public.wv811_ticket_attachments;
CREATE POLICY wv811_attachments_select ON public.wv811_ticket_attachments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

DROP POLICY IF EXISTS wv811_attachments_insert ON public.wv811_ticket_attachments;
CREATE POLICY wv811_attachments_insert ON public.wv811_ticket_attachments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.wv811_tickets t
            WHERE t.id = ticket_id
            AND t.organization_id = public.get_user_organization_id()
        )
    );

DROP POLICY IF EXISTS wv811_attachments_delete ON public.wv811_ticket_attachments;
CREATE POLICY wv811_attachments_delete ON public.wv811_ticket_attachments
    FOR DELETE USING (
        uploaded_by = auth.uid()
        OR (
            EXISTS (
                SELECT 1 FROM public.wv811_tickets t
                WHERE t.id = ticket_id
                AND t.organization_id = public.get_user_organization_id()
            )
            AND public.get_user_role_level() <= 20
        )
    );

-- Digest preferences: Users can manage their own
DROP POLICY IF EXISTS wv811_digest_select ON public.wv811_digest_preferences;
CREATE POLICY wv811_digest_select ON public.wv811_digest_preferences
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS wv811_digest_insert ON public.wv811_digest_preferences;
CREATE POLICY wv811_digest_insert ON public.wv811_digest_preferences
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND organization_id = public.get_user_organization_id()
    );

DROP POLICY IF EXISTS wv811_digest_update ON public.wv811_digest_preferences;
CREATE POLICY wv811_digest_update ON public.wv811_digest_preferences
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS wv811_digest_delete ON public.wv811_digest_preferences;
CREATE POLICY wv811_digest_delete ON public.wv811_digest_preferences
    FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS wv811_digest_service ON public.wv811_digest_preferences;
CREATE POLICY wv811_digest_service ON public.wv811_digest_preferences
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- SEED DATA: WV State Holidays 2024-2026
-- ============================================================================

INSERT INTO public.wv811_holidays (holiday_date, name, year) VALUES
    -- 2024
    ('2024-01-01', 'New Year''s Day', 2024),
    ('2024-01-15', 'Martin Luther King Jr. Day', 2024),
    ('2024-02-19', 'Presidents'' Day', 2024),
    ('2024-05-27', 'Memorial Day', 2024),
    ('2024-06-20', 'West Virginia Day', 2024),
    ('2024-07-04', 'Independence Day', 2024),
    ('2024-09-02', 'Labor Day', 2024),
    ('2024-10-14', 'Columbus Day', 2024),
    ('2024-11-11', 'Veterans Day', 2024),
    ('2024-11-28', 'Thanksgiving Day', 2024),
    ('2024-11-29', 'Day After Thanksgiving', 2024),
    ('2024-12-25', 'Christmas Day', 2024),
    -- 2025
    ('2025-01-01', 'New Year''s Day', 2025),
    ('2025-01-20', 'Martin Luther King Jr. Day', 2025),
    ('2025-02-17', 'Presidents'' Day', 2025),
    ('2025-05-26', 'Memorial Day', 2025),
    ('2025-06-20', 'West Virginia Day', 2025),
    ('2025-07-04', 'Independence Day', 2025),
    ('2025-09-01', 'Labor Day', 2025),
    ('2025-10-13', 'Columbus Day', 2025),
    ('2025-11-11', 'Veterans Day', 2025),
    ('2025-11-27', 'Thanksgiving Day', 2025),
    ('2025-11-28', 'Day After Thanksgiving', 2025),
    ('2025-12-25', 'Christmas Day', 2025),
    -- 2026
    ('2026-01-01', 'New Year''s Day', 2026),
    ('2026-01-19', 'Martin Luther King Jr. Day', 2026),
    ('2026-02-16', 'Presidents'' Day', 2026),
    ('2026-05-25', 'Memorial Day', 2026),
    ('2026-06-22', 'West Virginia Day (Observed)', 2026),
    ('2026-07-03', 'Independence Day (Observed)', 2026),
    ('2026-09-07', 'Labor Day', 2026),
    ('2026-10-12', 'Columbus Day', 2026),
    ('2026-11-11', 'Veterans Day', 2026),
    ('2026-11-26', 'Thanksgiving Day', 2026),
    ('2026-11-27', 'Day After Thanksgiving', 2026),
    ('2026-12-25', 'Christmas Day', 2026)
ON CONFLICT (holiday_date) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.wv811_holidays IS 'WV state holidays for business day calculations';
COMMENT ON TABLE public.wv811_email_ingests IS 'Raw email storage from SendGrid webhook for audit and reprocessing';
COMMENT ON TABLE public.wv811_tickets IS 'Main WV811 locate ticket records with parsed data';
COMMENT ON TABLE public.wv811_utility_responses IS 'Individual utility company responses per ticket';
COMMENT ON TABLE public.wv811_alert_subscriptions IS 'User notification preferences and subscriptions';
COMMENT ON TABLE public.wv811_ticket_alerts IS 'Alert history and delivery status';
COMMENT ON TABLE public.wv811_project_tickets IS 'Link tickets to construction projects';
COMMENT ON TABLE public.wv811_ticket_notes IS 'Comments and activity log per ticket';
COMMENT ON TABLE public.wv811_ticket_attachments IS 'Uploaded files and photos per ticket';
COMMENT ON TABLE public.wv811_digest_preferences IS 'Daily/weekly digest email settings';

COMMENT ON FUNCTION public.is_wv_business_day IS 'Check if a date is a WV business day (excludes weekends and holidays)';
COMMENT ON FUNCTION public.add_wv_business_days IS 'Add business days to a date, skipping weekends and holidays';
COMMENT ON FUNCTION public.calculate_legal_dig_date IS 'Calculate legal dig date (2 full business days after ticket creation)';
COMMENT ON FUNCTION public.calculate_ticket_expiration IS 'Calculate ticket expiration (10 business days after legal dig date)';
COMMENT ON FUNCTION public.get_tickets_needing_alerts IS 'Find tickets that need deadline alerts sent';
COMMENT ON FUNCTION public.auto_expire_tickets IS 'Mark expired tickets and return count';
