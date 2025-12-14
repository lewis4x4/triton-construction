// =============================================================================
// Edge Function: wv811-high-risk-alert
// Purpose: Detect when users enter high-risk 811 ticket areas and send alerts
// Per CLAUDE.md: 811 Utility Conflict Heatmap - push notification on high-risk entry
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LocationCheckRequest {
  latitude: number;
  longitude: number;
  user_id?: string;
  radius_meters?: number; // Default 500m for high-risk detection
  organization_id?: string;
}

interface NearbyTicket {
  id: string;
  ticket_number: string;
  dig_site_address: string;
  dig_site_city: string | null;
  risk_score: number;
  has_gas_utility: boolean;
  has_electric_utility: boolean;
  status: string;
  legal_dig_date: string;
  ticket_expires_at: string;
  distance_meters: number;
}

interface AlertResponse {
  high_risk_tickets: NearbyTicket[];
  alert_queued: boolean;
  alert_message: string | null;
  total_nearby: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: LocationCheckRequest = await req.json();
    const { latitude, longitude, radius_meters = 500, user_id, organization_id } = body;

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: 'latitude and longitude are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking high-risk area at ${latitude}, ${longitude} (radius: ${radius_meters}m)`);

    // Find nearby high-risk tickets using PostGIS
    // Only check active tickets (PENDING, IN_PROGRESS) that haven't expired
    const { data: nearbyTickets, error: queryError } = await supabaseClient.rpc(
      'find_nearby_high_risk_tickets',
      {
        p_lat: latitude,
        p_lng: longitude,
        p_radius_meters: radius_meters,
        p_organization_id: organization_id || null,
      }
    );

