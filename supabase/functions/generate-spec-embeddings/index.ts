import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100; // OpenAI allows up to 2048 inputs, but we batch for better error handling

interface EmbeddingRequest {
  documentId?: string;  // Process specific document
  chunkIds?: string[];  // Process specific chunks
  forceRegenerate?: boolean;
}

interface EmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for OpenAI API key
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for processing
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Parse request
    const { documentId, chunkIds, forceRegenerate = false }: EmbeddingRequest = await req.json();

    // Build query for chunks that need embeddings
    let query = supabaseAdmin
      .from('spec_chunks')
      .select('id, content, section_context');

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    if (chunkIds && chunkIds.length > 0) {
      query = query.in('id', chunkIds);
    }

    if (!forceRegenerate) {
      query = query.is('embedding', null);
    }

    const { data: chunks, error: chunksError } = await query;

    if (chunksError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch chunks: ${chunksError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!chunks || chunks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No chunks need embedding generation',
          processed: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update document status if processing all chunks for a document
    if (documentId) {
      await supabaseAdmin
        .from('spec_documents')
        .update({ processing_status: 'EMBEDDING' })
        .eq('id', documentId);
    }

    // Process chunks in batches
    let processedCount = 0;
    let errorCount = 0;
    let totalTokens = 0;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);

      try {
        // Prepare texts for embedding (include context for better retrieval)
        const texts = batch.map(chunk =>
          `${chunk.section_context || ''}\n\n${chunk.content}`.trim()
        );

        // Call OpenAI embeddings API
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`,
          },
          body: JSON.stringify({
            input: texts,
            model: EMBEDDING_MODEL,
            dimensions: 1536, // text-embedding-3-small can be reduced, but we use full
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error(`OpenAI API error: ${response.status} - ${errorBody}`);
          errorCount += batch.length;
          continue;
        }

        const embeddingResponse: EmbeddingResponse = await response.json();
        totalTokens += embeddingResponse.usage.total_tokens;

        // Update chunks with embeddings
        for (const embeddingData of embeddingResponse.data) {
          const chunk = batch[embeddingData.index];
          if (!chunk) continue;

          // Format embedding as pgvector-compatible array string
          const embeddingVector = `[${embeddingData.embedding.join(',')}]`;

          const { error: updateError } = await supabaseAdmin
            .from('spec_chunks')
            .update({
              embedding: embeddingVector,
              content_tokens: Math.ceil(texts[embeddingData.index].length / 4),
            })
            .eq('id', chunk.id);

          if (updateError) {
            console.error(`Failed to update chunk ${chunk.id}:`, updateError);
            errorCount++;
          } else {
            processedCount++;
          }
        }

      } catch (batchError) {
        console.error('Batch processing error:', batchError);
        errorCount += batch.length;
      }

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Update document status if processing complete
    if (documentId) {
      const newStatus = errorCount === 0 ? 'COMPLETED' : 'COMPLETED';
      await supabaseAdmin
        .from('spec_documents')
        .update({
          processing_status: newStatus,
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      // Update statistics
      await supabaseAdmin.rpc('update_document_statistics', { p_document_id: documentId });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} chunks`,
        stats: {
          totalChunks: chunks.length,
          processed: processedCount,
          errors: errorCount,
          totalTokens,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Embedding generation error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred during embedding generation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
