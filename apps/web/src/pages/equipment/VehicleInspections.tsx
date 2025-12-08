import { useState, useEffect } from 'react';
import {
  ClipboardCheck,
  Calendar,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ChevronRight,
  Truck,
  Clock,
  User,
  FileText,
  Shield,
  AlertOctagon,
  Eye,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './VehicleInspections.css';

interface VehicleInspection {
  id: string;
  vehicle_id: string;
  vehicle_number: string;
  inspection_type: string;
  inspection_date: string;
  expiry_date: string;
  inspector_id: string;
  inspector_name: string;
  inspector_certification_number: string;
  inspection_location: string;
  result: string;
  overall_condition: string;
  defects_found: any[];
  defects_corrected: boolean;
  out_of_service: boolean;
  oos_reason: string;
  odometer_reading: number;
  sticker_number: string;
  document_url: string;
  notes: string;
  created_at: string;
}

interface InspectionStats {
  total: number;
  passed: number;
  failed: number;
  conditional: number;
  upcoming: number;
  overdue: number;
}

export function VehicleInspections() {
  const [inspections, setInspections] = useState<VehicleInspection[]>([]);
  const [stats, setStats] = useState<InspectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedInspection, setSelectedInspection] = useState<VehicleInspection | null>(null);

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vehicle_inspections')
        .select(`
          *,
          vehicles(vehicle_number),
          crew_members(display_name)
        `)
        .order('inspection_date', { ascending: false });

      if (error) throw error;

      const inspectionList: VehicleInspection[] = (data || []).map((i: any) => ({
        id: i.id,
        vehicle_id: i.vehicle_id,
        vehicle_number: i.vehicles?.vehicle_number || 'Unknown',
        inspection_type: i.inspection_type,
        inspection_date: i.inspection_date,
        expiry_date: i.expiry_date,
        inspector_id: i.inspector_id,
        inspector_name: i.crew_members?.display_name || i.inspector_name || 'Unknown',
        inspector_certification_number: i.inspector_certification_number,
        inspection_location: i.inspection_location,
        result: i.result,
        overall_condition: i.overall_condition,
        defects_found: i.defects_found || [],
        defects_corrected: i.defects_corrected,
        out_of_service: i.out_of_service,
        oos_reason: i.oos_reason,
        odometer_reading: i.odometer_reading,
        sticker_number: i.sticker_number,
        document_url: i.document_url,
        notes: i.notes,
        created_at: i.created_at,
      }));

      setInspections(inspectionList);

      // Calculate stats
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const passed = inspectionList.filter(i => i.result === 'passed').length;
      const failed = inspectionList.filter(i => i.result === 'failed').length;
      const conditional = inspectionList.filter(i => i.result === 'conditional').length;

      // Get unique vehicles and check their inspection status
      const vehicleInspections = new Map<string, VehicleInspection>();
      inspectionList
        .filter(i => i.inspection_type === 'dot_annual')
        .forEach(i => {
          const existing = vehicleInspections.get(i.vehicle_id);
          if (!existing || new Date(i.inspection_date) > new Date(existing.inspection_date)) {
            vehicleInspections.set(i.vehicle_id, i);
          }
        });

      let upcoming = 0;
      let overdue = 0;
      vehicleInspections.forEach(i => {
        if (i.expiry_date) {
          const expiry = new Date(i.expiry_date);
          if (expiry < now) overdue++;
          else if (expiry <= thirtyDaysFromNow) upcoming++;
        }
      });

      setStats({
        total: inspectionList.length,
        passed,
        failed,
        conditional,
        upcoming,
        overdue,
      });
    } catch (err) {
      console.error('Error loading inspections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'passed': return 'result-passed';
      case 'failed': return 'result-failed';
      case 'conditional': return 'result-conditional';
      default: return 'result-unknown';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'dot_annual': return 'DOT Annual';
      case 'pre_trip': return 'Pre-Trip';
      case 'post_trip': return 'Post-Trip';
      case 'roadside': return 'Roadside';
      case 'periodic': return 'Periodic';
      default: return type;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const isExpiringSoon = (expiryDate: string) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return expiry > now && expiry <= thirtyDays;
  };

  const isExpired = (expiryDate: string) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const filteredInspections = inspections.filter(i => {
    const matchesSearch = searchTerm === '' ||
      i.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.inspector_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.sticker_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || i.inspection_type === typeFilter;
    const matchesResult = resultFilter === 'all' || i.result === resultFilter;

    return matchesSearch && matchesType && matchesResult;
  });

  return (
    <div className="vehicle-inspections-page">
      <div className="page-header">
        <div className="header-content">
          <h1><ClipboardCheck size={28} /> Vehicle Inspections</h1>
          <p>DOT annual inspections, pre-trip, and post-trip inspection records</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadInspections}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary">
            <Plus size={16} /> New Inspection
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total"><ClipboardCheck size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Inspections</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon passed"><CheckCircle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.passed}</span>
              <span className="stat-label">Passed</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon failed"><XCircle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.failed}</span>
              <span className="stat-label">Failed</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon upcoming"><Clock size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.upcoming}</span>
              <span className="stat-label">Due in 30 Days</span>
            </div>
          </div>
          <div className={`stat-card ${stats.overdue > 0 ? 'alert' : ''}`}>
            <div className="stat-icon overdue"><AlertTriangle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.overdue}</span>
              <span className="stat-label">Overdue</span>
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
            placeholder="Search by vehicle, inspector, sticker #..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="dot_annual">DOT Annual</option>
            <option value="pre_trip">Pre-Trip</option>
            <option value="post_trip">Post-Trip</option>
            <option value="roadside">Roadside</option>
            <option value="periodic">Periodic</option>
          </select>
          <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)}>
            <option value="all">All Results</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="conditional">Conditional</option>
          </select>
        </div>
        <div className="view-toggle">
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
          >
            List
          </button>
          <button
            className={viewMode === 'calendar' ? 'active' : ''}
            onClick={() => setViewMode('calendar')}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Inspection List */}
      <div className="inspection-list">
        {isLoading ? (
          <div className="loading-state">
            <RefreshCw className="spinning" size={32} />
            <p>Loading inspections...</p>
          </div>
        ) : filteredInspections.length === 0 ? (
          <div className="empty-state">
            <ClipboardCheck size={48} />
            <p>No inspections found</p>
          </div>
        ) : (
          filteredInspections.map(inspection => (
            <div
              key={inspection.id}
              className={`inspection-card ${inspection.out_of_service ? 'out-of-service' : ''}`}
              onClick={() => setSelectedInspection(inspection)}
            >
              <div className="inspection-header">
                <div className="inspection-identity">
                  <span className="inspection-type">{getTypeLabel(inspection.inspection_type)}</span>
                  <span className="vehicle-number">
                    <Truck size={14} /> {inspection.vehicle_number}
                  </span>
                  <span className={`result-badge ${getResultColor(inspection.result)}`}>
                    {inspection.result === 'passed' && <CheckCircle size={14} />}
                    {inspection.result === 'failed' && <XCircle size={14} />}
                    {inspection.result === 'conditional' && <AlertOctagon size={14} />}
                    {inspection.result}
                  </span>
                  {inspection.out_of_service && (
                    <span className="oos-badge">
                      <AlertTriangle size={14} /> OOS
                    </span>
                  )}
                </div>
                <ChevronRight size={20} className="chevron" />
              </div>

              <div className="inspection-info">
                <div className="info-item">
                  <Calendar size={14} />
                  <span>Inspected: {formatDate(inspection.inspection_date)}</span>
                </div>
                {inspection.expiry_date && (
                  <div className={`info-item ${isExpired(inspection.expiry_date) ? 'expired' : isExpiringSoon(inspection.expiry_date) ? 'expiring' : ''}`}>
                    <Clock size={14} />
                    <span>
                      Expires: {formatDate(inspection.expiry_date)}
                      {isExpired(inspection.expiry_date) && ' (EXPIRED)'}
                      {isExpiringSoon(inspection.expiry_date) && ' (Soon)'}
                    </span>
                  </div>
                )}
                <div className="info-item">
                  <User size={14} />
                  <span>{inspection.inspector_name}</span>
                </div>
                {inspection.sticker_number && (
                  <div className="info-item">
                    <FileText size={14} />
                    <span>Sticker: {inspection.sticker_number}</span>
                  </div>
                )}
              </div>

              {inspection.defects_found && inspection.defects_found.length > 0 && (
                <div className="defects-summary">
                  <AlertOctagon size={14} />
                  <span>{inspection.defects_found.length} defect(s) found</span>
                  {inspection.defects_corrected && (
                    <span className="corrected-badge">
                      <CheckCircle size={12} /> Corrected
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Inspection Detail Panel */}
      {selectedInspection && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>{getTypeLabel(selectedInspection.inspection_type)} Inspection</h2>
            <button className="close-btn" onClick={() => setSelectedInspection(null)}>&times;</button>
          </div>
          <div className="panel-content">
            {selectedInspection.out_of_service && (
              <div className="oos-alert">
                <AlertTriangle size={20} />
                <div>
                  <strong>Out of Service</strong>
                  <p>{selectedInspection.oos_reason || 'Vehicle placed out of service'}</p>
                </div>
              </div>
            )}

            <div className="detail-section">
              <h3>Inspection Details</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Vehicle</label>
                  <span>{selectedInspection.vehicle_number}</span>
                </div>
                <div className="detail-item">
                  <label>Type</label>
                  <span>{getTypeLabel(selectedInspection.inspection_type)}</span>
                </div>
                <div className="detail-item">
                  <label>Date</label>
                  <span>{formatDate(selectedInspection.inspection_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Expires</label>
                  <span className={isExpired(selectedInspection.expiry_date) ? 'expired-text' : ''}>
                    {formatDate(selectedInspection.expiry_date)}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Result</label>
                  <span className={`result-badge ${getResultColor(selectedInspection.result)}`}>
                    {selectedInspection.result}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Condition</label>
                  <span>{selectedInspection.overall_condition || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Odometer</label>
                  <span>{selectedInspection.odometer_reading?.toLocaleString() || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Sticker #</label>
                  <span>{selectedInspection.sticker_number || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Inspector</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Name</label>
                  <span>{selectedInspection.inspector_name}</span>
                </div>
                <div className="detail-item">
                  <label>Cert #</label>
                  <span>{selectedInspection.inspector_certification_number || 'N/A'}</span>
                </div>
                <div className="detail-item full">
                  <label>Location</label>
                  <span>{selectedInspection.inspection_location || 'N/A'}</span>
                </div>
              </div>
            </div>

            {selectedInspection.defects_found && selectedInspection.defects_found.length > 0 && (
              <div className="detail-section">
                <h3>Defects Found</h3>
                <div className="defects-list">
                  {selectedInspection.defects_found.map((defect: any, index: number) => (
                    <div key={index} className="defect-item">
                      <span className="defect-category">{defect.category || 'General'}</span>
                      <span className="defect-description">{defect.description || defect}</span>
                      {defect.severity && (
                        <span className={`defect-severity ${defect.severity}`}>{defect.severity}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="defects-status">
                  {selectedInspection.defects_corrected ? (
                    <span className="corrected"><CheckCircle size={16} /> All defects corrected</span>
                  ) : (
                    <span className="pending"><AlertOctagon size={16} /> Defects pending correction</span>
                  )}
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
          <div className="panel-actions">
            {selectedInspection.document_url && (
              <button className="btn btn-secondary">
                <Eye size={16} /> View Document
              </button>
            )}
            <button className="btn btn-secondary">Print Report</button>
            <button className="btn btn-primary">Edit Inspection</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default VehicleInspections;
