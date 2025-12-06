import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Building2,
  User,
  Phone,
  Mail,
  Wrench,
  AlertTriangle,
  MessageSquare,
  Paperclip,
  Send,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import {
  StatusBadge,
  ResponseStatusBadge,
  type TicketStatus,
  type ResponseStatus,
} from '../../components/locate-tickets/StatusBadge';
import { EnhancedLocationMap } from '../../components/locate-tickets/EnhancedLocationMap';
import { RequestRemarkModal } from '../../components/locate-tickets/RequestRemarkModal';
import { PhotoCaptureModal } from '../../components/locate-tickets/PhotoCaptureModal';
import './TicketDetail.css';

interface TicketDetailData {
  id: string;
  ticket_number: string;
  ticket_type?: string;
  dig_site_address: string;
  dig_site_city?: string;
  dig_site_county?: string;
  dig_site_state?: string;
  dig_site_zip?: string;
  cross_street_1?: string;
  cross_street_2?: string;
  location_description?: string;
  excavator_company?: string;
  excavator_name?: string;
  excavator_phone?: string;
  excavator_email?: string;
  excavator_address?: string;
  work_type?: string;
  work_description?: string;
  depth_in_inches?: number;
  extent_description?: string;
  ticket_created_at: string;
  legal_dig_date: string;
  ticket_expires_at: string;
  work_start_date?: string;
  work_end_date?: string;
  status: TicketStatus;
  total_utilities: number;
  responded_utilities: number;
  notes?: string;
  created_at: string;
}

interface UtilityResponse {
  id: string;
  utility_code: string;
  utility_name: string;
  utility_type?: string;
  response_type: string;
  response_status?: ResponseStatus | null;
  response_received_at?: string;
  response_message?: string;
  contact_name?: string;
  contact_phone?: string;
  marking_instructions?: string;
  response_window_opens_at?: string;
  response_window_closes_at?: string;
  verified_by?: string;
  verified_at?: string;
  verification_notes?: string;
  conflict_reason?: string;
}

