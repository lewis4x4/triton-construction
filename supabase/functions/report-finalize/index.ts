// =============================================================================
// Edge Function: report-finalize
// Purpose: Generate PDF daily reports and calculate totals
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FinalizeRequest {
  report_id: string;
  generate_pdf?: boolean;
  submit_for_approval?: boolean;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { report_id, generate_pdf = true, submit_for_approval = false } = await req.json() as FinalizeRequest;

    if (!report_id) {
      throw new Error('report_id is required');
    }

    console.log(`Finalizing report: ${report_id}`);

    // Get the report with all related data
    const { data: report, error: reportError } = await supabaseClient
      .from('daily_reports')
      .select(`
        *,
        projects (
          id, name, project_number, contract_number,
          wvdoh_district, wvdoh_inspector
        ),
        daily_report_entries (*),
        daily_manpower (*),
        daily_equipment_log (*),
        report_photos (*),
        weather_snapshots (*)
      `)
      .eq('id', report_id)
      .single();

    if (reportError || !report) {
      throw new Error(`Report not found: ${report_id}`);
    }

    // Calculate totals
    const manpowerTotals = {
      total_workers: 0,
      total_hours: 0,
      by_trade: {} as Record<string, { count: number; hours: number }>,
    };

    for (const mp of report.daily_manpower || []) {
      manpowerTotals.total_workers += mp.headcount || 0;
      manpowerTotals.total_hours += (mp.headcount || 0) * (mp.hours || 8);

      if (mp.trade) {
        if (!manpowerTotals.by_trade[mp.trade]) {
          manpowerTotals.by_trade[mp.trade] = { count: 0, hours: 0 };
        }
        manpowerTotals.by_trade[mp.trade].count += mp.headcount || 0;
        manpowerTotals.by_trade[mp.trade].hours += (mp.headcount || 0) * (mp.hours || 8);
      }
    }

    const equipmentTotals = {
      total_pieces: report.daily_equipment_log?.length || 0,
      total_hours: 0,
      by_type: {} as Record<string, { count: number; hours: number }>,
    };

    for (const eq of report.daily_equipment_log || []) {
      equipmentTotals.total_hours += eq.hours_used || 0;

      if (eq.equipment_type) {
        if (!equipmentTotals.by_type[eq.equipment_type]) {
          equipmentTotals.by_type[eq.equipment_type] = { count: 0, hours: 0 };
        }
        equipmentTotals.by_type[eq.equipment_type].count += 1;
        equipmentTotals.by_type[eq.equipment_type].hours += eq.hours_used || 0;
      }
    }

    // Categorize entries
    const entries = {
      work_performed: [] as any[],
      delays: [] as any[],
      visitors: [] as any[],
      materials: [] as any[],
      other: [] as any[],
    };

    for (const entry of report.daily_report_entries || []) {
      switch (entry.entry_type) {
        case 'WORK_PERFORMED':
          entries.work_performed.push(entry);
          break;
        case 'DELAY':
          entries.delays.push(entry);
          break;
        case 'VISITOR':
          entries.visitors.push(entry);
          break;
        case 'MATERIAL':
          entries.materials.push(entry);
          break;
        default:
          entries.other.push(entry);
      }
    }

    // Update the report with calculated totals
    const { error: updateError } = await supabaseClient
      .from('daily_reports')
      .update({
        total_manpower: manpowerTotals.total_workers,
        total_man_hours: manpowerTotals.total_hours,
        total_equipment: equipmentTotals.total_pieces,
        total_equipment_hours: equipmentTotals.total_hours,
        photo_count: report.report_photos?.length || 0,
        status: submit_for_approval ? 'SUBMITTED' : report.status,
        submitted_at: submit_for_approval ? new Date().toISOString() : report.submitted_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', report_id);

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    // Generate PDF HTML (for now, actual PDF generation would require a library)
    let pdfUrl = null;

    if (generate_pdf) {
      const htmlContent = generateReportHTML(report, manpowerTotals, equipmentTotals, entries);

      // Store the HTML version (PDF generation would be done client-side or with a PDF service)
      const { data: storageData, error: storageError } = await supabaseClient
        .storage
        .from('exports')
        .upload(
          `daily-reports/${report.projects.project_number}/${report.report_date}-${report.report_number}.html`,
          new Blob([htmlContent], { type: 'text/html' }),
          { upsert: true }
        );

      if (!storageError && storageData) {
        const { data: urlData } = await supabaseClient
          .storage
          .from('exports')
          .createSignedUrl(storageData.path, 86400); // 24 hour expiry

        pdfUrl = urlData?.signedUrl;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        report_id,
        totals: {
          manpower: manpowerTotals,
          equipment: equipmentTotals,
          entries: {
            work_performed: entries.work_performed.length,
            delays: entries.delays.length,
            visitors: entries.visitors.length,
            materials: entries.materials.length,
          },
          photos: report.report_photos?.length || 0,
        },
        status: submit_for_approval ? 'SUBMITTED' : report.status,
        pdf_url: pdfUrl,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Report finalize error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

function generateReportHTML(
  report: any,
  manpower: any,
  equipment: any,
  entries: any
): string {
  const project = report.projects;
  const weather = report.weather_snapshots?.[0];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Daily Report - ${report.report_number}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
    .header { text-align: center; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 18px; }
    .header h2 { margin: 5px 0; font-size: 14px; color: #666; }
    .section { margin-bottom: 15px; }
    .section-title { background: #333; color: white; padding: 5px 10px; font-weight: bold; }
    .grid { display: flex; flex-wrap: wrap; gap: 10px; }
    .grid-item { flex: 1; min-width: 150px; padding: 5px; border: 1px solid #ddd; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #ddd; padding: 5px; text-align: left; }
    th { background: #f5f5f5; }
    .totals { background: #e8f4e8; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${project.name}</h1>
    <h2>Daily Construction Report</h2>
    <p>Report #${report.report_number} | Date: ${report.report_date}</p>
    <p>Contract: ${project.contract_number || 'N/A'} | WVDOH District: ${project.wvdoh_district || 'N/A'}</p>
  </div>

  <div class="section">
    <div class="section-title">Weather Conditions</div>
    <div class="grid">
      <div class="grid-item"><strong>Conditions:</strong> ${weather?.conditions || report.weather_summary || 'Not recorded'}</div>
      <div class="grid-item"><strong>High/Low:</strong> ${weather?.high_temperature || '-'}°F / ${weather?.low_temperature || '-'}°F</div>
      <div class="grid-item"><strong>Precipitation:</strong> ${weather?.precipitation || 0}"</div>
      <div class="grid-item"><strong>Working Day:</strong> ${report.is_working_day ? 'Yes' : 'No'}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Manpower Summary</div>
    <table>
      <tr><th>Trade</th><th>Workers</th><th>Hours</th></tr>
      ${Object.entries(manpower.by_trade).map(([trade, data]: [string, any]) => `
        <tr><td>${trade}</td><td>${data.count}</td><td>${data.hours}</td></tr>
      `).join('')}
      <tr class="totals"><td>TOTAL</td><td>${manpower.total_workers}</td><td>${manpower.total_hours}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Equipment Summary</div>
    <table>
      <tr><th>Equipment Type</th><th>Count</th><th>Hours</th></tr>
      ${Object.entries(equipment.by_type).map(([type, data]: [string, any]) => `
        <tr><td>${type}</td><td>${data.count}</td><td>${data.hours}</td></tr>
      `).join('')}
      <tr class="totals"><td>TOTAL</td><td>${equipment.total_pieces}</td><td>${equipment.total_hours}</td></tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">Work Performed</div>
    <ul>
      ${entries.work_performed.map((e: any) => `<li>${e.description}${e.location ? ` (${e.location})` : ''}</li>`).join('')}
    </ul>
  </div>

  ${entries.delays.length > 0 ? `
  <div class="section">
    <div class="section-title">Delays</div>
    <ul>
      ${entries.delays.map((e: any) => `<li>${e.description}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${entries.visitors.length > 0 ? `
  <div class="section">
    <div class="section-title">Visitors</div>
    <ul>
      ${entries.visitors.map((e: any) => `<li>${e.description}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${report.general_notes ? `
  <div class="section">
    <div class="section-title">General Notes</div>
    <p>${report.general_notes}</p>
  </div>
  ` : ''}

  <div style="margin-top: 30px; border-top: 1px solid #333; padding-top: 10px;">
    <p>Prepared by: ______________________ Date: __________</p>
    <p>Approved by: ______________________ Date: __________</p>
  </div>
</body>
</html>
  `;
}
