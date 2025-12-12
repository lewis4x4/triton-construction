-- =============================================================================
-- Migration 105: Add application/octet-stream to bid-documents bucket
-- Purpose: Allow .ebsx files (WVDOH AASHTOWare format) to be uploaded
-- =============================================================================

-- Add application/octet-stream to allowed MIME types for EBSX file support
-- (.ebsx files are detected as application/octet-stream by browsers)
UPDATE storage.buckets
SET allowed_mime_types = array_append(allowed_mime_types, 'application/octet-stream')
WHERE id = 'bid-documents'
  AND NOT 'application/octet-stream' = ANY(allowed_mime_types);

-- Also add DWG MIME types that might be needed for CAD files
UPDATE storage.buckets
SET allowed_mime_types = CASE
    WHEN NOT 'application/acad' = ANY(allowed_mime_types) THEN array_append(allowed_mime_types, 'application/acad')
    ELSE allowed_mime_types
END
WHERE id = 'bid-documents';

UPDATE storage.buckets
SET allowed_mime_types = CASE
    WHEN NOT 'application/x-autocad' = ANY(allowed_mime_types) THEN array_append(allowed_mime_types, 'application/x-autocad')
    ELSE allowed_mime_types
END
WHERE id = 'bid-documents';

UPDATE storage.buckets
SET allowed_mime_types = CASE
    WHEN NOT 'application/dwg' = ANY(allowed_mime_types) THEN array_append(allowed_mime_types, 'application/dwg')
    ELSE allowed_mime_types
END
WHERE id = 'bid-documents';

UPDATE storage.buckets
SET allowed_mime_types = CASE
    WHEN NOT 'image/vnd.dwg' = ANY(allowed_mime_types) THEN array_append(allowed_mime_types, 'image/vnd.dwg')
    ELSE allowed_mime_types
END
WHERE id = 'bid-documents';
