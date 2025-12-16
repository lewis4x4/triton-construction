import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Calendar,
  Clock,
  Loader2,
  Shield,
  FolderOpen,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { PersonnelSelector } from '../../components/locate-tickets/PersonnelSelector';
import { DigReadinessResults, type DigReadinessResult } from '../../components/locate-tickets/DigReadinessResults';
import './DigCheckPage.css';

interface Project {
  id: string;
  name: string;
  project_number: string;
}

export function DigCheckPage() {
  // Form state
  const [location, setLocation] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkTime, setCheckTime] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCrewMembers, setSelectedCrewMembers] = useState<string[]>([]);
  const [selectedSubWorkers, setSelectedSubWorkers] = useState<string[]>([]);

  // Data state
  const [projects, setProjects] = useState<Project[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // UI state
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<DigReadinessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Load organization and projects
  useEffect(() => {
    async function loadInitialData() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) return;

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', userData.user.id)
          .single();

        if (!profile?.organization_id) return;

        setOrganizationId(profile.organization_id);

        // Load projects
        const { data: projectsData } = await supabase
          .from('projects')
          .select('id, name, project_number')
          .eq('organization_id', profile.organization_id)
          .in('status', ['ACTIVE', 'MOBILIZATION', 'AWARDED'])
          .order('name');

        setProjects(projectsData || []);
      } catch (err) {
        console.error('Error loading initial data:', err);
      } finally {
        setLoadingProjects(false);
      }
    }

    loadInitialData();
  }, []);

  const handleCheck = useCallback(async () => {
    if (!location.trim() && selectedCrewMembers.length === 0 && selectedSubWorkers.length === 0) {
      setError('Please enter a location or select personnel to check');
      return;
    }

    if (!organizationId) {
      setError('Unable to determine organization');
      return;
    }

    setIsChecking(true);
    setError(null);
    setResult(null);

    try {
      // Call the comprehensive_dig_check function
      const { data, error: fnError } = await supabase.rpc('comprehensive_dig_check', {
        p_organization_id: organizationId,
        p_project_id: selectedProjectId || null,
        p_location: location.trim() || null,
        p_check_date: checkDate,
        p_check_time: checkTime || null,
        p_crew_member_ids: selectedCrewMembers,
        p_subcontractor_worker_ids: selectedSubWorkers,
      });

      if (fnError) throw fnError;

      if (data && data.length > 0) {
        const checkResult = data[0];
        if (checkResult) {
          setResult({
            overall_status: checkResult.overall_status as 'PASS' | 'CONDITIONAL' | 'FAIL',
            can_proceed: checkResult.can_proceed,
            wv811_status: checkResult.wv811_status,
            wv811_message: checkResult.wv811_message,
            ticket_id: checkResult.ticket_id,
            ticket_number: checkResult.ticket_number,
            ticket_expires: checkResult.ticket_expires,
            utility_statuses: checkResult.utility_statuses || [],
            personnel_status: checkResult.personnel_status,
            personnel_issues: checkResult.personnel_issues || [],
            has_competent_person: checkResult.has_competent_person,
            competent_person_name: checkResult.competent_person_name,
            competent_person_type: checkResult.competent_person_type,
            check_id: checkResult.check_id,
          });
        }
      } else {
        setError('No results returned from dig check');
      }
    } catch (err) {
      console.error('Check error:', err);
      setError(err instanceof Error ? err.message : 'Failed to check dig readiness');
    } finally {
      setIsChecking(false);
    }
  }, [location, checkDate, checkTime, organizationId, selectedProjectId, selectedCrewMembers, selectedSubWorkers]);

  const handleCheckAnother = () => {
    setResult(null);
    setLocation('');
    setSelectedCrewMembers([]);
    setSelectedSubWorkers([]);
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  // If we have a result, show the results view
  if (result) {
    return (
      <div className="dig-check-page">
        <div className="dig-check-header">
          <Link to="/locate-tickets" className="back-link">
            <ArrowLeft size={18} />
            Back to Tickets
          </Link>
          <div className="header-content">
            <div className="header-title">
              <Shield size={32} strokeWidth={1.5} />
              <h1>Dig Readiness Check</h1>
            </div>
          </div>
        </div>

        <div className="dig-check-content">
          <DigReadinessResults result={result} onCheckAnother={handleCheckAnother} />
        </div>
      </div>
    );
  }

  return (
    <div className="dig-check-page">
      <div className="dig-check-header">
        <Link to="/locate-tickets" className="back-link">
          <ArrowLeft size={18} />
          Back to Tickets
        </Link>
        <div className="header-content">
          <div className="header-title">
            <Shield size={32} strokeWidth={1.5} />
            <h1>Can I Dig Here?</h1>
          </div>
          <p className="header-subtitle">
            Comprehensive dig readiness check - verify ticket status, personnel certifications, and competent person requirements
          </p>
        </div>
      </div>

      <div className="dig-check-content">
        <div className="check-form-card">
          <h2>Location & Schedule</h2>

          {/* Project Dropdown */}
          <div className="form-group">
            <label htmlFor="project">
              <FolderOpen size={16} />
              Project (Optional)
            </label>
            <div className="dropdown-wrapper">
              <button
                type="button"
                className="dropdown-trigger"
                onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                disabled={loadingProjects}
              >
                {loadingProjects ? (
                  <span className="dropdown-placeholder">Loading projects...</span>
                ) : selectedProject ? (
                  <span className="dropdown-value">
                    {selectedProject.project_number} - {selectedProject.name}
                  </span>
                ) : (
                  <span className="dropdown-placeholder">Select a project...</span>
                )}
                <ChevronDown size={16} className={showProjectDropdown ? 'rotated' : ''} />
              </button>

              {showProjectDropdown && (
                <div className="dropdown-menu">
                  <button
                    type="button"
                    className="dropdown-item"
                    onClick={() => {
                      setSelectedProjectId(null);
                      setShowProjectDropdown(false);
                    }}
                  >
                    <span className="item-label">No Project Selected</span>
                  </button>
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      type="button"
                      className={`dropdown-item ${selectedProjectId === project.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedProjectId(project.id);
                        setShowProjectDropdown(false);
                      }}
                    >
                      <span className="item-number">{project.project_number}</span>
                      <span className="item-label">{project.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="form-hint">
              Selecting a project shows personnel assigned to that project by default
            </span>
          </div>

          {/* Location Input */}
          <div className="form-group">
            <label htmlFor="location">
              <MapPin size={16} />
              Location or Ticket Number
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., 123 Main St, Cross Lanes or ticket #2533523426"
            />
            <span className="form-hint">
              Enter a street address, intersection, or WV811 ticket number to check ticket status
            </span>
          </div>

          {/* Date/Time Row */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="checkDate">
                <Calendar size={16} />
                Dig Date
              </label>
              <input
                id="checkDate"
                type="date"
                value={checkDate}
                onChange={(e) => setCheckDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="checkTime">
                <Clock size={16} />
                Time (Optional)
              </label>
              <input
                id="checkTime"
                type="time"
                value={checkTime}
                onChange={(e) => setCheckTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Personnel Selection */}
        {organizationId && (
          <PersonnelSelector
            organizationId={organizationId}
            projectId={selectedProjectId}
            checkDate={checkDate}
            selectedCrewMembers={selectedCrewMembers}
            selectedSubWorkers={selectedSubWorkers}
            onCrewMembersChange={setSelectedCrewMembers}
            onSubWorkersChange={setSelectedSubWorkers}
          />
        )}

        {/* Error Message */}
        {error && (
          <div className="check-error">
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        {/* Check Button */}
        <button
          className="check-button"
          onClick={handleCheck}
          disabled={isChecking || (!location.trim() && selectedCrewMembers.length === 0 && selectedSubWorkers.length === 0)}
        >
          {isChecking ? (
            <>
              <Loader2 size={20} className="spinner" />
              Checking Dig Readiness...
            </>
          ) : (
            <>
              <Search size={20} />
              Check Dig Readiness
            </>
          )}
        </button>

        {/* Info Section */}
        <div className="check-info">
          <h3>What Gets Checked</h3>
          <div className="info-grid">
            <div className="info-item">
              <CheckCircle size={24} className="pass" />
              <div>
                <strong>WV811 Ticket</strong>
                <p>Validates locate ticket status, expiration, and utility responses.</p>
              </div>
            </div>
            <div className="info-item">
              <CheckCircle size={24} className="pass" />
              <div>
                <strong>Personnel Certs</strong>
                <p>Verifies OSHA 10/30 and Excavation Safety certifications are valid.</p>
              </div>
            </div>
            <div className="info-item">
              <CheckCircle size={24} className="pass" />
              <div>
                <strong>Competent Person</strong>
                <p>Confirms a designated Excavation Competent Person is present (OSHA requirement).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
