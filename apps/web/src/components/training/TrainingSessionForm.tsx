// =============================================================================
// Component: TrainingSessionForm
// Purpose: Create and manage training sessions with attendance tracking
// Part of Safety Compliance Enforcement System - "The Gatekeeper"
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Calendar,
  Clock,
  User,
  Users,
  MapPin,
  Building2,
  Save,
  X,
  Search,
  Check,
  CheckCircle,
  AlertTriangle,
  Award,
  FileText,
  Play,
  Square,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './TrainingSessionForm.css';

interface TrainingSessionFormProps {
  sessionId?: string | null;
  onSave?: (sessionId: string) => void;
  onCancel?: () => void;
}

interface TrainingProgram {
  id: string;
  name: string;
  program_code: string | null;
  provider_type: string;
  default_duration_hours: number | null;
  recurrence_interval_months: number | null;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  trade_classification: string | null;
  type: 'employee';
}

interface SubcontractorWorker {
  id: string;
  first_name: string;
  last_name: string;
  subcontractor_name: string;
  type: 'subcontractor';
}

type Attendee = Employee | SubcontractorWorker;

interface AttendeeRecord {
  id?: string;
  worker: Attendee;
  attendance_status: 'registered' | 'present' | 'absent' | 'excused' | 'no_show';
  signed_at?: string;
}

interface SessionFormData {
  program_id: string;
  instructor_name: string;
  instructor_credentials: string;
  session_date: string;
  session_time: string;
  duration_hours: string;
  location: string;
  project_id: string;
  notes: string;
}

