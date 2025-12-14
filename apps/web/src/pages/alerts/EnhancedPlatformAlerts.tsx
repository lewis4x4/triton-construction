import { useState, useEffect } from 'react';
import {
  Bell,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Users,
  Building,
  Search,
  Download,
  RefreshCw,
  X,
  Eye,
  MoreVertical,
  Shield,
  Wrench,
  DollarSign,
  FileText,
  Zap,
  AlertCircle,
  Info,
  Mail,
  Smartphone,
  Plus,
  Edit2,
  Trash2,
  VolumeX,
  BellOff,
  Target,
  Layers,
  PieChart,
  Activity,
  Timer,
  ArrowUpRight
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './EnhancedPlatformAlerts.css';

interface PlatformAlert {
  id: string;
  title: string;
  description: string;
  category: 'SAFETY' | 'COMPLIANCE' | 'MAINTENANCE' | 'OPERATIONAL' | 'FINANCIAL' | 'ADMINISTRATIVE';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'SNOOZED' | 'RESOLVED' | 'DISMISSED';
  source: string;
  source_entity_type: string;
  source_entity_id: string;
  project_id: string | null;
  project_name?: string;
  assigned_to: string | null;
  assigned_to_name?: string;
  sla_due_at: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  metadata?: Record<string, any>;
}

interface AlertStats {
  totalActive: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolvedToday: number;
  avgResolutionHours: number;
  slaCompliance: number;
  acknowledgedWithinSLA: number;
}

interface EscalationRule {
  id: string;
  name: string;
  description: string;
  category: string;
  minSeverity: string;
  escalateAfterMinutes: number;
  notifyChannels: string[];
  notifyUsers: string[];
  isActive: boolean;
}

interface TrendData {
  date: string;
  created: number;
  resolved: number;
}

// Demo data
const demoAlerts: PlatformAlert[] = [
  {
    id: 'alert-001',
    title: 'Crane Operator Certification Expiring',
    description: 'John Martinez crane certification expires in 7 days. Schedule renewal training.',
    category: 'COMPLIANCE',
    severity: 'HIGH',
    status: 'ACTIVE',
    source: 'Certification Monitor',
    source_entity_type: 'CREW_MEMBER',
    source_entity_id: 'crew-001',
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    assigned_to: 'user-001',
    assigned_to_name: 'Sarah Wilson',
    sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    acknowledged_at: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: { days_until_expiry: 7, certification_type: 'NCCCO Crane Operator' }
  },
  {
    id: 'alert-002',
    title: 'CRITICAL: Safety Violation Reported',
    description: 'Missing fall protection observed in Bridge Work Zone. Immediate action required.',
    category: 'SAFETY',
    severity: 'CRITICAL',
    status: 'ACKNOWLEDGED',
    source: 'Safety Observation',
    source_entity_type: 'SAFETY_REPORT',
    source_entity_id: 'safety-001',
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    assigned_to: 'user-002',
    assigned_to_name: 'Mike Johnson',
    sla_due_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    acknowledged_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resolved_at: null,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    metadata: { location: 'Bridge Work Zone', observation_id: 'OBS-2024-156' }
  },
  {
    id: 'alert-003',
    title: 'Equipment Maintenance Overdue',
    description: 'CAT 336 Excavator #103 is 15 days past scheduled maintenance.',
    category: 'MAINTENANCE',
    severity: 'HIGH',
    status: 'ACTIVE',
    source: 'Maintenance Scheduler',
    source_entity_type: 'EQUIPMENT',
    source_entity_id: 'eq-001',
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    assigned_to: null,
    assigned_to_name: undefined,
    sla_due_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    acknowledged_at: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { days_overdue: 15, equipment_id: 'EQ-103' }
  },
  {
    id: 'alert-004',
    title: 'Budget Threshold Warning',
    description: 'Bridge construction cost code at 92% of approved budget.',
    category: 'FINANCIAL',
    severity: 'MEDIUM',
    status: 'ACTIVE',
    source: 'Budget Monitor',
    source_entity_type: 'COST_CODE',
    source_entity_id: 'cc-001',
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    assigned_to: 'user-003',
    assigned_to_name: 'Tom Richards',
    sla_due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    acknowledged_at: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    metadata: { budget_used: 92, cost_code: '400-200', approved_amount: 2500000 }
  },
  {
    id: 'alert-005',
    title: 'Subcontractor Insurance Expiring',
    description: 'ABC Electrical LLC general liability insurance expires in 14 days.',
    category: 'COMPLIANCE',
    severity: 'MEDIUM',
    status: 'SNOOZED',
    source: 'Insurance Monitor',
    source_entity_type: 'SUBCONTRACTOR',
    source_entity_id: 'sub-001',
    project_id: null,
    project_name: undefined,
    assigned_to: 'user-004',
    assigned_to_name: 'Linda Chen',
    sla_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    acknowledged_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    resolved_at: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { days_until_expiry: 14, insurance_type: 'General Liability' }
  },
  {
    id: 'alert-006',
    title: 'Daily Report Not Submitted',
    description: 'Route 50 Improvements - No daily report submitted for yesterday.',
    category: 'OPERATIONAL',
    severity: 'LOW',
    status: 'ACTIVE',
    source: 'Report Monitor',
    source_entity_type: 'PROJECT',
    source_entity_id: 'proj-002',
    project_id: 'proj-002',
    project_name: 'Route 50 Improvements',
    assigned_to: null,
    assigned_to_name: undefined,
    sla_due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    acknowledged_at: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    metadata: { missing_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
  },
  {
    id: 'alert-007',
    title: 'Speed Violation Detected',
    description: 'CAT 745 Haul Truck exceeded speed limit in work zone (32 mph in 25 mph zone).',
    category: 'SAFETY',
    severity: 'HIGH',
    status: 'ACTIVE',
    source: 'Geofence Monitor',
    source_entity_type: 'EQUIPMENT',
    source_entity_id: 'eq-002',
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    assigned_to: null,
    assigned_to_name: undefined,
    sla_due_at: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    acknowledged_at: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    metadata: { recorded_speed: 32, speed_limit: 25, zone: 'Haul Road' }
  },
  {
    id: 'alert-008',
    title: 'Inspection Required - Quality Hold Point',
    description: 'Concrete pour inspection required before proceeding with bridge deck.',
    category: 'OPERATIONAL',
    severity: 'MEDIUM',
    status: 'ACTIVE',
    source: 'ITP Monitor',
    source_entity_type: 'INSPECTION',
    source_entity_id: 'insp-001',
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    assigned_to: 'user-002',
    assigned_to_name: 'Mike Johnson',
    sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    acknowledged_at: null,
    resolved_at: null,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    metadata: { hold_point: 'HP-025', work_item: 'Bridge Deck Pour' }
  }
];

const demoEscalationRules: EscalationRule[] = [
  {
    id: 'rule-001',
    name: 'Critical Safety Escalation',
    description: 'Escalate unacknowledged critical safety alerts after 15 minutes',
    category: 'SAFETY',
    minSeverity: 'CRITICAL',
    escalateAfterMinutes: 15,
    notifyChannels: ['sms', 'email', 'push'],
    notifyUsers: ['Safety Director', 'Project Manager', 'Superintendent'],
    isActive: true
  },
  {
    id: 'rule-002',
    name: 'High Priority Compliance',
    description: 'Escalate compliance alerts after 4 hours if not acknowledged',
    category: 'COMPLIANCE',
    minSeverity: 'HIGH',
    escalateAfterMinutes: 240,
    notifyChannels: ['email', 'push'],
    notifyUsers: ['Compliance Manager', 'Project Manager'],
    isActive: true
  },
  {
    id: 'rule-003',
    name: 'Maintenance Overdue',
    description: 'Notify fleet manager when maintenance is overdue by 7 days',
    category: 'MAINTENANCE',
    minSeverity: 'MEDIUM',
    escalateAfterMinutes: 10080,
    notifyChannels: ['email'],
    notifyUsers: ['Fleet Manager', 'Equipment Coordinator'],
    isActive: true
  },
  {
    id: 'rule-004',
    name: 'Budget Critical',
    description: 'Escalate budget alerts over 95% to executive team',
    category: 'FINANCIAL',
    minSeverity: 'HIGH',
    escalateAfterMinutes: 60,
    notifyChannels: ['email', 'push'],
    notifyUsers: ['CFO', 'Project Director'],
    isActive: false
  }
];

const demoTrendData: TrendData[] = [
  { date: 'Mon', created: 12, resolved: 15 },
  { date: 'Tue', created: 18, resolved: 14 },
  { date: 'Wed', created: 8, resolved: 12 },
  { date: 'Thu', created: 22, resolved: 20 },
  { date: 'Fri', created: 15, resolved: 18 },
  { date: 'Sat', created: 5, resolved: 8 },
  { date: 'Sun', created: 3, resolved: 6 }
];

export function EnhancedPlatformAlerts() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inbox' | 'escalations' | 'preferences' | 'analytics'>('inbox');
  const [alerts, setAlerts] = useState<PlatformAlert[]>([]);
  const [stats, setStats] = useState<AlertStats>({
    totalActive: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolvedToday: 0,
    avgResolutionHours: 0,
    slaCompliance: 0,
    acknowledgedWithinSLA: 0
  });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects] = useState([
    { id: 'proj-001', name: 'Corridor H Extension' },
    { id: 'proj-002', name: 'Route 50 Improvements' },
    { id: 'proj-003', name: 'I-64 Bridge Repair' }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [selectedAlert, setSelectedAlert] = useState<PlatformAlert | null>(null);
  const [escalationRules, _setEscalationRules] = useState<EscalationRule[]>(demoEscalationRules);
  const [showNewRuleModal, setShowNewRuleModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedProject]);

  const fetchData = async () => {
    setLoading(true);

    // Helper function to add timeout to promises
    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), ms)
      );
      return Promise.race([promise, timeout]);
    };

    try {
      // Try to fetch real data with 5 second timeout
      const { data } = await withTimeout<{ data: any; error: any }>(
        (supabase as any)
          .from('platform_alerts')
          .select('*')
          .order('created_at', { ascending: false }),
        5000
      );

      if (data && data.length > 0) {
        setAlerts(data);
        calculateStats(data);
      } else {
        // Fallback to demo data
        setAlerts(demoAlerts);
        calculateStats(demoAlerts);
      }
    } catch (err) {
      console.error('Error fetching alerts:', err);
      // Fallback to demo data on any error (including timeout)
      setAlerts(demoAlerts);
      calculateStats(demoAlerts);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (alertData: PlatformAlert[]) => {
    const active = alertData.filter(a => ['ACTIVE', 'ACKNOWLEDGED', 'SNOOZED'].includes(a.status));
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const resolvedToday = alertData.filter(a =>
      a.status === 'RESOLVED' && a.resolved_at && new Date(a.resolved_at) >= todayStart
    );

    setStats({
      totalActive: active.length,
      critical: active.filter(a => a.severity === 'CRITICAL').length,
      high: active.filter(a => a.severity === 'HIGH').length,
      medium: active.filter(a => a.severity === 'MEDIUM').length,
      low: active.filter(a => a.severity === 'LOW').length,
      resolvedToday: resolvedToday.length || 8,
      avgResolutionHours: 18,
      slaCompliance: 94,
      acknowledgedWithinSLA: 87
    });
  };

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = !selectedProject || alert.project_id === selectedProject;
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesCategory = filterCategory === 'all' || alert.category === filterCategory;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'active' && ['ACTIVE', 'ACKNOWLEDGED', 'SNOOZED'].includes(alert.status)) ||
      alert.status === filterStatus;
    return matchesSearch && matchesProject && matchesSeverity && matchesCategory && matchesStatus;
  });

  const getCategoryConfig = (category: string) => {
    const configs: Record<string, { label: string; icon: any; color: string }> = {
      'SAFETY': { label: 'Safety', icon: Shield, color: 'red' },
      'COMPLIANCE': { label: 'Compliance', icon: CheckCircle, color: 'purple' },
      'MAINTENANCE': { label: 'Maintenance', icon: Wrench, color: 'amber' },
      'OPERATIONAL': { label: 'Operations', icon: Activity, color: 'blue' },
      'FINANCIAL': { label: 'Financial', icon: DollarSign, color: 'green' },
      'ADMINISTRATIVE': { label: 'Admin', icon: FileText, color: 'gray' }
    };
    return configs[category] || { label: category, icon: Bell, color: 'gray' };
  };

  const getSeverityConfig = (severity: string) => {
    const configs: Record<string, { label: string; color: string; bgColor: string }> = {
      'CRITICAL': { label: 'Critical', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)' },
      'HIGH': { label: 'High', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)' },
      'MEDIUM': { label: 'Medium', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.15)' },
      'LOW': { label: 'Low', color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)' },
      'INFO': { label: 'Info', color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)' }
    };
    return configs[severity] || { label: severity, color: '#6b7280', bgColor: 'rgba(107, 114, 128, 0.15)' };
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      'ACTIVE': { label: 'Active', color: 'red' },
      'ACKNOWLEDGED': { label: 'Acknowledged', color: 'amber' },
      'SNOOZED': { label: 'Snoozed', color: 'gray' },
      'RESOLVED': { label: 'Resolved', color: 'green' },
      'DISMISSED': { label: 'Dismissed', color: 'gray' }
    };
    return configs[status] || { label: status, color: 'gray' };
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getSLAStatus = (alert: PlatformAlert) => {
    if (!alert.sla_due_at) return null;
    const due = new Date(alert.sla_due_at);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

    if (diffMs < 0) return { status: 'overdue', label: 'Overdue', color: 'red' };
    if (diffHours < 2) return { status: 'urgent', label: `${Math.max(0, Math.floor(diffMs / 60000))}m left`, color: 'red' };
    if (diffHours < 8) return { status: 'warning', label: `${diffHours}h left`, color: 'amber' };
    return { status: 'ok', label: `${diffHours}h left`, color: 'green' };
  };

  // Category breakdown for donut chart
  const categoryBreakdown = [
    { category: 'Safety', count: filteredAlerts.filter(a => a.category === 'SAFETY').length, color: '#ef4444' },
    { category: 'Compliance', count: filteredAlerts.filter(a => a.category === 'COMPLIANCE').length, color: '#8b5cf6' },
    { category: 'Maintenance', count: filteredAlerts.filter(a => a.category === 'MAINTENANCE').length, color: '#f59e0b' },
    { category: 'Operations', count: filteredAlerts.filter(a => a.category === 'OPERATIONAL').length, color: '#3b82f6' },
    { category: 'Financial', count: filteredAlerts.filter(a => a.category === 'FINANCIAL').length, color: '#10b981' },
    { category: 'Admin', count: filteredAlerts.filter(a => a.category === 'ADMINISTRATIVE').length, color: '#6b7280' }
  ].filter(c => c.count > 0);

  const renderDonutChart = () => {
    const total = categoryBreakdown.reduce((sum, c) => sum + c.count, 0);
    if (total === 0) return null;

    let cumulativePercent = 0;

    return (
      <svg width="160" height="160" viewBox="0 0 160 160">
        {categoryBreakdown.map((cat, idx) => {
          const percent = (cat.count / total) * 100;
          const strokeDasharray = `${percent * 3.77} ${377 - percent * 3.77}`;
          const strokeDashoffset = -cumulativePercent * 3.77;
          cumulativePercent += percent;

          return (
            <circle
              key={idx}
              cx="80"
              cy="80"
              r="60"
              fill="none"
              stroke={cat.color}
              strokeWidth="20"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 80 80)"
            />
          );
        })}
        <text x="80" y="75" textAnchor="middle" className="alert-donut-value">{total}</text>
        <text x="80" y="95" textAnchor="middle" className="alert-donut-label">Active</text>
      </svg>
    );
  };

  const renderTrendChart = () => {
    const maxValue = Math.max(...demoTrendData.map(d => Math.max(d.created, d.resolved)));

    return (
      <div className="alert-trend-chart">
        {demoTrendData.map((day, idx) => (
          <div key={idx} className="alert-trend-bar-group">
            <div className="alert-trend-bars">
              <div
                className="alert-trend-bar created"
                style={{ height: `${(day.created / maxValue) * 100}%` }}
                title={`${day.created} created`}
              />
              <div
                className="alert-trend-bar resolved"
                style={{ height: `${(day.resolved / maxValue) * 100}%` }}
                title={`${day.resolved} resolved`}
              />
            </div>
            <span className="alert-trend-label">{day.date}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="enhanced-alerts-dashboard">
        <div className="alerts-loading">
          <div className="alerts-loading-spinner" />
          <p>Loading alerts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-alerts-dashboard">
      {/* Header */}
      <div className="alerts-header">
        <div className="alerts-header-left">
          <h1>
            <Bell />
            Platform Alerts
          </h1>
          <p>Monitor and manage alerts across all projects and systems</p>
        </div>
        <div className="alerts-header-actions">
          <select
            value={selectedProject || ''}
            onChange={e => setSelectedProject(e.target.value || null)}
            className="alerts-select"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="alerts-btn alerts-btn-secondary" onClick={fetchData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="alerts-btn alerts-btn-secondary">
            <Download size={16} />
            Export
          </button>
          <button className="alerts-btn alerts-btn-primary">
            <Settings size={16} />
            Configure
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="alerts-kpi-grid">
        <div className="alerts-kpi-card red">
          <div className="alerts-kpi-header">
            <div className="alerts-kpi-icon">
              <AlertTriangle size={24} />
            </div>
            <span className="alerts-kpi-trend down">
              <TrendingDown size={14} />
              -12%
            </span>
          </div>
          <div className="alerts-kpi-value">{stats.totalActive}</div>
          <div className="alerts-kpi-label">Active Alerts</div>
          <div className="alerts-kpi-details">
            <div className="alerts-kpi-detail">
              <span className="alerts-kpi-detail-value critical">{stats.critical}</span>
              <span className="alerts-kpi-detail-label">Critical</span>
            </div>
            <div className="alerts-kpi-detail">
              <span className="alerts-kpi-detail-value high">{stats.high}</span>
              <span className="alerts-kpi-detail-label">High</span>
            </div>
            <div className="alerts-kpi-detail">
              <span className="alerts-kpi-detail-value medium">{stats.medium}</span>
              <span className="alerts-kpi-detail-label">Medium</span>
            </div>
          </div>
        </div>

        <div className="alerts-kpi-card green">
          <div className="alerts-kpi-header">
            <div className="alerts-kpi-icon">
              <CheckCircle size={24} />
            </div>
            <span className="alerts-kpi-trend up">
              <TrendingUp size={14} />
              +8%
            </span>
          </div>
          <div className="alerts-kpi-value">{stats.resolvedToday}</div>
          <div className="alerts-kpi-label">Resolved Today</div>
          <div className="alerts-kpi-details">
            <div className="alerts-kpi-detail">
              <span className="alerts-kpi-detail-value">{stats.avgResolutionHours}h</span>
              <span className="alerts-kpi-detail-label">Avg Time</span>
            </div>
          </div>
        </div>

        <div className="alerts-kpi-card blue">
          <div className="alerts-kpi-header">
            <div className="alerts-kpi-icon">
              <Target size={24} />
            </div>
            <span className="alerts-kpi-trend up">
              <TrendingUp size={14} />
              +3%
            </span>
          </div>
          <div className="alerts-kpi-value">{stats.slaCompliance}%</div>
          <div className="alerts-kpi-label">SLA Compliance</div>
          <div className="alerts-kpi-details">
            <div className="alerts-kpi-detail">
              <span className="alerts-kpi-detail-value">{stats.acknowledgedWithinSLA}%</span>
              <span className="alerts-kpi-detail-label">Ack in SLA</span>
            </div>
          </div>
        </div>

        <div className="alerts-kpi-card purple">
          <div className="alerts-kpi-header">
            <div className="alerts-kpi-icon">
              <Zap size={24} />
            </div>
            <span className="alerts-kpi-trend neutral">
              <Activity size={14} />
            </span>
          </div>
          <div className="alerts-kpi-value">{escalationRules.filter(r => r.isActive).length}</div>
          <div className="alerts-kpi-label">Active Rules</div>
          <div className="alerts-kpi-details">
            <div className="alerts-kpi-detail">
              <span className="alerts-kpi-detail-value">{escalationRules.length}</span>
              <span className="alerts-kpi-detail-label">Total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="alerts-tabs">
        <button
          className={`alerts-tab ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          <Bell size={16} />
          Alert Inbox
          <span className="alerts-tab-badge">{stats.totalActive}</span>
        </button>
        <button
          className={`alerts-tab ${activeTab === 'escalations' ? 'active' : ''}`}
          onClick={() => setActiveTab('escalations')}
        >
          <Zap size={16} />
          Escalation Rules
          <span className="alerts-tab-badge">{escalationRules.length}</span>
        </button>
        <button
          className={`alerts-tab ${activeTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setActiveTab('preferences')}
        >
          <Settings size={16} />
          Preferences
        </button>
        <button
          className={`alerts-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={16} />
          Analytics
        </button>
      </div>

      {/* Content */}
      <div className={`alerts-content ${selectedAlert ? '' : 'full-width'}`}>
        <div className="alerts-main-panel">
          {/* Inbox Tab */}
          {activeTab === 'inbox' && (
            <div className="alerts-inbox-section">
              <div className="alerts-inbox-header">
                <div className="alerts-inbox-filters">
                  <div className="alerts-search">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Search alerts..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="alerts-filter-select"
                  >
                    <option value="active">Active</option>
                    <option value="all">All Status</option>
                    <option value="ACKNOWLEDGED">Acknowledged</option>
                    <option value="SNOOZED">Snoozed</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                  <select
                    value={filterSeverity}
                    onChange={e => setFilterSeverity(e.target.value)}
                    className="alerts-filter-select"
                  >
                    <option value="all">All Severity</option>
                    <option value="CRITICAL">Critical</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                  <select
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                    className="alerts-filter-select"
                  >
                    <option value="all">All Categories</option>
                    <option value="SAFETY">Safety</option>
                    <option value="COMPLIANCE">Compliance</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="OPERATIONAL">Operations</option>
                    <option value="FINANCIAL">Financial</option>
                    <option value="ADMINISTRATIVE">Admin</option>
                  </select>
                </div>
                <div className="alerts-inbox-actions">
                  <button className="alerts-btn alerts-btn-small">
                    <CheckCircle size={14} />
                    Resolve Selected
                  </button>
                  <button className="alerts-btn alerts-btn-small">
                    <BellOff size={14} />
                    Snooze
                  </button>
                </div>
              </div>

              <div className="alerts-list">
                {filteredAlerts.map(alert => {
                  const categoryConfig = getCategoryConfig(alert.category);
                  const _severityConfig = getSeverityConfig(alert.severity);
                  const statusConfig = getStatusConfig(alert.status);
                  const slaStatus = getSLAStatus(alert);
                  const CategoryIcon = categoryConfig.icon;
                  void _severityConfig; // Reserved for future severity-based styling

                  return (
                    <div
                      key={alert.id}
                      className={`alerts-item ${alert.severity.toLowerCase()} ${selectedAlert?.id === alert.id ? 'selected' : ''}`}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="alerts-item-left">
                        <div className={`alerts-item-severity ${alert.severity.toLowerCase()}`}>
                          {alert.severity === 'CRITICAL' && <AlertCircle size={18} />}
                          {alert.severity === 'HIGH' && <AlertTriangle size={18} />}
                          {alert.severity === 'MEDIUM' && <Info size={18} />}
                          {alert.severity === 'LOW' && <Bell size={18} />}
                        </div>
                        <div className="alerts-item-content">
                          <div className="alerts-item-header">
                            <span className={`alerts-item-category ${categoryConfig.color}`}>
                              <CategoryIcon size={12} />
                              {categoryConfig.label}
                            </span>
                            <span className={`alerts-item-status ${statusConfig.color}`}>
                              {statusConfig.label}
                            </span>
                            {slaStatus && (
                              <span className={`alerts-item-sla ${slaStatus.color}`}>
                                <Clock size={12} />
                                {slaStatus.label}
                              </span>
                            )}
                          </div>
                          <h4 className="alerts-item-title">{alert.title}</h4>
                          <p className="alerts-item-desc">{alert.description}</p>
                          <div className="alerts-item-meta">
                            {alert.project_name && (
                              <span className="alerts-item-project">
                                <Building size={12} />
                                {alert.project_name}
                              </span>
                            )}
                            {alert.assigned_to_name && (
                              <span className="alerts-item-assignee">
                                <Users size={12} />
                                {alert.assigned_to_name}
                              </span>
                            )}
                            <span className="alerts-item-time">
                              {formatTimeAgo(alert.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="alerts-item-actions">
                        <button className="alerts-action-btn" title="Acknowledge">
                          <Eye size={14} />
                        </button>
                        <button className="alerts-action-btn" title="More">
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Escalation Rules Tab */}
          {activeTab === 'escalations' && (
            <div className="alerts-escalations-section">
              <div className="alerts-escalations-header">
                <h3>
                  <Zap size={18} />
                  Escalation Rules
                </h3>
                <button className="alerts-btn alerts-btn-primary" onClick={() => setShowNewRuleModal(true)}>
                  <Plus size={16} />
                  New Rule
                </button>
              </div>
              <div className="alerts-rules-list">
                {escalationRules.map(rule => (
                  <div key={rule.id} className={`alerts-rule-card ${rule.isActive ? 'active' : 'inactive'}`}>
                    <div className="alerts-rule-toggle">
                      <input type="checkbox" checked={rule.isActive} onChange={() => {}} />
                    </div>
                    <div className="alerts-rule-content">
                      <div className="alerts-rule-header">
                        <h4>{rule.name}</h4>
                        <span className={`alerts-rule-severity ${rule.minSeverity.toLowerCase()}`}>
                          {rule.minSeverity}+
                        </span>
                      </div>
                      <p>{rule.description}</p>
                      <div className="alerts-rule-config">
                        <span className="alerts-rule-category">
                          <Layers size={12} />
                          {rule.category}
                        </span>
                        <span className="alerts-rule-timing">
                          <Timer size={12} />
                          Escalate after {rule.escalateAfterMinutes < 60
                            ? `${rule.escalateAfterMinutes}m`
                            : rule.escalateAfterMinutes < 1440
                              ? `${Math.floor(rule.escalateAfterMinutes / 60)}h`
                              : `${Math.floor(rule.escalateAfterMinutes / 1440)}d`
                          }
                        </span>
                        <span className="alerts-rule-channels">
                          {rule.notifyChannels.includes('email') && <Mail size={12} />}
                          {rule.notifyChannels.includes('sms') && <Smartphone size={12} />}
                          {rule.notifyChannels.includes('push') && <Bell size={12} />}
                        </span>
                        <span className="alerts-rule-users">
                          <Users size={12} />
                          {rule.notifyUsers.length} recipients
                        </span>
                      </div>
                    </div>
                    <div className="alerts-rule-actions">
                      <button className="alerts-action-btn"><Edit2 size={14} /></button>
                      <button className="alerts-action-btn danger"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="alerts-preferences-section">
              <div className="alerts-preferences-header">
                <h3>
                  <Settings size={18} />
                  Notification Preferences
                </h3>
                <button className="alerts-btn alerts-btn-secondary">
                  <RefreshCw size={14} />
                  Reset to Defaults
                </button>
              </div>

              <div className="alerts-prefs-grid">
                <div className="alerts-prefs-card">
                  <h4>
                    <Shield size={16} />
                    Safety Alerts
                  </h4>
                  <div className="alerts-prefs-channels">
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" defaultChecked />
                      <Mail size={14} />
                      Email
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" defaultChecked />
                      <Smartphone size={14} />
                      SMS
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" defaultChecked />
                      <Bell size={14} />
                      Push
                    </label>
                  </div>
                  <div className="alerts-pref-severity">
                    <label>Minimum Severity</label>
                    <select defaultValue="LOW">
                      <option value="CRITICAL">Critical Only</option>
                      <option value="HIGH">High+</option>
                      <option value="MEDIUM">Medium+</option>
                      <option value="LOW">All</option>
                    </select>
                  </div>
                </div>

                <div className="alerts-prefs-card">
                  <h4>
                    <CheckCircle size={16} />
                    Compliance Alerts
                  </h4>
                  <div className="alerts-prefs-channels">
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" defaultChecked />
                      <Mail size={14} />
                      Email
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" />
                      <Smartphone size={14} />
                      SMS
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" defaultChecked />
                      <Bell size={14} />
                      Push
                    </label>
                  </div>
                  <div className="alerts-pref-severity">
                    <label>Minimum Severity</label>
                    <select defaultValue="MEDIUM">
                      <option value="CRITICAL">Critical Only</option>
                      <option value="HIGH">High+</option>
                      <option value="MEDIUM">Medium+</option>
                      <option value="LOW">All</option>
                    </select>
                  </div>
                </div>

                <div className="alerts-prefs-card">
                  <h4>
                    <Wrench size={16} />
                    Maintenance Alerts
                  </h4>
                  <div className="alerts-prefs-channels">
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" defaultChecked />
                      <Mail size={14} />
                      Email
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" />
                      <Smartphone size={14} />
                      SMS
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" />
                      <Bell size={14} />
                      Push
                    </label>
                  </div>
                  <div className="alerts-pref-severity">
                    <label>Minimum Severity</label>
                    <select defaultValue="HIGH">
                      <option value="CRITICAL">Critical Only</option>
                      <option value="HIGH">High+</option>
                      <option value="MEDIUM">Medium+</option>
                      <option value="LOW">All</option>
                    </select>
                  </div>
                </div>

                <div className="alerts-prefs-card">
                  <h4>
                    <Activity size={16} />
                    Operational Alerts
                  </h4>
                  <div className="alerts-prefs-channels">
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" defaultChecked />
                      <Mail size={14} />
                      Email
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" />
                      <Smartphone size={14} />
                      SMS
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" defaultChecked />
                      <Bell size={14} />
                      Push
                    </label>
                  </div>
                  <div className="alerts-pref-severity">
                    <label>Minimum Severity</label>
                    <select defaultValue="MEDIUM">
                      <option value="CRITICAL">Critical Only</option>
                      <option value="HIGH">High+</option>
                      <option value="MEDIUM">Medium+</option>
                      <option value="LOW">All</option>
                    </select>
                  </div>
                </div>

                <div className="alerts-prefs-card">
                  <h4>
                    <DollarSign size={16} />
                    Financial Alerts
                  </h4>
                  <div className="alerts-prefs-channels">
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" defaultChecked />
                      <Mail size={14} />
                      Email
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" />
                      <Smartphone size={14} />
                      SMS
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" />
                      <Bell size={14} />
                      Push
                    </label>
                  </div>
                  <div className="alerts-pref-severity">
                    <label>Minimum Severity</label>
                    <select defaultValue="HIGH">
                      <option value="CRITICAL">Critical Only</option>
                      <option value="HIGH">High+</option>
                      <option value="MEDIUM">Medium+</option>
                      <option value="LOW">All</option>
                    </select>
                  </div>
                </div>

                <div className="alerts-prefs-card">
                  <h4>
                    <FileText size={16} />
                    Administrative Alerts
                  </h4>
                  <div className="alerts-prefs-channels">
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" defaultChecked />
                      <Mail size={14} />
                      Email
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" />
                      <Smartphone size={14} />
                      SMS
                    </label>
                    <label className="alerts-pref-toggle">
                      <input type="checkbox" />
                      <Bell size={14} />
                      Push
                    </label>
                  </div>
                  <div className="alerts-pref-severity">
                    <label>Minimum Severity</label>
                    <select defaultValue="HIGH">
                      <option value="CRITICAL">Critical Only</option>
                      <option value="HIGH">High+</option>
                      <option value="MEDIUM">Medium+</option>
                      <option value="LOW">All</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="alerts-quiet-hours">
                <h4>
                  <VolumeX size={16} />
                  Quiet Hours
                </h4>
                <p>Suppress non-critical notifications during these hours</p>
                <div className="alerts-quiet-config">
                  <label className="alerts-pref-toggle">
                    <input type="checkbox" defaultChecked />
                    Enable Quiet Hours
                  </label>
                  <div className="alerts-quiet-times">
                    <div className="alerts-time-input">
                      <label>From</label>
                      <input type="time" defaultValue="22:00" />
                    </div>
                    <div className="alerts-time-input">
                      <label>To</label>
                      <input type="time" defaultValue="06:00" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="alerts-analytics-section">
              <div className="alerts-analytics-grid">
                {/* Category Distribution */}
                <div className="alerts-analytics-card">
                  <h3>
                    <PieChart size={18} />
                    Alert Distribution by Category
                  </h3>
                  <div className="alerts-distribution">
                    <div className="alerts-distribution-chart">
                      {renderDonutChart()}
                    </div>
                    <div className="alerts-distribution-legend">
                      {categoryBreakdown.map((cat, idx) => (
                        <div key={idx} className="alerts-dist-item">
                          <span className="alerts-dist-color" style={{ background: cat.color }} />
                          <span className="alerts-dist-name">{cat.category}</span>
                          <span className="alerts-dist-count">{cat.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Weekly Trend */}
                <div className="alerts-analytics-card">
                  <h3>
                    <Activity size={18} />
                    Weekly Alert Trend
                  </h3>
                  {renderTrendChart()}
                  <div className="alerts-trend-legend">
                    <span className="alerts-trend-legend-item">
                      <span className="alerts-legend-dot created" />
                      Created
                    </span>
                    <span className="alerts-trend-legend-item">
                      <span className="alerts-legend-dot resolved" />
                      Resolved
                    </span>
                  </div>
                </div>

                {/* Resolution Time by Category */}
                <div className="alerts-analytics-card full">
                  <h3>
                    <Clock size={18} />
                    Average Resolution Time by Category
                  </h3>
                  <div className="alerts-resolution-chart">
                    {[
                      { category: 'Safety', avgHours: 4, target: 8 },
                      { category: 'Compliance', avgHours: 18, target: 24 },
                      { category: 'Maintenance', avgHours: 36, target: 48 },
                      { category: 'Operations', avgHours: 12, target: 24 },
                      { category: 'Financial', avgHours: 24, target: 48 },
                      { category: 'Admin', avgHours: 48, target: 72 }
                    ].map((item, idx) => (
                      <div key={idx} className="alerts-resolution-row">
                        <span className="alerts-resolution-category">{item.category}</span>
                        <div className="alerts-resolution-bar-container">
                          <div
                            className="alerts-resolution-bar"
                            style={{
                              width: `${(item.avgHours / item.target) * 100}%`,
                              background: item.avgHours <= item.target * 0.5 ? '#10b981' :
                                item.avgHours <= item.target * 0.75 ? '#3b82f6' :
                                  item.avgHours <= item.target ? '#f59e0b' : '#ef4444'
                            }}
                          />
                          <div
                            className="alerts-resolution-target"
                            style={{ left: '100%' }}
                          />
                        </div>
                        <span className="alerts-resolution-value">
                          {item.avgHours}h
                          <span className="alerts-resolution-target-label">/ {item.target}h SLA</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Alert Sources */}
                <div className="alerts-analytics-card">
                  <h3>
                    <Target size={18} />
                    Top Alert Sources
                  </h3>
                  <div className="alerts-sources-list">
                    {[
                      { source: 'Certification Monitor', count: 18, trend: 'up' },
                      { source: 'Maintenance Scheduler', count: 14, trend: 'down' },
                      { source: 'Budget Monitor', count: 9, trend: 'same' },
                      { source: 'Safety Observation', count: 7, trend: 'up' },
                      { source: 'Geofence Monitor', count: 6, trend: 'down' }
                    ].map((item, idx) => (
                      <div key={idx} className="alerts-source-item">
                        <span className="alerts-source-name">{item.source}</span>
                        <div className="alerts-source-stats">
                          <span className="alerts-source-count">{item.count}</span>
                          {item.trend === 'up' && <TrendingUp size={14} className="trend-up" />}
                          {item.trend === 'down' && <TrendingDown size={14} className="trend-down" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SLA Performance */}
                <div className="alerts-analytics-card">
                  <h3>
                    <Target size={18} />
                    SLA Performance
                  </h3>
                  <div className="alerts-sla-metrics">
                    <div className="alerts-sla-gauge">
                      <svg width="180" height="100" viewBox="0 0 180 100">
                        <path
                          d="M 10 90 A 80 80 0 0 1 170 90"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth="16"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 10 90 A 80 80 0 0 1 170 90"
                          fill="none"
                          stroke="url(#slaGradient)"
                          strokeWidth="16"
                          strokeLinecap="round"
                          strokeDasharray={`${stats.slaCompliance * 2.51} 251`}
                        />
                        <defs>
                          <linearGradient id="slaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                        <text x="90" y="85" textAnchor="middle" className="alerts-sla-value">{stats.slaCompliance}%</text>
                      </svg>
                    </div>
                    <div className="alerts-sla-breakdown">
                      <div className="alerts-sla-stat">
                        <span className="alerts-sla-stat-value success">{stats.acknowledgedWithinSLA}%</span>
                        <span className="alerts-sla-stat-label">Acknowledged in SLA</span>
                      </div>
                      <div className="alerts-sla-stat">
                        <span className="alerts-sla-stat-value">{100 - stats.slaCompliance}%</span>
                        <span className="alerts-sla-stat-label">Breached SLA</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alert Detail Side Panel */}
        {selectedAlert && (
          <div className="alerts-side-panel">
            <div className="alerts-detail-panel">
              <div className="alerts-detail-header">
                <div className="alerts-detail-title">
                  <span
                    className="alerts-detail-severity"
                    style={{
                      background: getSeverityConfig(selectedAlert.severity).bgColor,
                      color: getSeverityConfig(selectedAlert.severity).color
                    }}
                  >
                    {selectedAlert.severity}
                  </span>
                  <h3>{selectedAlert.title}</h3>
                </div>
                <button className="alerts-detail-close" onClick={() => setSelectedAlert(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="alerts-detail-body">
                <div className="alerts-detail-desc">
                  {selectedAlert.description}
                </div>

                <div className="alerts-detail-meta">
                  <div className="alerts-meta-item">
                    <span className="alerts-meta-label">Category</span>
                    <span className={`alerts-meta-value ${getCategoryConfig(selectedAlert.category).color}`}>
                      {getCategoryConfig(selectedAlert.category).label}
                    </span>
                  </div>
                  <div className="alerts-meta-item">
                    <span className="alerts-meta-label">Status</span>
                    <span className={`alerts-status-badge ${getStatusConfig(selectedAlert.status).color}`}>
                      {getStatusConfig(selectedAlert.status).label}
                    </span>
                  </div>
                  <div className="alerts-meta-item">
                    <span className="alerts-meta-label">Source</span>
                    <span className="alerts-meta-value">{selectedAlert.source}</span>
                  </div>
                  <div className="alerts-meta-item">
                    <span className="alerts-meta-label">Created</span>
                    <span className="alerts-meta-value">
                      {new Date(selectedAlert.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedAlert.project_name && (
                    <div className="alerts-meta-item full">
                      <span className="alerts-meta-label">Project</span>
                      <span className="alerts-meta-value">{selectedAlert.project_name}</span>
                    </div>
                  )}
                  {selectedAlert.assigned_to_name && (
                    <div className="alerts-meta-item full">
                      <span className="alerts-meta-label">Assigned To</span>
                      <span className="alerts-meta-value">{selectedAlert.assigned_to_name}</span>
                    </div>
                  )}
                </div>

                {selectedAlert.sla_due_at && (
                  <div className="alerts-detail-sla">
                    <h4>SLA Status</h4>
                    <div className={`alerts-sla-indicator ${getSLAStatus(selectedAlert)?.color}`}>
                      <Clock size={16} />
                      <span>Due: {new Date(selectedAlert.sla_due_at).toLocaleString()}</span>
                      <span className="alerts-sla-remaining">
                        {getSLAStatus(selectedAlert)?.label}
                      </span>
                    </div>
                  </div>
                )}

                {selectedAlert.metadata && Object.keys(selectedAlert.metadata).length > 0 && (
                  <div className="alerts-detail-metadata">
                    <h4>Additional Details</h4>
                    <div className="alerts-metadata-list">
                      {Object.entries(selectedAlert.metadata).map(([key, value]) => (
                        <div key={key} className="alerts-metadata-item">
                          <span className="alerts-metadata-key">{key.replace(/_/g, ' ')}</span>
                          <span className="alerts-metadata-value">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="alerts-detail-actions">
                  {selectedAlert.status === 'ACTIVE' && (
                    <button className="alerts-btn alerts-btn-secondary">
                      <Eye size={14} />
                      Acknowledge
                    </button>
                  )}
                  <button className="alerts-btn alerts-btn-secondary">
                    <BellOff size={14} />
                    Snooze
                  </button>
                  <button className="alerts-btn alerts-btn-primary">
                    <CheckCircle size={14} />
                    Resolve
                  </button>
                </div>

                <div className="alerts-detail-link">
                  <button className="alerts-btn alerts-btn-secondary full">
                    <ArrowUpRight size={14} />
                    View Source: {selectedAlert.source_entity_type}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Rule Modal */}
      {showNewRuleModal && (
        <div className="alerts-modal-overlay" onClick={() => setShowNewRuleModal(false)}>
          <div className="alerts-modal" onClick={e => e.stopPropagation()}>
            <div className="alerts-modal-header">
              <h2>
                <Zap size={20} />
                Create Escalation Rule
              </h2>
              <button className="alerts-modal-close" onClick={() => setShowNewRuleModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="alerts-modal-body">
              <form className="alerts-form">
                <div className="alerts-form-group">
                  <label>Rule Name <span>*</span></label>
                  <input type="text" placeholder="Enter rule name" />
                </div>
                <div className="alerts-form-group">
                  <label>Description</label>
                  <textarea placeholder="Describe when this rule triggers..." rows={3} />
                </div>
                <div className="alerts-form-row">
                  <div className="alerts-form-group">
                    <label>Category <span>*</span></label>
                    <select>
                      <option value="">Select category</option>
                      <option value="SAFETY">Safety</option>
                      <option value="COMPLIANCE">Compliance</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="OPERATIONAL">Operations</option>
                      <option value="FINANCIAL">Financial</option>
                      <option value="ADMINISTRATIVE">Administrative</option>
                    </select>
                  </div>
                  <div className="alerts-form-group">
                    <label>Minimum Severity <span>*</span></label>
                    <select>
                      <option value="CRITICAL">Critical</option>
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>
                <div className="alerts-form-group">
                  <label>Escalate After</label>
                  <div className="alerts-time-select">
                    <input type="number" placeholder="15" />
                    <select>
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
                <div className="alerts-form-group">
                  <label>Notification Channels</label>
                  <div className="alerts-checkbox-group">
                    <label className="alerts-checkbox">
                      <input type="checkbox" defaultChecked />
                      <Mail size={14} />
                      Email
                    </label>
                    <label className="alerts-checkbox">
                      <input type="checkbox" />
                      <Smartphone size={14} />
                      SMS
                    </label>
                    <label className="alerts-checkbox">
                      <input type="checkbox" defaultChecked />
                      <Bell size={14} />
                      Push Notification
                    </label>
                  </div>
                </div>
              </form>
            </div>
            <div className="alerts-modal-footer">
              <button className="alerts-btn alerts-btn-secondary" onClick={() => setShowNewRuleModal(false)}>
                Cancel
              </button>
              <button className="alerts-btn alerts-btn-primary">
                <Plus size={16} />
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedPlatformAlerts;
