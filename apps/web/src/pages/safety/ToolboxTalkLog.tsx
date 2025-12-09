import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  MessageSquare,
  Plus,
  Search,
  Filter,
  Users,
  Clock,
  Calendar,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  X,
  UserCheck,
  RefreshCw,
  Download,
} from 'lucide-react';
import './ToolboxTalkLog.css';

interface ToolboxTalk {
  id: string;
  topic: string;
  topic_code: string | null;
  content: string | null;
  conducted_date: string;
  conducted_time: string | null;
  duration_minutes: number | null;
  presenter_name: string | null;
  total_attendees: number | null;
  acknowledged_count: number | null;
  hazards_discussed: string | null;
  safety_measures: string | null;
  questions_asked: string | null;
  notes: string | null;
  project_id: string | null;
}

interface TalkStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  avgAttendees: number;
  totalAttendees: number;
}

// Demo data for display since table is empty
const demoTalks: ToolboxTalk[] = [
  {
    id: '1',
    topic: 'Heat Illness Prevention',
    topic_code: 'ENV-001',
    content: 'Discussion on recognizing symptoms of heat exhaustion and heat stroke, proper hydration practices, and work/rest cycles during hot weather.',
    conducted_date: '2024-12-06',
    conducted_time: '07:00',
    duration_minutes: 15,
    presenter_name: 'Mike Johnson',
    total_attendees: 12,
    acknowledged_count: 12,
    hazards_discussed: 'Heat exhaustion, Heat stroke, Dehydration',
    safety_measures: 'Mandatory water breaks, Shade structures, Buddy system',
    questions_asked: 'What are early signs of heat stroke?',
    notes: 'All crew acknowledged understanding. Extra water coolers placed on site.',
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '2',
    topic: 'Trenching & Excavation Safety',
    topic_code: 'EXC-003',
    content: 'Review of protective systems, daily inspections, and emergency procedures for trenching operations.',
    conducted_date: '2024-12-05',
    conducted_time: '06:45',
    duration_minutes: 20,
    presenter_name: 'Sarah Williams',
    total_attendees: 8,
    acknowledged_count: 8,
    hazards_discussed: 'Cave-ins, Falling materials, Hazardous atmospheres',
    safety_measures: 'Sloping, Shoring, Competent person inspections',
    questions_asked: 'When do we need air monitoring?',
    notes: 'Reviewed recent OSHA updates on excavation standards.',
    project_id: 'b0000000-0000-0000-0000-000000000001',
  },
  {
    id: '3',
    topic: 'PPE Inspection & Care',
    topic_code: 'PPE-001',
    content: 'Proper inspection procedures for hard hats, safety glasses, and high-visibility vests. When to replace damaged equipment.',
    conducted_date: '2024-12-04',
    conducted_time: '07:00',
    duration_minutes: 10,
    presenter_name: 'Mike Johnson',
    total_attendees: 15,
    acknowledged_count: 15,
    hazards_discussed: 'Equipment failure, Inadequate protection',
    safety_measures: 'Daily PPE inspections, Replacement protocols',
    questions_asked: null,
    notes: 'Distributed new hard hats to 3 crew members with expired equipment.',
    project_id: 'b0000000-0000-0000-0000-000000000002',
  },
];

