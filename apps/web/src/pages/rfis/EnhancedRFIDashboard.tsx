import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  HelpCircle,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Eye,
  Edit,
  Send,
  Download,
  RefreshCw,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  DollarSign,
  Timer,
  AlertCircle,
  X,
  Paperclip,
  MoreVertical
} from 'lucide-react';
import './EnhancedRFIDashboard.css';

interface RFI {
  id: string;
  rfi_number: string;
  subject: string;
  question: string;
  response: string | null;
  status: string;
  priority: string;
  spec_section: string;
  drawing_reference: string;
  submitted_date: string;
  required_date: string;
  response_date: string | null;
  closed_date: string | null;
  submitted_by: string;
  submitted_by_name: string;
  assigned_to: string;
  assigned_to_name: string;
  ball_in_court: string;
  discipline: string;
  cost_impact: boolean;
  cost_impact_amount: number | null;
  schedule_impact: boolean;
  schedule_impact_days: number | null;
  days_open: number;
  related_pcrs: string[];
  attachments_count: number;
  response_count: number;
  watchers: string[];
}

interface RFIMetrics {
  total_rfis: number;
  open_rfis: number;
  overdue_rfis: number;
  answered_today: number;
  avg_response_time: number;
  response_rate: number;
  cost_impacting: number;
  schedule_impacting: number;
  by_discipline: { discipline: string; count: number }[];
  by_ball_in_court: { party: string; count: number }[];
}

interface MonthlyTrend {
  month: string;
  submitted: number;
  answered: number;
  avg_days: number;
}

type TabType = 'overview' | 'all' | 'open' | 'answered' | 'overdue' | 'analytics';