export const TrainingSessionForm: React.FC<TrainingSessionFormProps> = ({
  sessionId,
  onSave,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [programs, setPrograms] = useState<TrainingProgram[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [subWorkers, setSubWorkers] = useState<SubcontractorWorker[]>([]);
  const [sessionStatus, setSessionStatus] = useState<string>('scheduled');
  const [sessionNumber, setSessionNumber] = useState<string>('');

  const [formData, setFormData] = useState<SessionFormData>({
    program_id: '',
    instructor_name: '',
    instructor_credentials: '',
    session_date: new Date().toISOString().split('T')[0],
    session_time: '07:00',
    duration_hours: '',
    location: '',
    project_id: '',
    notes: '',
  });

  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

  const isEditing = !!sessionId;
  const isCompleted = sessionStatus === 'completed';

  useEffect(() => {
    loadInitialData();
  }, [sessionId]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPrograms(),
        loadProjects(),
        loadWorkers(),
      ]);

      if (sessionId) {
        await loadSession(sessionId);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    const { data } = await supabase
      .from('training_programs')
      .select('id, name, program_code, provider_type, default_duration_hours, recurrence_interval_months')
      .eq('is_active', true)
      .order('name');

    if (data) setPrograms(data);
  };

  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, project_number')
      .eq('status', 'active')
      .order('name');

    if (data) setProjects(data);
  };

  const loadWorkers = async () => {
    const [empResult, subResult] = await Promise.all([
      supabase
        .from('employees')
        .select('id, first_name, last_name, display_name, trade_classification')
        .eq('employment_status', 'active')
        .is('deleted_at', null)
        .order('last_name'),
      supabase
        .from('subcontractor_workers')
        .select('id, first_name, last_name, subcontractors(company_name)')
        .eq('status', 'active')
        .order('last_name'),
    ]);

    if (empResult.data) {
      setEmployees(empResult.data.map(e => ({ ...e, type: 'employee' as const })));
    }
    if (subResult.data) {
      setSubWorkers(subResult.data.map(s => ({
        id: s.id,
        first_name: s.first_name,
        last_name: s.last_name,
        subcontractor_name: (s.subcontractors as any)?.company_name || 'Unknown Sub',
        type: 'subcontractor' as const,
      })));
    }
  };

  const loadSession = async (id: string) => {
    const { data: session } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', id)
      .single();

    if (session) {
      setSessionStatus(session.status);
      setSessionNumber(session.session_number);
      setFormData({
        program_id: session.program_id,
        instructor_name: session.instructor_name,
        instructor_credentials: session.instructor_credentials || '',
        session_date: session.session_date,
        session_time: session.session_time || '07:00',
        duration_hours: session.duration_hours?.toString() || '',
        location: session.location || '',
        project_id: session.project_id || '',
        notes: session.notes || '',
      });

      // Load attendees
      const { data: attendeesData } = await supabase
        .from('training_session_attendees')
        .select(`
          id, attendance_status, signed_at,
          employee_id, subcontractor_worker_id,
          employees (id, first_name, last_name, display_name, trade_classification),
          subcontractor_workers (id, first_name, last_name, subcontractors(company_name))
        `)
        .eq('session_id', id);

      if (attendeesData) {
        const loadedAttendees: AttendeeRecord[] = attendeesData.map(a => {
          if (a.employee_id && a.employees) {
            const emp = a.employees as any;
            return {
              id: a.id,
              worker: {
                id: emp.id,
                first_name: emp.first_name,
                last_name: emp.last_name,
                display_name: emp.display_name,
                trade_classification: emp.trade_classification,
                type: 'employee' as const,
              },
              attendance_status: a.attendance_status,
              signed_at: a.signed_at,
            };
          } else if (a.subcontractor_worker_id && a.subcontractor_workers) {
            const sub = a.subcontractor_workers as any;
            return {
              id: a.id,
              worker: {
                id: sub.id,
                first_name: sub.first_name,
                last_name: sub.last_name,
                subcontractor_name: sub.subcontractors?.company_name || 'Unknown',
                type: 'subcontractor' as const,
              },
              attendance_status: a.attendance_status,
              signed_at: a.signed_at,
            };
          }
          return null;
        }).filter(Boolean) as AttendeeRecord[];

        setAttendees(loadedAttendees);
      }
    }
  };

  const handleChange = (field: keyof SessionFormData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };

      // Auto-fill duration when program changes
      if (field === 'program_id') {
        const program = programs.find(p => p.id === value);
        if (program?.default_duration_hours) {
          updated.duration_hours = program.default_duration_hours.toString();
        }
      }

      return updated;
    });
  };

  const allWorkers = [...employees, ...subWorkers];

  const filteredWorkers = allWorkers.filter(w => {
    const name = w.type === 'employee'
      ? (w as Employee).display_name || `${w.first_name} ${w.last_name}`
      : `${w.first_name} ${w.last_name}`;
    return name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !attendees.some(a => a.worker.id === w.id && a.worker.type === w.type);
  });

  const addAttendee = (worker: Attendee) => {
    setAttendees(prev => [...prev, {
      worker,
      attendance_status: 'registered',
    }]);
    setSearchTerm('');
    setShowWorkerDropdown(false);
  };

  const removeAttendee = (workerId: string, type: string) => {
    setAttendees(prev => prev.filter(a =>
      !(a.worker.id === workerId && a.worker.type === type)
    ));
  };

  const updateAttendeeStatus = (workerId: string, type: string, status: AttendeeRecord['attendance_status']) => {
    setAttendees(prev => prev.map(a => {
      if (a.worker.id === workerId && a.worker.type === type) {
        return {
          ...a,
          attendance_status: status,
          signed_at: status === 'present' ? new Date().toISOString() : a.signed_at,
        };
      }
      return a;
    }));
  };

  const markAllPresent = () => {
    setAttendees(prev => prev.map(a => ({
      ...a,
      attendance_status: 'present',
      signed_at: new Date().toISOString(),
    })));
  };

  const handleSave = async () => {
    if (!formData.program_id || !formData.instructor_name || !formData.session_date) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      let sessionIdToUse = sessionId;

      if (isEditing && sessionId) {
        // Update existing session
        const { error } = await supabase
          .from('training_sessions')
          .update({
            program_id: formData.program_id,
            instructor_name: formData.instructor_name,
            instructor_credentials: formData.instructor_credentials || null,
            session_date: formData.session_date,
            session_time: formData.session_time || null,
            duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : null,
            location: formData.location || null,
            project_id: formData.project_id || null,
            notes: formData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);

        if (error) throw error;
      } else {
        // Create new session
        const { data: session, error } = await supabase
          .from('training_sessions')
          .insert({
            program_id: formData.program_id,
            instructor_name: formData.instructor_name,
            instructor_credentials: formData.instructor_credentials || null,
            session_date: formData.session_date,
            session_time: formData.session_time || null,
            duration_hours: formData.duration_hours ? parseFloat(formData.duration_hours) : null,
            location: formData.location || null,
            project_id: formData.project_id || null,
            notes: formData.notes || null,
            status: 'scheduled',
          })
          .select('id')
          .single();

        if (error) throw error;
        sessionIdToUse = session.id;
      }

      // Sync attendees
      if (sessionIdToUse) {
        // Delete removed attendees
        if (isEditing) {
          await supabase
            .from('training_session_attendees')
            .delete()
            .eq('session_id', sessionIdToUse);
        }

        // Insert all attendees
        if (attendees.length > 0) {
          const attendeeRecords = attendees.map(a => ({
            session_id: sessionIdToUse,
            employee_id: a.worker.type === 'employee' ? a.worker.id : null,
            subcontractor_worker_id: a.worker.type === 'subcontractor' ? a.worker.id : null,
            attendance_status: a.attendance_status,
            acknowledged_at: a.attendance_status === 'present' ? a.signed_at || new Date().toISOString() : null,
            signed_at: a.signed_at || null,
          }));

          const { error: attendeeError } = await supabase
            .from('training_session_attendees')
            .insert(attendeeRecords);

          if (attendeeError) throw attendeeError;
        }
      }

      onSave?.(sessionIdToUse!);
    } catch (error) {
      console.error('Error saving session:', error);
      alert('Failed to save training session');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    if (!sessionId) return;

    const presentCount = attendees.filter(a => a.attendance_status === 'present').length;
    if (presentCount === 0) {
      alert('At least one attendee must be marked as present to complete the session');
      return;
    }

    if (!confirm(`Complete this session? ${presentCount} attendees will receive certifications.`)) {
      return;
    }

    setCompleting(true);
    try {
      // First save any pending changes
      await handleSave();

      // Call the complete-training-session edge function
      const { data, error } = await supabase.functions.invoke('complete-training-session', {
        body: { session_id: sessionId },
      });

      if (error) throw error;

      alert(`Session completed! ${data.certifications_granted} certifications granted.`);
      onSave?.(sessionId);
    } catch (error) {
      console.error('Error completing session:', error);
      alert('Failed to complete session');
    } finally {
      setCompleting(false);
    }
  };

  const selectedProgram = programs.find(p => p.id === formData.program_id);
  const presentCount = attendees.filter(a => a.attendance_status === 'present').length;

  if (loading) {
    return (
      <div className="session-form loading">
        <Loader2 className="spinner" size={32} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="session-form">
      <div className="form-header">
        <div className="header-icon">
          <GraduationCap size={28} />
        </div>
        <div className="header-text">
          <h2>{isEditing ? 'Edit Training Session' : 'New Training Session'}</h2>
          {sessionNumber && (
            <span className="session-number">{sessionNumber}</span>
          )}
          {isEditing && (
            <span className={`status-badge ${sessionStatus}`}>
              {sessionStatus.replace('_', ' ')}
            </span>
          )}
        </div>
        {onCancel && (
          <button className="close-btn" onClick={onCancel}>
            <X size={24} />
          </button>
        )}
      </div>

      <div className="form-body">
        {/* Program Selection */}
        <div className="form-section">
          <h3>
            <FileText size={18} />
            Training Program
          </h3>
          <div className="form-group">
            <label>Program *</label>
            <select
              value={formData.program_id}
              onChange={(e) => handleChange('program_id', e.target.value)}
              disabled={isCompleted}
            >
              <option value="">Select a program...</option>
              {programs.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.program_code && `(${p.program_code})`}
                </option>
              ))}
            </select>
          </div>
          {selectedProgram && (
            <div className="program-info">
              <span className={`provider-badge ${selectedProgram.provider_type}`}>
                {selectedProgram.provider_type}
              </span>
              {selectedProgram.default_duration_hours && (
                <span className="info-item">
                  <Clock size={14} />
                  {selectedProgram.default_duration_hours}h default
                </span>
              )}
              {selectedProgram.recurrence_interval_months && (
                <span className="info-item">
                  Recurs every {selectedProgram.recurrence_interval_months} months
                </span>
              )}
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="form-section">
          <h3>
            <Calendar size={18} />
            Schedule
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={formData.session_date}
                onChange={(e) => handleChange('session_date', e.target.value)}
                disabled={isCompleted}
              />
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="time"
                value={formData.session_time}
                onChange={(e) => handleChange('session_time', e.target.value)}
                disabled={isCompleted}
              />
            </div>
            <div className="form-group">
              <label>Duration (hours)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="40"
                value={formData.duration_hours}
                onChange={(e) => handleChange('duration_hours', e.target.value)}
                placeholder="e.g., 2"
                disabled={isCompleted}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>
                <MapPin size={14} />
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Training room, job site, etc."
                disabled={isCompleted}
              />
            </div>
            <div className="form-group">
              <label>
                <Building2 size={14} />
                Project (optional)
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => handleChange('project_id', e.target.value)}
                disabled={isCompleted}
              >
                <option value="">Company-wide</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.project_number} - {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Instructor */}
        <div className="form-section">
          <h3>
            <User size={18} />
            Instructor
          </h3>
          <div className="form-row">
            <div className="form-group">
              <label>Instructor Name *</label>
              <input
                type="text"
                value={formData.instructor_name}
                onChange={(e) => handleChange('instructor_name', e.target.value)}
                placeholder="Full name"
                disabled={isCompleted}
              />
            </div>
            <div className="form-group">
              <label>Credentials</label>
              <input
                type="text"
                value={formData.instructor_credentials}
                onChange={(e) => handleChange('instructor_credentials', e.target.value)}
                placeholder="e.g., OSHA Authorized Trainer #12345"
                disabled={isCompleted}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="form-section">
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="Additional notes about the session..."
              rows={3}
              disabled={isCompleted}
            />
          </div>
        </div>

        {/* Attendees */}
        <div className="form-section attendees-section">
          <div className="section-header">
            <h3>
              <Users size={18} />
              Attendees ({attendees.length})
            </h3>
            {!isCompleted && attendees.length > 0 && (
              <button className="btn btn-sm btn-secondary" onClick={markAllPresent}>
                <CheckCircle size={14} />
                Mark All Present
              </button>
            )}
          </div>

          {/* Worker Search */}
          {!isCompleted && (
            <div className="worker-search">
              <div className="search-input">
                <Search size={16} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowWorkerDropdown(true);
                  }}
                  onFocus={() => setShowWorkerDropdown(true)}
                  placeholder="Search workers to add..."
                />
                <ChevronDown size={16} />
              </div>

              {showWorkerDropdown && filteredWorkers.length > 0 && (
                <div className="worker-dropdown">
                  {filteredWorkers.slice(0, 15).map(worker => (
                    <div
                      key={`${worker.type}-${worker.id}`}
                      className="worker-option"
                      onClick={() => addAttendee(worker)}
                    >
                      <span className="worker-name">
                        {worker.type === 'employee'
                          ? (worker as Employee).display_name || `${worker.first_name} ${worker.last_name}`
                          : `${worker.first_name} ${worker.last_name}`
                        }
                      </span>
                      <span className={`worker-type ${worker.type}`}>
                        {worker.type === 'employee'
                          ? (worker as Employee).trade_classification || 'Employee'
                          : (worker as SubcontractorWorker).subcontractor_name
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Attendee List */}
          {attendees.length > 0 ? (
            <div className="attendee-list">
              {attendees.map((attendee, idx) => (
                <div key={`${attendee.worker.type}-${attendee.worker.id}`} className="attendee-row">
                  <span className="attendee-num">{idx + 1}</span>
                  <div className="attendee-info">
                    <span className="attendee-name">
                      {attendee.worker.type === 'employee'
                        ? (attendee.worker as Employee).display_name ||
                          `${attendee.worker.first_name} ${attendee.worker.last_name}`
                        : `${attendee.worker.first_name} ${attendee.worker.last_name}`
                      }
                    </span>
                    <span className={`attendee-type ${attendee.worker.type}`}>
                      {attendee.worker.type === 'employee'
                        ? (attendee.worker as Employee).trade_classification || 'Employee'
                        : (attendee.worker as SubcontractorWorker).subcontractor_name
                      }
                    </span>
                  </div>
                  {!isCompleted ? (
                    <div className="attendee-actions">
                      <select
                        value={attendee.attendance_status}
                        onChange={(e) => updateAttendeeStatus(
                          attendee.worker.id,
                          attendee.worker.type,
                          e.target.value as AttendeeRecord['attendance_status']
                        )}
                        className={`status-select ${attendee.attendance_status}`}
                      >
                        <option value="registered">Registered</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="excused">Excused</option>
                        <option value="no_show">No Show</option>
                      </select>
                      <button
                        className="remove-btn"
                        onClick={() => removeAttendee(attendee.worker.id, attendee.worker.type)}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <div className={`attendance-badge ${attendee.attendance_status}`}>
                      {attendee.attendance_status === 'present' && <CheckCircle size={14} />}
                      {attendee.attendance_status}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="no-attendees">
              <Users size={32} />
              <p>No attendees added yet</p>
              <span>Search workers above to add them to this session</span>
            </div>
          )}

          {/* Attendance Summary */}
          {attendees.length > 0 && (
            <div className="attendance-summary">
              <div className="summary-item total">
                <span className="value">{attendees.length}</span>
                <span className="label">Total</span>
              </div>
              <div className="summary-item present">
                <span className="value">{presentCount}</span>
                <span className="label">Present</span>
              </div>
              <div className="summary-item absent">
                <span className="value">{attendees.filter(a => a.attendance_status === 'absent' || a.attendance_status === 'no_show').length}</span>
                <span className="label">Absent</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="form-actions">
        {onCancel && (
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <div className="action-group">
          {!isCompleted && (
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving || !formData.program_id || !formData.instructor_name}
            >
              {saving ? <Loader2 className="spinner" size={16} /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Session'}
            </button>
          )}
          {isEditing && sessionStatus !== 'completed' && sessionStatus !== 'cancelled' && (
            <button
              className="btn btn-success"
              onClick={handleComplete}
              disabled={completing || presentCount === 0}
              title={presentCount === 0 ? 'Mark at least one attendee as present' : 'Complete session and grant certifications'}
            >
              {completing ? <Loader2 className="spinner" size={16} /> : <Award size={16} />}
              Complete & Grant Certs
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrainingSessionForm;
