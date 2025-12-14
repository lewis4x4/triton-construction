// Supabase Edge Function: suggest-cost-code-mapping
// AI-assisted mapping of WVDOH items to assembly templates for cost tracking
// Analyzes item descriptions and suggests appropriate assembly templates

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MappingRequest {
  item_codes?: string[]; // Specific items to map, or all unlinked if not provided
  work_category?: string; // Filter to specific category
  auto_apply?: boolean; // Automatically apply high-confidence mappings
  confidence_threshold?: number; // Minimum confidence to auto-apply (default 0.85)
}

interface AssemblyTemplate {
  id: string;
  name: string;
  code: string;
  description: string;
  wvdoh_item_number: string | null;
  wvdoh_item_pattern: string | null;
  work_category: string;
  output_unit: string;
  total_cost_per_unit: number;
}

interface WVDOHItem {
  item_code: string;
  description: string;
  short_description: string | null;
  unit_of_measure: string;
  division: string;
  work_category: string;
  typical_unit_price_median: number | null;
  default_assembly_template_id: string | null;
}

interface MappingSuggestion {
  item_code: string;
  item_description: string;
  suggested_template_id: string;
  suggested_template_name: string;
  confidence: number;
  reasoning: string;
  cost_variance_pct: number | null;
  applied: boolean;
}

