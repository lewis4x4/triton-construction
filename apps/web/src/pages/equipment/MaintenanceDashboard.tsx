import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Wrench,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronLeft,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Truck,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  FileText,
  BarChart3,
  Users,
  MapPin,
  Timer,
  AlertCircle,
  ClipboardCheck,
  CalendarCheck,
  Activity,
  Shield,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './MaintenanceDashboard.css';

interface MaintenanceKPI {
  label: string;
  value: string | number;
  change?: number;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}

interface ScheduledMaintenance {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  maintenanceType: string;
  category: 'preventive' | 'corrective' | 'inspection' | 'recall';
  priority: 'critical' | 'high' | 'medium' | 'low';
  scheduledDate: string;
  estimatedHours: number;
  estimatedCost: number;
  assignedTechnician: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  meterReading?: number;
  nextDueMiles?: number;
  notes?: string;
}

interface MaintenanceHistory {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  completedDate: string;
  maintenanceType: string;
  category: string;
  laborHours: number;
  laborCost: number;
  partsCost: number;
  totalCost: number;
  technician: string;
  vendor?: string;
  description: string;
  meterAtService: number;
}

interface VehicleMaintenanceStatus {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  status: 'good' | 'due_soon' | 'overdue' | 'in_service';
  lastService: string;
  nextService: string;
  nextServiceType: string;
  currentMiles: number;
  milesUntilService: number;
  daysUntilService: number;
  openWorkOrders: number;
}

interface MaintenanceCostByCategory {
  category: string;
  cost: number;
  percentage: number;
  count: number;
  color: string;
}

interface TechnicianWorkload {
  technicianId: string;
  name: string;
  assignedTasks: number;
  completedToday: number;
  avgCompletionTime: number;
  efficiency: number;
  status: 'available' | 'busy' | 'offline';
}

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'pending_parts' | 'completed' | 'on_hold';
  createdDate: string;
  assignedTo: string;
  estimatedCompletion: string;
  laborHours: number;
  partsCost: number;
}

