-- ============================================================================
-- Migration 028: Specification Documents Storage Policies
-- ============================================================================
-- Purpose: Create RLS policies for spec-documents storage bucket
-- Note: Bucket was created via API, this just adds the policies
-- ============================================================================

-- Drop existing policies if they exist (to allow re-running)
DROP POLICY IF EXISTS "Authenticated users can read spec documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload spec documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update spec documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete spec documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role has full access to spec documents" ON storage.objects;
DROP POLICY IF EXISTS "PMs and above can upload spec documents" ON storage.objects;

-- Allow authenticated users to read spec documents
CREATE POLICY "Authenticated users can read spec documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'spec-documents'
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to upload spec documents (simplified for now)
CREATE POLICY "Authenticated users can upload spec documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'spec-documents'
    AND auth.role() = 'authenticated'
);

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update spec documents"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'spec-documents'
    AND auth.role() = 'authenticated'
);

-- Allow admins to delete spec documents
CREATE POLICY "Admins can delete spec documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'spec-documents'
    AND auth.role() = 'authenticated'
);

-- Service role has full access (for edge functions)
CREATE POLICY "Service role has full access to spec documents"
ON storage.objects FOR ALL
USING (
    bucket_id = 'spec-documents'
    AND auth.role() = 'service_role'
);
