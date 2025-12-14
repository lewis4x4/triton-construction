-- Migration 121: User Push Tokens for FCM Mobile Notifications
-- Part of the 811 High-Risk Proximity Alert System

-- ============================================
-- USER PUSH TOKENS TABLE
-- Stores FCM/APNs push tokens for mobile devices
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,

    -- Token info
    push_token TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
    provider TEXT NOT NULL DEFAULT 'fcm' CHECK (provider IN ('fcm', 'apns')),

    -- Device info
    device_id TEXT,
    device_name TEXT,
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),

    -- Notification preferences
    high_risk_alerts_enabled BOOLEAN DEFAULT TRUE,
    general_alerts_enabled BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Unique constraint per user/token
    UNIQUE (user_id, push_token)
);

-- Indexes for efficient lookups
CREATE INDEX idx_user_push_tokens_user ON public.user_push_tokens(user_id);
CREATE INDEX idx_user_push_tokens_org ON public.user_push_tokens(organization_id);
CREATE INDEX idx_user_push_tokens_active ON public.user_push_tokens(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_user_push_tokens_platform ON public.user_push_tokens(platform);
CREATE INDEX idx_user_push_tokens_provider ON public.user_push_tokens(provider);

-- Updated at trigger
CREATE TRIGGER user_push_tokens_updated_at
    BEFORE UPDATE ON public.user_push_tokens
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY user_push_tokens_own_select ON public.user_push_tokens
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_push_tokens_own_insert ON public.user_push_tokens
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_push_tokens_own_update ON public.user_push_tokens
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY user_push_tokens_own_delete ON public.user_push_tokens
    FOR DELETE USING (user_id = auth.uid());

-- Service role can access all tokens (for sending push notifications)
CREATE POLICY user_push_tokens_service ON public.user_push_tokens
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- PUSH NOTIFICATION LOG TABLE
-- Tracks all push notifications sent
-- ============================================

CREATE TABLE IF NOT EXISTS public.push_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Target
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    push_token_id UUID REFERENCES public.user_push_tokens(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,

    -- Notification content
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    notification_type TEXT NOT NULL, -- 'high_risk_proximity', 'general_alert', 'system', etc.
    data JSONB, -- Additional payload data

    -- Related entities
    related_ticket_id UUID, -- wv811_tickets reference
    related_alert_id UUID,  -- wv811_proximity_alerts reference

    -- Delivery status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'expired')),
    fcm_message_id TEXT, -- FCM message ID for tracking
    error_message TEXT,
    error_code TEXT,

    -- Timing
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for log queries
CREATE INDEX idx_push_notification_logs_user ON public.push_notification_logs(user_id);
CREATE INDEX idx_push_notification_logs_org ON public.push_notification_logs(organization_id);
CREATE INDEX idx_push_notification_logs_type ON public.push_notification_logs(notification_type);
CREATE INDEX idx_push_notification_logs_status ON public.push_notification_logs(status);
CREATE INDEX idx_push_notification_logs_created ON public.push_notification_logs(created_at DESC);
CREATE INDEX idx_push_notification_logs_ticket ON public.push_notification_logs(related_ticket_id);

-- Enable RLS
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

-- Users can see their own notification history
CREATE POLICY push_notification_logs_own ON public.push_notification_logs
    FOR SELECT USING (user_id = auth.uid());

-- Service role can manage all logs
CREATE POLICY push_notification_logs_service ON public.push_notification_logs
    FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get active push tokens for a user
CREATE OR REPLACE FUNCTION public.get_user_push_tokens(p_user_id UUID)
RETURNS TABLE (
    push_token TEXT,
    platform TEXT,
    provider TEXT,
    device_name TEXT,
    high_risk_alerts_enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.push_token,
        t.platform,
        t.provider,
        t.device_name,
        t.high_risk_alerts_enabled
    FROM public.user_push_tokens t
    WHERE t.user_id = p_user_id
      AND t.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get all push tokens for users in an organization (for broadcast notifications)
CREATE OR REPLACE FUNCTION public.get_organization_push_tokens(
    p_organization_id UUID,
    p_notification_type TEXT DEFAULT 'general_alert'
)
RETURNS TABLE (
    user_id UUID,
    push_token TEXT,
    platform TEXT,
    provider TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.user_id,
        t.push_token,
        t.platform,
        t.provider
    FROM public.user_push_tokens t
    WHERE t.organization_id = p_organization_id
      AND t.is_active = TRUE
      AND CASE
          WHEN p_notification_type = 'high_risk_proximity' THEN t.high_risk_alerts_enabled
          ELSE t.general_alerts_enabled
      END = TRUE
      -- Respect quiet hours if set
      AND (
          t.quiet_hours_start IS NULL
          OR t.quiet_hours_end IS NULL
          OR NOT (CURRENT_TIME BETWEEN t.quiet_hours_start AND t.quiet_hours_end)
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update token last used timestamp
CREATE OR REPLACE FUNCTION public.touch_push_token(p_push_token TEXT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.user_push_tokens
    SET last_used_at = NOW()
    WHERE push_token = p_push_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deactivate stale tokens (tokens not used in 30+ days)
CREATE OR REPLACE FUNCTION public.deactivate_stale_push_tokens()
RETURNS INTEGER AS $$
DECLARE
    deactivated_count INTEGER;
BEGIN
    UPDATE public.user_push_tokens
    SET is_active = FALSE
    WHERE is_active = TRUE
      AND last_used_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deactivated_count = ROW_COUNT;
    RETURN deactivated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.user_push_tokens IS 'Stores FCM/APNs push notification tokens for mobile devices';
COMMENT ON TABLE public.push_notification_logs IS 'Log of all push notifications sent to users';
COMMENT ON FUNCTION public.get_user_push_tokens IS 'Get active push tokens for a specific user';
COMMENT ON FUNCTION public.get_organization_push_tokens IS 'Get all active push tokens for users in an organization';
COMMENT ON FUNCTION public.touch_push_token IS 'Update the last_used_at timestamp for a push token';
COMMENT ON FUNCTION public.deactivate_stale_push_tokens IS 'Deactivate tokens that have not been used in 30+ days';
