-- Migration 103: Set up cron job for bid deadline notifications
-- This requires pg_cron extension to be enabled in Supabase Dashboard > Database > Extensions

-- Enable pg_net extension for HTTP requests (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to trigger the deadline notifications edge function
CREATE OR REPLACE FUNCTION public.trigger_bid_deadline_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  service_role_key TEXT;
  response_id BIGINT;
BEGIN
  -- Get the service role key from vault (you'll need to set this up)
  -- For now, we'll use a direct call approach

  -- Make HTTP POST request to the edge function
  SELECT net.http_post(
    url := 'https://gablgsruyuhvjurhtcxx.supabase.co/functions/v1/send-bid-deadline-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhYmxnc3J1eXVodmp1cmh0Y3h4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDk0Njc5NSwiZXhwIjoyMDgwNTIyNzk1fQ.3gmXsKaWtBuQTSR2Rt_2A-oVqrjvIjQ3-LQFr7ONniA'
    ),
    body := '{}'::jsonb
  ) INTO response_id;

  RAISE NOTICE 'Triggered bid deadline notifications, response_id: %', response_id;
END;
$$;

-- Schedule the cron job to run daily at 8 AM EST (13:00 UTC)
-- Note: This requires pg_cron extension. Run in Supabase SQL Editor if migration fails.
DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove existing job if any
    PERFORM cron.unschedule('bid-deadline-notifications');

    -- Schedule new job - runs at 8 AM EST (13:00 UTC) every day
    PERFORM cron.schedule(
      'bid-deadline-notifications',
      '0 13 * * *',
      'SELECT public.trigger_bid_deadline_notifications()'
    );

    RAISE NOTICE 'Cron job scheduled successfully';
  ELSE
    RAISE NOTICE 'pg_cron extension not found. Please enable it in Supabase Dashboard and run this migration again.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cron job: %. Please run manually in SQL Editor.', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.trigger_bid_deadline_notifications() TO service_role;

COMMENT ON FUNCTION public.trigger_bid_deadline_notifications() IS
'Triggers the send-bid-deadline-notifications edge function to check for bids with approaching deadlines and send notifications.';
