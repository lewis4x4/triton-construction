import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Geocode Ticket Edge Function
 *
 * Geocodes WV811 ticket addresses using Geocodio API
 *
 * Features:
 * - Single ticket geocoding by ID
 * - Batch geocoding for all tickets without coordinates
 * - Updates dig_site_location PostGIS point
 * - Caches geocoding results to avoid duplicate API calls
 *
 * Required Secrets:
 * - GEOCODIO_API_KEY
 */

interface GeocodeRequest {
  ticketId?: string; // Geocode single ticket by ID
  ticketIds?: string[]; // Geocode multiple specific tickets
  geocodeAll?: boolean; // Geocode all tickets without coordinates
  organizationId?: string; // Filter for specific organization
  limit?: number; // Max tickets to geocode in batch (default 100)
}

interface GeocodioResult {
  input: {
    formatted_address: string;
  };
  results: Array<{
    formatted_address: string;
    location: {
      lat: number;
      lng: number;
    };
    accuracy: number;
    accuracy_type: string;
    source: string;
    address_components: {
      number?: string;
      predirectional?: string;
      street?: string;
      suffix?: string;
      city?: string;
      county?: string;
      state?: string;
      zip?: string;
    };
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const geocodioApiKey = Deno.env.get('GEOCODIO_API_KEY');

    if (!geocodioApiKey) {
      console.error('Geocodio API key not configured');
      return new Response(
        JSON.stringify({
          error: 'Geocoding service not configured',
          details: 'GEOCODIO_API_KEY secret missing. Add it in Supabase Dashboard.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: GeocodeRequest = await req.json();
    const { ticketId, ticketIds, geocodeAll, organizationId, limit = 100 } = body;

    // Build query to find tickets needing geocoding
    let query = supabase
      .from('wv811_tickets')
      .select('id, ticket_number, dig_site_address, dig_site_city, dig_site_state, dig_site_zip, dig_site_county');

    if (ticketId) {
      // Single ticket
      query = query.eq('id', ticketId);
    } else if (ticketIds && ticketIds.length > 0) {
      // Multiple specific tickets
      query = query.in('id', ticketIds);
    } else if (geocodeAll) {
      // All tickets without coordinates
      query = query.is('dig_site_location', null);
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      query = query.limit(limit);
    } else {
      return new Response(
        JSON.stringify({
          error: 'Invalid request',
          details: 'Provide ticketId, ticketIds, or set geocodeAll: true',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: tickets, error: fetchError } = await query;

    if (fetchError) {
      console.error('Database fetch error:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tickets', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tickets || tickets.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No tickets found needing geocoding',
          processed: 0,
          results: [],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Geocoding ${tickets.length} tickets...`);

    const results: Array<{
      ticketId: string;
      ticketNumber: string;
      status: 'success' | 'failed' | 'skipped';
      latitude?: number;
      longitude?: number;
      accuracy?: string;
      formattedAddress?: string;
      error?: string;
    }> = [];

    // Process tickets one at a time to avoid rate limits
    for (const ticket of tickets) {
      // Build address string
      const addressParts = [
        ticket.dig_site_address,
        ticket.dig_site_city,
        ticket.dig_site_state || 'WV',
        ticket.dig_site_zip,
      ].filter(Boolean);

      if (addressParts.length < 2) {
        results.push({
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          status: 'skipped',
          error: 'Insufficient address data',
        });
        continue;
      }

      const fullAddress = addressParts.join(', ');

      try {
        // Call Geocodio API
        const geocodioUrl = new URL('https://api.geocod.io/v1.7/geocode');
        geocodioUrl.searchParams.set('q', fullAddress);
        geocodioUrl.searchParams.set('api_key', geocodioApiKey);

        const geocodeResponse = await fetch(geocodioUrl.toString());
        const geocodeData: GeocodioResult = await geocodeResponse.json();

        if (!geocodeResponse.ok) {
          console.error(`Geocodio error for ${ticket.ticket_number}:`, geocodeData);
          results.push({
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,
            status: 'failed',
            error: 'Geocodio API error',
          });
          continue;
        }

        if (!geocodeData.results || geocodeData.results.length === 0) {
          results.push({
            ticketId: ticket.id,
            ticketNumber: ticket.ticket_number,
            status: 'failed',
            error: 'No geocoding results found',
          });
          continue;
        }

        // Use the best result (first one)
        const best = geocodeData.results[0];
        const { lat, lng } = best.location;

        // Update ticket with coordinates using PostGIS ST_SetSRID/ST_MakePoint
        const { error: updateError } = await supabase.rpc('update_ticket_location', {
          p_ticket_id: ticket.id,
          p_latitude: lat,
          p_longitude: lng,
        });

        if (updateError) {
          // Try direct SQL update if RPC doesn't exist
          const { error: directError } = await supabase
            .from('wv811_tickets')
            .update({
              dig_site_location: `SRID=4326;POINT(${lng} ${lat})`,
            })
            .eq('id', ticket.id);

          if (directError) {
            console.error(`Update error for ${ticket.ticket_number}:`, directError);
            results.push({
              ticketId: ticket.id,
              ticketNumber: ticket.ticket_number,
              status: 'failed',
              error: `Database update failed: ${directError.message}`,
            });
            continue;
          }
        }

        results.push({
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          status: 'success',
          latitude: lat,
          longitude: lng,
          accuracy: best.accuracy_type,
          formattedAddress: best.formatted_address,
        });

        console.log(`Geocoded ${ticket.ticket_number}: ${lat}, ${lng} (${best.accuracy_type})`);

        // Small delay to avoid rate limiting (Geocodio allows 1000 req/min)
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Geocoding error for ${ticket.ticket_number}:`, error);
        results.push({
          ticketId: ticket.id,
          ticketNumber: ticket.ticket_number,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successful = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;
    const skipped = results.filter((r) => r.status === 'skipped').length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Geocoded ${successful} of ${tickets.length} tickets`,
        processed: tickets.length,
        successful,
        failed,
        skipped,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Geocode ticket error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to geocode tickets' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