export function ToolboxTalkLog() {
  const [talks, setTalks] = useState<ToolboxTalk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedTalk, setSelectedTalk] = useState<ToolboxTalk | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [stats, setStats] = useState<TalkStats>({
    total: 0,
    thisWeek: 0,
    thisMonth: 0,
    avgAttendees: 0,
    totalAttendees: 0,
  });

  useEffect(() => {
    fetchTalks();
  }, []);

  const fetchTalks = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('toolbox_talks')
        .select('*')
        .order('conducted_date', { ascending: false });

      if (error) throw error;

      // Use demo data if no real data exists
      const talkData = data?.length > 0 ? data : demoTalks;
      setTalks(talkData);
      calculateStats(talkData);
    } catch (err) {
      console.error('Error fetching toolbox talks:', err);
      setTalks(demoTalks);
      calculateStats(demoTalks);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: ToolboxTalk[]) => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const thisWeek = data.filter(t => new Date(t.conducted_date) >= weekAgo).length;
    const thisMonth = data.filter(t => new Date(t.conducted_date) >= monthAgo).length;
    const totalAttendees = data.reduce((sum, t) => sum + (t.total_attendees || 0), 0);
    const avgAttendees = data.length > 0 ? Math.round(totalAttendees / data.length) : 0;

    setStats({
      total: data.length,
      thisWeek,
      thisMonth,
      avgAttendees,
      totalAttendees,
    });
  };

  const filteredTalks = talks.filter(talk => {
    const matchesSearch =
      talk.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      talk.topic_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      talk.presenter_name?.toLowerCase().includes(searchTerm.toLowerCase());

    if (dateFilter === 'all') return matchesSearch;

    const talkDate = new Date(talk.conducted_date);
    const now = new Date();

    switch (dateFilter) {
      case 'week':
        return matchesSearch && talkDate >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return matchesSearch && talkDate >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return matchesSearch && talkDate >= new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return matchesSearch;
    }
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return '—';
    const parts = timeString.split(':');
    const hours = parts[0] || '0';
    const minutes = parts[1] || '00';
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getAttendanceRate = (talk: ToolboxTalk) => {
    if (!talk.total_attendees || talk.total_attendees === 0) return 0;
    return Math.round(((talk.acknowledged_count || 0) / talk.total_attendees) * 100);
  };

  return (
    <div className="toolbox-talk-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            <MessageSquare size={32} />
            Toolbox Talk Log
          </h1>
          <p>Track and document daily safety meetings and crew acknowledgements</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary">
            <Download size={18} />
            Export Report
          </button>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            New Talk
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <MessageSquare size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Talks</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon week">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.thisWeek}</span>
            <span className="stat-label">This Week</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon month">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.thisMonth}</span>
            <span className="stat-label">This Month</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon attendees">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.avgAttendees}</span>
            <span className="stat-label">Avg Attendees</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon total-people">
            <UserCheck size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalAttendees}</span>
            <span className="stat-label">Total Trained</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by topic, code, or presenter..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
            <option value="all">All Time</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
          </select>
        </div>
      </div>

      {/* Talks List */}
      {loading ? (
        <div className="loading-state">
          <RefreshCw size={32} className="spinning" />
          <p>Loading toolbox talks...</p>
        </div>
      ) : filteredTalks.length === 0 ? (
        <div className="empty-state">
          <MessageSquare size={48} />
          <h3>No Toolbox Talks Found</h3>
          <p>Start documenting your daily safety meetings.</p>
          <button className="btn btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={18} />
            Record Talk
          </button>
        </div>
      ) : (
        <div className="talks-list">
          {filteredTalks.map((talk) => (
            <div
              key={talk.id}
              className={`talk-card ${selectedTalk?.id === talk.id ? 'selected' : ''}`}
              onClick={() => setSelectedTalk(talk)}
            >
              <div className="talk-header">
                <div className="talk-identity">
                  {talk.topic_code && (
                    <span className="topic-code">{talk.topic_code}</span>
                  )}
                  <span className="talk-date">{formatDate(talk.conducted_date)}</span>
                </div>
                <div className="attendance-badge">
                  <UserCheck size={14} />
                  {getAttendanceRate(talk)}% Acknowledged
                </div>
              </div>

              <h3 className="talk-topic">{talk.topic}</h3>
              {talk.content && (
                <p className="talk-content">{talk.content}</p>
              )}

              <div className="talk-meta">
                <span>
                  <Clock size={14} />
                  {formatTime(talk.conducted_time)}
                </span>
                <span>
                  <Clock size={14} />
                  {talk.duration_minutes || '—'} min
                </span>
                <span>
                  <Users size={14} />
                  {talk.total_attendees || 0} attendees
                </span>
                {talk.presenter_name && (
                  <span>
                    <UserCheck size={14} />
                    {talk.presenter_name}
                  </span>
                )}
              </div>

              {talk.hazards_discussed && (
                <div className="hazards-preview">
                  <AlertTriangle size={14} />
                  <span>{talk.hazards_discussed}</span>
                </div>
              )}

              <ChevronRight size={20} className="chevron" />
            </div>
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selectedTalk && (
        <div className="detail-panel">
          <div className="panel-header">
            <h2>Talk Details</h2>
            <button className="btn btn-icon" onClick={() => setSelectedTalk(null)}>
              <X size={20} />
            </button>
          </div>

          <div className="panel-content">
            {/* Header Info */}
            <div className="detail-section">
              <div className="talk-detail-header">
                {selectedTalk.topic_code && (
                  <span className="topic-code">{selectedTalk.topic_code}</span>
                )}
                <h3>{selectedTalk.topic}</h3>
              </div>
              {selectedTalk.content && (
                <p className="description">{selectedTalk.content}</p>
              )}
            </div>

            {/* Meeting Details */}
            <div className="detail-section">
              <h4>
                <Calendar size={16} />
                Meeting Details
              </h4>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Date</label>
                  <span>{formatDate(selectedTalk.conducted_date)}</span>
                </div>
                <div className="detail-item">
                  <label>Time</label>
                  <span>{formatTime(selectedTalk.conducted_time)}</span>
                </div>
                <div className="detail-item">
                  <label>Duration</label>
                  <span>{selectedTalk.duration_minutes || '—'} minutes</span>
                </div>
                <div className="detail-item">
                  <label>Presenter</label>
                  <span>{selectedTalk.presenter_name || '—'}</span>
                </div>
              </div>
            </div>

            {/* Attendance */}
            <div className="detail-section">
              <h4>
                <Users size={16} />
                Attendance
              </h4>
              <div className="attendance-summary">
                <div className="attendance-stat">
                  <span className="value">{selectedTalk.total_attendees || 0}</span>
                  <span className="label">Total Attendees</span>
                </div>
                <div className="attendance-stat">
                  <span className="value">{selectedTalk.acknowledged_count || 0}</span>
                  <span className="label">Acknowledged</span>
                </div>
                <div className="attendance-stat highlight">
                  <span className="value">{getAttendanceRate(selectedTalk)}%</span>
                  <span className="label">Completion</span>
                </div>
              </div>
            </div>

            {/* Hazards & Safety */}
            {selectedTalk.hazards_discussed && (
              <div className="detail-section">
                <h4>
                  <AlertTriangle size={16} />
                  Hazards Discussed
                </h4>
                <div className="tag-list">
                  {selectedTalk.hazards_discussed.split(',').map((hazard, idx) => (
                    <span key={idx} className="hazard-tag">{hazard.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {selectedTalk.safety_measures && (
              <div className="detail-section">
                <h4>
                  <CheckCircle size={16} />
                  Safety Measures
                </h4>
                <div className="tag-list">
                  {selectedTalk.safety_measures.split(',').map((measure, idx) => (
                    <span key={idx} className="safety-tag">{measure.trim()}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Questions */}
            {selectedTalk.questions_asked && (
              <div className="detail-section">
                <h4>
                  <MessageSquare size={16} />
                  Questions Asked
                </h4>
                <p className="questions-text">{selectedTalk.questions_asked}</p>
              </div>
            )}

            {/* Notes */}
            {selectedTalk.notes && (
              <div className="detail-section">
                <h4>Notes</h4>
                <p className="notes-text">{selectedTalk.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="panel-footer">
              <button className="btn btn-secondary">
                <Download size={16} />
                Export PDF
              </button>
              <button className="btn btn-primary">
                <Users size={16} />
                View Attendees
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Talk Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Record New Toolbox Talk</h2>
              <button className="btn btn-icon" onClick={() => setShowNewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p className="coming-soon">Full talk recording form coming soon!</p>
              <p>The toolbox talk form will include:</p>
              <ul>
                <li>Topic selection from library or custom entry</li>
                <li>Date, time, and duration tracking</li>
                <li>Crew attendance with digital sign-off</li>
                <li>Hazards and safety measures documentation</li>
                <li>Questions and discussion notes</li>
                <li>Photo documentation option</li>
                <li>Automatic attendance tracking via QR code</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
