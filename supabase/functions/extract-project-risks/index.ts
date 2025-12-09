// Supabase Edge Function: extract-project-risks
// Analyzes bid project documents and extracts risks to bid_project_risks table
// Uses document analysis results + Claude AI for comprehensive risk identification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractRequest {
  bid_project_id: string;
  force_refresh?: boolean; // Re-extract even if risks exist
}

// Valid enum values from database
const RISK_CATEGORIES = [
  'SCOPE', 'QUANTITY', 'SITE_CONDITIONS', 'ENVIRONMENTAL', 'MOT',
  'SCHEDULE', 'REGULATORY', 'SUBCONTRACTOR', 'MATERIAL', 'OWNER',
  'COMPETITIVE', 'WEATHER', 'HAZMAT', 'CONSTRUCTABILITY'
] as const;

const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

type RiskCategory = typeof RISK_CATEGORIES[number];
type Severity = typeof SEVERITY_LEVELS[number];

interface ExtractedRisk {
  title: string;
  description: string;
  category: RiskCategory;
  probability: Severity;
  cost_impact: Severity;
  schedule_impact: Severity;
  overall_severity: Severity;
  estimated_cost_impact_low?: number;
  estimated_cost_impact_high?: number;
  estimated_schedule_impact_days?: number;
  mitigation_strategy?: string;
  contingency_recommended: boolean;
  contingency_percentage?: number;
  prebid_question_recommended: boolean;
  suggested_question?: string;
  source_page_numbers?: string;
  source_text_excerpt?: string;
  ai_confidence: number;
  ai_reasoning: string;
}

