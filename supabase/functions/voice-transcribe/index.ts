// =============================================================================
// Edge Function: voice-transcribe
// Purpose: Transcribe voice recordings using OpenAI Whisper API
// Per CLAUDE.md Roadmap: Voice-first daily field reporting
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TranscribeRequest {
  recording_id: string;
  audio_url?: string;
  language?: string; // Default: 'en'
  prompt?: string; // Context hint for better transcription
}

interface TranscriptionResult {
  text: string;
  duration: number;
  language: string;
  segments?: {
    start: number;
    end: number;
    text: string;
  }[];
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const { recording_id, audio_url, language = 'en', prompt } = await req.json() as TranscribeRequest;

    if (!recording_id && !audio_url) {
      throw new Error('Either recording_id or audio_url is required');
    }

    // Get audio file URL if recording_id provided
    let audioFileUrl = audio_url;
    let recordingRecord = null;

    if (recording_id) {
      const { data: recording, error: recordingError } = await supabaseClient
        .from('voice_recordings')
        .select('*')
        .eq('id', recording_id)
        .single();

      if (recordingError || !recording) {
        throw new Error(`Recording not found: ${recording_id}`);
      }

      recordingRecord = recording;

      // Get signed URL for the audio file
      const { data: signedUrlData, error: signedUrlError } = await supabaseClient
        .storage
        .from('voice-recordings')
        .createSignedUrl(recording.storage_path, 3600); // 1 hour expiry

      if (signedUrlError || !signedUrlData) {
        throw new Error(`Failed to get signed URL: ${signedUrlError?.message}`);
      }

      audioFileUrl = signedUrlData.signedUrl;

      // Update status to processing
      await supabaseClient
        .from('voice_recordings')
        .update({ status: 'processing' })
        .eq('id', recording_id);
    }

    if (!audioFileUrl) {
      throw new Error('No audio URL available');
    }

    console.log(`Transcribing audio from: ${audioFileUrl.substring(0, 100)}...`);

    // Download the audio file
    const audioResponse = await fetch(audioFileUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }

    const audioBlob = await audioResponse.blob();
    const audioArrayBuffer = await audioBlob.arrayBuffer();

    // Prepare form data for Whisper API
    const formData = new FormData();
    formData.append('file', new Blob([audioArrayBuffer], { type: 'audio/webm' }), 'recording.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', language);
    formData.append('response_format', 'verbose_json');

    // Add context prompt for construction terminology
    const constructionPrompt = prompt || `Construction daily report field recording.
Common terms: excavation, grading, paving, concrete pour, rebar, formwork,
compaction, backfill, asphalt, aggregate, subgrade, earthwork, drainage,
culvert, bridge deck, guardrail, shoulder, embankment, cut, fill, station,
offset, elevation, grade, slope, WVDOH, DOH inspector, working day.`;

    formData.append('prompt', constructionPrompt);

    // Call OpenAI Whisper API
    const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      throw new Error(`Whisper API error: ${whisperResponse.status} - ${errorText}`);
    }

    const transcription = await whisperResponse.json();

    console.log(`Transcription complete. Duration: ${transcription.duration}s`);

    // Format result
    const result: TranscriptionResult = {
      text: transcription.text,
      duration: transcription.duration,
      language: transcription.language,
      segments: transcription.segments?.map((seg: any) => ({
        start: seg.start,
        end: seg.end,
        text: seg.text,
      })),
    };

    // Update recording record if we have one
    if (recording_id && recordingRecord) {
      await supabaseClient
        .from('voice_recordings')
        .update({
          status: 'transcribed',
          transcription_text: result.text,
          duration_seconds: result.duration,
          transcribed_at: new Date().toISOString(),
          metadata: {
            ...recordingRecord.metadata,
            whisper_language: result.language,
            segment_count: result.segments?.length || 0,
          },
        })
        .eq('id', recording_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        recording_id,
        transcription: result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Transcription error:', error);

    // Update recording status to failed if we have an ID
    const body = await req.clone().json().catch(() => ({}));
    if (body.recording_id) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      await supabaseClient
        .from('voice_recordings')
        .update({
          status: 'failed',
          metadata: { error: error.message }
        })
        .eq('id', body.recording_id);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
