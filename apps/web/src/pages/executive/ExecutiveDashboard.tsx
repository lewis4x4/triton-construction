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
    <div className="min-h-screen">
      {/* Header - now transparent/glassy in new layout, avoiding bg-white */}
      <div className="border-b border-white/10 bg-void-mid pt-20 pb-6 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(46,196,182,0.2)]">
                  <LayoutDashboard className="w-8 h-8 text-cyan-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight drop-shadow-lg">
                    Executive Command
                  </h1>
                  <p className="text-sm text-cyan-400/80 font-mono tracking-widest uppercase mt-1">
                    Organization-wide performance overview
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end mr-4">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">System Status</span>
                  <span className="flex items-center gap-2 text-xs text-green-400 font-mono">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    ONLINE
                  </span>
                </div>
                <div className="text-xs font-mono text-gray-400 border-r border-white/10 pr-4 mr-1">
                  SYNC: {lastRefresh.toLocaleTimeString([], { hour12: false })}
                </div>
                <button
                  onClick={() => fetchKPIs()}
                  disabled={isLoading}
                  className="p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group"
                  title="Refresh Data"
                >
                  <RefreshCw className={`w-5 h-5 text-gray-400 group-hover:text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
                  <Download className="w-5 h-5 text-gray-400 group-hover:text-cyan-400" />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group">
                  <Settings className="w-5 h-5 text-gray-400 group-hover:text-cyan-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
            title="Utlization"
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <KPITrendChart
            title="Equipment Utilization"
            data={utilizationTrend}
            unit="%"
            color="#10B981"
            target={85}
            timeRange={timeRange}
            onTimeRangeChange={setTimeRange}
          />
          <div className="gravity-card p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Project Status Overview</h3>
            <div className="space-y-4">
              {[
                { name: 'Corridor H Section 12', progress: 68, status: 'on-track' },
                { name: 'US-35 Bridge Replacement', progress: 45, status: 'at-risk' },
                { name: 'I-64 Widening Phase 2', progress: 12, status: 'on-track' },
              ].map((project, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-primary">{project.name}</span>
                    <span className={`px-2 py-0.5 text-xs rounded font-bold uppercase ${project.status === 'on-track' ? 'bg-green-900/30 text-green-400' :
                      project.status === 'at-risk' ? 'bg-yellow-900/30 text-yellow-400' :
                        'bg-red-900/30 text-red-400'
                      }`}>
                      {project.progress}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className={`h-full rounded-full ${project.status === 'on-track' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                        project.status === 'at-risk' ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' :
                          'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                        }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="gravity-card p-6">
          <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'View Projects', icon: Building, href: '/projects' },
              { label: 'Safety Dashboard', icon: ShieldCheck, href: '/safety' },
              { label: 'Fleet Status', icon: Truck, href: '/fleet' },
              { label: 'View Alerts', icon: Calendar, href: '/alerts' },
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={() => navigate(action.href)}
                className="flex items-center gap-3 p-4 rounded-xl border border-white/10 hover:bg-white/5 hover:border-cyan-500/50 transition-all text-left group"
              >
                <action.icon className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                <span className="text-sm font-medium text-primary group-hover:text-white">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveDashboard;
