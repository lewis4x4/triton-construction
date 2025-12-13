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

// Convert DOM Element to object structure compatible with our parsing functions
function domToObject(element: Element): Record<string, unknown> {
  const obj: Record<string, unknown> = {};

  // Add element name as wrapper
  const children: Record<string, unknown> = {};

  // Process child elements
  for (const child of Array.from(element.children)) {
    const childObj = domToObject(child);
    const tagName = child.tagName;

    // If we already have this tag, convert to array
    if (tagName in children) {
      if (Array.isArray(children[tagName])) {
        (children[tagName] as unknown[]).push(childObj[tagName]);
      } else {
        children[tagName] = [children[tagName], childObj[tagName]];
      }
    } else {
      children[tagName] = childObj[tagName];
    }
  }

  // If element has no children, use text content
  if (element.children.length === 0) {
    const text = element.textContent?.trim() || '';
    obj[element.tagName] = text || children;
  } else {
    obj[element.tagName] = children;
  }

  // Process attributes
  for (const attr of Array.from(element.attributes)) {
    if (!obj[element.tagName] || typeof obj[element.tagName] !== 'object') {
      obj[element.tagName] = { '#text': obj[element.tagName] };
    }
    (obj[element.tagName] as Record<string, unknown>)[`@${attr.name}`] = attr.value;
  }

  return obj;
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

// Normalize WVDOH item number format for consistent matching
// Converts various formats to standard form: "201.001" → "201.1", "201.01" → "201.1"
// This ensures EBSX items match wvdoh_item_master entries
function normalizeItemNumber(itemNumber: string): string {
  if (!itemNumber) return '';

  let normalized = itemNumber.trim().toLowerCase();

  // EBSX format: 201001-000 → 201.001
  const ebsxMatch = normalized.match(/^(\d{3})(\d{3})-(\d{3})$/);
  if (ebsxMatch) {
    normalized = `${ebsxMatch[1]}.${ebsxMatch[2]}`;
  }

  // Replace common separators with dots
  normalized = normalized.replace(/[-_\s]/g, '.');

  // Handle 6-digit format: "201001" -> "201.001"
  if (/^\d{6}$/.test(normalized)) {
    normalized = normalized.substring(0, 3) + '.' + normalized.substring(3);
  }

  // Remove multiple consecutive dots
  normalized = normalized.replace(/\.+/g, '.');

  // Split by dots and remove leading zeros from decimal parts
  // This converts "201.001" to "201.1" and "203.01" to "203.1"
  const parts = normalized.split('.');
  if (parts.length >= 2) {
    const section = parts[0];
    // Remove leading zeros from item number part
    const item = parts[1].replace(/^0+/, '') || '0';

    if (parts.length >= 3) {
      const subitem = parts[2].replace(/^0+/, '') || '0';
      // Only include third part if it's not "0"
      normalized = subitem !== '0' ? `${section}.${item}.${subitem}` : `${section}.${item}`;
    } else {
      normalized = `${section}.${item}`;
    }
  }

  // Remove trailing .0
  normalized = normalized.replace(/\.0+$/, '');

  return normalized;
}

// Parse EBSX file using regex (simple and reliable for EBSX format)
function parseEbsxWithRegex(xmlContent: string): ParseResult {
  const result: ParseResult = {
    success: false,
    lineItems: [],
    totalItems: 0,
    errors: [],
  };

  try {
    // Check if this is an EBSX file
    if (!xmlContent.includes('<EBSXContainer') && !xmlContent.includes('<EBSX')) {
      result.errors.push('Not an EBSX file');
      return result;
    }

    console.log('Using regex parser for EBSX file');

    // Extract project info
    const lettingTimeMatch = xmlContent.match(/<LettingTime>([^<]+)<\/LettingTime>/);
    const contractIdMatch = xmlContent.match(/<ContractID>([^<]+)<\/ContractID>/);
    const descMatch = xmlContent.match(/<ProjectDescription>([^<]+)<\/ProjectDescription>/);

    result.projectInfo = {
      projectName: descMatch ? descMatch[1].trim() : undefined,
      contractNumber: contractIdMatch ? contractIdMatch[1].trim() : undefined,
      lettingDate: lettingTimeMatch ? lettingTimeMatch[1].trim() : undefined,
    };

    // Extract all Item elements using regex
    const itemRegex = /<Item[^>]*>([\s\S]*?)<\/Item>/g;
    let match;
    let lineNumber = 0;

    // Track item number occurrences to handle duplicates
    const itemNumberCounts = new Map<string, number>();

    while ((match = itemRegex.exec(xmlContent)) !== null) {
      lineNumber++;
      const itemXml = match[1];

      // Extract fields from Item
      const lineNumMatch = itemXml.match(/<LineNumber>([^<]+)<\/LineNumber>/);
      const itemNumMatch = itemXml.match(/<ItemNumber>([^<]+)<\/ItemNumber>/);
      const qtyMatch = itemXml.match(/<Quantity>([^<]+)<\/Quantity>/);
      const unitMatch = itemXml.match(/<Unit>([^<]+)<\/Unit>/);
      const descLongMatch = itemXml.match(/<DescriptionIDESCRL>([^<]+)<\/DescriptionIDESCRL>/);
      const descShortMatch = itemXml.match(/<DescriptionIDESCR>([^<]+)<\/DescriptionIDESCR>/);
      const priceMatch = itemXml.match(/<UnitPrice[^>]*>([^<]*)<\/UnitPrice>/);
      const itemTypeMatch = itemXml.match(/<ItemType>([^<]+)<\/ItemType>/);

      const rawItemNumber = itemNumMatch ? itemNumMatch[1].trim() : '';
      let itemNumber = normalizeItemNumber(rawItemNumber);
      const description = descLongMatch ? descLongMatch[1].trim() : (descShortMatch ? descShortMatch[1].trim() : 'No description');
      const shortDescription = descShortMatch ? descShortMatch[1].trim() : undefined;

      // Handle duplicate item numbers by appending line number suffix
      // (Common in WVDOH bids where same item appears in multiple sections)
      if (itemNumber) {
        const count = (itemNumberCounts.get(itemNumber) || 0) + 1;
        itemNumberCounts.set(itemNumber, count);
        if (count > 1) {
          // Append line number to make unique: 201.001 -> 201.001-L5
          const parsedLineNum = lineNumMatch ? parseInt(lineNumMatch[1], 10) || lineNumber : lineNumber;
          itemNumber = `${itemNumber}-L${parsedLineNum}`;
          console.log(`Duplicate item ${rawItemNumber}, renaming to ${itemNumber}`);
        }
      }

      let quantity = 0;
      if (qtyMatch) {
        const parsed = parseFloat(qtyMatch[1].replace(/[,\s]/g, ''));
        if (!isNaN(parsed)) quantity = parsed;
      }

      let engineerEstimate: number | undefined;
      if (priceMatch && priceMatch[1]) {
        const parsed = parseFloat(priceMatch[1].replace(/[$,\s]/g, ''));
        if (!isNaN(parsed)) engineerEstimate = parsed;
      }

      if (itemNumber || description) {
        result.lineItems.push({
          lineNumber: lineNumMatch ? parseInt(lineNumMatch[1], 10) || lineNumber : lineNumber,
          itemNumber: itemNumber || `ITEM-${lineNumber}`,
          altItemNumber: (rawItemNumber && rawItemNumber !== itemNumber) ? rawItemNumber : undefined,
          description,
          shortDescription,
          quantity,
          unit: unitMatch ? unitMatch[1].trim() : 'LS',
          engineerEstimate,
          category: itemTypeMatch ? itemTypeMatch[1].trim() : undefined,
        });
      }
    }

    result.totalItems = result.lineItems.length;
    result.success = result.lineItems.length > 0;

    if (result.lineItems.length === 0) {
      result.errors.push('No line items found in EBSX file');
    }

    console.log(`Regex parser found ${result.lineItems.length} items`);
  } catch (error) {
    result.errors.push(`EBSX regex parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

// Parse WVDOH Bidx XML format (supports both BidX and EBSX formats)
function parseBidxXml(xmlContent: string): ParseResult {
  const result: ParseResult = {
    success: false,
    lineItems: [],
    totalItems: 0,
    errors: [],
  };

  // First, try regex parser for EBSX files (more reliable for this format)
  if (xmlContent.includes('<EBSXContainer') || xmlContent.includes('<EBSX>')) {
    console.log('Detected EBSX format, using regex parser');
    return parseEbsxWithRegex(xmlContent);
  }

  try {
    // For non-EBSX files, use the xml library
    let xml: Record<string, unknown>;
    xml = parseXML(xmlContent);

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

    // Check for service role authentication in multiple ways:
    // 1. Direct key match
    // 2. JWT with service_role claim
    let isServiceRoleCall = token === serviceRoleKey;

    if (!isServiceRoleCall) {
      try {
        // Try to decode JWT and check for service_role
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          // Accept if role is service_role from our Supabase instance
          if (payload.role === 'service_role' && payload.ref === 'gablgsruyuhvjurhtcxx') {
            isServiceRoleCall = true;
          }
        }
      } catch {
        // Not a valid JWT, continue with user auth
      }
    }

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

    // Parse XML content - handle GZIP compressed EBSX files
    // Version: 2 - Added GZIP support for EBSX files
    let xmlContent: string;

    // Read file as array buffer to check for GZIP magic bytes
    const fileBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer);

    console.log(`File size: ${bytes.length} bytes`);
    console.log(`First 10 bytes: ${Array.from(bytes.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

    // Check for GZIP magic bytes (0x1f 0x8b)
    const isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    console.log(`isGzip: ${isGzip} (byte0: ${bytes[0]?.toString(16)}, byte1: ${bytes[1]?.toString(16)})`);

    if (isGzip) {
      console.log('Detected GZIP compressed EBSX file, decompressing...');
      try {
        // Use DecompressionStream to decompress GZIP
        const decompressedStream = new Blob([bytes]).stream().pipeThrough(
          new DecompressionStream('gzip')
        );
        // Read as ArrayBuffer and decode with TextDecoder for better control
        const decompressedArrayBuffer = await new Response(decompressedStream).arrayBuffer();
        const decompressedBytes = new Uint8Array(decompressedArrayBuffer);
        console.log(`Decompressed to ${decompressedBytes.length} bytes`);
        console.log(`First 20 decompressed bytes: ${Array.from(decompressedBytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);

        // Use TextDecoder to decode as UTF-8
        xmlContent = new TextDecoder('utf-8').decode(decompressedBytes);
        console.log(`Decoded to ${xmlContent.length} characters`);
      } catch (decompressError) {
        console.error('GZIP decompression failed:', decompressError);
        await supabaseAdmin
          .from('bid_documents')
          .update({
            processing_status: 'FAILED',
            processing_error: `GZIP decompression failed: ${decompressError instanceof Error ? decompressError.message : 'Unknown error'}`,
            processing_completed_at: new Date().toISOString(),
          })
          .eq('id', documentId);

        return new Response(
          JSON.stringify({ error: 'Failed to decompress EBSX file' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Plain XML file
      xmlContent = new TextDecoder().decode(bytes);
    }

    // Clean up XML content - remove BOM and trim whitespace
    // UTF-8 BOM is \uFEFF (EF BB BF in bytes), UTF-16 BE BOM is \uFFFE
    if (xmlContent.charCodeAt(0) === 0xFEFF || xmlContent.charCodeAt(0) === 0xFFFE) {
      console.log('Stripping BOM from XML content');
      xmlContent = xmlContent.slice(1);
    }

    // Also trim any leading/trailing whitespace that might confuse the parser
    xmlContent = xmlContent.trim();

    // Log the first few character codes for debugging
    const firstCharCodes = Array.from(xmlContent.slice(0, 20)).map(c => c.charCodeAt(0).toString(16));
    console.log(`First 20 char codes after cleanup: ${firstCharCodes.join(' ')}`);
    console.log(`XML starts with: ${xmlContent.slice(0, 80)}`);

    // Check for invalid characters (replacement char U+FFFD or high bytes) in the content
    let invalidCharPositions: { pos: number; char: string; code: number }[] = [];
    for (let i = 0; i < xmlContent.length && invalidCharPositions.length < 5; i++) {
      const code = xmlContent.charCodeAt(i);
      // Check for replacement character or other suspicious characters
      if (code === 0xFFFD || (code >= 0x80 && code < 0xA0) || code > 0xFFFF) {
        invalidCharPositions.push({ pos: i, char: xmlContent[i], code });
      }
    }
    if (invalidCharPositions.length > 0) {
      console.log(`Found ${invalidCharPositions.length} invalid/suspicious characters:`, JSON.stringify(invalidCharPositions));
    }

    // Normalize line endings (Windows CRLF to LF) which might confuse some parsers
    xmlContent = xmlContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const parseResult = parseBidxXml(xmlContent);

    if (!parseResult.success) {
      // Include debug info
      const debugInfo = {
        fileSize: bytes.length,
        firstBytes: Array.from(bytes.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' '),
        isGzip,
        xmlContentLength: xmlContent.length,
        firstCharCodes: Array.from(xmlContent.slice(0, 20)).map(c => c.charCodeAt(0).toString(16)).join(' '),
        xmlContentPreview: xmlContent.substring(0, 150),
        invalidCharPositions: invalidCharPositions.slice(0, 5),
      };

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
          debug: debugInfo,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if line items already exist for this project (idempotent behavior)
    const { count: existingItemCount } = await supabaseAdmin
      .from('bid_line_items')
      .select('id', { count: 'exact', head: true })
      .eq('bid_project_id', bidProjectId);

    if (existingItemCount && existingItemCount > 0) {
      if (replaceExisting) {
        // Delete existing line items to replace them
        console.log(`Replacing ${existingItemCount} existing line items`);
        await supabaseAdmin
          .from('bid_line_items')
          .delete()
          .eq('bid_project_id', bidProjectId);
      } else {
        // Line items already exist - mark as success (idempotent)
        console.log(`${existingItemCount} line items already exist for project, marking as complete`);

        await supabaseAdmin
          .from('bid_documents')
          .update({
            processing_status: 'COMPLETED',
            processing_completed_at: new Date().toISOString(),
            processing_error: null,
            ai_analysis_metadata: {
              lineItemCount: existingItemCount,
              parsedAt: new Date().toISOString(),
              note: 'Line items already exist - skipped re-processing',
            },
          })
          .eq('id', documentId);

        return new Response(
          JSON.stringify({
            success: true,
            message: `Line items already exist (${existingItemCount} items). Skipped re-processing.`,
            data: {
              documentId,
              projectId: bidProjectId,
              lineItemsExisting: existingItemCount,
              skipped: true,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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

    // Lookup historical pricing using the dedicated pricing system
    // Priority: 1. historical_bid_pricing table (from past won/lost bids)
    //           2. wvdoh_item_master table (base pricing schedule)
    //           3. bid_line_items from other projects (fallback)
    const itemNumbers = parseResult.lineItems.map(item => item.itemNumber);

    // Get the organization ID from the project
    const { data: projectOrg } = await supabaseAdmin
      .from('bid_projects')
      .select('organization_id')
      .eq('id', bidProjectId)
      .single();
    const organizationId = projectOrg?.organization_id;

    // Build pricing suggestions using the new historical pricing system
    const historicalPriceMap = new Map<string, { price: number; source: string; confidence: number }>();

    // Try to get pricing from the new get_ai_suggested_price function (if migration 106 is applied)
    try {
      for (const itemNumber of itemNumbers) {
        if (historicalPriceMap.has(itemNumber)) continue;

        // Normalize item number to match database format (e.g., "201.001" → "201.1")
        const normalizedItemNumber = normalizeItemNumber(itemNumber);
        console.log(`Looking up pricing for ${itemNumber} (normalized: ${normalizedItemNumber})`);

        const { data: suggestion } = await supabaseAdmin.rpc('get_ai_suggested_price', {
          p_organization_id: organizationId,
          p_item_number: normalizedItemNumber,
        });

        if (suggestion?.found && suggestion?.suggested_price) {
          // Store with original item number as key since that's what we'll look up later
          historicalPriceMap.set(itemNumber, {
            price: suggestion.suggested_price,
            source: suggestion.source, // 'historical' or 'base_price'
            confidence: suggestion.confidence || 0.75,
          });
          console.log(`Found pricing for ${itemNumber}: $${suggestion.suggested_price} (${suggestion.source})`);
        }
      }
    } catch (e) {
      // Function doesn't exist yet (migration 106 not applied), fall back to old method
      console.log('get_ai_suggested_price not available, using fallback historical lookup', e);
    }

    // Fallback: query bid_line_items directly if no results from new system
    if (historicalPriceMap.size === 0) {
      const { data: historicalPricing } = await supabaseAdmin
        .from('bid_line_items')
        .select('item_number, final_unit_price, bid_project_id')
        .in('item_number', itemNumbers)
        .not('final_unit_price', 'is', null)
        .order('created_at', { ascending: false });

      if (historicalPricing) {
        for (const record of historicalPricing) {
          if (record.item_number && record.final_unit_price && !historicalPriceMap.has(record.item_number)) {
            historicalPriceMap.set(record.item_number, {
              price: record.final_unit_price,
              source: 'legacy_historical',
              confidence: 0.7,
            });
          }
        }
      }
    }

    console.log(`Historical pricing found for ${historicalPriceMap.size} of ${itemNumbers.length} items`);

    // Insert line items with pricing intelligence
    const lineItemRecords = parseResult.lineItems.map((item, index) => {
      // Priority for ai_suggested_unit_price:
      // 1. Engineer estimate from BidX file (most reliable)
      // 2. Historical pricing from new pricing system (weighted average from past bids)
      // 3. Base pricing from WVDOH item master (Triton's pricing schedule)
      let aiSuggestedPrice: number | null = null;
      let pricingSource = '';
      let pricingConfidence = 0;

      if (item.engineerEstimate && item.engineerEstimate > 0) {
        aiSuggestedPrice = item.engineerEstimate;
        pricingSource = 'engineer_estimate';
        pricingConfidence = 0.95;
      } else if (historicalPriceMap.has(item.itemNumber)) {
        const historical = historicalPriceMap.get(item.itemNumber)!;
        aiSuggestedPrice = historical.price;
        pricingSource = historical.source;
        pricingConfidence = historical.confidence;
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
        // Store engineer estimate in estimator_notes for reference
        estimator_notes: item.engineerEstimate
          ? `Engineer Estimate: $${item.engineerEstimate.toFixed(2)}/unit`
          : null,
        // Populate AI suggested price from engineer estimate or historical data
        ai_suggested_unit_price: aiSuggestedPrice,
        // Calculate suggested extended price if we have a suggestion
        ai_suggested_extended_price: aiSuggestedPrice ? aiSuggestedPrice * item.quantity : null,
        // Store metadata about pricing source with enhanced details
        ai_pricing_metadata: aiSuggestedPrice ? {
          source: pricingSource,
          confidence: pricingConfidence,
          extracted_at: new Date().toISOString(),
          source_description: pricingSource === 'engineer_estimate' ? 'From WVDOH engineer estimate in bid file'
            : pricingSource === 'historical' ? 'Weighted average from past bids'
            : pricingSource === 'base_price' ? 'From Triton pricing schedule'
            : 'From previous project data',
        } : null,
        // Mark as not reviewed
        pricing_reviewed: false,
      };
    });

    // Log details about what we're about to insert
    console.log(`Preparing to insert ${lineItemRecords.length} line items for project ${bidProjectId}`);
    if (lineItemRecords.length > 0) {
      console.log(`First item: ${lineItemRecords[0].item_number} - ${lineItemRecords[0].description?.substring(0, 50)}...`);
      console.log(`Last item: ${lineItemRecords[lineItemRecords.length - 1].item_number}`);
    }

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

    // CRITICAL: Verify items were actually inserted
    // This catches cases where insert "succeeds" but returns 0 rows (RLS or constraint issues)
    console.log(`Insert completed. Expected: ${lineItemRecords.length}, Got: ${insertedItems?.length || 0}`);

    if (!insertedItems || insertedItems.length === 0) {
      console.error('CRITICAL: Insert returned 0 rows despite no error. Possible RLS or constraint issue.');

      // Double-check by querying the database
      const { count: verifyCount } = await supabaseAdmin
        .from('bid_line_items')
        .select('id', { count: 'exact', head: true })
        .eq('bid_project_id', bidProjectId);

      console.log(`Database verification: ${verifyCount} items exist for project`);

      if (!verifyCount || verifyCount === 0) {
        await supabaseAdmin
          .from('bid_documents')
          .update({
            processing_status: 'FAILED',
            processing_error: `Insert returned 0 rows. Expected ${lineItemRecords.length} items. Database verification: ${verifyCount} items.`,
            processing_completed_at: new Date().toISOString(),
          })
          .eq('id', documentId);

        return new Response(
          JSON.stringify({
            error: 'Insert succeeded but returned 0 rows',
            details: {
              expected: lineItemRecords.length,
              returned: insertedItems?.length || 0,
              verified: verifyCount,
            }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Log successful insert with count
    console.log(`Successfully inserted ${insertedItems?.length || 0} line items for project ${bidProjectId}`);

    // =========================================================================
    // PRICING ENGINE: Match items to master and apply assembly-based costing
    // =========================================================================
    console.log('Starting assembly-based pricing calculation...');

    let matchedCount = 0;
    let assemblyAppliedCount = 0;

    try {
      // Step 1: Match line items to master WVDOH items
      // This calls the match_line_items_to_master() function from migration 107
      const { data: matchResult, error: matchError } = await supabaseAdmin.rpc(
        'match_line_items_to_master',
        { p_project_id: bidProjectId }
      );

      if (matchError) {
        console.error('Error matching items to master:', matchError.message);
      } else {
        matchedCount = matchResult || 0;
        console.log(`Matched ${matchedCount} line items to master WVDOH items`);
      }

      // Step 2: Get all line items that have a matched master item with a default assembly
      const { data: itemsWithAssemblies, error: assemblyQueryError } = await supabaseAdmin
        .from('bid_line_items')
        .select(`
          id,
          item_number,
          quantity,
          matched_master_item_id,
          master_wvdoh_items!inner (
            id,
            item_code,
            default_assembly_template_id
          )
        `)
        .eq('bid_project_id', bidProjectId)
        .not('matched_master_item_id', 'is', null);

      if (assemblyQueryError) {
        console.error('Error querying items with assemblies:', assemblyQueryError.message);
      } else if (itemsWithAssemblies) {
        // Step 3: Apply assembly templates to calculate base cost
        for (const item of itemsWithAssemblies) {
          const masterItem = item.master_wvdoh_items as {
            id: string;
            item_code: string;
            default_assembly_template_id: string | null
          };

          if (masterItem?.default_assembly_template_id) {
            // Call the apply_assembly_to_line_item function
            // Note: p_assembly_template_id is the correct parameter name per migration 107
            const { error: applyError } = await supabaseAdmin.rpc(
              'apply_assembly_to_line_item',
              {
                p_line_item_id: item.id,
                p_assembly_template_id: masterItem.default_assembly_template_id
              }
            );

            if (applyError) {
              console.error(`Error applying assembly to item ${item.item_number}:`, applyError.message);
            } else {
              assemblyAppliedCount++;
            }
          }
        }
        console.log(`Applied assembly-based costing to ${assemblyAppliedCount} line items`);
      }
    } catch (pricingError) {
      // Non-critical: log but don't fail the whole operation
      console.error('Assembly-based pricing error:', pricingError);
    }

    // CRITICAL: Update document status to COMPLETED immediately after successful insert
    // This prevents timeout issues from leaving documents stuck at PROCESSING
    await supabaseAdmin
      .from('bid_documents')
      .update({
        processing_status: 'COMPLETED',
        processing_completed_at: new Date().toISOString(),
        processing_error: null,
        ai_analysis_metadata: {
          lineItemCount: insertedItems?.length || 0,
          lineItemsParsed: parseResult.totalItems,
          lineItemsInserted: insertedItems?.length || 0,
          projectInfo: parseResult.projectInfo,
          parsedAt: new Date().toISOString(),
          pricingEngine: {
            itemsMatchedToMaster: matchedCount,
            assembliesApplied: assemblyAppliedCount,
          },
        },
      })
      .eq('id', documentId);

    // Update project info if extracted (non-critical, can timeout without issue)
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

    // Update project status if it was DRAFT (non-critical)
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
          pricingEngine: {
            itemsMatchedToMaster: matchedCount,
            assembliesApplied: assemblyAppliedCount,
            message: assemblyAppliedCount > 0
              ? `Base costs calculated for ${assemblyAppliedCount} items using assembly templates`
              : 'No assembly templates available for matched items',
          },
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse-bidx error:', error);

    // BUG FIX: Update document status to FAILED on general errors
    // Previously, the document would stay stuck at PROCESSING if an unhandled error occurred
    try {
      // Need to recreate admin client since we might be in the outer catch
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      // Try to get documentId from request body if available
      let documentId: string | null = null;
      try {
        const body = await req.clone().json();
        documentId = body?.documentId;
      } catch {
        // Body already consumed or invalid, can't get documentId
      }

      if (documentId) {
        await supabaseAdmin
          .from('bid_documents')
          .update({
            processing_status: 'FAILED',
            processing_error: error instanceof Error ? error.message : 'Unknown error during Bidx parsing',
            processing_completed_at: new Date().toISOString(),
          })
          .eq('id', documentId);
      }
    } catch (updateError) {
      console.error('Failed to update document status after error:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'An unexpected error occurred during Bidx parsing',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
