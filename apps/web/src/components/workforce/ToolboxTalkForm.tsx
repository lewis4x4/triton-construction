// =============================================================================
// Component: ToolboxTalkForm
// Purpose: Document toolbox talks with digital attendance tracking
// Per System Prompt v5.0: Safety meeting documentation with worker sign-offs
// =============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  MessageSquare,
  Users,
  Calendar,
  Clock,
  FileText,
  Check,
  Search,
  Save,
  X,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import './ToolboxTalkForm.css';

interface ToolboxTalkFormProps {
  projectId: string;
  onSave?: (talkId: string) => void;
  onCancel?: () => void;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  trade?: string;
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
  worker: Attendee;
  acknowledged: boolean;
  signature?: string;
}

const TOPICS = [
  { id: 'excavation_safety', label: 'Excavation & Trenching Safety', category: 'High-Risk' },
  { id: 'fall_protection', label: 'Fall Protection', category: 'High-Risk' },
  { id: 'confined_space', label: 'Confined Space Entry', category: 'High-Risk' },
  { id: 'electrical_safety', label: 'Electrical Safety', category: 'High-Risk' },
  { id: 'crane_rigging', label: 'Crane & Rigging Operations', category: 'High-Risk' },
  { id: 'traffic_control', label: 'Traffic Control & Work Zones', category: 'Site-Specific' },
  { id: 'ppe', label: 'Personal Protective Equipment', category: 'General' },
  { id: 'heat_stress', label: 'Heat Stress Prevention', category: 'Seasonal' },
  { id: 'cold_stress', label: 'Cold Weather Safety', category: 'Seasonal' },
  { id: 'housekeeping', label: 'Site Housekeeping', category: 'General' },
  { id: 'hand_tools', label: 'Hand & Power Tool Safety', category: 'General' },
  { id: 'silica', label: 'Silica Dust Exposure', category: 'Health' },
  { id: 'noise', label: 'Noise Exposure & Hearing Protection', category: 'Health' },
  { id: 'manual_handling', label: 'Manual Material Handling', category: 'Ergonomics' },
  { id: 'lockout_tagout', label: 'Lockout/Tagout Procedures', category: 'High-Risk' },
  { id: 'hazcom', label: 'Hazard Communication (GHS)', category: 'Health' },
  { id: 'ladder_safety', label: 'Ladder Safety', category: 'General' },
  { id: 'scaffold_safety', label: 'Scaffold Safety', category: 'High-Risk' },
  { id: 'fire_prevention', label: 'Fire Prevention', category: 'Emergency' },
  { id: 'emergency_procedures', label: 'Emergency Procedures', category: 'Emergency' },
  { id: 'custom', label: 'Custom Topic', category: 'Other' },
];

