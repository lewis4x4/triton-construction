import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  FileText,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Shield,
  CheckCircle,
  Clock,
  MapPin,
  Wrench,
  ChevronRight,
  X,
  Sparkles,
  Copy,
  Edit2,
  Eye,
  RefreshCw,
} from 'lucide-react';
import './JSAManagement.css';

interface JobStep {
  step: number;
  task: string;
  hazards: string[];
  controls: string[];
}

interface JSA {
  id: string;
  jsa_number: string;
  revision_number: number;
  job_title: string;
  job_description: string;
  work_location: string;
  job_steps: JobStep[];
  equipment_required: string[];
  status: string;
  prepared_at: string;
  reviewed_at: string | null;
  approved_at: string | null;
  ai_generated: boolean;
  times_used: number;
  project_id: string;
}

interface JSAStats {
  total: number;
  approved: number;
  draft: number;
  inReview: number;
  aiGenerated: number;
}

export function JSAManagement() {
  const [jsaList, setJsaList] = useState<JSA[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedJSA, setSelectedJSA] = useState<JSA | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [stats, setStats] = useState<JSAStats>({
    total: 0,
    approved: 0,
    draft: 0,
    inReview: 0,
    aiGenerated: 0,
  });

  useEffect(() => {
    fetchJSAs();
  }, []);

  const fetchJSAs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('job_safety_analysis')
        .select('*')
        .order('prepared_at', { ascending: false });

      if (error) throw error;

      setJsaList(data || []);
      calculateStats(data || []);
    } catch (err) {
      console.error('Error fetching JSAs:', err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: JSA[]) => {
    setStats({
      total: data.length,
      approved: data.filter(j => j.status?.toUpperCase() === 'APPROVED').length,
      draft: data.filter(j => j.status?.toUpperCase() === 'DRAFT').length,
      inReview: data.filter(j => j.status?.toUpperCase() === 'IN_REVIEW').length,
      aiGenerated: data.filter(j => j.ai_generated).length,
    });
  };

  const filteredJSAs = jsaList.filter(jsa => {
    const matchesSearch =
      jsa.job_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jsa.jsa_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jsa.work_location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || jsa.status?.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'APPROVED':
        return 'status-approved';
      case 'DRAFT':
        return 'status-draft';
      case 'IN_REVIEW':
        return 'status-review';
      case 'EXPIRED':
        return 'status-expired';
      default:
        return 'status-unknown';
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

  return (
    <div className="jsa-management-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <FileText size={32} />
            Job Safety Analysis (JSA)
          </h1>
          <p>Create, manage, and track job hazard analyses for field operations</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={() => setShowNewModal(true)}>
            <Sparkles size={18} />
            AI Generate JSA
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            New JSA
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total JSAs</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon approved">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.approved}</span>
            <span className="stat-label">Approved</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon draft">
            <Edit2 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.draft}</span>
            <span className="stat-label">Draft</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon review">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.inReview}</span>
            <span className="stat-label">In Review</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon ai">
            <Sparkles size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.aiGenerated}</span>
            <span className="stat-label">AI Generated</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by title, number, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="APPROVED">Approved</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* JSA List */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spinning" />
          <p>Loading JSAs...</p>
        </div>
      ) : filteredJSAs.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No JSAs Found</h3>
          <p>Create a new Job Safety Analysis to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            Create JSA
          </button>
        </div>
      ) : (
        <div className="jsa-list">
          {filteredJSAs.map((jsa) => (
            <div
              key={jsa.id}
              className={`jsa-card ${selectedJSA?.id === jsa.id ? 'selected' : ''}`}
              onClick={() => setSelectedJSA(jsa)}
            >
              <div className="jsa-header">
                <div className="jsa-identity">
                  <span className="jsa-number">{jsa.jsa_number}</span>
                  <span className="revision">Rev. {jsa.revision_number}</span>
                  {jsa.ai_generated && (
                    <span className="ai-badge">
                      <Sparkles size={12} />
                      AI
                    </span>
                  )}
                </div>
                <div className="jsa-badges">
                  <span className={`status-badge ${getStatusBadge(jsa.status)}`}>
                    {jsa.status}
                  </span>
                </div>
              </div>

              <h3 className="jsa-title">{jsa.job_title}</h3>
              <p className="jsa-description">{jsa.job_description}</p>

              <div className="jsa-meta">
                <span>
                  <MapPin size={14} />
                  {jsa.work_location || 'No location'}
                </span>
                <span>
                  <AlertTriangle size={14} />
                  {jsa.job_steps?.length || 0} Steps
                </span>
                <span>
                  <Wrench size={14} />
                  {jsa.equipment_required?.length || 0} Equipment
                </span>
                <span>
                  <Clock size={14} />
                  {formatDate(jsa.prepared_at)}
                </span>
              </div>

              {/* Hazard Preview */}
              <div className="hazards-preview">
                {jsa.job_steps?.slice(0, 2).flatMap(step => step.hazards || []).slice(0, 4).map((hazard, idx) => (
                  <span key={idx} className="hazard-tag">{hazard}</span>
                ))}
                {(jsa.job_steps?.flatMap(step => step.hazards || []).length || 0) > 4 && (
                  <span className="hazard-more">
                    +{(jsa.job_steps?.flatMap(step => step.hazards || []).length || 0) - 4} more
                  </span>
                )}
              </div>

              <ChevronRight size={20} className="chevron" />
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedJSA && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>{selectedJSA.jsa_number}</h2>
            <div className="panel-actions">
              <button className="btn btn-icon" title="Duplicate">
                <Copy size={18} />
              </button>
              <button className="btn btn-icon" title="Edit">
                <Edit2 size={18} />
              </button>
              <button className="btn btn-icon" onClick={() => setSelectedJSA(null)}>
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="panel-content">
            {/* Header Info */}
            <div className="detail-section">
              <div className="jsa-detail-header">
                <h3>{selectedJSA.job_title}</h3>
                <span className={`status-badge ${getStatusBadge(selectedJSA.status)}`}>
                  {selectedJSA.status}
                </span>
              </div>
              <p className="description">{selectedJSA.job_description}</p>
            </div>

            {/* Key Details */}
            <div className="detail-section">
              <h4>
                <Shield size={16} />
                Details
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Location</label>
                  <span>{selectedJSA.work_location || '—'}</span>
                </div>
                <div className="detail-item">
                  <label>Revision</label>
                  <span>{selectedJSA.revision_number}</span>
                </div>
                <div className="detail-item">
                  <label>Prepared</label>
                  <span>{formatDate(selectedJSA.prepared_at)}</span>
                </div>
                <div className="detail-item">
                  <label>Approved</label>
                  <span>{formatDate(selectedJSA.approved_at)}</span>
                </div>
                <div className="detail-item">
                  <label>Times Used</label>
                  <span>{selectedJSA.times_used}</span>
                </div>
                <div className="detail-item">
                  <label>AI Generated</label>
                  <span>{selectedJSA.ai_generated ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            {/* Equipment */}
            {selectedJSA.equipment_required?.length > 0 && (
              <div className="detail-section">
                <h4>
                  <Wrench size={16} />
                  Required Equipment
                </h4>
                <div className="equipment-list">
                  {selectedJSA.equipment_required.map((eq, idx) => (
                    <span key={idx} className="equipment-tag">{eq}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Job Steps */}
            <div className="detail-section">
              <h4>
                <AlertTriangle size={16} />
                Job Steps & Hazard Controls
              </h4>
              <div className="job-steps">
                {selectedJSA.job_steps?.map((step, idx) => (
                  <div key={idx} className="job-step">
                    <div className="step-header">
                      <span className="step-number">Step {step.step}</span>
                      <span className="step-task">{step.task}</span>
                    </div>
                    <div className="step-content">
                      <div className="hazards">
                        <label>Hazards:</label>
                        <div className="tag-list">
                          {step.hazards?.map((h, i) => (
                            <span key={i} className="hazard-tag">{h}</span>
                          ))}
                        </div>
                      </div>
                      <div className="controls">
                        <label>Controls:</label>
                        <div className="tag-list">
                          {step.controls?.map((c, i) => (
                            <span key={i} className="control-tag">{c}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="panel-footer">
              <button className="btn btn-secondary">
                <Eye size={16} />
                Print Preview
              </button>
              <button className="btn btn-primary">
                <CheckCircle size={16} />
                Use for Today's Work
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New JSA Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New JSA</h2>
              <button className="btn btn-icon" onClick={() => setShowNewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="coming-soon">Full JSA creation form coming soon!</p>
              <p>The JSA creation form will include:</p>
              <ul>
                <li>Job title and description</li>
                <li>Work location with project selection</li>
                <li>Step-by-step task entry</li>
                <li>Hazard identification per step</li>
                <li>Control measure assignment</li>
                <li>Equipment requirements</li>
                <li>AI-assisted hazard suggestions</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
