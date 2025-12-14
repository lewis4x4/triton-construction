import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

/**
 * WV811 Email Parse Edge Function
 *
 * Parses WV811 ticket emails using Claude AI to extract structured data:
 * - Ticket number
 * - Dig site location
 * - Excavator information
 * - Work details
 * - Utility list
 * - Key dates
 */

interface ParseRequest {
  emailIngestId?: string;  // Specific email to parse
  batchSize?: number;      // Number of pending emails to process
}

interface ParsedTicketData {
  ticketNumber: string;
  ticketType?: string;
  digSite: {
    address: string;
    city?: string;
    county?: string;
    state?: string;
    zip?: string;
    crossStreet1?: string;
    crossStreet2?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
  };
  excavator: {
    company?: string;
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  work: {
    type?: string;
    description?: string;
    depthInches?: number;
    extent?: string;
    startDate?: string;
    endDate?: string;
  };
  dates: {
    ticketCreated: string;
    legalDigDate?: string;
    expiresAt?: string;
  };
  utilities: Array<{
    code: string;
    name: string;
    type?: string;
    status: string;
    contactName?: string;
    contactPhone?: string;
  }>;
  specialInstructions?: string;
  confidence: number;
}

const PARSING_PROMPT = `You are an expert at parsing WV811 (West Virginia 811) utility locate ticket emails.
Extract all relevant information from the email and return it as a structured JSON object.

The email will contain information about a utility locate request including:
- Ticket number (usually in format like "2024-123456" or similar)
- Dig site location (address, city, county, cross streets)
- Excavator/caller information (company, name, phone, email)
- Work type and description (excavation, boring, trenching, etc.)
- List of utilities that have been notified
- Important dates (ticket created, legal dig date, expiration)

Return ONLY a valid JSON object with this structure (no markdown, no explanation):
{
  "ticketNumber": "string - the WV811 ticket number",
  "ticketType": "string - Normal, Emergency, Remark, Update, etc.",
  "digSite": {
    "address": "string - street address",
    "city": "string",
    "county": "string",
    "state": "string - usually WV",
    "zip": "string",
    "crossStreet1": "string - first cross street if mentioned",
    "crossStreet2": "string - second cross street if mentioned",
    "description": "string - additional location details",
    "latitude": "number - if coordinates provided",
    "longitude": "number - if coordinates provided"
  },
  "excavator": {
    "company": "string - company name",
    "name": "string - contact name",
    "phone": "string - phone number",
    "email": "string - email address",
    "address": "string - company address"
  },
  "work": {
    "type": "string - EXCAVATION, BORING, TRENCHING, DEMOLITION, GRADING, LANDSCAPING, UTILITY_INSTALL, UTILITY_REPAIR, ROAD_WORK, CONSTRUCTION, OTHER",
    "description": "string - work description",
    "depthInches": "number - excavation depth in inches",
    "extent": "string - extent of work area",
    "startDate": "string - ISO date if mentioned",
    "endDate": "string - ISO date if mentioned"
  },
  "dates": {
    "ticketCreated": "string - ISO datetime when ticket was created",
    "legalDigDate": "string - ISO date for legal dig date",
    "expiresAt": "string - ISO date when ticket expires"
  },
  "utilities": [
    {
      "code": "string - utility's 811 code",
      "name": "string - utility company name",
      "type": "string - Gas, Electric, Telecom, Water, Sewer, Cable, etc.",
      "status": "string - CLEAR, MARKED, PENDING, CONFLICT, NO_RESPONSE, NOT_APPLICABLE",
      "contactName": "string - utility contact if provided",
      "contactPhone": "string - utility contact phone if provided"
    }
  ],
  "specialInstructions": "string - any special notes or instructions",
  "confidence": "number - 0.0 to 1.0 confidence score in the extraction"
}

If a field is not present in the email, use null.
For the confidence score, rate how confident you are in the overall extraction (1.0 = very confident, 0.5 = some uncertainty, 0.0 = mostly guessing).`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: 'Anthropic API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Parse request
    const { emailIngestId, batchSize = 10 }: ParseRequest = await req.json().catch(() => ({}));

    // Get emails to process
    let query = supabaseAdmin
      .from('wv811_email_ingests')
      .select('*')
      .eq('status', 'PENDING')
      .order('received_at', { ascending: true })
      .limit(batchSize);

    if (emailIngestId) {
      query = supabaseAdmin
        .from('wv811_email_ingests')
        .select('*')
        .eq('id', emailIngestId);
    }