const RISK_EXTRACTION_PROMPT = `You are an expert construction risk analyst specializing in WVDOH highway and bridge projects.

Analyze the provided document summaries and key findings to identify ALL potential risks for this bid project.

RISK CATEGORIES (use exactly these values):
- SCOPE: Unclear scope, scope changes, undefined work
- QUANTITY: Quantity uncertainties, potential overruns/underruns
- SITE_CONDITIONS: Unknown site conditions, geotechnical issues, existing utilities
- ENVIRONMENTAL: Wetlands, species, permits, seasonal restrictions
- MOT: Maintenance of traffic complexity, night work, lane closures
- SCHEDULE: Tight schedules, weather windows, seasonal constraints
- REGULATORY: Permits, inspections, compliance requirements
- SUBCONTRACTOR: Specialty work availability, DBE requirements
- MATERIAL: Material availability, lead times, price volatility
- OWNER: WVDOH requirements, inspection delays, change order process
- COMPETITIVE: Competitive bidding pressure, low-bid environment
- WEATHER: Weather-sensitive work, seasonal limitations
- HAZMAT: Asbestos, lead, contaminated materials
- CONSTRUCTABILITY: Access issues, phasing complexity, means/methods

SEVERITY LEVELS (use exactly these values):
- LOW: Minor impact, easily managed
- MEDIUM: Moderate impact, requires attention
- HIGH: Significant impact, needs mitigation plan
- CRITICAL: Major impact, could affect bid decision

For each identified risk, provide:
{
  "risks": [
    {
      "title": "Short descriptive title (max 100 chars)",
      "description": "Detailed description of the risk and its implications",
      "category": "EXACTLY one of the categories above",
      "probability": "LOW|MEDIUM|HIGH|CRITICAL",
      "cost_impact": "LOW|MEDIUM|HIGH|CRITICAL",
      "schedule_impact": "LOW|MEDIUM|HIGH|CRITICAL",
      "overall_severity": "LOW|MEDIUM|HIGH|CRITICAL",
      "estimated_cost_impact_low": number or null (in dollars),
      "estimated_cost_impact_high": number or null (in dollars),
      "estimated_schedule_impact_days": number or null,
      "mitigation_strategy": "Recommended mitigation approach",
      "contingency_recommended": true/false,
      "contingency_percentage": number or null (e.g., 5 for 5%),
      "prebid_question_recommended": true/false,
      "suggested_question": "Question to ask owner if applicable",
      "source_page_numbers": "Page references from source documents",
      "source_text_excerpt": "Brief quote from source (max 200 chars)",
      "ai_confidence": 0-100 (confidence in this risk assessment),
      "ai_reasoning": "Brief explanation of why this is a risk"
    }
  ]
}

Guidelines:
1. Be thorough - identify ALL risks, even minor ones
2. Be specific - generic risks are less useful
3. Quantify when possible - use dollar estimates and days
4. Recommend pre-bid questions for ambiguous items
5. Consider WVDOH-specific risks (liquidated damages, DBE goals, etc.)
6. Look for hidden risks in environmental, hazmat, and geotechnical findings

Always respond with valid JSON only.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { bid_project_id, force_refresh = false }: ExtractRequest = await req.json();

    if (!bid_project_id) {
      return new Response(
        JSON.stringify({ error: 'bid_project_id is required' }),
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

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('bid_projects')
      .select('id, project_name, state_project_number, county, route_number, dbe_goal_percentage, contract_time_days')
      .eq('id', bid_project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found', details: projectError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if risks already exist
    if (!force_refresh) {
      const { count } = await supabase
        .from('bid_project_risks')
        .select('*', { count: 'exact', head: true })
        .eq('bid_project_id', bid_project_id)
        .eq('ai_generated', true);

      if (count && count > 0) {
        return new Response(
          JSON.stringify({
            success: true,
            message: `${count} AI-generated risks already exist. Use force_refresh=true to regenerate.`,
            risks_count: count,
            skipped: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get all analyzed documents for this project
    const { data: documents, error: docsError } = await supabase
      .from('bid_documents')
      .select('id, file_name, document_type, ai_summary, ai_key_findings, ai_analysis_metadata, ai_confidence_score')
      .eq('bid_project_id', bid_project_id)
      .eq('processing_status', 'COMPLETED')
      .not('ai_summary', 'is', null);

    if (docsError) {
      throw new Error(`Failed to fetch documents: ${docsError.message}`);
    }

    if (!documents || documents.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No analyzed documents found. Please upload and process documents first.',
          risks_count: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build context from all documents
    const documentContext = documents.map(doc => ({
      document_id: doc.id,
      file_name: doc.file_name,
      document_type: doc.document_type,
      summary: doc.ai_summary,
      key_findings: doc.ai_key_findings,
      extracted_data: doc.ai_analysis_metadata,
    }));

    // Call Claude API for risk extraction
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
        system: RISK_EXTRACTION_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Analyze the following bid project and its documents to identify ALL risks:

PROJECT INFORMATION:
- Name: ${project.project_name}
- State Project: ${project.state_project_number || 'Not specified'}
- County: ${project.county || 'Not specified'}
- Route: ${project.route_number || 'Not specified'}
- DBE Goal: ${project.dbe_goal_percentage || 0}%
- Contract Days: ${project.contract_time_days || 'Not specified'}

ANALYZED DOCUMENTS (${documents.length} total):
${JSON.stringify(documentContext, null, 2)}

Extract ALL risks from this information. Be thorough and specific.`,
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
    let extractedRisks: { risks: ExtractedRisk[] };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      extractedRisks = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error(`Failed to parse risks: ${parseError}`);
    }

    // Validate and sanitize risks
    const validRisks = extractedRisks.risks.filter(risk => {
      // Validate category
      if (!RISK_CATEGORIES.includes(risk.category as RiskCategory)) {
        console.warn(`Invalid category: ${risk.category}, skipping risk: ${risk.title}`);
        return false;
      }
      // Validate severity levels
      for (const field of ['probability', 'cost_impact', 'schedule_impact', 'overall_severity']) {
        if (!SEVERITY_LEVELS.includes(risk[field as keyof ExtractedRisk] as Severity)) {
          console.warn(`Invalid ${field}: ${risk[field as keyof ExtractedRisk]}, skipping risk: ${risk.title}`);
          return false;
        }
      }
      return true;
    });

    // Delete existing AI-generated risks if force_refresh
    if (force_refresh) {
      await supabase
        .from('bid_project_risks')
        .delete()
        .eq('bid_project_id', bid_project_id)
        .eq('ai_generated', true);
    }

    // Insert risks into database
    const risksToInsert = validRisks.map((risk, index) => ({
      bid_project_id,
      risk_number: `R-${String(index + 1).padStart(3, '0')}`,
      title: risk.title.substring(0, 200),
      description: risk.description,
      category: risk.category,
      probability: risk.probability,
      cost_impact: risk.cost_impact,
      schedule_impact: risk.schedule_impact,
      overall_severity: risk.overall_severity,
      estimated_cost_impact_low: risk.estimated_cost_impact_low || null,
      estimated_cost_impact_high: risk.estimated_cost_impact_high || null,
      estimated_schedule_impact_days: risk.estimated_schedule_impact_days || null,
      mitigation_strategy: risk.mitigation_strategy || null,
      contingency_recommended: risk.contingency_recommended || false,
      contingency_percentage: risk.contingency_percentage || null,
      prebid_question_recommended: risk.prebid_question_recommended || false,
      suggested_question: risk.suggested_question || null,
      source_page_numbers: risk.source_page_numbers || null,
      source_text_excerpt: risk.source_text_excerpt?.substring(0, 500) || null,
      ai_generated: true,
      ai_confidence: risk.ai_confidence || 75,
      ai_reasoning: risk.ai_reasoning || null,
      review_status: 'PENDING',
    }));

    const { data: insertedRisks, error: insertError } = await supabase
      .from('bid_project_risks')
      .insert(risksToInsert)
      .select('id, risk_number, title, category, overall_severity');

    if (insertError) {
      throw new Error(`Failed to insert risks: ${insertError.message}`);
    }

    // Calculate duration
    const duration = Date.now() - startTime;

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        bid_project_id,
        risks_count: insertedRisks?.length || 0,
        risks_by_severity: {
          critical: validRisks.filter(r => r.overall_severity === 'CRITICAL').length,
          high: validRisks.filter(r => r.overall_severity === 'HIGH').length,
          medium: validRisks.filter(r => r.overall_severity === 'MEDIUM').length,
          low: validRisks.filter(r => r.overall_severity === 'LOW').length,
        },
        risks_by_category: RISK_CATEGORIES.reduce((acc, cat) => {
          acc[cat] = validRisks.filter(r => r.category === cat).length;
          return acc;
        }, {} as Record<string, number>),
        prebid_questions_recommended: validRisks.filter(r => r.prebid_question_recommended).length,
        risks: insertedRisks,
        duration_ms: duration,
        usage: claudeResult.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Risk extraction error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        error: 'Risk extraction failed',
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
