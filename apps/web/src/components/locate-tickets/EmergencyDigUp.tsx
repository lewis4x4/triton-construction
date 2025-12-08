import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Phone,
  MapPin,
  Users,
  Send,
  X,
  Loader2,
  CheckCircle,
  XCircle,
  Mail,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './EmergencyDigUp.css';

interface CrewMember {
  id: string;
  name: string;
  role: string;
}

interface EmergencyDigUpProps {
  ticketId?: string;
  ticketNumber?: string;
  projectId?: string;
  projectName?: string;
  onClose?: () => void;
}

interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

type IncidentSeverity = 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
type UtilityType = 'GAS' | 'ELECTRIC' | 'WATER' | 'TELECOM' | 'SEWER' | 'FIBER' | 'OTHER';

const _UTILITY_TYPES: { value: UtilityType; label: string; icon: string }[] = [
  { value: 'GAS', label: 'Gas', icon: '🔥' },
  { value: 'ELECTRIC', label: 'Electric', icon: '⚡' },
  { value: 'WATER', label: 'Water', icon: '💧' },
  { value: 'TELECOM', label: 'Telecom', icon: '📞' },
  { value: 'SEWER', label: 'Sewer', icon: '🚰' },
  { value: 'FIBER', label: 'Fiber', icon: '🌐' },
  { value: 'OTHER', label: 'Other', icon: '❓' },
];

const _SEVERITY_LEVELS: { value: IncidentSeverity; label: string; description: string }[] = [
  { value: 'MINOR', label: 'Minor', description: 'Small scrape, no damage' },
  { value: 'MODERATE', label: 'Moderate', description: 'Visible damage, no leak/outage' },
  { value: 'SEVERE', label: 'Severe', description: 'Active leak or service disruption' },
  { value: 'CRITICAL', label: 'Critical', description: 'Immediate danger, evacuate area' },
];

