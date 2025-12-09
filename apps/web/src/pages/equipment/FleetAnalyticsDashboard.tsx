import { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  TrendingUp,
  DollarSign,
  Gauge,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Fuel,
  Activity,
  BarChart3,
  PieChart,
  Shield,
  RefreshCw,
  Download,
  Filter,
  ChevronRight,
  ChevronDown,
  Settings,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
  CheckCircle2,
  XCircle,
  Layers,
  Hash,
  Users,
  Building2,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';
import './FleetAnalyticsDashboard.css';

// ============================================================================
// INTERFACES
// ============================================================================

interface FleetKPI {
  label: string;
  value: string | number;
  previousValue?: string | number;
  change?: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'flat';
  subtitle?: string;
  color: string;
}

interface EquipmentStatus {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  activeCount: number;
  utilization: number;
  avgCostPerHour: number;
  totalHours: number;
  totalCost: number;
}

interface MaintenanceMetric {
  label: string;
  value: number;
  status: 'good' | 'warning' | 'critical' | 'neutral';
  details: string;
}

interface ProjectAllocation {
  projectId: string;
  projectName: string;
  projectNumber: string;
  equipmentCount: number;
  totalHours: number;
  totalCost: number;
  utilization: number;
}

interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: number;
  color: string;
}

interface UtilizationTrend {
  date: string;
  utilization: number;
  targetUtilization: number;
  equipmentActive: number;
  equipmentTotal: number;
}

interface FuelEfficiency {
  category: string;
  avgMpg: number;
  targetMpg: number;
  totalGallons: number;
  totalCost: number;
  variance: number;
}

interface AlertItem {
  id: string;
  type: 'maintenance' | 'inspection' | 'fuel' | 'compliance' | 'location';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  equipmentNumber: string;
  timestamp: string;
  actionRequired: boolean;
}

interface FleetHealthScore {
  overall: number;
  maintenance: number;
  utilization: number;
  compliance: number;
  costEfficiency: number;
  fuelEfficiency: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function FleetAnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Data states
  const [kpis, setKpis] = useState<FleetKPI[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<EquipmentStatus[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdown[]>([]);
  const [maintenanceMetrics, setMaintenanceMetrics] = useState<MaintenanceMetric[]>([]);
  const [projectAllocations, setProjectAllocations] = useState<ProjectAllocation[]>([]);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [utilizationTrends, setUtilizationTrends] = useState<UtilizationTrend[]>([]);
  const [fuelEfficiency, setFuelEfficiency] = useState<FuelEfficiency[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [healthScore, setHealthScore] = useState<FleetHealthScore | null>(null);
  const [totalEquipment, setTotalEquipment] = useState(0);
  const [totalFleetValue, setTotalFleetValue] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, selectedCategory, refreshKey]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Try to load real data
      const { data: equipmentData } = await supabase
        .from('v_equipment_fleet_overview')
        .select('*');

      if (equipmentData && equipmentData.length > 0) {
        processRealData(equipmentData);
      } else {
        loadDemoData();
      }
    } catch (error) {
      console.error('Error loading fleet analytics:', error);
      loadDemoData();
    } finally {
      setIsLoading(false);
    }
  };

  const processRealData = (data: any[]) => {
    // Process real equipment data into analytics
    const total = data.length;
    setTotalEquipment(total);

    // Calculate status breakdown
    const statusCounts: Record<string, number> = {};
    data.forEach(item => {
      const status = item.equipment_status || item.status || 'unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const statusData: EquipmentStatus[] = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
      percentage: (count / total) * 100,
      color: getStatusColor(status),
    }));
    setStatusBreakdown(statusData);

    // Calculate category breakdown
    const categoryData: Record<string, CategoryBreakdown> = {};
    data.forEach(item => {
      const cat = item.equipment_category || 'Other';
      if (!categoryData[cat]) {
        categoryData[cat] = {
          category: cat,
          count: 0,
          activeCount: 0,
          utilization: 0,
          avgCostPerHour: 0,
          totalHours: 0,
          totalCost: 0,
        };
      }
      categoryData[cat].count++;
      if (item.equipment_status === 'active' || item.status === 'ACTIVE') {
        categoryData[cat].activeCount++;
      }
      categoryData[cat].totalHours += item.current_engine_hours || 0;
      categoryData[cat].totalCost += (item.hourly_total_cost || 0) * (item.current_engine_hours || 0);
    });

    Object.values(categoryData).forEach(cat => {
      cat.utilization = cat.count > 0 ? (cat.activeCount / cat.count) * 100 : 0;
      cat.avgCostPerHour = cat.totalHours > 0 ? cat.totalCost / cat.totalHours : 0;
    });

    setCategoryBreakdown(Object.values(categoryData));

    // Generate KPIs from real data
    generateKPIs(data, statusData);
    generateMaintenanceMetrics(data);
    generateAlerts(data);
    calculateHealthScore(data);

