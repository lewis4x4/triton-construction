import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import { LineItemDetail } from './LineItemDetail';
import { CostAdjustmentsPanel } from './CostAdjustmentsPanel';
import { VarianceAlert, VarianceBadge } from './VarianceAlert';
import * as XLSX from 'xlsx';
import './LineItemsTab.css';

// Helper for accessing tables not yet in TypeScript types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAny = supabase as any;

interface LineItemsTabProps {
  projectId: string;
}

// Pricing status types for validation framework
type PricingStatus = 'COMPLETE' | 'AI_SUGGESTED' | 'MANUAL_REQUIRED' | 'INCOMPLETE' | 'NEEDS_PRICING';

// Variance types matching database enums
type VarianceSignificance = 'MATCH' | 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
type VarianceDirection = 'OVER' | 'UNDER' | 'MATCH';
type UnbalanceDirection = 'SHORT' | 'LONG' | 'NEUTRAL';

// Use a simplified type that matches what we select from the database
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
  wvdoh_item_code: string | null; // Normalized WVDOH item code for matching
  pricing_status?: PricingStatus | null; // Will be populated once migration is applied
  // Pricing metadata from historical pricing system
  pricing_metadata?: {
    source?: string;
    confidence?: number;
    historical_count?: number;
    base_price_year?: number;
  } | null;
  // Quantity Intelligence fields (from migration 127)
  ebsx_quantity?: number | null;
  plan_quantity?: number | null;
  takeoff_quantity?: number | null;
  governing_source?: string | null;
  quantity_variance_pct?: number | null;
  variance_direction?: VarianceDirection | null;
  variance_significance?: VarianceSignificance | null;
  is_unbalanced?: boolean;
  unbalance_direction?: UnbalanceDirection | null;
  unbalance_justification?: string | null;
}

// Cost adjustment factor from AI document analysis
interface CostAdjustment {
  id: string;
  factor_type: string;
  percentage_modifier: number;
  condition_description: string;
  condition_category: string | null;
  source_document_id: string | null;
  ai_confidence_score: number | null;
  is_user_confirmed: boolean;
  // Joined from bid_documents
  source_document?: {
    file_name: string;
    document_type: string;
  } | null;
}

// Line item with aggregated adjustments
interface LineItemAdjustments {
  line_item_id: string;
  total_adjustment_pct: number;
  adjustment_count: number;
  labor_adjustment_pct: number;
  equipment_adjustment_pct: number;
  material_adjustment_pct: number;
  overall_adjustment_pct: number;
  calculated_unit_price: number | null;
  unconfirmed_count: number;
}

// Compute pricing status from existing fields (fallback until DB migration is applied)
function computePricingStatus(item: LineItem): PricingStatus {
  if (item.pricing_status) return item.pricing_status;

  // Calculate based on existing fields
  if (item.final_unit_price != null && item.pricing_reviewed === true) {
    return 'COMPLETE';
  }
  if (item.pricing_reviewed === true && item.final_unit_price == null) {
    return 'INCOMPLETE';
  }
  if (item.ai_suggested_unit_price != null) {
    return 'AI_SUGGESTED';
  }
  if (item.base_unit_cost != null) {
    return 'NEEDS_PRICING';
  }
  return 'NEEDS_PRICING';
}

// Pricing status display configuration
const PRICING_STATUS_CONFIG: Record<PricingStatus, { label: string; icon: string; className: string }> = {
  COMPLETE: { label: 'Complete', icon: '✅', className: 'status-complete' },
  AI_SUGGESTED: { label: 'AI Suggested', icon: '🤖', className: 'status-ai-suggested' },
  MANUAL_REQUIRED: { label: 'Manual Required', icon: '⚠️', className: 'status-manual-required' },
  INCOMPLETE: { label: 'Incomplete', icon: '⚡', className: 'status-incomplete' },
  NEEDS_PRICING: { label: 'Needs Pricing', icon: '🔴', className: 'status-needs-pricing' },
};

