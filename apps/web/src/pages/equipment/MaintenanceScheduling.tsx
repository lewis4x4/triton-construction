import { useState, useEffect } from 'react';
import {
  Wrench,
  Calendar,
  Clock,
  CheckCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  AlertOctagon,
  FileText,
  DollarSign,
  Truck,
  ChevronLeft,
  ChevronRight,
  Timer,
  CalendarDays,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './MaintenanceScheduling.css';

interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  equipment_number?: string;
  equipment_description?: string;
  maintenance_type: string;
  maintenance_priority: string;
  scheduled_date: string | null;
  completed_date: string | null;
  due_engine_hours: number | null;
  actual_engine_hours: number | null;
  description: string;
  work_performed: string | null;
  parts_used: any | null;
  labor_hours: number | null;
  labor_cost: number | null;
  parts_cost: number | null;
  total_cost: number | null;
  performed_by: string | null;
  vendor_name: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

interface MaintenanceStats {
  totalScheduled: number;
  overdue: number;
  dueSoon: number;
  completedThisMonth: number;
  totalCostThisMonth: number;
  avgLaborHours: number;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  records: MaintenanceRecord[];
}

export function MaintenanceScheduling() {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [_showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  const loadMaintenanceData = async () => {
    setIsLoading(true);
    try {
      // Load maintenance records with equipment info
      const { data: records, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          equipment:equipment_id(
            equipment_number,
            description
          )
        `)
        .order('scheduled_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const formattedRecords = (records || []).map((r: any) => ({
        ...r,
        equipment_number: r.equipment?.equipment_number,
        equipment_description: r.equipment?.description,
      }));

      setMaintenanceRecords(formattedRecords);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const scheduled = formattedRecords.filter((r: MaintenanceRecord) =>
        r.status === 'scheduled' || r.status === 'in_progress'
      );

      const overdue = formattedRecords.filter((r: MaintenanceRecord) => {
        if (r.status === 'completed' || r.status === 'cancelled') return false;
        if (r.scheduled_date) {
          return new Date(r.scheduled_date) < now;
        }
        return false;
      });

      const dueSoon = formattedRecords.filter((r: MaintenanceRecord) => {
        if (r.status === 'completed' || r.status === 'cancelled') return false;
        if (r.scheduled_date) {
          const dueDate = new Date(r.scheduled_date);
          const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          return dueDate >= now && dueDate <= sevenDaysFromNow;
        }
        return false;
      });

      const completedThisMonth = formattedRecords.filter((r: MaintenanceRecord) =>
        r.status === 'completed' &&
        r.completed_date &&
        new Date(r.completed_date) >= startOfMonth &&
        new Date(r.completed_date) <= endOfMonth
      );

      const totalCost = completedThisMonth.reduce((sum: number, r: MaintenanceRecord) =>
        sum + (r.total_cost || 0), 0
      );

      const avgLabor = completedThisMonth.length > 0
        ? completedThisMonth.reduce((sum: number, r: MaintenanceRecord) =>
            sum + (r.labor_hours || 0), 0
          ) / completedThisMonth.length
        : 0;

      setStats({
        totalScheduled: scheduled.length,
        overdue: overdue.length,
        dueSoon: dueSoon.length,
        completedThisMonth: completedThisMonth.length,
        totalCostThisMonth: totalCost,
        avgLaborHours: avgLabor,
      });
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = maintenanceRecords.filter(record => {
    const matchesSearch = searchTerm === '' ||
      record.equipment_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.equipment_description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'all' || record.maintenance_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || record.maintenance_priority === priorityFilter;

    return matchesSearch && matchesType && matchesStatus && matchesPriority;
  });

  const getCalendarDays = (): CalendarDay[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();

    const days: CalendarDay[] = [];

    // Add days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        records: getRecordsForDate(date),
      });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      const isToday = date.toDateString() === today.toDateString();
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        records: getRecordsForDate(date),
      });
    }

    // Add days from next month
    const endPadding = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        records: getRecordsForDate(date),
      });
    }

    return days;
  };

  const getRecordsForDate = (date: Date): MaintenanceRecord[] => {
    return filteredRecords.filter(r => {
      if (!r.scheduled_date) return false;
      const scheduled = new Date(r.scheduled_date);
      return scheduled.toDateString() === date.toDateString();
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'normal': return 'info';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <span className="badge badge-info">Scheduled</span>;
      case 'in_progress':
        return <span className="badge badge-warning">In Progress</span>;
      case 'completed':
        return <span className="badge badge-success">Completed</span>;
      case 'cancelled':
        return <span className="badge badge-gray">Cancelled</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'preventive':
        return <Calendar size={14} className="type-icon preventive" />;
      case 'corrective':
        return <Wrench size={14} className="type-icon corrective" />;
      case 'emergency':
        return <AlertOctagon size={14} className="type-icon emergency" />;
      case 'inspection':
        return <FileText size={14} className="type-icon inspection" />;
      default:
        return <Wrench size={14} className="type-icon" />;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return '-';
    return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  };

  const maintenanceTypes = [...new Set(maintenanceRecords.map(r => r.maintenance_type).filter(Boolean))];

  if (isLoading) {
    return (
      <div className="maintenance-scheduling loading">
        <div className="loading-spinner">
          <RefreshCw className="spin" />
          <span>Loading maintenance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="maintenance-scheduling">
      <header className="dashboard-header">
        <div className="header-title">
          <Wrench size={28} />
          <h1>Maintenance Scheduling</h1>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >
              <FileText size={16} />
              List
            </button>
            <button
              className={`toggle-btn ${view === 'calendar' ? 'active' : ''}`}
              onClick={() => setView('calendar')}
            >
              <CalendarDays size={16} />
              Calendar
            </button>
          </div>
          <button className="btn btn-secondary" onClick={loadMaintenanceData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={16} />
            Schedule Maintenance
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Calendar />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.totalScheduled || 0}</span>
            <span className="stat-label">Scheduled</span>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">
            <AlertOctagon />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.overdue || 0}</span>
            <span className="stat-label">Overdue</span>
          </div>
        </div>

        <div className="stat-card warning">
          <div className="stat-icon">
            <Clock />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.dueSoon || 0}</span>
            <span className="stat-label">Due This Week</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">
            <CheckCircle />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats?.completedThisMonth || 0}</span>
            <span className="stat-label">Completed This Month</span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">
            <DollarSign />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats?.totalCostThisMonth || 0)}</span>
            <span className="stat-label">Cost This Month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Timer />
          </div>
          <div className="stat-content">
            <span className="stat-value">{(stats?.avgLaborHours || 0).toFixed(1)}h</span>
            <span className="stat-label">Avg Labor Hours</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search maintenance records..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <Filter size={16} />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {maintenanceTypes.map(type => (
              <option key={type} value={type}>{formatType(type)}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="filter-group">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div className="maintenance-table-container">
          <table className="maintenance-table">
            <thead>
              <tr>
                <th>Equipment</th>
                <th>Type</th>
                <th>Description</th>
                <th>Priority</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => (
                <tr
                  key={record.id}
                  onClick={() => setSelectedRecord(record)}
                  className={`
                    ${selectedRecord?.id === record.id ? 'selected' : ''}
                    ${record.status !== 'completed' && record.scheduled_date && new Date(record.scheduled_date) < new Date() ? 'overdue' : ''}
                  `}
                >
                  <td className="equipment-cell">
                    <Truck size={14} />
                    <div className="equipment-info">
                      <span className="equipment-number">{record.equipment_number || '-'}</span>
                      {record.equipment_description && (
                        <span className="equipment-desc">{record.equipment_description}</span>
                      )}
                    </div>
                  </td>
                  <td className="type-cell">
                    {getTypeIcon(record.maintenance_type)}
                    <span>{formatType(record.maintenance_type)}</span>
                  </td>
                  <td className="description-cell">{record.description}</td>
                  <td>
                    <span className={`priority-badge ${getPriorityColor(record.maintenance_priority)}`}>
                      {record.maintenance_priority}
                    </span>
                  </td>
                  <td className="date-cell">
                    {record.scheduled_date && (
                      <>
                        <Calendar size={12} />
                        {formatDate(record.scheduled_date)}
                      </>
                    )}
                    {record.due_engine_hours && (
                      <span className="hours-due">@ {record.due_engine_hours.toLocaleString()} hrs</span>
                    )}
                  </td>
                  <td>{getStatusBadge(record.status)}</td>
                  <td className="cost-cell">
                    {record.total_cost ? (
                      <>
                        <DollarSign size={12} />
                        {record.total_cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredRecords.length === 0 && (
            <div className="empty-state">
              <Wrench size={48} />
              <p>No maintenance records found</p>
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="calendar-container">
          <div className="calendar-header">
            <button
              className="nav-btn"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            >
              <ChevronLeft size={20} />
            </button>
            <h2>
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
            <button
              className="nav-btn"
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendar-grid">
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="weekday">{day}</div>
              ))}
            </div>

            <div className="calendar-days">
              {getCalendarDays().map((day, index) => (
                <div
                  key={index}
                  className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}`}
                >
                  <span className="day-number">{day.date.getDate()}</span>
                  <div className="day-records">
                    {day.records.slice(0, 3).map(record => (
                      <div
                        key={record.id}
                        className={`day-record ${getPriorityColor(record.maintenance_priority)}`}
                        onClick={() => setSelectedRecord(record)}
                        title={`${record.equipment_number}: ${record.description}`}
                      >
                        {getTypeIcon(record.maintenance_type)}
                        <span>{record.equipment_number}</span>
                      </div>
                    ))}
                    {day.records.length > 3 && (
                      <div className="more-records">+{day.records.length - 3} more</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Record Detail Panel */}
      {selectedRecord && (
        <div className="record-detail-panel">
          <div className="detail-header">
            <h3>Maintenance Details</h3>
            <button onClick={() => setSelectedRecord(null)}>×</button>
          </div>
          <div className="detail-content">
            <div className="detail-row">
              <span className="label">Equipment</span>
              <span className="value">
                {selectedRecord.equipment_number} - {selectedRecord.equipment_description}
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Type</span>
              <span className="value">{formatType(selectedRecord.maintenance_type)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Priority</span>
              <span className="value">
                <span className={`priority-badge ${getPriorityColor(selectedRecord.maintenance_priority)}`}>
                  {selectedRecord.maintenance_priority}
                </span>
              </span>
            </div>
            <div className="detail-row">
              <span className="label">Status</span>
              <span className="value">{getStatusBadge(selectedRecord.status)}</span>
            </div>
            <div className="detail-row">
              <span className="label">Description</span>
              <span className="value">{selectedRecord.description}</span>
            </div>
            <div className="detail-row">
              <span className="label">Scheduled Date</span>
              <span className="value">{formatDate(selectedRecord.scheduled_date)}</span>
            </div>
            {selectedRecord.due_engine_hours && (
              <div className="detail-row">
                <span className="label">Due at Hours</span>
                <span className="value">{selectedRecord.due_engine_hours.toLocaleString()}</span>
              </div>
            )}
            {selectedRecord.completed_date && (
              <div className="detail-row">
                <span className="label">Completed Date</span>
                <span className="value">{formatDate(selectedRecord.completed_date)}</span>
              </div>
            )}
            {selectedRecord.work_performed && (
              <div className="detail-row">
                <span className="label">Work Performed</span>
                <span className="value">{selectedRecord.work_performed}</span>
              </div>
            )}
            {selectedRecord.performed_by && (
              <div className="detail-row">
                <span className="label">Performed By</span>
                <span className="value">{selectedRecord.performed_by}</span>
              </div>
            )}
            {selectedRecord.vendor_name && (
              <div className="detail-row">
                <span className="label">Vendor</span>
                <span className="value">{selectedRecord.vendor_name}</span>
              </div>
            )}

            <div className="detail-section">
              <h4>Costs</h4>
              <div className="cost-breakdown">
                <div className="cost-row">
                  <span>Labor ({selectedRecord.labor_hours || 0} hrs)</span>
                  <span>{formatCurrency(selectedRecord.labor_cost)}</span>
                </div>
                <div className="cost-row">
                  <span>Parts</span>
                  <span>{formatCurrency(selectedRecord.parts_cost)}</span>
                </div>
                <div className="cost-row total">
                  <span>Total</span>
                  <span>{formatCurrency(selectedRecord.total_cost)}</span>
                </div>
              </div>
            </div>

            {selectedRecord.notes && (
              <div className="detail-row">
                <span className="label">Notes</span>
                <span className="value">{selectedRecord.notes}</span>
              </div>
            )}
          </div>
          <div className="detail-actions">
            {selectedRecord.status === 'scheduled' && (
              <>
                <button className="btn btn-secondary">Start Work</button>
                <button className="btn btn-primary">Complete</button>
              </>
            )}
            {selectedRecord.status === 'in_progress' && (
              <button className="btn btn-primary">Complete</button>
            )}
            {selectedRecord.status === 'completed' && (
              <button className="btn btn-secondary">View Report</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MaintenanceScheduling;
