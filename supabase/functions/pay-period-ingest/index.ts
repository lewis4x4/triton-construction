// =============================================================================
// Edge Function: pay-period-ingest
// Purpose: Ingest pay estimate PDFs with validation before database write
// Per UNIFIED_MODULE_SPECIFICATION V7.0 Section 4.8
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =============================================================================
// TYPES
// =============================================================================

interface PayPeriodIngestRequest {
  project_id: string;
  pdf_url: string;
  estimate_type: 'preliminary' | 'final';
}

interface ExtractedPayEstimate {
  summary: {
    estimate_number: number;
    period_start?: string;
    period_end: string;
    posted_item_pay: number;
    asphalt_adjustment?: number;
    fuel_adjustment?: number;
    stockpile_current?: number;
    stockpile_previous?: number;
    material_withheld?: number;
    material_credit?: number;
    gross_item_pay?: number;
    net_pay_amount: number;
    cumulative_posted_item_pay?: number;
    cumulative_stockpile?: number;
    cumulative_net_pay?: number;
  };
  line_items: Array<{
    line_number: string;
    item_number: string;
    description: string;
    unit: string;
    unit_price: number;
    plan_qty?: number;
    previous_qty: number;
    this_estimate_qty: number;
    this_estimate_amount: number;
    total_to_date_qty: number;
    total_to_date_amount: number;
  }>;
  imr_items?: Array<{
    dmir_number: string;
    item_number: string;
    description?: string;
    qty_withheld: number;
    amount_withheld: number;
    deficiency_type: string;
  }>;
}

interface ValidationResult {
  passed: boolean;
  status: 'passed' | 'failed_math' | 'failed_missing_data';
  errors: string[];
  warnings: string[];
  discrepancies: {
    lineItemSum: number;
    previousSum: number;
    toDateSum: number;
    failedLines: Array<{
      item_number: string;
      line_number: string;
      expected: number;
      actual: number;
      discrepancy: number;
    }>;
  };
}

// =============================================================================
// VALIDATION CONFIG
// =============================================================================

const TOLERANCE = 0.02;        // $0.02 tolerance for sum checks
const LINE_TOLERANCE = 0.01;   // $0.01 tolerance for line item calculations

// =============================================================================
// VALIDATION FUNCTION
// =============================================================================

