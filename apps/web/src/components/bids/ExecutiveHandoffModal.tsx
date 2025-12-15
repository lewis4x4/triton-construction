import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import './ExecutiveHandoffModal.css';

interface ExecutiveHandoffModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

interface ProjectData {
  project: BidProject | null;
  metrics: DashboardMetrics | null;
  snapshot: ExecutiveSnapshot | null;
  risks: Risk[];
  questions: Question[];
  workPackages: WorkPackage[];
  lineItems: LineItem[];
  documents: Document[];
  environmentalCommitments: EnvironmentalCommitment[];
  hazmatFindings: HazmatFinding[];
}

interface BidProject {
  id: string;
  project_name: string;
  owner: string | null;
  state_project_number: string | null;
  county: string | null;
  route: string | null;
  letting_date: string | null;
  bid_due_date: string | null;
  location_description: string | null;
  status: string;
  engineers_estimate: number | null;
  created_at: string;
}

interface DashboardMetrics {
  total_line_items: number | null;
  items_reviewed: number | null;
  items_assembly_priced: number | null;
  items_subquote_priced: number | null;
  items_manual_priced: number | null;
  total_base_cost: number | null;
  total_bid_value: number | null;
  total_risks: number | null;
  high_critical_risks: number | null;
  total_opportunities: number | null;
  total_questions: number | null;
  questions_submitted: number | null;
  questions_answered: number | null;
  total_env_commitments: number | null;
  total_hazmat_findings: number | null;
  total_work_packages: number | null;
  total_documents: number | null;
  documents_processed: number | null;
  estimated_completion_pct: number | null;
}

interface ExecutiveSnapshot {
  id: string;
  version_number: number;
  snapshot_date: string;
  project_overview: string | null;
  key_quantities_summary: string | null;
  risk_summary: string | null;
  environmental_summary: string | null;
  schedule_summary: string | null;
  cost_considerations: string | null;
  recommendations: string | null;
  total_line_items: number | null;
  total_estimated_value: number | null;
  critical_risks_count: number | null;
  high_risks_count: number | null;
  ai_model_used: string | null;
  created_at: string;
}

interface Risk {
  id: string;
  title: string;
  description: string | null;
  type: string;
  category: string | null;
  overall_severity: string;
  likelihood: string | null;
  impact: string | null;
  mitigation_strategy: string | null;
  review_status: string;
}

interface Question {
  id: string;
  question_text: string;
  rationale: string | null;
  status: string;
  priority: string | null;
  answer_text: string | null;
  submitted_at: string | null;
}

interface WorkPackage {
  id: string;
  name: string;
  description: string | null;
  status: string;
  estimated_value: number | null;
  total_items: number | null;
}

interface LineItem {
  id: string;
  line_number: number;
  item_number: string;
  description: string;
  quantity: number | null;
  unit: string | null;
  final_unit_price: number | null;
  final_extended_price: number | null;
  work_category: string | null;
  estimation_method: string | null;
  pricing_reviewed: boolean;
}

interface Document {
  id: string;
  file_name: string;
  document_type: string | null;
  processing_status: string;
  ai_summary: string | null;
}

interface EnvironmentalCommitment {
  id: string;
  commitment_type: string;
  description: string;
  compliance_deadline: string | null;
  responsible_party: string | null;
}

interface HazmatFinding {
  id: string;
  hazmat_type: string;
  location_description: string | null;
  quantity_estimate: string | null;
  disposal_requirements: string | null;
  estimated_cost: number | null;
}

interface HandoffConfig {
  includeCoverPage: boolean;
  includeExecutiveSummary: boolean;
  includeProjectMetrics: boolean;
  includeFinancialAnalysis: boolean;
  includeRiskAssessment: boolean;
  includeOpportunities: boolean;
  includeQuestions: boolean;
  includeWorkPackages: boolean;
  includeEnvironmental: boolean;
  includeSchedule: boolean;
  includeRecommendations: boolean;
  includeLineItemsSummary: boolean;
  includeDocumentList: boolean;
  includeSignatureBlock: boolean;
  preparedBy: string;
  preparedFor: string;
  confidentialityLevel: 'INTERNAL' | 'CONFIDENTIAL' | 'CLIENT_READY';
  includeAppendices: boolean;
}

const DEFAULT_CONFIG: HandoffConfig = {
  includeCoverPage: true,
  includeExecutiveSummary: true,
  includeProjectMetrics: true,
  includeFinancialAnalysis: true,
  includeRiskAssessment: true,
  includeOpportunities: true,
  includeQuestions: true,
  includeWorkPackages: true,
  includeEnvironmental: true,
  includeSchedule: true,
  includeRecommendations: true,
  includeLineItemsSummary: true,
  includeDocumentList: true,
  includeSignatureBlock: true,
  preparedBy: '',
  preparedFor: '',
  confidentialityLevel: 'INTERNAL',
  includeAppendices: false,
};

