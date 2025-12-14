/**
 * Triton Construction AI - Service Worker
 * Enables PWA functionality with offline support and background sync
 */

const CACHE_NAME = 'triton-v2';
const OFFLINE_URL = '/offline.html';
const DB_NAME = 'triton_offline';
const SYNC_QUEUE_STORE = 'syncQueue';
const SYNC_META_STORE = 'syncMeta';

// Supabase configuration (will be injected by client registration)
let SUPABASE_URL = '';
let SUPABASE_ANON_KEY = '';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
];

// ============================================================================
// Install Event
// ============================================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching assets');
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// ============================================================================
// Activate Event
// ============================================================================

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ============================================================================
// Fetch Event - Network-first with cache fallback
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests (except Supabase which we handle specially)
  if (url.origin !== location.origin && !url.hostname.includes('supabase')) {
    return;
  }

  // Skip Supabase API calls - they should always go to network
  if (url.hostname.includes('supabase')) {
    return;
  }

  // For navigation requests, try network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // For other requests, use stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});

// ============================================================================
// Message Event - Communication with main thread
// ============================================================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'CONFIGURE_SUPABASE':
      SUPABASE_URL = payload.url;
      SUPABASE_ANON_KEY = payload.anonKey;
      console.log('[SW] Supabase configured');
      break;

    case 'TRIGGER_SYNC':
      event.waitUntil(performFullSync(payload));
      break;

    case 'GET_SYNC_STATUS':
      event.waitUntil(getSyncStatusAndReply(event.source));
      break;

    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
  }
});

// ============================================================================
// Background Sync Event
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  switch (event.tag) {
    case 'sync-all':
      event.waitUntil(performFullSync());
      break;
    case 'sync-time-entries':
      event.waitUntil(syncEntityType('time_entry'));
      break;
    case 'sync-daily-reports':
      event.waitUntil(syncEntityType('daily_report'));
      break;
    case 'sync-equipment-logs':
      event.waitUntil(syncEntityType('equipment_log'));
      break;
    case 'sync-emergency-reports':
      event.waitUntil(syncEntityType('daily_report', true));
      break;
  }
});

// ============================================================================
// Periodic Sync Event (if supported)
// ============================================================================

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-field-data') {
    console.log('[SW] Periodic sync triggered');
    event.waitUntil(performFullSync());
  }
});

// ============================================================================
// Push Notification Handlers
// ============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
      syncRequired: data.syncRequired || false,
    },
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Triton', options)
  );

  // If notification indicates sync is required, trigger it
  if (data.syncRequired) {
    event.waitUntil(performFullSync());
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// ============================================================================
// IndexedDB Helpers
// ============================================================================

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      // DB is being upgraded in main app, just open it
    };
  });
}

async function getPendingSyncItems() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readonly');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      const request = store.getAll();
      request.onsuccess = () => {
        // Filter to only pending items, sort by creation time
        const pending = (request.result || [])
          .filter((item) => item.status === 'pending')
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        resolve(pending);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Error getting pending sync items:', error);
    return [];
  }
}

async function updateSyncItemStatus(offlineId, status, serverId = null, error = null) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      const index = store.index('by-offline-id');
      const request = index.get(offlineId);

      request.onsuccess = () => {
        const item = request.result;
        if (item) {
          item.status = status;
          item.syncedAt = status === 'synced' ? new Date().toISOString() : null;
          item.serverId = serverId;
          item.error = error;
          item.retryCount = (item.retryCount || 0) + (status === 'failed' ? 1 : 0);
          store.put(item);
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Error updating sync item status:', error);
  }
}

async function removeSyncedItems(offlineIds) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_QUEUE_STORE, 'readwrite');
      const store = tx.objectStore(SYNC_QUEUE_STORE);
      const index = store.index('by-offline-id');

      for (const offlineId of offlineIds) {
        const request = index.getKey(offlineId);
        request.onsuccess = () => {
          if (request.result) {
            store.delete(request.result);
          }
        };
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[SW] Error removing synced items:', error);
  }
}

async function getSyncMeta() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SYNC_META_STORE, 'readonly');
      const store = tx.objectStore(SYNC_META_STORE);
      const request = store.get('syncInfo');
      request.onsuccess = () => resolve(request.result || {});
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Error getting sync meta:', error);
    return {};
  }
}

// ============================================================================
// Sync Operations
// ============================================================================