function validateExtraction(data: ExtractedPayEstimate): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const failedLines: ValidationResult['discrepancies']['failedLines'] = [];

  // 1. Sum all line item current amounts
  const lineItemCurrentSum = data.line_items.reduce(
    (sum, item) => sum + (item.this_estimate_amount || 0), 0
  );
  const lineItemDiscrepancy = Math.abs(
    lineItemCurrentSum - (data.summary.posted_item_pay || 0)
  );

  if (lineItemDiscrepancy > TOLERANCE && data.summary.posted_item_pay) {
    errors.push(
      `Line item sum ($${lineItemCurrentSum.toFixed(2)}) does not match ` +
      `posted item pay ($${data.summary.posted_item_pay.toFixed(2)}). ` +
      `Discrepancy: $${lineItemDiscrepancy.toFixed(2)}`
    );
  }

  // 2. Sum all line item previous amounts
  const lineItemPreviousSum = data.line_items.reduce(
    (sum, item) => sum + ((item.previous_qty || 0) * item.unit_price), 0
  );
  const previousDiscrepancy = data.summary.cumulative_posted_item_pay
    ? Math.abs(lineItemPreviousSum - (data.summary.cumulative_posted_item_pay - data.summary.posted_item_pay))
    : 0;

  // 3. Sum all line item to-date amounts
  const lineItemToDateSum = data.line_items.reduce(
    (sum, item) => sum + (item.total_to_date_amount || 0), 0
  );
  const toDateDiscrepancy = data.summary.cumulative_posted_item_pay
    ? Math.abs(lineItemToDateSum - data.summary.cumulative_posted_item_pay)
    : 0;

  if (toDateDiscrepancy > TOLERANCE && data.summary.cumulative_posted_item_pay) {
    errors.push(
      `To-date sum ($${lineItemToDateSum.toFixed(2)}) does not match ` +
      `cumulative total ($${data.summary.cumulative_posted_item_pay.toFixed(2)}). ` +
      `Discrepancy: $${toDateDiscrepancy.toFixed(2)}`
    );
  }

  // 4. Validate each line item: qty × price = amount
  for (const item of data.line_items) {
    if (!item.this_estimate_qty || item.this_estimate_qty === 0) continue;

    const expectedAmount = item.this_estimate_qty * item.unit_price;
    const lineDiscrepancy = Math.abs(expectedAmount - (item.this_estimate_amount || 0));

    if (lineDiscrepancy > LINE_TOLERANCE) {
      failedLines.push({
        item_number: item.item_number,
        line_number: item.line_number,
        expected: expectedAmount,
        actual: item.this_estimate_amount || 0,
        discrepancy: lineDiscrepancy
      });
    }
  }

  if (failedLines.length > 0) {
    errors.push(
      `${failedLines.length} line items failed qty × price validation`
    );
  }

  // 5. Stockpile delta check
  if (data.summary.stockpile_previous !== undefined && data.summary.stockpile_current !== undefined) {
    const stockpileDelta = data.summary.stockpile_previous - data.summary.stockpile_current;
    if (stockpileDelta < 0) {
      warnings.push(
        `Stockpile increased by $${Math.abs(stockpileDelta).toFixed(2)} - verify new materials stored`
      );
    }
  }

  // 6. Check for missing critical data
  if (!data.summary.estimate_number) {
    errors.push('Missing estimate number');
  }
  if (!data.summary.period_end) {
    errors.push('Missing period end date');
  }
  if (data.line_items.length === 0) {
    errors.push('No line items extracted');
  }
  if (!data.summary.net_pay_amount && data.summary.net_pay_amount !== 0) {
    errors.push('Missing net pay amount');
  }

  // 7. Net calculation check
  if (data.summary.gross_item_pay && data.summary.net_pay_amount) {
    const expectedNet = data.summary.gross_item_pay - (data.summary.material_withheld || 0);
    const netDiscrepancy = Math.abs(expectedNet - data.summary.net_pay_amount);
    if (netDiscrepancy > TOLERANCE) {
      warnings.push(
        `Net calculation may have additional deductions. Expected: $${expectedNet.toFixed(2)}, Actual: $${data.summary.net_pay_amount.toFixed(2)}`
      );
    }
  }

  // Determine status
  let status: ValidationResult['status'];
  if (errors.some(e => e.includes('Missing'))) {
    status = 'failed_missing_data';
  } else if (errors.length > 0) {
    status = 'failed_math';
  } else {
    status = 'passed';
  }

  return {
    passed: errors.length === 0,
    status,
    errors,
    warnings,
    discrepancies: {
      lineItemSum: lineItemDiscrepancy,
      previousSum: previousDiscrepancy,
      toDateSum: toDateDiscrepancy,
      failedLines
    }
  };
}

// =============================================================================
// PDF EXTRACTION WITH CLAUDE
// =============================================================================

