/**
 * Offline Storage Service
 * Uses IndexedDB to store WV811 ticket data for offline "Can I Dig?" functionality
 */

const DB_NAME = 'triton_wv811_offline';
const DB_VERSION = 1;

// Store names
const STORES = {
  TICKETS: 'tickets',
  UTILITIES: 'utilities',
  PROJECTS: 'projects',
  HOLIDAYS: 'holidays',
  SYNC_META: 'syncMeta',
  PENDING_ACTIONS: 'pendingActions',
} as const;

export interface OfflineTicket {
  id: string;
  ticketNumber: string;
  status: string;
  digSiteAddress: string;
  digSiteCity: string;
  digSiteCounty: string;
  latitude: number | null;
  longitude: number | null;
  legalDigDate: string;
  expiresAt: string;
  workType: string;
  workDescription: string | null;
  canDig: boolean;
  canDigReason: string;
  riskLevel: 'CLEAR' | 'CAUTION' | 'WARNING' | 'STOP';
  projectIds: string[];
}

export interface OfflineUtility {
  id: string;
  ticketId: string;
  utilityName: string;
  utilityCode: string;
  utilityType: string | null;
  responseStatus: string;
  responseWindowClosesAt: string | null;
  verifiedOnSite: boolean;
  verifiedAt: string | null;
  hasConflict: boolean;
  conflictReason: string | null;
}

export interface OfflineProject {
  id: string;
  name: string;
  projectNumber: string;
}

export interface OfflineHoliday {
  date: string;
  name: string;
}

export interface SyncMeta {
  key: string;
  lastSyncAt: string;
  dataVersion: number;
  expiresAt: string;
  ticketCount: number;
  userId: string;
}

export interface PendingAction {
  id: string;
  type: 'VERIFICATION' | 'CONFLICT' | 'ACKNOWLEDGEMENT' | 'PHOTO';
  ticketId: string;
  utilityId?: string;
  data: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

class OfflineStorageService {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB open error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Tickets store
        if (!db.objectStoreNames.contains(STORES.TICKETS)) {
          const ticketStore = db.createObjectStore(STORES.TICKETS, { keyPath: 'id' });
          ticketStore.createIndex('ticketNumber', 'ticketNumber', { unique: true });
          ticketStore.createIndex('status', 'status', { unique: false });
          ticketStore.createIndex('riskLevel', 'riskLevel', { unique: false });
        }

        // Utilities store
        if (!db.objectStoreNames.contains(STORES.UTILITIES)) {
          const utilityStore = db.createObjectStore(STORES.UTILITIES, { keyPath: 'id' });
          utilityStore.createIndex('ticketId', 'ticketId', { unique: false });
        }

        // Projects store
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        }

        // Holidays store
        if (!db.objectStoreNames.contains(STORES.HOLIDAYS)) {
          db.createObjectStore(STORES.HOLIDAYS, { keyPath: 'date' });
        }

