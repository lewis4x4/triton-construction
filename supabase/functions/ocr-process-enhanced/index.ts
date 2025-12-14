// =============================================================================
// Edge Function: ocr-process-enhanced
// Purpose: Enhanced OCR ticket processing with AI validation and correction
// Supports concrete/asphalt specific fields, confidence scoring, auto-matching
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnhancedOCRRequest {
  document_url: string;
  document_type: 'DELIVERY_TICKET' | 'BATCH_TICKET' | 'ASPHALT_TICKET' | 'WEIGHT_TICKET' | 'INVOICE';
  ticket_id?: string;
  project_id?: string;
  supplier_id?: string;
  skip_ai_validation?: boolean;
}

interface OCRField {
  value: string | number | null;
  confidence: number;
  source: 'ocr' | 'ai_corrected' | 'ai_inferred';
  original_value?: string;
  validation_notes?: string;
}

interface ExtractedData {
  ticket_number: OCRField;
  vendor_ticket_number: OCRField;
  delivery_date: OCRField;
  delivery_time: OCRField;
  material_description: OCRField;
  material_type: OCRField;
  quantity: OCRField;
  unit_of_measure: OCRField;
  unit_price: OCRField;
  total_amount: OCRField;
  net_weight: OCRField;
  gross_weight: OCRField;
  tare_weight: OCRField;
  truck_number: OCRField;
  driver_name: OCRField;
  supplier_name: OCRField;
  po_number: OCRField;
  delivery_location: OCRField;
  project_number: OCRField;
  // Concrete specific
  mix_design: OCRField;
  slump: OCRField;
  air_content: OCRField;
  concrete_temp: OCRField;
  water_added: OCRField;
  load_number: OCRField;
  batch_time: OCRField;
  // Asphalt specific
  asphalt_mix_type: OCRField;
  pg_grade: OCRField;
  asphalt_temp: OCRField;
  plant_name: OCRField;
  lot_number: OCRField;
}

interface ValidationResult {
  is_valid: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
  overall_confidence: number;
}

interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggested_value?: string;
}

