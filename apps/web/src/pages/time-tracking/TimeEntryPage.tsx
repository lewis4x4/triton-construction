import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  Clock,
  Plus,
  Search,
  Calendar,
  User,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './TimeEntryPage.css';

interface CrewMember {
  id: string;
  display_name: string;
  trade_classification: string;
  employee_id: string;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
}

interface CostCode {
  id: string;
  code: string;
  description: string;
}

interface TimeEntryRow {
  crew_member_id: string;
  crew_member_name: string;
  trade_classification: string;
  entries: {
    [date: string]: {
      regular_hours: number;
      overtime_hours: number;
      cost_code_id?: string;
      notes?: string;
    };
  };
}

export function TimeEntryPage() {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [_costCodes, setCostCodes] = useState<CostCode[]>([]); // Reserved for future cost code selection
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [weekStartDate, setWeekStartDate] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
  const [timeEntries, setTimeEntries] = useState<TimeEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadTimeEntries();
    }
  }, [selectedProject, weekStartDate]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // Load crew members
      const { data: crewData } = await (supabase as any)
        .from('crew_members')
        .select('id, display_name, first_name, last_name, trade_classification, employee_id')
        .eq('status', 'ACTIVE')
        .order('display_name');

      if (crewData && crewData.length > 0) {
        setCrewMembers(
          crewData.map((c: any) => ({
            id: c.id,
            display_name: c.display_name || `${c.first_name} ${c.last_name}`,
            trade_classification: c.trade_classification || 'General Labor',
            employee_id: c.employee_id || '',
          }))
        );
      } else {
        // Demo crew members
        setCrewMembers([
          { id: '1', display_name: 'John Martinez', trade_classification: 'Equipment Operator', employee_id: 'EMP001' },
          { id: '2', display_name: 'Mike Thompson', trade_classification: 'Carpenter', employee_id: 'EMP002' },
          { id: '3', display_name: 'Sarah Williams', trade_classification: 'Laborer', employee_id: 'EMP003' },
          { id: '4', display_name: 'Robert Davis', trade_classification: 'Ironworker', employee_id: 'EMP004' },
          { id: '5', display_name: 'James Wilson', trade_classification: 'Cement Mason', employee_id: 'EMP005' },
        ]);
      }

      // Load projects
      const { data: projectData } = await (supabase as any)
        .from('projects')
        .select('id, name, project_number')
        .in('status', ['ACTIVE', 'MOBILIZATION'])
        .order('name');

      if (projectData && projectData.length > 0) {
        setProjects(projectData);
        setSelectedProject(projectData[0].id);
      } else {
        // Demo projects
        const demoProjects = [
          { id: 'p1', name: 'Corridor H - Section 12', project_number: '2024-001' },
          { id: 'p2', name: 'Route 50 Bridge Repair', project_number: '2024-002' },
          { id: 'p3', name: 'I-64 Interchange', project_number: '2024-003' },
        ];
        setProjects(demoProjects);
        if (demoProjects[0]) {
          setSelectedProject(demoProjects[0].id);
        }
      }

      // Load cost codes
      const { data: costCodeData } = await (supabase as any)
        .from('cost_codes')
        .select('id, code, description')
        .order('code');

      if (costCodeData && costCodeData.length > 0) {
        setCostCodes(costCodeData);
      } else {
        setCostCodes([
          { id: 'cc1', code: '01-100', description: 'General Conditions' },
          { id: 'cc2', code: '02-200', description: 'Site Work' },
          { id: 'cc3', code: '03-300', description: 'Concrete' },
          { id: 'cc4', code: '05-500', description: 'Metals' },
          { id: 'cc5', code: '31-000', description: 'Earthwork' },
        ]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimeEntries = async () => {
    // Initialize empty entries for demo
    const entries: TimeEntryRow[] = crewMembers.slice(0, 5).map((member) => ({
      crew_member_id: member.id,
      crew_member_name: member.display_name,
      trade_classification: member.trade_classification,
      entries: {},
    }));

    // Add some sample hours
    const weekDates = getWeekDates();
    entries.forEach((entry, index) => {
      weekDates.slice(0, 5).forEach((date, dayIndex) => {
        if (Math.random() > 0.3) {
          entry.entries[date] = {
            regular_hours: 8,
            overtime_hours: dayIndex === 4 && index < 2 ? 2 : 0,
          };
        }
      });
    });

    setTimeEntries(entries);
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

  const updateEntry = (
    crewMemberId: string,
    date: string,
    field: 'regular_hours' | 'overtime_hours',
    value: number
  ) => {
    setTimeEntries((prev) =>
      prev.map((row) => {
        if (row.crew_member_id === crewMemberId) {
          const existingEntry = row.entries[date] || { regular_hours: 0, overtime_hours: 0 };
          return {
            ...row,
            entries: {
              ...row.entries,
              [date]: {
                regular_hours: existingEntry.regular_hours,
                overtime_hours: existingEntry.overtime_hours,
                [field]: value,
              },
            },
          };
        }
        return row;
      })
    );
  };

  const addWorkerToSheet = (member: CrewMember) => {
    if (!timeEntries.find((e) => e.crew_member_id === member.id)) {
      setTimeEntries((prev) => [
        ...prev,
        {
          crew_member_id: member.id,
          crew_member_name: member.display_name,
          trade_classification: member.trade_classification,
          entries: {},
        },
      ]);
    }
    setShowAddWorker(false);
    setSearchTerm('');
  };

  const removeWorkerFromSheet = (crewMemberId: string) => {
    setTimeEntries((prev) => prev.filter((e) => e.crew_member_id !== crewMemberId));
  };

  const calculateRowTotal = (entries: TimeEntryRow['entries']): { regular: number; overtime: number } => {
    let regular = 0;
    let overtime = 0;
    Object.values(entries).forEach((entry) => {
      regular += entry.regular_hours || 0;
      overtime += entry.overtime_hours || 0;
    });
    return { regular, overtime };
  };

  const saveTimeEntries = async () => {
    setSaving(true);
    try {
      // Simulate save
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSaveMessage({ type: 'success', text: 'Time entries saved successfully!' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch {
      setSaveMessage({ type: 'error', text: 'Failed to save time entries.' });
    } finally {
      setSaving(false);
    }
  };

  const weekDates = getWeekDates();
  const filteredCrewMembers = crewMembers.filter(
    (m) =>
      m.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.trade_classification.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="time-entry-page">
        <div className="loading-state">
          <RefreshCw size={48} className="spinning" />
          <p>Loading time entry data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="time-entry-page">
      <div className="page-header">
        <div className="header-content">
          <Link to="/time-tracking" className="back-link">
            <ChevronLeft size={20} />
            Back to Dashboard
          </Link>
          <h1>
            <Clock size={32} />
            Time Entry
          </h1>
          <p>Enter time for crew members by project</p>
        </div>
        <div className="header-actions">
          <button onClick={saveTimeEntries} className="btn btn-primary" disabled={saving}>
            {saving ? <RefreshCw size={18} className="spinning" /> : <Save size={18} />}
            {saving ? 'Saving...' : 'Save Entries'}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div className={`save-message ${saveMessage.type}`}>
          {saveMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {saveMessage.text}
        </div>
      )}

      {/* Controls */}
      <div className="entry-controls">
        <div className="control-group">
          <label>Project</label>
          <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_number} - {project.name}
              </option>
            ))}
          </select>
        </div>
        <div className="week-navigator">
          <button onClick={() => navigateWeek('prev')} className="nav-btn">
            <ChevronLeft size={20} />
          </button>
          <span className="week-label">
            <Calendar size={16} />
            Week of {weekStartDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <button onClick={() => navigateWeek('next')} className="nav-btn">
            <ChevronRight size={20} />
          </button>
        </div>
        <button onClick={() => setShowAddWorker(true)} className="btn btn-secondary">
          <Plus size={18} />
          Add Worker
        </button>
      </div>

      {/* Time Entry Grid */}
      <div className="time-grid-container">
        <table className="time-grid">
          <thead>
            <tr>
              <th className="worker-column">Worker</th>
              {weekDates.map((date) => {
                const d = new Date(date);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = date === new Date().toISOString().split('T')[0];
                return (
                  <th
                    key={date}
                    className={`day-column ${isWeekend ? 'weekend' : ''} ${isToday ? 'today' : ''}`}
                  >
                    <span className="day-name">{d.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="day-date">{d.getDate()}</span>
                  </th>
                );
              })}
              <th className="total-column">Total</th>
              <th className="actions-column"></th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.map((row) => {
              const totals = calculateRowTotal(row.entries);
              return (
                <tr key={row.crew_member_id}>
                  <td className="worker-column">
                    <div className="worker-info">
                      <span className="worker-name">{row.crew_member_name}</span>
                      <span className="worker-trade">{row.trade_classification}</span>
                    </div>
                  </td>
                  {weekDates.map((date) => {
                    const entry = row.entries[date] || { regular_hours: 0, overtime_hours: 0 };
                    const d = new Date(date);
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <td
                        key={date}
                        className={`day-column ${isWeekend ? 'weekend' : ''}`}
                      >
                        <div className="hours-inputs">
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={entry.regular_hours || ''}
                            onChange={(e) =>
                              updateEntry(
                                row.crew_member_id,
                                date,
                                'regular_hours',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="Reg"
                            className="hours-input regular"
                          />
                          <input
                            type="number"
                            min="0"
                            max="24"
                            step="0.5"
                            value={entry.overtime_hours || ''}
                            onChange={(e) =>
                              updateEntry(
                                row.crew_member_id,
                                date,
                                'overtime_hours',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            placeholder="OT"
                            className="hours-input overtime"
                          />
                        </div>
                      </td>
                    );
                  })}
                  <td className="total-column">
                    <div className="total-hours">
                      <span className="regular">{totals.regular}h</span>
                      {totals.overtime > 0 && <span className="overtime">+{totals.overtime}h OT</span>}
                    </div>
                  </td>
                  <td className="actions-column">
                    <button
                      onClick={() => removeWorkerFromSheet(row.crew_member_id)}
                      className="remove-btn"
                      title="Remove from sheet"
                    >
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {timeEntries.length === 0 && (
        <div className="empty-state">
          <User size={48} />
          <h3>No Workers Added</h3>
          <p>Click "Add Worker" to start entering time</p>
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddWorker && (
        <div className="modal-overlay" onClick={() => setShowAddWorker(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Worker to Timesheet</h2>
              <button onClick={() => setShowAddWorker(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search by name or trade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="worker-list">
                {filteredCrewMembers.map((member) => {
                  const isAdded = timeEntries.some((e) => e.crew_member_id === member.id);
                  return (
                    <div
                      key={member.id}
                      className={`worker-item ${isAdded ? 'added' : ''}`}
                      onClick={() => !isAdded && addWorkerToSheet(member)}
                    >
                      <div className="worker-details">
                        <span className="name">{member.display_name}</span>
                        <span className="trade">{member.trade_classification}</span>
                      </div>
                      {isAdded ? (
                        <span className="added-badge">Added</span>
                      ) : (
                        <Plus size={18} className="add-icon" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
