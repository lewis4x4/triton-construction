// =============================================================================
// Edge Function: crl-export
// Purpose: Generate AASHTOWare-compatible CRL exports
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

interface CRLExportRequest {
  crl_id: string;
  format: 'xml' | 'csv' | 'pdf';
}

interface CRLSubmission {
  id: string;
  organization_id: string;
  project_id: string;
  crl_number: number;
  submission_period_start: string;
  submission_period_end: string;
  contract_number: string;
  federal_aid_number: string | null;
  total_line_items: number;
  total_amount: number;
  status: string;
}

interface CRLLineItem {
  line_number: number;
  item_number: string;
  description: string;
  unit: string;
  unit_price: number;
  contract_qty: number | null;
  previous_qty: number;
  current_qty: number;
  total_to_date_qty: number;
  current_amount: number;
  total_to_date_amount: number;
  begin_station: string | null;
  end_station: string | null;
  location_description: string | null;
  is_overrun: boolean;
}

// =============================================================================
// XML GENERATION
// =============================================================================

function escapeXml(str: string | null): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateXML(
  submission: CRLSubmission,
  lineItems: CRLLineItem[],
  contractorName: string,
  projectName: string
): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<ContractorReportedLines xmlns="http://www.aashtoware.org/project">\n';
  xml += '  <Header>\n';
  xml += `    <ContractNumber>${escapeXml(submission.contract_number)}</ContractNumber>\n`;
  xml += `    <FederalAidNumber>${escapeXml(submission.federal_aid_number)}</FederalAidNumber>\n`;
  xml += `    <ProjectName>${escapeXml(projectName)}</ProjectName>\n`;
  xml += `    <ContractorName>${escapeXml(contractorName)}</ContractorName>\n`;
  xml += `    <ReportNumber>${submission.crl_number}</ReportNumber>\n`;
  xml += `    <PeriodStart>${submission.submission_period_start}</PeriodStart>\n`;
  xml += `    <PeriodEnd>${submission.submission_period_end}</PeriodEnd>\n`;
  xml += `    <TotalLineItems>${submission.total_line_items}</TotalLineItems>\n`;
  xml += `    <TotalAmount>${submission.total_amount.toFixed(2)}</TotalAmount>\n`;
  xml += `    <GeneratedAt>${new Date().toISOString()}</GeneratedAt>\n`;
  xml += '  </Header>\n';
  xml += '  <LineItems>\n';

  for (const item of lineItems) {
    xml += '    <LineItem>\n';
    xml += `      <LineNumber>${item.line_number}</LineNumber>\n`;
    xml += `      <ItemNumber>${escapeXml(item.item_number)}</ItemNumber>\n`;
    xml += `      <Description>${escapeXml(item.description)}</Description>\n`;
    xml += `      <Unit>${escapeXml(item.unit)}</Unit>\n`;
    xml += `      <UnitPrice>${item.unit_price.toFixed(4)}</UnitPrice>\n`;
    if (item.contract_qty !== null) {
      xml += `      <ContractQty>${item.contract_qty.toFixed(3)}</ContractQty>\n`;
    }
    xml += `      <PreviousQty>${item.previous_qty.toFixed(3)}</PreviousQty>\n`;
    xml += `      <CurrentQty>${item.current_qty.toFixed(3)}</CurrentQty>\n`;
    xml += `      <TotalToDateQty>${item.total_to_date_qty.toFixed(3)}</TotalToDateQty>\n`;
    xml += `      <CurrentAmount>${item.current_amount.toFixed(2)}</CurrentAmount>\n`;
    xml += `      <TotalToDateAmount>${item.total_to_date_amount.toFixed(2)}</TotalToDateAmount>\n`;
    if (item.begin_station) {
      xml += `      <BeginStation>${escapeXml(item.begin_station)}</BeginStation>\n`;
    }
    if (item.end_station) {
      xml += `      <EndStation>${escapeXml(item.end_station)}</EndStation>\n`;
    }
    if (item.location_description) {
      xml += `      <LocationDescription>${escapeXml(item.location_description)}</LocationDescription>\n`;
    }
    xml += `      <IsOverrun>${item.is_overrun}</IsOverrun>\n`;
    xml += '    </LineItem>\n';
  }

  xml += '  </LineItems>\n';
  xml += '</ContractorReportedLines>';

  return xml;
}

