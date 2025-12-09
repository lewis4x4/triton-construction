import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';

import { DocumentUpload } from '../../components/DocumentUpload';
import { DocumentList } from '../../components/DocumentList';
import { LineItemsTab } from '../../components/bids/LineItemsTab';
import { RisksTab } from '../../components/bids/RisksTab';
import { QuestionsTab } from '../../components/bids/QuestionsTab';
import { WorkPackagesTab } from '../../components/bids/WorkPackagesTab';
import { TeamTab } from '../../components/bids/TeamTab';
import './BidDetail.css';

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
  pricing_scenarios_count: number | null;
  estimated_completion_pct: number | null;
}

type TabId = 'overview' | 'executive-snapshot' | 'documents' | 'line-items' | 'risks' | 'questions' | 'work-packages' | 'team';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'executive-snapshot', label: 'AI Summary', icon: '🤖' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'line-items', label: 'Line Items', icon: '📋' },
  { id: 'risks', label: 'Risks', icon: '⚠️' },
  { id: 'questions', label: 'Questions', icon: '❓' },
  { id: 'work-packages', label: 'Work Packages', icon: '📦' },
  { id: 'team', label: 'Team', icon: '👥' },
];

export function BidDetail() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as TabId) || 'overview';

  const [project, setProject] = useState<BidProject | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch project details - select columns matching database schema
      const { data: projectData, error: projectError } = await supabase
        .from('bid_projects')
        .select('id, project_name, owner, state_project_number, county, route, letting_date, bid_due_date, location_description, status, engineers_estimate, created_at')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData as unknown as BidProject);

      // Fetch dashboard metrics
      const { data: metricsData } = await supabase
        .from('v_bid_project_dashboard')
        .select('*')
        .eq('bid_project_id', id)
        .single();

      setMetrics(metricsData as DashboardMetrics | null);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load bid project');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const setActiveTab = (tabId: TabId) => {
    setSearchParams({ tab: tabId });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'IDENTIFIED':
      case 'REVIEWING':
        return 'badge-gray';
      case 'ANALYZING':
        return 'badge-blue';
      case 'READY_FOR_REVIEW':
      case 'IN_REVIEW':
        return 'badge-purple';
      case 'APPROVED':
      case 'ESTIMATING':
        return 'badge-yellow';
      case 'SUBMITTED':
        return 'badge-blue';
      case 'WON':
        return 'badge-green';
      case 'LOST':
      case 'NO_BID':
      case 'CANCELLED':
        return 'badge-red';
      default:
        return 'badge-gray';
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="loading-container">
          <div className="loading-spinner" />
          <span>Loading bid project...</span>
        </div>
      </>
    );
  }

  if (error || !project) {
    return (
      <>
        <div className="error-container">
          <h2>Error Loading Project</h2>
          <p>{error || 'Project not found'}</p>
          <Link to="/bids" className="btn btn-primary">
            Back to Bid List
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bid-detail">
        {/* Header */}
        <div className="bid-detail-header">
          <div className="header-left">
            <Link to="/bids" className="back-link">
              ← Back to Bids
            </Link>
            <h1>{project.project_name}</h1>
            <div className="header-meta">
              {project.state_project_number && (
                <span className="meta-item">Project #: {project.state_project_number}</span>
              )}
              {project.owner && <span className="meta-item">{project.owner}</span>}
              {project.bid_due_date && (
                <span className="meta-item">Due: {formatDate(project.bid_due_date)}</span>
              )}
            </div>
          </div>
          <div className="header-right">
            <span className={`badge badge-lg ${getStatusBadgeClass(project.status)}`}>
              {project.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                className={`tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
                {tab.id === 'documents' && metrics && (
                  <span className="tab-badge">{metrics.total_documents}</span>
                )}
                {tab.id === 'line-items' && metrics && (
                  <span className="tab-badge">{metrics.total_line_items}</span>
                )}
                {tab.id === 'risks' && metrics && (
                  <span className="tab-badge">{metrics.total_risks}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <OverviewTab project={project} metrics={metrics} onDataRefresh={fetchProject} />
          )}
          {activeTab === 'executive-snapshot' && (
            <ExecutiveSnapshotTab projectId={project.id} projectName={project.project_name} />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab projectId={project.id} onDocumentsChange={fetchProject} />
          )}
          {activeTab === 'line-items' && <LineItemsTab projectId={project.id} />}
          {activeTab === 'risks' && <RisksTab projectId={project.id} />}
          {activeTab === 'questions' && <QuestionsTab projectId={project.id} />}
          {activeTab === 'work-packages' && <WorkPackagesTab projectId={project.id} />}
          {activeTab === 'team' && <TeamTab projectId={project.id} />}
        </div>
      </div>
    </>
  );
}

// Overview Tab Component
function OverviewTab({
  project,
  metrics,
  onDataRefresh,
}: {
  project: BidProject;
  metrics: DashboardMetrics | null;
  onDataRefresh?: () => Promise<void>;
}) {
  const [aiOperations, setAiOperations] = useState<Record<string, boolean>>({});
  const [aiErrors, setAiErrors] = useState<Record<string, string>>({});

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const runAiOperation = async (operation: string, endpoint: string, body: Record<string, unknown>) => {
    setAiOperations((prev) => ({ ...prev, [operation]: true }));
    setAiErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[operation];
      return newErrors;
    });

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${endpoint}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `${operation} failed`);
      }

      // Refresh data after successful AI operation
      if (onDataRefresh) {
        await onDataRefresh();
      }

      return true;
    } catch (err) {
      console.error(`${operation} error:`, err);
      setAiErrors((prev) => ({
        ...prev,
        [operation]: err instanceof Error ? err.message : 'Operation failed',
      }));
      return false;
    } finally {
      setAiOperations((prev) => ({ ...prev, [operation]: false }));
    }
  };

  const handleExtractRisks = () => runAiOperation(
    'risks',
    'extract-project-risks',
    { bid_project_id: project.id }
  );

  const handleGenerateQuestions = () => runAiOperation(
    'questions',
    'generate-prebid-questions',
    { bid_project_id: project.id }
  );

  const handleCategorizeItems = () => runAiOperation(
    'categorize',
    'categorize-line-items',
    { bid_project_id: project.id }
  );

  const handleRunAllAi = async () => {
    setAiOperations((prev) => ({ ...prev, all: true }));
    try {
      await handleExtractRisks();
      await handleGenerateQuestions();
      await handleCategorizeItems();
    } finally {
      setAiOperations((prev) => ({ ...prev, all: false }));
    }
  };

  const isAnyRunning = Object.values(aiOperations).some(Boolean);

  return (
    <div className="overview-tab">
      {/* AI Pipeline Actions */}
      <div className="ai-pipeline-section">
        <div className="ai-pipeline-header">
          <h3>🤖 AI Analysis Pipeline</h3>
          <button
            className="btn btn-primary"
            onClick={handleRunAllAi}
            disabled={isAnyRunning}
          >
            {aiOperations.all ? (
              <>
                <span className="btn-spinner" />
                Running All...
              </>
            ) : (
              'Run Full Analysis'
            )}
          </button>
        </div>

        <div className="ai-pipeline-grid">
          <div className="ai-pipeline-card">
            <div className="pipeline-card-header">
              <span className="pipeline-icon">⚠️</span>
              <h4>Extract Risks</h4>
            </div>
            <p>Analyze documents and extract project risks, hazards, and concerns.</p>
            <div className="pipeline-card-footer">
              <span className="pipeline-count">{metrics?.total_risks || 0} risks found</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExtractRisks}
                disabled={isAnyRunning}
              >
                {aiOperations.risks ? 'Running...' : 'Run'}
              </button>
            </div>
            {aiErrors.risks && <div className="pipeline-error">{aiErrors.risks}</div>}
          </div>

          <div className="ai-pipeline-card">
            <div className="pipeline-card-header">
              <span className="pipeline-icon">❓</span>
              <h4>Generate Questions</h4>
            </div>
            <p>Create pre-bid questions based on ambiguities and unclear specifications.</p>
            <div className="pipeline-card-footer">
              <span className="pipeline-count">{metrics?.total_questions || 0} questions</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleGenerateQuestions}
                disabled={isAnyRunning}
              >
                {aiOperations.questions ? 'Running...' : 'Run'}
              </button>
            </div>
            {aiErrors.questions && <div className="pipeline-error">{aiErrors.questions}</div>}
          </div>

          <div className="ai-pipeline-card">
            <div className="pipeline-card-header">
              <span className="pipeline-icon">📋</span>
              <h4>Categorize Items</h4>
            </div>
            <p>Match line items to WVDOH master items and assign work categories.</p>
            <div className="pipeline-card-footer">
              <span className="pipeline-count">{metrics?.total_line_items || 0} line items</span>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleCategorizeItems}
                disabled={isAnyRunning}
              >
                {aiOperations.categorize ? 'Running...' : 'Run'}
              </button>
            </div>
            {aiErrors.categorize && <div className="pipeline-error">{aiErrors.categorize}</div>}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">Line Items</div>
          <div className="metric-value">{metrics?.total_line_items || 0}</div>
          <div className="metric-detail">
            {metrics?.items_reviewed || 0} reviewed ({metrics?.total_line_items
              ? (((metrics.items_reviewed ?? 0) / metrics.total_line_items) * 100).toFixed(0)
              : 0}%)
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">Total Bid Value</div>
          <div className="metric-value">{formatCurrency(metrics?.total_bid_value)}</div>
          <div className="metric-detail">
            Base: {formatCurrency(metrics?.total_base_cost)}
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">Risks</div>
          <div className="metric-value">{metrics?.total_risks || 0}</div>
          <div className="metric-detail text-danger">
            {metrics?.high_critical_risks || 0} high/critical
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">Opportunities</div>
          <div className="metric-value text-success">{metrics?.total_opportunities || 0}</div>
          <div className="metric-detail">potential savings</div>
        </div>

        <div className="metric-card">
          <div className="metric-header">Documents</div>
          <div className="metric-value">{metrics?.total_documents || 0}</div>
          <div className="metric-detail">
            {metrics?.documents_processed || 0} processed
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">Completion</div>
          <div className="metric-value">{metrics?.estimated_completion_pct?.toFixed(0) || 0}%</div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${metrics?.estimated_completion_pct || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="detail-section">
        <h3>Project Details</h3>
        <div className="detail-grid">
          {project.location_description && (
            <div className="detail-item full-width">
              <label>Location</label>
              <p>{project.location_description}</p>
            </div>
          )}
          <div className="detail-item">
            <label>County</label>
            <p>{project.county || '-'}</p>
          </div>
          <div className="detail-item">
            <label>Route</label>
            <p>{project.route || '-'}</p>
          </div>
          <div className="detail-item">
            <label>Engineer's Estimate</label>
            <p>{formatCurrency(project.engineers_estimate)}</p>
          </div>
        </div>
      </div>

      {/* Pricing Method Breakdown */}
      {metrics && (metrics.total_line_items ?? 0) > 0 && (
        <div className="detail-section">
          <h3>Pricing Method Breakdown</h3>
          <div className="pricing-breakdown">
            <div className="breakdown-item">
              <span className="breakdown-label">Assembly-Based</span>
              <span className="breakdown-value">{metrics.items_assembly_priced ?? 0}</span>
              <div
                className="breakdown-bar"
                style={{
                  width: `${((metrics.items_assembly_priced ?? 0) / (metrics.total_line_items ?? 1)) * 100}%`,
                }}
              />
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Subquote</span>
              <span className="breakdown-value">{metrics.items_subquote_priced ?? 0}</span>
              <div
                className="breakdown-bar subquote"
                style={{
                  width: `${((metrics.items_subquote_priced ?? 0) / (metrics.total_line_items ?? 1)) * 100}%`,
                }}
              />
            </div>
            <div className="breakdown-item">
              <span className="breakdown-label">Manual</span>
              <span className="breakdown-value">{metrics.items_manual_priced ?? 0}</span>
              <div
                className="breakdown-bar manual"
                style={{
                  width: `${((metrics.items_manual_priced ?? 0) / (metrics.total_line_items ?? 1)) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Documents Tab Component
function DocumentsTab({
  projectId,
  onDocumentsChange,
}: {
  projectId: string;
  onDocumentsChange: () => void;
}) {
  return (
    <div className="documents-tab">
      <DocumentUpload projectId={projectId} onUploadComplete={onDocumentsChange} />
      <DocumentList projectId={projectId} />
    </div>
  );
}

// Executive Snapshot Tab Component
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
  work_packages_count: number | null;
  environmental_commitments_count: number | null;
  hazmat_findings_count: number | null;
  prebid_questions_count: number | null;
  ai_model_used: string | null;
  is_current: boolean;
  reviewed: boolean;
  created_at: string;
}

function ExecutiveSnapshotTab({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [snapshot, setSnapshot] = useState<ExecutiveSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchSnapshot = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('bid_executive_snapshots')
        .select('*')
        .eq('bid_project_id', projectId)
        .eq('is_current', true)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        throw fetchError;
      }

      setSnapshot(data as ExecutiveSnapshot | null);
    } catch (err) {
      console.error('Error fetching executive snapshot:', err);
      setError('Failed to load executive summary');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchSnapshot();
  }, [fetchSnapshot]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-executive-snapshot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ bid_project_id: projectId }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate summary');
      }

      // Refresh snapshot data
      await fetchSnapshot();
    } catch (err) {
      console.error('Error generating executive snapshot:', err);
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleExportPDF = () => {
    if (!snapshot) return;

    setIsExporting(true);

    // Generate PDF-friendly HTML content
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
  <title>Executive Summary - ${projectName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1a1a1a;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 3px solid #3d6b4f;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 24px;
      color: #3d6b4f;
      margin-bottom: 8px;
    }
    .header .meta {
      font-size: 12px;
      color: #666;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 30px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .metric {
      text-align: center;
    }
    .metric .value {
      font-size: 24px;
      font-weight: 700;
      color: #3d6b4f;
    }
    .metric .label {
      font-size: 11px;
      text-transform: uppercase;
      color: #666;
    }
    .metric.danger .value { color: #dc2626; }
    .metric.warning .value { color: #d97706; }
    .section {
      margin-bottom: 24px;
      page-break-inside: avoid;
    }
    .section h2 {
      font-size: 16px;
      color: #3d6b4f;
      border-bottom: 1px solid #e5e5e5;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .section.danger h2 { color: #dc2626; border-color: #fecaca; }
    .section.warning h2 { color: #d97706; border-color: #fed7aa; }
    .section.success h2 { color: #059669; border-color: #a7f3d0; }
    .section p {
      font-size: 14px;
      color: #333;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
      font-size: 11px;
      color: #999;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Executive Summary</h1>
    <div class="project-name" style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">${projectName}</div>
    <div class="meta">
      Version ${snapshot.version_number} • Generated ${formatDate(snapshot.created_at)}
      ${snapshot.ai_model_used ? ` • AI Model: ${snapshot.ai_model_used}` : ''}
    </div>
  </div>

  <div class="metrics">
    <div class="metric">
      <div class="value">${snapshot.total_line_items ?? 0}</div>
      <div class="label">Line Items</div>
    </div>
    <div class="metric">
      <div class="value">${formatCurrency(snapshot.total_estimated_value)}</div>
      <div class="label">Est. Value</div>
    </div>
    <div class="metric danger">
      <div class="value">${snapshot.critical_risks_count ?? 0}</div>
      <div class="label">Critical Risks</div>
    </div>
    <div class="metric warning">
      <div class="value">${snapshot.high_risks_count ?? 0}</div>
      <div class="label">High Risks</div>
    </div>
    <div class="metric">
      <div class="value">${snapshot.work_packages_count ?? 0}</div>
      <div class="label">Work Packages</div>
    </div>
    <div class="metric">
      <div class="value">${snapshot.prebid_questions_count ?? 0}</div>
      <div class="label">Questions</div>
    </div>
  </div>

  ${snapshot.project_overview ? `
  <div class="section">
    <h2>Project Overview</h2>
    <p>${snapshot.project_overview}</p>
  </div>` : ''}

  ${snapshot.key_quantities_summary ? `
  <div class="section">
    <h2>Key Quantities</h2>
    <p>${snapshot.key_quantities_summary}</p>
  </div>` : ''}

  ${snapshot.risk_summary ? `
  <div class="section danger">
    <h2>Risk Summary</h2>
    <p>${snapshot.risk_summary}</p>
  </div>` : ''}

  ${snapshot.environmental_summary ? `
  <div class="section warning">
    <h2>Environmental Considerations</h2>
    <p>${snapshot.environmental_summary}</p>
  </div>` : ''}

  ${snapshot.schedule_summary ? `
  <div class="section">
    <h2>Schedule Analysis</h2>
    <p>${snapshot.schedule_summary}</p>
  </div>` : ''}

  ${snapshot.cost_considerations ? `
  <div class="section">
    <h2>Cost Considerations</h2>
    <p>${snapshot.cost_considerations}</p>
  </div>` : ''}

  ${snapshot.recommendations ? `
  <div class="section success">
    <h2>AI Recommendations</h2>
    <p>${snapshot.recommendations}</p>
  </div>` : ''}

  <div class="footer">
    Generated by Triton AI Platform • ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
    ${!snapshot.reviewed ? '<br><strong>Note: This AI-generated summary has not been reviewed by an estimator.</strong>' : ''}
  </div>
</body>
</html>`;

    // Open a new window with the PDF content
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(pdfContent);
      printWindow.document.close();

      // Wait for content to load, then trigger print
      printWindow.onload = () => {
        printWindow.print();
        setIsExporting(false);
      };

      // Fallback if onload doesn't fire
      setTimeout(() => {
        setIsExporting(false);
      }, 2000);
    } else {
      setIsExporting(false);
      alert('Please allow popups to export PDF');
    }
  };

  if (isLoading) {
    return (
      <div className="executive-snapshot-tab">
        <div className="loading-container">
          <div className="loading-spinner" />
          <span>Loading AI summary...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="executive-snapshot-tab">
        <div className="error-container">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={fetchSnapshot}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="executive-snapshot-tab">
      {/* Header with Generate Button */}
      <div className="snapshot-header">
        <div className="snapshot-header-left">
          <h2>AI Executive Summary</h2>
          {snapshot && (
            <span className="snapshot-meta">
              Version {snapshot.version_number} • Generated {formatDate(snapshot.created_at)}
              {snapshot.ai_model_used && ` • ${snapshot.ai_model_used}`}
            </span>
          )}
        </div>
        <div className="snapshot-header-right">
          {snapshot && (
            <button
              className="btn btn-secondary"
              onClick={handleExportPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <span className="btn-spinner" />
                  Exporting...
                </>
              ) : (
                <>📄 Export PDF</>
              )}
            </button>
          )}
          <button
            className={`btn ${snapshot ? 'btn-secondary' : 'btn-primary'}`}
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <span className="btn-spinner" />
                Generating...
              </>
            ) : snapshot ? (
              'Regenerate Summary'
            ) : (
              'Generate AI Summary'
            )}
          </button>
        </div>
      </div>

      {generateError && (
        <div className="form-error">{generateError}</div>
      )}

      {!snapshot ? (
        <div className="no-snapshot">
          <div className="no-snapshot-icon">🤖</div>
          <h3>No AI Summary Generated</h3>
          <p>
            Click "Generate AI Summary" to analyze all project documents, risks, and line items
            to create an executive summary for {projectName}.
          </p>
          <p className="no-snapshot-hint">
            This uses Claude AI to synthesize information from your uploaded bid documents.
          </p>
        </div>
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="snapshot-metrics">
            <div className="snapshot-metric">
              <span className="metric-value">{snapshot.total_line_items ?? 0}</span>
              <span className="metric-label">Line Items</span>
            </div>
            <div className="snapshot-metric">
              <span className="metric-value">{formatCurrency(snapshot.total_estimated_value)}</span>
              <span className="metric-label">Est. Value</span>
            </div>
            <div className="snapshot-metric danger">
              <span className="metric-value">{snapshot.critical_risks_count ?? 0}</span>
              <span className="metric-label">Critical Risks</span>
            </div>
            <div className="snapshot-metric warning">
              <span className="metric-value">{snapshot.high_risks_count ?? 0}</span>
              <span className="metric-label">High Risks</span>
            </div>
            <div className="snapshot-metric">
              <span className="metric-value">{snapshot.work_packages_count ?? 0}</span>
              <span className="metric-label">Work Packages</span>
            </div>
            <div className="snapshot-metric">
              <span className="metric-value">{snapshot.prebid_questions_count ?? 0}</span>
              <span className="metric-label">Questions</span>
            </div>
          </div>

          {/* Summary Sections */}
          <div className="snapshot-sections">
            {snapshot.project_overview && (
              <div className="snapshot-section">
                <h3>Project Overview</h3>
                <div className="section-content">{snapshot.project_overview}</div>
              </div>
            )}

            {snapshot.key_quantities_summary && (
              <div className="snapshot-section">
                <h3>Key Quantities</h3>
                <div className="section-content">{snapshot.key_quantities_summary}</div>
              </div>
            )}

            {snapshot.risk_summary && (
              <div className="snapshot-section highlight-danger">
                <h3>Risk Summary</h3>
                <div className="section-content">{snapshot.risk_summary}</div>
              </div>
            )}

            {snapshot.environmental_summary && (
              <div className="snapshot-section highlight-warning">
                <h3>Environmental Considerations</h3>
                <div className="section-content">{snapshot.environmental_summary}</div>
              </div>
            )}

            {snapshot.schedule_summary && (
              <div className="snapshot-section">
                <h3>Schedule Analysis</h3>
                <div className="section-content">{snapshot.schedule_summary}</div>
              </div>
            )}

            {snapshot.cost_considerations && (
              <div className="snapshot-section">
                <h3>Cost Considerations</h3>
                <div className="section-content">{snapshot.cost_considerations}</div>
              </div>
            )}

            {snapshot.recommendations && (
              <div className="snapshot-section highlight-success">
                <h3>AI Recommendations</h3>
                <div className="section-content">{snapshot.recommendations}</div>
              </div>
            )}
          </div>

          {/* Review Status */}
          {!snapshot.reviewed && (
            <div className="snapshot-review-notice">
              <span className="notice-icon">⚠️</span>
              <span>This AI-generated summary has not been reviewed by an estimator.</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

