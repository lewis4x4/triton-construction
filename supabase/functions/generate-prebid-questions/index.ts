// Supabase Edge Function: generate-prebid-questions
// Analyzes bid project documents and risks to generate recommended pre-bid questions
// Uses document analysis + extracted risks + Claude AI

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  bid_project_id: string;
  force_refresh?: boolean;
  include_risk_questions?: boolean; // Include questions from risks
}

// Valid enum values
const RISK_CATEGORIES = [
  'SCOPE', 'QUANTITY', 'SITE_CONDITIONS', 'ENVIRONMENTAL', 'MOT',
  'SCHEDULE', 'REGULATORY', 'SUBCONTRACTOR', 'MATERIAL', 'OWNER',
  'COMPETITIVE', 'WEATHER', 'HAZMAT', 'CONSTRUCTABILITY'
] as const;

type RiskCategory = typeof RISK_CATEGORIES[number];

interface GeneratedQuestion {
  question_text: string;
  justification: string;
  category: RiskCategory;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  source_reference?: string;
  related_items?: string[];
  ai_confidence: number;
}

const QUESTION_GENERATION_PROMPT = `You are an expert construction bid analyst specializing in WVDOH pre-bid questions.

Your job is to identify ambiguities, inconsistencies, or areas needing clarification in bid documents and generate professional pre-bid questions.

QUESTION CATEGORIES (use exactly these values):
- SCOPE: Questions about work scope, inclusions/exclusions
- QUANTITY: Questions about quantities, measurements, pay item interpretations
- SITE_CONDITIONS: Questions about existing conditions, utilities, access
- ENVIRONMENTAL: Questions about permits, restrictions, seasonal constraints
- MOT: Questions about traffic control, phasing, night work
- SCHEDULE: Questions about deadlines, milestones, liquidated damages
- REGULATORY: Questions about permits, certifications, compliance
- SUBCONTRACTOR: Questions about DBE requirements, prequalification
- MATERIAL: Questions about material sources, specifications, substitutions
- OWNER: Questions about WVDOH processes, inspections, coordination
- WEATHER: Questions about weather days, seasonal limitations
- HAZMAT: Questions about hazardous materials, handling, disposal
- CONSTRUCTABILITY: Questions about means/methods, staging, access

For each question, follow WVDOH pre-bid question best practices:
1. Be specific - reference exact plan sheets, spec sections, or item numbers
2. Be professional - questions should be answerable with a yes/no or clarification
3. Avoid asking for free engineering - don't ask owner to design for you
4. Focus on bid-impacting items - prioritize questions that affect pricing

Generate questions in this format:
{
  "questions": [
    {
      "question_text": "Professional, specific question suitable for submission to WVDOH",
      "justification": "Why this question is important for bidding",
      "category": "EXACTLY one of the categories above",
      "priority": "HIGH|MEDIUM|LOW",
      "source_reference": "Plan sheet, spec section, or document reference",
      "related_items": ["item codes if applicable"],
      "ai_confidence": 0-100
    }
  ]
}

Guidelines:
1. HIGH priority: Could significantly impact bid price or feasibility
2. MEDIUM priority: Affects pricing but not critical
3. LOW priority: Minor clarifications that would be helpful

Always respond with valid JSON only.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const { bid_project_id, force_refresh = false, include_risk_questions = true }: GenerateRequest = await req.json();

    if (!bid_project_id) {
      return new Response(
        JSON.stringify({ error: 'bid_project_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')!;

    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Create user client to verify authentication and authorization
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for data access
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user has access to this project by checking organization match
    // Using service role to bypass RLS issues with get_user_organization_id
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: projectAccess, error: accessError } = await supabase
      .from('bid_projects')
      .select('id, organization_id')
      .eq('id', bid_project_id)
      .single();

    if (accessError || !projectAccess) {
      return new Response(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify organization match (manual RLS check)
    if (projectAccess.organization_id !== userProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Access denied - organization mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('bid_projects')
      .select('id, project_name, state_project_number, county, route_number, question_deadline')
      .eq('id', bid_project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found', details: projectError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if questions already exist
    if (!force_refresh) {
      const { count } = await supabase
        .from('bid_prebid_questions')
        .select('*', { count: 'exact', head: true })
        .eq('bid_project_id', bid_project_id)
        .eq('ai_generated', true);

      if (count && count > 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: `${count} AI-generated questions already exist. Use force_refresh=true to regenerate.`,
            questions_count: count,
            skipped: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get analyzed documents
    const { data: documents } = await supabase
      .from('bid_documents')
      .select('id, file_name, document_type, ai_summary, ai_key_findings, ai_analysis_metadata')
      .eq('bid_project_id', bid_project_id)
      .eq('processing_status', 'COMPLETED')
      .not('ai_summary', 'is', null);

    // Get extracted risks (especially those recommending questions)
    const { data: risks } = await supabase
      .from('bid_project_risks')
      .select('id, risk_number, title, description, category, overall_severity, prebid_question_recommended, suggested_question')
      .eq('bid_project_id', bid_project_id);

    // Get line items for context
    const { data: lineItems } = await supabase
      .from('bid_line_items')
      .select('id, item_number, description, quantity, unit')
      .eq('bid_project_id', bid_project_id)
      .order('line_number', { ascending: true })
      .limit(100);

    // Build context
    const documentContext = documents?.map(doc => ({
      file_name: doc.file_name,
      document_type: doc.document_type,
      summary: doc.ai_summary,
      key_findings: doc.ai_key_findings,
    })) || [];

    const riskContext = risks?.filter(r => r.prebid_question_recommended).map(r => ({
      risk_number: r.risk_number,
      title: r.title,
      category: r.category,
      severity: r.overall_severity,
      suggested_question: r.suggested_question,
    })) || [];

    const lineItemContext = lineItems?.slice(0, 50).map(li => ({
      item_number: li.item_number,
      description: li.description,
      quantity: li.quantity,
      unit: li.unit,
    })) || [];

    // Call Claude API for question generation
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        system: QUESTION_GENERATION_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Generate pre-bid questions for this WVDOH project:

PROJECT INFORMATION:
- Name: ${project.project_name}
- State Project: ${project.state_project_number || 'Not specified'}
- County: ${project.county || 'Not specified'}
- Route: ${project.route_number || 'Not specified'}
- Question Deadline: ${project.question_deadline || 'Not specified'}

DOCUMENT ANALYSIS (${documentContext.length} documents analyzed):
${JSON.stringify(documentContext, null, 2)}

IDENTIFIED RISKS RECOMMENDING QUESTIONS (${riskContext.length} risks):
${JSON.stringify(riskContext, null, 2)}

LINE ITEMS SAMPLE (${lineItemContext.length} of ${lineItems?.length || 0} total):
${JSON.stringify(lineItemContext, null, 2)}

Generate comprehensive pre-bid questions based on this analysis. Include questions for:
1. Ambiguities found in documents
2. Risks that recommend clarification
3. Line items with unclear scope or quantities
4. Any potential conflicts between documents`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeResult = await claudeResponse.json();
    const responseText = claudeResult.content[0]?.text;

    if (!responseText) {
      throw new Error('No response text from Claude');
    }

    // Parse the JSON response
    let generatedQuestions: { questions: GeneratedQuestion[] };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      generatedQuestions = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error(`Failed to parse questions: ${parseError}`);
    }

    // Validate questions
    const validQuestions = generatedQuestions.questions.filter(q => {
      if (!RISK_CATEGORIES.includes(q.category as RiskCategory)) {
        console.warn(`Invalid category: ${q.category}, defaulting to SCOPE`);
        q.category = 'SCOPE';
      }
      return q.question_text && q.question_text.length > 10;
    });

    // Delete existing AI-generated questions if force_refresh
    if (force_refresh) {
      await supabase
        .from('bid_prebid_questions')
        .delete()
        .eq('bid_project_id', bid_project_id)
        .eq('ai_generated', true);
    }

    // Insert questions into database
    const questionsToInsert = validQuestions.map((q, index) => ({
      bid_project_id,
      question_number: `Q-${String(index + 1).padStart(3, '0')}`,
      question_text: q.question_text,
      justification: q.justification,
      category: q.category,
      source_page_numbers: q.source_reference || null,
      status: 'AI_SUGGESTED',
      ai_generated: true,
      ai_confidence: q.ai_confidence || 75,
      original_ai_text: q.question_text,
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('bid_prebid_questions')
      .insert(questionsToInsert)
      .select('id, question_number, question_text, category');

    if (insertError) {
      throw new Error(`Failed to insert questions: ${insertError.message}`);
    }

    // Calculate duration
    const duration = Date.now() - startTime;

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        bid_project_id,
        questions_count: insertedQuestions?.length || 0,
        questions_by_priority: {
          high: validQuestions.filter(q => q.priority === 'HIGH').length,
          medium: validQuestions.filter(q => q.priority === 'MEDIUM').length,
          low: validQuestions.filter(q => q.priority === 'LOW').length,
        },
        questions_by_category: RISK_CATEGORIES.reduce((acc, cat) => {
          acc[cat] = validQuestions.filter(q => q.category === cat).length;
          return acc;
        }, {} as Record<string, number>),
        questions: insertedQuestions,
        deadline: project.question_deadline,
        duration_ms: duration,
        usage: claudeResult.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Question generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        error: 'Question generation failed',
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
