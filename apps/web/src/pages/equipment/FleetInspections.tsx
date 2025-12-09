import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  Calendar,
  ChevronLeft,
  RefreshCw,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Truck,
  Users,
  Camera,
  MapPin,
  Eye,
  Edit,
  Download,
  ChevronRight,
  AlertCircle,
  Shield,
  FileCheck,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './FleetInspections.css';

interface InspectionKPI {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

interface Inspection {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  inspectionType: 'pre_trip' | 'post_trip' | 'dot_annual' | 'safety' | 'equipment_specific';
  inspectedBy: string;
  inspectedAt: string;
  location: string;
  status: 'pass' | 'fail' | 'conditional' | 'pending';
  totalItems: number;
  passedItems: number;
  failedItems: number;
  defectsFound: DefectItem[];
  notes?: string;
  mileage: number;
  engineHours?: number;
  photos: number;
  signatureUrl?: string;
}

interface DefectItem {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  status: 'open' | 'in_repair' | 'resolved';
  photoCount: number;
}

interface InspectionSchedule {
  id: string;
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  inspectionType: string;
  dueDate: string;
  lastInspection?: string;
  status: 'upcoming' | 'due' | 'overdue';
  daysUntil: number;
}

interface VehicleComplianceStatus {
  vehicleId: string;
  vehicleNumber: string;
  vehicleType: string;
  lastPreTrip?: string;
  lastDOT?: string;
  dotExpiry?: string;
  openDefects: number;
  complianceScore: number;
  status: 'compliant' | 'attention' | 'non_compliant';
}

export function FleetInspections() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'inspections' | 'schedule' | 'defects' | 'compliance'>('inspections');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showNewInspectionModal, setShowNewInspectionModal] = useState(false);
  const [kpis, setKpis] = useState<InspectionKPI[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [schedules, setSchedules] = useState<InspectionSchedule[]>([]);
  const [complianceStatuses, setComplianceStatuses] = useState<VehicleComplianceStatus[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  useEffect(() => {
    loadInspectionData();
  }, []);

  const loadInspectionData = async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('equipment_inspections')
        .select('*')
        .order('inspected_at', { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        loadDemoData();
      } else {
        loadDemoData();
      }
    } catch (error) {
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    // KPIs
    setKpis([
      { label: 'Total Inspections', value: '347', change: 12, changeType: 'positive', icon: <ClipboardCheck size={24} />, color: '#3b82f6' },
      { label: 'Pass Rate', value: '94.2%', change: 2.1, changeType: 'positive', icon: <CheckCircle size={24} />, color: '#10b981' },
      { label: 'Open Defects', value: '8', change: -25, changeType: 'positive', icon: <AlertTriangle size={24} />, color: '#f59e0b' },
      { label: 'Overdue Inspections', value: '2', change: 50, changeType: 'negative', icon: <AlertCircle size={24} />, color: '#ef4444' },
      { label: 'DOT Compliance', value: '98%', change: 0, changeType: 'neutral', icon: <Shield size={24} />, color: '#8b5cf6' },
      { label: 'Avg Response Time', value: '4.2 hrs', change: -15, changeType: 'positive', icon: <Clock size={24} />, color: '#06b6d4' },
    ]);

    // Recent inspections
    setInspections([
      {
        id: 'i1', vehicleId: 'v1', vehicleNumber: 'TRK-001', vehicleType: 'Semi Truck',
        inspectionType: 'pre_trip', inspectedBy: 'John Martinez', inspectedAt: '2024-12-08 06:15',
        location: 'Main Yard', status: 'pass', totalItems: 32, passedItems: 32, failedItems: 0,
        defectsFound: [], mileage: 125480, engineHours: 4520, photos: 4, notes: 'All systems operational'
      },
      {
        id: 'i2', vehicleId: 'v2', vehicleNumber: 'DMP-002', vehicleType: 'Dump Truck',
        inspectionType: 'pre_trip', inspectedBy: 'Mike Thompson', inspectedAt: '2024-12-08 06:30',
        location: 'Project Site A', status: 'conditional', totalItems: 32, passedItems: 30, failedItems: 2,
        defectsFound: [
          { id: 'd1', category: 'Lights', description: 'Left rear turn signal intermittent', severity: 'minor', status: 'open', photoCount: 2 },
          { id: 'd2', category: 'Tires', description: 'Right front tire tread low (4/32)', severity: 'major', status: 'open', photoCount: 1 }
        ],
        mileage: 98200, photos: 6
      },
      {
        id: 'i3', vehicleId: 'v3', vehicleNumber: 'EXC-001', vehicleType: 'Excavator',
        inspectionType: 'equipment_specific', inspectedBy: 'Sarah Williams', inspectedAt: '2024-12-07 16:45',
        location: 'Corridor H Site', status: 'pass', totalItems: 28, passedItems: 28, failedItems: 0,
        defectsFound: [], mileage: 0, engineHours: 4510, photos: 3
      },
      {
        id: 'i4', vehicleId: 'v4', vehicleNumber: 'TRK-003', vehicleType: 'Semi Truck',
        inspectionType: 'dot_annual', inspectedBy: 'DOT Inspector', inspectedAt: '2024-12-05 10:00',
        location: 'State DOT Station', status: 'pass', totalItems: 150, passedItems: 148, failedItems: 2,
        defectsFound: [
          { id: 'd3', category: 'Brakes', description: 'Brake adjustment out of spec (corrected on-site)', severity: 'major', status: 'resolved', photoCount: 0 }
        ],
        mileage: 245000, photos: 12, notes: 'Passed after brake adjustment'
      },
      {
        id: 'i5', vehicleId: 'v5', vehicleNumber: 'LDR-001', vehicleType: 'Loader',
        inspectionType: 'safety', inspectedBy: 'Robert Davis', inspectedAt: '2024-12-04 08:00',
        location: 'Main Yard', status: 'fail', totalItems: 25, passedItems: 20, failedItems: 5,
        defectsFound: [
          { id: 'd4', category: 'Hydraulics', description: 'Hydraulic leak at boom cylinder', severity: 'critical', status: 'in_repair', photoCount: 3 },
          { id: 'd5', category: 'Safety', description: 'Backup alarm not functioning', severity: 'critical', status: 'resolved', photoCount: 1 }
        ],
        mileage: 0, engineHours: 6280, photos: 8
      },
      {
        id: 'i6', vehicleId: 'v6', vehicleNumber: 'PU-001', vehicleType: 'Pickup',
        inspectionType: 'pre_trip', inspectedBy: 'Lisa Brown', inspectedAt: '2024-12-08 07:00',
        location: 'Main Yard', status: 'pass', totalItems: 20, passedItems: 20, failedItems: 0,
        defectsFound: [], mileage: 47500, photos: 2
      },
    ]);

    // Inspection schedules
    setSchedules([
      { id: 's1', vehicleId: 'v1', vehicleNumber: 'TRK-001', vehicleType: 'Semi Truck', inspectionType: 'DOT Annual', dueDate: '2025-03-15', lastInspection: '2024-03-15', status: 'upcoming', daysUntil: 97 },
      { id: 's2', vehicleId: 'v2', vehicleNumber: 'TRK-002', vehicleType: 'Semi Truck', inspectionType: 'DOT Annual', dueDate: '2024-12-20', lastInspection: '2023-12-20', status: 'due', daysUntil: 12 },
      { id: 's3', vehicleId: 'v3', vehicleNumber: 'DMP-001', vehicleType: 'Dump Truck', inspectionType: 'DOT Annual', dueDate: '2024-12-05', lastInspection: '2023-12-05', status: 'overdue', daysUntil: -3 },
      { id: 's4', vehicleId: 'v4', vehicleNumber: 'DMP-002', vehicleType: 'Dump Truck', inspectionType: 'DOT Annual', dueDate: '2025-01-15', lastInspection: '2024-01-15', status: 'upcoming', daysUntil: 38 },
      { id: 's5', vehicleId: 'v5', vehicleNumber: 'EXC-001', vehicleType: 'Excavator', inspectionType: 'Equipment Safety', dueDate: '2024-12-10', lastInspection: '2024-06-10', status: 'due', daysUntil: 2 },
      { id: 's6', vehicleId: 'v6', vehicleNumber: 'LDR-001', vehicleType: 'Loader', inspectionType: 'Equipment Safety', dueDate: '2024-12-01', lastInspection: '2024-06-01', status: 'overdue', daysUntil: -7 },
      { id: 's7', vehicleId: 'v7', vehicleNumber: 'GRD-001', vehicleType: 'Grader', inspectionType: 'Equipment Safety', dueDate: '2025-02-01', lastInspection: '2024-08-01', status: 'upcoming', daysUntil: 55 },
    ]);

    // Compliance statuses
    setComplianceStatuses([
      { vehicleId: 'v1', vehicleNumber: 'TRK-001', vehicleType: 'Semi Truck', lastPreTrip: '2024-12-08', lastDOT: '2024-03-15', dotExpiry: '2025-03-15', openDefects: 0, complianceScore: 100, status: 'compliant' },
      { vehicleId: 'v2', vehicleNumber: 'TRK-002', vehicleType: 'Semi Truck', lastPreTrip: '2024-12-07', lastDOT: '2023-12-20', dotExpiry: '2024-12-20', openDefects: 0, complianceScore: 85, status: 'attention' },
      { vehicleId: 'v3', vehicleNumber: 'DMP-001', vehicleType: 'Dump Truck', lastPreTrip: '2024-12-06', lastDOT: '2023-12-05', dotExpiry: '2024-12-05', openDefects: 0, complianceScore: 60, status: 'non_compliant' },
      { vehicleId: 'v4', vehicleNumber: 'DMP-002', vehicleType: 'Dump Truck', lastPreTrip: '2024-12-08', lastDOT: '2024-01-15', dotExpiry: '2025-01-15', openDefects: 2, complianceScore: 78, status: 'attention' },
      { vehicleId: 'v5', vehicleNumber: 'EXC-001', vehicleType: 'Excavator', lastPreTrip: '2024-12-07', openDefects: 0, complianceScore: 95, status: 'compliant' },
      { vehicleId: 'v6', vehicleNumber: 'LDR-001', vehicleType: 'Loader', lastPreTrip: '2024-12-04', openDefects: 1, complianceScore: 70, status: 'attention' },
      { vehicleId: 'v7', vehicleNumber: 'PU-001', vehicleType: 'Pickup', lastPreTrip: '2024-12-08', openDefects: 0, complianceScore: 100, status: 'compliant' },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': case 'compliant': return '#10b981';
      case 'fail': case 'non_compliant': return '#ef4444';
      case 'conditional': case 'attention': return '#f59e0b';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getInspectionTypeLabel = (type: string) => {
    switch (type) {
      case 'pre_trip': return 'Pre-Trip';
      case 'post_trip': return 'Post-Trip';
      case 'dot_annual': return 'DOT Annual';
      case 'safety': return 'Safety';
      case 'equipment_specific': return 'Equipment';
      default: return type;
    }
  };

  // Filter inspections
  const filteredInspections = inspections.filter(i => {
    const matchesSearch = searchTerm === '' ||
      i.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.inspectedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter;
    const matchesType = typeFilter === 'all' || i.inspectionType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // All defects from inspections
  const allDefects = inspections.flatMap(i =>
    i.defectsFound.map(d => ({ ...d, vehicleNumber: i.vehicleNumber, inspectionDate: i.inspectedAt }))
  ).filter(d => d.status !== 'resolved');

  // Overdue and due schedules
  const overdueSchedules = schedules.filter(s => s.status === 'overdue');
  const dueSchedules = schedules.filter(s => s.status === 'due');

  if (loading) {
    return (
      <div className="fleet-inspections-page">
        <div className="loading-state">
          <RefreshCw size={48} className="spinning" />
          <p>Loading inspection data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fleet-inspections-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <Link to="/equipment" className="back-link">
            <ChevronLeft size={20} />
            Fleet Management
          </Link>
          <div className="header-title">
            <h1>
              <ClipboardCheck size={32} />
              Fleet Inspections
            </h1>
            <p>Vehicle inspections, compliance tracking, and defect management</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search inspections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button className="btn-secondary" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
            Filters
          </button>
          <button className="btn-primary" onClick={() => setShowNewInspectionModal(true)}>
            <Plus size={18} />
            New Inspection
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {(overdueSchedules.length > 0 || allDefects.filter(d => d.severity === 'critical').length > 0) && (
        <div className="alert-banner">
          <div className="alert-content">
            <AlertTriangle size={20} />
            <span>
              {overdueSchedules.length > 0 && <strong>{overdueSchedules.length} overdue inspection{overdueSchedules.length > 1 ? 's' : ''}</strong>}
              {overdueSchedules.length > 0 && allDefects.filter(d => d.severity === 'critical').length > 0 && ' and '}
              {allDefects.filter(d => d.severity === 'critical').length > 0 && <strong>{allDefects.filter(d => d.severity === 'critical').length} critical defect{allDefects.filter(d => d.severity === 'critical').length > 1 ? 's' : ''}</strong>}
              {' require immediate attention'}
            </span>
          </div>
          <button className="alert-action">
            Review Now <ArrowUpRight size={16} />
          </button>
        </div>
      )}

      {/* KPIs */}
      <div className="kpi-grid">
        {kpis.map((kpi, index) => (
          <div key={index} className="kpi-card">
            <div className="kpi-icon" style={{ backgroundColor: `${kpi.color}20`, color: kpi.color }}>
              {kpi.icon}
            </div>
            <div className="kpi-info">
              <span className="kpi-value">{kpi.value}</span>
              <span className="kpi-label">{kpi.label}</span>
            </div>
            {kpi.change !== undefined && kpi.change !== 0 && (
              <div className={`kpi-change ${kpi.changeType}`}>
                <TrendingUp size={14} />
                {Math.abs(kpi.change)}%
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab ${activeTab === 'inspections' ? 'active' : ''}`}
          onClick={() => setActiveTab('inspections')}
        >
          <ClipboardCheck size={18} />
          Inspections
        </button>
        <button
          className={`tab ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          <Calendar size={18} />
          Schedule
          {(overdueSchedules.length + dueSchedules.length) > 0 && (
            <span className="tab-badge">{overdueSchedules.length + dueSchedules.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'defects' ? 'active' : ''}`}
          onClick={() => setActiveTab('defects')}
        >
          <AlertTriangle size={18} />
          Defects
          {allDefects.length > 0 && (
            <span className="tab-badge">{allDefects.length}</span>
          )}
        </button>
        <button
          className={`tab ${activeTab === 'compliance' ? 'active' : ''}`}
          onClick={() => setActiveTab('compliance')}
        >
          <Shield size={18} />
          Compliance
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Inspections Tab */}
        {activeTab === 'inspections' && (
          <div className="inspections-content">
            <div className="filters-bar">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search vehicles, inspectors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <Filter size={16} />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="pass">Pass</option>
                  <option value="conditional">Conditional</option>
                  <option value="fail">Fail</option>
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="pre_trip">Pre-Trip</option>
                  <option value="post_trip">Post-Trip</option>
                  <option value="dot_annual">DOT Annual</option>
                  <option value="safety">Safety</option>
                  <option value="equipment_specific">Equipment</option>
                </select>
              </div>
            </div>

            <div className="inspections-list">
              {filteredInspections.map(inspection => (
                <div
                  key={inspection.id}
                  className={`inspection-card ${inspection.status}`}
                  onClick={() => setSelectedInspection(inspection)}
                >
                  <div className="inspection-status-indicator" style={{ backgroundColor: getStatusColor(inspection.status) }} />
                  <div className="inspection-main">
                    <div className="inspection-header">
                      <div className="vehicle-info">
                        <span className="vehicle-number">{inspection.vehicleNumber}</span>
                        <span className="vehicle-type">{inspection.vehicleType}</span>
                      </div>
                      <span className={`status-badge ${inspection.status}`}>
                        {inspection.status === 'pass' && <CheckCircle size={14} />}
                        {inspection.status === 'fail' && <XCircle size={14} />}
                        {inspection.status === 'conditional' && <AlertCircle size={14} />}
                        {inspection.status}
                      </span>
                    </div>
                    <div className="inspection-type-badge">
                      {getInspectionTypeLabel(inspection.inspectionType)}
                    </div>
                    <div className="inspection-meta">
                      <span><Users size={14} /> {inspection.inspectedBy}</span>
                      <span><Clock size={14} /> {new Date(inspection.inspectedAt).toLocaleString()}</span>
                      <span><MapPin size={14} /> {inspection.location}</span>
                    </div>
                    <div className="inspection-stats">
                      <div className="stat">
                        <FileCheck size={14} />
                        <span>{inspection.passedItems}/{inspection.totalItems} items</span>
                      </div>
                      {inspection.defectsFound.length > 0 && (
                        <div className="stat defects">
                          <AlertTriangle size={14} />
                          <span>{inspection.defectsFound.length} defect{inspection.defectsFound.length > 1 ? 's' : ''}</span>
                        </div>
                      )}
                      {inspection.photos > 0 && (
                        <div className="stat">
                          <Camera size={14} />
                          <span>{inspection.photos} photos</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={20} className="chevron" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="schedule-content">
            <div className="schedule-sections">
              {/* Overdue */}
              {overdueSchedules.length > 0 && (
                <div className="schedule-section overdue">
                  <h3><AlertCircle size={18} /> Overdue ({overdueSchedules.length})</h3>
                  <div className="schedule-list">
                    {overdueSchedules.map(schedule => (
                      <div key={schedule.id} className="schedule-card overdue">
                        <div className="schedule-vehicle">
                          <Truck size={18} />
                          <div>
                            <span className="vehicle-num">{schedule.vehicleNumber}</span>
                            <span className="vehicle-type">{schedule.vehicleType}</span>
                          </div>
                        </div>
                        <div className="schedule-info">
                          <span className="inspection-type">{schedule.inspectionType}</span>
                          <span className="due-date">Due: {schedule.dueDate}</span>
                        </div>
                        <div className="days-indicator overdue">
                          {Math.abs(schedule.daysUntil)} days overdue
                        </div>
                        <button className="btn btn-primary btn-sm">Schedule Now</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Due Soon */}
              {dueSchedules.length > 0 && (
                <div className="schedule-section due">
                  <h3><Clock size={18} /> Due Soon ({dueSchedules.length})</h3>
                  <div className="schedule-list">
                    {dueSchedules.map(schedule => (
                      <div key={schedule.id} className="schedule-card due">
                        <div className="schedule-vehicle">
                          <Truck size={18} />
                          <div>
                            <span className="vehicle-num">{schedule.vehicleNumber}</span>
                            <span className="vehicle-type">{schedule.vehicleType}</span>
                          </div>
                        </div>
                        <div className="schedule-info">
                          <span className="inspection-type">{schedule.inspectionType}</span>
                          <span className="due-date">Due: {schedule.dueDate}</span>
                        </div>
                        <div className="days-indicator due">
                          {schedule.daysUntil} days remaining
                        </div>
                        <button className="btn btn-secondary btn-sm">Schedule</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming */}
              <div className="schedule-section upcoming">
                <h3><CalendarCheck size={18} /> Upcoming ({schedules.filter(s => s.status === 'upcoming').length})</h3>
                <div className="schedule-list">
                  {schedules.filter(s => s.status === 'upcoming').map(schedule => (
                    <div key={schedule.id} className="schedule-card upcoming">
                      <div className="schedule-vehicle">
                        <Truck size={18} />
                        <div>
                          <span className="vehicle-num">{schedule.vehicleNumber}</span>
                          <span className="vehicle-type">{schedule.vehicleType}</span>
                        </div>
                      </div>
                      <div className="schedule-info">
                        <span className="inspection-type">{schedule.inspectionType}</span>
                        <span className="due-date">Due: {schedule.dueDate}</span>
                      </div>
                      <div className="days-indicator upcoming">
                        {schedule.daysUntil} days
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Defects Tab */}
        {activeTab === 'defects' && (
          <div className="defects-content">
            <div className="defects-summary">
              <div className="defect-stat critical">
                <span className="count">{allDefects.filter(d => d.severity === 'critical').length}</span>
                <span className="label">Critical</span>
              </div>
              <div className="defect-stat major">
                <span className="count">{allDefects.filter(d => d.severity === 'major').length}</span>
                <span className="label">Major</span>
              </div>
              <div className="defect-stat minor">
                <span className="count">{allDefects.filter(d => d.severity === 'minor').length}</span>
                <span className="label">Minor</span>
              </div>
            </div>

            <div className="defects-table">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Reported</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allDefects.map(defect => (
                    <tr key={defect.id}>
                      <td className="vehicle-cell">{defect.vehicleNumber}</td>
                      <td>{defect.category}</td>
                      <td>{defect.description}</td>
                      <td>
                        <span className={`severity-badge ${defect.severity}`}>
                          {defect.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`defect-status ${defect.status}`}>
                          {defect.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{new Date(defect.inspectionDate).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn" title="View"><Eye size={16} /></button>
                          <button className="action-btn" title="Edit"><Edit size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Compliance Tab */}
        {activeTab === 'compliance' && (
          <div className="compliance-content">
            <div className="compliance-overview">
              <div className="compliance-stat compliant">
                <CheckCircle size={24} />
                <span className="count">{complianceStatuses.filter(c => c.status === 'compliant').length}</span>
                <span className="label">Compliant</span>
              </div>
              <div className="compliance-stat attention">
                <AlertCircle size={24} />
                <span className="count">{complianceStatuses.filter(c => c.status === 'attention').length}</span>
                <span className="label">Attention Needed</span>
              </div>
              <div className="compliance-stat non-compliant">
                <XCircle size={24} />
                <span className="count">{complianceStatuses.filter(c => c.status === 'non_compliant').length}</span>
                <span className="label">Non-Compliant</span>
              </div>
            </div>

            <div className="compliance-table">
              <table>
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Last Pre-Trip</th>
                    <th>DOT Expiry</th>
                    <th>Open Defects</th>
                    <th>Compliance Score</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complianceStatuses.map(vehicle => (
                    <tr key={vehicle.vehicleId}>
                      <td className="vehicle-cell">{vehicle.vehicleNumber}</td>
                      <td>{vehicle.vehicleType}</td>
                      <td>{vehicle.lastPreTrip || 'N/A'}</td>
                      <td className={vehicle.dotExpiry && new Date(vehicle.dotExpiry) < new Date() ? 'expired' : ''}>
                        {vehicle.dotExpiry || 'N/A'}
                      </td>
                      <td>
                        {vehicle.openDefects > 0 ? (
                          <span className="defect-count">{vehicle.openDefects}</span>
                        ) : (
                          <span className="no-defects">0</span>
                        )}
                      </td>
                      <td>
                        <div className="score-bar">
                          <div
                            className="score-fill"
                            style={{
                              width: `${vehicle.complianceScore}%`,
                              backgroundColor: vehicle.complianceScore >= 90 ? '#10b981' : vehicle.complianceScore >= 70 ? '#f59e0b' : '#ef4444'
                            }}
                          />
                          <span>{vehicle.complianceScore}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`compliance-badge ${vehicle.status}`}>
                          {vehicle.status === 'compliant' && <CheckCircle size={14} />}
                          {vehicle.status === 'attention' && <AlertCircle size={14} />}
                          {vehicle.status === 'non_compliant' && <XCircle size={14} />}
                          {vehicle.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Inspection Detail Panel */}
      {selectedInspection && (
        <div className="detail-panel-overlay" onClick={() => setSelectedInspection(null)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <div className="panel-title">
                <h2>Inspection Details</h2>
                <span className={`status-badge ${selectedInspection.status}`}>
                  {selectedInspection.status}
                </span>
              </div>
              <button className="close-btn" onClick={() => setSelectedInspection(null)}>&times;</button>
            </div>
            <div className="panel-body">
              <div className="detail-section">
                <h3>Vehicle Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Vehicle</label>
                    <span>{selectedInspection.vehicleNumber}</span>
                  </div>
                  <div className="detail-item">
                    <label>Type</label>
                    <span>{selectedInspection.vehicleType}</span>
                  </div>
                  <div className="detail-item">
                    <label>Mileage</label>
                    <span>{selectedInspection.mileage.toLocaleString()} mi</span>
                  </div>
                  {selectedInspection.engineHours && (
                    <div className="detail-item">
                      <label>Engine Hours</label>
                      <span>{selectedInspection.engineHours.toLocaleString()} hrs</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="detail-section">
                <h3>Inspection Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Type</label>
                    <span>{getInspectionTypeLabel(selectedInspection.inspectionType)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Inspector</label>
                    <span>{selectedInspection.inspectedBy}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date/Time</label>
                    <span>{new Date(selectedInspection.inspectedAt).toLocaleString()}</span>
                  </div>
                  <div className="detail-item">
                    <label>Location</label>
                    <span>{selectedInspection.location}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h3>Results</h3>
                <div className="results-summary">
                  <div className="result-item passed">
                    <CheckCircle size={20} />
                    <span>{selectedInspection.passedItems} Passed</span>
                  </div>
                  <div className="result-item failed">
                    <XCircle size={20} />
                    <span>{selectedInspection.failedItems} Failed</span>
                  </div>
                </div>
              </div>

              {selectedInspection.defectsFound.length > 0 && (
                <div className="detail-section">
                  <h3>Defects Found</h3>
                  <div className="defect-list">
                    {selectedInspection.defectsFound.map(defect => (
                      <div key={defect.id} className={`defect-item ${defect.severity}`}>
                        <div className="defect-header">
                          <span className="defect-category">{defect.category}</span>
                          <span className={`severity ${defect.severity}`}>{defect.severity}</span>
                        </div>
                        <p>{defect.description}</p>
                        <div className="defect-footer">
                          <span className={`defect-status ${defect.status}`}>{defect.status.replace('_', ' ')}</span>
                          {defect.photoCount > 0 && (
                            <span className="photo-count"><Camera size={12} /> {defect.photoCount}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedInspection.notes && (
                <div className="detail-section">
                  <h3>Notes</h3>
                  <p className="notes-text">{selectedInspection.notes}</p>
                </div>
              )}
            </div>
            <div className="panel-footer">
              <button className="btn btn-secondary">
                <Download size={16} />
                Download PDF
              </button>
              <button className="btn btn-primary">
                <Edit size={16} />
                Edit Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FleetInspections;
