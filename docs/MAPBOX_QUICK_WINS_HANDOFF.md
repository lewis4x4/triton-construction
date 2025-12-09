# CLAUDE CODE HANDOFF: MAPBOX QUICK WINS
## Triton Construction AI Platform - Geo Visualization

**Date:** December 8, 2025  
**Priority:** HIGH - Quick wins using existing data  
**Estimated Effort:** 2-4 hours per feature

---

## CONTEXT

The WV811 Locate Ticket system is COMPLETE with GPS coordinates on all tickets. Projects have location data. This handoff enables immediate map visualization without waiting for full Geo-AI platform.

**Supabase Project:** `gablgsruyuhvjurhtcxx`  
**Stack:** React + TypeScript + Vite + Supabase

---

## MAPBOX SETUP (DO FIRST)

### 1. Install Dependencies

```bash
npm install mapbox-gl @types/mapbox-gl
# OR
pnpm add mapbox-gl @types/mapbox-gl
```

### 2. Environment Variable

Add to `.env.local`:
```
VITE_MAPBOX_ACCESS_TOKEN=pk.your_token_here
```

### 3. CSS Import

Add to `src/index.css` or component:
```css
@import 'mapbox-gl/dist/mapbox-gl.css';
```

### 4. TypeScript Config

If type errors occur, add to `src/vite-env.d.ts`:
```typescript
declare module 'mapbox-gl';
```

---

## QUICK WIN #1: 811 LOCATE TICKET MAP

**File:** `src/pages/locate-tickets/TicketMap.tsx`  
**Route:** `/locate-tickets/map`  
**Data Source:** `locate_tickets` table (EXISTS - has `latitude`, `longitude` columns)

### Database Schema (Already Exists)

```sql
-- locate_tickets table has these columns:
latitude DECIMAL(10, 8),      -- GPS lat
longitude DECIMAL(11, 8),     -- GPS lng
ticket_number TEXT,           -- Display in popup
status TEXT,                  -- 'active', 'expired', 'cleared'
excavation_date DATE,         -- Work date
utility_types TEXT[],         -- ['GAS', 'ELECTRIC', 'WATER']
street_address TEXT,          -- Display address
expires_at TIMESTAMPTZ        -- For color coding
```

### Component Implementation

```typescript
// src/pages/locate-tickets/TicketMap.tsx
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/lib/supabase';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface LocateTicket {
  id: string;
  ticket_number: string;
  latitude: number;
  longitude: number;
  status: string;
  street_address: string;
  utility_types: string[];
  expires_at: string;
  excavation_date: string;
}

// APWA Utility Colors
const UTILITY_COLORS: Record<string, string> = {
  'ELECTRIC': '#FF0000',      // Red
  'GAS': '#FFFF00',           // Yellow
  'COMMUNICATION': '#FF6600', // Orange
  'WATER': '#0000FF',         // Blue
  'SEWER': '#00FF00',         // Green
  'DEFAULT': '#FF00FF'        // Pink/Magenta
};

const getTicketColor = (ticket: LocateTicket): string => {
  // Priority: expired = gray, expiring soon = orange, active = by utility
  const now = new Date();
  const expires = new Date(ticket.expires_at);
  const hoursUntilExpiry = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (ticket.status === 'expired' || hoursUntilExpiry < 0) return '#808080';
  if (hoursUntilExpiry < 24) return '#FF6600'; // Expiring within 24h
  if (hoursUntilExpiry < 48) return '#FFAA00'; // Expiring within 48h
  
  // Use primary utility color
  const primaryUtility = ticket.utility_types?.[0] || 'DEFAULT';
  return UTILITY_COLORS[primaryUtility] || UTILITY_COLORS.DEFAULT;
};

export default function TicketMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [tickets, setTickets] = useState<LocateTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch tickets
  useEffect(() => {
    async function fetchTickets() {
      const { data, error } = await supabase
        .from('locate_tickets')
        .select('id, ticket_number, latitude, longitude, status, street_address, utility_types, expires_at, excavation_date')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('excavation_date', { ascending: true });

      if (error) {
        console.error('Error fetching tickets:', error);
      } else {
        setTickets(data || []);
      }
      setLoading(false);
    }
    fetchTickets();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/satellite-streets-v12', // Satellite with labels
      center: [-81.6326, 38.3498], // Charleston, WV (Triton HQ area)
      zoom: 8
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Add markers when tickets load
  useEffect(() => {
    if (!map.current || tickets.length === 0) return;

    // Clear existing markers
    const markers = document.querySelectorAll('.mapboxgl-marker');
    markers.forEach(m => m.remove());

    // Fit bounds to all tickets
    const bounds = new mapboxgl.LngLatBounds();

    tickets.forEach(ticket => {
      if (!ticket.latitude || !ticket.longitude) return;

      bounds.extend([ticket.longitude, ticket.latitude]);

      // Create marker element
      const el = document.createElement('div');
      el.className = 'ticket-marker';
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = getTicketColor(ticket);
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      // Create popup
      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 200px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold;">${ticket.ticket_number}</h3>
          <p style="margin: 4px 0; color: #666;">${ticket.street_address || 'No address'}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> ${ticket.status}</p>
          <p style="margin: 4px 0;"><strong>Dig Date:</strong> ${ticket.excavation_date}</p>
          <p style="margin: 4px 0;"><strong>Utilities:</strong> ${ticket.utility_types?.join(', ') || 'Unknown'}</p>
          <p style="margin: 4px 0;"><strong>Expires:</strong> ${new Date(ticket.expires_at).toLocaleDateString()}</p>
          <a href="/locate-tickets/${ticket.id}" style="color: #0066cc;">View Details →</a>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat([ticket.longitude, ticket.latitude])
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Fit map to markers
    if (tickets.length > 0) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
    }
  }, [tickets]);

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading map...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">811 Locate Ticket Map</h1>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-500"></span> Expired
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span> Expiring &lt;48h
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500"></span> Electric
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-400"></span> Gas
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span> Water
          </span>
        </div>
      </div>
      
      <div 
        ref={mapContainer} 
        className="w-full h-[600px] rounded-lg border shadow-sm"
      />
      
      <p className="text-sm text-gray-500">
        Showing {tickets.length} tickets with GPS coordinates
      </p>
    </div>
  );
}
```

