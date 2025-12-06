-- =============================================================================
-- Migration: 042_emergency_draft_email.sql
-- Purpose: Add draft_email_to_811 column for auto-generated 811 emergency emails
-- Date: December 6, 2024
-- =============================================================================

-- Add draft_email_to_811 column to store auto-generated emergency emails
ALTER TABLE public.wv811_emergency_incidents
ADD COLUMN IF NOT EXISTS draft_email_to_811 JSONB;

-- Add comment
COMMENT ON COLUMN public.wv811_emergency_incidents.draft_email_to_811 IS
'Auto-generated draft email to WV811 containing: to, subject, body, mailto URL';

-- =============================================================================
-- Done!
-- =============================================================================