const AI_VALIDATION_PROMPT = `You are an expert construction materials logistics specialist reviewing OCR-extracted data from delivery tickets for WVDOH highway construction projects.

Your task is to validate and correct OCR extraction errors. Common issues include:
- Misread characters (0/O, 1/l/I, 5/S, 8/B)
- Date format confusion (MM/DD vs DD/MM)
- Unit misreading (TON/TN, CY/CU YD, LF/LN FT)
- Number transposition
- Missing decimal points in weights

MATERIAL TYPES (categorize based on description):
- aggregate: stone, gravel, sand, crush, base
- asphalt: HMA, hot mix, bituminous, surface course, binder
- concrete: ready mix, portland cement, pcc
- steel: rebar, reinforcement, structural steel
- pipe: RCP, HDPE, corrugated metal, culvert
- earthwork: topsoil, fill, borrow
- erosion: blanket, matting, silt fence
- safety: guardrail, signs, barrier

COMMON UNIT OF MEASURE:
- Aggregate: TON, CY
- Asphalt: TON
- Concrete: CY
- Steel: LB, TON
- Pipe: LF, EA
- Earthwork: CY, TON

CONCRETE TICKETS should have: mix design, slump (typically 2-6 inches), air content (typically 3-8%), temperature
ASPHALT TICKETS should have: mix type, PG grade (like PG 64-22), temperature (typically 275-325°F)

Validate the extracted data and return corrections in JSON format.`;

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
    const azureEndpoint = Deno.env.get('AZURE_DOCUMENT_AI_ENDPOINT');
    const azureKey = Deno.env.get('AZURE_DOCUMENT_AI_KEY');

    const request = await req.json() as EnhancedOCRRequest;

    if (!request.document_url) {
      throw new Error('document_url is required');
    }

    console.log(`Processing ${request.document_type} from: ${request.document_url}`);

    // Step 1: Get raw OCR extraction
    let rawExtraction: Record<string, any>;
    let ocrProvider: string;

    if (azureEndpoint && azureKey) {
      rawExtraction = await extractWithAzure(request.document_url, azureEndpoint, azureKey);
      ocrProvider = 'azure_document_ai';
    } else if (anthropicApiKey) {
      rawExtraction = await extractWithClaude(request.document_url, anthropicApiKey, request.document_type);
      ocrProvider = 'claude_vision';
    } else {
      throw new Error('No OCR provider configured. Set AZURE_DOCUMENT_AI_ENDPOINT/KEY or ANTHROPIC_API_KEY');
    }

    console.log('Raw OCR extraction complete');

    // Step 2: Structure the extracted data with field confidence
    let extractedData = structureExtraction(rawExtraction, request.document_type);

    // Step 3: AI Validation and Correction (unless skipped)
    let validationResult: ValidationResult = {
      is_valid: true,
      issues: [],
      suggestions: [],
      overall_confidence: calculateOverallConfidence(extractedData),
    };

    if (!request.skip_ai_validation && anthropicApiKey) {
      console.log('Running AI validation...');
      const aiValidation = await validateWithAI(extractedData, anthropicApiKey, request.document_type);
      extractedData = applyAICorrections(extractedData, aiValidation);
      validationResult = aiValidation.validation;
    }

    // Step 4: Auto-match to PO if possible
    let matchedPO: { id: string; po_number: string; confidence: number } | null = null;
    if (extractedData.po_number.value || request.project_id) {
      matchedPO = await findMatchingPO(
        supabaseClient,
        extractedData.po_number.value as string,
        request.project_id,
        extractedData.supplier_name.value as string,
        extractedData.material_description.value as string
      );
    }

    // Step 5: Create or update ticket record
    let ticketId = request.ticket_id;
    const ticketData = prepareTicketData(extractedData, request, matchedPO);

    if (ticketId) {
      // Update existing ticket
      const { error: updateError } = await supabaseClient
        .from('material_tickets')
        .update({
          ...ticketData,
          ocr_status: 'COMPLETE',
          ocr_completed_at: new Date().toISOString(),
          ocr_provider: ocrProvider,
          ocr_confidence: validationResult.overall_confidence,
        })
        .eq('id', ticketId);

      if (updateError) {
        throw new Error(`Failed to update ticket: ${updateError.message}`);
      }
    } else {
      // Create new ticket
      const { data: newTicket, error: insertError } = await supabaseClient
        .from('material_tickets')
        .insert({
          ...ticketData,
          project_id: request.project_id,
          status: 'PENDING',
          ocr_status: 'COMPLETE',
          ocr_completed_at: new Date().toISOString(),
          ocr_provider: ocrProvider,
          ocr_confidence: validationResult.overall_confidence,
        })
        .select('id, ticket_number')
        .single();

      if (insertError) {
        throw new Error(`Failed to create ticket: ${insertError.message}`);
      }
      ticketId = newTicket.id;
    }

    // Step 6: Store OCR extraction details
    await supabaseClient
      .from('ocr_extractions')
      .upsert({
        ticket_id: ticketId,
        raw_text: JSON.stringify(rawExtraction),
        extracted_fields: extractedData,
        field_confidences: Object.fromEntries(
          Object.entries(extractedData).map(([k, v]) => [k, (v as OCRField).confidence])
        ),
        validation_issues: validationResult.issues,
        ocr_provider: ocrProvider,
        processing_duration_ms: Date.now(), // Will be replaced with actual duration
        created_at: new Date().toISOString(),
      }, { onConflict: 'ticket_id' });

    // Step 7: Handle material-specific details
    if (request.document_type === 'BATCH_TICKET' && extractedData.mix_design.value) {
      await saveConcreteBatchDetails(supabaseClient, ticketId!, extractedData);
    } else if (request.document_type === 'ASPHALT_TICKET' && extractedData.asphalt_mix_type.value) {
      await saveAsphaltDeliveryDetails(supabaseClient, ticketId!, extractedData);
    }

    // Step 8: Auto-match reconciliation if PO found
    if (matchedPO && matchedPO.confidence > 0.8) {
      await createReconciliationRecord(supabaseClient, ticketId!, matchedPO.id, extractedData);
    }

    console.log(`OCR processing complete for ticket: ${ticketId}`);

    return new Response(
      JSON.stringify({
        success: true,
        ticket_id: ticketId,
        extracted_data: extractedData,
        validation: validationResult,
        matched_po: matchedPO,
        ocr_provider: ocrProvider,
        overall_confidence: validationResult.overall_confidence,
        message: validationResult.is_valid
          ? 'OCR extraction complete - review recommended'
          : `OCR extraction complete with ${validationResult.issues.length} issues requiring attention`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Enhanced OCR processing error:', error);

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

// Azure Document Intelligence extraction
async function extractWithAzure(
  documentUrl: string,
  endpoint: string,
  apiKey: string
): Promise<Record<string, any>> {
  const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-document:analyze?api-version=2024-02-29-preview`;

  const analyzeResponse = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urlSource: documentUrl }),
  });

  if (!analyzeResponse.ok) {
    throw new Error(`Azure API error: ${analyzeResponse.status}`);
  }

  const operationLocation = analyzeResponse.headers.get('Operation-Location');
  if (!operationLocation) {
    throw new Error('No operation location returned');
  }

  // Poll for results
  let result: any;
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const statusResponse = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey },
    });

    const statusData = await statusResponse.json();
    if (statusData.status === 'succeeded') {
      result = statusData.analyzeResult;
      break;
    } else if (statusData.status === 'failed') {
      throw new Error('Azure analysis failed');
    }
  }

  if (!result) {
    throw new Error('Azure analysis timed out');
  }

  // Extract key-value pairs and text
  const extracted: Record<string, any> = {
    raw_text: result.content,
    key_value_pairs: {},
    tables: result.tables || [],
  };

  for (const kv of result.keyValuePairs || []) {
    if (kv.key?.content && kv.value?.content) {
      extracted.key_value_pairs[kv.key.content.toLowerCase()] = {
        value: kv.value.content,
        confidence: kv.confidence || 0.8,
      };
    }
  }

  return extracted;
}

// Claude Vision extraction
async function extractWithClaude(
  documentUrl: string,
  apiKey: string,
  documentType: string
): Promise<Record<string, any>> {
  const typeSpecificFields = documentType === 'BATCH_TICKET'
    ? 'Also extract: mix_design, slump (inches), air_content (%), concrete_temp (°F), water_added (gallons), load_number, batch_time'
    : documentType === 'ASPHALT_TICKET'
    ? 'Also extract: asphalt_mix_type, pg_grade (like PG 64-22), asphalt_temp (°F), plant_name, lot_number'
    : '';

  const extractionPrompt = `Extract all text and data from this delivery ticket image. Return a JSON object with these fields:
- ticket_number (vendor's ticket number)
- delivery_date (YYYY-MM-DD format)
- delivery_time (HH:MM format)
- material_description (full description)
- quantity (number only)
- unit_of_measure (TON, CY, LF, LB, etc.)
- unit_price (if shown)
- total_amount (if shown)
- net_weight (in lbs if shown)
- gross_weight (in lbs if shown)
- tare_weight (in lbs if shown)
- truck_number
- driver_name
- supplier_name
- po_number (customer PO if shown)
- delivery_location (station or location)
- project_number (if shown)
${typeSpecificFields}

For each field, include:
- "value": the extracted value
- "confidence": confidence score 0-1

Return ONLY valid JSON, no explanation.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: documentUrl },
            },
            {
              type: 'text',
              text: extractionPrompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const responseText = result.content[0]?.text || '';

  // Parse JSON from response
  let jsonStr = responseText;
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    // Return raw text if JSON parsing fails
    return { raw_text: responseText, extraction_failed: true };
  }
}

// Structure raw extraction into typed fields
function structureExtraction(raw: Record<string, any>, documentType: string): ExtractedData {
  const getField = (keys: string[], defaultConf = 0.5): OCRField => {
    for (const key of keys) {
      if (raw[key]) {
        if (typeof raw[key] === 'object' && raw[key].value !== undefined) {
          return {
            value: raw[key].value,
            confidence: raw[key].confidence || defaultConf,
            source: 'ocr',
          };
        }
        return {
          value: raw[key],
          confidence: defaultConf,
          source: 'ocr',
        };
      }
      // Check key_value_pairs from Azure
      if (raw.key_value_pairs?.[key.toLowerCase()]) {
        const kv = raw.key_value_pairs[key.toLowerCase()];
        return {
          value: kv.value,
          confidence: kv.confidence || defaultConf,
          source: 'ocr',
        };
      }
    }
    return { value: null, confidence: 0, source: 'ocr' };
  };

  return {
    ticket_number: getField(['ticket_number', 'ticket #', 'ticket no', 'ticket']),
    vendor_ticket_number: getField(['vendor_ticket_number', 'vendor ticket']),
    delivery_date: getField(['delivery_date', 'date', 'del date']),
    delivery_time: getField(['delivery_time', 'time', 'del time']),
    material_description: getField(['material_description', 'material', 'description', 'product']),
    material_type: getField(['material_type', 'type']),
    quantity: getField(['quantity', 'qty', 'amount']),
    unit_of_measure: getField(['unit_of_measure', 'unit', 'uom']),
    unit_price: getField(['unit_price', 'price', 'rate']),
    total_amount: getField(['total_amount', 'total', 'amount']),
    net_weight: getField(['net_weight', 'net', 'net wt']),
    gross_weight: getField(['gross_weight', 'gross', 'gross wt']),
    tare_weight: getField(['tare_weight', 'tare', 'tare wt']),
    truck_number: getField(['truck_number', 'truck #', 'truck', 'vehicle']),
    driver_name: getField(['driver_name', 'driver', 'hauler']),
    supplier_name: getField(['supplier_name', 'supplier', 'vendor', 'company']),
    po_number: getField(['po_number', 'po #', 'po', 'purchase order', 'customer po']),
    delivery_location: getField(['delivery_location', 'location', 'station', 'destination']),
    project_number: getField(['project_number', 'project', 'job', 'contract']),
    // Concrete fields
    mix_design: getField(['mix_design', 'mix', 'design']),
    slump: getField(['slump', 'slump_at_site']),
    air_content: getField(['air_content', 'air', 'air %']),
    concrete_temp: getField(['concrete_temp', 'temp', 'temperature']),
    water_added: getField(['water_added', 'water']),
    load_number: getField(['load_number', 'load #', 'load']),
    batch_time: getField(['batch_time', 'batch']),
    // Asphalt fields
    asphalt_mix_type: getField(['asphalt_mix_type', 'mix type', 'asphalt type']),
    pg_grade: getField(['pg_grade', 'pg', 'grade']),
    asphalt_temp: getField(['asphalt_temp', 'mat temp', 'material temp']),
    plant_name: getField(['plant_name', 'plant']),
    lot_number: getField(['lot_number', 'lot', 'lot #']),
  };
}

// AI validation and correction
async function validateWithAI(
  data: ExtractedData,
  apiKey: string,
  documentType: string
): Promise<{ corrections: Record<string, any>; validation: ValidationResult }> {
  const userPrompt = `Review this OCR-extracted delivery ticket data for errors and inconsistencies:

Document Type: ${documentType}

Extracted Data:
${JSON.stringify(data, null, 2)}

Please:
1. Identify any OCR errors or suspicious values
2. Suggest corrections for any errors found
3. Infer material_type if not extracted
4. Validate date/time formats
5. Check unit consistency (e.g., weight in lbs, quantity matching unit)
6. Flag any missing critical fields

Return JSON with:
{
  "corrections": {
    "field_name": { "corrected_value": "...", "reason": "..." }
  },
  "validation": {
    "is_valid": boolean,
    "issues": [{ "field": "...", "severity": "error|warning|info", "message": "...", "suggested_value": "..." }],
    "suggestions": ["..."],
    "overall_confidence": 0-100
  },
  "inferred_fields": {
    "material_type": "aggregate|asphalt|concrete|steel|pipe|earthwork|erosion|safety"
  }
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: AI_VALIDATION_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    console.error('AI validation failed, skipping');
    return {
      corrections: {},
      validation: {
        is_valid: true,
        issues: [],
        suggestions: [],
        overall_confidence: calculateOverallConfidence(data),
      },
    };
  }

  const result = await response.json();
  const responseText = result.content[0]?.text || '';

  let jsonStr = responseText;
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    return {
      corrections: {},
      validation: {
        is_valid: true,
        issues: [],
        suggestions: ['AI validation response could not be parsed'],
        overall_confidence: calculateOverallConfidence(data),
      },
    };
  }
}

// Apply AI corrections to extracted data
function applyAICorrections(
  data: ExtractedData,
  aiResult: { corrections: Record<string, any>; validation: ValidationResult; inferred_fields?: Record<string, any> }
): ExtractedData {
  const updated = { ...data };

  // Apply corrections
  for (const [field, correction] of Object.entries(aiResult.corrections || {})) {
    if (field in updated && correction.corrected_value !== undefined) {
      const existing = updated[field as keyof ExtractedData] as OCRField;
      updated[field as keyof ExtractedData] = {
        value: correction.corrected_value,
        confidence: Math.max(existing.confidence, 0.85), // Boost confidence after AI review
        source: 'ai_corrected',
        original_value: String(existing.value),
        validation_notes: correction.reason,
      } as OCRField;
    }
  }

  // Apply inferred fields
  for (const [field, value] of Object.entries(aiResult.inferred_fields || {})) {
    if (field in updated) {
      const existing = updated[field as keyof ExtractedData] as OCRField;
      if (!existing.value) {
        updated[field as keyof ExtractedData] = {
          value,
          confidence: 0.75,
          source: 'ai_inferred',
        } as OCRField;
      }
    }
  }

  return updated;
}

// Calculate overall confidence
function calculateOverallConfidence(data: ExtractedData): number {
  const criticalFields = ['ticket_number', 'delivery_date', 'material_description', 'quantity', 'unit_of_measure'];
  const importantFields = ['supplier_name', 'truck_number', 'net_weight'];

  let totalWeight = 0;
  let weightedSum = 0;

  for (const [field, fieldData] of Object.entries(data)) {
    const ocr = fieldData as OCRField;
    if (!ocr.value) continue;

    let weight = 1;
    if (criticalFields.includes(field)) weight = 3;
    else if (importantFields.includes(field)) weight = 2;

    totalWeight += weight;
    weightedSum += ocr.confidence * weight;
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) : 0;
}

// Find matching PO
async function findMatchingPO(
  supabase: any,
  poNumber: string | null,
  projectId: string | undefined,
  supplierName: string | null,
  materialDescription: string | null
): Promise<{ id: string; po_number: string; confidence: number } | null> {
  // Try exact PO number match first
  if (poNumber) {
    const { data: exactMatch } = await supabase
      .from('purchase_orders')
      .select('id, po_number')
      .ilike('po_number', `%${poNumber}%`)
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();

    if (exactMatch) {
      return { ...exactMatch, confidence: 0.95 };
    }
  }

  // Try supplier + project match
  if (projectId && supplierName) {
    const { data: supplierMatch } = await supabase
      .from('purchase_orders')
      .select('id, po_number, suppliers!inner(company_name)')
      .eq('project_id', projectId)
      .eq('status', 'ACTIVE')
      .ilike('suppliers.company_name', `%${supplierName.split(' ')[0]}%`)
      .limit(1);

    if (supplierMatch && supplierMatch.length > 0) {
      return { id: supplierMatch[0].id, po_number: supplierMatch[0].po_number, confidence: 0.7 };
    }
  }

  return null;
}

// Prepare ticket data for database
function prepareTicketData(
  data: ExtractedData,
  request: EnhancedOCRRequest,
  matchedPO: { id: string; po_number: string; confidence: number } | null
): Record<string, any> {
  const getValue = (field: OCRField) => field.value;

  return {
    ticket_number: getValue(data.ticket_number) || `OCR-${Date.now()}`,
    vendor_ticket_number: getValue(data.vendor_ticket_number),
    delivery_date: getValue(data.delivery_date) || new Date().toISOString().split('T')[0],
    delivery_time: getValue(data.delivery_time),
    material_description: getValue(data.material_description),
    material_type: getValue(data.material_type),
    quantity: parseFloat(String(getValue(data.quantity))) || 0,
    unit_of_measure: getValue(data.unit_of_measure) || 'EA',
    unit_price: getValue(data.unit_price) ? parseFloat(String(getValue(data.unit_price))) : null,
    total_amount: getValue(data.total_amount) ? parseFloat(String(getValue(data.total_amount))) : null,
    net_weight: getValue(data.net_weight) ? parseFloat(String(getValue(data.net_weight))) : null,
    gross_weight: getValue(data.gross_weight) ? parseFloat(String(getValue(data.gross_weight))) : null,
    tare_weight: getValue(data.tare_weight) ? parseFloat(String(getValue(data.tare_weight))) : null,
    truck_number: getValue(data.truck_number),
    driver_name: getValue(data.driver_name),
    delivery_location: getValue(data.delivery_location),
    matched_po_id: matchedPO?.id,
    matched_po_confidence: matchedPO?.confidence,
    supplier_id: request.supplier_id,
    document_type: request.document_type,
    ticket_photo_url: request.document_url,
  };
}

// Save concrete batch details
async function saveConcreteBatchDetails(supabase: any, ticketId: string, data: ExtractedData): Promise<void> {
  const getValue = (field: OCRField) => field.value;

  await supabase
    .from('concrete_batch_details')
    .upsert({
      ticket_id: ticketId,
      mix_design: getValue(data.mix_design),
      slump_at_plant: null,
      slump_at_site: getValue(data.slump) ? parseFloat(String(getValue(data.slump))) : null,
      air_content: getValue(data.air_content) ? parseFloat(String(getValue(data.air_content))) : null,
      concrete_temp: getValue(data.concrete_temp) ? parseFloat(String(getValue(data.concrete_temp))) : null,
      water_added_at_site: getValue(data.water_added) ? parseFloat(String(getValue(data.water_added))) : null,
      load_number: getValue(data.load_number) ? parseInt(String(getValue(data.load_number))) : null,
      batch_time: getValue(data.batch_time),
    }, { onConflict: 'ticket_id' });
}

// Save asphalt delivery details
async function saveAsphaltDeliveryDetails(supabase: any, ticketId: string, data: ExtractedData): Promise<void> {
  const getValue = (field: OCRField) => field.value;

  await supabase
    .from('asphalt_delivery_details')
    .upsert({
      ticket_id: ticketId,
      mix_type: getValue(data.asphalt_mix_type),
      pg_grade: getValue(data.pg_grade),
      plant_temp: getValue(data.asphalt_temp) ? parseFloat(String(getValue(data.asphalt_temp))) : null,
      plant_name: getValue(data.plant_name),
      lot_number: getValue(data.lot_number),
    }, { onConflict: 'ticket_id' });
}

// Create reconciliation record
async function createReconciliationRecord(
  supabase: any,
  ticketId: string,
  poId: string,
  data: ExtractedData
): Promise<void> {
  const getValue = (field: OCRField) => field.value;

  await supabase
    .from('material_reconciliation')
    .insert({
      ticket_id: ticketId,
      po_id: poId,
      ticket_quantity: parseFloat(String(getValue(data.quantity))) || 0,
      ticket_unit: getValue(data.unit_of_measure),
      match_status: 'AUTO_MATCHED',
      match_confidence: 0.8,
      reconciled_at: new Date().toISOString(),
    });
}
