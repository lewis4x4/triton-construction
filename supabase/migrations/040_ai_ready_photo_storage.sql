-- =============================================================================
-- Migration: 040_ai_ready_photo_storage.sql
-- Purpose: Enhance photo attachments with AI-ready metadata and create storage bucket
-- Date: December 6, 2024
-- =============================================================================

-- =============================================================================
-- PART 1: Enhance wv811_ticket_attachments with AI-ready columns
-- =============================================================================

-- Add EXIF metadata columns
ALTER TABLE public.wv811_ticket_attachments
ADD COLUMN IF NOT EXISTS exif_camera_make TEXT,
ADD COLUMN IF NOT EXISTS exif_camera_model TEXT,
ADD COLUMN IF NOT EXISTS exif_focal_length TEXT,
ADD COLUMN IF NOT EXISTS exif_aperture TEXT,
ADD COLUMN IF NOT EXISTS exif_iso TEXT,
ADD COLUMN IF NOT EXISTS exif_exposure_time TEXT,
ADD COLUMN IF NOT EXISTS exif_flash_used BOOLEAN,
ADD COLUMN IF NOT EXISTS exif_orientation INTEGER,
ADD COLUMN IF NOT EXISTS exif_width INTEGER,
ADD COLUMN IF NOT EXISTS exif_height INTEGER,
ADD COLUMN IF NOT EXISTS exif_gps_altitude DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS exif_gps_accuracy DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS exif_raw_data JSONB;        -- Full EXIF dump for future use

-- Add AI analysis columns
ALTER TABLE public.wv811_ticket_attachments
ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_analysis_version TEXT,
ADD COLUMN IF NOT EXISTS ai_description TEXT,         -- Natural language description
ADD COLUMN IF NOT EXISTS ai_keywords TEXT[],          -- Extracted keywords for search
ADD COLUMN IF NOT EXISTS ai_objects_detected JSONB,   -- Objects with confidence scores
ADD COLUMN IF NOT EXISTS ai_scene_type TEXT,          -- e.g., 'construction_site', 'road_work', 'utility_mark'
ADD COLUMN IF NOT EXISTS ai_safety_concerns TEXT[],   -- Any safety issues detected
ADD COLUMN IF NOT EXISTS ai_utility_types_visible TEXT[], -- e.g., ['gas_line', 'electric']
ADD COLUMN IF NOT EXISTS ai_mark_colors_detected TEXT[], -- Paint mark colors detected
ADD COLUMN IF NOT EXISTS ai_weather_conditions TEXT,  -- Weather visible in photo
ADD COLUMN IF NOT EXISTS ai_time_of_day TEXT,         -- 'morning', 'afternoon', 'evening', 'night'
ADD COLUMN IF NOT EXISTS ai_quality_score INTEGER,    -- 1-100 quality score
ADD COLUMN IF NOT EXISTS ai_raw_response JSONB;       -- Full AI response for debugging

-- Add vector embedding for semantic search (requires pgvector extension)
-- Note: You need to enable pgvector in Supabase Dashboard first
-- ALTER TABLE public.wv811_ticket_attachments
-- ADD COLUMN IF NOT EXISTS ai_embedding vector(1536);  -- OpenAI ada-002 dimension

-- Add content hash for deduplication
ALTER TABLE public.wv811_ticket_attachments
ADD COLUMN IF NOT EXISTS content_hash TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_path TEXT;

-- Add verification tracking
ALTER TABLE public.wv811_ticket_attachments
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- =============================================================================
-- PART 2: Create indexes for efficient querying
-- =============================================================================

-- Index for AI keywords array search
CREATE INDEX IF NOT EXISTS idx_attachments_ai_keywords
ON public.wv811_ticket_attachments USING GIN (ai_keywords);

-- Index for detected objects search
CREATE INDEX IF NOT EXISTS idx_attachments_ai_objects
ON public.wv811_ticket_attachments USING GIN (ai_objects_detected);

-- Index for scene type filtering
CREATE INDEX IF NOT EXISTS idx_attachments_scene_type
ON public.wv811_ticket_attachments(ai_scene_type);

-- Index for utility types visible
CREATE INDEX IF NOT EXISTS idx_attachments_utility_types
ON public.wv811_ticket_attachments USING GIN (ai_utility_types_visible);

-- Index for mark colors
CREATE INDEX IF NOT EXISTS idx_attachments_mark_colors
ON public.wv811_ticket_attachments USING GIN (ai_mark_colors_detected);

-- Index for safety concerns
CREATE INDEX IF NOT EXISTS idx_attachments_safety_concerns
ON public.wv811_ticket_attachments USING GIN (ai_safety_concerns);