const MAPPING_PROMPT = `You are an expert construction cost estimator specializing in WVDOH highway projects.

Your task is to match WVDOH bid items to internal assembly templates for cost tracking purposes.

An assembly template represents a "recipe" for building one unit of a bid item, including:
- Labor costs (crew composition, hours)
- Equipment costs (machines, fuel, maintenance)
- Material costs (supplies, consumables)
- Subcontractor costs (if force-sub)

Match items based on:
1. Work category alignment (EARTHWORK, PAVING, DRAINAGE, etc.)
2. Unit of measure compatibility (CY, TON, LF, EA, etc.)
3. Description similarity (excavation types, pipe sizes, etc.)
4. Cost reasonableness (assembly cost should be close to typical bid price)

For each WVDOH item, suggest the best matching assembly template.

Respond with a JSON array of suggestions:
[
  {
    "item_code": "item code",
    "suggested_template_id": "template UUID",
    "confidence": 0.0-1.0,
    "reasoning": "Brief explanation of match logic"
  }
]

Confidence levels:
- 0.95-1.0: Exact match (same WVDOH item number or nearly identical description)
- 0.80-0.94: Strong match (same category, compatible unit, similar work)
- 0.60-0.79: Moderate match (reasonable proxy, may need adjustment)
- Below 0.60: Weak match (use with caution)`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body: MappingRequest = await req.json();
    const {
      item_codes,
      work_category,
      auto_apply = false,
      confidence_threshold = 0.85
    } = body;

    // Fetch assembly templates
    const { data: templates, error: templateError } = await supabaseClient
      .from('bid_assembly_templates')
      .select('id, name, code, description, wvdoh_item_number, wvdoh_item_pattern, work_category, output_unit, total_cost_per_unit')
      .eq('is_active', true);

    if (templateError) throw templateError;

    // Fetch WVDOH items to map
    let itemsQuery = supabaseClient
      .from('master_wvdoh_items')
      .select('item_code, description, short_description, unit_of_measure, division, work_category, typical_unit_price_median, default_assembly_template_id');

    // Apply filters
    if (item_codes && item_codes.length > 0) {
      itemsQuery = itemsQuery.in('item_code', item_codes);
    } else {
      // Only get unlinked items
      itemsQuery = itemsQuery.is('default_assembly_template_id', null);
    }

    if (work_category) {
      itemsQuery = itemsQuery.eq('work_category', work_category);
    }

    const { data: items, error: itemsError } = await itemsQuery.limit(50);

    if (itemsError) throw itemsError;

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No unlinked items to process',
          suggestions: [],
          stats: { processed: 0, auto_applied: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First pass: Direct matches based on WVDOH item number
    const suggestions: MappingSuggestion[] = [];
    const itemsNeedingAI: WVDOHItem[] = [];

    for (const item of items as WVDOHItem[]) {
      // Check for direct WVDOH item number match
      const directMatch = templates?.find(t =>
        t.wvdoh_item_number === item.item_code ||
        (t.wvdoh_item_pattern && new RegExp(t.wvdoh_item_pattern).test(item.item_code))
      );

      if (directMatch) {
        const costVariance = item.typical_unit_price_median && directMatch.total_cost_per_unit
          ? ((directMatch.total_cost_per_unit - item.typical_unit_price_median) / item.typical_unit_price_median * 100)
          : null;

        suggestions.push({
          item_code: item.item_code,
          item_description: item.description,
          suggested_template_id: directMatch.id,
          suggested_template_name: directMatch.name,
          confidence: 0.98,
          reasoning: 'Direct WVDOH item number match',
          cost_variance_pct: costVariance,
          applied: false
        });
      } else {
        // Check for category + unit match
        const categoryMatches = templates?.filter(t =>
          t.work_category === item.work_category &&
          t.output_unit === item.unit_of_measure
        ) || [];

        if (categoryMatches.length === 1) {
          // Single match in category - good confidence
          const match = categoryMatches[0]!;
          const costVariance = item.typical_unit_price_median && match.total_cost_per_unit
            ? ((match.total_cost_per_unit - item.typical_unit_price_median) / item.typical_unit_price_median * 100)
            : null;

          suggestions.push({
            item_code: item.item_code,
            item_description: item.description,
            suggested_template_id: match.id,
            suggested_template_name: match.name,
            confidence: 0.82,
            reasoning: `Category match (${item.work_category}) with compatible unit (${item.unit_of_measure})`,
            cost_variance_pct: costVariance,
            applied: false
          });
        } else if (categoryMatches.length > 1) {
          // Multiple matches - use AI to pick best
          itemsNeedingAI.push(item);
        } else {
          // No category match - try broader matching with AI
          itemsNeedingAI.push(item);
        }
      }
    }

    // Second pass: AI-assisted matching for remaining items
    if (itemsNeedingAI.length > 0 && Deno.env.get('ANTHROPIC_API_KEY')) {
      try {
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            messages: [{
              role: 'user',
              content: `${MAPPING_PROMPT}

WVDOH Items to Match:
${JSON.stringify(itemsNeedingAI.map(i => ({
  item_code: i.item_code,
  description: i.description,
  unit: i.unit_of_measure,
  category: i.work_category,
  typical_price: i.typical_unit_price_median
})), null, 2)}

Available Assembly Templates:
${JSON.stringify(templates?.map(t => ({
  id: t.id,
  name: t.name,
  code: t.code,
  category: t.work_category,
  unit: t.output_unit,
  cost_per_unit: t.total_cost_per_unit
})), null, 2)}

Return ONLY the JSON array, no other text.`
            }]
          })
        });

        if (anthropicResponse.ok) {
          const aiResult = await anthropicResponse.json();
          const content = aiResult.content[0]?.text || '[]';

          // Extract JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const aiSuggestions = JSON.parse(jsonMatch[0]);

            for (const aiSugg of aiSuggestions) {
              const item = itemsNeedingAI.find(i => i.item_code === aiSugg.item_code);
              const template = templates?.find(t => t.id === aiSugg.suggested_template_id);

              if (item && template) {
                const costVariance = item.typical_unit_price_median && template.total_cost_per_unit
                  ? ((template.total_cost_per_unit - item.typical_unit_price_median) / item.typical_unit_price_median * 100)
                  : null;

                suggestions.push({
                  item_code: item.item_code,
                  item_description: item.description,
                  suggested_template_id: template.id,
                  suggested_template_name: template.name,
                  confidence: aiSugg.confidence,
                  reasoning: aiSugg.reasoning,
                  cost_variance_pct: costVariance,
                  applied: false
                });
              }
            }
          }
        }
      } catch (aiError) {
        console.error('AI matching error:', aiError);
        // Continue without AI suggestions
      }
    }

    // Auto-apply high-confidence mappings if requested
    let autoAppliedCount = 0;
    if (auto_apply) {
      for (const sugg of suggestions) {
        if (sugg.confidence >= confidence_threshold) {
          const { error: updateError } = await supabaseClient
            .from('master_wvdoh_items')
            .update({ default_assembly_template_id: sugg.suggested_template_id })
            .eq('item_code', sugg.item_code);

          if (!updateError) {
            sugg.applied = true;
            autoAppliedCount++;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestions: suggestions.sort((a, b) => b.confidence - a.confidence),
        stats: {
          processed: items.length,
          suggestions_generated: suggestions.length,
          auto_applied: autoAppliedCount,
          high_confidence: suggestions.filter(s => s.confidence >= 0.85).length,
          medium_confidence: suggestions.filter(s => s.confidence >= 0.60 && s.confidence < 0.85).length,
          low_confidence: suggestions.filter(s => s.confidence < 0.60).length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cost code mapping error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