async function extractPayEstimateWithClaude(
  pdfUrl: string,
  apiKey: string
): Promise<ExtractedPayEstimate> {
  // Download PDF
  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch PDF: ${pdfResponse.status}`);
  }

  const pdfBuffer = await pdfResponse.arrayBuffer();
  const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Pdf,
            },
          },
          {
            type: 'text',
            text: `Extract all data from this WVDOH Pay Estimate document.

Return a JSON object with this exact structure:
{
  "summary": {
    "estimate_number": <integer>,
    "period_start": "<YYYY-MM-DD or null>",
    "period_end": "<YYYY-MM-DD>",
    "posted_item_pay": <number>,
    "asphalt_adjustment": <number or null>,
    "fuel_adjustment": <number or null>,
    "stockpile_current": <number or null>,
    "stockpile_previous": <number or null>,
    "material_withheld": <number or null>,
    "material_credit": <number or null>,
    "gross_item_pay": <number or null>,
    "net_pay_amount": <number>,
    "cumulative_posted_item_pay": <number or null>,
    "cumulative_stockpile": <number or null>,
    "cumulative_net_pay": <number or null>
  },
  "line_items": [
    {
      "line_number": "<string>",
      "item_number": "<WVDOH item code like 636060-002>",
      "description": "<item description>",
      "unit": "<unit of measure>",
      "unit_price": <number>,
      "plan_qty": <number or null>,
      "previous_qty": <number>,
      "this_estimate_qty": <number>,
      "this_estimate_amount": <number>,
      "total_to_date_qty": <number>,
      "total_to_date_amount": <number>
    }
  ],
  "imr_items": [
    {
      "dmir_number": "<string>",
      "item_number": "<string>",
      "description": "<string or null>",
      "qty_withheld": <number>,
      "amount_withheld": <number>,
      "deficiency_type": "<LAB_QC|LAB_QA|FIELD_QC|FIELD_QA|COMPACTION_QC|COMPACTION_QA|CERT_MISSING|OTHER>"
    }
  ]
}

Important:
- Extract ALL line items from the document
- Use null for missing optional values, not empty strings
- Amounts should be positive numbers (represent as absolute values)
- Material withheld should be positive (we'll treat as negative in processing)
- Return ONLY valid JSON, no additional text`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const text = result.content[0]?.text || '';

  // Parse JSON from response
  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    throw new Error(`Failed to parse Claude response as JSON: ${e.message}`);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

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
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const { project_id, pdf_url, estimate_type } = await req.json() as PayPeriodIngestRequest;

    if (!project_id || !pdf_url) {
      throw new Error('project_id and pdf_url are required');
    }

    console.log(`Processing pay estimate for project: ${project_id}`);

    // Get project and organization info
    const { data: project, error: projectError } = await supabaseClient
      .from('projects')
      .select('id, organization_id, name')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      throw new Error(`Project not found: ${project_id}`);
    }

    // 1. Extract with Claude
    console.log('Extracting pay estimate data with Claude...');
    const extracted = await extractPayEstimateWithClaude(pdf_url, anthropicApiKey);

    // 2. VALIDATE BEFORE DATABASE WRITE
    console.log('Validating extracted data...');
    const validation = validateExtraction(extracted);

    // 3. Calculate sums for validation log
    const lineItemSum = extracted.line_items.reduce(
      (sum, item) => sum + (item.this_estimate_amount || 0), 0
    );
    const toDateSum = extracted.line_items.reduce(
      (sum, item) => sum + (item.total_to_date_amount || 0), 0
    );

    // 4. CONDITIONAL DATABASE WRITE
    if (validation.passed) {
      // Create pay_period with line items
      const { data: payPeriod, error: ppError } = await supabaseClient
        .from('pay_periods')
        .insert({
          organization_id: project.organization_id,
          project_id: project_id,
          estimate_number: extracted.summary.estimate_number,
          period_start_date: extracted.summary.period_start,
          period_end_date: extracted.summary.period_end,
          status: estimate_type === 'preliminary' ? 'PRELIMINARY_RECEIVED' : 'FINAL_RECEIVED',
          preliminary_received_at: estimate_type === 'preliminary' ? new Date().toISOString() : null,
          final_received_at: estimate_type === 'final' ? new Date().toISOString() : null,
          posted_item_pay: extracted.summary.posted_item_pay,
          asphalt_adjustment: extracted.summary.asphalt_adjustment,
          fuel_adjustment: extracted.summary.fuel_adjustment,
          construction_stockpile: extracted.summary.stockpile_current,
          material_withheld: extracted.summary.material_withheld,
          material_credit: extracted.summary.material_credit,
          gross_item_pay: extracted.summary.gross_item_pay,
          net_pay_amount: extracted.summary.net_pay_amount,
          cumulative_posted_item_pay: extracted.summary.cumulative_posted_item_pay,
          cumulative_stockpile: extracted.summary.cumulative_stockpile,
          cumulative_net_pay: extracted.summary.cumulative_net_pay,
          preliminary_document_url: estimate_type === 'preliminary' ? pdf_url : null,
          final_document_url: estimate_type === 'final' ? pdf_url : null,
          validation_status: 'passed',
          validated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (ppError) {
        throw new Error(`Failed to create pay_period: ${ppError.message}`);
      }

      // Insert line items
      const lineItemsToInsert = extracted.line_items.map(item => ({
        pay_period_id: payPeriod.id,
        line_number: item.line_number,
        item_number: item.item_number,
        description: item.description,
        unit: item.unit,
        unit_price: item.unit_price,
        plan_qty: item.plan_qty,
        previous_qty: item.previous_qty,
        this_estimate_qty: item.this_estimate_qty,
        this_estimate_amount: item.this_estimate_amount,
        total_to_date_qty: item.total_to_date_qty,
        total_to_date_amount: item.total_to_date_amount,
        remaining_qty: item.plan_qty ? item.plan_qty - item.total_to_date_qty : null,
        is_overrun: item.plan_qty ? item.total_to_date_qty > item.plan_qty : false,
      }));

      const { error: liError } = await supabaseClient
        .from('pay_period_line_items')
        .insert(lineItemsToInsert);

      if (liError) {
        console.error('Failed to insert line items:', liError);
      }

      // Insert IMR items if present
      if (extracted.imr_items && extracted.imr_items.length > 0) {
        const imrItemsToInsert = extracted.imr_items.map(item => ({
          pay_period_id: payPeriod.id,
          dmir_number: item.dmir_number,
          item_number: item.item_number,
          item_description: item.description,
          qty_withheld: item.qty_withheld,
          amount_withheld: item.amount_withheld,
          deficiency_type: item.deficiency_type,
          resolution_status: 'OPEN',
        }));

        const { error: imrError } = await supabaseClient
          .from('imr_items')
          .insert(imrItemsToInsert);

        if (imrError) {
          console.error('Failed to insert IMR items:', imrError);
        }
      }

      // Log validation success
      await supabaseClient
        .from('pay_period_validations')
        .insert({
          pay_period_id: payPeriod.id,
          attempt_number: 1,
          extracted_line_item_sum: lineItemSum,
          extracted_summary_total: extracted.summary.posted_item_pay,
          extracted_to_date_sum: toDateSum,
          extracted_to_date_total: extracted.summary.cumulative_posted_item_pay,
          line_item_sum_valid: validation.discrepancies.lineItemSum <= TOLERANCE,
          to_date_sum_valid: validation.discrepancies.toDateSum <= TOLERANCE,
          all_line_calcs_valid: validation.discrepancies.failedLines.length === 0,
          line_item_discrepancy: validation.discrepancies.lineItemSum,
          to_date_discrepancy: validation.discrepancies.toDateSum,
          failed_line_items: validation.discrepancies.failedLines,
          overall_status: 'passed',
          error_messages: validation.errors,
          warning_messages: validation.warnings,
          source_document_url: pdf_url,
          extraction_method: 'claude-pdf',
          raw_extraction: extracted,
        });

      return new Response(
        JSON.stringify({
          success: true,
          pay_period_id: payPeriod.id,
          validation: 'passed',
          line_items_count: extracted.line_items.length,
          imr_items_count: extracted.imr_items?.length || 0,
          warnings: validation.warnings,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );

    } else {
      // VALIDATION FAILED - Create draft without line items
      const { data: payPeriod, error: ppError } = await supabaseClient
        .from('pay_periods')
        .insert({
          organization_id: project.organization_id,
          project_id: project_id,
          estimate_number: extracted.summary.estimate_number || 0,
          period_end_date: extracted.summary.period_end || new Date().toISOString().split('T')[0],
          status: 'PRELIMINARY_RECEIVED',
          preliminary_received_at: new Date().toISOString(),
          posted_item_pay: extracted.summary.posted_item_pay,
          net_pay_amount: extracted.summary.net_pay_amount,
          preliminary_document_url: pdf_url,
          validation_status: validation.status,
          validation_errors: validation.errors,
        })
        .select()
        .single();

      if (ppError) {
        throw new Error(`Failed to create draft pay_period: ${ppError.message}`);
      }

      // Log validation failure
      await supabaseClient
        .from('pay_period_validations')
        .insert({
          pay_period_id: payPeriod.id,
          attempt_number: 1,
          extracted_line_item_sum: lineItemSum,
          extracted_summary_total: extracted.summary.posted_item_pay,
          extracted_to_date_sum: toDateSum,
          extracted_to_date_total: extracted.summary.cumulative_posted_item_pay,
          line_item_sum_valid: validation.discrepancies.lineItemSum <= TOLERANCE,
          to_date_sum_valid: validation.discrepancies.toDateSum <= TOLERANCE,
          all_line_calcs_valid: validation.discrepancies.failedLines.length === 0,
          line_item_discrepancy: validation.discrepancies.lineItemSum,
          to_date_discrepancy: validation.discrepancies.toDateSum,
          failed_line_items: validation.discrepancies.failedLines,
          overall_status: validation.status,
          error_messages: validation.errors,
          warning_messages: validation.warnings,
          source_document_url: pdf_url,
          extraction_method: 'claude-pdf',
          raw_extraction: extracted,
        });

      return new Response(
        JSON.stringify({
          success: false,
          pay_period_id: payPeriod.id,
          validation: validation.status,
          errors: validation.errors,
          warnings: validation.warnings,
          discrepancies: validation.discrepancies,
          message: 'Flagged for manual review. Line items NOT written to database.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Return 200 so frontend can handle gracefully
        }
      );
    }

  } catch (error) {
    console.error('Pay period ingestion error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