// =============================================================================
// CSV GENERATION
// =============================================================================

function generateCSV(
  submission: CRLSubmission,
  lineItems: CRLLineItem[],
  contractorName: string
): string {
  const lines: string[] = [];

  // Header row
  lines.push([
    'Line Number',
    'Item Number',
    'Description',
    'Unit',
    'Unit Price',
    'Contract Qty',
    'Previous Qty',
    'Current Qty',
    'Total To Date Qty',
    'Current Amount',
    'Total To Date Amount',
    'Begin Station',
    'End Station',
    'Location',
    'Is Overrun'
  ].join(','));

  // Data rows
  for (const item of lineItems) {
    lines.push([
      item.line_number,
      `"${item.item_number}"`,
      `"${item.description.replace(/"/g, '""')}"`,
      `"${item.unit}"`,
      item.unit_price.toFixed(4),
      item.contract_qty?.toFixed(3) ?? '',
      item.previous_qty.toFixed(3),
      item.current_qty.toFixed(3),
      item.total_to_date_qty.toFixed(3),
      item.current_amount.toFixed(2),
      item.total_to_date_amount.toFixed(2),
      `"${item.begin_station || ''}"`,
      `"${item.end_station || ''}"`,
      `"${(item.location_description || '').replace(/"/g, '""')}"`,
      item.is_overrun ? 'Yes' : 'No'
    ].join(','));
  }

  // Add metadata footer
  lines.push('');
  lines.push(`"Contract Number","${submission.contract_number}"`);
  lines.push(`"Contractor","${contractorName}"`);
  lines.push(`"Report Number","${submission.crl_number}"`);
  lines.push(`"Period","${submission.submission_period_start} to ${submission.submission_period_end}"`);
  lines.push(`"Total Amount","${submission.total_amount.toFixed(2)}"`);
  lines.push(`"Generated","${new Date().toISOString()}"`);

  return lines.join('\n');
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

    const { crl_id, format = 'xml' } = await req.json() as CRLExportRequest;

    if (!crl_id) {
      throw new Error('crl_id is required');
    }

    // Get CRL submission with project and org info
    const { data: submission, error: subError } = await supabaseClient
      .from('crl_submissions')
      .select(`
        *,
        projects:project_id (name),
        organizations:organization_id (name)
      `)
      .eq('id', crl_id)
      .single();

    if (subError || !submission) {
      throw new Error(`CRL submission not found: ${crl_id}`);
    }

    // Get line items
    const { data: lineItems, error: liError } = await supabaseClient
      .from('crl_line_items')
      .select('*')
      .eq('crl_submission_id', crl_id)
      .order('line_number');

    if (liError) {
      throw new Error(`Failed to get line items: ${liError.message}`);
    }

    const contractorName = (submission.organizations as any)?.name || 'Unknown Contractor';
    const projectName = (submission.projects as any)?.name || 'Unknown Project';

    let content: string;
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case 'csv':
        content = generateCSV(submission, lineItems || [], contractorName);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'xml':
      default:
        content = generateXML(submission, lineItems || [], contractorName, projectName);
        contentType = 'application/xml';
        fileExtension = 'xml';
        break;
    }

    // Generate filename
    const fileName = `CRL_${submission.contract_number}_${submission.crl_number}_${submission.submission_period_end}.${fileExtension}`;

    // Store in Supabase Storage
    const storagePath = `${submission.organization_id}/${submission.project_id}/crl/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from('pay-estimates')
      .upload(storagePath, content, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('Storage upload failed:', uploadError);
      // Continue anyway - we can still return the content
    }

    // Log export
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabaseClient.auth.getUser(
        authHeader.replace('Bearer ', '')
      );
      userId = user?.id || null;
    }

    await supabaseClient
      .from('crl_export_history')
      .insert({
        crl_submission_id: crl_id,
        export_format: format === 'csv' ? 'AASHTOWARE_CSV' : 'AASHTOWARE_XML',
        exported_by: userId,
        file_name: fileName,
        file_path: storagePath,
        file_size_bytes: new TextEncoder().encode(content).length,
        validation_passed: true,
      });

    // Return the generated content
    return new Response(content, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
      status: 200,
    });

  } catch (error) {
    console.error('CRL export error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
