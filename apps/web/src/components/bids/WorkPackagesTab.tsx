import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@triton/supabase-client';
import './WorkPackagesTab.css';

interface WorkPackagesTabProps {
  projectId: string;
}

interface WorkPackage {
  id: string;
  package_number: number;
  package_name: string;
  package_code: string | null;
  description: string | null;
  work_category: string | null;
  status: string | null;
  total_items: number | null;
  ai_generated: boolean | null;
  is_locked: boolean | null;
  assigned_estimator_id: string | null;
  estimated_value: number | null;
  notes: string | null;
  sort_order: number | null;
  created_at: string | null;
}

interface WorkPackageItem {
  id: string; // bid_work_package_items.id
  line_item_id: string;
  item_number: string;
  description: string;
  quantity: number;
  unit: string;
  final_extended_price: number | null;
}

interface UnassignedItem {
  id: string;
  item_number: string;
  description: string;
  quantity: number;
  unit: string;
  work_category: string | null;
}

type StatusFilter = 'all' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'REVIEWED';

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

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'REVIEWED', label: 'Reviewed' },
];

export function WorkPackagesTab({ projectId }: WorkPackagesTabProps) {
  const [packages, setPackages] = useState<WorkPackage[]>([]);
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const [packageItems, setPackageItems] = useState<Record<string, WorkPackageItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Selection state for moving items
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sourcePackageId, setSourcePackageId] = useState<string | null>(null);

  // Move items modal
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetPackageId, setTargetPackageId] = useState<string>('');
  const [isMoving, setIsMoving] = useState(false);

  // New/Edit package modal
  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<WorkPackage | null>(null);
  const [packageForm, setPackageForm] = useState({
    package_name: '',
    package_code: '',
    description: '',
    work_category: '',
    status: 'PENDING',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Add unassigned items modal
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [unassignedItems, setUnassignedItems] = useState<UnassignedItem[]>([]);
  const [selectedUnassigned, setSelectedUnassigned] = useState<Set<string>>(new Set());
  const [addToPackageId, setAddToPackageId] = useState<string>('');
  const [isAddingItems, setIsAddingItems] = useState(false);

  // Action state
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchPackages = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('bid_work_packages')
        .select('*')
        .eq('bid_project_id', projectId)
        .order('sort_order', { ascending: true });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setPackages(data || []);
    } catch (err) {
      console.error('Error fetching work packages:', err);
      setError('Failed to load work packages');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, statusFilter]);

  const fetchPackageItems = useCallback(
    async (packageId: string, forceRefresh = false) => {
      if (packageItems[packageId] && !forceRefresh) return;

      try {
        const { data, error } = await supabase
          .from('bid_work_package_items')
          .select(
            `
            id,
            line_item_id,
            bid_line_items (
              id,
              item_number,
              description,
              quantity,
              unit,
              final_extended_price
            )
          `
          )
          .eq('work_package_id', packageId)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        const items =
          data?.map((item: { id: string; line_item_id: string; bid_line_items: Omit<WorkPackageItem, 'id' | 'line_item_id'> }) => ({
            id: item.id,
            line_item_id: item.line_item_id,
            ...item.bid_line_items,
          })).filter(Boolean) || [];

        setPackageItems((prev) => ({ ...prev, [packageId]: items }));
      } catch (err) {
        console.error('Error fetching package items:', err);
      }
    },
    [packageItems]
  );

  const fetchUnassignedItems = useCallback(async () => {
    try {
      // Get line items not in any work package
      const { data: assignedIds } = await supabase
        .from('bid_work_package_items')
        .select('line_item_id')
        .eq('work_package_id', packages.map(p => p.id));

      const assignedSet = new Set((assignedIds || []).map(a => a.line_item_id));

      const { data, error } = await supabase
        .from('bid_line_items')
        .select('id, item_number, description, quantity, unit, work_category')
        .eq('bid_project_id', projectId)
        .order('line_number', { ascending: true });

      if (error) throw error;

      const unassigned = (data || []).filter(item => !assignedSet.has(item.id));
      setUnassignedItems(unassigned as UnassignedItem[]);
    } catch (err) {
      console.error('Error fetching unassigned items:', err);
    }
  }, [projectId, packages]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const togglePackage = (packageId: string) => {
    if (expandedPackage === packageId) {
      setExpandedPackage(null);
      // Clear selection when collapsing
      setSelectedItems(new Set());
      setSourcePackageId(null);
    } else {
      setExpandedPackage(packageId);
      fetchPackageItems(packageId);
      // Clear selection when switching packages
      setSelectedItems(new Set());
      setSourcePackageId(packageId);
    }
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAllItems = (packageId: string) => {
    const items = packageItems[packageId] || [];
    if (selectedItems.size === items.length && items.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const openMoveModal = () => {
    if (selectedItems.size === 0) return;
    setShowMoveModal(true);
    setTargetPackageId('');
  };

  const handleMoveItems = async () => {
    if (!targetPackageId || selectedItems.size === 0 || !sourcePackageId) return;

    setIsMoving(true);

    try {
      // Update work_package_id for selected items
      const { error: updateError } = await supabase
        .from('bid_work_package_items')
        .update({ work_package_id: targetPackageId })
        .in('id', Array.from(selectedItems));

      if (updateError) throw updateError;

      // Refresh both packages
      await fetchPackageItems(sourcePackageId, true);
      await fetchPackageItems(targetPackageId, true);
      await fetchPackages();

      setShowMoveModal(false);
      setSelectedItems(new Set());
      setTargetPackageId('');
    } catch (err) {
      console.error('Error moving items:', err);
      setError('Failed to move items');
    } finally {
      setIsMoving(false);
    }
  };

  const openNewPackageModal = () => {
    setEditingPackage(null);
    setPackageForm({
      package_name: '',
      package_code: '',
      description: '',
      work_category: '',
      status: 'PENDING',
      notes: '',
    });
    setSaveError(null);
    setShowPackageModal(true);
  };

  const openEditPackageModal = (pkg: WorkPackage) => {
    setEditingPackage(pkg);
    setPackageForm({
      package_name: pkg.package_name,
      package_code: pkg.package_code || '',
      description: pkg.description || '',
      work_category: pkg.work_category || '',
      status: pkg.status || 'PENDING',
      notes: pkg.notes || '',
    });
    setSaveError(null);
    setShowPackageModal(true);
  };

  const handleSavePackage = async () => {
    if (!packageForm.package_name.trim()) {
      setSaveError('Package name is required');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      if (editingPackage) {
        // Update existing package
        const { error: updateError } = await supabase
          .from('bid_work_packages')
          .update({
            package_name: packageForm.package_name.trim(),
            package_code: packageForm.package_code.trim() || null,
            description: packageForm.description.trim() || null,
            work_category: packageForm.work_category || null,
            status: packageForm.status,
            notes: packageForm.notes.trim() || null,
            is_ai_generated: false,
          })
          .eq('id', editingPackage.id);

        if (updateError) throw updateError;
      } else {
        // Create new package
        const maxPackageNumber = packages.reduce((max, p) => Math.max(max, p.package_number || 0), 0);
        const maxSortOrder = packages.reduce((max, p) => Math.max(max, p.sort_order || 0), 0);

        const { error: insertError } = await supabase
          .from('bid_work_packages')
          .insert({
            bid_project_id: projectId,
            package_number: maxPackageNumber + 1,
            package_name: packageForm.package_name.trim(),
            package_code: packageForm.package_code.trim() || null,
            description: packageForm.description.trim() || null,
            work_category: packageForm.work_category || null,
            status: packageForm.status,
            notes: packageForm.notes.trim() || null,
            is_ai_generated: false,
            sort_order: maxSortOrder + 1,
          });

        if (insertError) throw insertError;
      }

      setShowPackageModal(false);
      await fetchPackages();
    } catch (err) {
      console.error('Error saving package:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save package');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePackage = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this package? Items will become unassigned.')) return;

    setActionInProgress(packageId);

    try {
      // First delete work package items
      await supabase
        .from('bid_work_package_items')
        .delete()
        .eq('work_package_id', packageId);

      // Then delete the package
      const { error: deleteError } = await supabase
        .from('bid_work_packages')
        .delete()
        .eq('id', packageId);

      if (deleteError) throw deleteError;

      await fetchPackages();
      if (expandedPackage === packageId) {
        setExpandedPackage(null);
      }
    } catch (err) {
      console.error('Error deleting package:', err);
      setError('Failed to delete package');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleLockPackage = async (packageId: string, lock: boolean) => {
    setActionInProgress(packageId);

    try {
      const { error: updateError } = await supabase
        .from('bid_work_packages')
        .update({
          is_locked: lock,
          locked_at: lock ? new Date().toISOString() : null,
        })
        .eq('id', packageId);

      if (updateError) throw updateError;
      await fetchPackages();
    } catch (err) {
      console.error('Error updating lock status:', err);
      setError('Failed to update lock status');
    } finally {
      setActionInProgress(null);
    }
  };

  const openAddItemsModal = (packageId: string) => {
    setAddToPackageId(packageId);
    setSelectedUnassigned(new Set());
    fetchUnassignedItems();
    setShowAddItemsModal(true);
  };

  const handleAddItemsToPackage = async () => {
    if (selectedUnassigned.size === 0 || !addToPackageId) return;

    setIsAddingItems(true);

    try {
      const itemsToAdd = Array.from(selectedUnassigned).map((lineItemId, index) => ({
        work_package_id: addToPackageId,
        line_item_id: lineItemId,
        sort_order: index + 1,
      }));

      const { error: insertError } = await supabase
        .from('bid_work_package_items')
        .insert(itemsToAdd);

      if (insertError) throw insertError;

      await fetchPackageItems(addToPackageId, true);
      await fetchPackages();
      setShowAddItemsModal(false);
      setSelectedUnassigned(new Set());
    } catch (err) {
      console.error('Error adding items:', err);
      setError('Failed to add items to package');
    } finally {
      setIsAddingItems(false);
    }
  };

  const handleRemoveItem = async (itemId: string, packageId: string) => {
    setActionInProgress(itemId);

    try {
      const { error: deleteError } = await supabase
        .from('bid_work_package_items')
        .delete()
        .eq('id', itemId);

      if (deleteError) throw deleteError;

      await fetchPackageItems(packageId, true);
      await fetchPackages();
    } catch (err) {
      console.error('Error removing item:', err);
      setError('Failed to remove item');
    } finally {
      setActionInProgress(null);
    }
  };

  const getStatusClass = (status: string | null) => {
    switch (status) {
      case 'PENDING':
        return 'status-pending';
      case 'IN_PROGRESS':
        return 'status-progress';
      case 'COMPLETE':
        return 'status-complete';
      case 'REVIEWED':
        return 'status-reviewed';
      default:
        return '';
    }
  };

  const getDisplayStatus = (status: string | null) => {
    return (status || 'PENDING').replace(/_/g, ' ');
  };

  const getCategoryIcon = (category: string | null) => {
    switch (category) {
      case 'MOBILIZATION':
        return '🚚';
      case 'DEMOLITION':
        return '💥';
      case 'EARTHWORK':
        return '🏗️';
      case 'DRAINAGE':
        return '💧';
      case 'SUBSTRUCTURE':
        return '🏛️';
      case 'SUPERSTRUCTURE':
        return '🌉';
      case 'DECK':
        return '🛤️';
      case 'PAVEMENT':
        return '🛣️';
      case 'MOT':
        return '🚧';
      case 'UTILITIES':
        return '⚡';
      case 'ENVIRONMENTAL':
        return '🌿';
      default:
        return '📦';
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleGenerate = async (regenerate = false, useAi = true) => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-work-packages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            bid_project_id: projectId,
            regenerate,
            use_ai_grouping: useAi,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate work packages');
      }

      await fetchPackages();
      setExpandedPackage(null);
      setPackageItems({});
    } catch (err) {
      console.error('Error generating work packages:', err);
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate work packages');
    } finally {
      setIsGenerating(false);
    }
  };

  const stats = {
    total: packages.length,
    pending: packages.filter((p) => p.status === 'PENDING').length,
    inProgress: packages.filter((p) => p.status === 'IN_PROGRESS').length,
    complete: packages.filter((p) => p.status === 'COMPLETE' || p.status === 'REVIEWED').length,
    totalItems: packages.reduce((sum, p) => sum + (p.total_items || 0), 0),
  };

  if (isLoading) {
    return (
      <div className="packages-loading">
        <div className="loading-spinner" />
        <span>Loading work packages...</span>
      </div>
    );
  }

  return (
    <div className="packages-tab">
      {/* Header with Stats */}
      <div className="packages-header">
        <div className="packages-stats">
          <div className="stat-item">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Packages</span>
          </div>
          <div className="stat-item pending">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat-item progress">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">In Progress</span>
          </div>
          <div className="stat-item complete">
            <span className="stat-value">{stats.complete}</span>
            <span className="stat-label">Complete</span>
          </div>
          <div className="stat-item items">
            <span className="stat-value">{stats.totalItems}</span>
            <span className="stat-label">Total Items</span>
          </div>
        </div>
        <div className="packages-actions">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETE">Complete</option>
            <option value="REVIEWED">Reviewed</option>
          </select>
          <button
            className="btn btn-secondary btn-sm"
            onClick={openNewPackageModal}
          >
            + New Package
          </button>
          {packages.length > 0 && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleGenerate(true, true)}
              disabled={isGenerating}
            >
              {isGenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {generateError && <div className="error-message">{generateError}</div>}

      {/* Selection Actions Bar */}
      {selectedItems.size > 0 && sourcePackageId && (
        <div className="selection-bar">
          <div className="selection-info">
            <span className="selected-count">{selectedItems.size} items selected</span>
            <button
              className="clear-selection-btn"
              onClick={() => setSelectedItems(new Set())}
            >
              Clear
            </button>
          </div>
          <div className="selection-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={openMoveModal}
            >
              Move to Package
            </button>
          </div>
        </div>
      )}

      {packages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h4>No Work Packages</h4>
          <p>
            Generate work packages from categorized line items using AI-powered grouping,
            or create packages manually.
          </p>
          <div className="empty-actions">
            <button
              className="btn btn-primary"
              onClick={() => handleGenerate(false, true)}
              disabled={isGenerating}
            >
              {isGenerating ? 'Generating...' : 'Generate with AI'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={openNewPackageModal}
            >
              Create Manually
            </button>
          </div>
        </div>
      ) : (
        <div className="packages-list">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`package-card ${expandedPackage === pkg.id ? 'expanded' : ''} ${pkg.is_locked ? 'locked' : ''}`}
            >
              <div className="package-card-header" onClick={() => togglePackage(pkg.id)}>
                <div className="package-info">
                  <span className="package-icon">{getCategoryIcon(pkg.work_category)}</span>
                  <div className="package-details">
                    <div className="package-name">
                      {pkg.package_code && <span className="package-code">{pkg.package_code}</span>}
                      {pkg.package_name}
                      {pkg.is_locked && <span className="lock-icon" title="Locked">🔒</span>}
                    </div>
                    {pkg.description && (
                      <div className="package-description">{pkg.description}</div>
                    )}
                  </div>
                </div>

                <div className="package-meta">
                  <span className="items-count">{pkg.total_items || 0} items</span>
                  {pkg.estimated_value && (
                    <span className="package-value">{formatCurrency(pkg.estimated_value)}</span>
                  )}
                  <span className={`status-badge ${getStatusClass(pkg.status)}`}>
                    {getDisplayStatus(pkg.status)}
                  </span>
                  {pkg.ai_generated && <span className="ai-badge">AI</span>}
                  <span className={`chevron ${expandedPackage === pkg.id ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </div>
              </div>

              {expandedPackage === pkg.id && (
                <div className="package-content">
                  {/* Package Actions */}
                  <div className="package-actions-bar">
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditPackageModal(pkg);
                      }}
                      disabled={!!actionInProgress}
                    >
                      Edit Package
                    </button>
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openAddItemsModal(pkg.id);
                      }}
                      disabled={!!actionInProgress}
                    >
                      Add Items
                    </button>
                    <button
                      className={`action-btn ${pkg.is_locked ? 'unlock' : 'lock'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLockPackage(pkg.id, !pkg.is_locked);
                      }}
                      disabled={actionInProgress === pkg.id}
                    >
                      {pkg.is_locked ? 'Unlock' : 'Lock'}
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePackage(pkg.id);
                      }}
                      disabled={actionInProgress === pkg.id || pkg.is_locked}
                    >
                      Delete
                    </button>
                  </div>

                  {/* Package Items */}
                  <div className="package-items">
                    {(() => {
                      const items = packageItems[pkg.id];
                      if (!items) {
                        return (
                          <div className="items-loading">
                            <div className="loading-spinner small" />
                            <span>Loading items...</span>
                          </div>
                        );
                      }
                      if (items.length === 0) {
                        return <div className="no-items">No items assigned to this package</div>;
                      }
                      return (
                        <table className="items-table">
                          <thead>
                            <tr>
                              <th className="checkbox-col">
                                <input
                                  type="checkbox"
                                  checked={selectedItems.size === items.length && items.length > 0}
                                  onChange={() => handleSelectAllItems(pkg.id)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </th>
                              <th>Item #</th>
                              <th>Description</th>
                              <th>Quantity</th>
                              <th>Unit</th>
                              <th>Value</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item) => (
                              <tr
                                key={item.id}
                                className={selectedItems.has(item.id) ? 'selected' : ''}
                              >
                                <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={selectedItems.has(item.id)}
                                    onChange={() => handleSelectItem(item.id)}
                                  />
                                </td>
                                <td className="item-number">{item.item_number}</td>
                                <td className="item-description">{item.description}</td>
                                <td className="item-quantity">
                                  {item.quantity?.toLocaleString() || '-'}
                                </td>
                                <td className="item-unit">{item.unit}</td>
                                <td className="item-value">
                                  {formatCurrency(item.final_extended_price)}
                                </td>
                                <td className="item-actions" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    className="remove-item-btn"
                                    onClick={() => handleRemoveItem(item.id, pkg.id)}
                                    disabled={actionInProgress === item.id || pkg.is_locked}
                                    title="Remove from package"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Move Items Modal */}
      {showMoveModal && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Move Items to Package</h3>
              <button className="modal-close" onClick={() => setShowMoveModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="move-info">
                Moving <strong>{selectedItems.size}</strong> item(s) to another work package.
              </p>
              <div className="form-group">
                <label>Target Package</label>
                <select
                  value={targetPackageId}
                  onChange={(e) => setTargetPackageId(e.target.value)}
                  className="form-select"
                >
                  <option value="">Select a package...</option>
                  {packages
                    .filter((p) => p.id !== sourcePackageId && !p.is_locked)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.package_code ? `${p.package_code} - ` : ''}{p.package_name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowMoveModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleMoveItems}
                disabled={!targetPackageId || isMoving}
              >
                {isMoving ? 'Moving...' : 'Move Items'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New/Edit Package Modal */}
      {showPackageModal && (
        <div className="modal-overlay" onClick={() => setShowPackageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPackage ? 'Edit Package' : 'New Work Package'}</h3>
              <button className="modal-close" onClick={() => setShowPackageModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {saveError && <div className="form-error">{saveError}</div>}

              <div className="form-group">
                <label>Package Name *</label>
                <input
                  type="text"
                  value={packageForm.package_name}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, package_name: e.target.value }))}
                  className="form-input"
                  placeholder="e.g., Earthwork & Grading"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Package Code</label>
                  <input
                    type="text"
                    value={packageForm.package_code}
                    onChange={(e) => setPackageForm(prev => ({ ...prev, package_code: e.target.value }))}
                    className="form-input"
                    placeholder="e.g., WP-001"
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={packageForm.status}
                    onChange={(e) => setPackageForm(prev => ({ ...prev, status: e.target.value }))}
                    className="form-select"
                  >
                    {STATUS_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Work Category</label>
                <select
                  value={packageForm.work_category}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, work_category: e.target.value }))}
                  className="form-select"
                >
                  {WORK_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={packageForm.description}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, description: e.target.value }))}
                  className="form-textarea"
                  rows={3}
                  placeholder="Brief description of the work package scope..."
                />
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={packageForm.notes}
                  onChange={(e) => setPackageForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="form-textarea"
                  rows={2}
                  placeholder="Internal notes about this package..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPackageModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSavePackage}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : editingPackage ? 'Save Changes' : 'Create Package'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Modal */}
      {showAddItemsModal && (
        <div className="modal-overlay" onClick={() => setShowAddItemsModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Unassigned Items</h3>
              <button className="modal-close" onClick={() => setShowAddItemsModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {unassignedItems.length === 0 ? (
                <div className="no-unassigned">
                  All line items are assigned to work packages.
                </div>
              ) : (
                <>
                  <p className="add-items-info">
                    Select items to add to this work package. ({unassignedItems.length} unassigned items)
                  </p>
                  <div className="unassigned-items-list">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th className="checkbox-col">
                            <input
                              type="checkbox"
                              checked={selectedUnassigned.size === unassignedItems.length && unassignedItems.length > 0}
                              onChange={() => {
                                if (selectedUnassigned.size === unassignedItems.length) {
                                  setSelectedUnassigned(new Set());
                                } else {
                                  setSelectedUnassigned(new Set(unassignedItems.map(i => i.id)));
                                }
                              }}
                            />
                          </th>
                          <th>Item #</th>
                          <th>Description</th>
                          <th>Qty</th>
                          <th>Unit</th>
                          <th>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unassignedItems.map((item) => (
                          <tr
                            key={item.id}
                            className={selectedUnassigned.has(item.id) ? 'selected' : ''}
                          >
                            <td className="checkbox-col">
                              <input
                                type="checkbox"
                                checked={selectedUnassigned.has(item.id)}
                                onChange={() => {
                                  const newSet = new Set(selectedUnassigned);
                                  if (newSet.has(item.id)) {
                                    newSet.delete(item.id);
                                  } else {
                                    newSet.add(item.id);
                                  }
                                  setSelectedUnassigned(newSet);
                                }}
                              />
                            </td>
                            <td className="item-number">{item.item_number}</td>
                            <td className="item-description">{item.description}</td>
                            <td className="item-quantity">{item.quantity?.toLocaleString() || '-'}</td>
                            <td className="item-unit">{item.unit}</td>
                            <td className="item-category">
                              {item.work_category ? (
                                <span className="category-badge">
                                  {WORK_CATEGORIES.find(c => c.value === item.work_category)?.label || item.work_category}
                                </span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddItemsModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddItemsToPackage}
                disabled={selectedUnassigned.size === 0 || isAddingItems}
              >
                {isAddingItems ? 'Adding...' : `Add ${selectedUnassigned.size} Item(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
