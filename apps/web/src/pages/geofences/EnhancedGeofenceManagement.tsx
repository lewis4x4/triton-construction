import { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Map,
  List,
  Activity,
  AlertTriangle,
  Search,
  Filter,
  Download,
  RefreshCw,
  X,
  ChevronRight,
  Circle,
  Square,
  Pentagon,
  Navigation,
  Truck,
  Users,
  Clock,
  Gauge,
  AlertCircle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit2,
  Trash2,
  Settings,
  Bell,
  Target,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  BarChart3,
  PieChart,
  Timer
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './EnhancedGeofenceManagement.css';

interface Geofence {
  id: string;
  name: string;
  description: string | null;
  zone_type: 'PROJECT_BOUNDARY' | 'WORK_ZONE' | 'RESTRICTED' | 'STAGING' | 'LAYDOWN' | 'OFFICE' | 'SPEED_ZONE';
  geometry_type: 'POLYGON' | 'CIRCLE' | 'RECTANGLE';
  is_active: boolean;
  speed_limit_mph: number | null;
  alert_on_entry: boolean;
  alert_on_exit: boolean;
  alert_on_speeding: boolean;
  dwell_time_threshold_minutes: number | null;
  project_id: string | null;
  project_name?: string;
  center_lat: number;
  center_lng: number;
  radius_meters?: number;
  created_at: string;
  equipment_count?: number;
  crew_count?: number;
}

interface GeofenceEvent {
  id: string;
  geofence_id: string;
  geofence_name?: string;
  event_type: 'ENTER' | 'EXIT' | 'SPEEDING' | 'DWELL_START' | 'DWELL_END';
  entity_type: 'EQUIPMENT' | 'CREW' | 'VEHICLE';
  entity_id: string;
  entity_identifier: string;
  speed_mph?: number;
  created_at: string;
}

interface GeofenceStats {
  totalGeofences: number;
  activeGeofences: number;
  eventsToday: number;
  entryEvents: number;
  exitEvents: number;
  speedingEvents: number;
  dwellAlerts: number;
  equipmentInZones: number;
  crewInZones: number;
}

interface ZoneTypeBreakdown {
  type: string;
  count: number;
  color: string;
}

interface HourlyActivity {
  hour: string;
  entries: number;
  exits: number;
  speeding: number;
}

interface AlertConfig {
  id: string;
  name: string;
  type: 'entry' | 'exit' | 'speeding' | 'dwell';
  enabled: boolean;
  recipients: string[];
  geofence_ids: string[];
}

// Demo data
const demoGeofences: Geofence[] = [
  {
    id: 'gf-001',
    name: 'Corridor H Main Site',
    description: 'Primary construction zone boundary',
    zone_type: 'PROJECT_BOUNDARY',
    geometry_type: 'POLYGON',
    is_active: true,
    speed_limit_mph: 25,
    alert_on_entry: true,
    alert_on_exit: true,
    alert_on_speeding: true,
    dwell_time_threshold_minutes: null,
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    center_lat: 39.1234,
    center_lng: -79.4567,
    created_at: '2024-01-15T08:00:00Z',
    equipment_count: 12,
    crew_count: 28
  },
  {
    id: 'gf-002',
    name: 'Bridge Work Zone',
    description: 'Active bridge construction area - restricted access',
    zone_type: 'WORK_ZONE',
    geometry_type: 'POLYGON',
    is_active: true,
    speed_limit_mph: 15,
    alert_on_entry: true,
    alert_on_exit: false,
    alert_on_speeding: true,
    dwell_time_threshold_minutes: 480,
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    center_lat: 39.1256,
    center_lng: -79.4589,
    created_at: '2024-02-01T08:00:00Z',
    equipment_count: 5,
    crew_count: 14
  },
  {
    id: 'gf-003',
    name: 'Material Staging Area',
    description: 'Aggregate and material laydown yard',
    zone_type: 'STAGING',
    geometry_type: 'RECTANGLE',
    is_active: true,
    speed_limit_mph: 10,
    alert_on_entry: false,
    alert_on_exit: false,
    alert_on_speeding: true,
    dwell_time_threshold_minutes: 30,
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    center_lat: 39.1278,
    center_lng: -79.4534,
    created_at: '2024-02-15T08:00:00Z',
    equipment_count: 3,
    crew_count: 4
  },
  {
    id: 'gf-004',
    name: 'Office Compound',
    description: 'Field office and parking area',
    zone_type: 'OFFICE',
    geometry_type: 'CIRCLE',
    is_active: true,
    speed_limit_mph: 5,
    alert_on_entry: false,
    alert_on_exit: false,
    alert_on_speeding: false,
    dwell_time_threshold_minutes: null,
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    center_lat: 39.1212,
    center_lng: -79.4612,
    radius_meters: 150,
    created_at: '2024-01-20T08:00:00Z',
    equipment_count: 2,
    crew_count: 8
  },
  {
    id: 'gf-005',
    name: 'Restricted Blasting Zone',
    description: 'Active blasting area - authorized personnel only',
    zone_type: 'RESTRICTED',
    geometry_type: 'POLYGON',
    is_active: true,
    speed_limit_mph: null,
    alert_on_entry: true,
    alert_on_exit: true,
    alert_on_speeding: false,
    dwell_time_threshold_minutes: 15,
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    center_lat: 39.1289,
    center_lng: -79.4501,
    created_at: '2024-03-01T08:00:00Z',
    equipment_count: 1,
    crew_count: 3
  },
  {
    id: 'gf-006',
    name: 'Speed Zone - Haul Road',
    description: '25 MPH enforced on main haul road',
    zone_type: 'SPEED_ZONE',
    geometry_type: 'POLYGON',
    is_active: true,
    speed_limit_mph: 25,
    alert_on_entry: false,
    alert_on_exit: false,
    alert_on_speeding: true,
    dwell_time_threshold_minutes: null,
    project_id: 'proj-001',
    project_name: 'Corridor H Extension',
    center_lat: 39.1245,
    center_lng: -79.4523,
    created_at: '2024-02-20T08:00:00Z',
    equipment_count: 8,
    crew_count: 0
  },
  {
    id: 'gf-007',
    name: 'Equipment Laydown Yard',
    description: 'Equipment storage and maintenance area',
    zone_type: 'LAYDOWN',
    geometry_type: 'RECTANGLE',
    is_active: true,
    speed_limit_mph: 5,
    alert_on_entry: false,
    alert_on_exit: true,
    alert_on_speeding: false,
    dwell_time_threshold_minutes: null,
    project_id: 'proj-002',
    project_name: 'Route 50 Improvements',
    center_lat: 39.2012,
    center_lng: -79.5234,
    created_at: '2024-03-10T08:00:00Z',
    equipment_count: 6,
    crew_count: 2
  },
  {
    id: 'gf-008',
    name: 'Route 50 Work Zone Alpha',
    description: 'Active paving section',
    zone_type: 'WORK_ZONE',
    geometry_type: 'POLYGON',
    is_active: false,
    speed_limit_mph: 15,
    alert_on_entry: true,
    alert_on_exit: true,
    alert_on_speeding: true,
    dwell_time_threshold_minutes: 240,
    project_id: 'proj-002',
    project_name: 'Route 50 Improvements',
    center_lat: 39.2045,
    center_lng: -79.5267,
    created_at: '2024-03-15T08:00:00Z',
    equipment_count: 0,
    crew_count: 0
  }
];

const demoEvents: GeofenceEvent[] = [
  {
    id: 'evt-001',
    geofence_id: 'gf-001',
    geofence_name: 'Corridor H Main Site',
    event_type: 'ENTER',
    entity_type: 'EQUIPMENT',
    entity_id: 'eq-001',
    entity_identifier: 'CAT 336 Excavator #103',
    created_at: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: 'evt-002',
    geofence_id: 'gf-006',
    geofence_name: 'Speed Zone - Haul Road',
    event_type: 'SPEEDING',
    entity_type: 'EQUIPMENT',
    entity_id: 'eq-002',
    entity_identifier: 'CAT 745 Haul Truck #207',
    speed_mph: 32,
    created_at: new Date(Date.now() - 12 * 60000).toISOString()
  },
  {
    id: 'evt-003',
    geofence_id: 'gf-002',
    geofence_name: 'Bridge Work Zone',
    event_type: 'ENTER',
    entity_type: 'CREW',
    entity_id: 'crew-001',
    entity_identifier: 'John Smith (Foreman)',
    created_at: new Date(Date.now() - 18 * 60000).toISOString()
  },
  {
    id: 'evt-004',
    geofence_id: 'gf-005',
    geofence_name: 'Restricted Blasting Zone',
    event_type: 'DWELL_START',
    entity_type: 'EQUIPMENT',
    entity_id: 'eq-003',
    entity_identifier: 'Drill Rig #05',
    created_at: new Date(Date.now() - 25 * 60000).toISOString()
  },
  {
    id: 'evt-005',
    geofence_id: 'gf-003',
    geofence_name: 'Material Staging Area',
    event_type: 'EXIT',
    entity_type: 'EQUIPMENT',
    entity_id: 'eq-004',
    entity_identifier: 'Concrete Truck #12',
    created_at: new Date(Date.now() - 35 * 60000).toISOString()
  },
  {
    id: 'evt-006',
    geofence_id: 'gf-006',
    geofence_name: 'Speed Zone - Haul Road',
    event_type: 'SPEEDING',
    entity_type: 'EQUIPMENT',
    entity_id: 'eq-005',
    entity_identifier: 'Water Truck #03',
    speed_mph: 28,
    created_at: new Date(Date.now() - 42 * 60000).toISOString()
  },
  {
    id: 'evt-007',
    geofence_id: 'gf-001',
    geofence_name: 'Corridor H Main Site',
    event_type: 'EXIT',
    entity_type: 'CREW',
    entity_id: 'crew-002',
    entity_identifier: 'Safety Officer M. Johnson',
    created_at: new Date(Date.now() - 55 * 60000).toISOString()
  },
  {
    id: 'evt-008',
    geofence_id: 'gf-004',
    geofence_name: 'Office Compound',
    event_type: 'ENTER',
    entity_type: 'VEHICLE',
    entity_id: 'veh-001',
    entity_identifier: 'Inspector Vehicle #WV-DOH-42',
    created_at: new Date(Date.now() - 68 * 60000).toISOString()
  }
];

const demoHourlyActivity: HourlyActivity[] = [
  { hour: '6AM', entries: 28, exits: 2, speeding: 0 },
  { hour: '7AM', entries: 42, exits: 5, speeding: 1 },
  { hour: '8AM', entries: 18, exits: 12, speeding: 2 },
  { hour: '9AM', entries: 8, exits: 6, speeding: 1 },
  { hour: '10AM', entries: 12, exits: 15, speeding: 3 },
  { hour: '11AM', entries: 6, exits: 8, speeding: 0 },
  { hour: '12PM', entries: 22, exits: 35, speeding: 1 },
  { hour: '1PM', entries: 30, exits: 12, speeding: 2 },
  { hour: '2PM', entries: 8, exits: 10, speeding: 1 },
  { hour: '3PM', entries: 5, exits: 18, speeding: 0 },
  { hour: '4PM', entries: 3, exits: 32, speeding: 2 },
  { hour: '5PM', entries: 2, exits: 28, speeding: 0 }
];

export function EnhancedGeofenceManagement() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'list' | 'map' | 'events' | 'alerts' | 'analytics'>('overview');
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [stats, setStats] = useState<GeofenceStats>({
    totalGeofences: 0,
    activeGeofences: 0,
    eventsToday: 0,
    entryEvents: 0,
    exitEvents: 0,
    speedingEvents: 0,
    dwellAlerts: 0,
    equipmentInZones: 0,
    crewInZones: 0
  });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects] = useState([
    { id: 'proj-001', name: 'Corridor H Extension' },
    { id: 'proj-002', name: 'Route 50 Improvements' },
    { id: 'proj-003', name: 'I-64 Bridge Repair' }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGeofence, setSelectedGeofence] = useState<Geofence | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [mapZoom, setMapZoom] = useState(12);

  useEffect(() => {
    fetchData();
  }, [selectedProject]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Try to fetch real data
      const { data: gfData } = await (supabase as any)
        .from('geofences')
        .select('*')
        .order('created_at', { ascending: false });

      if (gfData && gfData.length > 0) {
        setGeofences(gfData);
        calculateStats(gfData);
      } else {
        // Use demo data
        setGeofences(demoGeofences);
        setEvents(demoEvents);
        calculateStats(demoGeofences);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setGeofences(demoGeofences);
      setEvents(demoEvents);
      calculateStats(demoGeofences);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (gfData: Geofence[]) => {
    const filtered = selectedProject
      ? gfData.filter(g => g.project_id === selectedProject)
      : gfData;

    setStats({
      totalGeofences: filtered.length,
      activeGeofences: filtered.filter(g => g.is_active).length,
      eventsToday: 156,
      entryEvents: 98,
      exitEvents: 52,
      speedingEvents: 6,
      dwellAlerts: 3,
      equipmentInZones: filtered.reduce((sum, g) => sum + (g.equipment_count || 0), 0),
      crewInZones: filtered.reduce((sum, g) => sum + (g.crew_count || 0), 0)
    });
  };

  const filteredGeofences = geofences.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesProject = !selectedProject || g.project_id === selectedProject;
    return matchesSearch && matchesProject;
  });

  const zoneTypeBreakdown: ZoneTypeBreakdown[] = [
    { type: 'Work Zone', count: filteredGeofences.filter(g => g.zone_type === 'WORK_ZONE').length, color: '#3b82f6' },
    { type: 'Project Boundary', count: filteredGeofences.filter(g => g.zone_type === 'PROJECT_BOUNDARY').length, color: '#10b981' },
    { type: 'Restricted', count: filteredGeofences.filter(g => g.zone_type === 'RESTRICTED').length, color: '#ef4444' },
    { type: 'Staging', count: filteredGeofences.filter(g => g.zone_type === 'STAGING').length, color: '#f59e0b' },
    { type: 'Speed Zone', count: filteredGeofences.filter(g => g.zone_type === 'SPEED_ZONE').length, color: '#8b5cf6' },
    { type: 'Office', count: filteredGeofences.filter(g => g.zone_type === 'OFFICE').length, color: '#6366f1' },
    { type: 'Laydown', count: filteredGeofences.filter(g => g.zone_type === 'LAYDOWN').length, color: '#06b6d4' }
  ].filter(z => z.count > 0);

  const getZoneTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'PROJECT_BOUNDARY': 'green',
      'WORK_ZONE': 'blue',
      'RESTRICTED': 'red',
      'STAGING': 'amber',
      'LAYDOWN': 'cyan',
      'OFFICE': 'indigo',
      'SPEED_ZONE': 'purple'
    };
    return colors[type] || 'gray';
  };

  const getEventTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; color: string; icon: any }> = {
      'ENTER': { label: 'Entry', color: 'green', icon: Navigation },
      'EXIT': { label: 'Exit', color: 'amber', icon: Navigation },
      'SPEEDING': { label: 'Speeding', color: 'red', icon: Gauge },
      'DWELL_START': { label: 'Dwell Started', color: 'blue', icon: Timer },
      'DWELL_END': { label: 'Dwell Ended', color: 'gray', icon: Timer }
    };
    return configs[type] || { label: type, color: 'gray', icon: Circle };
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Render functions
  const renderDonutChart = () => {
    const total = zoneTypeBreakdown.reduce((sum, z) => sum + z.count, 0);
    if (total === 0) return null;

    let cumulativePercent = 0;

    return (
      <svg width="160" height="160" viewBox="0 0 160 160">
        {zoneTypeBreakdown.map((zone, idx) => {
          const percent = (zone.count / total) * 100;
          const strokeDasharray = `${percent * 3.77} ${377 - percent * 3.77}`;
          const strokeDashoffset = -cumulativePercent * 3.77;
          cumulativePercent += percent;

          return (
            <circle
              key={idx}
              cx="80"
              cy="80"
              r="60"
              fill="none"
              stroke={zone.color}
              strokeWidth="20"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 80 80)"
            />
          );
        })}
        <text x="80" y="75" textAnchor="middle" className="gf-donut-value">{total}</text>
        <text x="80" y="95" textAnchor="middle" className="gf-donut-label">Zones</text>
      </svg>
    );
  };

  const renderActivityChart = () => {
    const maxValue = Math.max(...demoHourlyActivity.map(h => h.entries + h.exits));

    return (
      <div className="gf-activity-chart">
        {demoHourlyActivity.map((hour, idx) => (
          <div key={idx} className="gf-activity-bar-group">
            <div className="gf-activity-bars">
              <div
                className="gf-activity-bar entries"
                style={{ height: `${(hour.entries / maxValue) * 100}%` }}
                title={`${hour.entries} entries`}
              />
              <div
                className="gf-activity-bar exits"
                style={{ height: `${(hour.exits / maxValue) * 100}%` }}
                title={`${hour.exits} exits`}
              />
              {hour.speeding > 0 && (
                <div
                  className="gf-activity-bar speeding"
                  style={{ height: `${(hour.speeding / maxValue) * 100}%` }}
                  title={`${hour.speeding} speeding`}
                />
              )}
            </div>
            <span className="gf-activity-label">{hour.hour}</span>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="enhanced-geofence-dashboard">
        <div className="gf-loading">
          <div className="gf-loading-spinner" />
          <p>Loading geofence data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-geofence-dashboard">
      {/* Header */}
      <div className="gf-header">
        <div className="gf-header-left">
          <h1>
            <MapPin />
            Geofence Management
          </h1>
          <p>Define and monitor geographic zones for equipment and crew tracking</p>
        </div>
        <div className="gf-header-actions">
          <select
            value={selectedProject || ''}
            onChange={e => setSelectedProject(e.target.value || null)}
            className="gf-select"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button className="gf-btn gf-btn-secondary" onClick={fetchData}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className="gf-btn gf-btn-secondary">
            <Download size={16} />
            Export
          </button>
          <button className="gf-btn gf-btn-primary" onClick={() => setShowNewModal(true)}>
            <Plus size={16} />
            New Geofence
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="gf-kpi-grid">
        <div className="gf-kpi-card blue">
          <div className="gf-kpi-header">
            <div className="gf-kpi-icon">
              <MapPin size={24} />
            </div>
            <span className="gf-kpi-trend up">
              <TrendingUp size={14} />
              +2
            </span>
          </div>
          <div className="gf-kpi-value">{stats.totalGeofences}</div>
          <div className="gf-kpi-label">Total Geofences</div>
          <div className="gf-kpi-details">
            <div className="gf-kpi-detail">
              <span className="gf-kpi-detail-value">{stats.activeGeofences}</span>
              <span className="gf-kpi-detail-label">Active</span>
            </div>
            <div className="gf-kpi-detail">
              <span className="gf-kpi-detail-value">{stats.totalGeofences - stats.activeGeofences}</span>
              <span className="gf-kpi-detail-label">Inactive</span>
            </div>
          </div>
        </div>

        <div className="gf-kpi-card green">
          <div className="gf-kpi-header">
            <div className="gf-kpi-icon">
              <Activity size={24} />
            </div>
            <span className="gf-kpi-trend up">
              <TrendingUp size={14} />
              +12%
            </span>
          </div>
          <div className="gf-kpi-value">{stats.eventsToday}</div>
          <div className="gf-kpi-label">Events Today</div>
          <div className="gf-kpi-details">
            <div className="gf-kpi-detail">
              <span className="gf-kpi-detail-value">{stats.entryEvents}</span>
              <span className="gf-kpi-detail-label">Entries</span>
            </div>
            <div className="gf-kpi-detail">
              <span className="gf-kpi-detail-value">{stats.exitEvents}</span>
              <span className="gf-kpi-detail-label">Exits</span>
            </div>
          </div>
        </div>

        <div className="gf-kpi-card red">
          <div className="gf-kpi-header">
            <div className="gf-kpi-icon">
              <AlertTriangle size={24} />
            </div>
            <span className="gf-kpi-trend down">
              <TrendingDown size={14} />
              -25%
            </span>
          </div>
          <div className="gf-kpi-value">{stats.speedingEvents}</div>
          <div className="gf-kpi-label">Speed Violations</div>
          <div className="gf-kpi-details">
            <div className="gf-kpi-detail">
              <span className="gf-kpi-detail-value">{stats.dwellAlerts}</span>
              <span className="gf-kpi-detail-label">Dwell Alerts</span>
            </div>
          </div>
        </div>

        <div className="gf-kpi-card purple">
          <div className="gf-kpi-header">
            <div className="gf-kpi-icon">
              <Users size={24} />
            </div>
            <span className="gf-kpi-trend neutral">
              <TrendingUp size={14} />
              0
            </span>
          </div>
          <div className="gf-kpi-value">{stats.equipmentInZones + stats.crewInZones}</div>
          <div className="gf-kpi-label">Assets in Zones</div>
          <div className="gf-kpi-details">
            <div className="gf-kpi-detail">
              <span className="gf-kpi-detail-value">{stats.equipmentInZones}</span>
              <span className="gf-kpi-detail-label">Equipment</span>
            </div>
            <div className="gf-kpi-detail">
              <span className="gf-kpi-detail-value">{stats.crewInZones}</span>
              <span className="gf-kpi-detail-label">Crew</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="gf-tabs">
        <button
          className={`gf-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <BarChart3 size={16} />
          Overview
        </button>
        <button
          className={`gf-tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <List size={16} />
          Geofences
          <span className="gf-tab-badge">{filteredGeofences.length}</span>
        </button>
        <button
          className={`gf-tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <Map size={16} />
          Map View
        </button>
        <button
          className={`gf-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <Activity size={16} />
          Event Log
          <span className="gf-tab-badge">{events.length}</span>
        </button>
        <button
          className={`gf-tab ${activeTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <Bell size={16} />
          Alert Rules
        </button>
        <button
          className={`gf-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <PieChart size={16} />
          Analytics
        </button>
      </div>

      {/* Content */}
      <div className={`gf-content ${selectedGeofence ? '' : 'full-width'}`}>
        <div className="gf-main-panel">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <>
              <div className="gf-overview-grid">
                {/* Zone Type Breakdown */}
                <div className="gf-card">
                  <h3>
                    <Layers size={18} />
                    Zone Type Breakdown
                  </h3>
                  <div className="gf-zone-breakdown">
                    <div className="gf-zone-donut">
                      {renderDonutChart()}
                    </div>
                    <div className="gf-zone-legend">
                      {zoneTypeBreakdown.map((zone, idx) => (
                        <div key={idx} className="gf-zone-legend-item">
                          <div className="gf-zone-legend-left">
                            <div
                              className="gf-zone-legend-color"
                              style={{ background: zone.color }}
                            />
                            <span className="gf-zone-legend-name">{zone.type}</span>
                          </div>
                          <span className="gf-zone-legend-value">{zone.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Today's Activity */}
                <div className="gf-card">
                  <h3>
                    <Activity size={18} />
                    Hourly Activity
                  </h3>
                  {renderActivityChart()}
                  <div className="gf-activity-legend">
                    <span className="gf-activity-legend-item">
                      <span className="gf-legend-dot entries" />
                      Entries
                    </span>
                    <span className="gf-activity-legend-item">
                      <span className="gf-legend-dot exits" />
                      Exits
                    </span>
                    <span className="gf-activity-legend-item">
                      <span className="gf-legend-dot speeding" />
                      Speeding
                    </span>
                  </div>
                </div>

                {/* Active Alerts */}
                <div className="gf-card">
                  <h3>
                    <AlertTriangle size={18} />
                    Active Alerts
                  </h3>
                  <div className="gf-alerts-list">
                    <div className="gf-alert-item critical">
                      <div className="gf-alert-icon">
                        <Gauge size={18} />
                      </div>
                      <div className="gf-alert-content">
                        <div className="gf-alert-title">Speed Violation</div>
                        <div className="gf-alert-desc">CAT 745 Haul Truck - 32 mph in 25 mph zone</div>
                        <div className="gf-alert-time">12 minutes ago</div>
                      </div>
                    </div>
                    <div className="gf-alert-item warning">
                      <div className="gf-alert-icon">
                        <Timer size={18} />
                      </div>
                      <div className="gf-alert-content">
                        <div className="gf-alert-title">Extended Dwell Time</div>
                        <div className="gf-alert-desc">Drill Rig #05 in Blasting Zone &gt; 15 min</div>
                        <div className="gf-alert-time">25 minutes ago</div>
                      </div>
                    </div>
                    <div className="gf-alert-item info">
                      <div className="gf-alert-icon">
                        <Navigation size={18} />
                      </div>
                      <div className="gf-alert-content">
                        <div className="gf-alert-title">Restricted Zone Entry</div>
                        <div className="gf-alert-desc">Inspector Vehicle entered site</div>
                        <div className="gf-alert-time">1 hour ago</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Events */}
              <div className="gf-card">
                <div className="gf-card-header">
                  <h3>
                    <Clock size={18} />
                    Recent Events
                  </h3>
                  <button className="gf-btn gf-btn-small" onClick={() => setActiveTab('events')}>
                    View All
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="gf-events-timeline">
                  {demoEvents.slice(0, 5).map(event => {
                    const config = getEventTypeConfig(event.event_type);
                    const Icon = config.icon;
                    return (
                      <div key={event.id} className="gf-event-item">
                        <div className={`gf-event-icon ${config.color}`}>
                          <Icon size={16} />
                        </div>
                        <div className="gf-event-content">
                          <div className="gf-event-title">
                            <span className={`gf-event-type ${config.color}`}>{config.label}</span>
                            <span className="gf-event-entity">{event.entity_identifier}</span>
                          </div>
                          <div className="gf-event-zone">{event.geofence_name}</div>
                          {event.speed_mph && (
                            <div className="gf-event-speed">Speed: {event.speed_mph} mph</div>
                          )}
                        </div>
                        <div className="gf-event-time">{formatTimeAgo(event.created_at)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* List Tab */}
          {activeTab === 'list' && (
            <div className="gf-table-section">
              <div className="gf-table-header">
                <h3>
                  <MapPin size={18} />
                  Geofence Zones
                </h3>
                <div className="gf-table-controls">
                  <div className="gf-search">
                    <Search size={16} />
                    <input
                      type="text"
                      placeholder="Search geofences..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <button className="gf-filter-btn">
                    <Filter size={14} />
                    Filters
                  </button>
                </div>
              </div>
              <div className="gf-table-container">
                <table className="gf-table">
                  <thead>
                    <tr>
                      <th>Zone Name</th>
                      <th>Type</th>
                      <th>Project</th>
                      <th>Status</th>
                      <th>Speed Limit</th>
                      <th>Alerts</th>
                      <th>Assets</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGeofences.map(gf => (
                      <tr
                        key={gf.id}
                        className={selectedGeofence?.id === gf.id ? 'selected' : ''}
                        onClick={() => setSelectedGeofence(gf)}
                      >
                        <td>
                          <div className="gf-zone-name">
                            <span className="gf-zone-title">{gf.name}</span>
                            {gf.description && (
                              <span className="gf-zone-desc">{gf.description}</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`gf-type-badge ${getZoneTypeColor(gf.zone_type)}`}>
                            {gf.zone_type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="gf-project-cell">
                          {gf.project_name || 'No Project'}
                        </td>
                        <td>
                          <span className={`gf-status-badge ${gf.is_active ? 'active' : 'inactive'}`}>
                            {gf.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          {gf.speed_limit_mph ? (
                            <span className="gf-speed-limit">
                              <Gauge size={14} />
                              {gf.speed_limit_mph} mph
                            </span>
                          ) : (
                            <span className="gf-no-limit">—</span>
                          )}
                        </td>
                        <td>
                          <div className="gf-alert-icons">
                            {gf.alert_on_entry && (
                              <span className="gf-alert-indicator entry" title="Entry alerts">
                                <Navigation size={12} />
                              </span>
                            )}
                            {gf.alert_on_exit && (
                              <span className="gf-alert-indicator exit" title="Exit alerts">
                                <Navigation size={12} style={{ transform: 'rotate(180deg)' }} />
                              </span>
                            )}
                            {gf.alert_on_speeding && (
                              <span className="gf-alert-indicator speeding" title="Speeding alerts">
                                <Gauge size={12} />
                              </span>
                            )}
                            {gf.dwell_time_threshold_minutes && (
                              <span className="gf-alert-indicator dwell" title={`Dwell: ${gf.dwell_time_threshold_minutes}m`}>
                                <Timer size={12} />
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="gf-assets">
                            <span className="gf-asset-count">
                              <Truck size={14} />
                              {gf.equipment_count || 0}
                            </span>
                            <span className="gf-asset-count">
                              <Users size={14} />
                              {gf.crew_count || 0}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="gf-actions">
                            <button className="gf-action-btn" title="View on map">
                              <Eye size={14} />
                            </button>
                            <button className="gf-action-btn" title="Edit">
                              <Edit2 size={14} />
                            </button>
                            <button className="gf-action-btn danger" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Map Tab */}
          {activeTab === 'map' && (
            <div className="gf-map-section">
              <div className="gf-map-toolbar">
                <div className="gf-map-controls">
                  <button className="gf-map-btn" onClick={() => setMapZoom(Math.min(mapZoom + 1, 18))}>
                    <ZoomIn size={16} />
                  </button>
                  <button className="gf-map-btn" onClick={() => setMapZoom(Math.max(mapZoom - 1, 8))}>
                    <ZoomOut size={16} />
                  </button>
                  <button className="gf-map-btn">
                    <Maximize2 size={16} />
                  </button>
                </div>
                <div className="gf-map-layers">
                  <button className="gf-layer-btn active">
                    <Layers size={14} />
                    Geofences
                  </button>
                  <button className="gf-layer-btn">
                    <Truck size={14} />
                    Equipment
                  </button>
                  <button className="gf-layer-btn">
                    <Users size={14} />
                    Crew
                  </button>
                </div>
              </div>
              <div className="gf-map-container">
                {/* Map placeholder - would integrate with Mapbox */}
                <div className="gf-map-placeholder">
                  <div className="gf-map-overlay">
                    {filteredGeofences.filter(g => g.is_active).map((gf, idx) => (
                      <div
                        key={gf.id}
                        className={`gf-map-marker ${getZoneTypeColor(gf.zone_type)}`}
                        style={{
                          left: `${20 + (idx % 4) * 20}%`,
                          top: `${20 + Math.floor(idx / 4) * 25}%`
                        }}
                        onClick={() => setSelectedGeofence(gf)}
                      >
                        <MapPin size={20} />
                        <span className="gf-marker-label">{gf.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className="gf-map-info">
                    <Map size={48} />
                    <h3>Interactive Map View</h3>
                    <p>Mapbox integration required for full functionality</p>
                    <p className="gf-map-coords">Center: 39.1234°N, 79.4567°W | Zoom: {mapZoom}</p>
                  </div>
                </div>
              </div>
              <div className="gf-map-legend">
                <h4>Zone Types</h4>
                <div className="gf-legend-items">
                  <span className="gf-legend-item">
                    <span className="gf-legend-color green" />
                    Project Boundary
                  </span>
                  <span className="gf-legend-item">
                    <span className="gf-legend-color blue" />
                    Work Zone
                  </span>
                  <span className="gf-legend-item">
                    <span className="gf-legend-color red" />
                    Restricted
                  </span>
                  <span className="gf-legend-item">
                    <span className="gf-legend-color amber" />
                    Staging
                  </span>
                  <span className="gf-legend-item">
                    <span className="gf-legend-color purple" />
                    Speed Zone
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="gf-events-section">
              <div className="gf-events-header">
                <h3>
                  <Activity size={18} />
                  Geofence Event Log
                </h3>
                <div className="gf-events-filters">
                  <select className="gf-select-small">
                    <option>All Event Types</option>
                    <option>Entry</option>
                    <option>Exit</option>
                    <option>Speeding</option>
                    <option>Dwell</option>
                  </select>
                  <select className="gf-select-small">
                    <option>All Entities</option>
                    <option>Equipment</option>
                    <option>Crew</option>
                    <option>Vehicles</option>
                  </select>
                  <input type="date" className="gf-date-input" />
                </div>
              </div>
              <div className="gf-events-list">
                {demoEvents.map(event => {
                  const config = getEventTypeConfig(event.event_type);
                  const Icon = config.icon;
                  return (
                    <div key={event.id} className="gf-event-row">
                      <div className={`gf-event-badge ${config.color}`}>
                        <Icon size={16} />
                        {config.label}
                      </div>
                      <div className="gf-event-details">
                        <div className="gf-event-entity-name">{event.entity_identifier}</div>
                        <div className="gf-event-entity-type">{event.entity_type}</div>
                      </div>
                      <div className="gf-event-zone-info">
                        <MapPin size={14} />
                        {event.geofence_name}
                      </div>
                      {event.speed_mph && (
                        <div className="gf-event-speed-value">
                          <Gauge size={14} />
                          {event.speed_mph} mph
                        </div>
                      )}
                      <div className="gf-event-timestamp">
                        {new Date(event.created_at).toLocaleTimeString()}
                        <span className="gf-event-date">
                          {new Date(event.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="gf-alerts-section">
              <div className="gf-alerts-header">
                <h3>
                  <Bell size={18} />
                  Alert Configuration
                </h3>
                <button className="gf-btn gf-btn-primary">
                  <Plus size={16} />
                  New Alert Rule
                </button>
              </div>
              <div className="gf-alert-rules">
                <div className="gf-alert-rule">
                  <div className="gf-rule-toggle">
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="gf-rule-content">
                    <div className="gf-rule-header">
                      <h4>Speed Violation Alerts</h4>
                      <span className="gf-rule-type critical">Critical</span>
                    </div>
                    <p>Alert when any equipment exceeds posted speed limit in speed zones</p>
                    <div className="gf-rule-meta">
                      <span><Bell size={12} /> Email + SMS</span>
                      <span><MapPin size={12} /> All Speed Zones</span>
                      <span><Users size={12} /> 3 Recipients</span>
                    </div>
                  </div>
                  <div className="gf-rule-actions">
                    <button className="gf-action-btn"><Edit2 size={14} /></button>
                    <button className="gf-action-btn danger"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="gf-alert-rule">
                  <div className="gf-rule-toggle">
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="gf-rule-content">
                    <div className="gf-rule-header">
                      <h4>Restricted Zone Entry</h4>
                      <span className="gf-rule-type warning">Warning</span>
                    </div>
                    <p>Alert when unauthorized personnel enter restricted zones</p>
                    <div className="gf-rule-meta">
                      <span><Bell size={12} /> Email</span>
                      <span><MapPin size={12} /> Restricted Zones</span>
                      <span><Users size={12} /> 5 Recipients</span>
                    </div>
                  </div>
                  <div className="gf-rule-actions">
                    <button className="gf-action-btn"><Edit2 size={14} /></button>
                    <button className="gf-action-btn danger"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="gf-alert-rule">
                  <div className="gf-rule-toggle">
                    <input type="checkbox" />
                  </div>
                  <div className="gf-rule-content">
                    <div className="gf-rule-header">
                      <h4>Extended Dwell Time</h4>
                      <span className="gf-rule-type info">Info</span>
                    </div>
                    <p>Alert when equipment remains in staging area beyond threshold</p>
                    <div className="gf-rule-meta">
                      <span><Bell size={12} /> Email</span>
                      <span><MapPin size={12} /> Staging Areas</span>
                      <span><Timer size={12} /> 30 min threshold</span>
                    </div>
                  </div>
                  <div className="gf-rule-actions">
                    <button className="gf-action-btn"><Edit2 size={14} /></button>
                    <button className="gf-action-btn danger"><Trash2 size={14} /></button>
                  </div>
                </div>

                <div className="gf-alert-rule">
                  <div className="gf-rule-toggle">
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="gf-rule-content">
                    <div className="gf-rule-header">
                      <h4>After-Hours Activity</h4>
                      <span className="gf-rule-type warning">Warning</span>
                    </div>
                    <p>Alert when equipment movement detected outside work hours (6PM-6AM)</p>
                    <div className="gf-rule-meta">
                      <span><Bell size={12} /> SMS</span>
                      <span><MapPin size={12} /> All Zones</span>
                      <span><Clock size={12} /> 6PM - 6AM</span>
                    </div>
                  </div>
                  <div className="gf-rule-actions">
                    <button className="gf-action-btn"><Edit2 size={14} /></button>
                    <button className="gf-action-btn danger"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <div className="gf-analytics-section">
              <div className="gf-analytics-grid">
                {/* Event Distribution */}
                <div className="gf-analytics-card">
                  <h3>
                    <PieChart size={18} />
                    Event Distribution (7 Days)
                  </h3>
                  <div className="gf-event-distribution">
                    <div className="gf-distribution-chart">
                      <svg width="180" height="180" viewBox="0 0 180 180">
                        <circle cx="90" cy="90" r="70" fill="none" stroke="#10b981" strokeWidth="25"
                          strokeDasharray="274.9 439.8" strokeDashoffset="0" transform="rotate(-90 90 90)" />
                        <circle cx="90" cy="90" r="70" fill="none" stroke="#f59e0b" strokeWidth="25"
                          strokeDasharray="153.9 439.8" strokeDashoffset="-274.9" transform="rotate(-90 90 90)" />
                        <circle cx="90" cy="90" r="70" fill="none" stroke="#ef4444" strokeWidth="25"
                          strokeDasharray="11 439.8" strokeDashoffset="-428.8" transform="rotate(-90 90 90)" />
                        <text x="90" y="85" textAnchor="middle" className="gf-dist-value">843</text>
                        <text x="90" y="105" textAnchor="middle" className="gf-dist-label">Total</text>
                      </svg>
                    </div>
                    <div className="gf-distribution-legend">
                      <div className="gf-dist-item">
                        <span className="gf-dist-color" style={{ background: '#10b981' }} />
                        <span className="gf-dist-name">Entry Events</span>
                        <span className="gf-dist-count">528</span>
                        <span className="gf-dist-pct">62.6%</span>
                      </div>
                      <div className="gf-dist-item">
                        <span className="gf-dist-color" style={{ background: '#f59e0b' }} />
                        <span className="gf-dist-name">Exit Events</span>
                        <span className="gf-dist-count">295</span>
                        <span className="gf-dist-pct">35%</span>
                      </div>
                      <div className="gf-dist-item">
                        <span className="gf-dist-color" style={{ background: '#ef4444' }} />
                        <span className="gf-dist-name">Violations</span>
                        <span className="gf-dist-count">20</span>
                        <span className="gf-dist-pct">2.4%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Zone Utilization */}
                <div className="gf-analytics-card">
                  <h3>
                    <Target size={18} />
                    Zone Utilization
                  </h3>
                  <div className="gf-zone-utilization">
                    {[
                      { name: 'Bridge Work Zone', utilization: 92, events: 245 },
                      { name: 'Main Site', utilization: 78, events: 312 },
                      { name: 'Staging Area', utilization: 65, events: 156 },
                      { name: 'Haul Road', utilization: 88, events: 89 },
                      { name: 'Equipment Yard', utilization: 45, events: 41 }
                    ].map((zone, idx) => (
                      <div key={idx} className="gf-utilization-row">
                        <div className="gf-util-name">{zone.name}</div>
                        <div className="gf-util-bar-container">
                          <div
                            className="gf-util-bar"
                            style={{
                              width: `${zone.utilization}%`,
                              background: zone.utilization > 80 ? '#10b981' : zone.utilization > 50 ? '#3b82f6' : '#f59e0b'
                            }}
                          />
                        </div>
                        <div className="gf-util-stats">
                          <span className="gf-util-pct">{zone.utilization}%</span>
                          <span className="gf-util-events">{zone.events} events</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Speed Compliance */}
                <div className="gf-analytics-card full">
                  <h3>
                    <Gauge size={18} />
                    Speed Compliance by Zone (This Week)
                  </h3>
                  <div className="gf-speed-compliance">
                    {[
                      { zone: 'Haul Road (25 mph)', compliant: 156, violations: 12, avgSpeed: 22 },
                      { zone: 'Work Zone (15 mph)', compliant: 89, violations: 3, avgSpeed: 12 },
                      { zone: 'Staging (10 mph)', compliant: 67, violations: 5, avgSpeed: 8 },
                      { zone: 'Office (5 mph)', compliant: 45, violations: 0, avgSpeed: 4 }
                    ].map((zone, idx) => (
                      <div key={idx} className="gf-compliance-row">
                        <div className="gf-comp-zone">{zone.zone}</div>
                        <div className="gf-comp-bar-container">
                          <div className="gf-comp-bar-bg">
                            <div
                              className="gf-comp-bar compliant"
                              style={{ width: `${(zone.compliant / (zone.compliant + zone.violations)) * 100}%` }}
                            />
                            <div
                              className="gf-comp-bar violations"
                              style={{ width: `${(zone.violations / (zone.compliant + zone.violations)) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div className="gf-comp-stats">
                          <span className="gf-comp-compliant">
                            <CheckCircle size={12} />
                            {zone.compliant}
                          </span>
                          <span className="gf-comp-violations">
                            <XCircle size={12} />
                            {zone.violations}
                          </span>
                          <span className="gf-comp-avg">
                            Avg: {zone.avgSpeed} mph
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Side Panel - Geofence Detail */}
        {selectedGeofence && (
          <div className="gf-side-panel">
            <div className="gf-detail-panel">
              <div className="gf-detail-header">
                <div className="gf-detail-title">
                  <span className={`gf-detail-type ${getZoneTypeColor(selectedGeofence.zone_type)}`}>
                    {selectedGeofence.zone_type.replace('_', ' ')}
                  </span>
                  <h3>{selectedGeofence.name}</h3>
                </div>
                <button className="gf-detail-close" onClick={() => setSelectedGeofence(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="gf-detail-body">
                {selectedGeofence.description && (
                  <p className="gf-detail-desc">{selectedGeofence.description}</p>
                )}

                <div className="gf-detail-meta">
                  <div className="gf-meta-item">
                    <span className="gf-meta-label">Status</span>
                    <span className={`gf-status-badge ${selectedGeofence.is_active ? 'active' : 'inactive'}`}>
                      {selectedGeofence.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="gf-meta-item">
                    <span className="gf-meta-label">Project</span>
                    <span className="gf-meta-value">{selectedGeofence.project_name || 'No Project'}</span>
                  </div>
                  <div className="gf-meta-item">
                    <span className="gf-meta-label">Geometry</span>
                    <span className="gf-meta-value">{selectedGeofence.geometry_type}</span>
                  </div>
                  {selectedGeofence.speed_limit_mph && (
                    <div className="gf-meta-item">
                      <span className="gf-meta-label">Speed Limit</span>
                      <span className="gf-meta-value">{selectedGeofence.speed_limit_mph} mph</span>
                    </div>
                  )}
                </div>

                <div className="gf-detail-section">
                  <h4>Alert Configuration</h4>
                  <div className="gf-alert-config">
                    <div className={`gf-config-item ${selectedGeofence.alert_on_entry ? 'enabled' : ''}`}>
                      <Navigation size={14} />
                      Entry Alerts
                    </div>
                    <div className={`gf-config-item ${selectedGeofence.alert_on_exit ? 'enabled' : ''}`}>
                      <Navigation size={14} style={{ transform: 'rotate(180deg)' }} />
                      Exit Alerts
                    </div>
                    <div className={`gf-config-item ${selectedGeofence.alert_on_speeding ? 'enabled' : ''}`}>
                      <Gauge size={14} />
                      Speeding Alerts
                    </div>
                    {selectedGeofence.dwell_time_threshold_minutes && (
                      <div className="gf-config-item enabled">
                        <Timer size={14} />
                        Dwell: {selectedGeofence.dwell_time_threshold_minutes}m
                      </div>
                    )}
                  </div>
                </div>

                <div className="gf-detail-section">
                  <h4>Current Assets</h4>
                  <div className="gf-assets-summary">
                    <div className="gf-asset-box">
                      <Truck size={20} />
                      <span className="gf-asset-num">{selectedGeofence.equipment_count || 0}</span>
                      <span className="gf-asset-label">Equipment</span>
                    </div>
                    <div className="gf-asset-box">
                      <Users size={20} />
                      <span className="gf-asset-num">{selectedGeofence.crew_count || 0}</span>
                      <span className="gf-asset-label">Crew</span>
                    </div>
                  </div>
                </div>

                <div className="gf-detail-section">
                  <h4>Location</h4>
                  <div className="gf-location-info">
                    <span>Lat: {selectedGeofence.center_lat.toFixed(4)}°</span>
                    <span>Lng: {selectedGeofence.center_lng.toFixed(4)}°</span>
                    {selectedGeofence.radius_meters && (
                      <span>Radius: {selectedGeofence.radius_meters}m</span>
                    )}
                  </div>
                </div>

                <div className="gf-detail-actions">
                  <button className="gf-btn gf-btn-secondary">
                    <Eye size={14} />
                    View on Map
                  </button>
                  <button className="gf-btn gf-btn-primary">
                    <Edit2 size={14} />
                    Edit Zone
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Geofence Modal */}
      {showNewModal && (
        <div className="gf-modal-overlay" onClick={() => setShowNewModal(false)}>
          <div className="gf-modal" onClick={e => e.stopPropagation()}>
            <div className="gf-modal-header">
              <h2>
                <MapPin size={20} />
                Create New Geofence
              </h2>
              <button className="gf-modal-close" onClick={() => setShowNewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="gf-modal-body">
              <form className="gf-form">
                <div className="gf-form-row">
                  <div className="gf-form-group">
                    <label>Zone Name <span>*</span></label>
                    <input type="text" placeholder="Enter zone name" />
                  </div>
                  <div className="gf-form-group">
                    <label>Zone Type <span>*</span></label>
                    <select>
                      <option value="">Select type</option>
                      <option value="PROJECT_BOUNDARY">Project Boundary</option>
                      <option value="WORK_ZONE">Work Zone</option>
                      <option value="RESTRICTED">Restricted Area</option>
                      <option value="STAGING">Staging Area</option>
                      <option value="LAYDOWN">Laydown Yard</option>
                      <option value="OFFICE">Office/Compound</option>
                      <option value="SPEED_ZONE">Speed Zone</option>
                    </select>
                  </div>
                </div>

                <div className="gf-form-group full">
                  <label>Description</label>
                  <textarea placeholder="Describe this geofence zone..." rows={3} />
                </div>

                <div className="gf-form-row">
                  <div className="gf-form-group">
                    <label>Project</label>
                    <select>
                      <option value="">No Project</option>
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="gf-form-group">
                    <label>Geometry Type</label>
                    <select>
                      <option value="POLYGON">Polygon</option>
                      <option value="CIRCLE">Circle</option>
                      <option value="RECTANGLE">Rectangle</option>
                    </select>
                  </div>
                </div>

                <div className="gf-form-row">
                  <div className="gf-form-group">
                    <label>Speed Limit (mph)</label>
                    <input type="number" placeholder="Optional" />
                  </div>
                  <div className="gf-form-group">
                    <label>Dwell Threshold (min)</label>
                    <input type="number" placeholder="Optional" />
                  </div>
                </div>

                <div className="gf-form-group full">
                  <label>Alert Configuration</label>
                  <div className="gf-checkbox-group">
                    <label className="gf-checkbox">
                      <input type="checkbox" />
                      <span>Alert on Entry</span>
                    </label>
                    <label className="gf-checkbox">
                      <input type="checkbox" />
                      <span>Alert on Exit</span>
                    </label>
                    <label className="gf-checkbox">
                      <input type="checkbox" />
                      <span>Alert on Speeding</span>
                    </label>
                  </div>
                </div>

                <div className="gf-form-group full">
                  <label>Draw Zone on Map</label>
                  <div className="gf-map-draw-placeholder">
                    <Map size={32} />
                    <p>Click to open map editor and draw zone boundary</p>
                  </div>
                </div>
              </form>
            </div>
            <div className="gf-modal-footer">
              <button className="gf-btn gf-btn-secondary" onClick={() => setShowNewModal(false)}>
                Cancel
              </button>
              <button className="gf-btn gf-btn-primary">
                <Plus size={16} />
                Create Geofence
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedGeofenceManagement;
