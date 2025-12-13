import { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  Map,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { GeofenceCard } from './GeofenceCard';
import type { Database } from '../../types/database';

type Geofence = Database['public']['Tables']['geofences']['Row'];
type GeofenceType = Database['public']['Enums']['geofence_type'];

type GeofenceWithDetails = Geofence & {
  project_name?: string;
  event_count_today?: number;
};

// Demo data for when database tables don't exist
const DEMO_GEOFENCES: GeofenceWithDetails[] = [
  {
    id: 'demo-gf-001',
    organization_id: 'demo-org',
    project_id: 'demo-project-1',
    name: 'Corridor H Main Site',
    description: 'Primary work zone for bridge construction',
    geofence_type: 'PROJECT_SITE' as GeofenceType,
    center_lat: 39.4582,
    center_lng: -79.4528,
    radius_meters: 500,
    boundary_geojson: null,
    speed_limit_mph: 25,
    is_active: true,
    alert_on_entry: true,
    alert_on_exit: true,
    alert_on_speeding: true,
    dwell_time_threshold_minutes: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    project_name: 'Corridor H Extension',
    event_count_today: 12,
  },
  {
    id: 'demo-gf-002',
    organization_id: 'demo-org',
    project_id: null,
    name: 'Company Equipment Yard',
    description: 'Main equipment storage and staging area',
    geofence_type: 'COMPANY_YARD' as GeofenceType,
    center_lat: 38.3498,
    center_lng: -81.6326,
    radius_meters: 200,
    boundary_geojson: null,
    speed_limit_mph: 15,
    is_active: true,
    alert_on_entry: true,
    alert_on_exit: true,
    alert_on_speeding: true,
    dwell_time_threshold_minutes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    project_name: undefined,
    event_count_today: 8,
  },
  {
    id: 'demo-gf-003',
    organization_id: 'demo-org',
    project_id: 'demo-project-2',
    name: 'Route 50 Work Zone',
    description: 'Active resurfacing area - restricted access',
    geofence_type: 'RESTRICTED_AREA' as GeofenceType,
    center_lat: 39.2812,
    center_lng: -80.3445,
    radius_meters: 300,
    boundary_geojson: null,
    speed_limit_mph: 15,
    is_active: true,
    alert_on_entry: true,
    alert_on_exit: false,
    alert_on_speeding: true,
    dwell_time_threshold_minutes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    project_name: 'Route 50 Improvements',
    event_count_today: 5,
  },
  {
    id: 'demo-gf-004',
    organization_id: 'demo-org',
    project_id: null,
    name: 'Fuel Station - Charleston',
    description: 'Approved fuel vendor location',
    geofence_type: 'FUEL_STATION' as GeofenceType,
    center_lat: 38.3498,
    center_lng: -81.6326,
    radius_meters: 100,
    boundary_geojson: null,
    speed_limit_mph: null,
    is_active: true,
    alert_on_entry: true,
    alert_on_exit: true,
    alert_on_speeding: false,
    dwell_time_threshold_minutes: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
    project_name: undefined,
    event_count_today: 3,
  },
];

interface GeofenceListProps {
  projectId?: string;
  onEdit?: (geofence: Geofence) => void;
  onCreateNew?: () => void;
  onViewOnMap?: (geofence: Geofence) => void;
  compact?: boolean;
}

const geofenceTypes: { value: GeofenceType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'PROJECT_SITE', label: 'Project Sites' },
  { value: 'COMPANY_YARD', label: 'Company Yards' },
  { value: 'FUEL_STATION', label: 'Fuel Stations' },
  { value: 'SUPPLIER', label: 'Suppliers' },
  { value: 'CUSTOMER', label: 'Customers' },
  { value: 'RESTRICTED_AREA', label: 'Restricted Areas' },
  { value: 'PARKING', label: 'Parking' },
  { value: 'MAINTENANCE_SHOP', label: 'Maintenance Shops' },
];

