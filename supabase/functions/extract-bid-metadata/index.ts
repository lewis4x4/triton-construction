// Supabase Edge Function: extract-bid-metadata
// Extracts project metadata from bid documents for form pre-fill
// Used in "document-first" workflow before bid project creation

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractedMetadata {
  project_name: string | null;
  state_project_number: string | null;
  federal_project_number: string | null;
  county: string | null;
  route: string | null;
  location_description: string | null;
  letting_date: string | null;
  bid_due_date: string | null;
  contract_time_days: number | null;
  dbe_goal_percentage: number | null;
  is_federal_aid: boolean;
  liquidated_damages_per_day: number | null;
  engineers_estimate: number | null;
  owner: string | null;
  confidence_score: number;
  extraction_notes: string[];
}

const EXTRACTION_PROMPT = `You are an expert construction bid analyst specializing in WVDOH (West Virginia Department of Highways) bid proposals.

Analyze this bid document and extract project metadata for creating a new bid project. Focus on finding:

1. Project identification:
   - Project name or title
   - State project number (format like S310-48-0.00)
   - Federal project number (format like NHPP-0048(123)D)
   - County name
   - Route number (US-48, WV-2, I-79, etc.)
   - Location description

2. Key dates:
   - Letting date
   - Bid due date/time

3. Contract requirements:
   - Contract time (working days)
   - DBE goal percentage
   - Liquidated damages per day
   - Whether it's a federal aid project

4. Estimate:
   - Engineer's estimate if provided

Return ONLY a JSON response with this exact structure:
{
  "project_name": "Full project name or null",
  "state_project_number": "e.g., S310-48-0.00 or null",
  "federal_project_number": "e.g., NHPP-0048(123)D or null",
  "county": "County name or null",
  "route": "e.g., US-48 or null",
  "location_description": "Brief description or null",
  "letting_date": "YYYY-MM-DD format or null",
  "bid_due_date": "YYYY-MM-DD format or null",
  "contract_time_days": number or null,
  "dbe_goal_percentage": number (e.g., 8.5) or null,
  "is_federal_aid": true/false,
  "liquidated_damages_per_day": number or null,
  "engineers_estimate": number or null,
  "owner": "WVDOH, FHWA, County, Municipal, Private, or Other",
  "confidence_score": 0-100,
  "extraction_notes": ["array of notes about what was found or missing"]
}

Important:
- Use null for fields you cannot find in the document
- Dates must be in YYYY-MM-DD format
- Numbers should not include commas or dollar signs
- Be conservative with confidence score - high confidence only if clearly stated`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'File is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: 'File must be PDF or image (PNG, JPEG)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Prepare Claude message content
    let messageContent: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }>;

    if (file.type === 'application/pdf') {
      messageContent = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Content,
          },
        },
        {
          type: 'text',
          text: `Extract project metadata from this bid document. Filename: ${file.name}`,
        },
      ];
    } else {
      // Image file
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type,
            data: base64Content,
          },
        },
        {
          type: 'text',
          text: `Extract project metadata from this bid document image. Filename: ${file.name}`,
        },
      ];
    }

    // Call Claude API
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: EXTRACTION_PROMPT,
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      console.error('Claude API error:', errorText);
      throw new Error(`Claude API error: ${claudeResponse.status}`);
    }

    const claudeResult = await claudeResponse.json();
    const responseText = claudeResult.content[0]?.text;

    if (!responseText) {
      throw new Error('No response from Claude');
    }

    // Parse the JSON response
    let metadata: ExtractedMetadata;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      metadata = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      // Return a default response with low confidence
      metadata = {
        project_name: null,
        state_project_number: null,
        federal_project_number: null,
        county: null,
        route: null,
        location_description: null,
        letting_date: null,
        bid_due_date: null,
        contract_time_days: null,
        dbe_goal_percentage: null,
        is_federal_aid: false,
        liquidated_damages_per_day: null,
        engineers_estimate: null,
        owner: 'WVDOH',
        confidence_score: 0,
        extraction_notes: ['Failed to parse document - please enter details manually'],
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        metadata,
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Extraction error:', error);
    return new Response(
      JSON.stringify({
        error: 'Extraction failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
