import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketWithPendingUtilities {
  id: string;
  ticket_number: string;
  dig_site_address: string;
  dig_site_city: string | null;
  legal_dig_date: string;
  excavator_company: string | null;
  excavator_name: string | null;
  pending_utilities: Array<{
    utility_code: string;
    utility_name: string;
    utility_type: string;
  }>;
}

/**
 * WV811 Draft Follow-up Generator
 *
 * Generates draft follow-up emails for pending utility responses
 * Uses Claude AI to create professional, context-aware messages
 */

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { ticketId, utilityCode, action } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'generate_all_pending') {
      // Find all tickets with pending utility responses
      const { data: pendingResponses, error: fetchError } = await supabase
        .from('wv811_utility_responses')
        .select(`
          ticket_id,
          utility_code,
          utility_name,
          utility_type,
          wv811_tickets!inner(
            id,
            ticket_number,
            dig_site_address,
            dig_site_city,
            legal_dig_date,
            excavator_company,
            excavator_name
          )
        `)
        .eq('response_type', 'PENDING')
        .not('wv811_tickets.status', 'in', '("EXPIRED","CANCELLED","CLEAR")');

      if (fetchError) throw fetchError;

      // Group by ticket
      const ticketMap = new Map<string, TicketWithPendingUtilities>();
      for (const response of (pendingResponses || [])) {
        const ticket = response.wv811_tickets as {
          id: string;
          ticket_number: string;
          dig_site_address: string;
          dig_site_city: string | null;
          legal_dig_date: string;
          excavator_company: string | null;
          excavator_name: string | null;
        };
        if (!ticketMap.has(ticket.id)) {
          ticketMap.set(ticket.id, {
            ...ticket,
            pending_utilities: [],
          });
        }
        ticketMap.get(ticket.id)!.pending_utilities.push({
          utility_code: response.utility_code,
          utility_name: response.utility_name,
          utility_type: response.utility_type,
        });
      }

      const drafts = [];
      for (const ticket of ticketMap.values()) {
        const draft = await generateFollowUpDraft(ticket);

        // Save draft
        const { data: savedDraft, error: saveError } = await supabase
          .from('wv811_draft_communications')
          .insert({
            ticket_id: ticket.id,
            draft_type: 'UTILITY_FOLLOWUP',
            subject: draft.subject,
            body: draft.body,
            recipient_email: 'utilities@wv811.com',
            status: 'DRAFT',
            metadata: { pending_utilities: ticket.pending_utilities },
          })
          .select()
          .single();

        if (!saveError && savedDraft) {
          drafts.push(savedDraft);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Generated ${drafts.length} follow-up drafts`,
          drafts,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'generate_single' && ticketId) {
      // Get ticket with pending utilities
      const { data: ticket, error: ticketError } = await supabase
        .from('wv811_tickets')
        .select('id, ticket_number, dig_site_address, dig_site_city, legal_dig_date, excavator_company, excavator_name')
        .eq('id', ticketId)
        .single();

      if (ticketError || !ticket) {
        throw new Error('Ticket not found');
      }

      const { data: pendingUtilities } = await supabase
        .from('wv811_utility_responses')
        .select('utility_code, utility_name, utility_type')
        .eq('ticket_id', ticketId)
        .eq('response_type', 'PENDING');

      const ticketWithUtilities: TicketWithPendingUtilities = {
        ...ticket,
        pending_utilities: pendingUtilities || [],
      };

      const draft = await generateFollowUpDraft(ticketWithUtilities);

      // Save draft
      const { data: savedDraft, error: saveError } = await supabase
        .from('wv811_draft_communications')
        .insert({
          ticket_id: ticketId,
          draft_type: 'UTILITY_FOLLOWUP',
          subject: draft.subject,
          body: draft.body,
          recipient_email: 'utilities@wv811.com',
          status: 'DRAFT',
          metadata: { pending_utilities: ticketWithUtilities.pending_utilities },
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
    console.error('Draft follow-up error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate draft' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateFollowUpDraft(ticket: TicketWithPendingUtilities): Promise<{ subject: string; body: string }> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicApiKey) {
    return generateTemplateDraft(ticket);
  }

  try {
    const client = new Anthropic({ apiKey: anthropicApiKey });

    const digDate = new Date(ticket.legal_dig_date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    const utilitiesList = ticket.pending_utilities
      .map((u) => `- ${u.utility_name} (${u.utility_type})`)
      .join('\n');

    const prompt = `Generate a professional follow-up email requesting utility locate responses. Keep it concise and professional.

Ticket Details:
- Ticket Number: ${ticket.ticket_number}
- Location: ${ticket.dig_site_address}, ${ticket.dig_site_city || ''}
- Legal Dig Date: ${digDate}
- Excavator: ${ticket.excavator_company || 'N/A'}

Pending Utility Responses:
${utilitiesList}

Generate:
1. A brief subject line
2. A professional email requesting status on these pending utility responses

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

function generateTemplateDraft(ticket: TicketWithPendingUtilities): { subject: string; body: string } {
  const digDate = new Date(ticket.legal_dig_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const utilitiesList = ticket.pending_utilities
    .map((u) => `  - ${u.utility_name} (${u.utility_type})`)
    .join('\n');

  const subject = `Follow-up: Pending Responses for Ticket #${ticket.ticket_number}`;

  const body = `Dear WV811 / Utility Representatives,

I am following up on locate ticket #${ticket.ticket_number} regarding outstanding utility responses.

TICKET INFORMATION:
- Ticket Number: ${ticket.ticket_number}
- Location: ${ticket.dig_site_address}${ticket.dig_site_city ? `, ${ticket.dig_site_city}` : ''}
- Legal Dig Date: ${digDate}
${ticket.excavator_company ? `- Excavator: ${ticket.excavator_company}` : ''}

PENDING RESPONSES FROM:
${utilitiesList}

We are approaching our scheduled dig date and need confirmation of utility locations. Please provide your response at your earliest convenience.

If you have already responded or this location has no conflict with your facilities, please update the ticket status.

Thank you for your prompt attention to this matter.

Best regards,
${ticket.excavator_name || '[Your Name]'}
${ticket.excavator_company || '[Company Name]'}`;

  return { subject, body };
}
