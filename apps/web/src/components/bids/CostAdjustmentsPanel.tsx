import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import './CostAdjustmentsPanel.css';

// Helper for accessing tables not yet in TypeScript types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = supabase as any;

interface CostAdjustment {
  id: string;
  factor_type: string;
  percentage_modifier: number;
  condition_description: string;
  condition_category: string | null;
  affected_item_codes: string[] | null;
  affected_work_categories: string[] | null;
  source_document_id: string | null;
  ai_confidence_score: number | null;
  is_user_confirmed: boolean;
  confirmed_by: string | null;
  confirmed_at: string | null;
  created_at: string;
  // Joined data
  source_document?: {
    file_name: string;
    document_type: string;
  } | null;
}

interface CostAdjustmentsPanelProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onAdjustmentsChange?: () => void;
}

// Factor type display configuration
const FACTOR_TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  LABOR: { label: 'Labor', icon: '👷', color: '#3b82f6' },
  EQUIPMENT: { label: 'Equipment', icon: '🚜', color: '#f59e0b' },
  MATERIAL: { label: 'Material', icon: '🧱', color: '#10b981' },
  SUBCONTRACTOR: { label: 'Subcontractor', icon: '🏗️', color: '#8b5cf6' },
  OVERALL: { label: 'Overall', icon: '📊', color: '#6b7280' },
  MOBILIZATION: { label: 'Mobilization', icon: '🚚', color: '#ec4899' },
  CONTINGENCY: { label: 'Contingency', icon: '⚠️', color: '#ef4444' },
  OVERHEAD: { label: 'Overhead', icon: '🏢', color: '#0ea5e9' },
  PROFIT: { label: 'Profit', icon: '💰', color: '#22c55e' },
};

// Confidence score display
function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null;

  const pct = Math.round(score * 100);
  let color = '#ef4444'; // red
  if (pct >= 80) color = '#10b981'; // green
  else if (pct >= 60) color = '#f59e0b'; // yellow

  return (
    <span
      className="confidence-badge"
      title={`AI confidence: ${pct}%`}
      style={{ color, fontWeight: 500, fontSize: '0.75rem' }}
    >
      {pct}% conf
    </span>
  );
}

