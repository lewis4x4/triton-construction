import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
  Eye,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X,
} from 'lucide-react';
import './ValidationDashboard.css';

// Types based on migration 073 + v_pending_validations view
interface PendingValidation {
  pay_period_id: string;
  organization_id: string;
  project_name: string;
  contract_number: string;
  estimate_number: number;
  period_ending_date: string;
  validation_status: ValidationStatus;
  validation_errors: string[];
  posted_item_pay: number;
  net_pay_amount: number;
  line_item_discrepancy: number;
  to_date_discrepancy: number;
  failed_line_count: number;
  failed_line_items: FailedLineItem[];
  error_messages: string[];
  uploaded_at: string;
  uploaded_by_email: string;
  uploaded_by_name: string;
  pdf_url: string;
  attempt_number: number;
}

interface FailedLineItem {
  item_number: string;
  line_number: string;
  expected: number;
  actual: number;
  discrepancy: number;
}

interface ValidationSummary {
  project_id: string;
  project_name: string;
  passed_count: number;
  failed_math_count: number;
  failed_missing_count: number;
  override_count: number;
  pending_count: number;
  total_count: number;
  pass_rate_pct: number;
}

type ValidationStatus =
  | 'pending'
  | 'passed'
  | 'failed_math'
  | 'failed_missing_data'
  | 'manual_override'
  | 'reprocessing';

const STATUS_CONFIG: Record<
  ValidationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending',
    color: '#6B7280',
    icon: <Clock size={16} />,
  },
  passed: {
    label: 'Passed',
    color: '#10B981',
    icon: <CheckCircle size={16} />,
  },
  failed_math: {
    label: 'Math Error',
    color: '#EF4444',
    icon: <XCircle size={16} />,
  },
  failed_missing_data: {
    label: 'Missing Data',
    color: '#F59E0B',
    icon: <AlertTriangle size={16} />,
  },
  manual_override: {
    label: 'Override',
    color: '#8B5CF6',
    icon: <Edit3 size={16} />,
  },
  reprocessing: {
    label: 'Reprocessing',
    color: '#3B82F6',
    icon: <RefreshCw size={16} />,
  },
};

