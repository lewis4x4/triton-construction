import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronRight,
  Calendar,
  MapPin,
  User,
  FileText,
  Clock,
  AlertOctagon,
  CheckCircle,
  XCircle,
  Camera,
  Users,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './IncidentReportPage.css';

interface Incident {
  id: string;
  incident_number: string;
  incident_date: string;
  incident_time: string | null;
  incident_type: string;
  severity: string;
  project_id: string;
  project_name: string;
  location: string | null;
  description: string;
  immediate_actions: string | null;
  root_cause: string | null;
  corrective_actions: string | null;
  reported_by: string | null;
  reporter_name: string;
  status: string;
  investigation_status: string | null;
  osha_recordable: boolean;
  days_away: number;
  days_restricted: number;
  witnesses: string[];
  photos: string[];
  created_at: string;
}

interface IncidentStats {
  total: number;
  open: number;
  investigating: number;
  closed: number;
  recordable: number;
  lostTime: number;
}

export function IncidentReportPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [stats, setStats] = useState<IncidentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('incidents')
        .select(`
          *,
          projects(name),
          crew_members(display_name)
        `)
        .order('incident_date', { ascending: false });

      if (error) throw error;

      const incidentList: Incident[] = (data || []).map((i: any) => ({
        id: i.id,
        incident_number: i.incident_number || `INC-${i.id.slice(0, 8)}`,
        incident_date: i.incident_date,
        incident_time: i.incident_time,
        incident_type: i.incident_type,
        severity: i.severity,
        project_id: i.project_id,
        project_name: i.projects?.name || 'Unknown Project',
        location: i.location,
        description: i.description,
        immediate_actions: i.immediate_actions,
        root_cause: i.root_cause,
        corrective_actions: i.corrective_actions,
        reported_by: i.reported_by,
        reporter_name: i.crew_members?.display_name || 'Unknown',
        status: i.status || 'OPEN',
        investigation_status: i.investigation_status,
        osha_recordable: i.osha_recordable || false,
        days_away: i.days_away || 0,
        days_restricted: i.days_restricted || 0,
        witnesses: i.witnesses || [],
        photos: i.photos || [],
        created_at: i.created_at,
      }));

      setIncidents(incidentList);

      // Calculate stats
      const open = incidentList.filter(i => i.status === 'OPEN').length;
      const investigating = incidentList.filter(i => i.status === 'INVESTIGATING').length;
      const closed = incidentList.filter(i => i.status === 'CLOSED').length;
      const recordable = incidentList.filter(i => i.osha_recordable).length;
      const lostTime = incidentList.filter(i => i.days_away > 0).length;

      setStats({
        total: incidentList.length,
        open,
        investigating,
        closed,
        recordable,
        lostTime,
      });
    } catch (err) {
      console.error('Error loading incidents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      'INJURY': 'Injury',
      'ILLNESS': 'Illness',
      'NEAR_MISS': 'Near Miss',
      'PROPERTY_DAMAGE': 'Property Damage',
      'ENVIRONMENTAL': 'Environmental',
      'VEHICLE': 'Vehicle Incident',
      'FIRST_AID': 'First Aid',
    };
    return types[type?.toUpperCase()] || type;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'severity-critical';
      case 'HIGH': return 'severity-high';
      case 'MEDIUM': return 'severity-medium';
      case 'LOW': return 'severity-low';
      default: return 'severity-unknown';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN': return 'status-open';
      case 'INVESTIGATING': return 'status-investigating';
      case 'CLOSED': return 'status-closed';
      default: return 'status-unknown';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const filteredIncidents = incidents.filter(i => {
    const matchesSearch = searchTerm === '' ||
      i.incident_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.project_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || i.incident_type?.toUpperCase() === typeFilter;
    const matchesStatus = statusFilter === 'all' || i.status?.toUpperCase() === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="incident-report-page">
      <div className="page-header">
        <div className="header-content">
          <h1><AlertTriangle size={28} /> Incident Reports</h1>
          <p>Track and manage workplace incidents, near misses, and safety observations</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadIncidents}>
            <RefreshCw size={18} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewForm(true)}>
            <Plus size={18} /> Report Incident
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total"><FileText size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total Incidents</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon open"><AlertOctagon size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.open}</span>
              <span className="stat-label">Open</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon investigating"><Search size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.investigating}</span>
              <span className="stat-label">Investigating</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon closed"><CheckCircle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.closed}</span>
              <span className="stat-label">Closed</span>
            </div>
          </div>
          <div className="stat-card warning">
            <div className="stat-icon recordable"><XCircle size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.recordable}</span>
              <span className="stat-label">OSHA Recordable</span>
            </div>
          </div>
          <div className="stat-card danger">
            <div className="stat-icon lost-time"><Clock size={24} /></div>
            <div className="stat-content">
              <span className="stat-value">{stats.lostTime}</span>
              <span className="stat-label">Lost Time</span>
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
            placeholder="Search incidents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="INJURY">Injury</option>
            <option value="ILLNESS">Illness</option>
            <option value="NEAR_MISS">Near Miss</option>
            <option value="PROPERTY_DAMAGE">Property Damage</option>
            <option value="ENVIRONMENTAL">Environmental</option>
            <option value="VEHICLE">Vehicle</option>
            <option value="FIRST_AID">First Aid</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
      </div>

      {/* Incidents List */}
      <div className="incidents-list">
        {isLoading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spinning" />
            <p>Loading incidents...</p>
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="empty-state">
            <AlertTriangle size={48} />
            <h3>No Incidents Found</h3>
            <p>No incidents match your current filters, or none have been reported yet.</p>
            <button className="btn btn-primary" onClick={() => setShowNewForm(true)}>
              <Plus size={18} /> Report First Incident
            </button>
          </div>
        ) : (
          filteredIncidents.map((incident) => (
            <div
              key={incident.id}
              className={`incident-card ${selectedIncident?.id === incident.id ? 'selected' : ''}`}
              onClick={() => setSelectedIncident(incident)}
            >
              <div className="incident-header">
                <div className="incident-identity">
                  <span className={`severity-badge ${getSeverityColor(incident.severity)}`}>
                    {incident.severity}
                  </span>
                  <span className="incident-number">{incident.incident_number}</span>
                  <span className={`status-badge ${getStatusColor(incident.status)}`}>
                    {incident.status}
                  </span>
                </div>
                <ChevronRight size={20} className="chevron" />
              </div>

              <div className="incident-type">
                <AlertTriangle size={14} />
                <span>{getTypeLabel(incident.incident_type)}</span>
              </div>

              <p className="incident-description">{incident.description}</p>

              <div className="incident-meta">
                <span><Calendar size={14} /> {formatDate(incident.incident_date)}</span>
                <span><MapPin size={14} /> {incident.project_name}</span>
                <span><User size={14} /> {incident.reporter_name}</span>
                {incident.osha_recordable && (
                  <span className="recordable-tag">OSHA Recordable</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Panel */}
      {selectedIncident && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>{selectedIncident.incident_number}</h2>
            <button className="btn btn-ghost" onClick={() => setSelectedIncident(null)}>
              <XCircle size={20} />
            </button>
          </div>

          <div className="panel-content">
            <div className="detail-section">
              <h3>Incident Details</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Type</label>
                  <span>{getTypeLabel(selectedIncident.incident_type)}</span>
                </div>
                <div className="detail-item">
                  <label>Severity</label>
                  <span className={`severity-badge ${getSeverityColor(selectedIncident.severity)}`}>
                    {selectedIncident.severity}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Date</label>
                  <span>{formatDate(selectedIncident.incident_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Time</label>
                  <span>{selectedIncident.incident_time || 'Not specified'}</span>
                </div>
                <div className="detail-item">
                  <label>Project</label>
                  <span>{selectedIncident.project_name}</span>
                </div>
                <div className="detail-item">
                  <label>Location</label>
                  <span>{selectedIncident.location || 'Not specified'}</span>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h3>Description</h3>
              <p>{selectedIncident.description}</p>
            </div>

            {selectedIncident.immediate_actions && (
              <div className="detail-section">
                <h3>Immediate Actions Taken</h3>
                <p>{selectedIncident.immediate_actions}</p>
              </div>
            )}

            {selectedIncident.root_cause && (
              <div className="detail-section">
                <h3>Root Cause</h3>
                <p>{selectedIncident.root_cause}</p>
              </div>
            )}

            {selectedIncident.corrective_actions && (
              <div className="detail-section">
                <h3>Corrective Actions</h3>
                <p>{selectedIncident.corrective_actions}</p>
              </div>
            )}

            <div className="detail-section">
              <h3>OSHA Information</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Recordable</label>
                  <span>{selectedIncident.osha_recordable ? 'Yes' : 'No'}</span>
                </div>
                <div className="detail-item">
                  <label>Days Away</label>
                  <span>{selectedIncident.days_away}</span>
                </div>
                <div className="detail-item">
                  <label>Days Restricted</label>
                  <span>{selectedIncident.days_restricted}</span>
                </div>
              </div>
            </div>

            {selectedIncident.witnesses.length > 0 && (
              <div className="detail-section">
                <h3><Users size={16} /> Witnesses</h3>
                <ul className="witnesses-list">
                  {selectedIncident.witnesses.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {selectedIncident.photos.length > 0 && (
              <div className="detail-section">
                <h3><Camera size={16} /> Photos</h3>
                <div className="photos-grid">
                  {selectedIncident.photos.map((photo, i) => (
                    <img key={i} src={photo} alt={`Incident photo ${i + 1}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Incident Form Modal */}
      {showNewForm && (
        <div className="modal-overlay" onClick={() => setShowNewForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Report New Incident</h2>
              <button className="btn btn-ghost" onClick={() => setShowNewForm(false)}>
                <XCircle size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="coming-soon">Incident report form coming soon...</p>
              <p>For now, incidents can be reported through the mobile app or by contacting your safety manager.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