### Add Route

In router config (likely `src/App.tsx` or `src/routes.tsx`):

```typescript
import TicketMap from '@/pages/locate-tickets/TicketMap';

// Add route:
{ path: '/locate-tickets/map', element: <TicketMap /> }
```

### Add Navigation Link

In sidebar or locate tickets page, add link:
```tsx
<Link to="/locate-tickets/map" className="...">
  <MapIcon className="w-4 h-4" />
  Map View
</Link>
```

---

## QUICK WIN #2: PROJECT OVERVIEW MAP

**File:** `src/pages/projects/ProjectMap.tsx`  
**Route:** `/projects/map`  
**Data Source:** `projects` table

### Database Schema (Verify These Columns Exist)

```sql
-- If projects table doesn't have lat/lng, add them:
ALTER TABLE projects ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Or check if there's a project_locations table
```

### Component Implementation

```typescript
// src/pages/projects/ProjectMap.tsx
import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { supabase } from '@/lib/supabase';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

interface Project {
  id: string;
  name: string;
  project_number: string;
  latitude: number;
  longitude: number;
  status: string;
  contract_amount: number;
  county: string;
}

const STATUS_COLORS: Record<string, string> = {
  'active': '#22C55E',    // Green
  'bidding': '#3B82F6',   // Blue
  'pending': '#F59E0B',   // Amber
  'complete': '#6B7280',  // Gray
  'on_hold': '#EF4444'    // Red
};

export default function ProjectMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_number, latitude, longitude, status, contract_amount, county')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (error) {
        console.error('Error fetching projects:', error);
      } else {
        setProjects(data || []);
      }
      setLoading(false);
    }
    fetchProjects();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/outdoors-v12',
      center: [-80.5, 38.9], // Center of WV
      zoom: 7
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current || projects.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    projects.forEach(project => {
      if (!project.latitude || !project.longitude) return;

      bounds.extend([project.longitude, project.latitude]);

      const el = document.createElement('div');
      el.className = 'project-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = STATUS_COLORS[project.status] || '#6B7280';
      el.style.border = '4px solid white';
      el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.innerHTML = '🏗️';
      el.style.fontSize = '16px';

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px; min-width: 220px;">
          <h3 style="margin: 0 0 8px 0; font-weight: bold;">${project.name}</h3>
          <p style="margin: 4px 0; color: #666;">${project.project_number}</p>
          <p style="margin: 4px 0;"><strong>County:</strong> ${project.county || 'N/A'}</p>
          <p style="margin: 4px 0;"><strong>Status:</strong> ${project.status}</p>
          <p style="margin: 4px 0;"><strong>Contract:</strong> $${(project.contract_amount || 0).toLocaleString()}</p>
          <a href="/projects/${project.id}" style="color: #0066cc;">View Project →</a>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat([project.longitude, project.latitude])
        .setPopup(popup)
        .addTo(map.current!);
    });

    if (projects.length > 0) {
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 12 });
    }
  }, [projects]);

  if (loading) {
    return <div className="flex items-center justify-center h-96">Loading projects...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Project Map</h1>
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500"></span> Active
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span> Bidding
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span> Pending
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-500"></span> Complete
          </span>
        </div>
      </div>
      
      <div 
        ref={mapContainer} 
        className="w-full h-[600px] rounded-lg border shadow-sm"
      />
      
      <p className="text-sm text-gray-500">
        Showing {projects.length} projects with locations
      </p>
    </div>
  );
}
```

