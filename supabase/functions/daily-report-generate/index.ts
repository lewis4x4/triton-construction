// =============================================================================
// Edge Function: daily-report-generate
// Purpose: Use AI to structure transcribed voice recordings into daily reports
// Per CLAUDE.md Roadmap: Voice-first daily field reporting
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  recording_id?: string;
  transcription_text: string;
  project_id: string;
  report_date: string;
  author_id: string;
  weather_data?: WeatherData;
}

interface WeatherData {
  high_temp?: number;
  low_temp?: number;
  conditions?: string;
  precipitation?: number;
  wind_speed?: number;
}

interface StructuredReport {
  weather_summary: string;
  work_performed: WorkEntry[];
  manpower: ManpowerEntry[];
  equipment: EquipmentEntry[];
  materials: MaterialEntry[];
  delays: DelayEntry[];
  visitors: VisitorEntry[];
  safety_notes: string[];
  issues: string[];
  general_notes: string;
}

interface WorkEntry {
  description: string;
  location?: string;
  cost_code?: string;
  quantity?: number;
  unit?: string;
}

interface ManpowerEntry {
  trade: string;
  count: number;
  hours: number;
  company?: string;
}

interface EquipmentEntry {
  equipment_type: string;
  hours: number;
  operator?: string;
  notes?: string;
}

interface MaterialEntry {
  material: string;
  quantity: number;
  unit: string;
  supplier?: string;
}

interface DelayEntry {
  reason: string;
  duration_hours: number;
  impact: string;
}

interface VisitorEntry {
  name: string;
  company: string;
  purpose: string;
  time_on_site?: string;
}

const SYSTEM_PROMPT = `You are an expert construction daily report processor for WVDOH highway construction projects.

Your task is to analyze transcribed voice recordings from field superintendents and foremen, then extract and structure the information into a formal daily report format.

IMPORTANT CONTEXT:
- These are West Virginia DOH highway construction projects
- Common work types: excavation, grading, paving, bridge work, drainage, guardrail, utilities
- Davis-Bacon prevailing wages apply to federal-aid projects
- Working day tracking is critical for contract compliance
- WVDOH inspectors may visit sites regularly

EXTRACTION GUIDELINES:
1. WEATHER: Extract any weather mentions (temperature, rain, delays due to weather)
2. WORK PERFORMED: List each distinct work activity with location and quantities if mentioned
3. MANPOWER: Count workers by trade (operators, laborers, carpenters, ironworkers, etc.)
4. EQUIPMENT: List equipment used with hours (excavators, dozers, pavers, rollers, etc.)
5. MATERIALS: Note any materials received or placed (concrete, asphalt, aggregate, pipe, etc.)
6. DELAYS: Document any delays with cause and duration
7. VISITORS: Note any visitors, especially WVDOH inspectors
8. SAFETY: Extract safety observations, toolbox talks, incidents
9. ISSUES: Flag any problems, conflicts, or concerns mentioned

OUTPUT FORMAT:
Return a JSON object with the structured data. Use the exact schema provided.
If information is not mentioned, use empty arrays or null values.
Estimate quantities/hours if the speaker gives approximations.
`;

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

    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const {
      recording_id,
      transcription_text,
      project_id,
      report_date,
      author_id,
      weather_data,
    } = await req.json() as GenerateRequest;

    if (!transcription_text) {
      throw new Error('transcription_text is required');
    }

    if (!project_id || !report_date || !author_id) {
      throw new Error('project_id, report_date, and author_id are required');
    }

    // Get project details for context
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('name, project_number, contract_number, wvdoh_district')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${project_id}`);
    }

    console.log(`Generating report for project: ${project.name} (${report_date})`);

    // Build the prompt with context
    let userPrompt = `Project: ${project.name}
Project Number: ${project.project_number}
Contract: ${project.contract_number || 'N/A'}
WVDOH District: ${project.wvdoh_district || 'N/A'}
Report Date: ${report_date}
`;

    if (weather_data) {
      userPrompt += `\nWeather Data (from API):
- High: ${weather_data.high_temp}°F
- Low: ${weather_data.low_temp}°F
- Conditions: ${weather_data.conditions}
- Precipitation: ${weather_data.precipitation}"
- Wind: ${weather_data.wind_speed} mph
`;
    }

    userPrompt += `\n--- TRANSCRIPTION TO PROCESS ---\n\n${transcription_text}\n\n--- END TRANSCRIPTION ---

Please analyze this field recording and extract all relevant information into the structured daily report format.
Return ONLY valid JSON matching this TypeScript interface:

{
  "weather_summary": "string - brief weather description",
  "work_performed": [{"description": "string", "location": "string?", "cost_code": "string?", "quantity": "number?", "unit": "string?"}],
  "manpower": [{"trade": "string", "count": "number", "hours": "number", "company": "string?"}],
  "equipment": [{"equipment_type": "string", "hours": "number", "operator": "string?", "notes": "string?"}],
  "materials": [{"material": "string", "quantity": "number", "unit": "string", "supplier": "string?"}],
  "delays": [{"reason": "string", "duration_hours": "number", "impact": "string"}],
  "visitors": [{"name": "string", "company": "string", "purpose": "string", "time_on_site": "string?"}],
  "safety_notes": ["string"],
  "issues": ["string"],
  "general_notes": "string - any other relevant information"
}`;

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
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text();
      throw new Error(`Claude API error: ${claudeResponse.status} - ${errorText}`);
    }

    const claudeResult = await claudeResponse.json();
    const responseText = claudeResult.content[0]?.text || '';

    console.log('Claude response received, parsing JSON...');

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let structuredReport: StructuredReport;
    try {
      structuredReport = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', responseText);
      throw new Error('Failed to parse AI response as structured report');
    }

    // Create or update daily report
    const { data: existingReport } = await supabaseClient
      .from('daily_reports')
      .select('id')
      .eq('project_id', project_id)
      .eq('report_date', report_date)
      .eq('created_by', author_id)
      .single();

    let reportId: string;

    if (existingReport) {
      // Update existing report
      reportId = existingReport.id;
      await supabaseClient
        .from('daily_reports')
        .update({
          weather_summary: structuredReport.weather_summary,
          general_notes: structuredReport.general_notes,
          safety_notes: structuredReport.safety_notes,
          issues_concerns: structuredReport.issues,
          ai_generated: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);
    } else {
      // Create new report
      const { data: newReport, error: reportError } = await supabaseClient
        .from('daily_reports')
        .insert({
          project_id,
          report_date,
          created_by: author_id,
          weather_summary: structuredReport.weather_summary,
          general_notes: structuredReport.general_notes,
          safety_notes: structuredReport.safety_notes,
          issues_concerns: structuredReport.issues,
          ai_generated: true,
          status: 'DRAFT',
        })
        .select('id')
        .single();

      if (reportError || !newReport) {
        throw new Error(`Failed to create daily report: ${reportError?.message}`);
      }
      reportId = newReport.id;
    }

    // Insert work entries
    if (structuredReport.work_performed?.length > 0) {
      const workEntries = structuredReport.work_performed.map((entry, index) => ({
        daily_report_id: reportId,
        entry_type: 'WORK_PERFORMED',
        description: entry.description,
        location: entry.location,
        quantity: entry.quantity,
        unit: entry.unit,
        sort_order: index + 1,
      }));

      await supabaseClient
        .from('daily_report_entries')
        .insert(workEntries);
    }

    // Insert delay entries
    if (structuredReport.delays?.length > 0) {
      const delayEntries = structuredReport.delays.map((entry, index) => ({
        daily_report_id: reportId,
        entry_type: 'DELAY',
        description: `${entry.reason} (${entry.duration_hours} hours) - Impact: ${entry.impact}`,
        sort_order: index + 1,
      }));

      await supabaseClient
        .from('daily_report_entries')
        .insert(delayEntries);
    }

    // Insert visitor entries
    if (structuredReport.visitors?.length > 0) {
      const visitorEntries = structuredReport.visitors.map((entry, index) => ({
        daily_report_id: reportId,
        entry_type: 'VISITOR',
        description: `${entry.name} (${entry.company}) - ${entry.purpose}${entry.time_on_site ? ` [${entry.time_on_site}]` : ''}`,
        sort_order: index + 1,
      }));

      await supabaseClient
        .from('daily_report_entries')
        .insert(visitorEntries);
    }

    // Insert manpower records
    if (structuredReport.manpower?.length > 0) {
      const manpowerRecords = structuredReport.manpower.map(entry => ({
        daily_report_id: reportId,
        trade: entry.trade,
        headcount: entry.count,
        hours: entry.hours,
        company_name: entry.company,
      }));

      await supabaseClient
        .from('daily_manpower')
        .insert(manpowerRecords);
    }

    // Insert equipment records
    if (structuredReport.equipment?.length > 0) {
      const equipmentRecords = structuredReport.equipment.map(entry => ({
        daily_report_id: reportId,
        equipment_type: entry.equipment_type,
        hours_used: entry.hours,
        operator_name: entry.operator,
        notes: entry.notes,
      }));

      await supabaseClient
        .from('daily_equipment_log')
        .insert(equipmentRecords);
    }

    // Link recording to report if provided
    if (recording_id) {
      await supabaseClient
        .from('voice_recordings')
        .update({
          daily_report_id: reportId,
          status: 'processed',
        })
        .eq('id', recording_id);
    }

    console.log(`Report generated successfully: ${reportId}`);

    return new Response(
      JSON.stringify({
        success: true,
        report_id: reportId,
        structured_data: structuredReport,
        message: 'Daily report generated from transcription',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Report generation error:', error);

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