export function EnhancedRFIDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [rfis, setRfis] = useState<RFI[]>([]);
  const [metrics, setMetrics] = useState<RFIMetrics | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; project_number: string }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRFI, setSelectedRFI] = useState<RFI | null>(null);
  const [showNewRFIModal, setShowNewRFIModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    discipline: 'all',
    ball_in_court: 'all',
    impact: 'all'
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId, activeTab, filters]);

  async function loadProjects() {
    const { data } = await (supabase as any)
      .from('projects')
      .select('id, name, project_number')
      .eq('status', 'ACTIVE')
      .order('name');

    if (data && data.length > 0) {
      setProjects(data);
      setSelectedProjectId(data[0].id);
    } else {
      const demoProjects = [
        { id: 'proj-1', name: 'Corridor H Section 12', project_number: '2024-001' },
        { id: 'proj-2', name: 'I-64 Bridge Rehabilitation', project_number: '2024-002' }
      ];
      setProjects(demoProjects);
      setSelectedProjectId('proj-1');
    }
    setLoading(false);
  }

  async function loadData() {
    setLoading(true);
    await Promise.all([loadMetrics(), loadRFIs(), loadMonthlyTrends()]);
    setLoading(false);
  }

  async function loadMetrics() {
    setMetrics({
      total_rfis: 156,
      open_rfis: 23,
      overdue_rfis: 5,
      answered_today: 3,
      avg_response_time: 4.2,
      response_rate: 94.5,
      cost_impacting: 18,
      schedule_impacting: 12,
      by_discipline: [
        { discipline: 'Structural', count: 42 },
        { discipline: 'Civil', count: 38 },
        { discipline: 'MEP', count: 28 },
        { discipline: 'Geotechnical', count: 24 },
        { discipline: 'Traffic', count: 14 },
        { discipline: 'Other', count: 10 }
      ],
      by_ball_in_court: [
        { party: 'Engineer', count: 12 },
        { party: 'Owner', count: 6 },
        { party: 'Contractor', count: 3 },
        { party: 'Subcontractor', count: 2 }
      ]
    });
  }

  async function loadRFIs() {
    const demoRFIs: RFI[] = [
      {
        id: 'rfi-1', rfi_number: 'RFI-2024-156', subject: 'Foundation Bearing Capacity - Pier 3',
        question: 'Please clarify the required bearing capacity for Pier 3 foundations. Geotechnical report shows 4000 PSF but structural drawings indicate 6000 PSF requirement.',
        response: null, status: 'SUBMITTED', priority: 'HIGH', spec_section: '31 63 00', drawing_reference: 'S-201',
        submitted_date: '2024-12-05', required_date: '2024-12-12', response_date: null, closed_date: null,
        submitted_by: 'user-1', submitted_by_name: 'Mike Johnson', assigned_to: 'user-2', assigned_to_name: 'Thompson Engineering',
        ball_in_court: 'Engineer', discipline: 'Structural', cost_impact: true, cost_impact_amount: 45000,
        schedule_impact: true, schedule_impact_days: 5, days_open: 3, related_pcrs: [], attachments_count: 3,
        response_count: 0, watchers: ['John Smith', 'Sarah Chen']
      },
      {
        id: 'rfi-2', rfi_number: 'RFI-2024-155', subject: 'Traffic Signal Timing - Intersection A',
        question: 'Request clarification on signal timing parameters for the temporary traffic signal at Intersection A during Phase 2 construction.',
        response: 'Approved signal timing per attached schedule. Coordinate with WVDOH traffic engineer for final verification.',
        status: 'ANSWERED', priority: 'MEDIUM', spec_section: '34 41 00', drawing_reference: 'T-105',
        submitted_date: '2024-12-01', required_date: '2024-12-08', response_date: '2024-12-06', closed_date: null,
        submitted_by: 'user-3', submitted_by_name: 'Emily Davis', assigned_to: 'user-4', assigned_to_name: 'WVDOH',
        ball_in_court: 'Contractor', discipline: 'Traffic', cost_impact: false, cost_impact_amount: null,
        schedule_impact: false, schedule_impact_days: null, days_open: 0, related_pcrs: [], attachments_count: 2,
        response_count: 1, watchers: []
      },
      {
        id: 'rfi-3', rfi_number: 'RFI-2024-154', subject: 'Concrete Mix Design - High Strength Deck Pour',
        question: 'Please provide approved mix design for 5000 PSI concrete specified for bridge deck. Current approved mix is 4000 PSI.',
        response: null, status: 'UNDER_REVIEW', priority: 'CRITICAL', spec_section: '03 30 00', drawing_reference: 'S-301',
        submitted_date: '2024-11-28', required_date: '2024-12-05', response_date: null, closed_date: null,
        submitted_by: 'user-1', submitted_by_name: 'Mike Johnson', assigned_to: 'user-2', assigned_to_name: 'Thompson Engineering',
        ball_in_court: 'Engineer', discipline: 'Structural', cost_impact: true, cost_impact_amount: 25000,
        schedule_impact: true, schedule_impact_days: 3, days_open: 10, related_pcrs: ['PCR-2024-045'], attachments_count: 5,
        response_count: 2, watchers: ['John Smith']
      },
      {
        id: 'rfi-4', rfi_number: 'RFI-2024-153', subject: 'Utility Conflict - Waterline Station 45+00',
        question: 'Discovered 12" waterline not shown on plans at Station 45+00. Please advise on required clearance and potential relocation.',
        response: 'Coordinate with water utility. Minimum 18" clearance required. If relocation needed, submit PCR.',
        status: 'CLOSED', priority: 'HIGH', spec_section: '33 10 00', drawing_reference: 'C-110',
        submitted_date: '2024-11-20', required_date: '2024-11-25', response_date: '2024-11-24', closed_date: '2024-11-28',
        submitted_by: 'user-5', submitted_by_name: 'Tom Wilson', assigned_to: 'user-2', assigned_to_name: 'Thompson Engineering',
        ball_in_court: 'Closed', discipline: 'Civil', cost_impact: true, cost_impact_amount: 35000,
        schedule_impact: false, schedule_impact_days: null, days_open: 0, related_pcrs: ['PCR-2024-042'], attachments_count: 4,
        response_count: 3, watchers: []
      },
      {
        id: 'rfi-5', rfi_number: 'RFI-2024-152', subject: 'Reinforcement Spacing - Abutment A',
        question: 'Drawing S-102 shows #8 bars at 6" spacing but specification calls for 8" spacing. Please clarify which governs.',
        response: null, status: 'SUBMITTED', priority: 'HIGH', spec_section: '03 20 00', drawing_reference: 'S-102',
        submitted_date: '2024-12-06', required_date: '2024-12-10', response_date: null, closed_date: null,
        submitted_by: 'user-1', submitted_by_name: 'Mike Johnson', assigned_to: 'user-2', assigned_to_name: 'Thompson Engineering',
        ball_in_court: 'Engineer', discipline: 'Structural', cost_impact: false, cost_impact_amount: null,
        schedule_impact: true, schedule_impact_days: 2, days_open: 2, related_pcrs: [], attachments_count: 1,
        response_count: 0, watchers: ['Sarah Chen']
      }
    ];

    let filtered = demoRFIs;

    // Apply tab filter
    if (activeTab === 'open') {
      filtered = filtered.filter(r => ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'].includes(r.status));
    } else if (activeTab === 'answered') {
      filtered = filtered.filter(r => ['ANSWERED', 'CLOSED'].includes(r.status));
    } else if (activeTab === 'overdue') {
      filtered = filtered.filter(r => {
        if (r.status === 'ANSWERED' || r.status === 'CLOSED') return false;
        return new Date(r.required_date) < new Date();
      });
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r =>
        r.subject.toLowerCase().includes(query) ||
        r.rfi_number.toLowerCase().includes(query) ||
        r.question.toLowerCase().includes(query)
      );
    }

    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(r => r.status === filters.status);
    }
    if (filters.priority !== 'all') {
      filtered = filtered.filter(r => r.priority === filters.priority);
    }
    if (filters.discipline !== 'all') {
      filtered = filtered.filter(r => r.discipline === filters.discipline);
    }
    if (filters.ball_in_court !== 'all') {
      filtered = filtered.filter(r => r.ball_in_court === filters.ball_in_court);
    }
    if (filters.impact !== 'all') {
      if (filters.impact === 'cost') {
        filtered = filtered.filter(r => r.cost_impact);
      } else if (filters.impact === 'schedule') {
        filtered = filtered.filter(r => r.schedule_impact);
      }
    }

    setRfis(filtered);
  }

  async function loadMonthlyTrends() {
    setMonthlyTrends([
      { month: 'Jul', submitted: 18, answered: 16, avg_days: 5.2 },
      { month: 'Aug', submitted: 22, answered: 20, avg_days: 4.8 },
      { month: 'Sep', submitted: 28, answered: 26, avg_days: 4.5 },
      { month: 'Oct', submitted: 25, answered: 24, avg_days: 4.1 },
      { month: 'Nov', submitted: 32, answered: 30, avg_days: 3.8 },
      { month: 'Dec', submitted: 31, answered: 28, avg_days: 4.2 }
    ]);
  }

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      DRAFT: { color: 'gray', icon: FileText, label: 'Draft' },
      SUBMITTED: { color: 'blue', icon: Send, label: 'Submitted' },
      UNDER_REVIEW: { color: 'yellow', icon: Clock, label: 'Under Review' },
      ANSWERED: { color: 'green', icon: CheckCircle, label: 'Answered' },
      CLOSED: { color: 'purple', icon: CheckCircle, label: 'Closed' },
      VOID: { color: 'gray', icon: XCircle, label: 'Void' }
    };
    return configs[status] || { color: 'gray', icon: HelpCircle, label: status };
  };

  const getPriorityConfig = (priority: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      LOW: { color: 'gray', label: 'Low' },
      MEDIUM: { color: 'blue', label: 'Medium' },
      HIGH: { color: 'orange', label: 'High' },
      CRITICAL: { color: 'red', label: 'Critical' }
    };
    return configs[priority] || { color: 'gray', label: priority };
  };

  const isOverdue = (rfi: RFI) => {
    if (!rfi.required_date) return false;
    if (rfi.status === 'ANSWERED' || rfi.status === 'CLOSED') return false;
    return new Date(rfi.required_date) < new Date();
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'all', label: 'All RFIs', count: metrics?.total_rfis || 0 },
    { id: 'open', label: 'Open', count: metrics?.open_rfis || 0 },
    { id: 'answered', label: 'Answered', count: (metrics?.total_rfis || 0) - (metrics?.open_rfis || 0) },
    { id: 'overdue', label: 'Overdue', count: metrics?.overdue_rfis || 0, alert: true },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];

  const maxTrendSubmitted = Math.max(...monthlyTrends.map(t => t.submitted));

  return (
    <div className="enhanced-rfi-dashboard">
      {/* Header */}
      <div className="rfi-header">
        <div className="rfi-header-left">
          <h1><HelpCircle size={28} /> RFI Management</h1>
          <p>Request for Information tracking and response management</p>
        </div>
        <div className="rfi-header-actions">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rfi-project-select"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </option>
            ))}
          </select>
          <button className="rfi-btn rfi-btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
            Filters
          </button>
          <button className="rfi-btn rfi-btn-primary" onClick={() => setShowNewRFIModal(true)}>
            <Plus size={18} />
            New RFI
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="rfi-kpi-grid">
        <div className="rfi-kpi-card blue">
          <div className="rfi-kpi-header">
            <div className="rfi-kpi-icon">
              <HelpCircle size={24} />
            </div>
            <span className="rfi-kpi-trend neutral">Total</span>
          </div>
          <div className="rfi-kpi-value">{metrics?.total_rfis || 0}</div>
          <div className="rfi-kpi-label">Total RFIs</div>
          <div className="rfi-kpi-details">
            <div className="rfi-kpi-detail">
              <span className="rfi-kpi-detail-value">{metrics?.open_rfis || 0}</span>
              <span className="rfi-kpi-detail-label">Open</span>
            </div>
          </div>
        </div>

        <div className={`rfi-kpi-card ${(metrics?.overdue_rfis || 0) > 0 ? 'red' : 'green'}`}>
          <div className="rfi-kpi-header">
            <div className="rfi-kpi-icon">
              <AlertTriangle size={24} />
            </div>
            {(metrics?.overdue_rfis || 0) > 0 && (
              <span className="rfi-kpi-trend down">Urgent</span>
            )}
          </div>
          <div className="rfi-kpi-value">{metrics?.overdue_rfis || 0}</div>
          <div className="rfi-kpi-label">Overdue</div>
          {(metrics?.overdue_rfis || 0) > 0 && (
            <div className="rfi-kpi-details">
              <div className="rfi-kpi-detail">
                <span className="rfi-kpi-detail-label">Requires attention</span>
              </div>
            </div>
          )}
        </div>

        <div className="rfi-kpi-card green">
          <div className="rfi-kpi-header">
            <div className="rfi-kpi-icon">
              <Timer size={24} />
            </div>
            <span className="rfi-kpi-trend up">-0.3d</span>
          </div>
          <div className="rfi-kpi-value">{metrics?.avg_response_time || 0}d</div>
          <div className="rfi-kpi-label">Avg Response Time</div>
          <div className="rfi-kpi-details">
            <div className="rfi-kpi-detail">
              <span className="rfi-kpi-detail-label">Days faster this month</span>
            </div>
          </div>
        </div>

        <div className="rfi-kpi-card green">
          <div className="rfi-kpi-header">
            <div className="rfi-kpi-icon">
              <CheckCircle size={24} />
            </div>
            <span className="rfi-kpi-trend up">+2.1%</span>
          </div>
          <div className="rfi-kpi-value">{metrics?.response_rate || 0}%</div>
          <div className="rfi-kpi-label">Response Rate</div>
          <div className="rfi-kpi-details">
            <div className="rfi-kpi-detail">
              <span className="rfi-kpi-detail-label">This month</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rfi-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`rfi-tab ${activeTab === tab.id ? 'active' : ''} ${tab.alert && (tab.count || 0) > 0 ? 'alert' : ''}`}
              onClick={() => setActiveTab(tab.id as TabType)}
            >
              {Icon && <Icon size={16} />}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`rfi-tab-badge ${tab.alert && tab.count > 0 ? 'alert' : ''}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search and Controls */}
      <div className="rfi-table-header">
        <h3><FileText size={20} /> RFI List</h3>
        <div className="rfi-table-controls">
          <div className="rfi-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search RFIs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="rfi-filter-btn" title="Export">
            <Download size={16} /> Export
          </button>
          <button className="rfi-filter-btn" title="Refresh" onClick={loadData}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="filter-bar">
          <div className="filter-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ANSWERED">Answered</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Priority</label>
            <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
              <option value="all">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Discipline</label>
            <select value={filters.discipline} onChange={(e) => setFilters({ ...filters, discipline: e.target.value })}>
              <option value="all">All Disciplines</option>
              <option value="Structural">Structural</option>
              <option value="Civil">Civil</option>
              <option value="MEP">MEP</option>
              <option value="Geotechnical">Geotechnical</option>
              <option value="Traffic">Traffic</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Ball in Court</label>
            <select value={filters.ball_in_court} onChange={(e) => setFilters({ ...filters, ball_in_court: e.target.value })}>
              <option value="all">All Parties</option>
              <option value="Engineer">Engineer</option>
              <option value="Owner">Owner</option>
              <option value="Contractor">Contractor</option>
              <option value="Subcontractor">Subcontractor</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Impact</label>
            <select value={filters.impact} onChange={(e) => setFilters({ ...filters, impact: e.target.value })}>
              <option value="all">All</option>
              <option value="cost">Cost Impact</option>
              <option value="schedule">Schedule Impact</option>
            </select>
          </div>
          <button className="filter-clear" onClick={() => setFilters({ status: 'all', priority: 'all', discipline: 'all', ball_in_court: 'all', impact: 'all' })}>
            Clear Filters
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="rfi-content">
        {loading ? (
          <div className="loading-state">
            <RefreshCw className="spin" size={32} />
            <span>Loading...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewPanel
                rfis={rfis}
                metrics={metrics}
                monthlyTrends={monthlyTrends}
                maxTrendSubmitted={maxTrendSubmitted}
                getStatusConfig={getStatusConfig}
                getPriorityConfig={getPriorityConfig}
                isOverdue={isOverdue}
                onRFIClick={setSelectedRFI}
              />
            )}
            {(activeTab === 'all' || activeTab === 'open' || activeTab === 'answered' || activeTab === 'overdue') && (
              <RFIsTable
                rfis={rfis}
                getStatusConfig={getStatusConfig}
                getPriorityConfig={getPriorityConfig}
                isOverdue={isOverdue}
                onRFIClick={setSelectedRFI}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsPanel
                metrics={metrics}
                monthlyTrends={monthlyTrends}
                maxTrendSubmitted={maxTrendSubmitted}
              />
            )}
          </>
        )}
      </div>

      {/* Detail Panel */}
      {selectedRFI && (
        <RFIDetailPanel
          rfi={selectedRFI}
          onClose={() => setSelectedRFI(null)}
          getStatusConfig={getStatusConfig}
          getPriorityConfig={getPriorityConfig}
          isOverdue={isOverdue}
        />
      )}

      {/* New RFI Modal */}
      {showNewRFIModal && (
        <NewRFIModal
          projectId={selectedProjectId}
          onClose={() => setShowNewRFIModal(false)}
          onSave={() => {
            setShowNewRFIModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function OverviewPanel({
  rfis,
  metrics,
  monthlyTrends,
  maxTrendSubmitted,
  getStatusConfig,
  getPriorityConfig,
  isOverdue,
  onRFIClick
}: any) {
  return (
    <div className="overview-panel">
      <div className="overview-grid">
        {/* Monthly Trend Chart */}
        <div className="overview-card trend-chart">
          <h3>RFI Activity Trend</h3>
          <div className="chart-container">
            <div className="bar-chart">
              {monthlyTrends.map((month: MonthlyTrend) => (
                <div key={month.month} className="bar-group">
                  <div className="bar-stack">
                    <div
                      className="bar submitted"
                      style={{ height: `${(month.submitted / maxTrendSubmitted) * 100}%` }}
                      title={`${month.submitted} submitted`}
                    />
                    <div
                      className="bar answered"
                      style={{ height: `${(month.answered / maxTrendSubmitted) * 100}%` }}
                      title={`${month.answered} answered`}
                    />
                  </div>
                  <span className="bar-label">{month.month}</span>
                </div>
              ))}
            </div>
            <div className="chart-legend">
              <span className="legend-item"><span className="legend-color submitted"></span>Submitted</span>
              <span className="legend-item"><span className="legend-color answered"></span>Answered</span>
            </div>
          </div>
        </div>

        {/* Ball in Court */}
        <div className="overview-card ball-in-court">
          <h3>Ball in Court</h3>
          <div className="bic-list">
            {metrics?.by_ball_in_court.map((item: any) => (
              <div key={item.party} className="bic-item">
                <div className="bic-info">
                  <span className="bic-party">{item.party}</span>
                  <span className="bic-count">{item.count} RFIs</span>
                </div>
                <div className="bic-bar-container">
                  <div
                    className="bic-bar"
                    style={{ width: `${(item.count / (metrics?.open_rfis || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By Discipline */}
        <div className="overview-card discipline-chart">
          <h3>RFIs by Discipline</h3>
          <div className="discipline-list">
            {metrics?.by_discipline.map((item: any) => (
              <div key={item.discipline} className="discipline-item">
                <span className="discipline-name">{item.discipline}</span>
                <div className="discipline-bar-container">
                  <div
                    className="discipline-bar"
                    style={{ width: `${(item.count / (metrics?.total_rfis || 1)) * 100}%` }}
                  />
                </div>
                <span className="discipline-count">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent RFIs */}
        <div className="overview-card recent-rfis">
          <div className="card-header">
            <h3>Recent RFIs</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="rfis-list">
            {rfis.slice(0, 5).map((rfi: RFI) => {
              const statusConfig = getStatusConfig(rfi.status);
              const StatusIcon = statusConfig.icon;
              const priorityConfig = getPriorityConfig(rfi.priority);
              const overdue = isOverdue(rfi);
              return (
                <div
                  key={rfi.id}
                  className={`rfi-item ${overdue ? 'overdue' : ''}`}
                  onClick={() => onRFIClick(rfi)}
                >
                  <div className="rfi-main">
                    <span className="rfi-number">{rfi.rfi_number}</span>
                    <span className="rfi-subject">{rfi.subject}</span>
                    <div className="rfi-meta">
                      <span className="rfi-discipline">{rfi.discipline}</span>
                      {rfi.cost_impact && <DollarSign size={12} className="impact-icon cost" />}
                      {rfi.schedule_impact && <Clock size={12} className="impact-icon schedule" />}
                    </div>
                  </div>
                  <div className="rfi-status">
                    <span className={`priority-badge ${priorityConfig.color}`}>{priorityConfig.label}</span>
                    <span className={`status-badge ${statusConfig.color}`}>
                      <StatusIcon size={12} />
                      {statusConfig.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RFIsTable({
  rfis,
  getStatusConfig,
  getPriorityConfig,
  isOverdue,
  onRFIClick
}: any) {
  return (
    <div className="rfis-table-container">
      <table className="rfis-table">
        <thead>
          <tr>
            <th>RFI #</th>
            <th>Subject</th>
            <th>Discipline</th>
            <th>Ball in Court</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Required Date</th>
            <th>Days Open</th>
            <th>Impact</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rfis.length === 0 ? (
            <tr>
              <td colSpan={10} className="empty-state">
                <HelpCircle size={48} />
                <h3>No RFIs found</h3>
                <p>Create a new RFI or adjust your filters</p>
              </td>
            </tr>
          ) : (
            rfis.map((rfi: RFI) => {
              const statusConfig = getStatusConfig(rfi.status);
              const StatusIcon = statusConfig.icon;
              const priorityConfig = getPriorityConfig(rfi.priority);
              const overdue = isOverdue(rfi);
              return (
                <tr
                  key={rfi.id}
                  className={overdue ? 'overdue' : ''}
                  onClick={() => onRFIClick(rfi)}
                >
                  <td className="rfi-number-cell">{rfi.rfi_number}</td>
                  <td className="subject-cell">
                    <div className="subject-text">{rfi.subject}</div>
                    <div className="subject-meta">
                      {rfi.spec_section && <span>Spec: {rfi.spec_section}</span>}
                      {rfi.drawing_reference && <span>Dwg: {rfi.drawing_reference}</span>}
                    </div>
                  </td>
                  <td>{rfi.discipline}</td>
                  <td>
                    <span className="ball-in-court">{rfi.ball_in_court}</span>
                  </td>
                  <td>
                    <span className={`priority-badge ${priorityConfig.color}`}>{priorityConfig.label}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${statusConfig.color}`}>
                      <StatusIcon size={12} />
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className={overdue ? 'overdue-date' : ''}>
                    {rfi.required_date ? new Date(rfi.required_date).toLocaleDateString() : '-'}
                  </td>
                  <td className={rfi.days_open > 7 ? 'days-warning' : ''}>
                    {rfi.days_open > 0 ? `${rfi.days_open} days` : '-'}
                  </td>
                  <td className="impact-cell">
                    {rfi.cost_impact && (
                      <span className="impact-badge cost" title="Cost Impact">
                        <DollarSign size={12} />
                      </span>
                    )}
                    {rfi.schedule_impact && (
                      <span className="impact-badge schedule" title="Schedule Impact">
                        <Clock size={12} />
                      </span>
                    )}
                    {!rfi.cost_impact && !rfi.schedule_impact && '-'}
                  </td>
                  <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                    <button className="action-btn" title="View"><Eye size={16} /></button>
                    <button className="action-btn" title="Edit"><Edit size={16} /></button>
                    <button className="action-btn" title="More"><MoreVertical size={16} /></button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsPanel({ metrics, monthlyTrends, maxTrendSubmitted: _maxTrendSubmitted }: any) {
  return (
    <div className="analytics-panel">
      <div className="analytics-grid">
        <div className="analytics-card large">
          <h3>Response Time Trend</h3>
          <div className="response-trend">
            {monthlyTrends.map((month: MonthlyTrend, _index: number) => (
              <div key={month.month} className="response-month">
                <div className="response-bar-wrapper">
                  <div
                    className="response-bar"
                    style={{ height: `${(month.avg_days / 6) * 100}%` }}
                  />
                </div>
                <span className="response-label">{month.month}</span>
                <span className="response-value">{month.avg_days}d</span>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card">
          <h3>Key Performance Indicators</h3>
          <div className="kpi-grid">
            <div className="kpi-box">
              <span className="kpi-box-value">{metrics?.response_rate || 0}%</span>
              <span className="kpi-box-label">Response Rate</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-box-value">{metrics?.avg_response_time || 0}d</span>
              <span className="kpi-box-label">Avg Response</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-box-value">{metrics?.answered_today || 0}</span>
              <span className="kpi-box-label">Answered Today</span>
            </div>
            <div className="kpi-box">
              <span className="kpi-box-value">{metrics?.cost_impacting || 0}</span>
              <span className="kpi-box-label">Cost Impacting</span>
            </div>
          </div>
        </div>

        <div className="analytics-card">
          <h3>Impact Summary</h3>
          <div className="impact-summary">
            <div className="impact-item">
              <div className="impact-icon cost">
                <DollarSign size={20} />
              </div>
              <div className="impact-content">
                <span className="impact-value">{metrics?.cost_impacting || 0}</span>
                <span className="impact-label">Cost Impacting RFIs</span>
              </div>
            </div>
            <div className="impact-item">
              <div className="impact-icon schedule">
                <Clock size={20} />
              </div>
              <div className="impact-content">
                <span className="impact-value">{metrics?.schedule_impacting || 0}</span>
                <span className="impact-label">Schedule Impacting RFIs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RFIDetailPanel({ rfi, onClose, getStatusConfig, getPriorityConfig, isOverdue }: any) {
  const statusConfig = getStatusConfig(rfi.status);
  const StatusIcon = statusConfig.icon;
  const priorityConfig = getPriorityConfig(rfi.priority);
  const overdue = isOverdue(rfi);

  return (
    <div className="detail-panel-overlay">
      <div className="detail-panel">
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-number">{rfi.rfi_number}</span>
            <h2>{rfi.subject}</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="panel-content">
          <div className="status-row">
            <span className={`status-badge large ${statusConfig.color}`}>
              <StatusIcon size={16} />
              {statusConfig.label}
            </span>
            <span className={`priority-badge large ${priorityConfig.color}`}>{priorityConfig.label}</span>
            {overdue && (
              <span className="overdue-badge">
                <AlertTriangle size={14} />
                Overdue
              </span>
            )}
          </div>

          <div className="detail-section">
            <h4>Question</h4>
            <p className="question-text">{rfi.question}</p>
          </div>

          {rfi.response && (
            <div className="detail-section response-section">
              <h4>Response</h4>
              <p className="response-text">{rfi.response}</p>
              <span className="response-date">Responded on {new Date(rfi.response_date).toLocaleDateString()}</span>
            </div>
          )}

          <div className="detail-section">
            <h4>Details</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>Discipline</label>
                <span>{rfi.discipline}</span>
              </div>
              <div className="detail-item">
                <label>Ball in Court</label>
                <span className="ball-in-court">{rfi.ball_in_court}</span>
              </div>
              <div className="detail-item">
                <label>Spec Section</label>
                <span>{rfi.spec_section || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Drawing Ref</label>
                <span>{rfi.drawing_reference || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Submitted</label>
                <span>{new Date(rfi.submitted_date).toLocaleDateString()}</span>
              </div>
              <div className="detail-item">
                <label>Required</label>
                <span className={overdue ? 'overdue' : ''}>{rfi.required_date ? new Date(rfi.required_date).toLocaleDateString() : '-'}</span>
              </div>
              <div className="detail-item">
                <label>Days Open</label>
                <span>{rfi.days_open > 0 ? `${rfi.days_open} days` : 'Closed'}</span>
              </div>
              <div className="detail-item">
                <label>Assigned To</label>
                <span>{rfi.assigned_to_name}</span>
              </div>
            </div>
          </div>

          {(rfi.cost_impact || rfi.schedule_impact) && (
            <div className="detail-section">
              <h4>Project Impact</h4>
              <div className="impact-details">
                {rfi.cost_impact && (
                  <div className="impact-detail cost">
                    <DollarSign size={16} />
                    <span>Cost Impact: {rfi.cost_impact_amount ? `$${rfi.cost_impact_amount.toLocaleString()}` : 'TBD'}</span>
                  </div>
                )}
                {rfi.schedule_impact && (
                  <div className="impact-detail schedule">
                    <Clock size={16} />
                    <span>Schedule Impact: {rfi.schedule_impact_days ? `${rfi.schedule_impact_days} days` : 'TBD'}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {rfi.related_pcrs.length > 0 && (
            <div className="detail-section">
              <h4>Related PCRs</h4>
              <div className="related-items">
                {rfi.related_pcrs.map((pcr: string) => (
                  <span key={pcr} className="related-item">{pcr}</span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h4>Attachments</h4>
            <div className="attachments-count">
              <Paperclip size={16} />
              <span>{rfi.attachments_count} attachments</span>
            </div>
          </div>

          {rfi.watchers.length > 0 && (
            <div className="detail-section">
              <h4>Watchers</h4>
              <div className="watchers-list">
                {rfi.watchers.map((watcher: string) => (
                  <span key={watcher} className="watcher">{watcher}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="panel-actions">
          {rfi.status !== 'ANSWERED' && rfi.status !== 'CLOSED' ? (
            <>
              <button className="btn-secondary">
                <Edit size={18} />
                Edit
              </button>
              <button className="btn-primary">
                <MessageSquare size={18} />
                Add Response
              </button>
            </>
          ) : (
            <>
              <button className="btn-secondary">
                <FileText size={18} />
                View Full History
              </button>
              <button className="btn-primary">
                <Download size={18} />
                Export
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function NewRFIModal({ projectId: _projectId, onClose, onSave }: { projectId: string; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    subject: '',
    question: '',
    spec_section: '',
    drawing_reference: '',
    discipline: 'Structural',
    priority: 'MEDIUM',
    required_date: '',
    cost_impact: false,
    schedule_impact: false
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    onSave();
  }

  return (
    <div className="modal-overlay">
      <div className="rfi-modal">
        <div className="modal-header">
          <h2>New RFI</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-content">
            <div className="form-group">
              <label>Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief description of the question"
                required
              />
            </div>

            <div className="form-group">
              <label>Question *</label>
              <textarea
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Detailed question or request for clarification..."
                rows={4}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Spec Section</label>
                <input
                  type="text"
                  value={formData.spec_section}
                  onChange={(e) => setFormData({ ...formData, spec_section: e.target.value })}
                  placeholder="e.g., 03 30 00"
                />
              </div>
              <div className="form-group">
                <label>Drawing Reference</label>
                <input
                  type="text"
                  value={formData.drawing_reference}
                  onChange={(e) => setFormData({ ...formData, drawing_reference: e.target.value })}
                  placeholder="e.g., Sheet S-101"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Discipline</label>
                <select
                  value={formData.discipline}
                  onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                >
                  <option value="Structural">Structural</option>
                  <option value="Civil">Civil</option>
                  <option value="MEP">MEP</option>
                  <option value="Geotechnical">Geotechnical</option>
                  <option value="Traffic">Traffic</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Required Response Date</label>
              <input
                type="date"
                value={formData.required_date}
                onChange={(e) => setFormData({ ...formData, required_date: e.target.value })}
              />
            </div>

            <div className="form-row checkboxes">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.cost_impact}
                  onChange={(e) => setFormData({ ...formData, cost_impact: e.target.checked })}
                />
                <DollarSign size={16} />
                Potential Cost Impact
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.schedule_impact}
                  onChange={(e) => setFormData({ ...formData, schedule_impact: e.target.checked })}
                />
                <Clock size={16} />
                Potential Schedule Impact
              </label>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="spin" size={18} />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create RFI
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EnhancedRFIDashboard;
