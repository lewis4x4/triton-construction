import { useState } from 'react';
import './QuantitySourcePanel.css';

type QuantitySource = 'EBSX_IMPORT' | 'PLAN_SUMMARY' | 'CONTRACTOR_TAKEOFF' | 'SPECIAL_PROVISION' | 'ADDENDUM';

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

interface QuantitySourcePanelProps {
  lineItemId: string;
  itemNumber: string;
  unit: string;
  quantities: QuantityRecord[];
  variancePct: number | null;
  onAddQuantity: (source: QuantitySource, quantity: number, reference: string, notes: string) => void;
  onUpdateQuantity: (recordId: string, quantity: number, reference: string, notes: string) => void;
  onSetGoverning: (recordId: string) => void;
  onDeleteQuantity?: (recordId: string) => void;
  isEditable?: boolean;
}

const SOURCE_CONFIG: Record<QuantitySource, { label: string; description: string; icon: string; editable: boolean }> = {
  EBSX_IMPORT: {
    label: 'EBSX Import',
    description: 'Original bid document quantity',
    icon: '📄',
    editable: false,
  },
  PLAN_SUMMARY: {
    label: 'Plan Summary',
    description: 'Engineer\'s plan quantity table',
    icon: '📋',
    editable: true,
  },
  CONTRACTOR_TAKEOFF: {
    label: 'Contractor Takeoff',
    description: 'Field-verified quantity estimate',
    icon: '📐',
    editable: true,
  },
  SPECIAL_PROVISION: {
    label: 'Special Provision',
    description: 'Modified by special provision',
    icon: '📝',
    editable: true,
  },
  ADDENDUM: {
    label: 'Addendum',
    description: 'Modified by addendum',
    icon: '📎',
    editable: true,
  },
};

