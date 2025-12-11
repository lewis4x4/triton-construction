// Supabase Edge Function: generate-work-packages
// Groups bid line items into logical work packages for estimator assignment
// Uses AI to suggest optimal package groupings based on work category and dependencies

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  bid_project_id: string;
  regenerate?: boolean; // Delete existing packages and regenerate
  use_ai_grouping?: boolean; // Use AI for intelligent grouping (default: true)
}

// Valid work categories from database
const WORK_CATEGORIES = [
  'MOBILIZATION', 'DEMOLITION', 'EARTHWORK', 'DRAINAGE', 'SUBSTRUCTURE',
  'SUPERSTRUCTURE', 'DECK', 'APPROACH_SLABS', 'PAVEMENT', 'GUARDRAIL_BARRIER',
  'SIGNING_STRIPING', 'MOT', 'ENVIRONMENTAL', 'UTILITIES', 'LANDSCAPING',
  'GENERAL_CONDITIONS', 'OTHER'
] as const;

type WorkCategory = typeof WORK_CATEGORIES[number];

// Default package names and codes by category
const PACKAGE_CONFIG: Record<WorkCategory, { name: string; code: string; order: number }> = {
  MOBILIZATION: { name: 'Mobilization & General', code: 'MOB', order: 1 },
  DEMOLITION: { name: 'Demolition & Removals', code: 'DEM', order: 2 },
  EARTHWORK: { name: 'Earthwork', code: 'EW', order: 3 },
  DRAINAGE: { name: 'Drainage & Storm', code: 'DRN', order: 4 },
  SUBSTRUCTURE: { name: 'Bridge Substructure', code: 'SUB', order: 5 },
  SUPERSTRUCTURE: { name: 'Bridge Superstructure', code: 'SUP', order: 6 },
  DECK: { name: 'Bridge Deck', code: 'DCK', order: 7 },
  APPROACH_SLABS: { name: 'Approach Slabs', code: 'APR', order: 8 },
  PAVEMENT: { name: 'Paving', code: 'PAV', order: 9 },
  GUARDRAIL_BARRIER: { name: 'Guardrail & Barrier', code: 'GRB', order: 10 },
  SIGNING_STRIPING: { name: 'Signing & Striping', code: 'SGN', order: 11 },
  MOT: { name: 'Maintenance of Traffic', code: 'MOT', order: 12 },
  ENVIRONMENTAL: { name: 'Environmental', code: 'ENV', order: 13 },
  UTILITIES: { name: 'Utilities', code: 'UTL', order: 14 },
  LANDSCAPING: { name: 'Landscaping & Restoration', code: 'LND', order: 15 },
  GENERAL_CONDITIONS: { name: 'General Conditions', code: 'GEN', order: 16 },
  OTHER: { name: 'Miscellaneous', code: 'MSC', order: 17 },
};

interface LineItem {
  id: string;
  line_number: number;
  item_number: string;
  description: string;
  quantity: number;
  unit: string;
  work_category: WorkCategory | null;
  final_unit_price: number | null;
}

interface WorkPackage {
  id?: string;
  bid_project_id: string;
  package_number: number;
  package_name: string;
  package_code: string;
  description: string;
  work_category: WorkCategory;
  status: string;
  total_items: number;
  sort_order: number;
  ai_generated: boolean;
}

