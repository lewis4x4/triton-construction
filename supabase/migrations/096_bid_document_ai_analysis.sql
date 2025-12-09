-- ============================================================================
-- Migration 096: Bid Document AI Analysis Schema
-- Purpose: Add columns to bid_documents for storing AI-extracted content
-- ============================================================================

-- Add AI analysis columns to bid_documents
ALTER TABLE public.bid_documents
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS ai_summary TEXT,
ADD COLUMN IF NOT EXISTS ai_key_findings JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS ai_document_category TEXT,
ADD COLUMN IF NOT EXISTS ai_confidence_score NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS ai_model_version TEXT,
ADD COLUMN IF NOT EXISTS ai_analysis_metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS bid_documents_updated_at ON public.bid_documents;
CREATE TRIGGER bid_documents_updated_at
    BEFORE UPDATE ON public.bid_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Add index for AI analysis status
CREATE INDEX IF NOT EXISTS idx_bid_documents_ai_category
    ON public.bid_documents(ai_document_category)
    WHERE ai_document_category IS NOT NULL;

-- ============================================================================
-- Create bid_document_analysis_log table for tracking AI processing
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bid_document_analysis_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Document reference
    document_id UUID NOT NULL REFERENCES public.bid_documents(id) ON DELETE CASCADE,
    bid_project_id UUID NOT NULL REFERENCES public.bid_projects(id) ON DELETE CASCADE,

    -- Processing info
    analysis_type TEXT NOT NULL, -- 'FULL_EXTRACTION', 'RISK_SCAN', 'QUESTION_GENERATION', etc.
    status TEXT NOT NULL DEFAULT 'PROCESSING',

    -- AI details
    ai_provider TEXT DEFAULT 'anthropic',
    ai_model TEXT,

    -- Timing
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,

    -- Token usage
    input_tokens INTEGER,
    output_tokens INTEGER,

    -- Results
    success BOOLEAN,
    error_message TEXT,
    response_payload JSONB,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_doc_analysis_log_document ON public.bid_document_analysis_log(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_analysis_log_project ON public.bid_document_analysis_log(bid_project_id);
CREATE INDEX IF NOT EXISTS idx_doc_analysis_log_status ON public.bid_document_analysis_log(status);

-- Enable RLS
ALTER TABLE public.bid_document_analysis_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own org analysis logs" ON public.bid_document_analysis_log;
CREATE POLICY "Users see own org analysis logs" ON public.bid_document_analysis_log
    FOR ALL USING (
        bid_project_id IN (
            SELECT id FROM public.bid_projects
            WHERE organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN public.bid_documents.extracted_text IS 'Full text extracted from document via OCR or PDF parsing';
COMMENT ON COLUMN public.bid_documents.ai_summary IS 'AI-generated summary of document contents';
COMMENT ON COLUMN public.bid_documents.ai_key_findings IS 'Array of key findings/items extracted by AI';
COMMENT ON COLUMN public.bid_documents.ai_document_category IS 'AI-inferred document category (may differ from upload type)';
COMMENT ON COLUMN public.bid_documents.ai_confidence_score IS 'Overall confidence score of AI analysis (0-100)';
COMMENT ON COLUMN public.bid_documents.ai_model_version IS 'AI model used for analysis';
COMMENT ON COLUMN public.bid_documents.ai_analysis_metadata IS 'Additional structured metadata from AI analysis';

COMMENT ON TABLE public.bid_document_analysis_log IS 'Tracks all AI analysis operations on bid documents for debugging and cost tracking';