    // Load demo data for features without real data
    loadPartialDemoData();
  };

  const loadDemoData = () => {
    // Comprehensive demo data for enterprise dashboard
    setTotalEquipment(247);
    setTotalFleetValue(48750000);

    // Executive KPIs
    setKpis([
      {
        label: 'Total Fleet Value',
        value: '$48.75M',
        previousValue: '$47.2M',
        change: 3.3,
        changeType: 'positive',
        icon: <DollarSign size={24} />,
        trend: 'up',
        subtitle: '247 units',
        color: '#3b82f6',
      },
      {
        label: 'Fleet Utilization',
        value: '78.4%',
        previousValue: '72.1%',
        change: 8.7,
        changeType: 'positive',
        icon: <Activity size={24} />,
        trend: 'up',
        subtitle: 'vs 75% target',
        color: '#10b981',
      },
      {
        label: 'Operating Cost/Hour',
        value: '$127.45',
        previousValue: '$132.80',
        change: -4.0,
        changeType: 'positive',
        icon: <Gauge size={24} />,
        trend: 'down',
        subtitle: '-$5.35 savings',
        color: '#8b5cf6',
      },
      {
        label: 'Maintenance Compliance',
        value: '94.2%',
        previousValue: '91.8%',
        change: 2.6,
        changeType: 'positive',
        icon: <Wrench size={24} />,
        trend: 'up',
        subtitle: '232/247 compliant',
        color: '#f59e0b',
      },
      {
        label: 'Downtime',
        value: '3.2%',
        previousValue: '4.8%',
        change: -33.3,
        changeType: 'positive',
        icon: <Clock size={24} />,
        trend: 'down',
        subtitle: '8 units down',
        color: '#ef4444',
      },
      {
        label: 'Fuel Efficiency',
        value: '+12.3%',
        previousValue: '+8.7%',
        change: 41.4,
        changeType: 'positive',
        icon: <Fuel size={24} />,
        trend: 'up',
        subtitle: 'vs baseline',
        color: '#06b6d4',
      },
    ]);

    // Status breakdown
    setStatusBreakdown([
      { status: 'Active', count: 186, percentage: 75.3, color: '#10b981' },
      { status: 'Idle', count: 28, percentage: 11.3, color: '#6b7280' },
      { status: 'In Maintenance', count: 18, percentage: 7.3, color: '#f59e0b' },
      { status: 'Down', count: 8, percentage: 3.2, color: '#ef4444' },
      { status: 'In Transit', count: 7, percentage: 2.8, color: '#3b82f6' },
    ]);

    // Category breakdown
    setCategoryBreakdown([
      { category: 'Excavators', count: 42, activeCount: 38, utilization: 90.5, avgCostPerHour: 185.50, totalHours: 84200, totalCost: 15619100 },
      { category: 'Dozers', count: 28, activeCount: 24, utilization: 85.7, avgCostPerHour: 165.25, totalHours: 56400, totalCost: 9320100 },
      { category: 'Loaders', count: 35, activeCount: 30, utilization: 85.7, avgCostPerHour: 142.75, totalHours: 70500, totalCost: 10063875 },
      { category: 'Graders', count: 18, activeCount: 15, utilization: 83.3, avgCostPerHour: 178.90, totalHours: 36200, totalCost: 6476180 },
      { category: 'Trucks', count: 56, activeCount: 48, utilization: 85.7, avgCostPerHour: 95.50, totalHours: 112800, totalCost: 10772400 },
      { category: 'Compactors', count: 22, activeCount: 18, utilization: 81.8, avgCostPerHour: 125.00, totalHours: 44200, totalCost: 5525000 },
      { category: 'Cranes', count: 12, activeCount: 10, utilization: 83.3, avgCostPerHour: 285.00, totalHours: 24100, totalCost: 6868500 },
      { category: 'Other', count: 34, activeCount: 28, utilization: 82.4, avgCostPerHour: 98.75, totalHours: 68400, totalCost: 6754500 },
    ]);

    // Maintenance metrics
    setMaintenanceMetrics([
      { label: 'Scheduled Services', value: 94.2, status: 'good', details: '232 of 247 on schedule' },
      { label: 'PM Compliance', value: 91.8, status: 'good', details: 'Last 90 days' },
      { label: 'Unplanned Repairs', value: 8, status: 'warning', details: '3.2% of fleet' },
      { label: 'Avg Repair Time', value: 4.2, status: 'good', details: '4.2 days average' },
      { label: 'Parts Availability', value: 97.5, status: 'good', details: 'In-stock rate' },
      { label: 'Warranty Claims', value: 12, status: 'neutral', details: 'Active claims' },
    ]);

    // Project allocations
    setProjectAllocations([
      { projectId: 'p1', projectName: 'Corridor H - Section 12', projectNumber: '2024-001', equipmentCount: 45, totalHours: 89200, totalCost: 12458000, utilization: 87.2 },
      { projectId: 'p2', projectName: 'Route 50 Bridge Repair', projectNumber: '2024-002', equipmentCount: 32, totalHours: 64800, totalCost: 8942000, utilization: 82.5 },
      { projectId: 'p3', projectName: 'I-64 Interchange', projectNumber: '2024-003', equipmentCount: 38, totalHours: 76400, totalCost: 10284000, utilization: 79.8 },
      { projectId: 'p4', projectName: 'US-19 Widening', projectNumber: '2024-004', equipmentCount: 28, totalHours: 56200, totalCost: 7856000, utilization: 84.1 },
      { projectId: 'p5', projectName: 'WV-9 Reconstruction', projectNumber: '2024-005', equipmentCount: 24, totalHours: 48400, totalCost: 6724000, utilization: 76.3 },
    ]);

    // Cost breakdown
    setCostBreakdown([
      { category: 'Fuel', amount: 8245000, percentage: 32.4, trend: -2.3, color: '#ef4444' },
      { category: 'Maintenance', amount: 5680000, percentage: 22.3, trend: -5.1, color: '#f59e0b' },
      { category: 'Depreciation', amount: 4875000, percentage: 19.2, trend: 0, color: '#6b7280' },
      { category: 'Labor (Operators)', amount: 3420000, percentage: 13.4, trend: 3.2, color: '#3b82f6' },
      { category: 'Insurance', amount: 1845000, percentage: 7.3, trend: 4.5, color: '#8b5cf6' },
      { category: 'Other', amount: 1385000, percentage: 5.4, trend: 1.2, color: '#6366f1' },
    ]);

    // Utilization trends (last 30 days)
    const trends: UtilizationTrend[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const baseUtil = 75 + Math.random() * 10;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      trends.push({
        date: date.toISOString().split('T')[0] || '',
        utilization: isWeekend ? baseUtil * 0.4 : baseUtil,
        targetUtilization: 75,
        equipmentActive: isWeekend ? Math.floor(186 * 0.4) : 186,
        equipmentTotal: 247,
      });
    }
    setUtilizationTrends(trends);

    // Fuel efficiency by category
    setFuelEfficiency([
      { category: 'Excavators', avgMpg: 4.2, targetMpg: 4.0, totalGallons: 156800, totalCost: 548800, variance: 5.0 },
      { category: 'Dozers', avgMpg: 3.8, targetMpg: 3.5, totalGallons: 124500, totalCost: 435750, variance: 8.6 },
      { category: 'Loaders', avgMpg: 5.1, targetMpg: 4.8, totalGallons: 98200, totalCost: 343700, variance: 6.3 },
      { category: 'Graders', avgMpg: 4.5, targetMpg: 4.2, totalGallons: 68400, totalCost: 239400, variance: 7.1 },
      { category: 'Trucks', avgMpg: 8.2, targetMpg: 7.5, totalGallons: 186500, totalCost: 652750, variance: 9.3 },
      { category: 'Compactors', avgMpg: 4.8, targetMpg: 4.5, totalGallons: 54200, totalCost: 189700, variance: 6.7 },
    ]);

    // Alerts
    setAlerts([
      { id: '1', type: 'maintenance', severity: 'critical', title: 'Overdue Service', description: 'CAT 336 #EQ-0042 is 127 hours past scheduled PM', equipmentNumber: 'EQ-0042', timestamp: '2 hours ago', actionRequired: true },
      { id: '2', type: 'inspection', severity: 'critical', title: 'DOT Inspection Expired', description: 'Peterbilt 389 #TR-0018 annual inspection expired 3 days ago', equipmentNumber: 'TR-0018', timestamp: '3 days ago', actionRequired: true },
      { id: '3', type: 'fuel', severity: 'warning', title: 'Fuel Anomaly Detected', description: 'Unusual fuel consumption pattern on JD 850K #EQ-0089', equipmentNumber: 'EQ-0089', timestamp: '5 hours ago', actionRequired: true },
      { id: '4', type: 'location', severity: 'warning', title: 'Location Conflict', description: 'Komatsu PC490 #EQ-0056 GPS shows location outside assigned project', equipmentNumber: 'EQ-0056', timestamp: '1 day ago', actionRequired: true },
      { id: '5', type: 'compliance', severity: 'warning', title: 'Certification Expiring', description: 'OSHA crane certification expiring in 14 days for Liebherr LTM #CR-0008', equipmentNumber: 'CR-0008', timestamp: '2 days ago', actionRequired: false },
      { id: '6', type: 'maintenance', severity: 'info', title: 'Service Due Soon', description: 'CAT 980M #EQ-0023 due for 500-hour service in 45 hours', equipmentNumber: 'EQ-0023', timestamp: '4 hours ago', actionRequired: false },
    ]);

    // Health score
    setHealthScore({
      overall: 87,
      maintenance: 94,
      utilization: 78,
      compliance: 92,
      costEfficiency: 85,
      fuelEfficiency: 88,
    });
  };

  const loadPartialDemoData = () => {
    // Load demo data for sections without real data
    setProjectAllocations([
      { projectId: 'p1', projectName: 'Corridor H - Section 12', projectNumber: '2024-001', equipmentCount: 45, totalHours: 89200, totalCost: 12458000, utilization: 87.2 },
      { projectId: 'p2', projectName: 'Route 50 Bridge Repair', projectNumber: '2024-002', equipmentCount: 32, totalHours: 64800, totalCost: 8942000, utilization: 82.5 },
    ]);

    setCostBreakdown([
      { category: 'Fuel', amount: 8245000, percentage: 32.4, trend: -2.3, color: '#ef4444' },
      { category: 'Maintenance', amount: 5680000, percentage: 22.3, trend: -5.1, color: '#f59e0b' },
      { category: 'Depreciation', amount: 4875000, percentage: 19.2, trend: 0, color: '#6b7280' },
      { category: 'Labor', amount: 3420000, percentage: 13.4, trend: 3.2, color: '#3b82f6' },
      { category: 'Insurance', amount: 1845000, percentage: 7.3, trend: 4.5, color: '#8b5cf6' },
      { category: 'Other', amount: 1385000, percentage: 5.4, trend: 1.2, color: '#6366f1' },
    ]);

    const trends: UtilizationTrend[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const baseUtil = 75 + Math.random() * 10;
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      trends.push({
        date: date.toISOString().split('T')[0] || '',
        utilization: isWeekend ? baseUtil * 0.4 : baseUtil,
        targetUtilization: 75,
        equipmentActive: isWeekend ? Math.floor(186 * 0.4) : 186,
        equipmentTotal: 247,
      });
    }
    setUtilizationTrends(trends);
  };

  const generateKPIs = (data: any[], _statusData: EquipmentStatus[]) => {
    const total = data.length;
    const activeCount = data.filter(e => e.equipment_status === 'active' || e.status === 'ACTIVE').length;
    const maintenanceCount = data.filter(e => e.equipment_status === 'in_maintenance' || e.status === 'MAINTENANCE').length;
    const downCount = data.filter(e => e.equipment_status === 'down' || e.status === 'DOWN').length;
    const utilization = total > 0 ? (activeCount / total) * 100 : 0;
    const downtime = total > 0 ? (downCount / total) * 100 : 0;
    const compliant = data.filter(e => e.maintenance_status !== 'OVERDUE').length;
    const compliance = total > 0 ? (compliant / total) * 100 : 0;

    setKpis([
      {
        label: 'Total Equipment',
        value: total,
        changeType: 'neutral',
        icon: <Truck size={24} />,
        subtitle: 'Fleet size',
        color: '#3b82f6',
      },
      {
        label: 'Fleet Utilization',
        value: `${utilization.toFixed(1)}%`,
        change: 0,
        changeType: utilization >= 75 ? 'positive' : 'negative',
        icon: <Activity size={24} />,
        trend: utilization >= 75 ? 'up' : 'down',
        subtitle: `${activeCount} active`,
        color: '#10b981',
      },
      {
        label: 'In Maintenance',
        value: maintenanceCount,
        changeType: maintenanceCount <= 5 ? 'positive' : 'negative',
        icon: <Wrench size={24} />,
        subtitle: `${((maintenanceCount / total) * 100).toFixed(1)}% of fleet`,
        color: '#f59e0b',
      },
      {
        label: 'Maintenance Compliance',
        value: `${compliance.toFixed(1)}%`,
        changeType: compliance >= 90 ? 'positive' : 'negative',
        icon: <CheckCircle size={24} />,
        trend: compliance >= 90 ? 'up' : 'down',
        subtitle: `${compliant}/${total} compliant`,
        color: '#8b5cf6',
      },
      {
        label: 'Downtime',
        value: `${downtime.toFixed(1)}%`,
        changeType: downtime <= 5 ? 'positive' : 'negative',
        icon: <Clock size={24} />,
        trend: downtime <= 5 ? 'down' : 'up',
        subtitle: `${downCount} units`,
        color: '#ef4444',
      },
    ]);
  };

  const generateMaintenanceMetrics = (data: any[]) => {
    const total = data.length;
    const overdueCount = data.filter(e => e.maintenance_status === 'OVERDUE').length;
    const dueSoonCount = data.filter(e => e.maintenance_status === 'DUE_SOON' || e.maintenance_status === 'HOURS_DUE_SOON').length;
    const compliantCount = total - overdueCount - dueSoonCount;

    setMaintenanceMetrics([
      { label: 'Scheduled Services', value: ((compliantCount / total) * 100), status: compliantCount / total >= 0.9 ? 'good' : 'warning', details: `${compliantCount} of ${total} on schedule` },
      { label: 'Overdue Services', value: overdueCount, status: overdueCount === 0 ? 'good' : overdueCount <= 5 ? 'warning' : 'critical', details: `${overdueCount} need immediate attention` },
      { label: 'Due Soon', value: dueSoonCount, status: dueSoonCount <= 10 ? 'good' : 'warning', details: `Within next 30 days/100 hours` },
    ]);
  };

  const generateAlerts = (data: any[]) => {
    const alertList: AlertItem[] = [];

    data.forEach(item => {
      if (item.maintenance_status === 'OVERDUE') {
        alertList.push({
          id: item.id,
          type: 'maintenance',
          severity: 'critical',
          title: 'Maintenance Overdue',
          description: `${item.make} ${item.model} is past scheduled service`,
          equipmentNumber: item.equipment_number,
          timestamp: 'Overdue',
          actionRequired: true,
        });
      }
      if (item.inspection_status === 'OVERDUE') {
        alertList.push({
          id: `${item.id}-insp`,
          type: 'inspection',
          severity: 'critical',
          title: 'Inspection Overdue',
          description: `Annual inspection is overdue`,
          equipmentNumber: item.equipment_number,
          timestamp: 'Overdue',
          actionRequired: true,
        });
      }
      if (item.location_conflict_flagged) {
        alertList.push({
          id: `${item.id}-loc`,
          type: 'location',
          severity: 'warning',
          title: 'Location Conflict',
          description: 'GPS location does not match assigned project',
          equipmentNumber: item.equipment_number,
          timestamp: 'Recent',
          actionRequired: true,
        });
      }
    });

    setAlerts(alertList.slice(0, 10));
  };

  const calculateHealthScore = (data: any[]) => {
    const total = data.length;
    if (total === 0) {
      setHealthScore({ overall: 0, maintenance: 0, utilization: 0, compliance: 0, costEfficiency: 0, fuelEfficiency: 0 });
      return;
    }

    const activeCount = data.filter(e => e.equipment_status === 'active' || e.status === 'ACTIVE').length;
    const compliantCount = data.filter(e => e.maintenance_status !== 'OVERDUE').length;
    const inspCompliant = data.filter(e => e.inspection_status !== 'OVERDUE').length;

    const maintenance = (compliantCount / total) * 100;
    const utilization = (activeCount / total) * 100;
    const compliance = (inspCompliant / total) * 100;
    const overall = (maintenance * 0.3 + utilization * 0.25 + compliance * 0.25 + 80 * 0.1 + 85 * 0.1);

    setHealthScore({
      overall: Math.round(overall),
      maintenance: Math.round(maintenance),
      utilization: Math.round(utilization),
      compliance: Math.round(compliance),
      costEfficiency: 80,
      fuelEfficiency: 85,
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'available':
        return '#10b981';
      case 'idle':
        return '#6b7280';
      case 'in_maintenance':
      case 'maintenance':
        return '#f59e0b';
      case 'down':
        return '#ef4444';
      case 'in_transit':
        return '#3b82f6';
      default:
        return '#9ca3af';
    }
  };

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const getHealthScoreColor = (score: number): string => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getHealthScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle size={18} className="alert-icon critical" />;
      case 'warning':
        return <AlertTriangle size={18} className="alert-icon warning" />;
      default:
        return <Info size={18} className="alert-icon info" />;
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'flat', changeType?: string) => {
    if (trend === 'up') {
      return <ArrowUpRight size={16} className={changeType === 'positive' ? 'trend-positive' : 'trend-negative'} />;
    }
    if (trend === 'down') {
      return <ArrowDownRight size={16} className={changeType === 'positive' ? 'trend-positive' : 'trend-negative'} />;
    }
    return <Minus size={16} className="trend-neutral" />;
  };

  // Calculate summary stats
  const criticalAlerts = useMemo(() => alerts.filter(a => a.severity === 'critical').length, [alerts]);
  const warningAlerts = useMemo(() => alerts.filter(a => a.severity === 'warning').length, [alerts]);

  const totalCost = useMemo(() => costBreakdown.reduce((sum, c) => sum + c.amount, 0), [costBreakdown]);

  // Utilization chart data
  const maxUtilization = useMemo(() => {
    if (utilizationTrends.length === 0) return 100;
    return Math.max(...utilizationTrends.map(t => t.utilization), 100);
  }, [utilizationTrends]);

  if (isLoading) {
    return (
      <div className="fleet-analytics-dashboard loading-state">
        <div className="loading-spinner">
          <RefreshCw size={48} className="spinning" />
          <h2>Loading Fleet Analytics</h2>
          <p>Aggregating data from {totalEquipment || 247} equipment units...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fleet-analytics-dashboard">
      {/* ================================================================== */}
      {/* HEADER */}
      {/* ================================================================== */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-title">
            <BarChart3 size={32} />
            <div>
              <h1>Fleet Analytics</h1>
              <p className="header-subtitle">Enterprise Fleet Management Intelligence</p>
            </div>
          </div>
          <div className="header-meta">
            <span className="meta-item">
              <Truck size={16} />
              {totalEquipment} Units
            </span>
            <span className="meta-item">
              <DollarSign size={16} />
              {formatCurrency(totalFleetValue)} Fleet Value
            </span>
            <span className="meta-item">
              <Calendar size={16} />
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
        <div className="header-actions">
          <div className="date-range-selector">
            <button
              className={`range-btn ${dateRange === '7d' ? 'active' : ''}`}
              onClick={() => setDateRange('7d')}
            >
              7D
            </button>
            <button
              className={`range-btn ${dateRange === '30d' ? 'active' : ''}`}
              onClick={() => setDateRange('30d')}
            >
              30D
            </button>
            <button
              className={`range-btn ${dateRange === '90d' ? 'active' : ''}`}
              onClick={() => setDateRange('90d')}
            >
              90D
            </button>
            <button
              className={`range-btn ${dateRange === 'ytd' ? 'active' : ''}`}
              onClick={() => setDateRange('ytd')}
            >
              YTD
            </button>
          </div>
          <button
            className={`btn btn-icon ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} />
          </button>
          <button className="btn btn-secondary" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw size={18} />
            Refresh
          </button>
          <button className="btn btn-secondary">
            <Download size={18} />
            Export
          </button>
          <Link to="/equipment/manage" className="btn btn-primary">
            <Settings size={18} />
            Manage Fleet
          </Link>
        </div>
      </header>

      {/* Filters Panel */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filter-group">
            <label>Category</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {categoryBreakdown.map(cat => (
                <option key={cat.category} value={cat.category}>{cat.category}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="idle">Idle</option>
              <option value="maintenance">In Maintenance</option>
              <option value="down">Down</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Project</label>
            <select>
              <option value="all">All Projects</option>
              {projectAllocations.map(p => (
                <option key={p.projectId} value={p.projectId}>{p.projectNumber}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* FLEET HEALTH SCORE BANNER */}
      {/* ================================================================== */}
      {healthScore && (
        <div className="health-score-banner">
          <div className="health-main">
            <div className="health-score-circle" style={{ '--score-color': getHealthScoreColor(healthScore.overall) } as React.CSSProperties}>
              <svg viewBox="0 0 100 100">
                <circle className="score-bg" cx="50" cy="50" r="45" />
                <circle
                  className="score-fill"
                  cx="50"
                  cy="50"
                  r="45"
                  style={{
                    strokeDasharray: `${healthScore.overall * 2.83} 283`,
                    stroke: getHealthScoreColor(healthScore.overall),
                  }}
                />
              </svg>
              <div className="score-content">
                <span className="score-value">{healthScore.overall}</span>
                <span className="score-label">{getHealthScoreLabel(healthScore.overall)}</span>
              </div>
            </div>
            <div className="health-info">
              <h2>Fleet Health Score</h2>
              <p>Overall operational health based on 6 key metrics</p>
            </div>
          </div>
          <div className="health-metrics">
            <div className="health-metric">
              <div className="metric-header">
                <Wrench size={16} />
                <span>Maintenance</span>
              </div>
              <div className="metric-bar">
                <div className="bar-fill" style={{ width: `${healthScore.maintenance}%`, backgroundColor: getHealthScoreColor(healthScore.maintenance) }} />
              </div>
              <span className="metric-value">{healthScore.maintenance}%</span>
            </div>
            <div className="health-metric">
              <div className="metric-header">
                <Activity size={16} />
                <span>Utilization</span>
              </div>
              <div className="metric-bar">
                <div className="bar-fill" style={{ width: `${healthScore.utilization}%`, backgroundColor: getHealthScoreColor(healthScore.utilization) }} />
              </div>
              <span className="metric-value">{healthScore.utilization}%</span>
            </div>
            <div className="health-metric">
              <div className="metric-header">
                <Shield size={16} />
                <span>Compliance</span>
              </div>
              <div className="metric-bar">
                <div className="bar-fill" style={{ width: `${healthScore.compliance}%`, backgroundColor: getHealthScoreColor(healthScore.compliance) }} />
              </div>
              <span className="metric-value">{healthScore.compliance}%</span>
            </div>
            <div className="health-metric">
              <div className="metric-header">
                <DollarSign size={16} />
                <span>Cost Efficiency</span>
              </div>
              <div className="metric-bar">
                <div className="bar-fill" style={{ width: `${healthScore.costEfficiency}%`, backgroundColor: getHealthScoreColor(healthScore.costEfficiency) }} />
              </div>
              <span className="metric-value">{healthScore.costEfficiency}%</span>
            </div>
            <div className="health-metric">
              <div className="metric-header">
                <Fuel size={16} />
                <span>Fuel Efficiency</span>
              </div>
              <div className="metric-bar">
                <div className="bar-fill" style={{ width: `${healthScore.fuelEfficiency}%`, backgroundColor: getHealthScoreColor(healthScore.fuelEfficiency) }} />
              </div>
              <span className="metric-value">{healthScore.fuelEfficiency}%</span>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* KPI CARDS */}
      {/* ================================================================== */}
      <section className="kpi-section">
        <div className="kpi-grid">
          {kpis.map((kpi, index) => (
            <div key={index} className="kpi-card" style={{ '--kpi-color': kpi.color } as React.CSSProperties}>
              <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}>
                {kpi.icon}
              </div>
              <div className="kpi-content">
                <span className="kpi-label">{kpi.label}</span>
                <div className="kpi-value-row">
                  <span className="kpi-value">{kpi.value}</span>
                  {kpi.change !== undefined && (
                    <span className={`kpi-change ${kpi.changeType}`}>
                      {getTrendIcon(kpi.trend, kpi.changeType)}
                      {Math.abs(kpi.change).toFixed(1)}%
                    </span>
                  )}
                </div>
                {kpi.subtitle && <span className="kpi-subtitle">{kpi.subtitle}</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================================================================== */}
      {/* ALERTS BANNER */}
      {/* ================================================================== */}
      {(criticalAlerts > 0 || warningAlerts > 0) && (
        <section className="alerts-banner">
          <div className="alert-summary">
            {criticalAlerts > 0 && (
              <div className="alert-count critical">
                <XCircle size={20} />
                <span>{criticalAlerts} Critical</span>
              </div>
            )}
            {warningAlerts > 0 && (
              <div className="alert-count warning">
                <AlertTriangle size={20} />
                <span>{warningAlerts} Warnings</span>
              </div>
            )}
          </div>
          <div className="alerts-scroll">
            {alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className={`alert-item ${alert.severity}`}>
                {getSeverityIcon(alert.severity)}
                <div className="alert-content">
                  <span className="alert-title">{alert.title}</span>
                  <span className="alert-equipment">{alert.equipmentNumber}</span>
                </div>
                <ChevronRight size={16} />
              </div>
            ))}
          </div>
          <Link to="/equipment/alerts" className="view-all-link">
            View All Alerts
            <ChevronRight size={16} />
          </Link>
        </section>
      )}

      {/* ================================================================== */}
      {/* MAIN CONTENT GRID */}
      {/* ================================================================== */}
      <div className="analytics-grid">
        {/* Fleet Status Overview */}
        <section className="analytics-card status-overview">
          <div className="card-header">
            <h3>
              <PieChart size={20} />
              Fleet Status Overview
            </h3>
            <Link to="/equipment" className="card-link">
              View All
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="card-content">
            <div className="status-chart">
              <div className="donut-chart">
                <svg viewBox="0 0 100 100">
                  {statusBreakdown.reduce((acc, status, index) => {
                    const prevTotal = statusBreakdown.slice(0, index).reduce((sum, s) => sum + s.percentage, 0);
                    const dashArray = `${status.percentage * 2.51} ${251 - status.percentage * 2.51}`;
                    const rotation = (prevTotal / 100) * 360 - 90;
                    acc.push(
                      <circle
                        key={status.status}
                        className="donut-segment"
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        strokeWidth="20"
                        stroke={status.color}
                        strokeDasharray={dashArray}
                        transform={`rotate(${rotation} 50 50)`}
                      />
                    );
                    return acc;
                  }, [] as JSX.Element[])}
                </svg>
                <div className="donut-center">
                  <span className="donut-value">{totalEquipment}</span>
                  <span className="donut-label">Total</span>
                </div>
              </div>
            </div>
            <div className="status-legend">
              {statusBreakdown.map((status) => (
                <div key={status.status} className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: status.color }} />
                  <span className="legend-label">{status.status}</span>
                  <span className="legend-value">{status.count}</span>
                  <span className="legend-percent">{status.percentage.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Utilization Trend Chart */}
        <section className="analytics-card utilization-trend">
          <div className="card-header">
            <h3>
              <TrendingUp size={20} />
              Utilization Trend
            </h3>
            <div className="chart-legend">
              <span className="legend-item">
                <span className="legend-color actual" />
                Actual
              </span>
              <span className="legend-item">
                <span className="legend-color target" />
                Target (75%)
              </span>
            </div>
          </div>
          <div className="card-content">
            <div className="trend-chart">
              <div className="chart-y-axis">
                <span>100%</span>
                <span>75%</span>
                <span>50%</span>
                <span>25%</span>
                <span>0%</span>
              </div>
              <div className="chart-area">
                <div className="target-line" style={{ bottom: '75%' }} />
                <div className="chart-bars">
                  {utilizationTrends.map((day, index) => (
                    <div key={index} className="chart-bar-container">
                      <div
                        className={`chart-bar ${day.utilization >= 75 ? 'above-target' : 'below-target'}`}
                        style={{ height: `${(day.utilization / maxUtilization) * 100}%` }}
                        title={`${day.date}: ${day.utilization.toFixed(1)}%`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="chart-x-axis">
              {utilizationTrends.filter((_, i) => i % 5 === 0).map((day) => (
                <span key={day.date}>{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Category Performance */}
        <section className="analytics-card category-performance">
          <div className="card-header">
            <h3>
              <Layers size={20} />
              Category Performance
            </h3>
            <button className="btn btn-icon btn-sm">
              <ChevronDown size={16} />
            </button>
          </div>
          <div className="card-content">
            <div className="category-table">
              <div className="table-header">
                <span>Category</span>
                <span>Units</span>
                <span>Utilization</span>
                <span>Cost/Hr</span>
                <span>Total Cost</span>
              </div>
              {categoryBreakdown.slice(0, 6).map((cat) => (
                <div key={cat.category} className="table-row">
                  <span className="category-name">{cat.category}</span>
                  <span className="category-units">
                    <span className="active-count">{cat.activeCount}</span>
                    <span className="total-count">/{cat.count}</span>
                  </span>
                  <span className="category-utilization">
                    <div className="mini-bar">
                      <div
                        className="mini-bar-fill"
                        style={{
                          width: `${cat.utilization}%`,
                          backgroundColor: cat.utilization >= 80 ? '#10b981' : cat.utilization >= 60 ? '#f59e0b' : '#ef4444',
                        }}
                      />
                    </div>
                    <span>{cat.utilization.toFixed(0)}%</span>
                  </span>
                  <span className="category-cost">${cat.avgCostPerHour.toFixed(0)}</span>
                  <span className="category-total">{formatCurrency(cat.totalCost)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Cost Breakdown */}
        <section className="analytics-card cost-breakdown">
          <div className="card-header">
            <h3>
              <DollarSign size={20} />
              Operating Cost Breakdown
            </h3>
            <span className="total-label">
              Total: {formatCurrency(totalCost)}
            </span>
          </div>
          <div className="card-content">
            <div className="cost-bars">
              {costBreakdown.map((cost) => (
                <div key={cost.category} className="cost-bar-item">
                  <div className="cost-bar-header">
                    <span className="cost-category">{cost.category}</span>
                    <span className="cost-amount">{formatCurrency(cost.amount)}</span>
                  </div>
                  <div className="cost-bar">
                    <div
                      className="cost-bar-fill"
                      style={{ width: `${cost.percentage}%`, backgroundColor: cost.color }}
                    />
                    <span className="cost-percentage">{cost.percentage.toFixed(1)}%</span>
                  </div>
                  <span className={`cost-trend ${cost.trend < 0 ? 'positive' : cost.trend > 0 ? 'negative' : ''}`}>
                    {cost.trend < 0 ? <ArrowDownRight size={14} /> : cost.trend > 0 ? <ArrowUpRight size={14} /> : <Minus size={14} />}
                    {Math.abs(cost.trend).toFixed(1)}% vs prev period
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Project Allocation */}
        <section className="analytics-card project-allocation">
          <div className="card-header">
            <h3>
              <Building2 size={20} />
              Project Equipment Allocation
            </h3>
            <Link to="/projects" className="card-link">
              All Projects
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="card-content">
            <div className="project-list">
              {projectAllocations.map((project) => (
                <div key={project.projectId} className="project-item">
                  <div className="project-header">
                    <div className="project-info">
                      <span className="project-number">{project.projectNumber}</span>
                      <span className="project-name">{project.projectName}</span>
                    </div>
                    <div className="project-stats">
                      <span className="equipment-count">
                        <Truck size={14} />
                        {project.equipmentCount}
                      </span>
                    </div>
                  </div>
                  <div className="project-metrics">
                    <div className="metric">
                      <span className="metric-label">Hours</span>
                      <span className="metric-value">{formatNumber(project.totalHours)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Cost</span>
                      <span className="metric-value">{formatCurrency(project.totalCost)}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">Utilization</span>
                      <span className={`metric-value ${project.utilization >= 80 ? 'good' : project.utilization >= 60 ? 'warning' : 'poor'}`}>
                        {project.utilization.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="project-utilization-bar">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${project.utilization}%`,
                        backgroundColor: project.utilization >= 80 ? '#10b981' : project.utilization >= 60 ? '#f59e0b' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Maintenance Status */}
        <section className="analytics-card maintenance-status">
          <div className="card-header">
            <h3>
              <Wrench size={20} />
              Maintenance Status
            </h3>
            <Link to="/equipment/maintenance" className="card-link">
              Schedule
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="card-content">
            <div className="maintenance-grid">
              {maintenanceMetrics.map((metric, index) => (
                <div key={index} className={`maintenance-metric ${metric.status}`}>
                  <div className="metric-icon">
                    {metric.status === 'good' && <CheckCircle2 size={24} />}
                    {metric.status === 'warning' && <AlertTriangle size={24} />}
                    {metric.status === 'critical' && <XCircle size={24} />}
                    {metric.status === 'neutral' && <Info size={24} />}
                  </div>
                  <div className="metric-content">
                    <span className="metric-label">{metric.label}</span>
                    <span className="metric-value">
                      {typeof metric.value === 'number' && metric.value > 100 ? metric.value : `${metric.value.toFixed(1)}%`}
                    </span>
                    <span className="metric-details">{metric.details}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Fuel Efficiency */}
        <section className="analytics-card fuel-efficiency">
          <div className="card-header">
            <h3>
              <Fuel size={20} />
              Fuel Efficiency by Category
            </h3>
            <Link to="/equipment/fuel" className="card-link">
              Fuel Dashboard
              <ChevronRight size={16} />
            </Link>
          </div>
          <div className="card-content">
            <div className="fuel-table">
              <div className="table-header">
                <span>Category</span>
                <span>Avg MPG</span>
                <span>Target</span>
                <span>Variance</span>
                <span>Gallons</span>
              </div>
              {fuelEfficiency.map((fuel) => (
                <div key={fuel.category} className="table-row">
                  <span className="fuel-category">{fuel.category}</span>
                  <span className="fuel-mpg">{fuel.avgMpg.toFixed(1)}</span>
                  <span className="fuel-target">{fuel.targetMpg.toFixed(1)}</span>
                  <span className={`fuel-variance ${fuel.variance >= 0 ? 'positive' : 'negative'}`}>
                    {fuel.variance >= 0 ? '+' : ''}{fuel.variance.toFixed(1)}%
                  </span>
                  <span className="fuel-gallons">{formatNumber(fuel.totalGallons)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Active Alerts */}
        <section className="analytics-card active-alerts">
          <div className="card-header">
            <h3>
              <AlertTriangle size={20} />
              Active Alerts
            </h3>
            <div className="alert-badges">
              {criticalAlerts > 0 && <span className="badge critical">{criticalAlerts}</span>}
              {warningAlerts > 0 && <span className="badge warning">{warningAlerts}</span>}
            </div>
          </div>
          <div className="card-content">
            <div className="alerts-list">
              {alerts.length === 0 ? (
                <div className="no-alerts">
                  <CheckCircle size={32} />
                  <span>No active alerts</span>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.id} className={`alert-card ${alert.severity}`}>
                    <div className="alert-icon-wrapper">
                      {getSeverityIcon(alert.severity)}
                    </div>
                    <div className="alert-content">
                      <div className="alert-header">
                        <span className="alert-title">{alert.title}</span>
                        <span className="alert-timestamp">{alert.timestamp}</span>
                      </div>
                      <p className="alert-description">{alert.description}</p>
                      <div className="alert-footer">
                        <span className="alert-equipment">
                          <Hash size={12} />
                          {alert.equipmentNumber}
                        </span>
                        {alert.actionRequired && (
                          <span className="action-required">Action Required</span>
                        )}
                      </div>
                    </div>
                    <button className="alert-action">
                      <Eye size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ================================================================== */}
      {/* QUICK ACTIONS FOOTER */}
      {/* ================================================================== */}
      <section className="quick-actions-footer">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <Link to="/equipment" className="action-card">
            <Truck size={24} />
            <span>Fleet Overview</span>
          </Link>
          <Link to="/equipment/vehicles" className="action-card">
            <FileText size={24} />
            <span>Vehicle Details</span>
          </Link>
          <Link to="/equipment/maintenance" className="action-card">
            <Wrench size={24} />
            <span>Maintenance</span>
          </Link>
          <Link to="/equipment/fuel" className="action-card">
            <Fuel size={24} />
            <span>Fuel Management</span>
          </Link>
          <Link to="/equipment/inspections" className="action-card">
            <Shield size={24} />
            <span>Inspections</span>
          </Link>
          <Link to="/equipment/reports" className="action-card">
            <BarChart3 size={24} />
            <span>Reports</span>
          </Link>
          <Link to="/equipment/operators" className="action-card">
            <Users size={24} />
            <span>Operators</span>
          </Link>
          <Link to="/equipment/ifta" className="action-card">
            <FileText size={24} />
            <span>IFTA Reporting</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default FleetAnalyticsDashboard;
