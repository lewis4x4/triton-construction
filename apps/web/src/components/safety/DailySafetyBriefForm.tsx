// =============================================================================
// Component: DailySafetyBriefForm
// Purpose: 30-second supervisor daily safety checklist (NOT toolbox talk)
// Part of Safety Compliance Enforcement System - "The Gatekeeper"
// =============================================================================

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Check,
  X,
  Clock,
  Users,
  Cloud,
  AlertTriangle,
  HardHat,
  Wrench,
  MapPin,
  CheckCircle2,
  Loader2,
  ChevronDown,
  Search,
  Navigation,
  ThermometerSun,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './DailySafetyBriefForm.css';

interface DailySafetyBriefFormProps {
  projectId: string;
  projectName?: string;
  crewAssignmentId?: string;
  onComplete?: (briefId: string) => void;
  onCancel?: () => void;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  compliance_status: string;
}

interface ChecklistItem {
  key: string;
  label: string;
  description: string;
  required: boolean;
  icon: React.ReactNode;
  category: 'required' | 'situational';
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    key: 'ppe_verified',
    label: 'PPE Verified',
    description: 'All crew have proper PPE for today\'s work',
    required: true,
    icon: <HardHat size={20} />,
    category: 'required',
  },
  {
    key: 'equipment_inspected',
    label: 'Equipment Inspected',
    description: 'Pre-operation inspections completed',
    required: true,
    icon: <Wrench size={20} />,
    category: 'required',
  },
  {
    key: 'hazards_identified',
    label: 'Hazards Identified',
    description: 'Worksite hazards reviewed with crew',
    required: true,
    icon: <AlertTriangle size={20} />,
    category: 'required',
  },
  {
    key: 'emergency_plan_reviewed',
    label: 'Emergency Plan',
    description: 'Emergency contacts and evacuation reviewed',
    required: true,
    icon: <Shield size={20} />,
    category: 'required',
  },
  {
    key: 'weather_acceptable',
    label: 'Weather OK',
    description: 'Weather conditions safe for planned work',
    required: true,
    icon: <Cloud size={20} />,
    category: 'required',
  },
  {
    key: 'first_aid_available',
    label: 'First Aid Available',
    description: 'First aid kit and trained personnel on site',
    required: true,
    icon: <CheckCircle2 size={20} />,
    category: 'required',
  },
  {
    key: 'competent_person_present',
    label: 'Competent Person',
    description: 'Required competent person(s) on site',
    required: false,
    icon: <Users size={20} />,
    category: 'situational',
  },
  {
    key: 'utilities_marked',
    label: 'Utilities Marked',
    description: 'Underground utilities marked and verified',
    required: false,
    icon: <MapPin size={20} />,
    category: 'situational',
  },
  {
    key: 'fall_protection_in_place',
    label: 'Fall Protection',
    description: 'Fall protection systems in place (if working at height)',
    required: false,
    icon: <Shield size={20} />,
    category: 'situational',
  },
  {
    key: 'traffic_control_set',
    label: 'Traffic Control',
    description: 'Work zone traffic control established',
    required: false,
    icon: <AlertTriangle size={20} />,
    category: 'situational',
  },
  {
    key: 'confined_space_permit',
    label: 'Confined Space Permit',
    description: 'Entry permit obtained (if applicable)',
    required: false,
    icon: <Shield size={20} />,
    category: 'situational',
  },
  {
    key: 'hot_work_permit',
    label: 'Hot Work Permit',
    description: 'Hot work permit obtained (if applicable)',
    required: false,
    icon: <ThermometerSun size={20} />,
    category: 'situational',
  },
];