export function MaintenanceDashboard() {
  const [searchParams] = useSearchParams();

  // Read URL params for initial state
  const initialTab = searchParams.get('tab') as 'overview' | 'scheduled' | 'history' | 'work_orders' | null;
  const initialEquipment = searchParams.get('equipment') || '';

  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'ytd'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduled' | 'history' | 'work_orders'>(
    initialTab && ['overview', 'scheduled', 'history', 'work_orders'].includes(initialTab)
      ? initialTab
      : 'overview'
  );
  const [kpis, setKpis] = useState<MaintenanceKPI[]>([]);
  const [scheduledMaintenance, setScheduledMaintenance] = useState<ScheduledMaintenance[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);
  const [vehicleStatuses, setVehicleStatuses] = useState<VehicleMaintenanceStatus[]>([]);
  const [costByCategory, setCostByCategory] = useState<MaintenanceCostByCategory[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianWorkload[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialEquipment);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const { data: maintenanceData } = await (supabase as any)
        .from('equipment_maintenance')
        .select('*')
        .order('scheduled_date', { ascending: false })
        .limit(500);

      if (maintenanceData && maintenanceData.length > 0) {
        processRealData(maintenanceData);
      } else {
        loadDemoData();
      }
    } catch (error) {
      console.error('Error loading maintenance data:', error);
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const processRealData = (_data: any[]) => {
    loadDemoData();
  };

  const loadDemoData = () => {
    // KPIs
    setKpis([
      {
        label: 'Fleet Uptime',
        value: '94.7%',
        change: 2.3,
        changeType: 'positive',
        icon: <Activity size={24} />,
        color: '#10b981',
        subtitle: 'Target: 95%',
      },
      {
        label: 'Pending Work Orders',
        value: '12',
        change: -25,
        changeType: 'positive',
        icon: <ClipboardCheck size={24} />,
        color: '#3b82f6',
        subtitle: '4 High Priority',
      },
      {
        label: 'Overdue Maintenance',
        value: '3',
        change: 50,
        changeType: 'negative',
        icon: <AlertTriangle size={24} />,
        color: '#ef4444',
        subtitle: 'Requires Attention',
      },
      {
        label: 'MTD Maintenance Cost',
        value: '$47,825',
        change: -8.2,
        changeType: 'positive',
        icon: <DollarSign size={24} />,
        color: '#f59e0b',
        subtitle: 'vs Budget: $52K',
      },
      {
        label: 'Avg Repair Time',
        value: '4.2 hrs',
        change: -12,
        changeType: 'positive',
        icon: <Timer size={24} />,
        color: '#8b5cf6',
        subtitle: 'Down from 4.8 hrs',
      },
      {
        label: 'PM Compliance',
        value: '92%',
        change: 3,
        changeType: 'positive',
        icon: <Shield size={24} />,
        color: '#10b981',
        subtitle: 'On-time completion',
      },
    ]);

    // Scheduled Maintenance
    setScheduledMaintenance([
      { id: '1', vehicleId: 'v1', vehicleNumber: 'TRK-001', vehicleType: 'Semi Truck', maintenanceType: 'Oil Change & Filter', category: 'preventive', priority: 'medium', scheduledDate: '2024-12-09', estimatedHours: 2, estimatedCost: 450, assignedTechnician: 'Mike Johnson', status: 'scheduled', meterReading: 125000, nextDueMiles: 140000 },
      { id: '2', vehicleId: 'v2', vehicleNumber: 'EXC-001', vehicleType: 'Excavator', maintenanceType: 'Hydraulic System Service', category: 'preventive', priority: 'high', scheduledDate: '2024-12-09', estimatedHours: 4, estimatedCost: 1200, assignedTechnician: 'John Smith', status: 'in_progress', meterReading: 4500 },
      { id: '3', vehicleId: 'v3', vehicleNumber: 'DMP-002', vehicleType: 'Dump Truck', maintenanceType: 'Brake Inspection', category: 'inspection', priority: 'critical', scheduledDate: '2024-12-08', estimatedHours: 3, estimatedCost: 800, assignedTechnician: 'Mike Johnson', status: 'overdue' },
      { id: '4', vehicleId: 'v4', vehicleNumber: 'LDR-001', vehicleType: 'Loader', maintenanceType: 'Annual DOT Inspection', category: 'inspection', priority: 'high', scheduledDate: '2024-12-10', estimatedHours: 6, estimatedCost: 500, assignedTechnician: 'Sarah Davis', status: 'scheduled' },
      { id: '5', vehicleId: 'v5', vehicleNumber: 'TRK-002', vehicleType: 'Semi Truck', maintenanceType: 'Transmission Service', category: 'corrective', priority: 'high', scheduledDate: '2024-12-11', estimatedHours: 8, estimatedCost: 2500, assignedTechnician: 'John Smith', status: 'scheduled' },
      { id: '6', vehicleId: 'v6', vehicleNumber: 'PU-001', vehicleType: 'Pickup', maintenanceType: 'Tire Rotation', category: 'preventive', priority: 'low', scheduledDate: '2024-12-12', estimatedHours: 1, estimatedCost: 75, assignedTechnician: 'Mike Johnson', status: 'scheduled' },
      { id: '7', vehicleId: 'v7', vehicleNumber: 'GRD-001', vehicleType: 'Grader', maintenanceType: 'Blade Replacement', category: 'corrective', priority: 'medium', scheduledDate: '2024-12-10', estimatedHours: 5, estimatedCost: 3500, assignedTechnician: 'Sarah Davis', status: 'scheduled' },
      { id: '8', vehicleId: 'v8', vehicleNumber: 'RLR-001', vehicleType: 'Roller', maintenanceType: 'Engine Diagnostics', category: 'corrective', priority: 'medium', scheduledDate: '2024-12-13', estimatedHours: 2, estimatedCost: 350, assignedTechnician: 'John Smith', status: 'scheduled' },
    ]);

    // Maintenance History
    setMaintenanceHistory([
      { id: 'h1', vehicleNumber: 'TRK-003', vehicleType: 'Semi Truck', completedDate: '2024-12-07', maintenanceType: 'Engine Overhaul', category: 'corrective', laborHours: 24, laborCost: 2400, partsCost: 4500, totalCost: 6900, technician: 'John Smith', description: 'Complete engine rebuild due to rod bearing failure', meterAtService: 380000 },
      { id: 'h2', vehicleNumber: 'EXC-002', vehicleType: 'Excavator', completedDate: '2024-12-06', maintenanceType: '500hr Service', category: 'preventive', laborHours: 6, laborCost: 600, partsCost: 850, totalCost: 1450, technician: 'Mike Johnson', description: 'Routine 500-hour preventive maintenance', meterAtService: 4500 },
      { id: 'h3', vehicleNumber: 'DMP-001', vehicleType: 'Dump Truck', completedDate: '2024-12-05', maintenanceType: 'Brake Replacement', category: 'corrective', laborHours: 5, laborCost: 500, partsCost: 1200, totalCost: 1700, technician: 'Sarah Davis', description: 'Front and rear brake replacement', meterAtService: 95000 },
      { id: 'h4', vehicleNumber: 'LDR-002', vehicleType: 'Loader', completedDate: '2024-12-04', maintenanceType: 'Hydraulic Leak Repair', category: 'corrective', laborHours: 3, laborCost: 300, partsCost: 450, totalCost: 750, technician: 'John Smith', description: 'Repaired hydraulic cylinder seal leak', meterAtService: 6200 },
      { id: 'h5', vehicleNumber: 'PU-002', vehicleType: 'Pickup', completedDate: '2024-12-03', maintenanceType: 'Oil Change', category: 'preventive', laborHours: 0.5, laborCost: 50, partsCost: 85, totalCost: 135, technician: 'Mike Johnson', description: 'Standard oil and filter change', meterAtService: 45000 },
    ]);

    // Vehicle Maintenance Status
    setVehicleStatuses([
      { vehicleId: 'v1', vehicleNumber: 'TRK-001', vehicleType: 'Semi Truck', status: 'good', lastService: '2024-11-15', nextService: '2024-12-15', nextServiceType: 'Oil Change', currentMiles: 125000, milesUntilService: 5000, daysUntilService: 7, openWorkOrders: 0 },
      { vehicleId: 'v2', vehicleNumber: 'TRK-002', vehicleType: 'Semi Truck', status: 'due_soon', lastService: '2024-10-20', nextService: '2024-12-10', nextServiceType: 'PM Service', currentMiles: 138500, milesUntilService: 1500, daysUntilService: 2, openWorkOrders: 1 },
      { vehicleId: 'v3', vehicleNumber: 'DMP-001', vehicleType: 'Dump Truck', status: 'good', lastService: '2024-12-05', nextService: '2025-01-05', nextServiceType: 'Inspection', currentMiles: 95000, milesUntilService: 5000, daysUntilService: 28, openWorkOrders: 0 },
      { vehicleId: 'v4', vehicleNumber: 'DMP-002', vehicleType: 'Dump Truck', status: 'overdue', lastService: '2024-09-15', nextService: '2024-12-01', nextServiceType: 'Brake Inspection', currentMiles: 102000, milesUntilService: -2000, daysUntilService: -7, openWorkOrders: 1 },
      { vehicleId: 'v5', vehicleNumber: 'EXC-001', vehicleType: 'Excavator', status: 'in_service', lastService: '2024-11-20', nextService: '2024-12-20', nextServiceType: '250hr Service', currentMiles: 4500, milesUntilService: 200, daysUntilService: 12, openWorkOrders: 1 },
      { vehicleId: 'v6', vehicleNumber: 'LDR-001', vehicleType: 'Loader', status: 'good', lastService: '2024-11-25', nextService: '2024-12-25', nextServiceType: 'Inspection', currentMiles: 5800, milesUntilService: 700, daysUntilService: 17, openWorkOrders: 0 },
      { vehicleId: 'v7', vehicleNumber: 'PU-001', vehicleType: 'Pickup', status: 'due_soon', lastService: '2024-11-01', nextService: '2024-12-09', nextServiceType: 'Oil Change', currentMiles: 47500, milesUntilService: 500, daysUntilService: 1, openWorkOrders: 0 },
      { vehicleId: 'v8', vehicleNumber: 'GRD-001', vehicleType: 'Grader', status: 'good', lastService: '2024-11-30', nextService: '2025-02-28', nextServiceType: 'Annual Service', currentMiles: 3200, milesUntilService: 800, daysUntilService: 82, openWorkOrders: 0 },
    ]);

    // Cost by Category
    setCostByCategory([
      { category: 'Preventive', cost: 18500, percentage: 38.7, count: 45, color: '#10b981' },
      { category: 'Corrective', cost: 22300, percentage: 46.6, count: 28, color: '#ef4444' },
      { category: 'Inspections', cost: 4200, percentage: 8.8, count: 15, color: '#3b82f6' },
      { category: 'Tires', cost: 2825, percentage: 5.9, count: 8, color: '#f59e0b' },
    ]);

    // Technicians
    setTechnicians([
      { technicianId: 't1', name: 'John Smith', assignedTasks: 5, completedToday: 2, avgCompletionTime: 3.8, efficiency: 95, status: 'busy' },
      { technicianId: 't2', name: 'Mike Johnson', assignedTasks: 4, completedToday: 3, avgCompletionTime: 4.2, efficiency: 88, status: 'busy' },
      { technicianId: 't3', name: 'Sarah Davis', assignedTasks: 3, completedToday: 1, avgCompletionTime: 5.1, efficiency: 82, status: 'available' },
      { technicianId: 't4', name: 'Robert Wilson', assignedTasks: 0, completedToday: 4, avgCompletionTime: 3.5, efficiency: 98, status: 'available' },
    ]);

    // Work Orders
    setWorkOrders([
      { id: 'wo1', workOrderNumber: 'WO-2024-0458', vehicleNumber: 'TRK-003', vehicleType: 'Semi Truck', description: 'Engine check light on, loss of power', priority: 'critical', status: 'in_progress', createdDate: '2024-12-07', assignedTo: 'John Smith', estimatedCompletion: '2024-12-08', laborHours: 6, partsCost: 850 },
      { id: 'wo2', workOrderNumber: 'WO-2024-0457', vehicleNumber: 'EXC-001', vehicleType: 'Excavator', description: 'Hydraulic system service - scheduled PM', priority: 'high', status: 'in_progress', createdDate: '2024-12-06', assignedTo: 'Mike Johnson', estimatedCompletion: '2024-12-09', laborHours: 4, partsCost: 450 },
      { id: 'wo3', workOrderNumber: 'WO-2024-0456', vehicleNumber: 'DMP-002', vehicleType: 'Dump Truck', description: 'Brake inspection - overdue', priority: 'critical', status: 'open', createdDate: '2024-12-05', assignedTo: 'Sarah Davis', estimatedCompletion: '2024-12-09', laborHours: 3, partsCost: 0 },
      { id: 'wo4', workOrderNumber: 'WO-2024-0455', vehicleNumber: 'LDR-001', vehicleType: 'Loader', description: 'Steering feels loose', priority: 'medium', status: 'pending_parts', createdDate: '2024-12-04', assignedTo: 'John Smith', estimatedCompletion: '2024-12-12', laborHours: 4, partsCost: 680 },
      { id: 'wo5', workOrderNumber: 'WO-2024-0454', vehicleNumber: 'PU-002', vehicleType: 'Pickup', description: 'AC not cooling', priority: 'low', status: 'open', createdDate: '2024-12-03', assignedTo: 'Unassigned', estimatedCompletion: '2024-12-15', laborHours: 2, partsCost: 0 },
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  // Counts for quick stats
  const overdueCount = vehicleStatuses.filter(v => v.status === 'overdue').length;
  const dueSoonCount = vehicleStatuses.filter(v => v.status === 'due_soon').length;
  const inServiceCount = vehicleStatuses.filter(v => v.status === 'in_service').length;
  const openWorkOrderCount = workOrders.filter(wo => wo.status === 'open' || wo.status === 'in_progress').length;

  // Filter scheduled maintenance
  const filteredMaintenance = scheduledMaintenance.filter(m => {
    const matchesSearch = searchTerm === '' ||
      m.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.maintenanceType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || m.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Calculate total cost from history
  const totalMaintenanceCost = maintenanceHistory.reduce((sum, h) => sum + h.totalCost, 0);

  if (loading) {
    return (
      <div className="maintenance-dashboard-page">
        <div className="loading-state">
          <RefreshCw size={48} className="spinning" />
          <p>Loading maintenance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="maintenance-dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <Link to="/equipment" className="back-link">
            <ChevronLeft size={20} />
            Fleet Management
          </Link>
          <h1>
            <Wrench size={32} />
            Maintenance Dashboard
          </h1>
          <p>Preventive maintenance scheduling, work orders, and service history</p>
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
            <Plus size={16} />
            New Work Order
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {overdueCount > 0 && (
        <div className="alert-banner critical">
          <div className="alert-content">
            <AlertTriangle size={20} />
            <span>
              <strong>{overdueCount} vehicle{overdueCount > 1 ? 's' : ''}</strong> have overdue maintenance
            </span>
          </div>
          <button className="alert-action">
            View Details <ArrowUpRight size={16} />
          </button>
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
              {kpi.change !== undefined && (
                <div className={`kpi-change ${kpi.changeType}`}>
                  {kpi.changeType === 'positive' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                  <span>{Math.abs(kpi.change)}%</span>
                </div>
              )}
            </div>
            <div className="kpi-value">{kpi.value}</div>
            <div className="kpi-label">{kpi.label}</div>
            {kpi.subtitle && <div className="kpi-subtitle">{kpi.subtitle}</div>}
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={18} />
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'scheduled' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduled')}
        >
          <CalendarCheck size={18} />
          Scheduled
          {dueSoonCount + overdueCount > 0 && (
            <span className="tab-badge">{dueSoonCount + overdueCount}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'work_orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('work_orders')}
        >
          <ClipboardCheck size={18} />
          Work Orders
          {openWorkOrderCount > 0 && (
            <span className="tab-badge">{openWorkOrderCount}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={18} />
          History
        </button>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {activeTab === 'overview' && (
          <div className="overview-grid">
            {/* Vehicle Maintenance Status */}
            <div className="dashboard-card vehicle-status-card">
              <div className="card-header">
                <h3>
                  <Truck size={20} />
                  Fleet Maintenance Status
                </h3>
                <Link to="/equipment/maintenance/vehicles" className="view-all-link">
                  View All <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="status-summary">
                <div className="status-item good">
                  <CheckCircle size={18} />
                  <span className="count">{vehicleStatuses.filter(v => v.status === 'good').length}</span>
                  <span className="label">Good</span>
                </div>
                <div className="status-item due-soon">
                  <AlertCircle size={18} />
                  <span className="count">{dueSoonCount}</span>
                  <span className="label">Due Soon</span>
                </div>
                <div className="status-item overdue">
                  <XCircle size={18} />
                  <span className="count">{overdueCount}</span>
                  <span className="label">Overdue</span>
                </div>
                <div className="status-item in-service">
                  <Wrench size={18} />
                  <span className="count">{inServiceCount}</span>
                  <span className="label">In Service</span>
                </div>
              </div>
              <div className="vehicle-list">
                {vehicleStatuses.slice(0, 6).map((vehicle) => (
                  <div key={vehicle.vehicleId} className={`vehicle-item ${vehicle.status}`}>
                    <div className="vehicle-info">
                      <span className="vehicle-number">{vehicle.vehicleNumber}</span>
                      <span className="vehicle-type">{vehicle.vehicleType}</span>
                    </div>
                    <div className="service-info">
                      <span className="next-service">{vehicle.nextServiceType}</span>
                      <span className={`service-due ${vehicle.daysUntilService < 0 ? 'overdue' : vehicle.daysUntilService <= 7 ? 'soon' : ''}`}>
                        {vehicle.daysUntilService < 0
                          ? `${Math.abs(vehicle.daysUntilService)} days overdue`
                          : vehicle.daysUntilService === 0
                          ? 'Due today'
                          : `Due in ${vehicle.daysUntilService} days`}
                      </span>
                    </div>
                    <div className={`status-indicator ${vehicle.status}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Cost by Category */}
            <div className="dashboard-card cost-breakdown-card">
              <div className="card-header">
                <h3>
                  <DollarSign size={20} />
                  Cost Breakdown
                </h3>
              </div>
              <div className="cost-chart">
                <div className="cost-total">
                  <span className="total-value">{formatCurrency(totalMaintenanceCost)}</span>
                  <span className="total-label">Total MTD</span>
                </div>
                <div className="cost-bars">
                  {costByCategory.map((cat, index) => (
                    <div key={index} className="cost-bar-item">
                      <div className="cost-bar-header">
                        <span className="category-name">
                          <span className="color-dot" style={{ backgroundColor: cat.color }} />
                          {cat.category}
                        </span>
                        <span className="category-amount">{formatCurrency(cat.cost)}</span>
                      </div>
                      <div className="cost-bar">
                        <div
                          className="cost-bar-fill"
                          style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                        />
                      </div>
                      <div className="cost-bar-footer">
                        <span>{cat.count} services</span>
                        <span>{cat.percentage.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Technician Workload */}
            <div className="dashboard-card technician-card">
              <div className="card-header">
                <h3>
                  <Users size={20} />
                  Technician Workload
                </h3>
              </div>
              <div className="technician-list">
                {technicians.map((tech) => (
                  <div key={tech.technicianId} className="technician-item">
                    <div className="tech-avatar">
                      {tech.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="tech-info">
                      <span className="tech-name">{tech.name}</span>
                      <span className="tech-stats">
                        {tech.assignedTasks} assigned · {tech.completedToday} completed today
                      </span>
                    </div>
                    <div className="tech-metrics">
                      <div className="efficiency-meter">
                        <div
                          className="efficiency-fill"
                          style={{ width: `${tech.efficiency}%` }}
                        />
                      </div>
                      <span className="efficiency-value">{tech.efficiency}%</span>
                    </div>
                    <div className={`tech-status ${tech.status}`}>
                      {tech.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Work Orders */}
            <div className="dashboard-card recent-work-orders">
              <div className="card-header">
                <h3>
                  <ClipboardCheck size={20} />
                  Active Work Orders
                </h3>
                <Link to="#" onClick={() => setActiveTab('work_orders')} className="view-all-link">
                  View All <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="work-order-list">
                {workOrders.filter(wo => wo.status !== 'completed').slice(0, 4).map((wo) => (
                  <div key={wo.id} className="work-order-item">
                    <div className="wo-priority" style={{ backgroundColor: getPriorityColor(wo.priority) }} />
                    <div className="wo-content">
                      <div className="wo-header">
                        <span className="wo-number">{wo.workOrderNumber}</span>
                        <span className={`wo-status ${wo.status}`}>{wo.status.replace('_', ' ')}</span>
                      </div>
                      <div className="wo-vehicle">{wo.vehicleNumber} - {wo.vehicleType}</div>
                      <div className="wo-description">{wo.description}</div>
                      <div className="wo-footer">
                        <span><Users size={12} /> {wo.assignedTo}</span>
                        <span><Calendar size={12} /> Est. {formatDate(wo.estimatedCompletion)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Maintenance Calendar */}
            <div className="dashboard-card calendar-card">
              <div className="card-header">
                <h3>
                  <Calendar size={20} />
                  Upcoming This Week
                </h3>
              </div>
              <div className="calendar-list">
                {scheduledMaintenance
                  .filter(m => m.status === 'scheduled' || m.status === 'overdue')
                  .slice(0, 5)
                  .map((maint) => (
                    <div key={maint.id} className={`calendar-item ${maint.status}`}>
                      <div className="calendar-date">
                        <span className="date-day">{new Date(maint.scheduledDate).getDate()}</span>
                        <span className="date-month">{new Date(maint.scheduledDate).toLocaleDateString('en-US', { month: 'short' })}</span>
                      </div>
                      <div className="calendar-content">
                        <div className="calendar-header">
                          <span className="maintenance-type">{maint.maintenanceType}</span>
                          <span className={`priority-badge ${maint.priority}`}>{maint.priority}</span>
                        </div>
                        <div className="calendar-vehicle">{maint.vehicleNumber} - {maint.vehicleType}</div>
                        <div className="calendar-details">
                          <span><Timer size={12} /> {maint.estimatedHours}h</span>
                          <span><DollarSign size={12} /> {formatCurrency(maint.estimatedCost)}</span>
                          <span><Users size={12} /> {maint.assignedTechnician}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scheduled' && (
          <div className="scheduled-content">
            <div className="filters-bar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search vehicles, maintenance type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <Filter size={16} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="overdue">Overdue</option>
                  <option value="completed">Completed</option>
                </select>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
                  <option value="all">All Priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            <div className="maintenance-table">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Maintenance Type</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Scheduled</th>
                    <th>Est. Hours</th>
                    <th>Est. Cost</th>
                    <th>Technician</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaintenance.map((maint) => (
                    <tr key={maint.id} className={maint.status === 'overdue' ? 'overdue-row' : ''}>
                      <td>
                        <div className="vehicle-cell">
                          <span className="vehicle-num">{maint.vehicleNumber}</span>
                          <span className="vehicle-type">{maint.vehicleType}</span>
                        </div>
                      </td>
                      <td>{maint.maintenanceType}</td>
                      <td>
                        <span className={`category-badge ${maint.category}`}>
                          {maint.category}
                        </span>
                      </td>
                      <td>
                        <span
                          className="priority-dot"
                          style={{ backgroundColor: getPriorityColor(maint.priority) }}
                        />
                        {maint.priority}
                      </td>
                      <td>{formatDate(maint.scheduledDate)}</td>
                      <td>{maint.estimatedHours}h</td>
                      <td>{formatCurrency(maint.estimatedCost)}</td>
                      <td>{maint.assignedTechnician}</td>
                      <td>
                        <span className={`status-badge ${maint.status}`}>
                          {maint.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn" title="View Details">
                            <FileText size={16} />
                          </button>
                          <button className="action-btn" title="Edit">
                            <Settings size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'work_orders' && (
          <div className="work-orders-content">
            <div className="wo-header-bar">
              <div className="wo-stats">
                <div className="wo-stat">
                  <span className="stat-value">{workOrders.filter(wo => wo.status === 'open').length}</span>
                  <span className="stat-label">Open</span>
                </div>
                <div className="wo-stat">
                  <span className="stat-value">{workOrders.filter(wo => wo.status === 'in_progress').length}</span>
                  <span className="stat-label">In Progress</span>
                </div>
                <div className="wo-stat">
                  <span className="stat-value">{workOrders.filter(wo => wo.status === 'pending_parts').length}</span>
                  <span className="stat-label">Pending Parts</span>
                </div>
                <div className="wo-stat">
                  <span className="stat-value">{workOrders.filter(wo => wo.priority === 'critical').length}</span>
                  <span className="stat-label">Critical</span>
                </div>
              </div>
            </div>

            <div className="wo-grid">
              {workOrders.map((wo) => (
                <div key={wo.id} className={`wo-card ${wo.priority}`}>
                  <div className="wo-card-header">
                    <span className="wo-number">{wo.workOrderNumber}</span>
                    <span className={`wo-priority ${wo.priority}`}>{wo.priority}</span>
                  </div>
                  <div className="wo-card-vehicle">
                    <Truck size={16} />
                    {wo.vehicleNumber} - {wo.vehicleType}
                  </div>
                  <p className="wo-card-description">{wo.description}</p>
                  <div className="wo-card-details">
                    <div className="detail">
                      <Users size={14} />
                      <span>{wo.assignedTo}</span>
                    </div>
                    <div className="detail">
                      <Timer size={14} />
                      <span>{wo.laborHours}h est.</span>
                    </div>
                    {wo.partsCost > 0 && (
                      <div className="detail">
                        <DollarSign size={14} />
                        <span>{formatCurrency(wo.partsCost)} parts</span>
                      </div>
                    )}
                  </div>
                  <div className="wo-card-footer">
                    <span className={`wo-status ${wo.status}`}>
                      {wo.status.replace('_', ' ')}
                    </span>
                    <span className="wo-date">
                      <Calendar size={12} />
                      {formatDate(wo.estimatedCompletion)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-content">
            <div className="history-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Vehicle</th>
                    <th>Maintenance Type</th>
                    <th>Category</th>
                    <th>Labor (hrs)</th>
                    <th>Labor Cost</th>
                    <th>Parts Cost</th>
                    <th>Total</th>
                    <th>Technician</th>
                    <th>Meter</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceHistory.map((record) => (
                    <tr key={record.id}>
                      <td>{formatDate(record.completedDate)}</td>
                      <td>
                        <div className="vehicle-cell">
                          <span className="vehicle-num">{record.vehicleNumber}</span>
                          <span className="vehicle-type">{record.vehicleType}</span>
                        </div>
                      </td>
                      <td>{record.maintenanceType}</td>
                      <td>
                        <span className={`category-badge ${record.category}`}>
                          {record.category}
                        </span>
                      </td>
                      <td>{record.laborHours}</td>
                      <td>{formatCurrency(record.laborCost)}</td>
                      <td>{formatCurrency(record.partsCost)}</td>
                      <td className="total-cell">{formatCurrency(record.totalCost)}</td>
                      <td>{record.technician}</td>
                      <td>{record.meterAtService.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>Totals</td>
                    <td>{formatCurrency(maintenanceHistory.reduce((s, r) => s + r.laborCost, 0))}</td>
                    <td>{formatCurrency(maintenanceHistory.reduce((s, r) => s + r.partsCost, 0))}</td>
                    <td className="total-cell">{formatCurrency(totalMaintenanceCost)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="quick-actions-footer">
        <Link to="/equipment/maintenance/schedule" className="quick-action">
          <CalendarCheck size={20} />
          <span>Schedule Service</span>
        </Link>
        <Link to="/equipment/maintenance/pm-templates" className="quick-action">
          <FileText size={20} />
          <span>PM Templates</span>
        </Link>
        <Link to="/equipment/maintenance/vendors" className="quick-action">
          <MapPin size={20} />
          <span>Service Vendors</span>
        </Link>
        <Link to="/equipment/maintenance/reports" className="quick-action">
          <BarChart3 size={20} />
          <span>Reports</span>
        </Link>
      </div>
    </div>
  );
}

export default MaintenanceDashboard;
