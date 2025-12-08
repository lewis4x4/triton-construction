import { useState, useEffect } from 'react';
import {
  Truck,
  FileText,
  Calendar,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ChevronRight,
  Shield,
  Gauge,
  Hash,
  Clock,
  AlertOctagon,
  Car,
  Clipboard,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './VehicleDetails.css';

interface Vehicle {
  id: string;
  vehicle_number: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  vehicle_type: string;
  status: string;
  dot_status: string;
  license_plate: string;
  license_state: string;
  registration_expiry: string;
  title_number: string;
  title_state: string;
  insurance_policy_number: string;
  insurance_expiry: string;
  current_odometer: number;
  last_odometer_date: string;
  dot_annual_inspection_due: string;
  dot_number: string;
  ifta_decal_number: string;
  ifta_expiry: string;
  gvwr: number;
  fuel_type: string;
  tank_capacity: number;
  assigned_driver_id: string;
  assigned_driver_name: string;
  current_project_id: string;
  project_name: string;
  organization_id: string;
  created_at: string;
  notes: string;
}

interface VehicleStats {
  total: number;
  active: number;
  inMaintenance: number;
  outOfService: number;
  dotCompliant: number;
  dotExpiringSoon: number;
  registrationExpiring: number;
}

export function VehicleDetails() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dotFilter, setDotFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          *,
          crew_members!vehicles_assigned_driver_id_fkey(display_name),
          projects(name)
        `)
        .order('vehicle_number');

      if (error) throw error;

      const vehicleList: Vehicle[] = (data || []).map((v: any) => ({
        id: v.id,
        vehicle_number: v.vehicle_number,
        vin: v.vin,
        year: v.year,
        make: v.make,
        model: v.model,
        vehicle_type: v.vehicle_type,
        status: v.status,
        dot_status: v.dot_status || 'unknown',
        license_plate: v.license_plate,
        license_state: v.license_state,
        registration_expiry: v.registration_expiry,
        title_number: v.title_number,
        title_state: v.title_state,
        insurance_policy_number: v.insurance_policy_number,
        insurance_expiry: v.insurance_expiry,
        current_odometer: v.current_odometer || 0,
        last_odometer_date: v.last_odometer_date,
        dot_annual_inspection_due: v.dot_annual_inspection_due,
        dot_number: v.dot_number,
        ifta_decal_number: v.ifta_decal_number,
        ifta_expiry: v.ifta_expiry,
        gvwr: v.gvwr,
        fuel_type: v.fuel_type,
        tank_capacity: v.tank_capacity,
        assigned_driver_id: v.assigned_driver_id,
        assigned_driver_name: v.crew_members?.display_name || 'Unassigned',
        current_project_id: v.current_project_id,
        project_name: v.projects?.name || 'Unassigned',
        organization_id: v.organization_id,
        created_at: v.created_at,
        notes: v.notes,
      }));

      setVehicles(vehicleList);

      // Calculate stats
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const activeCount = vehicleList.filter(v => v.status === 'active').length;
      const maintenanceCount = vehicleList.filter(v => v.status === 'in_maintenance').length;
      const oosCount = vehicleList.filter(v => v.status === 'out_of_service').length;
      const dotCompliantCount = vehicleList.filter(v => v.dot_status === 'compliant').length;
      const dotExpiringCount = vehicleList.filter(v => {
        if (!v.dot_annual_inspection_due) return false;
        const dueDate = new Date(v.dot_annual_inspection_due);
        return dueDate <= thirtyDaysFromNow && dueDate > now;
      }).length;
      const regExpiringCount = vehicleList.filter(v => {
        if (!v.registration_expiry) return false;
        const expDate = new Date(v.registration_expiry);
        return expDate <= thirtyDaysFromNow && expDate > now;
      }).length;

      setStats({
        total: vehicleList.length,
        active: activeCount,
        inMaintenance: maintenanceCount,
        outOfService: oosCount,
        dotCompliant: dotCompliantCount,
        dotExpiringSoon: dotExpiringCount,
        registrationExpiring: regExpiringCount,
      });
    } catch (err) {
      console.error('Error loading vehicles:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'status-active';
      case 'in_maintenance': return 'status-maintenance';
      case 'out_of_service': return 'status-oos';
      case 'retired': return 'status-retired';
      default: return 'status-unknown';
    }
  };

  const getDotStatusColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'dot-compliant';
      case 'expiring_soon': return 'dot-expiring';
      case 'expired': return 'dot-expired';
      case 'needs_inspection': return 'dot-needs';
      default: return 'dot-unknown';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatOdometer = (miles: number) => {
    return miles?.toLocaleString() || '0';
  };

  const filteredVehicles = vehicles.filter(v => {
    const matchesSearch = searchTerm === '' ||
      v.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.license_plate?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
    const matchesDot = dotFilter === 'all' || v.dot_status === dotFilter;
    const matchesType = typeFilter === 'all' || v.vehicle_type === typeFilter;

    return matchesSearch && matchesStatus && matchesDot && matchesType;
  });

  const vehicleTypes = [...new Set(vehicles.map(v => v.vehicle_type).filter(Boolean))];

  return (
    <div className="vehicle-details-page">
      <div className="page-header">
        <div className="header-content">
          <h1><Truck size={28} /> Vehicle Fleet Details</h1>
          <p>Manage vehicle registration, VIN tracking, and DOT compliance</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadVehicles}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> Add Vehicle
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total"><Truck size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Vehicles</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon active"><CheckCircle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.active}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon maintenance"><AlertOctagon size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.inMaintenance}</span>
              <span className="stat-label">In Maintenance</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon compliant"><Shield size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.dotCompliant}</span>
              <span className="stat-label">DOT Compliant</span>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon warning"><AlertTriangle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.dotExpiringSoon + stats.registrationExpiring}</span>
              <span className="stat-label">Expiring Soon</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by vehicle #, VIN, make, model, plate..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="in_maintenance">In Maintenance</option>
            <option value="out_of_service">Out of Service</option>
            <option value="retired">Retired</option>
          </select>
          <select value={dotFilter} onChange={(e) => setDotFilter(e.target.value)}>
            <option value="all">All DOT Status</option>
            <option value="compliant">Compliant</option>
            <option value="expiring_soon">Expiring Soon</option>
            <option value="expired">Expired</option>
            <option value="needs_inspection">Needs Inspection</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {vehicleTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Vehicle List */}
      <div className="vehicle-list">
        {isLoading ? (
          <div className="loading-state">
            <RefreshCw className="spinning" size={32} />
            <p>Loading vehicles...</p>
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="empty-state">
            <Truck size={48} />
            <p>No vehicles found</p>
          </div>
        ) : (
          filteredVehicles.map(vehicle => (
            <div
              key={vehicle.id}
              className={`vehicle-card ${selectedVehicle?.id === vehicle.id ? 'selected' : ''}`}
              onClick={() => setSelectedVehicle(vehicle)}
            >
              <div className="vehicle-header">
                <div className="vehicle-identity">
                  <Car size={20} />
                  <span className="vehicle-number">{vehicle.vehicle_number}</span>
                  <span className={`status-badge ${getStatusColor(vehicle.status)}`}>
                    {vehicle.status?.replace('_', ' ')}
                  </span>
                  <span className={`dot-badge ${getDotStatusColor(vehicle.dot_status)}`}>
                    DOT: {vehicle.dot_status?.replace('_', ' ')}
                  </span>
                </div>
                <ChevronRight size={20} className="chevron" />
              </div>

              <div className="vehicle-info">
                <div className="info-row">
                  <span className="info-label">
                    <Hash size={14} /> VIN
                  </span>
                  <span className="info-value">{vehicle.vin || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">
                    <Truck size={14} /> Vehicle
                  </span>
                  <span className="info-value">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">
                    <FileText size={14} /> Plate
                  </span>
                  <span className="info-value">
                    {vehicle.license_plate} ({vehicle.license_state})
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">
                    <Gauge size={14} /> Odometer
                  </span>
                  <span className="info-value">{formatOdometer(vehicle.current_odometer)} mi</span>
                </div>
              </div>

              <div className="vehicle-compliance">
                <div className="compliance-item">
                  <Calendar size={14} />
                  <span>Reg: {formatDate(vehicle.registration_expiry)}</span>
                </div>
                <div className="compliance-item">
                  <Shield size={14} />
                  <span>DOT Due: {formatDate(vehicle.dot_annual_inspection_due)}</span>
                </div>
                <div className="compliance-item">
                  <Clipboard size={14} />
                  <span>IFTA: {formatDate(vehicle.ifta_expiry)}</span>
                </div>
              </div>

              <div className="vehicle-assignment">
                <span><MapPin size={14} /> {vehicle.project_name}</span>
                <span><Clock size={14} /> {vehicle.assigned_driver_name}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Vehicle Detail Panel */}
      {selectedVehicle && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>{selectedVehicle.vehicle_number}</h2>
            <button className="close-btn" onClick={() => setSelectedVehicle(null)}>&times;</button>
          </div>
          <div className="panel-content">
            <div className="detail-section">
              <h3>Vehicle Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>VIN</label>
                  <span>{selectedVehicle.vin || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Year/Make/Model</label>
                  <span>{selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}</span>
                </div>
                <div className="detail-item">
                  <label>Type</label>
                  <span>{selectedVehicle.vehicle_type}</span>
                </div>
                <div className="detail-item">
                  <label>Status</label>
                  <span className={`status-badge ${getStatusColor(selectedVehicle.status)}`}>
                    {selectedVehicle.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Fuel Type</label>
                  <span>{selectedVehicle.fuel_type}</span>
                </div>
                <div className="detail-item">
                  <label>Tank Capacity</label>
                  <span>{selectedVehicle.tank_capacity} gal</span>
                </div>
                <div className="detail-item">
                  <label>GVWR</label>
                  <span>{selectedVehicle.gvwr?.toLocaleString()} lbs</span>
                </div>
                <div className="detail-item">
                  <label>Current Odometer</label>
                  <span>{formatOdometer(selectedVehicle.current_odometer)} mi</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Registration & Title</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>License Plate</label>
                  <span>{selectedVehicle.license_plate} ({selectedVehicle.license_state})</span>
                </div>
                <div className="detail-item">
                  <label>Registration Expiry</label>
                  <span>{formatDate(selectedVehicle.registration_expiry)}</span>
                </div>
                <div className="detail-item">
                  <label>Title Number</label>
                  <span>{selectedVehicle.title_number || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Title State</label>
                  <span>{selectedVehicle.title_state || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>DOT Compliance</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>DOT Status</label>
                  <span className={`dot-badge ${getDotStatusColor(selectedVehicle.dot_status)}`}>
                    {selectedVehicle.dot_status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="detail-item">
                  <label>DOT Number</label>
                  <span>{selectedVehicle.dot_number || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Annual Inspection Due</label>
                  <span>{formatDate(selectedVehicle.dot_annual_inspection_due)}</span>
                </div>
                <div className="detail-item">
                  <label>IFTA Decal</label>
                  <span>{selectedVehicle.ifta_decal_number || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>IFTA Expiry</label>
                  <span>{formatDate(selectedVehicle.ifta_expiry)}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Insurance</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Policy Number</label>
                  <span>{selectedVehicle.insurance_policy_number || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Expiry Date</label>
                  <span>{formatDate(selectedVehicle.insurance_expiry)}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Assignment</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Assigned Driver</label>
                  <span>{selectedVehicle.assigned_driver_name}</span>
                </div>
                <div className="detail-item">
                  <label>Current Project</label>
                  <span>{selectedVehicle.project_name}</span>
                </div>
              </div>
            </div>

            {selectedVehicle.notes && (
              <div className="detail-section">
                <h3>Notes</h3>
                <p className="notes-text">{selectedVehicle.notes}</p>
              </div>
            )}
          </div>
          <div className="panel-actions">
            <button className="btn btn-secondary">View History</button>
            <button className="btn btn-secondary">Schedule Inspection</button>
            <button className="btn btn-primary">Edit Vehicle</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VehicleDetails;
