import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * 811 Audit Pack Export Edge Function
 *
 * Generates comprehensive compliance audit packages for WV811 tickets.
 * Includes:
 * - Full ticket history and dates
 * - All utility responses with status transitions
 * - Complete alert log with acknowledgements
 * - Photos and field notes
 * - GPS/timestamp evidence
 *
 * Supports 7-year retention per legal requirements.
 */

interface AuditPackRequest {
  ticketId: string;
  includePhotos?: boolean;
  includeAlerts?: boolean;
  includeAcknowledgements?: boolean;
  includeNotes?: boolean;
  includeDigChecks?: boolean;
  format?: 'JSON' | 'PDF';
}

interface TicketData {
  id: string;
  ticket_number: string;
  ticket_type?: string;
  status: string;
  dig_site_address: string;
  dig_site_city?: string;
  dig_site_county?: string;
  dig_site_state?: string;
  dig_site_zip?: string;
  cross_street_1?: string;
  cross_street_2?: string;
  location_description?: string;
  excavator_company?: string;
  excavator_name?: string;
  excavator_phone?: string;
  excavator_email?: string;
  work_type?: string;
  work_description?: string;
  depth_in_inches?: number;
  ticket_created_at: string;
  legal_dig_date: string;
  ticket_expires_at: string;
  update_by_date?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

interface UtilityResponse {
  id: string;
  utility_code: string;
  utility_name: string;
  utility_type?: string;
  response_type: string;
  response_status?: string;
  response_received_at?: string;
  response_message?: string;
  response_window_opens_at?: string;
  response_window_closes_at?: string;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  conflict_logged_by?: string;
  conflict_logged_at?: string;
  conflict_reason?: string;
  conflict_resolved_by?: string;
  conflict_resolved_at?: string;
  conflict_resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

interface Alert {
  id: string;
  alert_type: string;
  alert_level: string;
  message: string;
  scheduled_for: string;
  sent_at?: string;
  acknowledged_at?: string;
  status: string;
  created_at: string;
}

interface AlertAcknowledgement {
  id: string;
  alert_id: string;
  user_id: string;
  status: string;
  sent_at: string;
  sent_via?: string[];
  delivered_at?: string;
  opened_at?: string;
  acknowledged_at?: string;
  acknowledged_action?: string;
  escalated_at?: string;
  escalated_to?: string;
  escalation_reason?: string;
  user_profiles?: { first_name?: string; last_name?: string; email?: string };
}

interface PhotoVerification {
  id: string;
  storage_path: string;
  file_name: string;
  captured_at: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy_meters?: number;
  verification_type: string;
  notes?: string;
  is_exception: boolean;
  exception_reason?: string;
  captured_by_profile?: { first_name?: string; last_name?: string };
}

interface TicketNote {
  id: string;
  note_type: string;
  content: string;
  created_at: string;
  user_profiles?: { first_name?: string; last_name?: string };
}

interface AuditPackData {
  exportInfo: {
    exportedAt: string;
    exportedBy: { id: string; email?: string; name?: string };
    format: string;
    retentionUntil: string;
  };
  ticket: TicketData;
  utilityResponses: UtilityResponse[];
  alerts: Alert[];
  acknowledgements: AlertAcknowledgement[];
  photos: PhotoVerification[];
  notes: TicketNote[];
  timeline: TimelineEvent[];
  summary: {
    totalUtilities: number;
    utilitiesCleared: number;
    utilitiesUnverified: number;
    utilitiesConflict: number;
    utilitiesPending: number;
    totalAlerts: number;
    alertsAcknowledged: number;
    alertsEscalated: number;
    photosCount: number;
    notesCount: number;
    legalCompliance: LegalComplianceCheck;
  };
}

interface TimelineEvent {
  timestamp: string;
  eventType: string;
  description: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}

interface LegalComplianceCheck {
  ticketObtained: boolean;
  twoBusinessDayWait: boolean;
  allUtilitiesResponded: boolean;
  photosDocumented: boolean;
  alertsAcknowledged: boolean;
  overallStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT';
  issues: string[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = userData.user;

    // Parse request body
    const body: AuditPackRequest = await req.json();
    const {
      ticketId,
      includePhotos = true,
      includeAlerts = true,
      includeAcknowledgements = true,
      includeNotes = true,
      includeDigChecks = true,
      format = 'JSON',
    } = body;

    if (!ticketId) {
      return new Response(JSON.stringify({ error: 'ticketId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const startTime = Date.now();

    // Fetch ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('wv811_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch utility responses
    const { data: utilityResponses } = await supabase
      .from('wv811_utility_responses')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('utility_name');

    // Fetch alerts
    let alerts: Alert[] = [];
    if (includeAlerts) {
      const { data: alertData } = await supabase
        .from('wv811_ticket_alerts')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      alerts = alertData || [];
    }

    // Fetch acknowledgements
    let acknowledgements: AlertAcknowledgement[] = [];
    if (includeAcknowledgements && alerts.length > 0) {
      const alertIds = alerts.map((a) => a.id);
      const { data: ackData } = await supabase
        .from('wv811_alert_acknowledgements')
        .select(
          `
          *,
          user_profiles:user_id (first_name, last_name, email)
        `
        )
        .in('alert_id', alertIds)
        .order('sent_at', { ascending: true });
      acknowledgements = ackData || [];
    }

    // Fetch photos
    let photos: PhotoVerification[] = [];
    if (includePhotos) {
      const { data: photoData } = await supabase
        .from('wv811_photo_verifications')
        .select(
          `
          *,
          captured_by_profile:captured_by (first_name, last_name)
        `
        )
        .eq('ticket_id', ticketId)
        .order('captured_at', { ascending: true });
      photos = photoData || [];
    }

    // Fetch notes
    let notes: TicketNote[] = [];
    if (includeNotes) {
      const { data: noteData } = await supabase
        .from('wv811_ticket_notes')
        .select(
          `
          *,
          user_profiles:user_id (first_name, last_name)
        `
        )
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      notes = noteData || [];
    }

    // Build timeline
    const timeline = buildTimeline(ticket, utilityResponses || [], alerts, acknowledgements, photos, notes);

    // Calculate summary stats
    const utilities = utilityResponses || [];
    const utilitiesCleared = utilities.filter(
      (u) => u.response_status === 'CLEAR' || u.response_status === 'MARKED' || u.response_status === 'VERIFIED_ON_SITE'
    ).length;
    const utilitiesUnverified = utilities.filter((u) => u.response_status === 'UNVERIFIED').length;
    const utilitiesConflict = utilities.filter((u) => u.response_status === 'CONFLICT').length;
    const utilitiesPending = utilities.filter(
      (u) => u.response_status === 'PENDING' || !u.response_status
    ).length;

    const alertsAcknowledged = acknowledgements.filter((a) => a.status === 'ACKNOWLEDGED').length;
    const alertsEscalated = acknowledgements.filter((a) => a.status === 'ESCALATED').length;

    // Legal compliance check
    const legalCompliance = checkLegalCompliance(ticket, utilities, alerts, acknowledgements, photos);

    // Get user profile for export info
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const retentionUntil = new Date();
    retentionUntil.setFullYear(retentionUntil.getFullYear() + 7);

    // Build audit pack
    const auditPack: AuditPackData = {
      exportInfo: {
        exportedAt: new Date().toISOString(),
        exportedBy: {
          id: user.id,
          email: user.email,
          name: userProfile
            ? `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim()
            : undefined,
        },
        format,
        retentionUntil: retentionUntil.toISOString(),
      },
      ticket,
      utilityResponses: utilities,
      alerts,
      acknowledgements,
      photos,
      notes,
      timeline,
      summary: {
        totalUtilities: utilities.length,
        utilitiesCleared,
        utilitiesUnverified,
        utilitiesConflict,
        utilitiesPending,
        totalAlerts: alerts.length,
        alertsAcknowledged,
        alertsEscalated,
        photosCount: photos.length,
        notesCount: notes.length,
        legalCompliance,
      },
    };

    const generationDuration = Date.now() - startTime;

    // Save audit pack record
    const exportName = `AuditPack_${ticket.ticket_number}_${new Date().toISOString().split('T')[0]}`;
    const { data: auditPackRecord, error: insertError } = await supabase
      .from('wv811_audit_packs')
      .insert({
        organization_id: ticket.organization_id,
        ticket_id: ticketId,
        export_name: exportName,
        export_format: format,
        includes_ticket_details: true,
        includes_utility_responses: true,
        includes_alert_log: includeAlerts,
        includes_acknowledgements: includeAcknowledgements,
        includes_photos: includePhotos,
        includes_field_notes: includeNotes,
        includes_dig_checks: includeDigChecks,
        data_start_date: ticket.ticket_created_at,
        data_end_date: new Date().toISOString(),
        generated_by: user.id,
        generated_at: new Date().toISOString(),
        generation_duration_ms: generationDuration,
        retention_until: retentionUntil.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving audit pack record:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        auditPackId: auditPackRecord?.id,
        exportName,
        generationDurationMs: generationDuration,
        data: auditPack,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Audit pack export error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate audit pack' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildTimeline(
  ticket: TicketData,
  utilities: UtilityResponse[],
  alerts: Alert[],
  acknowledgements: AlertAcknowledgement[],
  photos: PhotoVerification[],
  notes: TicketNote[]
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Ticket created
  events.push({
    timestamp: ticket.ticket_created_at,
    eventType: 'TICKET_CREATED',
    description: `Ticket #${ticket.ticket_number} created`,
    metadata: { ticketType: ticket.ticket_type },
  });

  // Legal dig date
  events.push({
    timestamp: ticket.legal_dig_date,
    eventType: 'LEGAL_DIG_DATE',
    description: 'Legal dig date (2 business days from creation)',
  });

  // Utility response windows
  for (const utility of utilities) {
    if (utility.response_window_closes_at) {
      events.push({
        timestamp: utility.response_window_closes_at,
        eventType: 'UTILITY_WINDOW_CLOSES',
        description: `${utility.utility_name} (${utility.utility_code}) response window closes`,
        metadata: { utilityId: utility.id, utilityCode: utility.utility_code },
      });
    }

    if (utility.response_received_at) {
      events.push({
        timestamp: utility.response_received_at,
        eventType: 'UTILITY_RESPONSE',
        description: `${utility.utility_name} responded: ${utility.response_status || utility.response_type}`,
        metadata: {
          utilityId: utility.id,
          status: utility.response_status,
          message: utility.response_message,
        },
      });
    }

    if (utility.verified_at) {
      events.push({
        timestamp: utility.verified_at,
        eventType: 'UTILITY_VERIFIED',
        description: `${utility.utility_name} verified on-site`,
        actor: utility.verified_by || undefined,
        metadata: { notes: utility.verification_notes },
      });
    }

    if (utility.conflict_logged_at) {
      events.push({
        timestamp: utility.conflict_logged_at,
        eventType: 'CONFLICT_LOGGED',
        description: `CONFLICT logged for ${utility.utility_name}`,
        actor: utility.conflict_logged_by || undefined,
        metadata: { reason: utility.conflict_reason },
      });
    }

    if (utility.conflict_resolved_at) {
      events.push({
        timestamp: utility.conflict_resolved_at,
        eventType: 'CONFLICT_RESOLVED',
        description: `Conflict resolved for ${utility.utility_name}`,
        actor: utility.conflict_resolved_by || undefined,
        metadata: { notes: utility.conflict_resolution_notes },
      });
    }
  }

  // Alerts
  for (const alert of alerts) {
    if (alert.sent_at) {
      events.push({
        timestamp: alert.sent_at,
        eventType: 'ALERT_SENT',
        description: `${alert.alert_type} alert sent: ${alert.message}`,
        metadata: { alertId: alert.id, alertLevel: alert.alert_level },
      });
    }
  }

  // Acknowledgements
  for (const ack of acknowledgements) {
    if (ack.acknowledged_at) {
      const userName = ack.user_profiles
        ? `${ack.user_profiles.first_name || ''} ${ack.user_profiles.last_name || ''}`.trim()
        : 'Unknown';
      events.push({
        timestamp: ack.acknowledged_at,
        eventType: 'ALERT_ACKNOWLEDGED',
        description: `Alert acknowledged by ${userName}`,
        actor: ack.user_id,
        metadata: { action: ack.acknowledged_action },
      });
    }

    if (ack.escalated_at) {
      events.push({
        timestamp: ack.escalated_at,
        eventType: 'ALERT_ESCALATED',
        description: `Alert escalated: ${ack.escalation_reason || 'No acknowledgement received'}`,
        metadata: { escalatedTo: ack.escalated_to },
      });
    }
  }

  // Photos
  for (const photo of photos) {
    const capturedBy = photo.captured_by_profile
      ? `${photo.captured_by_profile.first_name || ''} ${photo.captured_by_profile.last_name || ''}`.trim()
      : 'Unknown';
    events.push({
      timestamp: photo.captured_at,
      eventType: photo.is_exception ? 'PHOTO_EXCEPTION' : 'PHOTO_CAPTURED',
      description: photo.is_exception
        ? `Photo exception logged: ${photo.exception_reason}`
        : `Verification photo captured: ${photo.verification_type}`,
      actor: capturedBy,
      metadata: {
        latitude: photo.latitude,
        longitude: photo.longitude,
        notes: photo.notes,
      },
    });
  }

  // Notes
  for (const note of notes) {
    const author = note.user_profiles
      ? `${note.user_profiles.first_name || ''} ${note.user_profiles.last_name || ''}`.trim()
      : 'System';
    events.push({
      timestamp: note.created_at,
      eventType: 'NOTE_ADDED',
      description: `${note.note_type} note: ${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}`,
      actor: author,
    });
  }

  // Ticket expiration
  events.push({
    timestamp: ticket.ticket_expires_at,
    eventType: 'TICKET_EXPIRES',
    description: `Ticket expires (10 business days from legal dig date)`,
  });

  // Sort by timestamp
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return events;
}

function checkLegalCompliance(
  ticket: TicketData,
  utilities: UtilityResponse[],
  alerts: Alert[],
  acknowledgements: AlertAcknowledgement[],
  photos: PhotoVerification[]
): LegalComplianceCheck {
  const issues: string[] = [];

  // 1. Ticket obtained before digging
  const ticketObtained = !!ticket.ticket_number && !!ticket.ticket_created_at;
  if (!ticketObtained) {
    issues.push('No valid ticket record found');
  }

  // 2. Two business day wait observed
  const legalDigDate = new Date(ticket.legal_dig_date);
  const ticketCreated = new Date(ticket.ticket_created_at);
  const twoBusinessDayWait = legalDigDate.getTime() - ticketCreated.getTime() >= 2 * 24 * 60 * 60 * 1000;
  if (!twoBusinessDayWait) {
    issues.push('Two business day wait may not have been observed');
  }

  // 3. All utilities responded or window closed
  const pendingUtilities = utilities.filter(
    (u) => u.response_status === 'PENDING' && new Date(u.response_window_closes_at || '') > new Date()
  );
  const allUtilitiesResponded = pendingUtilities.length === 0;
  if (!allUtilitiesResponded) {
    issues.push(`${pendingUtilities.length} utilities still in response window`);
  }

  // Check for unverified utilities (proceed at risk)
  const unverifiedUtilities = utilities.filter((u) => u.response_status === 'UNVERIFIED');
  if (unverifiedUtilities.length > 0) {
    issues.push(
      `${unverifiedUtilities.length} utilities marked UNVERIFIED - excavator proceeded at own risk per WV law`
    );
  }

  // Check for conflicts
  const conflictUtilities = utilities.filter((u) => u.response_status === 'CONFLICT');
  if (conflictUtilities.length > 0) {
    issues.push(`${conflictUtilities.length} utilities have CONFLICT status`);
  }

  // 4. Photos documented
  const photosDocumented = photos.length > 0 || utilities.length === 0;
  if (!photosDocumented && utilities.length > 0) {
    issues.push('No verification photos documented');
  }

  // 5. Critical alerts acknowledged
  const criticalAlerts = alerts.filter((a) => a.alert_level === 'CRITICAL' || a.alert_type?.includes('EXPIRED'));
  const criticalAcks = acknowledgements.filter((a) => {
    const alert = alerts.find((al) => al.id === a.alert_id);
    return alert && (alert.alert_level === 'CRITICAL' || alert.alert_type?.includes('EXPIRED'));
  });
  const alertsAcknowledged = criticalAlerts.length === 0 || criticalAcks.some((a) => a.status === 'ACKNOWLEDGED');
  if (!alertsAcknowledged && criticalAlerts.length > 0) {
    issues.push('Critical alerts were not acknowledged');
  }

  // Determine overall status
  let overallStatus: 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' = 'COMPLIANT';

  if (conflictUtilities.length > 0 || !ticketObtained) {
    overallStatus = 'NON_COMPLIANT';
  } else if (issues.length > 0) {
    overallStatus = 'PARTIAL';
  }

  return {
    ticketObtained,
    twoBusinessDayWait,
    allUtilitiesResponded,
    photosDocumented,
    alertsAcknowledged,
    overallStatus,
    issues,
  };
}
