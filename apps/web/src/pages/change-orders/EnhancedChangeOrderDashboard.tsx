import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Plus,
  Filter,
  Search,
  BarChart3,
  PieChart,
  Calendar,
  ArrowDownRight,
  RefreshCw,
  Eye,
  Edit,
  MoreVertical,
  ChevronRight,
  Send,
  X,
  FileCheck,
  Scale,
  Activity,
  History
} from 'lucide-react';
import './EnhancedChangeOrderDashboard.css';

interface Project {
  id: string;
  name: string;
  project_number: string;
  organization_id: string;
  original_contract_value: number;
  current_contract_value: number;
  original_working_days: number;
  current_working_days: number;
}

interface ChangeOrderRequest {
  id: string;
  cor_number: string;
  title: string;
  description: string;
  change_type: string;
  reason: string | null;
  status: string;
  estimated_cost: number | null;
  submitted_cost: number | null;
  approved_cost: number | null;
  estimated_time_impact_days: number | null;
  origination_date: string;
  submitted_date: string | null;
  approved_date: string | null;
  created_at: string;
  created_by_name: string;
  assigned_to_name: string | null;
  priority: string;
  ball_in_court: string;
  days_open: number;
  cost_variance: number | null;
  related_rfis: string[];
  supporting_documents: number;
}

interface ChangeOrder {
  id: string;
  change_order_number: string;
  title: string;
  description: string;
  change_type: string;
  status: string;
  this_change_amount: number;
  cumulative_change_amount: number;
  this_time_extension: number | null;
  cumulative_time_extension: number;
  executed_at: string | null;
  owner_approved_at: string | null;
  effective_date: string | null;
  pcrs_included: string[];
  approval_chain: ApprovalStep[];
}

interface ApprovalStep {
  role: string;
  name: string;
  status: string;
  date: string | null;
  comments: string | null;
}

interface TimeExtension {
  id: string;
  request_number: string;
  title: string;
  reason: string;
  description: string;
  days_requested: number;
  days_granted: number | null;
  status: string;
  delay_start_date: string;
  delay_type: string;
  weather_days: number;
  created_at: string;
}

interface ChangeMetrics {
  total_pcrs: number;
  pending_pcrs: number;
  approved_pcrs: number;
  rejected_pcrs: number;
  total_cos: number;
  executed_cos: number;
  total_approved_amount: number;
  total_pending_amount: number;
  contract_growth_percent: number;
  avg_processing_days: number;
  time_extensions_granted: number;
  time_extensions_pending: number;
}

interface MonthlyTrend {
  month: string;
  pcrs_submitted: number;
  cos_executed: number;
  amount: number;
}

type TabType = 'overview' | 'pcrs' | 'change-orders' | 'time-extensions' | 'analytics';

