import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import './RisksTab.css';

interface RisksTabProps {
  projectId: string;
}

interface Risk {
  id: string;
  risk_number: string | null;
  type: 'RISK' | 'OPPORTUNITY';
  title: string;
  description: string;
  category: string;
  probability: string;
  cost_impact: string;
  schedule_impact: string;
  overall_severity: string;
  owner_vs_contractor: string | null;
  mitigation_strategy: string | null;
  review_status: string | null;
  estimated_value_low: number | null;
  estimated_value_high: number | null;
  requires_prebid_question: boolean | null;
  ai_generated: boolean | null;
  source_document_id: string | null;
  created_at: string | null;
}

type FilterType = 'all' | 'RISK' | 'OPPORTUNITY';
type SeverityFilter = 'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type ReviewStatusFilter = 'all' | 'PENDING' | 'REVIEWED' | 'ACCEPTED' | 'MITIGATED' | 'ARCHIVED';

const RISK_CATEGORIES = [
  { value: 'SCOPE', label: 'Scope' },
  { value: 'QUANTITY', label: 'Quantity' },
  { value: 'SITE_CONDITIONS', label: 'Site Conditions' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'MOT', label: 'Maintenance of Traffic' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'REGULATORY', label: 'Regulatory' },
  { value: 'SUBCONTRACTOR', label: 'Subcontractor' },
  { value: 'MATERIAL', label: 'Material' },
  { value: 'WEATHER', label: 'Weather' },
  { value: 'HAZMAT', label: 'Hazmat' },
  { value: 'CONSTRUCTABILITY', label: 'Constructability' },
  { value: 'OTHER', label: 'Other' },
];

const SEVERITY_LEVELS = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const PROBABILITY_LEVELS = [
  { value: 'VERY_LIKELY', label: 'Very Likely (>75%)' },
  { value: 'LIKELY', label: 'Likely (50-75%)' },
  { value: 'POSSIBLE', label: 'Possible (25-50%)' },
  { value: 'UNLIKELY', label: 'Unlikely (<25%)' },
];

const IMPACT_LEVELS = [
  { value: 'SEVERE', label: 'Severe' },
  { value: 'MAJOR', label: 'Major' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'MINOR', label: 'Minor' },
];

