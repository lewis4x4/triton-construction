import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Radio,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  MapPin,
  Shovel,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { StatusBadge, type TicketStatus } from '../../components/locate-tickets/StatusBadge';
import './DailyRadarPage.css';

interface TicketSummary {
  id: string;
  ticket_number: string;
  dig_site_address: string;
  dig_site_city: string;
  status: TicketStatus;
  legal_dig_date: string;
  ticket_expires_at: string;
  update_by_date: string | null;
  work_date: string | null;
  excavator_company: string | null;
  done_for: string | null;
  risk_score: number;
  has_gas_utility: boolean;
  has_electric_utility: boolean;
  pending_utilities: number;
  total_utilities: number;
}

interface RadarData {
  workingToday: TicketSummary[];
  expiringToday: TicketSummary[];
  updateDueToday: TicketSummary[];
  pendingResponses: TicketSummary[];
  highRisk: TicketSummary[];
  stats: {
    totalActive: number;
    workingToday: number;
    expiringToday: number;
    pendingResponses: number;
    highRisk: number;
  };
}

export function DailyRadarPage() {
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const fetchRadarData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      // Fetch all active tickets
      const { data: tickets, error: fetchError } = await supabase
        .from('wv811_tickets')
        .select('*')
        .not('status', 'in', '("EXPIRED","CANCELLED","CLEAR")')
        .order('risk_score', { ascending: false });

      if (fetchError) throw fetchError;

      const allTickets = (tickets || []) as TicketSummary[];

      // Categorize tickets
      const workingToday = allTickets.filter(
        (t) => t.work_date && t.work_date.startsWith(today)
      );

      const expiringToday = allTickets.filter(
        (t) => t.ticket_expires_at && t.ticket_expires_at <= tomorrow
      );

      const updateDueToday = allTickets.filter(
        (t) => t.update_by_date && t.update_by_date.startsWith(today)
      );

      const pendingResponses = allTickets.filter(
        (t) => t.status === 'PENDING' || (t.pending_utilities && t.pending_utilities > 0)
      );

      const highRisk = allTickets.filter(
        (t) => t.risk_score >= 70 || t.has_gas_utility || t.has_electric_utility
      );

      setRadarData({
        workingToday,
        expiringToday,
        updateDueToday,
        pendingResponses,
        highRisk,
        stats: {
          totalActive: allTickets.length,
          workingToday: workingToday.length,
          expiringToday: expiringToday.length,
          pendingResponses: pendingResponses.length,
          highRisk: highRisk.length,
        },
      });
    } catch (err) {
      console.error('Error fetching radar data:', err);
      setError('Failed to load radar data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRadarData();
  }, []);

  const sendRadarEmail = async () => {
    setIsSending(true);
    try {
      const { error: invokeError } = await supabase.functions.invoke('wv811-daily-radar', {
        body: { action: 'send' },
      });
      if (invokeError) throw invokeError;
      alert('Daily Radar email sent successfully!');
    } catch (err) {
      console.error('Error sending radar:', err);
      alert('Failed to send radar email.');
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="daily-radar-page">
      <div className="radar-header">
        <Link to="/locate-tickets" className="back-link">
          <ArrowLeft size={16} />
          Back to Tickets
        </Link>
        <div className="header-content">
          <div className="header-title">
            <Radio size={28} strokeWidth={1.5} />
            <h1>Daily 811 Safety Radar</h1>
          </div>
          <p className="header-subtitle">{today}</p>
        </div>
        <div className="header-actions">
          <button onClick={fetchRadarData} className="btn btn-secondary" disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            Refresh
          </button>
          <button onClick={sendRadarEmail} className="btn btn-primary" disabled={isSending}>
            <Send size={18} />
            {isSending ? 'Sending...' : 'Send Email Briefing'}
          </button>
        </div>
      </div>

      {error && (
        <div className="radar-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading safety radar...</p>
        </div>
      ) : radarData ? (
        <div className="radar-content">
          {/* Quick Stats */}
          <div className="radar-stats">
            <div className="radar-stat stat-total">
              <MapPin size={24} />
              <div className="stat-content">
                <span className="stat-value">{radarData.stats.totalActive}</span>
                <span className="stat-label">Active Tickets</span>
              </div>
            </div>
            <div className="radar-stat stat-working">
              <Shovel size={24} />
              <div className="stat-content">
                <span className="stat-value">{radarData.stats.workingToday}</span>
                <span className="stat-label">Working Today</span>
              </div>
            </div>
            <div className="radar-stat stat-expiring">
              <Clock size={24} />
              <div className="stat-content">
                <span className="stat-value">{radarData.stats.expiringToday}</span>
                <span className="stat-label">Expiring Today</span>
              </div>
            </div>
            <div className="radar-stat stat-pending">
              <Users size={24} />
              <div className="stat-content">
                <span className="stat-value">{radarData.stats.pendingResponses}</span>
                <span className="stat-label">Awaiting Response</span>
              </div>
            </div>
            <div className="radar-stat stat-risk">
              <AlertTriangle size={24} />
              <div className="stat-content">
                <span className="stat-value">{radarData.stats.highRisk}</span>
                <span className="stat-label">High Risk</span>
              </div>
            </div>
          </div>

          {/* Red Zone: Critical Items */}
          {(radarData.highRisk.length > 0 || radarData.expiringToday.length > 0) && (
            <div className="radar-zone zone-red">
              <div className="zone-header">
                <AlertTriangle size={20} />
                <h2>Critical Attention Required</h2>
              </div>
              <div className="zone-content">
                {radarData.expiringToday.length > 0 && (
                  <div className="zone-section">
                    <h3>Expiring Today/Tomorrow</h3>
                    <div className="ticket-list">
                      {radarData.expiringToday.map((ticket) => (
                        <Link
                          key={ticket.id}
                          to={`/locate-tickets/${ticket.id}`}
                          className="radar-ticket-card"
                        >
                          <div className="ticket-main">
                            <span className="ticket-number">{ticket.ticket_number}</span>
                            <StatusBadge status={ticket.status} />
                          </div>
                          <div className="ticket-location">{ticket.dig_site_address}</div>
                          <div className="ticket-meta">
                            <span className="meta-item urgent">
                              <Clock size={14} />
                              Expires: {formatDate(ticket.ticket_expires_at)}
                            </span>
                            {ticket.done_for && (
                              <span className="meta-item">
                                <Users size={14} />
                                {ticket.done_for}
                              </span>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {radarData.highRisk.filter(t => !radarData.expiringToday.includes(t)).length > 0 && (
                  <div className="zone-section">
                    <h3>High Risk Tickets</h3>
                    <div className="ticket-list">
                      {radarData.highRisk
                        .filter((t) => !radarData.expiringToday.includes(t))
                        .slice(0, 5)
                        .map((ticket) => (
                          <Link
                            key={ticket.id}
                            to={`/locate-tickets/${ticket.id}`}
                            className="radar-ticket-card"
                          >
                            <div className="ticket-main">
                              <span className="ticket-number">{ticket.ticket_number}</span>
                              <StatusBadge status={ticket.status} />
                              {ticket.has_gas_utility && (
                                <span className="utility-flag gas">GAS</span>
                              )}
                              {ticket.has_electric_utility && (
                                <span className="utility-flag electric">ELEC</span>
                              )}
                            </div>
                            <div className="ticket-location">{ticket.dig_site_address}</div>
                            <div className="ticket-meta">
                              <span className="meta-item">
                                <Calendar size={14} />
                                Dig Date: {formatDate(ticket.legal_dig_date)}
                              </span>
                              <span className="risk-score">Risk: {ticket.risk_score}</span>
                            </div>
                          </Link>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Yellow Zone: Working Today */}
          {radarData.workingToday.length > 0 && (
            <div className="radar-zone zone-yellow">
              <div className="zone-header">
                <Shovel size={20} />
                <h2>Active Work Today</h2>
              </div>
              <div className="zone-content">
                <div className="ticket-list">
                  {radarData.workingToday.map((ticket) => (
                    <Link
                      key={ticket.id}
                      to={`/locate-tickets/${ticket.id}`}
                      className="radar-ticket-card"
                    >
                      <div className="ticket-main">
                        <span className="ticket-number">{ticket.ticket_number}</span>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <div className="ticket-location">{ticket.dig_site_address}</div>
                      <div className="ticket-meta">
                        <span className="meta-item">
                          <MapPin size={14} />
                          {ticket.dig_site_city}
                        </span>
                        {ticket.excavator_company && (
                          <span className="meta-item">
                            <Users size={14} />
                            {ticket.excavator_company}
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Blue Zone: Pending Responses */}
          {radarData.pendingResponses.length > 0 && (
            <div className="radar-zone zone-blue">
              <div className="zone-header">
                <Clock size={20} />
                <h2>Awaiting Utility Response</h2>
              </div>
              <div className="zone-content">
                <div className="ticket-list">
                  {radarData.pendingResponses.slice(0, 10).map((ticket) => (
                    <Link
                      key={ticket.id}
                      to={`/locate-tickets/${ticket.id}`}
                      className="radar-ticket-card"
                    >
                      <div className="ticket-main">
                        <span className="ticket-number">{ticket.ticket_number}</span>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <div className="ticket-location">{ticket.dig_site_address}</div>
                      <div className="ticket-meta">
                        <span className="meta-item">
                          <Calendar size={14} />
                          Dig Date: {formatDate(ticket.legal_dig_date)}
                        </span>
                        {ticket.pending_utilities > 0 && (
                          <span className="meta-item pending">
                            {ticket.pending_utilities} of {ticket.total_utilities} pending
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Green Zone: All Clear */}
          {radarData.stats.totalActive === 0 && (
            <div className="radar-zone zone-green">
              <div className="zone-header">
                <CheckCircle size={20} />
                <h2>All Clear</h2>
              </div>
              <div className="zone-content">
                <p className="all-clear-message">
                  No active locate tickets require attention today.
                </p>
              </div>
            </div>
          )}

          {/* Update Due Today */}
          {radarData.updateDueToday.length > 0 && (
            <div className="radar-zone zone-orange">
              <div className="zone-header">
                <Calendar size={20} />
                <h2>Response Due Today</h2>
              </div>
              <div className="zone-content">
                <div className="ticket-list">
                  {radarData.updateDueToday.map((ticket) => (
                    <Link
                      key={ticket.id}
                      to={`/locate-tickets/${ticket.id}`}
                      className="radar-ticket-card"
                    >
                      <div className="ticket-main">
                        <span className="ticket-number">{ticket.ticket_number}</span>
                        <StatusBadge status={ticket.status} />
                      </div>
                      <div className="ticket-location">{ticket.dig_site_address}</div>
                      <div className="ticket-meta">
                        <span className="meta-item urgent">
                          <Clock size={14} />
                          Update By: {formatDate(ticket.update_by_date)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
