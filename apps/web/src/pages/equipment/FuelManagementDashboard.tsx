import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Fuel,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Gauge,
  AlertTriangle,
  ChevronLeft,
  RefreshCw,
  Download,
  Calendar,
  MapPin,
  Truck,
  Users,
  Leaf,
  Target,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CreditCard,
  Zap,
  Award,
  AlertCircle,
  CheckCircle,
  Eye,
  Settings,
  FileText,
  Map,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './FuelManagementDashboard.css';

interface FuelKPI {
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

interface ConsumptionData {
  date: string;
  gallons: number;
  cost: number;
  transactions: number;
}

interface VehicleEfficiency {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  totalGallons: number;
  totalCost: number;
  avgMpg: number;
  targetMpg: number;
  efficiency: number;
  transactions: number;
  status: 'excellent' | 'good' | 'average' | 'poor';
}

interface DriverScore {
  driverId: string;
  driverName: string;
  avgMpg: number;
  totalGallons: number;
  totalCost: number;
  fuelingScore: number;
  rank: number;
  trend: 'up' | 'down' | 'flat';
}

interface FuelAnomaly {
  id: string;
  date: string;
  vehicleNumber: string;
  driverName: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  amount: number;
  gallons: number;
  status: 'new' | 'reviewing' | 'resolved' | 'dismissed';
}

interface ProjectFuelAllocation {
  projectId: string;
  projectName: string;
  projectNumber: string;
  totalGallons: number;
  totalCost: number;
  budget: number;
  percentUsed: number;
  vehicles: number;
}

interface FuelingLocation {
  name: string;
  address: string;
  avgPrice: number;
  totalGallons: number;
  totalTransactions: number;
  savings: number;
}

interface FuelTypeBreakdown {
  fuelType: string;
  gallons: number;
  cost: number;
  percentage: number;
  color: string;
}

export function FuelManagementDashboard() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d');
  const [kpis, setKpis] = useState<FuelKPI[]>([]);
  const [consumptionData, setConsumptionData] = useState<ConsumptionData[]>([]);
  const [vehicleEfficiency, setVehicleEfficiency] = useState<VehicleEfficiency[]>([]);
  const [driverScores, setDriverScores] = useState<DriverScore[]>([]);
  const [anomalies, setAnomalies] = useState<FuelAnomaly[]>([]);
  const [projectAllocations, setProjectAllocations] = useState<ProjectFuelAllocation[]>([]);
  const [fuelingLocations, setFuelingLocations] = useState<FuelingLocation[]>([]);
  const [fuelTypeBreakdown, setFuelTypeBreakdown] = useState<FuelTypeBreakdown[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'efficiency' | 'costs'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: fuelData } = await (supabase as any)
        .from('fuel_transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(1000);

      if (fuelData && fuelData.length > 0) {
        processRealData(fuelData);
      } else {
        loadDemoData();
      }
    } catch (error) {
      console.error('Error loading fuel data:', error);
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const processRealData = (_data: any[]) => {
    // Process real data into dashboard format
    // This would be implemented with actual data transformation
    loadDemoData(); // Fall back to demo for now
  };

  const loadDemoData = () => {
    // KPIs
    setKpis([
      {
        label: 'Total Fuel Cost',
        value: '$127,845',
        previousValue: '$134,210',
        change: -4.7,
        changeType: 'positive',
        icon: <DollarSign size={24} />,
        trend: 'down',
        subtitle: 'MTD Spend',
        color: '#10b981',
      },
      {
        label: 'Total Gallons',
        value: '42,615',
        previousValue: '44,890',
        change: -5.1,
        changeType: 'neutral',
        icon: <Fuel size={24} />,
        trend: 'down',
        subtitle: 'Fuel Consumed',
        color: '#3b82f6',
      },
      {
        label: 'Avg Price/Gallon',
        value: '$3.00',
        previousValue: '$2.99',
        change: 0.3,
        changeType: 'negative',
        icon: <TrendingUp size={24} />,
        trend: 'up',
        subtitle: 'Fleet Average',
        color: '#f59e0b',
      },
      {
        label: 'Fleet Avg MPG',
        value: '8.4',
        previousValue: '8.1',
        change: 3.7,
        changeType: 'positive',
        icon: <Gauge size={24} />,
        trend: 'up',
        subtitle: 'Efficiency',
        color: '#10b981',
      },
      {
        label: 'Cost per Mile',
        value: '$0.36',
        previousValue: '$0.37',
        change: -2.7,
        changeType: 'positive',
        icon: <Target size={24} />,
        trend: 'down',
        subtitle: 'Operational Cost',
        color: '#8b5cf6',
      },
      {
        label: 'Active Anomalies',
        value: '7',
        previousValue: '12',
        change: -41.7,
        changeType: 'positive',
        icon: <AlertTriangle size={24} />,
        trend: 'down',
        subtitle: 'Needs Review',
        color: '#ef4444',
      },
    ]);

    // Consumption trend data
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 180;
    const consumptionTrend: ConsumptionData[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const baseGallons = isWeekend ? 800 : 1400;
      const variance = Math.random() * 400 - 200;
      const gallons = Math.round(baseGallons + variance);
      consumptionTrend.push({
        date: date.toISOString().split('T')[0] || '',
        gallons,
        cost: gallons * (2.85 + Math.random() * 0.30),
        transactions: Math.floor(gallons / 50),
      });
    }
    setConsumptionData(consumptionTrend);

    // Vehicle efficiency data
    setVehicleEfficiency([
      { vehicleId: '1', vehicleNumber: 'TRK-001', vehicleType: 'Semi Truck', totalGallons: 4250, totalCost: 12750, avgMpg: 7.2, targetMpg: 7.0, efficiency: 103, transactions: 85, status: 'excellent' },
      { vehicleId: '2', vehicleNumber: 'TRK-002', vehicleType: 'Semi Truck', totalGallons: 4180, totalCost: 12540, avgMpg: 6.8, targetMpg: 7.0, efficiency: 97, transactions: 82, status: 'good' },
      { vehicleId: '3', vehicleNumber: 'DMP-001', vehicleType: 'Dump Truck', totalGallons: 3890, totalCost: 11670, avgMpg: 5.5, targetMpg: 5.0, efficiency: 110, transactions: 78, status: 'excellent' },
      { vehicleId: '4', vehicleNumber: 'EXC-001', vehicleType: 'Excavator', totalGallons: 5200, totalCost: 15600, avgMpg: 0, targetMpg: 0, efficiency: 95, transactions: 65, status: 'good' },
      { vehicleId: '5', vehicleNumber: 'LDR-001', vehicleType: 'Loader', totalGallons: 3750, totalCost: 11250, avgMpg: 0, targetMpg: 0, efficiency: 88, transactions: 58, status: 'average' },
      { vehicleId: '6', vehicleNumber: 'PU-001', vehicleType: 'Pickup', totalGallons: 890, totalCost: 2670, avgMpg: 18.5, targetMpg: 20.0, efficiency: 93, transactions: 42, status: 'good' },
      { vehicleId: '7', vehicleNumber: 'PU-002', vehicleType: 'Pickup', totalGallons: 1120, totalCost: 3360, avgMpg: 16.2, targetMpg: 20.0, efficiency: 81, transactions: 48, status: 'poor' },
      { vehicleId: '8', vehicleNumber: 'VAN-001', vehicleType: 'Service Van', totalGallons: 780, totalCost: 2340, avgMpg: 14.8, targetMpg: 15.0, efficiency: 99, transactions: 38, status: 'good' },
    ]);

    // Driver efficiency scores
    setDriverScores([
      { driverId: '1', driverName: 'John Martinez', avgMpg: 8.9, totalGallons: 3200, totalCost: 9600, fuelingScore: 95, rank: 1, trend: 'up' },
      { driverId: '2', driverName: 'Mike Thompson', avgMpg: 8.5, totalGallons: 2890, totalCost: 8670, fuelingScore: 92, rank: 2, trend: 'up' },
      { driverId: '3', driverName: 'Sarah Williams', avgMpg: 8.2, totalGallons: 2450, totalCost: 7350, fuelingScore: 88, rank: 3, trend: 'flat' },
      { driverId: '4', driverName: 'Robert Davis', avgMpg: 7.8, totalGallons: 3100, totalCost: 9300, fuelingScore: 85, rank: 4, trend: 'down' },
      { driverId: '5', driverName: 'Lisa Brown', avgMpg: 7.5, totalGallons: 2780, totalCost: 8340, fuelingScore: 82, rank: 5, trend: 'up' },
    ]);

    // Anomalies
    setAnomalies([
      { id: '1', date: '2024-12-07', vehicleNumber: 'TRK-003', driverName: 'James Wilson', type: 'Excessive Fueling', severity: 'high', description: 'Fueling amount exceeds tank capacity by 15%', amount: 485.50, gallons: 162, status: 'new' },
      { id: '2', date: '2024-12-07', vehicleNumber: 'PU-002', driverName: 'Unknown', type: 'Missing Driver', severity: 'critical', description: 'Transaction without driver identification', amount: 89.75, gallons: 30, status: 'new' },
      { id: '3', date: '2024-12-06', vehicleNumber: 'DMP-002', driverName: 'David Miller', type: 'Price Anomaly', severity: 'medium', description: 'Price per gallon 15% above market average', amount: 412.20, gallons: 120, status: 'reviewing' },
      { id: '4', date: '2024-12-06', vehicleNumber: 'LDR-001', driverName: 'Mike Thompson', type: 'Duplicate Transaction', severity: 'high', description: 'Two transactions within 30 minutes', amount: 245.60, gallons: 82, status: 'new' },
      { id: '5', date: '2024-12-05', vehicleNumber: 'TRK-001', driverName: 'John Martinez', type: 'Location Mismatch', severity: 'low', description: 'Fueling 50+ miles from assigned project', amount: 356.40, gallons: 118, status: 'reviewing' },
      { id: '6', date: '2024-12-04', vehicleNumber: 'EXC-001', driverName: 'Robert Davis', type: 'Low MPG Alert', severity: 'medium', description: 'MPG 25% below vehicle average', amount: 580.00, gallons: 200, status: 'resolved' },
      { id: '7', date: '2024-12-03', vehicleNumber: 'VAN-001', driverName: 'Sarah Williams', type: 'Weekend Fueling', severity: 'low', description: 'Fueling on non-working day', amount: 78.50, gallons: 26, status: 'dismissed' },
    ]);

    // Project allocations
    setProjectAllocations([
      { projectId: '1', projectName: 'Corridor H - Section 12', projectNumber: '2024-001', totalGallons: 15200, totalCost: 45600, budget: 60000, percentUsed: 76, vehicles: 12 },
      { projectId: '2', projectName: 'Route 50 Bridge Repair', projectNumber: '2024-002', totalGallons: 8450, totalCost: 25350, budget: 35000, percentUsed: 72, vehicles: 6 },
      { projectId: '3', projectName: 'I-64 Interchange', projectNumber: '2024-003', totalGallons: 12800, totalCost: 38400, budget: 50000, percentUsed: 77, vehicles: 9 },
      { projectId: '4', projectName: 'US-19 Widening', projectNumber: '2024-004', totalGallons: 6165, totalCost: 18495, budget: 25000, percentUsed: 74, vehicles: 5 },
    ]);

    // Fueling locations
    setFuelingLocations([
      { name: 'Pilot Flying J #842', address: 'Exit 45, I-64 East', avgPrice: 2.89, totalGallons: 12500, totalTransactions: 250, savings: 1875 },
      { name: "Love's Travel Stop", address: '1250 Route 50', avgPrice: 2.92, totalGallons: 9800, totalTransactions: 196, savings: 1372 },
      { name: 'Fleet Fueling Center', address: '500 Industrial Blvd', avgPrice: 2.85, totalGallons: 8200, totalTransactions: 164, savings: 1640 },
      { name: 'TA Travel Center', address: 'Mile 78, I-79', avgPrice: 2.95, totalGallons: 6400, totalTransactions: 128, savings: 640 },
      { name: 'On-Site Tank - Yard A', address: 'Main Equipment Yard', avgPrice: 2.78, totalGallons: 5715, totalTransactions: 95, savings: 1143 },
    ]);

    // Fuel type breakdown
    setFuelTypeBreakdown([
      { fuelType: 'Diesel', gallons: 35890, cost: 107670, percentage: 84.2, color: '#3b82f6' },
      { fuelType: 'Gasoline', gallons: 5240, cost: 17292, percentage: 12.3, color: '#10b981' },
      { fuelType: 'DEF', gallons: 1485, cost: 2883, percentage: 3.5, color: '#f59e0b' },
    ]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'average': return '#f59e0b';
      case 'poor': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  // Calculate totals for charts
  const totalGallons = consumptionData.reduce((sum, d) => sum + d.gallons, 0);
  const totalCost = consumptionData.reduce((sum, d) => sum + d.cost, 0);
  const avgDailyGallons = totalGallons / (consumptionData.length || 1);
  const maxDailyGallons = Math.max(...consumptionData.map(d => d.gallons), 1);

  // Carbon footprint calculation (approximate)
  const carbonEmissions = totalGallons * 22.4; // lbs CO2 per gallon diesel

  // Unresolved anomalies count
  const unresolvedAnomalies = anomalies.filter(a => a.status === 'new' || a.status === 'reviewing').length;

  if (loading) {
    return (
      <div className="fuel-dashboard-page">
        <div className="loading-state">
          <RefreshCw size={48} className="spinning" />
          <p>Loading fuel analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fuel-dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <Link to="/equipment" className="back-link">
            <ChevronLeft size={20} />
            Fleet Management
          </Link>
          <h1>
            <Fuel size={32} />
            Fuel Management Dashboard
          </h1>
          <p>Comprehensive fuel analytics, efficiency tracking, and cost optimization</p>
        </div>
        <div className="header-actions">
          <div className="date-range-selector">
            <Calendar size={16} />
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)}>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
            </select>
          </div>
          <button className="btn btn-secondary" onClick={loadDashboardData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Anomaly Alert Banner */}
      {unresolvedAnomalies > 0 && (
        <div className="alert-banner">
          <div className="alert-content">
            <AlertTriangle size={20} />
            <span>
              <strong>{unresolvedAnomalies} fuel anomalies</strong> require your attention
            </span>
          </div>
          <Link to="#anomalies" className="alert-action">
            Review Now <ArrowUpRight size={16} />
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid">
        {kpis.map((kpi, index) => (
          <div key={index} className="kpi-card">
            <div className="kpi-header">
              <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}>
                {kpi.icon}
              </div>
              <div className={`kpi-change ${kpi.changeType}`}>
                {kpi.trend === 'up' ? <ArrowUpRight size={14} /> : kpi.trend === 'down' ? <ArrowDownRight size={14} /> : null}
                {kpi.change !== undefined && <span>{Math.abs(kpi.change).toFixed(1)}%</span>}
              </div>
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
            {kpi.subtitle && <div className="kpi-subtitle">{kpi.subtitle}</div>}
          </div>
        ))}
      </div>

      {/* View Mode Tabs */}
      <div className="view-mode-tabs">
        <button
          className={`tab ${viewMode === 'overview' ? 'active' : ''}`}
          onClick={() => setViewMode('overview')}
        >
          <BarChart3 size={18} />
          Overview
        </button>
        <button
          className={`tab ${viewMode === 'efficiency' ? 'active' : ''}`}
          onClick={() => setViewMode('efficiency')}
        >
          <Gauge size={18} />
          Efficiency
        </button>
        <button
          className={`tab ${viewMode === 'costs' ? 'active' : ''}`}
          onClick={() => setViewMode('costs')}
        >
          <DollarSign size={18} />
          Costs
        </button>
      </div>

      {/* Main Dashboard Content */}
      <div className="dashboard-grid">
        {/* Consumption Trend Chart */}
        <div className="dashboard-card consumption-chart">
          <div className="card-header">
            <h3>
              <BarChart3 size={20} />
              Fuel Consumption Trend
            </h3>
            <div className="card-actions">
              <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                <option value="all">All Vehicles</option>
                <option value="trucks">Trucks</option>
                <option value="equipment">Equipment</option>
                <option value="support">Support Vehicles</option>
              </select>
            </div>
          </div>
          <div className="chart-container">
            <div className="chart-summary">
              <div className="summary-item">
                <span className="summary-label">Total Gallons</span>
                <span className="summary-value">{formatNumber(totalGallons)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Cost</span>
                <span className="summary-value">{formatCurrency(totalCost)}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Daily Average</span>
                <span className="summary-value">{formatNumber(Math.round(avgDailyGallons))} gal</span>
              </div>
            </div>
            <div className="bar-chart">
              {consumptionData.slice(-30).map((day, index) => {
                const height = (day.gallons / maxDailyGallons) * 100;
                const isWeekend = new Date(day.date).getDay() === 0 || new Date(day.date).getDay() === 6;
                return (
                  <div key={index} className="bar-wrapper" title={`${day.date}: ${day.gallons} gal - ${formatCurrency(day.cost)}`}>
                    <div
                      className={`bar ${isWeekend ? 'weekend' : ''}`}
                      style={{ height: `${height}%` }}
                    />
                    {index % 5 === 0 && (
                      <span className="bar-label">{new Date(day.date).getDate()}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fuel Type Breakdown */}
        <div className="dashboard-card fuel-breakdown">
          <div className="card-header">
            <h3>
              <PieChart size={20} />
              Fuel Type Breakdown
            </h3>
          </div>
          <div className="breakdown-content">
            <div className="donut-chart">
              <svg viewBox="0 0 100 100">
                {fuelTypeBreakdown.reduce((acc, item, index) => {
                  const startAngle = acc.angle;
                  const angle = (item.percentage / 100) * 360;
                  const endAngle = startAngle + angle;

                  const startRad = (startAngle - 90) * Math.PI / 180;
                  const endRad = (endAngle - 90) * Math.PI / 180;

                  const x1 = 50 + 35 * Math.cos(startRad);
                  const y1 = 50 + 35 * Math.sin(startRad);
                  const x2 = 50 + 35 * Math.cos(endRad);
                  const y2 = 50 + 35 * Math.sin(endRad);

                  const largeArc = angle > 180 ? 1 : 0;

                  acc.elements.push(
                    <path
                      key={index}
                      d={`M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`}
                      fill={item.color}
                      stroke="#1a1f2e"
                      strokeWidth="1"
                    />
                  );

                  acc.angle = endAngle;
                  return acc;
                }, { elements: [] as React.ReactNode[], angle: 0 }).elements}
                <circle cx="50" cy="50" r="20" fill="#1a1f2e" />
              </svg>
              <div className="donut-center">
                <span className="donut-value">{formatNumber(totalGallons)}</span>
                <span className="donut-label">Total Gal</span>
              </div>
            </div>
            <div className="breakdown-legend">
              {fuelTypeBreakdown.map((item, index) => (
                <div key={index} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: item.color }} />
                  <div className="legend-details">
                    <span className="legend-label">{item.fuelType}</span>
                    <span className="legend-value">{formatNumber(item.gallons)} gal ({item.percentage}%)</span>
                    <span className="legend-cost">{formatCurrency(item.cost)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Efficiency Table */}
        <div className="dashboard-card vehicle-efficiency">
          <div className="card-header">
            <h3>
              <Truck size={20} />
              Vehicle Fuel Efficiency
            </h3>
            <Link to="/equipment/fuel/vehicles" className="view-all-link">
              View All <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="efficiency-table">
            <table>
              <thead>
                <tr>
                  <th>Vehicle</th>
                  <th>Type</th>
                  <th>Gallons</th>
                  <th>Cost</th>
                  <th>MPG</th>
                  <th>Efficiency</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {vehicleEfficiency.slice(0, 6).map((vehicle) => (
                  <tr key={vehicle.vehicleId}>
                    <td className="vehicle-cell">
                      <span className="vehicle-number">{vehicle.vehicleNumber}</span>
                    </td>
                    <td>{vehicle.vehicleType}</td>
                    <td>{formatNumber(vehicle.totalGallons)}</td>
                    <td>{formatCurrency(vehicle.totalCost)}</td>
                    <td>{vehicle.avgMpg > 0 ? vehicle.avgMpg.toFixed(1) : 'N/A'}</td>
                    <td>
                      <div className="efficiency-bar">
                        <div
                          className="efficiency-fill"
                          style={{
                            width: `${Math.min(vehicle.efficiency, 120)}%`,
                            backgroundColor: getStatusColor(vehicle.status)
                          }}
                        />
                        <span>{vehicle.efficiency}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${vehicle.status}`}>
                        {vehicle.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Driver Efficiency Leaderboard */}
        <div className="dashboard-card driver-leaderboard">
          <div className="card-header">
            <h3>
              <Award size={20} />
              Driver Efficiency Leaderboard
            </h3>
          </div>
          <div className="leaderboard-content">
            {driverScores.map((driver) => (
              <div key={driver.driverId} className="leaderboard-item">
                <div className="rank-badge" data-rank={driver.rank}>
                  {driver.rank}
                </div>
                <div className="driver-info">
                  <span className="driver-name">{driver.driverName}</span>
                  <span className="driver-stats">
                    {driver.avgMpg.toFixed(1)} MPG · {formatNumber(driver.totalGallons)} gal
                  </span>
                </div>
                <div className="driver-score">
                  <div className="score-circle" style={{ '--score': driver.fuelingScore } as any}>
                    <span>{driver.fuelingScore}</span>
                  </div>
                  <div className={`score-trend ${driver.trend}`}>
                    {driver.trend === 'up' ? <TrendingUp size={14} /> : driver.trend === 'down' ? <TrendingDown size={14} /> : <span>—</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Anomaly Detection Panel */}
        <div className="dashboard-card anomaly-panel" id="anomalies">
          <div className="card-header">
            <h3>
              <AlertTriangle size={20} />
              Fuel Anomalies
              {unresolvedAnomalies > 0 && (
                <span className="anomaly-badge">{unresolvedAnomalies}</span>
              )}
            </h3>
            <Link to="/equipment/fuel/anomalies" className="view-all-link">
              View All <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className="anomaly-list">
            {anomalies.filter(a => a.status !== 'dismissed').slice(0, 5).map((anomaly) => (
              <div key={anomaly.id} className={`anomaly-item ${anomaly.severity}`}>
                <div className="anomaly-severity" style={{ backgroundColor: getSeverityColor(anomaly.severity) }} />
                <div className="anomaly-content">
                  <div className="anomaly-header">
                    <span className="anomaly-type">{anomaly.type}</span>
                    <span className={`anomaly-status ${anomaly.status}`}>
                      {anomaly.status === 'new' && <AlertCircle size={12} />}
                      {anomaly.status === 'reviewing' && <Eye size={12} />}
                      {anomaly.status === 'resolved' && <CheckCircle size={12} />}
                      {anomaly.status}
                    </span>
                  </div>
                  <p className="anomaly-description">{anomaly.description}</p>
                  <div className="anomaly-meta">
                    <span><Truck size={12} /> {anomaly.vehicleNumber}</span>
                    <span><Users size={12} /> {anomaly.driverName}</span>
                    <span><DollarSign size={12} /> {formatCurrency(anomaly.amount)}</span>
                    <span><Clock size={12} /> {anomaly.date}</span>
                  </div>
                </div>
                <button className="anomaly-action">
                  <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Project Fuel Allocation */}
        <div className="dashboard-card project-allocation">
          <div className="card-header">
            <h3>
              <Target size={20} />
              Project Fuel Allocation
            </h3>
          </div>
          <div className="allocation-list">
            {projectAllocations.map((project) => (
              <div key={project.projectId} className="allocation-item">
                <div className="allocation-header">
                  <div className="project-info">
                    <span className="project-name">{project.projectName}</span>
                    <span className="project-number">{project.projectNumber}</span>
                  </div>
                  <span className="allocation-vehicles">
                    <Truck size={14} /> {project.vehicles} vehicles
                  </span>
                </div>
                <div className="allocation-metrics">
                  <div className="metric">
                    <span className="metric-value">{formatNumber(project.totalGallons)}</span>
                    <span className="metric-label">Gallons</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{formatCurrency(project.totalCost)}</span>
                    <span className="metric-label">Cost</span>
                  </div>
                  <div className="metric">
                    <span className="metric-value">{formatCurrency(project.budget)}</span>
                    <span className="metric-label">Budget</span>
                  </div>
                </div>
                <div className="allocation-progress">
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${project.percentUsed > 90 ? 'warning' : ''}`}
                      style={{ width: `${project.percentUsed}%` }}
                    />
                  </div>
                  <span className="progress-label">{project.percentUsed}% of budget used</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fueling Locations */}
        <div className="dashboard-card fueling-locations">
          <div className="card-header">
            <h3>
              <MapPin size={20} />
              Top Fueling Locations
            </h3>
            <button className="icon-btn">
              <Map size={16} />
            </button>
          </div>
          <div className="locations-list">
            {fuelingLocations.map((location, index) => (
              <div key={index} className="location-item">
                <div className="location-rank">{index + 1}</div>
                <div className="location-info">
                  <span className="location-name">{location.name}</span>
                  <span className="location-address">{location.address}</span>
                </div>
                <div className="location-stats">
                  <div className="stat">
                    <span className="stat-value">${location.avgPrice.toFixed(2)}</span>
                    <span className="stat-label">Avg/Gal</span>
                  </div>
                  <div className="stat">
                    <span className="stat-value">{formatNumber(location.totalGallons)}</span>
                    <span className="stat-label">Gallons</span>
                  </div>
                  <div className="stat highlight">
                    <span className="stat-value">{formatCurrency(location.savings)}</span>
                    <span className="stat-label">Savings</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="dashboard-card environmental">
          <div className="card-header">
            <h3>
              <Leaf size={20} />
              Environmental Impact
            </h3>
          </div>
          <div className="environmental-content">
            <div className="carbon-metric">
              <div className="carbon-value">{formatNumber(Math.round(carbonEmissions / 1000))}</div>
              <div className="carbon-unit">Metric Tons CO2</div>
              <div className="carbon-label">Carbon Emissions (Est.)</div>
            </div>
            <div className="environmental-stats">
              <div className="env-stat">
                <Zap size={18} />
                <div>
                  <span className="env-value">2.3%</span>
                  <span className="env-label">Idle Time Reduction</span>
                </div>
              </div>
              <div className="env-stat">
                <TrendingUp size={18} />
                <div>
                  <span className="env-value">+3.7%</span>
                  <span className="env-label">Fuel Efficiency Gain</span>
                </div>
              </div>
              <div className="env-stat">
                <Target size={18} />
                <div>
                  <span className="env-value">On Track</span>
                  <span className="env-label">Sustainability Goal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="quick-actions-footer">
        <Link to="/equipment/fuel/transactions" className="quick-action">
          <CreditCard size={20} />
          <span>View Transactions</span>
        </Link>
        <Link to="/equipment/fuel/cards" className="quick-action">
          <CreditCard size={20} />
          <span>Manage Cards</span>
        </Link>
        <Link to="/equipment/fuel/reports" className="quick-action">
          <FileText size={20} />
          <span>Generate Reports</span>
        </Link>
        <Link to="/equipment/fuel/settings" className="quick-action">
          <Settings size={20} />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}

export default FuelManagementDashboard;
