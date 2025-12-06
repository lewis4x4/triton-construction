import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  XCircle,
  Clock,
  CheckCircle,
  Bell,
  X,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@triton/supabase-client';
import './AlertAcknowledgement.css';

interface PendingAlert {
  id: string;
  alert_id: string;
  ticket_id: string;
  ticket_number: string;
  alert_type: string;
  message: string;
  priority: 'INFO' | 'WARNING' | 'CRITICAL';
  sent_at: string;
  ack_deadline: string;
  requires_explicit_ack: boolean;
  dig_site_address?: string;
  utility_name?: string;
}

interface AlertAcknowledgementProps {
  onAcknowledge?: (alertId: string) => void;
  onDismiss?: () => void;
}

export function AlertAcknowledgementBanner({ onAcknowledge, onDismiss }: AlertAcknowledgementProps) {
  const [pendingAlerts, setPendingAlerts] = useState<PendingAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PendingAlert | null>(null);

  useEffect(() => {
    fetchPendingAlerts();
    // Refresh every minute
    const interval = setInterval(fetchPendingAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingAlerts = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('wv811_alert_acknowledgements')
        .select(`
          id,
          alert_id,
          status,
          sent_at,
          ack_deadline,
          requires_explicit_ack,
          wv811_ticket_alerts!inner(
            ticket_id,
            alert_type,
            message,
            priority,
            wv811_tickets(ticket_number, dig_site_address)
          )
        `)
        .eq('user_id', userData.user.id)
        .eq('status', 'SENT')
        .eq('requires_explicit_ack', true)
        .order('ack_deadline', { ascending: true });

      if (error) throw error;

      const alerts: PendingAlert[] = (data || []).map((ack) => ({
        id: ack.id,
        alert_id: ack.alert_id,
        ticket_id: ack.wv811_ticket_alerts.ticket_id,
        ticket_number: ack.wv811_ticket_alerts.wv811_tickets?.ticket_number || '',
        alert_type: ack.wv811_ticket_alerts.alert_type,
        message: ack.wv811_ticket_alerts.message,
        priority: ack.wv811_ticket_alerts.priority,
        sent_at: ack.sent_at,
        ack_deadline: ack.ack_deadline,
        requires_explicit_ack: ack.requires_explicit_ack,
        dig_site_address: ack.wv811_ticket_alerts.wv811_tickets?.dig_site_address,
      }));

      setPendingAlerts(alerts);
    } catch (err) {
      console.error('Error fetching pending alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (alert: PendingAlert, action: string) => {
    try {
      await supabase
        .from('wv811_alert_acknowledgements')
        .update({
          status: 'ACKNOWLEDGED',
          acknowledged_at: new Date().toISOString(),
          acknowledged_action: action,
          acknowledged_via: 'WEB',
        })
        .eq('id', alert.id);

      setPendingAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      setShowModal(false);
      setSelectedAlert(null);
      onAcknowledge?.(alert.id);
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const openAckModal = (alert: PendingAlert) => {
    setSelectedAlert(alert);
    setShowModal(true);
  };

  if (isLoading || pendingAlerts.length === 0) return null;

  const criticalAlerts = pendingAlerts.filter((a) => a.priority === 'CRITICAL');
  const warningAlerts = pendingAlerts.filter((a) => a.priority === 'WARNING');

  return (
    <>
      {/* Banner */}
      <div className={`alert-ack-banner ${criticalAlerts.length > 0 ? 'critical' : 'warning'}`}>
        <div className="banner-icon">
          {criticalAlerts.length > 0 ? <XCircle size={24} /> : <AlertTriangle size={24} />}
        </div>
        <div className="banner-content">
          <div className="banner-title">
            {pendingAlerts.length} alert{pendingAlerts.length > 1 ? 's' : ''} require your acknowledgement
          </div>
          <div className="banner-subtitle">
            {criticalAlerts.length > 0
              ? 'Critical alerts must be acknowledged immediately'
              : 'Please review and acknowledge these alerts'}
          </div>
        </div>
        <button className="banner-action" onClick={() => openAckModal(pendingAlerts[0])}>
          Review Now
          <ChevronRight size={18} />
        </button>
        {onDismiss && (
          <button className="banner-dismiss" onClick={onDismiss}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Alert List */}
      {pendingAlerts.length > 1 && (
        <div className="alert-ack-list">
          {pendingAlerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onAcknowledge={() => openAckModal(alert)} />
          ))}
        </div>
      )}

      {/* Acknowledgement Modal */}
      {showModal && selectedAlert && (
        <AlertAcknowledgementModal
          alert={selectedAlert}
          onAcknowledge={handleAcknowledge}
          onClose={() => {
            setShowModal(false);
            setSelectedAlert(null);
          }}
        />
      )}
    </>
  );
}

function AlertCard({ alert, onAcknowledge }: { alert: PendingAlert; onAcknowledge: () => void }) {
  const timeRemaining = getTimeRemaining(alert.ack_deadline);
  const isOverdue = new Date(alert.ack_deadline) < new Date();

  return (
    <div className={`alert-card ${alert.priority.toLowerCase()} ${isOverdue ? 'overdue' : ''}`}>
      <div className="alert-card-icon">
        {alert.priority === 'CRITICAL' ? <XCircle size={20} /> : <AlertTriangle size={20} />}
      </div>
      <div className="alert-card-content">
        <div className="alert-card-header">
          <span className="alert-ticket">#{alert.ticket_number}</span>
          <span className={`alert-badge ${alert.priority.toLowerCase()}`}>{alert.priority}</span>
        </div>
        <div className="alert-card-message">{alert.message}</div>
        {alert.dig_site_address && (
          <div className="alert-card-location">{alert.dig_site_address}</div>
        )}
        <div className="alert-card-deadline">
          <Clock size={12} />
          {isOverdue ? (
            <span className="overdue">Acknowledgement overdue!</span>
          ) : (
            <span>Acknowledge within {timeRemaining}</span>
          )}
        </div>
      </div>
      <button className="alert-card-action" onClick={onAcknowledge}>
        Acknowledge
      </button>
    </div>
  );
}

interface AlertAcknowledgementModalProps {
  alert: PendingAlert;
  onAcknowledge: (alert: PendingAlert, action: string) => void;
  onClose: () => void;
}

function AlertAcknowledgementModal({ alert, onAcknowledge, onClose }: AlertAcknowledgementModalProps) {
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const timeRemaining = getTimeRemaining(alert.ack_deadline);
  const isOverdue = new Date(alert.ack_deadline) < new Date();

  const actions = getActionsForAlertType(alert.alert_type);

  const handleSubmit = async () => {
    if (!selectedAction) return;
    setIsSubmitting(true);
    await onAcknowledge(alert, selectedAction);
    setIsSubmitting(false);
  };

  return (
    <div className="alert-ack-modal-overlay">
      <div className={`alert-ack-modal ${alert.priority.toLowerCase()}`}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <div className={`modal-icon ${alert.priority.toLowerCase()}`}>
            {alert.priority === 'CRITICAL' ? <XCircle size={32} /> : <AlertTriangle size={32} />}
          </div>
          <div className={`modal-priority-badge ${alert.priority.toLowerCase()}`}>
            {alert.priority} ALERT
          </div>
        </div>

        <div className="modal-content">
          <div className="alert-details">
            <div className="alert-ticket-info">
              <Bell size={16} />
              <span>Ticket #{alert.ticket_number}</span>
            </div>

            <h2 className="alert-message">{alert.message}</h2>

            {alert.dig_site_address && (
              <p className="alert-location">{alert.dig_site_address}</p>
            )}

            <div className={`alert-deadline-box ${isOverdue ? 'overdue' : ''}`}>
              <Clock size={16} />
              {isOverdue ? (
                <span>
                  <strong>Acknowledgement overdue!</strong> Please respond immediately.
                </span>
              ) : (
                <span>
                  Please acknowledge within <strong>{timeRemaining}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="action-selection">
            <label className="action-label">What action will you take?</label>
            <div className="action-options">
              {actions.map((action) => (
                <button
                  key={action.value}
                  className={`action-option ${selectedAction === action.value ? 'selected' : ''}`}
                  onClick={() => setSelectedAction(action.value)}
                >
                  <span className="action-icon">{action.icon}</span>
                  <span className="action-text">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {alert.priority === 'CRITICAL' && (
            <div className="critical-warning">
              <AlertTriangle size={16} />
              <span>
                By acknowledging, you confirm you understand this is a critical safety alert and will
                take appropriate action.
              </span>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!selectedAction || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Acknowledge Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Floating notification indicator for mobile
export function AlertNotificationBadge({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null;

  return (
    <button className="alert-notification-badge" onClick={onClick}>
      <Bell size={20} />
      <span className="badge-count">{count}</span>
    </button>
  );
}

// Hook to get pending alert count
export function usePendingAlertCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { count: alertCount } = await supabase
        .from('wv811_alert_acknowledgements')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userData.user.id)
        .eq('status', 'SENT')
        .eq('requires_explicit_ack', true);

      setCount(alertCount || 0);
    };

    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return count;
}

function getTimeRemaining(deadline: string): string {
  const now = new Date();
  const end = new Date(deadline);
  const diffMs = end.getTime() - now.getTime();

  if (diffMs <= 0) return '0 min';

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;

  const diffHours = Math.floor(diffMins / 60);
  const remainingMins = diffMins % 60;
  return `${diffHours}h ${remainingMins}m`;
}

function getActionsForAlertType(alertType: string): { value: string; label: string; icon: string }[] {
  switch (alertType) {
    case 'OVERDUE':
    case '2_HOUR':
    case '2_HOUR_EXPIRATION':
      return [
        { value: 'STOP_WORK', label: 'Will stop work if not resolved', icon: '🛑' },
        { value: 'RENEWING', label: 'Renewing ticket now', icon: '🔄' },
        { value: 'ALREADY_RESOLVED', label: 'Already resolved', icon: '✅' },
      ];

    case 'CONFLICT':
      return [
        { value: 'STOP_WORK', label: 'Stopping all work immediately', icon: '🛑' },
        { value: 'EVACUATING', label: 'Evacuating area', icon: '🚨' },
        { value: 'CONTACTING_UTILITY', label: 'Contacting utility', icon: '📞' },
      ];

    case 'EMERGENCY':
    case 'DIG_UP':
      return [
        { value: 'ON_SCENE', label: 'On scene, securing area', icon: '🚧' },
        { value: 'CALLING_811', label: 'Calling 811 now', icon: '📞' },
        { value: 'EVACUATED', label: 'Area evacuated', icon: '🚨' },
      ];

    default:
      return [
        { value: 'UNDERSTOOD', label: 'Understood, will take action', icon: '👍' },
        { value: 'REVIEWING', label: 'Reviewing situation', icon: '🔍' },
        { value: 'NO_ACTION_NEEDED', label: 'No action needed', icon: '✅' },
      ];
  }
}
