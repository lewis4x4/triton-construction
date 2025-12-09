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

export function RisksTab({ projectId }: RisksTabProps) {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');

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

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setRisks(data || []);
    } catch (err) {
      console.error('Error fetching risks:', err);
      setError('Failed to load risks');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, typeFilter, severityFilter]);

  useEffect(() => {
    fetchRisks();
  }, [fetchRisks]);

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
        </div>
        <div className="risks-filters">
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
        </div>
      </div>

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
        </div>
      ) : (
        <div className="risks-list">
          {risks.map((risk) => (
            <div key={risk.id} className={`risk-card ${risk.type.toLowerCase()}`}>
              <div className="risk-card-header">
                <div className="risk-type-badge">
                  {risk.type === 'RISK' ? '⚠️ Risk' : '💡 Opportunity'}
                </div>
                {risk.overall_severity && (
                  <span className={`severity-badge ${getSeverityClass(risk.overall_severity)}`}>
                    {risk.overall_severity}
                  </span>
                )}
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
                  <span className="meta-item question-flag">Requires Pre-bid Question</span>
                )}
              </div>

              {risk.mitigation_strategy && (
                <div className="risk-mitigation">
                  <strong>Mitigation:</strong> {risk.mitigation_strategy}
                </div>
              )}

              <div className="risk-card-footer">
                <span className={`review-status ${risk.review_status?.toLowerCase() || 'pending'}`}>
                  {risk.review_status?.replace(/_/g, ' ') || 'Pending Review'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
