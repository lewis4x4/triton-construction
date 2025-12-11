import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { parse as parseXML, stringify } from 'https://deno.land/x/xml@2.1.3/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BidxLineItem {
  lineNumber: number;
  itemNumber: string;
  altItemNumber?: string;
  description: string;
  shortDescription?: string;
  quantity: number;
  unit: string;
  engineerEstimate?: number;
  category?: string;
  section?: string;
  specSection?: string;
}

interface ParseResult {
  success: boolean;
  projectInfo?: {
    projectName?: string;
    contractNumber?: string;
    county?: string;
    route?: string;
    lettingDate?: string;
  };
  lineItems: BidxLineItem[];
  totalItems: number;
  errors: string[];
}

// Extract text content from XML node
function getTextContent(node: unknown): string {
  if (node === null || node === undefined) return '';
  if (typeof node === 'string') return node.trim();
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    return node.map(getTextContent).join('').trim();
  }
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>;
    // Check for text content in common patterns
    if ('#text' in obj) return getTextContent(obj['#text']);
    if ('_' in obj) return getTextContent(obj['_']);
    if ('$text' in obj) return getTextContent(obj['$text']);
    // Try to get any string value
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (typeof val === 'string') return val.trim();
    }
  }
  return '';
}

// Find nodes by name recursively
function findNodes(node: unknown, nodeName: string, results: unknown[] = []): unknown[] {
  if (!node || typeof node !== 'object') return results;

  const obj = node as Record<string, unknown>;

  // Check if current node matches
  if (nodeName in obj) {
    const found = obj[nodeName];
    if (Array.isArray(found)) {
      results.push(...found);
    } else {
      results.push(found);
    }
  }

  // Recursively search children
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object') {
      findNodes(obj[key], nodeName, results);
    }
  }

  return results;
}

// Normalize WVDOH item number format
// EBSX uses format like "201001-000" which should map to "201.001" for historical matching
function normalizeItemNumber(itemNumber: string): string {
  if (!itemNumber) return '';

  // EBSX format: 201001-000 → 201.001
  const ebsxMatch = itemNumber.match(/^(\d{3})(\d{3})-(\d{3})$/);
  if (ebsxMatch) {
    return `${ebsxMatch[1]}.${ebsxMatch[2]}`;
  }

  // Already normalized or other format - return as-is
  return itemNumber;
}

