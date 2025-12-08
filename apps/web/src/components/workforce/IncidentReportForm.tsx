// =============================================================================
// Component: IncidentReportForm
// Purpose: OSHA-compliant incident reporting with classification workflow
// Per System Prompt v5.0: Safety incident management with proper classifications
// =============================================================================

import React, { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import {
  AlertTriangle,
  User,
  Calendar,
  MapPin,
  Clock,
  FileText,
  Camera,
  Save,
  X,
  AlertCircle,
  Shield,
  Clipboard,
  Users,
  ChevronRight,
} from 'lucide-react';
import './IncidentReportForm.css';

interface IncidentReportFormProps {
  projectId: string;
  onSave?: (incidentId: string) => void;
  onCancel?: () => void;
  existingIncident?: Incident | null;
}

interface Incident {
  id?: string;
  project_id: string;
  incident_number?: string;
  incident_date: string;
  incident_time: string;
  location_description: string;
  classification: 'recordable_injury' | 'first_aid_only' | 'near_miss' | 'property_damage' | 'environmental';
  severity: 'minor' | 'moderate' | 'serious' | 'fatal';
  description: string;
  immediate_actions: string;
  root_cause?: string;
  corrective_actions?: string;
  witnesses?: string[];
  injured_party_name?: string;
  injured_party_type?: 'employee' | 'subcontractor' | 'visitor' | 'public';
  injury_description?: string;
  body_part_affected?: string;
  treatment_provided?: string;
  medical_attention_required: boolean;
  lost_time: boolean;
  days_away?: number;
  restricted_duty_days?: number;
  osha_recordable: boolean;
  reported_by_id?: string;
  supervisor_notified: boolean;
  safety_director_notified: boolean;
  status: 'open' | 'investigating' | 'corrective_action' | 'closed';
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

interface Project {
  id: string;
  name: string;
  project_number: string;
}

const CLASSIFICATIONS = [
  { value: 'near_miss', label: 'Near Miss', color: '#3b82f6', description: 'Close call, no injury' },
  { value: 'first_aid_only', label: 'First Aid Only', color: '#f59e0b', description: 'Minor injury, on-site treatment' },
  { value: 'recordable_injury', label: 'Recordable Injury', color: '#dc2626', description: 'OSHA recordable incident' },
  { value: 'property_damage', label: 'Property Damage', color: '#8b5cf6', description: 'Equipment or property damage' },
  { value: 'environmental', label: 'Environmental', color: '#10b981', description: 'Spill or environmental release' },
];

const SEVERITY_LEVELS = [
  { value: 'minor', label: 'Minor', color: '#10b981' },
  { value: 'moderate', label: 'Moderate', color: '#f59e0b' },
  { value: 'serious', label: 'Serious', color: '#f97316' },
  { value: 'fatal', label: 'Fatal', color: '#dc2626' },
];

const BODY_PARTS = [
  'Head', 'Eye(s)', 'Ear(s)', 'Face', 'Neck',
  'Shoulder', 'Upper Arm', 'Elbow', 'Forearm', 'Wrist', 'Hand', 'Finger(s)',
  'Chest', 'Back - Upper', 'Back - Lower', 'Abdomen',
  'Hip', 'Thigh', 'Knee', 'Lower Leg', 'Ankle', 'Foot', 'Toe(s)',
  'Multiple Body Parts', 'Internal Organs', 'Other',
];

export const IncidentReportForm: React.FC<IncidentReportFormProps> = ({
  projectId,
  onSave,
  onCancel,
  existingIncident,
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [_employees, _setEmployees] = useState<Employee[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [witnessInput, setWitnessInput] = useState('');

  const [incident, setIncident] = useState<Incident>({
    project_id: projectId,
    incident_number: existingIncident?.incident_number || '',
    incident_date: new Date().toISOString().split('T')[0]!,
    incident_time: new Date().toTimeString().slice(0, 5),
    location_description: '',
    classification: 'near_miss',
    severity: 'minor',
    description: '',
    immediate_actions: '',
    witnesses: [],
    medical_attention_required: false,
    lost_time: false,
    osha_recordable: false,
    supervisor_notified: false,
    safety_director_notified: false,
    status: 'open',
    ...existingIncident,
  });

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Auto-determine OSHA recordable status
  useEffect(() => {
    const isRecordable =
      incident.classification === 'recordable_injury' ||
      incident.lost_time ||
      (incident.days_away && incident.days_away > 0) ||
      (incident.restricted_duty_days && incident.restricted_duty_days > 0) ||
      incident.severity === 'serious' ||
      incident.severity === 'fatal';

    setIncident(prev => ({ ...prev, osha_recordable: isRecordable }));
  }, [incident.classification, incident.lost_time, incident.days_away, incident.restricted_duty_days, incident.severity]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [projectRes, employeesRes] = await Promise.all([
        supabase
          .from('projects')
          .select('id, name, project_number')
          .eq('id', projectId)
          .single(),
        supabase
          .from('employees')
          .select('id, first_name, last_name')
          .eq('status', 'active')
          .order('last_name'),
      ]);

      if (projectRes.data) setProject(projectRes.data);
      if (employeesRes.data) _setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof Incident, value: any) => {
    setIncident(prev => ({ ...prev, [field]: value }));
  };

  const addWitness = () => {
    if (witnessInput.trim()) {
      setIncident(prev => ({
        ...prev,
        witnesses: [...(prev.witnesses || []), witnessInput.trim()],
      }));
      setWitnessInput('');
    }
  };

  const removeWitness = (index: number) => {
    setIncident(prev => ({
      ...prev,
      witnesses: prev.witnesses?.filter((_, i) => i !== index),
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let incidentId = incident.id;

      if (incidentId) {
        // Update existing
        const { error } = await supabase
          .from('incidents')
          .update(incident)
          .eq('id', incidentId);
        if (error) throw error;
      } else {
        // Create new
        const { data, error } = await supabase
          .from('incidents')
          .insert(incident as any)
          .select('id')
          .single();
        if (error) throw error;
        incidentId = data.id;
      }

      // Upload photos
      if (photos.length > 0 && incidentId) {
        for (const photo of photos) {
          const fileName = `${incidentId}/${Date.now()}_${photo.name}`;
          await supabase.storage
            .from('safety-photos')
            .upload(fileName, photo);
        }
      }

      // Notify safety director if serious
      if (incident.severity === 'serious' || incident.severity === 'fatal' || incident.osha_recordable) {
        await supabase.functions.invoke('safety-incident-notify', {
          body: { incident_id: incidentId },
        });
      }

      onSave?.(incidentId!);
    } catch (error) {
      console.error('Error saving incident:', error);
      alert('Failed to save incident report');
    } finally {
      setSaving(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return incident.incident_date && incident.incident_time && incident.location_description;
      case 2:
        return incident.classification && incident.severity && incident.description;
      case 3:
        return incident.immediate_actions;
      default:
        return true;
    }
  };

  if (loading) {
    return (
      <div className="incident-form loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="incident-form">
      <div className="form-header">
        <div className="header-icon">
          <AlertTriangle size={24} />
        </div>
        <div className="header-text">
          <h2>{existingIncident ? 'Edit Incident Report' : 'New Incident Report'}</h2>
          <p>{project?.name} ({project?.project_number})</p>
        </div>
        {onCancel && (
          <button className="close-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Progress Steps */}
      <div className="form-steps">
        {['When & Where', 'What Happened', 'Response', 'Review'].map((label, idx) => (
          <div
            key={idx}
            className={`step ${step > idx + 1 ? 'completed' : ''} ${step === idx + 1 ? 'active' : ''}`}
            onClick={() => step > idx + 1 && setStep(idx + 1)}
          >
            <span className="step-number">{idx + 1}</span>
            <span className="step-label">{label}</span>
          </div>
        ))}
      </div>

      {/* Step 1: When & Where */}
      {step === 1 && (
        <div className="form-step">
          <h3>
            <Calendar size={18} />
            When and Where
          </h3>

          <div className="form-grid">
            <div className="form-group">
              <label>
                <Calendar size={14} />
                Incident Date *
              </label>
              <input
                type="date"
                value={incident.incident_date}
                onChange={(e) => handleChange('incident_date', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group">
              <label>
                <Clock size={14} />
                Incident Time *
              </label>
              <input
                type="time"
                value={incident.incident_time}
                onChange={(e) => handleChange('incident_time', e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label>
                <MapPin size={14} />
                Location Description *
              </label>
              <input
                type="text"
                value={incident.location_description}
                onChange={(e) => handleChange('location_description', e.target.value)}
                placeholder="e.g., Station 45+00, near trench excavation"
              />
            </div>
          </div>

          <div className="notification-checks">
            <h4>
              <Shield size={16} />
              Notifications
            </h4>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={incident.supervisor_notified}
                onChange={(e) => handleChange('supervisor_notified', e.target.checked)}
              />
              Supervisor has been notified
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={incident.safety_director_notified}
                onChange={(e) => handleChange('safety_director_notified', e.target.checked)}
              />
              Safety Director has been notified
            </label>
          </div>
        </div>
      )}

      {/* Step 2: What Happened */}
      {step === 2 && (
        <div className="form-step">
          <h3>
            <AlertCircle size={18} />
            Incident Classification
          </h3>

          <div className="classification-grid">
            {CLASSIFICATIONS.map((c) => (
              <div
                key={c.value}
                className={`classification-card ${incident.classification === c.value ? 'selected' : ''}`}
                onClick={() => handleChange('classification', c.value)}
                style={{ borderColor: incident.classification === c.value ? c.color : undefined }}
              >
                <div className="classification-dot" style={{ background: c.color }}></div>
                <div className="classification-content">
                  <strong>{c.label}</strong>
                  <span>{c.description}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="severity-section">
            <h4>Severity Level</h4>
            <div className="severity-options">
              {SEVERITY_LEVELS.map((s) => (
                <button
                  key={s.value}
                  className={`severity-btn ${incident.severity === s.value ? 'selected' : ''}`}
                  onClick={() => handleChange('severity', s.value)}
                  style={{
                    borderColor: incident.severity === s.value ? s.color : undefined,
                    background: incident.severity === s.value ? `${s.color}15` : undefined,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>
              <FileText size={14} />
              Description of Incident *
            </label>
            <textarea
              value={incident.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe what happened in detail..."
              rows={5}
            />
          </div>

          {(incident.classification === 'recordable_injury' || incident.classification === 'first_aid_only') && (
            <div className="injury-details">
              <h4>
                <User size={16} />
                Injury Details
              </h4>

              <div className="form-grid">
                <div className="form-group">
                  <label>Injured Party Name</label>
                  <input
                    type="text"
                    value={incident.injured_party_name || ''}
                    onChange={(e) => handleChange('injured_party_name', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Party Type</label>
                  <select
                    value={incident.injured_party_type || ''}
                    onChange={(e) => handleChange('injured_party_type', e.target.value)}
                  >
                    <option value="">Select...</option>
                    <option value="employee">Employee</option>
                    <option value="subcontractor">Subcontractor</option>
                    <option value="visitor">Visitor</option>
                    <option value="public">Member of Public</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Body Part Affected</label>
                  <select
                    value={incident.body_part_affected || ''}
                    onChange={(e) => handleChange('body_part_affected', e.target.value)}
                  >
                    <option value="">Select...</option>
                    {BODY_PARTS.map((part) => (
                      <option key={part} value={part}>{part}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Injury Description</label>
                  <input
                    type="text"
                    value={incident.injury_description || ''}
                    onChange={(e) => handleChange('injury_description', e.target.value)}
                    placeholder="e.g., Laceration, Contusion, Sprain"
                  />
                </div>
              </div>

              <div className="checkbox-grid">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={incident.medical_attention_required}
                    onChange={(e) => handleChange('medical_attention_required', e.target.checked)}
                  />
                  Medical attention required
                </label>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={incident.lost_time}
                    onChange={(e) => handleChange('lost_time', e.target.checked)}
                  />
                  Lost time injury
                </label>
              </div>

              {incident.lost_time && (
                <div className="form-grid">
                  <div className="form-group">
                    <label>Days Away from Work</label>
                    <input
                      type="number"
                      min="0"
                      value={incident.days_away || ''}
                      onChange={(e) => handleChange('days_away', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Restricted Duty Days</label>
                    <input
                      type="number"
                      min="0"
                      value={incident.restricted_duty_days || ''}
                      onChange={(e) => handleChange('restricted_duty_days', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {incident.osha_recordable && (
            <div className="osha-alert">
              <AlertTriangle size={20} />
              <div>
                <strong>OSHA Recordable Incident</strong>
                <p>This incident will be added to the OSHA 300 Log</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Response */}
      {step === 3 && (
        <div className="form-step">
          <h3>
            <Clipboard size={18} />
            Response & Investigation
          </h3>

          <div className="form-group">
            <label>
              Immediate Actions Taken *
            </label>
            <textarea
              value={incident.immediate_actions}
              onChange={(e) => handleChange('immediate_actions', e.target.value)}
              placeholder="What actions were taken immediately after the incident?"
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>Treatment Provided</label>
            <textarea
              value={incident.treatment_provided || ''}
              onChange={(e) => handleChange('treatment_provided', e.target.value)}
              placeholder="Describe any first aid or medical treatment provided..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Root Cause (if known)</label>
            <textarea
              value={incident.root_cause || ''}
              onChange={(e) => handleChange('root_cause', e.target.value)}
              placeholder="What was the root cause of this incident?"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label>Corrective Actions</label>
            <textarea
              value={incident.corrective_actions || ''}
              onChange={(e) => handleChange('corrective_actions', e.target.value)}
              placeholder="What corrective actions will be taken to prevent recurrence?"
              rows={3}
            />
          </div>

          <div className="witnesses-section">
            <h4>
              <Users size={16} />
              Witnesses
            </h4>
            <div className="witness-input">
              <input
                type="text"
                value={witnessInput}
                onChange={(e) => setWitnessInput(e.target.value)}
                placeholder="Enter witness name"
                onKeyPress={(e) => e.key === 'Enter' && addWitness()}
              />
              <button type="button" onClick={addWitness}>Add</button>
            </div>
            <div className="witness-list">
              {incident.witnesses?.map((witness, idx) => (
                <span key={idx} className="witness-tag">
                  {witness}
                  <button onClick={() => removeWitness(idx)}><X size={12} /></button>
                </span>
              ))}
            </div>
          </div>

          <div className="photos-section">
            <h4>
              <Camera size={16} />
              Photos
            </h4>
            <div className="photo-upload">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                id="incident-photos"
              />
              <label htmlFor="incident-photos" className="upload-area">
                <Camera size={24} />
                <span>Click to add photos</span>
              </label>
            </div>
            {photos.length > 0 && (
              <div className="photo-preview">
                {photos.map((photo, idx) => (
                  <div key={idx} className="photo-thumb">
                    <img src={URL.createObjectURL(photo)} alt={`Photo ${idx + 1}`} />
                    <button onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="form-step">
          <h3>
            <FileText size={18} />
            Review & Submit
          </h3>

          <div className="review-summary">
            <div className="review-section">
              <h4>Incident Details</h4>
              <div className="review-grid">
                <div className="review-item">
                  <span className="label">Date/Time</span>
                  <span className="value">{incident.incident_date} at {incident.incident_time}</span>
                </div>
                <div className="review-item">
                  <span className="label">Location</span>
                  <span className="value">{incident.location_description}</span>
                </div>
                <div className="review-item">
                  <span className="label">Classification</span>
                  <span className="value classification-tag" style={{
                    background: CLASSIFICATIONS.find(c => c.value === incident.classification)?.color + '20',
                    color: CLASSIFICATIONS.find(c => c.value === incident.classification)?.color,
                  }}>
                    {CLASSIFICATIONS.find(c => c.value === incident.classification)?.label}
                  </span>
                </div>
                <div className="review-item">
                  <span className="label">Severity</span>
                  <span className="value">{incident.severity}</span>
                </div>
              </div>
            </div>

            <div className="review-section">
              <h4>Description</h4>
              <p>{incident.description}</p>
            </div>

            {incident.injured_party_name && (
              <div className="review-section">
                <h4>Injury Information</h4>
                <div className="review-grid">
                  <div className="review-item">
                    <span className="label">Injured Party</span>
                    <span className="value">{incident.injured_party_name} ({incident.injured_party_type})</span>
                  </div>
                  <div className="review-item">
                    <span className="label">Body Part</span>
                    <span className="value">{incident.body_part_affected}</span>
                  </div>
                  <div className="review-item">
                    <span className="label">Medical Attention</span>
                    <span className="value">{incident.medical_attention_required ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="review-item">
                    <span className="label">Lost Time</span>
                    <span className="value">{incident.lost_time ? `Yes (${incident.days_away || 0} days)` : 'No'}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="review-section">
              <h4>Response</h4>
              <p><strong>Immediate Actions:</strong> {incident.immediate_actions}</p>
              {incident.corrective_actions && (
                <p><strong>Corrective Actions:</strong> {incident.corrective_actions}</p>
              )}
            </div>

            {incident.osha_recordable && (
              <div className="osha-warning">
                <AlertTriangle size={20} />
                <span>This incident is OSHA Recordable and will be logged</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="form-actions">
        {step > 1 && (
          <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}

        <div className="action-spacer"></div>

        {step < 4 ? (
          <button
            className="btn btn-primary"
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
          >
            Continue
            <ChevronRight size={16} />
          </button>
        ) : (
          <button
            className="btn btn-success"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Submit Report'}
            <Save size={16} />
          </button>
        )}
      </div>
    </div>
  );
};

export default IncidentReportForm;
