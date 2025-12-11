import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@triton/supabase-client';
import { useAuth } from '../../hooks/useAuth';
import {
  Bell,
  X,
  Check,
  CheckCheck,
  FileText,
  Clock,
  AlertTriangle,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import './NotificationBell.css';

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  icon: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  action_url: string | null;
  action_label: string | null;
  bid_project_id: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

interface NotificationCount {
  unread_count: number;
  urgent_count: number;
  high_priority_count: number;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  bell: <Bell size={16} />,
  calendar: <Calendar size={16} />,
  'calendar-warning': <Clock size={16} />,
  'calendar-urgent': <AlertTriangle size={16} />,
  file: <FileText size={16} />,
  alert: <AlertTriangle size={16} />,
};

const PRIORITY_CLASSES: Record<string, string> = {
  low: 'priority-low',
  normal: 'priority-normal',
  high: 'priority-high',
  urgent: 'priority-urgent',
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [counts, setCounts] = useState<NotificationCount>({ unread_count: 0, urgent_count: 0, high_priority_count: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notification counts
  // Note: Using 'as any' because the notification tables from migration 102 aren't in generated types yet
  const fetchCounts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await (supabase as any)
        .from('v_user_unread_notification_count')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is fine
        console.error('Error fetching notification counts:', error);
        return;
      }

      setCounts({
        unread_count: data?.unread_count || 0,
        urgent_count: data?.urgent_count || 0,
        high_priority_count: data?.high_priority_count || 0,
      });
    } catch (err) {
      console.error('Error fetching notification counts:', err);
    }
  }, [user?.id]);

  // Fetch recent notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setNotifications((data || []) as InAppNotification[]);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Mark a single notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('in_app_notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setCounts(prev => ({
        ...prev,
        unread_count: Math.max(0, prev.unread_count - 1),
      }));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await (supabase as any).rpc('mark_notifications_read', {
        p_user_id: user.id,
        p_notification_ids: null,
      });

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setCounts({ unread_count: 0, urgent_count: 0, high_priority_count: 0 });
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  };

  // Dismiss a notification
  const dismissNotification = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      const { error } = await (supabase as any)
        .from('in_app_notifications')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      const dismissed = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (dismissed && !dismissed.is_read) {
        setCounts(prev => ({
          ...prev,
          unread_count: Math.max(0, prev.unread_count - 1),
        }));
      }
    } catch (err) {
      console.error('Error dismissing notification:', err);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: InAppNotification) => {
    // Mark as read if not already
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    // Navigate to action URL if present
    if (notification.action_url) {
      setIsOpen(false);
      navigate(notification.action_url);
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchCounts();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts]);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Add new notification to the list
          setNotifications(prev => [payload.new as InAppNotification, ...prev.slice(0, 9)]);
          setCounts(prev => ({
            ...prev,
            unread_count: prev.unread_count + 1,
          }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const hasUrgent = counts.urgent_count > 0;
  const hasHigh = counts.high_priority_count > 0;

  return (
    <div className="notification-bell-container" ref={dropdownRef}>
      <button
        className={`notification-bell-button ${hasUrgent ? 'has-urgent' : hasHigh ? 'has-high' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Notifications${counts.unread_count > 0 ? ` (${counts.unread_count} unread)` : ''}`}
      >
        <Bell size={20} strokeWidth={1.5} />
        {counts.unread_count > 0 && (
          <span className={`notification-badge ${hasUrgent ? 'urgent' : hasHigh ? 'high' : ''}`}>
            {counts.unread_count > 99 ? '99+' : counts.unread_count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {counts.unread_count > 0 && (
              <button
                className="mark-all-read-btn"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <CheckCheck size={16} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="notification-list">
            {isLoading ? (
              <div className="notification-loading">
                <div className="spinner" />
                <span>Loading...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell size={32} strokeWidth={1} />
                <p>No notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${notification.is_read ? 'read' : 'unread'} ${PRIORITY_CLASSES[notification.priority]}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {ICON_MAP[notification.icon] || <Bell size={16} />}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-meta">
                      <span className="notification-time">
                        {formatRelativeTime(notification.created_at)}
                      </span>
                      {notification.action_url && (
                        <span className="notification-action">
                          {notification.action_label || 'View'} <ChevronRight size={12} />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="notification-actions">
                    {!notification.is_read && (
                      <button
                        className="notification-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        title="Mark as read"
                      >
                        <Check size={14} />
                      </button>
                    )}
                    <button
                      className="notification-action-btn dismiss"
                      onClick={(e) => dismissNotification(notification.id, e)}
                      title="Dismiss"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {notifications.length > 0 && (
            <div className="notification-footer">
              <button
                className="view-all-btn"
                onClick={() => {
                  setIsOpen(false);
                  navigate('/alerts?tab=notifications');
                }}
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
