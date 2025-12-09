import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  DollarSign,
  Shield,
  Truck,
  Cloud,
  BarChart3,
  LineChart,
  Activity,
  Zap,
  ArrowRight,
  CheckCircle,
  XCircle,
  Info,
  ChevronRight,
  Users,
  Wrench,
  Package,
  RefreshCw,
  Download,
  Settings,
  Bell,
  Filter,
  Lightbulb,
  Gauge,
  Play,
  GitBranch
} from 'lucide-react';
import './EnhancedPredictiveAnalytics.css';

interface Project {
  id: string;
  name: string;
  project_number: string;
  status: string;
}

interface Prediction {
  id: string;
  project_id: string;
  prediction_type: string;
  predicted_value: number;
  confidence_score: number;
  prediction_date: string;
  target_date: string;
  factors: Record<string, unknown>;
  model_version: string;
  accuracy_score: number;
}

interface RiskIndicator {
  id: string;
  project_id: string;
  risk_category: string;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  indicator_name: string;
  current_value: number;
  threshold_value: number;
  trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
  description: string;
  impact_score: number;
  probability_score: number;
  mitigation_actions: string[];
}

interface PredictiveAlert {
  id: string;
  project_id: string;
  alert_type: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  recommended_action: string;
}

interface AIRecommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'HIGH' | 'MEDIUM' | 'LOW';
  estimated_savings: number;
  confidence: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED';
}

interface ScenarioAnalysis {
  id: string;
  name: string;
  description: string;
  variables: Record<string, number>;
  outcomes: {
    schedule_impact: number;
    cost_impact: number;
    risk_change: number;
  };
  probability: number;
}

interface ForecastData {
  date: string;
  actual?: number;
  predicted: number;
  lower_bound: number;
  upper_bound: number;
}

interface AnalyticsStats {
  total_predictions: number;
  avg_accuracy: number;
  critical_risks: number;
  active_recommendations: number;
  schedule_health: number;
  cost_health: number;
  safety_health: number;
  overall_confidence: number;
}

type TabType = 'overview' | 'schedule' | 'cost' | 'safety' | 'equipment' | 'scenarios' | 'recommendations';

