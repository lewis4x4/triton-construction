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

// Parse WVDOH Bidx XML format
function parseBidxXml(xmlContent: string): ParseResult {
  const result: ParseResult = {
    success: false,
    lineItems: [],
    totalItems: 0,
    errors: [],
  };

  try {
    const xml = parseXML(xmlContent);

    // Try multiple possible root structures
    const possibleItemContainers = [
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

    // Try to extract project info
    const projectNodes = findNodes(xml, 'Project');
    const proposalNodes = findNodes(xml, 'Proposal');
    const headerNodes = findNodes(xml, 'Header');

    const infoSource = projectNodes[0] || proposalNodes[0] || headerNodes[0] || xml;

    if (infoSource && typeof infoSource === 'object') {
      const info = infoSource as Record<string, unknown>;
      result.projectInfo = {
        projectName: getTextContent(info['ProjectName'] || info['Name'] || info['Title']),
        contractNumber: getTextContent(info['ContractNumber'] || info['Contract'] || info['ContractNo']),
        county: getTextContent(info['County'] || info['Location']),
        route: getTextContent(info['Route'] || info['Highway'] || info['Road']),
        lettingDate: getTextContent(info['LettingDate'] || info['BidDate'] || info['Date']),
      };
    }

    // Parse each item
    let lineNumber = 0;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;

      lineNumber++;
      const itemObj = item as Record<string, unknown>;

      // Try various field names for each property
      const itemNumber = getTextContent(
        itemObj['ItemNumber'] || itemObj['Number'] || itemObj['ItemNo'] ||
        itemObj['PayItemNumber'] || itemObj['ItemCode'] || itemObj['Code'] ||
        itemObj['@ItemNumber'] || itemObj['@Number']
      );

      const description = getTextContent(
        itemObj['Description'] || itemObj['ItemDescription'] || itemObj['Desc'] ||
        itemObj['LongDescription'] || itemObj['Name'] || itemObj['ItemName']
      );

      const shortDesc = getTextContent(
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

      const category = getTextContent(
        itemObj['Category'] || itemObj['WorkType'] || itemObj['Type'] ||
        itemObj['ItemCategory'] || itemObj['Classification']
      );

      const section = getTextContent(
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
      if (itemNumber || description) {
        result.lineItems.push({
          lineNumber,
          itemNumber: itemNumber || `ITEM-${lineNumber}`,
          altItemNumber: altItemNumber || undefined,
          description: description || 'No description',
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
    const { documentId, bidProjectId, replaceExisting = false } = await req.json();

    if (!documentId || !bidProjectId) {
      return new Response(
        JSON.stringify({ error: 'documentId and bidProjectId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to the project
    const { data: project, error: projectError } = await supabaseClient
      .from('bid_projects')
      .select('id, organization_id')
      .eq('id', bidProjectId)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: 'Bid project not found or access denied' }),
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

    // Insert line items
    const lineItemRecords = parseResult.lineItems.map((item, index) => ({
      bid_project_id: bidProjectId,
      line_number: startLineNumber + index,
      item_number: item.itemNumber,
      alt_item_number: item.altItemNumber || null,
      description: item.description,
      short_description: item.shortDescription || null,
      quantity: item.quantity,
      unit: item.unit,
      source_document_id: documentId,
      // Store engineer estimate as a reference if available
      estimator_notes: item.engineerEstimate
        ? `Engineer Estimate: $${item.engineerEstimate.toFixed(2)}/unit`
        : null,
      // Mark as not reviewed
      pricing_reviewed: false,
    }));

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
