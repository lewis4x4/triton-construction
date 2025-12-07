// =============================================================================
// Edge Function: ai-query
// Purpose: Natural language querying of project data
// Per CLAUDE.md Roadmap: AI Query Interface
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QueryRequest {
  query: string;
  conversation_id?: string;
  project_id?: string;
  context?: Record<string, any>;
}

const SYSTEM_PROMPT = `You are an AI assistant for Triton Construction, a highway construction company in West Virginia.
You have access to project data including daily reports, cost tracking, schedules, RFIs, submittals, change orders, and safety records.

When answering questions:
1. Be concise and direct
2. Reference specific data when available
3. Provide actionable insights
4. Flag any concerns or risks
5. Use construction terminology appropriately

Available data sources:
- projects: Project details, status, contract values
- daily_reports: Daily field reports with weather, manpower, equipment
- change_orders: Contract changes and CORs
- rfis: Requests for Information
- submittals: Shop drawings and product data
- inspections: QC inspections and test results
- time_entries: Labor hours and payroll
- equipment: Fleet status and utilization
- subcontractors: Subcontract agreements and payments

If you need to query the database, generate a SQL query and I'll execute it for you.
Format SQL queries in code blocks with "sql" language tag.`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const { query, conversation_id, project_id, context } = await req.json() as QueryRequest;

    if (!query) {
      throw new Error('query is required');
    }

    // Get or create conversation
    let convId = conversation_id;
    if (!convId) {
      const { data: conv, error: convError } = await supabaseClient
        .from('ai_conversations')
        .insert({
          organization_id: context?.organization_id,
          user_id: context?.user_id,
          project_id,
          context_type: project_id ? 'PROJECT' : 'ORGANIZATION',
          title: query.substring(0, 100),
        })
        .select('id')
        .single();

      if (convError) {
        console.error('Failed to create conversation:', convError);
      } else {
        convId = conv?.id;
      }
    }

    // Build context with relevant project data
    let projectContext = '';
    if (project_id) {
      const { data: project } = await supabaseClient
        .from('projects')
        .select(`
          name, project_number, status,
          original_contract_value, current_contract_value,
          notice_to_proceed_date, current_completion_date,
          original_working_days, working_days_used
        `)
        .eq('id', project_id)
        .single();

      if (project) {
        projectContext = `\nCurrent Project Context:
- Name: ${project.name} (${project.project_number})
- Status: ${project.status}
- Contract Value: $${project.current_contract_value?.toLocaleString()}
- Completion Date: ${project.current_completion_date}
- Working Days: ${project.working_days_used} of ${project.original_working_days} used`;
      }
    }

    // Store user message
    if (convId) {
      await supabaseClient.from('ai_messages').insert({
        conversation_id: convId,
        role: 'user',
        content: query,
      });
    }

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: SYSTEM_PROMPT + projectContext,
        messages: [{ role: 'user', content: query }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const result = await response.json();
    const assistantMessage = result.content[0]?.text || '';

    // Check if the response contains SQL to execute
    let queryResults = null;
    const sqlMatch = assistantMessage.match(/```sql\n([\s\S]*?)```/);

    if (sqlMatch) {
      const sqlQuery = sqlMatch[1].trim();
      console.log('Executing SQL:', sqlQuery);

      // Basic safety check - only allow SELECT queries
      if (sqlQuery.toLowerCase().trim().startsWith('select')) {
        const { data: sqlData, error: sqlError } = await supabaseClient.rpc('exec_sql', {
          sql_query: sqlQuery,
        });

        if (!sqlError && sqlData) {
          queryResults = sqlData;
        }
      }
    }

    // Store assistant message
    if (convId) {
      await supabaseClient.from('ai_messages').insert({
        conversation_id: convId,
        role: 'assistant',
        content: assistantMessage,
        sql_executed: !!queryResults,
        sql_result: queryResults,
        prompt_tokens: result.usage?.input_tokens,
        completion_tokens: result.usage?.output_tokens,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        conversation_id: convId,
        response: assistantMessage,
        query_results: queryResults,
        usage: result.usage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('AI query error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
