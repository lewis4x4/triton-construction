// =============================================================================
// Edge Function: ocr-process
// Purpose: Extract data from delivery tickets and documents using OCR
// Per CLAUDE.md: Integration with Google Document AI
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRRequest {
  document_url: string;
  document_type: 'DELIVERY_TICKET' | 'BATCH_TICKET' | 'INVOICE' | 'GENERAL';
  ticket_id?: string;
  project_id?: string;
}

interface ExtractedData {
  document_type: string;
  raw_text: string;
  structured_data: Record<string, any>;
  confidence: number;
  fields: ExtractedField[];
}

interface ExtractedField {
  field_name: string;
  value: string;
  confidence: number;
  bounding_box?: any;
}

// Common field patterns for construction documents
const FIELD_PATTERNS = {
  ticket_number: /(?:ticket|load|delivery)\s*#?\s*[:.]?\s*(\d+[-\w]*)/i,
  date: /(?:date|dated?)\s*[:.]?\s*([\d\/\-]+)/i,
  time: /(?:time|loaded|arrived)\s*[:.]?\s*([\d:]+\s*(?:am|pm)?)/i,
  quantity: /(?:qty|quantity|amount|tons?|yards?|cy|gallons?)\s*[:.]?\s*([\d,.]+)/i,
  material: /(?:material|product|mix|type)\s*[:.]?\s*([A-Za-z0-9\s\-#]+)/i,
  supplier: /(?:supplier|vendor|from|plant|source)\s*[:.]?\s*([A-Za-z0-9\s&.,]+)/i,
  project: /(?:project|job|site)\s*[:.]?\s*([A-Za-z0-9\s\-#]+)/i,
  truck: /(?:truck|vehicle|unit)\s*#?\s*[:.]?\s*(\d+[-\w]*)/i,
  driver: /(?:driver|hauler)\s*[:.]?\s*([A-Za-z\s]+)/i,
  po_number: /(?:po|purchase\s*order)\s*#?\s*[:.]?\s*(\d+[-\w]*)/i,
  weight: /(?:net|gross|tare)\s*(?:weight)?\s*[:.]?\s*([\d,.]+)\s*(?:lbs?|tons?)?/i,
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Azure Document Intelligence (formerly Form Recognizer)
    const azureEndpoint = Deno.env.get('AZURE_DOCUMENT_AI_ENDPOINT');
    const azureKey = Deno.env.get('AZURE_DOCUMENT_AI_KEY');

    const { document_url, document_type, ticket_id, project_id } = await req.json() as OCRRequest;

    if (!document_url) {
      throw new Error('document_url is required');
    }

    console.log(`Processing OCR for: ${document_type}`);

    let extractedData: ExtractedData;

    if (azureEndpoint && azureKey) {
      // Use Azure Document Intelligence
      extractedData = await processWithAzure(document_url, azureEndpoint, azureKey);
    } else {
      // Fallback: Use Claude Vision for OCR
      const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
      if (!anthropicApiKey) {
        throw new Error('No OCR service configured (AZURE_DOCUMENT_AI_KEY or ANTHROPIC_API_KEY)');
      }
      extractedData = await processWithClaude(document_url, document_type, anthropicApiKey);
    }

    // Parse structured data based on document type
    const structuredData = parseStructuredData(extractedData.raw_text, document_type);
    extractedData.structured_data = structuredData;

    // Save OCR extraction result
    const { data: ocrRecord, error: ocrError } = await supabaseClient
      .from('ocr_extractions')
      .insert({
        source_type: document_type,
        source_url: document_url,
        raw_text: extractedData.raw_text,
        extracted_data: structuredData,
        confidence_score: extractedData.confidence,
        status: 'COMPLETED',
        ticket_id,
        project_id,
      })
      .select('id')
      .single();

    if (ocrError) {
      console.error('Failed to save OCR extraction:', ocrError);
    }

    // If this is a delivery ticket and we have enough data, create/update material_ticket
    if (document_type === 'DELIVERY_TICKET' && structuredData.ticket_number && project_id) {
      await supabaseClient
        .from('material_tickets')
        .upsert({
          project_id,
          ticket_number: structuredData.ticket_number,
          ticket_date: structuredData.date || new Date().toISOString().split('T')[0],
          material_description: structuredData.material,
          quantity: parseFloat(structuredData.quantity) || null,
          unit: structuredData.unit,
          supplier_name: structuredData.supplier,
          truck_number: structuredData.truck,
          driver_name: structuredData.driver,
          po_number: structuredData.po_number,
          ocr_extraction_id: ocrRecord?.id,
          source_image_url: document_url,
          status: 'PENDING_REVIEW',
        }, {
          onConflict: 'project_id,ticket_number',
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        extraction_id: ocrRecord?.id,
        data: extractedData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('OCR processing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function processWithAzure(documentUrl: string, endpoint: string, key: string): Promise<ExtractedData> {
  // Azure Document Intelligence API call
  const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-02-29-preview`;

  const response = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ urlSource: documentUrl }),
  });

  if (!response.ok) {
    throw new Error(`Azure API error: ${response.status}`);
  }

  // Get operation location for polling
  const operationLocation = response.headers.get('Operation-Location');
  if (!operationLocation) {
    throw new Error('No operation location returned');
  }

  // Poll for results
  let result;
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const statusResponse = await fetch(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    });

    result = await statusResponse.json();
    if (result.status === 'succeeded') break;
    if (result.status === 'failed') throw new Error('Azure processing failed');
  }

  // Extract text from result
  const rawText = result.analyzeResult?.content || '';
  const confidence = result.analyzeResult?.pages?.[0]?.confidence || 0.8;

  return {
    document_type: 'GENERAL',
    raw_text: rawText,
    structured_data: {},
    confidence,
    fields: [],
  };
}

async function processWithClaude(documentUrl: string, documentType: string, apiKey: string): Promise<ExtractedData> {
  // Download and convert image to base64
  const imageResponse = await fetch(documentUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

  const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: `Extract ALL text from this ${documentType.toLowerCase().replace('_', ' ')} image.

First, provide the complete raw text exactly as shown.

Then, identify and extract these specific fields if present:
- Ticket/Load Number
- Date and Time
- Material/Product Type
- Quantity and Unit
- Supplier/Source
- Project/Job Name
- Truck Number
- Driver Name
- PO Number
- Weight (Net/Gross/Tare)

Format your response as:
RAW TEXT:
[complete text from document]

EXTRACTED FIELDS:
ticket_number: [value]
date: [value]
time: [value]
material: [value]
quantity: [value]
unit: [value]
supplier: [value]
project: [value]
truck: [value]
driver: [value]
po_number: [value]
weight: [value]`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const result = await response.json();
  const text = result.content[0]?.text || '';

  // Parse the response
  const rawTextMatch = text.match(/RAW TEXT:\s*([\s\S]*?)(?=EXTRACTED FIELDS:|$)/i);
  const rawText = rawTextMatch ? rawTextMatch[1].trim() : text;

  return {
    document_type: documentType,
    raw_text: rawText,
    structured_data: {},
    confidence: 0.85,
    fields: [],
  };
}

function parseStructuredData(text: string, documentType: string): Record<string, any> {
  const data: Record<string, any> = {};

  // Try to extract fields using patterns
  for (const [fieldName, pattern] of Object.entries(FIELD_PATTERNS)) {
    const match = text.match(pattern);
    if (match) {
      data[fieldName] = match[1].trim();
    }
  }

  // Also try to parse from Claude's structured response
  const fieldsSection = text.match(/EXTRACTED FIELDS:\s*([\s\S]*)/i);
  if (fieldsSection) {
    const lines = fieldsSection[1].split('\n');
    for (const line of lines) {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase().replace(/\s+/g, '_');
        const value = line.substring(colonIndex + 1).trim();
        if (value && value.toLowerCase() !== '[value]' && value !== 'N/A') {
          data[key] = value;
        }
      }
    }
  }

  return data;
}