interface TicketNote {
  id: string;
  note_type: string;
  content: string;
  created_at: string;
  user_id: string;
  user_profiles?: {
    first_name?: string;
    last_name?: string;
  };
}

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [utilities, setUtilities] = useState<UtilityResponse[]>([]);
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  const fetchTicketData = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('wv811_tickets')
        .select('*')
        .eq('id', id)
        .single();

      if (ticketError) throw ticketError;
      setTicket(ticketData);

      // Fetch utility responses
      const { data: utilityData, error: utilityError } = await supabase
        .from('wv811_utility_responses')
        .select('*')
        .eq('ticket_id', id)
        .order('utility_name');

      if (utilityError) throw utilityError;
      setUtilities(utilityData || []);

      // Fetch notes (without join - user_profiles uses same id as auth.users)
      const { data: notesData, error: notesError } = await supabase
        .from('wv811_ticket_notes')
        .select('*')
        .eq('ticket_id', id)
        .order('created_at', { ascending: false });

      if (notesError) throw notesError;

      // Fetch user profiles for notes separately
      if (notesData && notesData.length > 0) {
        const userIds = [...new Set(notesData.map((n) => n.user_id).filter(Boolean))];
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('user_profiles')
            .select('id, first_name, last_name')
            .in('id', userIds);

          const profileMap = new Map(profilesData?.map((p) => [p.id, p]) || []);
          const notesWithProfiles = notesData.map((note) => ({
            ...note,
            user_profiles: profileMap.get(note.user_id) || null,
          }));
          setNotes(notesWithProfiles);
        } else {
          setNotes(notesData);
        }
      } else {
        setNotes([]);
      }
    } catch (err) {
      console.error('Error fetching ticket:', err);
      setError('Failed to load ticket details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketData();
  }, [id]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !id) return;

    setIsSubmittingNote(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { error } = await supabase.from('wv811_ticket_notes').insert({
        ticket_id: id,
        user_id: userData.user.id,
        note_type: 'COMMENT',
        content: newNote.trim(),
      });

      if (error) throw error;

      setNewNote('');
      fetchTicketData();
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="ticket-detail-page">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading ticket details...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="ticket-detail-page">
        <div className="error-container">
          <AlertTriangle size={48} />
          <h2>Error Loading Ticket</h2>
          <p>{error || 'Ticket not found'}</p>
          <Link to="/locate-tickets" className="btn btn-primary">
            Back to Tickets
          </Link>
        </div>
      </div>
    );
  }

  const legalDigDate = new Date(ticket.legal_dig_date);
  const expiresAt = new Date(ticket.ticket_expires_at);
  const today = new Date();
  const daysUntilDig = Math.ceil((legalDigDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilExpire = Math.ceil((expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="ticket-detail-page">
      {/* Header */}
      <div className="detail-header">
        <Link to="/locate-tickets" className="back-link">
          <ArrowLeft size={18} />
          Back to Tickets
        </Link>
        <div className="header-row">
          <div className="header-info">
            <h1>
              Ticket #{ticket.ticket_number}
              {ticket.ticket_type && <span className="ticket-type">{ticket.ticket_type}</span>}
            </h1>
            <StatusBadge status={ticket.status} size="lg" />
          </div>
          <div className="header-actions">
            <button className="btn btn-secondary">Update Status</button>
            <button className="btn btn-primary" onClick={() => setShowRemarkModal(true)}>
              Request Re-mark
            </button>
          </div>
        </div>
      </div>

      <div className="detail-content">
        {/* Left Column */}
        <div className="detail-main">
          {/* Location Card */}
          <div className="detail-card">
            <h2>
              <MapPin size={20} />
              Dig Site Location
            </h2>
            <div className="location-info">
              <p className="address-primary">{ticket.dig_site_address}</p>
              <p className="address-secondary">
                {[ticket.dig_site_city, ticket.dig_site_state, ticket.dig_site_zip]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {ticket.dig_site_county && (
                <p className="address-county">{ticket.dig_site_county} County</p>
              )}
              {(ticket.cross_street_1 || ticket.cross_street_2) && (
                <p className="cross-streets">
                  Cross Streets:{' '}
                  {[ticket.cross_street_1, ticket.cross_street_2].filter(Boolean).join(' & ')}
                </p>
              )}
              {ticket.location_description && (
                <p className="location-notes">{ticket.location_description}</p>
              )}
            </div>
            {/* Interactive Location Map with Satellite/3D/Terrain */}
            <EnhancedLocationMap
              address={ticket.dig_site_address}
              city={ticket.dig_site_city}
              state={ticket.dig_site_state || 'WV'}
              county={ticket.dig_site_county}
              zip={ticket.dig_site_zip}
              ticketNumber={ticket.ticket_number}
              ticketStatus={ticket.status}
              height={320}
              showExpandButton={true}
            />
          </div>

          {/* Utility Responses Card */}
          <div className="detail-card">
            <h2>
              <Building2 size={20} />
              Utility Responses
              <span className="response-count">
                {ticket.responded_utilities} of {ticket.total_utilities} responded
              </span>
            </h2>
            {utilities.length === 0 ? (
              <p className="no-utilities">No utilities listed for this ticket.</p>
            ) : (
              <div className="utility-table-container">
                <table className="utility-table">
                  <thead>
                    <tr>
                      <th>Utility</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Response</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilities.map((utility) => (
                      <tr key={utility.id}>
                        <td>
                          <div className="utility-name">{utility.utility_name}</div>
                          <div className="utility-code">{utility.utility_code}</div>
                        </td>
                        <td>{utility.utility_type || '-'}</td>
                        <td>
                          <ResponseStatusBadge
                            status={utility.response_status}
                            showIcon={true}
                            windowClosesAt={utility.response_window_closes_at}
                          />
                          {utility.response_status === 'UNVERIFIED' && (
                            <div className="unverified-warning">
                              <AlertTriangle size={12} />
                              <span>Proceed at own risk</span>
                            </div>
                          )}
                        </td>
                        <td>
                          {utility.response_message || utility.marking_instructions || '-'}
                          {utility.response_received_at && (
                            <div className="response-date">
                              {formatDateTime(utility.response_received_at)}
                            </div>
                          )}
                          {utility.conflict_reason && (
                            <div className="conflict-reason">
                              <strong>Conflict:</strong> {utility.conflict_reason}
                            </div>
                          )}
                          {utility.verified_at && (
                            <div className="verified-info">
                              Verified on {formatDateTime(utility.verified_at)}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes Card */}
          <div className="detail-card">
            <h2>
              <MessageSquare size={20} />
              Notes & Activity
            </h2>
            <div className="notes-input">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note..."
                rows={3}
              />
              <button
                className="btn btn-primary"
                onClick={handleAddNote}
                disabled={!newNote.trim() || isSubmittingNote}
              >
                <Send size={16} />
                Add Note
              </button>
            </div>
            {notes.length === 0 ? (
              <p className="no-notes">No notes yet.</p>
            ) : (
              <div className="notes-list">
                {notes.map((note) => (
                  <div key={note.id} className={`note-item note-${note.note_type.toLowerCase()}`}>
                    <div className="note-header">
                      <span className="note-author">
                        {note.user_profiles?.first_name
                          ? `${note.user_profiles.first_name} ${note.user_profiles.last_name || ''}`
                          : 'System'}
                      </span>
                      <span className="note-date">{formatDateTime(note.created_at)}</span>
                    </div>
                    <div className="note-content">{note.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="detail-sidebar">
          {/* Key Dates Card */}
          <div className="sidebar-card">
            <h3>
              <Calendar size={18} />
              Key Dates
            </h3>
            <div className="date-list">
              <div className="date-item">
                <span className="date-label">Ticket Created</span>
                <span className="date-value">{formatDateTime(ticket.ticket_created_at)}</span>
              </div>
              <div className={`date-item ${daysUntilDig <= 1 ? 'date-urgent' : ''}`}>
                <span className="date-label">Legal Dig Date</span>
                <span className="date-value">
                  {formatDate(ticket.legal_dig_date)}
                  {daysUntilDig <= 0 && <span className="date-badge urgent">Today!</span>}
                  {daysUntilDig === 1 && <span className="date-badge warning">Tomorrow</span>}
                </span>
              </div>
              <div className={`date-item ${daysUntilExpire <= 3 ? 'date-warning' : ''}`}>
                <span className="date-label">Expires</span>
                <span className="date-value">
                  {formatDate(ticket.ticket_expires_at)}
                  {daysUntilExpire <= 3 && daysUntilExpire > 0 && (
                    <span className="date-badge warning">{daysUntilExpire} days</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Excavator Info Card */}
          <div className="sidebar-card">
            <h3>
              <User size={18} />
              Excavator
            </h3>
            <div className="excavator-info">
              {ticket.excavator_company && (
                <div className="info-row">
                  <Building2 size={16} />
                  <span>{ticket.excavator_company}</span>
                </div>
              )}
              {ticket.excavator_name && (
                <div className="info-row">
                  <User size={16} />
                  <span>{ticket.excavator_name}</span>
                </div>
              )}
              {ticket.excavator_phone && (
                <div className="info-row">
                  <Phone size={16} />
                  <a href={`tel:${ticket.excavator_phone}`}>{ticket.excavator_phone}</a>
                </div>
              )}
              {ticket.excavator_email && (
                <div className="info-row">
                  <Mail size={16} />
                  <a href={`mailto:${ticket.excavator_email}`}>{ticket.excavator_email}</a>
                </div>
              )}
            </div>
          </div>

          {/* Work Details Card */}
          <div className="sidebar-card">
            <h3>
              <Wrench size={18} />
              Work Details
            </h3>
            <div className="work-info">
              {ticket.work_type && (
                <div className="info-row">
                  <span className="info-label">Type:</span>
                  <span>{ticket.work_type.replace('_', ' ')}</span>
                </div>
              )}
              {ticket.depth_in_inches && (
                <div className="info-row">
                  <span className="info-label">Depth:</span>
                  <span>{ticket.depth_in_inches}" ({(ticket.depth_in_inches / 12).toFixed(1)} ft)</span>
                </div>
              )}
              {ticket.work_description && (
                <div className="work-description">{ticket.work_description}</div>
              )}
              {ticket.extent_description && (
                <div className="work-extent">
                  <span className="info-label">Extent:</span>
                  <span>{ticket.extent_description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Attachments Card */}
          <div className="sidebar-card">
            <h3>
              <Paperclip size={18} />
              Photo Evidence
            </h3>
            <div className="attachments-placeholder">
              <p>Document your work with categorized photos.</p>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowPhotoUpload(true)}
              >
                Add Photo Evidence
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Request Re-mark Modal */}
      <RequestRemarkModal
        isOpen={showRemarkModal}
        onClose={() => setShowRemarkModal(false)}
        ticketId={ticket.id}
        ticketNumber={ticket.ticket_number}
        address={ticket.dig_site_address}
        onSuccess={fetchTicketData}
      />

      {/* Photo Capture Modal - Evidence Locker */}
      <PhotoCaptureModal
        isOpen={showPhotoUpload}
        onClose={() => setShowPhotoUpload(false)}
        ticketId={ticket.id}
        ticketNumber={ticket.ticket_number}
        onUploadComplete={fetchTicketData}
      />
    </div>
  );
}