const AI_GROUPING_PROMPT = `You are an expert construction estimator organizing bid line items into work packages.

Your task is to analyze the line items and suggest optimal groupings that:
1. Keep related work together for efficient estimating
2. Consider dependencies and sequencing
3. Create manageable package sizes (ideally 10-50 items per package)
4. Split large categories into sub-packages if beneficial

For each suggested package, provide:
{
  "packages": [
    {
      "package_name": "Descriptive name",
      "package_code": "3-4 letter code",
      "work_category": "category from WORK_CATEGORIES",
      "description": "Brief scope description",
      "line_item_ids": ["uuid1", "uuid2", ...],
      "rationale": "Why these items are grouped together"
    }
  ]
}

Consider:
- Bridge items often need separate packages per structure
- Large earthwork quantities may warrant splitting (cut/fill, stripping, borrow)
- Paving can be split by course type (base, surface, shoulders)
- MOT is often one package unless multiple phases exist
- Environmental and landscaping can often be combined
- Miscellaneous items can be distributed to related packages

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
    const {
      bid_project_id,
      regenerate = false,
      use_ai_grouping = true
    }: GenerateRequest = await req.json();

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
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

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

    // Verify user has access to this project (RLS will enforce this)
    const { data: projectAccess, error: accessError } = await supabaseUser
      .from('bid_projects')
      .select('id')
      .eq('id', bid_project_id)
      .single();

    if (accessError || !projectAccess) {
      return new Response(
        JSON.stringify({ error: 'Project not found or access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create service role client for actual operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get project details with service role
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

    // Check for existing packages
    const { data: existingPackages, error: packagesError } = await supabase
      .from('bid_work_packages')
      .select('id')
      .eq('bid_project_id', bid_project_id);

    if (packagesError) {
      throw new Error(`Failed to check existing packages: ${packagesError.message}`);
    }

    if (existingPackages && existingPackages.length > 0 && !regenerate) {
      return new Response(
        JSON.stringify({
          error: 'Work packages already exist for this project',
          message: 'Set regenerate=true to delete and recreate packages',
          existing_count: existingPackages.length,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete existing packages if regenerating
    if (regenerate && existingPackages && existingPackages.length > 0) {
      // Delete package items first (cascade should handle this, but be explicit)
      await supabase
        .from('bid_work_package_items')
        .delete()
        .in('work_package_id', existingPackages.map(p => p.id));

      // Delete packages
      await supabase
        .from('bid_work_packages')
        .delete()
        .eq('bid_project_id', bid_project_id);
    }

    // Get all line items for the project
    const { data: lineItems, error: itemsError } = await supabase
      .from('bid_line_items')
      .select('id, line_number, item_number, description, quantity, unit, work_category, final_unit_price')
      .eq('bid_project_id', bid_project_id)
      .order('line_number', { ascending: true });

    if (itemsError) {
      throw new Error(`Failed to fetch line items: ${itemsError.message}`);
    }

    if (!lineItems || lineItems.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No line items found to package',
          packages_created: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group items by work category
    const categoryGroups = new Map<WorkCategory, LineItem[]>();
    const uncategorizedItems: LineItem[] = [];

    for (const item of lineItems as LineItem[]) {
      if (item.work_category && WORK_CATEGORIES.includes(item.work_category as WorkCategory)) {
        const category = item.work_category as WorkCategory;
        if (!categoryGroups.has(category)) {
          categoryGroups.set(category, []);
        }
        categoryGroups.get(category)!.push(item);
      } else {
        uncategorizedItems.push(item);
      }
    }

    // Add uncategorized to OTHER
    if (uncategorizedItems.length > 0) {
      if (!categoryGroups.has('OTHER')) {
        categoryGroups.set('OTHER', []);
      }
      categoryGroups.get('OTHER')!.push(...uncategorizedItems);
    }

    let packagesToCreate: WorkPackage[] = [];
    let itemAssignments: Map<string, string[]> = new Map(); // packageKey -> lineItemIds

    // Try AI grouping if enabled and API key available
    if (use_ai_grouping && anthropicApiKey && lineItems.length > 10) {
      try {
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
            system: AI_GROUPING_PROMPT,
            messages: [
              {
                role: 'user',
                content: `Analyze and group the following ${lineItems.length} bid line items into work packages:

PROJECT: ${project.project_name}
${project.state_project_number ? `STATE PROJECT: ${project.state_project_number}` : ''}

LINE ITEMS:
${JSON.stringify(lineItems.map((i: LineItem) => ({
  id: i.id,
  line: i.line_number,
  item: i.item_number,
  desc: i.description.substring(0, 100),
  qty: i.quantity,
  unit: i.unit,
  category: i.work_category,
})), null, 2)}

