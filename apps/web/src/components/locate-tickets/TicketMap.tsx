import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { type TicketStatus } from './StatusBadge';

// Mapbox access token
mapboxgl.accessToken = 'pk.eyJ1IjoibGV3aXM0eDQiLCJhIjoiY21pZGp5aGJkMDczNTJpcHQ3ZmFiNDEwbiJ9.MfYe1QhQxfwGAFltutpADw';

export interface MapTicket {
  id: string;
  ticket_number: string;
  dig_site_address: string;
  dig_site_city: string | null;
  status: TicketStatus;
  legal_dig_date: string;
  ticket_expires_at: string;
  latitude: number | null;
  longitude: number | null;
  risk_score: number;
  has_gas_utility: boolean;
  has_electric_utility: boolean;
}

interface TicketMapProps {
  tickets: MapTicket[];
  onTicketClick?: (ticketId: string) => void;
  center?: [number, number];
  zoom?: number;
}

const statusColors: Record<TicketStatus, string> = {
  RECEIVED: '#6366f1', // indigo
  PENDING: '#3b82f6', // blue
  IN_PROGRESS: '#f59e0b', // amber
  CLEAR: '#22c55e', // green
  CONFLICT: '#ef4444', // red
  EXPIRED: '#6b7280', // gray
  CANCELLED: '#9ca3af', // gray-light
};

