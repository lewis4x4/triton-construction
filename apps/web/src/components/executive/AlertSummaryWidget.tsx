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

  const severityConfig: Record<AlertSeverity, { icon: typeof XCircle; color: string; bgColor: string; borderColor: string }> = {
    CRITICAL: { icon: XCircle, color: 'text-white', bgColor: 'bg-red-500/20', borderColor: 'border-red-500/50' },
    HIGH: { icon: AlertTriangle, color: 'text-orange-200', bgColor: 'bg-orange-500/20', borderColor: 'border-orange-500/50' },
    MEDIUM: { icon: AlertCircle, color: 'text-yellow-200', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/50' },
    LOW: { icon: Info, color: 'text-blue-200', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/50' },
    INFO: { icon: Bell, color: 'text-gray-300', bgColor: 'bg-white/10', borderColor: 'border-white/10' },
  };

  if (compact) {
    return (
      <div className="gravity-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-neon-cyan" />
            <span className="font-bold text-xs uppercase tracking-wider text-secondary">Alerts</span>
          </div>
          {isLoading ? (
            <RefreshCw className="w-3 h-3 text-gray-500 animate-spin" />
          ) : summary.total > 0 ? (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30 rounded-full font-mono">
              {summary.total}
            </span>
          ) : null}
        </div>

        {isLoading ? (
          <div className="text-xs text-gray-500 font-mono">Syncing...</div>
        ) : summary.total === 0 ? (
          <div className="text-xs text-gray-500 font-mono">System Nominal</div>
        ) : (
          <div className="space-y-2">
            {summary.bySeverity.CRITICAL > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-400 font-medium">Critical</span>
                <span className="font-bold text-red-500 font-mono">{summary.bySeverity.CRITICAL}</span>
              </div>
            )}
            {summary.bySeverity.HIGH > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-400 font-medium">High</span>
                <span className="font-bold text-orange-500 font-mono">{summary.bySeverity.HIGH}</span>
              </div>
            )}
            {(summary.bySeverity.MEDIUM + summary.bySeverity.LOW) > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400 font-medium">Other</span>
                <span className="font-medium text-gray-300 font-mono">
                  {summary.bySeverity.MEDIUM + summary.bySeverity.LOW}
                </span>
              </div>
            )}
            {onViewAll && (
              <button
                onClick={onViewAll}
                className="w-full mt-3 pt-2 border-t border-white/5 text-[10px] uppercase tracking-widest text-neon-cyan/80 hover:text-neon-cyan flex items-center justify-center gap-1 transition-colors"
              >
                View Log <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="gravity-card h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-neon-cyan/10 border border-neon-cyan/20">
            <Bell className="w-4 h-4 text-neon-cyan" />
          </div>
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest">System Alerts</h3>
        </div>
        <button
          onClick={() => fetchSummary()}
          disabled={isLoading}
          className="p-1.5 rounded hover:bg-white/5 text-gray-500 hover:text-white transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 gap-2">
            <RefreshCw className="w-6 h-6 animate-spin opacity-50" />
            <span className="text-xs font-mono">Accessing Logs...</span>
          </div>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="text-2xl font-bold font-mono text-white">{summary.total}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 mt-1">Active</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="text-2xl font-bold font-mono text-red-500">{summary.bySeverity.CRITICAL}</div>
                <div className="text-[10px] uppercase tracking-wider text-red-400/70 mt-1">Critical</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <div className="text-2xl font-bold font-mono text-orange-500">{summary.overdue}</div>
                <div className="text-[10px] uppercase tracking-wider text-orange-400/70 mt-1">Overdue</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-2xl font-bold font-mono text-blue-400">{summary.newToday}</div>
                <div className="text-[10px] uppercase tracking-wider text-blue-400/70 mt-1">New Today</div>
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="space-y-3 mb-6 flex-1">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                Severity Distribution
              </div>
              <div className="flex gap-2 flex-wrap">
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as AlertSeverity[]).map(severity => {
                  const count = summary.bySeverity[severity];
                  const config = severityConfig[severity];
                  if (count === 0) return null;
                  return (
                    <div
                      key={severity}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${config.bgColor} ${config.borderColor}`}
                    >
                      <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                      <span className={`text-xs font-bold font-mono ${config.color}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Alerts */}
            {recentAlerts.length > 0 && (
              <div className="space-y-3">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest pl-1">
                  Recent Activity
                </div>
                <div className="space-y-2">
                  {recentAlerts.slice(0, 3).map(alert => {
                    const config = severityConfig[alert.severity as AlertSeverity];
                    return (
                      <div
                        key={alert.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all cursor-pointer group"
                      >
                        <div className={`p-1.5 rounded ${config.bgColor} ${config.borderColor} border`}>
                          <config.icon className={`w-3.5 h-3.5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-gray-200 truncate group-hover:text-neon-cyan transition-colors">
                            {alert.title}
                          </div>
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                            {new Date(alert.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-white transition-colors" />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View All */}
            {onViewAll && (
              <button
                onClick={onViewAll}
                className="w-full mt-6 py-2.5 text-xs font-bold uppercase tracking-widest text-neon-cyan border border-neon-cyan/20 hover:bg-neon-cyan/10 rounded-lg flex items-center justify-center gap-2 transition-all"
              >
                Full Alert Log <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AlertSummaryWidget;
