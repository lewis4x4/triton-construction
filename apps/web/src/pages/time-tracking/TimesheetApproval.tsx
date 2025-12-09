import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Calendar,
  User,
  ChevronLeft,
  X,
  RefreshCw,
  AlertTriangle,
  CheckSquare,
  Square,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import './TimesheetApproval.css';

interface PendingEntry {
  id: string;
  crew_member_id: string;
  crew_member_name: string;
  trade_classification: string;
  project_id: string;
  project_name: string;
  work_date: string;
  regular_hours: number;
  overtime_hours: number;
  cost_code: string;
  notes: string;
  submitted_at: string;
  status: string;
}

export function TimesheetApproval() {
  const [pendingEntries, setPendingEntries] = useState<PendingEntry[]>([]);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [selectedEntry, setSelectedEntry] = useState<PendingEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadPendingEntries();
  }, []);

  const loadPendingEntries = async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('time_entries')
        .select('*')
        .eq('status', 'PENDING')
        .order('work_date', { ascending: false });

      if (data && data.length > 0) {
        setPendingEntries(
          data.map((e: any) => ({
            id: e.id,
            crew_member_id: e.crew_member_id,
            crew_member_name: e.crew_member_name || 'Unknown Worker',
            trade_classification: e.trade_classification || 'General Labor',
            project_id: e.project_id,
            project_name: e.project_name || 'Unknown Project',
            work_date: e.work_date,
            regular_hours: e.regular_hours || 0,
            overtime_hours: e.overtime_hours || 0,
            cost_code: e.cost_code || '—',
            notes: e.notes || '',
            submitted_at: e.created_at,
            status: e.status,
          }))
        );
      } else {
        // Demo data
        loadDemoData();
      }
    } catch (error) {
      console.error('Error loading pending entries:', error);
      loadDemoData();
    } finally {
      setLoading(false);
    }
  };

  const loadDemoData = () => {
    const today = new Date();
    const entries: PendingEntry[] = [];

    const workers = [
      { id: '1', name: 'John Martinez', trade: 'Equipment Operator' },
      { id: '2', name: 'Mike Thompson', trade: 'Carpenter' },
      { id: '3', name: 'Sarah Williams', trade: 'Laborer' },
      { id: '4', name: 'Robert Davis', trade: 'Ironworker' },
      { id: '5', name: 'James Wilson', trade: 'Cement Mason' },
    ];

    const projects = [
      { id: 'p1', name: 'Corridor H - Section 12' },
      { id: 'p2', name: 'Route 50 Bridge Repair' },
      { id: 'p3', name: 'I-64 Interchange' },
    ];

    // Generate entries for past few days
    const costCodes = ['01-100', '02-200', '03-300', '31-000'];
    for (let day = 0; day < 5; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() - day);
      const dateStr = date.toISOString().split('T')[0] ?? '';

      workers.forEach((worker, index) => {
        if (Math.random() > 0.4) {
          const project = projects[index % 3];
          const costCode = costCodes[Math.floor(Math.random() * 4)];
          if (project && costCode) {
            entries.push({
              id: `entry-${day}-${index}`,
              crew_member_id: worker.id,
              crew_member_name: worker.name,
              trade_classification: worker.trade,
              project_id: project.id,
              project_name: project.name,
              work_date: dateStr,
              regular_hours: 8,
              overtime_hours: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0,
              cost_code: costCode,
              notes: Math.random() > 0.7 ? 'Worked on main structure foundation' : '',
              submitted_at: new Date(date.getTime() + 17 * 60 * 60 * 1000).toISOString(),
              status: 'PENDING',
            });
          }
        }
      });
    }

    setPendingEntries(entries);
  };

  const toggleSelectEntry = (id: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedEntries(newSelected);
  };

  const selectAll = () => {
    if (selectedEntries.size === filteredEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(filteredEntries.map((e) => e.id)));
    }
  };

  const handleBulkAction = async (_action: 'approve' | 'reject') => {
    if (selectedEntries.size === 0) return;
    setProcessing(true);

    try {
      // Simulate API call - _action would be used for real API calls
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setPendingEntries((prev) =>
        prev.filter((e) => !selectedEntries.has(e.id))
      );
      setSelectedEntries(new Set());
      setSelectedEntry(null);
    } finally {
      setProcessing(false);
    }
  };

  const handleSingleAction = async (id: string, _action: 'approve' | 'reject') => {
    setProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setPendingEntries((prev) => prev.filter((e) => e.id !== id));
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
      }
      selectedEntries.delete(id);
      setSelectedEntries(new Set(selectedEntries));
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Get unique projects for filter
  const projects = [...new Set(pendingEntries.map((e) => e.project_name))];

  // Filter entries
  const filteredEntries = pendingEntries.filter((entry) => {
    const matchesSearch =
      entry.crew_member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.project_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = filterProject === 'all' || entry.project_name === filterProject;
    const matchesDate =
      filterDate === 'all' ||
      (filterDate === 'today' && entry.work_date === new Date().toISOString().split('T')[0]) ||
      (filterDate === 'yesterday' &&
        entry.work_date ===
          new Date(Date.now() - 86400000).toISOString().split('T')[0]);
    return matchesSearch && matchesProject && matchesDate;
  });

  // Group by date for display
  const groupedByDate = filteredEntries.reduce<Record<string, PendingEntry[]>>((acc, entry) => {
    const dateKey = entry.work_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey]!.push(entry);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  if (loading) {
    return (
      <div className="approval-page">
        <div className="loading-state">
          <RefreshCw size={48} className="spinning" />
          <p>Loading pending approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="approval-page">
      <div className="page-header">
        <div className="header-content">
          <Link to="/time-tracking" className="back-link">
            <ChevronLeft size={20} />
            Back to Dashboard
          </Link>
          <h1>
            <CheckCircle size={32} />
            Timesheet Approval
          </h1>
          <p>Review and approve pending time entries</p>
        </div>
        <div className="header-stats">
          <div className="stat-pill">
            <AlertTriangle size={16} />
            <span>{pendingEntries.length} pending</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by worker or project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
          <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}>
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedEntries.size > 0 && (
        <div className="bulk-actions">
          <span className="selected-count">{selectedEntries.size} selected</span>
          <button
            onClick={() => handleBulkAction('approve')}
            className="btn btn-success"
            disabled={processing}
          >
            <CheckCircle size={16} />
            Approve All
          </button>
          <button
            onClick={() => handleBulkAction('reject')}
            className="btn btn-danger"
            disabled={processing}
          >
            <XCircle size={16} />
            Reject All
          </button>
          <button onClick={() => setSelectedEntries(new Set())} className="btn btn-secondary">
            Clear Selection
          </button>
        </div>
      )}

      <div className="approval-layout">
        {/* Entries List */}
        <div className="entries-list">
          <div className="list-header">
            <button onClick={selectAll} className="select-all-btn">
              {selectedEntries.size === filteredEntries.length && filteredEntries.length > 0 ? (
                <CheckSquare size={18} />
              ) : (
                <Square size={18} />
              )}
              Select All
            </button>
            <span className="entries-count">{filteredEntries.length} entries</span>
          </div>

          {sortedDates.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} />
              <h3>All Caught Up!</h3>
              <p>No pending time entries to approve</p>
            </div>
          ) : (
            sortedDates.map((date) => {
              const entriesForDate = groupedByDate[date] ?? [];
              return (
              <div key={date} className="date-group">
                <div className="date-header">
                  <Calendar size={16} />
                  {formatDate(date)}
                  <span className="date-count">{entriesForDate.length} entries</span>
                </div>
                {entriesForDate.map((entry) => (
                  <div
                    key={entry.id}
                    className={`entry-card ${selectedEntry?.id === entry.id ? 'active' : ''} ${
                      selectedEntries.has(entry.id) ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedEntry(entry)}
                  >
                    <button
                      className="checkbox"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectEntry(entry.id);
                      }}
                    >
                      {selectedEntries.has(entry.id) ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <div className="entry-info">
                      <span className="worker-name">{entry.crew_member_name}</span>
                      <span className="project-name">{entry.project_name}</span>
                    </div>
                    <div className="entry-hours">
                      <span className="regular">{entry.regular_hours}h</span>
                      {entry.overtime_hours > 0 && (
                        <span className="overtime">+{entry.overtime_hours}h OT</span>
                      )}
                    </div>
                    <div className="entry-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleAction(entry.id, 'approve');
                        }}
                        className="action-btn approve"
                        disabled={processing}
                        title="Approve"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleAction(entry.id, 'reject');
                        }}
                        className="action-btn reject"
                        disabled={processing}
                        title="Reject"
                      >
                        <XCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
            })
          )}
        </div>

        {/* Detail Panel */}
        {selectedEntry && (
          <div className="detail-panel">
            <div className="panel-header">
              <h2>Entry Details</h2>
              <button onClick={() => setSelectedEntry(null)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="panel-content">
              <div className="detail-section">
                <div className="worker-header">
                  <div className="worker-avatar">
                    <User size={24} />
                  </div>
                  <div>
                    <h3>{selectedEntry.crew_member_name}</h3>
                    <span className="trade">{selectedEntry.trade_classification}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>
                  <FileText size={16} />
                  Entry Information
                </h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Project</label>
                    <span>{selectedEntry.project_name}</span>
                  </div>
                  <div className="detail-item">
                    <label>Work Date</label>
                    <span>{formatDate(selectedEntry.work_date)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Regular Hours</label>
                    <span className="hours">{selectedEntry.regular_hours}h</span>
                  </div>
                  <div className="detail-item">
                    <label>Overtime Hours</label>
                    <span className={`hours ${selectedEntry.overtime_hours > 0 ? 'overtime' : ''}`}>
                      {selectedEntry.overtime_hours}h
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Cost Code</label>
                    <span>{selectedEntry.cost_code}</span>
                  </div>
                  <div className="detail-item">
                    <label>Submitted</label>
                    <span>{formatTime(selectedEntry.submitted_at)}</span>
                  </div>
                </div>
              </div>

              {selectedEntry.notes && (
                <div className="detail-section">
                  <h4>Notes</h4>
                  <p className="notes-text">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
            <div className="panel-footer">
              <button
                onClick={() => handleSingleAction(selectedEntry.id, 'reject')}
                className="btn btn-danger"
                disabled={processing}
              >
                <XCircle size={16} />
                Reject
              </button>
              <button
                onClick={() => handleSingleAction(selectedEntry.id, 'approve')}
                className="btn btn-success"
                disabled={processing}
              >
                <CheckCircle size={16} />
                Approve
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
