import { useState, useEffect } from 'react';
import { QuantitySourcePanel } from './QuantitySourcePanel';
import { UnbalanceModal } from './UnbalanceModal';

type QuantitySource = 'EBSX_IMPORT' | 'PLAN_SUMMARY' | 'CONTRACTOR_TAKEOFF' | 'SPECIAL_PROVISION' | 'ADDENDUM';
type UnbalanceDirection = 'SHORT' | 'LONG';

interface QuantityRecord {
  id: string;
  quantity_source: QuantitySource;
  source_reference: string | null;
  quantity: number;
  unit: string;
  calculation_notes: string | null;
  is_governing: boolean;
  confidence: number | null;
  entered_by: string | null;
  entered_at: string | null;
}

interface LineItem {
  id: string;
  line_number: number | null;
  item_number: string;
  alt_item_number: string | null;
  description: string;
  short_description: string | null;
  quantity: number;
  unit: string;
  work_category: string | null;
  risk_level: string | null;
  estimation_method: string | null;
  base_unit_cost: number | null;
  ai_suggested_unit_price: number | null;
  final_unit_price: number | null;
  final_extended_price: number | null;
  pricing_reviewed: boolean | null;
  estimator_notes: string | null;
  created_at: string | null;
  // Pricing metadata from historical pricing system
  pricing_metadata?: {
    source?: string;
    confidence?: number;
    historical_count?: number;
    base_price_year?: number;
  } | null;
  // Quantity intelligence fields
  ebsx_quantity?: number | null;
  plan_quantity?: number | null;
  takeoff_quantity?: number | null;
  governing_source?: QuantitySource | null;
  quantity_variance_pct?: number | null;
  variance_direction?: 'OVER' | 'UNDER' | 'MATCH' | null;
  variance_significance?: 'MATCH' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL' | null;
  is_unbalanced?: boolean;
  unbalance_direction?: UnbalanceDirection | null;
  unbalance_justification?: string | null;
  unbalance_confidence?: number | null;
}

interface WorkCategory {
  value: string;
  label: string;
}

interface LineItemDetailProps {
  item: LineItem;
  onClose: () => void;
  onSave: (updatedItem: Partial<LineItem> & { id: string }) => Promise<void>;
  categories: WorkCategory[];
  // Quantity intelligence props
  quantitySources?: QuantityRecord[];
  onAddQuantitySource?: (source: QuantitySource, quantity: number, reference: string, notes: string) => Promise<void>;
  onUpdateQuantitySource?: (recordId: string, quantity: number, reference: string, notes: string) => Promise<void>;
  onSetGoverningSource?: (recordId: string) => Promise<void>;
  onDeleteQuantitySource?: (recordId: string) => Promise<void>;
  onMarkUnbalanced?: (direction: UnbalanceDirection, justification: string, confidence: number) => Promise<void>;
  onClearUnbalanced?: () => Promise<void>;
}

const RISK_LEVELS = [
  { value: '', label: 'Not Assessed' },
  { value: 'LOW', label: 'Low Risk' },
  { value: 'MEDIUM', label: 'Medium Risk' },
  { value: 'HIGH', label: 'High Risk' },
  { value: 'CRITICAL', label: 'Critical Risk' },
];

// Estimation methods that match the database enum
const ESTIMATION_METHODS = [
  { value: '', label: 'Not Set' },
  { value: 'ASSEMBLY_BASED', label: 'Assembly-Based' },
  { value: 'SUBQUOTE', label: 'Subcontractor Quote' },
  { value: 'HISTORICAL_ANALOG', label: 'Historical Analog' },
  { value: 'OWNER_SPECIFIED', label: 'Owner Specified' },
  { value: 'MANUAL_ESTIMATOR_JUDGMENT', label: 'Manual Entry' },
];

