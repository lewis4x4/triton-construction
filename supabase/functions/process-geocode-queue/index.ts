import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Process Geocode Queue Edge Function
 *
 * Processes the wv811_geocode_queue table to geocode tickets that were
 * queued by the database trigger (migration 120).
 *
 * Can be called:
 * - Manually via HTTP request
 * - By a scheduled cron job (pg_cron or external scheduler)
 * - After email parsing to catch any missed tickets
 *
 * Features:
 * - Processes pending queue items
 * - Retries failed items up to 3 times
 * - Updates queue status (completed/failed)
 * - Cleans up old completed entries
 */

interface QueueItem {
  id: string;
  ticket_id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
}

interface GeocodioResult {
  results: Array<{
    formatted_address: string;
    location: {
      lat: number;
      lng: number;
    };
    accuracy: number;
    accuracy_type: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const geocodioApiKey = Deno.env.get('GEOCODIO_API_KEY');

    if (!geocodioApiKey) {
      console.error('GEOCODIO_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Geocoding service not configured' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse optional parameters
    let limit = 50;
    let cleanupDays = 7;

    try {
      const body = await req.json();
      limit = body.limit || 50;
      cleanupDays = body.cleanupDays || 7;
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Fetch pending queue items (including failed items with < 3 attempts)
    const { data: queueItems, error: fetchError } = await supabase
      .from('wv811_geocode_queue')
      .select('id, ticket_id, status, attempts, last_error, created_at')
      .or('status.eq.pending,and(status.eq.failed,attempts.lt.3)')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (fetchError) {
      console.error('Failed to fetch queue:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch queue', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      // Cleanup old completed entries while we're here
      await cleanupOldEntries(supabase, cleanupDays);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'No items in queue to process',
          processed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${queueItems.length} queue items...`);

    const results: Array<{
      queueId: string;
      ticketId: string;
      status: 'success' | 'failed' | 'skipped';
      error?: string;
    }> = [];

    // Process each queue item
    for (const item of queueItems as QueueItem[]) {
      // Mark as processing
      await supabase
        .from('wv811_geocode_queue')
        .update({
          status: 'processing',
          attempts: item.attempts + 1,
        })
        .eq('id', item.id);

      try {
        // Fetch the ticket
        const { data: ticket, error: ticketError } = await supabase
          .from('wv811_tickets')
          .select('id, ticket_number, dig_site_address, dig_site_city, dig_site_state, dig_site_zip, dig_site_location')
          .eq('id', item.ticket_id)
          .single();

        if (ticketError || !ticket) {
          throw new Error(`Ticket not found: ${ticketError?.message || 'Unknown'}`);
        }

        // Skip if already has coordinates
        if (ticket.dig_site_location) {
          await supabase
            .from('wv811_geocode_queue')
            .update({
              status: 'completed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', item.id);

          results.push({
            queueId: item.id,
            ticketId: item.ticket_id,
            status: 'skipped',
            error: 'Ticket already has coordinates',
          });
          continue;
        }

        // Build address string
        const addressParts = [
          ticket.dig_site_address,
          ticket.dig_site_city,
          ticket.dig_site_state || 'WV',
          ticket.dig_site_zip,
        ].filter(Boolean);

        if (addressParts.length < 2) {
          throw new Error('Insufficient address data');
        }

        const fullAddress = addressParts.join(', ');

        // Call Geocodio API
        const geocodioUrl = new URL('https://api.geocod.io/v1.7/geocode');
        geocodioUrl.searchParams.set('q', fullAddress);
        geocodioUrl.searchParams.set('api_key', geocodioApiKey);

        const geocodeResponse = await fetch(geocodioUrl.toString());
        const geocodeData: GeocodioResult = await geocodeResponse.json();

        if (!geocodeResponse.ok || !geocodeData.results?.length) {
          throw new Error('Geocoding returned no results');
        }

        // Use the best result
        const best = geocodeData.results[0];
        const { lat, lng } = best.location;

        // Update ticket with coordinates
        const { error: updateError } = await supabase
          .from('wv811_tickets')
          .update({
            dig_site_location: `SRID=4326;POINT(${lng} ${lat})`,
          })
          .eq('id', item.ticket_id);

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`);
        }

        // Mark queue item as completed
        await supabase
          .from('wv811_geocode_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', item.id);

        results.push({
          queueId: item.id,
          ticketId: item.ticket_id,
          status: 'success',
        });

        console.log(`Geocoded ticket ${ticket.ticket_number}: ${lat}, ${lng}`);

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Queue item ${item.id} failed:`, errorMessage);

        // Update queue item with failure
        const newStatus = item.attempts + 1 >= 3 ? 'failed' : 'pending';
        await supabase
          .from('wv811_geocode_queue')
          .update({
            status: newStatus,
            last_error: errorMessage,
          })
          .eq('id', item.id);

        results.push({
          queueId: item.id,
          ticketId: item.ticket_id,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    // Cleanup old completed entries
    await cleanupOldEntries(supabase, cleanupDays);

    const successful = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${queueItems.length} queue items`,
        processed: queueItems.length,
        successful,
        failed,
        skipped,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Process geocode queue error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Queue processing failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Clean up completed queue entries older than specified days
 */
async function cleanupOldEntries(supabase: ReturnType<typeof createClient>, days: number) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const { error } = await supabase
      .from('wv811_geocode_queue')
      .delete()
      .eq('status', 'completed')
      .lt('processed_at', cutoffDate.toISOString());

    if (error) {
      console.warn('Cleanup failed:', error.message);
    }
  } catch (e) {
    console.warn('Cleanup error:', e);
  }
}
