-- =============================================================================
-- Migration: 043_sms_logs.sql
-- Purpose: Create SMS logging table for Twilio integration and audit trail
-- Date: December 6, 2024
-- =============================================================================

-- SMS Logs table for tracking all SMS communications
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recipient info
    phone_number TEXT NOT NULL,
    user_id UUID REFERENCES public.user_profiles(id),

    -- Message details
    message_preview TEXT NOT NULL, -- First 200 chars
    message_type TEXT NOT NULL CHECK (message_type IN (
        'EMERGENCY', 'TICKET_UPDATE', 'EXPIRATION', 'REMINDER', 'GENERAL'
    )),

    -- Related entities
    ticket_id UUID REFERENCES public.wv811_tickets(id),
    incident_id UUID REFERENCES public.wv811_emergency_incidents(id),
    project_id UUID REFERENCES public.projects(id),

    -- Twilio tracking
    twilio_sid TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'UNDELIVERED'
    )),
    error_message TEXT,

    -- Batching info
    batch_key TEXT,
    batch_count INTEGER DEFAULT 1,

    -- Timestamps
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_sms_logs_phone ON public.sms_logs(phone_number);
CREATE INDEX idx_sms_logs_type ON public.sms_logs(message_type);
CREATE INDEX idx_sms_logs_status ON public.sms_logs(status);
CREATE INDEX idx_sms_logs_sent_at ON public.sms_logs(sent_at DESC);
CREATE INDEX idx_sms_logs_ticket ON public.sms_logs(ticket_id) WHERE ticket_id IS NOT NULL;
CREATE INDEX idx_sms_logs_incident ON public.sms_logs(incident_id) WHERE incident_id IS NOT NULL;

-- RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view SMS logs (for privacy)
CREATE POLICY "Admins can view SMS logs"
    ON public.sms_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid()
            AND r.code IN ('ADMIN', 'EXECUTIVE')
        )
    );

-- Service role can insert logs
CREATE POLICY "Service role can insert SMS logs"
    ON public.sms_logs FOR INSERT
    WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.sms_logs IS 'Audit log of all SMS messages sent via Twilio';

-- =============================================================================
-- SMS Rate Limiting Table (prevent spam)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.sms_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number TEXT NOT NULL,
    message_type TEXT NOT NULL,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    message_count INTEGER NOT NULL DEFAULT 1,

    UNIQUE(phone_number, message_type, window_start)
);

-- Index for rate limit checks
CREATE INDEX idx_sms_rate_limits_lookup
    ON public.sms_rate_limits(phone_number, message_type, window_start DESC);

-- RLS
ALTER TABLE public.sms_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role
CREATE POLICY "Service role only for rate limits"
    ON public.sms_rate_limits FOR ALL
    USING (false);

-- Function to check rate limit (max 10 SMS per hour per phone per type)
CREATE OR REPLACE FUNCTION public.check_sms_rate_limit(
    p_phone TEXT,
    p_type TEXT,
    p_max_per_hour INTEGER DEFAULT 10
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_window_start TIMESTAMPTZ;
BEGIN
    -- Get start of current hour
    v_window_start := date_trunc('hour', NOW());

    -- Count messages in current window
    SELECT COALESCE(SUM(message_count), 0) INTO v_count
    FROM public.sms_rate_limits
    WHERE phone_number = p_phone
    AND message_type = p_type
    AND window_start >= v_window_start;

    -- Return true if under limit
    RETURN v_count < p_max_per_hour;
END;
$$;

-- =============================================================================
-- Done!
-- =============================================================================
