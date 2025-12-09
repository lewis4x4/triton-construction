import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  AlertOctagon,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  ChevronRight,
  X,
  RefreshCw,
  Download,
  DollarSign,
  FileText,
} from 'lucide-react';
import './NCRTracker.css';

interface NCR {
  id: string;
  ncr_number: string;
  category: string;
  severity: string;
  description: string;
  discovered_date: string;
  discoverer_name: string | null;
  location: string | null;
  status: string;
  corrective_action: string | null;
  corrective_action_due_date: string | null;
  corrective_action_completed_at: string | null;
  estimated_cost: number | null;
  actual_cost: number | null;
  root_cause: string | null;
  closure_notes: string | null;
  project_id: string;
}

interface NCRStats {
  total: number;
  open: number;
  inProgress: number;
  closed: number;
  overdue: number;
}

// Demo data
const demoNCRs: NCR[] = [
  {
    id: '1',
    ncr_number: 'NCR-2024-0018',
    category: 'CONCRETE',
    severity: 'MAJOR',
    description: 'Concrete placement at Station 142+00 shows honeycombing on east face of box culvert wall. Affected area approximately 2 sq ft.',
    discovered_date: '2024-12-05',
    discoverer_name: 'Robert Martinez',
    location: 'Station 142+00 Box Culvert',
    status: 'OPEN',
    corrective_action: 'Chip out affected area, apply bonding agent, patch with approved repair mortar per specification 601.3.4',
    corrective_action_due_date: '2024-12-10',
    corrective_action_completed_at: null,
    estimated_cost: 2500,
    actual_cost: null,
    root_cause: 'Insufficient vibration during placement',
    closure_notes: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '2',
    ncr_number: 'NCR-2024-0017',
    category: 'MATERIAL',
    severity: 'MINOR',
    description: 'Aggregate gradation results show #57 stone exceeds allowable limits on #8 sieve by 2%.',
    discovered_date: '2024-12-03',
    discoverer_name: 'Sarah Williams',
    location: 'WV Aggregates Quarry',
    status: 'IN_PROGRESS',
    corrective_action: 'Supplier to adjust screening process. Additional testing at 500 CY intervals until 3 consecutive passing tests.',
    corrective_action_due_date: '2024-12-15',
    corrective_action_completed_at: null,
    estimated_cost: 500,
    actual_cost: null,
    root_cause: 'Screen wear at supplier facility',
    closure_notes: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '3',
    ncr_number: 'NCR-2024-0016',
    category: 'STRUCTURAL',
    severity: 'CRITICAL',
    description: 'Bridge bearing plate anchor bolt spacing incorrect. As-built shows 12" spacing vs. 10" required per plans.',
    discovered_date: '2024-11-28',
    discoverer_name: 'Mike Johnson',
    location: 'Bridge Abutment A - West End',
    status: 'CLOSED',
    corrective_action: 'Engineering evaluation complete. Additional anchor bolts installed per revised approved detail.',
    corrective_action_due_date: '2024-12-01',
    corrective_action_completed_at: '2024-12-02',
    estimated_cost: 8500,
    actual_cost: 7800,
    root_cause: 'Shop drawing error not caught in review',
    closure_notes: 'Corrective work verified by WVDOH structural engineer. As-built updated.',
    project_id: 'b0000000-0000-0000-0000-000000000002',
  },
  {
    id: '4',
    ncr_number: 'NCR-2024-0015',
    category: 'EROSION',
    severity: 'MODERATE',
    description: 'Silt fence breach at downstream end of project. Sediment migration to creek observed.',
    discovered_date: '2024-11-25',
    discoverer_name: 'Emily Chen',
    location: 'Station 155+00 Creek Crossing',
    status: 'CLOSED',
    corrective_action: 'Emergency repair of silt fence. Additional super silt fence installed. Creek cleanup completed.',
    corrective_action_due_date: '2024-11-26',
    corrective_action_completed_at: '2024-11-26',
    estimated_cost: 3500,
    actual_cost: 4200,
    root_cause: 'Heavy rain event exceeded design capacity',
    closure_notes: 'DEP inspection passed. No violations issued.',
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
];

export function NCRTracker() {
  const [ncrs, setNCRs] = useState<NCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [selectedNCR, setSelectedNCR] = useState<NCR | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [stats, setStats] = useState<NCRStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    closed: 0,
    overdue: 0,
  });

  useEffect(() => {
    fetchNCRs();
  }, []);

  const fetchNCRs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('non_conformances')
        .select('*')
        .order('discovered_date', { ascending: false });

      if (error) throw error;

      const ncrData = data?.length > 0 ? data : demoNCRs;
      setNCRs(ncrData);
      calculateStats(ncrData);
    } catch (err) {
      console.error('Error fetching NCRs:', err);
      setNCRs(demoNCRs);
      calculateStats(demoNCRs);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: NCR[]) => {
    const today = new Date();
    setStats({
      total: data.length,
      open: data.filter(n => n.status?.toUpperCase() === 'OPEN').length,
      inProgress: data.filter(n => n.status?.toUpperCase() === 'IN_PROGRESS').length,
      closed: data.filter(n => n.status?.toUpperCase() === 'CLOSED').length,
      overdue: data.filter(n => {
        if (n.status?.toUpperCase() === 'CLOSED') return false;
        if (!n.corrective_action_due_date) return false;
        return new Date(n.corrective_action_due_date) < today;
      }).length,
    });
  };

  const filteredNCRs = ncrs.filter(ncr => {
    const matchesSearch =
      ncr.ncr_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ncr.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ncr.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ncr.status?.toUpperCase() === statusFilter;
    const matchesSeverity = severityFilter === 'all' || ncr.severity?.toUpperCase() === severityFilter;

    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'status-open';
      case 'IN_PROGRESS':
        return 'status-progress';
      case 'CLOSED':
        return 'status-closed';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return 'status-unknown';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'severity-critical';
      case 'MAJOR':
        return 'severity-major';
      case 'MODERATE':
        return 'severity-moderate';
      case 'MINOR':
        return 'severity-minor';
      default:
        return 'severity-unknown';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const isOverdue = (ncr: NCR) => {
    if (ncr.status?.toUpperCase() === 'CLOSED') return false;
    if (!ncr.corrective_action_due_date) return false;
    return new Date(ncr.corrective_action_due_date) < new Date();
  };

  return (
    <div className="ncr-tracker-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <AlertOctagon size={32} />
            Non-Conformance Tracker
          </h1>
          <p>Track and resolve quality non-conformances with corrective actions</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary">
            <Download size={18} />
            Export Report
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            New NCR
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <AlertOctagon size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total NCRs</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon open">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.open}</span>
            <span className="stat-label">Open</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon progress">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon closed">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.closed}</span>
            <span className="stat-label">Closed</span>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon overdue">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.overdue}</span>
            <span className="stat-label">Overdue</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by NCR number, description, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
            <option value="all">All Severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="MAJOR">Major</option>
            <option value="MODERATE">Moderate</option>
            <option value="MINOR">Minor</option>
          </select>
        </div>
      </div>

      {/* NCR List */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spinning" />
          <p>Loading NCRs...</p>
        </div>
      ) : filteredNCRs.length === 0 ? (
        <div className="empty-state">
          <AlertOctagon size={48} />
          <h3>No NCRs Found</h3>
          <p>Create a new NCR to document a non-conformance.</p>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            Create NCR
          </button>
        </div>
      ) : (
        <div className="ncr-list">
          {filteredNCRs.map((ncr) => (
            <div
              key={ncr.id}
              className={`ncr-card ${selectedNCR?.id === ncr.id ? 'selected' : ''} ${isOverdue(ncr) ? 'overdue' : ''}`}
              onClick={() => setSelectedNCR(ncr)}
            >
              <div className="ncr-header">
                <div className="ncr-identity">
                  <span className="ncr-number">{ncr.ncr_number}</span>
                  <span className="ncr-category">{ncr.category}</span>
                </div>
                <div className="ncr-badges">
                  <span className={`severity-badge ${getSeverityBadge(ncr.severity)}`}>
                    {ncr.severity}
                  </span>
                  <span className={`status-badge ${getStatusBadge(ncr.status)}`}>
                    {ncr.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <p className="ncr-description">{ncr.description}</p>

              <div className="ncr-meta">
                <span>
                  <Calendar size={14} />
                  {formatDate(ncr.discovered_date)}
                </span>
                {ncr.location && (
                  <span>
                    <MapPin size={14} />
                    {ncr.location}
                  </span>
                )}
                {ncr.discoverer_name && (
                  <span>
                    <User size={14} />
                    {ncr.discoverer_name}
                  </span>
                )}
                {ncr.estimated_cost && (
                  <span>
                    <DollarSign size={14} />
                    {formatCurrency(ncr.estimated_cost)}
                  </span>
                )}
              </div>

              {ncr.corrective_action_due_date && ncr.status !== 'CLOSED' && (
                <div className={`due-date-bar ${isOverdue(ncr) ? 'overdue' : ''}`}>
                  <Clock size={14} />
                  <span>Due: {formatDate(ncr.corrective_action_due_date)}</span>
                  {isOverdue(ncr) && <span className="overdue-tag">OVERDUE</span>}
                </div>
              )}

              <ChevronRight size={20} className="chevron" />
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedNCR && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>{selectedNCR.ncr_number}</h2>
            <button className="btn btn-icon" onClick={() => setSelectedNCR(null)}>
              <X size={20} />
            </button>
          </div>

          <div className="panel-content">
            {/* Header Info */}
            <div className="detail-section">
              <div className="ncr-detail-header">
                <div className="badge-row">
                  <span className={`severity-badge ${getSeverityBadge(selectedNCR.severity)}`}>
                    {selectedNCR.severity}
                  </span>
                  <span className={`status-badge ${getStatusBadge(selectedNCR.status)}`}>
                    {selectedNCR.status?.replace('_', ' ')}
                  </span>
                </div>
                <span className="category-tag">{selectedNCR.category}</span>
              </div>
              <p className="description">{selectedNCR.description}</p>
            </div>

            {/* Discovery Details */}
            <div className="detail-section">
              <h4>
                <Calendar size={16} />
                Discovery Details
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Date Discovered</label>
                  <span>{formatDate(selectedNCR.discovered_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Discovered By</label>
                  <span>{selectedNCR.discoverer_name || '—'}</span>
                </div>
                <div className="detail-item full-width">
                  <label>Location</label>
                  <span>{selectedNCR.location || '—'}</span>
                </div>
              </div>
            </div>

            {/* Root Cause */}
            {selectedNCR.root_cause && (
              <div className="detail-section">
                <h4>
                  <AlertTriangle size={16} />
                  Root Cause
                </h4>
                <p className="root-cause-text">{selectedNCR.root_cause}</p>
              </div>
            )}

            {/* Corrective Action */}
            {selectedNCR.corrective_action && (
              <div className="detail-section">
                <h4>
                  <FileText size={16} />
                  Corrective Action
                </h4>
                <p className="action-text">{selectedNCR.corrective_action}</p>
                <div className="action-dates">
                  <div className="detail-item">
                    <label>Due Date</label>
                    <span className={isOverdue(selectedNCR) ? 'overdue-text' : ''}>
                      {formatDate(selectedNCR.corrective_action_due_date)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Completed</label>
                    <span>{formatDate(selectedNCR.corrective_action_completed_at)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Cost Impact */}
            <div className="detail-section">
              <h4>
                <DollarSign size={16} />
                Cost Impact
              </h4>
              <div className="cost-grid">
                <div className="cost-item">
                  <label>Estimated</label>
                  <span className="cost-value">{formatCurrency(selectedNCR.estimated_cost)}</span>
                </div>
                <div className="cost-item">
                  <label>Actual</label>
                  <span className="cost-value">{formatCurrency(selectedNCR.actual_cost)}</span>
                </div>
              </div>
            </div>

            {/* Closure Notes */}
            {selectedNCR.closure_notes && (
              <div className="detail-section closure-section">
                <h4>
                  <CheckCircle size={16} />
                  Closure Notes
                </h4>
                <p className="closure-text">{selectedNCR.closure_notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="panel-footer">
              <button className="btn btn-secondary">
                <Download size={16} />
                Export
              </button>
              <button className="btn btn-primary">
                {selectedNCR.status === 'CLOSED' ? (
                  <>
                    <AlertOctagon size={16} />
                    Reopen NCR
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Close NCR
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New NCR Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New NCR</h2>
              <button className="btn btn-icon" onClick={() => setShowNewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="coming-soon">Full NCR creation form coming soon!</p>
              <p>The NCR form will include:</p>
              <ul>
                <li>Category and severity selection</li>
                <li>Detailed description with photo upload</li>
                <li>Location and station assignment</li>
                <li>Root cause analysis</li>
                <li>Corrective action planning</li>
                <li>Cost impact estimation</li>
                <li>Assignment and notification workflow</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