export function ExecutiveHandoffModal({ projectId, projectName, onClose }: ExecutiveHandoffModalProps) {
  const [config, setConfig] = useState<HandoffConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'configure' | 'preview'>('configure');

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [
        projectResult,
        metricsResult,
        snapshotResult,
        risksResult,
        questionsResult,
        workPackagesResult,
        lineItemsResult,
        documentsResult,
        envCommitmentsResult,
        hazmatResult,
      ] = await Promise.all([
        supabase.from('bid_projects').select('*').eq('id', projectId).single(),
        supabase.from('v_bid_project_dashboard').select('*').eq('bid_project_id', projectId).single(),
        supabase.from('bid_executive_snapshots').select('*').eq('bid_project_id', projectId).eq('is_current', true).single(),
        supabase.from('bid_project_risks').select('*').eq('bid_project_id', projectId).order('overall_severity'),
        supabase.from('bid_prebid_questions').select('*').eq('bid_project_id', projectId).order('priority'),
        supabase.from('bid_work_packages').select('*').eq('bid_project_id', projectId),
        supabase.from('bid_line_items').select('*').eq('bid_project_id', projectId).order('line_number').limit(100),
        supabase.from('bid_documents').select('*').eq('bid_project_id', projectId),
        supabase.from('bid_environmental_commitments').select('*').eq('bid_project_id', projectId),
        supabase.from('bid_hazmat_findings').select('*').eq('bid_project_id', projectId),
      ]);

      setProjectData({
        project: projectResult.data as BidProject | null,
        metrics: metricsResult.data as DashboardMetrics | null,
        snapshot: snapshotResult.data as ExecutiveSnapshot | null,
        risks: (risksResult.data || []) as Risk[],
        questions: (questionsResult.data || []) as Question[],
        workPackages: (workPackagesResult.data || []) as WorkPackage[],
        lineItems: (lineItemsResult.data || []) as LineItem[],
        documents: (documentsResult.data || []) as Document[],
        environmentalCommitments: (envCommitmentsResult.data || []) as EnvironmentalCommitment[],
        hazmatFindings: (hazmatResult.data || []) as HazmatFinding[],
      });
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load project data');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateHandoffDocument = () => {
    if (!projectData) return;

    setIsGenerating(true);

    const { project, metrics, snapshot, risks, questions, workPackages, lineItems, documents, environmentalCommitments, hazmatFindings } = projectData;

    // Calculate risk statistics
    const criticalRisks = risks.filter(r => r.overall_severity === 'CRITICAL' && r.type === 'RISK');
    const highRisks = risks.filter(r => r.overall_severity === 'HIGH' && r.type === 'RISK');
    const mediumRisks = risks.filter(r => r.overall_severity === 'MEDIUM' && r.type === 'RISK');
    const lowRisks = risks.filter(r => r.overall_severity === 'LOW' && r.type === 'RISK');
    const opportunities = risks.filter(r => r.type === 'OPPORTUNITY');

    // Calculate pricing method breakdown
    const assemblyPriced = metrics?.items_assembly_priced ?? 0;
    const subquotePriced = metrics?.items_subquote_priced ?? 0;
    const manualPriced = metrics?.items_manual_priced ?? 0;
    const totalItems = metrics?.total_line_items ?? 0;

    // Calculate question statistics
    const pendingQuestions = questions.filter(q => q.status === 'AI_SUGGESTED' || q.status === 'PENDING');
    const submittedQuestions = questions.filter(q => q.status === 'SUBMITTED');
    const answeredQuestions = questions.filter(q => q.status === 'ANSWERED');

    // Work package value breakdown
    const totalWorkPackageValue = workPackages.reduce((sum, wp) => sum + (wp.estimated_value || 0), 0);

    // Category breakdown from line items
    const categoryBreakdown: Record<string, { count: number; value: number }> = {};
    lineItems.forEach(item => {
      const cat = item.work_category || 'Uncategorized';
      if (!categoryBreakdown[cat]) {
        categoryBreakdown[cat] = { count: 0, value: 0 };
      }
      categoryBreakdown[cat].count++;
      categoryBreakdown[cat].value += item.final_extended_price || 0;
    });

    // Determine bid recommendation based on risk profile
    const getBidRecommendation = () => {
      if (criticalRisks.length > 2) return { recommendation: 'NO BID', color: '#dc2626', reason: 'Multiple critical risks identified' };
      if (criticalRisks.length > 0 && highRisks.length > 3) return { recommendation: 'CAUTION', color: '#d97706', reason: 'Significant risk exposure requires mitigation' };
      if (opportunities.length > highRisks.length) return { recommendation: 'STRONG BID', color: '#059669', reason: 'Favorable risk/opportunity profile' };
      return { recommendation: 'PROCEED', color: '#3b82f6', reason: 'Acceptable risk profile with standard precautions' };
    };

    const bidRec = getBidRecommendation();

    // Generate the HTML document
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Handoff - ${projectName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    * { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --primary: #1e3a5f;
      --primary-light: #2d5a8a;
      --accent: #3d6b4f;
      --accent-light: #4a8a5f;
      --danger: #dc2626;
      --warning: #d97706;
      --success: #059669;
      --info: #3b82f6;
      --text-primary: #1a1a1a;
      --text-secondary: #4b5563;
      --text-tertiary: #9ca3af;
      --bg-light: #f9fafb;
      --bg-card: #ffffff;
      --border: #e5e7eb;
    }

    @page {
      size: letter;
      margin: 0.75in;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
      background: white;
      font-size: 11pt;
    }

    /* Cover Page */
    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
      color: white;
      margin: -0.75in;
      padding: 2in;
    }

    .cover-logo {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .cover-company {
      font-size: 1.5rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      margin-bottom: 3rem;
      opacity: 0.9;
    }

    .cover-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
    }

    .cover-subtitle {
      font-size: 1.25rem;
      opacity: 0.9;
      margin-bottom: 3rem;
    }

    .cover-project-name {
      font-size: 1.75rem;
      font-weight: 600;
      padding: 1.5rem 3rem;
      background: rgba(255,255,255,0.15);
      border-radius: 8px;
      margin-bottom: 3rem;
      max-width: 80%;
    }

    .cover-meta {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      font-size: 0.95rem;
      opacity: 0.85;
    }

    .cover-confidential {
      position: absolute;
      top: 1in;
      right: 1in;
      padding: 0.5rem 1rem;
      background: ${config.confidentialityLevel === 'CONFIDENTIAL' ? 'var(--danger)' : config.confidentialityLevel === 'CLIENT_READY' ? 'var(--success)' : 'rgba(255,255,255,0.2)'};
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    /* Table of Contents */
    .toc {
      page-break-after: always;
      padding: 2rem 0;
    }

    .toc h2 {
      font-size: 1.5rem;
      color: var(--primary);
      margin-bottom: 2rem;
      padding-bottom: 0.5rem;
      border-bottom: 3px solid var(--accent);
    }

    .toc-list {
      list-style: none;
    }

    .toc-item {
      display: flex;
      align-items: baseline;
      padding: 0.75rem 0;
      border-bottom: 1px dotted var(--border);
    }

    .toc-number {
      font-weight: 600;
      color: var(--accent);
      min-width: 2rem;
    }

    .toc-title {
      flex: 1;
    }

    .toc-page {
      font-family: 'JetBrains Mono', monospace;
      color: var(--text-tertiary);
    }

    /* Section Headers */
    .section {
      page-break-inside: avoid;
      margin-bottom: 2rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid var(--accent);
    }

    .section-number {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--accent);
      font-family: 'JetBrains Mono', monospace;
    }

    .section-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--primary);
    }

    /* Executive Summary Box */
    .exec-summary-box {
      background: linear-gradient(135deg, var(--bg-light) 0%, #f0f4f8 100%);
      border: 1px solid var(--border);
      border-left: 4px solid var(--accent);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .exec-summary-box h4 {
      color: var(--primary);
      margin-bottom: 0.75rem;
      font-size: 1rem;
    }

    .exec-summary-box p {
      color: var(--text-secondary);
      white-space: pre-wrap;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: var(--bg-light);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
      text-align: center;
    }

    .metric-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary);
      font-family: 'JetBrains Mono', monospace;
    }

    .metric-value.danger { color: var(--danger); }
    .metric-value.warning { color: var(--warning); }
    .metric-value.success { color: var(--success); }
    .metric-value.info { color: var(--info); }

    .metric-label {
      font-size: 0.75rem;
      color: var(--text-tertiary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.25rem;
    }

    /* Bid Recommendation Banner */
    .bid-recommendation {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1.5rem;
      background: ${bidRec.color}15;
      border: 2px solid ${bidRec.color};
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .bid-rec-badge {
      padding: 0.75rem 1.5rem;
      background: ${bidRec.color};
      color: white;
      font-weight: 700;
      font-size: 1.25rem;
      border-radius: 8px;
      letter-spacing: 0.05em;
    }

    .bid-rec-details h4 {
      color: ${bidRec.color};
      font-size: 1rem;
      margin-bottom: 0.25rem;
    }

    .bid-rec-details p {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    /* Risk Matrix */
    .risk-matrix {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .risk-cell {
      padding: 1rem;
      border-radius: 8px;
      text-align: center;
    }

    .risk-cell.critical {
      background: #fef2f2;
      border: 1px solid #fecaca;
    }

    .risk-cell.high {
      background: #fffbeb;
      border: 1px solid #fed7aa;
    }

    .risk-cell.medium {
      background: #fefce8;
      border: 1px solid #fef08a;
    }

    .risk-cell.low {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
    }

    .risk-count {
      font-size: 2rem;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
    }

    .risk-cell.critical .risk-count { color: var(--danger); }
    .risk-cell.high .risk-count { color: var(--warning); }
    .risk-cell.medium .risk-count { color: #ca8a04; }
    .risk-cell.low .risk-count { color: var(--success); }

    .risk-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 0.25rem;
      color: var(--text-secondary);
    }

    /* Risk List */
    .risk-list {
      margin-bottom: 1.5rem;
    }

    .risk-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-light);
      border-radius: 8px;
      margin-bottom: 0.75rem;
      border-left: 4px solid var(--border);
    }

    .risk-item.critical { border-left-color: var(--danger); }
    .risk-item.high { border-left-color: var(--warning); }
    .risk-item.medium { border-left-color: #ca8a04; }
    .risk-item.opportunity { border-left-color: var(--success); background: #f0fdf4; }

    .risk-severity {
      font-size: 0.7rem;
      font-weight: 600;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      text-transform: uppercase;
      white-space: nowrap;
      height: fit-content;
    }

    .risk-severity.critical { background: var(--danger); color: white; }
    .risk-severity.high { background: var(--warning); color: white; }
    .risk-severity.medium { background: #ca8a04; color: white; }
    .risk-severity.low { background: var(--success); color: white; }
    .risk-severity.opportunity { background: var(--info); color: white; }

    .risk-content h5 {
      color: var(--text-primary);
      margin-bottom: 0.25rem;
    }

    .risk-content p {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
    }

    .risk-mitigation {
      font-size: 0.8rem;
      color: var(--accent);
      font-style: italic;
    }

    /* Financial Chart */
    .financial-breakdown {
      margin-bottom: 2rem;
    }

    .breakdown-bar {
      display: flex;
      height: 40px;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 1rem;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
    }

    .breakdown-segment {
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.8rem;
      transition: all 0.3s ease;
    }

    .breakdown-segment.assembly { background: var(--accent); }
    .breakdown-segment.subquote { background: var(--info); }
    .breakdown-segment.manual { background: var(--primary); }
    .breakdown-segment.unpriced { background: var(--text-tertiary); }

    .breakdown-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }

    .legend-dot.assembly { background: var(--accent); }
    .legend-dot.subquote { background: var(--info); }
    .legend-dot.manual { background: var(--primary); }
    .legend-dot.unpriced { background: var(--text-tertiary); }

    /* Tables */
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1.5rem;
      font-size: 0.875rem;
    }

    .data-table th {
      background: var(--primary);
      color: white;
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .data-table th:first-child { border-radius: 8px 0 0 0; }
    .data-table th:last-child { border-radius: 0 8px 0 0; }

    .data-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
    }

    .data-table tr:nth-child(even) {
      background: var(--bg-light);
    }

    .data-table tr:last-child td:first-child { border-radius: 0 0 0 8px; }
    .data-table tr:last-child td:last-child { border-radius: 0 0 8px 0; }

    .data-table .mono {
      font-family: 'JetBrains Mono', monospace;
    }

    .data-table .currency {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent);
    }

    /* Status Badges */
    .status-badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.pending { background: #e5e7eb; color: #4b5563; }
    .status-badge.submitted { background: #dbeafe; color: #1d4ed8; }
    .status-badge.answered { background: #d1fae5; color: #059669; }
    .status-badge.complete { background: #d1fae5; color: #059669; }
    .status-badge.in-progress { background: #fef3c7; color: #d97706; }

    /* Work Packages Grid */
    .packages-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .package-card {
      background: var(--bg-light);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1rem;
    }

    .package-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.5rem;
    }

    .package-name {
      font-weight: 600;
      color: var(--primary);
    }

    .package-value {
      font-family: 'JetBrains Mono', monospace;
      color: var(--accent);
      font-weight: 600;
    }

    .package-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.8rem;
      color: var(--text-tertiary);
    }

    /* Signature Block */
    .signature-block {
      margin-top: 3rem;
      page-break-inside: avoid;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 3rem;
      margin-top: 2rem;
    }

    .signature-line {
      padding-top: 3rem;
      border-top: 1px solid var(--text-primary);
    }

    .signature-label {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .signature-date {
      font-size: 0.8rem;
      color: var(--text-tertiary);
      margin-top: 0.5rem;
    }

    /* Footer */
    .page-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0.5rem 0.75in;
      font-size: 0.7rem;
      color: var(--text-tertiary);
      display: flex;
      justify-content: space-between;
      border-top: 1px solid var(--border);
      background: white;
    }

    /* Category breakdown */
    .category-breakdown {
      margin-bottom: 1.5rem;
    }

    .category-item {
      display: flex;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .category-name {
      width: 200px;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .category-bar-container {
      flex: 1;
      height: 24px;
      background: var(--bg-light);
      border-radius: 4px;
      overflow: hidden;
      margin: 0 1rem;
    }

    .category-bar {
      height: 100%;
      background: linear-gradient(90deg, var(--accent), var(--accent-light));
      border-radius: 4px;
      display: flex;
      align-items: center;
      padding-left: 0.5rem;
    }

    .category-bar span {
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .category-value {
      width: 100px;
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      color: var(--accent);
    }

    /* Print styles */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .cover-page { margin: -0.75in; }
      .section { page-break-inside: avoid; }
      .data-table { page-break-inside: auto; }
      .data-table tr { page-break-inside: avoid; }
    }

    /* Environmental/Hazmat Cards */
    .env-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .env-card {
      background: #fffbeb;
      border: 1px solid #fed7aa;
      border-radius: 8px;
      padding: 1rem;
    }

    .env-card.hazmat {
      background: #fef2f2;
      border-color: #fecaca;
    }

    .env-type {
      font-weight: 600;
      color: var(--warning);
      margin-bottom: 0.25rem;
      font-size: 0.9rem;
    }

    .env-card.hazmat .env-type {
      color: var(--danger);
    }

    .env-description {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .env-meta {
      font-size: 0.8rem;
      color: var(--text-tertiary);
      margin-top: 0.5rem;
    }
  </style>
</head>
<body>
  ${config.includeCoverPage ? `
  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-confidential">${config.confidentialityLevel.replace('_', ' ')}</div>
    <div class="cover-logo">🏗️</div>
    <div class="cover-company">TRITON CONSTRUCTION</div>
    <div class="cover-title">Executive Bid Handoff</div>
    <div class="cover-subtitle">Comprehensive Project Analysis & Recommendations</div>
    <div class="cover-project-name">${projectName}</div>
    <div class="cover-meta">
      ${project?.state_project_number ? `<span>Project #: ${project.state_project_number}</span>` : ''}
      ${project?.owner ? `<span>Owner: ${project.owner}</span>` : ''}
      ${project?.letting_date ? `<span>Letting Date: ${formatDate(project.letting_date)}</span>` : ''}
      <span>Generated: ${formatDateTime(new Date().toISOString())}</span>
      ${config.preparedBy ? `<span>Prepared By: ${config.preparedBy}</span>` : ''}
      ${config.preparedFor ? `<span>Prepared For: ${config.preparedFor}</span>` : ''}
    </div>
  </div>
  ` : ''}

  <!-- TABLE OF CONTENTS -->
  <div class="toc">
    <h2>Table of Contents</h2>
    <ul class="toc-list">
      ${config.includeExecutiveSummary ? '<li class="toc-item"><span class="toc-number">1.</span><span class="toc-title">Executive Summary & AI Analysis</span></li>' : ''}
      ${config.includeProjectMetrics ? '<li class="toc-item"><span class="toc-number">2.</span><span class="toc-title">Project Metrics Dashboard</span></li>' : ''}
      ${config.includeFinancialAnalysis ? '<li class="toc-item"><span class="toc-number">3.</span><span class="toc-title">Financial Analysis & Pricing Breakdown</span></li>' : ''}
      ${config.includeRiskAssessment ? '<li class="toc-item"><span class="toc-number">4.</span><span class="toc-title">Risk Assessment Matrix</span></li>' : ''}
      ${config.includeOpportunities ? '<li class="toc-item"><span class="toc-number">5.</span><span class="toc-title">Value Engineering Opportunities</span></li>' : ''}
      ${config.includeQuestions ? '<li class="toc-item"><span class="toc-number">6.</span><span class="toc-title">Pre-Bid Questions & Clarifications</span></li>' : ''}
      ${config.includeWorkPackages ? '<li class="toc-item"><span class="toc-number">7.</span><span class="toc-title">Work Package Analysis</span></li>' : ''}
      ${config.includeEnvironmental ? '<li class="toc-item"><span class="toc-number">8.</span><span class="toc-title">Environmental & Compliance Considerations</span></li>' : ''}
      ${config.includeSchedule ? '<li class="toc-item"><span class="toc-number">9.</span><span class="toc-title">Schedule & Timeline Analysis</span></li>' : ''}
      ${config.includeRecommendations ? '<li class="toc-item"><span class="toc-number">10.</span><span class="toc-title">Strategic Recommendations</span></li>' : ''}
      ${config.includeLineItemsSummary ? '<li class="toc-item"><span class="toc-number">A.</span><span class="toc-title">Appendix: Line Items Summary</span></li>' : ''}
      ${config.includeDocumentList ? '<li class="toc-item"><span class="toc-number">B.</span><span class="toc-title">Appendix: Document Inventory</span></li>' : ''}
    </ul>
  </div>

  ${config.includeExecutiveSummary ? `
  <!-- EXECUTIVE SUMMARY -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">1</span>
      <span class="section-title">Executive Summary & AI Analysis</span>
    </div>

    <!-- Bid Recommendation Banner -->
    <div class="bid-recommendation">
      <div class="bid-rec-badge">${bidRec.recommendation}</div>
      <div class="bid-rec-details">
        <h4>AI Recommendation</h4>
        <p>${bidRec.reason}</p>
      </div>
    </div>

    ${snapshot?.project_overview ? `
    <div class="exec-summary-box">
      <h4>Project Overview</h4>
      <p>${snapshot.project_overview}</p>
    </div>
    ` : ''}

    ${snapshot?.key_quantities_summary ? `
    <div class="exec-summary-box">
      <h4>Key Quantities Analysis</h4>
      <p>${snapshot.key_quantities_summary}</p>
    </div>
    ` : ''}

    ${snapshot?.cost_considerations ? `
    <div class="exec-summary-box">
      <h4>Cost Considerations</h4>
      <p>${snapshot.cost_considerations}</p>
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${config.includeProjectMetrics ? `
  <!-- PROJECT METRICS -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">2</span>
      <span class="section-title">Project Metrics Dashboard</span>
    </div>

    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-value">${metrics?.total_line_items ?? 0}</div>
        <div class="metric-label">Total Line Items</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${formatCurrency(metrics?.total_bid_value)}</div>
        <div class="metric-label">Total Bid Value</div>
      </div>
      <div class="metric-card">
        <div class="metric-value danger">${criticalRisks.length + highRisks.length}</div>
        <div class="metric-label">High/Critical Risks</div>
      </div>
      <div class="metric-card">
        <div class="metric-value success">${opportunities.length}</div>
        <div class="metric-label">Opportunities</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${metrics?.items_reviewed ?? 0}</div>
        <div class="metric-label">Items Reviewed</div>
      </div>
      <div class="metric-card">
        <div class="metric-value info">${questions.length}</div>
        <div class="metric-label">Pre-Bid Questions</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${workPackages.length}</div>
        <div class="metric-label">Work Packages</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${documents.length}</div>
        <div class="metric-label">Documents Analyzed</div>
      </div>
    </div>

    ${project?.engineers_estimate ? `
    <div class="exec-summary-box">
      <h4>Bid vs. Engineer's Estimate</h4>
      <p>
        <strong>Engineer's Estimate:</strong> ${formatCurrency(project.engineers_estimate)}<br>
        <strong>Our Bid Value:</strong> ${formatCurrency(metrics?.total_bid_value)}<br>
        <strong>Variance:</strong> ${formatCurrency((metrics?.total_bid_value ?? 0) - project.engineers_estimate)}
        (${(((metrics?.total_bid_value ?? 0) - project.engineers_estimate) / project.engineers_estimate * 100).toFixed(1)}%)
      </p>
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${config.includeFinancialAnalysis ? `
  <!-- FINANCIAL ANALYSIS -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">3</span>
      <span class="section-title">Financial Analysis & Pricing Breakdown</span>
    </div>

    <div class="financial-breakdown">
      <h4 style="margin-bottom: 1rem; color: var(--primary);">Pricing Method Distribution</h4>
      <div class="breakdown-bar">
        ${assemblyPriced > 0 ? `<div class="breakdown-segment assembly" style="width: ${(assemblyPriced / totalItems) * 100}%">${assemblyPriced}</div>` : ''}
        ${subquotePriced > 0 ? `<div class="breakdown-segment subquote" style="width: ${(subquotePriced / totalItems) * 100}%">${subquotePriced}</div>` : ''}
        ${manualPriced > 0 ? `<div class="breakdown-segment manual" style="width: ${(manualPriced / totalItems) * 100}%">${manualPriced}</div>` : ''}
        ${totalItems - assemblyPriced - subquotePriced - manualPriced > 0 ? `<div class="breakdown-segment unpriced" style="width: ${((totalItems - assemblyPriced - subquotePriced - manualPriced) / totalItems) * 100}%">${totalItems - assemblyPriced - subquotePriced - manualPriced}</div>` : ''}
      </div>
      <div class="breakdown-legend">
        <div class="legend-item"><div class="legend-dot assembly"></div><span>Assembly-Based (${assemblyPriced})</span></div>
        <div class="legend-item"><div class="legend-dot subquote"></div><span>Subquote (${subquotePriced})</span></div>
        <div class="legend-item"><div class="legend-dot manual"></div><span>Manual (${manualPriced})</span></div>
        <div class="legend-item"><div class="legend-dot unpriced"></div><span>Unpriced (${totalItems - assemblyPriced - subquotePriced - manualPriced})</span></div>
      </div>
    </div>

    <h4 style="margin: 2rem 0 1rem; color: var(--primary);">Category Value Breakdown</h4>
    <div class="category-breakdown">
      ${Object.entries(categoryBreakdown)
        .sort((a, b) => b[1].value - a[1].value)
        .slice(0, 10)
        .map(([cat, data]) => {
          const maxValue = Math.max(...Object.values(categoryBreakdown).map(d => d.value));
          const pct = maxValue > 0 ? (data.value / maxValue) * 100 : 0;
          return `
          <div class="category-item">
            <div class="category-name">${cat}</div>
            <div class="category-bar-container">
              <div class="category-bar" style="width: ${pct}%">
                <span>${data.count} items</span>
              </div>
            </div>
            <div class="category-value">${formatCurrency(data.value)}</div>
          </div>
          `;
        }).join('')}
    </div>
  </div>
  ` : ''}

  ${config.includeRiskAssessment ? `
  <!-- RISK ASSESSMENT -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">4</span>
      <span class="section-title">Risk Assessment Matrix</span>
    </div>

    <div class="risk-matrix">
      <div class="risk-cell critical">
        <div class="risk-count">${criticalRisks.length}</div>
        <div class="risk-label">Critical</div>
      </div>
      <div class="risk-cell high">
        <div class="risk-count">${highRisks.length}</div>
        <div class="risk-label">High</div>
      </div>
      <div class="risk-cell medium">
        <div class="risk-count">${mediumRisks.length}</div>
        <div class="risk-label">Medium</div>
      </div>
      <div class="risk-cell low">
        <div class="risk-count">${lowRisks.length}</div>
        <div class="risk-label">Low</div>
      </div>
    </div>

    ${snapshot?.risk_summary ? `
    <div class="exec-summary-box">
      <h4>AI Risk Analysis</h4>
      <p>${snapshot.risk_summary}</p>
    </div>
    ` : ''}

    ${criticalRisks.length > 0 ? `
    <h4 style="color: var(--danger); margin: 1.5rem 0 1rem;">Critical Risks Requiring Immediate Attention</h4>
    <div class="risk-list">
      ${criticalRisks.map(risk => `
      <div class="risk-item critical">
        <div class="risk-severity critical">Critical</div>
        <div class="risk-content">
          <h5>${risk.title}</h5>
          <p>${risk.description || 'No description provided'}</p>
          ${risk.mitigation_strategy ? `<div class="risk-mitigation">Mitigation: ${risk.mitigation_strategy}</div>` : ''}
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}

    ${highRisks.length > 0 ? `
    <h4 style="color: var(--warning); margin: 1.5rem 0 1rem;">High Priority Risks</h4>
    <div class="risk-list">
      ${highRisks.slice(0, 5).map(risk => `
      <div class="risk-item high">
        <div class="risk-severity high">High</div>
        <div class="risk-content">
          <h5>${risk.title}</h5>
          <p>${risk.description || 'No description provided'}</p>
          ${risk.mitigation_strategy ? `<div class="risk-mitigation">Mitigation: ${risk.mitigation_strategy}</div>` : ''}
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${config.includeOpportunities && opportunities.length > 0 ? `
  <!-- OPPORTUNITIES -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">5</span>
      <span class="section-title">Value Engineering Opportunities</span>
    </div>

    <p style="margin-bottom: 1.5rem; color: var(--text-secondary);">
      The following opportunities have been identified for potential cost savings or competitive advantage:
    </p>

    <div class="risk-list">
      ${opportunities.map(opp => `
      <div class="risk-item opportunity">
        <div class="risk-severity opportunity">Opportunity</div>
        <div class="risk-content">
          <h5>${opp.title}</h5>
          <p>${opp.description || 'No description provided'}</p>
          ${opp.mitigation_strategy ? `<div class="risk-mitigation">Strategy: ${opp.mitigation_strategy}</div>` : ''}
        </div>
      </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${config.includeQuestions && questions.length > 0 ? `
  <!-- PRE-BID QUESTIONS -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">6</span>
      <span class="section-title">Pre-Bid Questions & Clarifications</span>
    </div>

    <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 1.5rem;">
      <div class="metric-card">
        <div class="metric-value warning">${pendingQuestions.length}</div>
        <div class="metric-label">Pending</div>
      </div>
      <div class="metric-card">
        <div class="metric-value info">${submittedQuestions.length}</div>
        <div class="metric-label">Submitted</div>
      </div>
      <div class="metric-card">
        <div class="metric-value success">${answeredQuestions.length}</div>
        <div class="metric-label">Answered</div>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 60%;">Question</th>
          <th>Priority</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${questions.slice(0, 15).map(q => `
        <tr>
          <td>${q.question_text}</td>
          <td><span class="status-badge ${(q.priority || 'medium').toLowerCase()}">${q.priority || 'Medium'}</span></td>
          <td><span class="status-badge ${q.status.toLowerCase().replace('_', '-')}">${q.status.replace('_', ' ')}</span></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ${questions.length > 15 ? `<p style="color: var(--text-tertiary); font-size: 0.875rem;">+ ${questions.length - 15} additional questions not shown</p>` : ''}
  </div>
  ` : ''}

  ${config.includeWorkPackages && workPackages.length > 0 ? `
  <!-- WORK PACKAGES -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">7</span>
      <span class="section-title">Work Package Analysis</span>
    </div>

    <div class="exec-summary-box">
      <h4>Work Package Summary</h4>
      <p>
        <strong>Total Packages:</strong> ${workPackages.length}<br>
        <strong>Combined Value:</strong> ${formatCurrency(totalWorkPackageValue)}<br>
        <strong>Total Items Assigned:</strong> ${workPackages.reduce((sum, wp) => sum + (wp.total_items || 0), 0)}
      </p>
    </div>

    <div class="packages-grid">
      ${workPackages.map(wp => `
      <div class="package-card">
        <div class="package-header">
          <div class="package-name">${wp.name}</div>
          <div class="package-value">${formatCurrency(wp.estimated_value)}</div>
        </div>
        <div class="package-meta">
          <span>${wp.total_items || 0} items</span>
          <span class="status-badge ${wp.status.toLowerCase().replace('_', '-')}">${wp.status.replace('_', ' ')}</span>
        </div>
        ${wp.description ? `<p style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 0.5rem;">${wp.description}</p>` : ''}
      </div>
      `).join('')}
    </div>
  </div>
  ` : ''}

  ${config.includeEnvironmental && (environmentalCommitments.length > 0 || hazmatFindings.length > 0) ? `
  <!-- ENVIRONMENTAL -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">8</span>
      <span class="section-title">Environmental & Compliance Considerations</span>
    </div>

    ${snapshot?.environmental_summary ? `
    <div class="exec-summary-box">
      <h4>AI Environmental Analysis</h4>
      <p>${snapshot.environmental_summary}</p>
    </div>
    ` : ''}

    ${environmentalCommitments.length > 0 ? `
    <h4 style="color: var(--warning); margin: 1.5rem 0 1rem;">Environmental Commitments (${environmentalCommitments.length})</h4>
    <div class="env-grid">
      ${environmentalCommitments.map(ec => `
      <div class="env-card">
        <div class="env-type">${ec.commitment_type}</div>
        <div class="env-description">${ec.description}</div>
        ${ec.compliance_deadline ? `<div class="env-meta">Deadline: ${formatDate(ec.compliance_deadline)}</div>` : ''}
      </div>
      `).join('')}
    </div>
    ` : ''}

    ${hazmatFindings.length > 0 ? `
    <h4 style="color: var(--danger); margin: 1.5rem 0 1rem;">Hazmat Findings (${hazmatFindings.length})</h4>
    <div class="env-grid">
      ${hazmatFindings.map(hf => `
      <div class="env-card hazmat">
        <div class="env-type">${hf.hazmat_type}</div>
        <div class="env-description">${hf.location_description || 'Location not specified'}</div>
        <div class="env-meta">
          ${hf.quantity_estimate ? `Quantity: ${hf.quantity_estimate}` : ''}
          ${hf.estimated_cost ? ` | Est. Cost: ${formatCurrency(hf.estimated_cost)}` : ''}
        </div>
      </div>
      `).join('')}
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${config.includeSchedule ? `
  <!-- SCHEDULE -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">9</span>
      <span class="section-title">Schedule & Timeline Analysis</span>
    </div>

    <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr);">
      <div class="metric-card">
        <div class="metric-value">${formatDate(project?.letting_date)}</div>
        <div class="metric-label">Letting Date</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${formatDate(project?.bid_due_date)}</div>
        <div class="metric-label">Bid Due Date</div>
      </div>
      <div class="metric-card">
        <div class="metric-value ${project?.bid_due_date && new Date(project.bid_due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'danger' : ''}">${
          project?.bid_due_date
            ? Math.ceil((new Date(project.bid_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 'N/A'
        }</div>
        <div class="metric-label">Days Until Due</div>
      </div>
    </div>

    ${snapshot?.schedule_summary ? `
    <div class="exec-summary-box">
      <h4>AI Schedule Analysis</h4>
      <p>${snapshot.schedule_summary}</p>
    </div>
    ` : ''}
  </div>
  ` : ''}

  ${config.includeRecommendations ? `
  <!-- RECOMMENDATIONS -->
  <div class="section">
    <div class="section-header">
      <span class="section-number">10</span>
      <span class="section-title">Strategic Recommendations</span>
    </div>

    <div class="bid-recommendation" style="margin-bottom: 1.5rem;">
      <div class="bid-rec-badge">${bidRec.recommendation}</div>
      <div class="bid-rec-details">
        <h4>Final Recommendation</h4>
        <p>${bidRec.reason}</p>
      </div>
    </div>

    ${snapshot?.recommendations ? `
    <div class="exec-summary-box">
      <h4>AI Strategic Recommendations</h4>
      <p>${snapshot.recommendations}</p>
    </div>
    ` : ''}

    <div class="exec-summary-box">
      <h4>Key Action Items</h4>
      <ul style="padding-left: 1.5rem; color: var(--text-secondary);">
        ${criticalRisks.length > 0 ? `<li>Address ${criticalRisks.length} critical risk(s) before bid submission</li>` : ''}
        ${pendingQuestions.length > 0 ? `<li>Submit ${pendingQuestions.length} pending pre-bid question(s)</li>` : ''}
        ${(metrics?.items_reviewed ?? 0) < (metrics?.total_line_items ?? 0) ? `<li>Complete pricing review for ${(metrics?.total_line_items ?? 0) - (metrics?.items_reviewed ?? 0)} remaining items</li>` : ''}
        ${environmentalCommitments.length > 0 ? `<li>Review ${environmentalCommitments.length} environmental commitment(s) for compliance planning</li>` : ''}
        ${opportunities.length > 0 ? `<li>Evaluate ${opportunities.length} value engineering opportunity(ies)</li>` : ''}
        <li>Final review and approval by authorized estimator</li>
      </ul>
    </div>
  </div>
  ` : ''}

  ${config.includeLineItemsSummary && lineItems.length > 0 ? `
  <!-- APPENDIX A: LINE ITEMS -->
  <div class="section" style="page-break-before: always;">
    <div class="section-header">
      <span class="section-number">A</span>
      <span class="section-title">Appendix: Line Items Summary (Top 50 by Value)</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Item #</th>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit</th>
          <th>Unit Price</th>
          <th>Extended</th>
        </tr>
      </thead>
      <tbody>
        ${lineItems
          .sort((a, b) => (b.final_extended_price || 0) - (a.final_extended_price || 0))
          .slice(0, 50)
          .map(item => `
        <tr>
          <td class="mono">${item.item_number}</td>
          <td>${item.description.length > 60 ? item.description.substring(0, 60) + '...' : item.description}</td>
          <td class="mono" style="text-align: right;">${item.quantity?.toLocaleString() || '-'}</td>
          <td>${item.unit || '-'}</td>
          <td class="currency">${item.final_unit_price ? formatCurrency(item.final_unit_price) : '-'}</td>
          <td class="currency">${item.final_extended_price ? formatCurrency(item.final_extended_price) : '-'}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>
    ${lineItems.length > 50 ? `<p style="color: var(--text-tertiary); font-size: 0.875rem; margin-top: 1rem;">Showing top 50 items by value. Total items: ${lineItems.length}</p>` : ''}
  </div>
  ` : ''}

  ${config.includeDocumentList && documents.length > 0 ? `
  <!-- APPENDIX B: DOCUMENTS -->
  <div class="section" style="page-break-before: always;">
    <div class="section-header">
      <span class="section-number">B</span>
      <span class="section-title">Appendix: Document Inventory</span>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Document Name</th>
          <th>Type</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${documents.map(doc => `
        <tr>
          <td>${doc.file_name}</td>
          <td>${doc.document_type || 'Unknown'}</td>
          <td><span class="status-badge ${doc.processing_status.toLowerCase()}">${doc.processing_status}</span></td>
        </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  ${config.includeSignatureBlock ? `
  <!-- SIGNATURE BLOCK -->
  <div class="signature-block" style="page-break-before: always;">
    <h3 style="color: var(--primary); margin-bottom: 1rem;">Approval & Sign-Off</h3>
    <p style="color: var(--text-secondary); margin-bottom: 2rem;">
      This Executive Bid Handoff document has been prepared for management review and approval.
      By signing below, the authorized parties acknowledge review of all sections and approve the
      bid recommendation contained herein.
    </p>

    <div class="signature-grid">
      <div>
        <div class="signature-line">
          <div class="signature-label">Prepared By: ${config.preparedBy || '________________________'}</div>
          <div class="signature-date">Date: ________________________</div>
        </div>
      </div>
      <div>
        <div class="signature-line">
          <div class="signature-label">Reviewed By: ________________________</div>
          <div class="signature-date">Date: ________________________</div>
        </div>
      </div>
      <div>
        <div class="signature-line">
          <div class="signature-label">Approved By: ${config.preparedFor || '________________________'}</div>
          <div class="signature-date">Date: ________________________</div>
        </div>
      </div>
      <div>
        <div class="signature-line">
          <div class="signature-label">Executive Approval: ________________________</div>
          <div class="signature-date">Date: ________________________</div>
        </div>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="page-footer">
    <span>TRITON CONSTRUCTION | Executive Bid Handoff</span>
    <span>${projectName}</span>
    <span>${config.confidentialityLevel.replace('_', ' ')}</span>
  </div>
</body>
</html>
    `;

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setIsGenerating(false);
        }, 500);
      };

      setTimeout(() => setIsGenerating(false), 3000);
    } else {
      setIsGenerating(false);
      alert('Please allow popups to generate the document');
    }
  };

  const updateConfig = (key: keyof HandoffConfig, value: boolean | string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const sectionCount = [
    config.includeExecutiveSummary,
    config.includeProjectMetrics,
    config.includeFinancialAnalysis,
    config.includeRiskAssessment,
    config.includeOpportunities,
    config.includeQuestions,
    config.includeWorkPackages,
    config.includeEnvironmental,
    config.includeSchedule,
    config.includeRecommendations,
    config.includeLineItemsSummary,
    config.includeDocumentList,
  ].filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content handoff-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Preparing Executive Handoff</h3>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="handoff-loading">
              <div className="loading-spinner large" />
              <p>Loading project data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content handoff-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Error</h3>
            <button className="modal-close" onClick={onClose}>&times;</button>
          </div>
          <div className="modal-body">
            <div className="handoff-error">
              <p>{error}</p>
              <button className="btn btn-primary" onClick={fetchAllData}>Retry</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content handoff-modal large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="handoff-header-content">
            <h3>Executive Handoff Document</h3>
            <span className="handoff-project-name">{projectName}</span>
          </div>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div className="handoff-tabs">
          <button
            className={`handoff-tab ${activeSection === 'configure' ? 'active' : ''}`}
            onClick={() => setActiveSection('configure')}
          >
            Configure Sections
          </button>
          <button
            className={`handoff-tab ${activeSection === 'preview' ? 'active' : ''}`}
            onClick={() => setActiveSection('preview')}
          >
            Preview Summary
          </button>
        </div>

        <div className="modal-body">
          {activeSection === 'configure' ? (
            <div className="handoff-configure">
              {/* Document Settings */}
              <div className="config-section">
                <h4>Document Settings</h4>
                <div className="config-row">
                  <div className="config-field">
                    <label>Prepared By</label>
                    <input
                      type="text"
                      className="form-input"
                      value={config.preparedBy}
                      onChange={e => updateConfig('preparedBy', e.target.value)}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="config-field">
                    <label>Prepared For</label>
                    <input
                      type="text"
                      className="form-input"
                      value={config.preparedFor}
                      onChange={e => updateConfig('preparedFor', e.target.value)}
                      placeholder="Recipient name"
                    />
                  </div>
                  <div className="config-field">
                    <label>Confidentiality Level</label>
                    <select
                      className="form-select"
                      value={config.confidentialityLevel}
                      onChange={e => updateConfig('confidentialityLevel', e.target.value)}
                    >
                      <option value="INTERNAL">Internal Use Only</option>
                      <option value="CONFIDENTIAL">Confidential</option>
                      <option value="CLIENT_READY">Client Ready</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section Selection */}
              <div className="config-section">
                <h4>Include Sections ({sectionCount} selected)</h4>
                <div className="section-grid">
                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeCoverPage}
                      onChange={e => updateConfig('includeCoverPage', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">📋</span>
                      <span className="toggle-label">Cover Page</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeExecutiveSummary}
                      onChange={e => updateConfig('includeExecutiveSummary', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">📝</span>
                      <span className="toggle-label">Executive Summary</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeProjectMetrics}
                      onChange={e => updateConfig('includeProjectMetrics', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">📊</span>
                      <span className="toggle-label">Project Metrics</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeFinancialAnalysis}
                      onChange={e => updateConfig('includeFinancialAnalysis', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">💰</span>
                      <span className="toggle-label">Financial Analysis</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeRiskAssessment}
                      onChange={e => updateConfig('includeRiskAssessment', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">⚠️</span>
                      <span className="toggle-label">Risk Assessment</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeOpportunities}
                      onChange={e => updateConfig('includeOpportunities', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">💡</span>
                      <span className="toggle-label">Opportunities</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeQuestions}
                      onChange={e => updateConfig('includeQuestions', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">❓</span>
                      <span className="toggle-label">Pre-Bid Questions</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeWorkPackages}
                      onChange={e => updateConfig('includeWorkPackages', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">📦</span>
                      <span className="toggle-label">Work Packages</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeEnvironmental}
                      onChange={e => updateConfig('includeEnvironmental', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">🌿</span>
                      <span className="toggle-label">Environmental</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeSchedule}
                      onChange={e => updateConfig('includeSchedule', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">📅</span>
                      <span className="toggle-label">Schedule Analysis</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeRecommendations}
                      onChange={e => updateConfig('includeRecommendations', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">🎯</span>
                      <span className="toggle-label">Recommendations</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeSignatureBlock}
                      onChange={e => updateConfig('includeSignatureBlock', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">✍️</span>
                      <span className="toggle-label">Signature Block</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Appendices */}
              <div className="config-section">
                <h4>Appendices</h4>
                <div className="section-grid">
                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeLineItemsSummary}
                      onChange={e => updateConfig('includeLineItemsSummary', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">📋</span>
                      <span className="toggle-label">Line Items Summary</span>
                      <span className="toggle-count">{projectData?.lineItems.length || 0} items</span>
                    </span>
                  </label>

                  <label className="section-toggle">
                    <input
                      type="checkbox"
                      checked={config.includeDocumentList}
                      onChange={e => updateConfig('includeDocumentList', e.target.checked)}
                    />
                    <span className="toggle-content">
                      <span className="toggle-icon">📄</span>
                      <span className="toggle-label">Document Inventory</span>
                      <span className="toggle-count">{projectData?.documents.length || 0} docs</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="handoff-preview">
              <div className="preview-card">
                <h4>Document Preview</h4>
                <div className="preview-stats">
                  <div className="preview-stat">
                    <span className="stat-value">{sectionCount}</span>
                    <span className="stat-label">Sections</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-value">{projectData?.risks.length || 0}</span>
                    <span className="stat-label">Risks</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-value">{projectData?.questions.length || 0}</span>
                    <span className="stat-label">Questions</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-value">{projectData?.lineItems.length || 0}</span>
                    <span className="stat-label">Line Items</span>
                  </div>
                </div>
              </div>

              <div className="preview-sections">
                <h5>Included Sections:</h5>
                <ul className="preview-section-list">
                  {config.includeCoverPage && <li>Cover Page</li>}
                  {config.includeExecutiveSummary && <li>1. Executive Summary & AI Analysis</li>}
                  {config.includeProjectMetrics && <li>2. Project Metrics Dashboard</li>}
                  {config.includeFinancialAnalysis && <li>3. Financial Analysis & Pricing Breakdown</li>}
                  {config.includeRiskAssessment && <li>4. Risk Assessment Matrix</li>}
                  {config.includeOpportunities && <li>5. Value Engineering Opportunities</li>}
                  {config.includeQuestions && <li>6. Pre-Bid Questions & Clarifications</li>}
                  {config.includeWorkPackages && <li>7. Work Package Analysis</li>}
                  {config.includeEnvironmental && <li>8. Environmental & Compliance</li>}
                  {config.includeSchedule && <li>9. Schedule & Timeline Analysis</li>}
                  {config.includeRecommendations && <li>10. Strategic Recommendations</li>}
                  {config.includeLineItemsSummary && <li>A. Appendix: Line Items Summary</li>}
                  {config.includeDocumentList && <li>B. Appendix: Document Inventory</li>}
                  {config.includeSignatureBlock && <li>Approval & Sign-Off</li>}
                </ul>
              </div>

              {!projectData?.snapshot && (
                <div className="preview-warning">
                  <span className="warning-icon">⚠️</span>
                  <span>No AI Executive Summary has been generated yet. Generate one from the Executive Summary tab for richer content.</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={generateHandoffDocument}
            disabled={isGenerating || sectionCount === 0}
          >
            {isGenerating ? (
              <>
                <span className="btn-spinner" />
                Generating...
              </>
            ) : (
              <>
                📄 Generate Executive Handoff
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
