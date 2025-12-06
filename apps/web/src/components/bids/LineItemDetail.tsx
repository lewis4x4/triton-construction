import { useState, useEffect } from 'react';

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

export function LineItemDetail({ item, onClose, onSave, categories }: LineItemDetailProps) {
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

        <form onSubmit={handleSubmit}>
          {error && <div className="form-error">{error}</div>}

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
              <div className="pricing-row">
                <span className="pricing-label">AI Suggested Price:</span>
                <span className="pricing-value">
                  {formatCurrency(item.ai_suggested_unit_price)}
                </span>
              </div>
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
      </div>
    </div>
  );
}
