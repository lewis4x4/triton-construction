/**
 * Offline Storage Service
 * Uses IndexedDB to store field data for offline-first operations
 *
 * Supports:
 * - WV811 tickets and utilities
 * - Time entries (create/edit offline)
 * - Daily reports (create/edit offline)
 * - Equipment logs (create offline)
 * - Reference data (projects, crew, cost codes)
 */

const DB_NAME = 'triton_offline';
const DB_VERSION = 2; // Bumped for new stores

// Store names
const STORES = {
  // WV811 (existing)
  TICKETS: 'tickets',
  UTILITIES: 'utilities',
  HOLIDAYS: 'holidays',

  // Reference data (read-only sync)
  PROJECTS: 'projects',
  CREW_MEMBERS: 'crewMembers',
  COST_CODES: 'costCodes',
  EQUIPMENT: 'equipment',

  // Field data (read/write with sync queue)
  TIME_ENTRIES: 'timeEntries',
  DAILY_REPORTS: 'dailyReports',
  DAILY_REPORT_ENTRIES: 'dailyReportEntries',
  EQUIPMENT_LOGS: 'equipmentLogs',

  // Sync management
  SYNC_META: 'syncMeta',
  SYNC_QUEUE: 'syncQueue',
  PENDING_ACTIONS: 'pendingActions', // Legacy, kept for compatibility
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
  lastSyncVersion: number;
  expiresAt: string;
  ticketCount: number;
  userId: string;
  deviceId?: string;
  organizationId?: string;
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

// ============ NEW INTERFACES FOR FIELD DATA ============

export interface OfflineCrewMember {
  id: string;
  displayName: string;
  firstName: string;
  lastName: string;
  tradeClassification: string | null;
  isActive: boolean;
}

export interface OfflineCostCode {
  id: string;
  code: string;
  name: string;
  category: string | null;
  division: string | null;
}

export interface OfflineEquipment {
  id: string;
  equipmentNumber: string;
  description: string;
  category: string | null;
  isActive: boolean;
}

export interface OfflineTimeEntry {
  id: string;
  offlineId: string; // Client-generated for deduplication
  crewMemberId: string;
  projectId: string;
  costCodeId: string | null;
  workDate: string;
  regularHours: number;
  overtimeHours: number;
  doubleTimeHours: number;
  workDescription: string | null;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  syncStatus: 'local' | 'synced' | 'pending_sync' | 'conflict';
  syncVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineDailyReport {
  id: string;
  offlineId: string;
  projectId: string;
  reportDate: string;
  reportNumber: string | null;
  weatherConditions: string | null;
  temperature: number | null;
  authorId: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  notes: string | null;
  syncStatus: 'local' | 'synced' | 'pending_sync' | 'conflict';
  syncVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineDailyReportEntry {
  id: string;
  offlineId: string;
  dailyReportId: string;
  entryType: 'WORK_PERFORMED' | 'DELAY' | 'VISITOR' | 'MATERIAL' | 'NOTE';
  description: string;
  costCodeId: string | null;
  quantity: number | null;
  unit: string | null;
  syncStatus: 'local' | 'synced' | 'pending_sync';
}

export interface OfflineEquipmentLog {
  id: string;
  offlineId: string;
  dailyReportId: string;
  equipmentId: string;
  operatorId: string | null;
  startHours: number | null;
  endHours: number | null;
  hoursUsed: number;
  fuelAdded: number | null;
  notes: string | null;
  syncStatus: 'local' | 'synced' | 'pending_sync';
}

// Union type for all possible sync payloads
export type SyncPayload =
  | OfflineTimeEntry
  | OfflineDailyReport
  | OfflineDailyReportEntry
  | OfflineEquipmentLog
  | Record<string, unknown>;

export interface SyncQueueItem {
  id: string;
  offlineId: string;
  entityType: 'time_entry' | 'daily_report' | 'daily_report_entry' | 'equipment_log';
  operationType: 'INSERT' | 'UPDATE' | 'DELETE';
  entityId: string | null; // NULL for INSERT
  payload: SyncPayload;
  status: 'pending' | 'syncing' | 'completed' | 'failed' | 'conflict';
  retryCount: number;
  clientCreatedAt: string;
  errorMessage: string | null;
}

export interface SyncCheckpoint {
  entityType: string;
  lastSyncAt: string;
  lastSyncVersion: number;
  recordCount: number;
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

        // ============ WV811 STORES ============

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

        // Holidays store
        if (!db.objectStoreNames.contains(STORES.HOLIDAYS)) {
          db.createObjectStore(STORES.HOLIDAYS, { keyPath: 'date' });
        }

        // ============ REFERENCE DATA STORES ============

        // Projects store
        if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
          db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
        }

        // Crew members store
        if (!db.objectStoreNames.contains(STORES.CREW_MEMBERS)) {
          const crewStore = db.createObjectStore(STORES.CREW_MEMBERS, { keyPath: 'id' });
          crewStore.createIndex('displayName', 'displayName', { unique: false });
        }

        // Cost codes store
        if (!db.objectStoreNames.contains(STORES.COST_CODES)) {
          const costCodeStore = db.createObjectStore(STORES.COST_CODES, { keyPath: 'id' });
          costCodeStore.createIndex('code', 'code', { unique: false });
          costCodeStore.createIndex('category', 'category', { unique: false });
        }

        // Equipment store
        if (!db.objectStoreNames.contains(STORES.EQUIPMENT)) {
          const equipmentStore = db.createObjectStore(STORES.EQUIPMENT, { keyPath: 'id' });
          equipmentStore.createIndex('equipmentNumber', 'equipmentNumber', { unique: false });
        }

        // ============ FIELD DATA STORES ============

        // Time entries store
        if (!db.objectStoreNames.contains(STORES.TIME_ENTRIES)) {
          const timeStore = db.createObjectStore(STORES.TIME_ENTRIES, { keyPath: 'id' });
          timeStore.createIndex('offlineId', 'offlineId', { unique: true });
          timeStore.createIndex('crewMemberId', 'crewMemberId', { unique: false });
          timeStore.createIndex('projectId', 'projectId', { unique: false });
          timeStore.createIndex('workDate', 'workDate', { unique: false });
          timeStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Daily reports store
        if (!db.objectStoreNames.contains(STORES.DAILY_REPORTS)) {
          const reportStore = db.createObjectStore(STORES.DAILY_REPORTS, { keyPath: 'id' });
          reportStore.createIndex('offlineId', 'offlineId', { unique: true });
          reportStore.createIndex('projectId', 'projectId', { unique: false });
          reportStore.createIndex('reportDate', 'reportDate', { unique: false });
          reportStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Daily report entries store
        if (!db.objectStoreNames.contains(STORES.DAILY_REPORT_ENTRIES)) {
          const entryStore = db.createObjectStore(STORES.DAILY_REPORT_ENTRIES, { keyPath: 'id' });
          entryStore.createIndex('offlineId', 'offlineId', { unique: true });
          entryStore.createIndex('dailyReportId', 'dailyReportId', { unique: false });
        }

        // Equipment logs store
        if (!db.objectStoreNames.contains(STORES.EQUIPMENT_LOGS)) {
          const logStore = db.createObjectStore(STORES.EQUIPMENT_LOGS, { keyPath: 'id' });
          logStore.createIndex('offlineId', 'offlineId', { unique: true });
          logStore.createIndex('dailyReportId', 'dailyReportId', { unique: false });
          logStore.createIndex('equipmentId', 'equipmentId', { unique: false });
        }

        // ============ SYNC MANAGEMENT STORES ============

        // Sync metadata store
        if (!db.objectStoreNames.contains(STORES.SYNC_META)) {
          db.createObjectStore(STORES.SYNC_META, { keyPath: 'key' });
        }

        // Sync queue store (for upload queue)
        if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
          const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
          queueStore.createIndex('offlineId', 'offlineId', { unique: true });
          queueStore.createIndex('entityType', 'entityType', { unique: false });
          queueStore.createIndex('status', 'status', { unique: false });
          queueStore.createIndex('clientCreatedAt', 'clientCreatedAt', { unique: false });
        }

        // Pending actions store (legacy, kept for WV811 compatibility)
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

  async updateSyncMeta(updates: Partial<SyncMeta>): Promise<void> {
    const store = await this.getStore(STORES.SYNC_META, 'readwrite');
    const existing = await this.getSyncMeta();

    const updated: SyncMeta = {
      key: 'lastSync',
      lastSyncAt: updates.lastSyncAt || existing?.lastSyncAt || new Date().toISOString(),
      dataVersion: updates.dataVersion || existing?.dataVersion || 0,
      lastSyncVersion: updates.lastSyncVersion || existing?.lastSyncVersion || 0,
      expiresAt: updates.expiresAt || existing?.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      ticketCount: updates.ticketCount || existing?.ticketCount || 0,
      userId: updates.userId || existing?.userId || '',
      deviceId: updates.deviceId || existing?.deviceId,
      organizationId: updates.organizationId || existing?.organizationId,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => resolve();
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

  async saveProjects(projects: OfflineProject[]): Promise<void> {
    const store = await this.getStore(STORES.PROJECTS, 'readwrite');

    for (const project of projects) {
      store.put(project);
    }

    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
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

  // ============ REFERENCE DATA (READ-ONLY) ============

  async saveCrewMembers(crewMembers: OfflineCrewMember[]): Promise<void> {
    const store = await this.getStore(STORES.CREW_MEMBERS, 'readwrite');
    const transaction = store.transaction;

    for (const member of crewMembers) {
      store.put(member);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAllCrewMembers(): Promise<OfflineCrewMember[]> {
    const store = await this.getStore(STORES.CREW_MEMBERS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveCostCodes(costCodes: OfflineCostCode[]): Promise<void> {
    const store = await this.getStore(STORES.COST_CODES, 'readwrite');
    const transaction = store.transaction;

    for (const code of costCodes) {
      store.put(code);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAllCostCodes(): Promise<OfflineCostCode[]> {
    const store = await this.getStore(STORES.COST_CODES);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveEquipment(equipment: OfflineEquipment[]): Promise<void> {
    const store = await this.getStore(STORES.EQUIPMENT, 'readwrite');
    const transaction = store.transaction;

    for (const item of equipment) {
      store.put(item);
    }

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getAllEquipment(): Promise<OfflineEquipment[]> {
    const store = await this.getStore(STORES.EQUIPMENT);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ TIME ENTRIES (OFFLINE CREATE/EDIT) ============

  private generateOfflineId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async createTimeEntry(entry: Omit<OfflineTimeEntry, 'id' | 'offlineId' | 'syncStatus' | 'syncVersion' | 'createdAt' | 'updatedAt'>): Promise<OfflineTimeEntry> {
    const store = await this.getStore(STORES.TIME_ENTRIES, 'readwrite');
    const offlineId = this.generateOfflineId();
    const now = new Date().toISOString();

    const fullEntry: OfflineTimeEntry = {
      ...entry,
      id: offlineId, // Use offlineId as id until synced
      offlineId,
      syncStatus: 'local',
      syncVersion: 0,
      createdAt: now,
      updatedAt: now,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(fullEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Add to sync queue
    await this.addToSyncQueue({
      offlineId,
      entityType: 'time_entry',
      operationType: 'INSERT',
      entityId: null,
      payload: fullEntry,
    });

    return fullEntry;
  }

  async updateTimeEntry(id: string, updates: Partial<OfflineTimeEntry>): Promise<OfflineTimeEntry | null> {
    const store = await this.getStore(STORES.TIME_ENTRIES, 'readwrite');

    const existing = await new Promise<OfflineTimeEntry | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!existing) return null;

    const updated: OfflineTimeEntry = {
      ...existing,
      ...updates,
      syncStatus: existing.syncStatus === 'synced' ? 'pending_sync' : existing.syncStatus,
      updatedAt: new Date().toISOString(),
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Add to sync queue if already synced
    if (existing.syncStatus === 'synced') {
      await this.addToSyncQueue({
        offlineId: existing.offlineId,
        entityType: 'time_entry',
        operationType: 'UPDATE',
        entityId: id,
        payload: updated,
      });
    }

    return updated;
  }

  async getTimeEntriesForDate(workDate: string): Promise<OfflineTimeEntry[]> {
    const store = await this.getStore(STORES.TIME_ENTRIES);
    const index = store.index('workDate');
    return new Promise((resolve, reject) => {
      const request = index.getAll(workDate);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getTimeEntriesForProject(projectId: string): Promise<OfflineTimeEntry[]> {
    const store = await this.getStore(STORES.TIME_ENTRIES);
    const index = store.index('projectId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTimeEntries(): Promise<OfflineTimeEntry[]> {
    const store = await this.getStore(STORES.TIME_ENTRIES);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTimeEntries(entries: OfflineTimeEntry[]): Promise<void> {
    const store = await this.getStore(STORES.TIME_ENTRIES, 'readwrite');

    for (const entry of entries) {
      store.put(entry);
    }

    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  }

  async saveTimeEntry(entry: Partial<OfflineTimeEntry> & { id: string }): Promise<void> {
    const store = await this.getStore(STORES.TIME_ENTRIES, 'readwrite');

    // Merge with existing if present
    const existing = await new Promise<OfflineTimeEntry | undefined>((resolve, reject) => {
      const request = store.get(entry.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const fullEntry: OfflineTimeEntry = {
      id: entry.id,
      offlineId: entry.offlineId || entry.id,
      crewMemberId: entry.crewMemberId || existing?.crewMemberId || '',
      projectId: entry.projectId || existing?.projectId || '',
      costCodeId: entry.costCodeId ?? existing?.costCodeId ?? null,
      workDate: entry.workDate || existing?.workDate || '',
      regularHours: entry.regularHours ?? existing?.regularHours ?? 0,
      overtimeHours: entry.overtimeHours ?? existing?.overtimeHours ?? 0,
      doubleTimeHours: entry.doubleTimeHours ?? existing?.doubleTimeHours ?? 0,
      workDescription: entry.workDescription ?? existing?.workDescription ?? null,
      status: entry.status || existing?.status || 'PENDING',
      syncStatus: 'synced',
      syncVersion: entry.syncVersion ?? existing?.syncVersion ?? 0,
      createdAt: entry.createdAt || existing?.createdAt || new Date().toISOString(),
      updatedAt: entry.updatedAt || new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(fullEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============ DAILY REPORTS (OFFLINE CREATE/EDIT) ============

  async createDailyReport(report: Omit<OfflineDailyReport, 'id' | 'offlineId' | 'syncStatus' | 'syncVersion' | 'createdAt' | 'updatedAt'>): Promise<OfflineDailyReport> {
    const store = await this.getStore(STORES.DAILY_REPORTS, 'readwrite');
    const offlineId = this.generateOfflineId();
    const now = new Date().toISOString();

    const fullReport: OfflineDailyReport = {
      ...report,
      id: offlineId,
      offlineId,
      syncStatus: 'local',
      syncVersion: 0,
      createdAt: now,
      updatedAt: now,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(fullReport);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await this.addToSyncQueue({
      offlineId,
      entityType: 'daily_report',
      operationType: 'INSERT',
      entityId: null,
      payload: fullReport,
    });

    return fullReport;
  }

  async getDailyReportsForProject(projectId: string): Promise<OfflineDailyReport[]> {
    const store = await this.getStore(STORES.DAILY_REPORTS);
    const index = store.index('projectId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDailyReports(): Promise<OfflineDailyReport[]> {
    const store = await this.getStore(STORES.DAILY_REPORTS);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveDailyReports(reports: OfflineDailyReport[]): Promise<void> {
    const store = await this.getStore(STORES.DAILY_REPORTS, 'readwrite');

    for (const report of reports) {
      store.put(report);
    }

    return new Promise((resolve, reject) => {
      store.transaction.oncomplete = () => resolve();
      store.transaction.onerror = () => reject(store.transaction.error);
    });
  }

  async saveDailyReport(report: Partial<OfflineDailyReport> & { id: string }): Promise<void> {
    const store = await this.getStore(STORES.DAILY_REPORTS, 'readwrite');

    // Merge with existing if present
    const existing = await new Promise<OfflineDailyReport | undefined>((resolve, reject) => {
      const request = store.get(report.id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const fullReport: OfflineDailyReport = {
      id: report.id,
      offlineId: report.offlineId || report.id,
      projectId: report.projectId || existing?.projectId || '',
      reportDate: report.reportDate || existing?.reportDate || '',
      reportNumber: report.reportNumber ?? existing?.reportNumber ?? null,
      weatherConditions: report.weatherConditions ?? existing?.weatherConditions ?? null,
      temperature: report.temperature ?? existing?.temperature ?? null,
      authorId: report.authorId || existing?.authorId || '',
      status: report.status || existing?.status || 'DRAFT',
      notes: report.notes ?? existing?.notes ?? null,
      syncStatus: 'synced',
      syncVersion: report.syncVersion ?? existing?.syncVersion ?? 0,
      createdAt: report.createdAt || existing?.createdAt || new Date().toISOString(),
      updatedAt: report.updatedAt || new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(fullReport);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ============ EQUIPMENT LOGS (OFFLINE CREATE) ============

  async createEquipmentLog(log: Omit<OfflineEquipmentLog, 'id' | 'offlineId' | 'syncStatus'>): Promise<OfflineEquipmentLog> {
    const store = await this.getStore(STORES.EQUIPMENT_LOGS, 'readwrite');
    const offlineId = this.generateOfflineId();

    const fullLog: OfflineEquipmentLog = {
      ...log,
      id: offlineId,
      offlineId,
      syncStatus: 'local',
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(fullLog);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await this.addToSyncQueue({
      offlineId,
      entityType: 'equipment_log',
      operationType: 'INSERT',
      entityId: null,
      payload: fullLog,
    });

    return fullLog;
  }

  async getEquipmentLogsForReport(dailyReportId: string): Promise<OfflineEquipmentLog[]> {
    const store = await this.getStore(STORES.EQUIPMENT_LOGS);
    const index = store.index('dailyReportId');
    return new Promise((resolve, reject) => {
      const request = index.getAll(dailyReportId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ SYNC QUEUE MANAGEMENT ============

  private async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'status' | 'retryCount' | 'clientCreatedAt' | 'errorMessage'>): Promise<string> {
    const store = await this.getStore(STORES.SYNC_QUEUE, 'readwrite');
    const id = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const fullItem: SyncQueueItem = {
      ...item,
      id,
      status: 'pending',
      retryCount: 0,
      clientCreatedAt: new Date().toISOString(),
      errorMessage: null,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(fullItem);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const store = await this.getStore(STORES.SYNC_QUEUE);
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncItems(): Promise<SyncQueueItem[]> {
    const store = await this.getStore(STORES.SYNC_QUEUE);
    const index = store.index('status');
    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const store = await this.getStore(STORES.SYNC_QUEUE, 'readwrite');

    const existing = await new Promise<SyncQueueItem | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!existing) return;

    const updated = { ...existing, ...updates };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeSyncQueueItem(id: string): Promise<void> {
    const store = await this.getStore(STORES.SYNC_QUEUE, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async markEntitySynced(offlineId: string, serverId: string, entityType: SyncQueueItem['entityType']): Promise<void> {
    // Update the local entity with server ID and synced status
    let storeName: string;
    switch (entityType) {
      case 'time_entry':
        storeName = STORES.TIME_ENTRIES;
        break;
      case 'daily_report':
        storeName = STORES.DAILY_REPORTS;
        break;
      case 'equipment_log':
        storeName = STORES.EQUIPMENT_LOGS;
        break;
      default:
        return;
    }

    const store = await this.getStore(storeName, 'readwrite');
    const index = store.index('offlineId');

    const existing = await new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
      const request = index.get(offlineId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (existing) {
      // Delete old record with offline ID
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(existing.id as string);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      // Insert with server ID
      const updated = {
        ...existing,
        id: serverId,
        syncStatus: 'synced',
        syncVersion: (existing.syncVersion as number || 0) + 1,
      };

      await new Promise<void>((resolve, reject) => {
        const request = store.put(updated);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // ============ COMPREHENSIVE STATS ============

  async getFullOfflineStats(): Promise<{
    tickets: number;
    timeEntries: number;
    dailyReports: number;
    equipmentLogs: number;
    pendingSyncItems: number;
    lastSyncAt: string | null;
    isExpired: boolean;
  }> {
    const [tickets, meta, timeEntries, dailyReports, equipmentLogs, syncQueue] = await Promise.all([
      this.getAllTickets(),
      this.getSyncMeta(),
      this.getAllTimeEntries(),
      this.getAllDailyReports(),
      this.getStore(STORES.EQUIPMENT_LOGS).then((store) =>
        new Promise<number>((resolve, reject) => {
          const request = store.count();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        })
      ),
      this.getSyncQueue(),
    ]);

    const isExpired = !meta || new Date(meta.expiresAt) < new Date();
    const pendingSyncItems = syncQueue.filter((s) => s.status === 'pending').length;

    return {
      tickets: tickets.length,
      timeEntries: timeEntries.length,
      dailyReports: dailyReports.length,
      equipmentLogs,
      pendingSyncItems,
      lastSyncAt: meta?.lastSyncAt || null,
      isExpired,
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