async function performFullSync(options = {}) {
  console.log('[SW] Starting full sync...');

  try {
    const syncMeta = await getSyncMeta();
    const { userId, deviceId, organizationId, accessToken } = syncMeta;

    if (!userId || !deviceId || !SUPABASE_URL) {
      console.log('[SW] Sync skipped - missing configuration');
      return { success: false, reason: 'missing_config' };
    }

    // Step 1: Upload pending changes
    const uploadResult = await uploadPendingChanges(syncMeta);

    // Step 2: Notify clients of sync status
    await notifyClients({
      type: 'SYNC_COMPLETE',
      payload: {
        uploaded: uploadResult,
        timestamp: new Date().toISOString(),
      },
    });

    console.log('[SW] Full sync complete:', uploadResult);
    return { success: true, ...uploadResult };
  } catch (error) {
    console.error('[SW] Full sync error:', error);
    await notifyClients({
      type: 'SYNC_ERROR',
      payload: {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
    });
    return { success: false, error: error.message };
  }
}

async function uploadPendingChanges(syncMeta) {
  const pendingItems = await getPendingSyncItems();

  if (pendingItems.length === 0) {
    console.log('[SW] No pending items to sync');
    return { itemsProcessed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`[SW] Uploading ${pendingItems.length} pending items...`);

  const { userId, deviceId, organizationId, accessToken } = syncMeta;

  // Transform items for the API
  const items = pendingItems.map((item) => ({
    id: item.id,
    operationType: item.operationType,
    entityType: item.entityType,
    offlineId: item.offlineId,
    payload: item.payload,
    createdAt: item.createdAt,
    retryCount: item.retryCount || 0,
  }));

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/batch-sync-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        userId,
        deviceId,
        organizationId,
        items,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Process results
    const syncedIds = [];
    for (const itemResult of result.results || []) {
      if (itemResult.success) {
        syncedIds.push(itemResult.offlineId);
        await updateSyncItemStatus(itemResult.offlineId, 'synced', itemResult.serverId);
      } else {
        await updateSyncItemStatus(
          itemResult.offlineId,
          itemResult.conflictData ? 'conflict' : 'failed',
          itemResult.serverId,
          itemResult.error
        );
      }
    }

    // Remove successfully synced items
    if (syncedIds.length > 0) {
      await removeSyncedItems(syncedIds);
    }

    return {
      itemsProcessed: items.length,
      succeeded: result.stats?.succeeded || 0,
      failed: result.stats?.failed || 0,
      conflicts: result.stats?.conflicts || 0,
    };
  } catch (error) {
    console.error('[SW] Upload error:', error);

    // Mark all items as failed (they'll be retried)
    for (const item of pendingItems) {
      await updateSyncItemStatus(item.offlineId, 'failed', null, error.message);
    }

    throw error;
  }
}

async function syncEntityType(entityType, priority = false) {
  console.log(`[SW] Syncing ${entityType}${priority ? ' (priority)' : ''}...`);

  try {
    const pendingItems = await getPendingSyncItems();
    const filteredItems = pendingItems.filter((item) => item.entityType === entityType);

    if (filteredItems.length === 0) {
      console.log(`[SW] No pending ${entityType} items`);
      return { success: true, itemsProcessed: 0 };
    }

    const syncMeta = await getSyncMeta();
    const { userId, deviceId, organizationId, accessToken } = syncMeta;

    const items = filteredItems.map((item) => ({
      id: item.id,
      operationType: item.operationType,
      entityType: item.entityType,
      offlineId: item.offlineId,
      payload: item.payload,
      createdAt: item.createdAt,
      retryCount: item.retryCount || 0,
    }));

    const response = await fetch(`${SUPABASE_URL}/functions/v1/batch-sync-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        userId,
        deviceId,
        organizationId,
        items,
      }),
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }

    const result = await response.json();

    // Process results
    const syncedIds = [];
    for (const itemResult of result.results || []) {
      if (itemResult.success) {
        syncedIds.push(itemResult.offlineId);
      }
    }

    if (syncedIds.length > 0) {
      await removeSyncedItems(syncedIds);
    }

    return {
      success: true,
      itemsProcessed: items.length,
      succeeded: result.stats?.succeeded || 0,
      failed: result.stats?.failed || 0,
    };
  } catch (error) {
    console.error(`[SW] Error syncing ${entityType}:`, error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// Client Communication
// ============================================================================

async function notifyClients(message) {
  const allClients = await clients.matchAll({ type: 'window' });
  for (const client of allClients) {
    client.postMessage(message);
  }
}

async function getSyncStatusAndReply(client) {
  try {
    const pendingItems = await getPendingSyncItems();
    const syncMeta = await getSyncMeta();

    const status = {
      hasPendingChanges: pendingItems.length > 0,
      pendingCount: pendingItems.length,
      pendingByType: {},
      lastSyncAt: syncMeta.lastSyncAt || null,
      isOnline: navigator.onLine,
    };

    // Group by entity type
    for (const item of pendingItems) {
      status.pendingByType[item.entityType] = (status.pendingByType[item.entityType] || 0) + 1;
    }

    client.postMessage({
      type: 'SYNC_STATUS',
      payload: status,
    });
  } catch (error) {
    client.postMessage({
      type: 'SYNC_STATUS_ERROR',
      payload: { error: error.message },
    });
  }
}
