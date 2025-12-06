import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  FileText,
  Link,
  ChevronRight,
  X,
  Loader2,
  Copy,
  ExternalLink,
  History,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './TicketRenewal.css';

interface TicketRenewalProps {
  ticketId: string;
  ticketNumber: string;
  expiresAt: string;
  legalDigDate: string;
  projectId?: string;
  onRenewed?: (newTicketId: string) => void;
  onClose?: () => void;
}

interface ChainedTicket {
  id: string;
  ticketNumber: string;
  createdAt: string;
  expiresAt: string;
  status: string;
  isOriginal: boolean;
}

interface RenewalFormData {
  extendDays: number;
  workContinuing: boolean;
  sameLocation: boolean;
  notes: string;
}

export function TicketRenewalModal({
  ticketId,
  ticketNumber,
  expiresAt,
  legalDigDate,
  projectId,
  onRenewed,
  onClose,
}: TicketRenewalProps) {
  const [step, setStep] = useState<'review' | 'form' | 'submitting' | 'done'>('review');
  const [chainedTickets, setChainedTickets] = useState<ChainedTicket[]>([]);
  const [formData, setFormData] = useState<RenewalFormData>({
    extendDays: 10,
    workContinuing: true,
    sameLocation: true,
    notes: '',
  });
  const [newTicketNumber, setNewTicketNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingChain, setIsLoadingChain] = useState(true);

  const expiryDate = new Date(expiresAt);
  const now = new Date();
  const hoursUntilExpiry = Math.max(0, (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60));
  const isExpired = hoursUntilExpiry <= 0;
  const isUrgent = hoursUntilExpiry <= 48;

  useEffect(() => {
    loadTicketChain();
  }, [ticketId]);

  const loadTicketChain = async () => {
    setIsLoadingChain(true);
    try {
      // Get the ticket and its chain
      const { data: currentTicket } = await supabase
        .from('wv811_tickets')
        .select('id, ticket_number, created_at, ticket_expires_at, status, parent_ticket_id, original_ticket_id')
        .eq('id', ticketId)
        .single();

      if (!currentTicket) return;

      // Get all tickets in the chain
      const originalId = currentTicket.original_ticket_id || currentTicket.id;

      const { data: chainTickets } = await supabase
        .from('wv811_tickets')
        .select('id, ticket_number, created_at, ticket_expires_at, status')
        .or(`id.eq.${originalId},original_ticket_id.eq.${originalId}`)
        .order('created_at', { ascending: true });

      if (chainTickets) {
        const chain: ChainedTicket[] = chainTickets.map((t, index) => ({
          id: t.id,
          ticketNumber: t.ticket_number,
          createdAt: t.created_at,
          expiresAt: t.ticket_expires_at,
          status: t.status,
          isOriginal: index === 0,
        }));
        setChainedTickets(chain);
      }
    } catch (err) {
      console.error('Error loading ticket chain:', err);
    } finally {
      setIsLoadingChain(false);
    }
  };

  const handleRenewal = async () => {
    setStep('submitting');
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get current ticket details
      const { data: currentTicket } = await supabase
        .from('wv811_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (!currentTicket) throw new Error('Ticket not found');

      // Calculate new dates
      const newLegalDigDate = new Date();
      newLegalDigDate.setDate(newLegalDigDate.getDate() + 2); // 2 business days

      const newExpiresAt = new Date(newLegalDigDate);
      newExpiresAt.setDate(newExpiresAt.getDate() + formData.extendDays);

      // Generate new ticket number (would come from 811 system in real implementation)
      const generatedNumber = `${ticketNumber}-R${chainedTickets.length + 1}`;

      // Create renewal ticket
      const { data: newTicket, error: insertError } = await supabase
        .from('wv811_tickets')
        .insert({
          organization_id: currentTicket.organization_id,
          ticket_number: generatedNumber,
          status: 'ACTIVE',
          dig_site_address: currentTicket.dig_site_address,
          dig_site_city: currentTicket.dig_site_city,
          dig_site_county: currentTicket.dig_site_county,
          dig_site_state: currentTicket.dig_site_state,
          dig_site_zip: currentTicket.dig_site_zip,
          dig_site_latitude: currentTicket.dig_site_latitude,
          dig_site_longitude: currentTicket.dig_site_longitude,
          excavator_name: currentTicket.excavator_name,
          excavator_phone: currentTicket.excavator_phone,
          excavator_email: currentTicket.excavator_email,
          work_type: currentTicket.work_type,
          work_description: currentTicket.work_description,
          legal_dig_date: newLegalDigDate.toISOString(),
          ticket_expires_at: newExpiresAt.toISOString(),
          parent_ticket_id: ticketId,
          original_ticket_id: currentTicket.original_ticket_id || ticketId,
          renewal_reason: formData.notes || 'Work continuing',
          is_renewal: true,
          renewed_by: userData.user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Copy utility responses from original
      const { data: utilResponses } = await supabase
        .from('wv811_utility_responses')
        .select('*')
        .eq('ticket_id', ticketId);

      if (utilResponses && utilResponses.length > 0) {
        const newResponses = utilResponses.map((resp) => ({
          ticket_id: newTicket.id,
          utility_name: resp.utility_name,
          utility_code: resp.utility_code,
          utility_type: resp.utility_type,
          response_status: 'PENDING', // Reset status for new ticket
          response_window_closes_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        }));

        await supabase.from('wv811_utility_responses').insert(newResponses);
      }

      // Link to project if applicable
      if (projectId) {
        await supabase.from('wv811_project_tickets').insert({
          project_id: projectId,
          ticket_id: newTicket.id,
          linked_by: userData.user.id,
        });
      }

      // Mark old ticket as renewed
      await supabase
        .from('wv811_tickets')
        .update({ status: 'RENEWED', renewed_by_ticket_id: newTicket.id })
        .eq('id', ticketId);

      // Add audit note
      await supabase.from('wv811_ticket_notes').insert({
        ticket_id: ticketId,
        user_id: userData.user.id,
        note_type: 'RENEWAL',
        content: `Ticket renewed. New ticket: #${generatedNumber}. Reason: ${formData.notes || 'Work continuing'}`,
      });

      setNewTicketNumber(generatedNumber);
      setStep('done');
      onRenewed?.(newTicket.id);

    } catch (err) {
      console.error('Renewal error:', err);
      setError(err instanceof Error ? err.message : 'Failed to renew ticket');
      setStep('form');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderReviewStep = () => (
    <div className="renewal-content">
      <div className={`renewal-header ${isExpired ? 'expired' : isUrgent ? 'urgent' : ''}`}>
        <RefreshCw size={32} className="header-icon" />
        <h2>{isExpired ? 'Ticket Expired - Renewal Required' : 'Renew Ticket'}</h2>
        <p>
          {isExpired
            ? 'This ticket has expired. You must renew before continuing work.'
            : `Ticket expires in ${Math.round(hoursUntilExpiry)} hours`}
        </p>
      </div>

      <div className="current-ticket-info">
        <div className="info-row">
          <span className="label">Ticket Number</span>
          <span className="value">#{ticketNumber}</span>
        </div>
        <div className="info-row">
          <span className="label">Legal Dig Date</span>
          <span className="value">{formatDate(legalDigDate)}</span>
        </div>
        <div className="info-row">
          <span className="label">Expires</span>
          <span className={`value ${isExpired ? 'expired' : isUrgent ? 'urgent' : ''}`}>
            {formatDate(expiresAt)}
            {isExpired && <span className="status-badge expired">EXPIRED</span>}
            {!isExpired && isUrgent && <span className="status-badge urgent">SOON</span>}
          </span>
        </div>
      </div>

      {/* Ticket Chain */}
      {chainedTickets.length > 1 && (
        <div className="ticket-chain">
          <h4>
            <Link size={16} />
            Ticket Chain ({chainedTickets.length} tickets)
          </h4>
          <div className="chain-timeline">
            {chainedTickets.map((t, index) => (
              <div key={t.id} className={`chain-item ${t.id === ticketId ? 'current' : ''}`}>
                <div className="chain-dot" />
                <div className="chain-info">
                  <span className="chain-number">#{t.ticketNumber}</span>
                  <span className="chain-dates">
                    {formatDate(t.createdAt)} - {formatDate(t.expiresAt)}
                  </span>
                  <span className={`chain-status ${t.status.toLowerCase()}`}>{t.status}</span>
                </div>
                {index < chainedTickets.length - 1 && <div className="chain-line" />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="renewal-warning">
        <AlertTriangle size={18} />
        <div>
          <strong>WV811 Requirement:</strong> Renewal must be requested at least 48 hours before
          ticket expiration. Work must stop if ticket expires without renewal.
        </div>
      </div>

      <div className="renewal-actions">
        <button className="btn btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={() => setStep('form')}>
          <RefreshCw size={18} />
          Request Renewal
        </button>
      </div>
    </div>
  );

  const renderFormStep = () => (
    <div className="renewal-content">
      <div className="form-header">
        <RefreshCw size={24} className="form-icon" />
        <h2>Renewal Details</h2>
      </div>

      <div className="form-group">
        <label>Extension Period</label>
        <div className="extension-options">
          {[5, 10, 15].map((days) => (
            <button
              key={days}
              className={`extension-option ${formData.extendDays === days ? 'selected' : ''}`}
              onClick={() => setFormData({ ...formData, extendDays: days })}
            >
              {days} days
            </button>
          ))}
        </div>
        <span className="form-hint">
          New expiration: {formatDate(new Date(Date.now() + (2 + formData.extendDays) * 24 * 60 * 60 * 1000).toISOString())}
        </span>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.workContinuing}
            onChange={(e) => setFormData({ ...formData, workContinuing: e.target.checked })}
          />
          <span>Work is continuing at this location</span>
        </label>
      </div>

      <div className="form-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.sameLocation}
            onChange={(e) => setFormData({ ...formData, sameLocation: e.target.checked })}
          />
          <span>Dig area unchanged from original ticket</span>
        </label>
      </div>

      <div className="form-group">
        <label>
          <FileText size={14} /> Notes (optional)
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Reason for renewal, work progress notes..."
          rows={3}
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="renewal-actions">
        <button className="btn btn-secondary" onClick={() => setStep('review')}>
          Back
        </button>
        <button className="btn btn-primary" onClick={handleRenewal}>
          <RefreshCw size={18} />
          Submit Renewal
        </button>
      </div>
    </div>
  );

  const renderSubmittingStep = () => (
    <div className="renewal-content submitting">
      <Loader2 size={48} className="spin" />
      <h2>Processing Renewal...</h2>
      <p>Creating new ticket and linking to chain</p>
    </div>
  );

  const renderDoneStep = () => (
    <div className="renewal-content done">
      <CheckCircle size={64} className="success-icon" />
      <h2>Ticket Renewed</h2>
      <div className="new-ticket-info">
        <span className="label">New Ticket Number</span>
        <div className="ticket-number-copy">
          <span className="number">#{newTicketNumber}</span>
          <button
            className="copy-btn"
            onClick={() => navigator.clipboard.writeText(newTicketNumber || '')}
          >
            <Copy size={14} />
          </button>
        </div>
      </div>

      <div className="renewal-summary">
        <div className="summary-item">
          <Calendar size={16} />
          <span>New expiration: {formatDate(new Date(Date.now() + (2 + formData.extendDays) * 24 * 60 * 60 * 1000).toISOString())}</span>
        </div>
        <div className="summary-item">
          <Link size={16} />
          <span>Linked to original ticket #{ticketNumber}</span>
        </div>
        <div className="summary-item">
          <History size={16} />
          <span>Ticket chain updated ({chainedTickets.length + 1} total)</span>
        </div>
      </div>

      <div className="renewal-actions">
        <button className="btn btn-primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className="renewal-modal-overlay">
      <div className="renewal-modal">
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        {step === 'review' && renderReviewStep()}
        {step === 'form' && renderFormStep()}
        {step === 'submitting' && renderSubmittingStep()}
        {step === 'done' && renderDoneStep()}
      </div>
    </div>
  );
}

// Compact renewal button for use in ticket cards
export function RenewalButton({
  ticketId,
  ticketNumber,
  expiresAt,
  legalDigDate,
  projectId,
  onRenewed,
}: Omit<TicketRenewalProps, 'onClose'>) {
  const [showModal, setShowModal] = useState(false);

  const expiryDate = new Date(expiresAt);
  const hoursUntilExpiry = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const isExpired = hoursUntilExpiry <= 0;
  const isUrgent = hoursUntilExpiry <= 48;

  return (
    <>
      <button
        className={`renewal-btn ${isExpired ? 'expired' : isUrgent ? 'urgent' : ''}`}
        onClick={() => setShowModal(true)}
      >
        <RefreshCw size={14} />
        {isExpired ? 'Renew (Expired)' : isUrgent ? 'Renew Soon' : 'Renew'}
      </button>

      {showModal && (
        <TicketRenewalModal
          ticketId={ticketId}
          ticketNumber={ticketNumber}
          expiresAt={expiresAt}
          legalDigDate={legalDigDate}
          projectId={projectId}
          onRenewed={onRenewed}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
