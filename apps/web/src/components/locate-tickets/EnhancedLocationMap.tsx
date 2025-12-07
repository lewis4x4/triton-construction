import { useState, useEffect, useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import {
  MapPin,
  RefreshCw,
  ExternalLink,
  Maximize2,
  X,
  Layers,
  Mountain,
  Map as MapIcon,
  Moon,
  Satellite,
  Camera,
  AlertTriangle,
} from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import './EnhancedLocationMap.css';

// Get Mapbox token from environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibGV3aXM0eDQiLCJhIjoiY21pZGp5aGJkMDczNTJpcHQ3ZmFiNDEwbiJ9.MfYe1QhQxfwGAFltutpADw';

mapboxgl.accessToken = MAPBOX_TOKEN;

// Map styles
const MAP_STYLES = {
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  streets: 'mapbox://styles/mapbox/streets-v12',
  dark: 'mapbox://styles/mapbox/dark-v11',
  outdoors: 'mapbox://styles/mapbox/outdoors-v12',
} as const;

type MapStyle = keyof typeof MAP_STYLES;

// Ticket status colors for safe zones
const STATUS_COLORS = {
  ACTIVE_CLEAR: { fill: 'rgba(34, 197, 94, 0.2)', stroke: '#22c55e' },     // Green
  PENDING: { fill: 'rgba(234, 179, 8, 0.2)', stroke: '#eab308' },          // Yellow
  EXPIRED: { fill: 'rgba(239, 68, 68, 0.2)', stroke: '#ef4444' },          // Red
  SILENT_ASSENT: { fill: 'rgba(249, 115, 22, 0.2)', stroke: '#f97316' },   // Orange
  CONFLICT: { fill: 'rgba(239, 68, 68, 0.3)', stroke: '#ef4444' },         // Red (darker)
};

// Buffer zone colors (tolerance zone around safe dig area)
const BUFFER_COLORS = {
  fill: 'rgba(234, 179, 8, 0.15)',  // Light yellow
  stroke: '#eab308',                 // Yellow border
};

// Default buffer distance in meters (18 inches = 0.4572m, 24 inches = 0.6096m)
const DEFAULT_BUFFER_DISTANCE = 0.6; // ~2 feet tolerance zone

/**
 * Creates a buffer polygon around a given polygon by offsetting each vertex outward.
 * Uses a simple approach based on perpendicular offsets at each vertex.
 *
 * @param coordinates - Original polygon coordinates [lng, lat][]
 * @param bufferMeters - Buffer distance in meters
 * @returns Buffered polygon coordinates [lng, lat][]
 */
function createBufferPolygon(
  coordinates: [number, number][],
  bufferMeters: number = DEFAULT_BUFFER_DISTANCE
): [number, number][] {
  if (coordinates.length < 3) return coordinates;

  // Convert meters to approximate degrees (rough conversion at ~39° latitude for WV)
  // 1 degree latitude ≈ 111,000 meters
  // 1 degree longitude ≈ 85,000 meters at 39° latitude
  const latOffset = bufferMeters / 111000;
  const lngOffset = bufferMeters / 85000;

  // Calculate centroid
  let centroidLng = 0;
  let centroidLat = 0;
  for (const [lng, lat] of coordinates) {
    centroidLng += lng;
    centroidLat += lat;
  }
  centroidLng /= coordinates.length;
  centroidLat /= coordinates.length;

  // Expand each point outward from centroid
  const buffered: [number, number][] = coordinates.map(([lng, lat]) => {
    // Direction from centroid to point
    const dx = lng - centroidLng;
    const dy = lat - centroidLat;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return [lng, lat] as [number, number];

    // Normalize and apply buffer
    const normX = dx / distance;
    const normY = dy / distance;

    return [
      lng + normX * lngOffset,
      lat + normY * latOffset
    ] as [number, number];
  });

  return buffered;
}

/**
 * Alternative buffer using perpendicular offset at each edge midpoint
 * This creates a more uniform buffer around the polygon edges
 */
function _createEdgeBufferPolygon(
  coordinates: [number, number][],
  bufferMeters: number = DEFAULT_BUFFER_DISTANCE
): [number, number][] {
  if (coordinates.length < 3) return coordinates;

  const latOffset = bufferMeters / 111000;
  const lngOffset = bufferMeters / 85000;

  const buffered: [number, number][] = [];
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const prev = coordinates[(i - 1 + n) % n];
    const curr = coordinates[i];
    const next = coordinates[(i + 1) % n];

    // Calculate normals for both edges meeting at this vertex
    const dx1 = curr[0] - prev[0];
    const dy1 = curr[1] - prev[1];
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1) || 1;

    const dx2 = next[0] - curr[0];
    const dy2 = next[1] - curr[1];
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;

    // Perpendicular normals (pointing outward - assuming clockwise winding)
    const n1x = dy1 / len1;
    const n1y = -dx1 / len1;
    const n2x = dy2 / len2;
    const n2y = -dx2 / len2;

    // Average the normals for the corner offset
    let avgNx = (n1x + n2x) / 2;
    let avgNy = (n1y + n2y) / 2;
    const avgLen = Math.sqrt(avgNx * avgNx + avgNy * avgNy) || 1;
    avgNx /= avgLen;
    avgNy /= avgLen;

    // Apply buffer offset
    buffered.push([
      curr[0] + avgNx * lngOffset,
      curr[1] + avgNy * latOffset
    ] as [number, number]);
  }

  return buffered;
}

