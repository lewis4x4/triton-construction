-- =============================================================================
-- Migration 120: Auto-Geocode Trigger for WV811 Tickets
-- Purpose: Automatically queue geocoding when tickets are created without coordinates
-- Date: December 14, 2025
-- =============================================================================

-- Create a table to queue tickets for geocoding (if edge function call from trigger is slow)
CREATE TABLE IF NOT EXISTS public.wv811_geocode_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.wv811_tickets(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_wv811_geocode_queue_pending
ON public.wv811_geocode_queue(status, created_at)
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.wv811_geocode_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY wv811_geocode_queue_service ON public.wv811_geocode_queue
    FOR ALL USING (auth.role() = 'service_role');

-- Function to queue ticket for geocoding
CREATE OR REPLACE FUNCTION public.queue_ticket_for_geocoding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only queue if ticket has address but no coordinates
    IF NEW.dig_site_address IS NOT NULL
       AND NEW.dig_site_location IS NULL
       AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.dig_site_location IS NULL))
    THEN
        -- Insert into queue (ignore if already queued)
        INSERT INTO public.wv811_geocode_queue (ticket_id)
        VALUES (NEW.id)
        ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger on ticket insert/update
DROP TRIGGER IF EXISTS wv811_tickets_geocode_queue ON public.wv811_tickets;
CREATE TRIGGER wv811_tickets_geocode_queue
    AFTER INSERT OR UPDATE OF dig_site_address, dig_site_location ON public.wv811_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.queue_ticket_for_geocoding();

-- Add unique constraint to prevent duplicate queue entries
ALTER TABLE public.wv811_geocode_queue
ADD CONSTRAINT wv811_geocode_queue_ticket_unique
UNIQUE (ticket_id)
DEFERRABLE INITIALLY DEFERRED;

COMMENT ON TABLE public.wv811_geocode_queue IS
'Queue for tickets that need geocoding. Processed by scheduled job or edge function.';

COMMENT ON FUNCTION public.queue_ticket_for_geocoding IS
'Automatically queues tickets for geocoding when created without coordinates';

SELECT 'Migration 120: Auto-Geocode Trigger completed successfully' AS status;