export function CostAdjustmentsPanel({
  projectId,
  isOpen,
  onClose,
  onAdjustmentsChange,
}: CostAdjustmentsPanelProps) {
  const [adjustments, setAdjustments] = useState<CostAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [groupBy, setGroupBy] = useState<'source' | 'type'>('source');

  const fetchAdjustments = useCallback(async () => {
    setIsLoading(true);
    try {
      // Note: bid_cost_adjustment_factors table was added in migration 107
      const { data, error } = await supabaseAny
        .from('bid_cost_adjustment_factors')
        .select(`
          id, factor_type, percentage_modifier, condition_description, condition_category,
          affected_item_codes, affected_work_categories, source_document_id,
          ai_confidence_score, is_user_confirmed, confirmed_by, confirmed_at, created_at,
          source_document:bid_documents(file_name, document_type)
        `)
        .eq('bid_project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform source_document from array to single object
      const rawData = (data || []) as Array<Record<string, unknown>>;
      const transformed = rawData.map((adj) => ({
        ...adj,
        source_document: Array.isArray(adj.source_document)
          ? adj.source_document[0] || null
          : adj.source_document || null,
      })) as CostAdjustment[];

      setAdjustments(transformed);
    } catch (err) {
      console.error('Error fetching adjustments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      fetchAdjustments();
    }
  }, [isOpen, fetchAdjustments]);

  const handleConfirm = async (id: string) => {
    try {
      const { error } = await supabaseAny
        .from('bid_cost_adjustment_factors')
        .update({
          is_user_confirmed: true,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      fetchAdjustments();
      onAdjustmentsChange?.();
    } catch (err) {
      console.error('Error confirming adjustment:', err);
      alert('Failed to confirm adjustment');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this cost adjustment?')) return;

    try {
      const { error } = await supabaseAny
        .from('bid_cost_adjustment_factors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Trigger price recalculation
      await supabaseAny.rpc('recalculate_line_item_prices', { p_project_id: projectId });

      fetchAdjustments();
      onAdjustmentsChange?.();
    } catch (err) {
      console.error('Error deleting adjustment:', err);
      alert('Failed to remove adjustment');
    }
  };

  const handleEditStart = (adj: CostAdjustment) => {
    setEditingId(adj.id);
    setEditValue(adj.percentage_modifier);
  };

  const handleEditSave = async (id: string) => {
    try {
      const { error } = await supabaseAny
        .from('bid_cost_adjustment_factors')
        .update({
          percentage_modifier: editValue,
          is_user_confirmed: true,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      // Trigger price recalculation
      await supabaseAny.rpc('recalculate_line_item_prices', { p_project_id: projectId });

      setEditingId(null);
      fetchAdjustments();
      onAdjustmentsChange?.();
    } catch (err) {
      console.error('Error updating adjustment:', err);
      alert('Failed to update adjustment');
    }
  };

  const handleConfirmAll = async () => {
    if (!confirm('Confirm all unconfirmed adjustments?')) return;

    try {
      const unconfirmedIds = adjustments
        .filter((a) => !a.is_user_confirmed)
        .map((a) => a.id);

      const { error } = await supabaseAny
        .from('bid_cost_adjustment_factors')
        .update({
          is_user_confirmed: true,
          confirmed_at: new Date().toISOString(),
        })
        .in('id', unconfirmedIds);

      if (error) throw error;

      fetchAdjustments();
      onAdjustmentsChange?.();
    } catch (err) {
      console.error('Error confirming all:', err);
      alert('Failed to confirm all adjustments');
    }
  };

  if (!isOpen) return null;

  // Group adjustments
  const grouped = adjustments.reduce((acc, adj) => {
    const key = groupBy === 'source'
      ? adj.source_document?.file_name || 'Unknown Source'
      : adj.factor_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(adj);
    return acc;
  }, {} as Record<string, CostAdjustment[]>);

  const unconfirmedCount = adjustments.filter((a) => !a.is_user_confirmed).length;

  return (
    <div className="cost-adjustments-overlay" onClick={onClose}>
      <div className="cost-adjustments-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="header-title">
            <h2>AI-Detected Cost Adjustments</h2>
            {unconfirmedCount > 0 && (
              <span className="unconfirmed-count">
                {unconfirmedCount} pending review
              </span>
            )}
          </div>
          <div className="header-actions">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'source' | 'type')}
              className="group-select"
            >
              <option value="source">Group by Source</option>
              <option value="type">Group by Type</option>
            </select>
            {unconfirmedCount > 0 && (
              <button className="btn btn-primary" onClick={handleConfirmAll}>
                Confirm All ({unconfirmedCount})
              </button>
            )}
            <button className="btn btn-icon close-btn" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="panel-content">
          {isLoading ? (
            <div className="loading-inline">
              <div className="loading-spinner small" />
              <span>Loading adjustments...</span>
            </div>
          ) : adjustments.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">📊</span>
              <p>No cost adjustments detected</p>
              <p className="hint">
                Upload documents like Special Provisions, Geotechnical Reports, or Environmental
                Studies to extract cost adjustment factors.
              </p>
            </div>
          ) : (
            <div className="adjustments-list">
              {Object.entries(grouped).map(([groupName, groupAdjustments]) => (
                <div key={groupName} className="adjustment-group">
                  <h3 className="group-header">
                    {groupBy === 'type' && FACTOR_TYPE_CONFIG[groupName]
                      ? `${FACTOR_TYPE_CONFIG[groupName].icon} ${FACTOR_TYPE_CONFIG[groupName].label}`
                      : groupName}
                    <span className="group-count">({groupAdjustments.length})</span>
                  </h3>

                  {groupAdjustments.map((adj) => {
                    const typeConfig = FACTOR_TYPE_CONFIG[adj.factor_type] || {
                      label: adj.factor_type,
                      icon: '📌',
                      color: '#6b7280',
                    };
                    const isEditing = editingId === adj.id;

                    return (
                      <div
                        key={adj.id}
                        className={`adjustment-card ${adj.is_user_confirmed ? 'confirmed' : 'unconfirmed'}`}
                      >
                        <div className="card-header">
                          <div className="type-and-value">
                            <span
                              className="factor-badge"
                              style={{ backgroundColor: typeConfig.color }}
                            >
                              {typeConfig.icon} {typeConfig.label}
                            </span>
                            {isEditing ? (
                              <div className="edit-input-group">
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(Number(e.target.value))}
                                  className="edit-input"
                                  autoFocus
                                />
                                <span>%</span>
                                <button
                                  className="btn btn-sm btn-primary"
                                  onClick={() => handleEditSave(adj.id)}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span
                                className={`percentage-value ${adj.percentage_modifier > 0 ? 'positive' : 'negative'}`}
                              >
                                {adj.percentage_modifier > 0 ? '+' : ''}
                                {adj.percentage_modifier}%
                              </span>
                            )}
                          </div>
                          <div className="status-and-confidence">
                            <ConfidenceBadge score={adj.ai_confidence_score} />
                            {adj.is_user_confirmed ? (
                              <span className="status-badge confirmed">✓ Confirmed</span>
                            ) : (
                              <span className="status-badge pending">Pending</span>
                            )}
                          </div>
                        </div>

                        <p className="condition-description">{adj.condition_description}</p>

                        {adj.condition_category && (
                          <span className="category-tag">{adj.condition_category.replace(/_/g, ' ')}</span>
                        )}

                        {groupBy === 'type' && adj.source_document && (
                          <p className="source-info">
                            Source: {adj.source_document.file_name}
                          </p>
                        )}

                        {adj.affected_item_codes && adj.affected_item_codes.length > 0 && (
                          <p className="affected-items">
                            Affects: {adj.affected_item_codes.join(', ')}
                          </p>
                        )}

                        <div className="card-actions">
                          {!adj.is_user_confirmed && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleConfirm(adj.id)}
                            >
                              ✓ Confirm
                            </button>
                          )}
                          {!isEditing && (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => handleEditStart(adj)}
                            >
                              Edit %
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(adj.id)}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel-footer">
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-value">{adjustments.length}</span>
              <span className="stat-label">Total Adjustments</span>
            </div>
            <div className="stat">
              <span className="stat-value" style={{ color: unconfirmedCount > 0 ? '#f59e0b' : '#10b981' }}>
                {adjustments.length - unconfirmedCount}/{adjustments.length}
              </span>
              <span className="stat-label">Confirmed</span>
            </div>
            <div className="stat">
              <span className="stat-value">
                {adjustments.reduce((sum, a) => {
                  if (a.factor_type === 'OVERALL' || a.affected_item_codes?.includes('*')) {
                    return sum + a.percentage_modifier;
                  }
                  return sum;
                }, 0)}%
              </span>
              <span className="stat-label">Overall Impact</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
