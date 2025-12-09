-- Migration: Auto-process documents when uploaded
-- This creates a trigger that automatically queues document processing
-- when new documents are inserted or updated to PENDING status

-- First, ensure the http extension is enabled for calling edge functions
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Create a function to queue document processing
CREATE OR REPLACE FUNCTION public.queue_document_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_response_id INT;
BEGIN
  -- Only process when status is PENDING (new uploads)
  IF NEW.processing_status = 'PENDING' THEN
    -- Get Supabase URL and service role key from vault or environment
    -- Note: In production, these should be stored in Supabase Vault
    v_supabase_url := current_setting('app.settings.supabase_url', true);
    v_service_role_key := current_setting('app.settings.service_role_key', true);

    -- If settings aren't configured, log and skip (non-blocking)
    IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
      RAISE LOG 'Auto-processing skipped: Supabase settings not configured. Document ID: %', NEW.id;
      RETURN NEW;
    END IF;

    -- Call the process-document-queue edge function asynchronously
    -- Using http_post to make a non-blocking call
    BEGIN
      SELECT http_post(
        v_supabase_url || '/functions/v1/process-document-queue',
        json_build_object('documentIds', ARRAY[NEW.id::TEXT])::TEXT,
        'application/json',
        json_build_object(
          'Authorization', 'Bearer ' || v_service_role_key,
          'Content-Type', 'application/json'
        )::TEXT
      )::INT INTO v_response_id;

      RAISE LOG 'Document queued for processing. Document ID: %, Response: %', NEW.id, v_response_id;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the insert
      RAISE LOG 'Failed to queue document processing. Document ID: %, Error: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger (disabled by default - enable in production with configured settings)
DROP TRIGGER IF EXISTS trigger_auto_process_document ON public.bid_documents;

-- Alternative: Create a simpler notification-based approach using pg_notify
-- This is more reliable and doesn't require http extension
CREATE OR REPLACE FUNCTION public.notify_document_processing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only notify when status is PENDING (new uploads)
  IF NEW.processing_status = 'PENDING' THEN
    -- Send a notification that can be picked up by a listener
    PERFORM pg_notify(
      'document_processing',
      json_build_object(
        'document_id', NEW.id,
        'bid_project_id', NEW.bid_project_id,
        'document_type', NEW.document_type,
        'file_path', NEW.file_path,
        'event', TG_OP
      )::TEXT
    );

    RAISE LOG 'Document processing notification sent. Document ID: %, Project: %', NEW.id, NEW.bid_project_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the notification trigger (this is always safe to enable)
DROP TRIGGER IF EXISTS trigger_notify_document_processing ON public.bid_documents;
CREATE TRIGGER trigger_notify_document_processing
  AFTER INSERT OR UPDATE ON public.bid_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_document_processing();

-- Create a view to see pending documents for manual processing or cron jobs
CREATE OR REPLACE VIEW public.v_pending_document_processing AS
SELECT
  bd.id,
  bd.bid_project_id,
  bp.project_name,
  bd.file_name,
  bd.document_type,
  bd.mime_type,
  bd.processing_status,
  bd.created_at,
  EXTRACT(EPOCH FROM (NOW() - bd.created_at)) / 60 AS minutes_waiting
FROM public.bid_documents bd
JOIN public.bid_projects bp ON bd.bid_project_id = bp.id
WHERE bd.processing_status = 'PENDING'
ORDER BY bd.created_at ASC;

COMMENT ON VIEW public.v_pending_document_processing IS 'Documents waiting to be processed by AI analysis';

-- Grant access to the view
GRANT SELECT ON public.v_pending_document_processing TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.notify_document_processing() IS
  'Sends pg_notify when documents are uploaded. Use with Supabase Realtime or a worker process to trigger automatic processing.';

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Auto-process document triggers created successfully';
  RAISE NOTICE 'Documents will emit pg_notify events on upload';
  RAISE NOTICE 'To enable HTTP-based auto-processing, configure app.settings.supabase_url and app.settings.service_role_key';
END $$;