type SortField = 'line_number' | 'item_number' | 'quantity' | 'final_extended_price' | 'pricing_reviewed';
type SortDirection = 'asc' | 'desc';

// Work categories that match the database enum
const WORK_CATEGORIES = [
  { value: '', label: 'Select Category' },
  { value: 'MOBILIZATION', label: 'Mobilization' },
  { value: 'DEMOLITION', label: 'Demolition' },
  { value: 'EARTHWORK', label: 'Earthwork' },
  { value: 'DRAINAGE', label: 'Drainage' },
  { value: 'SUBSTRUCTURE', label: 'Substructure' },
  { value: 'SUPERSTRUCTURE', label: 'Superstructure' },
  { value: 'DECK', label: 'Deck' },
  { value: 'APPROACH_SLABS', label: 'Approach Slabs' },
  { value: 'PAVEMENT', label: 'Pavement' },
  { value: 'GUARDRAIL_BARRIER', label: 'Guardrail & Barrier' },
  { value: 'SIGNING_STRIPING', label: 'Signing & Striping' },
  { value: 'MOT', label: 'Maintenance of Traffic' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'LANDSCAPING', label: 'Landscaping' },
  { value: 'GENERAL_CONDITIONS', label: 'General Conditions' },
  { value: 'OTHER', label: 'Other' },
];