export function EmergencyDigUp({
  ticketId,
  ticketNumber,
  projectId,
  projectName,
  onClose,
}: EmergencyDigUpProps) {
  const [step, setStep] = useState<'confirm' | 'details' | 'sending' | 'sent' | 'error'>('confirm');
  const [location, setLocation] = useState<GPSLocation | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [utilityType, setUtilityType] = useState<UtilityType | null>(null);
  const [severity, setSeverity] = useState<IncidentSeverity>('MODERATE');
  const [description, setDescription] = useState('');
  const [crewOnSite, setCrewOnSite] = useState<CrewMember[]>([]);
  const [reporterPhone, setReporterPhone] = useState('');
  const [incidentNumber, setIncidentNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftEmail, setDraftEmail] = useState<{
    to: string;
    subject: string;
    body: string;
    mailto: string;
  } | null>(null);
  const [emailCopied, setEmailCopied] = useState(false);

  // Get GPS location on mount
  useEffect(() => {
    getLocation();
    fetchCrewOnSite();
  }, []);

  const getLocation = () => {
    setIsLocating(true);
    setLocationError(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setIsLocating(false);
      },
      (err) => {
        setLocationError(`Unable to get location: ${err.message}`);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const fetchCrewOnSite = async () => {
    if (!projectId) return;

    try {
      // Get active time entries for today at this project
      const today = new Date().toISOString().split('T')[0];
      const { data: timeEntries } = await supabase
        .from('time_entries')
        .select(
          `
          crew_member_id,
          crew_members:crew_member_id (id, display_name, trade_classification)
        `
        )
        .eq('project_id', projectId)
        .gte('work_date', today)
        .is('clock_out_time', null);

      if (timeEntries) {
        const crew: CrewMember[] = timeEntries
          .filter((te) => te.crew_members)
          .map((te) => {
            const member = te.crew_members as { id: string; display_name: string | null; trade_classification: string | null };
            return {
              id: member.id,
              name: member.display_name || 'Unknown',
              role: member.trade_classification || 'Worker',
            };
          });
        setCrewOnSite(crew);
      }
    } catch (err) {
      console.error('Error fetching crew:', err);
    }
  };

  const handleEmergencySubmit = async () => {
    if (!utilityType) {
      setError('Please select the utility type');
      return;
    }

    if (!location) {
      setError('Location is required for emergency reports');
      return;
    }

    setStep('sending');
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get user's organization
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('organization_id, first_name, last_name')
        .eq('id', userData.user.id)
        .single();

      if (!userProfile?.organization_id) throw new Error('Organization not found');

      // Create emergency incident record
      const { data: incident, error: insertError } = await supabase
        .from('wv811_emergency_incidents')
        .insert({
          organization_id: userProfile.organization_id,
          incident_type: 'DIG_UP',
          latitude: location.latitude,
          longitude: location.longitude,
          gps_accuracy_meters: location.accuracy,
          ticket_id: ticketId || null,
          project_id: projectId || null,
          reported_by: userData.user.id,
          reporter_phone: reporterPhone || null,
          crew_on_site: JSON.parse(JSON.stringify(crewOnSite)) as unknown as null,
          description: description || `Emergency dig up - ${utilityType} utility struck`,
          utility_type: utilityType,
          severity: severity,
          status: 'OPEN',
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      setIncidentNumber(incident.incident_number);

      // Trigger notification edge function
      const { data: notifyResponse, error: notifyError } = await supabase.functions.invoke('wv811-emergency-notify', {
        body: { incidentId: incident.id },
      });

      if (notifyError) {
        console.error('Notification error:', notifyError);
        // Don't fail the whole operation if notifications fail
      }

      // Capture draft email from response
      if (notifyResponse?.draftEmail) {
        setDraftEmail(notifyResponse.draftEmail);
      }

      setStep('sent');
    } catch (err) {
      console.error('Emergency submit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit emergency report');
      setStep('error');
    }
  };

  const renderConfirmStep = () => (
    <div className="emergency-digup-content">
      <div className="emergency-warning-box">
        <AlertTriangle size={48} className="warning-icon pulse" />
        <h2>Emergency Dig Up Protocol</h2>
        <p>
          This will immediately notify WV811, your safety director, and escalation contacts. Use
          only for actual utility strikes or damage.
        </p>
      </div>

      <div className="emergency-info-section">
        <h3>What happens next:</h3>
        <ol>
          <li>Your GPS location will be captured</li>
          <li>WV811 emergency line will be notified</li>
          <li>Safety Director and PM will receive SMS alerts</li>
          <li>An incident record will be created for documentation</li>
        </ol>
      </div>

      {ticketNumber && (
        <div className="emergency-ticket-info">
          <span className="label">Related Ticket:</span>
          <span className="value">#{ticketNumber}</span>
        </div>
      )}

      {projectName && (
        <div className="emergency-ticket-info">
          <span className="label">Project:</span>
          <span className="value">{projectName}</span>
        </div>
      )}

      <div className="emergency-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel - False Alarm
        </button>
        <button className="btn btn-danger btn-lg" onClick={() => setStep('details')}>
          <AlertTriangle size={20} />
          Continue - This is Real
        </button>
      </div>
    </div>
  );

  const renderDetailsStep = () => (
    <div className="emergency-digup-content">
      <div className="emergency-header-small">
        <AlertTriangle size={24} className="warning-icon" />
        <h2>Report Details</h2>
      </div>

      {/* Location Status */}
      <div className="emergency-location-status">
        <MapPin size={18} />
        {isLocating ? (
          <span className="locating">
            <Loader2 size={16} className="spin" /> Getting GPS location...
          </span>
        ) : location ? (
          <span className="located">
            <CheckCircle size={16} /> Location captured ({location.accuracy.toFixed(0)}m accuracy)
          </span>
        ) : (
          <span className="location-error">
            <XCircle size={16} /> {locationError || 'Location unavailable'}
            <button onClick={getLocation} className="retry-link">
              Retry
            </button>
          </span>
        )}
      </div>

      {/* Utility Type Selection */}
      <div className="form-group">
        <label>
          What utility was struck? <span className="required">*</span>
        </label>
        <div className="utility-type-grid">
          {_UTILITY_TYPES.map((type) => (
            <button
              key={type.value}
              className={`utility-type-btn ${utilityType === type.value ? 'selected' : ''}`}
              onClick={() => setUtilityType(type.value)}
            >
              <span className="utility-icon">{type.icon}</span>
              <span className="utility-label">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Severity Selection */}
      <div className="form-group">
        <label>Severity Level</label>
        <div className="severity-options">
          {_SEVERITY_LEVELS.map((level) => (
            <label
              key={level.value}
              className={`severity-option ${severity === level.value ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="severity"
                value={level.value}
                checked={severity === level.value}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
              />
              <div className="severity-content">
                <span className={`severity-label severity-${level.value.toLowerCase()}`}>
                  {level.label}
                </span>
                <span className="severity-desc">{level.description}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Description */}
      <div className="form-group">
        <label>Brief Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What happened? Any visible damage?"
          rows={2}
        />
      </div>

      {/* Callback Phone */}
      <div className="form-group">
        <label>
          <Phone size={16} /> Your Callback Number
        </label>
        <input
          type="tel"
          value={reporterPhone}
          onChange={(e) => setReporterPhone(e.target.value)}
          placeholder="304-555-1234"
        />
      </div>

      {/* Crew on Site */}
      {crewOnSite.length > 0 && (
        <div className="form-group">
          <label>
            <Users size={16} /> Crew On Site ({crewOnSite.length})
          </label>
          <div className="crew-list">
            {crewOnSite.map((member) => (
              <span key={member.id} className="crew-tag">
                {member.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="emergency-actions">
        <button className="btn btn-secondary" onClick={() => setStep('confirm')}>
          Back
        </button>
        <button className="btn btn-danger btn-lg" onClick={handleEmergencySubmit}>
          <Send size={20} />
          Send Emergency Report
        </button>
      </div>
    </div>
  );

  const renderSendingStep = () => (
    <div className="emergency-digup-content emergency-sending">
      <Loader2 size={64} className="spin" />
      <h2>Sending Emergency Report...</h2>
      <p>Notifying WV811 and safety contacts</p>
    </div>
  );

  const copyEmailToClipboard = async () => {
    if (!draftEmail) return;
    const fullEmail = `To: ${draftEmail.to}\nSubject: ${draftEmail.subject}\n\n${draftEmail.body}`;
    await navigator.clipboard.writeText(fullEmail);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 3000);
  };

  const renderSentStep = () => (
    <div className="emergency-digup-content emergency-sent">
      <CheckCircle size={64} className="success-icon" />
      <h2>Emergency Report Sent</h2>
      <p className="incident-number">Incident #{incidentNumber}</p>

      {/* Draft Email to 811 */}
      {draftEmail && (
        <div className="draft-email-section">
          <div className="draft-email-header">
            <Mail size={20} />
            <h3>Email WV811</h3>
          </div>
          <p className="draft-email-desc">
            A draft email has been prepared. Click to send via your email client:
          </p>
          <a href={draftEmail.mailto} className="send-email-btn">
            <Mail size={20} />
            Open Email to WV811
            <ExternalLink size={16} />
          </a>
          <div className="draft-email-preview">
            <div className="email-field">
              <span className="label">To:</span>
              <span className="value">{draftEmail.to}</span>
            </div>
            <div className="email-field">
              <span className="label">Subject:</span>
              <span className="value">{draftEmail.subject}</span>
            </div>
            <div className="email-body-preview">
              <pre>{draftEmail.body.substring(0, 300)}...</pre>
            </div>
            <button className="copy-email-btn" onClick={copyEmailToClipboard}>
              {emailCopied ? (
                <>
                  <CheckCircle size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy Full Email
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="next-steps">
        <h3>Next Steps:</h3>
        <ol>
          <li>Secure the area - keep everyone back</li>
          <li>If gas: eliminate ignition sources</li>
          <li>If electric: stay away, assume live</li>
          <li>Wait for safety director to call</li>
          <li>Take photos when safe to do so</li>
        </ol>
      </div>

      <div className="emergency-contact-info">
        <h3>Emergency Contacts:</h3>
        <a href="tel:811" className="emergency-phone-btn">
          <Phone size={20} />
          Call 811 Direct
        </a>
        <p className="hint">Your safety contacts have been notified via SMS</p>
      </div>

      <button className="btn btn-primary" onClick={onClose}>
        Close
      </button>
    </div>
  );

  const renderErrorStep = () => (
    <div className="emergency-digup-content emergency-error">
      <XCircle size={64} className="error-icon" />
      <h2>Submission Failed</h2>
      <p>{error}</p>

      <div className="fallback-contact">
        <p>
          <strong>Call 811 directly:</strong>
        </p>
        <a href="tel:811" className="emergency-phone-btn">
          <Phone size={24} />
          811
        </a>
      </div>

      <div className="emergency-actions">
        <button className="btn btn-secondary" onClick={() => setStep('details')}>
          Try Again
        </button>
        <button className="btn btn-primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );

  return (
    <div className="emergency-digup-modal-overlay">
      <div className={`emergency-digup-modal ${step}`}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        {step === 'confirm' && renderConfirmStep()}
        {step === 'details' && renderDetailsStep()}
        {step === 'sending' && renderSendingStep()}
        {step === 'sent' && renderSentStep()}
        {step === 'error' && renderErrorStep()}
      </div>
    </div>
  );
}

// Floating Emergency Button Component (for mobile dashboard)
export function EmergencyDigUpButton({ onPress }: { onPress: () => void }) {
  return (
    <button className="emergency-fab" onClick={onPress} aria-label="Emergency Dig Up">
      <AlertTriangle size={28} />
      <span className="emergency-fab-label">DIG UP</span>
    </button>
  );
}
