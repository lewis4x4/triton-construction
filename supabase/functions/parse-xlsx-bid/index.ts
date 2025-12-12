// Supabase Edge Function: parse-xlsx-bid
// Parses Excel (.xls/.xlsx) itemized bid files and extracts line items
// Supports WVDOH and standard DOT bid spreadsheet formats

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface XlsxLineItem {
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
  lineItems: XlsxLineItem[];
  totalItems: number;
  errors: string[];
  sheetName?: string;
}

// Column header patterns to identify bid item columns
const COLUMN_PATTERNS = {
  lineNumber: [/^line\s*(#|no|num|number)?$/i, /^#$/i, /^seq$/i, /^item\s*#$/i],
  itemNumber: [/^item\s*(#|no|num|number|code)?$/i, /^pay\s*item$/i, /^bid\s*item$/i, /^spec\s*item$/i],
  description: [/^description$/i, /^item\s*description$/i, /^desc$/i, /^work\s*description$/i],
  quantity: [/^(est\.?\s*)?quantity$/i, /^qty$/i, /^est\s*qty$/i, /^plan\s*qty$/i],
  unit: [/^unit$/i, /^uom$/i, /^unit\s*of\s*measure$/i, /^units$/i],
  unitPrice: [/^(unit\s*)?price$/i, /^unit\s*cost$/i, /^bid\s*price$/i, /^engineer.*estimate$/i],
  extendedPrice: [/^(extended|total)\s*(price|amount|cost)?$/i, /^amount$/i],
};

// Try to identify which column is which based on headers
function identifyColumns(headers: string[]): Record<string, number> {
  const columnMap: Record<string, number> = {};

  headers.forEach((header, index) => {
    const cleanHeader = (header || '').toString().trim();

    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (columnMap[field] !== undefined) continue; // Already found

      for (const pattern of patterns) {
        if (pattern.test(cleanHeader)) {
          columnMap[field] = index;
          break;
        }
      }
    }
  });

  return columnMap;
}

// Normalize WVDOH item number format
function normalizeItemNumber(itemNumber: string): string {
  if (!itemNumber) return '';

  const str = itemNumber.toString().trim();

  // WVDOH format: 201001-000 → 201.001
  const wvdohMatch = str.match(/^(\d{3})(\d{3})-(\d{3})$/);
  if (wvdohMatch) {
    return `${wvdohMatch[1]}.${wvdohMatch[2]}`;
  }

  // Already has decimal format
  if (str.match(/^\d+\.\d+$/)) {
    return str;
  }

  return str;
}

// Parse the Excel file and extract line items
function parseXlsxBid(fileBuffer: ArrayBuffer): ParseResult {
  const result: ParseResult = {
    success: false,
    lineItems: [],
    totalItems: 0,
    errors: [],
  };

  try {
    // Read the workbook
    const workbook = XLSX.read(fileBuffer, { type: 'array' });

    if (workbook.SheetNames.length === 0) {
      result.errors.push('No sheets found in the workbook');
      return result;
    }

    // Try to find the sheet with bid items
    // Common sheet names: "Bid Items", "Items", "Schedule", "Proposal", first sheet
    const sheetNamePriority = ['Bid Items', 'Items', 'Schedule', 'Proposal', 'Line Items', 'Bid'];
    let targetSheet: XLSX.WorkSheet | null = null;
    let targetSheetName = '';

    for (const name of sheetNamePriority) {
      if (workbook.SheetNames.includes(name)) {
        targetSheet = workbook.Sheets[name];
        targetSheetName = name;
        break;
      }
    }

    // Fallback to first sheet
    if (!targetSheet) {
      targetSheetName = workbook.SheetNames[0];
      targetSheet = workbook.Sheets[targetSheetName];
    }

    result.sheetName = targetSheetName;

    // Convert to JSON (array of arrays for flexibility)
    const sheetData = XLSX.utils.sheet_to_json<(string | number | null)[]>(targetSheet, {
      header: 1,
      defval: null,
    });

    if (sheetData.length < 2) {
      result.errors.push('Sheet has insufficient data (need header row + data rows)');
      return result;
    }

    // Find the header row (usually first row with multiple columns filled)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(10, sheetData.length); i++) {
      const row = sheetData[i];
      const filledCells = row?.filter(cell => cell !== null && cell !== '').length || 0;
      if (filledCells >= 3) {
        headerRowIndex = i;
        break;
      }
    }

    const headerRow = sheetData[headerRowIndex] as string[];
    const columnMap = identifyColumns(headerRow);

    // Check if we found essential columns
    if (columnMap.itemNumber === undefined && columnMap.description === undefined) {
      result.errors.push('Could not identify item number or description columns. Headers found: ' + headerRow.join(', '));
      return result;
    }

    // Try to extract project info from rows before header
    for (let i = 0; i < headerRowIndex; i++) {
      const row = sheetData[i];
      if (!row) continue;

      const rowText = row.map(c => String(c || '')).join(' ').toLowerCase();

      // Look for project info patterns
      if (rowText.includes('project') && !result.projectInfo?.projectName) {
        const cellValues = row.filter(c => c !== null && c !== '');
        if (cellValues.length >= 2) {
          result.projectInfo = result.projectInfo || {};
          result.projectInfo.projectName = String(cellValues[1] || cellValues[0]);
        }
      }
      if (rowText.includes('contract') && !result.projectInfo?.contractNumber) {
        const match = rowText.match(/contract[:\s#]*([a-z0-9\-]+)/i);
        if (match) {
          result.projectInfo = result.projectInfo || {};
          result.projectInfo.contractNumber = match[1].toUpperCase();
        }
      }
      if (rowText.includes('county') && !result.projectInfo?.county) {
        const cellValues = row.filter(c => c !== null && c !== '');
        if (cellValues.length >= 2) {
          result.projectInfo = result.projectInfo || {};
          result.projectInfo.county = String(cellValues[1] || '').replace(/county/i, '').trim();
        }
      }
      if ((rowText.includes('letting') || rowText.includes('bid date')) && !result.projectInfo?.lettingDate) {
        // Try to extract date
        for (const cell of row) {
          if (cell && typeof cell === 'number' && cell > 40000 && cell < 60000) {
            // Excel date serial number
            const date = new Date((cell - 25569) * 86400 * 1000);
            result.projectInfo = result.projectInfo || {};
            result.projectInfo.lettingDate = date.toISOString().split('T')[0];
            break;
          }
        }
      }
    }

    // Parse data rows
    let autoLineNumber = 0;
    for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
      const row = sheetData[i];
      if (!row) continue;

      // Skip empty rows
      const filledCells = row.filter(cell => cell !== null && cell !== '').length;
      if (filledCells < 2) continue;

      autoLineNumber++;

      // Extract values using column map
      const getValue = (field: string): string | number | null => {
        const colIndex = columnMap[field];
        if (colIndex === undefined) return null;
        return row[colIndex];
      };

      const rawItemNumber = String(getValue('itemNumber') || '').trim();
      const description = String(getValue('description') || '').trim();

      // Skip rows without item number AND description
      if (!rawItemNumber && !description) continue;

      // Parse quantity
      let quantity = 0;
      const qtyValue = getValue('quantity');
      if (qtyValue !== null) {
        const parsed = parseFloat(String(qtyValue).replace(/[,\s]/g, ''));
        if (!isNaN(parsed)) quantity = parsed;
      }

      // Parse unit price/engineer estimate
      let engineerEstimate: number | undefined;
      const priceValue = getValue('unitPrice');
      if (priceValue !== null) {
        const parsed = parseFloat(String(priceValue).replace(/[$,\s]/g, ''));
        if (!isNaN(parsed) && parsed > 0) engineerEstimate = parsed;
      }

      // Get line number
      let lineNumber = autoLineNumber;
      const lineNumValue = getValue('lineNumber');
      if (lineNumValue !== null) {
        const parsed = parseInt(String(lineNumValue), 10);
        if (!isNaN(parsed)) lineNumber = parsed;
      }

      // Normalize item number
      const itemNumber = normalizeItemNumber(rawItemNumber);
      const altItemNumber = (rawItemNumber && rawItemNumber !== itemNumber) ? rawItemNumber : undefined;

      // Get unit
      const unit = String(getValue('unit') || 'LS').trim().toUpperCase();

      result.lineItems.push({
        lineNumber,
        itemNumber: itemNumber || `ITEM-${lineNumber}`,
        altItemNumber,
        description: description || 'No description',
        quantity,
        unit,
        engineerEstimate,
      });
    }

    result.totalItems = result.lineItems.length;
    result.success = result.lineItems.length > 0;

    if (result.lineItems.length === 0) {
      result.errors.push('No valid line items found in the spreadsheet');
    }

  } catch (error) {
    result.errors.push(`Parse error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { documentId, bidProjectId, fileContent } = await req.json();

    if (!documentId && !fileContent) {
      return new Response(
        JSON.stringify({ error: 'Either documentId or fileContent is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let fileBuffer: ArrayBuffer;
    let projectId = bidProjectId;

    if (documentId) {
      // Fetch document from database
      const { data: doc, error: docError } = await supabase
        .from('bid_documents')
        .select('file_path, bid_project_id')
        .eq('id', documentId)
        .single();

      if (docError || !doc) {
        return new Response(
          JSON.stringify({ error: 'Document not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      projectId = doc.bid_project_id;

      // Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('bid-documents')
        .download(doc.file_path);

      if (downloadError || !fileData) {
        return new Response(
          JSON.stringify({ error: 'Failed to download document' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      fileBuffer = await fileData.arrayBuffer();
    } else {
      // Decode base64 file content
      const binaryStr = atob(fileContent);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      fileBuffer = bytes.buffer;
    }

    // Parse the Excel file
    const parseResult = parseXlsxBid(fileBuffer);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to parse Excel file',
          errors: parseResult.errors
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If we have a project ID, insert line items into database
    let insertedCount = 0;
    if (projectId && parseResult.lineItems.length > 0) {
      // Update project status
      await supabase
        .from('bid_projects')
        .update({
          status: 'IN_PROGRESS',
          ...(parseResult.projectInfo?.contractNumber && { contract_number: parseResult.projectInfo.contractNumber }),
          ...(parseResult.projectInfo?.county && { county: parseResult.projectInfo.county }),
          ...(parseResult.projectInfo?.lettingDate && { letting_date: parseResult.projectInfo.lettingDate }),
        })
        .eq('id', projectId)
        .eq('status', 'DRAFT'); // Only update if still in DRAFT

      // Check for existing line items
      const { data: existingItems } = await supabase
        .from('bid_line_items')
        .select('item_number')
        .eq('bid_project_id', projectId);

      const existingItemNumbers = new Set((existingItems || []).map(i => i.item_number));

      // Lookup historical pricing for exact item number matches
      const itemNumbers = parseResult.lineItems.map(i => i.itemNumber);
      const { data: historicalPricing } = await supabase
        .from('bid_line_items')
        .select('item_number, final_unit_price, bid_project_id')
        .in('item_number', itemNumbers)
        .not('final_unit_price', 'is', null)
        .order('created_at', { ascending: false });

      const priceMap = new Map<string, { price: number; projectId: string }>();
      for (const hist of historicalPricing || []) {
        if (!priceMap.has(hist.item_number)) {
          priceMap.set(hist.item_number, {
            price: hist.final_unit_price,
            projectId: hist.bid_project_id
          });
        }
      }

      // Prepare line items for insertion
      const lineItemsToInsert = parseResult.lineItems
        .filter(item => !existingItemNumbers.has(item.itemNumber))
        .map(item => {
          const historical = priceMap.get(item.itemNumber);
          const aiPrice = item.engineerEstimate || historical?.price || null;

          return {
            bid_project_id: projectId,
            line_number: item.lineNumber,
            item_number: item.itemNumber,
            alt_item_number: item.altItemNumber,
            description: item.description,
            short_description: item.shortDescription,
            quantity: item.quantity,
            unit: item.unit,
            estimator_notes: item.engineerEstimate ? `Engineer Estimate: $${item.engineerEstimate.toFixed(2)}` : null,
            ai_suggested_unit_price: aiPrice,
            ai_suggested_extended_price: aiPrice ? aiPrice * item.quantity : null,
            ai_pricing_metadata: aiPrice ? {
              source: item.engineerEstimate ? 'engineer_estimate' : 'historical_match',
              confidence: item.engineerEstimate ? 0.95 : 0.75,
              historical_project_id: historical?.projectId || null,
              extracted_at: new Date().toISOString(),
            } : null,
            source_document_id: documentId || null,
            pricing_reviewed: false,
          };
        });

      if (lineItemsToInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('bid_line_items')
          .insert(lineItemsToInsert)
          .select('id');

        if (insertError) {
          console.error('Insert error:', insertError);
          parseResult.errors.push(`Database insert error: ${insertError.message}`);
        } else {
          insertedCount = inserted?.length || 0;
        }
      }

      // Update document status if we have a document ID
      if (documentId) {
        await supabase
          .from('bid_documents')
          .update({
            processing_status: 'COMPLETED',
            processing_completed_at: new Date().toISOString(),
            ai_summary: `Extracted ${parseResult.lineItems.length} line items from Excel spreadsheet (sheet: ${parseResult.sheetName})`,
            ai_analysis_metadata: {
              sheet_name: parseResult.sheetName,
              total_items: parseResult.lineItems.length,
              items_with_pricing: parseResult.lineItems.filter(i => i.engineerEstimate).length,
              project_info: parseResult.projectInfo,
            },
          })
          .eq('id', documentId);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalItems: parseResult.totalItems,
        insertedItems: insertedCount,
        skippedItems: parseResult.totalItems - insertedCount,
        projectInfo: parseResult.projectInfo,
        sheetName: parseResult.sheetName,
        errors: parseResult.errors,
        lineItems: parseResult.lineItems.slice(0, 5), // Return first 5 for preview
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Parse-xlsx-bid error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred during Excel parsing' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