export const DailySafetyBriefForm: React.FC<DailySafetyBriefFormProps> = ({
  projectId,
  projectName,
  crewAssignmentId,
  onComplete,
  onCancel,
}) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [startTime] = useState<Date>(new Date());

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [conditions, setConditions] = useState({
    weather_conditions: '',
    temperature_f: '',
    site_conditions: '',
    special_hazards: '',
    work_planned: '',
  });

  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    error: string | null;
  }>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
  });

  useEffect(() => {
    loadEmployees();
    captureLocation();
  }, []);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('employees')
        .select('id, first_name, last_name, display_name, compliance_status')
        .eq('employment_status', 'active')
        .is('deleted_at', null)
        .order('last_name');

      if (data) {
        setEmployees(data as any);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const captureLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            error: null,
          });
        },
        (error) => {
          setLocation(prev => ({
            ...prev,
            error: error.message,
          }));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const toggleCheck = (key: string) => {
    setChecklist(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAllEmployees = () => {
    setSelectedEmployees(employees.map(e => e.id));
  };

  const filteredEmployees = employees.filter(e => {
    const name = e.display_name || `${e.first_name} ${e.last_name}`;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const requiredItems = CHECKLIST_ITEMS.filter(item => item.required);
  const situationalItems = CHECKLIST_ITEMS.filter(item => !item.required);
  const allRequiredComplete = requiredItems.every(item => checklist[item.key]);
  const completedCount = Object.values(checklist).filter(Boolean).length;

  const handleSubmit = async () => {
    if (!allRequiredComplete) {
      alert('Please complete all required checklist items');
      return;
    }

    if (selectedEmployees.length === 0) {
      alert('Please select at least one crew member');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-brief-submit', {
        body: {
          project_id: projectId,
          crew_assignment_id: crewAssignmentId,
          checklist_responses: checklist,
          attendee_employee_ids: selectedEmployees,
          weather_conditions: conditions.weather_conditions || undefined,
          temperature_f: conditions.temperature_f ? parseInt(conditions.temperature_f) : undefined,
          site_conditions: conditions.site_conditions || undefined,
          special_hazards: conditions.special_hazards || undefined,
          work_planned: conditions.work_planned || undefined,
          gps_latitude: location.latitude,
          gps_longitude: location.longitude,
          gps_accuracy_meters: location.accuracy,
          started_at: startTime.toISOString(),
        },
      });

      if (error) throw error;

      onComplete?.(data.brief_id);
    } catch (error) {
      console.error('Error submitting brief:', error);
      alert('Failed to submit daily brief');
    } finally {
      setSubmitting(false);
    }
  };

  const getElapsedTime = () => {
    const elapsed = Math.round((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="dsb-form loading">
        <Loader2 className="spinner" size={32} />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="dsb-form">
      <div className="dsb-header">
        <div className="header-content">
          <div className="header-icon">
            <Shield size={28} />
          </div>
          <div className="header-text">
            <h2>Daily Safety Brief</h2>
            <p>{projectName || 'Project'} - {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="header-timer">
          <Clock size={16} />
          <span>{getElapsedTime()}</span>
        </div>
        {onCancel && (
          <button className="close-btn" onClick={onCancel}>
            <X size={24} />
          </button>
        )}
      </div>

      <div className="dsb-body">
        {/* GPS Status */}
        <div className="gps-status">
          <Navigation size={16} />
          {location.latitude ? (
            <span className="gps-captured">
              Location captured ({location.accuracy?.toFixed(0)}m accuracy)
            </span>
          ) : location.error ? (
            <span className="gps-error">Location unavailable: {location.error}</span>
          ) : (
            <span className="gps-loading">Capturing location...</span>
          )}
        </div>

        {/* Required Checklist */}
        <div className="checklist-section">
          <h3>
            <CheckCircle2 size={18} />
            Required Safety Checks
          </h3>
          <div className="checklist-grid">
            {requiredItems.map(item => (
              <div
                key={item.key}
                className={`checklist-item ${checklist[item.key] ? 'checked' : ''}`}
                onClick={() => toggleCheck(item.key)}
              >
                <div className="item-check">
                  {checklist[item.key] ? <Check size={18} /> : null}
                </div>
                <div className="item-icon">{item.icon}</div>
                <div className="item-content">
                  <div className="item-label">{item.label}</div>
                  <div className="item-desc">{item.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Situational Checklist */}
        <div className="checklist-section situational">
          <h3>
            <AlertTriangle size={18} />
            Situational (Check if Applicable)
          </h3>
          <div className="checklist-grid compact">
            {situationalItems.map(item => (
              <div
                key={item.key}
                className={`checklist-item compact ${checklist[item.key] ? 'checked' : ''}`}
                onClick={() => toggleCheck(item.key)}
              >
                <div className="item-check">
                  {checklist[item.key] ? <Check size={16} /> : null}
                </div>
                <div className="item-label">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Conditions */}
        <div className="conditions-section">
          <h3>
            <Cloud size={18} />
            Conditions
          </h3>
          <div className="conditions-grid">
            <div className="form-group">
              <label>Weather</label>
              <select
                value={conditions.weather_conditions}
                onChange={(e) => setConditions(prev => ({ ...prev, weather_conditions: e.target.value }))}
              >
                <option value="">Select...</option>
                <option value="clear">Clear</option>
                <option value="cloudy">Cloudy</option>
                <option value="partly_cloudy">Partly Cloudy</option>
                <option value="rain">Rain</option>
                <option value="light_rain">Light Rain</option>
                <option value="snow">Snow</option>
                <option value="fog">Fog</option>
                <option value="windy">Windy</option>
                <option value="hot">Hot (&gt;90°F)</option>
                <option value="cold">Cold (&lt;40°F)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Temp (°F)</label>
              <input
                type="number"
                value={conditions.temperature_f}
                onChange={(e) => setConditions(prev => ({ ...prev, temperature_f: e.target.value }))}
                placeholder="72"
              />
            </div>
            <div className="form-group full-width">
              <label>Site Conditions</label>
              <input
                type="text"
                value={conditions.site_conditions}
                onChange={(e) => setConditions(prev => ({ ...prev, site_conditions: e.target.value }))}
                placeholder="Dry, good visibility, heavy equipment traffic..."
              />
            </div>
          </div>
        </div>

        {/* Special Hazards */}
        <div className="form-group">
          <label>
            <AlertTriangle size={14} />
            Special Hazards Today
          </label>
          <textarea
            value={conditions.special_hazards}
            onChange={(e) => setConditions(prev => ({ ...prev, special_hazards: e.target.value }))}
            placeholder="Any special hazards crew should be aware of..."
            rows={2}
          />
        </div>

        {/* Work Planned */}
        <div className="form-group">
          <label>Work Planned</label>
          <textarea
            value={conditions.work_planned}
            onChange={(e) => setConditions(prev => ({ ...prev, work_planned: e.target.value }))}
            placeholder="Brief description of today's work..."
            rows={2}
          />
        </div>

        {/* Crew Present */}
        <div className="crew-section">
          <div className="section-header">
            <h3>
              <Users size={18} />
              Crew Present ({selectedEmployees.length})
            </h3>
            <button className="btn btn-sm btn-secondary" onClick={selectAllEmployees}>
              Select All
            </button>
          </div>

          <div className="crew-search">
            <Search size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowEmployeeDropdown(true)}
              placeholder="Search crew members..."
            />
            <ChevronDown size={16} />
          </div>

          {showEmployeeDropdown && filteredEmployees.length > 0 && (
            <div className="crew-dropdown">
              {filteredEmployees.slice(0, 20).map(emp => (
                <div
                  key={emp.id}
                  className={`crew-option ${selectedEmployees.includes(emp.id) ? 'selected' : ''}`}
                  onClick={() => toggleEmployee(emp.id)}
                >
                  <div className={`option-check ${selectedEmployees.includes(emp.id) ? 'checked' : ''}`}>
                    {selectedEmployees.includes(emp.id) && <Check size={14} />}
                  </div>
                  <span className="crew-name">
                    {emp.display_name || `${emp.first_name} ${emp.last_name}`}
                  </span>
                  {emp.compliance_status !== 'compliant' && (
                    <span className="compliance-warning">
                      <AlertTriangle size={12} />
                      {emp.compliance_status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedEmployees.length > 0 && (
            <div className="selected-crew">
              {selectedEmployees.map(id => {
                const emp = employees.find(e => e.id === id);
                if (!emp) return null;
                return (
                  <div key={id} className="crew-tag">
                    <span>{emp.display_name || `${emp.first_name} ${emp.last_name}`}</span>
                    <button onClick={() => toggleEmployee(id)}>
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="dsb-footer">
        <div className="checklist-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` }}
            />
          </div>
          <span>{completedCount}/{CHECKLIST_ITEMS.length} checks</span>
        </div>

        <div className="footer-actions">
          {onCancel && (
            <button className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            className="btn btn-success"
            onClick={handleSubmit}
            disabled={submitting || !allRequiredComplete || selectedEmployees.length === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="spinner" size={18} />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Complete Brief & Start Work
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailySafetyBriefForm;
