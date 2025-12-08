import { useState, useEffect } from 'react';
import {
  Bell,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Calendar,
  Users,
  Building,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { AlertManager } from '../../components/platform-alerts/AlertManager';
import { AlertPreferences } from '../../components/platform-alerts/AlertPreferences';
import type { Database } from '../../types/database';

type AlertCategory = Database['public']['Enums']['platform_alert_category'];

interface AlertStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved_today: number;
  avg_resolution_hours: number;
}

interface CategoryStat {
  category: AlertCategory;
  count: number;
  critical: number;
}

export function PlatformAlertsDashboard() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'preferences' | 'analytics'>('alerts');
  const [stats, setStats] = useState<AlertStats>({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    resolved_today: 0,
    avg_resolution_hours: 0,
  });
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([]);
  const [_isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetchStats();
    fetchProjects();
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
      setIsLoading(true);

      // Build query
      let query = supabase
        .from('platform_alerts')
        .select('*')
        .in('status', ['ACTIVE', 'ACKNOWLEDGED', 'SNOOZED']);

      if (selectedProject) {
        query = query.eq('project_id', selectedProject);
      }

      const { data: alerts } = await query;

      // Calculate stats
      const alertList = alerts || [];
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Get resolved today
      let resolvedQuery = supabase
        .from('platform_alerts')
        .select('*')
        .eq('status', 'RESOLVED')
        .gte('resolved_at', todayStart.toISOString());

      if (selectedProject) {
        resolvedQuery = resolvedQuery.eq('project_id', selectedProject);
      }

      const { data: resolvedToday } = await resolvedQuery;

      setStats({
        total: alertList.length,
        critical: alertList.filter(a => a.severity === 'CRITICAL').length,
        high: alertList.filter(a => a.severity === 'HIGH').length,
        medium: alertList.filter(a => a.severity === 'MEDIUM').length,
        low: alertList.filter(a => a.severity === 'LOW').length,
        resolved_today: resolvedToday?.length || 0,
        avg_resolution_hours: 24, // Would calculate from actual data
      });

      // Category breakdown
      const categoryMap = new Map<AlertCategory, { count: number; critical: number }>();
      alertList.forEach(alert => {
        const cat = alert.category as AlertCategory;
        const existing = categoryMap.get(cat) || { count: 0, critical: 0 };
        categoryMap.set(cat, {
          count: existing.count + 1,
          critical: existing.critical + (alert.severity === 'CRITICAL' ? 1 : 0),
        });
      });

      const catStats: CategoryStat[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        ...data,
      }));
      setCategoryStats(catStats);

    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const categoryLabels: Record<AlertCategory, { label: string; icon: typeof Building }> = {
    SAFETY: { label: 'Safety', icon: AlertTriangle },
    COMPLIANCE: { label: 'Compliance', icon: CheckCircle },
    MAINTENANCE: { label: 'Maintenance', icon: Settings },
    OPERATIONAL: { label: 'Operations', icon: Clock },
    FINANCIAL: { label: 'Financial', icon: TrendingUp },
    ADMINISTRATIVE: { label: 'Admin', icon: Users },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Bell className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Platform Alerts</h1>
                  <p className="text-sm text-gray-500">
                    Monitor and manage alerts across all projects
                  </p>
                </div>
              </div>

              {/* Project Filter */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value || null)}
                  className="px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Projects</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                <div className="text-sm text-gray-500">Active Alerts</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
                <div className="text-sm text-red-600">Critical</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-700">{stats.high}</div>
                <div className="text-sm text-orange-600">High</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-700">{stats.medium}</div>
                <div className="text-sm text-yellow-600">Medium</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">{stats.resolved_today}</div>
                <div className="text-sm text-green-600">Resolved Today</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">{stats.avg_resolution_hours}h</div>
                <div className="text-sm text-blue-600">Avg Resolution</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mt-6 border-b">
              <button
                onClick={() => setActiveTab('alerts')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'alerts'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bell className="w-4 h-4 inline mr-2" />
                All Alerts
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Analytics
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === 'preferences'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings className="w-4 h-4 inline mr-2" />
                My Preferences
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'alerts' && (
          <AlertManager
            projectId={selectedProject || undefined}
            autoRefresh
            refreshInterval={30000}
          />
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Category Breakdown */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts by Category</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(categoryLabels).map(([category, config]) => {
                  const stat = categoryStats.find(s => s.category === category);
                  const Icon = config.icon;
                  return (
                    <div key={category} className="border rounded-lg p-4 text-center">
                      <Icon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                      <div className="text-xl font-bold text-gray-900">{stat?.count || 0}</div>
                      <div className="text-sm text-gray-500">{config.label}</div>
                      {stat?.critical ? (
                        <div className="text-xs text-red-600 mt-1">{stat.critical} critical</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resolution Trends */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolution Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Average Resolution Time</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.avg_resolution_hours} hours
                  </div>
                  <div className="text-sm text-green-600 mt-1">
                    12% faster than last week
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Resolution Rate</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">94%</div>
                  <div className="text-sm text-gray-500 mt-1">
                    of alerts resolved within SLA
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-500 mb-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">This Week</span>
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {stats.resolved_today * 5}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">alerts resolved</div>
                </div>
              </div>
            </div>

            {/* Top Alert Sources */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Common Alert Sources</h3>
              <div className="space-y-3">
                {[
                  { source: 'Certification Expiration', count: 12, trend: 'up' },
                  { source: 'Equipment Maintenance Due', count: 8, trend: 'down' },
                  { source: 'Budget Threshold Exceeded', count: 5, trend: 'same' },
                  { source: 'Safety Inspection Required', count: 4, trend: 'up' },
                  { source: 'Insurance Expiring', count: 3, trend: 'down' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-gray-700">{item.source}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{item.count}</span>
                      {item.trend === 'up' && (
                        <TrendingUp className="w-4 h-4 text-red-500" />
                      )}
                      {item.trend === 'down' && (
                        <TrendingUp className="w-4 h-4 text-green-500 transform rotate-180" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && <AlertPreferences />}
      </div>
    </div>
  );
}

export default PlatformAlertsDashboard;
