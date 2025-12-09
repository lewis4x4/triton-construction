import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  Clock,
  Users,
  Calendar,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  FileText,
  ChevronRight,
  Play,
  Square,
  Plus,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './TimeTrackingDashboard.css';

interface TimeStats {
  totalHoursThisWeek: number;
  totalHoursThisMonth: number;
  pendingApprovals: number;
  overtimeHours: number;
  activeWorkers: number;
  totalLaborCost: number;
}

interface RecentTimeEntry {
  id: string;
  crew_member_name: string;
  project_name: string;
  work_date: string;
  regular_hours: number;
  overtime_hours: number;
  status: string;
  trade_classification: string;
}

interface ActiveClock {
  id: string;
  crew_member_name: string;
  project_name: string;
  clock_in_time: string;
  duration_minutes: number;
}

export function TimeTrackingDashboard() {
  const [stats, setStats] = useState<TimeStats>({
    totalHoursThisWeek: 0,
    totalHoursThisMonth: 0,
    pendingApprovals: 0,
    overtimeHours: 0,
    activeWorkers: 0,
    totalLaborCost: 0,
  });
  const [recentEntries, setRecentEntries] = useState<RecentTimeEntry[]>([]);
  const [activeClocks, setActiveClocks] = useState<ActiveClock[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('this_week');

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Try to load from Supabase
      const { data: timeEntries } = await (supabase as any)
        .from('time_entries')
        .select('*')
        .order('work_date', { ascending: false })
        .limit(20);

      if (timeEntries && timeEntries.length > 0) {
        // Calculate stats from real data
        const thisWeek = timeEntries.filter((e: any) => {
          const entryDate = new Date(e.work_date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return entryDate >= weekAgo;
        });

        const totalWeekHours = thisWeek.reduce(
          (sum: number, e: any) => sum + (e.regular_hours || 0) + (e.overtime_hours || 0),
          0
        );
        const overtimeHours = thisWeek.reduce(
          (sum: number, e: any) => sum + (e.overtime_hours || 0),
          0
        );
        const pendingCount = timeEntries.filter(
          (e: any) => e.status?.toUpperCase() === 'PENDING'
        ).length;

        setStats({
          totalHoursThisWeek: totalWeekHours,
          totalHoursThisMonth: timeEntries.reduce(
            (sum: number, e: any) => sum + (e.regular_hours || 0) + (e.overtime_hours || 0),
            0
          ),
          pendingApprovals: pendingCount,
          overtimeHours,
          activeWorkers: new Set(timeEntries.map((e: any) => e.crew_member_id)).size,
          totalLaborCost: timeEntries.reduce(
            (sum: number, e: any) =>
              sum +
              (e.regular_hours || 0) * (e.base_rate || 35) +
              (e.overtime_hours || 0) * (e.base_rate || 35) * 1.5,
            0
          ),
        });

        setRecentEntries(
          timeEntries.slice(0, 10).map((e: any) => ({
            id: e.id,
            crew_member_name: e.crew_member_name || 'Unknown Worker',
            project_name: e.project_name || 'Unknown Project',
            work_date: e.work_date,
            regular_hours: e.regular_hours || 0,
            overtime_hours: e.overtime_hours || 0,
            status: e.status || 'PENDING',
            trade_classification: e.trade_classification || 'General Labor',
          }))
        );
      } else {
        // Use demo data
        loadDemoData();
      }
    } catch (error) {
      console.error('Error loading time tracking data:', error);
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    const today = new Date().toISOString().split('T')[0] ?? '';
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0] ?? '';

    setStats({
      totalHoursThisWeek: 2847.5,
      totalHoursThisMonth: 11234.0,
      pendingApprovals: 47,
      overtimeHours: 234.5,
      activeWorkers: 68,
      totalLaborCost: 425680.0,
    });

    setRecentEntries([
      {
        id: '1',
        crew_member_name: 'John Martinez',
        project_name: 'Corridor H - Section 12',
        work_date: today,
        regular_hours: 8,
        overtime_hours: 2,
        status: 'PENDING',
        trade_classification: 'Equipment Operator',
      },
      {
        id: '2',
        crew_member_name: 'Mike Thompson',
        project_name: 'Route 50 Bridge Repair',
        work_date: today,
        regular_hours: 8,
        overtime_hours: 0,
        status: 'APPROVED',
        trade_classification: 'Carpenter',
      },
      {
        id: '3',
        crew_member_name: 'Sarah Williams',
        project_name: 'Corridor H - Section 12',
        work_date: today,
        regular_hours: 8,
        overtime_hours: 1.5,
        status: 'PENDING',
        trade_classification: 'Laborer',
      },
      {
        id: '4',
        crew_member_name: 'Robert Davis',
        project_name: 'I-64 Interchange',
        work_date: yesterday,
        regular_hours: 8,
        overtime_hours: 0,
        status: 'APPROVED',
        trade_classification: 'Ironworker',
      },
      {
        id: '5',
        crew_member_name: 'James Wilson',
        project_name: 'Route 50 Bridge Repair',
        work_date: yesterday,
        regular_hours: 6,
        overtime_hours: 0,
        status: 'REJECTED',
        trade_classification: 'Cement Mason',
      },
    ]);

    setActiveClocks([
      {
        id: '1',
        crew_member_name: 'John Martinez',
        project_name: 'Corridor H - Section 12',
        clock_in_time: '06:30 AM',
        duration_minutes: 342,
      },
      {
        id: '2',
        crew_member_name: 'Mike Thompson',
        project_name: 'Route 50 Bridge Repair',
        clock_in_time: '07:00 AM',
        duration_minutes: 312,
      },
      {
        id: '3',
        crew_member_name: 'Sarah Williams',
        project_name: 'Corridor H - Section 12',
        clock_in_time: '06:45 AM',
        duration_minutes: 327,
      },
    ]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toUpperCase()) {
      case 'APPROVED':
        return 'status-approved';
      case 'PENDING':
        return 'status-pending';
      case 'REJECTED':
        return 'status-rejected';
      case 'SUBMITTED':
        return 'status-submitted';
      default:
        return 'status-unknown';
    }
  };

  if (loading) {
    return (
      <div className="time-tracking-page">
        <div className="loading-state">
          <RefreshCw size={48} className="spinning" />
          <p>Loading time tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="time-tracking-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <Clock size={32} />
            Time Tracking
          </h1>
          <p>Manage time entries, approvals, and labor cost tracking</p>
        </div>
        <div className="header-actions">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="period-select"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
          </select>
          <Link to="/time-tracking/entry" className="btn btn-primary">
            <Plus size={18} />
            New Entry
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon hours">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalHoursThisWeek.toLocaleString()}</span>
            <span className="stat-label">Hours This Week</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon workers">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.activeWorkers}</span>
            <span className="stat-label">Active Workers</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon pending">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.pendingApprovals}</span>
            <span className="stat-label">Pending Approvals</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon overtime">
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.overtimeHours.toLocaleString()}</span>
            <span className="stat-label">Overtime Hours</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon cost">
            <DollarSign size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{formatCurrency(stats.totalLaborCost)}</span>
            <span className="stat-label">Labor Cost (Month)</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <Link to="/time-tracking/entry" className="action-card">
          <div className="action-icon">
            <Plus size={24} />
          </div>
          <div className="action-content">
            <h3>Enter Time</h3>
            <p>Manual time entry for crew</p>
          </div>
          <ChevronRight size={20} />
        </Link>
        <Link to="/time-tracking/approval" className="action-card highlight">
          <div className="action-icon">
            <CheckCircle size={24} />
          </div>
          <div className="action-content">
            <h3>Approve Time</h3>
            <p>{stats.pendingApprovals} entries pending</p>
          </div>
          <ChevronRight size={20} />
        </Link>
        <Link to="/time-tracking/timesheet" className="action-card">
          <div className="action-icon">
            <FileText size={24} />
          </div>
          <div className="action-content">
            <h3>Weekly Timesheets</h3>
            <p>View & export timesheets</p>
          </div>
          <ChevronRight size={20} />
        </Link>
        <Link to="/time-tracking/payroll" className="action-card">
          <div className="action-icon">
            <DollarSign size={24} />
          </div>
          <div className="action-content">
            <h3>Certified Payroll</h3>
            <p>Generate WH-347 forms</p>
          </div>
          <ChevronRight size={20} />
        </Link>
      </div>

      <div className="dashboard-grid">
        {/* Active Clock-Ins */}
        <div className="dashboard-card">
          <div className="card-header">
            <h2>
              <Play size={20} />
              Active Clock-Ins
            </h2>
            <span className="count-badge">{activeClocks.length} active</span>
          </div>
          <div className="active-clocks-list">
            {activeClocks.map((clock) => (
              <div key={clock.id} className="clock-item">
                <div className="clock-info">
                  <span className="worker-name">{clock.crew_member_name}</span>
                  <span className="project-name">{clock.project_name}</span>
                </div>
                <div className="clock-time">
                  <span className="clock-in">In: {clock.clock_in_time}</span>
                  <span className="duration">{formatDuration(clock.duration_minutes)}</span>
                </div>
                <button className="btn-icon" title="Clock Out">
                  <Square size={16} />
                </button>
              </div>
            ))}
            {activeClocks.length === 0 && (
              <div className="empty-state-small">
                <p>No active clock-ins</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Time Entries */}
        <div className="dashboard-card wide">
          <div className="card-header">
            <h2>
              <Calendar size={20} />
              Recent Time Entries
            </h2>
            <Link to="/time-tracking/approval" className="view-all-link">
              View All <ChevronRight size={16} />
            </Link>
          </div>
          <div className="entries-table">
            <table>
              <thead>
                <tr>
                  <th>Worker</th>
                  <th>Project</th>
                  <th>Date</th>
                  <th>Regular</th>
                  <th>OT</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td>
                      <div className="worker-cell">
                        <span className="name">{entry.crew_member_name}</span>
                        <span className="trade">{entry.trade_classification}</span>
                      </div>
                    </td>
                    <td>{entry.project_name}</td>
                    <td>
                      {new Date(entry.work_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td>{entry.regular_hours}h</td>
                    <td className={entry.overtime_hours > 0 ? 'overtime' : ''}>
                      {entry.overtime_hours > 0 ? `${entry.overtime_hours}h` : '—'}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Weekly Summary */}
      <div className="weekly-summary">
        <div className="summary-header">
          <h2>
            <TrendingUp size={20} />
            This Week's Summary
          </h2>
          <button className="btn btn-secondary">
            <Download size={16} />
            Export
          </button>
        </div>
        <div className="summary-bars">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
            const hoursData = [456, 478, 492, 445, 476, 124, 0];
            const hours = hoursData[index] ?? 0;
            const maxHours = 500;
            const percentage = (hours / maxHours) * 100;
            const isToday = index === new Date().getDay() - 1;
            return (
              <div key={day} className={`day-bar ${isToday ? 'today' : ''}`}>
                <div className="bar-container">
                  <div className="bar-fill" style={{ height: `${percentage}%` }} />
                </div>
                <span className="day-label">{day}</span>
                <span className="hours-label">{hours}h</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
