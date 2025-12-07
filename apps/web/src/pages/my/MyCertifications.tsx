import { useState, useEffect } from 'react';
import { supabase } from '@triton/supabase-client';
import './MyCertifications.css';

interface Certification {
  id: string;
  employee_id: string;
  certification_code: string;
  certification_name: string;
  category: string;
  issue_date: string;
  expiration_date: string | null;
  certificate_number: string | null;
  issuing_authority: string | null;
  verification_url: string | null;
  status: string;
  expiry_status: 'valid' | 'expiring_soon' | 'expired' | 'no_expiry';
  days_until_expiry: number | null;
}

interface TrainingSession {
  session_id: string;
  program_name: string;
  program_code: string | null;
  session_date: string;
  duration_hours: number | null;
  instructor_name: string;
  location: string | null;
  attendance_status: string;
  signed_at: string | null;
  certifications_granted: boolean;
  certifications_earned: string[] | null;
}

interface UpcomingTraining {
  session_id: string;
  program_name: string;
  session_date: string;
  session_time: string | null;
  duration_hours: number | null;
  location: string | null;
  instructor_name: string;
  attendance_status: string;
}

type TabType = 'certifications' | 'history' | 'upcoming';

export function MyCertifications() {
  const [activeTab, setActiveTab] = useState<TabType>('certifications');
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [trainingHistory, setTrainingHistory] = useState<TrainingSession[]>([]);
  const [upcomingTraining, setUpcomingTraining] = useState<UpcomingTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      // Fetch all data in parallel
      const [certsResult, historyResult, upcomingResult] = await Promise.all([
        supabase.from('v_my_certifications').select('*'),
        supabase.from('v_my_training_history').select('*'),
        supabase.from('v_my_upcoming_training').select('*')
      ]);

      if (certsResult.error) throw certsResult.error;
      if (historyResult.error) throw historyResult.error;
      if (upcomingResult.error) throw upcomingResult.error;

      setCertifications(certsResult.data || []);
      setTrainingHistory(historyResult.data || []);
      setUpcomingTraining(upcomingResult.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Unable to load your certification data. Your employee record may not be linked to your account.');
    } finally {
      setLoading(false);
    }
  }

  function getExpiryBadgeClass(status: string): string {
    switch (status) {
      case 'expired': return 'badge-expired';
      case 'expiring_soon': return 'badge-warning';
      case 'valid': return 'badge-valid';
      case 'no_expiry': return 'badge-info';
      default: return '';
    }
  }

  function getExpiryLabel(status: string): string {
    switch (status) {
      case 'expired': return 'Expired';
      case 'expiring_soon': return 'Expiring Soon';
      case 'valid': return 'Valid';
      case 'no_expiry': return 'No Expiry';
      default: return status;
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  const validCerts = certifications.filter(c => c.expiry_status === 'valid' || c.expiry_status === 'no_expiry');
  const expiringCerts = certifications.filter(c => c.expiry_status === 'expiring_soon');
  const expiredCerts = certifications.filter(c => c.expiry_status === 'expired');

  if (loading) {
    return (
      <div className="my-certs-container">
        <div className="loading-spinner">Loading your certifications...</div>
      </div>
    );
  }

  return (
    <div className="my-certs-container">
      <header className="my-certs-header">
        <h1>My Certifications</h1>
        <p className="subtitle">Your certification wallet and training history</p>
      </header>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card valid">
          <div className="card-icon">✓</div>
          <div className="card-content">
            <div className="card-value">{validCerts.length}</div>
            <div className="card-label">Valid Certifications</div>
          </div>
        </div>
        <div className="summary-card warning">
          <div className="card-icon">⏰</div>
          <div className="card-content">
            <div className="card-value">{expiringCerts.length}</div>
            <div className="card-label">Expiring Soon</div>
          </div>
        </div>
        <div className="summary-card danger">
          <div className="card-icon">✕</div>
          <div className="card-content">
            <div className="card-value">{expiredCerts.length}</div>
            <div className="card-label">Expired</div>
          </div>
        </div>
        <div className="summary-card info">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <div className="card-value">{upcomingTraining.length}</div>
            <div className="card-label">Upcoming Training</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'certifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('certifications')}
        >
          Certifications ({certifications.length})
        </button>
        <button
          className={`tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Training History ({trainingHistory.length})
        </button>
        <button
          className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({upcomingTraining.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'certifications' && (
          <div className="certifications-grid">
            {certifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📜</div>
                <h3>No Certifications Found</h3>
                <p>Your certifications will appear here once they are recorded in the system.</p>
              </div>
            ) : (
              certifications.map(cert => (
                <div key={cert.id} className={`cert-card ${cert.expiry_status}`}>
                  <div className="cert-header">
                    <span className={`expiry-badge ${getExpiryBadgeClass(cert.expiry_status)}`}>
                      {getExpiryLabel(cert.expiry_status)}
                    </span>
                    {cert.days_until_expiry !== null && cert.days_until_expiry > 0 && (
                      <span className="days-remaining">
                        {cert.days_until_expiry} days left
                      </span>
                    )}
                  </div>
                  <h3 className="cert-name">{cert.certification_name}</h3>
                  <p className="cert-code">{cert.certification_code}</p>
                  <div className="cert-details">
                    <div className="detail-row">
                      <span className="label">Issued:</span>
                      <span className="value">{formatDate(cert.issue_date)}</span>
                    </div>
                    {cert.expiration_date && (
                      <div className="detail-row">
                        <span className="label">Expires:</span>
                        <span className="value">{formatDate(cert.expiration_date)}</span>
                      </div>
                    )}
                    {cert.certificate_number && (
                      <div className="detail-row">
                        <span className="label">Certificate #:</span>
                        <span className="value">{cert.certificate_number}</span>
                      </div>
                    )}
                    {cert.issuing_authority && (
                      <div className="detail-row">
                        <span className="label">Issued By:</span>
                        <span className="value">{cert.issuing_authority}</span>
                      </div>
                    )}
                  </div>
                  {cert.verification_url && (
                    <a
                      href={cert.verification_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="verify-link"
                    >
                      Verify Certificate →
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="training-history">
            {trainingHistory.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📚</div>
                <h3>No Training History</h3>
                <p>Your completed training sessions will appear here.</p>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Program</th>
                    <th>Instructor</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Certifications Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingHistory.map(session => (
                    <tr key={session.session_id}>
                      <td>{formatDate(session.session_date)}</td>
                      <td>
                        <strong>{session.program_name}</strong>
                        {session.program_code && (
                          <span className="program-code"> ({session.program_code})</span>
                        )}
                      </td>
                      <td>{session.instructor_name}</td>
                      <td>{session.duration_hours ? `${session.duration_hours}h` : '-'}</td>
                      <td>
                        <span className={`status-badge ${session.attendance_status}`}>
                          {session.attendance_status}
                        </span>
                      </td>
                      <td>
                        {session.certifications_earned?.length ? (
                          <ul className="certs-earned">
                            {session.certifications_earned.map((cert, i) => (
                              <li key={i}>{cert}</li>
                            ))}
                          </ul>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="upcoming-training">
            {upcomingTraining.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📅</div>
                <h3>No Upcoming Training</h3>
                <p>You don't have any scheduled training sessions.</p>
              </div>
            ) : (
              <div className="upcoming-cards">
                {upcomingTraining.map(session => (
                  <div key={session.session_id} className="upcoming-card">
                    <div className="upcoming-date">
                      <span className="month">
                        {new Date(session.session_date).toLocaleDateString('en-US', { month: 'short' })}
                      </span>
                      <span className="day">
                        {new Date(session.session_date).getDate()}
                      </span>
                    </div>
                    <div className="upcoming-details">
                      <h3>{session.program_name}</h3>
                      <div className="meta">
                        {session.session_time && <span>🕐 {session.session_time}</span>}
                        {session.duration_hours && <span>⏱️ {session.duration_hours}h</span>}
                        {session.location && <span>📍 {session.location}</span>}
                      </div>
                      <p className="instructor">Instructor: {session.instructor_name}</p>
                    </div>
                    <span className={`registration-status ${session.attendance_status}`}>
                      {session.attendance_status === 'registered' ? 'Registered' : session.attendance_status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyCertifications;