function formatNumber(value: number | null): string {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function QuantitySourcePanel({
  lineItemId,
  itemNumber,
  unit,
  quantities,
  variancePct,
  onAddQuantity,
  onUpdateQuantity,
  onSetGoverning,
  onDeleteQuantity,
  isEditable = true,
}: QuantitySourcePanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingSource, setAddingSource] = useState<QuantitySource | null>(null);
  const [formData, setFormData] = useState({
    quantity: '',
    reference: '',
    notes: '',
  });

  // Find existing sources
  const existingSources = new Set(quantities.map((q) => q.quantity_source));
  const governingRecord = quantities.find((q) => q.is_governing);

  // Sources that can be added
  const availableSources = (['PLAN_SUMMARY', 'CONTRACTOR_TAKEOFF', 'SPECIAL_PROVISION', 'ADDENDUM'] as QuantitySource[]).filter(
    (s) => !existingSources.has(s)
  );

  const handleStartEdit = (record: QuantityRecord) => {
    setEditingId(record.id);
    setFormData({
      quantity: record.quantity.toString(),
      reference: record.source_reference || '',
      notes: record.calculation_notes || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setAddingSource(null);
    setFormData({ quantity: '', reference: '', notes: '' });
  };

  const handleSaveEdit = (recordId: string) => {
    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty < 0) {
      alert('Please enter a valid quantity');
      return;
    }
    onUpdateQuantity(recordId, qty, formData.reference, formData.notes);
    handleCancelEdit();
  };

  const handleStartAdd = (source: QuantitySource) => {
    setAddingSource(source);
    setFormData({ quantity: '', reference: '', notes: '' });
  };

  const handleSaveAdd = () => {
    if (!addingSource) return;
    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty < 0) {
      alert('Please enter a valid quantity');
      return;
    }
    onAddQuantity(addingSource, qty, formData.reference, formData.notes);
    handleCancelEdit();
  };

  return (
    <div className="quantity-source-panel">
      <div className="panel-header">
        <h3>Quantity Sources</h3>
        <span className="item-badge">{itemNumber}</span>
      </div>

      {variancePct != null && (
        <div className={`variance-summary ${Math.abs(variancePct) > 15 ? 'warning' : ''}`}>
          <span className="variance-label">Current Variance:</span>
          <span className={`variance-value ${variancePct > 0 ? 'over' : variancePct < 0 ? 'under' : ''}`}>
            {variancePct > 0 ? '+' : ''}
            {variancePct.toFixed(1)}%
          </span>
          {Math.abs(variancePct) > 15 && (
            <span className="variance-alert-icon" title="Significant variance detected">⚠️</span>
          )}
        </div>
      )}

      <div className="quantity-sources-list">
        {quantities.map((record) => {
          const config = SOURCE_CONFIG[record.quantity_source];
          const isEditing = editingId === record.id;
          const canEdit = isEditable && config.editable;

          return (
            <div
              key={record.id}
              className={`quantity-source-card ${record.is_governing ? 'governing' : ''} ${isEditing ? 'editing' : ''}`}
            >
              <div className="source-header">
                <div className="source-title">
                  <span className="source-icon">{config.icon}</span>
                  <span className="source-name">{config.label}</span>
                  {record.is_governing && <span className="governing-badge">Governing</span>}
                </div>
                {canEdit && !isEditing && (
                  <div className="source-actions">
                    <button className="action-btn edit" onClick={() => handleStartEdit(record)} title="Edit">
                      ✏️
                    </button>
                    {!record.is_governing && (
                      <button
                        className="action-btn governing"
                        onClick={() => onSetGoverning(record.id)}
                        title="Set as Governing"
                      >
                        ⭐
                      </button>
                    )}
                    {onDeleteQuantity && !record.is_governing && record.quantity_source !== 'EBSX_IMPORT' && (
                      <button
                        className="action-btn delete"
                        onClick={() => onDeleteQuantity(record.id)}
                        title="Delete"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="edit-form">
                  <div className="form-row">
                    <label>Quantity ({unit})</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="Enter quantity"
                    />
                  </div>
                  <div className="form-row">
                    <label>Source Reference</label>
                    <input
                      type="text"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="e.g., Sheet 15, Table 2"
                    />
                  </div>
                  <div className="form-row">
                    <label>Calculation Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="How was this quantity calculated?"
                      rows={2}
                    />
                  </div>
                  <div className="form-buttons">
                    <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
                      Cancel
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(record.id)}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="source-content">
                  <div className="quantity-display">
                    <span className="quantity-value">{formatNumber(record.quantity)}</span>
                    <span className="quantity-unit">{unit}</span>
                  </div>

                  {record.source_reference && (
                    <div className="source-reference">
                      <span className="reference-label">Reference:</span>
                      <span className="reference-value">{record.source_reference}</span>
                    </div>
                  )}

                  {record.calculation_notes && (
                    <div className="source-notes">
                      <span className="notes-label">Notes:</span>
                      <span className="notes-value">{record.calculation_notes}</span>
                    </div>
                  )}

                  <div className="source-meta">
                    {record.confidence != null && (
                      <span className="meta-item">
                        Confidence: {record.confidence.toFixed(0)}%
                      </span>
                    )}
                    {record.entered_at && (
                      <span className="meta-item">
                        Updated: {formatDate(record.entered_at)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Add New Source Section */}
        {isEditable && availableSources.length > 0 && !addingSource && (
          <div className="add-source-section">
            <span className="add-source-label">Add Quantity Source:</span>
            <div className="add-source-buttons">
              {availableSources.map((source) => {
                const config = SOURCE_CONFIG[source];
                return (
                  <button
                    key={source}
                    className="add-source-btn"
                    onClick={() => handleStartAdd(source)}
                  >
                    <span className="source-icon">{config.icon}</span>
                    <span>{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Add Form */}
        {addingSource && (
          <div className="quantity-source-card adding">
            <div className="source-header">
              <div className="source-title">
                <span className="source-icon">{SOURCE_CONFIG[addingSource].icon}</span>
                <span className="source-name">{SOURCE_CONFIG[addingSource].label}</span>
                <span className="new-badge">New</span>
              </div>
            </div>
            <div className="edit-form">
              <div className="form-row">
                <label>Quantity ({unit}) *</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="Enter quantity"
                  autoFocus
                />
              </div>
              <div className="form-row">
                <label>Source Reference</label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  placeholder="e.g., Sheet 15, Table 2"
                />
              </div>
              <div className="form-row">
                <label>Calculation Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="How was this quantity calculated?"
                  rows={2}
                />
              </div>
              <div className="form-buttons">
                <button className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSaveAdd}
                  disabled={!formData.quantity}
                >
                  Add Source
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info about governing quantity */}
      <div className="governing-info">
        <span className="info-icon">ℹ️</span>
        <span className="info-text">
          The <strong>governing</strong> quantity is used for variance calculations and pricing strategy.
          {governingRecord && (
            <> Currently using: <strong>{SOURCE_CONFIG[governingRecord.quantity_source].label}</strong></>
          )}
        </span>
      </div>
    </div>
  );
}
