import { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapPin, RefreshCw, ExternalLink } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import './LocationMap.css';

// Get Mapbox token from environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibGV3aXM0eDQiLCJhIjoiY21pZGp5aGJkMDczNTJpcHQ3ZmFiNDEwbiJ9.MfYe1QhQxfwGAFltutpADw';

mapboxgl.accessToken = MAPBOX_TOKEN;

interface LocationMapProps {
  address: string;
  city?: string;
  state?: string;
  county?: string;
  zip?: string;
  initialLat?: number;
  initialLng?: number;
  onCoordinatesFound?: (lat: number, lng: number) => void;
  height?: number;
}

export function LocationMap({
  address,
  city,
  state = 'WV',
  county,
  zip,
  initialLat,
  initialLng,
  onCoordinatesFound,
  height = 250,
}: LocationMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  );
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Build full address string for geocoding
  const getFullAddress = () => {
    const parts = [address];
    if (city) parts.push(city);
    if (county) parts.push(`${county} County`);
    if (state) parts.push(state);
    if (zip) parts.push(zip);
    return parts.join(', ');
  };

  // Geocode the address
  const geocodeAddress = async () => {
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
  };

  // Initialize map when coordinates are available
  useEffect(() => {
    if (!mapContainer.current || !coordinates) return;
    if (map.current) return; // Already initialized

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [coordinates.lng, coordinates.lat],
      zoom: 16,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Add marker
    marker.current = new mapboxgl.Marker({ color: '#2563eb' })
      .setLngLat([coordinates.lng, coordinates.lat])
      .setPopup(
        new mapboxgl.Popup({ offset: 25 }).setHTML(
          `<div style="font-size: 13px;">
            <strong>${address}</strong><br/>
            ${city || ''} ${state || ''}
          </div>`
        )
      )
      .addTo(map.current);

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [coordinates, address, city, state]);

  // Update marker position if coordinates change
  useEffect(() => {
    if (map.current && marker.current && coordinates) {
      marker.current.setLngLat([coordinates.lng, coordinates.lat]);
      map.current.flyTo({ center: [coordinates.lng, coordinates.lat], zoom: 16 });
    }
  }, [coordinates]);

  // Auto-geocode on mount if no initial coordinates
  useEffect(() => {
    if (!coordinates && address) {
      geocodeAddress();
    }
  }, []);

  const openInGoogleMaps = () => {
    const query = encodeURIComponent(getFullAddress());
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  if (isGeocoding) {
    return (
      <div className="location-map-loading" style={{ height }}>
        <RefreshCw size={24} className="spin" />
        <span>Finding location...</span>
      </div>
    );
  }

  if (geocodeError || !coordinates) {
    return (
      <div className="location-map-error" style={{ height }}>
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
    <div className="location-map-container">
      <div ref={mapContainer} className="location-map" style={{ height }} />
      <div className="map-actions">
        <button onClick={openInGoogleMaps} className="btn-google-maps" title="Open in Google Maps">
          <ExternalLink size={14} />
          Directions
        </button>
      </div>
    </div>
  );
}
