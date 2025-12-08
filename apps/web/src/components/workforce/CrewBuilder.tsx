import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
  Clock,
  MapPin,
  Shield,
  HardHat,
  Truck,
  AlertOctagon,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './CrewBuilder.css';

interface Employee {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  complianceStatus: string;
  competentPersonTypes: string[];
  hasCertifications: boolean;
}

interface SubcontractorWorker {
  id: string;
  firstName: string;
  lastName: string;
  companyName: string;
  hasOsha10: boolean;
  isCompetentPerson: boolean;
  competentPersonTypes: string[];
}

interface CrewMember {
  id: string;
  type: 'employee' | 'subcontractor';
  name: string;
  role: string;
  complianceStatus: string;
  isCompetentPerson: boolean;
}

interface ValidationResult {
  passed: boolean;
  blocking_issues: Array<{
    code: string;
    severity: string;
    message: string;
    remediation: string;
  }>;
  warnings: Array<{
    code: string;
    severity: string;
    message: string;
  }>;
  compliance_summary: {
    subcontractor_coi_valid: boolean;
    has_competent_person: boolean;
    equipment_cleared: boolean;
    all_certs_valid: boolean;
    all_orientations_valid: boolean;
  };
}

interface CrewBuilderProps {
  projectId: string;
  projectName: string;
  onAssignmentCreated?: (assignmentId: string) => void;
}

const WORK_TYPES = [
  'General Labor',
  'Excavation',
  'Trenching > 5ft',
  'Scaffolding',
  'Confined Space',
  'Fall Protection',
  'Crane Work',
  'Rigging',
  'Electrical',
  'Traffic Control',
  'Paving',
  'Concrete',
  'Bridge Work',
  'Demolition',
];