export function EnhancedPredictiveAnalytics() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [risks, setRisks] = useState<RiskIndicator[]>([]);
  const [alerts, setAlerts] = useState<PredictiveAlert[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [scenarios, setScenarios] = useState<ScenarioAnalysis[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedRisk, setSelectedRisk] = useState<RiskIndicator | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<AIRecommendation | null>(null);
  const [forecastPeriod, setForecastPeriod] = useState<'30' | '60' | '90' | '180'>('90');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Demo data
  const demoProjects: Project[] = [
    { id: 'proj-001', name: 'Corridor H Section 12', project_number: '2024-001', status: 'ACTIVE' },
    { id: 'proj-002', name: 'I-64 Bridge Rehabilitation', project_number: '2024-002', status: 'ACTIVE' },
    { id: 'proj-003', name: 'Route 9 Widening', project_number: '2024-003', status: 'ACTIVE' },
  ];

  const demoPredictions: Prediction[] = [
    { id: 'pred-001', project_id: 'proj-001', prediction_type: 'COMPLETION_DATE', predicted_value: 45, confidence_score: 0.87, prediction_date: '2024-12-01', target_date: '2025-02-15', factors: { weather: 0.3, resources: 0.4, complexity: 0.3 }, model_version: '2.4.1', accuracy_score: 0.92 },
    { id: 'pred-002', project_id: 'proj-001', prediction_type: 'COST_AT_COMPLETION', predicted_value: 14850000, confidence_score: 0.82, prediction_date: '2024-12-01', target_date: '2025-02-15', factors: { materials: 0.35, labor: 0.4, equipment: 0.25 }, model_version: '2.4.1', accuracy_score: 0.88 },
    { id: 'pred-003', project_id: 'proj-001', prediction_type: 'SAFETY_INCIDENTS', predicted_value: 2, confidence_score: 0.78, prediction_date: '2024-12-01', target_date: '2025-02-15', factors: { historical: 0.4, conditions: 0.35, training: 0.25 }, model_version: '2.4.1', accuracy_score: 0.85 },
    { id: 'pred-004', project_id: 'proj-001', prediction_type: 'EQUIPMENT_FAILURE', predicted_value: 3, confidence_score: 0.75, prediction_date: '2024-12-01', target_date: '2025-02-15', factors: { age: 0.3, usage: 0.4, maintenance: 0.3 }, model_version: '2.4.1', accuracy_score: 0.81 },
    { id: 'pred-005', project_id: 'proj-001', prediction_type: 'WEATHER_DELAYS', predicted_value: 8, confidence_score: 0.72, prediction_date: '2024-12-01', target_date: '2025-02-15', factors: { historical: 0.5, forecast: 0.3, seasonal: 0.2 }, model_version: '2.4.1', accuracy_score: 0.79 },
  ];

  const demoRisks: RiskIndicator[] = [
    { id: 'risk-001', project_id: 'proj-001', risk_category: 'SCHEDULE', risk_level: 'HIGH', indicator_name: 'Critical Path Slippage', current_value: 12, threshold_value: 5, trend: 'DECLINING', description: 'Critical path activities showing 12% schedule variance', impact_score: 8, probability_score: 7, mitigation_actions: ['Add additional crew', 'Authorize overtime', 'Review sequencing'] },
    { id: 'risk-002', project_id: 'proj-001', risk_category: 'COST', risk_level: 'MEDIUM', indicator_name: 'Labor Cost Variance', current_value: 4.2, threshold_value: 5, trend: 'STABLE', description: 'Labor costs trending 4.2% above budget', impact_score: 6, probability_score: 5, mitigation_actions: ['Review staffing levels', 'Optimize overtime', 'Cross-train crews'] },
    { id: 'risk-003', project_id: 'proj-001', risk_category: 'SAFETY', risk_level: 'CRITICAL', indicator_name: 'Near Miss Frequency', current_value: 4, threshold_value: 2, trend: 'DECLINING', description: 'Near miss incidents above acceptable threshold', impact_score: 9, probability_score: 8, mitigation_actions: ['Safety stand-down', 'Additional training', 'Review procedures'] },
    { id: 'risk-004', project_id: 'proj-001', risk_category: 'EQUIPMENT', risk_level: 'HIGH', indicator_name: 'Equipment Availability', current_value: 78, threshold_value: 90, trend: 'DECLINING', description: 'Equipment availability below target at 78%', impact_score: 7, probability_score: 6, mitigation_actions: ['Expedite repairs', 'Rent backup equipment', 'Review PM schedule'] },
    { id: 'risk-005', project_id: 'proj-001', risk_category: 'WEATHER', risk_level: 'MEDIUM', indicator_name: 'Weather Impact', current_value: 8, threshold_value: 10, trend: 'IMPROVING', description: '8 weather delay days forecasted in next 30 days', impact_score: 5, probability_score: 7, mitigation_actions: ['Adjust schedule', 'Weather-proof activities', 'Float management'] },
    { id: 'risk-006', project_id: 'proj-001', risk_category: 'MATERIALS', risk_level: 'LOW', indicator_name: 'Supply Chain Delays', current_value: 2, threshold_value: 7, trend: 'IMPROVING', description: 'Material delivery on track with minor delays', impact_score: 3, probability_score: 2, mitigation_actions: ['Monitor suppliers', 'Maintain buffer stock'] },
  ];

  const demoAlerts: PredictiveAlert[] = [
    { id: 'alert-001', project_id: 'proj-001', alert_type: 'SAFETY', severity: 'CRITICAL', title: 'Safety Trend Alert', message: 'Near miss rate has increased 150% over past 2 weeks', is_read: false, created_at: '2024-12-07T14:30:00Z', recommended_action: 'Conduct immediate safety stand-down and review procedures' },
    { id: 'alert-002', project_id: 'proj-001', alert_type: 'SCHEDULE', severity: 'WARNING', title: 'Critical Path Risk', message: 'Bridge deck pour activity at risk of delay due to weather forecast', is_read: false, created_at: '2024-12-07T10:15:00Z', recommended_action: 'Review weather window options and consider weekend work' },
    { id: 'alert-003', project_id: 'proj-001', alert_type: 'EQUIPMENT', severity: 'WARNING', title: 'Maintenance Prediction', message: 'CAT 349 excavator showing signs of hydraulic system wear', is_read: true, created_at: '2024-12-06T16:45:00Z', recommended_action: 'Schedule preventive maintenance within 7 days' },
    { id: 'alert-004', project_id: 'proj-001', alert_type: 'COST', severity: 'INFO', title: 'Budget Milestone', message: '75% of contingency consumed at 60% project completion', is_read: true, created_at: '2024-12-05T09:00:00Z', recommended_action: 'Review remaining contingency allocation' },
  ];

  const demoRecommendations: AIRecommendation[] = [
    { id: 'rec-001', category: 'SCHEDULE', title: 'Accelerate Earthwork Operations', description: 'Add second shift to earthwork operations to recover 5 days on critical path. Weather window is favorable for next 14 days.', impact: 'HIGH', effort: 'MEDIUM', estimated_savings: 125000, confidence: 0.85, status: 'PENDING' },
    { id: 'rec-002', category: 'COST', title: 'Optimize Equipment Fleet', description: 'Return 2 underutilized dozers to rental company. Analysis shows 35% idle time over past 30 days.', impact: 'MEDIUM', effort: 'LOW', estimated_savings: 48000, confidence: 0.92, status: 'PENDING' },
    { id: 'rec-003', category: 'SAFETY', title: 'Implement Pre-Task Planning', description: 'Enhance pre-task safety briefings with crew-specific hazard analysis. Historical data shows 40% reduction in incidents.', impact: 'HIGH', effort: 'LOW', estimated_savings: 200000, confidence: 0.78, status: 'IN_PROGRESS' },
    { id: 'rec-004', category: 'MATERIALS', title: 'Consolidate Concrete Orders', description: 'Batch upcoming pours to qualify for volume discount. Analysis shows potential 8% cost reduction.', impact: 'MEDIUM', effort: 'LOW', estimated_savings: 32000, confidence: 0.88, status: 'PENDING' },
    { id: 'rec-005', category: 'RESOURCES', title: 'Cross-Train Operators', description: 'Cross-train 4 equipment operators on multiple machines to improve flexibility and reduce downtime.', impact: 'MEDIUM', effort: 'MEDIUM', estimated_savings: 65000, confidence: 0.75, status: 'PENDING' },
  ];

  const demoScenarios: ScenarioAnalysis[] = [
    { id: 'scen-001', name: 'Extended Winter Weather', description: 'Additional 15 weather delay days through February', variables: { weather_days: 15, productivity: -0.15 }, outcomes: { schedule_impact: 21, cost_impact: 185000, risk_change: 0.25 }, probability: 0.35 },
    { id: 'scen-002', name: 'Material Price Increase', description: 'Steel and concrete prices increase 12%', variables: { steel_price: 0.12, concrete_price: 0.12 }, outcomes: { schedule_impact: 0, cost_impact: 420000, risk_change: 0.1 }, probability: 0.45 },
    { id: 'scen-003', name: 'Accelerated Schedule', description: 'Add resources to compress schedule by 30 days', variables: { crew_size: 1.25, equipment: 1.2 }, outcomes: { schedule_impact: -30, cost_impact: 280000, risk_change: -0.15 }, probability: 0.7 },
    { id: 'scen-004', name: 'Best Case', description: 'Optimal conditions with no major disruptions', variables: { productivity: 1.1, weather: 0.8 }, outcomes: { schedule_impact: -15, cost_impact: -125000, risk_change: -0.3 }, probability: 0.2 },
  ];

  const demoStats: AnalyticsStats = {
    total_predictions: 47,
    avg_accuracy: 86.5,
    critical_risks: 2,
    active_recommendations: 8,
    schedule_health: 72,
    cost_health: 85,
    safety_health: 65,
    overall_confidence: 84,
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      loadData();
    }
  }, [selectedProjectId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadData();
      }, 60000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedProjectId]);

  async function loadProjects() {
    try {
      const { data } = await (supabase as any)
        .from('projects')
        .select('id, name, project_number, status')
        .eq('status', 'ACTIVE')
        .order('name');

      if (data && data.length > 0) {
        setProjects(data);
        setSelectedProjectId(data[0]?.id ?? '');
      } else {
        setProjects(demoProjects);
        setSelectedProjectId(demoProjects[0]?.id ?? '');
      }
    } catch {
      setProjects(demoProjects);
      setSelectedProjectId(demoProjects[0]?.id ?? '');
    }
    setLoading(false);
  }

  async function loadData() {
    setLoading(true);

    // Use demo data for demonstration
    setPredictions(demoPredictions);
    setRisks(demoRisks);
    setAlerts(demoAlerts);
    setRecommendations(demoRecommendations);
    setScenarios(demoScenarios);
    setStats(demoStats);

    setLoading(false);
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'risk-critical';
      case 'HIGH': return 'risk-high';
      case 'MEDIUM': return 'risk-medium';
      default: return 'risk-low';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'HIGH': return 'impact-high';
      case 'MEDIUM': return 'impact-medium';
      default: return 'impact-low';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return <AlertTriangle size={16} />;
      case 'WARNING': return <AlertTriangle size={16} />;
      default: return <Info size={16} />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'SCHEDULE': return <Clock size={18} />;
      case 'COST': return <DollarSign size={18} />;
      case 'SAFETY': return <Shield size={18} />;
      case 'EQUIPMENT': return <Truck size={18} />;
      case 'WEATHER': return <Cloud size={18} />;
      case 'MATERIALS': return <Package size={18} />;
      case 'RESOURCES': return <Users size={18} />;
      default: return <Activity size={18} />;
    }
  };

  // Generate forecast data for charts
  const generateForecastData = (): ForecastData[] => {
    const data: ForecastData[] = [];
    const baseValue = 100;
    for (let i = -30; i <= parseInt(forecastPeriod); i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const noise = Math.random() * 10 - 5;
      const trend = i * 0.5;
      const predicted = baseValue + trend + noise;
      const dateStr = date.toISOString().split('T')[0] ?? date.toISOString().slice(0, 10);
      data.push({
        date: dateStr,
        actual: i <= 0 ? predicted + (Math.random() * 6 - 3) : undefined,
        predicted: predicted,
        lower_bound: predicted - 10,
        upper_bound: predicted + 10,
      });
    }
    return data;
  };

  const forecastData = generateForecastData();

  const criticalRisks = risks.filter(r => r.risk_level === 'CRITICAL');
  const highRisks = risks.filter(r => r.risk_level === 'HIGH');
  const unreadAlerts = alerts.filter(a => !a.is_read);
  const pendingRecommendations = recommendations.filter(r => r.status === 'PENDING');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} />, badge: null },
    { id: 'schedule', label: 'Schedule', icon: <Clock size={16} />, badge: null },
    { id: 'cost', label: 'Cost', icon: <DollarSign size={16} />, badge: null },
    { id: 'safety', label: 'Safety', icon: <Shield size={16} />, badge: criticalRisks.filter(r => r.risk_category === 'SAFETY').length || null },
    { id: 'equipment', label: 'Equipment', icon: <Truck size={16} />, badge: null },
    { id: 'scenarios', label: 'Scenarios', icon: <GitBranch size={16} />, badge: null },
    { id: 'recommendations', label: 'AI Recommendations', icon: <Lightbulb size={16} />, badge: pendingRecommendations.length || null },
  ];

  return (
    <div className="enhanced-predictive-analytics">
      {/* Header */}
      <div className="epa-header">
        <div className="epa-header-content">
          <div className="epa-header-left">
            <div className="epa-header-icon">
              <Brain size={28} />
            </div>
            <div>
              <h1 className="epa-title">Predictive Analytics</h1>
              <p className="epa-subtitle">AI-Powered Forecasting & Risk Intelligence</p>
            </div>
          </div>
          <div className="epa-header-right">
            <select
              className="epa-project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.project_number} - {p.name}
                </option>
              ))}
            </select>
            <button
              className={`epa-refresh-btn ${autoRefresh ? 'active' : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh'}
            >
              <RefreshCw size={18} className={autoRefresh ? 'spinning' : ''} />
            </button>
            <button className="epa-export-btn">
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Alert Banner */}
        {unreadAlerts.length > 0 && (
          <div className={`epa-alert-banner ${unreadAlerts[0]?.severity.toLowerCase()}`}>
            <div className="epa-alert-banner-content">
              <AlertTriangle size={20} />
              <div className="epa-alert-banner-text">
                <strong>{unreadAlerts.length} new alert{unreadAlerts.length > 1 ? 's' : ''} require attention</strong>
                <span>{unreadAlerts[0]?.title}: {unreadAlerts[0]?.message}</span>
              </div>
            </div>
            <button className="epa-alert-banner-action">
              View All <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="epa-kpi-grid">
        <div className="epa-kpi-card confidence">
          <div className="epa-kpi-header">
            <span className="epa-kpi-label">Model Confidence</span>
            <Brain size={20} />
          </div>
          <div className="epa-kpi-value">{stats?.overall_confidence || 0}%</div>
          <div className="epa-kpi-chart">
            <div className="epa-confidence-ring">
              <svg viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40"
                  fill="none"
                  stroke="url(#confidenceGradient)"
                  strokeWidth="8"
                  strokeDasharray={`${(stats?.overall_confidence || 0) * 2.51} 251`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
                <defs>
                  <linearGradient id="confidenceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
          <div className="epa-kpi-footer">
            <span className="epa-kpi-trend positive">
              <TrendingUp size={14} /> +2.3% from last week
            </span>
          </div>
        </div>

        <div className="epa-kpi-card schedule">
          <div className="epa-kpi-header">
            <span className="epa-kpi-label">Schedule Health</span>
            <Clock size={20} />
          </div>
          <div className="epa-kpi-value">{stats?.schedule_health || 0}%</div>
          <div className="epa-kpi-bar">
            <div
              className="epa-kpi-bar-fill schedule"
              style={{ width: `${stats?.schedule_health || 0}%` }}
            />
          </div>
          <div className="epa-kpi-footer">
            <span className={`epa-kpi-trend ${(stats?.schedule_health || 0) >= 80 ? 'positive' : 'negative'}`}>
              {(stats?.schedule_health || 0) >= 80 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {(stats?.schedule_health || 0) >= 80 ? 'On Track' : 'At Risk'}
            </span>
          </div>
        </div>

        <div className="epa-kpi-card cost">
          <div className="epa-kpi-header">
            <span className="epa-kpi-label">Cost Health</span>
            <DollarSign size={20} />
          </div>
          <div className="epa-kpi-value">{stats?.cost_health || 0}%</div>
          <div className="epa-kpi-bar">
            <div
              className="epa-kpi-bar-fill cost"
              style={{ width: `${stats?.cost_health || 0}%` }}
            />
          </div>
          <div className="epa-kpi-footer">
            <span className={`epa-kpi-trend ${(stats?.cost_health || 0) >= 80 ? 'positive' : 'negative'}`}>
              {(stats?.cost_health || 0) >= 80 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {(stats?.cost_health || 0) >= 80 ? 'Under Budget' : 'Over Budget'}
            </span>
          </div>
        </div>

        <div className="epa-kpi-card safety">
          <div className="epa-kpi-header">
            <span className="epa-kpi-label">Safety Health</span>
            <Shield size={20} />
          </div>
          <div className="epa-kpi-value">{stats?.safety_health || 0}%</div>
          <div className="epa-kpi-bar">
            <div
              className="epa-kpi-bar-fill safety"
              style={{ width: `${stats?.safety_health || 0}%` }}
            />
          </div>
          <div className="epa-kpi-footer">
            <span className={`epa-kpi-trend ${(stats?.safety_health || 0) >= 80 ? 'positive' : 'negative'}`}>
              {(stats?.safety_health || 0) >= 80 ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {(stats?.safety_health || 0) >= 80 ? 'Low Risk' : 'Elevated Risk'}
            </span>
          </div>
        </div>

        <div className="epa-kpi-card risks">
          <div className="epa-kpi-header">
            <span className="epa-kpi-label">Critical Risks</span>
            <AlertTriangle size={20} />
          </div>
          <div className="epa-kpi-value">{criticalRisks.length + highRisks.length}</div>
          <div className="epa-kpi-breakdown">
            <span className="critical">{criticalRisks.length} Critical</span>
            <span className="high">{highRisks.length} High</span>
          </div>
          <div className="epa-kpi-footer">
            <span className={`epa-kpi-trend ${criticalRisks.length === 0 ? 'positive' : 'negative'}`}>
              {criticalRisks.length === 0 ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
              {criticalRisks.length === 0 ? 'All Clear' : 'Requires Action'}
            </span>
          </div>
        </div>

        <div className="epa-kpi-card recommendations">
          <div className="epa-kpi-header">
            <span className="epa-kpi-label">AI Recommendations</span>
            <Lightbulb size={20} />
          </div>
          <div className="epa-kpi-value">{pendingRecommendations.length}</div>
          <div className="epa-kpi-savings">
            <span className="epa-savings-label">Potential Savings</span>
            <span className="epa-savings-value">
              ${pendingRecommendations.reduce((acc, r) => acc + r.estimated_savings, 0).toLocaleString()}
            </span>
          </div>
          <div className="epa-kpi-footer">
            <button className="epa-view-all-btn" onClick={() => setActiveTab('recommendations')}>
              View All <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="epa-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`epa-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as TabType)}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge && <span className="epa-tab-badge">{tab.badge}</span>}
          </button>
        ))}
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="epa-loading">
          <div className="epa-loading-spinner" />
          <span>Analyzing data...</span>
        </div>
      ) : (
        <div className="epa-content">
          {activeTab === 'overview' && (
            <div className="epa-overview">
              {/* Risk Matrix */}
              <div className="epa-section risk-matrix-section">
                <div className="epa-section-header">
                  <h2><AlertTriangle size={20} /> Risk Heat Map</h2>
                  <span className="epa-section-subtitle">Impact vs Probability Analysis</span>
                </div>
                <div className="epa-risk-matrix">
                  <div className="epa-matrix-y-label">
                    <span>Impact</span>
                  </div>
                  <div className="epa-matrix-grid">
                    {[5, 4, 3, 2, 1].map((impact) => (
                      <div key={impact} className="epa-matrix-row">
                        {[1, 2, 3, 4, 5].map((prob) => {
                          const cellRisks = risks.filter(
                            r => Math.ceil(r.impact_score / 2) === impact && Math.ceil(r.probability_score / 2) === prob
                          );
                          const severity = impact * prob;
                          let cellClass = 'low';
                          if (severity >= 15) cellClass = 'critical';
                          else if (severity >= 10) cellClass = 'high';
                          else if (severity >= 5) cellClass = 'medium';

                          return (
                            <div key={prob} className={`epa-matrix-cell ${cellClass}`}>
                              {cellRisks.length > 0 && (
                                <div className="epa-matrix-indicator">
                                  {cellRisks.length}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="epa-matrix-x-label">
                    <span>Probability</span>
                  </div>
                </div>
                <div className="epa-matrix-legend">
                  <div className="epa-legend-item"><span className="low" /> Low</div>
                  <div className="epa-legend-item"><span className="medium" /> Medium</div>
                  <div className="epa-legend-item"><span className="high" /> High</div>
                  <div className="epa-legend-item"><span className="critical" /> Critical</div>
                </div>
              </div>

              {/* Forecast Chart */}
              <div className="epa-section forecast-section">
                <div className="epa-section-header">
                  <h2><LineChart size={20} /> Progress Forecast</h2>
                  <div className="epa-forecast-controls">
                    <select
                      value={forecastPeriod}
                      onChange={(e) => setForecastPeriod(e.target.value as typeof forecastPeriod)}
                      className="epa-forecast-select"
                    >
                      <option value="30">30 Days</option>
                      <option value="60">60 Days</option>
                      <option value="90">90 Days</option>
                      <option value="180">180 Days</option>
                    </select>
                  </div>
                </div>
                <div className="epa-forecast-chart">
                  <svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
                    {/* Grid Lines */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <line
                        key={i}
                        x1="60" y1={50 + i * 50}
                        x2="780" y2={50 + i * 50}
                        stroke="rgba(255,255,255,0.05)"
                        strokeWidth="1"
                      />
                    ))}

                    {/* Confidence Band */}
                    <path
                      d={`
                        M 60 ${250 - (forecastData[0]?.lower_bound ?? 0) * 2}
                        ${forecastData.map((d, i) => `L ${60 + (i / forecastData.length) * 720} ${250 - d.lower_bound * 2}`).join(' ')}
                        ${forecastData.slice().reverse().map((d, i) => `L ${780 - (i / forecastData.length) * 720} ${250 - d.upper_bound * 2}`).join(' ')}
                        Z
                      `}
                      fill="url(#forecastBand)"
                      opacity="0.3"
                    />

                    {/* Predicted Line */}
                    <path
                      d={`M 60 ${250 - (forecastData[0]?.predicted ?? 0) * 2} ${forecastData.map((d, i) => `L ${60 + (i / forecastData.length) * 720} ${250 - d.predicted * 2}`).join(' ')}`}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />

                    {/* Actual Line */}
                    <path
                      d={`M 60 ${250 - (forecastData[0]?.actual ?? 0) * 2} ${forecastData.filter(d => d.actual !== undefined).map((d, i) => `L ${60 + (i / forecastData.length) * 720} ${250 - (d.actual || 0) * 2}`).join(' ')}`}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                    />

                    {/* Today Marker */}
                    <line
                      x1={60 + (30 / (30 + parseInt(forecastPeriod))) * 720}
                      y1="40"
                      x2={60 + (30 / (30 + parseInt(forecastPeriod))) * 720}
                      y2="260"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                    <text
                      x={60 + (30 / (30 + parseInt(forecastPeriod))) * 720}
                      y="30"
                      fill="#f59e0b"
                      textAnchor="middle"
                      fontSize="12"
                    >
                      Today
                    </text>

                    {/* Y-Axis Labels */}
                    {['150%', '125%', '100%', '75%', '50%'].map((label, i) => (
                      <text key={i} x="50" y={55 + i * 50} fill="rgba(255,255,255,0.5)" textAnchor="end" fontSize="11">
                        {label}
                      </text>
                    ))}

                    <defs>
                      <linearGradient id="forecastBand" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="epa-chart-legend">
                    <div className="epa-legend-item"><span className="actual" /> Actual Progress</div>
                    <div className="epa-legend-item"><span className="predicted" /> Predicted</div>
                    <div className="epa-legend-item"><span className="band" /> Confidence Band</div>
                  </div>
                </div>
              </div>

              {/* Risk List */}
              <div className="epa-section risks-section">
                <div className="epa-section-header">
                  <h2><Activity size={20} /> Active Risk Indicators</h2>
                  <button className="epa-section-action">
                    <Filter size={16} /> Filter
                  </button>
                </div>
                <div className="epa-risk-list">
                  {risks.map((risk) => (
                    <div
                      key={risk.id}
                      className={`epa-risk-item ${getRiskColor(risk.risk_level)}`}
                      onClick={() => setSelectedRisk(risk)}
                    >
                      <div className="epa-risk-header">
                        <div className="epa-risk-category">
                          {getCategoryIcon(risk.risk_category)}
                          <span>{risk.risk_category}</span>
                        </div>
                        <span className={`epa-risk-badge ${getRiskColor(risk.risk_level)}`}>
                          {risk.risk_level}
                        </span>
                      </div>
                      <h3 className="epa-risk-name">{risk.indicator_name}</h3>
                      <p className="epa-risk-description">{risk.description}</p>
                      <div className="epa-risk-metrics">
                        <div className="epa-metric">
                          <span className="epa-metric-label">Current</span>
                          <span className="epa-metric-value">{risk.current_value}</span>
                        </div>
                        <div className="epa-metric">
                          <span className="epa-metric-label">Threshold</span>
                          <span className="epa-metric-value">{risk.threshold_value}</span>
                        </div>
                        <div className="epa-metric">
                          <span className="epa-metric-label">Trend</span>
                          <span className={`epa-metric-trend ${risk.trend.toLowerCase()}`}>
                            {risk.trend === 'IMPROVING' && <TrendingUp size={14} />}
                            {risk.trend === 'DECLINING' && <TrendingDown size={14} />}
                            {risk.trend === 'STABLE' && <ArrowRight size={14} />}
                            {risk.trend}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Alerts */}
              <div className="epa-section alerts-section">
                <div className="epa-section-header">
                  <h2><Bell size={20} /> Recent Predictive Alerts</h2>
                  <button className="epa-section-action">View All</button>
                </div>
                <div className="epa-alert-list">
                  {alerts.slice(0, 5).map((alert) => (
                    <div key={alert.id} className={`epa-alert-item ${alert.severity.toLowerCase()} ${!alert.is_read ? 'unread' : ''}`}>
                      <div className={`epa-alert-icon ${alert.severity.toLowerCase()}`}>
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="epa-alert-content">
                        <div className="epa-alert-header">
                          <h4>{alert.title}</h4>
                          <span className="epa-alert-time">
                            {new Date(alert.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="epa-alert-message">{alert.message}</p>
                        <div className="epa-alert-action">
                          <Lightbulb size={14} />
                          <span>{alert.recommended_action}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="epa-schedule">
              <div className="epa-section">
                <div className="epa-section-header">
                  <h2><Clock size={20} /> Schedule Predictions</h2>
                </div>
                <div className="epa-prediction-cards">
                  {predictions.filter(p => ['COMPLETION_DATE', 'WEATHER_DELAYS'].includes(p.prediction_type)).map((pred) => (
                    <div key={pred.id} className="epa-prediction-card">
                      <div className="epa-prediction-type">{pred.prediction_type.replace(/_/g, ' ')}</div>
                      <div className="epa-prediction-value">
                        {pred.prediction_type === 'COMPLETION_DATE'
                          ? `${pred.predicted_value} days remaining`
                          : `${pred.predicted_value} delay days`
                        }
                      </div>
                      <div className="epa-prediction-confidence">
                        <div className="epa-confidence-bar">
                          <div
                            className="epa-confidence-fill"
                            style={{ width: `${pred.confidence_score * 100}%` }}
                          />
                        </div>
                        <span>{(pred.confidence_score * 100).toFixed(0)}% confidence</span>
                      </div>
                      <div className="epa-prediction-factors">
                        <h4>Key Factors</h4>
                        {Object.entries(pred.factors).map(([key, value]) => (
                          <div key={key} className="epa-factor">
                            <span className="epa-factor-name">{key}</span>
                            <div className="epa-factor-bar">
                              <div
                                className="epa-factor-fill"
                                style={{ width: `${(value as number) * 100}%` }}
                              />
                            </div>
                            <span className="epa-factor-value">{((value as number) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                      <div className="epa-prediction-meta">
                        <span>Model v{pred.model_version}</span>
                        <span>Accuracy: {(pred.accuracy_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule Risk Analysis */}
              <div className="epa-section">
                <div className="epa-section-header">
                  <h2><Activity size={20} /> Schedule Risk Analysis</h2>
                </div>
                <div className="epa-risk-grid">
                  {risks.filter(r => r.risk_category === 'SCHEDULE' || r.risk_category === 'WEATHER').map((risk) => (
                    <div key={risk.id} className={`epa-risk-card ${getRiskColor(risk.risk_level)}`}>
                      <div className="epa-risk-card-header">
                        {getCategoryIcon(risk.risk_category)}
                        <span className={`epa-risk-level ${getRiskColor(risk.risk_level)}`}>
                          {risk.risk_level}
                        </span>
                      </div>
                      <h3>{risk.indicator_name}</h3>
                      <p>{risk.description}</p>
                      <div className="epa-risk-score">
                        <div className="epa-score-item">
                          <span>Impact</span>
                          <div className="epa-score-dots">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className={`epa-dot ${i < risk.impact_score ? 'filled' : ''}`} />
                            ))}
                          </div>
                        </div>
                        <div className="epa-score-item">
                          <span>Probability</span>
                          <div className="epa-score-dots">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className={`epa-dot ${i < risk.probability_score ? 'filled' : ''}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="epa-mitigation">
                        <h4>Mitigation Actions</h4>
                        <ul>
                          {risk.mitigation_actions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cost' && (
            <div className="epa-cost">
              <div className="epa-section">
                <div className="epa-section-header">
                  <h2><DollarSign size={20} /> Cost Predictions</h2>
                </div>
                <div className="epa-cost-overview">
                  <div className="epa-cost-card main">
                    <div className="epa-cost-header">
                      <span>Estimated Cost at Completion</span>
                      <span className={`epa-variance ${14850000 > 15000000 ? 'negative' : 'positive'}`}>
                        {14850000 > 15000000 ? '+' : '-'}$
                        {Math.abs(14850000 - 15000000).toLocaleString()}
                      </span>
                    </div>
                    <div className="epa-cost-value">$14,850,000</div>
                    <div className="epa-cost-comparison">
                      <div className="epa-comparison-bar">
                        <div className="epa-bar-budget" style={{ width: '100%' }}>
                          <span>Budget: $15,000,000</span>
                        </div>
                        <div className="epa-bar-forecast" style={{ width: '99%' }}>
                          <span>Forecast: $14,850,000</span>
                        </div>
                      </div>
                    </div>
                    <div className="epa-cost-confidence">
                      <Gauge size={16} />
                      <span>82% confidence</span>
                    </div>
                  </div>

                  <div className="epa-cost-breakdown">
                    <h3>Cost Breakdown by Category</h3>
                    <div className="epa-breakdown-items">
                      {[
                        { category: 'Labor', budget: 5500000, forecast: 5720000, variance: 220000 },
                        { category: 'Materials', budget: 4200000, forecast: 4150000, variance: -50000 },
                        { category: 'Equipment', budget: 2800000, forecast: 2650000, variance: -150000 },
                        { category: 'Subcontractors', budget: 1800000, forecast: 1680000, variance: -120000 },
                        { category: 'Overhead', budget: 700000, forecast: 650000, variance: -50000 },
                      ].map((item) => (
                        <div key={item.category} className="epa-breakdown-row">
                          <div className="epa-breakdown-label">
                            <span className="epa-breakdown-name">{item.category}</span>
                            <span className={`epa-breakdown-variance ${item.variance > 0 ? 'over' : 'under'}`}>
                              {item.variance > 0 ? '+' : ''}{item.variance.toLocaleString()}
                            </span>
                          </div>
                          <div className="epa-breakdown-bars">
                            <div className="epa-breakdown-bar budget" style={{ width: `${(item.budget / 5500000) * 100}%` }} />
                            <div className="epa-breakdown-bar forecast" style={{ width: `${(item.forecast / 5500000) * 100}%` }} />
                          </div>
                          <div className="epa-breakdown-values">
                            <span>${(item.forecast / 1000000).toFixed(2)}M</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cost Risks */}
              <div className="epa-section">
                <div className="epa-section-header">
                  <h2><AlertTriangle size={20} /> Cost Risk Factors</h2>
                </div>
                <div className="epa-risk-grid">
                  {risks.filter(r => r.risk_category === 'COST' || r.risk_category === 'MATERIALS').map((risk) => (
                    <div key={risk.id} className={`epa-risk-card ${getRiskColor(risk.risk_level)}`}>
                      <div className="epa-risk-card-header">
                        {getCategoryIcon(risk.risk_category)}
                        <span className={`epa-risk-level ${getRiskColor(risk.risk_level)}`}>
                          {risk.risk_level}
                        </span>
                      </div>
                      <h3>{risk.indicator_name}</h3>
                      <p>{risk.description}</p>
                      <div className="epa-risk-metrics-row">
                        <div className="epa-metric-box">
                          <span className="label">Current</span>
                          <span className="value">{risk.current_value}%</span>
                        </div>
                        <div className="epa-metric-box">
                          <span className="label">Threshold</span>
                          <span className="value">{risk.threshold_value}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="epa-safety">
              <div className="epa-section">
                <div className="epa-section-header">
                  <h2><Shield size={20} /> Safety Predictions</h2>
                </div>
                <div className="epa-safety-overview">
                  <div className="epa-safety-gauge">
                    <svg viewBox="0 0 200 120">
                      <defs>
                        <linearGradient id="safetyGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="50%" stopColor="#f59e0b" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="20"
                        strokeLinecap="round"
                      />
                      <path
                        d="M 20 100 A 80 80 0 0 1 180 100"
                        fill="none"
                        stroke="url(#safetyGaugeGradient)"
                        strokeWidth="20"
                        strokeLinecap="round"
                        strokeDasharray={`${(stats?.safety_health || 0) * 2.51} 251`}
                      />
                      <text x="100" y="85" textAnchor="middle" fill="white" fontSize="32" fontWeight="bold">
                        {stats?.safety_health || 0}%
                      </text>
                      <text x="100" y="105" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="12">
                        Safety Score
                      </text>
                    </svg>
                  </div>

                  <div className="epa-safety-predictions">
                    {predictions.filter(p => p.prediction_type === 'SAFETY_INCIDENTS').map((pred) => (
                      <div key={pred.id} className="epa-safety-prediction-card">
                        <div className="epa-sp-icon">
                          <AlertTriangle size={24} />
                        </div>
                        <div className="epa-sp-content">
                          <h3>Predicted Incidents</h3>
                          <div className="epa-sp-value">{pred.predicted_value}</div>
                          <p>in next 90 days</p>
                          <div className="epa-sp-confidence">
                            {(pred.confidence_score * 100).toFixed(0)}% confidence
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="epa-safety-stats">
                      <div className="epa-stat-item">
                        <span className="epa-stat-label">Days Since Last Incident</span>
                        <span className="epa-stat-value positive">47</span>
                      </div>
                      <div className="epa-stat-item">
                        <span className="epa-stat-label">Near Misses (30 days)</span>
                        <span className="epa-stat-value warning">4</span>
                      </div>
                      <div className="epa-stat-item">
                        <span className="epa-stat-label">Safety Observations</span>
                        <span className="epa-stat-value">23</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Safety Risks */}
              <div className="epa-section">
                <div className="epa-section-header">
                  <h2><AlertTriangle size={20} /> Safety Risk Indicators</h2>
                </div>
                <div className="epa-safety-risks">
                  {risks.filter(r => r.risk_category === 'SAFETY').map((risk) => (
                    <div key={risk.id} className={`epa-safety-risk ${getRiskColor(risk.risk_level)}`}>
                      <div className="epa-sr-header">
                        <span className={`epa-sr-badge ${getRiskColor(risk.risk_level)}`}>
                          {risk.risk_level}
                        </span>
                        <span className={`epa-sr-trend ${risk.trend.toLowerCase()}`}>
                          {risk.trend === 'IMPROVING' && <TrendingUp size={14} />}
                          {risk.trend === 'DECLINING' && <TrendingDown size={14} />}
                          {risk.trend === 'STABLE' && <ArrowRight size={14} />}
                          {risk.trend}
                        </span>
                      </div>
                      <h3>{risk.indicator_name}</h3>
                      <p>{risk.description}</p>
                      <div className="epa-sr-meter">
                        <div className="epa-meter-label">
                          <span>Current: {risk.current_value}</span>
                          <span>Threshold: {risk.threshold_value}</span>
                        </div>
                        <div className="epa-meter-bar">
                          <div
                            className={`epa-meter-fill ${getRiskColor(risk.risk_level)}`}
                            style={{ width: `${Math.min((risk.current_value / (risk.threshold_value * 2)) * 100, 100)}%` }}
                          />
                          <div
                            className="epa-meter-threshold"
                            style={{ left: `${(risk.threshold_value / (risk.threshold_value * 2)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="epa-sr-actions">
                        <h4>Recommended Actions</h4>
                        <ul>
                          {risk.mitigation_actions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'equipment' && (
            <div className="epa-equipment">
              <div className="epa-section">
                <div className="epa-section-header">
                  <h2><Truck size={20} /> Equipment Predictions</h2>
                </div>
                <div className="epa-equipment-overview">
                  {predictions.filter(p => p.prediction_type === 'EQUIPMENT_FAILURE').map((pred) => (
                    <div key={pred.id} className="epa-equipment-prediction">
                      <div className="epa-ep-header">
                        <Wrench size={24} />
                        <h3>Predicted Equipment Failures</h3>
                      </div>
                      <div className="epa-ep-value">{pred.predicted_value}</div>
                      <p>in next 90 days based on usage patterns and maintenance history</p>
                      <div className="epa-ep-factors">
                        {Object.entries(pred.factors).map(([key, value]) => (
                          <div key={key} className="epa-ep-factor">
                            <span>{key}</span>
                            <div className="epa-ep-factor-bar">
                              <div style={{ width: `${(value as number) * 100}%` }} />
                            </div>
                            <span>{((value as number) * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  <div className="epa-equipment-at-risk">
                    <h3>Equipment at Highest Risk</h3>
                    <div className="epa-ear-list">
                      {[
                        { id: 'CAT-349-01', name: 'CAT 349 Excavator', risk: 78, issue: 'Hydraulic system wear', due: '7 days' },
                        { id: 'JD-850K-02', name: 'John Deere 850K', risk: 65, issue: 'Track tension low', due: '14 days' },
                        { id: 'VOL-A40-01', name: 'Volvo A40 Haul Truck', risk: 52, issue: 'Transmission service', due: '21 days' },
                      ].map((eq) => (
                        <div key={eq.id} className="epa-ear-item">
                          <div className="epa-ear-info">
                            <span className="epa-ear-id">{eq.id}</span>
                            <span className="epa-ear-name">{eq.name}</span>
                          </div>
                          <div className="epa-ear-details">
                            <span className="epa-ear-issue">{eq.issue}</span>
                            <span className="epa-ear-due">Due: {eq.due}</span>
                          </div>
                          <div className="epa-ear-risk">
                            <div className="epa-ear-risk-bar">
                              <div
                                className={eq.risk >= 70 ? 'high' : eq.risk >= 50 ? 'medium' : 'low'}
                                style={{ width: `${eq.risk}%` }}
                              />
                            </div>
                            <span>{eq.risk}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Equipment Risks */}
              <div className="epa-section">
                <div className="epa-section-header">
                  <h2><AlertTriangle size={20} /> Equipment Risk Factors</h2>
                </div>
                <div className="epa-risk-grid">
                  {risks.filter(r => r.risk_category === 'EQUIPMENT').map((risk) => (
                    <div key={risk.id} className={`epa-risk-card ${getRiskColor(risk.risk_level)}`}>
                      <div className="epa-risk-card-header">
                        <Truck size={18} />
                        <span className={`epa-risk-level ${getRiskColor(risk.risk_level)}`}>
                          {risk.risk_level}
                        </span>
                      </div>
                      <h3>{risk.indicator_name}</h3>
                      <p>{risk.description}</p>
                      <div className="epa-risk-metrics-row">
                        <div className="epa-metric-box">
                          <span className="label">Current</span>
                          <span className="value">{risk.current_value}%</span>
                        </div>
                        <div className="epa-metric-box">
                          <span className="label">Target</span>
                          <span className="value">{risk.threshold_value}%</span>
                        </div>
                      </div>
                      <div className="epa-mitigation">
                        <h4>Actions</h4>
                        <ul>
                          {risk.mitigation_actions.map((action, i) => (
                            <li key={i}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scenarios' && (
            <div className="epa-scenarios">
              <div className="epa-section">
                <div className="epa-section-header">
                  <h2><GitBranch size={20} /> Scenario Analysis</h2>
                  <button className="epa-add-btn">
                    <Zap size={16} /> New Scenario
                  </button>
                </div>
                <div className="epa-scenario-grid">
                  {scenarios.map((scenario) => (
                    <div key={scenario.id} className="epa-scenario-card">
                      <div className="epa-scenario-header">
                        <h3>{scenario.name}</h3>
                        <span className="epa-scenario-prob">
                          {(scenario.probability * 100).toFixed(0)}% probability
                        </span>
                      </div>
                      <p className="epa-scenario-desc">{scenario.description}</p>

                      <div className="epa-scenario-outcomes">
                        <h4>Projected Outcomes</h4>
                        <div className="epa-outcome-grid">
                          <div className={`epa-outcome ${scenario.outcomes.schedule_impact > 0 ? 'negative' : 'positive'}`}>
                            <Clock size={16} />
                            <span className="epa-outcome-label">Schedule</span>
                            <span className="epa-outcome-value">
                              {scenario.outcomes.schedule_impact > 0 ? '+' : ''}
                              {scenario.outcomes.schedule_impact} days
                            </span>
                          </div>
                          <div className={`epa-outcome ${scenario.outcomes.cost_impact > 0 ? 'negative' : 'positive'}`}>
                            <DollarSign size={16} />
                            <span className="epa-outcome-label">Cost</span>
                            <span className="epa-outcome-value">
                              {scenario.outcomes.cost_impact > 0 ? '+' : ''}
                              ${Math.abs(scenario.outcomes.cost_impact).toLocaleString()}
                            </span>
                          </div>
                          <div className={`epa-outcome ${scenario.outcomes.risk_change > 0 ? 'negative' : 'positive'}`}>
                            <AlertTriangle size={16} />
                            <span className="epa-outcome-label">Risk</span>
                            <span className="epa-outcome-value">
                              {scenario.outcomes.risk_change > 0 ? '+' : ''}
                              {(scenario.outcomes.risk_change * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="epa-scenario-variables">
                        <h4>Variables</h4>
                        {Object.entries(scenario.variables).map(([key, value]) => (
                          <div key={key} className="epa-variable">
                            <span>{key.replace(/_/g, ' ')}</span>
                            <span>{typeof value === 'number' && value < 2 ? `${(value * 100).toFixed(0)}%` : value}</span>
                          </div>
                        ))}
                      </div>

                      <div className="epa-scenario-actions">
                        <button className="epa-scenario-run">
                          <Play size={14} /> Run Analysis
                        </button>
                        <button className="epa-scenario-edit">
                          <Settings size={14} /> Edit
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="epa-recommendations">
              <div className="epa-section">
                <div className="epa-section-header">
                  <h2><Lightbulb size={20} /> AI-Generated Recommendations</h2>
                  <div className="epa-rec-summary">
                    <span className="epa-rec-count">{pendingRecommendations.length} pending</span>
                    <span className="epa-rec-savings">
                      ${pendingRecommendations.reduce((acc, r) => acc + r.estimated_savings, 0).toLocaleString()} potential savings
                    </span>
                  </div>
                </div>
                <div className="epa-rec-list">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className={`epa-rec-card ${rec.status.toLowerCase()}`}
                      onClick={() => setSelectedRecommendation(rec)}
                    >
                      <div className="epa-rec-header">
                        <div className="epa-rec-category">
                          {getCategoryIcon(rec.category)}
                          <span>{rec.category}</span>
                        </div>
                        <span className={`epa-rec-status ${rec.status.toLowerCase()}`}>
                          {rec.status === 'IN_PROGRESS' && <Play size={12} />}
                          {rec.status === 'COMPLETED' && <CheckCircle size={12} />}
                          {rec.status === 'DISMISSED' && <XCircle size={12} />}
                          {rec.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="epa-rec-title">{rec.title}</h3>
                      <p className="epa-rec-desc">{rec.description}</p>

                      <div className="epa-rec-metrics">
                        <div className={`epa-rec-metric ${getImpactColor(rec.impact)}`}>
                          <span className="label">Impact</span>
                          <span className="value">{rec.impact}</span>
                        </div>
                        <div className={`epa-rec-metric effort-${rec.effort.toLowerCase()}`}>
                          <span className="label">Effort</span>
                          <span className="value">{rec.effort}</span>
                        </div>
                        <div className="epa-rec-metric savings">
                          <span className="label">Est. Savings</span>
                          <span className="value">${rec.estimated_savings.toLocaleString()}</span>
                        </div>
                        <div className="epa-rec-metric confidence">
                          <span className="label">Confidence</span>
                          <span className="value">{(rec.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>

                      {rec.status === 'PENDING' && (
                        <div className="epa-rec-actions">
                          <button className="epa-rec-accept">
                            <CheckCircle size={14} /> Accept
                          </button>
                          <button className="epa-rec-dismiss">
                            <XCircle size={14} /> Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Risk Detail Modal */}
      {selectedRisk && (
        <div className="epa-modal-overlay" onClick={() => setSelectedRisk(null)}>
          <div className="epa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="epa-modal-header">
              <div className="epa-modal-title">
                {getCategoryIcon(selectedRisk.risk_category)}
                <h2>{selectedRisk.indicator_name}</h2>
              </div>
              <button className="epa-modal-close" onClick={() => setSelectedRisk(null)}>
                <XCircle size={20} />
              </button>
            </div>
            <div className="epa-modal-body">
              <div className={`epa-modal-badge ${getRiskColor(selectedRisk.risk_level)}`}>
                {selectedRisk.risk_level} RISK
              </div>
              <p className="epa-modal-desc">{selectedRisk.description}</p>

              <div className="epa-modal-metrics">
                <div className="epa-modal-metric">
                  <span>Current Value</span>
                  <strong>{selectedRisk.current_value}</strong>
                </div>
                <div className="epa-modal-metric">
                  <span>Threshold</span>
                  <strong>{selectedRisk.threshold_value}</strong>
                </div>
                <div className="epa-modal-metric">
                  <span>Impact Score</span>
                  <strong>{selectedRisk.impact_score}/10</strong>
                </div>
                <div className="epa-modal-metric">
                  <span>Probability Score</span>
                  <strong>{selectedRisk.probability_score}/10</strong>
                </div>
              </div>

              <div className="epa-modal-section">
                <h3>Trend Analysis</h3>
                <div className={`epa-trend-indicator ${selectedRisk.trend.toLowerCase()}`}>
                  {selectedRisk.trend === 'IMPROVING' && <TrendingUp size={20} />}
                  {selectedRisk.trend === 'DECLINING' && <TrendingDown size={20} />}
                  {selectedRisk.trend === 'STABLE' && <ArrowRight size={20} />}
                  <span>{selectedRisk.trend}</span>
                </div>
              </div>

              <div className="epa-modal-section">
                <h3>Recommended Mitigation Actions</h3>
                <ul className="epa-mitigation-list">
                  {selectedRisk.mitigation_actions.map((action, i) => (
                    <li key={i}>
                      <CheckCircle size={16} />
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="epa-modal-footer">
              <button className="epa-modal-btn secondary" onClick={() => setSelectedRisk(null)}>
                Close
              </button>
              <button className="epa-modal-btn primary">
                Create Action Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recommendation Detail Modal */}
      {selectedRecommendation && (
        <div className="epa-modal-overlay" onClick={() => setSelectedRecommendation(null)}>
          <div className="epa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="epa-modal-header">
              <div className="epa-modal-title">
                <Lightbulb size={24} />
                <h2>AI Recommendation</h2>
              </div>
              <button className="epa-modal-close" onClick={() => setSelectedRecommendation(null)}>
                <XCircle size={20} />
              </button>
            </div>
            <div className="epa-modal-body">
              <div className="epa-rec-category-badge">
                {getCategoryIcon(selectedRecommendation.category)}
                {selectedRecommendation.category}
              </div>
              <h3 className="epa-modal-rec-title">{selectedRecommendation.title}</h3>
              <p className="epa-modal-desc">{selectedRecommendation.description}</p>

              <div className="epa-modal-metrics">
                <div className={`epa-modal-metric ${getImpactColor(selectedRecommendation.impact)}`}>
                  <span>Impact</span>
                  <strong>{selectedRecommendation.impact}</strong>
                </div>
                <div className="epa-modal-metric">
                  <span>Effort</span>
                  <strong>{selectedRecommendation.effort}</strong>
                </div>
                <div className="epa-modal-metric highlight">
                  <span>Est. Savings</span>
                  <strong>${selectedRecommendation.estimated_savings.toLocaleString()}</strong>
                </div>
                <div className="epa-modal-metric">
                  <span>Confidence</span>
                  <strong>{(selectedRecommendation.confidence * 100).toFixed(0)}%</strong>
                </div>
              </div>

              <div className="epa-modal-section">
                <h3>Implementation Steps</h3>
                <ol className="epa-steps-list">
                  <li>Review current situation and gather baseline data</li>
                  <li>Develop detailed implementation plan</li>
                  <li>Assign resources and set timeline</li>
                  <li>Execute changes with monitoring</li>
                  <li>Measure results and validate savings</li>
                </ol>
              </div>
            </div>
            <div className="epa-modal-footer">
              <button className="epa-modal-btn secondary" onClick={() => setSelectedRecommendation(null)}>
                Dismiss
              </button>
              <button className="epa-modal-btn primary">
                Accept & Create Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedPredictiveAnalytics;
