-- =============================================================================
-- Migration: 041_setup_wv811_storage_bucket.sql
-- Purpose: Create wv811-attachments storage bucket and RLS policies
-- Date: December 6, 2024
-- NOTE: This migration creates the storage bucket and policies for photo uploads
-- =============================================================================

-- Create the storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'wv811-attachments',
    'wv811-attachments',
    false,
    52428800,  -- 50MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- Storage Policies
-- =============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload to org folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read org files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Service role full access" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to their organization's folder
-- File path format: {organization_id}/{ticket_id}/{filename}
CREATE POLICY "Users can upload to org folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'wv811-attachments'
    AND (storage.foldername(name))[1] = (
        SELECT organization_id::text
        FROM public.user_profiles
        WHERE id = auth.uid()
    )
);

-- Policy 2: Allow users to read files from their organization
CREATE POLICY "Users can read org files"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'wv811-attachments'
    AND (storage.foldername(name))[1] = (
        SELECT organization_id::text
        FROM public.user_profiles
        WHERE id = auth.uid()
    )
);

-- Policy 3: Allow users to delete their own uploads
-- (also allows admins/managers with role level <= 20 to delete any org file)
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'wv811-attachments'
    AND (
        owner = auth.uid()
        OR (
            (storage.foldername(name))[1] = (
                SELECT organization_id::text
                FROM public.user_profiles
                WHERE id = auth.uid()
            )
            AND public.get_user_role_level(auth.uid()) <= 20
        )
    )
);

-- Policy 4: Service role has full access (for edge functions)
CREATE POLICY "Service role full access"
ON storage.objects
TO service_role
USING (bucket_id = 'wv811-attachments')
WITH CHECK (bucket_id = 'wv811-attachments');

-- =============================================================================
-- Add photo_category column to attachments table
-- =============================================================================

ALTER TABLE public.wv811_ticket_attachments
ADD COLUMN IF NOT EXISTS photo_category TEXT;

-- Create index for category-based queries
CREATE INDEX IF NOT EXISTS idx_attachments_category
ON public.wv811_ticket_attachments(photo_category);

-- Add comment
COMMENT ON COLUMN public.wv811_ticket_attachments.photo_category IS
'Evidence photo category: site_overview_white_lines, marks_electric, marks_gas, marks_water, no_marks_48hr, potholing, trench_open, final_condition, damage_strike, etc.';

-- =============================================================================
-- Create thumbnail bucket for smaller previews
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'wv811-thumbnails',
    'wv811-thumbnails',
    true,  -- Thumbnails can be public for faster loading
    1048576,  -- 1MB max for thumbnails
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Thumbnails are public but only org members can create them
DROP POLICY IF EXISTS "Thumbnails public read" ON storage.objects;
DROP POLICY IF EXISTS "Thumbnails authenticated write" ON storage.objects;

CREATE POLICY "Thumbnails public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wv811-thumbnails');

CREATE POLICY "Thumbnails authenticated write"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'wv811-thumbnails'
    AND (storage.foldername(name))[1] = (
        SELECT organization_id::text
        FROM public.user_profiles
        WHERE id = auth.uid()
    )
);

-- =============================================================================
-- Done!
-- =============================================================================

-- Note: wv811-attachments bucket configured for photo evidence uploads
-- Bucket settings: 50MB max file size, images and PDFs only
-- Organization-based folder structure: {org_id}/{ticket_id}/{filename}
