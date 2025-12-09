import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Map, RefreshCw, List, Filter, AlertTriangle, MapPin, CheckCircle2 } from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { TicketMap, type MapTicket } from '../../components/locate-tickets/TicketMap';
import { type TicketStatus } from '../../components/locate-tickets/StatusBadge';
import './TicketMapPage.css';

type FilterStatus = 'ALL' | TicketStatus | 'HIGH_RISK';

export function TicketMapPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<MapTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [showFilters, setShowFilters] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);

  const fetchTickets = async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('v_wv811_tickets_with_coords')
        .select('id, ticket_number, dig_site_address, dig_site_city, status, legal_dig_date, ticket_expires_at, latitude, longitude, risk_score, has_gas_utility, has_electric_utility')
        .not('status', 'in', '("EXPIRED","CANCELLED")');

      if (filter !== 'ALL' && filter !== 'HIGH_RISK') {
        query = query.eq('status', filter);
      } else if (filter === 'HIGH_RISK') {
        query = query.or('risk_score.gte.70,has_gas_utility.eq.true,has_electric_utility.eq.true');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Transform data to MapTicket format
      const mapTickets: MapTicket[] = (data || []).map((t) => {
        return {
          id: t.id || '',
          ticket_number: t.ticket_number || '',
          dig_site_address: t.dig_site_address || '',
          dig_site_city: t.dig_site_city || null,
          status: (t.status || 'RECEIVED') as TicketStatus,
          legal_dig_date: t.legal_dig_date || '',
          ticket_expires_at: t.ticket_expires_at || '',
          latitude: t.latitude,
          longitude: t.longitude,
          risk_score: t.risk_score || 0,
          has_gas_utility: t.has_gas_utility || false,
          has_electric_utility: t.has_electric_utility || false,
        };
      });

      setTickets(mapTickets);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Failed to load tickets. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filter]);

  const handleTicketClick = (ticketId: string) => {
    navigate(`/locate-tickets/${ticketId}`);
  };

  const handleGeocodeAll = async () => {
    setIsGeocoding(true);
    setGeocodeResult(null);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('geocode-ticket', {
        body: {
          geocodeAll: true,
          limit: 50, // Process up to 50 at a time
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      setGeocodeResult({
        success: true,
        message: data.message || `Geocoded ${data.successful || 0} tickets`,
        count: data.successful,
      });

      // Refresh the map to show new coordinates
      if (data.successful > 0) {
        await fetchTickets();
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Failed to geocode tickets';
      setGeocodeResult({
        success: false,
        message: errorMsg,
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const filterOptions: Array<{ key: FilterStatus; label: string }> = [
    { key: 'ALL', label: 'All Active' },
    { key: 'PENDING', label: 'Pending' },
    { key: 'CLEAR', label: 'Clear' },
    { key: 'CONFLICT', label: 'Conflict' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'HIGH_RISK', label: 'High Risk' },
  ];

  const ticketsWithCoords = tickets.filter((t) => t.latitude != null && t.longitude != null);
  const ticketsWithoutCoords = tickets.filter((t) => t.latitude == null || t.longitude == null);

  return (
    <div className="ticket-map-page">
      <div className="map-header">
        <div className="header-left">
          <Link to="/locate-tickets" className="back-link">
            <ArrowLeft size={16} />
            Back to List
          </Link>
          <div className="header-title">
            <Map size={24} />
            <h1>Ticket Map</h1>
          </div>
        </div>
        <div className="header-right">
          <div className="map-stats">
            <span className="stat">{ticketsWithCoords.length} on map</span>
            {ticketsWithoutCoords.length > 0 && (
              <>
                <span className="stat warning">{ticketsWithoutCoords.length} unmapped</span>
                <button
                  onClick={handleGeocodeAll}
                  className="btn btn-geocode"
                  disabled={isGeocoding}
                  title="Geocode tickets without coordinates"
                >
                  <MapPin size={14} />
                  {isGeocoding ? 'Geocoding...' : 'Geocode All'}
                </button>
              </>
            )}
            {geocodeResult && (
              <span className={`stat ${geocodeResult.success ? 'success' : 'error'}`}>
                {geocodeResult.success && <CheckCircle2 size={14} />}
                {geocodeResult.message}
              </span>
            )}
          </div>
          <div className="header-actions">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-secondary ${showFilters ? 'active' : ''}`}
            >
              <Filter size={18} />
              Filter
            </button>
            <button onClick={fetchTickets} className="btn btn-secondary" disabled={isLoading}>
              <RefreshCw size={18} className={isLoading ? 'spin' : ''} />
            </button>
            <Link to="/locate-tickets" className="btn btn-secondary">
              <List size={18} />
              List View
            </Link>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="filter-bar">
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              className={`filter-chip ${filter === opt.key ? 'active' : ''}`}
              onClick={() => setFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="map-error">
          <AlertTriangle size={18} />
          {error}
        </div>
      )}

      <div className="map-container">
        {isLoading ? (
          <div className="loading-overlay">
            <div className="loading-spinner" />
            <p>Loading map...</p>
          </div>
        ) : (
          <TicketMap
            tickets={tickets}
            onTicketClick={handleTicketClick}
          />
        )}
      </div>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-title">Status</div>
        <div className="legend-items">
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#3b82f6' }} />
            Pending
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#22c55e' }} />
            Clear
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#ef4444' }} />
            Conflict
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#f59e0b' }} />
            In Progress
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: '#6b7280' }} />
            Expired
          </div>
        </div>
        <div className="legend-item" style={{ marginTop: '8px' }}>
          <span className="legend-dot high-risk" style={{ background: '#ef4444', border: '2px solid #ef4444' }}>!</span>
          High Risk (Gas/Electric)
        </div>
      </div>
    </div>
  );
}