export const ToolboxTalkForm: React.FC<ToolboxTalkFormProps> = ({
  projectId,
  onSave,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [subWorkers, setSubWorkers] = useState<SubcontractorWorker[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWorkerList, setShowWorkerList] = useState(false);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    topic: '',
    customTopic: '',
    duration: 15,
    content: '',
    hazards_discussed: '',
    safety_measures: '',
    questions_asked: '',
    presenter_name: '',
  });

  const [attendees, setAttendees] = useState<AttendeeRecord[]>([]);

  useEffect(() => {
    loadWorkers();
  }, [projectId]);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      // Get employees assigned to project
      const { data: empData } = await supabase
        .from('employees')
        .select('id, first_name, last_name, trade_classification')
        .eq('status', 'active')
        .order('last_name');

      // Get subcontractor workers on project
      const { data: subData } = await supabase
        .from('subcontractor_workers')
        .select(`
          id,
          first_name,
          last_name,
          subcontractors(company_name)
        `)
        .eq('status', 'active')
        .order('last_name');

      if (empData) {
        setEmployees(empData.map(e => ({
          id: e.id,
          first_name: e.first_name,
          last_name: e.last_name,
          trade: e.trade_classification || undefined,
          type: 'employee' as const,
        })));
      }

      if (subData) {
        setSubWorkers(subData.map(s => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          subcontractor_name: (s.subcontractors as any)?.company_name || 'Unknown Sub',
          type: 'subcontractor' as const,
        })));
      }
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const allWorkers = [...employees, ...subWorkers];

  const filteredWorkers = allWorkers.filter(w => {
    const fullName = `${w.first_name} ${w.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase()) &&
      !attendees.some(a => a.worker.id === w.id && a.worker.type === w.type);
  });

  const addAttendee = (worker: Attendee) => {
    setAttendees(prev => [...prev, { worker, acknowledged: false }]);
    setSearchTerm('');
    setShowWorkerList(false);
  };

  const removeAttendee = (workerId: string, type: string) => {
    setAttendees(prev => prev.filter(a => !(a.worker.id === workerId && a.worker.type === type)));
  };

  const toggleAcknowledgement = (workerId: string, type: string) => {
    setAttendees(prev => prev.map(a => {
      if (a.worker.id === workerId && a.worker.type === type) {
        return { ...a, acknowledged: !a.acknowledged };
      }
      return a;
    }));
  };

  const acknowledgeAll = () => {
    setAttendees(prev => prev.map(a => ({ ...a, acknowledged: true })));
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.topic || attendees.length === 0) {
      alert('Please select a topic and add at least one attendee');
      return;
    }

    setSaving(true);
    try {
      // Create toolbox talk record
      const { data: talk, error: talkError } = await supabase
        .from('toolbox_talks')
        .insert({
          project_id: projectId,
          conducted_date: formData.date,
          conducted_time: formData.time,
          topic: formData.topic === 'custom' ? formData.customTopic : TOPICS.find(t => t.id === formData.topic)?.label,
          topic_code: formData.topic,
          duration_minutes: formData.duration,
          content: formData.content,
          hazards_discussed: formData.hazards_discussed,
          safety_measures: formData.safety_measures,
          questions_asked: formData.questions_asked,
          presenter_name: formData.presenter_name,
          total_attendees: attendees.length,
          acknowledged_count: attendees.filter(a => a.acknowledged).length,
        } as any)
        .select('id')
        .single();

      if (talkError) throw talkError;

      // Create attendance records
      const attendanceRecords = attendees.map(a => ({
        toolbox_talk_id: talk.id,
        employee_id: a.worker.type === 'employee' ? a.worker.id : null,
        subcontractor_worker_id: a.worker.type === 'subcontractor' ? a.worker.id : null,
        acknowledged: a.acknowledged,
        acknowledged_at: a.acknowledged ? new Date().toISOString() : null,
      }));

      const { error: attendanceError } = await supabase
        .from('toolbox_talk_attendance')
        .insert(attendanceRecords);

      if (attendanceError) throw attendanceError;

      onSave?.(talk.id);
    } catch (error) {
      console.error('Error saving toolbox talk:', error);
      alert('Failed to save toolbox talk');
    } finally {
      setSaving(false);
    }
  };

  const acknowledgedCount = attendees.filter(a => a.acknowledged).length;

  if (loading) {
    return (
      <div className="toolbox-form loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="toolbox-form">
      <div className="form-header">
        <div className="header-icon">
          <MessageSquare size={24} />
        </div>
        <div className="header-text">
          <h2>Toolbox Talk</h2>
          <p>Document safety meeting with attendance</p>
        </div>
        {onCancel && (
          <button className="close-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        )}
      </div>

      <div className="form-content">
        {/* Date/Time Section */}
        <div className="form-section">
          <div className="form-grid">
            <div className="form-group">
              <label>
                <Calendar size={14} />
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label>
                <Clock size={14} />
                Time
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Duration (minutes)</label>
              <select
                value={formData.duration}
                onChange={(e) => handleChange('duration', parseInt(e.target.value))}
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
              </select>
            </div>

            <div className="form-group">
              <label>Presenter</label>
              <input
                type="text"
                value={formData.presenter_name}
                onChange={(e) => handleChange('presenter_name', e.target.value)}
                placeholder="Name of presenter"
              />
            </div>
          </div>
        </div>

        {/* Topic Selection */}
        <div className="form-section">
          <h3>
            <FileText size={16} />
            Topic
          </h3>

          <div className="topic-grid">
            {['High-Risk', 'General', 'Health', 'Seasonal', 'Emergency', 'Site-Specific', 'Other'].map(category => {
              const categoryTopics = TOPICS.filter(t => t.category === category);
              if (categoryTopics.length === 0) return null;

              return (
                <div key={category} className="topic-category">
                  <span className="category-label">{category}</span>
                  <div className="topic-buttons">
                    {categoryTopics.map(topic => (
                      <button
                        key={topic.id}
                        className={`topic-btn ${formData.topic === topic.id ? 'selected' : ''} ${category === 'High-Risk' ? 'high-risk' : ''}`}
                        onClick={() => handleChange('topic', topic.id)}
                      >
                        {topic.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {formData.topic === 'custom' && (
            <div className="form-group" style={{ marginTop: 16 }}>
              <label>Custom Topic Title</label>
              <input
                type="text"
                value={formData.customTopic}
                onChange={(e) => handleChange('customTopic', e.target.value)}
                placeholder="Enter custom topic"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="form-section">
          <h3>
            <Shield size={16} />
            Discussion Content
          </h3>

          <div className="form-group">
            <label>Key Points Discussed</label>
            <textarea
              value={formData.content}
              onChange={(e) => handleChange('content', e.target.value)}
              placeholder="Main points covered during the talk..."
              rows={4}
            />
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>
                <AlertTriangle size={14} />
                Hazards Discussed
              </label>
              <textarea
                value={formData.hazards_discussed}
                onChange={(e) => handleChange('hazards_discussed', e.target.value)}
                placeholder="List hazards identified..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Safety Measures</label>
              <textarea
                value={formData.safety_measures}
                onChange={(e) => handleChange('safety_measures', e.target.value)}
                placeholder="Protective measures to be taken..."
                rows={3}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Questions / Discussion</label>
            <textarea
              value={formData.questions_asked}
              onChange={(e) => handleChange('questions_asked', e.target.value)}
              placeholder="Questions asked or points raised by attendees..."
              rows={2}
            />
          </div>
        </div>

        {/* Attendance */}
        <div className="form-section">
          <div className="section-header">
            <h3>
              <Users size={16} />
              Attendance ({attendees.length})
            </h3>
            {attendees.length > 0 && (
              <button className="acknowledge-all-btn" onClick={acknowledgeAll}>
                <Check size={14} />
                Acknowledge All
              </button>
            )}
          </div>

          {/* Worker Search */}
          <div className="worker-search">
            <div className="search-input">
              <Search size={16} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowWorkerList(true);
                }}
                onFocus={() => setShowWorkerList(true)}
                placeholder="Search workers to add..."
              />
            </div>

            {showWorkerList && filteredWorkers.length > 0 && (
              <div className="worker-dropdown">
                {filteredWorkers.slice(0, 10).map(worker => (
                  <div
                    key={`${worker.type}-${worker.id}`}
                    className="worker-option"
                    onClick={() => addAttendee(worker)}
                  >
                    <span className="worker-name">
                      {worker.first_name} {worker.last_name}
                    </span>
                    <span className={`worker-type ${worker.type}`}>
                      {worker.type === 'employee'
                        ? (worker as Employee).trade || 'Employee'
                        : (worker as SubcontractorWorker).subcontractor_name
                      }
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendee List */}
          {attendees.length > 0 ? (
            <div className="attendee-list">
              {attendees.map((attendee, idx) => (
                <div key={`${attendee.worker.type}-${attendee.worker.id}`} className="attendee-item">
                  <span className="attendee-number">{idx + 1}</span>
                  <div className="attendee-info">
                    <span className="attendee-name">
                      {attendee.worker.first_name} {attendee.worker.last_name}
                    </span>
                    <span className={`attendee-type ${attendee.worker.type}`}>
                      {attendee.worker.type === 'employee'
                        ? (attendee.worker as Employee).trade || 'Employee'
                        : (attendee.worker as SubcontractorWorker).subcontractor_name
                      }
                    </span>
                  </div>
                  <button
                    className={`acknowledge-btn ${attendee.acknowledged ? 'acknowledged' : ''}`}
                    onClick={() => toggleAcknowledgement(attendee.worker.id, attendee.worker.type)}
                  >
                    {attendee.acknowledged ? (
                      <>
                        <Check size={14} />
                        Acknowledged
                      </>
                    ) : (
                      'Tap to Acknowledge'
                    )}
                  </button>
                  <button
                    className="remove-btn"
                    onClick={() => removeAttendee(attendee.worker.id, attendee.worker.type)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-attendees">
              <Users size={24} />
              <p>No attendees added yet</p>
              <span>Search and add workers above</span>
            </div>
          )}

          {/* Attendance Summary */}
          {attendees.length > 0 && (
            <div className="attendance-summary">
              <div className="summary-item">
                <span className="summary-value">{attendees.length}</span>
                <span className="summary-label">Total</span>
              </div>
              <div className="summary-item acknowledged">
                <span className="summary-value">{acknowledgedCount}</span>
                <span className="summary-label">Acknowledged</span>
              </div>
              <div className="summary-item pending">
                <span className="summary-value">{attendees.length - acknowledgedCount}</span>
                <span className="summary-label">Pending</span>
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
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving || !formData.topic || attendees.length === 0}
        >
          {saving ? 'Saving...' : 'Save Toolbox Talk'}
          <Save size={16} />
        </button>
      </div>
    </div>
  );
};

export default ToolboxTalkForm;