export function TicketMap({ tickets, onTicketClick, center, zoom = 10 }: TicketMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const userLocationMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Convert tickets to GeoJSON for clustering
  const ticketsToGeoJSON = useCallback((tickets: MapTicket[]) => {
    return {
      type: 'FeatureCollection' as const,
      features: tickets
        .filter((t) => t.latitude != null && t.longitude != null)
        .map((t) => ({
          type: 'Feature' as const,
          properties: {
            id: t.id,
            ticket_number: t.ticket_number,
            dig_site_address: t.dig_site_address,
            dig_site_city: t.dig_site_city || '',
            status: t.status,
            legal_dig_date: t.legal_dig_date,
            risk_score: t.risk_score,
            has_gas_utility: t.has_gas_utility,
            has_electric_utility: t.has_electric_utility,
            color: statusColors[t.status] || '#6b7280',
            isHighRisk: t.risk_score >= 70 || t.has_gas_utility || t.has_electric_utility,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [t.longitude!, t.latitude!],
          },
        })),
    };
  }, []);

  // Get user's current location
  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: [number, number] = [position.coords.longitude, position.coords.latitude];
        setUserLocation(loc);
        setIsLocating(false);

        if (map.current) {
          map.current.flyTo({ center: loc, zoom: 14 });
        }
      },
      (error) => {
        console.error('Location error:', error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Default center to West Virginia
    const defaultCenter: [number, number] = center || [-80.5, 38.9];

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12', // Satellite hybrid for field crews
      center: defaultCenter,
      zoom: zoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    // Create popup for ticket info
    popup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '300px',
      offset: 15,
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add cluster source
      map.current.addSource('tickets', {
        type: 'geojson',
        data: ticketsToGeoJSON([]),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles layer
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'tickets',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#3b82f6', // blue for small clusters
            10,
            '#f59e0b', // amber for medium
            25,
            '#ef4444', // red for large
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10,
            25,
            25,
            30,
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      });

      // Cluster count labels
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'tickets',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 14,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Individual unclustered points
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'tickets',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': 12,
          'circle-stroke-width': [
            'case',
            ['get', 'isHighRisk'],
            4,
            3,
          ],
          'circle-stroke-color': [
            'case',
            ['get', 'isHighRisk'],
            '#ef4444',
            '#ffffff',
          ],
        },
      });

      // High risk indicator (! symbol)
      map.current.addLayer({
        id: 'high-risk-indicator',
        type: 'symbol',
        source: 'tickets',
        filter: ['all', ['!', ['has', 'point_count']], ['get', 'isHighRisk']],
        layout: {
          'text-field': '!',
          'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 14,
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Click on cluster to zoom
      map.current.on('click', 'clusters', (e) => {
        if (!map.current) return;
        const features = map.current.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        if (!clusterId) return;

        (map.current.getSource('tickets') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
          clusterId,
          (err, zoomLevel) => {
            if (err || !map.current) return;
            map.current.easeTo({
              center: (features[0].geometry as GeoJSON.Point).coordinates as [number, number],
              zoom: zoomLevel,
            });
          }
        );
      });

      // Click on individual point to show popup
      map.current.on('click', 'unclustered-point', (e) => {
        if (!map.current || !popup.current || !e.features?.[0]) return;

        const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const props = e.features[0].properties;

        // Handle dateline wrapping
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        const popupContent = `
          <div style="padding: 12px;">
            <strong style="font-size: 15px; color: #1e293b;">${props?.ticket_number || 'Unknown'}</strong>
            <div style="font-size: 13px; color: #64748b; margin: 6px 0 8px;">
              ${props?.dig_site_address || ''}${props?.dig_site_city ? `, ${props.dig_site_city}` : ''}
            </div>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <span style="
                display: inline-block;
                padding: 3px 10px;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 600;
                text-transform: uppercase;
                background: ${props?.color || '#6b7280'}20;
                color: ${props?.color || '#6b7280'};
              ">${(props?.status || 'UNKNOWN').replace('_', ' ')}</span>
              ${props?.has_gas_utility === true || props?.has_gas_utility === 'true' ? '<span style="padding: 3px 8px; background: #fed7aa; color: #9a3412; font-size: 10px; font-weight: 700; border-radius: 4px;">GAS</span>' : ''}
              ${props?.has_electric_utility === true || props?.has_electric_utility === 'true' ? '<span style="padding: 3px 8px; background: #fef08a; color: #854d0e; font-size: 10px; font-weight: 700; border-radius: 4px;">ELEC</span>' : ''}
            </div>
            <div style="font-size: 12px; color: #94a3b8; margin-top: 10px;">
              <strong>Dig Date:</strong> ${props?.legal_dig_date ? new Date(props.legal_dig_date).toLocaleDateString() : 'Unknown'}
            </div>
            <button
              onclick="window.ticketMapClick && window.ticketMapClick('${props?.id || ''}')"
              style="
                margin-top: 12px;
                padding: 8px 16px;
                background: #2563eb;
                color: white;
                border: none;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
                transition: background 0.15s ease;
              "
              onmouseover="this.style.background='#1d4ed8'"
              onmouseout="this.style.background='#2563eb'"
            >View Ticket Details</button>
          </div>
        `;

        popup.current.setLngLat(coordinates).setHTML(popupContent).addTo(map.current);
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
      map.current.on('mouseenter', 'unclustered-point', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'unclustered-point', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });

      setMapLoaded(true);
    });

    return () => {
      popup.current?.remove();
      userLocationMarker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, [center, zoom, ticketsToGeoJSON]);

  // Update map data when tickets change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const source = map.current.getSource('tickets') as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(ticketsToGeoJSON(tickets));
    }

    // Fit bounds to show all points
    const ticketsWithCoords = tickets.filter((t) => t.latitude != null && t.longitude != null);
    if (ticketsWithCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      ticketsWithCoords.forEach((t) => {
        if (t.longitude != null && t.latitude != null) {
          bounds.extend([t.longitude, t.latitude]);
        }
      });
      map.current.fitBounds(bounds, { padding: 60, maxZoom: 14 });
    } else if (ticketsWithCoords.length === 1) {
      const t = ticketsWithCoords[0];
      if (t.longitude != null && t.latitude != null) {
        map.current.flyTo({ center: [t.longitude, t.latitude], zoom: 14 });
      }
    }
  }, [tickets, mapLoaded, ticketsToGeoJSON]);

  // Update user location marker
  useEffect(() => {
    if (!map.current || !mapLoaded || !userLocation) return;

    if (userLocationMarker.current) {
      userLocationMarker.current.setLngLat(userLocation);
    } else {
      // Create user location marker with pulsing effect
      const el = document.createElement('div');
      el.className = 'user-location-marker';
      el.innerHTML = `
        <div class="user-location-pulse"></div>
        <div class="user-location-dot"></div>
      `;
      el.style.cssText = `
        position: relative;
        width: 24px;
        height: 24px;
      `;

      // Add styles for the marker
      const style = document.createElement('style');
      style.textContent = `
        .user-location-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 14px;
          height: 14px;
          background: #2563eb;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        .user-location-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 24px;
          height: 24px;
          background: rgba(37, 99, 235, 0.3);
          border-radius: 50%;
          animation: pulse-ring 2s ease-out infinite;
        }
        @keyframes pulse-ring {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);

      userLocationMarker.current = new mapboxgl.Marker(el)
        .setLngLat(userLocation)
        .addTo(map.current);
    }
  }, [userLocation, mapLoaded]);

  // Set up click handler for popup button
  useEffect(() => {
    if (onTicketClick) {
      (window as unknown as { ticketMapClick: (id: string) => void }).ticketMapClick = onTicketClick;
    }
    return () => {
      delete (window as unknown as { ticketMapClick?: (id: string) => void }).ticketMapClick;
    };
  }, [onTicketClick]);

  const ticketsWithoutCoords = tickets.filter((t) => t.latitude == null || t.longitude == null);

  return (
    <div className="ticket-map-container" style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Current Location Button */}
      <button
        onClick={getCurrentLocation}
        disabled={isLocating}
        title="Show my location"
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          width: '36px',
          height: '36px',
          background: 'white',
          border: 'none',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          cursor: isLocating ? 'wait' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}
      >
        {isLocating ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
          </svg>
        )}
      </button>

      {/* Unmapped tickets warning */}
      {ticketsWithoutCoords.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          padding: '8px 14px',
          background: 'rgba(251, 191, 36, 0.95)',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 500,
          color: '#92400e',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 10,
        }}>
          {ticketsWithoutCoords.length} ticket{ticketsWithoutCoords.length !== 1 ? 's' : ''} without coordinates
        </div>
      )}

      {/* Spin animation style */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
