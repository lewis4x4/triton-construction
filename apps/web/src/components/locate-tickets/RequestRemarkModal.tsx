import { useState } from 'react';
import { X, RefreshCw, AlertTriangle, CheckCircle, Send } from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './RequestRemarkModal.css';

interface RequestRemarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticketId: string;
  ticketNumber: string;
  address: string;
  onSuccess?: () => void;
}

const REMARK_REASONS = [
  { value: 'MARKS_FADED', label: 'Marks have faded or weathered' },
  { value: 'MARKS_DISTURBED', label: 'Marks were disturbed by construction activity' },
  { value: 'EXTENDED_WORK', label: 'Work area has been extended' },
  { value: 'MARKS_INCORRECT', label: 'Marks appear to be incorrect or missing' },
  { value: 'WEATHER_DAMAGE', label: 'Weather damaged marks (rain, snow, etc.)' },
  { value: 'TIME_EXPIRED', label: 'Original marking validity period expiring' },
  { value: 'OTHER', label: 'Other reason' },
];

export function RequestRemarkModal({
  isOpen,
  onClose,
  ticketId,
  ticketNumber,
  address,
  onSuccess,
}: RequestRemarkModalProps) {
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [urgency, setUrgency] = useState<'NORMAL' | 'URGENT'>('NORMAL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Create a note entry for the re-mark request
      const noteContent = `**RE-MARK REQUEST**\n\nReason: ${REMARK_REASONS.find(r => r.value === selectedReason)?.label || selectedReason}\nUrgency: ${urgency}\n${additionalNotes ? `\nAdditional Notes: ${additionalNotes}` : ''}`;

      const { error: noteError } = await supabase
        .from('wv811_ticket_notes')
        .insert({
          ticket_id: ticketId,
          user_id: userData.user.id,
          note_type: 'REMARK_REQUEST',
          content: noteContent,
        });

      if (noteError) throw noteError;

      // Update ticket status to indicate re-mark requested
      const { error: updateError } = await supabase
        .from('wv811_tickets')
        .update({
          remark_requested: true,
          remark_requested_at: new Date().toISOString(),
          remark_reason: selectedReason,
        })
        .eq('id', ticketId);

      // Note: If columns don't exist yet, we'll just log the note
      if (updateError) {
        console.log('Could not update ticket remark fields (may not exist yet):', updateError);
      }

      setSubmitStatus('success');

      // Auto-close after success
      setTimeout(() => {
        onSuccess?.();
        onClose();
        // Reset state
        setSelectedReason('');
        setAdditionalNotes('');
        setUrgency('NORMAL');
        setSubmitStatus('idle');
      }, 1500);

    } catch (err) {
      console.error('Error submitting re-mark request:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to submit request');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="remark-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <RefreshCw size={20} />
            Request Re-Mark
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {submitStatus === 'success' ? (
            <div className="success-message">
              <CheckCircle size={48} />
              <h3>Request Submitted</h3>
              <p>Your re-mark request has been logged and will be processed.</p>
            </div>
          ) : (
            <>
              <div className="ticket-info">
                <div className="info-item">
                  <span className="label">Ticket:</span>
                  <span className="value">#{ticketNumber}</span>
                </div>
                <div className="info-item">
                  <span className="label">Address:</span>
                  <span className="value">{address}</span>
                </div>
              </div>

              <div className="form-group">
                <label className="required">Reason for Re-Mark Request</label>
                <div className="reason-options">
                  {REMARK_REASONS.map((reason) => (
                    <label key={reason.value} className="reason-option">
                      <input
                        type="radio"
                        name="remark-reason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(e) => setSelectedReason(e.target.value)}
                      />
                      <span className="radio-label">{reason.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Urgency Level</label>
                <div className="urgency-options">
                  <label className={`urgency-option ${urgency === 'NORMAL' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="urgency"
                      value="NORMAL"
                      checked={urgency === 'NORMAL'}
                      onChange={() => setUrgency('NORMAL')}
                    />
                    <span>Normal</span>
                    <small>Within standard response time</small>
                  </label>
                  <label className={`urgency-option urgent ${urgency === 'URGENT' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="urgency"
                      value="URGENT"
                      checked={urgency === 'URGENT'}
                      onChange={() => setUrgency('URGENT')}
                    />
                    <AlertTriangle size={16} />
                    <span>Urgent</span>
                    <small>Work stoppage risk</small>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Additional Notes (Optional)</label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  placeholder="Provide any additional details about the re-mark request..."
                  rows={3}
                />
              </div>

              {submitStatus === 'error' && (
                <div className="error-banner">
                  <AlertTriangle size={16} />
                  {errorMessage || 'Failed to submit request. Please try again.'}
                </div>
              )}
            </>
          )}
        </div>

        {submitStatus !== 'success' && (
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSubmit}
              disabled={!selectedReason || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Request
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
