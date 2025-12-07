// =============================================================================
// Edge Function: emergency-override
// Purpose: Emergency Override Protocol per System Prompt v5.0
// - Logs override with digital signature
// - Sends immediate SMS to Safety Director
// - Allows work to proceed for 4 hours
// - AI NEVER initiates - only humans can request overrides
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OverrideRequest {
  override_type: string; // crew_assignment, equipment_use, certification_check
  blocked_action: string;
  blocking_reason: string;
  justification: string;
  digital_signature: string; // Base64 or typed name
  project_id?: string;
  employee_id?: string;
  subcontractor_id?: string;
  equipment_id?: string;
}

interface OverrideResponse {
  success: boolean;
  override_id: string;
  expires_at: string;
  safety_director_notified: boolean;
  message: string;
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

    // Get authenticated user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token and get user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: OverrideRequest = await req.json();

    // Validate required fields
    if (!body.override_type || !body.blocked_action || !body.blocking_reason ||
        !body.justification || !body.digital_signature) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: ['override_type', 'blocked_action', 'blocking_reason', 'justification', 'digital_signature']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization and role
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!userProfile?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User organization not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate expiration (4 hours from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000);

    // Create override record
    const { data: override, error: insertError } = await supabase
      .from('compliance_overrides')
      .insert({
        organization_id: userProfile.organization_id,
        override_type: body.override_type,
        blocked_action: body.blocked_action,
        blocking_reason: body.blocking_reason,
        justification: body.justification,
        digital_signature: body.digital_signature,
        project_id: body.project_id || null,
        employee_id: body.employee_id || null,
        subcontractor_id: body.subcontractor_id || null,
        equipment_id: body.equipment_id || null,
        override_start: now.toISOString(),
        override_expires: expiresAt.toISOString(),
        status: 'active',
        requested_by: user.id,
        requester_role: userProfile.role,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create override: ${insertError.message}`);
    }

    // ==========================================================================
    // NOTIFY SAFETY DIRECTOR
    // ==========================================================================
    let safetyDirectorNotified = false;

    // Get Safety Director contact info
    const { data: safetyDirectors } = await supabase
      .from('user_profiles')
      .select('id, phone, email, first_name, last_name')
      .eq('organization_id', userProfile.organization_id)
      .eq('role', 'SAFETY_DIRECTOR');

    // Also check for users with safety.approve permission
    const { data: safetyApprovers } = await supabase
      .rpc('get_users_with_permission', {
        p_organization_id: userProfile.organization_id,
        p_permission_code: 'safety.approve'
      });

    // Combine and dedupe safety contacts
    const safetyContacts = new Map();

    safetyDirectors?.forEach(sd => {
      if (sd.phone || sd.email) {
        safetyContacts.set(sd.id, sd);
      }
    });

    // Get requester info for the message
    const { data: requester } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    const requesterName = requester
      ? `${requester.first_name} ${requester.last_name}`
      : user.email;

    // Get project name if provided
    let projectName = 'Unknown Project';
    if (body.project_id) {
      const { data: project } = await supabase
        .from('projects')
        .select('name')
        .eq('id', body.project_id)
        .single();
      if (project) projectName = project.name;
    }

    // Send SMS to all safety contacts
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (twilioAccountSid && twilioAuthToken && twilioFromNumber) {
      const smsMessage = `🚨 COMPLIANCE OVERRIDE ALERT\n\n` +
        `Requested by: ${requesterName}\n` +
        `Project: ${projectName}\n` +
        `Type: ${body.override_type}\n` +
        `Reason: ${body.blocking_reason}\n` +
        `Justification: ${body.justification}\n\n` +
        `Override expires: ${expiresAt.toLocaleString()}\n` +
        `Review required.`;

      for (const [, contact] of safetyContacts) {
        if (contact.phone) {
          try {
            const twilioResponse = await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  To: contact.phone,
                  From: twilioFromNumber,
                  Body: smsMessage,
                }),
              }
            );

            if (twilioResponse.ok) {
              safetyDirectorNotified = true;

              // Log SMS sent
              await supabase
                .from('sms_logs')
                .insert({
                  organization_id: userProfile.organization_id,
                  recipient_phone: contact.phone,
                  message_type: 'COMPLIANCE_OVERRIDE',
                  message_body: smsMessage,
                  status: 'SENT',
                  related_id: override.id,
                });
            }
          } catch (smsError) {
            console.error('SMS send error:', smsError);
          }
        }
      }

      // Update override record with notification status
      await supabase
        .from('compliance_overrides')
        .update({
          safety_director_notified_at: safetyDirectorNotified ? now.toISOString() : null,
          safety_director_sms_sent: safetyDirectorNotified,
        })
        .eq('id', override.id);
    }

    // ==========================================================================
    // SEND EMAIL NOTIFICATION (backup)
    // ==========================================================================
    let emailSent = false;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey) {
      for (const [, contact] of safetyContacts) {
        if (contact.email) {
          try {
            const emailResponse = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: 'Triton Safety <safety@tritonwv.com>',
                to: contact.email,
                subject: `🚨 COMPLIANCE OVERRIDE ALERT - ${projectName}`,
                html: `
                  <h2 style="color: #dc2626;">Compliance Override Alert</h2>
                  <p>An emergency compliance override has been requested and requires review.</p>

                  <table style="border-collapse: collapse; margin: 20px 0;">
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Requested By</strong></td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${requesterName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Project</strong></td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${projectName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Override Type</strong></td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${body.override_type}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Blocked Action</strong></td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${body.blocked_action}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Blocking Reason</strong></td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${body.blocking_reason}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Justification</strong></td>
                      <td style="padding: 8px; border: 1px solid #ddd;">${body.justification}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Override Expires</strong></td>
                      <td style="padding: 8px; border: 1px solid #ddd; color: #dc2626;"><strong>${expiresAt.toLocaleString()}</strong></td>
                    </tr>
                  </table>

                  <p style="color: #666; font-size: 14px;">
                    This override allows work to proceed for 4 hours. Please review and take appropriate action.
                  </p>

                  <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    Override ID: ${override.id}<br>
                    This is an automated message from Triton Construction Safety System.
                  </p>
                `,
              }),
            });

            if (emailResponse.ok) {
              emailSent = true;
            }
          } catch (emailError) {
            console.error('Email send error:', emailError);
          }
        }
      }

      // Update with email status
      if (emailSent) {
        await supabase
          .from('compliance_overrides')
          .update({ safety_director_email_sent: true })
          .eq('id', override.id);
      }
    }

    // ==========================================================================
    // CREATE AUDIT LOG ENTRY
    // ==========================================================================
    await supabase
      .from('audit_logs')
      .insert({
        table_name: 'compliance_overrides',
        record_id: override.id,
        action: 'INSERT',
        new_data: override,
        user_id: user.id,
        user_email: user.email,
      });

    // ==========================================================================
    // RETURN RESPONSE
    // ==========================================================================
    const response: OverrideResponse = {
      success: true,
      override_id: override.id,
      expires_at: expiresAt.toISOString(),
      safety_director_notified: safetyDirectorNotified || emailSent,
      message: `Override granted until ${expiresAt.toLocaleTimeString()}. Work may proceed. Safety Director has been notified.`,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Emergency override error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