interface PhotoPin {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
  thumbnailUrl?: string;
  timestamp: string;
}

interface SafeZone {
  id: string;
  coordinates: [number, number][];  // Polygon coordinates
  status: keyof typeof STATUS_COLORS;
  ticketNumber?: string;
}

interface EnhancedLocationMapProps {
  address: string;
  city?: string;
  state?: string;
  county?: string;
  zip?: string;
  initialLat?: number;
  initialLng?: number;
  onCoordinatesFound?: (lat: number, lng: number) => void;
  height?: number;
  ticketStatus?: string;
  ticketNumber?: string;
  safeZones?: SafeZone[];
  photoPins?: PhotoPin[];
  onPhotoClick?: (photoId: string) => void;
  onExpandToggle?: (expanded: boolean) => void;
  showExpandButton?: boolean;
  interactive?: boolean;
}

export function EnhancedLocationMap({
  address,
  city,
  state = 'WV',
  county,
  zip,
  initialLat,
  initialLng,
  onCoordinatesFound,
  height = 250,
  ticketStatus: _ticketStatus,
  ticketNumber,
  safeZones = [],
  photoPins = [],
  onPhotoClick,
  onExpandToggle,
  showExpandButton = true,
  interactive = true,
}: EnhancedLocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const photoMarkers = useRef<mapboxgl.Marker[]>([]);

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<MapStyle>('satellite');
  const [show3DTerrain, setShow3DTerrain] = useState(false);
  const [showPhotoPins, setShowPhotoPins] = useState(true);
  const [showStyleMenu, setShowStyleMenu] = useState(false);

  // Build full address string for geocoding
  const getFullAddress = useCallback(() => {
    const parts = [address];
    if (city) parts.push(city);
    if (county) parts.push(`${county} County`);
    if (state) parts.push(state);
    if (zip) parts.push(zip);
    return parts.join(', ');
  }, [address, city, county, state, zip]);

  // Geocode the address
  const geocodeAddress = useCallback(async () => {
    const fullAddress = getFullAddress();
    if (!fullAddress) return;

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${MAPBOX_TOKEN}&country=US&limit=1`
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setCoordinates({ lat, lng });
        onCoordinatesFound?.(lat, lng);
      } else {
        setGeocodeError('Address not found');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setGeocodeError('Failed to locate address');
    } finally {
      setIsGeocoding(false);
    }
  }, [getFullAddress, onCoordinatesFound]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !coordinates) return;
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[currentStyle],
      center: [coordinates.lng, coordinates.lat],
      zoom: 17,
      pitch: show3DTerrain ? 45 : 0,
      bearing: 0,
      interactive: interactive,
    });

    // Add navigation controls - positioned at bottom-right to avoid overlap with close button
    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'bottom-right'
    );

    // Add scale control
    map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

    // Add main marker
    const el = document.createElement('div');
    el.className = 'main-marker';
    el.innerHTML = `
      <div class="marker-pulse"></div>
      <div class="marker-pin">
        <svg viewBox="0 0 24 24" width="32" height="32" fill="#2563eb">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `;

    marker.current = new mapboxgl.Marker({ element: el })
      .setLngLat([coordinates.lng, coordinates.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(
          `<div class="map-popup">
            <strong>${ticketNumber ? `Ticket #${ticketNumber}` : 'Dig Site'}</strong>
            <p>${address}</p>
            <p>${city || ''} ${state || ''}</p>
          </div>`
        )
      )
      .addTo(map.current);

    // Add safe zones when map loads
    map.current.on('load', () => {
      addSafeZones();
      addPhotoPins();
      if (show3DTerrain) {
        enable3DTerrain();
      }
    });

    return () => {
      photoMarkers.current.forEach((m) => m.remove());
      photoMarkers.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [coordinates]);

  // Add safe zone polygons with buffer zones
  const addSafeZones = useCallback(() => {
    if (!map.current) return;

    safeZones.forEach((zone) => {
      const sourceId = `safe-zone-${zone.id}`;
      const bufferSourceId = `buffer-zone-${zone.id}`;
      const fillId = `safe-zone-fill-${zone.id}`;
      const strokeId = `safe-zone-stroke-${zone.id}`;
      const bufferFillId = `buffer-zone-fill-${zone.id}`;
      const bufferStrokeId = `buffer-zone-stroke-${zone.id}`;

      // Check if already added
      if (map.current!.getSource(sourceId)) return;

      const colors = STATUS_COLORS[zone.status] || STATUS_COLORS.ACTIVE_CLEAR;

      // Create buffer polygon (tolerance zone)
      const bufferCoords = createBufferPolygon(zone.coordinates, DEFAULT_BUFFER_DISTANCE);

      // Add buffer zone source FIRST (renders underneath)
      map.current!.addSource(bufferSourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { ticketNumber: zone.ticketNumber, type: 'buffer' },
          geometry: {
            type: 'Polygon',
            coordinates: [bufferCoords],
          },
        },
      });

      // Buffer fill layer (yellow caution zone)
      map.current!.addLayer({
        id: bufferFillId,
        type: 'fill',
        source: bufferSourceId,
        paint: {
          'fill-color': BUFFER_COLORS.fill,
        },
      });

      // Buffer stroke layer (dashed yellow line)
      map.current!.addLayer({
        id: bufferStrokeId,
        type: 'line',
        source: bufferSourceId,
        paint: {
          'line-color': BUFFER_COLORS.stroke,
          'line-width': 1.5,
          'line-dasharray': [4, 4],
        },
      });

      // Add main safe zone source (renders on top)
      map.current!.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { ticketNumber: zone.ticketNumber, type: 'safe' },
          geometry: {
            type: 'Polygon',
            coordinates: [zone.coordinates],
          },
        },
      });

      // Safe zone fill layer (green safe dig area)
      map.current!.addLayer({
        id: fillId,
        type: 'fill',
        source: sourceId,
        paint: {
          'fill-color': colors.fill,
        },
      });

      // Safe zone stroke layer (solid green line)
      map.current!.addLayer({
        id: strokeId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': colors.stroke,
          'line-width': 2,
        },
      });
    });
  }, [safeZones]);

  // Add photo pins to map
  const addPhotoPins = useCallback(() => {
    if (!map.current || !showPhotoPins) return;

    // Remove existing markers
    photoMarkers.current.forEach((m) => m.remove());
    photoMarkers.current = [];

    photoPins.forEach((photo) => {
      const el = document.createElement('div');
      el.className = 'photo-pin';
      el.innerHTML = `
        <div class="photo-pin-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </div>
      `;
      el.addEventListener('click', () => onPhotoClick?.(photo.id));

      const photoMarker = new mapboxgl.Marker({ element: el })
        .setLngLat([photo.longitude, photo.latitude])
        .addTo(map.current!);

      photoMarkers.current.push(photoMarker);
    });
  }, [photoPins, showPhotoPins, onPhotoClick]);

  // Enable 3D terrain
  const enable3DTerrain = useCallback(() => {
    if (!map.current) return;

    if (!map.current.getSource('mapbox-dem')) {
      map.current.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }

    map.current.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 });

    // Add sky layer for 3D effect
    if (!map.current.getLayer('sky')) {
      map.current.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 90.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      });
    }

    map.current.easeTo({ pitch: 60, duration: 1000 });
  }, []);

  // Disable 3D terrain
  const disable3DTerrain = useCallback(() => {
    if (!map.current) return;
    map.current.setTerrain(null);
    if (map.current.getLayer('sky')) {
      map.current.removeLayer('sky');
    }
    map.current.easeTo({ pitch: 0, duration: 500 });
  }, []);

  // Toggle 3D terrain
  const toggle3DTerrain = useCallback(() => {
    setShow3DTerrain((prev) => {
      const newValue = !prev;
      if (newValue) {
        enable3DTerrain();
      } else {
        disable3DTerrain();
      }
      return newValue;
    });
  }, [enable3DTerrain, disable3DTerrain]);

  // Change map style
  const changeStyle = useCallback((style: MapStyle) => {
    if (!map.current) return;
    setCurrentStyle(style);
    map.current.setStyle(MAP_STYLES[style]);
    setShowStyleMenu(false);

    // Re-add layers after style change
    map.current.once('style.load', () => {
      addSafeZones();
      addPhotoPins();
      if (show3DTerrain) {
        enable3DTerrain();
      }
    });
  }, [addSafeZones, addPhotoPins, show3DTerrain, enable3DTerrain]);

  // Toggle expand
  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => {
      const newValue = !prev;
      onExpandToggle?.(newValue);
      setTimeout(() => map.current?.resize(), 100);
      return newValue;
    });
  }, [onExpandToggle]);

  // Auto-geocode on mount
  useEffect(() => {
    if (!coordinates && address) {
      geocodeAddress();
    }
  }, [coordinates, address, geocodeAddress]);

  // Update photo pins when they change
  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      addPhotoPins();
    }
  }, [photoPins, showPhotoPins, addPhotoPins]);

  const openInGoogleMaps = () => {
    const query = encodeURIComponent(getFullAddress());
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  // Check if point is inside safe zone
  const _checkPointInSafeZone = useCallback((lat: number, lng: number) => {
    // Simple ray casting algorithm for point in polygon
    for (const zone of safeZones) {
      const poly = zone.coordinates;
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i][0], yi = poly[i][1];
        const xj = poly[j][0], yj = poly[j][1];
        if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
          inside = !inside;
        }
      }
      if (inside) return { inside: true, zone };
    }
    return { inside: false, zone: null };
  }, [safeZones]);

  if (isGeocoding) {
    return (
      <div className="enhanced-map-loading" style={{ height }}>
        <RefreshCw size={24} className="spin" />
        <span>Finding location...</span>
      </div>
    );
  }

  if (geocodeError || !coordinates) {
    return (
      <div className="enhanced-map-error" style={{ height }}>
        <MapPin size={24} />
        <span>{geocodeError || 'No coordinates available'}</span>
        <div className="map-error-actions">
          <button onClick={geocodeAddress} className="btn-retry">
            <RefreshCw size={14} />
            Try Again
          </button>
          <button onClick={openInGoogleMaps} className="btn-external">
            <ExternalLink size={14} />
            Open in Google Maps
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`enhanced-map-container ${isExpanded ? 'expanded' : ''}`}>
        <div
          ref={mapContainer}
          className="enhanced-map"
          style={{ height: isExpanded ? '100%' : height }}
        />

        {/* Map Controls Overlay */}
        <div className="map-controls">
          {/* Style Switcher */}
          <div className="style-switcher">
            <button
              className="control-btn"
              onClick={() => setShowStyleMenu(!showStyleMenu)}
              title="Change map style"
            >
              <Layers size={18} />
            </button>
            {showStyleMenu && (
              <div className="style-menu">
                <button
                  className={currentStyle === 'satellite' ? 'active' : ''}
                  onClick={() => changeStyle('satellite')}
                >
                  <Satellite size={16} />
                  Satellite
                </button>
                <button
                  className={currentStyle === 'streets' ? 'active' : ''}
                  onClick={() => changeStyle('streets')}
                >
                  <MapIcon size={16} />
                  Streets
                </button>
                <button
                  className={currentStyle === 'outdoors' ? 'active' : ''}
                  onClick={() => changeStyle('outdoors')}
                >
                  <Mountain size={16} />
                  Outdoors
                </button>
                <button
                  className={currentStyle === 'dark' ? 'active' : ''}
                  onClick={() => changeStyle('dark')}
                >
                  <Moon size={16} />
                  Dark
                </button>
              </div>
            )}
          </div>

          {/* 3D Terrain Toggle */}
          <button
            className={`control-btn ${show3DTerrain ? 'active' : ''}`}
            onClick={toggle3DTerrain}
            title="Toggle 3D terrain"
          >
            <Mountain size={18} />
          </button>

          {/* Photo Pins Toggle */}
          {photoPins.length > 0 && (
            <button
              className={`control-btn ${showPhotoPins ? 'active' : ''}`}
              onClick={() => setShowPhotoPins(!showPhotoPins)}
              title="Toggle photo locations"
            >
              <Camera size={18} />
            </button>
          )}

          {/* Expand Button */}
          {showExpandButton && (
            <button
              className="control-btn expand-btn"
              onClick={toggleExpand}
              title={isExpanded ? 'Minimize map' : 'Expand map'}
            >
              {isExpanded ? <X size={18} /> : <Maximize2 size={18} />}
            </button>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="map-bottom-actions">
          <button onClick={openInGoogleMaps} className="btn-google-maps" title="Open in Google Maps">
            <ExternalLink size={14} />
            Directions
          </button>
        </div>

        {/* Zone Legend */}
        {safeZones.length > 0 && (
          <div className="zone-legend">
            <div className="legend-title">
              <AlertTriangle size={14} />
              Dig Zones
            </div>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-swatch safe-zone"></div>
                <span>Safe Dig Area</span>
              </div>
              <div className="legend-item">
                <div className="legend-swatch buffer-zone"></div>
                <span>Caution Buffer (~2ft)</span>
              </div>
              <div className="legend-item">
                <div className="legend-swatch unknown-zone"></div>
                <span>Unknown / Unmarked</span>
              </div>
            </div>
          </div>
        )}

        {/* Expanded Mode Close Button */}
        {isExpanded && (
          <button className="close-expanded-btn" onClick={toggleExpand}>
            <X size={24} />
          </button>
        )}
      </div>

      {/* Expanded Modal Backdrop */}
      {isExpanded && <div className="map-backdrop" onClick={toggleExpand} />}
    </>
  );
}
