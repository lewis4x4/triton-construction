// Supabase Edge Function: generate-executive-snapshot
// Generates an AI-powered executive summary for a bid project
// Aggregates data from all analysis modules and creates a comprehensive snapshot

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SnapshotRequest {
  bid_project_id: string;
  force_regenerate?: boolean; // Create new even if current exists
}

interface ProjectMetrics {
  total_line_items: number;
  total_estimated_value: number;
  critical_risks_count: number;
  high_risks_count: number;
  medium_risks_count: number;
  low_risks_count: number;
  work_packages_count: number;
  environmental_commitments_count: number;
  hazmat_findings_count: number;
  prebid_questions_count: number;
}

interface ProjectData {
  project: {
    id: string;
    project_name: string;
    state_project_number: string | null;
    county: string | null;
    route: string | null;
    contract_time_days: number | null;
    letting_date: string | null;
    bid_due_date: string | null;
    dbe_goal_percentage: number | null;
    is_federal_aid: boolean;
    liquidated_damages_per_day: number | null;
  };
  documents: Array<{
    document_type: string;
    ai_summary: string | null;
  }>;
  lineItems: Array<{
    work_category: string | null;
    quantity: number;
    unit: string;
    description: string;
    risk_level: string | null;
  }>;
  risks: Array<{
    title: string;
    category: string;
    overall_severity: string;
    description: string;
    prebid_question_recommended: boolean;
  }>;
  questions: Array<{
    question_text: string;
    status: string;
    category: string | null;
  }>;
  environmental: Array<{
    commitment_type: string;
    description: string;
  }>;
  hazmat: Array<{
    finding_type: string;
    description: string;
    severity: string;
  }>;
  workPackages: Array<{
    package_name: string;
    work_category: string;
    status: string;
  }>;
  conditions: {
    in_floodplain: boolean;
    steep_terrain: boolean;
    night_work_required: boolean;
    seasonal_restrictions: boolean;
    wetlands_present: boolean;
    endangered_species: boolean;
    railroad_involvement: boolean;
    utility_relocations_required: boolean;
  } | null;
}

