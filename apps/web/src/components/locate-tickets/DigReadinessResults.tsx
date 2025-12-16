import { Link } from 'react-router-dom';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Users,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Calendar,
  Building2,
  UserX,
  Clock,
} from 'lucide-react';
import { useState } from 'react';
import './DigReadinessResults.css';

interface UtilityStatus {
  utility_name: string;
  utility_code: string;
  utility_type: string;
  status: string;
  window_closes_at: string | null;
}

interface PersonnelIssue {
  person_type: 'crew_member' | 'subcontractor_worker' | 'general';
  person_id?: string;
  person_name?: string;
  company_name?: string;
  issue_type: string;
  cert_type?: string;
  expires?: string;
  severity: 'BLOCKING' | 'WARNING';
  message: string;
}

export interface DigReadinessResult {
  overall_status: 'PASS' | 'CONDITIONAL' | 'FAIL';
  can_proceed: boolean;
  wv811_status: string;
  wv811_message: string;
  ticket_id: string | null;
  ticket_number: string | null;
  ticket_expires: string | null;
  utility_statuses: UtilityStatus[];
  personnel_status: string;
  personnel_issues: PersonnelIssue[];
  has_competent_person: boolean;
  competent_person_name: string | null;
  competent_person_type: string | null;
  check_id: string;
}

interface DigReadinessResultsProps {
  result: DigReadinessResult;
  onCheckAnother: () => void;
}

