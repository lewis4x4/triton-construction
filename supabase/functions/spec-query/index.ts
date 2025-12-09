import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const EMBEDDING_MODEL = 'text-embedding-3-small';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface QueryRequest {
  query: string;
  payItemCode?: string;           // Optional: focus on specific pay item
  sectionNumbers?: string[];      // Optional: limit to specific sections
  bidProjectId?: string;          // Optional: for logging context
  lineItemId?: string;            // Optional: for logging context
  maxResults?: number;            // Default: 5
  includeAISynthesis?: boolean;   // Default: true
  conversationHistory?: ConversationMessage[]; // Optional: previous messages for context
}

interface ChunkResult {
  chunkId: string;
  sectionId: string;
  sectionNumber: string;
  sectionTitle: string;
  chunkType: string;
  content: string;
  sectionContext: string;
  similarity: number;
  pageNumber: number | null;
}

interface QueryResponse {
  success: boolean;
  query: string;
  answer?: string;                // AI-synthesized answer
  chunks: ChunkResult[];          // Retrieved specification chunks
  relatedSections?: string[];     // Related sections for further reading
  payItemInfo?: {
    itemNumber: string;
    measurementSummary?: string;
    paymentSummary?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check for required API keys
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

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

    // Create Supabase clients
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get current user for logging
    const { data: { user } } = await supabaseClient.auth.getUser();

    // Parse request
    const {
      query,
      payItemCode,
      sectionNumbers,
      bidProjectId,
      lineItemId,
      maxResults = 5,
      includeAISynthesis = true,
      conversationHistory = [],
    }: QueryRequest = await req.json();

    if (!query || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    // Generate embedding for the query
    const embeddingResponse = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        input: query,
        model: EMBEDDING_MODEL,
        dimensions: 1536,
      }),
    });

    if (!embeddingResponse.ok) {
      const errorBody = await embeddingResponse.text();
      console.error(`OpenAI embedding error: ${embeddingResponse.status} - ${errorBody}`);
      return new Response(
        JSON.stringify({ error: 'Failed to generate query embedding' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;
    const queryEmbeddingVector = `[${queryEmbedding.join(',')}]`;

    // Search for similar chunks using pgvector
    const { data: chunks, error: searchError } = await supabaseAdmin.rpc('search_specs', {
      query_embedding: queryEmbeddingVector,
      match_threshold: 0.4,
      match_count: maxResults,
      filter_section_ids: sectionNumbers ? await getSectionIds(supabaseAdmin, sectionNumbers) : null,
      filter_pay_items: payItemCode ? [payItemCode] : null,
    });

    if (searchError) {
      console.error('Search error:', searchError);
      return new Response(
        JSON.stringify({ error: 'Search failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const chunkResults: ChunkResult[] = (chunks || []).map((chunk: Record<string, unknown>) => ({
      chunkId: chunk.chunk_id as string,
      sectionId: chunk.section_id as string,
      sectionNumber: chunk.section_number as string,
      sectionTitle: chunk.section_title as string,
      chunkType: chunk.chunk_type as string,
      content: chunk.content as string,
      sectionContext: chunk.section_context as string,
      similarity: chunk.similarity as number,
      pageNumber: chunk.page_number as number | null,
    }));

    // Get pay item specific information if requested
    let payItemInfo = undefined;
    if (payItemCode) {
      const { data: itemData } = await supabaseAdmin
        .from('spec_item_links')
        .select('item_number, measurement_summary, payment_summary')
        .eq('item_number', payItemCode)
        .single();

      if (itemData) {
        payItemInfo = {
          itemNumber: itemData.item_number,
          measurementSummary: itemData.measurement_summary,
          paymentSummary: itemData.payment_summary,
        };
      }
    }

    // Generate AI synthesis if requested and Anthropic key is available
    let answer: string | undefined = undefined;
    if (includeAISynthesis && anthropicApiKey && chunkResults.length > 0) {
      answer = await generateAISynthesis(
        anthropicApiKey,
        query,
        chunkResults,
        payItemInfo,
        conversationHistory
      );
    }

    // Get related sections
    const relatedSections = [...new Set(chunkResults.map(c => c.sectionNumber))];

    // Log the query for analytics
    const queryTime = Date.now() - startTime;
    await supabaseAdmin.from('spec_query_log').insert({
      organization_id: user ? await getOrganizationId(supabaseAdmin, user.id) : null,
      user_id: user?.id,
      query_text: query,
      query_embedding: queryEmbeddingVector,
      bid_project_id: bidProjectId,
      line_item_id: lineItemId,
      result_count: chunkResults.length,
      top_chunk_ids: chunkResults.slice(0, 5).map(c => c.chunkId),
      response_text: answer,
      query_time_ms: queryTime,
    });

    const response: QueryResponse = {
      success: true,
      query,
      answer,
      chunks: chunkResults,
      relatedSections,
      payItemInfo,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Query error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Get section IDs from section numbers
async function getSectionIds(supabase: ReturnType<typeof createClient>, sectionNumbers: string[]): Promise<string[]> {
  const { data } = await supabase
    .from('spec_sections')
    .select('id')
    .in('section_number', sectionNumbers);

  return (data || []).map(s => s.id);
}

// Helper: Get user's organization ID
async function getOrganizationId(supabase: ReturnType<typeof createClient>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', userId)
    .single();

  return data?.organization_id || null;
}

// Generate AI synthesis using Claude
async function generateAISynthesis(
  apiKey: string,
  query: string,
  chunks: ChunkResult[],
  payItemInfo?: { itemNumber: string; measurementSummary?: string; paymentSummary?: string },
  conversationHistory: ConversationMessage[] = []
): Promise<string> {
  try {
    // Prepare context from chunks
    const contextParts = chunks.map((chunk, i) =>
      `[Source ${i + 1}: ${chunk.sectionContext}]\n${chunk.content}`
    );

    // Add pay item info if available
    let payItemContext = '';
    if (payItemInfo) {
      payItemContext = `\n\nPay Item ${payItemInfo.itemNumber} Information:\n`;
      if (payItemInfo.measurementSummary) {
        payItemContext += `- Measurement: ${payItemInfo.measurementSummary}\n`;
      }
      if (payItemInfo.paymentSummary) {
        payItemContext += `- Payment: ${payItemInfo.paymentSummary}\n`;
      }
    }

    const systemPrompt = `You are an expert assistant for WVDOH (West Virginia Division of Highways) construction specifications.
Your role is to help construction estimators and engineers understand specification requirements.

When answering questions:
1. Be precise and cite the relevant section numbers
2. Use technical construction terminology appropriately
3. If measurement or payment methods are mentioned, highlight them
4. If there are specific requirements or thresholds, state them clearly
5. If the information to answer the question is not in the provided context, say so clearly
6. If this is a follow-up question, consider the conversation history for context

Keep answers concise but complete. Focus on actionable information for bid estimating.`;

    const userPrompt = `Based on the following WVDOH specification excerpts, answer this question:

Question: ${query}

${payItemContext}

Specification Context:
${contextParts.join('\n\n---\n\n')}

Provide a clear, concise answer citing the relevant sections.`;

    // Build messages array with conversation history
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add conversation history (limit to last 6 messages to stay within token limits)
    const recentHistory = conversationHistory.slice(-6);
    for (const msg of recentHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }

    // Add current question with context
    messages.push({ role: 'user', content: userPrompt });

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Use Haiku for fast, cost-effective responses
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      console.error(`Anthropic API error: ${response.status}`);
      return '';
    }

    const data = await response.json();
    return data.content[0]?.text || '';

  } catch (error) {
    console.error('AI synthesis error:', error);
    return '';
  }
}