export function EnhancedChangeOrderDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [pcrs, setPcrs] = useState<ChangeOrderRequest[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [timeExtensions, setTimeExtensions] = useState<TimeExtension[]>([]);
  const [metrics, setMetrics] = useState<ChangeMetrics | null>(null);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPCR, setSelectedPCR] = useState<ChangeOrderRequest | null>(null);
  const [selectedCO, setSelectedCO] = useState<ChangeOrder | null>(null);
  const [_showNewPCRModal, setShowNewPCRModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    priority: 'all',
    dateRange: 'all'
  });

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId, activeTab]);

  async function loadProjects() {
    const { data } = await (supabase as any)
      .from('projects')
      .select('id, name, project_number, organization_id, original_contract_value, current_contract_value, original_working_days, current_working_days')
      .in('status', ['ACTIVE', 'MOBILIZATION', 'SUBSTANTIAL_COMPLETION'])
      .order('name');

    if (data && data.length > 0) {
      setProjects(data);
      setSelectedProjectId(data[0].id);
    } else {
      // Demo data
      const demoProjects = [
        { id: 'proj-1', name: 'Corridor H Section 12', project_number: '2024-001', organization_id: 'org-1', original_contract_value: 15000000, current_contract_value: 16250000, original_working_days: 180, current_working_days: 195 },
        { id: 'proj-2', name: 'I-64 Bridge Rehabilitation', project_number: '2024-002', organization_id: 'org-1', original_contract_value: 8500000, current_contract_value: 8750000, original_working_days: 120, current_working_days: 125 }
      ];
      setProjects(demoProjects);
      setSelectedProjectId('proj-1');
    }
    setLoading(false);
  }

  async function loadData() {
    setLoading(true);
    await Promise.all([
      loadMetrics(),
      loadPCRs(),
      loadChangeOrders(),
      loadTimeExtensions(),
      loadMonthlyTrends()
    ]);
    setLoading(false);
  }

  async function loadMetrics() {
    // Demo metrics
    const project = projects.find(p => p.id === selectedProjectId);
    const originalValue = project?.original_contract_value || 15000000;
    const currentValue = project?.current_contract_value || 16250000;
    const growth = ((currentValue - originalValue) / originalValue) * 100;

    setMetrics({
      total_pcrs: 47,
      pending_pcrs: 12,
      approved_pcrs: 28,
      rejected_pcrs: 7,
      total_cos: 8,
      executed_cos: 6,
      total_approved_amount: currentValue - originalValue,
      total_pending_amount: 425000,
      contract_growth_percent: growth,
      avg_processing_days: 18,
      time_extensions_granted: 15,
      time_extensions_pending: 3
    });
  }

  async function loadPCRs() {
    const demoPCRs: ChangeOrderRequest[] = [
      {
        id: 'pcr-1', cor_number: 'PCR-2024-047', title: 'Additional Foundation Work - Soft Soil Conditions',
        description: 'Unforeseen soil conditions require additional foundation stabilization', change_type: 'UNFORESEEN_CONDITIONS',
        reason: 'Geotechnical investigation did not reveal full extent of soft soils', status: 'SUBMITTED',
        estimated_cost: 185000, submitted_cost: 192500, approved_cost: null, estimated_time_impact_days: 12,
        origination_date: '2024-11-15', submitted_date: '2024-11-28', approved_date: null, created_at: '2024-11-15',
        created_by_name: 'Mike Johnson', assigned_to_name: 'WVDOH Review', priority: 'HIGH', ball_in_court: 'Owner',
        days_open: 23, cost_variance: 7500, related_rfis: ['RFI-089', 'RFI-091'], supporting_documents: 8
      },
      {
        id: 'pcr-2', cor_number: 'PCR-2024-046', title: 'Utility Relocation - Undocumented Gas Line',
        description: 'Discovered undocumented 8" gas line requiring relocation', change_type: 'UNFORESEEN_CONDITIONS',
        reason: 'Gas line not shown on utility plans or marked during locates', status: 'APPROVED',
        estimated_cost: 45000, submitted_cost: 47500, approved_cost: 46200, estimated_time_impact_days: 5,
        origination_date: '2024-11-10', submitted_date: '2024-11-15', approved_date: '2024-12-01', created_at: '2024-11-10',
        created_by_name: 'Sarah Chen', assigned_to_name: null, priority: 'CRITICAL', ball_in_court: 'Contractor',
        days_open: 0, cost_variance: 1200, related_rfis: ['RFI-085'], supporting_documents: 12
      },
      {
        id: 'pcr-3', cor_number: 'PCR-2024-045', title: 'Traffic Signal Upgrade - MUTCD Compliance',
        description: 'Upgrade traffic signal timing and hardware per new MUTCD requirements', change_type: 'REGULATORY_REQUIREMENT',
        reason: 'New MUTCD standards effective during project duration', status: 'PRICING',
        estimated_cost: 78000, submitted_cost: null, approved_cost: null, estimated_time_impact_days: 8,
        origination_date: '2024-11-05', submitted_date: null, approved_date: null, created_at: '2024-11-05',
        created_by_name: 'Emily Davis', assigned_to_name: 'Estimating Team', priority: 'MEDIUM', ball_in_court: 'Contractor',
        days_open: 33, cost_variance: null, related_rfis: [], supporting_documents: 4
      },
      {
        id: 'pcr-4', cor_number: 'PCR-2024-044', title: 'Bridge Deck Overlay - Increased Thickness',
        description: 'Owner requested increase in overlay thickness from 2" to 3"', change_type: 'OWNER_INITIATED',
        reason: 'Owner engineering review recommended increased overlay for durability', status: 'UNDER_NEGOTIATION',
        estimated_cost: 125000, submitted_cost: 142000, approved_cost: null, estimated_time_impact_days: 4,
        origination_date: '2024-10-28', submitted_date: '2024-11-10', approved_date: null, created_at: '2024-10-28',
        created_by_name: 'John Smith', assigned_to_name: 'Project Manager', priority: 'HIGH', ball_in_court: 'Negotiation',
        days_open: 41, cost_variance: 17000, related_rfis: ['RFI-078'], supporting_documents: 6
      },
      {
        id: 'pcr-5', cor_number: 'PCR-2024-043', title: 'Value Engineering - Precast vs Cast-in-Place',
        description: 'Propose precast concrete panels instead of cast-in-place to reduce schedule', change_type: 'VALUE_ENGINEERING',
        reason: 'Schedule recovery and quality improvement opportunity', status: 'IDENTIFIED',
        estimated_cost: -35000, submitted_cost: null, approved_cost: null, estimated_time_impact_days: -10,
        origination_date: '2024-12-01', submitted_date: null, approved_date: null, created_at: '2024-12-01',
        created_by_name: 'Tom Wilson', assigned_to_name: 'Engineering Review', priority: 'MEDIUM', ball_in_court: 'Contractor',
        days_open: 7, cost_variance: null, related_rfis: [], supporting_documents: 2
      }
    ];

    let filtered = demoPCRs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(query) ||
        p.cor_number.toLowerCase().includes(query)
      );
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.type !== 'all') {
      filtered = filtered.filter(p => p.change_type === filters.type);
    }

    if (filters.priority !== 'all') {
      filtered = filtered.filter(p => p.priority === filters.priority);
    }

    setPcrs(filtered);
  }

  async function loadChangeOrders() {
    const demoCOs: ChangeOrder[] = [
      {
        id: 'co-1', change_order_number: 'CO-008', title: 'Change Order #8 - Utility Relocations & Soil Remediation',
        description: 'Combined change order for utility conflicts and unforeseen soil conditions',
        change_type: 'UNFORESEEN_CONDITIONS', status: 'EXECUTED', this_change_amount: 287500, cumulative_change_amount: 1250000,
        this_time_extension: 15, cumulative_time_extension: 15, executed_at: '2024-11-25', owner_approved_at: '2024-11-20',
        effective_date: '2024-11-25', pcrs_included: ['PCR-2024-038', 'PCR-2024-039', 'PCR-2024-040'],
        approval_chain: [
          { role: 'Project Manager', name: 'John Smith', status: 'APPROVED', date: '2024-11-15', comments: null },
          { role: 'Operations Director', name: 'Sarah Chen', status: 'APPROVED', date: '2024-11-18', comments: 'Verified pricing' },
          { role: 'WVDOH Engineer', name: 'James Wilson', status: 'APPROVED', date: '2024-11-20', comments: 'Approved per contract' }
        ]
      },
      {
        id: 'co-2', change_order_number: 'CO-007', title: 'Change Order #7 - Drainage System Modifications',
        description: 'Modified drainage design per WVDOH request', change_type: 'OWNER_INITIATED', status: 'EXECUTED',
        this_change_amount: 156000, cumulative_change_amount: 962500, this_time_extension: null, cumulative_time_extension: 0,
        executed_at: '2024-10-30', owner_approved_at: '2024-10-28', effective_date: '2024-10-30',
        pcrs_included: ['PCR-2024-035', 'PCR-2024-036'],
        approval_chain: [
          { role: 'Project Manager', name: 'John Smith', status: 'APPROVED', date: '2024-10-20', comments: null },
          { role: 'Operations Director', name: 'Sarah Chen', status: 'APPROVED', date: '2024-10-25', comments: null },
          { role: 'WVDOH Engineer', name: 'James Wilson', status: 'APPROVED', date: '2024-10-28', comments: null }
        ]
      },
      {
        id: 'co-3', change_order_number: 'CO-009', title: 'Change Order #9 - Bridge Deck Overlay Upgrade',
        description: 'Increased overlay thickness and scope modifications', change_type: 'OWNER_INITIATED',
        status: 'PENDING_OWNER_APPROVAL', this_change_amount: 138500, cumulative_change_amount: 1388500,
        this_time_extension: 4, cumulative_time_extension: 19, executed_at: null, owner_approved_at: null,
        effective_date: null, pcrs_included: ['PCR-2024-044'],
        approval_chain: [
          { role: 'Project Manager', name: 'John Smith', status: 'APPROVED', date: '2024-12-01', comments: null },
          { role: 'Operations Director', name: 'Sarah Chen', status: 'APPROVED', date: '2024-12-03', comments: 'Recommend approval' },
          { role: 'WVDOH Engineer', name: 'James Wilson', status: 'PENDING', date: null, comments: null }
        ]
      }
    ];
    setChangeOrders(demoCOs);
  }

  async function loadTimeExtensions() {
    const demoExtensions: TimeExtension[] = [
      { id: 'te-1', request_number: 'TE-2024-008', title: 'Weather Delay - November 2024', reason: 'Excessive precipitation days exceeded contract allowance', description: '8 weather days in November exceeded the monthly allowance of 5 days', days_requested: 3, days_granted: 3, status: 'GRANTED', delay_start_date: '2024-11-01', delay_type: 'WEATHER', weather_days: 8, created_at: '2024-12-01' },
      { id: 'te-2', request_number: 'TE-2024-007', title: 'Utility Relocation Delay', reason: 'Gas company scheduling delay', description: 'Gas company unable to relocate line within original schedule', days_requested: 5, days_granted: 5, status: 'GRANTED', delay_start_date: '2024-11-10', delay_type: 'OWNER_CAUSED', weather_days: 0, created_at: '2024-11-15' },
      { id: 'te-3', request_number: 'TE-2024-009', title: 'Unforeseen Soil Conditions', reason: 'Additional foundation work required', description: 'Soft soil conditions requiring additional stabilization time', days_requested: 12, days_granted: null, status: 'UNDER_REVIEW', delay_start_date: '2024-11-20', delay_type: 'UNFORESEEN', weather_days: 0, created_at: '2024-12-05' }
    ];
    setTimeExtensions(demoExtensions);
  }

  async function loadMonthlyTrends() {
    setMonthlyTrends([
      { month: 'Jul', pcrs_submitted: 5, cos_executed: 1, amount: 125000 },
      { month: 'Aug', pcrs_submitted: 8, cos_executed: 1, amount: 185000 },
      { month: 'Sep', pcrs_submitted: 6, cos_executed: 2, amount: 312000 },
      { month: 'Oct', pcrs_submitted: 9, cos_executed: 1, amount: 156000 },
      { month: 'Nov', pcrs_submitted: 12, cos_executed: 2, amount: 443500 },
      { month: 'Dec', pcrs_submitted: 7, cos_executed: 1, amount: 138500 }
    ]);
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: any; label: string }> = {
      IDENTIFIED: { color: 'gray', icon: FileText, label: 'Identified' },
      PRICING: { color: 'blue', icon: DollarSign, label: 'Pricing' },
      PRICED: { color: 'indigo', icon: FileCheck, label: 'Priced' },
      SUBMITTED: { color: 'blue', icon: Send, label: 'Submitted' },
      UNDER_REVIEW: { color: 'yellow', icon: Clock, label: 'Under Review' },
      UNDER_NEGOTIATION: { color: 'orange', icon: Scale, label: 'Negotiating' },
      APPROVED: { color: 'green', icon: CheckCircle, label: 'Approved' },
      REJECTED: { color: 'red', icon: XCircle, label: 'Rejected' },
      VOID: { color: 'gray', icon: XCircle, label: 'Void' },
      INCORPORATED: { color: 'purple', icon: CheckCircle, label: 'Incorporated' },
      DRAFT: { color: 'gray', icon: Edit, label: 'Draft' },
      PENDING_INTERNAL_REVIEW: { color: 'yellow', icon: Clock, label: 'Internal Review' },
      INTERNAL_APPROVED: { color: 'teal', icon: CheckCircle, label: 'Internal Approved' },
      SUBMITTED_TO_OWNER: { color: 'blue', icon: Send, label: 'Sent to Owner' },
      PENDING_OWNER_APPROVAL: { color: 'yellow', icon: Clock, label: 'Pending Owner' },
      OWNER_APPROVED: { color: 'green', icon: CheckCircle, label: 'Owner Approved' },
      EXECUTED: { color: 'green', icon: CheckCircle, label: 'Executed' },
      GRANTED: { color: 'green', icon: CheckCircle, label: 'Granted' },
      DENIED: { color: 'red', icon: XCircle, label: 'Denied' },
      PENDING: { color: 'yellow', icon: Clock, label: 'Pending' }
    };
    return configs[status] || { color: 'gray', icon: FileText, label: status };
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

  const project = projects.find(p => p.id === selectedProjectId);
  const originalValue = project?.original_contract_value || 15000000;
  const currentValue = project?.current_contract_value || 16250000;
  const contractGrowth = currentValue - originalValue;
  const growthPercent = (contractGrowth / originalValue) * 100;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'pcrs', label: 'Potential Changes', count: metrics?.pending_pcrs },
    { id: 'change-orders', label: 'Change Orders', count: changeOrders.filter(c => c.status !== 'EXECUTED').length },
    { id: 'time-extensions', label: 'Time Extensions', count: timeExtensions.filter(t => t.status === 'UNDER_REVIEW').length },
    { id: 'analytics', label: 'Analytics', icon: PieChart }
  ];

  // Calculate max for chart scaling
  const maxTrendAmount = Math.max(...monthlyTrends.map(t => t.amount));

  return (
    <div className="enhanced-change-order-dashboard">
      {/* Header */}
      <div className="co-header">
        <div className="header-left">
          <h1>Change Order Management</h1>
          <p className="header-subtitle">Track PCRs, change orders, and contract modifications</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="project-select"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </option>
            ))}
          </select>
          <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
            Filters
          </button>
          <button className="btn-primary" onClick={() => setShowNewPCRModal(true)}>
            <Plus size={18} />
            New PCR
          </button>
        </div>
      </div>

      {/* Contract Value Summary */}
      <div className="contract-summary">
        <div className="contract-value-card original">
          <div className="value-label">Original Contract</div>
          <div className="value-amount">{formatCurrency(originalValue)}</div>
        </div>
        <div className="contract-arrow">
          <ChevronRight size={24} />
        </div>
        <div className="contract-changes">
          <div className={`changes-amount ${contractGrowth >= 0 ? 'positive' : 'negative'}`}>
            {contractGrowth >= 0 ? '+' : ''}{formatCurrency(contractGrowth)}
          </div>
          <div className="changes-label">Approved Changes</div>
        </div>
        <div className="contract-arrow">
          <ChevronRight size={24} />
        </div>
        <div className="contract-value-card current">
          <div className="value-label">Current Contract</div>
          <div className="value-amount">{formatCurrency(currentValue)}</div>
        </div>
        <div className="contract-metrics">
          <div className="metric">
            <span className={`metric-value ${growthPercent >= 0 ? 'positive' : 'negative'}`}>
              {growthPercent >= 0 ? '+' : ''}{growthPercent.toFixed(1)}%
            </span>
            <span className="metric-label">Contract Growth</span>
          </div>
          <div className="metric">
            <span className="metric-value pending">{formatCurrency(metrics?.total_pending_amount || 0)}</span>
            <span className="metric-label">Pending Changes</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="co-kpis">
        <div className="kpi-card">
          <div className="kpi-icon blue">
            <FileText size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{metrics?.total_pcrs || 0}</span>
            <span className="kpi-label">Total PCRs</span>
            <div className="kpi-breakdown">
              <span className="breakdown-item pending">{metrics?.pending_pcrs || 0} Pending</span>
              <span className="breakdown-item approved">{metrics?.approved_pcrs || 0} Approved</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">
            <DollarSign size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{metrics?.total_cos || 0}</span>
            <span className="kpi-label">Change Orders</span>
            <div className="kpi-breakdown">
              <span className="breakdown-item executed">{metrics?.executed_cos || 0} Executed</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">
            <Clock size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">+{metrics?.time_extensions_granted || 0} days</span>
            <span className="kpi-label">Time Extensions</span>
            <div className="kpi-breakdown">
              <span className="breakdown-item pending">{metrics?.time_extensions_pending || 0} Pending</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon orange">
            <Activity size={24} />
          </div>
          <div className="kpi-content">
            <span className="kpi-value">{metrics?.avg_processing_days || 0} days</span>
            <span className="kpi-label">Avg Processing Time</span>
            <div className="kpi-trend negative">
              <ArrowDownRight size={14} />
              <span>2 days faster</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="co-tabs">
        <div className="tabs-list">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id as TabType)}
              >
                {Icon && <Icon size={16} />}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="tab-badge">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="tabs-actions">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="filter-bar">
          <div className="filter-group">
            <label>Status</label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">All Statuses</option>
              <option value="IDENTIFIED">Identified</option>
              <option value="PRICING">Pricing</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="UNDER_NEGOTIATION">Under Negotiation</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Type</label>
            <select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
              <option value="all">All Types</option>
              <option value="OWNER_INITIATED">Owner Initiated</option>
              <option value="CONTRACTOR_INITIATED">Contractor Initiated</option>
              <option value="UNFORESEEN_CONDITIONS">Unforeseen Conditions</option>
              <option value="DESIGN_CHANGE">Design Change</option>
              <option value="VALUE_ENGINEERING">Value Engineering</option>
              <option value="REGULATORY_REQUIREMENT">Regulatory</option>
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
          <button className="filter-clear" onClick={() => setFilters({ status: 'all', type: 'all', priority: 'all', dateRange: 'all' })}>
            Clear Filters
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="co-content">
        {loading ? (
          <div className="loading-state">
            <RefreshCw className="spin" size={32} />
            <span>Loading...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewPanel
                pcrs={pcrs}
                changeOrders={changeOrders}
                timeExtensions={timeExtensions}
                monthlyTrends={monthlyTrends}
                maxTrendAmount={maxTrendAmount}
                metrics={metrics}
                formatCurrency={formatCurrency}
                getStatusConfig={getStatusConfig}
                getPriorityConfig={getPriorityConfig}
                onPCRClick={setSelectedPCR}
                onCOClick={setSelectedCO}
              />
            )}
            {activeTab === 'pcrs' && (
              <PCRsPanel
                pcrs={pcrs}
                formatCurrency={formatCurrency}
                getStatusConfig={getStatusConfig}
                getPriorityConfig={getPriorityConfig}
                onPCRClick={setSelectedPCR}
              />
            )}
            {activeTab === 'change-orders' && (
              <ChangeOrdersPanel
                changeOrders={changeOrders}
                formatCurrency={formatCurrency}
                getStatusConfig={getStatusConfig}
                onCOClick={setSelectedCO}
              />
            )}
            {activeTab === 'time-extensions' && (
              <TimeExtensionsPanel
                timeExtensions={timeExtensions}
                getStatusConfig={getStatusConfig}
              />
            )}
            {activeTab === 'analytics' && (
              <AnalyticsPanel
                metrics={metrics}
                monthlyTrends={monthlyTrends}
                pcrs={pcrs}
                changeOrders={changeOrders}
                formatCurrency={formatCurrency}
                maxTrendAmount={maxTrendAmount}
              />
            )}
          </>
        )}
      </div>

      {/* Detail Panels */}
      {selectedPCR && (
        <PCRDetailPanel
          pcr={selectedPCR}
          onClose={() => setSelectedPCR(null)}
          formatCurrency={formatCurrency}
          getStatusConfig={getStatusConfig}
          getPriorityConfig={getPriorityConfig}
        />
      )}

      {selectedCO && (
        <CODetailPanel
          changeOrder={selectedCO}
          onClose={() => setSelectedCO(null)}
          formatCurrency={formatCurrency}
          getStatusConfig={getStatusConfig}
        />
      )}
    </div>
  );
}

