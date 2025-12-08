// =============================================================================
// Page: TrainingDashboard
// Purpose: Manage training programs, sessions, and certification tracking
// Part of Safety Compliance Enforcement System - "The Gatekeeper"
// =============================================================================

import { useState, useEffect } from 'react';
import {
  GraduationCap,
  Plus,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Award,
  ChevronRight,
  Search,
  Filter,
  RefreshCw,
  Building2,
  User,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { TrainingSessionForm } from '../../components/training/TrainingSessionForm';
import './TrainingDashboard.css';

interface TrainingProgram {
  id: string;
  name: string;
  program_code: string | null;
  provider_type: 'internal' | 'external' | 'hybrid';
  default_duration_hours: number | null;
  recurrence_interval_months: number | null;
  is_active: boolean;
  certifications: { code: string; name: string }[];
}

interface TrainingSession {
  id: string;
  session_number: string;
  program_id: string;
  program_name: string;
  instructor_name: string;
  session_date: string;
  session_time: string | null;
  duration_hours: number | null;
  location: string | null;
  project_name: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  attendee_count: number;
  present_count: number;
}

interface ExpiringCertification {
  id: string;
  employee_name: string;
  certification_name: string;
  expires_at: string;
  days_until_expiry: number;
}

interface TrainingStats {
  totalPrograms: number;
  activePrograms: number;
  upcomingSessions: number;
  completedThisMonth: number;
  totalCertificationsGranted: number;
  expiringCertifications: number;
}

export function TrainingDashboard() {
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [expiringCerts, setExpiringCerts] = useState<ExpiringCertification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'programs' | 'certifications'>('sessions');
  const [showSessionForm, setShowSessionForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadPrograms(),
        loadSessions(),
        loadExpiringCertifications(),
      ]);
    } catch (error) {
      console.error('Error loading training data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];

    const [
      { count: totalPrograms },
      { count: activePrograms },
      { count: upcomingSessions },
      { count: completedThisMonth },
      { count: expiringCerts },
    ] = await Promise.all([
      supabase.from('training_programs').select('*', { count: 'exact', head: true }),
      supabase.from('training_programs').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('training_sessions').select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled').gte('session_date', today),
      supabase.from('training_sessions').select('*', { count: 'exact', head: true })
        .eq('status', 'completed').gte('session_date', startOfMonth),
      supabase.from('employee_certifications').select('*', { count: 'exact', head: true })
        .lte('expires_at', thirtyDaysFromNow).gte('expires_at', today).eq('status', 'active'),
    ]);

    setStats({
      totalPrograms: totalPrograms || 0,
      activePrograms: activePrograms || 0,
      upcomingSessions: upcomingSessions || 0,
      completedThisMonth: completedThisMonth || 0,
      totalCertificationsGranted: 0, // Would need aggregation
      expiringCertifications: expiringCerts || 0,
    });
  };

  const loadPrograms = async () => {
    const { data } = await supabase
      .from('training_programs')
      .select(`
        id, name, program_code, provider_type,
        default_duration_hours, recurrence_interval_months, is_active,
        training_program_certifications (
          certification_types (code, name)
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setPrograms(data.map(p => ({
        ...p,
        provider_type: p.provider_type as 'internal' | 'external' | 'hybrid',
        certifications: (p.training_program_certifications || []).map((tpc: any) => ({
          code: tpc.certification_types?.code,
          name: tpc.certification_types?.name,
        })).filter((c: any) => c.code),
      })));
    }
  };

  const loadSessions = async () => {
    const { data } = await supabase
      .from('training_sessions')
      .select(`
        id, session_number, program_id, instructor_name,
        session_date, session_time, duration_hours, location, status,
        training_programs (name),
        projects (name)
      `)
      .order('session_date', { ascending: false })
      .limit(50);

    if (data) {
      // Get attendee counts
      const sessionIds = data.map(s => s.id);
      const { data: attendeeCounts } = await supabase
        .from('training_session_attendees')
        .select('session_id, attendance_status')
        .in('session_id', sessionIds);

      const countsBySession = (attendeeCounts || []).reduce((acc: any, a) => {
        if (!acc[a.session_id]) {
          acc[a.session_id] = { total: 0, present: 0 };
        }
        acc[a.session_id].total++;
        if (a.attendance_status === 'present') {
          acc[a.session_id].present++;
        }
        return acc;
      }, {});

      setSessions(data.map(s => ({
        id: s.id,
        session_number: s.session_number,
        program_id: s.program_id,
        program_name: (s.training_programs as any)?.name || 'Unknown Program',
        instructor_name: s.instructor_name,
        session_date: s.session_date,
        session_time: s.session_time,
        duration_hours: s.duration_hours,
        location: s.location,
        project_name: (s.projects as any)?.name || null,
        status: s.status,
        attendee_count: countsBySession[s.id]?.total || 0,
        present_count: countsBySession[s.id]?.present || 0,
      })));
    }
  };

  const loadExpiringCertifications = async () => {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('employee_certifications')
      .select(`
        id, certification_name, expires_at,
        employees (first_name, last_name, display_name)
      `)
      .lte('expires_at', thirtyDaysFromNow)
      .gte('expires_at', today)
      .eq('status', 'active')
      .order('expires_at')
      .limit(10);

    if (data) {
      setExpiringCerts(data.map(c => ({
        id: c.id,
        employee_name: (c.employees as any)?.display_name ||
          `${(c.employees as any)?.first_name} ${(c.employees as any)?.last_name}`,
        certification_name: c.certification_name || '',
        expires_at: c.expires_at || '',
        days_until_expiry: Math.ceil(
          (new Date(c.expires_at || '').getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ),
      })));
    }
  };

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.session_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.program_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.instructor_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'blue';
      case 'in_progress': return 'orange';
      case 'completed': return 'green';
      case 'cancelled': return 'gray';
      default: return 'gray';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    const hours = parts[0] || '0';
    const minutes = parts[1] || '00';
    const h = parseInt(hours, 10);
    return `${h > 12 ? h - 12 : h}:${minutes} ${h >= 12 ? 'PM' : 'AM'}`;
  };

  const handleSessionCreated = () => {
    setShowSessionForm(false);
    loadDashboardData();
  };

  if (isLoading) {
    return (
      <div className="training-dashboard loading">
        <div className="loading-spinner" />
        <p>Loading training data...</p>
      </div>
    );
  }

  if (showSessionForm) {
    return (
      <TrainingSessionForm
        sessionId={selectedSession}
        onSave={handleSessionCreated}
        onCancel={() => {
          setShowSessionForm(false);
          setSelectedSession(null);
        }}
      />
    );
  }

  return (
    <div className="training-dashboard">
      <header className="td-header">
        <div className="header-title">
          <GraduationCap size={32} />
          <div>
            <h1>Training Management</h1>
            <p>Schedule training sessions and track certifications</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn btn-secondary" onClick={loadDashboardData}>
            <RefreshCw size={18} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowSessionForm(true)}>
            <Plus size={18} />
            New Session
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card programs">
          <div className="stat-icon">
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.activePrograms || 0}</div>
            <div className="stat-label">Active Programs</div>
          </div>
        </div>

        <div className="stat-card sessions">
          <div className="stat-icon">
            <Calendar size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.upcomingSessions || 0}</div>
            <div className="stat-label">Upcoming Sessions</div>
          </div>
        </div>

        <div className="stat-card completed">
          <div className="stat-icon">
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.completedThisMonth || 0}</div>
            <div className="stat-label">Completed This Month</div>
          </div>
        </div>

        <div className="stat-card expiring">
          <div className="stat-icon">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats?.expiringCertifications || 0}</div>
            <div className="stat-label">Certs Expiring Soon</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="td-tabs">
        <button
          className={`tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          <Calendar size={18} />
          Training Sessions
        </button>
        <button
          className={`tab ${activeTab === 'programs' ? 'active' : ''}`}
          onClick={() => setActiveTab('programs')}
        >
          <FileText size={18} />
          Programs
        </button>
        <button
          className={`tab ${activeTab === 'certifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('certifications')}
        >
          <Award size={18} />
          Expiring Certs
        </button>
      </div>

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <div className="td-content">
          <div className="content-header">
            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <Filter size={18} />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="sessions-list">
            {filteredSessions.length === 0 ? (
              <div className="empty-state">
                <Calendar size={48} />
                <h3>No training sessions found</h3>
                <p>Create a new session to get started</p>
                <button className="btn btn-primary" onClick={() => setShowSessionForm(true)}>
                  <Plus size={18} />
                  New Session
                </button>
              </div>
            ) : (
              filteredSessions.map(session => (
                <div
                  key={session.id}
                  className="session-card"
                  onClick={() => {
                    setSelectedSession(session.id);
                    setShowSessionForm(true);
                  }}
                >
                  <div className="session-header">
                    <span className="session-number">{session.session_number}</span>
                    <span className={`status-badge ${getStatusColor(session.status)}`}>
                      {session.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="session-title">{session.program_name}</div>
                  <div className="session-details">
                    <div className="detail">
                      <Calendar size={14} />
                      {formatDate(session.session_date)}
                      {session.session_time && ` at ${formatTime(session.session_time)}`}
                    </div>
                    <div className="detail">
                      <User size={14} />
                      {session.instructor_name}
                    </div>
                    {session.location && (
                      <div className="detail">
                        <Building2 size={14} />
                        {session.location}
                      </div>
                    )}
                    <div className="detail">
                      <Users size={14} />
                      {session.present_count}/{session.attendee_count} attended
                    </div>
                    {session.duration_hours && (
                      <div className="detail">
                        <Clock size={14} />
                        {session.duration_hours}h
                      </div>
                    )}
                  </div>
                  {session.project_name && (
                    <div className="session-project">
                      Project: {session.project_name}
                    </div>
                  )}
                  <ChevronRight className="chevron" size={20} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Programs Tab */}
      {activeTab === 'programs' && (
        <div className="td-content">
          <div className="programs-grid">
            {programs.map(program => (
              <div key={program.id} className="program-card">
                <div className="program-header">
                  <span className={`provider-badge ${program.provider_type}`}>
                    {program.provider_type}
                  </span>
                  {program.program_code && (
                    <span className="program-code">{program.program_code}</span>
                  )}
                </div>
                <div className="program-name">{program.name}</div>
                <div className="program-meta">
                  {program.default_duration_hours && (
                    <span className="meta-item">
                      <Clock size={14} />
                      {program.default_duration_hours}h
                    </span>
                  )}
                  {program.recurrence_interval_months && (
                    <span className="meta-item">
                      <RefreshCw size={14} />
                      Every {program.recurrence_interval_months}mo
                    </span>
                  )}
                </div>
                {program.certifications.length > 0 && (
                  <div className="program-certs">
                    <span className="certs-label">Grants:</span>
                    <div className="cert-badges">
                      {program.certifications.map(cert => (
                        <span key={cert.code} className="cert-badge">
                          <Award size={12} />
                          {cert.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedSession(null);
                    setShowSessionForm(true);
                  }}
                >
                  Schedule Session
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expiring Certifications Tab */}
      {activeTab === 'certifications' && (
        <div className="td-content">
          {expiringCerts.length === 0 ? (
            <div className="empty-state">
              <CheckCircle size={48} />
              <h3>No certifications expiring soon</h3>
              <p>All certifications are current for the next 30 days</p>
            </div>
          ) : (
            <div className="expiring-list">
              {expiringCerts.map(cert => (
                <div
                  key={cert.id}
                  className={`expiring-item ${cert.days_until_expiry <= 7 ? 'urgent' : ''}`}
                >
                  <div className="expiring-icon">
                    <AlertTriangle size={20} />
                  </div>
                  <div className="expiring-info">
                    <div className="expiring-name">{cert.employee_name}</div>
                    <div className="expiring-cert">{cert.certification_name}</div>
                  </div>
                  <div className="expiring-date">
                    <span className={`days-badge ${cert.days_until_expiry <= 7 ? 'critical' : 'warning'}`}>
                      {cert.days_until_expiry}d
                    </span>
                    <span className="date-text">{formatDate(cert.expires_at)}</span>
                  </div>
                  <button className="btn btn-secondary btn-sm">
                    Schedule Training
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default TrainingDashboard;