-- Index for content deduplication
CREATE INDEX IF NOT EXISTS idx_attachments_content_hash
ON public.wv811_ticket_attachments(content_hash);

-- Index for GPS-based queries
CREATE INDEX IF NOT EXISTS idx_attachments_location
ON public.wv811_ticket_attachments(latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- =============================================================================
-- PART 3: Create helper functions
-- =============================================================================

-- Function to search photos by keywords
CREATE OR REPLACE FUNCTION public.search_ticket_photos_by_keywords(
    p_keywords TEXT[],
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    attachment_id UUID,
    ticket_id UUID,
    ticket_number TEXT,
    file_name TEXT,
    storage_path TEXT,
    ai_description TEXT,
    ai_keywords TEXT[],
    relevance_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id AS attachment_id,
        a.ticket_id,
        t.ticket_number,
        a.file_name,
        a.storage_path,
        a.ai_description,
        a.ai_keywords,
        COALESCE(array_length(a.ai_keywords & p_keywords, 1), 0) AS relevance_score
    FROM public.wv811_ticket_attachments a
    JOIN public.wv811_tickets t ON t.id = a.ticket_id
    WHERE
        a.ai_keywords && p_keywords
        AND (p_organization_id IS NULL OR t.organization_id = p_organization_id)
    ORDER BY relevance_score DESC, a.created_at DESC;
END;
$$;

-- Function to find photos near a location
CREATE OR REPLACE FUNCTION public.find_photos_near_location(
    p_latitude DECIMAL,
    p_longitude DECIMAL,
    p_radius_meters INTEGER DEFAULT 1000,
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    attachment_id UUID,
    ticket_id UUID,
    ticket_number TEXT,
    file_name TEXT,
    storage_path TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_meters DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id AS attachment_id,
        a.ticket_id,
        t.ticket_number,
        a.file_name,
        a.storage_path,
        a.latitude,
        a.longitude,
        -- Haversine formula for distance calculation
        (6371000 * acos(
            cos(radians(p_latitude)) * cos(radians(a.latitude)) *
            cos(radians(a.longitude) - radians(p_longitude)) +
            sin(radians(p_latitude)) * sin(radians(a.latitude))
        )) AS distance_meters
    FROM public.wv811_ticket_attachments a
    JOIN public.wv811_tickets t ON t.id = a.ticket_id
    WHERE
        a.latitude IS NOT NULL
        AND a.longitude IS NOT NULL
        AND (p_organization_id IS NULL OR t.organization_id = p_organization_id)
        -- Rough bounding box filter for performance
        AND a.latitude BETWEEN (p_latitude - 0.01) AND (p_latitude + 0.01)
        AND a.longitude BETWEEN (p_longitude - 0.01) AND (p_longitude + 0.01)
    HAVING
        (6371000 * acos(
            cos(radians(p_latitude)) * cos(radians(a.latitude)) *
            cos(radians(a.longitude) - radians(p_longitude)) +
            sin(radians(p_latitude)) * sin(radians(a.latitude))
        )) <= p_radius_meters
    ORDER BY distance_meters ASC;
END;
$$;

-- Function to find photos by detected utility type
CREATE OR REPLACE FUNCTION public.find_photos_by_utility_type(
    p_utility_type TEXT,
    p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
    attachment_id UUID,
    ticket_id UUID,
    ticket_number TEXT,
    file_name TEXT,
    storage_path TEXT,
    ai_description TEXT,
    ai_utility_types_visible TEXT[],
    taken_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id AS attachment_id,
        a.ticket_id,
        t.ticket_number,
        a.file_name,
        a.storage_path,
        a.ai_description,
        a.ai_utility_types_visible,
        a.taken_at
    FROM public.wv811_ticket_attachments a
    JOIN public.wv811_tickets t ON t.id = a.ticket_id
    WHERE
        p_utility_type = ANY(a.ai_utility_types_visible)
        AND (p_organization_id IS NULL OR t.organization_id = p_organization_id)
    ORDER BY a.taken_at DESC NULLS LAST;
END;
$$;

-- Function to get unanalyzed photos (for batch processing)
CREATE OR REPLACE FUNCTION public.get_unanalyzed_photos(
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    attachment_id UUID,
    ticket_id UUID,
    storage_path TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id AS attachment_id,
        a.ticket_id,
        a.storage_path,
        a.file_type,
        a.created_at
    FROM public.wv811_ticket_attachments a
    WHERE
        a.ai_analyzed_at IS NULL
        AND a.file_type LIKE 'image/%'
    ORDER BY a.created_at ASC
    LIMIT p_limit;
END;
$$;

-- =============================================================================
-- PART 4: Create photo analysis audit table
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.wv811_photo_analysis_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachment_id UUID NOT NULL REFERENCES public.wv811_ticket_attachments(id) ON DELETE CASCADE,

    -- Analysis tracking
    analysis_started_at TIMESTAMPTZ DEFAULT NOW(),
    analysis_completed_at TIMESTAMPTZ,
    analysis_duration_ms INTEGER,

    -- AI service details
    ai_provider TEXT,                    -- 'openai', 'anthropic', 'google'
    ai_model TEXT,                       -- 'gpt-4-vision', 'claude-3-opus'
    ai_version TEXT,

    -- Status tracking
    status TEXT DEFAULT 'PENDING',       -- PENDING, PROCESSING, COMPLETED, FAILED
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Cost tracking
    input_tokens INTEGER,
    output_tokens INTEGER,
    estimated_cost_cents INTEGER,

    -- Request/Response (for debugging)
    request_payload JSONB,
    response_payload JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for finding pending/failed analyses
CREATE INDEX IF NOT EXISTS idx_photo_analysis_status
ON public.wv811_photo_analysis_log(status, created_at);

-- Index for attachment lookup
CREATE INDEX IF NOT EXISTS idx_photo_analysis_attachment
ON public.wv811_photo_analysis_log(attachment_id);

-- RLS for photo analysis log
ALTER TABLE public.wv811_photo_analysis_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY photo_analysis_log_select ON public.wv811_photo_analysis_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.wv811_ticket_attachments a
            JOIN public.wv811_tickets t ON t.id = a.ticket_id
            WHERE a.id = attachment_id
            AND t.organization_id = public.get_user_organization_id(auth.uid())
        )
    );

-- =============================================================================
-- PART 5: Storage bucket setup instructions
-- Note: Storage buckets must be created via Supabase Dashboard or CLI
-- =============================================================================

-- IMPORTANT: Run these commands via Supabase Dashboard > Storage or supabase CLI:
--
-- 1. Create the bucket:
--    supabase storage create wv811-attachments --public=false
--
-- 2. Or via SQL (requires service role):
--    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--    VALUES (
--      'wv811-attachments',
--      'wv811-attachments',
--      false,
--      52428800,  -- 50MB max file size
--      ARRAY['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf']
--    );

-- Storage policies (run as service role or via Dashboard):

-- Allow authenticated users to upload to their organization's folder
-- CREATE POLICY "Users can upload to org folder"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--     bucket_id = 'wv811-attachments'
--     AND (storage.foldername(name))[1] = (SELECT organization_id::text FROM public.user_profiles WHERE id = auth.uid())
-- );

-- Allow users to read files from their organization
-- CREATE POLICY "Users can read org files"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--     bucket_id = 'wv811-attachments'
--     AND (storage.foldername(name))[1] = (SELECT organization_id::text FROM public.user_profiles WHERE id = auth.uid())
-- );

-- Allow users to delete their own uploads
-- CREATE POLICY "Users can delete own uploads"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--     bucket_id = 'wv811-attachments'
--     AND owner = auth.uid()
-- );

