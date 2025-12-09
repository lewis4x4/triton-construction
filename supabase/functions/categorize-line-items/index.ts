// Supabase Edge Function: categorize-line-items
// Categorizes bid line items by matching against master_wvdoh_items and using AI for fuzzy matching
// Updates work_category, risk_level, governing specs, and AI confidence scores

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategorizeRequest {
  bid_project_id: string;
  force_recategorize?: boolean; // Re-categorize even if already done
  batch_size?: number; // Number of items to process (default 50)
}

// Valid enum values from database
const WORK_CATEGORIES = [
  'MOBILIZATION', 'DEMOLITION', 'EARTHWORK', 'DRAINAGE', 'SUBSTRUCTURE',
  'SUPERSTRUCTURE', 'DECK', 'APPROACH_SLABS', 'PAVEMENT', 'GUARDRAIL_BARRIER',
  'SIGNING_STRIPING', 'MOT', 'ENVIRONMENTAL', 'UTILITIES', 'LANDSCAPING',
  'GENERAL_CONDITIONS', 'OTHER'
] as const;

const SEVERITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

const OPPORTUNITY_TYPES = [
  'VALUE_ENGINEERING', 'MEANS_METHODS', 'QUANTITY_UPSIDE', 'EARLY_COMPLETION',
  'MATERIAL_SUBSTITUTION', 'EQUIPMENT_EFFICIENCY', 'CREW_OPTIMIZATION'
] as const;

type WorkCategory = typeof WORK_CATEGORIES[number];
type Severity = typeof SEVERITY_LEVELS[number];
type OpportunityType = typeof OPPORTUNITY_TYPES[number];

interface MasterItem {
  item_code: string;
  description: string;
  short_description: string | null;
  unit_of_measure: string;
  division: string | null;
  work_category: string | null;
  typical_unit_price_low: number | null;
  typical_unit_price_median: number | null;
  typical_unit_price_high: number | null;
  is_lump_sum: boolean | null;
  is_force_sub: boolean | null;
  is_weather_sensitive: boolean | null;
  is_critical_path_typical: boolean | null;
  common_risk_factors: string[] | null;
  typical_productivity_notes: string | null;
  specs_section: string | null;
}

interface LineItem {
  id: string;
  line_number: number;
  item_number: string;
  description: string;
  quantity: number;
  unit: string;
  work_category: string | null;
}

interface CategorizedItem {
  work_category: WorkCategory;
  risk_level: Severity;
  risk_explanation: string;
  opportunity_flag: OpportunityType | null;
  opportunity_explanation: string | null;
  governing_spec_sections: string[];
  ai_confidence_score: number;
  ai_categorization_confidence: number;
  matched_master_item_code: string | null;
}

