// =============================================================================
// Edge Function: generate-jsa
// Purpose: AI-powered Job Safety Analysis (JSA) generation from work description
// Analyzes work activities and generates comprehensive hazard analysis
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateJSARequest {
  project_id: string;
  work_description: string;
  work_type?: string;
  work_location?: string;
  equipment_involved?: string[];
  materials_involved?: string[];
  crew_size?: number;
  prepared_by: string;
}

interface JSAStep {
  step_number: number;
  description: string;
  hazards: JSAHazard[];
}

interface JSAHazard {
  hazard_description: string;
  potential_consequence: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  control_hierarchy: 'ELIMINATION' | 'SUBSTITUTION' | 'ENGINEERING' | 'ADMINISTRATIVE' | 'PPE';
  control_description: string;
  verification_method: string;
}

interface GeneratedJSA {
  job_title: string;
  job_description: string;
  work_type: string;
  job_steps: JSAStep[];
  ppe_requirements: PPERequirement[];
  competent_person_required: string[];
  training_required: string[];
  minimum_crew_size: number;
  special_permits_required: string[];
  emergency_procedures: string[];
}

interface PPERequirement {
  ppe_type: string;
  specification: string;
  is_mandatory: boolean;
  notes?: string;
}

const SYSTEM_PROMPT = `You are an expert construction safety professional specializing in Job Safety Analysis (JSA) for WVDOH highway construction projects.

Your task is to analyze a work activity description and generate a comprehensive JSA document that identifies hazards and control measures following OSHA requirements.

IMPORTANT CONTEXT:
- These are West Virginia DOH highway construction projects
- OSHA Construction Standards (29 CFR 1926) apply
- Common work types: excavation, grading, paving, bridge work, drainage, guardrail, utilities
- Competent person requirements per OSHA for specific hazards
- Control Hierarchy (most to least effective): Elimination → Substitution → Engineering → Administrative → PPE

JSA REQUIREMENTS:
1. Break work into sequential steps (typically 5-10 steps)
2. For each step, identify ALL potential hazards
3. Assign risk levels: LOW (minor injury), MEDIUM (moderate injury), HIGH (serious injury), CRITICAL (fatality risk)
4. Provide specific control measures using hierarchy of controls
5. Identify required PPE with specifications (ANSI standards)
6. Identify required competent persons per OSHA
7. List required training/certifications

COMPETENT PERSON TYPES (OSHA-defined):
- excavation: For trenching/excavation >5ft or risk of cave-in
- scaffolding: For scaffold erection/modification
- confined_space: For permit-required confined spaces
- fall_protection: For work at heights >6ft
- crane_rigging: For crane operations and rigging
- electrical: For electrical work
- lockout_tagout: For equipment isolation
- respiratory_protection: For respiratory hazard areas
- hazmat: For hazardous materials
- traffic_control: For work in traffic
- demolition: For demolition activities
- steel_erection: For structural steel work

OUTPUT FORMAT:
Return valid JSON matching the exact schema provided.`;

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

    const request = await req.json() as GenerateJSARequest;

    if (!request.work_description) {
      throw new Error('work_description is required');
    }

    if (!request.project_id || !request.prepared_by) {
      throw new Error('project_id and prepared_by are required');
    }

    // Get project details and organization
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('id, name, project_number, organization_id, wvdoh_district')
      .eq('id', request.project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${request.project_id}`);
    }

    console.log(`Generating JSA for project: ${project.name}`);

    // Build context-aware prompt
    let userPrompt = `Generate a comprehensive Job Safety Analysis (JSA) for the following work activity:

PROJECT CONTEXT:
- Project: ${project.name}
- Project Number: ${project.project_number}
- WVDOH District: ${project.wvdoh_district || 'N/A'}

WORK ACTIVITY:
${request.work_description}
`;

    if (request.work_type) {
      userPrompt += `\nWork Type: ${request.work_type}`;
    }
    if (request.work_location) {
      userPrompt += `\nLocation: ${request.work_location}`;
    }
    if (request.equipment_involved?.length) {
      userPrompt += `\nEquipment: ${request.equipment_involved.join(', ')}`;
    }
    if (request.materials_involved?.length) {
      userPrompt += `\nMaterials: ${request.materials_involved.join(', ')}`;
    }
    if (request.crew_size) {
      userPrompt += `\nEstimated Crew Size: ${request.crew_size}`;
    }

    userPrompt += `

Please generate a complete JSA document. Return ONLY valid JSON matching this TypeScript interface:

{
  "job_title": "string - concise title for this work activity",
  "job_description": "string - detailed description of the work",
  "work_type": "string - category: Excavation, Concrete, Paving, Bridge, Drainage, etc.",
  "job_steps": [
    {
      "step_number": "number",
      "description": "string - what is being done in this step",
      "hazards": [
        {
          "hazard_description": "string - specific hazard",
          "potential_consequence": "string - what could happen",
          "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
          "control_hierarchy": "ELIMINATION | SUBSTITUTION | ENGINEERING | ADMINISTRATIVE | PPE",
          "control_description": "string - specific control measure",
          "verification_method": "string - how to verify control is in place"
        }
      ]
    }
  ],
  "ppe_requirements": [
    {
      "ppe_type": "string - Hard Hat, Safety Glasses, etc.",
      "specification": "string - ANSI standard or specification",
      "is_mandatory": "boolean",
      "notes": "string? - when required or special notes"
    }
  ],
  "competent_person_required": ["excavation", "fall_protection", etc.],
  "training_required": ["string - required certifications/training"],
  "minimum_crew_size": "number",
  "special_permits_required": ["string - any permits needed"],
  "emergency_procedures": ["string - key emergency response steps"]
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

    console.log('Claude response received, parsing JSON...');

    // Extract JSON from response
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let generatedJSA: GeneratedJSA;
    try {
      generatedJSA = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse Claude response as JSON:', responseText);
      throw new Error('Failed to parse AI response as JSA document');
    }

    // Create JSA record in database
    const { data: jsa, error: jsaError } = await supabaseClient
      .from('job_safety_analysis')
      .insert({
        organization_id: project.organization_id,
        project_id: request.project_id,
        job_title: generatedJSA.job_title,
        job_description: generatedJSA.job_description,
        work_type: generatedJSA.work_type,
        work_location: request.work_location,
        job_steps: generatedJSA.job_steps,
        equipment_required: request.equipment_involved || [],
        materials_involved: request.materials_involved || [],
        competent_person_required: generatedJSA.competent_person_required,
        training_required: generatedJSA.training_required,
        minimum_crew_size: generatedJSA.minimum_crew_size,
        status: 'DRAFT',
        prepared_by: request.prepared_by,
        prepared_at: new Date().toISOString(),
        ai_generated: true,
        ai_generation_source: 'work_description',
      })
      .select('id, jsa_number')
      .single();

    if (jsaError || !jsa) {
      throw new Error(`Failed to create JSA: ${jsaError?.message}`);
    }

    // Insert hazard controls
    const hazardControls: Array<{
      jsa_id: string;
      step_number: number;
      hazard_description: string;
      potential_consequence: string;
      risk_level: string;
      control_hierarchy: string;
      control_description: string;
      verification_method: string;
    }> = [];

    for (const step of generatedJSA.job_steps) {
      for (const hazard of step.hazards) {
        hazardControls.push({
          jsa_id: jsa.id,
          step_number: step.step_number,
          hazard_description: hazard.hazard_description,
          potential_consequence: hazard.potential_consequence,
          risk_level: hazard.risk_level,
          control_hierarchy: hazard.control_hierarchy,
          control_description: hazard.control_description,
          verification_method: hazard.verification_method,
        });
      }
    }

    if (hazardControls.length > 0) {
      const { error: controlsError } = await supabaseClient
        .from('jsa_hazard_controls')
        .insert(hazardControls);

      if (controlsError) {
        console.error('Failed to insert hazard controls:', controlsError);
      }
    }

    // Insert PPE requirements
    if (generatedJSA.ppe_requirements?.length > 0) {
      const ppeRecords = generatedJSA.ppe_requirements.map(ppe => ({
        jsa_id: jsa.id,
        ppe_type: ppe.ppe_type,
        specification: ppe.specification,
        is_mandatory: ppe.is_mandatory,
        notes: ppe.notes,
      }));

      const { error: ppeError } = await supabaseClient
        .from('jsa_ppe_requirements')
        .insert(ppeRecords);

      if (ppeError) {
        console.error('Failed to insert PPE requirements:', ppeError);
      }
    }

    console.log(`JSA generated successfully: ${jsa.jsa_number}`);

    return new Response(
      JSON.stringify({
        success: true,
        jsa_id: jsa.id,
        jsa_number: jsa.jsa_number,
        generated_data: generatedJSA,
        message: 'JSA generated successfully - review and approve before use',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('JSA generation error:', error);

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
