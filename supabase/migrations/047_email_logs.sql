-- Migration: Email Logs Table
-- Purpose: Track all outbound emails for audit, debugging, and analytics
-- Date: 2024-12-06

-- -----------------------------------------------------------------------------
-- email_logs: Central log of all outbound emails
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Resend tracking
    resend_id TEXT,

    -- Addressing
    to_addresses TEXT[] NOT NULL,
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    from_address TEXT NOT NULL,
    reply_to TEXT,

    -- Content
    subject TEXT NOT NULL,

    -- Categorization
    category TEXT NOT NULL DEFAULT 'GENERAL', -- ALERT, DAILY_RADAR, NOTIFICATION, TRANSACTIONAL

    -- Related entity (for linking to tickets, projects, etc.)
    related_entity_type TEXT, -- TICKET, PROJECT, USER, etc.
    related_entity_id UUID,

    -- User/org context
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, OPENED, CLICKED, BOUNCED, COMPLAINED

    -- Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,

    -- Bounce/error info
    error_message TEXT,
    bounce_type TEXT,

    -- Metadata
    tags JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id ON public.email_logs(resend_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_category ON public.email_logs(category);
CREATE INDEX IF NOT EXISTS idx_email_logs_user ON public.email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_org ON public.email_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON public.email_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_related ON public.email_logs(related_entity_type, related_entity_id);

-- RLS Policies
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own email logs
CREATE POLICY "Users can view own email logs"
    ON public.email_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all email logs in their organization
CREATE POLICY "Admins can view org email logs"
    ON public.email_logs
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.user_profiles WHERE id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid() AND r.level <= 20 -- ADMIN or EXECUTIVE or PM
        )
    );

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access"
    ON public.email_logs
    FOR ALL
    USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE public.email_logs IS 'Audit log of all outbound emails sent through the platform';
COMMENT ON COLUMN public.email_logs.resend_id IS 'Email ID from Resend API for webhook correlation';
COMMENT ON COLUMN public.email_logs.category IS 'Type of email: ALERT, DAILY_RADAR, NOTIFICATION, TRANSACTIONAL';
COMMENT ON COLUMN public.email_logs.status IS 'Email delivery status from Resend webhooks';