const CATEGORIZATION_PROMPT = `You are an expert construction estimator specializing in WVDOH highway and bridge projects.

Your task is to categorize bid line items and assess their risk levels.

WORK CATEGORIES (use exactly these values):
- MOBILIZATION: Project setup, bonding, insurance, site offices
- DEMOLITION: Removal of existing structures, pavement, utilities (also called CLEARING in some migrations)
- EARTHWORK: Excavation, embankment, grading, unsuitable material
- DRAINAGE: Pipes, inlets, headwalls, culverts, storm drainage
- SUBSTRUCTURE: Bridge foundations, abutments, piers, footings
- SUPERSTRUCTURE: Bridge beams, girders, structural steel
- DECK: Bridge deck concrete, reinforcing, overlays
- APPROACH_SLABS: Bridge approach slabs, sleeper slabs
- PAVEMENT: Asphalt, concrete paving, base courses
- GUARDRAIL_BARRIER: Guardrail, barrier, end treatments, attenuators
- SIGNING_STRIPING: Signs, pavement markings, delineators
- MOT: Maintenance of traffic, flagging, temp barriers, traffic control
- ENVIRONMENTAL: Environmental monitoring, erosion control, stream work
- UTILITIES: Utility relocation, adjustment, coordination
- LANDSCAPING: Seeding, mulching, sod, topsoil
- GENERAL_CONDITIONS: Insurance, bonds, general requirements
- OTHER: Items that don't fit other categories

RISK LEVELS (use exactly these values):
- LOW: Standard item, well-defined, minimal uncertainty
- MEDIUM: Some uncertainty in quantity or conditions
- HIGH: Significant uncertainty, weather sensitive, or specialty work
- CRITICAL: Major risk item requiring special attention

OPPORTUNITY TYPES (use exactly these values if applicable, or null if none):
- VALUE_ENGINEERING: Potential for design optimization
- MEANS_METHODS: Alternative construction approach possible
- QUANTITY_UPSIDE: Potential quantity savings
- EARLY_COMPLETION: Schedule acceleration possible
- MATERIAL_SUBSTITUTION: Alternative materials available
- EQUIPMENT_EFFICIENCY: Better equipment utilization possible
- CREW_OPTIMIZATION: Crew productivity improvement possible

For each line item, provide:
{
  "categorizations": [
    {
      "line_item_id": "uuid",
      "work_category": "EXACTLY one category from above",
      "risk_level": "LOW|MEDIUM|HIGH|CRITICAL",
      "risk_explanation": "Brief explanation of risk factors",
      "opportunity_flag": "opportunity type or null",
      "opportunity_explanation": "explanation if opportunity exists, or null",
      "governing_spec_sections": ["spec section references like '401', '501', etc."],
      "confidence": 0-100
    }
  ]
}

Consider:
1. Item number prefixes often indicate division (401xxx = paving, 501xxx = concrete, etc.)
2. Weather-sensitive items (paving, concrete) are higher risk
3. Lump sum items have quantity risk
4. Force-sub items (MOT, striping) have subcontractor dependency risk
5. Items with "REMOVE" or "EXCAVATION" often have unknown conditions risk
6. Environmental items have permit and seasonal restriction risk

Always respond with valid JSON only.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // Parse request
    const {
      bid_project_id,
      force_recategorize = false,
      batch_size = 50
    }: CategorizeRequest = await req.json();

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

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('bid_projects')
      .select('id, project_name, state_project_number')
      .eq('id', bid_project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Project not found', details: projectError }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get line items that need categorization
    let itemsQuery = supabase
      .from('bid_line_items')
      .select('id, line_number, item_number, description, quantity, unit, work_category')
      .eq('bid_project_id', bid_project_id)
      .order('line_number', { ascending: true })
      .limit(batch_size);

    if (!force_recategorize) {
      // Only get items without categorization
      itemsQuery = itemsQuery.is('work_category', null);
    }

    const { data: lineItems, error: itemsError } = await itemsQuery;

    if (itemsError) {
      throw new Error(`Failed to fetch line items: ${itemsError.message}`);
    }

    if (!lineItems || lineItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No line items need categorization',
          items_processed: 0,
          items_remaining: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all master WVDOH items for matching
    const { data: masterItems, error: masterError } = await supabase
      .from('master_wvdoh_items')
      .select('*');

    if (masterError) {
      console.warn('Could not fetch master items:', masterError.message);
    }

    // Create a lookup map for master items
    const masterItemsMap = new Map<string, MasterItem>();
    if (masterItems) {
      for (const item of masterItems) {
        masterItemsMap.set(item.item_code, item);
      }
    }

    // First pass: Direct matching against master items
    const directMatches: Map<string, { item: LineItem; master: MasterItem }> = new Map();
    const needsAiCategorization: LineItem[] = [];

    for (const item of lineItems as LineItem[]) {
      // Try exact match on item_number
      const masterMatch = masterItemsMap.get(item.item_number);
      if (masterMatch) {
        directMatches.set(item.id, { item, master: masterMatch });
      } else {
        // Try matching by prefix (first 6 characters is common)
        const prefix = item.item_number.substring(0, 6);
        const prefixMatch = masterItemsMap.get(prefix);
        if (prefixMatch) {
          directMatches.set(item.id, { item, master: prefixMatch });
        } else {
          needsAiCategorization.push(item);
        }
      }
    }

    // Process direct matches
    const directMatchUpdates: Array<{
      id: string;
      updates: Partial<CategorizedItem> & { matched_master_item_code: string };
    }> = [];

    for (const [itemId, { master }] of directMatches) {
      // Determine risk level from master item attributes
      let riskLevel: Severity = 'LOW';
      const riskFactors: string[] = [];

      if (master.is_weather_sensitive) {
        riskLevel = 'MEDIUM';
        riskFactors.push('Weather sensitive');
      }
      if (master.is_lump_sum) {
        riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : 'HIGH';
        riskFactors.push('Lump sum (quantity risk)');
      }
      if (master.is_force_sub) {
        riskFactors.push('Subcontractor dependent');
      }
      if (master.is_critical_path_typical) {
        riskLevel = riskLevel === 'LOW' ? 'MEDIUM' : riskLevel;
        riskFactors.push('Critical path item');
      }
      if (master.common_risk_factors && master.common_risk_factors.length > 0) {
        riskFactors.push(...master.common_risk_factors);
        if (master.common_risk_factors.length >= 3) {
          riskLevel = 'HIGH';
        }
      }

      directMatchUpdates.push({
        id: itemId,
        updates: {
          work_category: (master.work_category as WorkCategory) || 'OTHER',
          risk_level: riskLevel,
          risk_explanation: riskFactors.length > 0
            ? riskFactors.join('; ')
            : 'Standard item with typical risks',
          governing_spec_sections: master.specs_section ? [master.specs_section] : [],
          ai_confidence_score: 95, // High confidence for direct match
          ai_categorization_confidence: 95,
          matched_master_item_code: master.item_code,
          opportunity_flag: null,
          opportunity_explanation: null,
        },
      });
    }

    // Second pass: AI categorization for non-matching items
    let aiCategorizations: Map<string, CategorizedItem> = new Map();

    if (needsAiCategorization.length > 0) {
      // Prepare context with master items for reference
      const masterItemsContext = masterItems?.slice(0, 50).map(m => ({
        code: m.item_code,
        desc: m.short_description || m.description,
        category: m.work_category,
        spec: m.specs_section,
      })) || [];

      const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: CATEGORIZATION_PROMPT,
          messages: [
            {
              role: 'user',
              content: `Categorize the following ${needsAiCategorization.length} bid line items:

