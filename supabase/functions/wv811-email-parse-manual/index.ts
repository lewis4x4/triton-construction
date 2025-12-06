import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * WV811 Email Parse Manual Edge Function
 *
 * Parses WV811 ticket email content using Claude AI
 * Returns structured ticket data for manual ticket creation
 */

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { emailContent } = await req.json();

    if (!emailContent || typeof emailContent !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const client = new Anthropic({ apiKey: anthropicApiKey });

    const systemPrompt = `You are a specialized parser for WV811 utility locate ticket emails. Extract all relevant information from the email and return it as a JSON object.

The JSON object should have this structure:
{
  "ticket_number": "string (required) - The WV811 ticket number",
  "ticket_type": "string - Type like Normal, Emergency, Remark, Update",
  "dig_site_address": "string (required) - Full street address of dig site",
  "dig_site_city": "string - City name",
  "dig_site_county": "string - County name",
  "dig_site_state": "string - State (usually WV)",
  "dig_site_zip": "string - ZIP code",
  "cross_street_1": "string - First cross street",
  "cross_street_2": "string - Second cross street",
  "location_description": "string - Additional location details",
  "excavator_company": "string - Excavator company name",
  "excavator_name": "string - Contact person name",
  "excavator_phone": "string - Phone number",
  "excavator_email": "string - Email address",
  "work_type": "string - One of: EXCAVATION, BORING, TRENCHING, DEMOLITION, GRADING, LANDSCAPING, UTILITY_INSTALL, UTILITY_REPAIR, ROAD_WORK, CONSTRUCTION, OTHER",
  "work_description": "string - Description of the work",
  "depth_in_inches": "number - Dig depth in inches",
  "ticket_created_at": "string - ISO datetime when ticket was created",
  "legal_dig_date": "string - ISO date format YYYY-MM-DD",
  "ticket_expires_at": "string - ISO date format YYYY-MM-DD",
  "utilities": [
    {
      "utility_code": "string - Utility member code",
      "utility_name": "string - Utility company name",
      "utility_type": "string - Type like Gas, Electric, Telecom, Water, Sewer",
      "response_type": "string - CLEAR, MARKED, CONFLICT, PENDING, NO_RESPONSE, NOT_APPLICABLE"
    }
  ]
}

Rules:
1. Extract as much information as possible from the email
2. If a field is not found, omit it or set to null
3. ticket_number and dig_site_address are required
4. Parse dates carefully - convert to ISO format
5. For work_type, match to the closest enum value
6. Extract all utilities mentioned and their response status
7. Return ONLY valid JSON, no markdown or explanation`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: `Parse this WV811 ticket email and extract all information as JSON:\n\n${emailContent}`,
        },
      ],
      system: systemPrompt,
    });

    // Extract text from response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse JSON from response
    let parsed;
    try {
      // Try to extract JSON from the response (in case there's any extra text)
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = JSON.parse(textContent.text);
      }
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Raw response:', textContent.text);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate required fields
    if (!parsed.ticket_number) {
      throw new Error('Could not extract ticket number from email');
    }
    if (!parsed.dig_site_address) {
      throw new Error('Could not extract dig site address from email');
    }

    return new Response(
      JSON.stringify({
        success: true,
        parsed,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Parse error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to parse email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