function OverviewPanel({
  pcrs,
  changeOrders,
  timeExtensions: _timeExtensions,
  monthlyTrends,
  maxTrendAmount,
  metrics,
  formatCurrency,
  getStatusConfig,
  getPriorityConfig,
  onPCRClick,
  onCOClick
}: any) {
  return (
    <div className="overview-panel">
      <div className="overview-grid">
        {/* Monthly Trend Chart */}
        <div className="overview-card trend-chart">
          <h3>Monthly Change Activity</h3>
          <div className="chart-container">
            <div className="bar-chart">
              {monthlyTrends.map((month: MonthlyTrend) => (
                <div key={month.month} className="bar-group">
                  <div className="bar-wrapper">
                    <div
                      className="bar amount-bar"
                      style={{ height: `${(month.amount / maxTrendAmount) * 100}%` }}
                    >
                      <span className="bar-tooltip">{formatCurrency(month.amount)}</span>
                    </div>
                  </div>
                  <span className="bar-label">{month.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PCR Status Distribution */}
        <div className="overview-card status-distribution">
          <h3>PCR Status Distribution</h3>
          <div className="donut-chart">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1e293b" strokeWidth="20" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="20"
                strokeDasharray={`${(metrics?.approved_pcrs / metrics?.total_pcrs) * 251.2} 251.2`}
                strokeDashoffset="0" transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="20"
                strokeDasharray={`${(metrics?.pending_pcrs / metrics?.total_pcrs) * 251.2} 251.2`}
                strokeDashoffset={`${-(metrics?.approved_pcrs / metrics?.total_pcrs) * 251.2}`}
                transform="rotate(-90 50 50)" />
              <circle cx="50" cy="50" r="40" fill="none" stroke="#ef4444" strokeWidth="20"
                strokeDasharray={`${(metrics?.rejected_pcrs / metrics?.total_pcrs) * 251.2} 251.2`}
                strokeDashoffset={`${-((metrics?.approved_pcrs + metrics?.pending_pcrs) / metrics?.total_pcrs) * 251.2}`}
                transform="rotate(-90 50 50)" />
            </svg>
            <div className="donut-center">
              <span className="donut-value">{metrics?.total_pcrs}</span>
              <span className="donut-label">Total</span>
            </div>
          </div>
          <div className="chart-legend">
            <div className="legend-item"><span className="legend-color green"></span>Approved ({metrics?.approved_pcrs})</div>
            <div className="legend-item"><span className="legend-color yellow"></span>Pending ({metrics?.pending_pcrs})</div>
            <div className="legend-item"><span className="legend-color red"></span>Rejected ({metrics?.rejected_pcrs})</div>
          </div>
        </div>

        {/* Recent PCRs */}
        <div className="overview-card recent-items">
          <div className="card-header">
            <h3>Recent PCRs</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="items-list">
            {pcrs.slice(0, 5).map((pcr: ChangeOrderRequest) => {
              const statusConfig = getStatusConfig(pcr.status);
              const StatusIcon = statusConfig.icon;
              const priorityConfig = getPriorityConfig(pcr.priority);
              return (
                <div key={pcr.id} className="item-row" onClick={() => onPCRClick(pcr)}>
                  <div className="item-main">
                    <span className="item-number">{pcr.cor_number}</span>
                    <span className="item-title">{pcr.title}</span>
                  </div>
                  <div className="item-meta">
                    <span className={`priority-badge ${priorityConfig.color}`}>{priorityConfig.label}</span>
                    <span className={`status-badge ${statusConfig.color}`}>
                      <StatusIcon size={12} />
                      {statusConfig.label}
                    </span>
                    <span className="item-amount">{formatCurrency(pcr.estimated_cost || 0)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Change Orders */}
        <div className="overview-card recent-items">
          <div className="card-header">
            <h3>Recent Change Orders</h3>
            <button className="view-all-btn">View All</button>
          </div>
          <div className="items-list">
            {changeOrders.slice(0, 5).map((co: ChangeOrder) => {
              const statusConfig = getStatusConfig(co.status);
              const StatusIcon = statusConfig.icon;
              return (
                <div key={co.id} className="item-row" onClick={() => onCOClick(co)}>
                  <div className="item-main">
                    <span className="item-number">{co.change_order_number}</span>
                    <span className="item-title">{co.title}</span>
                  </div>
                  <div className="item-meta">
                    <span className={`status-badge ${statusConfig.color}`}>
                      <StatusIcon size={12} />
                      {statusConfig.label}
                    </span>
                    <span className={`item-amount ${co.this_change_amount >= 0 ? 'positive' : 'negative'}`}>
                      {co.this_change_amount >= 0 ? '+' : ''}{formatCurrency(co.this_change_amount)}
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

function PCRsPanel({ pcrs, formatCurrency, getStatusConfig, getPriorityConfig, onPCRClick }: any) {
  return (
    <div className="pcrs-panel">
      <table className="data-table">
        <thead>
          <tr>
            <th>PCR #</th>
            <th>Title</th>
            <th>Type</th>
            <th>Priority</th>
            <th>Ball in Court</th>
            <th>Est. Cost</th>
            <th>Days Open</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pcrs.map((pcr: ChangeOrderRequest) => {
            const statusConfig = getStatusConfig(pcr.status);
            const StatusIcon = statusConfig.icon;
            const priorityConfig = getPriorityConfig(pcr.priority);
            return (
              <tr key={pcr.id} onClick={() => onPCRClick(pcr)}>
                <td className="number-cell">{pcr.cor_number}</td>
                <td className="title-cell">
                  <div className="title-text">{pcr.title}</div>
                  <div className="title-meta">{pcr.related_rfis.length > 0 && `${pcr.related_rfis.length} RFIs`}</div>
                </td>
                <td>{pcr.change_type.replace(/_/g, ' ')}</td>
                <td>
                  <span className={`priority-badge ${priorityConfig.color}`}>{priorityConfig.label}</span>
                </td>
                <td>
                  <span className="ball-in-court">{pcr.ball_in_court}</span>
                </td>
                <td className={`amount-cell ${(pcr.estimated_cost || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(pcr.estimated_cost || 0)}
                </td>
                <td className={pcr.days_open > 30 ? 'overdue' : ''}>
                  {pcr.days_open} days
                </td>
                <td>
                  <span className={`status-badge ${statusConfig.color}`}>
                    <StatusIcon size={12} />
                    {statusConfig.label}
                  </span>
                </td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button className="action-btn"><Eye size={16} /></button>
                  <button className="action-btn"><Edit size={16} /></button>
                  <button className="action-btn"><MoreVertical size={16} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ChangeOrdersPanel({ changeOrders, formatCurrency, getStatusConfig, onCOClick }: any) {
  return (
    <div className="change-orders-panel">
      <table className="data-table">
        <thead>
          <tr>
            <th>CO #</th>
            <th>Title</th>
            <th>Type</th>
            <th>This Change</th>
            <th>Cumulative</th>
            <th>Time Ext.</th>
            <th>Status</th>
            <th>Executed</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {changeOrders.map((co: ChangeOrder) => {
            const statusConfig = getStatusConfig(co.status);
            const StatusIcon = statusConfig.icon;
            return (
              <tr key={co.id} onClick={() => onCOClick(co)}>
                <td className="number-cell">{co.change_order_number}</td>
                <td className="title-cell">
                  <div className="title-text">{co.title}</div>
                  <div className="title-meta">{co.pcrs_included.length} PCRs included</div>
                </td>
                <td>{co.change_type.replace(/_/g, ' ')}</td>
                <td className={`amount-cell ${co.this_change_amount >= 0 ? 'positive' : 'negative'}`}>
                  {co.this_change_amount >= 0 ? '+' : ''}{formatCurrency(co.this_change_amount)}
                </td>
                <td className="amount-cell">
                  {formatCurrency(co.cumulative_change_amount)}
                </td>
                <td>
                  {co.this_time_extension ? `+${co.this_time_extension} days` : '-'}
                </td>
                <td>
                  <span className={`status-badge ${statusConfig.color}`}>
                    <StatusIcon size={12} />
                    {statusConfig.label}
                  </span>
                </td>
                <td>{co.executed_at ? new Date(co.executed_at).toLocaleDateString() : '-'}</td>
                <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                  <button className="action-btn"><Eye size={16} /></button>
                  <button className="action-btn"><Edit size={16} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TimeExtensionsPanel({ timeExtensions, getStatusConfig }: any) {
  const totalGranted = timeExtensions.reduce((sum: number, t: TimeExtension) => sum + (t.days_granted || 0), 0);
  const totalPending = timeExtensions.filter((t: TimeExtension) => t.status === 'UNDER_REVIEW').reduce((sum: number, t: TimeExtension) => sum + t.days_requested, 0);

  return (
    <div className="time-extensions-panel">
      <div className="te-summary">
        <div className="te-stat granted">
          <CheckCircle size={24} />
          <div className="te-stat-content">
            <span className="te-stat-value">+{totalGranted} days</span>
            <span className="te-stat-label">Total Granted</span>
          </div>
        </div>
        <div className="te-stat pending">
          <Clock size={24} />
          <div className="te-stat-content">
            <span className="te-stat-value">+{totalPending} days</span>
            <span className="te-stat-label">Pending Approval</span>
          </div>
        </div>
        <div className="te-stat total">
          <Calendar size={24} />
          <div className="te-stat-content">
            <span className="te-stat-value">{timeExtensions.length}</span>
            <span className="te-stat-label">Total Requests</span>
          </div>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Request #</th>
            <th>Title</th>
            <th>Delay Type</th>
            <th>Days Requested</th>
            <th>Days Granted</th>
            <th>Delay Start</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {timeExtensions.map((te: TimeExtension) => {
            const statusConfig = getStatusConfig(te.status);
            const StatusIcon = statusConfig.icon;
            return (
              <tr key={te.id}>
                <td className="number-cell">{te.request_number}</td>
                <td className="title-cell">{te.title}</td>
                <td>{te.delay_type.replace(/_/g, ' ')}</td>
                <td className="days-cell">+{te.days_requested}</td>
                <td className={`days-cell ${te.days_granted ? 'granted' : ''}`}>
                  {te.days_granted !== null ? `+${te.days_granted}` : '-'}
                </td>
                <td>{new Date(te.delay_start_date).toLocaleDateString()}</td>
                <td>
                  <span className={`status-badge ${statusConfig.color}`}>
                    <StatusIcon size={12} />
                    {statusConfig.label}
                  </span>
                </td>
                <td className="actions-cell">
                  <button className="action-btn"><Eye size={16} /></button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AnalyticsPanel({ metrics, monthlyTrends, pcrs, changeOrders: _changeOrders, formatCurrency, maxTrendAmount }: any) {
  const typeDistribution = pcrs.reduce((acc: any, pcr: ChangeOrderRequest) => {
    acc[pcr.change_type] = (acc[pcr.change_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="analytics-panel">
      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Change Order Trends</h3>
          <div className="trend-chart-large">
            {monthlyTrends.map((month: MonthlyTrend, _index: number) => (
              <div key={month.month} className="trend-bar-group">
                <div className="trend-bar-wrapper">
                  <div
                    className="trend-bar"
                    style={{ height: `${(month.amount / maxTrendAmount) * 100}%` }}
                  />
                </div>
                <span className="trend-label">{month.month}</span>
                <span className="trend-value">{formatCurrency(month.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card">
          <h3>Change Type Distribution</h3>
          <div className="type-distribution">
            {Object.entries(typeDistribution).map(([type, count]: [string, any]) => (
              <div key={type} className="type-row">
                <span className="type-name">{type.replace(/_/g, ' ')}</span>
                <div className="type-bar-container">
                  <div className="type-bar" style={{ width: `${(count / pcrs.length) * 100}%` }} />
                </div>
                <span className="type-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-card metrics-summary">
          <h3>Key Metrics</h3>
          <div className="metrics-grid">
            <div className="metric-box">
              <span className="metric-label">Approval Rate</span>
              <span className="metric-value">{((metrics?.approved_pcrs / metrics?.total_pcrs) * 100).toFixed(0)}%</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Avg Processing</span>
              <span className="metric-value">{metrics?.avg_processing_days} days</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Contract Growth</span>
              <span className="metric-value">{metrics?.contract_growth_percent.toFixed(1)}%</span>
            </div>
            <div className="metric-box">
              <span className="metric-label">Total COs</span>
              <span className="metric-value">{metrics?.total_cos}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PCRDetailPanel({ pcr, onClose, formatCurrency, getStatusConfig, getPriorityConfig }: any) {
  const statusConfig = getStatusConfig(pcr.status);
  const StatusIcon = statusConfig.icon;
  const priorityConfig = getPriorityConfig(pcr.priority);

  return (
    <div className="detail-panel-overlay">
      <div className="detail-panel">
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-number">{pcr.cor_number}</span>
            <h2>{pcr.title}</h2>
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
            <span className="ball-in-court-badge">{pcr.ball_in_court}</span>
          </div>

          <div className="detail-section">
            <h4>Description</h4>
            <p>{pcr.description}</p>
          </div>

          <div className="detail-section">
            <h4>Change Details</h4>
            <div className="details-grid">
              <div className="detail-item">
                <label>Type</label>
                <span>{pcr.change_type.replace(/_/g, ' ')}</span>
              </div>
              <div className="detail-item">
                <label>Reason</label>
                <span>{pcr.reason || '-'}</span>
              </div>
              <div className="detail-item">
                <label>Originated</label>
                <span>{new Date(pcr.origination_date).toLocaleDateString()}</span>
              </div>
              <div className="detail-item">
                <label>Days Open</label>
                <span className={pcr.days_open > 30 ? 'overdue' : ''}>{pcr.days_open} days</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h4>Cost Information</h4>
            <div className="cost-progression">
              <div className="cost-step">
                <span className="cost-label">Estimated</span>
                <span className="cost-value">{formatCurrency(pcr.estimated_cost || 0)}</span>
              </div>
              {pcr.submitted_cost && (
                <>
                  <ChevronRight size={16} />
                  <div className="cost-step">
                    <span className="cost-label">Submitted</span>
                    <span className="cost-value">{formatCurrency(pcr.submitted_cost)}</span>
                  </div>
                </>
              )}
              {pcr.approved_cost && (
                <>
                  <ChevronRight size={16} />
                  <div className="cost-step approved">
                    <span className="cost-label">Approved</span>
                    <span className="cost-value">{formatCurrency(pcr.approved_cost)}</span>
                  </div>
                </>
              )}
            </div>
            {pcr.cost_variance && (
              <div className="cost-variance">
                <span className="variance-label">Variance:</span>
                <span className={`variance-value ${pcr.cost_variance > 0 ? 'positive' : 'negative'}`}>
                  {pcr.cost_variance > 0 ? '+' : ''}{formatCurrency(pcr.cost_variance)}
                </span>
              </div>
            )}
          </div>

          {pcr.estimated_time_impact_days && (
            <div className="detail-section">
              <h4>Schedule Impact</h4>
              <div className="time-impact">
                <Clock size={20} />
                <span>+{pcr.estimated_time_impact_days} working days</span>
              </div>
            </div>
          )}

          {pcr.related_rfis.length > 0 && (
            <div className="detail-section">
              <h4>Related RFIs</h4>
              <div className="related-items">
                {pcr.related_rfis.map((rfi: string) => (
                  <span key={rfi} className="related-item">{rfi}</span>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <h4>Documents</h4>
            <div className="documents-count">
              <FileText size={20} />
              <span>{pcr.supporting_documents} supporting documents</span>
            </div>
          </div>
        </div>

        <div className="panel-actions">
          <button className="btn-secondary">
            <Edit size={18} />
            Edit
          </button>
          <button className="btn-primary">
            <Send size={18} />
            Submit for Review
          </button>
        </div>
      </div>
    </div>
  );
}

function CODetailPanel({ changeOrder, onClose, formatCurrency, getStatusConfig }: any) {
  const statusConfig = getStatusConfig(changeOrder.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="detail-panel-overlay">
      <div className="detail-panel">
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-number">{changeOrder.change_order_number}</span>
            <h2>{changeOrder.title}</h2>
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
          </div>

          <div className="detail-section">
            <h4>Description</h4>
            <p>{changeOrder.description}</p>
          </div>

          <div className="detail-section">
            <h4>Financial Impact</h4>
            <div className="financial-summary">
              <div className="financial-item">
                <span className="financial-label">This Change</span>
                <span className={`financial-value ${changeOrder.this_change_amount >= 0 ? 'positive' : 'negative'}`}>
                  {changeOrder.this_change_amount >= 0 ? '+' : ''}{formatCurrency(changeOrder.this_change_amount)}
                </span>
              </div>
              <div className="financial-item">
                <span className="financial-label">Cumulative Changes</span>
                <span className="financial-value">{formatCurrency(changeOrder.cumulative_change_amount)}</span>
              </div>
            </div>
          </div>

          {changeOrder.this_time_extension && (
            <div className="detail-section">
              <h4>Schedule Impact</h4>
              <div className="time-summary">
                <div className="time-item">
                  <span className="time-label">This Extension</span>
                  <span className="time-value">+{changeOrder.this_time_extension} days</span>
                </div>
                <div className="time-item">
                  <span className="time-label">Cumulative</span>
                  <span className="time-value">+{changeOrder.cumulative_time_extension} days</span>
                </div>
              </div>
            </div>
          )}

          <div className="detail-section">
            <h4>Approval Workflow</h4>
            <div className="approval-timeline">
              {changeOrder.approval_chain.map((step: ApprovalStep, index: number) => {
                const stepStatus = getStatusConfig(step.status);
                const StepIcon = stepStatus.icon;
                return (
                  <div key={index} className={`approval-step ${step.status.toLowerCase()}`}>
                    <div className="step-icon">
                      <StepIcon size={16} />
                    </div>
                    <div className="step-content">
                      <span className="step-role">{step.role}</span>
                      <span className="step-name">{step.name}</span>
                      {step.date && <span className="step-date">{new Date(step.date).toLocaleDateString()}</span>}
                      {step.comments && <span className="step-comments">{step.comments}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="detail-section">
            <h4>Included PCRs</h4>
            <div className="included-pcrs">
              {changeOrder.pcrs_included.map((pcr: string) => (
                <span key={pcr} className="pcr-tag">{pcr}</span>
              ))}
            </div>
          </div>
        </div>

        <div className="panel-actions">
          <button className="btn-secondary">
            <History size={18} />
            View History
          </button>
          <button className="btn-primary">
            <FileText size={18} />
            Generate Document
          </button>
        </div>
      </div>
    </div>
  );
}

export default EnhancedChangeOrderDashboard;
