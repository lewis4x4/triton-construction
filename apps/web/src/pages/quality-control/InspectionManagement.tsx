import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  ClipboardCheck,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  MapPin,
  User,
  ChevronRight,
  X,
  RefreshCw,
  Download,
  AlertCircle,
  FileText,
} from 'lucide-react';
import './InspectionManagement.css';

interface Inspection {
  id: string;
  inspection_number: string;
  inspection_type: string;
  title: string;
  description: string | null;
  scheduled_date: string;
  actual_date: string | null;
  location: string | null;
  status: string;
  result: string | null;
  inspector_name: string | null;
  inspector_company: string | null;
  contractor_rep_name: string | null;
  notes: string | null;
  conditions_for_acceptance: string | null;
  project_id: string;
}

interface InspectionStats {
  total: number;
  scheduled: number;
  passed: number;
  failed: number;
  conditional: number;
}

// Demo data
const demoInspections: Inspection[] = [
  {
    id: '1',
    inspection_number: 'INS-2024-0025',
    inspection_type: 'STRUCTURAL',
    title: 'Box Culvert Rebar Inspection',
    description: 'Pre-pour inspection of reinforcing steel placement for box culvert at Station 142+00',
    scheduled_date: '2024-12-06',
    actual_date: '2024-12-06',
    location: 'Station 142+00',
    status: 'COMPLETED',
    result: 'PASS',
    inspector_name: 'Robert Martinez',
    inspector_company: 'WVDOH',
    contractor_rep_name: 'Mike Johnson',
    notes: 'All rebar placement meets plan requirements. Chair spacing correct. Splice lengths verified.',
    conditions_for_acceptance: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '2',
    inspection_number: 'INS-2024-0024',
    inspection_type: 'MATERIAL',
    title: 'Aggregate Gradation Test',
    description: 'Gradation analysis of #57 stone for base course material',
    scheduled_date: '2024-12-05',
    actual_date: '2024-12-05',
    location: 'WV Aggregates Quarry',
    status: 'COMPLETED',
    result: 'CONDITIONAL',
    inspector_name: 'Sarah Williams',
    inspector_company: 'Core Testing Lab',
    contractor_rep_name: null,
    notes: 'Gradation slightly outside spec on #8 sieve. Material acceptable with increased frequency testing.',
    conditions_for_acceptance: 'Perform gradation test every 500 CY until 3 consecutive passing tests',
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '3',
    inspection_number: 'INS-2024-0023',
    inspection_type: 'DENSITY',
    title: 'Subgrade Compaction Test',
    description: 'Nuclear density testing of prepared subgrade prior to base placement',
    scheduled_date: '2024-12-04',
    actual_date: '2024-12-04',
    location: 'Station 138+00 to 140+00',
    status: 'COMPLETED',
    result: 'FAIL',
    inspector_name: 'Tom Anderson',
    inspector_company: 'Core Testing Lab',
    contractor_rep_name: 'Mike Johnson',
    notes: 'Density at 94% of maximum. Minimum required 95%. Re-compaction required.',
    conditions_for_acceptance: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '4',
    inspection_number: 'INS-2024-0026',
    inspection_type: 'CONCRETE',
    title: 'Pre-Pour Deck Inspection',
    description: 'Final inspection before bridge deck concrete placement',
    scheduled_date: '2024-12-09',
    actual_date: null,
    location: 'Bridge Deck - East Span',
    status: 'SCHEDULED',
    result: null,
    inspector_name: 'Robert Martinez',
    inspector_company: 'WVDOH',
    contractor_rep_name: null,
    notes: null,
    conditions_for_acceptance: null,
    project_id: 'b0000000-0000-0000-0000-000000000002',
  },
  {
    id: '5',
    inspection_number: 'INS-2024-0027',
    inspection_type: 'ENVIRONMENTAL',
    title: 'Erosion Control Inspection',
    description: 'Weekly erosion and sediment control inspection',
    scheduled_date: '2024-12-10',
    actual_date: null,
    location: 'Project-Wide',
    status: 'SCHEDULED',
    result: null,
    inspector_name: 'Emily Chen',
    inspector_company: 'WV DEP',
    contractor_rep_name: null,
    notes: null,
    conditions_for_acceptance: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
];

export function InspectionManagement() {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [stats, setStats] = useState<InspectionStats>({
    total: 0,
    scheduled: 0,
    passed: 0,
    failed: 0,
    conditional: 0,
  });

  useEffect(() => {
    fetchInspections();
  }, []);

  const fetchInspections = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('inspections')
        .select('*')
        .order('scheduled_date', { ascending: false });

      if (error) throw error;

      const inspectionData = data?.length > 0 ? data : demoInspections;
      setInspections(inspectionData);
      calculateStats(inspectionData);
    } catch (err) {
      console.error('Error fetching inspections:', err);
      setInspections(demoInspections);
      calculateStats(demoInspections);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Inspection[]) => {
    setStats({
      total: data.length,
      scheduled: data.filter(i => i.status?.toUpperCase() === 'SCHEDULED').length,
      passed: data.filter(i => i.result?.toUpperCase() === 'PASS').length,
      failed: data.filter(i => i.result?.toUpperCase() === 'FAIL').length,
      conditional: data.filter(i => i.result?.toUpperCase() === 'CONDITIONAL').length,
    });
  };

  const filteredInspections = inspections.filter(inspection => {
    const matchesSearch =
      inspection.inspection_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inspection.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || inspection.status?.toUpperCase() === statusFilter;
    const matchesType = typeFilter === 'all' || inspection.inspection_type?.toUpperCase() === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'SCHEDULED':
        return 'status-scheduled';
      case 'IN_PROGRESS':
        return 'status-progress';
      case 'COMPLETED':
        return 'status-completed';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return 'status-unknown';
    }
  };

  const getResultBadge = (result: string | null) => {
    if (!result) return '';
    switch (result.toUpperCase()) {
      case 'PASS':
        return 'result-pass';
      case 'FAIL':
        return 'result-fail';
      case 'CONDITIONAL':
        return 'result-conditional';
      default:
        return 'result-unknown';
    }
  };

  const getResultIcon = (result: string | null) => {
    if (!result) return null;
    switch (result.toUpperCase()) {
      case 'PASS':
        return <CheckCircle size={14} />;
      case 'FAIL':
        return <XCircle size={14} />;
      case 'CONDITIONAL':
        return <AlertCircle size={14} />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="inspection-management-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <ClipboardCheck size={32} />
            Inspection Management
          </h1>
          <p>Schedule, track, and document quality control inspections</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary">
            <Download size={18} />
            Export Report
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            Schedule Inspection
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <ClipboardCheck size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Inspections</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon scheduled">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.scheduled}</span>
            <span className="stat-label">Scheduled</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon passed">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.passed}</span>
            <span className="stat-label">Passed</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon conditional">
            <AlertCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.conditional}</span>
            <span className="stat-label">Conditional</span>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon failed">
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.failed}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by number, title, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="STRUCTURAL">Structural</option>
            <option value="CONCRETE">Concrete</option>
            <option value="MATERIAL">Material</option>
            <option value="DENSITY">Density</option>
            <option value="ENVIRONMENTAL">Environmental</option>
          </select>
        </div>
      </div>

      {/* Inspections List */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spinning" />
          <p>Loading inspections...</p>
        </div>
      ) : filteredInspections.length === 0 ? (
        <div className="empty-state">
          <ClipboardCheck size={48} />
          <h3>No Inspections Found</h3>
          <p>Schedule an inspection to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            Schedule Inspection
          </button>
        </div>
      ) : (
        <div className="inspections-list">
          {filteredInspections.map((inspection) => (
            <div
              key={inspection.id}
              className={`inspection-card ${selectedInspection?.id === inspection.id ? 'selected' : ''}`}
              onClick={() => setSelectedInspection(inspection)}
            >
              <div className="inspection-header">
                <div className="inspection-identity">
                  <span className="inspection-number">{inspection.inspection_number}</span>
                  <span className="inspection-type">{inspection.inspection_type}</span>
                </div>
                <div className="inspection-badges">
                  <span className={`status-badge ${getStatusBadge(inspection.status)}`}>
                    {inspection.status}
                  </span>
                  {inspection.result && (
                    <span className={`result-badge ${getResultBadge(inspection.result)}`}>
                      {getResultIcon(inspection.result)}
                      {inspection.result}
                    </span>
                  )}
                </div>
              </div>

              <h3 className="inspection-title">{inspection.title}</h3>
              {inspection.description && (
                <p className="inspection-description">{inspection.description}</p>
              )}

              <div className="inspection-meta">
                <span>
                  <Calendar size={14} />
                  {formatDate(inspection.scheduled_date)}
                </span>
                {inspection.location && (
                  <span>
                    <MapPin size={14} />
                    {inspection.location}
                  </span>
                )}
                {inspection.inspector_name && (
                  <span>
                    <User size={14} />
                    {inspection.inspector_name}
                  </span>
                )}
              </div>

              {inspection.conditions_for_acceptance && (
                <div className="conditions-alert">
                  <AlertCircle size={14} />
                  <span>Conditions for acceptance apply</span>
                </div>
              )}

              <ChevronRight size={20} className="chevron" />
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedInspection && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>{selectedInspection.inspection_number}</h2>
            <button className="btn btn-icon" onClick={() => setSelectedInspection(null)}>
              <X size={20} />
            </button>
          </div>

          <div className="panel-content">
            {/* Header Info */}
            <div className="detail-section">
              <div className="inspection-detail-header">
                <span className="inspection-type-tag">{selectedInspection.inspection_type}</span>
                <div className="badge-row">
                  <span className={`status-badge ${getStatusBadge(selectedInspection.status)}`}>
                    {selectedInspection.status}
                  </span>
                  {selectedInspection.result && (
                    <span className={`result-badge ${getResultBadge(selectedInspection.result)}`}>
                      {getResultIcon(selectedInspection.result)}
                      {selectedInspection.result}
                    </span>
                  )}
                </div>
              </div>
              <h3>{selectedInspection.title}</h3>
              {selectedInspection.description && (
                <p className="description">{selectedInspection.description}</p>
              )}
            </div>

            {/* Schedule Details */}
            <div className="detail-section">
              <h4>
                <Calendar size={16} />
                Schedule Details
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Scheduled Date</label>
                  <span>{formatDate(selectedInspection.scheduled_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Actual Date</label>
                  <span>{formatDate(selectedInspection.actual_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Location</label>
                  <span>{selectedInspection.location || '—'}</span>
                </div>
              </div>
            </div>

            {/* Inspector Details */}
            <div className="detail-section">
              <h4>
                <User size={16} />
                Personnel
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Inspector</label>
                  <span>{selectedInspection.inspector_name || '—'}</span>
                </div>
                <div className="detail-item">
                  <label>Company</label>
                  <span>{selectedInspection.inspector_company || '—'}</span>
                </div>
                <div className="detail-item">
                  <label>Contractor Rep</label>
                  <span>{selectedInspection.contractor_rep_name || '—'}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedInspection.notes && (
              <div className="detail-section">
                <h4>
                  <FileText size={16} />
                  Notes
                </h4>
                <p className="notes-text">{selectedInspection.notes}</p>
              </div>
            )}

            {/* Conditions */}
            {selectedInspection.conditions_for_acceptance && (
              <div className="detail-section conditions-section">
                <h4>
                  <AlertCircle size={16} />
                  Conditions for Acceptance
                </h4>
                <p className="conditions-text">{selectedInspection.conditions_for_acceptance}</p>
              </div>
            )}

            {/* Actions */}
            <div className="panel-footer">
              <button className="btn btn-secondary">
                <Download size={16} />
                Export Report
              </button>
              <button className="btn btn-primary">
                <ClipboardCheck size={16} />
                Update Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Inspection Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Schedule New Inspection</h2>
              <button className="btn btn-icon" onClick={() => setShowNewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="coming-soon">Full inspection scheduling form coming soon!</p>
              <p>The scheduling form will include:</p>
              <ul>
                <li>Inspection type selection</li>
                <li>Date and time scheduling</li>
                <li>Location and station assignment</li>
                <li>Inspector and company selection</li>
                <li>Checklist template selection</li>
                <li>Hold point specification</li>
                <li>Notification settings</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