export function RisksTab({ projectId }: RisksTabProps) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [reviewFilter, setReviewFilter] = useState<ReviewStatusFilter>('all');
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null);
  const [showNewRiskModal, setShowNewRiskModal] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [selectedRisks, setSelectedRisks] = useState<Set<string>>(new Set());

  const fetchRisks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('bid_project_risks')
        .select('*')
        .eq('bid_project_id', projectId)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (severityFilter !== 'all') {
        query = query.eq('overall_severity', severityFilter);
      }

      if (reviewFilter !== 'all') {
        query = query.eq('review_status', reviewFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setRisks(data || []);
    } catch (err) {
      console.error('Error fetching risks:', err);
      setError('Failed to load risks');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, typeFilter, severityFilter, reviewFilter]);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const handleMarkReviewed = async (riskId: string) => {
    setActionInProgress(riskId);
    try {
      const { error } = await supabase
        .from('bid_project_risks')
        .update({ review_status: 'REVIEWED' })
        .eq('id', riskId);

      if (error) throw error;
      await fetchRisks();
    } catch (err) {
      console.error('Error marking reviewed:', err);
      setError('Failed to mark as reviewed');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAccept = async (riskId: string) => {
    setActionInProgress(riskId);
    try {
      const { error } = await supabase
        .from('bid_project_risks')
        .update({ review_status: 'ACCEPTED' })
        .eq('id', riskId);

      if (error) throw error;
      await fetchRisks();
    } catch (err) {
      console.error('Error accepting:', err);
      setError('Failed to accept risk');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleMarkMitigated = async (riskId: string) => {
    setActionInProgress(riskId);
    try {
      const { error } = await supabase
        .from('bid_project_risks')
        .update({ review_status: 'MITIGATED' })
        .eq('id', riskId);

      if (error) throw error;
      await fetchRisks();
    } catch (err) {
      console.error('Error marking mitigated:', err);
      setError('Failed to mark as mitigated');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleArchive = async (riskId: string) => {
    setActionInProgress(riskId);
    try {
      const { error } = await supabase
        .from('bid_project_risks')
        .update({ review_status: 'ARCHIVED' })
        .eq('id', riskId);

      if (error) throw error;
      await fetchRisks();
    } catch (err) {
      console.error('Error archiving:', err);
      setError('Failed to archive');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleCreateQuestion = async (risk: Risk) => {
    setActionInProgress(risk.id);
    try {
      // Get next question number
      const { data: existing } = await supabase
        .from('bid_prebid_questions')
        .select('question_number')
        .eq('bid_project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (existing && existing.length > 0 && existing[0].question_number) {
        const match = existing[0].question_number.match(/Q-(\d+)/);
        if (match) {
          nextNumber = parseInt(match[1], 10) + 1;
        }
      }

      // Create question from risk
      const { error } = await supabase.from('bid_prebid_questions').insert({
        bid_project_id: projectId,
        question_number: `Q-${String(nextNumber).padStart(3, '0')}`,
        question_text: `Regarding ${risk.title}: Please clarify the scope and any special requirements related to ${risk.description}`,
        justification: `Risk identified: ${risk.title} (${risk.overall_severity} severity)`,
        category: risk.category,
        status: 'AI_SUGGESTED',
        ai_generated: false,
      });

      if (error) throw error;

      // Update risk to show question was created
      await supabase
        .from('bid_project_risks')
        .update({ requires_prebid_question: true })
        .eq('id', risk.id);

      await fetchRisks();
      alert('Pre-bid question created successfully! Check the Questions tab.');
    } catch (err) {
      console.error('Error creating question:', err);
      setError('Failed to create question');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBulkReview = async () => {
    if (selectedRisks.size === 0) return;
    setActionInProgress('bulk');
    try {
      const { error } = await supabase
        .from('bid_project_risks')
        .update({ review_status: 'REVIEWED' })
        .in('id', Array.from(selectedRisks));

      if (error) throw error;
      setSelectedRisks(new Set());
      await fetchRisks();
    } catch (err) {
      console.error('Error bulk reviewing:', err);
      setError('Failed to review selected risks');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleBulkAccept = async () => {
    if (selectedRisks.size === 0) return;
    setActionInProgress('bulk');
    try {
      const { error } = await supabase
        .from('bid_project_risks')
        .update({ review_status: 'ACCEPTED' })
        .in('id', Array.from(selectedRisks));

      if (error) throw error;
      setSelectedRisks(new Set());
      await fetchRisks();
    } catch (err) {
      console.error('Error bulk accepting:', err);
      setError('Failed to accept selected risks');
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleRiskSelection = (riskId: string) => {
    const newSelected = new Set(selectedRisks);
    if (newSelected.has(riskId)) {
      newSelected.delete(riskId);
    } else {
      newSelected.add(riskId);
    }
    setSelectedRisks(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRisks.size === risks.length) {
      setSelectedRisks(new Set());
    } else {
      setSelectedRisks(new Set(risks.map((r) => r.id)));
    }
  };

  // ============================================================================
  // Helper Functions
  // ============================================================================

  const getSeverityClass = (severity: string | null) => {
    switch (severity) {
      case 'CRITICAL':
        return 'severity-critical';
      case 'HIGH':
        return 'severity-high';
      case 'MEDIUM':
        return 'severity-medium';
      case 'LOW':
        return 'severity-low';
      default:
        return '';
    }
  };

  const getReviewStatusClass = (status: string | null) => {
    switch (status) {
      case 'PENDING':
        return 'review-pending';
      case 'REVIEWED':
        return 'review-reviewed';
      case 'ACCEPTED':
        return 'review-accepted';
      case 'MITIGATED':
        return 'review-mitigated';
      case 'ARCHIVED':
        return 'review-archived';
      default:
        return 'review-pending';
    }
  };

  const formatCurrency = (low: number | null, high: number | null) => {
    if (low === null && high === null) return '-';
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    if (low !== null && high !== null) {
      return `${formatter.format(low)} - ${formatter.format(high)}`;
    }
    return formatter.format(low ?? high ?? 0);
  };

  const riskCount = risks.filter((r) => r.type === 'RISK').length;
  const opportunityCount = risks.filter((r) => r.type === 'OPPORTUNITY').length;
  const criticalCount = risks.filter((r) => r.overall_severity === 'CRITICAL').length;
  const highCount = risks.filter((r) => r.overall_severity === 'HIGH').length;
  const pendingReviewCount = risks.filter((r) => !r.review_status || r.review_status === 'PENDING').length;

  if (isLoading) {
    return (
      <div className="risks-loading">
        <div className="loading-spinner" />
        <span>Loading risks...</span>
      </div>
    );
  }

  return (
    <div className="risks-tab">
      {/* Header with Stats */}
      <div className="risks-header">
        <div className="risks-stats">
          <div className="stat-item risks-stat">
            <span className="stat-value">{riskCount}</span>
            <span className="stat-label">Risks</span>
          </div>
          <div className="stat-item opportunities-stat">
            <span className="stat-value">{opportunityCount}</span>
            <span className="stat-label">Opportunities</span>
          </div>
          <div className="stat-item critical-stat">
            <span className="stat-value">{criticalCount}</span>
            <span className="stat-label">Critical</span>
          </div>
          <div className="stat-item high-stat">
            <span className="stat-value">{highCount}</span>
            <span className="stat-label">High</span>
          </div>
          <div className="stat-item pending-stat">
            <span className="stat-value">{pendingReviewCount}</span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>
        <div className="risks-actions-bar">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as FilterType)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="RISK">Risks Only</option>
            <option value="OPPORTUNITY">Opportunities Only</option>
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
            className="filter-select"
          >
            <option value="all">All Severity</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value as ReviewStatusFilter)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="REVIEWED">Reviewed</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="MITIGATED">Mitigated</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowNewRiskModal(true)}
          >
            + Add Risk
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRisks.size > 0 && (
        <div className="bulk-actions-bar">
          <span className="selected-count">{selectedRisks.size} selected</span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleBulkReview}
            disabled={actionInProgress === 'bulk'}
          >
            Mark Reviewed
          </button>
          <button
            className="btn btn-sm btn-success"
            onClick={handleBulkAccept}
            disabled={actionInProgress === 'bulk'}
          >
            Accept Selected
          </button>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => setSelectedRisks(new Set())}
          >
            Clear Selection
          </button>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {risks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{typeFilter === 'OPPORTUNITY' ? '💡' : '⚠️'}</div>
          <h4>No {typeFilter === 'all' ? 'Risks or Opportunities' : typeFilter === 'RISK' ? 'Risks' : 'Opportunities'} Found</h4>
          <p>
            {typeFilter === 'all'
              ? 'AI will identify risks and opportunities when documents are processed'
              : `No ${typeFilter.toLowerCase()}s match the current filters`}
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setShowNewRiskModal(true)}
          >
            Add Risk Manually
          </button>
        </div>
      ) : (
        <div className="risks-list">
          {/* Select All Header */}
          <div className="risks-list-header">
            <label className="select-all-label">
              <input
                type="checkbox"
                checked={selectedRisks.size === risks.length && risks.length > 0}
                onChange={toggleSelectAll}
              />
              Select All
            </label>
          </div>

          {risks.map((risk) => (
            <div
              key={risk.id}
              className={`risk-card ${risk.type.toLowerCase()} ${selectedRisks.has(risk.id) ? 'selected' : ''}`}
            >
              <div className="risk-card-header">
                <label className="risk-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedRisks.has(risk.id)}
                    onChange={() => toggleRiskSelection(risk.id)}
                  />
                </label>
                <div className="risk-type-badge">
                  {risk.type === 'RISK' ? '⚠️ Risk' : '💡 Opportunity'}
                </div>
                {risk.overall_severity && (
                  <span className={`severity-badge ${getSeverityClass(risk.overall_severity)}`}>
                    {risk.overall_severity}
                  </span>
                )}
                <span className={`review-badge ${getReviewStatusClass(risk.review_status)}`}>
                  {(risk.review_status || 'PENDING').replace(/_/g, ' ')}
                </span>
                {risk.ai_generated && <span className="ai-badge">AI Generated</span>}
              </div>

              <h4 className="risk-title">{risk.title}</h4>

              {risk.description && <p className="risk-description">{risk.description}</p>}

              <div className="risk-meta">
                {risk.category && (
                  <span className="meta-item">
                    <strong>Category:</strong> {risk.category.replace(/_/g, ' ')}
                  </span>
                )}
                {risk.probability && (
                  <span className="meta-item">
                    <strong>Probability:</strong> {risk.probability.replace(/_/g, ' ')}
                  </span>
                )}
                {risk.owner_vs_contractor && (
                  <span className="meta-item">
                    <strong>Ownership:</strong> {risk.owner_vs_contractor}
                  </span>
                )}
                {risk.type === 'OPPORTUNITY' &&
                  (risk.estimated_value_low !== null || risk.estimated_value_high !== null) && (
                    <span className="meta-item value">
                      <strong>Est. Value:</strong>{' '}
                      {formatCurrency(risk.estimated_value_low, risk.estimated_value_high)}
                    </span>
                  )}
                {risk.requires_prebid_question && (
                  <span className="meta-item question-flag">✓ Pre-bid Question Created</span>
                )}
              </div>

              {risk.mitigation_strategy && (
                <div className="risk-mitigation">
                  <strong>Mitigation:</strong> {risk.mitigation_strategy}
                </div>
              )}

              <div className="risk-actions">
                {(!risk.review_status || risk.review_status === 'PENDING') && (
                  <button
                    className="action-btn review"
                    onClick={() => handleMarkReviewed(risk.id)}
                    disabled={actionInProgress === risk.id}
                  >
                    {actionInProgress === risk.id ? '...' : 'Mark Reviewed'}
                  </button>
                )}
                {risk.review_status === 'REVIEWED' && (
                  <>
                    <button
                      className="action-btn accept"
                      onClick={() => handleAccept(risk.id)}
                      disabled={actionInProgress === risk.id}
                    >
                      {actionInProgress === risk.id ? '...' : 'Accept'}
                    </button>
                    <button
                      className="action-btn mitigate"
                      onClick={() => handleMarkMitigated(risk.id)}
                      disabled={actionInProgress === risk.id}
                    >
                      {actionInProgress === risk.id ? '...' : 'Mark Mitigated'}
                    </button>
                  </>
                )}
                {!risk.requires_prebid_question && risk.type === 'RISK' && (
                  <button
                    className="action-btn question"
                    onClick={() => handleCreateQuestion(risk)}
                    disabled={actionInProgress === risk.id}
                  >
                    Create Question
                  </button>
                )}
                <button
                  className="action-btn secondary"
                  onClick={() => setEditingRisk(risk)}
                >
                  Edit
                </button>
                {risk.review_status !== 'ARCHIVED' && (
                  <button
                    className="action-btn archive"
                    onClick={() => handleArchive(risk.id)}
                    disabled={actionInProgress === risk.id}
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Risk Modal */}
      {editingRisk && (
        <EditRiskModal
          risk={editingRisk}
          onClose={() => setEditingRisk(null)}
          onSave={async (updated) => {
            try {
              const { error } = await supabase
                .from('bid_project_risks')
                .update({
                  title: updated.title,
                  description: updated.description,
                  category: updated.category,
                  probability: updated.probability,
                  cost_impact: updated.cost_impact,
                  schedule_impact: updated.schedule_impact,
                  overall_severity: updated.overall_severity,
                  owner_vs_contractor: updated.owner_vs_contractor,
                  mitigation_strategy: updated.mitigation_strategy,
                  estimated_value_low: updated.estimated_value_low,
                  estimated_value_high: updated.estimated_value_high,
                })
                .eq('id', updated.id);

              if (error) throw error;
              setEditingRisk(null);
              await fetchRisks();
            } catch (err) {
              console.error('Error updating risk:', err);
              setError('Failed to update risk');
            }
          }}
        />
      )}

      {/* New Risk Modal */}
      {showNewRiskModal && (
        <NewRiskModal
          projectId={projectId}
          onClose={() => setShowNewRiskModal(false)}
          onSave={async (newRisk) => {
            try {
              // Get next risk number
              const { data: existing } = await supabase
                .from('bid_project_risks')
                .select('risk_number')
                .eq('bid_project_id', projectId)
                .order('created_at', { ascending: false })
                .limit(1);

              let nextNumber = 1;
              if (existing && existing.length > 0 && existing[0].risk_number) {
                const match = existing[0].risk_number.match(/R-(\d+)/);
                if (match) {
                  nextNumber = parseInt(match[1], 10) + 1;
                }
              }

              const { error } = await supabase.from('bid_project_risks').insert({
                bid_project_id: projectId,
                risk_number: `R-${String(nextNumber).padStart(3, '0')}`,
                ...newRisk,
                review_status: 'REVIEWED', // Manual risks start as reviewed
                ai_generated: false,
              });

              if (error) throw error;
              setShowNewRiskModal(false);
              await fetchRisks();
            } catch (err) {
              console.error('Error creating risk:', err);
              setError('Failed to create risk');
            }
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Edit Risk Modal
// ============================================================================

interface EditRiskModalProps {
  risk: Risk;
  onClose: () => void;
  onSave: (updated: Partial<Risk> & { id: string }) => void;
}

function EditRiskModal({ risk, onClose, onSave }: EditRiskModalProps) {
  const [title, setTitle] = useState(risk.title);
  const [description, setDescription] = useState(risk.description || '');
  const [category, setCategory] = useState(risk.category || '');
  const [probability, setProbability] = useState(risk.probability || '');
  const [costImpact, setCostImpact] = useState(risk.cost_impact || '');
  const [scheduleImpact, setScheduleImpact] = useState(risk.schedule_impact || '');
  const [severity, setSeverity] = useState(risk.overall_severity || '');
  const [ownership, setOwnership] = useState(risk.owner_vs_contractor || '');
  const [mitigation, setMitigation] = useState(risk.mitigation_strategy || '');
  const [valueLow, setValueLow] = useState(risk.estimated_value_low?.toString() || '');
  const [valueHigh, setValueHigh] = useState(risk.estimated_value_high?.toString() || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      id: risk.id,
      title,
      description: description || null,
      category: category || null,
      probability: probability || null,
      cost_impact: costImpact || null,
      schedule_impact: scheduleImpact || null,
      overall_severity: severity || null,
      owner_vs_contractor: ownership || null,
      mitigation_strategy: mitigation || null,
      estimated_value_low: valueLow ? parseFloat(valueLow) : null,
      estimated_value_high: valueHigh ? parseFloat(valueHigh) : null,
    });
    setIsSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content risk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit {risk.type === 'OPPORTUNITY' ? 'Opportunity' : 'Risk'}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Brief risk title..."
              />
            </div>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detailed description..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select Category</option>
                {RISK_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Overall Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="">Select Severity</option>
                {SEVERITY_LEVELS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Probability</label>
              <select value={probability} onChange={(e) => setProbability(e.target.value)}>
                <option value="">Select Probability</option>
                {PROBABILITY_LEVELS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Ownership</label>
              <select value={ownership} onChange={(e) => setOwnership(e.target.value)}>
                <option value="">Select Owner</option>
                <option value="OWNER">Owner (WVDOH)</option>
                <option value="CONTRACTOR">Contractor</option>
                <option value="SHARED">Shared</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cost Impact</label>
              <select value={costImpact} onChange={(e) => setCostImpact(e.target.value)}>
                <option value="">Select Impact</option>
                {IMPACT_LEVELS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Schedule Impact</label>
              <select value={scheduleImpact} onChange={(e) => setScheduleImpact(e.target.value)}>
                <option value="">Select Impact</option>
                {IMPACT_LEVELS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {risk.type === 'OPPORTUNITY' && (
            <div className="form-row">
              <div className="form-group">
                <label>Est. Value Low ($)</label>
                <input
                  type="number"
                  value={valueLow}
                  onChange={(e) => setValueLow(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Est. Value High ($)</label>
                <input
                  type="number"
                  value={valueHigh}
                  onChange={(e) => setValueHigh(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Mitigation Strategy</label>
            <textarea
              value={mitigation}
              onChange={(e) => setMitigation(e.target.value)}
              rows={3}
              placeholder="How to mitigate this risk..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// New Risk Modal
// ============================================================================

interface NewRiskModalProps {
  projectId: string;
  onClose: () => void;
  onSave: (risk: Partial<Risk>) => void;
}

function NewRiskModal({ onClose, onSave }: NewRiskModalProps) {
  const [type, setType] = useState<'RISK' | 'OPPORTUNITY'>('RISK');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [probability, setProbability] = useState('');
  const [costImpact, setCostImpact] = useState('');
  const [scheduleImpact, setScheduleImpact] = useState('');
  const [severity, setSeverity] = useState('');
  const [ownership, setOwnership] = useState('');
  const [mitigation, setMitigation] = useState('');
  const [valueLow, setValueLow] = useState('');
  const [valueHigh, setValueHigh] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSave({
      type,
      title,
      description: description || null,
      category: category || null,
      probability: probability || null,
      cost_impact: costImpact || null,
      schedule_impact: scheduleImpact || null,
      overall_severity: severity || null,
      owner_vs_contractor: ownership || null,
      mitigation_strategy: mitigation || null,
      estimated_value_low: valueLow ? parseFloat(valueLow) : null,
      estimated_value_high: valueHigh ? parseFloat(valueHigh) : null,
    });
    setIsSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content risk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add New {type === 'OPPORTUNITY' ? 'Opportunity' : 'Risk'}</h3>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Type *</label>
            <div className="type-toggle">
              <button
                type="button"
                className={`type-btn ${type === 'RISK' ? 'active risk' : ''}`}
                onClick={() => setType('RISK')}
              >
                ⚠️ Risk
              </button>
              <button
                type="button"
                className={`type-btn ${type === 'OPPORTUNITY' ? 'active opportunity' : ''}`}
                onClick={() => setType('OPPORTUNITY')}
              >
                💡 Opportunity
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Brief title..."
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Detailed description..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Select Category</option>
                {RISK_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Overall Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="">Select Severity</option>
                {SEVERITY_LEVELS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Probability</label>
              <select value={probability} onChange={(e) => setProbability(e.target.value)}>
                <option value="">Select Probability</option>
                {PROBABILITY_LEVELS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Ownership</label>
              <select value={ownership} onChange={(e) => setOwnership(e.target.value)}>
                <option value="">Select Owner</option>
                <option value="OWNER">Owner (WVDOH)</option>
                <option value="CONTRACTOR">Contractor</option>
                <option value="SHARED">Shared</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Cost Impact</label>
              <select value={costImpact} onChange={(e) => setCostImpact(e.target.value)}>
                <option value="">Select Impact</option>
                {IMPACT_LEVELS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Schedule Impact</label>
              <select value={scheduleImpact} onChange={(e) => setScheduleImpact(e.target.value)}>
                <option value="">Select Impact</option>
                {IMPACT_LEVELS.map((i) => (
                  <option key={i.value} value={i.value}>
                    {i.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {type === 'OPPORTUNITY' && (
            <div className="form-row">
              <div className="form-group">
                <label>Est. Value Low ($)</label>
                <input
                  type="number"
                  value={valueLow}
                  onChange={(e) => setValueLow(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Est. Value High ($)</label>
                <input
                  type="number"
                  value={valueHigh}
                  onChange={(e) => setValueHigh(e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Mitigation Strategy</label>
            <textarea
              value={mitigation}
              onChange={(e) => setMitigation(e.target.value)}
              rows={3}
              placeholder="How to mitigate this risk..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving || !title.trim()}>
              {isSaving ? 'Creating...' : `Add ${type === 'OPPORTUNITY' ? 'Opportunity' : 'Risk'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
