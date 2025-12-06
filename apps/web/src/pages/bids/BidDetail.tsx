import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';

import { DocumentUpload } from '../../components/DocumentUpload';
import { DocumentList } from '../../components/DocumentList';
import { LineItemsTab } from '../../components/bids/LineItemsTab';

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

type TabId = 'overview' | 'documents' | 'line-items' | 'risks' | 'questions' | 'work-packages';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'line-items', label: 'Line Items', icon: '📋' },
  { id: 'risks', label: 'Risks', icon: '⚠️' },
  { id: 'questions', label: 'Questions', icon: '❓' },
  { id: 'work-packages', label: 'Work Packages', icon: '📦' },
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
            <OverviewTab project={project} metrics={metrics} />
          )}
          {activeTab === 'documents' && (
            <DocumentsTab projectId={project.id} onDocumentsChange={fetchProject} />
          )}
          {activeTab === 'line-items' && <LineItemsTab projectId={project.id} />}
          {activeTab === 'risks' && <RisksTab projectId={project.id} />}
          {activeTab === 'questions' && <QuestionsTab projectId={project.id} />}
          {activeTab === 'work-packages' && <WorkPackagesTab projectId={project.id} />}
        </div>
      </div>
    </>
  );
}

// Overview Tab Component
function OverviewTab({
  project,
  metrics,
}: {
  project: BidProject;
  metrics: DashboardMetrics | null;
}) {
  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="overview-tab">
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

// Placeholder Tab Components
function RisksTab({ projectId: _projectId }: { projectId: string }) {
  return (
    <div className="placeholder-tab">
      <div className="placeholder-icon">⚠️</div>
      <h3>Risk Register</h3>
      <p>Risk analysis coming in Phase 4 (AI Document Analysis)</p>
      <p className="placeholder-hint">
        AI will automatically identify risks from uploaded documents
      </p>
    </div>
  );
}

function QuestionsTab({ projectId: _projectId }: { projectId: string }) {
  return (
    <div className="placeholder-tab">
      <div className="placeholder-icon">❓</div>
      <h3>Pre-Bid Questions</h3>
      <p>Question management coming in Phase 5 (Risk & Categorization)</p>
      <p className="placeholder-hint">
        AI will suggest pre-bid questions based on identified risks
      </p>
    </div>
  );
}

function WorkPackagesTab({ projectId: _projectId }: { projectId: string }) {
  return (
    <div className="placeholder-tab">
      <div className="placeholder-icon">📦</div>
      <h3>Work Packages</h3>
      <p>Work package organization coming in Phase 6</p>
      <p className="placeholder-hint">
        Organize line items into work packages for estimating teams
      </p>
    </div>
  );
}