Create optimized work packages. Use the work_category already assigned to items as a guide, but feel free to split or combine as needed for efficient estimating.`,
              },
            ],
          }),
        });

        if (claudeResponse.ok) {
          const claudeResult = await claudeResponse.json();
          const responseText = claudeResult.content[0]?.text;

          if (responseText) {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.packages && Array.isArray(parsed.packages)) {
                let packageNumber = 1;
                for (const pkg of parsed.packages) {
                  if (pkg.package_name && pkg.line_item_ids && Array.isArray(pkg.line_item_ids)) {
                    const category = WORK_CATEGORIES.includes(pkg.work_category)
                      ? pkg.work_category as WorkCategory
                      : 'OTHER';

                    const config = PACKAGE_CONFIG[category];
                    const packageKey = `${packageNumber}-${pkg.package_code || config.code}`;

                    packagesToCreate.push({
                      bid_project_id,
                      package_number: packageNumber,
                      package_name: pkg.package_name,
                      package_code: pkg.package_code || config.code,
                      description: pkg.description || pkg.rationale || '',
                      work_category: category,
                      status: 'PENDING',
                      total_items: pkg.line_item_ids.length,
                      sort_order: packageNumber,
                      ai_generated: true,
                    });

                    itemAssignments.set(packageKey, pkg.line_item_ids);
                    packageNumber++;
                  }
                }
              }
            }
          }
        }
      } catch (aiError) {
        console.error('AI grouping failed, falling back to category-based:', aiError);
        packagesToCreate = [];
        itemAssignments.clear();
      }
    }

    // Fallback: Create packages based on work category if AI didn't produce results
    if (packagesToCreate.length === 0) {
      let packageNumber = 1;
      const sortedCategories = Array.from(categoryGroups.keys()).sort(
        (a, b) => PACKAGE_CONFIG[a].order - PACKAGE_CONFIG[b].order
      );

      for (const category of sortedCategories) {
        const items = categoryGroups.get(category)!;
        const config = PACKAGE_CONFIG[category];

        // Split large categories (>50 items) into sub-packages
        if (items.length > 50) {
          const chunks = Math.ceil(items.length / 40);
          for (let i = 0; i < chunks; i++) {
            const chunkItems = items.slice(i * 40, (i + 1) * 40);
            const suffix = chunks > 1 ? ` (Part ${i + 1})` : '';
            const packageKey = `${packageNumber}-${config.code}${i + 1}`;

            packagesToCreate.push({
              bid_project_id,
              package_number: packageNumber,
              package_name: `${config.name}${suffix}`,
              package_code: `${config.code}${chunks > 1 ? i + 1 : ''}`,
              description: `${config.name} items${suffix}`,
              work_category: category,
              status: 'PENDING',
              total_items: chunkItems.length,
              sort_order: config.order * 10 + i,
              ai_generated: false,
            });

            itemAssignments.set(packageKey, chunkItems.map(item => item.id));
            packageNumber++;
          }
        } else {
          const packageKey = `${packageNumber}-${config.code}`;

          packagesToCreate.push({
            bid_project_id,
            package_number: packageNumber,
            package_name: config.name,
            package_code: config.code,
            description: `${config.name} items`,
            work_category: category,
            status: 'PENDING',
            total_items: items.length,
            sort_order: config.order * 10,
            ai_generated: false,
          });

          itemAssignments.set(packageKey, items.map(item => item.id));
          packageNumber++;
        }
      }
    }

    // Insert packages into database
    const createdPackages: Array<{ id: string; key: string }> = [];

    for (const pkg of packagesToCreate) {
      const { data: created, error: createError } = await supabase
        .from('bid_work_packages')
        .insert({
          bid_project_id: pkg.bid_project_id,
          package_number: pkg.package_number,
          package_name: pkg.package_name,
          package_code: pkg.package_code,
          description: pkg.description,
          work_category: pkg.work_category,
          status: pkg.status,
          total_items: pkg.total_items,
          sort_order: pkg.sort_order,
          ai_generated: pkg.ai_generated,
        })
        .select('id')
        .single();

      if (createError) {
        console.error(`Failed to create package ${pkg.package_name}:`, createError);
        continue;
      }

      if (created) {
        // Find the matching key for this package
        const key = Array.from(itemAssignments.keys()).find(k =>
          k.includes(`${pkg.package_number}-`)
        );
        if (key) {
          createdPackages.push({ id: created.id, key });
        }
      }
    }

    // Link line items to packages
    let itemsLinked = 0;
    let itemsFailed = 0;

    for (const { id: packageId, key } of createdPackages) {
      const lineItemIds = itemAssignments.get(key);
      if (!lineItemIds) continue;

      for (let i = 0; i < lineItemIds.length; i++) {
        const { error: linkError } = await supabase
          .from('bid_work_package_items')
          .insert({
            work_package_id: packageId,
            line_item_id: lineItemIds[i],
            sort_order: i + 1,
            ai_suggested_package_id: packagesToCreate[0]?.ai_generated ? packageId : null,
            manually_assigned: false,
          });

        if (linkError) {
          // Might fail due to unique constraint if item already in a package
          if (!linkError.message.includes('unique')) {
            console.error(`Failed to link item ${lineItemIds[i]}:`, linkError);
          }
          itemsFailed++;
        } else {
          itemsLinked++;
        }
      }
    }

    const duration = Date.now() - startTime;

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        bid_project_id,
        packages_created: createdPackages.length,
        items_linked: itemsLinked,
        items_failed: itemsFailed,
        total_line_items: lineItems.length,
        ai_generated: packagesToCreate[0]?.ai_generated || false,
        duration_ms: duration,
        packages: packagesToCreate.map(p => ({
          package_number: p.package_number,
          package_name: p.package_name,
          package_code: p.package_code,
          work_category: p.work_category,
          total_items: p.total_items,
        })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Work package generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        error: 'Work package generation failed',
        message: errorMessage,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