    const { data: emails, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching emails:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch emails' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No pending emails to process', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Array<{ emailId: string; success: boolean; ticketId?: string; error?: string }> = [];

    for (const email of emails) {
      try {
        // Mark as processing
        await supabaseAdmin
          .from('wv811_email_ingests')
          .update({ status: 'PROCESSING' })
          .eq('id', email.id);

        // Prepare email content for parsing
        const emailContent = email.raw_body_text || email.raw_body_html || '';
        const emailSubject = email.subject || '';

        if (!emailContent) {
          throw new Error('No email content to parse');
        }

        // Call Claude to parse the email
        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 2048,
            system: PARSING_PROMPT,
            messages: [
              {
                role: 'user',
                content: `Parse this WV811 ticket email:\n\nSubject: ${emailSubject}\n\nBody:\n${emailContent}`,
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Claude API error:', response.status, errorText);
          throw new Error(`Claude API error: ${response.status}`);
        }

        const claudeResponse = await response.json();
        const parsedText = claudeResponse.content[0]?.text || '';

        // Parse the JSON response
        let parsedData: ParsedTicketData;
        try {
          parsedData = JSON.parse(parsedText);
        } catch (e) {
          console.error('Failed to parse Claude response as JSON:', parsedText);
          throw new Error('Invalid JSON response from Claude');
        }

        // Validate required fields
        if (!parsedData.ticketNumber) {
          throw new Error('Could not extract ticket number from email');
        }

        // Check for duplicate ticket
        const { data: existingTicket } = await supabaseAdmin
          .from('wv811_tickets')
          .select('id')
          .eq('organization_id', email.organization_id)
          .eq('ticket_number', parsedData.ticketNumber)
          .single();

        if (existingTicket) {
          // Mark as duplicate
          await supabaseAdmin
            .from('wv811_email_ingests')
            .update({
              status: 'DUPLICATE',
              ticket_id: existingTicket.id,
              processed_at: new Date().toISOString(),
            })
            .eq('id', email.id);

          results.push({ emailId: email.id, success: true, ticketId: existingTicket.id });
          continue;
        }

        // Calculate legal dig date and expiration
        const ticketCreatedAt = parsedData.dates.ticketCreated
          ? new Date(parsedData.dates.ticketCreated)
          : new Date(email.received_at);

        // Get legal dig date from database function
        const { data: legalDigData } = await supabaseAdmin.rpc('calculate_legal_dig_date', {
          ticket_created: ticketCreatedAt.toISOString(),
        });

        const legalDigDate = legalDigData || parsedData.dates.legalDigDate;

        // Get expiration from database function
        const { data: expirationData } = await supabaseAdmin.rpc('calculate_ticket_expiration', {
          legal_dig: legalDigDate,
        });

        const ticketExpiresAt = expirationData || parsedData.dates.expiresAt;

        // Map work type to enum
        const workTypeMap: Record<string, string> = {
          'excavation': 'EXCAVATION',
          'boring': 'BORING',
          'trenching': 'TRENCHING',
          'demolition': 'DEMOLITION',
          'grading': 'GRADING',
          'landscaping': 'LANDSCAPING',
          'utility install': 'UTILITY_INSTALL',
          'utility_install': 'UTILITY_INSTALL',
          'utility repair': 'UTILITY_REPAIR',
          'utility_repair': 'UTILITY_REPAIR',
          'road work': 'ROAD_WORK',
          'road_work': 'ROAD_WORK',
          'construction': 'CONSTRUCTION',
        };

        const workType = parsedData.work.type
          ? workTypeMap[parsedData.work.type.toLowerCase()] || 'OTHER'
          : null;

        // Insert the ticket
        const { data: ticketData, error: ticketError } = await supabaseAdmin
          .from('wv811_tickets')
          .insert({
            organization_id: email.organization_id,
            original_email_id: email.id,
            ticket_number: parsedData.ticketNumber,
            ticket_type: parsedData.ticketType,
            dig_site_address: parsedData.digSite.address,
            dig_site_city: parsedData.digSite.city,
            dig_site_county: parsedData.digSite.county,
            dig_site_state: parsedData.digSite.state || 'WV',
            dig_site_zip: parsedData.digSite.zip,
            cross_street_1: parsedData.digSite.crossStreet1,
            cross_street_2: parsedData.digSite.crossStreet2,
            location_description: parsedData.digSite.description,
            // PostGIS point if coordinates available
            dig_site_location: parsedData.digSite.latitude && parsedData.digSite.longitude
              ? `POINT(${parsedData.digSite.longitude} ${parsedData.digSite.latitude})`
              : null,
            excavator_company: parsedData.excavator.company,
            excavator_name: parsedData.excavator.name,
            excavator_phone: parsedData.excavator.phone,
            excavator_email: parsedData.excavator.email,
            excavator_address: parsedData.excavator.address,
            work_type: workType,
            work_description: parsedData.work.description,
            depth_in_inches: parsedData.work.depthInches,
            extent_description: parsedData.work.extent,
            ticket_created_at: ticketCreatedAt.toISOString(),
            legal_dig_date: legalDigDate,
            ticket_expires_at: ticketExpiresAt,
            work_start_date: parsedData.work.startDate,
            work_end_date: parsedData.work.endDate,
            status: 'PENDING',
            parsed_at: new Date().toISOString(),
            parsing_confidence: parsedData.confidence,
            parsing_model: 'claude-3-haiku-20240307',
            raw_parsed_data: parsedData,
            notes: parsedData.specialInstructions,
            total_utilities: parsedData.utilities?.length || 0,
            responded_utilities: 0,
          })
          .select('id')
          .single();

        if (ticketError) {
          throw new Error(`Failed to insert ticket: ${ticketError.message}`);
        }

        // Insert utility responses
        if (parsedData.utilities && parsedData.utilities.length > 0) {
          const utilityRecords = parsedData.utilities.map((utility) => {
            const statusMap: Record<string, string> = {
              'clear': 'CLEAR',
              'marked': 'MARKED',
              'pending': 'PENDING',
              'conflict': 'CONFLICT',
              'no response': 'NO_RESPONSE',
              'no_response': 'NO_RESPONSE',
              'not applicable': 'NOT_APPLICABLE',
              'not_applicable': 'NOT_APPLICABLE',
            };

            return {
              ticket_id: ticketData.id,
              utility_code: utility.code || utility.name.substring(0, 10).toUpperCase(),
              utility_name: utility.name,
              utility_type: utility.type,
              response_type: statusMap[utility.status?.toLowerCase()] || 'PENDING',
              contact_name: utility.contactName,
              contact_phone: utility.contactPhone,
            };
          });

          const { error: utilityError } = await supabaseAdmin
            .from('wv811_utility_responses')
            .insert(utilityRecords);

          if (utilityError) {
            console.error('Error inserting utilities:', utilityError);
            // Don't fail the whole parse for utility insert errors
          }
        }

        // Auto-geocode ticket if no coordinates were parsed from email
        if (!parsedData.digSite.latitude || !parsedData.digSite.longitude) {
          try {
            const geocodeResponse = await fetch(
              `${Deno.env.get('SUPABASE_URL')}/functions/v1/geocode-ticket`,
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ticketId: ticketData.id }),
              }
            );

            if (geocodeResponse.ok) {
              const geocodeResult = await geocodeResponse.json();
              console.log(`Auto-geocoded ticket ${parsedData.ticketNumber}:`, geocodeResult.status);
            } else {
              console.warn(`Geocoding failed for ticket ${parsedData.ticketNumber}:`, await geocodeResponse.text());
            }
          } catch (geocodeError) {
            // Don't fail the parse if geocoding fails
            console.warn(`Geocoding error for ticket ${parsedData.ticketNumber}:`, geocodeError);
          }
        }

        // Update email ingest status
        await supabaseAdmin
          .from('wv811_email_ingests')
          .update({
            status: 'COMPLETED',
            ticket_id: ticketData.id,
            processed_at: new Date().toISOString(),
          })
          .eq('id', email.id);

        results.push({ emailId: email.id, success: true, ticketId: ticketData.id });
        console.log(`Successfully parsed ticket ${parsedData.ticketNumber} from email ${email.id}`);

      } catch (error) {
        console.error(`Error parsing email ${email.id}:`, error);

        // Update retry count and potentially mark as failed
        const newRetryCount = (email.retry_count || 0) + 1;
        const newStatus = newRetryCount >= 3 ? 'FAILED' : 'PENDING';

        await supabaseAdmin
          .from('wv811_email_ingests')
          .update({
            status: newStatus,
            retry_count: newRetryCount,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('id', email.id);

        results.push({
          emailId: email.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${emails.length} emails: ${successCount} successful, ${failCount} failed`,
        processed: emails.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse function error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
