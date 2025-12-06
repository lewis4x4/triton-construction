-- ============================================================================
-- MIGRATION 024: STORAGE BUCKETS
-- Triton AI Bid Package Engine - Document and Export Storage
-- ============================================================================

-- ============================================================================
-- BUCKET: bid-documents
-- Purpose: Store uploaded bid documents (PDFs, Bidx files, plans, specs)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'bid-documents',
    'bid-documents',
    FALSE,  -- Private bucket
    104857600,  -- 100MB max file size
    ARRAY[
        'application/pdf',
        'application/xml',
        'text/xml',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/png',
        'image/jpeg',
        'image/tiff'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- BUCKET: bid-exports
-- Purpose: Store generated deliverables (PDFs, Excel exports)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'bid-exports',
    'bid-exports',
    FALSE,  -- Private bucket
    52428800,  -- 50MB max file size
    ARRAY[
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- RLS POLICIES: bid-documents bucket
-- ============================================================================

-- Policy: Users can view documents for projects in their organization
CREATE POLICY "Users view bid documents" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'bid-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT bp.id::TEXT FROM public.bid_projects bp
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Policy: Users can upload documents to projects in their organization
CREATE POLICY "Users upload bid documents" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'bid-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT bp.id::TEXT FROM public.bid_projects bp
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Policy: Users can update documents for projects in their organization
CREATE POLICY "Users update bid documents" ON storage.objects
    FOR UPDATE
    USING (
        bucket_id = 'bid-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT bp.id::TEXT FROM public.bid_projects bp
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Policy: Users can delete documents for projects in their organization
CREATE POLICY "Users delete bid documents" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'bid-documents' AND
        (storage.foldername(name))[1] IN (
            SELECT bp.id::TEXT FROM public.bid_projects bp
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- RLS POLICIES: bid-exports bucket
-- ============================================================================

-- Policy: Users can view exports for projects in their organization
CREATE POLICY "Users view bid exports" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'bid-exports' AND
        (storage.foldername(name))[1] IN (
            SELECT bp.id::TEXT FROM public.bid_projects bp
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Policy: Users can upload exports to projects in their organization
CREATE POLICY "Users upload bid exports" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'bid-exports' AND
        (storage.foldername(name))[1] IN (
            SELECT bp.id::TEXT FROM public.bid_projects bp
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- Policy: Users can delete exports for projects in their organization
CREATE POLICY "Users delete bid exports" ON storage.objects
    FOR DELETE
    USING (
        bucket_id = 'bid-exports' AND
        (storage.foldername(name))[1] IN (
            SELECT bp.id::TEXT FROM public.bid_projects bp
            WHERE bp.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- ============================================================================
-- HELPER FUNCTION: Get signed URL for bid document
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_bid_document_url(
    p_document_id UUID,
    p_expires_in INTEGER DEFAULT 3600
)
RETURNS TEXT AS $$
DECLARE
    v_path TEXT;
    v_project_id UUID;
    v_org_id UUID;
BEGIN
    -- Get document path and verify access
    SELECT bd.file_path, bd.bid_project_id
    INTO v_path, v_project_id
    FROM public.bid_documents bd
    WHERE bd.id = p_document_id;

    IF v_path IS NULL THEN
        RETURN NULL;
    END IF;

    -- Verify organization access
    SELECT organization_id INTO v_org_id
    FROM public.bid_projects
    WHERE id = v_project_id;

    IF v_org_id != public.get_user_organization_id(auth.uid()) THEN
        RETURN NULL;
    END IF;

    -- Return the path (actual signed URL generation happens client-side)
    RETURN v_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION public.get_bid_document_url IS 'Get storage path for a bid document after verifying access';
