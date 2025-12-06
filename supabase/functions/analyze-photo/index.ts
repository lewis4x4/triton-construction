// Supabase Edge Function: analyze-photo
// Analyzes photos using Claude's vision API and extracts AI-ready metadata
// for the WV811 locate ticket system

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisRequest {
  attachment_id: string;
}

interface AnalysisResult {
  description: string;
  keywords: string[];
  objects_detected: Record<string, number>;
  scene_type: string;
  safety_concerns: string[];
  utility_types_visible: string[];
  mark_colors_detected: string[];
  weather_conditions: string | null;
  time_of_day: string | null;
  quality_score: number;
}

// Utility mark color standards
const UTILITY_MARK_COLORS = {
  red: 'electric',
  yellow: 'gas/oil/petroleum',
  orange: 'telecom/signal',
  blue: 'water',
  green: 'sewer/drain',
  purple: 'reclaimed_water',
  pink: 'survey/temporary',
  white: 'proposed_excavation',
};

// System prompt for Claude vision analysis
const ANALYSIS_SYSTEM_PROMPT = `You are an AI assistant specialized in analyzing construction site photos, particularly for utility locating and excavation work (WV811 locate tickets).

Your job is to analyze each photo and extract structured metadata for a searchable database.

For each photo, provide a JSON response with the following structure:
{
  "description": "A detailed 2-3 sentence description of what's shown in the photo",
  "keywords": ["array", "of", "relevant", "search", "keywords"],
  "objects_detected": {"object_name": confidence_score_0_to_1},
  "scene_type": "one of: construction_site, road_work, utility_marking, equipment, dig_site, excavation, trench, backfill, safety_hazard, documentation, before_photo, after_photo, general",
  "safety_concerns": ["array of any safety issues visible, or empty array"],
  "utility_types_visible": ["array of utility types visible: gas, electric, water, sewer, telecom, fiber, cable_tv, steam, unknown"],
  "mark_colors_detected": ["array of paint mark colors: red, orange, yellow, green, blue, purple, pink, white"],
  "weather_conditions": "sunny/cloudy/overcast/rainy/snowy or null if indoors/unclear",
  "time_of_day": "morning/midday/afternoon/evening/night or null if unclear",
  "quality_score": number from 1-100 rating photo clarity and usefulness
}

Important considerations:
- Red marks = Electric utilities
- Yellow marks = Gas, Oil, Petroleum
- Orange marks = Telecom, Cable, Signal lines
- Blue marks = Water
- Green marks = Sewer, Drain
- Purple marks = Reclaimed water
- Pink marks = Survey, Temporary markings
- White marks = Proposed excavation outline

Be thorough with keywords - include equipment types, work activities, materials, conditions, and any text visible in the image.
Always respond with valid JSON only, no additional text.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { attachment_id }: AnalysisRequest = await req.json();

    if (!attachment_id) {
      return new Response(
        JSON.stringify({ error: 'attachment_id is required' }),
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

    // Get attachment details
    const { data: attachment, error: attachmentError } = await supabase
      .from('wv811_ticket_attachments')
      .select('id, storage_path, file_type, file_name, ticket_id')
      .eq('id', attachment_id)
      .single();

    if (attachmentError || !attachment) {
      return new Response(
        JSON.stringify({ error: 'Attachment not found', details: attachmentError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create analysis log entry
    const { data: logEntry, error: logError } = await supabase
      .from('wv811_photo_analysis_log')
      .insert({
        attachment_id: attachment.id,
        status: 'PROCESSING',
        ai_provider: 'anthropic',
        ai_model: 'claude-3-5-sonnet-20241022',
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create log entry:', logError);
    }

    // Download the image from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('wv811-attachments')
      .download(attachment.storage_path);

    if (downloadError || !fileData) {
      throw new Error(`Failed to download image: ${downloadError?.message}`);
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const base64Image = btoa(
      new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    // Determine media type
    const mediaType = attachment.file_type || 'image/jpeg';

    // Call Claude API with vision
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: ANALYSIS_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64Image,
                },
              },
              {
                type: 'text',
                text: 'Analyze this construction/utility photo and provide the structured JSON metadata.',
              },
            ],
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
    let analysis: AnalysisResult;
    try {
      // Extract JSON from response (in case there's extra text)
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

    // Update the attachment with analysis results
    // Status is set to 'SUGGESTED' - human must confirm before it's considered verified
    // This implements "AI Assistant, Human Judge" pattern for legal liability protection
    const { error: updateError } = await supabase
      .from('wv811_ticket_attachments')
      .update({
        ai_analyzed_at: new Date().toISOString(),
        ai_analysis_version: 'claude-3-5-sonnet-20241022',
        ai_analysis_status: 'SUGGESTED', // Requires human confirmation
        ai_description: analysis.description,
        ai_keywords: analysis.keywords,
        ai_objects_detected: analysis.objects_detected,
        ai_scene_type: analysis.scene_type,
        ai_safety_concerns: analysis.safety_concerns,
        ai_utility_types_visible: analysis.utility_types_visible,
        ai_mark_colors_detected: analysis.mark_colors_detected,
        ai_weather_conditions: analysis.weather_conditions,
        ai_time_of_day: analysis.time_of_day,
        ai_quality_score: analysis.quality_score,
        ai_raw_response: claudeResult,
      })
      .eq('id', attachment_id);

    if (updateError) {
      throw new Error(`Failed to update attachment: ${updateError.message}`);
    }

    // Update the log entry
    if (logEntry) {
      await supabase
        .from('wv811_photo_analysis_log')
        .update({
          status: 'COMPLETED',
          analysis_completed_at: new Date().toISOString(),
          analysis_duration_ms: duration,
          input_tokens: claudeResult.usage?.input_tokens,
          output_tokens: claudeResult.usage?.output_tokens,
          response_payload: { analysis },
        })
        .eq('id', logEntry.id);
    }

    // Return success response
    // Note: requires_confirmation indicates the analysis needs human approval
    return new Response(
      JSON.stringify({
        success: true,
        attachment_id,
        analysis,
        status: 'SUGGESTED',
        requires_confirmation: true,
        confirmation_message: 'AI detected these items. Please confirm or modify before saving.',
        duration_ms: duration,
        usage: claudeResult.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analysis error:', error);

    // Try to update log entry with error
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Note: We'd need the log entry ID here, which we don't have if it failed early
    } catch {
      // Ignore log update errors
    }

    return new Response(
      JSON.stringify({
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
