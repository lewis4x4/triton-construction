import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  FileText,
  Plus,
  Search,
  Filter,
  DollarSign,
  Package,
  Clock,
  CheckCircle,
  ChevronRight,
  X,
  Download,
  RefreshCw,
  Truck,
  Calendar,
} from 'lucide-react';
import './POManagement.css';

interface PurchaseOrder {
  id: string;
  po_number: string;
  vendor_name: string;
  description: string;
  status: string;
  total_amount: number;
  issued_date: string;
  delivery_date: string | null;
  project_id: string;
  cost_code: string | null;
  items_count: number;
  delivered_count: number;
}

interface POStats {
  total: number;
  open: number;
  partiallyDelivered: number;
  complete: number;
  totalValue: number;
}

// Demo data for display
const demoPOs: PurchaseOrder[] = [
  {
    id: '1',
    po_number: 'PO-2024-0045',
    vendor_name: 'Mountain State Concrete',
    description: 'Class AA Concrete for Box Culvert Installation - Station 142+00',
    status: 'OPEN',
    total_amount: 45000,
    issued_date: '2024-12-01',
    delivery_date: '2024-12-15',
    project_id: 'b0000000-0000-0000-0000-000000000001',
    cost_code: '31-2500',
    items_count: 3,
    delivered_count: 1,
  },
  {
    id: '2',
    po_number: 'PO-2024-0044',
    vendor_name: 'WV Aggregates Inc.',
    description: 'Crushed Stone #57 and #8 for Base Course',
    status: 'PARTIALLY_DELIVERED',
    total_amount: 32500,
    issued_date: '2024-11-28',
    delivery_date: '2024-12-10',
    project_id: 'b0000000-0000-0000-0000-000000000001',
    cost_code: '31-2100',
    items_count: 2,
    delivered_count: 1,
  },
  {
    id: '3',
    po_number: 'PO-2024-0043',
    vendor_name: 'Steel Supply Company',
    description: 'Reinforcing Steel for Bridge Deck',
    status: 'COMPLETE',
    total_amount: 78000,
    issued_date: '2024-11-20',
    delivery_date: '2024-12-01',
    project_id: 'b0000000-0000-0000-0000-000000000002',
    cost_code: '51-3000',
    items_count: 5,
    delivered_count: 5,
  },
  {
    id: '4',
    po_number: 'PO-2024-0042',
    vendor_name: 'Asphalt Solutions LLC',
    description: 'Hot Mix Asphalt 12.5mm Surface Course',
    status: 'PENDING_APPROVAL',
    total_amount: 125000,
    issued_date: '2024-12-05',
    delivery_date: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
    cost_code: '32-1200',
    items_count: 4,
    delivered_count: 0,
  },
  {
    id: '5',
    po_number: 'PO-2024-0041',
    vendor_name: 'Pipe & Culvert Supply',
    description: '48" RCP Class V Storm Drain',
    status: 'OPEN',
    total_amount: 56000,
    issued_date: '2024-11-25',
    delivery_date: '2024-12-08',
    project_id: 'b0000000-0000-0000-0000-000000000001',
    cost_code: '33-4100',
    items_count: 6,
    delivered_count: 2,
  },
];