export function ValidationDashboard() {
  const [validations, setValidations] = useState<PendingValidation[]>([]);
  const [summary, setSummary] = useState<ValidationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'failed' | 'pending'>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedValidation, setSelectedValidation] = useState<PendingValidation | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadValidations();
    loadSummary();
  }, [filter]);

  async function loadValidations() {
    setLoading(true);

    // Query the v_pending_validations view
    const { data, error } = await supabase
      .from('v_pending_validations')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (!error && data) {
      setValidations(data as any);
    }
    setLoading(false);
  }

  async function loadSummary() {
    const { data, error } = await supabase.from('v_validation_summary').select('*');

    if (!error && data) {
      setSummary(data as ValidationSummary[]);
    }
  }

  async function handleReprocess(payPeriodId: string) {
    const { error } = await supabase.rpc('reprocess_pay_period_validation', {
      p_pay_period_id: payPeriodId,
    });

    if (!error) {
      loadValidations();
    }
  }

  async function handleOverride() {
    if (!selectedValidation || overrideReason.length < 10) return;

    setSubmitting(true);
    const { error } = await supabase.rpc('approve_validation_override', {
      p_pay_period_id: selectedValidation.pay_period_id,
      p_override_reason: overrideReason,
    });

    setSubmitting(false);
    if (!error) {
      setShowOverrideModal(false);
      setSelectedValidation(null);
      setOverrideReason('');
      loadValidations();
      loadSummary();
    }
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totals = summary.reduce(
      (acc, s) => ({
        passed: acc.passed + s.passed_count,
        failed_math: acc.failed_math + s.failed_math_count,
        failed_missing: acc.failed_missing + s.failed_missing_count,
        override: acc.override + s.override_count,
        pending: acc.pending + s.pending_count,
        total: acc.total + s.total_count,
      }),
      { passed: 0, failed_math: 0, failed_missing: 0, override: 0, pending: 0, total: 0 }
    );

    const passRate =
      totals.total > 0
        ? Math.round((totals.passed / (totals.total - totals.pending)) * 100) || 0
        : 0;

    return { ...totals, passRate };
  }, [summary]);

  // Filter validations
  const filteredValidations = useMemo(() => {
    if (filter === 'failed') {
      return validations.filter((v) =>
        ['failed_math', 'failed_missing_data'].includes(v.validation_status)
      );
    }
    if (filter === 'pending') {
      return validations.filter((v) => v.validation_status === 'pending');
    }
    return validations;
  }, [validations, filter]);

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="validation-dashboard">
      {/* Header */}
      <div className="validation-header">
        <div className="header-content">
          <h1>Pay Estimate Validation</h1>
          <p>Review and approve pay estimate data ingestion</p>
        </div>
        <button className="btn-primary" onClick={() => loadValidations()}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon pending">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon failed">
            <XCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.failed_math + stats.failed_missing}</span>
            <span className="stat-label">Failed Validation</span>
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

        <div className="stat-card">
          <div className="stat-icon rate">
            <AlertCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.passRate}%</span>
            <span className="stat-label">Pass Rate</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({validations.length})
        </button>
        <button
          className={`filter-tab ${filter === 'failed' ? 'active' : ''}`}
          onClick={() => setFilter('failed')}
        >
          Failed ({validations.filter((v) => v.validation_status.startsWith('failed')).length})
        </button>
        <button
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({validations.filter((v) => v.validation_status === 'pending').length})
        </button>
      </div>

      {/* Validation Table */}
      <div className="validation-table-container">
        {loading ? (
          <div className="loading-state">
            <RefreshCw size={32} className="spin" />
            <p>Loading validations...</p>
          </div>
        ) : filteredValidations.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} />
            <h3>All Clear!</h3>
            <p>No pending validations to review.</p>
          </div>
        ) : (
          <table className="validation-table">
            <thead>
              <tr>
                <th></th>
                <th>Project</th>
                <th>Estimate #</th>
                <th>Period End</th>
                <th>Status</th>
                <th>Item Pay</th>
                <th>Discrepancy</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredValidations.map((v) => (
                <>
                  <tr key={v.pay_period_id} className={expandedRow === v.pay_period_id ? 'expanded' : ''}>
                    <td>
                      <button
                        className="expand-btn"
                        onClick={() =>
                          setExpandedRow(expandedRow === v.pay_period_id ? null : v.pay_period_id)
                        }
                      >
                        {expandedRow === v.pay_period_id ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>
                    </td>
                    <td>
                      <div className="project-info">
                        <span className="project-name">{v.project_name}</span>
                        <span className="contract-number">{v.contract_number}</span>
                      </div>
                    </td>
                    <td>#{v.estimate_number}</td>
                    <td>{formatDate(v.period_ending_date)}</td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: `${STATUS_CONFIG[v.validation_status]?.color}20`,
                          color: STATUS_CONFIG[v.validation_status]?.color,
                        }}
                      >
                        {STATUS_CONFIG[v.validation_status]?.icon}
                        {STATUS_CONFIG[v.validation_status]?.label}
                      </span>
                    </td>
                    <td>{formatCurrency(v.posted_item_pay)}</td>
                    <td>
                      {v.line_item_discrepancy > 0.02 ? (
                        <span className="discrepancy error">
                          {formatCurrency(v.line_item_discrepancy)}
                        </span>
                      ) : (
                        <span className="discrepancy ok">-</span>
                      )}
                    </td>
                    <td>
                      <div className="uploaded-info">
                        <span>{formatDate(v.uploaded_at)}</span>
                        <span className="uploaded-by">{v.uploaded_by_name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {v.pdf_url && (
                          <a
                            href={v.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-icon"
                            title="View PDF"
                          >
                            <Eye size={16} />
                          </a>
                        )}
                        {['failed_math', 'failed_missing_data'].includes(v.validation_status) && (
                          <>
                            <button
                              className="btn-icon"
                              title="Reprocess"
                              onClick={() => handleReprocess(v.pay_period_id)}
                            >
                              <RefreshCw size={16} />
                            </button>
                            <button
                              className="btn-icon approve"
                              title="Override & Approve"
                              onClick={() => {
                                setSelectedValidation(v);
                                setShowOverrideModal(true);
                              }}
                            >
                              <Check size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                  {expandedRow === v.pay_period_id && (
                    <tr className="expanded-row">
                      <td colSpan={9}>
                        <div className="expanded-content">
                          <div className="error-section">
                            <h4>
                              <AlertTriangle size={16} /> Validation Errors
                            </h4>
                            {v.error_messages && v.error_messages.length > 0 ? (
                              <ul className="error-list">
                                {v.error_messages.map((err, i) => (
                                  <li key={i}>{err}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="no-errors">No errors recorded</p>
                            )}
                          </div>

                          {v.failed_line_items && v.failed_line_items.length > 0 && (
                            <div className="failed-lines-section">
                              <h4>
                                <FileText size={16} /> Failed Line Items ({v.failed_line_count})
                              </h4>
                              <table className="failed-lines-table">
                                <thead>
                                  <tr>
                                    <th>Line #</th>
                                    <th>Item #</th>
                                    <th>Expected</th>
                                    <th>Actual</th>
                                    <th>Discrepancy</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {v.failed_line_items.slice(0, 10).map((line, i) => (
                                    <tr key={i}>
                                      <td>{line.line_number}</td>
                                      <td>{line.item_number}</td>
                                      <td>{formatCurrency(line.expected)}</td>
                                      <td>{formatCurrency(line.actual)}</td>
                                      <td className="discrepancy error">
                                        {formatCurrency(line.discrepancy)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {v.failed_line_items.length > 10 && (
                                <p className="more-lines">
                                  + {v.failed_line_items.length - 10} more lines with errors
                                </p>
                              )}
                            </div>
                          )}

                          <div className="summary-section">
                            <div className="summary-item">
                              <span className="label">Posted Item Pay:</span>
                              <span className="value">{formatCurrency(v.posted_item_pay)}</span>
                            </div>
                            <div className="summary-item">
                              <span className="label">Net Pay Amount:</span>
                              <span className="value">{formatCurrency(v.net_pay_amount)}</span>
                            </div>
                            <div className="summary-item">
                              <span className="label">To-Date Discrepancy:</span>
                              <span className="value">{formatCurrency(v.to_date_discrepancy)}</span>
                            </div>
                            <div className="summary-item">
                              <span className="label">Attempt #:</span>
                              <span className="value">{v.attempt_number}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Project Summary Section */}
      {summary.length > 0 && (
        <div className="summary-section-container">
          <h2>Validation Summary by Project</h2>
          <div className="project-summary-grid">
            {summary.map((s) => (
              <div key={s.project_id} className="project-summary-card">
                <h3>{s.project_name}</h3>
                <div className="summary-stats">
                  <div className="summary-stat passed">
                    <span className="value">{s.passed_count}</span>
                    <span className="label">Passed</span>
                  </div>
                  <div className="summary-stat failed">
                    <span className="value">{s.failed_math_count + s.failed_missing_count}</span>
                    <span className="label">Failed</span>
                  </div>
                  <div className="summary-stat override">
                    <span className="value">{s.override_count}</span>
                    <span className="label">Override</span>
                  </div>
                </div>
                <div className="pass-rate-bar">
                  <div
                    className="pass-rate-fill"
                    style={{ width: `${s.pass_rate_pct || 0}%` }}
                  />
                  <span className="pass-rate-label">{s.pass_rate_pct || 0}% Pass Rate</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && selectedValidation && (
        <div className="modal-overlay" onClick={() => setShowOverrideModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Override Validation</h2>
              <button className="modal-close" onClick={() => setShowOverrideModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="override-warning">
                <AlertTriangle size={24} />
                <p>
                  You are about to override the validation for{' '}
                  <strong>
                    {selectedValidation.project_name} - Estimate #
                    {selectedValidation.estimate_number}
                  </strong>
                  . This will mark the pay period as approved despite the validation errors.
                </p>
              </div>

              <div className="form-group">
                <label htmlFor="override-reason">Override Reason (required, min 10 characters)</label>
                <textarea
                  id="override-reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why this validation is being overridden..."
                  rows={4}
                />
                <span className="char-count">{overrideReason.length} / 10 minimum</span>
              </div>

              {selectedValidation.error_messages && selectedValidation.error_messages.length > 0 && (
                <div className="current-errors">
                  <h4>Current Errors:</h4>
                  <ul>
                    {selectedValidation.error_messages.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowOverrideModal(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleOverride}
                disabled={overrideReason.length < 10 || submitting}
              >
                {submitting ? 'Processing...' : 'Approve Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
