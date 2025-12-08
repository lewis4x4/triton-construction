-- =============================================================================
-- Migration 074: Pay Estimate Storage Bucket
-- Creates storage bucket for WVDOH pay estimate PDFs
-- =============================================================================

-- ============================================================================
-- PART 1: CREATE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'pay-estimates',
    'pay-estimates',
    false,  -- Private bucket
    52428800,  -- 50MB limit per file
    ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- PART 2: STORAGE POLICIES
-- ============================================================================

-- Policy: Users can upload PDFs to their organization's folder
DROP POLICY IF EXISTS "pay_estimates_upload" ON storage.objects;
CREATE POLICY "pay_estimates_upload" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'pay-estimates' AND
        -- Path must start with org_id/project_id/
        (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM public.user_profiles
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can read PDFs from their organization
DROP POLICY IF EXISTS "pay_estimates_read" ON storage.objects;
CREATE POLICY "pay_estimates_read" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'pay-estimates' AND
        (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM public.user_profiles
            WHERE id = auth.uid()
        )
    );

-- Policy: Users can delete PDFs from their organization (with appropriate role)
DROP POLICY IF EXISTS "pay_estimates_delete" ON storage.objects;
CREATE POLICY "pay_estimates_delete" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'pay-estimates' AND
        (storage.foldername(name))[1] IN (
            SELECT organization_id::text FROM public.user_profiles
            WHERE id = auth.uid()
        ) AND
        public.get_user_role_level(auth.uid()) <= 30  -- SUPERINTENDENT or higher
    );

-- ============================================================================
-- Summary
-- ============================================================================

SELECT 'Migration 074: Pay Estimate Storage Bucket created successfully' as status;
