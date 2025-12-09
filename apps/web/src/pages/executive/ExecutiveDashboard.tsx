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
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { KPICard } from '../../components/executive/KPICard';
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
    // Generate sample trend data - in production would fetch from kpi_snapshots
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
      <div className="command-header">
        <div className="command-header-content">
          <div className="command-title-wrapper">
            <div className="brand-section">
              <div className="brand-icon-box">
                <LayoutDashboard className="brand-icon" />
              </div>
              <div className="command-title">
                <h1>Executive Command</h1>
                <p className="command-subtitle">
                  Organization-wide performance overview
                </p>
              </div>
            </div>

            <div className="system-status-section">
              <div className="status-indicator">
                <span className="status-label">System Status</span>
                <span className="status-value">
                  <span className="status-dot"></span>
                  ONLINE
                </span>
              </div>
              <div className="sync-time">
                SYNC: {lastRefresh.toLocaleTimeString([], { hour12: false })}
              </div>
              <button
                onClick={() => fetchKPIs()}
                disabled={isLoading}
                className="icon-btn"
                title="Refresh Data"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button className="icon-btn" title="Download Report">
                <Download className="w-5 h-5" />
              </button>
              <button className="icon-btn" title="Settings">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="dashboard-content">
        {/* Top KPI Cards */}
        <div className="kpi-grid">
          <KPICard
            title="Active Projects"
            value={kpis.activeProjects}
            icon={<Building className="w-5 h-5" />}
            trend="up"
            percentChange={8.3}
            status="good"
            onClick={() => navigate('/projects')}
          />
          <KPICard
            title="Contract Value"
            value={formatCurrency(kpis.totalContractValue)}
            icon={<DollarSign className="w-5 h-5" />}
            trend="up"
            percentChange={12.5}
            trendIsGood={true}
            status="good"
          />
          <KPICard
            title="Workforce"
            value={kpis.workforceCount}
            unit="workers"
            icon={<Users className="w-5 h-5" />}
            trend="flat"
            percentChange={0}
            onClick={() => navigate('/workforce')}
          />
          <KPICard
            title="Utilization"
            value={kpis.equipmentUtilization}
            unit="%"
            icon={<Truck className="w-5 h-5" />}
            target={85}
            trend="down"
            percentChange={-3.2}
            trendIsGood={false}
            status={kpis.equipmentUtilization >= 80 ? 'good' : kpis.equipmentUtilization >= 60 ? 'warning' : 'critical'}
            onClick={() => navigate('/fleet')}
          />
        </div>

        {/* Safety & Compliance Row */}
        <div className="compliance-grid">
          <KPICard
            title="TRIR (Safety Rate)"
            value={kpis.safetyIncidentRate}
            description="Total Recordable Incident Rate per 200,000 hours"
            icon={<ShieldCheck className="w-5 h-5" />}
            target={1.0}
            trend="down"
            percentChange={-15.0}
            trendIsGood={true}
            status={kpis.safetyIncidentRate <= 1.0 ? 'good' : kpis.safetyIncidentRate <= 2.0 ? 'warning' : 'critical'}
            onClick={() => navigate('/safety')}
          />
          <KPICard
            title="Compliance Score"
            value={kpis.complianceScore}
            unit="%"
            icon={<ShieldCheck className="w-5 h-5" />}
            target={95}
            trend="up"
            percentChange={2.1}
            status={kpis.complianceScore >= 95 ? 'good' : kpis.complianceScore >= 85 ? 'warning' : 'critical'}
          />
          <KPICard
            title="Budget Variance"
            value={kpis.budgetVariance}
            unit="%"
            description="Positive = under budget, Negative = over budget"
            icon={<TrendingUp className="w-5 h-5" />}
            trend={kpis.budgetVariance >= 0 ? 'up' : 'down'}
            trendIsGood={kpis.budgetVariance >= 0}
            status={kpis.budgetVariance >= 0 ? 'good' : kpis.budgetVariance >= -5 ? 'warning' : 'critical'}
          />
        </div>

        {/* Charts & Widgets Row */}
        <div className="charts-grid">
          <div className="main-chart-col">
            <KPITrendChart
              title="Monthly Revenue"
              data={revenuetrend}
              unit="$"
              color="#3B82F6"
              target={1500000}
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
            />
          </div>
          <AlertSummaryWidget
            onViewAll={() => navigate('/alerts')}
          />
        </div>

        {/* Second Charts Row */}
        <div className="secondary-charts-grid">
          <KPITrendChart
            title="Equipment Utilization"
            data={utilizationTrend}
            unit="%"
            color="#10B981"
            target={85}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
          <div className="glass-panel">
            <h3 className="panel-title">Project Status Overview</h3>
            <div className="project-status-list">
              {[
                { name: 'Corridor H Section 12', progress: 68, status: 'on-track' },
                { name: 'US-35 Bridge Replacement', progress: 45, status: 'at-risk' },
                { name: 'I-64 Widening Phase 2', progress: 12, status: 'on-track' },
              ].map((project, idx) => (
                <div key={idx} className="project-status-item">
                  <div className="project-info">
                    <span className="project-name">{project.name}</span>
                    <span className={`status-badge ${project.status}`}>
                      {project.progress}%
                    </span>
                  </div>
                  <div className="progress-bar-track">
                    <div
                      className={`progress-bar-fill ${project.status}`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glass-panel">
          <h3 className="panel-title">Quick Actions</h3>
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
      </div>
    </div>
  );
}

export default ExecutiveDashboard;