        // Sync metadata store
        if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
          db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' });
        }

        // Pending actions store (for offline queue)
        if (!db.objectStoreNames.contains(STORES.PENDING_ACTIONS)) {
          const actionsStore = db.createObjectStore(STORES.PENDING_ACTIONS, { keyPath: 'id' });
          actionsStore.createIndex('type', 'type', { unique: false });
          actionsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // ============ SYNC OPERATIONS ============

  async saveOfflineData(data: {
    tickets: Array<OfflineTicket & { utilities: OfflineUtility[] }>;
    projects: OfflineProject[];
    holidays: OfflineHoliday[];
    generatedAt: string;
    expiresAt: string;
    dataVersion: number;
    userId: string;
  }): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(
      [STORES.TICKETS, STORES.UTILITIES, STORES.PROJECTS, STORES.HOLIDAYS, STORES.SYNC_META],
      'readwrite'
    );

    // Clear existing data
    await Promise.all([
      this.clearStore(transaction.objectStore(STORES.TICKETS)),
      this.clearStore(transaction.objectStore(STORES.UTILITIES)),
      this.clearStore(transaction.objectStore(STORES.PROJECTS)),
      this.clearStore(transaction.objectStore(STORES.HOLIDAYS)),
    ]);

    // Save tickets and utilities
    const ticketStore = transaction.objectStore(STORES.TICKETS);
    const utilityStore = transaction.objectStore(STORES.UTILITIES);

    for (const ticket of data.tickets) {
      const { utilities, ...ticketData } = ticket;
      ticketStore.put(ticketData);

      for (const utility of utilities) {
        utilityStore.put({ ...utility, ticketId: ticket.id });
      }
    }

    // Save projects
    const projectStore = transaction.objectStore(STORES.PROJECTS);
    for (const project of data.projects) {
      projectStore.put(project);
    }

    // Save holidays
    const holidayStore = transaction.objectStore(STORES.HOLIDAYS);
    for (const holiday of data.holidays) {
      holidayStore.put(holiday);
    }

    // Save sync metadata
    const metaStore = transaction.objectStore(STORES.SYNC_META);
    metaStore.put({
      key: 'lastSync',
      lastSyncAt: data.generatedAt,
      expiresAt: data.expiresAt,
      dataVersion: data.dataVersion,
      ticketCount: data.tickets.length,
      userId: data.userId,
    } as SyncMeta);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private clearStore(store: IDBObjectStore): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============ READ OPERATIONS ============

  async getSyncMeta(): Promise<SyncMeta | null> {
    const store = await this.getStore(STORES.SYNC_META);
    return new Promise((resolve, reject) => {
      const request = store.get('lastSync');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async isDataFresh(): Promise<boolean> {
    const meta = await this.getSyncMeta();
    if (!meta) return false;

    const expiresAt = new Date(meta.expiresAt);
    return expiresAt > new Date();
  }

  async getAllTickets(): Promise<OfflineTicket[]> {
    const store = await this.getStore(STORES.TICKETS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getTicketById(id: string): Promise<OfflineTicket | null> {
    const store = await this.getStore(STORES.TICKETS);
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getTicketByNumber(ticketNumber: string): Promise<OfflineTicket | null> {
    const store = await this.getStore(STORES.TICKETS);
    const index = store.index('ticketNumber');
    return new Promise((resolve, reject) => {
      const request = index.get(ticketNumber);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getTicketsByRiskLevel(riskLevel: OfflineTicket['riskLevel']): Promise<OfflineTicket[]> {
    const store = await this.getStore(STORES.TICKETS);
    const index = store.index('riskLevel');
    return new Promise((resolve, reject) => {
      const request = index.getAll(riskLevel);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getUtilitiesForTicket(ticketId: string): Promise<OfflineUtility[]> {
    const store = await this.getStore(STORES.UTILITIES);
    const index = store.index('ticketId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(ticketId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllProjects(): Promise<OfflineProject[]> {
    const store = await this.getStore(STORES.PROJECTS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getHolidays(): Promise<OfflineHoliday[]> {
    const store = await this.getStore(STORES.HOLIDAYS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ LOCATION-BASED QUERIES ============

  async findNearestTickets(
    lat: number,
    lng: number,
    radiusMeters: number = 500
  ): Promise<Array<OfflineTicket & { distance: number }>> {
    const tickets = await this.getAllTickets();

    const ticketsWithDistance = tickets
      .filter((t) => t.latitude !== null && t.longitude !== null)
      .map((ticket) => ({
        ...ticket,
        distance: this.calculateDistance(lat, lng, ticket.latitude!, ticket.longitude!),
      }))
      .filter((t) => t.distance <= radiusMeters)
      .sort((a, b) => a.distance - b.distance);

    return ticketsWithDistance;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // ============ PENDING ACTIONS (OFFLINE QUEUE) ============

  async addPendingAction(action: Omit<PendingAction, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const store = await this.getStore(STORES.PENDING_ACTIONS, 'readwrite');
    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullAction: PendingAction = {
      ...action,
      id,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(fullAction);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingActions(): Promise<PendingAction[]> {
    const store = await this.getStore(STORES.PENDING_ACTIONS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async removePendingAction(id: string): Promise<void> {
    const store = await this.getStore(STORES.PENDING_ACTIONS, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async incrementRetryCount(id: string): Promise<void> {
    const store = await this.getStore(STORES.PENDING_ACTIONS, 'readwrite');
    const action = await new Promise<PendingAction | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (action) {
      action.retryCount++;
      await new Promise<void>((resolve, reject) => {
        const request = store.put(action);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // ============ STATS ============

  async getOfflineStats(): Promise<{
    totalTickets: number;
    clearToDig: number;
    needsAttention: number;
    doNotDig: number;
    lastSyncAt: string | null;
    isExpired: boolean;
    pendingActions: number;
  }> {
    const [tickets, meta, pendingActions] = await Promise.all([
      this.getAllTickets(),
      this.getSyncMeta(),
      this.getPendingActions(),
    ]);

    const isExpired = !meta || new Date(meta.expiresAt) < new Date();

    return {
      totalTickets: tickets.length,
      clearToDig: tickets.filter((t) => t.riskLevel === 'CLEAR').length,
      needsAttention: tickets.filter((t) => t.riskLevel === 'CAUTION' || t.riskLevel === 'WARNING').length,
      doNotDig: tickets.filter((t) => t.riskLevel === 'STOP').length,
      lastSyncAt: meta?.lastSyncAt || null,
      isExpired,
      pendingActions: pendingActions.length,
    };
  }

  // ============ CLEANUP ============

  async clearAllData(): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const storeNames = Object.values(STORES);
    const transaction = this.db.transaction(storeNames, 'readwrite');

    await Promise.all(storeNames.map((name) => this.clearStore(transaction.objectStore(name))));
  }
}

// Export singleton instance
export const offlineStorage = new OfflineStorageService();
