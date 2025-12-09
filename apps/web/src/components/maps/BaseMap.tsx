
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';

// Access token should be set in .env.local
// If missing, use the fallback token (for demo purposes)
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoibGV3aXM0eDQiLCJhIjoiY21pZGp5aGJkMDczNTJpcHQ3ZmFiNDEwbiJ9.MfYe1QhQxfwGAFltutpADw';

export interface MapRef {
    getMap: () => mapboxgl.Map | null;
    flyTo: (center: [number, number], zoom?: number) => void;
    fitBounds: (bounds: mapboxgl.LngLatBounds, padding?: number) => void;
}

interface BaseMapProps {
    initialCenter?: [number, number];
    initialZoom?: number;
    style?: 'satellite' | 'streets' | 'outdoors' | 'light' | 'dark';
    className?: string;
    onLoad?: (map: mapboxgl.Map) => void;
}

const STYLES: Record<string, string> = {
    satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
    streets: 'mapbox://styles/mapbox/streets-v12',
    outdoors: 'mapbox://styles/mapbox/outdoors-v12',
    light: 'mapbox://styles/mapbox/light-v11',
    dark: 'mapbox://styles/mapbox/dark-v11'
};

export const BaseMap = forwardRef<MapRef, BaseMapProps>(({
    initialCenter = [-80.5, 38.9], // WV center
    initialZoom = 7,
    style = 'satellite',
    className = 'w-full h-[500px]',
    onLoad
}, ref) => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<mapboxgl.Map | null>(null);

    useImperativeHandle(ref, () => ({
        getMap: () => map.current,
        flyTo: (center, zoom = 14) => {
            map.current?.flyTo({ center, zoom, duration: 1500 });
        },
        fitBounds: (bounds, padding = 50) => {
            map.current?.fitBounds(bounds, { padding, maxZoom: 14 });
        }
    }));

    useEffect(() => {
        if (!mapContainer.current || map.current) return;

        if (!mapboxgl.accessToken) {
            console.warn('Mapbox access token is missing. Please set VITE_MAPBOX_ACCESS_TOKEN in .env.local');
            // We'll let Mapbox error out or handle it gracefully if possible, but mapbox-gl usually throws.
        }

        map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: STYLES[style],
            center: initialCenter,
            zoom: initialZoom
        });

        map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
        map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

        map.current.on('load', () => {
            if (onLoad && map.current) {
                onLoad(map.current);
            }
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, []);

    // Update style if it changes
    useEffect(() => {
        if (map.current && style) {
            const styleUrl = STYLES[style] ?? STYLES['satellite'] ?? 'mapbox://styles/mapbox/satellite-streets-v12';
            map.current.setStyle(styleUrl);
        }
    }, [style]);

    return <div ref={mapContainer} className={className} />;
});

BaseMap.displayName = 'BaseMap';
