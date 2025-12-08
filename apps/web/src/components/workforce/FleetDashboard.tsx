// =============================================================================
// Component: FleetDashboard
// Purpose: Fleet management with driver qualification tracking (MVR, CDL, Medical)
// Per System Prompt v5.0: Data-driven "3 strikes" policy, driver eligibility
// =============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  Truck,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Shield,
  ChevronRight,
  Search,
  RefreshCw,
  AlertCircle,
  CreditCard,
  Heart,
  Ban,
} from 'lucide-react';
import './FleetDashboard.css';

interface Driver {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  license_number: string;
  license_state: string;
  license_class: string;
  license_expiration: string;
  endorsements: string[];
  restrictions: string[];
  eligibility_status: 'eligible' | 'restricted' | 'suspended' | 'pending_review';
  violation_count: number;
  points_total: number;
  last_mvr_date: string | null;
  medical_card_expiration: string | null;
}

interface FleetPolicyRule {
  id: string;
  rule_type: string;
  description: string;
  threshold_value: number;
  consequence: string;
  is_active: boolean;
}

interface MVRViolation {
  id: string;
  driver_id: string;
  violation_date: string;
  violation_type: string;
  description: string;
  points: number;
  state: string;
  conviction_date: string | null;
}

interface Vehicle {
  id: string;
  vehicle_number: string;
  make: string;
  model: string;
  year: number;
  vin: string;
  license_plate: string;
  vehicle_type: string;
  status: 'active' | 'maintenance' | 'out_of_service';
  assigned_driver_id: string | null;
  assigned_driver_name: string | null;
  next_service_date: string | null;
  dot_inspection_due: string | null;
}