    if (queryError) {
      // If the RPC doesn't exist, fall back to direct query
      console.log('RPC not found, using direct query:', queryError.message);

      const { data: fallbackTickets, error: fallbackError } = await supabaseClient
        .from('wv811_tickets')
        .select(`
          id,
          ticket_number,
          dig_site_address,
          dig_site_city,
          risk_score,
          has_gas_utility,
          has_electric_utility,
          status,
          legal_dig_date,
          ticket_expires_at
        `)
        .in('status', ['PENDING', 'IN_PROGRESS'])
        .gte('ticket_expires_at', new Date().toISOString().split('T')[0])
        .or(`risk_score.gte.70,has_gas_utility.eq.true,has_electric_utility.eq.true`)
        .limit(50);

      if (fallbackError) {
        throw fallbackError;
      }

      // For fallback, we can't calculate distance without PostGIS, so return all high-risk
      const response: AlertResponse = {
        high_risk_tickets: (fallbackTickets || []).map(t => ({
          ...t,
          distance_meters: 0, // Unknown without PostGIS
        })),
        alert_queued: false,
        alert_message: null,
        total_nearby: fallbackTickets?.length || 0,
      };

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const highRiskTickets = (nearbyTickets || []) as NearbyTicket[];
    console.log(`Found ${highRiskTickets.length} high-risk tickets nearby`);

    let alertQueued = false;
    let alertMessage: string | null = null;

    // If there are high-risk tickets and we have a user_id, queue a notification
    if (highRiskTickets.length > 0 && user_id && organization_id) {
      // Check if we've already sent an alert for this area recently (within 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: recentAlerts } = await supabaseClient
        .from('wv811_ticket_alerts')
        .select('id')
        .eq('user_id', user_id)
        .eq('alert_type', 'CONFLICT') // Reusing CONFLICT type for high-risk entry
        .gte('created_at', oneHourAgo)
        .limit(1);

      if (!recentAlerts || recentAlerts.length === 0) {
        // Build alert content
        const topTicket = highRiskTickets[0];
        const gasCount = highRiskTickets.filter(t => t.has_gas_utility).length;
        const electricCount = highRiskTickets.filter(t => t.has_electric_utility).length;

        alertMessage = buildAlertMessage(highRiskTickets, gasCount, electricCount);
        const subject = `⚠️ HIGH-RISK DIG AREA: ${highRiskTickets.length} active ticket${highRiskTickets.length > 1 ? 's' : ''} nearby`;

        // Queue notification
        const { error: queueError } = await supabaseClient
          .from('notification_queue')
          .insert({
            organization_id,
            notification_type: 'wv811_high_risk_area',
            priority: 2, // High priority
            reference_type: 'wv811_ticket',
            reference_id: topTicket.id,
            recipient_user_ids: [user_id],
            channels: ['in_app', 'email'],
            subject,
            body: alertMessage,
            data: {
              tickets: highRiskTickets.map(t => ({
                id: t.id,
                ticket_number: t.ticket_number,
                risk_score: t.risk_score,
                has_gas: t.has_gas_utility,
                has_electric: t.has_electric_utility,
                distance_meters: t.distance_meters,
              })),
              location: { latitude, longitude },
              gas_count: gasCount,
              electric_count: electricCount,
            },
          });

        if (queueError) {
          console.error('Failed to queue notification:', queueError.message);
        } else {
          alertQueued = true;
          console.log('High-risk area notification queued');

          // Also create wv811_ticket_alerts record for tracking
          for (const ticket of highRiskTickets.slice(0, 5)) {
            await supabaseClient.from('wv811_ticket_alerts').insert({
              ticket_id: ticket.id,
              user_id,
              alert_type: 'CONFLICT', // Reusing for high-risk proximity
              channel: 'PUSH',
              subject,
              body: alertMessage,
              sent_at: new Date().toISOString(),
            });
          }

          // Send FCM push notification
          await sendMobilePushNotification(
            user_id,
            subject,
            alertMessage,
            highRiskTickets,
            { latitude, longitude },
            organization_id
          );
        }
      } else {
        console.log('Recent alert already sent, skipping');
        alertMessage = 'Alert suppressed (sent within last hour)';
      }
    }

    const response: AlertResponse = {
      high_risk_tickets: highRiskTickets,
      alert_queued: alertQueued,
      alert_message: alertMessage,
      total_nearby: highRiskTickets.length,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('High-risk alert error:', errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =============================================================================
// Helper Functions
// =============================================================================

async function sendMobilePushNotification(
  userId: string,
  title: string,
  body: string,
  tickets: NearbyTicket[],
  location: { latitude: number; longitude: number },
  organizationId: string
): Promise<void> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Call the send-push-notification edge function
    const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_ids: [userId],
        title,
        body,
        notification_type: 'high_risk_proximity',
        priority: 'high',
        sound: true,
        android_channel_id: 'high_risk_alerts',
        data: {
          type: 'high_risk_proximity',
          ticket_count: String(tickets.length),
          nearest_ticket_id: tickets[0]?.id || '',
          nearest_ticket_number: tickets[0]?.ticket_number || '',
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          has_gas: String(tickets.some(t => t.has_gas_utility)),
          has_electric: String(tickets.some(t => t.has_electric_utility)),
        },
        related_ticket_id: tickets[0]?.id,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to send push notification:', error);
    } else {
      const result = await response.json();
      console.log(`Push notification sent: ${result.sent} delivered, ${result.failed} failed`);
    }
  } catch (error) {
    // Don't fail the main function if push fails
    console.error('Push notification error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

function buildAlertMessage(
  tickets: NearbyTicket[],
  gasCount: number,
  electricCount: number
): string {
  const lines: string[] = [];

  lines.push(`🚨 You are entering a HIGH-RISK excavation area!`);
  lines.push('');

  if (gasCount > 0) {
    lines.push(`⛽ ${gasCount} ticket${gasCount > 1 ? 's' : ''} with GAS utilities`);
  }
  if (electricCount > 0) {
    lines.push(`⚡ ${electricCount} ticket${electricCount > 1 ? 's' : ''} with ELECTRIC utilities`);
  }

  lines.push('');
  lines.push('Nearby tickets:');

  for (const ticket of tickets.slice(0, 3)) {
    const riskLevel = ticket.risk_score >= 80 ? 'CRITICAL'
      : ticket.risk_score >= 60 ? 'HIGH'
      : 'ELEVATED';

    lines.push(`• ${ticket.ticket_number} - ${riskLevel} RISK`);
    lines.push(`  ${ticket.dig_site_address}${ticket.dig_site_city ? `, ${ticket.dig_site_city}` : ''}`);
    if (ticket.distance_meters > 0) {
      lines.push(`  Distance: ${Math.round(ticket.distance_meters)}m`);
    }
  }

  if (tickets.length > 3) {
    lines.push(`  ... and ${tickets.length - 3} more`);
  }

  lines.push('');
  lines.push('⚠️ REQUIRED: Take photo before excavating');
  lines.push('📞 Call 811 if any concerns');

  return lines.join('\n');
}