LINE ITEMS TO CATEGORIZE:
${JSON.stringify(needsAiCategorization.map(i => ({
  line_item_id: i.id,
  item_number: i.item_number,
  description: i.description,
  quantity: i.quantity,
  unit: i.unit,
})), null, 2)}

REFERENCE MASTER ITEMS (for context on WVDOH item numbering):
${JSON.stringify(masterItemsContext, null, 2)}

Categorize each item with work_category, risk_level, and other fields as specified.`,
            },
          ],
        }),
      });

      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        console.error('Claude API error:', errorText);
        // Continue with direct matches only if AI fails
      } else {
        const claudeResult = await claudeResponse.json();
        const responseText = claudeResult.content[0]?.text;

        if (responseText) {
          try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.categorizations && Array.isArray(parsed.categorizations)) {
                for (const cat of parsed.categorizations) {
                  // Validate and sanitize
                  if (cat.line_item_id && WORK_CATEGORIES.includes(cat.work_category)) {
                    const riskLevel = SEVERITY_LEVELS.includes(cat.risk_level)
                      ? cat.risk_level
                      : 'MEDIUM';
                    const opportunityFlag = cat.opportunity_flag && OPPORTUNITY_TYPES.includes(cat.opportunity_flag)
                      ? cat.opportunity_flag
                      : null;

                    aiCategorizations.set(cat.line_item_id, {
                      work_category: cat.work_category,
                      risk_level: riskLevel,
                      risk_explanation: cat.risk_explanation || 'AI-assessed risk factors',
                      opportunity_flag: opportunityFlag,
                      opportunity_explanation: cat.opportunity_explanation || null,
                      governing_spec_sections: Array.isArray(cat.governing_spec_sections)
                        ? cat.governing_spec_sections
                        : [],
                      ai_confidence_score: cat.confidence || 75,
                      ai_categorization_confidence: cat.confidence || 75,
                      matched_master_item_code: null,
                    });
                  }
                }
              }
            }
          } catch (parseError) {
            console.error('Failed to parse AI categorizations:', parseError);
          }
        }
      }
    }

    // Apply all updates
    let successCount = 0;
    let failCount = 0;

    // Update direct matches
    for (const { id, updates } of directMatchUpdates) {
      const { error: updateError } = await supabase
        .from('bid_line_items')
        .update({
          work_category: updates.work_category,
          risk_level: updates.risk_level,
          risk_explanation: updates.risk_explanation,
          governing_spec_sections: updates.governing_spec_sections,
          ai_confidence_score: updates.ai_confidence_score,
          ai_categorization_confidence: updates.ai_categorization_confidence,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) {
        console.error(`Failed to update item ${id}:`, updateError);
        failCount++;
      } else {
        successCount++;
      }
    }

    // Update AI categorizations
    for (const [itemId, cat] of aiCategorizations) {
      const { error: updateError } = await supabase
        .from('bid_line_items')
        .update({
          work_category: cat.work_category,
          risk_level: cat.risk_level,
          risk_explanation: cat.risk_explanation,
          opportunity_flag: cat.opportunity_flag,
          opportunity_explanation: cat.opportunity_explanation,
          governing_spec_sections: cat.governing_spec_sections,
          ai_confidence_score: cat.ai_confidence_score,
          ai_categorization_confidence: cat.ai_categorization_confidence,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (updateError) {
        console.error(`Failed to update AI-categorized item ${itemId}:`, updateError);
        failCount++;
      } else {
        successCount++;
      }
    }

    // Check how many items remain
    const { count: remainingCount } = await supabase
      .from('bid_line_items')
      .select('*', { count: 'exact', head: true })
      .eq('bid_project_id', bid_project_id)
      .is('work_category', null);

    const duration = Date.now() - startTime;

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        bid_project_id,
        items_processed: successCount,
        items_failed: failCount,
        direct_matches: directMatchUpdates.length,
        ai_categorized: aiCategorizations.size,
        items_remaining: remainingCount || 0,
        duration_ms: duration,
        summary: {
          by_category: [...new Set([
            ...directMatchUpdates.map(d => d.updates.work_category),
            ...Array.from(aiCategorizations.values()).map(c => c.work_category),
          ])].reduce((acc, cat) => {
            acc[cat] = (directMatchUpdates.filter(d => d.updates.work_category === cat).length +
              Array.from(aiCategorizations.values()).filter(c => c.work_category === cat).length);
            return acc;
          }, {} as Record<string, number>),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Categorization error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        error: 'Line item categorization failed',
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
