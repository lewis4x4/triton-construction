import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketForRenewal {
  id: string;
  ticket_number: string;
  dig_site_address: string;
  dig_site_city: string | null;
  dig_site_county: string | null;
  work_type: string | null;
  work_description: string | null;
  excavator_company: string | null;
  excavator_name: string | null;
  ticket_expires_at: string;
  legal_dig_date: string;
  done_for: string | null;
}

/**
 * WV811 Draft Renewal Generator
 *
 * Generates draft renewal request emails for expiring tickets
 * Uses Claude AI to create professional, context-aware messages
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ticketId, action } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'generate_all') {
      // Find all tickets expiring in the next 5 days
      const fiveDaysFromNow = new Date();
      fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

      const { data: expiringTickets, error: fetchError } = await supabase
        .from('wv811_tickets')
        .select('*')
        .lte('ticket_expires_at', fiveDaysFromNow.toISOString().split('T')[0])
        .not('status', 'in', '("EXPIRED","CANCELLED","CLEAR")')
        .is('renewal_draft_id', null);

      if (fetchError) throw fetchError;

      const drafts = [];
      for (const ticket of (expiringTickets || []) as TicketForRenewal[]) {
        const draft = await generateRenewalDraft(ticket);

        // Save draft to database
        const { data: savedDraft, error: saveError } = await supabase
          .from('wv811_draft_communications')
          .insert({
            ticket_id: ticket.id,
            draft_type: 'RENEWAL',
            subject: draft.subject,
            body: draft.body,
            recipient_email: 'wv811@wv811.com',
            status: 'DRAFT',
          })
          .select()
          .single();

        if (!saveError && savedDraft) {
          drafts.push(savedDraft);

          // Link draft to ticket
          await supabase
            .from('wv811_tickets')
            .update({ renewal_draft_id: savedDraft.id })
            .eq('id', ticket.id);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Generated ${drafts.length} renewal drafts`,
          drafts,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate_single' && ticketId) {
      // Generate draft for a specific ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('wv811_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (ticketError || !ticket) {
        throw new Error('Ticket not found');
      }

      const draft = await generateRenewalDraft(ticket as TicketForRenewal);

      // Save draft
      const { data: savedDraft, error: saveError } = await supabase
        .from('wv811_draft_communications')
        .insert({
          ticket_id: ticketId,
          draft_type: 'RENEWAL',
          subject: draft.subject,
          body: draft.body,
          recipient_email: 'wv811@wv811.com',
          status: 'DRAFT',
        })
        .select()
        .single();

      if (saveError) throw saveError;

      return new Response(
        JSON.stringify({
          success: true,
          draft: savedDraft,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Draft renewal error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate draft' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateRenewalDraft(ticket: TicketForRenewal): Promise<{ subject: string; body: string }> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicApiKey) {
    // Fallback to template if no API key
    return generateTemplateDraft(ticket);
  }

  try {
    const client = new Anthropic({ apiKey: anthropicApiKey });

    const expirationDate = new Date(ticket.ticket_expires_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const prompt = `Generate a professional renewal request email for a WV811 utility locate ticket. Keep it concise and professional.

Ticket Details:
- Ticket Number: ${ticket.ticket_number}
- Location: ${ticket.dig_site_address}, ${ticket.dig_site_city || ''}, ${ticket.dig_site_county || ''} County
- Work Type: ${ticket.work_type || 'Excavation'}
- Work Description: ${ticket.work_description || 'Continued excavation work'}
- Original Legal Dig Date: ${new Date(ticket.legal_dig_date).toLocaleDateString()}
- Expiration Date: ${expirationDate}
- Excavator: ${ticket.excavator_company || 'N/A'}
- Contact: ${ticket.excavator_name || 'N/A'}
${ticket.done_for ? `- Done For: ${ticket.done_for}` : ''}

Generate:
1. A brief subject line
2. A professional email body requesting renewal of this locate ticket

Return as JSON: { "subject": "...", "body": "..." }`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (textContent && textContent.type === 'text') {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (err) {
    console.error('AI generation failed, using template:', err);
  }

  return generateTemplateDraft(ticket);
}

function generateTemplateDraft(ticket: TicketForRenewal): { subject: string; body: string } {
  const expirationDate = new Date(ticket.ticket_expires_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const subject = `Renewal Request - Ticket #${ticket.ticket_number}`;

  const body = `Dear WV811,

I am requesting a renewal of locate ticket #${ticket.ticket_number}.

ORIGINAL TICKET INFORMATION:
- Ticket Number: ${ticket.ticket_number}
- Location: ${ticket.dig_site_address}${ticket.dig_site_city ? `, ${ticket.dig_site_city}` : ''}
- Work Type: ${ticket.work_type || 'Excavation'}
- Current Expiration: ${expirationDate}
${ticket.excavator_company ? `- Excavator: ${ticket.excavator_company}` : ''}
${ticket.done_for ? `- Project: ${ticket.done_for}` : ''}

REASON FOR RENEWAL:
Work at this location is ongoing and requires continued utility locate coverage. We request a renewal of this ticket to ensure all underground utilities remain properly marked.

Please process this renewal at your earliest convenience.

Thank you,
${ticket.excavator_name || '[Your Name]'}
${ticket.excavator_company || '[Company Name]'}`;

  return { subject, body };
}