---

## QUICK WIN #3: REUSABLE MAP COMPONENT

**File:** `src/components/maps/BaseMap.tsx`

Create a reusable base component for all maps:

```typescript
// src/components/maps/BaseMap.tsx
import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import mapboxgl from 'mapbox-gl';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

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

  return <div ref={mapContainer} className={className} />;
});

BaseMap.displayName = 'BaseMap';
```

### Usage Example

```typescript
import { BaseMap, MapRef } from '@/components/maps/BaseMap';

function MyPage() {
  const mapRef = useRef<MapRef>(null);

  const handleLocationClick = (lat: number, lng: number) => {
    mapRef.current?.flyTo([lng, lat], 15);
  };

  return (
    <BaseMap
      ref={mapRef}
      style="satellite"
      className="w-full h-[600px] rounded-lg"
      onLoad={(map) => {
        // Add markers, layers, etc.
      }}
    />
  );
}
```

---

## QUICK WIN #4: ADD MAP TO EXISTING TICKET DETAIL PAGE

If there's an existing ticket detail page, add a mini-map:

```typescript
// Add to existing ticket detail component
import { BaseMap } from '@/components/maps/BaseMap';

// In the component JSX, add:
{ticket.latitude && ticket.longitude && (
  <div className="mt-6">
    <h3 className="text-lg font-semibold mb-2">Location</h3>
    <BaseMap
      initialCenter={[ticket.longitude, ticket.latitude]}
      initialZoom={16}
      style="satellite"
      className="w-full h-[300px] rounded-lg"
      onLoad={(map) => {
        new mapboxgl.Marker({ color: '#FF0000' })
          .setLngLat([ticket.longitude, ticket.latitude])
          .addTo(map);
      }}
    />
  </div>
)}
```

---

## DATABASE VERIFICATION

Run these queries to verify data exists:

```sql
-- Check locate_tickets have coordinates
SELECT COUNT(*) as total,
       COUNT(latitude) as with_coords
FROM locate_tickets;

-- Check projects have coordinates
SELECT COUNT(*) as total,
       COUNT(latitude) as with_coords
FROM projects;

-- Sample ticket data
SELECT ticket_number, latitude, longitude, status, utility_types
FROM locate_tickets
WHERE latitude IS NOT NULL
LIMIT 5;
```

---

## FILE CHECKLIST

Create these files:

```
src/
├── components/
│   └── maps/
│       └── BaseMap.tsx           # Reusable map component
├── pages/
│   ├── locate-tickets/
│   │   └── TicketMap.tsx         # 811 ticket map view
│   └── projects/
│       └── ProjectMap.tsx        # Project overview map
```

---

## TESTING CHECKLIST

1. [ ] Mapbox token set in `.env.local`
2. [ ] `mapbox-gl` package installed
3. [ ] CSS imported (`mapbox-gl/dist/mapbox-gl.css`)
4. [ ] Routes added to router
5. [ ] Navigation links added
6. [ ] Markers display on map
7. [ ] Popups show correct data
8. [ ] Map fits bounds to all markers
9. [ ] Color coding works (status/expiry)
10. [ ] Click through to detail pages works

---

## NEXT STEPS (After Quick Wins)

1. **811 Heatmap Layer** — Density visualization of tickets
2. **Equipment Geofencing** — Draw project boundaries
3. **Real-time Updates** — Supabase realtime subscriptions
4. **Clustering** — Group markers at low zoom levels
5. **Drawing Tools** — Let users draw dig zones

---

## HANDOFF INSTRUCTIONS

Give Claude Code this file with:

> "Implement the Mapbox quick wins from MAPBOX_QUICK_WINS_HANDOFF.md. Start with Quick Win #1 (811 Locate Ticket Map) and the Base Map component. Verify the locate_tickets table has latitude/longitude columns first."

---

*Document created: December 8, 2025*
