import { useState, useEffect } from 'react';
import {
  Truck,
  Wrench,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
  Settings,
  Calendar,
  Gauge,
  DollarSign,
  ChevronRight,
  AlertOctagon,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './EquipmentFleetDashboard.css';

interface EquipmentItem {
  id: string;
  equipment_number: string;
  description: string | null;
  equipment_category: string;
  equipment_category_typed: string | null;
  make: string | null;
  model: string | null;
  status: string;
  equipment_status: string | null;
  ownership_type: string | null;
  current_engine_hours: number | null;
  current_project_id: string | null;
  project_number: string | null;
  project_name: string | null;
  current_latitude: number | null;
  current_longitude: number | null;
  last_location_update: string | null;
  location_conflict_flagged: boolean | null;
  hourly_total_cost: number | null;
  next_service_due_date: string | null;
  next_service_due_hours: number | null;
  next_annual_inspection: string | null;
  maintenance_status: string;
  inspection_status: string;
}

interface FleetStats {
  totalEquipment: number;
  activeEquipment: number;
  inMaintenance: number;
  downEquipment: number;
  maintenanceOverdue: number;
  inspectionsDueSoon: number;
  locationConflicts: number;
  avgUtilization: number;
}

interface MaintenanceAlert {
  id: string;
  equipment_number: string;
  description: string | null;
  alert_type: 'maintenance_overdue' | 'maintenance_due_soon' | 'inspection_overdue' | 'inspection_due_soon' | 'hours_due_soon';
  due_date: string | null;
  due_hours: number | null;
  current_hours: number | null;
}

export function EquipmentFleetDashboard() {
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [stats, setStats] = useState<FleetStats | null>(null);
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load equipment from view
      const { data: fleetData, error } = await supabase
        .from('v_equipment_fleet_overview')
        .select('*')
        .order('equipment_number');

      if (error) throw error;

      // Map the view data to our interface with proper defaults
      const items: EquipmentItem[] = (fleetData || []).map((e: any) => ({
        id: e.id || '',
        equipment_number: e.equipment_number || '',
        description: e.description,
        equipment_category: e.equipment_category || 'Unknown',
        equipment_category_typed: e.equipment_category_typed,
        make: e.make,
        model: e.model,
        status: e.status || 'UNKNOWN',
        equipment_status: e.equipment_status,
        ownership_type: e.ownership_type,
        current_engine_hours: e.current_engine_hours,
        current_project_id: e.current_project_id,
        project_number: e.project_number,
        project_name: e.project_name,
        current_latitude: e.current_latitude,
        current_longitude: e.current_longitude,
        last_location_update: e.last_location_update,
        location_conflict_flagged: e.location_conflict_flagged,
        hourly_total_cost: e.hourly_total_cost,
        next_service_due_date: e.next_service_due_date,
        next_service_due_hours: e.next_service_due_hours,
        next_annual_inspection: e.next_annual_inspection,
        maintenance_status: e.maintenance_status || 'OK',
        inspection_status: e.inspection_status || 'OK',
      }));
      setEquipment(items);

      // Calculate stats
      const activeCount = items.filter(e =>
        e.status === 'ACTIVE' || e.equipment_status === 'active' || e.equipment_status === 'available'
      ).length;

      const maintenanceCount = items.filter(e =>
        e.status === 'MAINTENANCE' || e.equipment_status === 'in_maintenance'
      ).length;

      const downCount = items.filter(e =>
        e.status === 'DOWN' || e.equipment_status === 'down'
      ).length;

      const overdueCount = items.filter(e => e.maintenance_status === 'OVERDUE').length;
      const inspectionDueCount = items.filter(e =>
        e.inspection_status === 'OVERDUE' || e.inspection_status === 'DUE_SOON'
      ).length;
      const conflictCount = items.filter(e => e.location_conflict_flagged).length;

      setStats({
        totalEquipment: items.length,
        activeEquipment: activeCount,
        inMaintenance: maintenanceCount,
        downEquipment: downCount,
        maintenanceOverdue: overdueCount,
        inspectionsDueSoon: inspectionDueCount,
        locationConflicts: conflictCount,
        avgUtilization: 0, // Would need utilization view data
      });

      // Build alerts list
      const alertsList: MaintenanceAlert[] = [];
      items.forEach(item => {
        if (item.maintenance_status === 'OVERDUE') {
          alertsList.push({
            id: item.id,
            equipment_number: item.equipment_number,
            description: item.description,
            alert_type: 'maintenance_overdue',
            due_date: item.next_service_due_date,
            due_hours: item.next_service_due_hours,
            current_hours: item.current_engine_hours,
          });
        } else if (item.maintenance_status === 'DUE_SOON') {
          alertsList.push({
            id: item.id,
            equipment_number: item.equipment_number,
            description: item.description,
            alert_type: 'maintenance_due_soon',
            due_date: item.next_service_due_date,
            due_hours: null,
            current_hours: item.current_engine_hours,
          });
        } else if (item.maintenance_status === 'HOURS_DUE_SOON') {
          alertsList.push({
            id: item.id,
            equipment_number: item.equipment_number,
            description: item.description,
            alert_type: 'hours_due_soon',
            due_date: null,
            due_hours: item.next_service_due_hours,
            current_hours: item.current_engine_hours,
          });
        }

        if (item.inspection_status === 'OVERDUE') {
          alertsList.push({
            id: item.id,
            equipment_number: item.equipment_number,
            description: item.description,
            alert_type: 'inspection_overdue',
            due_date: item.next_annual_inspection,
            due_hours: null,
            current_hours: null,
          });
        } else if (item.inspection_status === 'DUE_SOON') {
          alertsList.push({
            id: item.id,
            equipment_number: item.equipment_number,
            description: item.description,
            alert_type: 'inspection_due_soon',
            due_date: item.next_annual_inspection,
            due_hours: null,
            current_hours: null,
          });
        }
      });

      setAlerts(alertsList.slice(0, 10)); // Show top 10 alerts
    } catch (error) {
      console.error('Error loading fleet data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = searchTerm === '' ||
      item.equipment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.model?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'all' ||
      item.equipment_category === categoryFilter ||
      item.equipment_category_typed === categoryFilter;

    const matchesStatus = statusFilter === 'all' ||
      item.status === statusFilter ||
      item.equipment_status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusIcon = (item: EquipmentItem) => {
    const status = item.equipment_status || item.status;
    switch (status?.toLowerCase()) {
      case 'active':
      case 'available':
        return <CheckCircle className="status-icon active" />;
      case 'in_maintenance':
      case 'maintenance':
        return <Wrench className="status-icon maintenance" />;
      case 'down':
        return <XCircle className="status-icon down" />;
      case 'in_transit':
        return <Truck className="status-icon transit" />;
      default:
        return <PauseCircle className="status-icon idle" />;
    }
  };

  const getMaintenanceStatusBadge = (status: string) => {
    switch (status) {
      case 'OVERDUE':
        return <span className="badge badge-danger">Overdue</span>;
      case 'DUE_SOON':
      case 'HOURS_DUE_SOON':
        return <span className="badge badge-warning">Due Soon</span>;
      default:
        return <span className="badge badge-success">OK</span>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatHours = (hours: number | null) => {
    if (hours === null || hours === undefined) return '-';
    return hours.toLocaleString();
  };

  const categories = [...new Set(equipment.map(e => e.equipment_category).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="equipment-fleet-dashboard loading">
        <div className="loading-spinner">
          <RefreshCw className="spin" />
          <span>Loading fleet data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="equipment-fleet-dashboard">
      <header className="dashboard-header">
        <div className="header-title">
          <Truck size={28} />
          <h1>Equipment Fleet</h1>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadDashboardData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary">
            <Settings size={16} />
            Manage Fleet
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Truck />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalEquipment || 0}</span>
            <span className="stat-label">Total Equipment</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <CheckCircle />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.activeEquipment || 0}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <Wrench />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.inMaintenance || 0}</span>
            <span className="stat-label">In Maintenance</span>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <XCircle />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.downEquipment || 0}</span>
            <span className="stat-label">Down</span>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <AlertOctagon />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.maintenanceOverdue || 0}</span>
            <span className="stat-label">Maintenance Overdue</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <Calendar />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.inspectionsDueSoon || 0}</span>
            <span className="stat-label">Inspections Due</span>
          </div>
        </div>
      </div>

      {/* Alerts Panel */}
      {alerts.length > 0 && (
        <div className="alerts-panel">
          <h3>
            <AlertTriangle size={18} />
            Maintenance Alerts
          </h3>
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <div key={`${alert.id}-${index}`} className={`alert-item ${alert.alert_type.includes('overdue') ? 'critical' : 'warning'}`}>
                <div className="alert-icon">
                  {alert.alert_type.includes('overdue') ? (
                    <AlertOctagon size={16} />
                  ) : (
                    <AlertTriangle size={16} />
                  )}
                </div>
                <div className="alert-content">
                  <span className="alert-equipment">{alert.equipment_number}</span>
                  <span className="alert-message">
                    {alert.alert_type === 'maintenance_overdue' && 'Maintenance overdue'}
                    {alert.alert_type === 'maintenance_due_soon' && `Service due ${formatDate(alert.due_date)}`}
                    {alert.alert_type === 'hours_due_soon' && `Service due at ${formatHours(alert.due_hours)} hrs (current: ${formatHours(alert.current_hours)})`}
                    {alert.alert_type === 'inspection_overdue' && 'Inspection overdue'}
                    {alert.alert_type === 'inspection_due_soon' && `Inspection due ${formatDate(alert.due_date)}`}
                  </span>
                </div>
                <ChevronRight size={16} className="alert-arrow" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search equipment..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="available">Available</option>
            <option value="in_maintenance">In Maintenance</option>
            <option value="down">Down</option>
            <option value="in_transit">In Transit</option>
          </select>
        </div>
      </div>

      {/* Equipment Table */}
      <div className="equipment-table-container">
        <table className="equipment-table">
          <thead>
            <tr>
              <th>Equipment #</th>
              <th>Description</th>
              <th>Category</th>
              <th>Status</th>
              <th>Location/Project</th>
              <th>Hours</th>
              <th>Maintenance</th>
              <th>Inspection</th>
              <th>Cost/hr</th>
            </tr>
          </thead>
          <tbody>
            {filteredEquipment.map(item => (
              <tr
                key={item.id}
                onClick={() => setSelectedEquipment(item)}
                className={selectedEquipment?.id === item.id ? 'selected' : ''}
              >
                <td className="equipment-number">
                  {getStatusIcon(item)}
                  {item.equipment_number}
                </td>
                <td className="equipment-desc">
                  <span className="make-model">
                    {item.make} {item.model}
                  </span>
                  {item.description && (
                    <span className="description">{item.description}</span>
                  )}
                </td>
                <td>{item.equipment_category}</td>
                <td>
                  <span className={`status-badge ${(item.equipment_status || item.status).toLowerCase().replace('_', '-')}`}>
                    {item.equipment_status || item.status}
                  </span>
                </td>
                <td className="location-cell">
                  {item.project_name ? (
                    <span className="project-name">
                      <MapPin size={12} />
                      {item.project_number}: {item.project_name}
                    </span>
                  ) : (
                    <span className="no-project">Unassigned</span>
                  )}
                  {item.location_conflict_flagged && (
                    <span className="conflict-badge">
                      <AlertTriangle size={12} />
                      Conflict
                    </span>
                  )}
                </td>
                <td className="hours-cell">
                  <Gauge size={12} />
                  {formatHours(item.current_engine_hours)}
                </td>
                <td>{getMaintenanceStatusBadge(item.maintenance_status)}</td>
                <td>{getMaintenanceStatusBadge(item.inspection_status)}</td>
                <td className="cost-cell">
                  {item.hourly_total_cost ? (
                    <>
                      <DollarSign size={12} />
                      {item.hourly_total_cost.toFixed(2)}
                    </>
                  ) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredEquipment.length === 0 && (
          <div className="empty-state">
            <Truck size={48} />
            <p>No equipment found matching your criteria</p>
          </div>
        )}
      </div>

      {/* Equipment Detail Panel */}
      {selectedEquipment && (
        <div className="equipment-detail-panel">
          <div className="detail-header">
            <h3>{selectedEquipment.equipment_number}</h3>
            <button onClick={() => setSelectedEquipment(null)}>×</button>
          </div>
          <div className="detail-content">
            <div className="detail-row">
              <span className="label">Description</span>
              <span className="value">{selectedEquipment.description || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Make/Model</span>
              <span className="value">{selectedEquipment.make} {selectedEquipment.model}</span>
            </div>
            <div className="detail-row">
              <span className="label">Category</span>
              <span className="value">{selectedEquipment.equipment_category}</span>
            </div>
            <div className="detail-row">
              <span className="label">Status</span>
              <span className="value">
                <span className={`status-badge ${(selectedEquipment.equipment_status || selectedEquipment.status).toLowerCase().replace('_', '-')}`}>
                  {selectedEquipment.equipment_status || selectedEquipment.status}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Ownership</span>
              <span className="value">{selectedEquipment.ownership_type || '-'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Engine Hours</span>
              <span className="value">{formatHours(selectedEquipment.current_engine_hours)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Assigned Project</span>
              <span className="value">{selectedEquipment.project_name || 'Unassigned'}</span>
            </div>
            <div className="detail-row">
              <span className="label">Next Service Date</span>
              <span className="value">{formatDate(selectedEquipment.next_service_due_date)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Service Due Hours</span>
              <span className="value">{formatHours(selectedEquipment.next_service_due_hours)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Annual Inspection</span>
              <span className="value">{formatDate(selectedEquipment.next_annual_inspection)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Hourly Cost</span>
              <span className="value">
                {selectedEquipment.hourly_total_cost
                  ? `$${selectedEquipment.hourly_total_cost.toFixed(2)}/hr`
                  : '-'
                }
              </span>
            </div>
            {selectedEquipment.current_latitude && selectedEquipment.current_longitude && (
              <div className="detail-row">
                <span className="label">Last Location</span>
                <span className="value">
                  {selectedEquipment.current_latitude.toFixed(5)}, {selectedEquipment.current_longitude.toFixed(5)}
                  {selectedEquipment.last_location_update && (
                    <span className="location-time">
                      ({formatDate(selectedEquipment.last_location_update)})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
          <div className="detail-actions">
            <button className="btn btn-secondary">View History</button>
            <button className="btn btn-primary">Schedule Maintenance</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EquipmentFleetDashboard;
