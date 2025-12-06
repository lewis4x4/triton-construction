// Supabase Edge Function: analyze-photos-batch
// Batch processes unanalyzed photos using Claude's vision API
// Can be triggered by cron job or manually for processing backlog

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchRequest {
  limit?: number;          // Max photos to process (default 10)
  organization_id?: string; // Optional: limit to specific org
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const { limit = 10, organization_id }: BatchRequest = await req.json().catch(() => ({}));

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get unanalyzed photos
    let query = supabase
      .from('wv811_ticket_attachments')
      .select(`
        id,
        storage_path,
        file_type,
        ticket_id,
        wv811_tickets!inner(organization_id)
      `)
      .is('ai_analyzed_at', null)
      .like('file_type', 'image/%')
      .order('created_at', { ascending: true })
      .limit(limit);

    if (organization_id) {
      query = query.eq('wv811_tickets.organization_id', organization_id);
    }

    const { data: attachments, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch attachments: ${fetchError.message}`);
    }

    if (!attachments || attachments.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No unanalyzed photos found',
          processed: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each photo by calling the analyze-photo function
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const attachment of attachments) {
      try {
        // Call the single photo analysis function
        const analyzeResponse = await fetch(
          `${supabaseUrl}/functions/v1/analyze-photo`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({ attachment_id: attachment.id }),
          }
        );

        const result = await analyzeResponse.json();

        if (analyzeResponse.ok) {
          successCount++;
          results.push({
            attachment_id: attachment.id,
            status: 'success',
            keywords: result.analysis?.keywords || [],
          });
        } else {
          errorCount++;
          results.push({
            attachment_id: attachment.id,
            status: 'error',
            error: result.error || result.message,
          });
        }

        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));

      } catch (err) {
        errorCount++;
        results.push({
          attachment_id: attachment.id,
          status: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        successful: successCount,
        failed: errorCount,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch analysis error:', error);

    return new Response(
      JSON.stringify({
        error: 'Batch analysis failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