const EXECUTIVE_SUMMARY_PROMPT = `You are an expert construction executive preparing a bid decision summary for WVDOH highway and bridge projects.

Generate a comprehensive executive snapshot that helps leadership make a go/no-go decision and understand key project characteristics.

Your summary should be:
- Concise but thorough
- Focused on decision-relevant information
- Highlighting risks and opportunities
- Including specific numbers and facts
- Written in professional construction industry language

Generate the following sections as JSON:

{
  "project_overview": "2-3 paragraph overview of the project scope, location, and key characteristics. Include contract value range if estimable, contract days, and key work items.",

  "key_quantities_summary": "Summary of major quantity items by category. Highlight any unusual quantities or items that drive significant cost. Format as bullet points or brief paragraphs.",

  "risk_summary": "Analysis of the risk profile. Summarize critical and high risks first. Include risk mitigation recommendations. Quantify potential cost impacts where possible.",

  "environmental_summary": "Summary of environmental constraints, permits, seasonal restrictions, endangered species, wetlands, and any environmental commitments from the project documents.",

  "schedule_summary": "Analysis of schedule constraints including contract days, weather windows, seasonal restrictions, and critical path considerations. Flag any schedule risks.",

  "cost_considerations": "Key cost drivers, pricing risks, subcontractor dependencies, material volatility concerns, and recommendations for contingency/markup adjustments.",

  "recommendations": "Clear recommendations for the bid team: go/no-go factors, items requiring management attention, suggested pre-bid questions, and competitive positioning advice."
}

Be specific and reference actual data from the project. Don't be generic.

Always respond with valid JSON only.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const { bid_project_id, force_regenerate = false }: SnapshotRequest = await req.json();

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

    // Check if current snapshot exists
    if (!force_regenerate) {
      const { data: existingSnapshot } = await supabase
        .from('bid_executive_snapshots')
        .select('id, version_number, created_at')
        .eq('bid_project_id', bid_project_id)
        .eq('is_current', true)
        .single();

      if (existingSnapshot) {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Current snapshot already exists. Use force_regenerate=true to create a new version.',
            snapshot_id: existingSnapshot.id,
            version: existingSnapshot.version_number,
            created_at: existingSnapshot.created_at,
            skipped: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Gather all project data in parallel
    const [
      projectResult,
      documentsResult,
      lineItemsResult,
      risksResult,
      questionsResult,
      environmentalResult,
      hazmatResult,
      workPackagesResult,
      conditionsResult,
    ] = await Promise.all([
      // Project details
      supabase
        .from('bid_projects')
        .select('id, project_name, state_project_number, county, route, contract_time_days, letting_date, bid_due_date, dbe_goal_percentage, is_federal_aid, liquidated_damages_per_day')
        .eq('id', bid_project_id)
        .single(),

      // Documents with AI summaries
      supabase
        .from('bid_documents')
        .select('document_type, ai_summary')
        .eq('bid_project_id', bid_project_id)
        .eq('processing_status', 'COMPLETED')
        .not('ai_summary', 'is', null),

      // Line items
      supabase
        .from('bid_line_items')
        .select('work_category, quantity, unit, description, risk_level, final_extended_price, ai_suggested_unit_price')
        .eq('bid_project_id', bid_project_id),

      // Risks
      supabase
        .from('bid_project_risks')
        .select('title, category, overall_severity, description, prebid_question_recommended')
        .eq('bid_project_id', bid_project_id),

      // Pre-bid questions
      supabase
        .from('bid_prebid_questions')
        .select('question_text, status, category')
        .eq('bid_project_id', bid_project_id),

      // Environmental commitments
      supabase
        .from('bid_environmental_commitments')
        .select('commitment_type, description')
        .eq('bid_project_id', bid_project_id),

      // Hazmat findings
      supabase
        .from('bid_hazmat_findings')
        .select('finding_type, description, severity')
        .eq('bid_project_id', bid_project_id),

      // Work packages
      supabase
        .from('bid_work_packages')
        .select('package_name, work_category, status')
        .eq('bid_project_id', bid_project_id),

      // Project conditions
      supabase
        .from('bid_project_conditions')
        .select('in_floodplain, steep_terrain, night_work_required, seasonal_restrictions, wetlands_present, endangered_species, railroad_involvement, utility_relocations_required')
        .eq('bid_project_id', bid_project_id)
        .single(),
    ]);

    // Check project exists
    if (projectResult.error || !projectResult.data) {
      return new Response(
        JSON.stringify({ error: 'Project not found', details: projectResult.error }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate metrics
    const lineItems = lineItemsResult.data || [];
    const risks = risksResult.data || [];
    const questions = questionsResult.data || [];
    const environmental = environmentalResult.data || [];
    const hazmat = hazmatResult.data || [];
    const workPackages = workPackagesResult.data || [];

    // Estimate total value from line items
    let totalEstimatedValue = 0;
    for (const item of lineItems) {
      if (item.final_extended_price) {
        totalEstimatedValue += Number(item.final_extended_price);
      } else if (item.ai_suggested_unit_price && item.quantity) {
        totalEstimatedValue += Number(item.ai_suggested_unit_price) * Number(item.quantity);
      }
    }

    const metrics: ProjectMetrics = {
      total_line_items: lineItems.length,
      total_estimated_value: totalEstimatedValue,
      critical_risks_count: risks.filter(r => r.overall_severity === 'CRITICAL').length,
      high_risks_count: risks.filter(r => r.overall_severity === 'HIGH').length,
      medium_risks_count: risks.filter(r => r.overall_severity === 'MEDIUM').length,
      low_risks_count: risks.filter(r => r.overall_severity === 'LOW').length,
      work_packages_count: workPackages.length,
      environmental_commitments_count: environmental.length,
      hazmat_findings_count: hazmat.length,
      prebid_questions_count: questions.length,
    };

    // Build context for AI
    const projectData: ProjectData = {
      project: projectResult.data,
      documents: documentsResult.data || [],
      lineItems,
      risks,
      questions,
      environmental,
      hazmat,
      workPackages,
      conditions: conditionsResult.data || null,
    };

    // Generate summary by work category
    const workCategorySummary: Record<string, { count: number; totalQty: string[] }> = {};
    for (const item of lineItems) {
      const cat = item.work_category || 'OTHER';
      if (!workCategorySummary[cat]) {
        workCategorySummary[cat] = { count: 0, totalQty: [] };
      }
      workCategorySummary[cat].count++;
      workCategorySummary[cat].totalQty.push(`${item.quantity} ${item.unit}`);
    }

    // Call Claude API for executive summary generation
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
        system: EXECUTIVE_SUMMARY_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Generate an executive snapshot for the following WVDOH bid project:

PROJECT DETAILS:
- Name: ${projectData.project.project_name}
- State Project Number: ${projectData.project.state_project_number || 'Not specified'}
- County: ${projectData.project.county || 'Not specified'}
- Route: ${projectData.project.route || 'Not specified'}
- Contract Days: ${projectData.project.contract_time_days || 'Not specified'}
- Letting Date: ${projectData.project.letting_date || 'Not specified'}
- Bid Due Date: ${projectData.project.bid_due_date || 'Not specified'}
- DBE Goal: ${projectData.project.dbe_goal_percentage || 0}%
- Federal Aid: ${projectData.project.is_federal_aid ? 'Yes' : 'No'}
- Liquidated Damages: $${projectData.project.liquidated_damages_per_day || 'Not specified'}/day

METRICS:
- Total Line Items: ${metrics.total_line_items}
- Estimated Value: $${metrics.total_estimated_value.toLocaleString()}
- Critical Risks: ${metrics.critical_risks_count}
- High Risks: ${metrics.high_risks_count}
- Medium Risks: ${metrics.medium_risks_count}
- Low Risks: ${metrics.low_risks_count}
- Work Packages: ${metrics.work_packages_count}
- Environmental Commitments: ${metrics.environmental_commitments_count}
- Hazmat Findings: ${metrics.hazmat_findings_count}
- Pre-bid Questions: ${metrics.prebid_questions_count}

DOCUMENT SUMMARIES:
${projectData.documents.map(d => `[${d.document_type}]: ${d.ai_summary}`).join('\n\n')}

LINE ITEMS BY CATEGORY:
${Object.entries(workCategorySummary).map(([cat, data]) => `- ${cat}: ${data.count} items`).join('\n')}

TOP RISKS (sorted by severity):
${risks.sort((a, b) => {
  const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return (order[a.overall_severity as keyof typeof order] || 4) - (order[b.overall_severity as keyof typeof order] || 4);
}).slice(0, 10).map(r => `- [${r.overall_severity}] ${r.title}: ${r.description.substring(0, 150)}...`).join('\n')}

ENVIRONMENTAL COMMITMENTS:
${environmental.length > 0 ? environmental.map(e => `- ${e.commitment_type}: ${e.description}`).join('\n') : 'None identified'}

HAZMAT FINDINGS:
${hazmat.length > 0 ? hazmat.map(h => `- [${h.severity}] ${h.finding_type}: ${h.description}`).join('\n') : 'None identified'}

SITE CONDITIONS:
${projectData.conditions ? `
- Floodplain: ${projectData.conditions.in_floodplain ? 'Yes' : 'No'}
- Steep Terrain: ${projectData.conditions.steep_terrain ? 'Yes' : 'No'}
- Night Work Required: ${projectData.conditions.night_work_required ? 'Yes' : 'No'}
- Seasonal Restrictions: ${projectData.conditions.seasonal_restrictions ? 'Yes' : 'No'}
- Wetlands Present: ${projectData.conditions.wetlands_present ? 'Yes' : 'No'}
- Endangered Species: ${projectData.conditions.endangered_species ? 'Yes' : 'No'}
- Railroad Involvement: ${projectData.conditions.railroad_involvement ? 'Yes' : 'No'}
- Utility Relocations: ${projectData.conditions.utility_relocations_required ? 'Yes' : 'No'}
` : 'Site conditions not yet analyzed'}

PRE-BID QUESTIONS SUGGESTED:
${questions.slice(0, 5).map(q => `- ${q.question_text}`).join('\n')}
${questions.length > 5 ? `... and ${questions.length - 5} more questions` : ''}

Generate a comprehensive executive snapshot with all sections.`,
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
    let summaryContent: {
      project_overview: string;
      key_quantities_summary: string;
      risk_summary: string;
      environmental_summary: string;
      schedule_summary: string;
      cost_considerations: string;
      recommendations: string;
    };

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      summaryContent = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Claude response:', responseText);
      throw new Error(`Failed to parse summary: ${parseError}`);
    }

    // If regenerating, supersede the old current snapshot
    if (force_regenerate) {
      const { data: oldSnapshot } = await supabase
        .from('bid_executive_snapshots')
        .select('id, version_number')
        .eq('bid_project_id', bid_project_id)
        .eq('is_current', true)
        .single();

      if (oldSnapshot) {
        await supabase
          .from('bid_executive_snapshots')
          .update({
            is_current: false,
            superseded_at: new Date().toISOString(),
          })
          .eq('id', oldSnapshot.id);
      }
    }

    // Get the next version number
    const { data: versionData } = await supabase
      .from('bid_executive_snapshots')
      .select('version_number')
      .eq('bid_project_id', bid_project_id)
      .order('version_number', { ascending: false })
      .limit(1);

    const nextVersion = (versionData?.[0]?.version_number || 0) + 1;

    // Insert new snapshot
    const { data: newSnapshot, error: insertError } = await supabase
      .from('bid_executive_snapshots')
      .insert({
        bid_project_id,
        version_number: nextVersion,
        snapshot_date: new Date().toISOString().split('T')[0],

        // AI-generated content
        project_overview: summaryContent.project_overview,
        key_quantities_summary: summaryContent.key_quantities_summary,
        risk_summary: summaryContent.risk_summary,
        environmental_summary: summaryContent.environmental_summary,
        schedule_summary: summaryContent.schedule_summary,
        cost_considerations: summaryContent.cost_considerations,
        recommendations: summaryContent.recommendations,

        // Metrics
        total_line_items: metrics.total_line_items,
        total_estimated_value: metrics.total_estimated_value,
        critical_risks_count: metrics.critical_risks_count,
        high_risks_count: metrics.high_risks_count,
        work_packages_count: metrics.work_packages_count,
        environmental_commitments_count: metrics.environmental_commitments_count,
        hazmat_findings_count: metrics.hazmat_findings_count,
        prebid_questions_count: metrics.prebid_questions_count,

        // AI metadata
        ai_model_used: 'claude-sonnet-4-20250514',
        ai_prompt_version: 'v1.0',
        generation_duration_ms: Date.now() - startTime,
        tokens_used: claudeResult.usage?.input_tokens + claudeResult.usage?.output_tokens,

        // Status
        is_current: true,
        reviewed: false,
      })
      .select('id, version_number, snapshot_date, created_at')
      .single();

    if (insertError) {
      throw new Error(`Failed to insert snapshot: ${insertError.message}`);
    }

    // Update the superseded_by on old snapshot if applicable
    if (force_regenerate) {
      const { data: oldSnapshot } = await supabase
        .from('bid_executive_snapshots')
        .select('id')
        .eq('bid_project_id', bid_project_id)
        .eq('is_current', false)
        .is('superseded_by', null)
        .order('version_number', { ascending: false })
        .limit(1);

      if (oldSnapshot) {
        await supabase
          .from('bid_executive_snapshots')
          .update({ superseded_by: newSnapshot?.id })
          .eq('id', oldSnapshot.id);
      }
    }

    const duration = Date.now() - startTime;

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        bid_project_id,
        snapshot_id: newSnapshot?.id,
        version: newSnapshot?.version_number,
        snapshot_date: newSnapshot?.snapshot_date,
        metrics,
        sections: Object.keys(summaryContent),
        duration_ms: duration,
        usage: claudeResult.usage,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Executive snapshot generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        error: 'Executive snapshot generation failed',
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
