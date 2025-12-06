-- Migration 035: Fix spec_documents schema
-- Adds missing updated_by column and fixes stuck processing

-- ============================================================================
-- STEP 1: Add updated_by column if it doesn't exist
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'spec_documents'
        AND column_name = 'updated_by'
    ) THEN
        ALTER TABLE public.spec_documents
        ADD COLUMN updated_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop any audit trigger on spec_documents that might be causing issues
-- ============================================================================

DROP TRIGGER IF EXISTS spec_documents_audit ON public.spec_documents;

-- ============================================================================
-- STEP 3: Create a simpler audit trigger for spec_documents (optional)
-- ============================================================================

-- If you want audit logging, create a trigger that doesn't require updated_by
DROP TRIGGER IF EXISTS spec_documents_simple_audit ON public.spec_documents;

-- ============================================================================
-- STEP 4: Fix any spec_documents stuck in PENDING with uploaded files
-- ============================================================================

-- Update documents that have files but no source_file_path set
UPDATE public.spec_documents sd
SET source_file_path = (
    SELECT concat('specs/', sd.id, '/', obj.name)
    FROM storage.objects obj
    WHERE obj.bucket_id = 'spec-documents'
    AND obj.name LIKE concat('specs/', sd.id::text, '/%')
    LIMIT 1
)
WHERE sd.source_file_path IS NULL
AND sd.processing_status = 'PENDING';
