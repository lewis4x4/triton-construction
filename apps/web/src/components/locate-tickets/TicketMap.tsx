import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { BaseMap, MapRef } from '../maps/BaseMap';
import { type TicketStatus } from './StatusBadge';
import { supabase } from '@triton/supabase-client';

// Mapbox access token handled by BaseMap via env

// High-risk alert types
interface NearbyHighRiskTicket {
  id: string;
  ticket_number: string;
  dig_site_address: string;
  dig_site_city: string | null;
  risk_score: number;
  has_gas_utility: boolean;
  has_electric_utility: boolean;
  status: string;
  distance_meters: number;
}

interface HighRiskAlert {
  high_risk_tickets: NearbyHighRiskTicket[];
  alert_queued: boolean;
  alert_message: string | null;
  total_nearby: number;
}

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

type ViewMode = 'clusters' | 'heatmap';

interface TicketMapProps {
  tickets: MapTicket[];
  onTicketClick?: (ticketId: string) => void;
  center?: [number, number];
  zoom?: number;
  showHeatmapToggle?: boolean;
  // High-risk proximity alert props
  enableHighRiskAlerts?: boolean;
  userId?: string;
  organizationId?: string;
  highRiskRadiusMeters?: number;
  onHighRiskAlert?: (alert: HighRiskAlert) => void;
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

export function TicketMap({
  tickets,
  onTicketClick,
  center,
  zoom = 10,
  showHeatmapToggle = true,
  enableHighRiskAlerts = false,
  userId,
  organizationId,
  highRiskRadiusMeters = 500,
  onHighRiskAlert,
}: TicketMapProps) {
  const mapRef = useRef<MapRef>(null);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const userLocationMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('clusters');

  // High-risk proximity alert state
  const [highRiskAlert, setHighRiskAlert] = useState<HighRiskAlert | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [isCheckingHighRisk, setIsCheckingHighRisk] = useState(false);
  const lastCheckedLocation = useRef<[number, number] | null>(null);

  // We need access to the map instance for layers/sources
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null);

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

