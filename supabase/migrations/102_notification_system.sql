-- Migration 102: Notification System for Bid Deadlines
-- =====================================================
-- Creates notification tracking and user preferences tables
-- for bid deadline alerts and pricing completion reminders

-- =====================================================
-- NOTIFICATION TYPE ENUM
-- =====================================================

DO $$ BEGIN
    CREATE TYPE public.notification_type_enum AS ENUM (
        'BID_DEADLINE_7_DAYS',     -- 7 days before letting date
        'BID_DEADLINE_3_DAYS',     -- 3 days before letting date
        'BID_DEADLINE_1_DAY',      -- 1 day before letting date
        'BID_DEADLINE_TODAY',      -- Day of letting date
        'BID_INCOMPLETE_PRICING',  -- Incomplete pricing reminder
        'BID_SUBMISSION_COMPLETE', -- Bid submitted successfully
        'BID_STATUS_CHANGE',       -- Bid status changed
        'DOCUMENT_PROCESSED',      -- Document AI processing complete
        'CERTIFICATION_EXPIRING',  -- Worker certification expiring
        'INSURANCE_EXPIRING'       -- Subcontractor insurance expiring
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- NOTIFICATION CHANNEL ENUM
-- =====================================================

DO $$ BEGIN
    CREATE TYPE public.notification_channel_enum AS ENUM (
        'EMAIL',
        'IN_APP',
        'SMS',
        'PUSH'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- BID NOTIFICATIONS TABLE
-- =====================================================
-- Tracks all notifications sent related to bids

CREATE TABLE IF NOT EXISTS public.bid_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Notification details
    notification_type public.notification_type_enum NOT NULL,
    channel public.notification_channel_enum NOT NULL DEFAULT 'EMAIL',
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',  -- Additional data like item counts, deadline info

    -- Delivery tracking
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failure_reason TEXT,
    retry_count INT DEFAULT 0,

    -- Deduplication key to prevent duplicate notifications
    dedup_key TEXT,  -- e.g., "bid_deadline_7_days:{bid_project_id}:{date}"

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_bid_notifications_org ON public.bid_notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_bid_notifications_bid_project ON public.bid_notifications(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_bid_notifications_user ON public.bid_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_bid_notifications_type ON public.bid_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_bid_notifications_scheduled ON public.bid_notifications(scheduled_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bid_notifications_dedup ON public.bid_notifications(dedup_key) WHERE dedup_key IS NOT NULL;

-- Prevent duplicate notifications with same dedup_key
CREATE UNIQUE INDEX IF NOT EXISTS idx_bid_notifications_dedup_unique
    ON public.bid_notifications(dedup_key)
    WHERE dedup_key IS NOT NULL;

-- =====================================================
-- USER NOTIFICATION PREFERENCES TABLE
-- =====================================================
-- Allows users to customize their notification settings

CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Channel preferences
    email_enabled BOOLEAN DEFAULT TRUE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    push_enabled BOOLEAN DEFAULT FALSE,

    -- Notification type preferences
    bid_deadline_7_days BOOLEAN DEFAULT TRUE,
    bid_deadline_3_days BOOLEAN DEFAULT TRUE,
    bid_deadline_1_day BOOLEAN DEFAULT TRUE,
    bid_deadline_today BOOLEAN DEFAULT TRUE,
    bid_incomplete_pricing BOOLEAN DEFAULT TRUE,
    bid_submission_complete BOOLEAN DEFAULT TRUE,
    bid_status_change BOOLEAN DEFAULT TRUE,
    document_processed BOOLEAN DEFAULT TRUE,
    certification_expiring BOOLEAN DEFAULT TRUE,
    insurance_expiring BOOLEAN DEFAULT TRUE,

    -- Quiet hours (optional)
    quiet_hours_start TIME,  -- e.g., 22:00
    quiet_hours_end TIME,    -- e.g., 07:00
    timezone TEXT DEFAULT 'America/New_York',

    -- Contact info for SMS
    phone_number TEXT,
    phone_verified_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_user ON public.user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notification_prefs_org ON public.user_notification_preferences(organization_id);

-- =====================================================
-- IN-APP NOTIFICATION QUEUE TABLE
-- =====================================================
-- For displaying notifications in the app UI

CREATE TABLE IF NOT EXISTS public.in_app_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Notification content
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    icon TEXT DEFAULT 'bell',  -- Icon name for UI
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Link for click action
    action_url TEXT,
    action_label TEXT,

    -- Related entities
    bid_project_id UUID REFERENCES public.bid_projects(id) ON DELETE CASCADE,
    related_entity_type TEXT,  -- e.g., 'bid_project', 'bid_document', 'line_item'
    related_entity_id UUID,

    -- Status tracking
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_dismissed BOOLEAN DEFAULT FALSE,
    dismissed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,  -- Auto-dismiss after this time

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_in_app_notifications_user ON public.in_app_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_unread ON public.in_app_notifications(user_id, is_read)
    WHERE is_read = FALSE AND is_dismissed = FALSE;
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_bid_project ON public.in_app_notifications(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_in_app_notifications_created ON public.in_app_notifications(created_at DESC);

-- =====================================================
-- INDEX ON BID_PROJECTS FOR DEADLINE QUERIES
-- =====================================================
-- Optimize queries for finding bids with approaching deadlines

CREATE INDEX IF NOT EXISTS idx_bid_projects_letting_date
    ON public.bid_projects(letting_date)
    WHERE status NOT IN ('SUBMITTED', 'WON', 'LOST', 'WITHDRAWN');

CREATE INDEX IF NOT EXISTS idx_bid_projects_deadline_alerts
    ON public.bid_projects(letting_date, organization_id, status)
    WHERE status IN ('DRAFT', 'ESTIMATING', 'REVIEW');

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if user should receive a specific notification type
CREATE OR REPLACE FUNCTION public.should_notify_user(
    p_user_id UUID,
    p_organization_id UUID,
    p_notification_type public.notification_type_enum,
    p_channel public.notification_channel_enum
)
RETURNS BOOLEAN AS $$
DECLARE
    v_prefs public.user_notification_preferences%ROWTYPE;
    v_channel_enabled BOOLEAN;
    v_type_enabled BOOLEAN;
    v_in_quiet_hours BOOLEAN := FALSE;
BEGIN
    -- Get user preferences (or use defaults)
    SELECT * INTO v_prefs
    FROM public.user_notification_preferences
    WHERE user_id = p_user_id AND organization_id = p_organization_id;

    -- If no preferences, use defaults (all enabled)
    IF NOT FOUND THEN
        RETURN TRUE;
    END IF;

    -- Check channel preference
    v_channel_enabled := CASE p_channel
        WHEN 'EMAIL' THEN v_prefs.email_enabled
        WHEN 'IN_APP' THEN v_prefs.in_app_enabled
        WHEN 'SMS' THEN v_prefs.sms_enabled
        WHEN 'PUSH' THEN v_prefs.push_enabled
        ELSE TRUE
    END;

    IF NOT v_channel_enabled THEN
        RETURN FALSE;
    END IF;

    -- Check notification type preference
    v_type_enabled := CASE p_notification_type
        WHEN 'BID_DEADLINE_7_DAYS' THEN v_prefs.bid_deadline_7_days
        WHEN 'BID_DEADLINE_3_DAYS' THEN v_prefs.bid_deadline_3_days
        WHEN 'BID_DEADLINE_1_DAY' THEN v_prefs.bid_deadline_1_day
        WHEN 'BID_DEADLINE_TODAY' THEN v_prefs.bid_deadline_today
        WHEN 'BID_INCOMPLETE_PRICING' THEN v_prefs.bid_incomplete_pricing
        WHEN 'BID_SUBMISSION_COMPLETE' THEN v_prefs.bid_submission_complete
        WHEN 'BID_STATUS_CHANGE' THEN v_prefs.bid_status_change
        WHEN 'DOCUMENT_PROCESSED' THEN v_prefs.document_processed
        WHEN 'CERTIFICATION_EXPIRING' THEN v_prefs.certification_expiring
        WHEN 'INSURANCE_EXPIRING' THEN v_prefs.insurance_expiring
        ELSE TRUE
    END;

    IF NOT v_type_enabled THEN
        RETURN FALSE;
    END IF;

    -- Check quiet hours (only for email/sms/push, not in-app)
    IF p_channel IN ('EMAIL', 'SMS', 'PUSH')
       AND v_prefs.quiet_hours_start IS NOT NULL
       AND v_prefs.quiet_hours_end IS NOT NULL THEN
        -- Get current time in user's timezone
        DECLARE
            v_current_time TIME := (NOW() AT TIME ZONE COALESCE(v_prefs.timezone, 'America/New_York'))::TIME;
        BEGIN
            IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
                -- Normal range (e.g., 22:00 to 07:00 doesn't wrap)
                v_in_quiet_hours := v_current_time >= v_prefs.quiet_hours_start
                                   AND v_current_time < v_prefs.quiet_hours_end;
            ELSE
                -- Wraps midnight (e.g., 22:00 to 07:00)
                v_in_quiet_hours := v_current_time >= v_prefs.quiet_hours_start
                                   OR v_current_time < v_prefs.quiet_hours_end;
            END IF;
        END;

        IF v_in_quiet_hours THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get bids approaching deadline with incomplete pricing
CREATE OR REPLACE FUNCTION public.get_bids_needing_deadline_notifications(
    p_days_until_deadline INT
)
RETURNS TABLE (
    bid_project_id UUID,
    organization_id UUID,
    project_name TEXT,
    letting_date DATE,
    days_until INTERVAL,
    incomplete_count BIGINT,
    total_items BIGINT,
    assigned_users UUID[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bp.id AS bid_project_id,
        bp.organization_id,
        bp.project_name,
        bp.letting_date,
        (bp.letting_date - CURRENT_DATE)::INTERVAL AS days_until,
        COUNT(*) FILTER (WHERE
            bli.final_unit_price IS NULL
            OR bli.pricing_reviewed IS NOT TRUE
        ) AS incomplete_count,
        COUNT(*) AS total_items,
        ARRAY_AGG(DISTINCT ba.user_id) FILTER (WHERE ba.user_id IS NOT NULL) AS assigned_users
    FROM public.bid_projects bp
    LEFT JOIN public.bid_line_items bli ON bli.bid_project_id = bp.id
    LEFT JOIN public.bid_assignments ba ON ba.bid_project_id = bp.id AND ba.is_active = TRUE
    WHERE
        bp.status IN ('DRAFT', 'ESTIMATING', 'REVIEW')
        AND bp.letting_date IS NOT NULL
        AND (bp.letting_date - CURRENT_DATE) = p_days_until_deadline
    GROUP BY bp.id, bp.organization_id, bp.project_name, bp.letting_date
    HAVING COUNT(*) FILTER (WHERE
        bli.final_unit_price IS NULL
        OR bli.pricing_reviewed IS NOT TRUE
    ) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create an in-app notification
CREATE OR REPLACE FUNCTION public.create_in_app_notification(
    p_user_id UUID,
    p_organization_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_priority TEXT DEFAULT 'normal',
    p_action_url TEXT DEFAULT NULL,
    p_action_label TEXT DEFAULT NULL,
    p_bid_project_id UUID DEFAULT NULL,
    p_icon TEXT DEFAULT 'bell',
    p_expires_in_days INT DEFAULT 30
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    INSERT INTO public.in_app_notifications (
        user_id,
        organization_id,
        title,
        message,
        icon,
        priority,
        action_url,
        action_label,
        bid_project_id,
        expires_at
    ) VALUES (
        p_user_id,
        p_organization_id,
        p_title,
        p_message,
        p_icon,
        p_priority,
        p_action_url,
        p_action_label,
        p_bid_project_id,
        NOW() + (p_expires_in_days || ' days')::INTERVAL
    )
    RETURNING id INTO v_notification_id;

    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(
    p_user_id UUID,
    p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INT AS $$
DECLARE
    v_updated_count INT;
BEGIN
    IF p_notification_ids IS NULL THEN
        -- Mark all unread notifications as read
        UPDATE public.in_app_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = p_user_id AND is_read = FALSE;
    ELSE
        -- Mark specific notifications as read
        UPDATE public.in_app_notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE user_id = p_user_id
          AND id = ANY(p_notification_ids)
          AND is_read = FALSE;
    END IF;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    RETURN v_updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.bid_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_notifications ENABLE ROW LEVEL SECURITY;

-- Bid notifications policies
CREATE POLICY "Users can view their own notifications"
    ON public.bid_notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
    ON public.bid_notifications FOR INSERT
    WITH CHECK (TRUE);  -- Controlled by service role

-- User preferences policies
CREATE POLICY "Users can view their own preferences"
    ON public.user_notification_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
    ON public.user_notification_preferences FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own preferences"
    ON public.user_notification_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- In-app notifications policies
CREATE POLICY "Users can view their own in-app notifications"
    ON public.in_app_notifications FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own in-app notifications"
    ON public.in_app_notifications FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "System can create in-app notifications"
    ON public.in_app_notifications FOR INSERT
    WITH CHECK (TRUE);  -- Controlled by service role

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamps
CREATE TRIGGER bid_notifications_updated_at
    BEFORE UPDATE ON public.bid_notifications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER user_notification_preferences_updated_at
    BEFORE UPDATE ON public.user_notification_preferences
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- VIEW FOR UNREAD NOTIFICATION COUNT
-- =====================================================

CREATE OR REPLACE VIEW public.v_user_unread_notification_count AS
SELECT
    user_id,
    COUNT(*) AS unread_count,
    COUNT(*) FILTER (WHERE priority = 'urgent') AS urgent_count,
    COUNT(*) FILTER (WHERE priority = 'high') AS high_priority_count
FROM public.in_app_notifications
WHERE is_read = FALSE AND is_dismissed = FALSE
  AND (expires_at IS NULL OR expires_at > NOW())
GROUP BY user_id;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT ON public.bid_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_notification_preferences TO authenticated;
GRANT SELECT, UPDATE ON public.in_app_notifications TO authenticated;
GRANT SELECT ON public.v_user_unread_notification_count TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.should_notify_user(UUID, UUID, public.notification_type_enum, public.notification_channel_enum) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(UUID, UUID[]) TO authenticated;

-- Service role gets full access for notification creation
GRANT ALL ON public.bid_notifications TO service_role;
GRANT ALL ON public.in_app_notifications TO service_role;
GRANT EXECUTE ON FUNCTION public.get_bids_needing_deadline_notifications(INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_in_app_notification(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, INT) TO service_role;

COMMENT ON TABLE public.bid_notifications IS 'Tracks all notifications sent for bid-related alerts';
COMMENT ON TABLE public.user_notification_preferences IS 'User preferences for notification channels and types';
COMMENT ON TABLE public.in_app_notifications IS 'In-app notification queue for UI display';
COMMENT ON FUNCTION public.should_notify_user IS 'Checks if user should receive a specific notification based on preferences';
COMMENT ON FUNCTION public.get_bids_needing_deadline_notifications IS 'Returns bids with approaching deadlines that have incomplete pricing';
COMMENT ON FUNCTION public.create_in_app_notification IS 'Creates an in-app notification for a user';
COMMENT ON FUNCTION public.mark_notifications_read IS 'Marks notifications as read for a user';
