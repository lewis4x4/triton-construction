import { useState, useEffect, useCallback } from 'react';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Upload,
  Download,
  Wifi,
  WifiOff,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { offlineStorage } from '../../services/offlineStorage';
import { supabase } from '@triton/supabase-client';

interface OfflineIndicatorProps {
  variant?: 'full' | 'compact' | 'minimal';
  showPendingCount?: boolean;
  onSyncComplete?: () => void;
}

interface SyncStatus {
  isOnline: boolean;
  hasPendingChanges: boolean;
  pendingCount: number;
  pendingByType: Record<string, number>;
  lastSyncAt: string | null;
  isSyncing: boolean;
  isUploading: boolean;
  error: string | null;
}

export function OfflineIndicator({
  variant = 'compact',
  showPendingCount = true,
  onSyncComplete,
}: OfflineIndicatorProps) {
  const [status, setStatus] = useState<SyncStatus>({
    isOnline: navigator.onLine,
    hasPendingChanges: false,
    pendingCount: 0,
    pendingByType: {},
    lastSyncAt: null,
    isSyncing: false,
    isUploading: false,
    error: null,
  });
  const [expanded, setExpanded] = useState(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
      // Auto-upload pending changes when coming online
      uploadPendingChanges();
    };
    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load sync status
  useEffect(() => {
    loadSyncStatus();
    const interval = setInterval(loadSyncStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Listen for service worker messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};

      switch (type) {
        case 'SYNC_COMPLETE':
          setStatus((prev) => ({
            ...prev,
            isSyncing: false,
            isUploading: false,
            lastSyncAt: payload.timestamp,
          }));
          loadSyncStatus();
          onSyncComplete?.();
          break;
        case 'SYNC_ERROR':
          setStatus((prev) => ({
            ...prev,
            isSyncing: false,
            isUploading: false,
            error: payload.error,
          }));
          break;
        case 'SYNC_STATUS':
          setStatus((prev) => ({
            ...prev,
            hasPendingChanges: payload.hasPendingChanges,
            pendingCount: payload.pendingCount,
            pendingByType: payload.pendingByType,
            lastSyncAt: payload.lastSyncAt,
          }));
          break;
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [onSyncComplete]);

  const loadSyncStatus = async () => {
    try {
      const stats = await offlineStorage.getFullOfflineStats();
      const syncMeta = await offlineStorage.getSyncMeta();

      setStatus((prev) => ({
        ...prev,
        hasPendingChanges: stats.pendingSyncItems > 0,
        pendingCount: stats.pendingSyncItems,
        pendingByType: {
          time_entry: stats.timeEntries,
          daily_report: stats.dailyReports,
          equipment_log: stats.equipmentLogs,
        },
        lastSyncAt: syncMeta?.lastSyncAt || null,
      }));
    } catch (err) {
      console.error('Error loading sync status:', err);
    }
  };

  const syncData = useCallback(async () => {
    if (!status.isOnline) {
      setStatus((prev) => ({
        ...prev,
        error: 'No internet connection',
      }));
      return;
    }

    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      // Get user profile for organization
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile) throw new Error('User profile not found');

      // Get device ID
      let deviceId = localStorage.getItem('triton_device_id');
      if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem('triton_device_id', deviceId);
      }

      // Get last sync version
      const syncMeta = await offlineStorage.getSyncMeta();

      // Call batch sync download
      const response = await supabase.functions.invoke('batch-sync-download', {
        body: {
          userId: userData.user.id,
          deviceId,
          lastSyncVersion: syncMeta?.lastSyncVersion || 0,
        },
      });

      if (response.error) throw response.error;

      const data = response.data;

      // Save downloaded data to IndexedDB
      if (data.projects?.length > 0) {
        await offlineStorage.saveProjects(data.projects);
      }
      if (data.crewMembers?.length > 0) {
        await offlineStorage.saveCrewMembers(data.crewMembers);
      }
      if (data.costCodes?.length > 0) {
        await offlineStorage.saveCostCodes(data.costCodes);
      }
      if (data.equipment?.length > 0) {
        await offlineStorage.saveEquipment(data.equipment);
      }
      if (data.timeEntries?.length > 0) {
        for (const entry of data.timeEntries) {
          await offlineStorage.saveTimeEntry(entry);
        }
      }
      if (data.dailyReports?.length > 0) {
        for (const report of data.dailyReports) {
          await offlineStorage.saveDailyReport(report);
        }
      }

      // Update sync meta
      await offlineStorage.updateSyncMeta({
        lastSyncAt: new Date().toISOString(),
        lastSyncVersion: data.syncVersion,
        userId: userData.user.id,
        deviceId,
        organizationId: profile.organization_id,
      });

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
      }));

      await loadSyncStatus();
      onSyncComplete?.();
    } catch (err) {
      console.error('Sync error:', err);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: err instanceof Error ? err.message : 'Sync failed',
      }));
    }
  }, [status.isOnline, onSyncComplete]);

  const uploadPendingChanges = useCallback(async () => {
    if (!status.isOnline || status.pendingCount === 0) return;

    setStatus((prev) => ({ ...prev, isUploading: true, error: null }));

    try {
      // Trigger service worker sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'TRIGGER_SYNC',
        });
      } else {
        // Fallback: direct API call
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('id', userData.user.id)
          .single();

        const deviceId = localStorage.getItem('triton_device_id') || crypto.randomUUID();
        const pendingItems = await offlineStorage.getPendingSyncItems();

        if (pendingItems.length === 0) {
          setStatus((prev) => ({ ...prev, isUploading: false }));
          return;
        }

        const response = await supabase.functions.invoke('batch-sync-upload', {
          body: {
            userId: userData.user.id,
            deviceId,
            organizationId: profile?.organization_id,
            items: pendingItems.map((item) => ({
              operationType: item.operationType,
              entityType: item.entityType,
              offlineId: item.offlineId,
              payload: item.payload,
              createdAt: item.clientCreatedAt,
              retryCount: item.retryCount || 0,
            })),
          },
        });

        if (response.error) throw response.error;

        // Process results
        for (const result of response.data.results || []) {
          if (result.success) {
            await offlineStorage.removeSyncQueueItem(result.offlineId);
          }
        }

        await loadSyncStatus();
      }
    } catch (err) {
      console.error('Upload error:', err);
      setStatus((prev) => ({
        ...prev,
        isUploading: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      }));
    }
  }, [status.isOnline, status.pendingCount]);

  const getTimeAgo = (date: string | null): string => {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  // Minimal variant - just an icon
  if (variant === 'minimal') {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs cursor-pointer
          ${status.isOnline ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}
          ${status.hasPendingChanges ? 'ring-2 ring-amber-400' : ''}
        `}
        onClick={() => setExpanded(!expanded)}
        title={status.isOnline ? 'Online' : 'Offline'}
      >
        {status.isOnline ? <Cloud className="w-3.5 h-3.5" /> : <CloudOff className="w-3.5 h-3.5" />}
        {showPendingCount && status.pendingCount > 0 && (
          <span className="font-medium">{status.pendingCount}</span>
        )}
      </div>
    );
  }

  // Compact variant - small bar
  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors
            ${status.isOnline ? 'bg-gray-100 hover:bg-gray-200' : 'bg-amber-100 hover:bg-amber-200'}
            ${status.hasPendingChanges ? 'ring-2 ring-amber-400' : ''}
          `}
        >
          {status.isSyncing || status.isUploading ? (
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
          ) : status.isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-amber-600" />
          )}

          <span className="text-gray-700">
            {status.isSyncing
              ? 'Syncing...'
              : status.isUploading
                ? 'Uploading...'
                : status.isOnline
                  ? 'Online'
                  : 'Offline'}
          </span>

          {showPendingCount && status.pendingCount > 0 && (
            <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full">
              {status.pendingCount}
            </span>
          )}

          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {/* Expandable panel */}
        {expanded && (
          <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-4">
              {/* Status header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {status.isOnline ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  )}
                  <span className="font-medium text-gray-800">
                    {status.isOnline ? 'Connected' : 'Working Offline'}
                  </span>
                </div>
                <button onClick={() => setExpanded(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Last sync time */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Clock className="w-4 h-4" />
                <span>Last synced: {getTimeAgo(status.lastSyncAt)}</span>
              </div>

              {/* Pending changes */}
              {status.hasPendingChanges && (
                <div className="bg-amber-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-amber-800 mb-2">
                    <Upload className="w-4 h-4" />
                    <span className="font-medium">{status.pendingCount} pending changes</span>
                  </div>
                  <div className="text-xs text-amber-700 space-y-1">
                    {Object.entries(status.pendingByType).map(([type, count]) =>
                      count > 0 ? (
                        <div key={type}>
                          {count} {type.replace('_', ' ')}
                          {count > 1 ? 's' : ''}
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Error message */}
              {status.error && (
                <div className="bg-red-50 text-red-700 text-sm rounded-lg p-2 mb-3">
                  {status.error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={syncData}
                  disabled={!status.isOnline || status.isSyncing}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {status.isSyncing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {status.isSyncing ? 'Syncing...' : 'Sync'}
                </button>

                {status.hasPendingChanges && (
                  <button
                    onClick={uploadPendingChanges}
                    disabled={!status.isOnline || status.isUploading}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {status.isUploading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {status.isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full variant - complete panel
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {/* Connection status */}
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-4 ${
          status.isOnline ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}
      >
        {status.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
        <span className="font-medium">{status.isOnline ? 'Online' : 'Offline - Using cached data'}</span>
      </div>

      {/* Sync info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg">
          <Cloud className="w-6 h-6 text-gray-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-800">Field Data Sync</h3>
          <p className="text-sm text-gray-500">
            {status.lastSyncAt ? `Last synced ${getTimeAgo(status.lastSyncAt)}` : 'Not synced yet'}
          </p>
        </div>
        {status.isSyncing && <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />}
      </div>

      {/* Pending changes */}
      {status.hasPendingChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Upload className="w-4 h-4 text-amber-600" />
            <span className="font-medium text-amber-800">
              {status.pendingCount} unsaved change{status.pendingCount !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-sm text-amber-700 mb-2">
            These changes will be uploaded when you're back online.
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(status.pendingByType).map(([type, count]) =>
              count > 0 ? (
                <span
                  key={type}
                  className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-800 rounded text-xs"
                >
                  {count} {type.replace('_', ' ')}
                  {count > 1 ? 's' : ''}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {status.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{status.error}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={syncData}
          disabled={!status.isOnline || status.isSyncing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status.isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {status.isSyncing ? 'Syncing...' : 'Sync Now'}
        </button>

        {status.hasPendingChanges && (
          <button
            onClick={uploadPendingChanges}
            disabled={!status.isOnline || status.isUploading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status.isUploading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {status.isUploading ? 'Uploading...' : 'Upload Changes'}
          </button>
        )}
      </div>

      {/* Info footer */}
      <p className="text-xs text-gray-500 mt-4">
        Your work is saved locally and will sync automatically when you're back online.
      </p>
    </div>
  );
}

// Hook for components that need sync status
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const stats = await offlineStorage.getFullOfflineStats();
        const syncMeta = await offlineStorage.getSyncMeta();
        setPendingCount(stats.pendingSyncItems);
        setLastSyncAt(syncMeta?.lastSyncAt || null);
      } catch {
        // Ignore errors
      }
    };

    loadStatus();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, pendingCount, lastSyncAt, hasPendingChanges: pendingCount > 0 };
}