-- =============================================================================
-- PART 6: Comments and documentation
-- =============================================================================

COMMENT ON COLUMN public.wv811_ticket_attachments.exif_raw_data IS
'Complete EXIF metadata extracted from photo, stored as JSON for future analysis needs';

COMMENT ON COLUMN public.wv811_ticket_attachments.ai_keywords IS
'AI-extracted keywords for full-text search across photos. Example: [''gas_line'', ''yellow_mark'', ''excavator'']';

COMMENT ON COLUMN public.wv811_ticket_attachments.ai_objects_detected IS
'Objects detected with confidence scores. Example: {"excavator": 0.95, "utility_mark": 0.87}';

COMMENT ON COLUMN public.wv811_ticket_attachments.ai_scene_type IS
'Primary scene classification: construction_site, road_work, utility_mark, equipment, safety_hazard, general';

COMMENT ON COLUMN public.wv811_ticket_attachments.ai_utility_types_visible IS
'Utility types visible in photo: gas, electric, water, sewer, telecom, fiber, cable_tv';

COMMENT ON COLUMN public.wv811_ticket_attachments.ai_mark_colors_detected IS
'Paint mark colors detected. Standard colors: red (electric), yellow (gas), orange (telecom), blue (water), green (sewer), purple (reclaimed), pink (survey), white (excavation)';

COMMENT ON COLUMN public.wv811_ticket_attachments.content_hash IS
'SHA-256 hash of file content for deduplication';

COMMENT ON TABLE public.wv811_photo_analysis_log IS
'Audit log for AI photo analysis operations, tracking cost, latency, and debugging info';

-- Done!
COMMENT ON TABLE public.wv811_ticket_attachments IS
'Photo and file attachments for WV811 tickets with AI-ready metadata columns (migration 040)';
