import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import './SubmissionChecklistModal.css';

interface IncompleteItem {
  id: string;
  line_number: number | null;
  item_number: string;
  description: string;
  quantity: number;
  unit: string;
  ai_suggested_unit_price: number | null;
  final_unit_price: number | null;
  pricing_reviewed: boolean | null;
  pricing_status: string;
}

interface SubmissionChecklistModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSubmissionComplete: () => void;
}

type ItemStatus = 'pending' | 'in_progress' | 'completed';

interface ChecklistItem extends IncompleteItem {
  status: ItemStatus;
  userInput: string;
  confirmZero: boolean;
  error: string | null;
}

export function SubmissionChecklistModal({
  projectId,
  projectName,
  onClose,
  onSubmissionComplete,
}: SubmissionChecklistModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchIncompleteItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('bid_line_items')
        .select(
          'id, line_number, item_number, description, quantity, unit, ai_suggested_unit_price, final_unit_price, pricing_reviewed'
        )
        .eq('bid_project_id', projectId)
        .or('final_unit_price.is.null,pricing_reviewed.is.null,pricing_reviewed.eq.false');

      if (fetchError) throw fetchError;

      // Filter to only truly incomplete items (no final price OR not reviewed)
      const incompleteItems = (data || []).filter((item) => {
        const hasFinalPrice = item.final_unit_price != null;
        const isReviewed = item.pricing_reviewed === true;
        return !hasFinalPrice || !isReviewed;
      });

      // Transform to checklist items
      const checklistItems: ChecklistItem[] = incompleteItems.map((item) => ({
        ...item,
        pricing_status: computePricingStatus(item),
        status: 'pending' as ItemStatus,
        userInput: item.ai_suggested_unit_price?.toString() || '',
        confirmZero: false,
        error: null,
      }));

      // Sort by urgency: no price > AI suggested > reviewed without price
      checklistItems.sort((a, b) => {
        const priorityOrder: Record<string, number> = {
          NEEDS_PRICING: 1,
          MANUAL_REQUIRED: 2,
          INCOMPLETE: 3,
          AI_SUGGESTED: 4,
        };
        return (priorityOrder[a.pricing_status] || 99) - (priorityOrder[b.pricing_status] || 99);
      });

      setItems(checklistItems);
    } catch (err) {
      console.error('Error fetching incomplete items:', err);
      setError('Failed to load items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchIncompleteItems();
  }, [fetchIncompleteItems]);

  function computePricingStatus(item: Partial<IncompleteItem>): string {
    if (item.final_unit_price != null && item.pricing_reviewed === true) {
      return 'COMPLETE';
    }
    if (item.pricing_reviewed === true && item.final_unit_price == null) {
      return 'INCOMPLETE';
    }
    if (item.ai_suggested_unit_price != null) {
      return 'AI_SUGGESTED';
    }
    return 'NEEDS_PRICING';
  }

  const handleInputChange = (id: string, value: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, userInput: value, status: 'in_progress' as ItemStatus, error: null }
          : item
      )
    );
  };

  const handleUseAISuggestion = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.ai_suggested_unit_price) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? {
                ...i,
                userInput: i.ai_suggested_unit_price!.toString(),
                status: 'in_progress' as ItemStatus,
                error: null,
              }
            : i
        )
      );
    }
  };

  const handleConfirmZero = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, confirmZero: !item.confirmZero, userInput: '0', status: 'in_progress' as ItemStatus }
          : item
      )
    );
  };

  const handleSaveItem = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    const price = parseFloat(item.userInput);
    if (isNaN(price) && !item.confirmZero) {
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, error: 'Please enter a valid price' } : i
        )
      );
      return;
    }

    const finalPrice = item.confirmZero ? 0 : price;

    try {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, status: 'in_progress' as ItemStatus, error: null } : i))
      );

      const { error: updateError } = await supabase
        .from('bid_line_items')
        .update({
          final_unit_price: finalPrice,
          final_extended_price: finalPrice * item.quantity,
          pricing_reviewed: true,
        })
        .eq('id', id);

      if (updateError) throw updateError;

      setItems((prev) =>
        prev.map((i) =>
          i.id === id
            ? { ...i, status: 'completed' as ItemStatus, final_unit_price: finalPrice, pricing_reviewed: true }
            : i
        )
      );
    } catch (err) {
      console.error('Error saving item:', err);
      setItems((prev) =>
        prev.map((i) =>
          i.id === id ? { ...i, status: 'pending' as ItemStatus, error: 'Failed to save. Try again.' } : i
        )
      );
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    setError(null);

    try {
      // Save all items that have input but aren't completed
      const itemsToSave = items.filter(
        (item) => item.status !== 'completed' && (item.userInput || item.confirmZero)
      );

      for (const item of itemsToSave) {
        await handleSaveItem(item.id);
      }

      // Check if all are now complete
      const allComplete = items.every(
        (item) =>
          item.status === 'completed' ||
          (parseFloat(item.userInput) >= 0 || item.confirmZero)
      );

      if (allComplete) {
        setSuccessMessage('All items saved successfully!');
      }
    } catch (err) {
      console.error('Error saving all items:', err);
      setError('Some items failed to save. Please review and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitBid = async () => {
    const incompleteCount = items.filter((i) => i.status !== 'completed').length;

    if (incompleteCount > 0) {
      setError(`Please complete all ${incompleteCount} items before submitting.`);
      return;
    }

    // All items are complete - trigger submission
    onSubmissionComplete();
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

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 100;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (isLoading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content checklist-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Checking Bid Completeness...</h2>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-body loading-body">
            <div className="loading-spinner" />
            <p>Analyzing line items...</p>
          </div>
        </div>
      </div>
    );
  }

  // If all items are complete, show success message
  if (items.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content checklist-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header success-header">
            <h2>Ready to Submit!</h2>
            <button className="modal-close" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="modal-body success-body">
            <div className="success-icon">✅</div>
            <h3>All Line Items Complete</h3>
            <p>All pricing has been reviewed. You can proceed with bid submission.</p>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-success" onClick={onSubmissionComplete}>
              Submit Bid
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content checklist-modal large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="header-content">
            <h2>Complete Pricing to Submit</h2>
            <span className="project-name">{projectName}</span>
          </div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-info">
            <span className="progress-text">
              {completedCount} of {totalCount} items completed
            </span>
            <span className="progress-percentage">{progressPercentage}%</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {successMessage && <div className="success-banner">{successMessage}</div>}

        <div className="modal-body checklist-body">
          <div className="checklist-items">
            {items.map((item) => (
              <div
                key={item.id}
                className={`checklist-item ${item.status}`}
              >
                <div className="item-header">
                  <div className="item-status-icon">
                    {item.status === 'completed' ? '✅' : item.status === 'in_progress' ? '⏳' : '○'}
                  </div>
                  <div className="item-info">
                    <span className="item-number">{item.item_number}</span>
                    <span className="item-description" title={item.description}>
                      {item.description}
                    </span>
                  </div>
                  <div className="item-quantity">
                    {item.quantity} {item.unit}
                  </div>
                </div>

                <div className="item-pricing">
                  {item.status === 'completed' ? (
                    <div className="completed-pricing">
                      <span className="completed-label">Final Price:</span>
                      <span className="completed-value">
                        {formatCurrency(item.final_unit_price)} / {item.unit}
                      </span>
                      <span className="completed-extended">
                        = {formatCurrency((item.final_unit_price || 0) * item.quantity)}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="current-status">
                        {item.ai_suggested_unit_price ? (
                          <span className="ai-suggestion">
                            AI Suggested: {formatCurrency(item.ai_suggested_unit_price)}
                          </span>
                        ) : (
                          <span className="no-price-warning">No price data available</span>
                        )}
                      </div>

                      <div className="pricing-input-row">
                        <div className="price-input-group">
                          <label htmlFor={`price-${item.id}`}>Unit Price ($)</label>
                          <input
                            id={`price-${item.id}`}
                            type="number"
                            value={item.userInput}
                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>

                        <div className="quick-actions">
                          {item.ai_suggested_unit_price && (
                            <button
                              type="button"
                              className="btn btn-ai"
                              onClick={() => handleUseAISuggestion(item.id)}
                            >
                              Use AI Suggestion
                            </button>
                          )}
                          <button
                            type="button"
                            className={`btn btn-zero ${item.confirmZero ? 'active' : ''}`}
                            onClick={() => handleConfirmZero(item.id)}
                          >
                            {item.confirmZero ? 'Confirmed $0' : 'Confirm $0'}
                          </button>
                        </div>

                        <button
                          type="button"
                          className="btn btn-save"
                          onClick={() => handleSaveItem(item.id)}
                          disabled={!item.userInput && !item.confirmZero}
                        >
                          Save
                        </button>
                      </div>

                      {item.error && <div className="item-error">{item.error}</div>}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSaveAll}
            disabled={isSaving || completedCount === totalCount}
          >
            {isSaving ? 'Saving...' : 'Save All'}
          </button>
          <button
            className="btn btn-success"
            onClick={handleSubmitBid}
            disabled={completedCount < totalCount}
          >
            Submit Bid ({completedCount}/{totalCount})
          </button>
        </div>
      </div>
    </div>
  );
}
