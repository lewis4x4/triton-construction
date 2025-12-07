// =============================================================================
// Edge Function: complete-training-session
// Purpose: Mark a training session as complete and auto-grant certifications
// Part of Safety Compliance Enforcement System - "The Gatekeeper"
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteSessionRequest {
  session_id: string;
  attendee_updates?: {
    attendee_id: string;
    attendance_status: 'present' | 'absent' | 'excused' | 'no_show';
  }[];
  notes?: string;
}

interface GrantedCertification {
  employee_id?: string;
  subcontractor_worker_id?: string;
  name: string;
  certification_code: string;
  certification_name: string;
  expires_at?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth user for permission check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CompleteSessionRequest = await req.json();
    const { session_id, attendee_updates, notes } = body;

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: 'session_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 1: Get session and verify it's completable
    // =========================================================================
    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .select(`
        *,
        training_programs (
          id,
          name,
          provider_type
        )
      `)
      .eq('id', session_id)
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Training session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Session is already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (session.status === 'cancelled') {
      return new Response(
        JSON.stringify({ error: 'Cannot complete a cancelled session' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 2: Update attendee statuses if provided
    // =========================================================================
    if (attendee_updates && attendee_updates.length > 0) {
      for (const update of attendee_updates) {
        await supabase
          .from('training_session_attendees')
          .update({
            attendance_status: update.attendance_status,
            acknowledged_at: update.attendance_status === 'present' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.attendee_id)
          .eq('session_id', session_id);
      }
    }

    // =========================================================================
    // STEP 3: Get program → certification mappings
    // =========================================================================
    const { data: certMappings } = await supabase
      .from('training_program_certifications')
      .select(`
        certification_type_id,
        validity_months_override,
        certification_types (
          id,
          code,
          name,
          default_validity_months,
          requires_signature
        )
      `)
      .eq('program_id', session.program_id);

    // =========================================================================
    // STEP 4: Get present attendees
    // =========================================================================
    const { data: presentAttendees } = await supabase
      .from('training_session_attendees')
      .select(`
        id,
        employee_id,
        subcontractor_worker_id,
        signed_at,
        certifications_granted,
        employees (id, first_name, last_name, display_name),
        subcontractor_workers (id, first_name, last_name)
      `)
      .eq('session_id', session_id)
      .eq('attendance_status', 'present')
      .eq('certifications_granted', false);

    // =========================================================================
    // STEP 5: Get organization name for issuing authority
    // =========================================================================
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', session.organization_id)
      .single();

    const issuingAuthority = org?.name
      ? `${org.name} Safety Team`
      : 'Triton Construction Safety Team';

    // =========================================================================
    // STEP 6: Grant certifications to present attendees
    // =========================================================================
    const grantedCertifications: GrantedCertification[] = [];
    const errors: string[] = [];

    if (certMappings && presentAttendees) {
      for (const attendee of presentAttendees) {
        for (const mapping of certMappings) {
          const certType = mapping.certification_types as any;
          if (!certType) continue;

          // Check if signature required but not captured
          if (certType.requires_signature && !attendee.signed_at) {
            errors.push(
              `${attendee.employees?.display_name || attendee.subcontractor_workers?.first_name}: ` +
              `${certType.name} requires signature`
            );
            continue;
          }

          // Calculate expiration
          const validityMonths = mapping.validity_months_override || certType.default_validity_months;
          let expiresAt: string | null = null;
          if (validityMonths) {
            const expDate = new Date(session.session_date);
            expDate.setMonth(expDate.getMonth() + validityMonths);
            expiresAt = expDate.toISOString().split('T')[0];
          }

          // Generate certificate number
          const certNumber = `${certType.code}-${session.session_date.replace(/-/g, '')}-${
            String(Math.floor(Math.random() * 10000)).padStart(4, '0')
          }`;

          // Grant to employee
          if (attendee.employee_id) {
            const { error: insertError } = await supabase
              .from('employee_certifications')
              .upsert({
                employee_id: attendee.employee_id,
                certification_type: certType.code,
                certification_type_id: certType.id,
                issued_date: session.session_date,
                expires_at: expiresAt,
                issuing_authority: issuingAuthority,
                certificate_number: certNumber,
                source: 'internal',
                training_session_id: session_id,
                verification_status: 'verified',
                verified_at: new Date().toISOString(),
                status: 'active',
                updated_at: new Date().toISOString(),
              }, {
                onConflict: 'employee_id,certification_type',
                ignoreDuplicates: false,
              });

            if (!insertError) {
              grantedCertifications.push({
                employee_id: attendee.employee_id,
                name: attendee.employees?.display_name ||
                      `${attendee.employees?.first_name} ${attendee.employees?.last_name}`,
                certification_code: certType.code,
                certification_name: certType.name,
                expires_at: expiresAt || undefined,
              });
            }
          }

          // Update subcontractor worker OSHA flags
          if (attendee.subcontractor_worker_id) {
            if (certType.code === 'OSHA_10') {
              await supabase
                .from('subcontractor_workers')
                .update({
                  osha_10_certified: true,
                  osha_10_cert_date: session.session_date,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', attendee.subcontractor_worker_id);
            } else if (certType.code === 'OSHA_30') {
              await supabase
                .from('subcontractor_workers')
                .update({
                  osha_30_certified: true,
                  osha_30_cert_date: session.session_date,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', attendee.subcontractor_worker_id);
            }

            grantedCertifications.push({
              subcontractor_worker_id: attendee.subcontractor_worker_id,
              name: `${attendee.subcontractor_workers?.first_name} ${attendee.subcontractor_workers?.last_name}`,
              certification_code: certType.code,
              certification_name: certType.name,
              expires_at: expiresAt || undefined,
            });
          }
        }

        // Mark attendee as certifications granted
        await supabase
          .from('training_session_attendees')
          .update({
            certifications_granted: true,
            certifications_granted_at: new Date().toISOString(),
          })
          .eq('id', attendee.id);
      }
    }

    // =========================================================================
    // STEP 7: Mark session as completed
    // =========================================================================
    const { error: updateError } = await supabase
      .from('training_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        notes: notes || session.notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session_id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update session status', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // STEP 8: Get final attendee count
    // =========================================================================
    const { count: presentCount } = await supabase
      .from('training_session_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .eq('attendance_status', 'present');

    const { count: totalCount } = await supabase
      .from('training_session_attendees')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id);

    return new Response(
      JSON.stringify({
        success: true,
        session_id,
        session_number: session.session_number,
        program_name: session.training_programs?.name,
        completed_at: new Date().toISOString(),
        attendees: {
          present: presentCount || 0,
          total: totalCount || 0,
        },
        certifications_granted: grantedCertifications.length,
        granted_details: grantedCertifications,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Complete training session error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