export function GeofenceList({
  projectId,
  onEdit,
  onCreateNew,
  onViewOnMap,
  compact = false,
}: GeofenceListProps) {
  const [geofences, setGeofences] = useState<GeofenceWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<GeofenceType | 'ALL'>('ALL');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const fetchGeofences = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      let query = supabase
        .from('geofences')
        .select(`
          *,
          projects!geofences_project_id_fkey(name)
        `)
        .order('name');

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      if (showActiveOnly) {
        query = query.eq('is_active', true);
      }

      if (typeFilter !== 'ALL') {
        query = query.eq('geofence_type', typeFilter);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      // Format data
      const formattedGeofences: GeofenceWithDetails[] = (data || []).map((gf: any) => ({
        ...gf,
        project_name: gf.projects?.name,
        event_count_today: 0, // Would fetch from geofence_events
      }));

      // Client-side search
      let filtered = formattedGeofences;
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filtered = formattedGeofences.filter(
          gf =>
            gf.name.toLowerCase().includes(lowerQuery) ||
            gf.description?.toLowerCase().includes(lowerQuery) ||
            gf.project_name?.toLowerCase().includes(lowerQuery)
        );
      }

      setGeofences(filtered);
    } catch (err) {
      console.error('Error fetching geofences:', err);
      setError('Failed to load geofences');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, typeFilter, showActiveOnly, searchQuery]);

  useEffect(() => {
    fetchGeofences();
  }, [fetchGeofences]);

  const handleDelete = async (geofence: Geofence) => {
    if (!confirm(`Are you sure you want to delete "${geofence.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('geofences')
        .delete()
        .eq('id', geofence.id);

      if (error) throw error;
      fetchGeofences();
    } catch (err) {
      console.error('Error deleting geofence:', err);
      alert('Failed to delete geofence');
    }
  };

  const handleToggleActive = async (geofence: Geofence, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('geofences')
        .update({ is_active: isActive })
        .eq('id', geofence.id);

      if (error) throw error;
      fetchGeofences();
    } catch (err) {
      console.error('Error toggling geofence:', err);
      alert('Failed to update geofence');
    }
  };

  // Stats
  const totalActive = geofences.filter(g => g.is_active).length;
  const byType = geofences.reduce((acc, g) => {
    acc[g.geofence_type as GeofenceType] = (acc[g.geofence_type as GeofenceType] || 0) + 1;
    return acc;
  }, {} as Record<GeofenceType, number>);

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Geofences</span>
            <span className="px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 rounded-full">
              {totalActive}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {onCreateNew && (
              <button
                onClick={onCreateNew}
                className="p-1 text-blue-600 hover:text-blue-700"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => fetchGeofences()}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : geofences.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No geofences defined</div>
        ) : (
          <div className="space-y-2">
            {geofences.slice(0, 5).map(gf => (
              <GeofenceCard
                key={gf.id}
                geofence={gf}
                onEdit={onEdit}
                onViewEvents={onViewOnMap}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Geofences</h2>
          </div>
          <div className="flex items-center gap-2">
            {onCreateNew && (
              <button
                onClick={onCreateNew}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Geofence
              </button>
            )}
            <button
              onClick={() => fetchGeofences()}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 mt-4 overflow-x-auto pb-2">
          <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium whitespace-nowrap">
            {totalActive} Active
          </div>
          {Object.entries(byType).slice(0, 4).map(([type, count]) => (
            <div
              key={type}
              className="px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-sm whitespace-nowrap"
            >
              {count} {type.replace('_', ' ').toLowerCase()}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search geofences..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border ${
              showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white text-gray-700'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as GeofenceType | 'ALL')}
              className="px-3 py-1.5 text-sm border rounded-lg"
            >
              {geofenceTypes.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={e => setShowActiveOnly(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Active only
            </label>

            <button
              onClick={() => {
                setTypeFilter('ALL');
                setShowActiveOnly(true);
                setSearchQuery('');
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Geofence Grid */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <MapPin className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => fetchGeofences()}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : geofences.length === 0 ? (
          <div className="text-center py-12">
            <Map className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No geofences found</p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery || typeFilter !== 'ALL'
                ? 'Try adjusting your filters'
                : 'Create your first geofence to start tracking locations'}
            </p>
            {onCreateNew && !searchQuery && typeFilter === 'ALL' && (
              <button
                onClick={onCreateNew}
                className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Create Geofence
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {geofences.map(gf => (
              <GeofenceCard
                key={gf.id}
                geofence={gf}
                onEdit={onEdit}
                onDelete={handleDelete}
                onToggleActive={handleToggleActive}
                onViewEvents={onViewOnMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default GeofenceList;