export function LineItemDetail({
  item,
  onClose,
  onSave,
  categories,
  quantitySources = [],
  onAddQuantitySource,
  onUpdateQuantitySource,
  onSetGoverningSource,
  onDeleteQuantitySource,
  onMarkUnbalanced,
  onClearUnbalanced,
}: LineItemDetailProps) {
  const [formData, setFormData] = useState({
    work_category: item.work_category || '',
    risk_level: item.risk_level || '',
    estimation_method: item.estimation_method || '',
    base_unit_cost: item.base_unit_cost?.toString() || '',
    final_unit_price: item.final_unit_price?.toString() || '',
    estimator_notes: item.estimator_notes || '',
    pricing_reviewed: item.pricing_reviewed ?? false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnbalanceModal, setShowUnbalanceModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'quantities'>('details');

  // Calculate extended price when unit price changes
  const calculatedExtended = formData.final_unit_price
    ? parseFloat(formData.final_unit_price) * item.quantity
    : item.ai_suggested_unit_price
      ? item.ai_suggested_unit_price * item.quantity
      : null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const updates: Partial<LineItem> & { id: string } = {
        id: item.id,
        work_category: formData.work_category || null,
        risk_level: formData.risk_level || null,
        estimation_method: formData.estimation_method || null,
        base_unit_cost: formData.base_unit_cost ? parseFloat(formData.base_unit_cost) : null,
        final_unit_price: formData.final_unit_price ? parseFloat(formData.final_unit_price) : null,
        final_extended_price: calculatedExtended,
        estimator_notes: formData.estimator_notes || null,
        pricing_reviewed: formData.pricing_reviewed,
      };

      await onSave(updates);
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      setIsSaving(false);
    }
  };

  // Quantity source handlers
  const handleAddQuantity = async (source: QuantitySource, quantity: number, reference: string, notes: string) => {
    if (onAddQuantitySource) {
      try {
        await onAddQuantitySource(source, quantity, reference, notes);
      } catch (err) {
        console.error('Add quantity error:', err);
        setError(err instanceof Error ? err.message : 'Failed to add quantity source');
      }
    }
  };

  const handleUpdateQuantity = async (recordId: string, quantity: number, reference: string, notes: string) => {
    if (onUpdateQuantitySource) {
      try {
        await onUpdateQuantitySource(recordId, quantity, reference, notes);
      } catch (err) {
        console.error('Update quantity error:', err);
        setError(err instanceof Error ? err.message : 'Failed to update quantity');
      }
    }
  };

  const handleSetGoverning = async (recordId: string) => {
    if (onSetGoverningSource) {
      try {
        await onSetGoverningSource(recordId);
      } catch (err) {
        console.error('Set governing error:', err);
        setError(err instanceof Error ? err.message : 'Failed to set governing source');
      }
    }
  };

  const handleDeleteQuantity = async (recordId: string) => {
    if (onDeleteQuantitySource) {
      if (!confirm('Are you sure you want to delete this quantity source?')) return;
      try {
        await onDeleteQuantitySource(recordId);
      } catch (err) {
        console.error('Delete quantity error:', err);
        setError(err instanceof Error ? err.message : 'Failed to delete quantity source');
      }
    }
  };

  const handleMarkUnbalanced = async (direction: UnbalanceDirection, justification: string, confidence: number) => {
    if (onMarkUnbalanced) {
      try {
        await onMarkUnbalanced(direction, justification, confidence);
        setShowUnbalanceModal(false);
      } catch (err) {
        console.error('Mark unbalanced error:', err);
        setError(err instanceof Error ? err.message : 'Failed to mark as unbalanced');
      }
    }
  };

  const handleClearUnbalanced = async () => {
    if (onClearUnbalanced) {
      if (!confirm('Are you sure you want to remove the unbalanced flag from this item?')) return;
      try {
        await onClearUnbalanced();
      } catch (err) {
        console.error('Clear unbalanced error:', err);
        setError(err instanceof Error ? err.message : 'Failed to clear unbalanced flag');
      }
    }
  };

  // Determine recommended strategy based on variance
  const getRecommendedStrategy = (): { strategy: UnbalanceDirection | null; explanation: string } => {
    if (!item.variance_significance || !item.variance_direction) {
      return { strategy: null, explanation: 'Insufficient data for recommendation' };
    }

    const isMajorOrCritical = ['MAJOR', 'CRITICAL'].includes(item.variance_significance);

    if (item.variance_direction === 'OVER' && isMajorOrCritical) {
      return {
        strategy: 'SHORT',
        explanation: `Takeoff shows ${Math.abs(item.quantity_variance_pct || 0).toFixed(1)}% MORE than plan. Consider LOWERING unit price to reduce overrun exposure.`,
      };
    }

    if (item.variance_direction === 'UNDER' && isMajorOrCritical) {
      return {
        strategy: 'LONG',
        explanation: `Takeoff shows ${Math.abs(item.quantity_variance_pct || 0).toFixed(1)}% LESS than plan. Consider RAISING unit price to maximize early payment.`,
      };
    }

    return {
      strategy: null,
      explanation: 'Variance within acceptable range. No strategic adjustment recommended.',
    };
  };

  const recommendation = getRecommendedStrategy();

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4,
    }).format(value);
  };

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content line-item-detail" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Line Item Details</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="detail-tabs">
          <button
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
            type="button"
          >
            Details & Pricing
          </button>
          <button
            className={`tab-btn ${activeTab === 'quantities' ? 'active' : ''}`}
            onClick={() => setActiveTab('quantities')}
            type="button"
          >
            Quantities
            {item.variance_significance && ['MAJOR', 'CRITICAL'].includes(item.variance_significance) && (
              <span className="tab-badge warning">!</span>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

          {activeTab === 'details' && (
            <>
              {/* Unbalanced Status Banner */}
              {item.is_unbalanced && (
                <div className={`unbalanced-banner ${item.unbalance_direction?.toLowerCase()}`}>
                  <div className="unbalanced-info">
                    <span className="unbalanced-icon">{item.unbalance_direction === 'SHORT' ? '↓' : '↑'}</span>
                    <div className="unbalanced-text">
                      <strong>Marked as {item.unbalance_direction}</strong>
                      <span className="unbalanced-justification">{item.unbalance_justification}</span>
                    </div>
                  </div>
                  {onClearUnbalanced && (
                    <button
                      type="button"
                      className="btn btn-sm btn-ghost"
                      onClick={handleClearUnbalanced}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Item Info (Read-only) */}
              <div className="detail-section">
                <h3>Item Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Line #</label>
                    <span>{item.line_number ?? '-'}</span>
                  </div>
                  <div className="info-item">
                    <label>Item Number</label>
                    <span>{item.item_number}</span>
                  </div>
                  {item.alt_item_number && (
                    <div className="info-item">
                      <label>Alt Item #</label>
                      <span>{item.alt_item_number}</span>
                    </div>
                  )}
                  <div className="info-item">
                    <label>Unit</label>
                    <span>{item.unit}</span>
                  </div>
                  <div className="info-item">
                    <label>Quantity</label>
                    <span>{formatNumber(item.quantity)}</span>
                  </div>
                </div>
                <div className="info-item full-width">
                  <label>Description</label>
                  <p className="description-text">{item.description}</p>
                </div>
              </div>
            </>
          )}

          {activeTab === 'details' && (
            <>
              {/* Categorization */}
              <div className="detail-section">
                <h3>Categorization</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="work_category">Work Category</label>
                    <select
                      id="work_category"
                      name="work_category"
                      value={formData.work_category}
                      onChange={handleChange}
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="risk_level">Risk Level</label>
                    <select
                      id="risk_level"
                      name="risk_level"
                      value={formData.risk_level}
                      onChange={handleChange}
                      className={`risk-select ${formData.risk_level.toLowerCase()}`}
                    >
                      {RISK_LEVELS.map((level) => (
                        <option key={level.value} value={level.value}>
                          {level.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div className="detail-section">
                <h3>Pricing</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="estimation_method">Estimation Method</label>
                    <select
                      id="estimation_method"
                      name="estimation_method"
                      value={formData.estimation_method}
                      onChange={handleChange}
                    >
                      {ESTIMATION_METHODS.map((method) => (
                        <option key={method.value} value={method.value}>
                          {method.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="base_unit_cost">Base Unit Cost ($)</label>
                    <input
                      type="number"
                      id="base_unit_cost"
                      name="base_unit_cost"
                      value={formData.base_unit_cost}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="pricing-summary">
                  {/* AI Suggested Price with source info */}
                  {item.ai_suggested_unit_price != null && (
                    <div className="ai-suggestion-box">
                      <div className="ai-suggestion-header">
                        <span className="ai-icon">🤖</span>
                        <span className="ai-title">AI Suggested Price</span>
                        {item.pricing_metadata?.confidence && (
                          <span className={`confidence-badge ${item.pricing_metadata.confidence >= 0.8 ? 'high' : item.pricing_metadata.confidence >= 0.5 ? 'medium' : 'low'}`}>
                            {Math.round(item.pricing_metadata.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      <div className="ai-suggestion-price">
                        {formatCurrency(item.ai_suggested_unit_price)}
                        <span className="per-unit">/ {item.unit}</span>
                      </div>
                      {item.pricing_metadata?.source && (
                        <div className="ai-suggestion-source">
                          Source: {item.pricing_metadata.source}
                          {item.pricing_metadata.historical_count && item.pricing_metadata.historical_count > 0 && (
                            <span className="historical-count">
                              ({item.pricing_metadata.historical_count} historical bid{item.pricing_metadata.historical_count > 1 ? 's' : ''})
                            </span>
                          )}
                        </div>
                      )}
                      {!formData.final_unit_price && (
                        <button
                          type="button"
                          className="btn btn-ai-accept"
                          onClick={() => setFormData(prev => ({
                            ...prev,
                            final_unit_price: item.ai_suggested_unit_price?.toFixed(2) || '',
                            estimation_method: 'HISTORICAL_ANALOG'
                          }))}
                        >
                          Use AI Suggestion
                        </button>
                      )}
                    </div>
                  )}

                  {/* No AI suggestion message */}
                  {item.ai_suggested_unit_price == null && (
                    <div className="no-ai-suggestion">
                      <span className="warning-icon">⚠️</span>
                      <span>No AI suggested price available for this item. Manual pricing required.</span>
                    </div>
                  )}

                  <div className="pricing-row editable">
                    <label htmlFor="final_unit_price" className="pricing-label">
                      Final Unit Price ($):
                    </label>
                    <input
                      type="number"
                      id="final_unit_price"
                      name="final_unit_price"
                      value={formData.final_unit_price}
                      onChange={handleChange}
                      step="0.01"
                      min="0"
                      placeholder={item.ai_suggested_unit_price?.toFixed(2) || '0.00'}
                      className="pricing-input"
                    />
                  </div>
                  <div className="pricing-row total">
                    <span className="pricing-label">Extended Price:</span>
                    <span className="pricing-value">{formatCurrency(calculatedExtended)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="detail-section">
                <h3>Notes</h3>
                <div className="form-group">
                  <textarea
                    id="estimator_notes"
                    name="estimator_notes"
                    value={formData.estimator_notes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Add notes about this line item..."
                  />
                </div>
              </div>

              {/* Review Status */}
              <div className="detail-section">
                {/* Warning when marking reviewed without pricing */}
                {formData.pricing_reviewed && !formData.final_unit_price && (
                  <div className="review-warning">
                    <span className="warning-icon">⚠️</span>
                    <span>You are marking this item as reviewed without setting a final price. Are you sure this is intentional?</span>
                  </div>
                )}
                <div className="review-toggle">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="pricing_reviewed"
                      checked={formData.pricing_reviewed}
                      onChange={handleChange}
                    />
                    <span className="checkmark"></span>
                    Mark as Reviewed
                  </label>
                  <span className="review-hint">
                    Checked items will be included in the final bid submission
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Quantities Tab Content */}
          {activeTab === 'quantities' && (
            <div className="quantities-tab-content">
              {/* Quantity Source Panel */}
              <QuantitySourcePanel
                lineItemId={item.id}
                itemNumber={item.item_number}
                unit={item.unit}
                quantities={quantitySources}
                variancePct={item.quantity_variance_pct ?? null}
                onAddQuantity={handleAddQuantity}
                onUpdateQuantity={handleUpdateQuantity}
                onSetGoverning={handleSetGoverning}
                onDeleteQuantity={onDeleteQuantitySource ? handleDeleteQuantity : undefined}
                isEditable={!!onAddQuantitySource}
              />

              {/* Strategy Recommendation */}
              {item.variance_significance && ['MAJOR', 'CRITICAL'].includes(item.variance_significance) && (
                <div className="strategy-section">
                  <h3>Unbalancing Strategy</h3>
                  <div className={`strategy-recommendation-box ${recommendation.strategy?.toLowerCase() || 'neutral'}`}>
                    <div className="strategy-header">
                      <span className="strategy-icon">
                        {recommendation.strategy === 'SHORT' ? '↓' : recommendation.strategy === 'LONG' ? '↑' : '−'}
                      </span>
                      <span className="strategy-title">
                        Recommended: {recommendation.strategy || 'No Action'}
                      </span>
                    </div>
                    <p className="strategy-explanation">{recommendation.explanation}</p>

                    {!item.is_unbalanced && onMarkUnbalanced && recommendation.strategy && (
                      <button
                        type="button"
                        className={`btn ${recommendation.strategy === 'SHORT' ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => setShowUnbalanceModal(true)}
                      >
                        Mark as {recommendation.strategy}
                      </button>
                    )}

                    {item.is_unbalanced && (
                      <div className="current-unbalance-status">
                        <span className="status-label">Current Status:</span>
                        <span className={`status-badge ${item.unbalance_direction?.toLowerCase()}`}>
                          {item.unbalance_direction}
                        </span>
                        {onClearUnbalanced && (
                          <button
                            type="button"
                            className="btn btn-sm btn-ghost"
                            onClick={handleClearUnbalanced}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Show message when no significant variance */}
              {(!item.variance_significance || !['MAJOR', 'CRITICAL'].includes(item.variance_significance)) && (
                <div className="no-variance-message">
                  <span className="check-icon">✓</span>
                  <span>No significant quantity variance detected. Unbalancing not recommended.</span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* Unbalance Modal */}
        <UnbalanceModal
          isOpen={showUnbalanceModal}
          onClose={() => setShowUnbalanceModal(false)}
          onConfirm={handleMarkUnbalanced}
          itemNumber={item.item_number}
          itemDescription={item.description}
          recommendedDirection={recommendation.strategy}
          variancePct={item.quantity_variance_pct}
          planQuantity={item.plan_quantity}
          takeoffQuantity={item.takeoff_quantity}
          unit={item.unit}
        />
      </div>
    </div>
  );
}
