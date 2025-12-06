import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import { LineItemDetail } from './LineItemDetail';

interface LineItemsTabProps {
  projectId: string;
}

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
}

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

  const fetchLineItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('bid_line_items')
        .select('id, line_number, item_number, alt_item_number, description, short_description, quantity, unit, work_category, risk_level, estimation_method, base_unit_cost, ai_suggested_unit_price, final_unit_price, final_extended_price, pricing_reviewed, estimator_notes, created_at')
        .eq('bid_project_id', projectId);

      // Apply filters - use type assertion to bypass strict enum type checking
      if (filterCategory) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query = query.eq('work_category', filterCategory as any);
      }
      if (filterReviewed === 'reviewed') {
        query = query.eq('pricing_reviewed', true);
      } else if (filterReviewed === 'unreviewed') {
        query = query.eq('pricing_reviewed', false);
      }

      // Apply sorting
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Apply search filter client-side and map to our interface
      let filteredData = (data || []) as LineItem[];
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        filteredData = filteredData.filter(
          (item) =>
            item.item_number.toLowerCase().includes(search) ||
            item.description.toLowerCase().includes(search)
        );
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
  }, [fetchLineItems]);

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

  // Calculate totals
  const totalExtended = lineItems.reduce(
    (sum, item) => sum + (item.final_extended_price || 0),
    0
  );
  const reviewedCount = lineItems.filter((item) => item.pricing_reviewed).length;

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

  return (
    <div className="line-items-tab">
      {/* Summary Bar */}
      <div className="line-items-summary">
        <div className="summary-stat">
          <span className="stat-value">{lineItems.length}</span>
          <span className="stat-label">Total Items</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">
            {reviewedCount}/{lineItems.length}
          </span>
          <span className="stat-label">Reviewed</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{formatCurrency(totalExtended)}</span>
          <span className="stat-label">Total Value</span>
        </div>
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
            <option value="reviewed">Reviewed</option>
            <option value="unreviewed">Needs Review</option>
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
            </div>
          )}

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
                <th className="numeric">Unit Price</th>
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
              {lineItems.map((item) => (
                <tr
                  key={item.id}
                  className={selectedItems.has(item.id) ? 'selected' : ''}
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
                  <td className="numeric">
                    {formatCurrency(
                      item.final_unit_price || item.ai_suggested_unit_price || item.base_unit_cost
                    )}
                  </td>
                  <td className="numeric">
                    {formatCurrency(item.final_extended_price)}
                  </td>
                  <td className="center">
                    {item.pricing_reviewed ? (
                      <span className="status-badge status-completed">✓</span>
                    ) : (
                      <span className="status-badge status-pending">○</span>
                    )}
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
              ))}
            </tbody>
            <tfoot>
              <tr className="totals-row">
                <td colSpan={8} className="totals-label">
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
    </div>
  );
}
