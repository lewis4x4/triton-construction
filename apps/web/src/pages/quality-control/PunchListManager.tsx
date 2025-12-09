import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  ListChecks,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  MapPin,
  User,
  ChevronRight,
  X,
  RefreshCw,
  Download,
  Camera,
  Tag,
} from 'lucide-react';
import './PunchListManager.css';

interface PunchListItem {
  id: string;
  item_number: string;
  description: string;
  category: string;
  priority: string;
  location: string | null;
  status: string;
  assigned_to: string | null;
  created_date: string;
  due_date: string | null;
  completed_date: string | null;
  notes: string | null;
  photo_url: string | null;
  project_id: string;
}

interface PunchStats {
  total: number;
  open: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

// Demo data
const demoPunchItems: PunchListItem[] = [
  {
    id: '1',
    item_number: 'PL-001',
    description: 'Touch up paint on guardrail end section at Station 145+50',
    category: 'PAINTING',
    priority: 'LOW',
    location: 'Station 145+50',
    status: 'OPEN',
    assigned_to: 'Painting Crew',
    created_date: '2024-12-05',
    due_date: '2024-12-15',
    completed_date: null,
    notes: 'Minor scrapes from installation. Use matching DOT gray.',
    photo_url: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '2',
    item_number: 'PL-002',
    description: 'Seal expansion joint at bridge approach slab - south end',
    category: 'JOINTS',
    priority: 'HIGH',
    location: 'Bridge South Approach',
    status: 'IN_PROGRESS',
    assigned_to: 'Mike Johnson',
    created_date: '2024-12-04',
    due_date: '2024-12-08',
    completed_date: null,
    notes: 'Joint sealant has pulled away. Re-seal per spec 605.3.2',
    photo_url: null,
    project_id: 'b0000000-0000-0000-0000-000000000002',
  },
  {
    id: '3',
    item_number: 'PL-003',
    description: 'Install missing delineator post at curve - Station 138+25',
    category: 'SIGNAGE',
    priority: 'MEDIUM',
    location: 'Station 138+25',
    status: 'COMPLETED',
    assigned_to: 'Sign Crew',
    created_date: '2024-12-01',
    due_date: '2024-12-05',
    completed_date: '2024-12-03',
    notes: 'Post knocked down by equipment. Replaced and verified.',
    photo_url: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '4',
    item_number: 'PL-004',
    description: 'Repair damaged inlet grate at Station 142+00',
    category: 'DRAINAGE',
    priority: 'HIGH',
    location: 'Station 142+00',
    status: 'OPEN',
    assigned_to: null,
    created_date: '2024-12-06',
    due_date: '2024-12-10',
    completed_date: null,
    notes: 'Grate bent from traffic. Replace with heavy duty grate.',
    photo_url: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '5',
    item_number: 'PL-005',
    description: 'Clean debris from catch basin - parking area',
    category: 'DRAINAGE',
    priority: 'LOW',
    location: 'Parking Area Entrance',
    status: 'COMPLETED',
    assigned_to: 'General Labor',
    created_date: '2024-11-28',
    due_date: '2024-12-01',
    completed_date: '2024-11-30',
    notes: 'Construction debris blocking inlet. Cleaned and flushed.',
    photo_url: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '6',
    item_number: 'PL-006',
    description: 'Straighten leaning fence post at property line',
    category: 'FENCING',
    priority: 'MEDIUM',
    location: 'Property Line - West',
    status: 'OPEN',
    assigned_to: 'Fence Crew',
    created_date: '2024-12-05',
    due_date: '2024-12-12',
    completed_date: null,
    notes: 'Post leaning approx 10 degrees. Reset with concrete.',
    photo_url: null,
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
];

export function PunchListManager() {
  const [items, setItems] = useState<PunchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItem, setSelectedItem] = useState<PunchListItem | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [stats, setStats] = useState<PunchStats>({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('punch_list_items')
        .select('*')
        .order('created_date', { ascending: false });

      if (error) throw error;

      const itemData = data?.length > 0 ? data : demoPunchItems;
      setItems(itemData);
      calculateStats(itemData);
    } catch (err) {
      console.error('Error fetching punch list:', err);
      setItems(demoPunchItems);
      calculateStats(demoPunchItems);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: PunchListItem[]) => {
    const today = new Date();
    setStats({
      total: data.length,
      open: data.filter(i => i.status?.toUpperCase() === 'OPEN').length,
      inProgress: data.filter(i => i.status?.toUpperCase() === 'IN_PROGRESS').length,
      completed: data.filter(i => i.status?.toUpperCase() === 'COMPLETED').length,
      overdue: data.filter(i => {
        if (i.status?.toUpperCase() === 'COMPLETED') return false;
        if (!i.due_date) return false;
        return new Date(i.due_date) < today;
      }).length,
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.item_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || item.status?.toUpperCase() === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category?.toUpperCase() === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'OPEN':
        return 'status-open';
      case 'IN_PROGRESS':
        return 'status-progress';
      case 'COMPLETED':
        return 'status-completed';
      case 'VERIFIED':
        return 'status-verified';
      default:
        return 'status-unknown';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toUpperCase()) {
      case 'HIGH':
        return 'priority-high';
      case 'MEDIUM':
        return 'priority-medium';
      case 'LOW':
        return 'priority-low';
      default:
        return 'priority-unknown';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isOverdue = (item: PunchListItem) => {
    if (item.status?.toUpperCase() === 'COMPLETED') return false;
    if (!item.due_date) return false;
    return new Date(item.due_date) < new Date();
  };

  const uniqueCategories = [...new Set(items.map(i => i.category))].filter(Boolean);

  return (
    <div className="punch-list-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <ListChecks size={32} />
            Punch List Manager
          </h1>
          <p>Track and manage project punch list items through completion</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary">
            <Download size={18} />
            Export
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            Add Item
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <ListChecks size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Items</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon open">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.open}</span>
            <span className="stat-label">Open</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon progress">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon completed">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
        <div className="stat-card danger">
          <div className="stat-icon overdue">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.overdue}</span>
            <span className="stat-label">Overdue</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by item number, description, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat.toUpperCase()}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-summary">
        <div className="progress-info">
          <span className="progress-text">
            {stats.completed} of {stats.total} items completed
          </span>
          <span className="progress-percent">
            {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}%
          </span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spinning" />
          <p>Loading punch list...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <ListChecks size={48} />
          <h3>No Punch List Items Found</h3>
          <p>Add items to track project completion tasks.</p>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            Add Item
          </button>
        </div>
      ) : (
        <div className="punch-list">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`punch-card ${selectedItem?.id === item.id ? 'selected' : ''} ${isOverdue(item) ? 'overdue' : ''} ${item.status?.toUpperCase() === 'COMPLETED' ? 'completed' : ''}`}
              onClick={() => setSelectedItem(item)}
            >
              <div className="punch-header">
                <div className="punch-identity">
                  <span className="item-number">{item.item_number}</span>
                  <span className="item-category">{item.category}</span>
                </div>
                <div className="punch-badges">
                  <span className={`priority-badge ${getPriorityBadge(item.priority)}`}>
                    {item.priority}
                  </span>
                  <span className={`status-badge ${getStatusBadge(item.status)}`}>
                    {item.status?.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <p className="item-description">{item.description}</p>

              <div className="punch-meta">
                {item.location && (
                  <span>
                    <MapPin size={14} />
                    {item.location}
                  </span>
                )}
                {item.assigned_to && (
                  <span>
                    <User size={14} />
                    {item.assigned_to}
                  </span>
                )}
                <span>
                  <Calendar size={14} />
                  Due: {formatDate(item.due_date)}
                </span>
              </div>

              {isOverdue(item) && (
                <div className="overdue-alert">
                  <AlertTriangle size={14} />
                  <span>Overdue</span>
                </div>
              )}

              <ChevronRight size={20} className="chevron" />
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedItem && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>{selectedItem.item_number}</h2>
            <button className="btn btn-icon" onClick={() => setSelectedItem(null)}>
              <X size={20} />
            </button>
          </div>

          <div className="panel-content">
            {/* Header Info */}
            <div className="detail-section">
              <div className="punch-detail-header">
                <div className="badge-row">
                  <span className={`priority-badge ${getPriorityBadge(selectedItem.priority)}`}>
                    {selectedItem.priority}
                  </span>
                  <span className={`status-badge ${getStatusBadge(selectedItem.status)}`}>
                    {selectedItem.status?.replace('_', ' ')}
                  </span>
                </div>
                <span className="category-tag">{selectedItem.category}</span>
              </div>
              <p className="description">{selectedItem.description}</p>
            </div>

            {/* Photo */}
            <div className="detail-section photo-section">
              {selectedItem.photo_url ? (
                <img src={selectedItem.photo_url} alt="Item" className="item-photo" />
              ) : (
                <div className="no-photo">
                  <Camera size={24} />
                  <p>No photo attached</p>
                  <button className="btn btn-secondary btn-sm">Add Photo</button>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="detail-section">
              <h4>
                <Tag size={16} />
                Item Details
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Location</label>
                  <span>{selectedItem.location || '—'}</span>
                </div>
                <div className="detail-item">
                  <label>Assigned To</label>
                  <span>{selectedItem.assigned_to || 'Unassigned'}</span>
                </div>
                <div className="detail-item">
                  <label>Created</label>
                  <span>{formatDate(selectedItem.created_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Due Date</label>
                  <span className={isOverdue(selectedItem) ? 'overdue-text' : ''}>
                    {formatDate(selectedItem.due_date)}
                  </span>
                </div>
                {selectedItem.completed_date && (
                  <div className="detail-item">
                    <label>Completed</label>
                    <span className="completed-text">{formatDate(selectedItem.completed_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {selectedItem.notes && (
              <div className="detail-section">
                <h4>Notes</h4>
                <p className="notes-text">{selectedItem.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="panel-footer">
              {selectedItem.status !== 'COMPLETED' ? (
                <>
                  <button className="btn btn-secondary">
                    <User size={16} />
                    Assign
                  </button>
                  <button className="btn btn-primary">
                    <CheckCircle size={16} />
                    Mark Complete
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-secondary">
                    <Download size={16} />
                    Export
                  </button>
                  <button className="btn btn-primary">
                    <CheckCircle size={16} />
                    Verify
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Item Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Punch List Item</h2>
              <button className="btn btn-icon" onClick={() => setShowNewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="coming-soon">Full punch list form coming soon!</p>
              <p>The form will include:</p>
              <ul>
                <li>Description and location</li>
                <li>Category and priority selection</li>
                <li>Photo capture and upload</li>
                <li>Assignment to crew/subcontractor</li>
                <li>Due date setting</li>
                <li>Linked inspection or NCR</li>
                <li>Notification preferences</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
