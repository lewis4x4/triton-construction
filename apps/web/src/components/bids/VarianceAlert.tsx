import { useState } from 'react';
import './VarianceAlert.css';

// Types matching the database enums
type VarianceSignificance = 'MATCH' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
type VarianceDirection = 'OVER' | 'UNDER' | 'MATCH';
type RecommendedStrategy = 'SHORT' | 'LONG' | 'NEUTRAL';

interface VarianceItem {
  id: string;
  line_number: number | null;
  item_number: string;
  description: string;
  unit: string;
  ebsx_quantity: number | null;
  plan_quantity: number | null;
  takeoff_quantity: number | null;
  quantity_variance_pct: number | null;
  variance_direction: VarianceDirection | null;
  variance_significance: VarianceSignificance | null;
  unit_price: number | null;
  bid_amount: number | null;
  is_unbalanced: boolean;
  unbalance_direction: string | null;
  unbalance_justification: string | null;
  priority_score: number;
}

interface VarianceAlertProps {
  items: VarianceItem[];
  onItemSelect: (item: VarianceItem) => void;
  onMarkUnbalanced: (itemId: string, direction: 'SHORT' | 'LONG', justification: string) => void;
  onDismiss?: (itemId: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

// Variance significance styling
const VARIANCE_CONFIG: Record<VarianceSignificance, { color: string; bgColor: string; borderColor: string; label: string }> = {
  MATCH: { color: '#059669', bgColor: '#d1fae5', borderColor: '#10b981', label: 'Match' },
  MINOR: { color: '#0284c7', bgColor: '#e0f2fe', borderColor: '#0ea5e9', label: 'Minor' },
  MODERATE: { color: '#d97706', bgColor: '#fef3c7', borderColor: '#f59e0b', label: 'Moderate' },
  MAJOR: { color: '#dc2626', bgColor: '#fee2e2', borderColor: '#ef4444', label: 'Major' },
  CRITICAL: { color: '#7c2d12', bgColor: '#fecaca', borderColor: '#dc2626', label: 'Critical' },
};

function getRecommendedStrategy(item: VarianceItem): { strategy: RecommendedStrategy; explanation: string } {
  if (!item.variance_significance || !item.variance_direction) {
    return { strategy: 'NEUTRAL', explanation: 'Insufficient data for recommendation' };
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
    strategy: 'NEUTRAL',
    explanation: 'Variance within acceptable range. No strategic adjustment recommended.',
  };
}

function formatCurrency(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function VarianceAlert({
  items,
  onItemSelect,
  onMarkUnbalanced,
  onDismiss,
  isCollapsed = false,
  onToggleCollapse,
}: VarianceAlertProps) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');

  // Filter to only show MAJOR and CRITICAL items that haven't been addressed
  const actionableItems = items.filter(
    (item) =>
      ['MAJOR', 'CRITICAL'].includes(item.variance_significance || '') &&
      !item.is_unbalanced
  );

  if (actionableItems.length === 0) {
    return null;
  }

  const criticalCount = actionableItems.filter((i) => i.variance_significance === 'CRITICAL').length;
  const majorCount = actionableItems.filter((i) => i.variance_significance === 'MAJOR').length;

  return (
    <div className={`variance-alert-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="variance-alert-header" onClick={onToggleCollapse}>
        <div className="variance-alert-title">
          <span className="variance-alert-icon">⚠️</span>
          <span className="variance-alert-text">
            Quantity Variances Detected
          </span>
          <div className="variance-counts">
            {criticalCount > 0 && (
              <span className="count-badge critical">{criticalCount} Critical</span>
            )}
            {majorCount > 0 && (
              <span className="count-badge major">{majorCount} Major</span>
            )}
          </div>
        </div>
        <button className="collapse-btn">
          {isCollapsed ? '▼' : '▲'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="variance-alert-content">
          <p className="variance-alert-description">
            The following items have significant quantity variances between plan and takeoff.
            Review and consider strategic pricing adjustments.
          </p>

          <div className="variance-items-list">
            {actionableItems.map((item) => {
              const config = VARIANCE_CONFIG[item.variance_significance || 'MATCH'];
              const { strategy, explanation } = getRecommendedStrategy(item);
              const isExpanded = expandedItemId === item.id;

              return (
                <div
                  key={item.id}
                  className={`variance-item ${isExpanded ? 'expanded' : ''}`}
                  style={{ borderLeftColor: config.borderColor }}
                >
                  <div className="variance-item-header" onClick={() => setExpandedItemId(isExpanded ? null : item.id)}>
                    <div className="variance-item-info">
                      <span className="item-number">{item.item_number}</span>
                      <span className="item-description" title={item.description}>
                        {item.description.length > 50 ? item.description.substring(0, 50) + '...' : item.description}
                      </span>
                    </div>
                    <div className="variance-item-metrics">
                      <span
                        className="variance-badge"
                        style={{
                          backgroundColor: config.bgColor,
                          color: config.color,
                          borderColor: config.borderColor,
                        }}
                      >
                        {item.variance_direction === 'OVER' ? '+' : '-'}
                        {Math.abs(item.quantity_variance_pct || 0).toFixed(1)}%
                      </span>
                      <span
                        className={`strategy-badge ${strategy.toLowerCase()}`}
                      >
                        {strategy}
                      </span>
                      <span className="expand-icon">{isExpanded ? '−' : '+'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="variance-item-details">
                      <div className="quantity-comparison">
                        <div className="qty-row">
                          <span className="qty-label">EBSX (Bid):</span>
                          <span className="qty-value">{formatNumber(item.ebsx_quantity)} {item.unit}</span>
                        </div>
                        <div className="qty-row">
                          <span className="qty-label">Plan Summary:</span>
                          <span className="qty-value">{formatNumber(item.plan_quantity)} {item.unit}</span>
                        </div>
                        <div className="qty-row">
                          <span className="qty-label">Contractor Takeoff:</span>
                          <span className="qty-value highlight">{formatNumber(item.takeoff_quantity)} {item.unit}</span>
                        </div>
                        <div className="qty-row total">
                          <span className="qty-label">Bid Amount:</span>
                          <span className="qty-value">{formatCurrency(item.bid_amount)}</span>
                        </div>
                      </div>

                      <div className="strategy-recommendation">
                        <h4>Recommendation: <span className={strategy.toLowerCase()}>{strategy}</span></h4>
                        <p>{explanation}</p>
                      </div>

                      <div className="variance-actions">
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onItemSelect(item)}
                        >
                          View Details
                        </button>

                        {strategy !== 'NEUTRAL' && (
                          <div className="mark-unbalanced-form">
                            <textarea
                              placeholder="Enter justification for unbalancing (required, min 10 characters)..."
                              value={justificationText}
                              onChange={(e) => setJustificationText(e.target.value)}
                              rows={2}
                            />
                            <div className="form-actions">
                              <button
                                className={`btn btn-sm ${strategy === 'SHORT' ? 'btn-warning' : 'btn-success'}`}
                                disabled={justificationText.length < 10}
                                onClick={() => {
                                  onMarkUnbalanced(item.id, strategy as 'SHORT' | 'LONG', justificationText);
                                  setJustificationText('');
                                  setExpandedItemId(null);
                                }}
                              >
                                Mark as {strategy}
                              </button>
                              {onDismiss && (
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => onDismiss(item.id)}
                                >
                                  Dismiss
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Export a simpler variance badge component for use in tables
export function VarianceBadge({
  variancePct,
  significance,
  direction,
  compact = false,
}: {
  variancePct: number | null;
  significance: VarianceSignificance | null;
  direction: VarianceDirection | null;
  compact?: boolean;
}) {
  if (variancePct == null || significance == null) {
    return <span style={{ color: '#9ca3af' }}>-</span>;
  }

  const config = VARIANCE_CONFIG[significance];
  const sign = direction === 'OVER' ? '+' : direction === 'UNDER' ? '-' : '';

  return (
    <span
      className={`variance-badge-inline ${compact ? 'compact' : ''}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.color,
        borderColor: config.borderColor,
      }}
      title={`${config.label} variance: ${sign}${Math.abs(variancePct).toFixed(1)}%`}
    >
      {sign}{Math.abs(variancePct).toFixed(compact ? 0 : 1)}%
    </span>
  );
}