export function DigReadinessResults({ result, onCheckAnother }: DigReadinessResultsProps) {
  const [wv811Expanded, setWv811Expanded] = useState(true);
  const [personnelExpanded, setPersonnelExpanded] = useState(true);
  const [competentExpanded, setCompetentExpanded] = useState(true);

  const getOverallIcon = () => {
    switch (result.overall_status) {
      case 'PASS':
        return <CheckCircle size={64} className="result-icon pass" />;
      case 'CONDITIONAL':
        return <AlertTriangle size={64} className="result-icon warning" />;
      case 'FAIL':
        return <XCircle size={64} className="result-icon fail" />;
    }
  };

  const getOverallLabel = () => {
    switch (result.overall_status) {
      case 'PASS':
        return 'DIG APPROVED';
      case 'CONDITIONAL':
        return 'CONDITIONAL';
      case 'FAIL':
        return 'DO NOT DIG';
    }
  };

  const getSectionIcon = (status: string) => {
    switch (status) {
      case 'PASS':
        return <CheckCircle size={18} className="section-icon pass" />;
      case 'WARNING':
      case 'CAUTION':
        return <AlertTriangle size={18} className="section-icon warning" />;
      case 'FAIL':
      case 'NO_TICKET':
        return <XCircle size={18} className="section-icon fail" />;
      default:
        return <AlertTriangle size={18} className="section-icon warning" />;
    }
  };

  const blockingIssues = result.personnel_issues.filter((i) => i.severity === 'BLOCKING');
  const warningIssues = result.personnel_issues.filter((i) => i.severity === 'WARNING');

  return (
    <div className={`dig-results result-${result.overall_status.toLowerCase()}`}>
      {/* Overall Status Header */}
      <div className="results-header">
        {getOverallIcon()}
        <div className="results-status">
          <span className="status-label">{getOverallLabel()}</span>
          <span className="status-summary">
            {result.overall_status === 'PASS' && 'All checks passed - safe to proceed with excavation'}
            {result.overall_status === 'CONDITIONAL' && `${warningIssues.length} warning(s) found - proceed with caution`}
            {result.overall_status === 'FAIL' && `${blockingIssues.length} blocking issue(s) - must resolve before digging`}
          </span>
        </div>
      </div>

      {/* WV811 Section */}
      <div className={`results-section wv811-${result.wv811_status.toLowerCase()}`}>
        <div className="section-header" onClick={() => setWv811Expanded(!wv811Expanded)}>
          <div className="section-title">
            {getSectionIcon(result.wv811_status)}
            <span>WV811 Ticket Status</span>
            <span className={`status-badge ${result.wv811_status.toLowerCase()}`}>
              {result.wv811_status}
            </span>
          </div>
          {wv811Expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {wv811Expanded && (
          <div className="section-content">
            <p className="section-message">{result.wv811_message}</p>

            {result.ticket_number && (
              <div className="ticket-info">
                <div className="ticket-detail">
                  <FileText size={16} />
                  <span>Ticket #{result.ticket_number}</span>
                </div>
                {result.ticket_expires && (
                  <div className="ticket-detail">
                    <Calendar size={16} />
                    <span>
                      Expires: {new Date(result.ticket_expires).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                )}
                {result.ticket_id && (
                  <Link to={`/locate-tickets/${result.ticket_id}`} className="view-ticket-link">
                    View Full Details →
                  </Link>
                )}
              </div>
            )}

            {result.utility_statuses && result.utility_statuses.length > 0 && (
              <div className="utility-list">
                <h4>Utility Responses</h4>
                <div className="utility-grid">
                  {result.utility_statuses.map((utility, idx) => (
                    <div key={idx} className={`utility-item status-${utility.status.toLowerCase()}`}>
                      <span className="utility-name">{utility.utility_name}</span>
                      <span className={`utility-status ${utility.status.toLowerCase()}`}>
                        {utility.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Personnel Section */}
      <div className={`results-section personnel-${result.personnel_status.toLowerCase()}`}>
        <div className="section-header" onClick={() => setPersonnelExpanded(!personnelExpanded)}>
          <div className="section-title">
            {getSectionIcon(result.personnel_status)}
            <span>Personnel Compliance</span>
            <span className={`status-badge ${result.personnel_status.toLowerCase()}`}>
              {result.personnel_status === 'FAIL'
                ? `${blockingIssues.length} ISSUE${blockingIssues.length !== 1 ? 'S' : ''}`
                : result.personnel_status === 'WARNING'
                  ? `${warningIssues.length} WARNING${warningIssues.length !== 1 ? 'S' : ''}`
                  : 'ALL VERIFIED'}
            </span>
          </div>
          {personnelExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {personnelExpanded && (
          <div className="section-content">
            {result.personnel_issues.length === 0 ? (
              <p className="section-message success">
                <CheckCircle size={16} />
                All selected personnel have valid certifications for this work.
              </p>
            ) : (
              <div className="issues-list">
                {blockingIssues.length > 0 && (
                  <div className="issues-group blocking">
                    <h4>
                      <XCircle size={14} />
                      Blocking Issues ({blockingIssues.length})
                    </h4>
                    {blockingIssues.map((issue, idx) => (
                      <div key={idx} className="issue-item">
                        <div className="issue-person">
                          {issue.person_type === 'crew_member' ? (
                            <Users size={14} />
                          ) : issue.person_type === 'subcontractor_worker' ? (
                            <Building2 size={14} />
                          ) : (
                            <UserX size={14} />
                          )}
                          <span>
                            {issue.person_name || 'General'}
                            {issue.company_name && ` (${issue.company_name})`}
                          </span>
                        </div>
                        <div className="issue-message">
                          {issue.message}
                        </div>
                        {issue.expires && (
                          <div className="issue-expires">
                            <Clock size={12} />
                            Expired: {new Date(issue.expires).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {warningIssues.length > 0 && (
                  <div className="issues-group warning">
                    <h4>
                      <AlertTriangle size={14} />
                      Warnings ({warningIssues.length})
                    </h4>
                    {warningIssues.map((issue, idx) => (
                      <div key={idx} className="issue-item">
                        <div className="issue-person">
                          {issue.person_type === 'crew_member' ? (
                            <Users size={14} />
                          ) : issue.person_type === 'subcontractor_worker' ? (
                            <Building2 size={14} />
                          ) : (
                            <AlertTriangle size={14} />
                          )}
                          <span>
                            {issue.person_name || 'General'}
                            {issue.company_name && ` (${issue.company_name})`}
                          </span>
                        </div>
                        <div className="issue-message">
                          {issue.message}
                        </div>
                        {issue.expires && (
                          <div className="issue-expires">
                            <Clock size={12} />
                            Expires: {new Date(issue.expires).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Competent Person Section */}
      <div className={`results-section competent-${result.has_competent_person ? 'pass' : 'fail'}`}>
        <div className="section-header" onClick={() => setCompetentExpanded(!competentExpanded)}>
          <div className="section-title">
            {result.has_competent_person ? (
              <CheckCircle size={18} className="section-icon pass" />
            ) : (
              <XCircle size={18} className="section-icon fail" />
            )}
            <span>Competent Person</span>
            <span className={`status-badge ${result.has_competent_person ? 'pass' : 'fail'}`}>
              {result.has_competent_person ? 'VERIFIED' : 'REQUIRED'}
            </span>
          </div>
          {competentExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>

        {competentExpanded && (
          <div className="section-content">
            {result.has_competent_person ? (
              <div className="competent-info">
                <ShieldCheck size={24} className="competent-icon" />
                <div className="competent-details">
                  <span className="competent-name">{result.competent_person_name}</span>
                  <span className="competent-type">
                    Designated {result.competent_person_type} Competent Person
                  </span>
                </div>
              </div>
            ) : (
              <p className="section-message warning">
                <AlertTriangle size={16} />
                OSHA 29 CFR 1926.651(k) requires a designated Competent Person for all excavation work.
                No competent person was identified among selected personnel.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="results-actions">
        {result.overall_status === 'FAIL' && (
          <Link to="/locate-tickets" className="btn btn-primary">
            Request New Ticket
          </Link>
        )}
        <button className="btn btn-secondary" onClick={onCheckAnother}>
          Check Another Location
        </button>
      </div>

      {/* Audit Footer */}
      <div className="results-footer">
        <span>Check ID: {result.check_id?.slice(0, 8)}</span>
        <span>Checked: {new Date().toLocaleString()}</span>
      </div>
    </div>
  );
}
