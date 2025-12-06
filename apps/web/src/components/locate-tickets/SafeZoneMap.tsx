import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Layers,
  Navigation,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ChevronRight,
} from 'lucide-react';
import { offlineStorage, OfflineTicket } from '../../services/offlineStorage';
import './SafeZoneMap.css';

interface SafeZoneMapProps {
  tickets?: OfflineTicket[];
  selectedTicketId?: string;
  onTicketSelect?: (ticketId: string) => void;
  showUserLocation?: boolean;
  defaultRadius?: number; // meters
}

interface MapTicket extends OfflineTicket {
  distance?: number;
}

type LayerType = 'all' | 'clear' | 'caution' | 'stop';

export function SafeZoneMap({
  tickets: propTickets,
  selectedTicketId,
  onTicketSelect,
  showUserLocation = true,
  defaultRadius = 100,
}: SafeZoneMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [tickets, setTickets] = useState<MapTicket[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<MapTicket | null>(null);
  const [activeLayer, setActiveLayer] = useState<LayerType>('all');
  const [zoomLevel, setZoomLevel] = useState(15);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  // Load tickets
  useEffect(() => {
    if (propTickets) {
      setTickets(propTickets.filter((t) => t.latitude && t.longitude));
    } else {
      loadOfflineTickets();
    }
  }, [propTickets]);

  // Get user location
  useEffect(() => {
    if (showUserLocation) {
      getUserLocation();
    }
  }, [showUserLocation]);

  // Center map on selected ticket
  useEffect(() => {
    if (selectedTicketId) {
      const ticket = tickets.find((t) => t.id === selectedTicketId);
      if (ticket && ticket.latitude && ticket.longitude) {
        setMapCenter({ lat: ticket.latitude, lng: ticket.longitude });
        setSelectedTicket(ticket);
      }
    }
  }, [selectedTicketId, tickets]);

  const loadOfflineTickets = async () => {
    try {
      const offlineTickets = await offlineStorage.getAllTickets();
      setTickets(offlineTickets.filter((t) => t.latitude && t.longitude));
    } catch (err) {
      console.error('Error loading tickets:', err);
    }
  };

  const getUserLocation = useCallback(() => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        if (!mapCenter) {
          setMapCenter(loc);
        }
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [mapCenter]);

  const handleTicketClick = (ticket: MapTicket) => {
    setSelectedTicket(ticket);
    onTicketSelect?.(ticket.id);
    if (ticket.latitude && ticket.longitude) {
      setMapCenter({ lat: ticket.latitude, lng: ticket.longitude });
    }
  };

  const getStatusColor = (riskLevel: OfflineTicket['riskLevel']): string => {
    switch (riskLevel) {
      case 'CLEAR':
        return '#16a34a';
      case 'CAUTION':
        return '#f59e0b';
      case 'WARNING':
        return '#ea580c';
      case 'STOP':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  const getStatusIcon = (riskLevel: OfflineTicket['riskLevel']) => {
    switch (riskLevel) {
      case 'CLEAR':
        return <CheckCircle size={16} />;
      case 'CAUTION':
      case 'WARNING':
        return <AlertTriangle size={16} />;
      case 'STOP':
        return <XCircle size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    if (activeLayer === 'all') return true;
    if (activeLayer === 'clear') return ticket.riskLevel === 'CLEAR';
    if (activeLayer === 'caution') return ticket.riskLevel === 'CAUTION' || ticket.riskLevel === 'WARNING';
    if (activeLayer === 'stop') return ticket.riskLevel === 'STOP';
    return true;
  });

  // Calculate viewport bounds based on tickets
  const calculateViewportTransform = () => {
    if (!mapCenter) return { x: 0, y: 0, scale: 1 };

    // Simple transform based on zoom level
    const scale = Math.pow(2, zoomLevel - 15);
    return { x: 0, y: 0, scale };
  };

  const transform = calculateViewportTransform();

  // Convert lat/lng to relative position on map (simplified)
  const latLngToPosition = (lat: number, lng: number) => {
    if (!mapCenter) return { x: 50, y: 50 };

    const scale = Math.pow(2, zoomLevel - 12);
    const x = 50 + (lng - mapCenter.lng) * 10000 * scale;
    const y = 50 - (lat - mapCenter.lat) * 10000 * scale;

    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  return (
    <div className="safe-zone-map-container">
      {/* Map Controls */}
      <div className="map-controls">
        <div className="layer-selector">
          <button
            className={`layer-btn ${activeLayer === 'all' ? 'active' : ''}`}
            onClick={() => setActiveLayer('all')}
          >
            <Layers size={14} />
            All
          </button>
          <button
            className={`layer-btn clear ${activeLayer === 'clear' ? 'active' : ''}`}
            onClick={() => setActiveLayer('clear')}
          >
            <CheckCircle size={14} />
            Clear
          </button>
          <button
            className={`layer-btn caution ${activeLayer === 'caution' ? 'active' : ''}`}
            onClick={() => setActiveLayer('caution')}
          >
            <AlertTriangle size={14} />
            Caution
          </button>
          <button
            className={`layer-btn stop ${activeLayer === 'stop' ? 'active' : ''}`}
            onClick={() => setActiveLayer('stop')}
          >
            <XCircle size={14} />
            Stop
          </button>
        </div>

        <div className="zoom-controls">
          <button
            className="zoom-btn"
            onClick={() => setZoomLevel((z) => Math.min(z + 1, 20))}
          >
            <ZoomIn size={18} />
          </button>
          <button
            className="zoom-btn"
            onClick={() => setZoomLevel((z) => Math.max(z - 1, 10))}
          >
            <ZoomOut size={18} />
          </button>
        </div>
      </div>

      {/* Location Button */}
      <button
        className="locate-btn"
        onClick={getUserLocation}
        disabled={isLocating}
        title="Go to my location"
      >
        <Navigation size={20} className={isLocating ? 'spin' : ''} />
      </button>

      {/* Map Area */}
      <div className="map-area" ref={mapRef}>
        {/* Grid Background */}
        <div className="map-grid" />

        {/* Safe Zone Circles */}
        {filteredTickets.map((ticket) => {
          if (!ticket.latitude || !ticket.longitude) return null;
          const pos = latLngToPosition(ticket.latitude, ticket.longitude);
          const color = getStatusColor(ticket.riskLevel);
          const radiusScale = (defaultRadius / 100) * transform.scale * 2;

          return (
            <div
              key={ticket.id}
              className={`safe-zone-circle ${ticket.id === selectedTicket?.id ? 'selected' : ''}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                width: `${radiusScale}%`,
                height: `${radiusScale}%`,
                backgroundColor: `${color}20`,
                borderColor: color,
              }}
              onClick={() => handleTicketClick(ticket)}
            />
          );
        })}

        {/* Ticket Pins */}
        {filteredTickets.map((ticket) => {
          if (!ticket.latitude || !ticket.longitude) return null;
          const pos = latLngToPosition(ticket.latitude, ticket.longitude);
          const color = getStatusColor(ticket.riskLevel);

          return (
            <div
              key={`pin-${ticket.id}`}
              className={`ticket-pin ${ticket.id === selectedTicket?.id ? 'selected' : ''}`}
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                backgroundColor: color,
              }}
              onClick={() => handleTicketClick(ticket)}
            >
              {getStatusIcon(ticket.riskLevel)}
              <div className="pin-label">#{ticket.ticketNumber}</div>
            </div>
          );
        })}

        {/* User Location Marker */}
        {userLocation && (
          <div
            className="user-marker"
            style={{
              left: `${latLngToPosition(userLocation.lat, userLocation.lng).x}%`,
              top: `${latLngToPosition(userLocation.lat, userLocation.lng).y}%`,
            }}
          >
            <div className="user-marker-pulse" />
            <div className="user-marker-dot" />
          </div>
        )}

        {/* No Tickets Message */}
        {filteredTickets.length === 0 && (
          <div className="no-tickets-message">
            <MapPin size={32} />
            <p>No tickets to display</p>
            <span>Sync data or change filter</span>
          </div>
        )}
      </div>

      {/* Selected Ticket Panel */}
      {selectedTicket && (
        <div className={`ticket-panel ${selectedTicket.riskLevel.toLowerCase()}`}>
          <div className="panel-header">
            <div className="panel-status" style={{ backgroundColor: getStatusColor(selectedTicket.riskLevel) }}>
              {getStatusIcon(selectedTicket.riskLevel)}
              {selectedTicket.riskLevel.replace('_', ' ')}
            </div>
            <button className="panel-close" onClick={() => setSelectedTicket(null)}>
              ×
            </button>
          </div>

          <div className="panel-content">
            <h3>Ticket #{selectedTicket.ticketNumber}</h3>
            <p className="panel-address">{selectedTicket.digSiteAddress}</p>
            <p className="panel-city">{selectedTicket.digSiteCity}, {selectedTicket.digSiteCounty}</p>

            <div className="panel-dates">
              <div className="date-item">
                <span className="date-label">Valid From</span>
                <span className="date-value">{new Date(selectedTicket.legalDigDate).toLocaleDateString()}</span>
              </div>
              <div className="date-item">
                <span className="date-label">Expires</span>
                <span className="date-value">{new Date(selectedTicket.expiresAt).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="panel-message">
              {selectedTicket.canDigReason}
            </div>

            <button
              className="panel-action"
              onClick={() => onTicketSelect?.(selectedTicket.id)}
            >
              <Eye size={16} />
              View Details
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <span className="legend-color clear" />
          <span>Clear to Dig</span>
        </div>
        <div className="legend-item">
          <span className="legend-color caution" />
          <span>Proceed with Caution</span>
        </div>
        <div className="legend-item">
          <span className="legend-color stop" />
          <span>Do Not Dig</span>
        </div>
        <div className="legend-item">
          <span className="legend-user" />
          <span>Your Location</span>
        </div>
      </div>
    </div>
  );
}
