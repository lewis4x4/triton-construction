import { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Map,
  List,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { GeofenceList } from '../../components/geofences/GeofenceList';
import { GeofenceEditor } from '../../components/geofences/GeofenceEditor';
import type { Database } from '../../types/database';

type Geofence = Database['public']['Tables']['geofences']['Row'];
type GeofenceEvent = Database['public']['Tables']['geofence_events']['Row'];

interface GeofenceStats {
  totalGeofences: number;
  activeGeofences: number;
  eventsToday: number;
  entryEvents: number;
  exitEvents: number;
  speedingEvents: number;
}

export function GeofenceManagement() {
  const [activeTab, setActiveTab] = useState<'list' | 'map' | 'events'>('list');
  const [showEditor, setShowEditor] = useState(false);
  const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);
  const [stats, setStats] = useState<GeofenceStats>({
    totalGeofences: 0,
    activeGeofences: 0,
    eventsToday: 0,
    entryEvents: 0,
    exitEvents: 0,
    speedingEvents: 0,
  });
  const [recentEvents, setRecentEvents] = useState<(GeofenceEvent & { geofence_name?: string })[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchStats();
    fetchProjects();
    fetchRecentEvents();
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, name')
        .in('status', ['ACTIVE', 'MOBILIZATION'])
        .order('name');

      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const fetchStats = async () => {
    try {
      // Get geofence counts
      let gfQuery = supabase.from('geofences').select('id, is_active');
      if (selectedProject) {
        gfQuery = gfQuery.eq('project_id', selectedProject);
      }
      const { data: geofences } = await gfQuery;

      // Get today's events
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      let eventsQuery = supabase
        .from('geofence_events')
        .select('event_type')
        .gte('created_at', todayStart.toISOString());

      if (selectedProject) {
        eventsQuery = eventsQuery.eq('project_id', selectedProject);
      }

      const { data: events } = await eventsQuery;

      setStats({
        totalGeofences: geofences?.length || 0,
        activeGeofences: geofences?.filter(g => g.is_active).length || 0,
        eventsToday: events?.length || 0,
        entryEvents: events?.filter(e => e.event_type === 'ENTER').length || 0,
        exitEvents: events?.filter(e => e.event_type === 'EXIT').length || 0,
        speedingEvents: events?.filter(e => e.event_type === 'SPEEDING').length || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchRecentEvents = async () => {
    try {
      let query = supabase
        .from('geofence_events')
        .select(`
          *,
          geofences!geofence_events_geofence_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedProject) {
        query = query.eq('project_id', selectedProject);
      }

      const { data } = await query;

      setRecentEvents(
        (data || []).map((event: any) => ({
          ...event,
          geofence_name: event.geofences?.name,
        }))
      );
    } catch (err) {
      console.error('Error fetching events:', err);
    }
  };

  const handleEdit = (geofence: Geofence) => {
    setEditingGeofence(geofence);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingGeofence(null);
    setShowEditor(true);
  };

  const handleSave = () => {
    setShowEditor(false);
    setEditingGeofence(null);
    fetchStats();
  };

  const eventTypeLabels: Record<string, { label: string; color: string }> = {
    ENTER: { label: 'Entry', color: 'bg-green-100 text-green-700' },
    EXIT: { label: 'Exit', color: 'bg-orange-100 text-orange-700' },
    SPEEDING: { label: 'Speeding', color: 'bg-red-100 text-red-700' },
    DWELL_START: { label: 'Dwell Start', color: 'bg-blue-100 text-blue-700' },
    DWELL_END: { label: 'Dwell End', color: 'bg-blue-100 text-blue-700' },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <MapPin className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Geofence Management</h1>
                  <p className="text-sm text-gray-500">
                    Define and monitor geographic zones for equipment and crew
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={selectedProject || ''}
                  onChange={e => setSelectedProject(e.target.value || null)}
                  className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Projects</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Geofence
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.totalGeofences}</div>
                <div className="text-sm text-gray-500">Total Geofences</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{stats.activeGeofences}</div>
                <div className="text-sm text-green-600">Active</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">{stats.eventsToday}</div>
                <div className="text-sm text-blue-600">Events Today</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{stats.entryEvents}</div>
                <div className="text-sm text-green-600">Entries</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-700">{stats.exitEvents}</div>
                <div className="text-sm text-orange-600">Exits</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700">{stats.speedingEvents}</div>
                <div className="text-sm text-red-600">Speeding</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-6 border-b">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'list'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <List className="w-4 h-4 inline mr-2" />
                Geofence List
              </button>
              <button
                onClick={() => setActiveTab('map')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'map'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Map className="w-4 h-4 inline mr-2" />
                Map View
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'events'
                    ? 'border-green-600 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-2" />
                Event Log
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'list' && (
          <GeofenceList
            projectId={selectedProject || undefined}
            onEdit={handleEdit}
            onCreateNew={handleCreate}
          />
        )}

        {activeTab === 'map' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Map View</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Interactive map showing all geofences with real-time equipment positions.
                Requires Mapbox integration.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Recent Geofence Events</h3>
            </div>
            <div className="divide-y">
              {recentEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No events recorded yet
                </div>
              ) : (
                recentEvents.map(event => {
                  const typeConfig = eventTypeLabels[event.event_type] || {
                    label: event.event_type,
                    color: 'bg-gray-100 text-gray-700',
                  };
                  return (
                    <div key={event.id} className="px-6 py-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                          <div>
                            <div className="font-medium text-gray-900">
                              {event.geofence_name || 'Unknown Geofence'}
                            </div>
                            {event.entity_type && event.entity_identifier && (
                              <div className="text-sm text-gray-500">
                                {event.entity_type}: {event.entity_identifier}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">
                            {new Date(event.created_at!).toLocaleTimeString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(event.created_at!).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      {event.speed_mph && event.event_type === 'SPEEDING' && (
                        <div className="mt-2 text-sm text-red-600">
                          <AlertTriangle className="w-4 h-4 inline mr-1" />
                          Speed: {event.speed_mph} mph
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <GeofenceEditor
            geofence={editingGeofence}
            projectId={selectedProject || undefined}
            onSave={handleSave}
            onCancel={() => {
              setShowEditor(false);
              setEditingGeofence(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default GeofenceManagement;
