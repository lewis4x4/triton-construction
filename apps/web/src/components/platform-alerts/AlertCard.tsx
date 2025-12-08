import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Bell,
  User,
  CheckCircle,
  XCircle,
  MoreVertical,
  ExternalLink,
  Calendar,
  Timer,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import type { Database } from '../../types/database';

type PlatformAlert = Database['public']['Tables']['platform_alerts']['Row'];
type AlertSeverity = Database['public']['Enums']['platform_alert_severity'];
type AlertStatus = Database['public']['Enums']['platform_alert_status'];
type AlertCategory = Database['public']['Enums']['platform_alert_category'];

interface AlertCardProps {
  alert: PlatformAlert & {
    assigned_to_name?: string;
    project_name?: string;
  };
  onUpdate?: () => void;
  compact?: boolean;
}

const severityConfig: Record<AlertSeverity, { color: string; bgColor: string; icon: typeof AlertTriangle }> = {
  CRITICAL: { color: 'text-red-700', bgColor: 'bg-red-50 border-red-200', icon: XCircle },
  HIGH: { color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200', icon: AlertTriangle },
  MEDIUM: { color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200', icon: AlertCircle },
  LOW: { color: 'text-blue-700', bgColor: 'bg-blue-50 border-blue-200', icon: Info },
  INFO: { color: 'text-gray-700', bgColor: 'bg-gray-50 border-gray-200', icon: Bell },
};

const categoryLabels: Record<AlertCategory, string> = {
  SAFETY: 'Safety',
  COMPLIANCE: 'Compliance',
  MAINTENANCE: 'Maintenance',
  OPERATIONAL: 'Operations',
  FINANCIAL: 'Financial',
  ADMINISTRATIVE: 'Admin',
};

export function AlertCard({ alert, onUpdate, compact = false }: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isActioning, setIsActioning] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [snoozeHours, setSnoozeHours] = useState(24);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const severity = alert.severity as AlertSeverity;
  const config = severityConfig[severity] || severityConfig.INFO;
  const Icon = config.icon;

  const daysUntilDue = alert.due_date
    ? Math.ceil((new Date(alert.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isDueToday = daysUntilDue === 0;
  const isDueSoon = daysUntilDue !== null && daysUntilDue > 0 && daysUntilDue <= 7;

  const handleAcknowledge = async () => {
    setIsActioning(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      await supabase
        .from('platform_alerts')
        .update({
          status: 'ACKNOWLEDGED' as AlertStatus,
          acknowledged_by: userData.user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alert.id);
      onUpdate?.();
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    } finally {
      setIsActioning(false);
    }
  };

  const handleResolve = async () => {
    setIsActioning(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      await supabase
        .from('platform_alerts')
        .update({
          status: 'RESOLVED' as AlertStatus,
          resolved_by: userData.user?.id,
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes || null,
        })
        .eq('id', alert.id);
      onUpdate?.();
    } catch (err) {
      console.error('Error resolving alert:', err);
    } finally {
      setIsActioning(false);
    }
  };

  const handleSnooze = async () => {
    setIsActioning(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const snoozedUntil = new Date(Date.now() + snoozeHours * 60 * 60 * 1000).toISOString();
      await supabase
        .from('platform_alerts')
        .update({
          status: 'SNOOZED' as AlertStatus,
          snoozed_until: snoozedUntil,
          snoozed_by: userData.user?.id,
          snooze_count: (alert.snooze_count || 0) + 1,
        })
        .eq('id', alert.id);
      setShowSnoozeModal(false);
      onUpdate?.();
    } catch (err) {
      console.error('Error snoozing alert:', err);
    } finally {
      setIsActioning(false);
    }
  };

  if (compact) {
    return (
      <div
        className={`p-3 rounded-lg border ${config.bgColor} cursor-pointer hover:shadow-sm transition-shadow`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          <Icon className={`w-5 h-5 ${config.color} flex-shrink-0 mt-0.5`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${config.color} bg-white`}>
                {severity}
              </span>
              <span className="text-xs text-gray-500">{categoryLabels[alert.category as AlertCategory]}</span>
            </div>
            <p className="text-sm font-medium text-gray-900 mt-1 truncate">{alert.title}</p>
            {daysUntilDue !== null && (
              <div className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` :
                 isDueToday ? 'Due today' :
                 `Due in ${daysUntilDue} days`}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${config.bgColor} overflow-hidden`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Icon className={`w-6 h-6 ${config.color} flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${config.color} bg-white border`}>
                {severity}
              </span>
              <span className="text-xs font-medium text-gray-600 bg-white px-2 py-0.5 rounded border">
                {categoryLabels[alert.category as AlertCategory]}
              </span>
              {alert.project_name && (
                <span className="text-xs text-gray-500">
                  {alert.project_name}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold text-gray-900 mt-2">{alert.title}</h3>
            {alert.description && (
              <p className="text-sm text-gray-600 mt-1">{alert.description}</p>
            )}
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-white/50"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
          {alert.entity_identifier && (
            <div className="flex items-center gap-1">
              <span className="font-medium">{alert.entity_type}:</span>
              {alert.entity_identifier}
            </div>
          )}
          {alert.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="w-3.5 h-3.5" />
              {isOverdue ? `${Math.abs(daysUntilDue!)} days overdue` :
               isDueToday ? 'Due today' :
               isDueSoon ? `Due in ${daysUntilDue} days` :
               `Due ${new Date(alert.due_date).toLocaleDateString()}`}
            </div>
          )}
          {alert.assigned_to_name && (
            <div className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {alert.assigned_to_name}
            </div>
          )}
        </div>

        {/* Action Required */}
        {alert.action_required && (
          <div className="mt-3 p-2 bg-white rounded border border-gray-200">
            <div className="text-xs font-medium text-gray-700 mb-1">Action Required:</div>
            <div className="text-sm text-gray-600">{alert.action_required}</div>
          </div>
        )}
      </div>

      {/* Expanded Actions */}
      {isExpanded && (
        <div className="border-t bg-white p-4">
          <div className="flex flex-wrap gap-2">
            {alert.status === 'ACTIVE' && (
              <>
                <button
                  onClick={handleAcknowledge}
                  disabled={isActioning}
                  className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Acknowledge
                </button>
                {(alert.snooze_count || 0) < (alert.max_snooze_count || 3) && (
                  <button
                    onClick={() => setShowSnoozeModal(true)}
                    disabled={isActioning}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                  >
                    <Timer className="w-4 h-4 inline mr-1" />
                    Snooze
                  </button>
                )}
              </>
            )}
            {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && (
              <button
                onClick={handleResolve}
                disabled={isActioning}
                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 inline mr-1" />
                Mark Resolved
              </button>
            )}
            {alert.action_url && (
              <a
                href={alert.action_url}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                View Details
              </a>
            )}
          </div>

          {/* Resolution Notes Input */}
          {(alert.status === 'ACTIVE' || alert.status === 'ACKNOWLEDGED') && (
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Resolution Notes (optional)
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Add notes about how this was resolved..."
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
              />
            </div>
          )}

          {/* Alert history */}
          <div className="mt-3 pt-3 border-t text-xs text-gray-500">
            <div>Created: {new Date(alert.created_at!).toLocaleString()}</div>
            {alert.acknowledged_at && (
              <div>Acknowledged: {new Date(alert.acknowledged_at).toLocaleString()}</div>
            )}
            {alert.snoozed_until && (
              <div>Snoozed until: {new Date(alert.snoozed_until).toLocaleString()}</div>
            )}
          </div>
        </div>
      )}

      {/* Snooze Modal */}
      {showSnoozeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Snooze Alert</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Snooze for:
              </label>
              <select
                value={snoozeHours}
                onChange={(e) => setSnoozeHours(Number(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={1}>1 hour</option>
                <option value={4}>4 hours</option>
                <option value={8}>8 hours</option>
                <option value={24}>1 day</option>
                <option value={72}>3 days</option>
                <option value={168}>1 week</option>
              </select>
            </div>
            <div className="text-xs text-gray-500 mb-4">
              Snoozes remaining: {(alert.max_snooze_count || 3) - (alert.snooze_count || 0)}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSnoozeModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSnooze}
                disabled={isActioning}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Snooze
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AlertCard;
