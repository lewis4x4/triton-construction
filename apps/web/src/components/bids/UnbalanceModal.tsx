import { useState } from 'react';
import './UnbalanceModal.css';

type UnbalanceDirection = 'SHORT' | 'LONG';

interface UnbalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (direction: UnbalanceDirection, justification: string, confidence: number) => void;
  itemNumber: string;
  itemDescription: string;
  recommendedDirection?: UnbalanceDirection | null;
  variancePct?: number | null;
  planQuantity?: number | null;
  takeoffQuantity?: number | null;
  unit?: string;
}

export function UnbalanceModal({
  isOpen,
  onClose,
  onConfirm,
  itemNumber,
  itemDescription,
  recommendedDirection,
  variancePct,
  planQuantity,
  takeoffQuantity,
  unit,
}: UnbalanceModalProps) {
  const [direction, setDirection] = useState<UnbalanceDirection>(recommendedDirection || 'SHORT');
  const [justification, setJustification] = useState('');
  const [confidence, setConfidence] = useState(80);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (justification.length < 10) {
      alert('Justification must be at least 10 characters');
      return;
    }
    onConfirm(direction, justification, confidence);
    setJustification('');
    setConfidence(80);
  };

  const handleCancel = () => {
    setJustification('');
    setConfidence(80);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="unbalance-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Mark Item as Unbalanced</h2>
          <button className="close-btn" onClick={handleCancel}>&times;</button>
        </div>

        <div className="modal-body">
          <div className="item-info">
            <div className="item-number">{itemNumber}</div>
            <div className="item-description">{itemDescription}</div>
          </div>

          {(planQuantity != null || takeoffQuantity != null) && (
            <div className="quantity-info">
              <div className="qty-comparison">
                <div className="qty-item">
                  <span className="qty-label">Plan Quantity:</span>
                  <span className="qty-value">{planQuantity ?? '-'} {unit}</span>
                </div>
                <div className="qty-item">
                  <span className="qty-label">Takeoff Quantity:</span>
                  <span className="qty-value highlight">{takeoffQuantity ?? '-'} {unit}</span>
                </div>
                {variancePct != null && (
                  <div className="qty-item variance">
                    <span className="qty-label">Variance:</span>
                    <span className={`qty-value ${variancePct > 0 ? 'over' : 'under'}`}>
                      {variancePct > 0 ? '+' : ''}{variancePct.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="form-section">
            <label className="form-label">Strategy Direction *</label>
            <div className="direction-options">
              <button
                className={`direction-btn short ${direction === 'SHORT' ? 'selected' : ''}`}
                onClick={() => setDirection('SHORT')}
              >
                <span className="direction-icon">↓</span>
                <span className="direction-name">SHORT</span>
                <span className="direction-desc">Lower price to reduce overrun exposure</span>
              </button>
              <button
                className={`direction-btn long ${direction === 'LONG' ? 'selected' : ''}`}
                onClick={() => setDirection('LONG')}
              >
                <span className="direction-icon">↑</span>
                <span className="direction-name">LONG</span>
                <span className="direction-desc">Raise price to maximize early payment</span>
              </button>
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">
              Justification * <span className="hint">(min 10 characters)</span>
            </label>
            <textarea
              className="justification-input"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain the strategic reasoning for this pricing adjustment..."
              rows={4}
            />
            <div className="char-count">
              {justification.length} / 10 characters minimum
            </div>
          </div>

          <div className="form-section">
            <label className="form-label">Confidence Level: {confidence}%</label>
            <input
              type="range"
              min="50"
              max="100"
              value={confidence}
              onChange={(e) => setConfidence(parseInt(e.target.value))}
              className="confidence-slider"
            />
            <div className="confidence-labels">
              <span>50% (Uncertain)</span>
              <span>75%</span>
              <span>100% (Certain)</span>
            </div>
          </div>

          <div className="warning-box">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">
              Marking an item as unbalanced will flag it for special attention during bid review.
              Ensure your justification is documented for audit purposes.
            </span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className={`btn ${direction === 'SHORT' ? 'btn-warning' : 'btn-success'}`}
            onClick={handleConfirm}
            disabled={justification.length < 10}
          >
            Mark as {direction}
          </button>
        </div>
      </div>
    </div>
  );
}
