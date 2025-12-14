// =============================================================================
// Edge Function: analyze-incident
// Purpose: AI-powered incident analysis and root cause determination
// Suggests contributing factors, corrective actions, and prevention measures
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyzeIncidentRequest {
  incident_id: string;
  additional_context?: string;
}

interface IncidentAnalysis {
  root_cause_category: string;
  root_cause_description: string;
  contributing_factors: ContributingFactor[];
  corrective_actions: CorrectiveAction[];
  prevention_recommendations: string[];
  training_gaps_identified: string[];
  similar_incident_patterns: string[];
  risk_assessment: RiskAssessment;
}

interface ContributingFactor {
  factor: string;
  category: 'HUMAN' | 'EQUIPMENT' | 'ENVIRONMENT' | 'PROCESS' | 'MANAGEMENT';
  description: string;
}

interface CorrectiveAction {
  action: string;
  priority: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
  responsible_role: string;
  estimated_completion: string;
  verification_method: string;
}

interface RiskAssessment {
  recurrence_likelihood: 'LOW' | 'MEDIUM' | 'HIGH';
  potential_severity: 'MINOR' | 'MODERATE' | 'SERIOUS' | 'CRITICAL';
  risk_score: number;
  risk_level: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
}

const SYSTEM_PROMPT = `You are an expert construction safety investigator specializing in root cause analysis for WVDOH highway construction projects.

Your task is to analyze an incident report and provide comprehensive root cause analysis following industry best practices and OSHA guidelines.

ROOT CAUSE ANALYSIS METHODOLOGY:
Use the "5 Whys" and Fishbone (Ishikawa) diagram approach to identify:
1. Immediate/Direct Cause - What directly caused the incident
2. Basic/Root Causes - Underlying system failures that allowed it to happen
3. Contributing Factors - Conditions that increased risk or severity

CONTRIBUTING FACTOR CATEGORIES:
- HUMAN: Fatigue, lack of training, complacency, rushing, horseplay
- EQUIPMENT: Malfunction, improper maintenance, wrong tool for job
- ENVIRONMENT: Weather, lighting, noise, confined space, terrain
- PROCESS: Inadequate procedures, lack of JSA, poor communication
- MANAGEMENT: Resource constraints, schedule pressure, inadequate supervision

CORRECTIVE ACTION PRIORITIES:
- IMMEDIATE: Must be done before work resumes (hours/days)
- SHORT_TERM: Complete within 1-4 weeks
- LONG_TERM: Systemic changes, policy updates, training programs

RISK SCORING:
- Likelihood × Severity = Risk Score (1-16)
- GREEN: 1-3 (Low priority)
- YELLOW: 4-6 (Monitor)
- ORANGE: 7-9 (Action required)
- RED: 10-16 (Urgent action required)

OUTPUT FORMAT:
Return valid JSON matching the exact schema provided. Be specific and actionable.`;

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

    const { incident_id, additional_context } = await req.json() as AnalyzeIncidentRequest;

    if (!incident_id) {
      throw new Error('incident_id is required');
    }

    // Get incident details with related data
    const { data: incident, error: incidentError } = await supabaseClient
      .from('incidents')
      .select(`
        *,
        projects (name, project_number, project_type)
      `)
      .eq('id', incident_id)
      .single();

    if (incidentError || !incident) {
      throw new Error(`Incident not found: ${incident_id}`);
    }

    console.log(`Analyzing incident: ${incident.incident_number}`);

    // Get employee info if available
    let injuredPerson = 'Unknown worker';
    let experience = 'Unknown';

    if (incident.injured_employee_id) {
      const { data: employee } = await supabaseClient
        .from('employees')
        .select('first_name, last_name, hire_date, job_title')
        .eq('id', incident.injured_employee_id)
        .single();

      if (employee) {
        injuredPerson = `${employee.first_name} ${employee.last_name} (${employee.job_title || 'Unknown role'})`;
        if (employee.hire_date) {
          const hireDate = new Date(employee.hire_date);
          const incidentDate = new Date(incident.incident_date);
          const monthsExperience = Math.floor((incidentDate.getTime() - hireDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
          experience = monthsExperience < 3 ? 'New employee (<3 months)' :
                      monthsExperience < 12 ? `${monthsExperience} months` :
                      `${Math.floor(monthsExperience / 12)} years`;
        }
      }
    }

    // Check if there are similar recent incidents
    const { data: similarIncidents } = await supabaseClient
      .from('incidents')
      .select('incident_number, incident_date, classification, description')
      .eq('organization_id', incident.organization_id)
      .neq('id', incident_id)
      .gte('incident_date', new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .limit(10);

    // Build prompt
    let userPrompt = `Analyze the following construction incident and provide comprehensive root cause analysis:

INCIDENT DETAILS:
- Incident Number: ${incident.incident_number}
- Date: ${incident.incident_date}
- Time: ${incident.incident_time || 'Not recorded'}
- Shift: ${incident.shift || 'Day'}
- Classification: ${incident.classification}
- OSHA Recordable: ${incident.osha_recordable ? 'Yes' : 'No'}

PROJECT CONTEXT:
- Project: ${incident.projects?.name || 'Unknown'}
- Project Number: ${incident.projects?.project_number || 'N/A'}
- Project Type: ${incident.projects?.project_type || 'Highway Construction'}

INJURED PERSON:
- Identity: ${injuredPerson}
- Experience: ${experience}
- Days Away from Work: ${incident.days_away_from_work || 0}
- Days Restricted Duty: ${incident.days_restricted_duty || 0}

INCIDENT DESCRIPTION:
${incident.description}

LOCATION:
${incident.location_description || 'Not specified'}

INJURY DETAILS:
${incident.injury_description || 'Not specified'}
Body Parts Affected: ${incident.body_parts_affected?.join(', ') || 'Not specified'}

IMMEDIATE ACTIONS TAKEN:
${incident.immediate_actions_taken || 'Not documented'}

WITNESS STATEMENTS:
${incident.witness_statements || 'No statements recorded'}
`;

    if (incident.contributing_factors?.length) {
      userPrompt += `\nPRELIMINARY CONTRIBUTING FACTORS NOTED:\n${incident.contributing_factors.join('\n')}`;
    }

    if (additional_context) {
      userPrompt += `\nADDITIONAL CONTEXT FROM INVESTIGATOR:\n${additional_context}`;
    }

    if (similarIncidents && similarIncidents.length > 0) {
      userPrompt += `\n\nSIMILAR INCIDENTS IN PAST YEAR (${similarIncidents.length} found):`;
      for (const sim of similarIncidents.slice(0, 5)) {
        userPrompt += `\n- ${sim.incident_number} (${sim.incident_date}): ${sim.classification} - ${sim.description.substring(0, 100)}...`;
      }
    }

    userPrompt += `

Please analyze this incident and provide:
1. Root cause analysis using 5 Whys methodology
2. All contributing factors categorized appropriately
3. Specific corrective actions with priorities and responsible parties
4. Prevention recommendations to avoid recurrence
5. Training gaps that should be addressed
6. Any patterns with similar incidents
7. Risk assessment for recurrence

Return ONLY valid JSON matching this interface:

{
  "root_cause_category": "string - primary category: HUMAN, EQUIPMENT, ENVIRONMENT, PROCESS, or MANAGEMENT",
  "root_cause_description": "string - clear description of the fundamental root cause",
  "contributing_factors": [
    {
      "factor": "string - brief name",
      "category": "HUMAN | EQUIPMENT | ENVIRONMENT | PROCESS | MANAGEMENT",
      "description": "string - detailed explanation"
    }
  ],
  "corrective_actions": [
    {
      "action": "string - specific action to take",
      "priority": "IMMEDIATE | SHORT_TERM | LONG_TERM",
      "responsible_role": "string - who should implement (e.g., Safety Director, Foreman, PM)",
      "estimated_completion": "string - timeframe (e.g., '24 hours', '2 weeks', '30 days')",
      "verification_method": "string - how to verify completion"
    }
  ],
  "prevention_recommendations": ["string - specific prevention measures"],
  "training_gaps_identified": ["string - training needs identified"],
  "similar_incident_patterns": ["string - patterns with past incidents if any"],
  "risk_assessment": {
    "recurrence_likelihood": "LOW | MEDIUM | HIGH",
    "potential_severity": "MINOR | MODERATE | SERIOUS | CRITICAL",
    "risk_score": "number 1-16",
    "risk_level": "GREEN | YELLOW | ORANGE | RED"
  }
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
        max_tokens: 8192,
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

    console.log('Claude analysis received, parsing JSON...');

    // Extract JSON from response
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let analysis: IncidentAnalysis;
    try {
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', responseText);
      throw new Error('Failed to parse AI response as incident analysis');
    }

    // Update incident with AI analysis
    const { error: updateError } = await supabaseClient
      .from('incidents')
      .update({
        root_cause: analysis.root_cause_description,
        contributing_factors: analysis.contributing_factors.map(f => `[${f.category}] ${f.factor}: ${f.description}`),
        corrective_actions: analysis.corrective_actions.map(ca => ({
          action: ca.action,
          priority: ca.priority,
          assignee: ca.responsible_role,
          due_date: ca.estimated_completion,
          verification: ca.verification_method,
          completed_at: null,
        })),
        updated_at: new Date().toISOString(),
      })
      .eq('id', incident_id);

    if (updateError) {
      console.error('Failed to update incident with analysis:', updateError);
    }

    console.log(`Incident analysis complete: ${incident.incident_number}`);

    return new Response(
      JSON.stringify({
        success: true,
        incident_id,
        incident_number: incident.incident_number,
        analysis,
        message: 'Incident analysis complete - review corrective actions and assign responsibilities',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Incident analysis error:', error);

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
