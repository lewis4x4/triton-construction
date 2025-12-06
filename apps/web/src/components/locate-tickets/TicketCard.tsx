import { Link } from 'react-router-dom';
import { MapPin, Calendar, Clock, Building2, ChevronRight } from 'lucide-react';
import { StatusBadge, type TicketStatus } from './StatusBadge';

export interface TicketData {
  id: string;
  ticket_number: string;
  dig_site_address: string;
  dig_site_city?: string;
  dig_site_county?: string;
  excavator_company?: string;
  work_type?: string;
  legal_dig_date: string;
  ticket_expires_at: string;
  status: TicketStatus;
  total_utilities: number;
  responded_utilities: number;
  hours_until_dig?: number;
}

interface TicketCardProps {
  ticket: TicketData;
}

export function TicketCard({ ticket }: TicketCardProps) {
  const pendingUtilities = ticket.total_utilities - ticket.responded_utilities;
  const legalDigDate = new Date(ticket.legal_dig_date);
  const expiresAt = new Date(ticket.ticket_expires_at);
  const today = new Date();

  // Calculate urgency
  const daysUntilDig = Math.ceil((legalDigDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilExpire = Math.ceil((expiresAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const getUrgencyClass = () => {
    if (daysUntilDig <= 0) return 'urgency-critical';
    if (daysUntilDig <= 1) return 'urgency-high';
    if (daysUntilDig <= 2) return 'urgency-medium';
    return '';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Link to={`/locate-tickets/${ticket.id}`} className={`ticket-card ${getUrgencyClass()}`}>
      <div className="ticket-card-header">
        <div className="ticket-card-title">
          <span className="ticket-number">#{ticket.ticket_number}</span>
          <StatusBadge status={ticket.status} />
        </div>
        <ChevronRight size={20} className="ticket-card-arrow" />
      </div>

      <div className="ticket-card-location">
        <MapPin size={16} />
        <span>
          {ticket.dig_site_address}
          {ticket.dig_site_city && `, ${ticket.dig_site_city}`}
          {ticket.dig_site_county && ` (${ticket.dig_site_county} County)`}
        </span>
      </div>

      {ticket.excavator_company && (
        <div className="ticket-card-excavator">
          <Building2 size={16} />
          <span>{ticket.excavator_company}</span>
        </div>
      )}

      <div className="ticket-card-dates">
        <div className="ticket-date">
          <Calendar size={14} />
          <span>
            Legal Dig: <strong>{formatDate(legalDigDate)}</strong>
            {daysUntilDig <= 0 && <span className="date-warning"> (Today!)</span>}
            {daysUntilDig === 1 && <span className="date-warning"> (Tomorrow)</span>}
          </span>
        </div>
        <div className="ticket-date">
          <Clock size={14} />
          <span>
            Expires: <strong>{formatDate(expiresAt)}</strong>
            {daysUntilExpire <= 3 && daysUntilExpire > 0 && (
              <span className="date-warning"> ({daysUntilExpire} days)</span>
            )}
          </span>
        </div>
      </div>

      <div className="ticket-card-footer">
        <div className="utility-status">
          {pendingUtilities > 0 ? (
            <span className="utilities-pending">
              {pendingUtilities} of {ticket.total_utilities} utilities pending
            </span>
          ) : (
            <span className="utilities-complete">
              All {ticket.total_utilities} utilities responded
            </span>
          )}
        </div>
        {ticket.work_type && (
          <span className="work-type-tag">{ticket.work_type.replace('_', ' ')}</span>
        )}
      </div>
    </Link>
  );
}