export function LineItemsTab({ projectId }: LineItemsTabProps) {
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<LineItem | null>(null);
  const [sortField, setSortField] = useState<SortField>('line_number');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterReviewed, setFilterReviewed] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Cost adjustment state
  const [costAdjustments, setCostAdjustments] = useState<CostAdjustment[]>([]);
  const [lineItemAdjustments, setLineItemAdjustments] = useState<Map<string, LineItemAdjustments>>(new Map());
  const [showAdjustmentsPanel, setShowAdjustmentsPanel] = useState(false);

  // Quantity intelligence state
  const [varianceAlertCollapsed, setVarianceAlertCollapsed] = useState(false);

  // Fetch cost adjustments for this project
  const fetchCostAdjustments = useCallback(async () => {
    try {
      // Fetch all cost adjustments for this project with source document info
      // Note: bid_cost_adjustment_factors table was added in migration 107
      const { data: adjustmentsData, error: adjustmentsError } = await supabaseAny
        .from('bid_cost_adjustment_factors')
        .select(`
          id, factor_type, percentage_modifier, condition_description, condition_category,
          source_document_id, ai_confidence_score, is_user_confirmed, affected_item_codes,
          affected_work_categories,
          source_document:bid_documents(file_name, document_type)
        `)
        .eq('bid_project_id', projectId)
        .order('created_at', { ascending: false });

      if (adjustmentsError) {
        console.warn('Could not fetch cost adjustments:', adjustmentsError);
        return;
      }

      // Type-safe transform for source_document which may come back as an array or single object
      const rawData = (adjustmentsData || []) as Array<Record<string, unknown>>;
      const transformedAdjustments = rawData.map((adj) => ({
        ...adj,
        source_document: Array.isArray(adj.source_document)
          ? adj.source_document[0] || null
          : adj.source_document || null,
      })) as CostAdjustment[];

      setCostAdjustments(transformedAdjustments);

      // Try to fetch aggregated adjustments per line item from the view
      // Note: v_line_item_adjustments view was added in migration 107
      const { data: lineAdjData } = await supabaseAny
        .from('v_line_item_adjustments')
        .select('*')
        .eq('bid_project_id', projectId);

      if (lineAdjData) {
        const adjustmentsMap = new Map<string, LineItemAdjustments>();
        const rawLineData = lineAdjData as Array<Record<string, unknown>>;
        for (const row of rawLineData) {
          adjustmentsMap.set(row.line_item_id as string, {
            line_item_id: row.line_item_id as string,
            total_adjustment_pct: (row.total_adjustment_pct as number) || 0,
            adjustment_count: (row.adjustment_count as number) || 0,
            labor_adjustment_pct: (row.labor_adjustment_pct as number) || 0,
            equipment_adjustment_pct: (row.equipment_adjustment_pct as number) || 0,
            material_adjustment_pct: (row.material_adjustment_pct as number) || 0,
            overall_adjustment_pct: (row.overall_adjustment_pct as number) || 0,
            calculated_unit_price: row.calculated_unit_price as number | null,
            unconfirmed_count: (row.unconfirmed_count as number) || 0,
          });
        }
        setLineItemAdjustments(adjustmentsMap);
      }
    } catch (err) {
      console.warn('Error fetching cost adjustments:', err);
    }
  }, [projectId]);

  const fetchLineItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Note: wvdoh_item_code column was added in migration 107 - types may not include it yet
      // Quantity intelligence fields added in migration 127
      // Using supabaseAny to handle columns not yet in TypeScript types
      let query = supabaseAny
        .from('bid_line_items')
        .select('id, line_number, item_number, alt_item_number, description, short_description, quantity, unit, work_category, risk_level, estimation_method, base_unit_cost, ai_suggested_unit_price, final_unit_price, final_extended_price, pricing_reviewed, estimator_notes, created_at, wvdoh_item_code, ebsx_quantity, plan_quantity, takeoff_quantity, governing_source, quantity_variance_pct, variance_direction, variance_significance, is_unbalanced, unbalance_direction, unbalance_justification')
        .eq('bid_project_id', projectId);

      // Apply filters
      if (filterCategory) {
        query = query.eq('work_category', filterCategory);
      }
      // Note: pricing_status filter will be applied client-side until migration is applied

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Apply search filter and pricing status filter client-side
      let filteredData = (data || []) as LineItem[];

      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filteredData = filteredData.filter(
          (item) =>
            item.item_number.toLowerCase().includes(search) ||
            item.description.toLowerCase().includes(search)
        );
      }

      // Pricing status filter (client-side until migration is applied)
      if (filterReviewed) {
        filteredData = filteredData.filter((item) => {
          const status = computePricingStatus(item);
          switch (filterReviewed) {
            case 'complete':
              return status === 'COMPLETE';
            case 'needs-attention':
              return status !== 'COMPLETE';
            case 'ai-suggested':
              return status === 'AI_SUGGESTED';
            case 'needs-pricing':
              return status === 'NEEDS_PRICING' || status === 'MANUAL_REQUIRED';
            default:
              return true;
          }
        });
      }

      setLineItems(filteredData);
    } catch (err) {
      console.error('Error fetching line items:', err);
      setError('Failed to load line items');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, sortField, sortDirection, filterCategory, filterReviewed, searchQuery]);

  useEffect(() => {
    fetchLineItems();
    fetchCostAdjustments();
  }, [fetchLineItems, fetchCostAdjustments]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === lineItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(lineItems.map((item) => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkCategoryUpdate = async (category: string) => {
    if (selectedItems.size === 0) return;

    try {
      // Cast to unknown to bypass strict enum type checking
      const { error: updateError } = await supabase
        .from('bid_line_items')
        .update({ work_category: (category || null) as unknown as null })
        .in('id', Array.from(selectedItems));

      if (updateError) throw updateError;

      setSelectedItems(new Set());
      fetchLineItems();
    } catch (err) {
      console.error('Bulk update error:', err);
      alert('Failed to update categories');
    }
  };

  const handleItemUpdate = async (updatedItem: Partial<LineItem> & { id: string }) => {
    try {
      // Build update object with proper type handling for enum fields
      const updateData = {
        work_category: updatedItem.work_category ?? null,
        risk_level: updatedItem.risk_level ?? null,
        estimation_method: updatedItem.estimation_method ?? null,
        base_unit_cost: updatedItem.base_unit_cost,
        final_unit_price: updatedItem.final_unit_price,
        final_extended_price: updatedItem.final_extended_price,
        estimator_notes: updatedItem.estimator_notes,
        pricing_reviewed: updatedItem.pricing_reviewed,
      };

      const { error: updateError } = await supabase
        .from('bid_line_items')
        .update(updateData as unknown as Record<string, unknown>)
        .eq('id', updatedItem.id);

      if (updateError) throw updateError;

      fetchLineItems();
      setSelectedItem(null);
    } catch (err) {
      console.error('Update error:', err);
      throw err;
    }
  };

  // Handler for marking items as unbalanced (Quantity Intelligence)
  const handleMarkUnbalanced = async (itemId: string, direction: 'SHORT' | 'LONG', justification: string) => {
    try {
      // Call the set_item_unbalanced RPC function from migration 127
      const { error } = await supabaseAny.rpc('set_item_unbalanced', {
        p_line_item_id: itemId,
        p_direction: direction,
        p_justification: justification,
        p_confidence: 80.00,
      });

      if (error) {
        console.error('Error marking item as unbalanced:', error);
        alert(`Failed to mark item as unbalanced: ${error.message}`);
        return;
      }

      // Refresh the line items to show updated status
      fetchLineItems();
    } catch (err) {
      console.error('Error in handleMarkUnbalanced:', err);
      alert('Failed to mark item as unbalanced');
    }
  };

  // Export selected line items to Excel
  const handleExportToExcel = () => {
    // Get the items to export (selected or all if none selected)
    const itemsToExport = selectedItems.size > 0
      ? lineItems.filter(item => selectedItems.has(item.id))
      : lineItems;

    if (itemsToExport.length === 0) {
      alert('No items to export');
      return;
    }

    // Prepare data for Excel export
    const exportData = itemsToExport.map(item => {
      const unitPrice = item.final_unit_price ?? item.ai_suggested_unit_price ?? 0;
      const extendedPrice = item.final_extended_price ?? (unitPrice * item.quantity);

      return {
        'Line #': item.line_number,
        'Item Number': item.item_number,
        'Alt Item Number': item.alt_item_number || '',
        'Description': item.description,
        'Quantity': item.quantity,
        'Unit': item.unit,
        'Category': item.work_category || '',
        'Plan Qty': item.plan_quantity ?? '',
        'Takeoff Qty': item.takeoff_quantity ?? '',
        'Variance %': item.quantity_variance_pct ? `${item.quantity_variance_pct.toFixed(1)}%` : '',
        'Unit Price': unitPrice,
        'Extended Price': extendedPrice,
        'Pricing Status': computePricingStatus(item),
        'Is Unbalanced': item.is_unbalanced ? 'Yes' : 'No',
        'Notes': item.estimator_notes || '',
      };
    });

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 8 },   // Line #
      { wch: 15 },  // Item Number
      { wch: 15 },  // Alt Item Number
      { wch: 40 },  // Description
      { wch: 12 },  // Quantity
      { wch: 8 },   // Unit
      { wch: 15 },  // Category
      { wch: 12 },  // Plan Qty
      { wch: 12 },  // Takeoff Qty
      { wch: 10 },  // Variance %
      { wch: 12 },  // Unit Price
      { wch: 15 },  // Extended Price
      { wch: 15 },  // Pricing Status
      { wch: 12 },  // Is Unbalanced
      { wch: 30 },  // Notes
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Line Items');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `bid_line_items_${timestamp}.xlsx`;

    // Download the file
    XLSX.writeFile(wb, filename);
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

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕️';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  // Calculate totals and pricing status counts
  const totalExtended = lineItems.reduce(
    (sum, item) => sum + (item.final_extended_price || 0),
    0
  );

  // Count items by pricing status
  const statusCounts = lineItems.reduce((counts, item) => {
    const status = computePricingStatus(item);
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {} as Record<PricingStatus, number>);

  const completeCount = statusCounts.COMPLETE || 0;
  const needsAttentionCount = lineItems.length - completeCount;
  const completionPercentage = lineItems.length > 0
    ? Math.round((completeCount / lineItems.length) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="line-items-tab">
        <div className="loading-inline">
          <div className="loading-spinner small" />
          <span>Loading line items...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="line-items-tab">
        <div className="error-message">{error}</div>
        <button onClick={fetchLineItems} className="btn btn-secondary">
          Retry
        </button>
      </div>
    );
  }

  // Prepare variance items for the alert panel
  const varianceItems = lineItems
    .filter((item) => item.variance_significance && ['MODERATE', 'MAJOR', 'CRITICAL'].includes(item.variance_significance))
    .map((item) => ({
      id: item.id,
      line_number: item.line_number,
      item_number: item.item_number,
      description: item.description,
      unit: item.unit,
      ebsx_quantity: item.ebsx_quantity ?? null,
      plan_quantity: item.plan_quantity ?? null,
      takeoff_quantity: item.takeoff_quantity ?? null,
      quantity_variance_pct: item.quantity_variance_pct ?? null,
      variance_direction: item.variance_direction ?? null,
      variance_significance: item.variance_significance ?? null,
      unit_price: item.final_unit_price ?? item.ai_suggested_unit_price ?? null,
      bid_amount: item.final_extended_price ?? null,
      is_unbalanced: item.is_unbalanced ?? false,
      unbalance_direction: item.unbalance_direction ?? null,
      unbalance_justification: item.unbalance_justification ?? null,
      priority_score: 0, // Will be calculated in the component
    }));

  return (
    <div className="line-items-tab">
      {/* Variance Alert Panel */}
      {varianceItems.length > 0 && (
        <VarianceAlert
          items={varianceItems}
          onItemSelect={(item) => {
            const lineItem = lineItems.find((li) => li.id === item.id);
            if (lineItem) setSelectedItem(lineItem);
          }}
          onMarkUnbalanced={handleMarkUnbalanced}
          isCollapsed={varianceAlertCollapsed}
          onToggleCollapse={() => setVarianceAlertCollapsed(!varianceAlertCollapsed)}
        />
      )}

      {/* Summary Bar */}
      <div className="line-items-summary">
        <div className="summary-stat">
          <span className="stat-value">{lineItems.length}</span>
          <span className="stat-label">Total Items</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value" style={{ color: completionPercentage === 100 ? '#10b981' : '#f59e0b' }}>
            {completeCount}/{lineItems.length} ({completionPercentage}%)
          </span>
          <span className="stat-label">Complete</span>
        </div>
        {needsAttentionCount > 0 && (
          <div className="summary-stat summary-stat-warning">
            <span className="stat-value" style={{ color: '#ef4444' }}>
              {needsAttentionCount}
            </span>
            <span className="stat-label">Needs Attention</span>
          </div>
        )}
        <div className="summary-stat">
          <span className="stat-value">{formatCurrency(totalExtended)}</span>
          <span className="stat-label">Total Value</span>
        </div>
        {/* Cost Adjustments Summary */}
        {costAdjustments.length > 0 && (
          <div
            className="summary-stat summary-stat-adjustments"
            onClick={() => setShowAdjustmentsPanel(!showAdjustmentsPanel)}
            style={{ cursor: 'pointer' }}
            title="Click to view/manage cost adjustments"
          >
            <span className="stat-value" style={{ color: '#8b5cf6' }}>
              {costAdjustments.length}
              {costAdjustments.filter(a => !a.is_user_confirmed).length > 0 && (
                <span style={{ fontSize: '0.7em', marginLeft: 4, color: '#f59e0b' }}>
                  ({costAdjustments.filter(a => !a.is_user_confirmed).length} pending)
                </span>
              )}
            </span>
            <span className="stat-label">Cost Adjustments</span>
          </div>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="line-items-toolbar">
        <div className="toolbar-left">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="">All Categories</option>
            {WORK_CATEGORIES.slice(1).map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          <select
            value={filterReviewed}
            onChange={(e) => setFilterReviewed(e.target.value)}
            className="filter-select"
          >
            <option value="">All Items</option>
            <option value="complete">Complete</option>
            <option value="needs-attention">Needs Attention</option>
            <option value="ai-suggested">AI Suggested</option>
            <option value="needs-pricing">Missing Pricing</option>
          </select>
        </div>

        <div className="toolbar-right">
          {selectedItems.size > 0 && (
            <div className="bulk-actions">
              <span className="selected-count">{selectedItems.size} selected</span>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleBulkCategoryUpdate(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="filter-select"
              >
                <option value="">Set Category...</option>
                {WORK_CATEGORIES.slice(1).map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleExportToExcel}
                className="btn btn-secondary"
                title="Export selected items to Excel"
              >
                📥 Export
              </button>
            </div>
          )}

          <button
            onClick={handleExportToExcel}
            className="btn btn-icon"
            title={selectedItems.size > 0 ? `Export ${selectedItems.size} selected items to Excel` : 'Export all items to Excel'}
          >
            📥
          </button>
          <button onClick={fetchLineItems} className="btn btn-icon" title="Refresh">
            🔄
          </button>
        </div>
      </div>

      {/* Line Items Table */}
      {lineItems.length === 0 ? (
        <div className="empty-state-inline">
          <span className="empty-icon">📋</span>
          <p>No line items found</p>
          <p className="placeholder-hint">
            Upload a Bidx file in the Documents tab to import line items
          </p>
        </div>
      ) : (
        <div className="line-items-table-container">
          <table className="line-items-table">
            <thead>
              <tr>
                <th className="checkbox-col">
                  <input
                    type="checkbox"
                    checked={selectedItems.size === lineItems.length && lineItems.length > 0}
                    onChange={handleSelectAll}
                  />
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('line_number')}
                >
                  # {getSortIcon('line_number')}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleSort('item_number')}
                >
                  Item {getSortIcon('item_number')}
                </th>
                <th>Description</th>
                <th
                  className="sortable numeric"
                  onClick={() => handleSort('quantity')}
                >
                  Qty {getSortIcon('quantity')}
                </th>
                <th>Unit</th>
                <th>Category</th>
                <th className="numeric" title="Plan Quantity">Plan Qty</th>
                <th className="numeric" title="Contractor Takeoff Quantity">Takeoff</th>
                <th className="center" title="Quantity Variance (Takeoff vs Plan)">Var%</th>
                <th className="numeric">Unit Price</th>
                <th className="center" title="Cost Adjustments from AI document analysis">
                  Adj
                </th>
                <th
                  className="sortable numeric"
                  onClick={() => handleSort('final_extended_price')}
                >
                  Extended {getSortIcon('final_extended_price')}
                </th>
                <th
                  className="sortable center"
                  onClick={() => handleSort('pricing_reviewed')}
                >
                  Status {getSortIcon('pricing_reviewed')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item) => {
                const status = computePricingStatus(item);
                const statusConfig = PRICING_STATUS_CONFIG[status];
                const hasPrice = item.final_unit_price != null || item.ai_suggested_unit_price != null;

                return (
                  <tr
                    key={item.id}
                    className={`${selectedItems.has(item.id) ? 'selected' : ''} ${statusConfig.className}`}
                  >
                    <td className="checkbox-col">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                      />
                    </td>
                    <td>{item.line_number ?? '-'}</td>
                    <td className="item-number">{item.item_number}</td>
                    <td className="description-cell">
                      <span className="description" title={item.description}>
                        {item.description}
                      </span>
                    </td>
                    <td className="numeric">{formatNumber(item.quantity)}</td>
                    <td>{item.unit}</td>
                    <td>
                      {item.work_category ? (
                        <span className="category-badge">
                          {WORK_CATEGORIES.find((c) => c.value === item.work_category)?.label ||
                            item.work_category}
                        </span>
                      ) : (
                        <span className="no-category">-</span>
                      )}
                    </td>
                    {/* Plan Quantity */}
                    <td className="numeric">
                      {item.plan_quantity != null ? (
                        <span style={{ color: '#374151' }}>{formatNumber(item.plan_quantity)}</span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    {/* Takeoff Quantity */}
                    <td className="numeric">
                      {item.takeoff_quantity != null ? (
                        <span style={{ color: '#2563eb', fontWeight: 500 }}>{formatNumber(item.takeoff_quantity)}</span>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>-</span>
                      )}
                    </td>
                    {/* Variance Badge */}
                    <td className="center">
                      {item.is_unbalanced ? (
                        <span
                          className="unbalanced-badge"
                          style={{
                            display: 'inline-block',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            backgroundColor: item.unbalance_direction === 'SHORT' ? '#fee2e2' : '#d1fae5',
                            color: item.unbalance_direction === 'SHORT' ? '#dc2626' : '#059669',
                            border: `1px solid ${item.unbalance_direction === 'SHORT' ? '#ef4444' : '#10b981'}`,
                          }}
                          title={item.unbalance_justification || 'Marked as unbalanced'}
                        >
                          {item.unbalance_direction}
                        </span>
                      ) : (
                        <VarianceBadge
                          variancePct={item.quantity_variance_pct ?? null}
                          significance={item.variance_significance ?? null}
                          direction={item.variance_direction ?? null}
                          compact
                        />
                      )}
                    </td>
                    <td className="numeric">
                      {hasPrice ? (
                        formatCurrency(
                          item.final_unit_price || item.ai_suggested_unit_price || item.base_unit_cost
                        )
                      ) : (
                        <span style={{ color: '#ef4444', fontWeight: 500 }}>No Price</span>
                      )}
                    </td>
                    {/* Cost Adjustment Indicator */}
                    <td className="center">
                      {(() => {
                        const adj = lineItemAdjustments.get(item.id);
                        if (!adj || adj.adjustment_count === 0) {
                          return <span style={{ color: '#9ca3af' }}>-</span>;
                        }
                        const hasUnconfirmed = adj.unconfirmed_count > 0;
                        const totalPct = adj.total_adjustment_pct;
                        const sign = totalPct > 0 ? '+' : '';
                        return (
                          <span
                            className={`adjustment-badge ${hasUnconfirmed ? 'unconfirmed' : 'confirmed'}`}
                            title={`Labor: ${adj.labor_adjustment_pct > 0 ? '+' : ''}${adj.labor_adjustment_pct}%\nEquipment: ${adj.equipment_adjustment_pct > 0 ? '+' : ''}${adj.equipment_adjustment_pct}%\nMaterial: ${adj.material_adjustment_pct > 0 ? '+' : ''}${adj.material_adjustment_pct}%\nOverall: ${adj.overall_adjustment_pct > 0 ? '+' : ''}${adj.overall_adjustment_pct}%\n${hasUnconfirmed ? '⚠️ ' + adj.unconfirmed_count + ' unconfirmed' : '✓ All confirmed'}`}
                            style={{
                              display: 'inline-block',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: hasUnconfirmed ? '#fef3c7' : '#d1fae5',
                              color: hasUnconfirmed ? '#92400e' : '#065f46',
                              border: `1px solid ${hasUnconfirmed ? '#f59e0b' : '#10b981'}`,
                              cursor: 'help',
                            }}
                          >
                            {sign}{totalPct.toFixed(0)}%
                          </span>
                        );
                      })()}
                    </td>
                    <td className="numeric">
                      {item.final_extended_price ? (
                        formatCurrency(item.final_extended_price)
                      ) : (
                        <span style={{ color: '#ef4444' }}>-</span>
                      )}
                    </td>
                    <td className="center">
                      <span
                        className={`status-badge ${statusConfig.className}`}
                        title={statusConfig.label}
                      >
                        {statusConfig.icon}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-icon"
                        onClick={() => setSelectedItem(item)}
                        title="Edit"
                      >
                        ✏️
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={12} className="totals-label">
                  Total ({lineItems.length} items)
                </td>
                <td className="numeric totals-value">
                  {formatCurrency(totalExtended)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <LineItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={handleItemUpdate}
          categories={WORK_CATEGORIES}
        />
      )}

      {/* Cost Adjustments Panel */}
      <CostAdjustmentsPanel
        projectId={projectId}
        isOpen={showAdjustmentsPanel}
        onClose={() => setShowAdjustmentsPanel(false)}
        onAdjustmentsChange={() => {
          fetchCostAdjustments();
          fetchLineItems();
        }}
      />
    </div>
  );
}