        mapRef.current?.flyTo(loc, 14);
      },
      (error) => {
        console.error('Location error:', error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Check for nearby high-risk tickets when location changes
  const checkHighRiskProximity = useCallback(async (lng: number, lat: number) => {
    if (!enableHighRiskAlerts) return;

    // Avoid checking if we already checked this location (within ~100m)
    if (lastCheckedLocation.current) {
      const [lastLng, lastLat] = lastCheckedLocation.current;
      const distanceDeg = Math.sqrt(Math.pow(lng - lastLng, 2) + Math.pow(lat - lastLat, 2));
      // ~0.001 degrees is roughly 100m at mid-latitudes
      if (distanceDeg < 0.001) {
        return;
      }
    }

    setIsCheckingHighRisk(true);
    lastCheckedLocation.current = [lng, lat];

    try {
      const { data, error } = await supabase.functions.invoke('wv811-high-risk-alert', {
        body: {
          latitude: lat,
          longitude: lng,
          radius_meters: highRiskRadiusMeters,
          user_id: userId,
          organization_id: organizationId,
        },
      });

      if (error) {
        console.error('High-risk check error:', error);
        return;
      }

      const alertData = data as HighRiskAlert;

      if (alertData.high_risk_tickets && alertData.high_risk_tickets.length > 0) {
        setHighRiskAlert(alertData);
        setAlertDismissed(false);

        // Call the optional callback
        if (onHighRiskAlert) {
          onHighRiskAlert(alertData);
        }
      } else {
        // Clear alert if no more high-risk tickets nearby
        setHighRiskAlert(null);
      }
    } catch (err) {
      console.error('High-risk proximity check failed:', err);
    } finally {
      setIsCheckingHighRisk(false);
    }
  }, [enableHighRiskAlerts, highRiskRadiusMeters, userId, organizationId, onHighRiskAlert]);

  // Effect to check high-risk proximity when user location changes
  useEffect(() => {
    if (userLocation && enableHighRiskAlerts) {
      const [lng, lat] = userLocation;
      checkHighRiskProximity(lng, lat);
    }
  }, [userLocation, enableHighRiskAlerts, checkHighRiskProximity]);

  const handleMapLoad = (map: mapboxgl.Map) => {
    setMapInstance(map);

    // Create popup for ticket info
    popup.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '300px',
      offset: 15,
    });

    // Add cluster source
    map.addSource('tickets', {
      type: 'geojson',
      data: ticketsToGeoJSON([]),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50,
    });

    // Cluster circles layer
    map.addLayer({
      id: 'clusters',
      type: 'circle',
      source: 'tickets',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step',
          ['get', 'point_count'],
          '#3b82f6',
          10,
          '#f59e0b',
          25,
          '#ef4444',
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
    map.addLayer({
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
    map.addLayer({
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
    map.addLayer({
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

    // ============ HEATMAP LAYER ============
    // Add separate non-clustered source for heatmap (heatmap layers don't work with clustered sources)
    map.addSource('tickets-heatmap', {
      type: 'geojson',
      data: ticketsToGeoJSON([]),
    });

    // Heatmap layer - shows risk density with color gradient
    map.addLayer({
      id: 'tickets-heatmap-layer',
      type: 'heatmap',
      source: 'tickets-heatmap',
      maxzoom: 15,
      layout: {
        visibility: 'none', // Start hidden, clusters visible by default
      },
      paint: {
        // Weight based on risk_score (0-100) - higher risk = more weight
        'heatmap-weight': [
          'interpolate',
          ['linear'],
          ['get', 'risk_score'],
          0, 0.2,    // Low risk = low weight
          50, 0.5,   // Medium risk
          70, 0.8,   // High risk
          100, 1.0,  // Critical risk = full weight
        ],
        // Intensity increases with zoom (more detail at higher zoom)
        'heatmap-intensity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 0.5,
          9, 1,
          15, 2,
        ],
        // Color ramp: green (safe) → yellow (caution) → red (danger)
        'heatmap-color': [
          'interpolate',
          ['linear'],
          ['heatmap-density'],
          0, 'rgba(0, 0, 0, 0)',           // Transparent at 0
          0.1, 'rgba(34, 197, 94, 0.4)',   // Green - low density
          0.3, 'rgba(132, 204, 22, 0.5)',  // Lime
          0.5, 'rgba(250, 204, 21, 0.6)',  // Yellow - medium density
          0.7, 'rgba(249, 115, 22, 0.7)',  // Orange
          0.9, 'rgba(239, 68, 68, 0.8)',   // Red - high density
          1, 'rgba(185, 28, 28, 0.9)',     // Dark red - critical
        ],
        // Radius increases with zoom
        'heatmap-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          0, 8,
          9, 20,
          12, 30,
          15, 40,
        ],
        // Fade out at higher zoom levels
        'heatmap-opacity': [
          'interpolate',
          ['linear'],
          ['zoom'],
          12, 0.9,
          15, 0.6,
        ],
      },
    });

    // Individual points visible at high zoom when in heatmap mode
    map.addLayer({
      id: 'tickets-heatmap-points',
      type: 'circle',
      source: 'tickets-heatmap',
      minzoom: 13,
      layout: {
        visibility: 'none',
      },
      paint: {
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          13, 6,
          15, 10,
        ],
        'circle-color': [
          'interpolate',
          ['linear'],
          ['get', 'risk_score'],
          0, '#22c55e',   // Green
          50, '#facc15',  // Yellow
          70, '#f97316',  // Orange
          100, '#ef4444', // Red
        ],
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
      },
    });

    // Click on cluster to zoom
    map.on('click', 'clusters', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
      const clusterId = features[0]?.properties?.cluster_id;
      if (!clusterId || !features[0]) return;

      (map.getSource('tickets') as mapboxgl.GeoJSONSource).getClusterExpansionZoom(
        clusterId,
        (err, zoomLevel) => {
          if (err || zoomLevel == null) return;
          map.easeTo({
            center: (features[0]!.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: zoomLevel,
          });
        }
      );
    });

    // Click on individual point to show popup
    map.on('click', 'unclustered-point', (e) => {
      if (!popup.current || !e.features?.[0]) return;

      const coordinates = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
      const props = e.features[0].properties;

      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      const popupContent = `
          <div style="padding: 12px; color: black;">
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

      popup.current.setLngLat(coordinates).setHTML(popupContent).addTo(map);
    });

    // Cursor handling
    const layers = ['clusters', 'unclustered-point'];
    layers.forEach(layer => {
      map.on('mouseenter', layer, () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', layer, () => {
        map.getCanvas().style.cursor = '';
      });
    });

    setMapLoaded(true);
  };

  // Update map data when tickets change
  useEffect(() => {
    if (!mapInstance || !mapLoaded) return;

    const geoJSON = ticketsToGeoJSON(tickets);

    // Update cluster source
    const clusterSource = mapInstance.getSource('tickets') as mapboxgl.GeoJSONSource;
    if (clusterSource) {
      clusterSource.setData(geoJSON);
    }

    // Update heatmap source
    const heatmapSource = mapInstance.getSource('tickets-heatmap') as mapboxgl.GeoJSONSource;
    if (heatmapSource) {
      heatmapSource.setData(geoJSON);
    }

    const ticketsWithCoords = tickets.filter((t) => t.latitude != null && t.longitude != null);
    if (ticketsWithCoords.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      ticketsWithCoords.forEach((t) => {
        if (t.longitude != null && t.latitude != null) {
          bounds.extend([t.longitude, t.latitude]);
        }
      });
      // use BaseMap helper or direct map instance
      mapRef.current?.fitBounds(bounds, 60);
    } else if (ticketsWithCoords.length === 1) {
      const t = ticketsWithCoords[0]!;
      if (t && t.longitude != null && t.latitude != null) {
        mapRef.current?.flyTo([t.longitude, t.latitude], 14);
      }
    }
  }, [tickets, mapLoaded, ticketsToGeoJSON, mapInstance]);

  // Toggle layer visibility when viewMode changes
  useEffect(() => {
    if (!mapInstance || !mapLoaded) return;

    const clusterLayers = ['clusters', 'cluster-count', 'unclustered-point', 'high-risk-indicator'];
    const heatmapLayers = ['tickets-heatmap-layer', 'tickets-heatmap-points'];

    if (viewMode === 'heatmap') {
      clusterLayers.forEach(layer => {
        if (mapInstance.getLayer(layer)) {
          mapInstance.setLayoutProperty(layer, 'visibility', 'none');
        }
      });
      heatmapLayers.forEach(layer => {
        if (mapInstance.getLayer(layer)) {
          mapInstance.setLayoutProperty(layer, 'visibility', 'visible');
        }
      });
    } else {
      heatmapLayers.forEach(layer => {
        if (mapInstance.getLayer(layer)) {
          mapInstance.setLayoutProperty(layer, 'visibility', 'none');
        }
      });
      clusterLayers.forEach(layer => {
        if (mapInstance.getLayer(layer)) {
          mapInstance.setLayoutProperty(layer, 'visibility', 'visible');
        }
      });
    }
  }, [viewMode, mapInstance, mapLoaded]);

  // Update user location marker
  useEffect(() => {
    if (!mapInstance || !mapLoaded || !userLocation) return;

    if (userLocationMarker.current) {
      userLocationMarker.current.setLngLat(userLocation);
    } else {
      const el = document.createElement('div');
      el.innerHTML = `
        <div class="user-location-pulse"></div>
        <div class="user-location-dot"></div>
       `;
      el.className = 'user-location-marker';
      el.style.cssText = `
        position: relative;
        width: 24px;
        height: 24px;
       `;

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

      if (!document.getElementById('user-location-style')) {
        style.id = 'user-location-style';
        document.head.appendChild(style);
      }

      userLocationMarker.current = new mapboxgl.Marker(el)
        .setLngLat(userLocation)
        .addTo(mapInstance);
    }

  }, [userLocation, mapLoaded, mapInstance]);

  // Click handler setup
  useEffect(() => {
    if (onTicketClick) {
      (window as any).ticketMapClick = onTicketClick;
    }
    return () => {
      delete (window as any).ticketMapClick;
    };
  }, [onTicketClick]);

  const ticketsWithoutCoords = tickets.filter((t) => t.latitude == null || t.longitude == null);

  return (
    <div className="ticket-map-container" style={{ width: '100%', height: '100%', minHeight: '400px', position: 'relative' }}>
      <BaseMap
        ref={mapRef}
        initialCenter={center}
        initialZoom={zoom}
        style="satellite"
        onLoad={handleMapLoad}
      />

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

      {/* View Mode Toggle */}
      {showHeatmapToggle && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: '54px',
            display: 'flex',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => setViewMode('clusters')}
            title="Cluster view"
            style={{
              padding: '8px 12px',
              border: 'none',
              background: viewMode === 'clusters' ? '#2563eb' : 'white',
              color: viewMode === 'clusters' ? 'white' : '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <circle cx="6" cy="6" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="6" cy="18" r="2" />
              <circle cx="18" cy="18" r="2" />
            </svg>
            Clusters
          </button>
          <button
            onClick={() => setViewMode('heatmap')}
            title="Risk heatmap view"
            style={{
              padding: '8px 12px',
              border: 'none',
              borderLeft: '1px solid #e5e7eb',
              background: viewMode === 'heatmap' ? '#2563eb' : 'white',
              color: viewMode === 'heatmap' ? 'white' : '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            Heatmap
          </button>
        </div>
      )}

      {/* Heatmap Legend */}
      {showHeatmapToggle && viewMode === 'heatmap' && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
            left: '10px',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            padding: '10px 12px',
            zIndex: 10,
            minWidth: '140px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Risk Density
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '12px', borderRadius: '2px', background: 'rgba(185, 28, 28, 0.9)' }} />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>Critical</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '12px', borderRadius: '2px', background: 'rgba(239, 68, 68, 0.8)' }} />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>High</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '12px', borderRadius: '2px', background: 'rgba(249, 115, 22, 0.7)' }} />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>Medium-High</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '12px', borderRadius: '2px', background: 'rgba(250, 204, 21, 0.6)' }} />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>Medium</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '12px', borderRadius: '2px', background: 'rgba(132, 204, 22, 0.5)' }} />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>Low</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '12px', borderRadius: '2px', background: 'rgba(34, 197, 94, 0.4)' }} />
              <span style={{ fontSize: '11px', color: '#6b7280' }}>Minimal</span>
            </div>
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '8px', fontStyle: 'italic' }}>
            Based on utility presence & ticket risk scores
          </div>
        </div>
      )}

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

      {/* High-Risk Proximity Alert Banner */}
      {highRiskAlert && highRiskAlert.high_risk_tickets.length > 0 && !alertDismissed && (
        <div
          style={{
            position: 'absolute',
            top: showHeatmapToggle ? '56px' : '10px',
            right: '10px',
            maxWidth: '320px',
            background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(220, 38, 38, 0.4)',
            zIndex: 20,
            overflow: 'hidden',
            animation: 'slideIn 0.3s ease-out',
          }}
        >
          {/* Alert Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'pulse-alert 2s ease-in-out infinite',
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M12 2L1 21h22L12 2zm0 3.5l7.53 13H4.47L12 5.5zm-1 5.5v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
                </svg>
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>
                  HIGH-RISK AREA
                </div>
                <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px' }}>
                  {highRiskAlert.total_nearby} active ticket{highRiskAlert.total_nearby !== 1 ? 's' : ''} nearby
                </div>
              </div>
            </div>
            <button
              onClick={() => setAlertDismissed(true)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Dismiss alert"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Utility Warnings */}
          <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {highRiskAlert.high_risk_tickets.some(t => t.has_gas_utility) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: '#fbbf24',
                  color: '#78350f',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm4 5.28c-1.23-.37-2.22-1.17-2.8-2.18l-1-1.6c-.41-.65-1.11-1-1.84-1-.78 0-1.59.5-1.78 1.44S7 23 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3c1 1.15 2.41 2.01 4 2.34V23H19V9.78c-.63-.22-1.26-.5-1.5-1z"/>
                  </svg>
                  GAS PRESENT
                </div>
              )}
              {highRiskAlert.high_risk_tickets.some(t => t.has_electric_utility) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  background: '#fde047',
                  color: '#713f12',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: 700,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
                  </svg>
                  ELECTRIC PRESENT
                </div>
              )}
            </div>
          </div>

          {/* Nearest Ticket Info */}
          {highRiskAlert.high_risk_tickets[0] && (
            <div style={{ padding: '12px 14px' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Nearest Ticket
              </div>
              <div style={{ color: 'white', fontWeight: 600, fontSize: '13px' }}>
                {highRiskAlert.high_risk_tickets[0].ticket_number}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', marginTop: '2px' }}>
                {highRiskAlert.high_risk_tickets[0].dig_site_address}
                {highRiskAlert.high_risk_tickets[0].dig_site_city && `, ${highRiskAlert.high_risk_tickets[0].dig_site_city}`}
              </div>
              {highRiskAlert.high_risk_tickets[0].distance_meters > 0 && (
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '11px', marginTop: '4px' }}>
                  ~{Math.round(highRiskAlert.high_risk_tickets[0].distance_meters)}m away
                </div>
              )}
            </div>
          )}

          {/* Action Reminder */}
          <div style={{
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.1)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', fontSize: '12px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
              <span style={{ fontWeight: 500 }}>Photo verification required before excavating</span>
            </div>
          </div>
        </div>
      )}

      {/* High-risk check loading indicator */}
      {isCheckingHighRisk && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          padding: '8px 12px',
          background: 'rgba(37, 99, 235, 0.9)',
          borderRadius: '8px',
          color: 'white',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 15,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          Checking area...
        </div>
      )}

      <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: translateX(20px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
            @keyframes pulse-alert {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
        `}</style>
    </div>
  );
}
