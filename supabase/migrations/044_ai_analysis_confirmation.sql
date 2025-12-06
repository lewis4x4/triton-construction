-- =============================================================================
-- Migration: 044_ai_analysis_confirmation.sql
-- Purpose: Add human confirmation step for AI photo analysis (AI Assistant, Human Judge)
-- Date: December 6, 2024
-- =============================================================================

-- Add confirmation columns to wv811_ticket_attachments
ALTER TABLE public.wv811_ticket_attachments
ADD COLUMN IF NOT EXISTS ai_analysis_status TEXT DEFAULT 'PENDING' CHECK (ai_analysis_status IN (
    'PENDING',      -- No analysis yet
    'SUGGESTED',    -- AI has analyzed, awaiting human confirmation
    'CONFIRMED',    -- Human has confirmed the AI analysis
    'MODIFIED',     -- Human modified the AI suggestions
    'REJECTED'      -- Human rejected the AI analysis
));

ALTER TABLE public.wv811_ticket_attachments
ADD COLUMN IF NOT EXISTS ai_analysis_confirmed_at TIMESTAMPTZ;

ALTER TABLE public.wv811_ticket_attachments
ADD COLUMN IF NOT EXISTS ai_analysis_confirmed_by UUID REFERENCES public.user_profiles(id);

-- For modified cases, store what the human actually selected
ALTER TABLE public.wv811_ticket_attachments
ADD COLUMN IF NOT EXISTS human_override_data JSONB;

-- Index for querying pending confirmations
CREATE INDEX IF NOT EXISTS idx_attachments_ai_status
    ON public.wv811_ticket_attachments(ai_analysis_status)
    WHERE ai_analysis_status = 'SUGGESTED';

-- Add comment
COMMENT ON COLUMN public.wv811_ticket_attachments.ai_analysis_status IS
'Status of AI analysis: PENDING (not analyzed), SUGGESTED (awaiting confirmation), CONFIRMED (human approved), MODIFIED (human corrected), REJECTED (human dismissed)';

COMMENT ON COLUMN public.wv811_ticket_attachments.human_override_data IS
'If human modified AI suggestions, stores the human-selected values (mark_colors, utility_types, etc.)';

-- =============================================================================
-- View for pending AI confirmations
-- =============================================================================

CREATE OR REPLACE VIEW public.v_pending_ai_confirmations AS
SELECT
    a.id,
    a.file_name,
    a.ticket_id,
    t.ticket_number,
    a.ai_description,
    a.ai_mark_colors_detected,
    a.ai_utility_types_visible,
    a.ai_safety_concerns,
    a.ai_quality_score,
    a.ai_analyzed_at,
    a.created_at
FROM public.wv811_ticket_attachments a
LEFT JOIN public.wv811_tickets t ON t.id = a.ticket_id
WHERE a.ai_analysis_status = 'SUGGESTED'
ORDER BY a.ai_analyzed_at DESC;

-- Grant access
GRANT SELECT ON public.v_pending_ai_confirmations TO authenticated;

-- =============================================================================
-- Function to confirm AI analysis
-- =============================================================================

CREATE OR REPLACE FUNCTION public.confirm_ai_analysis(
    p_attachment_id UUID,
    p_confirmed BOOLEAN DEFAULT TRUE,
    p_modified_data JSONB DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_new_status TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Determine new status
    IF NOT p_confirmed THEN
        v_new_status := 'REJECTED';
    ELSIF p_modified_data IS NOT NULL THEN
        v_new_status := 'MODIFIED';
    ELSE
        v_new_status := 'CONFIRMED';
    END IF;

    -- Update the attachment
    UPDATE public.wv811_ticket_attachments
    SET
        ai_analysis_status = v_new_status,
        ai_analysis_confirmed_at = NOW(),
        ai_analysis_confirmed_by = v_user_id,
        human_override_data = p_modified_data
    WHERE id = p_attachment_id
    AND ai_analysis_status = 'SUGGESTED';

    RETURN FOUND;
END;
$$;

-- =============================================================================
-- Done!
-- =============================================================================