export function POManagement() {
  const [poList, setPOList] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [stats, setStats] = useState<POStats>({
    total: 0,
    open: 0,
    partiallyDelivered: 0,
    complete: 0,
    totalValue: 0,
  });

  useEffect(() => {
    fetchPOs();
  }, []);

  const fetchPOs = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('purchase_orders')
        .select('*')
        .order('issued_date', { ascending: false });

      if (error) throw error;

      // Use demo data if no real data exists
      const poData = data?.length > 0 ? data : demoPOs;
      setPOList(poData);
      calculateStats(poData);
    } catch (err) {
      console.error('Error fetching POs:', err);
      setPOList(demoPOs);
      calculateStats(demoPOs);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: PurchaseOrder[]) => {
    setStats({
      total: data.length,
      open: data.filter(po => po.status?.toUpperCase() === 'OPEN' || po.status?.toUpperCase() === 'PENDING_APPROVAL').length,
      partiallyDelivered: data.filter(po => po.status?.toUpperCase() === 'PARTIALLY_DELIVERED').length,
      complete: data.filter(po => po.status?.toUpperCase() === 'COMPLETE').length,
      totalValue: data.reduce((sum, po) => sum + (po.total_amount || 0), 0),
    });
  };

  const filteredPOs = poList.filter(po => {
    const matchesSearch =
      po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || po.status?.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'status-open';
      case 'PENDING_APPROVAL':
        return 'status-pending';
      case 'PARTIALLY_DELIVERED':
        return 'status-partial';
      case 'COMPLETE':
        return 'status-complete';
      case 'CANCELLED':
        return 'status-cancelled';
      default:
        return 'status-unknown';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING_APPROVAL':
        return 'Pending Approval';
      case 'PARTIALLY_DELIVERED':
        return 'Partial Delivery';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDeliveryProgress = (po: PurchaseOrder) => {
    if (!po.items_count || po.items_count === 0) return 0;
    return Math.round((po.delivered_count / po.items_count) * 100);
  };

  return (
    <div className="po-management-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <FileText size={32} />
            Purchase Order Management
          </h1>
          <p>Create, track, and manage material purchase orders</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary">
            <Download size={18} />
            Export
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            New PO
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total POs</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon open">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.open}</span>
            <span className="stat-label">Open/Pending</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon partial">
            <Truck size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.partiallyDelivered}</span>
            <span className="stat-label">Partial Delivery</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon complete">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.complete}</span>
            <span className="stat-label">Complete</span>
          </div>
        </div>
        <div className="stat-card highlight">
          <div className="stat-icon value">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.totalValue)}</span>
            <span className="stat-label">Total Value</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by PO number, vendor, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="OPEN">Open</option>
            <option value="PARTIALLY_DELIVERED">Partial Delivery</option>
            <option value="COMPLETE">Complete</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* PO List */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spinning" />
          <p>Loading purchase orders...</p>
        </div>
      ) : filteredPOs.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <h3>No Purchase Orders Found</h3>
          <p>Create a new purchase order to get started.</p>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            Create PO
          </button>
        </div>
      ) : (
        <div className="po-list">
          {filteredPOs.map((po) => (
            <div
              key={po.id}
              className={`po-card ${selectedPO?.id === po.id ? 'selected' : ''}`}
              onClick={() => setSelectedPO(po)}
            >
              <div className="po-header">
                <div className="po-identity">
                  <span className="po-number">{po.po_number}</span>
                  {po.cost_code && (
                    <span className="cost-code">{po.cost_code}</span>
                  )}
                </div>
                <div className="po-badges">
                  <span className={`status-badge ${getStatusBadge(po.status)}`}>
                    {getStatusLabel(po.status)}
                  </span>
                </div>
              </div>

              <div className="vendor-name">{po.vendor_name}</div>
              <p className="po-description">{po.description}</p>

              <div className="po-meta">
                <span>
                  <Calendar size={14} />
                  Issued: {formatDate(po.issued_date)}
                </span>
                <span>
                  <Truck size={14} />
                  Due: {formatDate(po.delivery_date)}
                </span>
                <span>
                  <Package size={14} />
                  {po.delivered_count}/{po.items_count} Items
                </span>
              </div>

              <div className="po-footer">
                <div className="delivery-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${getDeliveryProgress(po)}%` }}
                    />
                  </div>
                  <span className="progress-text">{getDeliveryProgress(po)}% Delivered</span>
                </div>
                <div className="po-amount">{formatCurrency(po.total_amount)}</div>
              </div>

              <ChevronRight size={20} className="chevron" />
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedPO && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>{selectedPO.po_number}</h2>
            <button className="btn btn-icon" onClick={() => setSelectedPO(null)}>
              <X size={20} />
            </button>
          </div>

          <div className="panel-content">
            {/* Header Info */}
            <div className="detail-section">
              <div className="po-detail-header">
                <span className={`status-badge ${getStatusBadge(selectedPO.status)}`}>
                  {getStatusLabel(selectedPO.status)}
                </span>
              </div>
              <h3 className="vendor-title">{selectedPO.vendor_name}</h3>
              <p className="description">{selectedPO.description}</p>
            </div>

            {/* Key Details */}
            <div className="detail-section">
              <h4>
                <FileText size={16} />
                Order Details
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Issued Date</label>
                  <span>{formatDate(selectedPO.issued_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Expected Delivery</label>
                  <span>{formatDate(selectedPO.delivery_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Cost Code</label>
                  <span>{selectedPO.cost_code || '—'}</span>
                </div>
                <div className="detail-item">
                  <label>Total Amount</label>
                  <span className="amount">{formatCurrency(selectedPO.total_amount)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Progress */}
            <div className="detail-section">
              <h4>
                <Truck size={16} />
                Delivery Progress
              </h4>
              <div className="progress-detail">
                <div className="progress-stats">
                  <span>{selectedPO.delivered_count} of {selectedPO.items_count} items delivered</span>
                  <span className="percentage">{getDeliveryProgress(selectedPO)}%</span>
                </div>
                <div className="progress-bar large">
                  <div
                    className="progress-fill"
                    style={{ width: `${getDeliveryProgress(selectedPO)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Line Items Placeholder */}
            <div className="detail-section">
              <h4>
                <Package size={16} />
                Line Items
              </h4>
              <div className="line-items-placeholder">
                <Package size={24} />
                <p>Line item details will be displayed here</p>
              </div>
            </div>

            {/* Actions */}
            <div className="panel-footer">
              <button className="btn btn-secondary">
                <Download size={16} />
                Export PDF
              </button>
              <button className="btn btn-primary">
                <CheckCircle size={16} />
                Record Delivery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New PO Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Purchase Order</h2>
              <button className="btn btn-icon" onClick={() => setShowNewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="coming-soon">Full PO creation form coming soon!</p>
              <p>The PO creation form will include:</p>
              <ul>
                <li>Vendor selection from approved suppliers</li>
                <li>Project and cost code assignment</li>
                <li>Line item entry with quantities and unit prices</li>
                <li>Expected delivery date</li>
                <li>Approval workflow integration</li>
                <li>Terms and conditions templates</li>
                <li>Document attachment support</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
