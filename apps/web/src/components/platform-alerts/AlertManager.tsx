import { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Filter,
  Search,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import { AlertCard } from './AlertCard';
import type { Database } from '../../types/database';

type PlatformAlert = Database['public']['Tables']['platform_alerts']['Row'];
type AlertSeverity = Database['public']['Enums']['platform_alert_severity'];
type AlertStatus = Database['public']['Enums']['platform_alert_status'];
type AlertCategory = Database['public']['Enums']['platform_alert_category'];

type AlertWithDetails = PlatformAlert & {
  assigned_to_name?: string;
  project_name?: string;
};

interface AlertManagerProps {
  projectId?: string;
  entityType?: string;
  entityId?: string;
  compact?: boolean;
  maxAlerts?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function AlertManager({
  projectId,
  entityType,
  entityId,
  compact = false,
  maxAlerts,
  autoRefresh = true,
  refreshInterval = 60000,
}: AlertManagerProps) {
  const [alerts, setAlerts] = useState<AlertWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<AlertStatus | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<AlertCategory | 'ALL'>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const fetchAlerts = useCallback(async () => {
    try {
      setError(null);
      let query = supabase
        .from('platform_alerts')
        .select(`
          *,
          user_profiles!platform_alerts_assigned_to_fkey(first_name, last_name),
          projects!platform_alerts_project_id_fkey(name, project_number)
        `)
        .order('priority_score', { ascending: false })
        .order('created_at', { ascending: false });

      // Apply filters
      if (projectId) {
        query = query.eq('project_id', projectId);
      }
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }
      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      } else {
        // Default: show active alerts
        query = query.in('status', ['ACTIVE', 'ACKNOWLEDGED', 'SNOOZED']);
      }
      if (severityFilter !== 'ALL') {
        query = query.eq('severity', severityFilter);
      }
      if (categoryFilter !== 'ALL') {
        query = query.eq('category', categoryFilter);
      }
      if (maxAlerts) {
        query = query.limit(maxAlerts);
      }

      const { data, error: queryError } = await query;

      if (queryError) throw queryError;

      const formattedAlerts: AlertWithDetails[] = (data || []).map((alert: any) => ({
        ...alert,
        assigned_to_name: alert.user_profiles
          ? `${alert.user_profiles.first_name} ${alert.user_profiles.last_name}`
          : undefined,
        project_name: alert.projects?.name,
      }));

      // Apply client-side search
      let filteredAlerts = formattedAlerts;
      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        filteredAlerts = formattedAlerts.filter(
          (a) =>
            a.title.toLowerCase().includes(lowerQuery) ||
            a.description?.toLowerCase().includes(lowerQuery) ||
            a.entity_identifier?.toLowerCase().includes(lowerQuery)
        );
      }

      setAlerts(filteredAlerts);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  }, [projectId, entityType, entityId, statusFilter, severityFilter, categoryFilter, searchQuery, maxAlerts]);

  useEffect(() => {
    fetchAlerts();

    if (autoRefresh) {
      const interval = setInterval(fetchAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchAlerts, autoRefresh, refreshInterval]);

  // Stats
  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && a.status === 'ACTIVE').length;
  const highCount = alerts.filter((a) => a.severity === 'HIGH' && a.status === 'ACTIVE').length;
  const overdueCount = alerts.filter((a) => {
    if (!a.due_date) return false;
    return new Date(a.due_date) < new Date() && a.status === 'ACTIVE';
  }).length;

  if (compact) {
    return (
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Alerts</span>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-600 rounded-full">
                {criticalCount}
              </span>
            )}
          </div>
          <button
            onClick={() => fetchAlerts()}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Alert list */}
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Loading...</div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No active alerts</div>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, maxAlerts || 5).map((alert) => (
              <AlertCard key={alert.id} alert={alert} onUpdate={fetchAlerts} compact />
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
            <Bell className="w-6 h-6 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Platform Alerts</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAlerts()}
              disabled={isLoading}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg">
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{criticalCount} Critical</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{highCount} High</span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{overdueCount} Overdue</span>
            </div>
          )}
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
              placeholder="Search alerts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AlertStatus | 'ALL')}
              className="px-3 py-1.5 text-sm border rounded-lg"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="SNOOZED">Snoozed</option>
              <option value="RESOLVED">Resolved</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as AlertSeverity | 'ALL')}
              className="px-3 py-1.5 text-sm border rounded-lg"
            >
              <option value="ALL">All Severity</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
              <option value="INFO">Info</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as AlertCategory | 'ALL')}
              className="px-3 py-1.5 text-sm border rounded-lg"
            >
              <option value="ALL">All Categories</option>
              <option value="SAFETY">Safety</option>
              <option value="COMPLIANCE">Compliance</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OPERATIONAL">Operations</option>
              <option value="FINANCIAL">Financial</option>
              <option value="ADMINISTRATIVE">Admin</option>
            </select>

            <button
              onClick={() => {
                setStatusFilter('ALL');
                setSeverityFilter('ALL');
                setCategoryFilter('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Alert List */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => fetchAlerts()}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No alerts to display</p>
            <p className="text-sm text-gray-500 mt-1">
              {statusFilter === 'ALL'
                ? 'All clear! No active alerts at this time.'
                : 'No alerts match the current filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onUpdate={fetchAlerts} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AlertManager;
