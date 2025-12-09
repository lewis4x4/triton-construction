import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  Truck,
  DollarSign,
  ShieldCheck,
  Calendar,
  Building,
  RefreshCw,
  Settings,
  Download,
  AlertTriangle
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { KPITrendChart } from '../../components/executive/KPITrendChart';
import { AlertSummaryWidget } from '../../components/executive/AlertSummaryWidget';
import './ExecutiveDashboard.css';

interface DashboardKPIs {
  activeProjects: number;
  totalContractValue: number;
  workforceCount: number;
  equipmentUtilization: number;
  safetyIncidentRate: number;
  complianceScore: number;
  budgetVariance: number;
  scheduledWorkDays: number;
}

interface TrendData {
  date: string;
  value: number;
}

export function ExecutiveDashboard() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState<DashboardKPIs>({
    activeProjects: 0,
    totalContractValue: 0,
    workforceCount: 0,
    equipmentUtilization: 0,
    safetyIncidentRate: 0,
    complianceScore: 0,
    budgetVariance: 0,
    scheduledWorkDays: 0,
  });
  const [revenuetrend, setRevenueTrend] = useState<TrendData[]>([]);
  const [utilizationTrend, setUtilizationTrend] = useState<TrendData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    fetchKPIs();
    fetchTrends();
  }, [timeRange]);

  const fetchKPIs = async () => {
    try {
      setIsLoading(true);

      // Fetch active projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, current_contract_value')
        .in('status', ['ACTIVE', 'MOBILIZATION']);

      // Fetch workforce count
      const { count: workforceCount } = await supabase
        .from('employees')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      // Fetch equipment
      const { data: equipment } = await supabase
        .from('equipment')
        .select('id, status')
        .eq('is_active', true);

      // Calculate KPIs
      const activeProjects = projects?.length || 0;
      const totalContractValue = projects?.reduce((sum, p) => sum + (p.current_contract_value || 0), 0) || 0;
      const equipmentActive = equipment?.filter(e => e.status === 'OPERATING').length || 0;
      const equipmentTotal = equipment?.length || 1;
      const equipmentUtilization = (equipmentActive / equipmentTotal) * 100;

      setKpis({
        activeProjects,
        totalContractValue,
        workforceCount: workforceCount || 0,
        equipmentUtilization: Math.round(equipmentUtilization),
        safetyIncidentRate: 0.8, // Would calculate from incidents table
        complianceScore: 94, // Would calculate from compliance checks
        budgetVariance: -2.3, // Would calculate from budget vs actual
        scheduledWorkDays: 180, // Would pull from projects
      });

      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrends = async () => {
    // Generate sample trend data
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const revenueTrendData: TrendData[] = [];
    const utilizationTrendData: TrendData[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      revenueTrendData.push({
        date: date.toLocaleDateString(),
        value: 1200000 + Math.random() * 300000,
      });
      utilizationTrendData.push({
        date: date.toLocaleDateString(),
        value: 70 + Math.random() * 20,
      });
    }

    setRevenueTrend(revenueTrendData);
    setUtilizationTrend(utilizationTrendData);
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  return (
    <div className="executive-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Executive Command</h1>
            <p className="header-subtitle">Organization-wide performance overview</p>
          </div>

          <div className="header-right">
            <div className="time-filter">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range as any)}
                  className={`time-filter-btn ${timeRange === range ? 'active' : ''}`}
                >
                  {range === '7d' ? 'Week' : range === '30d' ? 'Month' : 'Quarter'}
                </button>
              ))}
            </div>
            <button
              onClick={() => fetchKPIs()}
              disabled={isLoading}
              className="action-btn"
              title="Refresh Data"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button className="action-btn" title="Download Report">
              <Download className="w-5 h-5" />
            </button>
            <button className="action-btn" title="Settings">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card stat-card-primary" onClick={() => navigate('/projects')}>
          <div className="stat-icon">
            <Building />
          </div>
          <div className="stat-content">
            <span className="stat-label">Active Projects</span>
            <span className="stat-value">{kpis.activeProjects}</span>
            <span className="stat-change positive">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +8.3% vs prev
            </span>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-icon">
            <DollarSign />
          </div>
          <div className="stat-content">
            <span className="stat-label">Contract Value</span>
            <span className="stat-value">{formatCurrency(kpis.totalContractValue)}</span>
            <span className="stat-change positive">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              +12.5% vs prev
            </span>
          </div>
        </div>

        <div className="stat-card stat-card-info" onClick={() => navigate('/workforce')}>
          <div className="stat-icon">
            <Users />
          </div>
          <div className="stat-content">
            <span className="stat-label">Workforce</span>
            <span className="stat-value">{kpis.workforceCount}</span>
            <span className="stat-change neutral">
              Stable
            </span>
          </div>
        </div>

        <div className="stat-card stat-card-warning" onClick={() => navigate('/fleet')}>
          <div className="stat-icon">
            <Truck />
          </div>
          <div className="stat-content">
            <span className="stat-label">Fleet Utilization</span>
            <span className="stat-value">{kpis.equipmentUtilization}%</span>
            <span className="stat-change negative">
              <TrendingUp className="w-3 h-3 inline mr-1 rotate-180" />
              -3.2% vs prev
            </span>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="dashboard-grid">
        {/* Main Chart */}
        <div className="dashboard-card wide">
          <div className="card-header">
            <h3>Revenue Trend</h3>
            <span className="card-subtitle">Monthly Performance</span>
          </div>
          <div className="chart-container">
            <KPITrendChart
              title=""
              data={revenuetrend}
              unit="$"
              color="#3B82F6"
              target={1500000}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Quick Actions</h3>
          </div>
          <div className="quick-actions-grid">
            {[
              { label: 'View Projects', icon: Building, href: '/projects' },
              { label: 'Safety Dashboard', icon: ShieldCheck, href: '/safety' },
              { label: 'Fleet Status', icon: Truck, href: '/fleet' },
              { label: 'View Alerts', icon: Calendar, href: '/alerts' },
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={() => navigate(action.href)}
                className="action-card"
              >
                <action.icon className="action-icon" />
                <span className="action-label">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Secondary Grid */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3>Safety & Compliance</h3>
          </div>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>TRIR Rate</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{kpis.safetyIncidentRate}</div>
              </div>
              <ShieldCheck className="text-green-500 w-8 h-8" />
            </div>
            <div className="stat-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Compliance</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>{kpis.complianceScore}%</div>
              </div>
              <div style={{ color: '#10B981', fontWeight: 'bold' }}>On Track</div>
            </div>
          </div>
        </div>

        <div className="dashboard-card wide">
          <div className="card-header">
            <h3>System Alerts</h3>
            <span className="view-all-btn" onClick={() => navigate('/alerts')}>View All</span>
          </div>
          <div style={{ padding: '0' }}>
            <AlertSummaryWidget onViewAll={() => navigate('/alerts')} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveDashboard;