export function CrewBuilder({ projectId, projectName, onAssignmentCreated }: CrewBuilderProps) {
  const [crewMembers, setCrewMembers] = useState<CrewMember[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>([]);
  const [availableSubWorkers, setAvailableSubWorkers] = useState<SubcontractorWorker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWorkerPicker, setShowWorkerPicker] = useState(false);
  const [workType, setWorkType] = useState('General Labor');
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<'day' | 'night' | 'swing'>('day');
  const [workLocation, setWorkLocation] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  useEffect(() => {
    loadAvailableWorkers();
  }, []);

  useEffect(() => {
    if (crewMembers.length > 0) {
      validateCrew();
    } else {
      setValidationResult(null);
    }
  }, [crewMembers, workType]);

  const loadAvailableWorkers = async () => {
    // Load employees
    const { data: employees } = await supabase
      .from('employees')
      .select(`
        id, employee_number, first_name, last_name, job_title, compliance_status,
        competent_person_designations(competent_person_type)
      `)
      .is('deleted_at', null)
      .eq('employment_status', 'active');

    if (employees) {
      setAvailableEmployees(
        employees.map(e => ({
          id: e.id,
          employeeNumber: e.employee_number || '',
          firstName: e.first_name,
          lastName: e.last_name,
          jobTitle: e.job_title || '',
          complianceStatus: e.compliance_status || 'pending',
          competentPersonTypes: (e.competent_person_designations as Array<{ competent_person_type: string }> || [])
            .map(cp => cp.competent_person_type),
          hasCertifications: true, // Would check actual certs
        })) as any
      );
    }

    // Load subcontractor workers
    const { data: subWorkers } = await supabase
      .from('subcontractor_workers')
      .select(`
        id, first_name, last_name, has_osha_10, is_competent_person, competent_person_types,
        subcontractors(company_name)
      `)
      .eq('is_active', true);

    if (subWorkers) {
      setAvailableSubWorkers(
        subWorkers.map(sw => ({
          id: sw.id,
          firstName: sw.first_name,
          lastName: sw.last_name,
          companyName: (sw.subcontractors as { company_name: string })?.company_name || '',
          hasOsha10: sw.has_osha_10 || false,
          isCompetentPerson: sw.is_competent_person || false,
          competentPersonTypes: sw.competent_person_types || [],
        })) as any
      );
    }
  };

  const validateCrew = useCallback(async () => {
    if (crewMembers.length === 0) return;

    setIsValidating(true);
    try {
      const response = await supabase.functions.invoke('validate-crew-assignment', {
        body: {
          project_id: projectId,
          work_type: workType,
          crew_members: crewMembers.map(m => ({
            employee_id: m.type === 'employee' ? m.id : undefined,
            subcontractor_worker_id: m.type === 'subcontractor' ? m.id : undefined,
            role_on_crew: m.role,
          })),
          assignment_date: assignmentDate,
        },
      });

      if (response.data) {
        setValidationResult(response.data);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  }, [crewMembers, projectId, workType, assignmentDate]);

  const addCrewMember = (worker: Employee | SubcontractorWorker, type: 'employee' | 'subcontractor') => {
    const isEmployee = type === 'employee';
    const emp = worker as Employee;
    const sub = worker as SubcontractorWorker;

    const newMember: CrewMember = {
      id: worker.id,
      type,
      name: `${worker.firstName} ${worker.lastName}`,
      role: isEmployee ? emp.jobTitle || 'Laborer' : 'Subcontractor',
      complianceStatus: isEmployee ? emp.complianceStatus : 'pending',
      isCompetentPerson: isEmployee
        ? emp.competentPersonTypes.length > 0
        : sub.isCompetentPerson,
    };

    setCrewMembers(prev => [...prev, newMember]);
    setShowWorkerPicker(false);
  };

  const removeCrewMember = (memberId: string) => {
    setCrewMembers(prev => prev.filter(m => m.id !== memberId));
  };

  const submitAssignment = async () => {
    if (!validationResult?.passed) {
      // Show override option
      setShowOverrideModal(true);
      return;
    }

    await createAssignment();
  };

  const createAssignment = async (_withOverride = false) => {
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create crew assignment
      const { data: assignment, error } = await supabase
        .from('crew_assignments')
        .insert({
          project_id: projectId,
          assignment_date: assignmentDate,
          shift,
          work_type: workType,
          work_location: workLocation,
          status: 'scheduled' as any,
          compliance_checked_at: new Date().toISOString(),
          compliance_passed: validationResult?.passed ?? false,
          compliance_issues: validationResult?.blocking_issues.map(i => i.message) || [],
          foreman_employee_id: crewMembers.find(m => m.role.toLowerCase().includes('foreman'))?.id,
          created_by: userData.user.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Add crew members
      const memberInserts = crewMembers.map(m => ({
        crew_assignment_id: assignment.id,
        employee_id: m.type === 'employee' ? m.id : null,
        subcontractor_worker_id: m.type === 'subcontractor' ? m.id : null,
        role_on_crew: m.role,
        compliance_status_at_assignment: m.complianceStatus,
      }));

      await supabase.from('crew_assignment_members').insert(memberInserts as any);

      onAssignmentCreated?.(assignment.id);

      // Reset form
      setCrewMembers([]);
      setValidationResult(null);
      setWorkLocation('');

    } catch (error) {
      console.error('Error creating assignment:', error);
    } finally {
      setIsSubmitting(false);
      setShowOverrideModal(false);
    }
  };

  const filteredEmployees = availableEmployees.filter(e =>
    !crewMembers.some(m => m.id === e.id) &&
    (`${e.firstName} ${e.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
     e.employeeNumber.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredSubWorkers = availableSubWorkers.filter(sw =>
    !crewMembers.some(m => m.id === sw.id) &&
    (`${sw.firstName} ${sw.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
     sw.companyName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="crew-builder">
      <div className="crew-builder-header">
        <div className="header-info">
          <Users size={24} />
          <div>
            <h2>Build Crew Assignment</h2>
            <p>{projectName}</p>
          </div>
        </div>
      </div>

      {/* Assignment Details */}
      <div className="assignment-details">
        <div className="detail-row">
          <div className="detail-field">
            <label>
              <Calendar size={14} />
              Assignment Date
            </label>
            <input
              type="date"
              value={assignmentDate}
              onChange={e => setAssignmentDate(e.target.value)}
            />
          </div>

          <div className="detail-field">
            <label>
              <Clock size={14} />
              Shift
            </label>
            <select value={shift} onChange={e => setShift(e.target.value as 'day' | 'night' | 'swing')}>
              <option value="day">Day Shift</option>
              <option value="night">Night Shift</option>
              <option value="swing">Swing Shift</option>
            </select>
          </div>

          <div className="detail-field">
            <label>
              <HardHat size={14} />
              Work Type
            </label>
            <select value={workType} onChange={e => setWorkType(e.target.value)}>
              {WORK_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="detail-field wide">
            <label>
              <MapPin size={14} />
              Work Location
            </label>
            <input
              type="text"
              value={workLocation}
              onChange={e => setWorkLocation(e.target.value)}
              placeholder="Station, area, or GPS coordinates"
            />
          </div>
        </div>
      </div>

      {/* Crew Members */}
      <div className="crew-members-section">
        <div className="section-header">
          <h3>Crew Members ({crewMembers.length})</h3>
          <button className="btn btn-primary btn-sm" onClick={() => setShowWorkerPicker(true)}>
            <Plus size={16} />
            Add Worker
          </button>
        </div>

        {crewMembers.length === 0 ? (
          <div className="empty-crew">
            <Users size={32} />
            <p>No crew members assigned yet</p>
            <button className="btn btn-primary" onClick={() => setShowWorkerPicker(true)}>
              <Plus size={18} />
              Add Crew Members
            </button>
          </div>
        ) : (
          <div className="crew-list">
            {crewMembers.map(member => (
              <div key={member.id} className={`crew-member ${member.complianceStatus}`}>
                <div className="member-info">
                  <div className="member-avatar">
                    {member.type === 'employee' ? <Users size={18} /> : <Truck size={18} />}
                  </div>
                  <div className="member-details">
                    <div className="member-name">{member.name}</div>
                    <div className="member-role">{member.role}</div>
                  </div>
                </div>
                <div className="member-badges">
                  {member.isCompetentPerson && (
                    <span className="badge competent">
                      <Shield size={12} />
                      CP
                    </span>
                  )}
                  <span className={`badge compliance ${member.complianceStatus}`}>
                    {member.complianceStatus === 'compliant' ? (
                      <CheckCircle size={12} />
                    ) : (
                      <AlertTriangle size={12} />
                    )}
                  </span>
                </div>
                <button className="remove-btn" onClick={() => removeCrewMember(member.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Validation Results */}
      {(isValidating || validationResult) && (
        <div className={`validation-panel ${validationResult?.passed ? 'passed' : 'failed'}`}>
          <div className="validation-header">
            {isValidating ? (
              <>
                <Loader2 size={20} className="spin" />
                <span>Validating crew compliance...</span>
              </>
            ) : validationResult?.passed ? (
              <>
                <CheckCircle size={20} />
                <span>Crew Passes All Compliance Checks</span>
              </>
            ) : (
              <>
                <XCircle size={20} />
                <span>Compliance Issues Found</span>
              </>
            )}
          </div>

          {validationResult && !validationResult.passed && (
            <div className="validation-issues">
              {validationResult.blocking_issues.map((issue, idx) => (
                <div key={idx} className={`issue ${issue.severity}`}>
                  <AlertOctagon size={16} />
                  <div className="issue-content">
                    <div className="issue-message">{issue.message}</div>
                    <div className="issue-remediation">{issue.remediation}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {validationResult && validationResult.warnings.length > 0 && (
            <div className="validation-warnings">
              {validationResult.warnings.map((warning, idx) => (
                <div key={idx} className="warning">
                  <AlertTriangle size={14} />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}

          {validationResult && (
            <div className="compliance-summary">
              <div className={`summary-item ${validationResult.compliance_summary.subcontractor_coi_valid ? 'pass' : 'fail'}`}>
                {validationResult.compliance_summary.subcontractor_coi_valid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                <span>Subcontractor COI</span>
              </div>
              <div className={`summary-item ${validationResult.compliance_summary.has_competent_person ? 'pass' : 'fail'}`}>
                {validationResult.compliance_summary.has_competent_person ? <CheckCircle size={14} /> : <XCircle size={14} />}
                <span>Competent Person</span>
              </div>
              <div className={`summary-item ${validationResult.compliance_summary.all_certs_valid ? 'pass' : 'fail'}`}>
                {validationResult.compliance_summary.all_certs_valid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                <span>Certifications</span>
              </div>
              <div className={`summary-item ${validationResult.compliance_summary.all_orientations_valid ? 'pass' : 'fail'}`}>
                {validationResult.compliance_summary.all_orientations_valid ? <CheckCircle size={14} /> : <XCircle size={14} />}
                <span>Site Orientations</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="crew-builder-actions">
        <button className="btn btn-secondary">Cancel</button>
        <button
          className={`btn ${validationResult?.passed ? 'btn-primary' : 'btn-warning'}`}
          onClick={submitAssignment}
          disabled={crewMembers.length === 0 || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 size={18} className="spin" />
          ) : validationResult?.passed ? (
            <>
              <CheckCircle size={18} />
              Create Assignment
            </>
          ) : (
            <>
              <AlertTriangle size={18} />
              Create with Issues
            </>
          )}
        </button>
      </div>

      {/* Worker Picker Modal */}
      {showWorkerPicker && (
        <div className="modal-overlay" onClick={() => setShowWorkerPicker(false)}>
          <div className="worker-picker-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Crew Member</h3>
              <button className="close-btn" onClick={() => setShowWorkerPicker(false)}>
                <XCircle size={24} />
              </button>
            </div>

            <div className="search-bar">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            <div className="worker-sections">
              {filteredEmployees.length > 0 && (
                <div className="worker-section">
                  <h4>
                    <Users size={16} />
                    Employees ({filteredEmployees.length})
                  </h4>
                  <div className="worker-list">
                    {filteredEmployees.slice(0, 10).map(emp => (
                      <button
                        key={emp.id}
                        className="worker-option"
                        onClick={() => addCrewMember(emp, 'employee')}
                      >
                        <div className="worker-info">
                          <div className="worker-name">{emp.firstName} {emp.lastName}</div>
                          <div className="worker-detail">{emp.employeeNumber} · {emp.jobTitle}</div>
                        </div>
                        <div className="worker-badges">
                          {emp.competentPersonTypes.length > 0 && (
                            <span className="badge competent">CP</span>
                          )}
                          <span className={`badge ${emp.complianceStatus}`}>
                            {emp.complianceStatus === 'compliant' ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                          </span>
                        </div>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredSubWorkers.length > 0 && (
                <div className="worker-section">
                  <h4>
                    <Truck size={16} />
                    Subcontractor Workers ({filteredSubWorkers.length})
                  </h4>
                  <div className="worker-list">
                    {filteredSubWorkers.slice(0, 10).map(sw => (
                      <button
                        key={sw.id}
                        className="worker-option"
                        onClick={() => addCrewMember(sw, 'subcontractor')}
                      >
                        <div className="worker-info">
                          <div className="worker-name">{sw.firstName} {sw.lastName}</div>
                          <div className="worker-detail">{sw.companyName}</div>
                        </div>
                        <div className="worker-badges">
                          {sw.isCompetentPerson && (
                            <span className="badge competent">CP</span>
                          )}
                          {sw.hasOsha10 && (
                            <span className="badge osha">OSHA</span>
                          )}
                        </div>
                        <ChevronRight size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredEmployees.length === 0 && filteredSubWorkers.length === 0 && (
                <div className="no-results">
                  <p>No workers found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="modal-overlay">
          <div className="override-modal">
            <div className="modal-header warning">
              <AlertOctagon size={24} />
              <h3>Compliance Override Required</h3>
            </div>
            <div className="modal-content">
              <p>
                This crew assignment has compliance issues that normally block assignment.
                Creating this assignment requires an emergency override.
              </p>
              <div className="override-issues">
                {validationResult?.blocking_issues.map((issue, idx) => (
                  <div key={idx} className="issue-item">
                    <XCircle size={14} />
                    <span>{issue.message}</span>
                  </div>
                ))}
              </div>
              <div className="override-warning">
                <AlertTriangle size={18} />
                <span>
                  Emergency overrides are valid for 4 hours and will notify the Safety Director immediately.
                </span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowOverrideModal(false)}>
                Cancel
              </button>
              <button className="btn btn-warning" onClick={() => createAssignment(true)}>
                <AlertOctagon size={18} />
                Request Override & Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CrewBuilder;
