import { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  XCircle,
  AlertCircle,
  Info,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import type { Database } from '../../types/database';

type AlertSeverity = Database['public']['Enums']['platform_alert_severity'];
type AlertCategory = Database['public']['Enums']['platform_alert_category'];

interface AlertSummary {
  total: number;
  bySeverity: Record<AlertSeverity, number>;
  byCategory: Record<AlertCategory, number>;
  overdue: number;
  newToday: number;
}

interface AlertSummaryWidgetProps {
  projectId?: string;
  compact?: boolean;
  onViewAll?: () => void;
}

export function AlertSummaryWidget({
  projectId,
  compact = false,
  onViewAll,
}: AlertSummaryWidgetProps) {
  const [summary, setSummary] = useState<AlertSummary>({
    total: 0,
    bySeverity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
    byCategory: { SAFETY: 0, COMPLIANCE: 0, MAINTENANCE: 0, OPERATIONAL: 0, FINANCIAL: 0, ADMINISTRATIVE: 0 },
    overdue: 0,
    newToday: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, [projectId]);

  const fetchSummary = async () => {
    try {
      setIsLoading(true);

      let query = supabase
        .from('platform_alerts')
        .select('id, severity, category, status, due_date, created_at, title')
        .in('status', ['ACTIVE', 'ACKNOWLEDGED', 'SNOOZED']);

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: alerts } = await query.order('created_at', { ascending: false });

      const alertList = alerts || [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Calculate summary
      const bySeverity: Record<AlertSeverity, number> = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
        INFO: 0,
      };

      const byCategory: Record<AlertCategory, number> = {
        SAFETY: 0,
        COMPLIANCE: 0,
        MAINTENANCE: 0,
        OPERATIONAL: 0,
        FINANCIAL: 0,
        ADMINISTRATIVE: 0,
      };

      let overdue = 0;
      let newToday = 0;

      alertList.forEach(alert => {
        bySeverity[alert.severity as AlertSeverity]++;
        byCategory[alert.category as AlertCategory]++;

        if (alert.due_date && new Date(alert.due_date) < new Date()) {
          overdue++;
        }

        if (alert.created_at && new Date(alert.created_at) >= today) {
          newToday++;
        }
      });

      setSummary({
        total: alertList.length,
        bySeverity,
        byCategory,
        overdue,
        newToday,
      });

      setRecentAlerts(alertList.slice(0, 5));
    } catch (err) {
      console.error('Error fetching alert summary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const severityConfig: Record<AlertSeverity, { icon: typeof XCircle; color: string; bgColor: string }> = {
    CRITICAL: { icon: XCircle, color: 'text-red-700', bgColor: 'bg-red-100' },
    HIGH: { icon: AlertTriangle, color: 'text-orange-700', bgColor: 'bg-orange-100' },
    MEDIUM: { icon: AlertCircle, color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
    LOW: { icon: Info, color: 'text-blue-700', bgColor: 'bg-blue-100' },
    INFO: { icon: Bell, color: 'text-gray-700', bgColor: 'bg-gray-100' },
  };

  if (compact) {
    return (
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-900">Alerts</span>
          </div>
          {isLoading ? (
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin" />
          ) : summary.total > 0 ? (
            <span className="px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700 rounded-full">
              {summary.total}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="text-sm text-gray-400">Loading...</div>
        ) : summary.total === 0 ? (
          <div className="text-sm text-gray-500">No active alerts</div>
        ) : (
          <div className="space-y-2">
            {summary.bySeverity.CRITICAL > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-red-700">Critical</span>
                <span className="font-bold text-red-700">{summary.bySeverity.CRITICAL}</span>
              </div>
            )}
            {summary.bySeverity.HIGH > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-orange-700">High</span>
                <span className="font-bold text-orange-700">{summary.bySeverity.HIGH}</span>
              </div>
            )}
            {(summary.bySeverity.MEDIUM + summary.bySeverity.LOW) > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Other</span>
                <span className="font-medium text-gray-700">
                  {summary.bySeverity.MEDIUM + summary.bySeverity.LOW}
                </span>
              </div>
            )}
            {onViewAll && (
              <button
                onClick={onViewAll}
                className="w-full mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Alert Summary</h3>
        </div>
        <button
          onClick={() => fetchSummary()}
          disabled={isLoading}
          className="p-1.5 rounded hover:bg-gray-100"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="text-center py-8 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading alerts...
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.bySeverity.CRITICAL}</div>
                <div className="text-xs text-gray-500">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.overdue}</div>
                <div className="text-xs text-gray-500">Overdue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.newToday}</div>
                <div className="text-xs text-gray-500">New Today</div>
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="space-y-2 mb-6">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                By Severity
              </div>
              <div className="flex gap-2">
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as AlertSeverity[]).map(severity => {
                  const count = summary.bySeverity[severity];
                  const config = severityConfig[severity];
                  if (count === 0) return null;
                  return (
                    <div
                      key={severity}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded ${config.bgColor}`}
                    >
                      <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                      <span className={`text-sm font-medium ${config.color}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Alerts */}
            {recentAlerts.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Recent Alerts
                </div>
                <div className="space-y-2">
                  {recentAlerts.slice(0, 3).map(alert => {
                    const config = severityConfig[alert.severity as AlertSeverity];
                    return (
                      <div
                        key={alert.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                      >
                        <div className={`p-1.5 rounded ${config.bgColor}`}>
                          <config.icon className={`w-4 h-4 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {alert.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(alert.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View All Link */}
            {onViewAll && (
              <button
                onClick={onViewAll}
                className="w-full mt-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-1"
              >
                View All Alerts <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AlertSummaryWidget;
