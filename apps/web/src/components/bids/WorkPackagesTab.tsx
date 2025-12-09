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
  assigned_estimator_id: string | null;
  sort_order: number | null;
  created_at: string | null;
}

interface WorkPackageItem {
  id: string;
  item_number: string;
  description: string;
  quantity: number;
  unit: string;
}

type StatusFilter = 'all' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETE' | 'REVIEWED';

export function WorkPackagesTab({ projectId }: WorkPackagesTabProps) {
  const [packages, setPackages] = useState<WorkPackage[]>([]);
  const [expandedPackage, setExpandedPackage] = useState<string | null>(null);
  const [packageItems, setPackageItems] = useState<Record<string, WorkPackageItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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
    async (packageId: string) => {
      if (packageItems[packageId]) return; // Already fetched

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
              unit
            )
          `
          )
          .eq('work_package_id', packageId)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        const items =
          data?.map((item: { bid_line_items: WorkPackageItem }) => item.bid_line_items).filter(Boolean) || [];

        setPackageItems((prev) => ({ ...prev, [packageId]: items }));
      } catch (err) {
        console.error('Error fetching package items:', err);
      }
    },
    [packageItems]
  );

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  const togglePackage = (packageId: string) => {
    if (expandedPackage === packageId) {
      setExpandedPackage(null);
    } else {
      setExpandedPackage(packageId);
      fetchPackageItems(packageId);
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
        <div className="packages-filters">
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
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {packages.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h4>No Work Packages</h4>
          <p>
            Work packages will be automatically created when line items are imported and categorized
          </p>
        </div>
      ) : (
        <div className="packages-list">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`package-card ${expandedPackage === pkg.id ? 'expanded' : ''}`}
            >
              <div className="package-card-header" onClick={() => togglePackage(pkg.id)}>
                <div className="package-info">
                  <span className="package-icon">{getCategoryIcon(pkg.work_category)}</span>
                  <div className="package-details">
                    <div className="package-name">
                      {pkg.package_code && <span className="package-code">{pkg.package_code}</span>}
                      {pkg.package_name}
                    </div>
                    {pkg.description && (
                      <div className="package-description">{pkg.description}</div>
                    )}
                  </div>
                </div>

                <div className="package-meta">
                  <span className="items-count">{pkg.total_items || 0} items</span>
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
                            <th>Item #</th>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item) => (
                            <tr key={item.id}>
                              <td className="item-number">{item.item_number}</td>
                              <td className="item-description">{item.description}</td>
                              <td className="item-quantity">
                                {item.quantity?.toLocaleString() || '-'}
                              </td>
                              <td className="item-unit">{item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
