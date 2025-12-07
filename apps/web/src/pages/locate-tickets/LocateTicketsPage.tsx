import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Plus, Settings, RefreshCw, AlertTriangle, CheckCircle, Clock, Shovel, Radio, Map, ArrowUpDown, BarChart3 } from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { TicketCard, type TicketData } from '../../components/locate-tickets/TicketCard';
import { type TicketStatus } from '../../components/locate-tickets/StatusBadge';
import { NewTicketModal } from '../../components/locate-tickets/NewTicketModal';
import './LocateTicketsPage.css';

type FilterStatus = 'ALL' | TicketStatus | 'EXPIRING_SOON';
type SortOption = 'dig_date' | 'risk_score' | 'expires' | 'created';

interface TicketStats {
  total: number;
  pending: number;
  clear: number;
  conflict: number;
  expiringSoon: number;
  expired: number;
}

export function LocateTicketsPage() {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('risk_score');
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    pending: 0,
    clear: 0,
    conflict: 0,
    expiringSoon: 0,
    expired: 0,
  });

  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase.from('wv811_tickets').select('*');

      // Apply sort
      switch (sortBy) {
        case 'risk_score':
          query = query.order('risk_score', { ascending: false, nullsFirst: false });
          break;
        case 'expires':
          query = query.order('ticket_expires_at', { ascending: true });
          break;
        case 'created':
          query = query.order('created_at', { ascending: false });
          break;
        case 'dig_date':
        default:
          query = query.order('legal_dig_date', { ascending: true });
      }

      // Apply status filter
      if (filter !== 'ALL' && filter !== 'EXPIRING_SOON') {
        query = query.eq('status', filter);
      } else if (filter === 'EXPIRING_SOON') {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        query = query
          .lte('ticket_expires_at', threeDaysFromNow.toISOString().split('T')[0])
          .not('status', 'in', '("EXPIRED","CANCELLED","CLEAR")');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setTickets(data || []);

      // Calculate stats
      const allTickets = data || [];
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      setStats({
        total: allTickets.length,
        pending: allTickets.filter((t) => t.status === 'PENDING').length,
        clear: allTickets.filter((t) => t.status === 'CLEAR').length,
        conflict: allTickets.filter((t) => t.status === 'CONFLICT').length,
        expiringSoon: allTickets.filter(
          (t) =>
            new Date(t.ticket_expires_at) <= threeDaysFromNow &&
            !['EXPIRED', 'CANCELLED', 'CLEAR'].includes(t.status)
        ).length,
        expired: allTickets.filter((t) => t.status === 'EXPIRED').length,
      });
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load tickets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filter, sortBy]);

  // Set up realtime subscription
  useEffect(() => {
    const subscription = supabase
      .channel('wv811_tickets_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wv811_tickets' },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const filterButtons: Array<{ key: FilterStatus; label: string; count?: number }> = [
    { key: 'ALL', label: 'All', count: stats.total },
    { key: 'PENDING', label: 'Pending', count: stats.pending },
    { key: 'CLEAR', label: 'Clear', count: stats.clear },
    { key: 'CONFLICT', label: 'Conflict', count: stats.conflict },
    { key: 'EXPIRING_SOON', label: 'Expiring Soon', count: stats.expiringSoon },
    { key: 'EXPIRED', label: 'Expired', count: stats.expired },
  ];

  return (
    <div className="locate-tickets-page">
      <div className="page-header">
        <div className="header-content">
          <div className="header-title">
            <MapPin size={28} strokeWidth={1.5} />
            <h1>WV811 Locate Tickets</h1>
          </div>
          <p className="header-subtitle">Manage utility locate requests and track responses</p>
        </div>
        <div className="header-actions">
          <Link to="/locate-tickets/dig-check" className="btn btn-success">
            <Shovel size={18} />
            Can I Dig?
          </Link>
          <Link to="/locate-tickets/radar" className="btn btn-secondary">
            <Radio size={18} />
            Daily Radar
          </Link>
          <Link to="/locate-tickets/map" className="btn btn-secondary">
            <Map size={18} />
            Map View
          </Link>
          <Link to="/locate-tickets/analytics" className="btn btn-secondary">
            <BarChart3 size={18} />
            Analytics
          </Link>
          <button onClick={fetchTickets} className="btn btn-secondary" disabled={isLoading}>
            <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            Refresh
          </button>
          <Link to="/locate-tickets/settings" className="btn btn-secondary">
            <Settings size={18} />
            Alert Settings
          </Link>
          <button className="btn btn-primary" onClick={() => setIsNewTicketOpen(true)}>
            <Plus size={18} />
            New Ticket
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="ticket-stats">
        <div className="stat-card stat-pending">
          <Clock size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending Response</span>
          </div>
        </div>
        <div className="stat-card stat-expiring">
          <AlertTriangle size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.expiringSoon}</span>
            <span className="stat-label">Expiring Soon</span>
          </div>
        </div>
        <div className="stat-card stat-conflict">
          <AlertTriangle size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.conflict}</span>
            <span className="stat-label">Conflicts</span>
          </div>
        </div>
        <div className="stat-card stat-clear">
          <CheckCircle size={24} />
          <div className="stat-content">
            <span className="stat-value">{stats.clear}</span>
            <span className="stat-label">All Clear</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-row">
        <div className="filter-tabs">
          {filterButtons.map((btn) => (
            <button
              key={btn.key}
              className={`filter-tab ${filter === btn.key ? 'active' : ''}`}
              onClick={() => setFilter(btn.key)}
            >
              {btn.label}
              {btn.count !== undefined && btn.count > 0 && (
                <span className="filter-count">{btn.count}</span>
              )}
            </button>
          ))}
        </div>
        <div className="sort-control">
          <ArrowUpDown size={16} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="sort-select"
          >
            <option value="risk_score">Priority (Risk Score)</option>
            <option value="dig_date">Dig Date</option>
            <option value="expires">Expiration Date</option>
            <option value="created">Newest First</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="tickets-content">
        {error && (
          <div className="error-message">
            <AlertTriangle size={18} />
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading tickets...</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <MapPin size={48} strokeWidth={1} />
            <h3>No tickets found</h3>
            <p>
              {filter === 'ALL'
                ? 'Tickets will appear here when received from WV811.'
                : `No tickets with status "${filter.replace('_', ' ')}".`}
            </p>
          </div>
        ) : (
          <div className="tickets-grid">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} />
            ))}
          </div>
        )}
      </div>

      {/* New Ticket Modal */}
      <NewTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        onSuccess={() => {
          fetchTickets();
          setIsNewTicketOpen(false);
        }}
      />
    </div>
  );
}