// Parse WVDOH Bidx XML format (supports both BidX and EBSX formats)
function parseBidxXml(xmlContent: string): ParseResult {
  const result: ParseResult = {
    success: false,
    lineItems: [],
    totalItems: 0,
    errors: [],
  };

  try {
    const xml = parseXML(xmlContent);

    // Detect if this is an EBSX file by checking for EBSXContainer or EBSX root
    const isEBSX = !!(findNodes(xml, 'EBSXContainer').length || findNodes(xml, 'EBSX').length);

    // Try multiple possible root structures (including EBSX paths)
    const possibleItemContainers = [
      // EBSX-specific paths (WVDOH AASHTOWare format)
      'EBSXContainer', 'EBSX', 'Letting', 'Section',
      // Standard BidX paths
      'BidItems', 'Items', 'LineItems', 'BidSchedule', 'Schedule',
      'Proposal', 'ProposalItems', 'BidDocument', 'Bid'
    ];

    const possibleItemNodes = [
      'Item', 'BidItem', 'LineItem', 'PayItem', 'ScheduleItem',
      'ProposalItem', 'ContractItem'
    ];

    let items: unknown[] = [];

    // Search for items in various locations
    for (const containerName of possibleItemContainers) {
      const containers = findNodes(xml, containerName);
      if (containers.length > 0) {
        for (const container of containers) {
          for (const itemName of possibleItemNodes) {
            const foundItems = findNodes(container, itemName);
            if (foundItems.length > 0) {
              items = foundItems;
              break;
            }
          }
          if (items.length > 0) break;
        }
        if (items.length > 0) break;
      }
    }

    // If still no items, search entire document
    if (items.length === 0) {
      for (const itemName of possibleItemNodes) {
        items = findNodes(xml, itemName);
        if (items.length > 0) break;
      }
    }

    // Try to extract project info (including EBSX-specific nodes)
    const projectNodes = findNodes(xml, 'Project');
    const proposalNodes = findNodes(xml, 'Proposal');
    const headerNodes = findNodes(xml, 'Header');
    const lettingNodes = findNodes(xml, 'Letting');

    // For EBSX files, extract info from both Letting and Proposal nodes
    const lettingInfo = lettingNodes[0] as Record<string, unknown> | undefined;
    const proposalInfo = proposalNodes[0] as Record<string, unknown> | undefined;
    const infoSource = projectNodes[0] || proposalNodes[0] || headerNodes[0] || xml;

    if (infoSource && typeof infoSource === 'object') {
      const info = infoSource as Record<string, unknown>;

      // For EBSX, combine info from Letting and Proposal nodes
      let lettingDate = getTextContent(info['LettingDate'] || info['BidDate'] || info['Date']);
      let contractNumber = getTextContent(info['ContractNumber'] || info['Contract'] || info['ContractNo']);
      let projectDescription = getTextContent(info['ProjectName'] || info['Name'] || info['Title']);

      // EBSX-specific: Get letting date from Letting node
      if (isEBSX && lettingInfo) {
        const ebsxLettingDate = getTextContent(lettingInfo['LettingTime'] || lettingInfo['LettingDate']);
        if (ebsxLettingDate) lettingDate = ebsxLettingDate;

        const lettingId = getTextContent(lettingInfo['LettingID']);
        if (lettingId && !contractNumber) contractNumber = lettingId;
      }

      // EBSX-specific: Get contract ID and description from Proposal node
      if (isEBSX && proposalInfo) {
        const ebsxContractId = getTextContent(proposalInfo['ContractID'] || proposalInfo['ContractNumber']);
        if (ebsxContractId) contractNumber = ebsxContractId;

        const ebsxDescription = getTextContent(
          proposalInfo['ProjectDescription'] ||
          proposalInfo['Description'] ||
          proposalInfo['ProposalDescription']
        );
        if (ebsxDescription) projectDescription = ebsxDescription;
      }

      result.projectInfo = {
        projectName: projectDescription,
        contractNumber,
        county: getTextContent(info['County'] || info['Location']),
        route: getTextContent(info['Route'] || info['Highway'] || info['Road']),
        lettingDate,
      };
    }

    // Parse each item
    let autoLineNumber = 0;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;

      autoLineNumber++;
      const itemObj = item as Record<string, unknown>;

      // Try to get explicit line number from EBSX (e.g., "0005" → 5)
      const explicitLineNum = getTextContent(itemObj['LineNumber'] || itemObj['LineNum'] || itemObj['Line']);
      const lineNumber = explicitLineNum ? parseInt(explicitLineNum, 10) || autoLineNumber : autoLineNumber;

      // Try various field names for each property (including EBSX-specific names)
      const rawItemNumber = getTextContent(
        itemObj['ItemNumber'] || itemObj['Number'] || itemObj['ItemNo'] ||
        itemObj['PayItemNumber'] || itemObj['ItemCode'] || itemObj['Code'] ||
        itemObj['@ItemNumber'] || itemObj['@Number']
      );

      // Normalize item number for WVDOH format (201001-000 → 201.001)
      const itemNumber = normalizeItemNumber(rawItemNumber);

      // EBSX uses DescriptionIDESCRL (long) and DescriptionIDESCR (short)
      const description = getTextContent(
        itemObj['DescriptionIDESCRL'] || // EBSX long description
        itemObj['Description'] || itemObj['ItemDescription'] || itemObj['Desc'] ||
        itemObj['LongDescription'] || itemObj['Name'] || itemObj['ItemName']
      );

      // EBSX uses DescriptionIDESCR for short description
      const shortDesc = getTextContent(
        itemObj['DescriptionIDESCR'] || // EBSX short description
        itemObj['ShortDescription'] || itemObj['ShortDesc'] || itemObj['Brief']
      );

      const quantityStr = getTextContent(
        itemObj['Quantity'] || itemObj['Qty'] || itemObj['EstimatedQuantity'] ||
        itemObj['PlanQuantity'] || itemObj['Amount']
      );

      const unit = getTextContent(
        itemObj['Unit'] || itemObj['UnitOfMeasure'] || itemObj['UOM'] ||
        itemObj['Units'] || itemObj['Measure']
      );

      const engineerEstStr = getTextContent(
        itemObj['EngineerEstimate'] || itemObj['EstimatedPrice'] ||
        itemObj['UnitPrice'] || itemObj['Price'] || itemObj['EstPrice']
      );

      // EBSX uses ItemType for classification (e.g., "CLER", "NTWK")
      const category = getTextContent(
        itemObj['ItemType'] || // EBSX item type
        itemObj['Category'] || itemObj['WorkType'] || itemObj['Type'] ||
        itemObj['ItemCategory'] || itemObj['Classification']
      );

      // EBSX items are organized under Section nodes
      const section = getTextContent(
        itemObj['SectionID'] || itemObj['SectionNumber'] || // EBSX section
        itemObj['Section'] || itemObj['Heading'] || itemObj['Group']
      );

      const specSection = getTextContent(
        itemObj['SpecSection'] || itemObj['Specification'] || itemObj['Spec']
      );

      const altItemNumber = getTextContent(
        itemObj['AltItemNumber'] || itemObj['AlternateNumber'] || itemObj['SubItemNumber']
      );

      // Parse quantity
      let quantity = 0;
      if (quantityStr) {
        const parsed = parseFloat(quantityStr.replace(/[,\s]/g, ''));
        if (!isNaN(parsed)) quantity = parsed;
      }

      // Parse engineer estimate
      let engineerEstimate: number | undefined;
      if (engineerEstStr) {
        const parsed = parseFloat(engineerEstStr.replace(/[$,\s]/g, ''));
        if (!isNaN(parsed)) engineerEstimate = parsed;
      }

      // Only add items with valid data
      if (itemNumber || description || shortDesc) {
        // Use short description as fallback if no long description
        const finalDescription = description || shortDesc || 'No description';

        // For EBSX, store original item number format as alt if it differs from normalized
        const finalAltItemNumber = (rawItemNumber && rawItemNumber !== itemNumber)
          ? rawItemNumber
          : (altItemNumber || undefined);

        result.lineItems.push({
          lineNumber,
          itemNumber: itemNumber || `ITEM-${lineNumber}`,
          altItemNumber: finalAltItemNumber,
          description: finalDescription,
          shortDescription: shortDesc || undefined,
          quantity,
          unit: unit || 'LS',
          engineerEstimate,
          category: category || undefined,
          section: section || undefined,
          specSection: specSection || undefined,
        });
      }
    }

    result.totalItems = result.lineItems.length;
    result.success = result.lineItems.length > 0;

    if (result.lineItems.length === 0) {
      result.errors.push('No line items found in Bidx file. The XML structure may not be recognized.');
    }

  } catch (error) {
    result.errors.push(`XML parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
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

    // Create admin client for database operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if this is a service role key call (from process-document-queue)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const token = authHeader.replace('Bearer ', '');
    const isServiceRoleCall = token === serviceRoleKey;

    // For user calls, validate authentication
    if (!isServiceRoleCall) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: { headers: { Authorization: authHeader } },
          auth: { autoRefreshToken: false, persistSession: false },
        }
      );

      const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
      if (userError || !user) {
        return new Response(
          JSON.stringify({ error: 'Invalid authentication' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Parse request body
    const { documentId, bidProjectId, replaceExisting = false } = await req.json();

    if (!documentId || !bidProjectId) {
      return new Response(
        JSON.stringify({ error: 'documentId and bidProjectId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify project exists (use admin client for service role calls, skip RLS check)
    const { data: project, error: projectError } = await supabaseAdmin
      .from('bid_projects')
      .select('id, organization_id')
      .eq('id', bidProjectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Bid project not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get document info
    const { data: document, error: docError } = await supabaseAdmin
      .from('bid_documents')
      .select('id, file_path, document_type, processing_status')
      .eq('id', documentId)
      .eq('bid_project_id', bidProjectId)
      .single();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: 'Document not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (document.document_type !== 'BIDX') {
      return new Response(
        JSON.stringify({ error: 'Document is not a Bidx file' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update document status to processing
    await supabaseAdmin
      .from('bid_documents')
      .update({
        processing_status: 'PROCESSING',
        processing_started_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('bid-documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      await supabaseAdmin
        .from('bid_documents')
        .update({
          processing_status: 'FAILED',
          processing_error: `Download failed: ${downloadError?.message}`,
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return new Response(
        JSON.stringify({ error: `Failed to download file: ${downloadError?.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse XML content
    const xmlContent = await fileData.text();
    const parseResult = parseBidxXml(xmlContent);

    if (!parseResult.success) {
      await supabaseAdmin
        .from('bid_documents')
        .update({
          processing_status: 'FAILED',
          processing_error: parseResult.errors.join('; '),
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return new Response(
        JSON.stringify({
          success: false,
          errors: parseResult.errors,
          message: 'Failed to parse Bidx file',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If replaceExisting, delete existing line items from this document
    if (replaceExisting) {
      await supabaseAdmin
        .from('bid_line_items')
        .delete()
        .eq('bid_project_id', bidProjectId)
        .eq('source_document_id', documentId);
    }

    // Get current max line number for this project
    const { data: maxLineData } = await supabaseAdmin
      .from('bid_line_items')
      .select('line_number')
      .eq('bid_project_id', bidProjectId)
      .order('line_number', { ascending: false })
      .limit(1)
      .single();

    const startLineNumber = replaceExisting ? 1 : (maxLineData?.line_number || 0) + 1;

    // Lookup historical pricing for exact item number matches
    // This helps provide AI suggestions based on past bids
    const itemNumbers = parseResult.lineItems.map(item => item.itemNumber);
    const { data: historicalPricing } = await supabaseAdmin
      .from('bid_line_items')
      .select('item_number, final_unit_price, bid_project_id')
      .in('item_number', itemNumbers)
      .not('final_unit_price', 'is', null)
      .order('created_at', { ascending: false });

    // Build a map of item_number -> most recent final_unit_price (exact match only)
    const historicalPriceMap = new Map<string, number>();
    if (historicalPricing) {
      for (const record of historicalPricing) {
        // Only use exact matches, skip if we already have a price for this item
        if (record.item_number && record.final_unit_price && !historicalPriceMap.has(record.item_number)) {
          historicalPriceMap.set(record.item_number, record.final_unit_price);
        }
      }
    }

    // Insert line items with pricing intelligence
    const lineItemRecords = parseResult.lineItems.map((item, index) => {
      // Priority for ai_suggested_unit_price:
      // 1. Engineer estimate from BidX file (most reliable)
      // 2. Historical pricing from exact item number match (fallback)
      let aiSuggestedPrice: number | null = null;
      let pricingSource = '';

      if (item.engineerEstimate && item.engineerEstimate > 0) {
        aiSuggestedPrice = item.engineerEstimate;
        pricingSource = 'engineer_estimate';
      } else if (historicalPriceMap.has(item.itemNumber)) {
        aiSuggestedPrice = historicalPriceMap.get(item.itemNumber) || null;
        pricingSource = 'historical_match';
      }

      return {
        bid_project_id: bidProjectId,
        line_number: startLineNumber + index,
        item_number: item.itemNumber,
        alt_item_number: item.altItemNumber || null,
        description: item.description,
        short_description: item.shortDescription || null,
        quantity: item.quantity,
        unit: item.unit,
        source_document_id: documentId,
        // Store engineer estimate in estimator_notes for reference
        estimator_notes: item.engineerEstimate
          ? `Engineer Estimate: $${item.engineerEstimate.toFixed(2)}/unit`
          : null,
        // Populate AI suggested price from engineer estimate or historical data
        ai_suggested_unit_price: aiSuggestedPrice,
        // Calculate suggested extended price if we have a suggestion
        ai_suggested_extended_price: aiSuggestedPrice ? aiSuggestedPrice * item.quantity : null,
        // Store metadata about pricing source
        ai_pricing_metadata: aiSuggestedPrice ? {
          source: pricingSource,
          confidence: pricingSource === 'engineer_estimate' ? 0.95 : 0.75,
          extracted_at: new Date().toISOString(),
        } : null,
        // Mark as not reviewed
        pricing_reviewed: false,
      };
    });

    const { data: insertedItems, error: insertError } = await supabaseAdmin
      .from('bid_line_items')
      .insert(lineItemRecords)
      .select('id');

    if (insertError) {
      await supabaseAdmin
        .from('bid_documents')
        .update({
          processing_status: 'FAILED',
          processing_error: `Insert failed: ${insertError.message}`,
          processing_completed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return new Response(
        JSON.stringify({ error: `Failed to insert line items: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update project info if extracted
    if (parseResult.projectInfo) {
      const updates: Record<string, unknown> = {};
      if (parseResult.projectInfo.contractNumber && !project.contract_number) {
        updates.contract_number = parseResult.projectInfo.contractNumber;
      }
      if (parseResult.projectInfo.county) {
        updates.county = parseResult.projectInfo.county;
      }
      if (parseResult.projectInfo.route) {
        updates.state_route = parseResult.projectInfo.route;
      }
      if (parseResult.projectInfo.lettingDate) {
        // Try to parse the date
        const dateMatch = parseResult.projectInfo.lettingDate.match(/\d{4}-\d{2}-\d{2}/);
        if (dateMatch) {
          updates.letting_date = dateMatch[0];
        }
      }

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin
          .from('bid_projects')
          .update(updates)
          .eq('id', bidProjectId);
      }
    }

    // Update document status to completed
    await supabaseAdmin
      .from('bid_documents')
      .update({
        processing_status: 'COMPLETED',
        processing_completed_at: new Date().toISOString(),
        processing_error: null,
        extracted_metadata: {
          lineItemCount: parseResult.totalItems,
          projectInfo: parseResult.projectInfo,
          parsedAt: new Date().toISOString(),
        },
      })
      .eq('id', documentId);

    // Update project status if it was DRAFT
    await supabaseAdmin
      .from('bid_projects')
      .update({ status: 'IN_PROGRESS' })
      .eq('id', bidProjectId)
      .eq('status', 'DRAFT');

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully extracted ${parseResult.totalItems} line items from Bidx file`,
        data: {
          documentId,
          projectId: bidProjectId,
          lineItemsCreated: insertedItems?.length || 0,
          projectInfo: parseResult.projectInfo,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse-bidx error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred during Bidx parsing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
