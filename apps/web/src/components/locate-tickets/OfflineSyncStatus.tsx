import { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Upload,
  Download,
  Wifi,
  WifiOff,
  Database,
  Trash2,
} from 'lucide-react';
import { offlineStorage, PendingAction } from '../../services/offlineStorage';
import { supabase } from '@triton/supabase-client';
import './OfflineSyncStatus.css';

interface OfflineSyncStatusProps {
  projectIds?: string[];
  onSyncComplete?: () => void;
  compact?: boolean;
}

interface SyncStats {
  totalTickets: number;
  clearToDig: number;
  needsAttention: number;
  doNotDig: number;
  lastSyncAt: string | null;
  isExpired: boolean;
  pendingActions: number;
}

export function OfflineSyncStatus({
  projectIds,
  onSyncComplete,
  compact = false,
}: OfflineSyncStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_showDetails, _setShowDetails] = useState(false);
  // _showDetails and _setShowDetails reserved for future expanded details panel
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load stats on mount and periodically
  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && stats?.pendingActions && stats.pendingActions > 0) {
      uploadPendingActions();
    }
  }, [isOnline]);

  const loadStats = async () => {
    try {
      const offlineStats = await offlineStorage.getOfflineStats();
      setStats(offlineStats);

      const actions = await offlineStorage.getPendingActions();
      setPendingActions(actions);
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const syncData = useCallback(async () => {
    if (!isOnline) {
      setError('No internet connection. Connect to sync.');
      return;
    }

    setIsSyncing(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('wv811-offline-sync', {
        body: { userId: userData.user.id, projectIds: projectIds || [] },
      });

      if (response.error) throw response.error;

      await offlineStorage.saveOfflineData(response.data);
      await loadStats();
      onSyncComplete?.();
    } catch (err) {
      console.error('Sync error:', err);
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, projectIds, onSyncComplete]);

  const uploadPendingActions = async () => {
    if (!isOnline || pendingActions.length === 0) return;

    setIsUploading(true);

    for (const action of pendingActions) {
      try {
        // Process each action type
        switch (action.type) {
          case 'VERIFICATION':
            if (action.utilityId) {
              await supabase.from('wv811_utility_responses').update(action.data).eq('id', action.utilityId);
            }
            break;
          case 'CONFLICT':
            if (action.utilityId) {
              await supabase.from('wv811_utility_responses').update(action.data).eq('id', action.utilityId);
            }
            break;
          case 'ACKNOWLEDGEMENT':
            if (action.data?.alertId) {
              await supabase.from('wv811_alert_acknowledgements').update(action.data).eq('id', action.data.alertId as string);
            }
            break;
          case 'PHOTO':
            // Handle photo uploads
            break;
        }

        // Remove successful action
        await offlineStorage.removePendingAction(action.id);
      } catch (err) {
        console.error(`Failed to upload action ${action.id}:`, err);
        await offlineStorage.incrementRetryCount(action.id);
      }
    }

    await loadStats();
    setIsUploading(false);
  };

  const clearOfflineData = async () => {
    if (confirm('Are you sure you want to clear all offline data? You will need to sync again.')) {
      await offlineStorage.clearAllData();
      await loadStats();
    }
  };

  const getTimeAgo = (date: string | null): string => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getSyncStatusColor = (): string => {
    if (!stats || !stats.lastSyncAt) return 'none';
    if (stats.isExpired) return 'expired';

    const hoursSince = (Date.now() - new Date(stats.lastSyncAt).getTime()) / (1000 * 60 * 60);
    if (hoursSince < 2) return 'fresh';
    if (hoursSince < 12) return 'recent';
    return 'stale';
  };

  if (compact) {
    return (
      <div className={`sync-status-compact ${getSyncStatusColor()}`} onClick={() => _setShowDetails(true)}>
        {isOnline ? <Cloud size={16} /> : <CloudOff size={16} />}
        <span>{getTimeAgo(stats?.lastSyncAt || null)}</span>
        {(stats?.pendingActions ?? 0) > 0 && (
          <span className="pending-badge">{stats?.pendingActions}</span>
        )}
      </div>
    );
  }

  return (
    <div className="offline-sync-container">
      {/* Connection Status */}
      <div className={`connection-bar ${isOnline ? 'online' : 'offline'}`}>
        {isOnline ? (
          <>
            <Wifi size={16} />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff size={16} />
            <span>Offline - Using cached data</span>
          </>
        )}
      </div>

      {/* Sync Status Card */}
      <div className={`sync-card ${getSyncStatusColor()}`}>
        <div className="sync-header">
          <div className="sync-icon">
            <Database size={24} />
          </div>
          <div className="sync-info">
            <h3>Offline Data</h3>
            <p className="sync-time">
              {stats?.lastSyncAt
                ? `Last synced ${getTimeAgo(stats.lastSyncAt)}`
                : 'No data synced yet'}
            </p>
          </div>
          <div className="sync-status-badge">
            {!stats?.lastSyncAt && <span className="badge none">No Data</span>}
            {stats?.lastSyncAt && !stats.isExpired && (
              <span className="badge fresh">
                <CheckCircle size={12} /> Fresh
              </span>
            )}
            {stats?.isExpired && (
              <span className="badge expired">
                <AlertTriangle size={12} /> Stale
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && stats.totalTickets > 0 && (
          <div className="sync-stats">
            <div className="stat-item">
              <span className="stat-value">{stats.totalTickets}</span>
              <span className="stat-label">Tickets</span>
            </div>
            <div className="stat-item clear">
              <span className="stat-value">{stats.clearToDig}</span>
              <span className="stat-label">Clear</span>
            </div>
            <div className="stat-item caution">
              <span className="stat-value">{stats.needsAttention}</span>
              <span className="stat-label">Caution</span>
            </div>
            <div className="stat-item stop">
              <span className="stat-value">{stats.doNotDig}</span>
              <span className="stat-label">Stop</span>
            </div>
          </div>
        )}

        {/* Pending Actions */}
        {pendingActions.length > 0 && (
          <div className="pending-actions">
            <div className="pending-header">
              <Upload size={16} />
              <span>{pendingActions.length} pending action{pendingActions.length > 1 ? 's' : ''}</span>
            </div>
            {isOnline && (
              <button
                className="upload-btn"
                onClick={uploadPendingActions}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={14} className="spin" /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={14} /> Upload Now
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="sync-error">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="sync-actions">
          <button
            className="sync-btn primary"
            onClick={syncData}
            disabled={!isOnline || isSyncing}
          >
            {isSyncing ? (
              <>
                <RefreshCw size={18} className="spin" />
                Syncing...
              </>
            ) : (
              <>
                <Download size={18} />
                Sync Now
              </>
            )}
          </button>

          {stats && stats.totalTickets > 0 && (
            <button className="sync-btn secondary" onClick={clearOfflineData}>
              <Trash2 size={16} />
              Clear Data
            </button>
          )}
        </div>

        {/* Last sync info */}
        {stats?.lastSyncAt && (
          <div className="sync-footer">
            <Clock size={12} />
            <span>
              Data valid until{' '}
              {new Date(new Date(stats.lastSyncAt).getTime() + 24 * 60 * 60 * 1000).toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Sync Schedule Info */}
      <div className="sync-schedule">
        <p>
          <strong>Auto-sync:</strong> Data is automatically downloaded at 5:00 AM each morning.
          Manual sync available when online.
        </p>
      </div>
    </div>
  );
}

// Hook for components that just need sync status
export function useSyncStatus() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const loadStats = async () => {
      const offlineStats = await offlineStorage.getOfflineStats();
      setStats(offlineStats);
    };

    loadStats();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isFresh: stats && !stats.isExpired,
    ticketCount: stats?.totalTickets || 0,
    pendingActions: stats?.pendingActions || 0,
    lastSyncAt: stats?.lastSyncAt || null,
  };
}
