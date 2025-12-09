// Supabase Edge Function: analyze-bid-document
// Analyzes bid package documents using Claude AI to extract structured data
// Supports: PDF proposals, environmental reports, hazmat surveys, plans

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  document_id: string;
  analysis_type?: 'FULL_EXTRACTION' | 'QUICK_SCAN' | 'TARGETED';
  target_fields?: string[]; // For TARGETED analysis
}

interface DocumentAnalysis {
  summary: string;
  document_category: string;
  key_findings: KeyFinding[];
  extracted_data: Record<string, unknown>;
  confidence_score: number;
}

interface KeyFinding {
  type: string;
  title: string;
  description: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  page_reference?: string;
  related_items?: string[];
}

// System prompts by document type
const SYSTEM_PROMPTS: Record<string, string> = {
  PROPOSAL: `You are an expert construction bid analyst specializing in WVDOH (West Virginia Department of Highways) bid proposals.

Analyze the provided bid proposal document and extract:
1. Project identification (state project number, federal aid number, county, route)
2. Key dates (letting date, pre-bid meeting, completion deadline)
3. Contract requirements (working days, liquidated damages, DBE goals)
4. Special provisions or unusual requirements
5. Potential risks or concerns for bidding
6. Any items requiring clarification (pre-bid questions)

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence executive summary of the project",
  "document_category": "BID_PROPOSAL",
  "key_findings": [
    {
      "type": "REQUIREMENT|RISK|OPPORTUNITY|DATE|FINANCIAL",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null,
      "related_items": ["item codes if applicable"]
    }
  ],
  "extracted_data": {
    "state_project_number": "string or null",
    "federal_aid_number": "string or null",
    "county": "string or null",
    "route": "string or null",
    "letting_date": "YYYY-MM-DD or null",
    "pre_bid_date": "YYYY-MM-DD or null",
    "completion_date": "YYYY-MM-DD or null",
    "working_days": number or null,
    "liquidated_damages_per_day": number or null,
    "dbe_goal_percentage": number or null,
    "engineers_estimate": number or null,
    "is_federal_aid": boolean,
    "special_provisions": ["array of notable provisions"],
    "required_certifications": ["array of required certs"],
    "bonding_requirements": "description or null"
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  ENVIRONMENTAL: `You are an expert environmental compliance analyst for construction projects.

Analyze the provided environmental document and extract:
1. Wetland boundaries and restrictions
2. Endangered species considerations
3. Stream/water body impacts and mitigation requirements
4. Seasonal timing restrictions (bird nesting, fish spawning, etc.)
5. Permit requirements and conditions
6. Mitigation commitments
7. Monitoring requirements

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of environmental constraints",
  "document_category": "ENVIRONMENTAL",
  "key_findings": [
    {
      "type": "WETLAND|SPECIES|TIMING|PERMIT|MITIGATION|MONITORING",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "wetland_acres": number or null,
    "stream_linear_feet": number or null,
    "endangered_species": ["array of species"],
    "timing_restrictions": [
      {
        "restriction": "description",
        "start_date": "MM-DD",
        "end_date": "MM-DD",
        "reason": "why"
      }
    ],
    "permits_required": ["array of permit types"],
    "mitigation_requirements": ["array of requirements"],
    "monitoring_requirements": ["array of monitoring items"],
    "environmental_commitments": ["numbered commitments from document"]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  HAZMAT: `You are an expert hazardous materials analyst for construction projects.

Analyze the provided hazmat/asbestos document and extract:
1. Asbestos-containing materials (ACM) locations and quantities
2. Lead-based paint locations
3. Other hazardous materials identified
4. Recommended abatement procedures
5. Disposal requirements
6. Worker protection requirements
7. Cost implications

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of hazmat findings",
  "document_category": "HAZMAT",
  "key_findings": [
    {
      "type": "ASBESTOS|LEAD|PCB|PETROLEUM|OTHER",
      "title": "Brief title",
      "description": "Detailed description including location and quantity",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "asbestos_present": boolean,
    "asbestos_locations": [
      {
        "location": "description",
        "material_type": "pipe insulation, floor tile, etc.",
        "quantity": "amount with units",
        "condition": "good, damaged, friable"
      }
    ],
    "lead_paint_present": boolean,
    "lead_paint_locations": ["array of locations"],
    "other_hazmat": [
      {
        "material": "name",
        "location": "where",
        "quantity": "amount"
      }
    ],
    "abatement_required": boolean,
    "estimated_abatement_cost": number or null,
    "special_disposal_required": boolean,
    "licensed_contractor_required": boolean
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  GEOTECHNICAL: `You are an expert geotechnical engineer analyzing soil and foundation reports.

Analyze the provided geotechnical document and extract:
1. Soil conditions and classifications
2. Groundwater levels and concerns
3. Rock presence and characteristics
4. Foundation recommendations
5. Earthwork considerations
6. Special construction requirements
7. Risk factors

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of geotechnical conditions",
  "document_category": "GEOTECHNICAL",
  "key_findings": [
    {
      "type": "SOIL|ROCK|GROUNDWATER|FOUNDATION|EARTHWORK|RISK",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    "predominant_soil_type": "description",
    "rock_encountered": boolean,
    "rock_depth_range": "X to Y feet or null",
    "groundwater_depth": number or null,
    "groundwater_concerns": ["array of concerns"],
    "bearing_capacity": "value with units or null",
    "foundation_recommendations": ["array of recommendations"],
    "earthwork_considerations": ["array of considerations"],
    "unsuitable_material_expected": boolean,
    "dewatering_required": boolean,
    "special_equipment_needed": ["array of equipment"]
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`,

  DEFAULT: `You are an expert construction document analyst for WVDOH bid packages.

Analyze the provided document and extract all relevant information for bid estimation and project planning. Identify:
1. Key requirements and specifications
2. Quantities and measurements
3. Special conditions or constraints
4. Potential risks or concerns
5. Items that may need clarification

Provide a JSON response with this structure:
{
  "summary": "2-3 sentence summary of document contents",
  "document_category": "inferred category",
  "key_findings": [
    {
      "type": "REQUIREMENT|SPECIFICATION|QUANTITY|RISK|CONSTRAINT|CLARIFICATION",
      "title": "Brief title",
      "description": "Detailed description",
      "severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "page_reference": "Page X" or null
    }
  ],
  "extracted_data": {
    // Relevant structured data based on document content
  },
  "confidence_score": 0-100
}

Always respond with valid JSON only.`
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { document_id, analysis_type = 'FULL_EXTRACTION' }: AnalysisRequest = await req.json();

    if (!document_id) {
      return new Response(
        JSON.stringify({ error: 'document_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get document details
    const { data: document, error: docError } = await supabase
      .from('bid_documents')
      .select('id, bid_project_id, file_name, file_path, mime_type, document_type, processing_status')
      .eq('id', document_id)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found', details: docError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update status to PROCESSING
    await supabase
      .from('bid_documents')
      .update({
        processing_status: 'PROCESSING',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', document_id);

    // Create analysis log entry
    const { data: logEntry } = await supabase
      .from('bid_document_analysis_log')
      .insert({
        document_id: document.id,
        bid_project_id: document.bid_project_id,
        analysis_type,
        status: 'PROCESSING',
        ai_provider: 'anthropic',
        ai_model: 'claude-sonnet-4-20250514',
      })
      .select()
      .single();

    // Download the document from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('bid-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download document: ${downloadError?.message}`);
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Content = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Determine the appropriate system prompt
    const docType = document.document_type as string;
    const systemPrompt = SYSTEM_PROMPTS[docType] || SYSTEM_PROMPTS.DEFAULT;

    // Prepare the message content based on file type
    let messageContent: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }>;
    const mimeType = document.mime_type || 'application/pdf';

    if (mimeType === 'application/pdf') {
      // Use Claude's native PDF support
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
          text: `Analyze this ${docType} document and extract all relevant information. Document filename: ${document.file_name}`,
        },
      ];
    } else if (mimeType.startsWith('image/')) {
      // Handle images directly
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mimeType,
            data: base64Content,
          },
        },
        {
          type: 'text',
          text: `Analyze this ${docType} document image and extract all relevant information. Document filename: ${document.file_name}`,
        },
      ];
    } else if (mimeType.includes('xml')) {
      // For XML (like Bidx), just send as text - this should be handled by parse-bidx instead
      const textContent = new TextDecoder().decode(new Uint8Array(arrayBuffer));
      messageContent = [
        {
          type: 'text',
          text: `Analyze this ${docType} XML document:\n\n${textContent.substring(0, 100000)}\n\nDocument filename: ${document.file_name}`,
        },
      ];
    } else {
      throw new Error(`Unsupported file type: ${mimeType}`);
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
        max_tokens: 8000,
        system: systemPrompt,
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
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeResult = await claudeResponse.json();
    const analysisText = claudeResult.content[0]?.text;

    if (!analysisText) {
      throw new Error('No analysis text in Claude response');
    }

    // Parse the JSON response
    let analysis: DocumentAnalysis;
    try {
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', analysisText);
      throw new Error(`Failed to parse analysis: ${parseError}`);
    }

    // Calculate duration
    const duration = Date.now() - startTime;

    // Update the document with analysis results
    const { error: updateError } = await supabase
      .from('bid_documents')
      .update({
        processing_status: 'COMPLETED',
        processing_completed_at: new Date().toISOString(),
        ai_summary: analysis.summary,
        ai_key_findings: analysis.key_findings,
        ai_document_category: analysis.document_category,
        ai_confidence_score: analysis.confidence_score,
        ai_model_version: 'claude-sonnet-4-20250514',
        ai_analysis_metadata: analysis.extracted_data,
        ai_tokens_used: (claudeResult.usage?.input_tokens || 0) + (claudeResult.usage?.output_tokens || 0),
      })
      .eq('id', document_id);

    if (updateError) {
      throw new Error(`Failed to update document: ${updateError.message}`);
    }

    // Update the log entry
    if (logEntry) {
      await supabase
        .from('bid_document_analysis_log')
        .update({
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          input_tokens: claudeResult.usage?.input_tokens,
          output_tokens: claudeResult.usage?.output_tokens,
          success: true,
          response_payload: { analysis },
        })
        .eq('id', logEntry.id);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        document_id,
        analysis,
        duration_ms: duration,
        usage: claudeResult.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Try to update document status to FAILED
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { document_id } = await req.json().catch(() => ({}));
      if (document_id) {
        await supabase
          .from('bid_documents')
          .update({
            processing_status: 'FAILED',
            processing_error: errorMessage,
            processing_completed_at: new Date().toISOString(),
          })
          .eq('id', document_id);
      }
    } catch {
      // Ignore update errors
    }

    return new Response(
      JSON.stringify({
        error: 'Analysis failed',
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
