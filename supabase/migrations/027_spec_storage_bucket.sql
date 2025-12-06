-- ============================================================================
-- Migration 027: Specification Documents Storage Bucket (SKIPPED)
-- ============================================================================
-- Purpose: Create storage bucket for WVDOH specification documents
-- Note: Storage buckets cannot be created via SQL migrations in Supabase.
--       The bucket 'spec-documents' was created via the Supabase Storage API.
--       Policies are defined in migration 028.
-- ============================================================================

-- No-op migration - bucket created via API
SELECT 1;
