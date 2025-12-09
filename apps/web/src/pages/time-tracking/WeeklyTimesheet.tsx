import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  User,
  Clock,
  DollarSign,
  RefreshCw,
  Printer,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './WeeklyTimesheet.css';

interface TimesheetRow {
  crew_member_id: string;
  crew_member_name: string;
  employee_id: string;
  trade_classification: string;
  hourly_rate: number;
  days: {
    [date: string]: {
      regular: number;
      overtime: number;
    };
  };
  total_regular: number;
  total_overtime: number;
  total_gross: number;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
}

export function WeeklyTimesheet() {
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    loadTimesheets();
  }, [weekStartDate, selectedProject]);

  const loadProjects = async () => {
    const { data } = await (supabase as any)
      .from('projects')
      .select('id, name, project_number')
      .in('status', ['ACTIVE', 'MOBILIZATION'])
      .order('name');

    if (data && data.length > 0) {
      setProjects(data);
    } else {
      setProjects([
        { id: 'p1', name: 'Corridor H - Section 12', project_number: '2024-001' },
        { id: 'p2', name: 'Route 50 Bridge Repair', project_number: '2024-002' },
        { id: 'p3', name: 'I-64 Interchange', project_number: '2024-003' },
      ]);
    }
  };

  const loadTimesheets = async () => {
    setLoading(true);
    try {
      // Try loading from Supabase
      const weekDates = getWeekDates();
      const { data } = await (supabase as any)
        .from('time_entries')
        .select('*')
        .gte('work_date', weekDates[0])
        .lte('work_date', weekDates[6])
        .eq('status', 'APPROVED');

      if (data && data.length > 0) {
        // Process real data into timesheet format
        const grouped = processTimeEntries(data, weekDates);
        setTimesheets(grouped);
      } else {
        loadDemoData();
      }
    } catch (error) {
      console.error('Error loading timesheets:', error);
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const processTimeEntries = (data: any[], _weekDates: string[]): TimesheetRow[] => {
    const byWorker: Record<string, TimesheetRow> = {};

    data.forEach((entry) => {
      const workerId = entry.crew_member_id;
      if (!byWorker[workerId]) {
        byWorker[workerId] = {
          crew_member_id: workerId,
          crew_member_name: entry.crew_member_name || 'Unknown',
          employee_id: entry.employee_id || '',
          trade_classification: entry.trade_classification || 'General Labor',
          hourly_rate: entry.base_rate || 35,
          days: {},
          total_regular: 0,
          total_overtime: 0,
          total_gross: 0,
        };
      }

      const date = entry.work_date;
      if (!byWorker[workerId].days[date]) {
        byWorker[workerId].days[date] = { regular: 0, overtime: 0 };
      }

      byWorker[workerId].days[date].regular += entry.regular_hours || 0;
      byWorker[workerId].days[date].overtime += entry.overtime_hours || 0;
      byWorker[workerId].total_regular += entry.regular_hours || 0;
      byWorker[workerId].total_overtime += entry.overtime_hours || 0;
    });

    // Calculate gross pay
    Object.values(byWorker).forEach((row) => {
      row.total_gross =
        row.total_regular * row.hourly_rate + row.total_overtime * row.hourly_rate * 1.5;
    });

    return Object.values(byWorker);
  };

  const loadDemoData = () => {
    const weekDates = getWeekDates();
    const workers = [
      { id: '1', name: 'John Martinez', empId: 'EMP001', trade: 'Equipment Operator', rate: 42 },
      { id: '2', name: 'Mike Thompson', empId: 'EMP002', trade: 'Carpenter', rate: 38 },
      { id: '3', name: 'Sarah Williams', empId: 'EMP003', trade: 'Laborer', rate: 32 },
      { id: '4', name: 'Robert Davis', empId: 'EMP004', trade: 'Ironworker', rate: 45 },
      { id: '5', name: 'James Wilson', empId: 'EMP005', trade: 'Cement Mason', rate: 40 },
      { id: '6', name: 'Lisa Brown', empId: 'EMP006', trade: 'Equipment Operator', rate: 42 },
      { id: '7', name: 'David Miller', empId: 'EMP007', trade: 'Carpenter', rate: 38 },
    ];

    const sheets: TimesheetRow[] = workers.map((worker) => {
      const days: TimesheetRow['days'] = {};
      let totalReg = 0;
      let totalOT = 0;

      weekDates.forEach((date, index) => {
        // No work on weekends
        if (index >= 5) {
          days[date] = { regular: 0, overtime: 0 };
        } else {
          const regular = 8;
          const overtime = index === 4 && Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0;
          days[date] = { regular, overtime };
          totalReg += regular;
          totalOT += overtime;
        }
      });

      return {
        crew_member_id: worker.id,
        crew_member_name: worker.name,
        employee_id: worker.empId,
        trade_classification: worker.trade,
        hourly_rate: worker.rate,
        days,
        total_regular: totalReg,
        total_overtime: totalOT,
        total_gross: totalReg * worker.rate + totalOT * worker.rate * 1.5,
      };
    });

    setTimesheets(sheets);
  };

  const getWeekDates = (): string[] => {
    const dates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr) {
        dates.push(dateStr);
      }
    }
    return dates;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(weekStartDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setWeekStartDate(newDate);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const weekDates = getWeekDates();
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  const filteredTimesheets = timesheets.filter((sheet) =>
    sheet.crew_member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sheet.trade_classification.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = filteredTimesheets.reduce(
    (acc, sheet) => ({
      regular: acc.regular + sheet.total_regular,
      overtime: acc.overtime + sheet.total_overtime,
      gross: acc.gross + sheet.total_gross,
    }),
    { regular: 0, overtime: 0, gross: 0 }
  );

  if (loading) {
    return (
      <div className="timesheet-page">
        <div className="loading-state">
          <RefreshCw size={48} className="spinning" />
          <p>Loading timesheets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="timesheet-page">
      <div className="page-header">
        <div className="header-content">
          <Link to="/time-tracking" className="back-link">
            <ChevronLeft size={20} />
            Back to Dashboard
          </Link>
          <h1>
            <FileText size={32} />
            Weekly Timesheets
          </h1>
          <p>View and export weekly timesheet summaries</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary">
            <Printer size={16} />
            Print
          </button>
          <button className="btn btn-primary">
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Week Navigator */}
      <div className="week-nav-bar">
        <div className="week-navigator">
          <button onClick={() => navigateWeek('prev')} className="nav-btn">
            <ChevronLeft size={20} />
          </button>
          <div className="week-label">
            <Calendar size={18} />
            <span>
              {weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
              {weekEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <button onClick={() => navigateWeek('next')} className="nav-btn">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="filters">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search workers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_number} - {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-icon">
            <Clock size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{totals.regular.toLocaleString()}</span>
            <span className="summary-label">Regular Hours</span>
          </div>
        </div>
        <div className="summary-card overtime">
          <div className="summary-icon">
            <Clock size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{totals.overtime.toLocaleString()}</span>
            <span className="summary-label">Overtime Hours</span>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">
            <User size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{filteredTimesheets.length}</span>
            <span className="summary-label">Workers</span>
          </div>
        </div>
        <div className="summary-card gross">
          <div className="summary-icon">
            <DollarSign size={20} />
          </div>
          <div className="summary-content">
            <span className="summary-value">{formatCurrency(totals.gross)}</span>
            <span className="summary-label">Gross Pay</span>
          </div>
        </div>
      </div>

      {/* Timesheet Table */}
      <div className="timesheet-container">
        <table className="timesheet-table">
          <thead>
            <tr>
              <th className="worker-col">Worker</th>
              <th className="trade-col">Trade</th>
              <th className="rate-col">Rate</th>
              {weekDates.map((date) => {
                const d = new Date(date);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <th key={date} className={`day-col ${isWeekend ? 'weekend' : ''}`}>
                    <span className="day-name">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="day-num">{d.getDate()}</span>
                  </th>
                );
              })}
              <th className="total-col">Reg</th>
              <th className="total-col overtime">OT</th>
              <th className="gross-col">Gross</th>
            </tr>
          </thead>
          <tbody>
            {filteredTimesheets.map((sheet) => (
              <tr key={sheet.crew_member_id}>
                <td className="worker-col">
                  <div className="worker-info">
                    <span className="name">{sheet.crew_member_name}</span>
                    <span className="emp-id">{sheet.employee_id}</span>
                  </div>
                </td>
                <td className="trade-col">{sheet.trade_classification}</td>
                <td className="rate-col">${sheet.hourly_rate}/hr</td>
                {weekDates.map((date) => {
                  const d = new Date(date);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  const dayData = sheet.days[date] || { regular: 0, overtime: 0 };
                  const totalHours = dayData.regular + dayData.overtime;
                  return (
                    <td key={date} className={`day-col ${isWeekend ? 'weekend' : ''}`}>
                      {totalHours > 0 ? (
                        <div className="day-hours">
                          <span className="regular">{dayData.regular}</span>
                          {dayData.overtime > 0 && (
                            <span className="overtime">+{dayData.overtime}</span>
                          )}
                        </div>
                      ) : (
                        <span className="no-hours">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="total-col">{sheet.total_regular}h</td>
                <td className="total-col overtime">{sheet.total_overtime}h</td>
                <td className="gross-col">{formatCurrency(sheet.total_gross)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3}>Totals</td>
              {weekDates.map((date) => {
                const dayTotal = filteredTimesheets.reduce((sum, sheet) => {
                  const day = sheet.days[date] || { regular: 0, overtime: 0 };
                  return sum + day.regular + day.overtime;
                }, 0);
                return (
                  <td key={date} className="day-col">
                    {dayTotal > 0 ? `${dayTotal}h` : '—'}
                  </td>
                );
              })}
              <td className="total-col">{totals.regular}h</td>
              <td className="total-col overtime">{totals.overtime}h</td>
              <td className="gross-col">{formatCurrency(totals.gross)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
