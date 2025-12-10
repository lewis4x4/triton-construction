import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IncompleteItem {
  id: string;
  line_number: number;
  item_number: string;
  description: string;
  quantity: number;
  unit: string;
  pricing_status: string;
  ai_suggested_unit_price: number | null;
  final_unit_price: number | null;
  pricing_reviewed: boolean;
}

interface ClarificationQuestion {
  item_id: string;
  line_number: number;
  item_number: string;
  description: string;
  question: string;
  type: 'price_entry' | 'confirm_or_edit' | 'review_required';
  current_value: number | null;
  suggested_value: number | null;
  quantity: number;
  unit: string;
}

interface ValidationResult {
  valid: boolean;
  status: 'READY' | 'NEEDS_CLARIFICATION' | 'INCOMPLETE';
  total_items: number;
  complete_count: number;
  incomplete_count: number;
  completion_percentage: number;
  questions?: ClarificationQuestion[];
  message: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { bidProjectId } = await req.json();

    if (!bidProjectId) {
      return new Response(
        JSON.stringify({ error: 'bidProjectId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to the project
    const { data: project, error: projectError } = await supabaseClient
      .from('bid_projects')
      .select('id, organization_id, project_name, status, letting_date')
      .eq('id', bidProjectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Bid project not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all line items for the project
    const { data: lineItems, error: itemsError } = await supabaseAdmin
      .from('bid_line_items')
      .select(`
        id,
        line_number,
        item_number,
        description,
        quantity,
        unit,
        ai_suggested_unit_price,
        final_unit_price,
        pricing_reviewed,
        base_unit_cost
      `)
      .eq('bid_project_id', bidProjectId)
      .order('line_number');

    if (itemsError) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch line items: ${itemsError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lineItems || lineItems.length === 0) {
      return new Response(
        JSON.stringify({
          valid: false,
          status: 'INCOMPLETE',
          total_items: 0,
          complete_count: 0,
          incomplete_count: 0,
          completion_percentage: 0,
          message: 'No line items found for this bid project',
        } as ValidationResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compute pricing status for each item (client-side calculation to match UI)
    const computePricingStatus = (item: typeof lineItems[0]): string => {
      if (item.final_unit_price != null && item.pricing_reviewed === true) {
        return 'COMPLETE';
      }
      if (item.pricing_reviewed === true && item.final_unit_price == null) {
        return 'INCOMPLETE';
      }
      if (item.ai_suggested_unit_price != null) {
        return 'AI_SUGGESTED';
      }
      if (item.base_unit_cost != null) {
        return 'MANUAL_REQUIRED';
      }
      return 'NEEDS_PRICING';
    };

    // Categorize items
    const itemsWithStatus = lineItems.map(item => ({
      ...item,
      pricing_status: computePricingStatus(item),
    }));

    const completeItems = itemsWithStatus.filter(i => i.pricing_status === 'COMPLETE');
    const incompleteItems = itemsWithStatus.filter(i => i.pricing_status !== 'COMPLETE');

    const totalCount = itemsWithStatus.length;
    const completeCount = completeItems.length;
    const incompleteCount = incompleteItems.length;
    const completionPercentage = Math.round((completeCount / totalCount) * 100);

    // If all items are complete, validation passes
    if (incompleteCount === 0) {
      return new Response(
        JSON.stringify({
          valid: true,
          status: 'READY',
          total_items: totalCount,
          complete_count: completeCount,
          incomplete_count: 0,
          completion_percentage: 100,
          message: 'All line items have complete pricing. Ready for submission.',
        } as ValidationResult),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate clarification questions for incomplete items
    const questions: ClarificationQuestion[] = incompleteItems.map(item => {
      let question: string;
      let type: ClarificationQuestion['type'];

      switch (item.pricing_status) {
        case 'NEEDS_PRICING':
          question = `"${item.description}" has no pricing data. What is your unit price?`;
          type = 'price_entry';
          break;

        case 'AI_SUGGESTED':
          question = `"${item.description}" has an AI suggestion of $${item.ai_suggested_unit_price?.toFixed(2)}/${item.unit}. Accept or enter a different price.`;
          type = 'confirm_or_edit';
          break;

        case 'MANUAL_REQUIRED':
          question = `"${item.description}" requires manual pricing. What is your unit price?`;
          type = 'price_entry';
          break;

        case 'INCOMPLETE':
          question = `"${item.description}" is marked as reviewed but has no final price. Enter the unit price or confirm $0.`;
          type = 'confirm_or_edit';
          break;

        default:
          question = `"${item.description}" needs pricing review.`;
          type = 'review_required';
      }

      return {
        item_id: item.id,
        line_number: item.line_number,
        item_number: item.item_number,
        description: item.description,
        question,
        type,
        current_value: item.final_unit_price,
        suggested_value: item.ai_suggested_unit_price,
        quantity: item.quantity,
        unit: item.unit,
      };
    });

    // Sort questions by urgency (NEEDS_PRICING first, then MANUAL_REQUIRED, etc.)
    const priorityOrder: Record<string, number> = {
      'price_entry': 1,
      'confirm_or_edit': 2,
      'review_required': 3,
    };
    questions.sort((a, b) => {
      const aPriority = priorityOrder[a.type] || 99;
      const bPriority = priorityOrder[b.type] || 99;
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.line_number - b.line_number;
    });

    return new Response(
      JSON.stringify({
        valid: false,
        status: 'NEEDS_CLARIFICATION',
        total_items: totalCount,
        complete_count: completeCount,
        incomplete_count: incompleteCount,
        completion_percentage: completionPercentage,
        questions,
        message: `${incompleteCount} of ${totalCount} items need pricing attention before submission.`,
      } as ValidationResult),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validate-bid-submission error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred during validation' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
