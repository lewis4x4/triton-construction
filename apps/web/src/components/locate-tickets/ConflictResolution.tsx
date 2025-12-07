import { useState } from 'react';
import {
  XCircle,
  AlertTriangle,
  CheckCircle,
  User,
  Calendar,
  FileText,
  X,
  Send,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './ConflictResolution.css';

interface ConflictInfo {
  utilityResponseId: string;
  utilityName: string;
  utilityCode: string;
  utilityType?: string;
  conflictReason?: string;
  conflictLoggedBy?: string;
  conflictLoggedByName?: string;
  conflictLoggedAt?: string;
  ticketId: string;
  ticketNumber: string;
}

interface ConflictResolutionProps {
  conflict: ConflictInfo;
  onResolved?: () => void;
  onClose?: () => void;
}

type ResolutionType = 'CLEARED' | 'FALSE_ALARM' | 'MARKS_VERIFIED' | 'UTILITY_RESPONSE' | 'ALTERNATE_ROUTE';

const RESOLUTION_TYPES: { value: ResolutionType; label: string; description: string }[] = [
  {
    value: 'CLEARED',
    label: 'Conflict Cleared',
    description: 'Issue has been resolved and area is now clear to dig',
  },
  {
    value: 'UTILITY_RESPONSE',
    label: 'Utility Provided Response',
    description: 'Utility company provided updated information resolving the conflict',
  },
  {
    value: 'MARKS_VERIFIED',
    label: 'Marks Verified On-Site',
    description: 'Physical verification confirmed marks are accurate or no conflict exists',
  },
  {
    value: 'FALSE_ALARM',
    label: 'False Alarm',
    description: 'Initial conflict report was inaccurate or a misunderstanding',
  },
  {
    value: 'ALTERNATE_ROUTE',
    label: 'Alternate Route Taken',
    description: 'Work will proceed in a different location avoiding the conflict area',
  },
];

export function ConflictResolutionModal({ conflict, onResolved, onClose }: ConflictResolutionProps) {
  const [step, setStep] = useState<'review' | 'resolve' | 'submitting' | 'done'>('review');
  const [resolutionType, setResolutionType] = useState<ResolutionType | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [notifyOriginalReporter, setNotifyOriginalReporter] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleSubmitResolution = async () => {
    if (!resolutionType) {
      setError('Please select a resolution type');
      return;
    }

    if (!resolutionNotes.trim()) {
      setError('Please provide resolution notes');
      return;
    }

    setStep('submitting');
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Update the utility response with resolution
      const { error: updateError } = await supabase
        .from('wv811_utility_responses')
        .update({
          response_status: 'CLEAR', // Conflict resolved means clear to proceed
          conflict_resolved_by: userData.user.id,
          conflict_resolved_at: new Date().toISOString(),
          conflict_resolution_notes: `[${resolutionType}] ${resolutionNotes}`,
        })
        .eq('id', conflict.utilityResponseId);

      if (updateError) throw updateError;

      // Add a ticket note for audit trail
      await supabase.from('wv811_ticket_notes').insert({
        ticket_id: conflict.ticketId,
        user_id: userData.user.id,
        note_type: 'CONFLICT_RESOLUTION',
        content: `Conflict resolved for ${conflict.utilityName} (${conflict.utilityCode}).\n\nResolution Type: ${resolutionType}\n\nNotes: ${resolutionNotes}`,
      });

      // If notifying original reporter, create an alert
      if (notifyOriginalReporter && conflict.conflictLoggedBy) {
        // Create an in-app notification (simplified for now)
        await supabase.from('wv811_ticket_alerts').insert({
          ticket_id: conflict.ticketId,
          user_id: conflict.conflictLoggedBy,
          alert_type: 'CONFLICT_RESOLVED',
          channel: 'IN_APP',
          priority: 'INFO',
          subject: `Conflict Resolved - ${conflict.utilityName}`,
          body: `The conflict you reported for ${conflict.utilityName} on ticket #${conflict.ticketNumber} has been resolved. Resolution: ${resolutionType}`,
          sent_at: new Date().toISOString(),
        });
      }

      setStep('done');
      onResolved?.();
    } catch (err) {
      console.error('Resolution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
      setStep('resolve');
    }
  };

  const renderReviewStep = () => (
    <div className="conflict-resolution-content">
      <div className="conflict-header">
        <XCircle size={48} className="conflict-icon" />
        <h2>Active Conflict</h2>
        <p>This utility has a reported conflict that must be resolved before work can proceed.</p>
      </div>

      <div className="conflict-details-card">
        <div className="conflict-utility-info">
          <span className="utility-name">{conflict.utilityName}</span>
          <span className="utility-code">{conflict.utilityCode}</span>
          {conflict.utilityType && <span className="utility-type">{conflict.utilityType}</span>}
        </div>

        <div className="conflict-ticket-ref">
          <span className="label">Ticket:</span>
          <span className="value">#{conflict.ticketNumber}</span>
        </div>

        <div className="conflict-reason-box">
          <div className="reason-header">
            <AlertTriangle size={16} />
            <span>Conflict Reason</span>
          </div>
          <p className="reason-text">{conflict.conflictReason || 'No reason provided'}</p>
        </div>

        <div className="conflict-meta">
          <div className="meta-item">
            <User size={14} />
            <span>Reported by: {conflict.conflictLoggedByName || 'Unknown'}</span>
          </div>
          <div className="meta-item">
            <Calendar size={14} />
            <span>{formatDateTime(conflict.conflictLoggedAt)}</span>
          </div>
        </div>
      </div>

      <div className="conflict-warning">
        <AlertTriangle size={18} />
        <div>
          <strong>DO NOT DIG</strong> until this conflict is resolved. Only authorized personnel (PM
          or higher) can resolve conflicts.
        </div>
      </div>

      <div className="conflict-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
        <button className="btn btn-primary" onClick={() => setStep('resolve')}>
          <CheckCircle size={18} />
          Resolve Conflict
        </button>
      </div>
    </div>
  );

  const renderResolveStep = () => (
    <div className="conflict-resolution-content">
      <div className="resolve-header">
        <CheckCircle size={32} className="resolve-icon" />
        <h2>Resolve Conflict</h2>
        <p>Document how this conflict was resolved for audit purposes.</p>
      </div>

      <div className="form-group">
        <label>
          Resolution Type <span className="required">*</span>
        </label>
        <div className="resolution-type-options">
          {RESOLUTION_TYPES.map((type) => (
            <button
              key={type.value}
              className={`resolution-type-option ${resolutionType === type.value ? 'selected' : ''}`}
              onClick={() => setResolutionType(type.value)}
            >
              <span className="option-label">{type.label}</span>
              <span className="option-desc">{type.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>
          <FileText size={14} />
          Resolution Notes <span className="required">*</span>
        </label>
        <textarea
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          placeholder="Provide details about how the conflict was resolved. Include any relevant information for future reference..."
          rows={4}
        />
        <span className="form-hint">
          This will be recorded in the audit trail and included in 811 Audit Packs.
        </span>
      </div>

      <div className="form-group checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={notifyOriginalReporter}
            onChange={(e) => setNotifyOriginalReporter(e.target.checked)}
          />
          <span>
            <MessageSquare size={14} />
            Notify original reporter ({conflict.conflictLoggedByName || 'user'}) of resolution
          </span>
        </label>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="conflict-actions">
        <button className="btn btn-secondary" onClick={() => setStep('review')}>
          Back
        </button>
        <button className="btn btn-success" onClick={handleSubmitResolution}>
          <Send size={18} />
          Submit Resolution
        </button>
      </div>
    </div>
  );

  const renderSubmittingStep = () => (
    <div className="conflict-resolution-content submitting">
      <Loader2 size={48} className="spin" />
      <h2>Submitting Resolution...</h2>
      <p>Updating utility status and creating audit records</p>
    </div>
  );

  const renderDoneStep = () => (
    <div className="conflict-resolution-content done">
      <CheckCircle size={64} className="success-icon" />
      <h2>Conflict Resolved</h2>
      <p>
        The conflict for {conflict.utilityName} has been resolved. The utility status has been
        updated to CLEAR.
      </p>
      {notifyOriginalReporter && conflict.conflictLoggedByName && (
        <p className="notification-sent">
          {conflict.conflictLoggedByName} has been notified of the resolution.
        </p>
      )}
      <button className="btn btn-primary" onClick={onClose}>
        Done
      </button>
    </div>
  );

  return (
    <div className="conflict-resolution-modal-overlay">
      <div className="conflict-resolution-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        {step === 'review' && renderReviewStep()}
        {step === 'resolve' && renderResolveStep()}
        {step === 'submitting' && renderSubmittingStep()}
        {step === 'done' && renderDoneStep()}
      </div>
    </div>
  );
}

// Inline conflict badge for utility response table rows
export function ConflictBadge({
  utilityResponseId,
  utilityName,
  utilityCode,
  utilityType,
  conflictReason,
  conflictLoggedBy,
  conflictLoggedByName,
  conflictLoggedAt,
  ticketId,
  ticketNumber,
  canResolve,
  onResolved,
}: ConflictInfo & { canResolve: boolean; onResolved?: () => void }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="conflict-badge-container">
        <span className="conflict-badge">
          <XCircle size={14} />
          CONFLICT
        </span>
        {canResolve && (
          <button className="resolve-btn" onClick={() => setShowModal(true)}>
            Resolve
          </button>
        )}
      </div>

      {showModal && (
        <ConflictResolutionModal
          conflict={{
            utilityResponseId,
            utilityName,
            utilityCode,
            utilityType,
            conflictReason,
            conflictLoggedBy,
            conflictLoggedByName,
            conflictLoggedAt,
            ticketId,
            ticketNumber,
          }}
          onResolved={() => {
            setShowModal(false);
            onResolved?.();
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// Log Conflict Modal - for reporting new conflicts
interface LogConflictModalProps {
  utilityResponseId: string;
  utilityName: string;
  utilityCode: string;
  ticketId: string;
  ticketNumber: string;
  onLogged?: () => void;
  onClose: () => void;
}

export function LogConflictModal({
  utilityResponseId,
  utilityName,
  utilityCode,
  ticketId,
  ticketNumber,
  onLogged,
  onClose,
}: LogConflictModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please describe the conflict');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Update utility response with conflict
      const { error: updateError } = await supabase
        .from('wv811_utility_responses')
        .update({
          response_status: 'CONFLICT',
          conflict_logged_by: userData.user.id,
          conflict_logged_at: new Date().toISOString(),
          conflict_reason: reason,
        })
        .eq('id', utilityResponseId);

      if (updateError) throw updateError;

      // Add a ticket note
      await supabase.from('wv811_ticket_notes').insert({
        ticket_id: ticketId,
        user_id: userData.user.id,
        note_type: 'CONFLICT_REPORTED',
        content: `CONFLICT REPORTED for ${utilityName} (${utilityCode}).\n\nReason: ${reason}\n\n⚠️ DO NOT DIG until this conflict is resolved.`,
      });

      // Create alert for PM
      // TODO: Find PM for this project and send alert

      onLogged?.();
      onClose();
    } catch (err) {
      console.error('Error logging conflict:', err);
      setError(err instanceof Error ? err.message : 'Failed to log conflict');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="conflict-resolution-modal-overlay">
      <div className="conflict-resolution-modal log-conflict">
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="conflict-resolution-content">
          <div className="log-conflict-header">
            <AlertTriangle size={32} className="warning-icon" />
            <h2>Report Conflict</h2>
            <p>Flag an issue that prevents work from proceeding safely.</p>
          </div>

          <div className="conflict-utility-info">
            <span className="utility-name">{utilityName}</span>
            <span className="utility-code">{utilityCode}</span>
            <span className="ticket-ref">Ticket #{ticketNumber}</span>
          </div>

          <div className="form-group">
            <label>
              What's the conflict? <span className="required">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue: missing marks, marks in wrong location, conflicting information, etc."
              rows={4}
            />
          </div>

          <div className="conflict-warning">
            <XCircle size={18} />
            <div>
              Reporting a conflict will mark this utility as <strong>DO NOT DIG</strong> until a PM
              or higher resolves it.
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="conflict-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <AlertTriangle size={18} />
                  Report Conflict
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