export const FleetDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'drivers' | 'vehicles' | 'policy'>('drivers');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [policyRules, setPolicyRules] = useState<FleetPolicyRule[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverViolations, setDriverViolations] = useState<MVRViolation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversRes, vehiclesRes, policyRes] = await Promise.all([
        supabase
          .from('driver_licenses')
          .select(`
            id,
            employee_id,
            employees(first_name, last_name),
            license_number,
            license_state,
            license_class,
            license_expiration,
            endorsements,
            restrictions,
            eligibility_status,
            violation_count,
            points_total,
            last_mvr_date,
            medical_card_expiration
          `)
          .order('eligibility_status'),
        supabase
          .from('equipment')
          .select(`
            id,
            equipment_number,
            make,
            model,
            year,
            vin,
            license_plate,
            equipment_type,
            status,
            assigned_to_employee_id,
            next_service_date,
            dot_inspection_due
          `)
          .in('equipment_type', ['TRUCK', 'PICKUP', 'TRAILER', 'DUMP_TRUCK', 'WATER_TRUCK'])
          .order('equipment_number'),
        supabase
          .from('fleet_policy_rules')
          .select('*')
          .eq('is_active', true)
          .order('rule_type'),
      ]);

      if (driversRes.data) {
        setDrivers(driversRes.data.map(d => ({
          ...d,
          first_name: (d.employees as any)?.first_name || '',
          last_name: (d.employees as any)?.last_name || '',
        })) as any);
      }

      if (vehiclesRes.data) {
        setVehicles(vehiclesRes.data.map(v => ({
          id: v.id,
          vehicle_number: v.equipment_number,
          make: v.make || '',
          model: v.model || '',
          year: v.year || 0,
          vin: v.vin || '',
          license_plate: v.license_plate || '',
          vehicle_type: v.equipment_type,
          status: v.status as any,
          assigned_driver_id: v.assigned_to_employee_id,
          assigned_driver_name: null,
          next_service_date: v.next_service_date,
          dot_inspection_due: v.dot_inspection_due,
        })));
      }

      if (policyRes.data) {
        setPolicyRules(policyRes.data as any);
      }
    } catch (error) {
      console.error('Error loading fleet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDriverViolations = async (driverId: string) => {
    const { data } = await supabase
      .from('mvr_records')
      .select('*')
      .eq('driver_id', driverId)
      .order('violation_date', { ascending: false });

    if (data) {
      setDriverViolations(data as any);
    }
  };

  const selectDriver = (driver: Driver) => {
    setSelectedDriver(driver);
    loadDriverViolations(driver.id);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'eligible':
        return <CheckCircle size={18} className="status-icon eligible" />;
      case 'restricted':
        return <AlertTriangle size={18} className="status-icon restricted" />;
      case 'suspended':
        return <XCircle size={18} className="status-icon suspended" />;
      case 'pending_review':
        return <Clock size={18} className="status-icon pending" />;
      default:
        return null;
    }
  };

  const getDaysUntil = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const filteredDrivers = drivers.filter(d => {
    const matchesSearch = `${d.first_name} ${d.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.eligibility_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalDrivers: drivers.length,
    eligible: drivers.filter(d => d.eligibility_status === 'eligible').length,
    restricted: drivers.filter(d => d.eligibility_status === 'restricted').length,
    suspended: drivers.filter(d => d.eligibility_status === 'suspended').length,
    expiringLicenses: drivers.filter(d => {
      const days = getDaysUntil(d.license_expiration);
      return days !== null && days <= 30 && days > 0;
    }).length,
    expiringMedicals: drivers.filter(d => {
      const days = getDaysUntil(d.medical_card_expiration);
      return days !== null && days <= 30 && days > 0;
    }).length,
  };

  if (loading) {
    return (
      <div className="fleet-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading fleet data...</p>
      </div>
    );
  }

  return (
    <div className="fleet-dashboard">
      {/* Header */}
      <div className="fleet-header">
        <div className="header-title">
          <Truck size={28} />
          <div>
            <h1>Fleet & Driver Qualification</h1>
            <p>MVR tracking, CDL management, driver eligibility</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadData}>
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card drivers">
          <div className="stat-icon">
            <User size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalDrivers}</span>
            <span className="stat-label">Total Drivers</span>
          </div>
        </div>

        <div className="stat-card eligible">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.eligible}</span>
            <span className="stat-label">Eligible</span>
          </div>
        </div>

        <div className="stat-card restricted">
          <div className="stat-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.restricted}</span>
            <span className="stat-label">Restricted</span>
          </div>
        </div>

        <div className="stat-card suspended">
          <div className="stat-icon">
            <Ban size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.suspended}</span>
            <span className="stat-label">Suspended</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(stats.expiringLicenses > 0 || stats.expiringMedicals > 0) && (
        <div className="alert-banner">
          <AlertCircle size={20} />
          <div className="alert-content">
            <strong>Expiring Credentials</strong>
            <span>
              {stats.expiringLicenses > 0 && `${stats.expiringLicenses} license(s) expiring within 30 days`}
              {stats.expiringLicenses > 0 && stats.expiringMedicals > 0 && ' • '}
              {stats.expiringMedicals > 0 && `${stats.expiringMedicals} medical card(s) expiring within 30 days`}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab ${activeTab === 'drivers' ? 'active' : ''}`}
          onClick={() => setActiveTab('drivers')}
        >
          <User size={16} />
          Drivers
        </button>
        <button
          className={`tab ${activeTab === 'vehicles' ? 'active' : ''}`}
          onClick={() => setActiveTab('vehicles')}
        >
          <Truck size={16} />
          Vehicles
        </button>
        <button
          className={`tab ${activeTab === 'policy' ? 'active' : ''}`}
          onClick={() => setActiveTab('policy')}
        >
          <Shield size={16} />
          Policy Rules
        </button>
      </div>

      {/* Drivers Tab */}
      {activeTab === 'drivers' && (
        <div className="tab-content">
          <div className="content-layout">
            {/* Driver List */}
            <div className="driver-list-panel">
              <div className="panel-header">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search drivers..."
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="status-filter"
                >
                  <option value="all">All Status</option>
                  <option value="eligible">Eligible</option>
                  <option value="restricted">Restricted</option>
                  <option value="suspended">Suspended</option>
                  <option value="pending_review">Pending Review</option>
                </select>
              </div>

              <div className="driver-list">
                {filteredDrivers.map(driver => (
                  <div
                    key={driver.id}
                    className={`driver-item ${selectedDriver?.id === driver.id ? 'selected' : ''}`}
                    onClick={() => selectDriver(driver)}
                  >
                    <div className="driver-status">
                      {getStatusIcon(driver.eligibility_status)}
                    </div>
                    <div className="driver-info">
                      <span className="driver-name">
                        {driver.first_name} {driver.last_name}
                      </span>
                      <span className="driver-license">
                        {driver.license_class} - {driver.license_state} {driver.license_number}
                      </span>
                    </div>
                    <div className="driver-meta">
                      {driver.violation_count > 0 && (
                        <span className="violation-badge">
                          {driver.violation_count} violation{driver.violation_count !== 1 ? 's' : ''}
                        </span>
                      )}
                      <ChevronRight size={16} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Driver Detail */}
            <div className="driver-detail-panel">
              {selectedDriver ? (
                <>
                  <div className="detail-header">
                    <div className={`status-badge ${selectedDriver.eligibility_status}`}>
                      {getStatusIcon(selectedDriver.eligibility_status)}
                      <span>{selectedDriver.eligibility_status.replace('_', ' ')}</span>
                    </div>
                    <h2>{selectedDriver.first_name} {selectedDriver.last_name}</h2>
                  </div>

                  <div className="detail-sections">
                    {/* License Info */}
                    <div className="detail-section">
                      <h3>
                        <CreditCard size={16} />
                        License Information
                      </h3>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <span className="label">License Number</span>
                          <span className="value">{selectedDriver.license_number}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">State</span>
                          <span className="value">{selectedDriver.license_state}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Class</span>
                          <span className="value">{selectedDriver.license_class}</span>
                        </div>
                        <div className="detail-item">
                          <span className="label">Expiration</span>
                          <span className={`value ${getDaysUntil(selectedDriver.license_expiration)! <= 30 ? 'expiring' : ''}`}>
                            {selectedDriver.license_expiration}
                            {getDaysUntil(selectedDriver.license_expiration)! <= 30 && (
                              <span className="days-warning">
                                ({getDaysUntil(selectedDriver.license_expiration)} days)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {selectedDriver.endorsements && selectedDriver.endorsements.length > 0 && (
                        <div className="tags-row">
                          <span className="tags-label">Endorsements:</span>
                          {selectedDriver.endorsements.map(e => (
                            <span key={e} className="tag endorsement">{e}</span>
                          ))}
                        </div>
                      )}

                      {selectedDriver.restrictions && selectedDriver.restrictions.length > 0 && (
                        <div className="tags-row">
                          <span className="tags-label">Restrictions:</span>
                          {selectedDriver.restrictions.map(r => (
                            <span key={r} className="tag restriction">{r}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Medical Card */}
                    <div className="detail-section">
                      <h3>
                        <Heart size={16} />
                        Medical Card
                      </h3>
                      {selectedDriver.medical_card_expiration ? (
                        <div className="medical-status">
                          <span className={`expiration ${getDaysUntil(selectedDriver.medical_card_expiration)! <= 30 ? 'expiring' : ''}`}>
                            Expires: {selectedDriver.medical_card_expiration}
                          </span>
                          {getDaysUntil(selectedDriver.medical_card_expiration)! <= 30 && (
                            <span className="warning-text">
                              <AlertTriangle size={14} />
                              Expires in {getDaysUntil(selectedDriver.medical_card_expiration)} days
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="no-data">No medical card on file</span>
                      )}
                    </div>

                    {/* MVR History */}
                    <div className="detail-section">
                      <h3>
                        <FileText size={16} />
                        MVR History
                      </h3>
                      <div className="mvr-summary">
                        <div className="mvr-stat">
                          <span className="mvr-value">{selectedDriver.violation_count}</span>
                          <span className="mvr-label">Violations</span>
                        </div>
                        <div className="mvr-stat">
                          <span className="mvr-value">{selectedDriver.points_total}</span>
                          <span className="mvr-label">Points</span>
                        </div>
                        <div className="mvr-stat">
                          <span className="mvr-value">
                            {selectedDriver.last_mvr_date || 'Never'}
                          </span>
                          <span className="mvr-label">Last MVR</span>
                        </div>
                      </div>

                      {driverViolations.length > 0 ? (
                        <div className="violation-list">
                          {driverViolations.map(v => (
                            <div key={v.id} className="violation-item">
                              <div className="violation-date">{v.violation_date}</div>
                              <div className="violation-info">
                                <span className="violation-type">{v.violation_type}</span>
                                <span className="violation-desc">{v.description}</span>
                              </div>
                              <div className="violation-points">
                                {v.points} pts
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="no-violations">
                          <CheckCircle size={20} />
                          <span>No violations on record</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-selection">
                  <User size={48} />
                  <p>Select a driver to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <div className="tab-content">
          <div className="vehicle-grid">
            {vehicles.map(vehicle => (
              <div key={vehicle.id} className={`vehicle-card ${vehicle.status}`}>
                <div className="vehicle-header">
                  <span className="vehicle-number">{vehicle.vehicle_number}</span>
                  <span className={`vehicle-status ${vehicle.status}`}>
                    {vehicle.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="vehicle-body">
                  <div className="vehicle-info">
                    <span className="vehicle-make">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </span>
                    <span className="vehicle-type">{vehicle.vehicle_type}</span>
                  </div>
                  <div className="vehicle-details">
                    <div className="detail-row">
                      <span className="label">VIN</span>
                      <span className="value">{vehicle.vin || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">License Plate</span>
                      <span className="value">{vehicle.license_plate || 'N/A'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Next Service</span>
                      <span className={`value ${getDaysUntil(vehicle.next_service_date)! <= 7 ? 'warning' : ''}`}>
                        {vehicle.next_service_date || 'Not scheduled'}
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">DOT Inspection Due</span>
                      <span className={`value ${getDaysUntil(vehicle.dot_inspection_due)! <= 30 ? 'warning' : ''}`}>
                        {vehicle.dot_inspection_due || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Policy Rules Tab */}
      {activeTab === 'policy' && (
        <div className="tab-content">
          <div className="policy-intro">
            <Shield size={24} />
            <div>
              <h3>Fleet Policy Rules</h3>
              <p>Data-driven policy enforcement. These rules automatically evaluate driver eligibility based on MVR records.</p>
            </div>
          </div>

          <div className="policy-list">
            {policyRules.map(rule => (
              <div key={rule.id} className="policy-card">
                <div className="policy-header">
                  <span className="policy-type">{rule.rule_type}</span>
                  <span className={`policy-status ${rule.is_active ? 'active' : 'inactive'}`}>
                    {rule.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="policy-description">{rule.description}</p>
                <div className="policy-details">
                  <div className="policy-detail">
                    <span className="label">Threshold</span>
                    <span className="value">{rule.threshold_value}</span>
                  </div>
                  <div className="policy-detail consequence">
                    <span className="label">Consequence</span>
                    <span className="value">{rule.consequence}</span>
                  </div>
                </div>
              </div>
            ))}

            {policyRules.length === 0 && (
              <div className="no-policies">
                <Shield size={32} />
                <p>No policy rules configured</p>
                <span>Add fleet policy rules in settings</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FleetDashboard;
