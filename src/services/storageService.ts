import { User, Event, TicketType, Booking, IssuedTicket, CheckInLog, CheckInResult, PaymentMethod, UserRole } from '../types';
import { INITIAL_USERS, INITIAL_EVENTS, INITIAL_TICKET_TYPES, INITIAL_BOOKINGS, INITIAL_ISSUED_TICKETS, INITIAL_LOGS, ALAS_CERITA_PERKS } from '../data/mockData';
import { db, auth } from '../firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, getDocsFromServer, onSnapshot, runTransaction } from 'firebase/firestore';
import {
  computeSessionBindingToken,
  sanitizeEmail,
  sanitizePhone,
  sanitizeText,
} from '../utils/security';

export const SINGLE_PROMO_LIMIT = 13;
export const SINGLE_PROMO_PRICE = 70000;
export const SINGLE_REGULAR_PRICE = 80000;

const ADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity timeout
const ADMIN_LOGIN_MAX_ATTEMPTS = 5;
const ADMIN_LOGIN_LOCKOUT_MS = 3 * 60 * 1000; // 3 minutes lockout

const STORAGE_KEYS = {
  USERS: 'eventpass_users_v3',
  CURRENT_USER_ID: 'eventpass_current_user_id_v3',
  EVENTS: 'eventpass_events_v3',
  TICKET_TYPES: 'eventpass_ticket_types_v3',
  BOOKINGS: 'eventpass_bookings_v3',
  ISSUED_TICKETS: 'eventpass_issued_tickets_v3',
  LOGS: 'eventpass_check_in_logs_v3',
  RATE_LIMIT_ATTEMPTS: 'eventpass_supervisor_rate_limit_v3',
  SIMULATION_CLEARED: 'alas_cerita_simulation_cleared_v1',
  MY_LOCAL_BOOKINGS: 'alas_cerita_my_local_bookings_v1',
  MY_LOCAL_TICKETS: 'alas_cerita_my_local_tickets_v1',
  ADMIN_SESSION_USER: 'alas_cerita_admin_session_user_v1',
  ADMIN_SESSION_EPOCH: 'alas_cerita_admin_session_epoch_v1',
  ADMIN_SESSION_SIG: 'alas_cerita_admin_sig_v1',
  ADMIN_LAST_ACTIVE: 'alas_cerita_admin_last_active_v1',
  ADMIN_LOGIN_GUARD: 'alas_cerita_admin_login_guard_v1',
};

// Every pre-existing admin session created prior to this credential rotation is automatically invalidated
const MIN_VALID_ADMIN_EPOCH = Date.UTC(2026, 10, 16, 16, 38, 0);

// Safe alphanumeric character set for visual ticket_number (omits ambiguous 0, O, 1, I)
const TICKET_NUMBER_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRandomTicketNumber(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += TICKET_NUMBER_CHARS.charAt(Math.floor(Math.random() * TICKET_NUMBER_CHARS.length));
  }
  return `TCK-${code}`;
}

function generateUniqueSuffix(len = 5): string {
  return Math.random().toString(36).substring(2, 2 + len);
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      cleaned[key] = val;
    }
  });
  return cleaned as T;
}

function logFirestoreError(error: unknown, operationType: string, path: string) {
  const info = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid || null,
    },
  };
  console.warn('Firestore Sync Notice:', JSON.stringify(info));
}

function safeSetLocalStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Handle QuotaExceededError cleanly (e.g., many base64 proof images in bookings)
    if (key === STORAGE_KEYS.BOOKINGS && Array.isArray(value)) {
      try {
        const compact = value.map((b: any) => {
          if (!b || !b.paymentProofUrl) return b;
          const { paymentProofUrl: _proof, ...rest } = b;
          return rest;
        });
        localStorage.setItem(key, JSON.stringify(compact));
      } catch {
        // Memory cache still retains full records
      }
    } else {
      console.warn(`LocalStorage cache notice for ${key}:`, err);
    }
  }
}

class StorageService {
  private listeners: Set<() => void> = new Set();
  private isFirestoreSynced = false;
  private hasFirestoreBookingsSync = false;
  private cloudAdminEpoch = MIN_VALID_ADMIN_EPOCH;
  private lastServerSyncAt = 0;
  private activeServerSync: Promise<boolean> | null = null;

  // Canonical in-memory caches so large multi-phone datasets never hit localStorage 5MB limit
  private bookingsCache: Booking[] | null = null;
  private issuedTicketsCache: IssuedTicket[] | null = null;
  private ticketTypesCache: TicketType[] | null = null;
  private logsCache: CheckInLog[] | null = null;
  private pendingAttendeesMap: Map<string, Array<{ name: string; email: string; phone: string; origin: string }>> = new Map();
  private syncedBookingPriceIds: Set<string> = new Set();
  private syncedTierSignatures: Map<string, string> = new Map();

  constructor() {
    this.initializeDefaults();
    this.initFirestoreSync();
  }

  private sortBookingsNewestFirst(list: Booking[]): Booking[] {
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private sortIssuedTicketsNewestFirst(list: IssuedTicket[], bookingsRef?: Booking[]): IssuedTicket[] {
    const bookingTimeMap = new Map<string, number>();
    (bookingsRef || this.bookingsCache || []).forEach((b) => {
      const ts = new Date(b.createdAt).getTime();
      if (!Number.isNaN(ts)) bookingTimeMap.set(b.id, ts);
    });

    const getTicketTimestamp = (t: IssuedTicket): number => {
      if (t.bookingId && bookingTimeMap.has(t.bookingId)) {
        return bookingTimeMap.get(t.bookingId)!;
      }
      const parsedIdTs = Number(t.id.split('_')[1]);
      return Number.isFinite(parsedIdTs) ? parsedIdTs : 0;
    };

    return [...list].sort((a, b) => {
      const diff = getTicketTimestamp(b) - getTicketTimestamp(a);
      if (diff !== 0) return diff;
      return (a.packageMemberIndex || 1) - (b.packageMemberIndex || 1);
    });
  }

  private applyServerTicketTypes(rawList: TicketType[], isCleared: boolean) {
    if (rawList.length > 0) {
      this.ticketTypesCache = rawList;
      this.reconcileTicketTypesWithActualData(true);
      this.notify();
    } else if (!isCleared) {
      INITIAL_TICKET_TYPES.forEach((tt) => {
        setDoc(doc(db, 'ticketTypes', tt.id), sanitizeForFirestore(tt)).catch((err) =>
          logFirestoreError(err, 'write', `ticketTypes/${tt.id}`)
        );
      });
    }
  }

  private applyServerBookings(rawList: Booking[]) {
    this.hasFirestoreBookingsSync = true;
    const sorted = this.sortBookingsNewestFirst(rawList);
    const reconciled = this.reconcileSingleBookingPrices(sorted, true);
    this.bookingsCache = reconciled;
    if (this.issuedTicketsCache) {
      this.issuedTicketsCache = this.sortIssuedTicketsNewestFirst(this.issuedTicketsCache, reconciled);
    }
    if (this.getCurrentUser().role !== 'customer') {
      safeSetLocalStorage(STORAGE_KEYS.BOOKINGS, reconciled);
    } else {
      localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
    }
    this.reconcileTicketTypesWithActualData(true);
    this.notify();
  }

  private applyServerIssuedTickets(rawList: IssuedTicket[]) {
    const sorted = this.sortIssuedTicketsNewestFirst(rawList);
    this.issuedTicketsCache = sorted;
    if (this.getCurrentUser().role !== 'customer') {
      safeSetLocalStorage(STORAGE_KEYS.ISSUED_TICKETS, sorted);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ISSUED_TICKETS);
    }
    this.reconcileTicketTypesWithActualData(true);
    this.notify();
  }

  private applyServerLogs(rawList: CheckInLog[]) {
    const sorted = [...rawList].sort(
      (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
    );
    const sliced = sorted.slice(0, 150);
    this.logsCache = sliced;
    if (this.getCurrentUser().role !== 'customer') {
      safeSetLocalStorage(STORAGE_KEYS.LOGS, sliced);
    } else {
      localStorage.removeItem(STORAGE_KEYS.LOGS);
    }
    this.notify();
  }

  /**
   * Forces an immediate read from Firestore Server (bypasses local cache)
   * so admin dashboards instantly catch new registrants after tab wake-up or network reconnect.
   */
  public async syncFromServer(force = false): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const now = Date.now();
    if (!force && now - this.lastServerSyncAt < 6_000) {
      return true;
    }
    if (this.activeServerSync) {
      return this.activeServerSync;
    }

    const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';

    this.activeServerSync = (async () => {
      try {
        const [ttSnap, bkgSnap, tktSnap, logSnap] = await Promise.all([
          getDocsFromServer(collection(db, 'ticketTypes')),
          getDocsFromServer(collection(db, 'bookings')),
          getDocsFromServer(collection(db, 'issuedTickets')),
          getDocsFromServer(collection(db, 'checkInLogs')),
        ]);

        const ttList: TicketType[] = [];
        ttSnap.forEach((d) => ttList.push(d.data() as TicketType));

        const bkgList: Booking[] = [];
        bkgSnap.forEach((d) => bkgList.push(d.data() as Booking));

        const tktList: IssuedTicket[] = [];
        tktSnap.forEach((d) => tktList.push(d.data() as IssuedTicket));

        const logList: CheckInLog[] = [];
        logSnap.forEach((d) => logList.push(d.data() as CheckInLog));

        this.lastServerSyncAt = Date.now();
        this.applyServerBookings(bkgList);
        this.applyServerIssuedTickets(tktList);
        this.applyServerTicketTypes(ttList, isCleared);
        this.applyServerLogs(logList);
        return true;
      } catch (err) {
        logFirestoreError(err, 'list', 'syncFromServer');
        return false;
      } finally {
        this.activeServerSync = null;
      }
    })();

    return this.activeServerSync;
  }

  private initFirestoreSync() {
    if (typeof window === 'undefined' || this.isFirestoreSynced) return;
    this.isFirestoreSynced = true;

    try {
      const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';

      // 1. Listen to Ticket Types and live quotas
      onSnapshot(
        collection(db, 'ticketTypes'),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.fromCache && snapshot.empty) return;
          const list: TicketType[] = [];
          snapshot.forEach((d) => list.push(d.data() as TicketType));
          if (!snapshot.metadata.fromCache) {
            this.lastServerSyncAt = Date.now();
          }
          this.applyServerTicketTypes(list, isCleared);
        },
        (err) => logFirestoreError(err, 'list', 'ticketTypes')
      );

      // 2. Listen to Bookings (real-time reflection from all smartphones -> single Admin Dashboard)
      onSnapshot(
        collection(db, 'bookings'),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.fromCache && !this.hasFirestoreBookingsSync && snapshot.empty) return;
          const list: Booking[] = [];
          snapshot.forEach((d) => list.push(d.data() as Booking));
          if (!snapshot.metadata.fromCache) {
            this.lastServerSyncAt = Date.now();
          }
          this.applyServerBookings(list);
        },
        (err) => logFirestoreError(err, 'list', 'bookings')
      );

      // 3. Listen to Issued Tickets (real-time attendee biodata & QR status across all devices)
      onSnapshot(
        collection(db, 'issuedTickets'),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.fromCache && snapshot.empty) return;
          const list: IssuedTicket[] = [];
          snapshot.forEach((d) => list.push(d.data() as IssuedTicket));
          if (!snapshot.metadata.fromCache) {
            this.lastServerSyncAt = Date.now();
          }
          this.applyServerIssuedTickets(list);
        },
        (err) => logFirestoreError(err, 'list', 'issuedTickets')
      );

      // 4. Listen to Gate Check-In Logs
      onSnapshot(
        collection(db, 'checkInLogs'),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.fromCache && snapshot.empty) return;
          const list: CheckInLog[] = [];
          snapshot.forEach((d) => list.push(d.data() as CheckInLog));
          this.applyServerLogs(list);
        },
        (err) => logFirestoreError(err, 'list', 'checkInLogs')
      );

      // 5. Listen to Global Admin Session Epoch (forces immediate logout on other devices when revoked)
      onSnapshot(
        doc(db, 'events', 'evt_alas_cerita_2026'),
        (snapshot) => {
          if (!snapshot.exists()) return;
          const data = snapshot.data() as { adminSessionEpoch?: number };
          if (typeof data.adminSessionEpoch === 'number' && data.adminSessionEpoch > this.cloudAdminEpoch) {
            this.cloudAdminEpoch = data.adminSessionEpoch;
            const localEpoch = Number(sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION_EPOCH) || 0);
            if (localEpoch > 0 && localEpoch < this.cloudAdminEpoch) {
              this.clearAdminSessionStorage();
            }
            this.notify();
          }
        },
        (err) => logFirestoreError(err, 'get', 'events/evt_alas_cerita_2026')
      );

      // 6. Auto-sync immediately when admin switches back to tab, gains window focus, or reconnects online
      const handleWakeSync = () => {
        if (this.getCurrentUser().role !== 'customer') {
          void this.syncFromServer(false);
        }
      };
      window.addEventListener('focus', handleWakeSync);
      window.addEventListener('online', () => {
        if (this.getCurrentUser().role !== 'customer') {
          void this.syncFromServer(true);
        }
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          handleWakeSync();
        }
      });
    } catch (e) {
      console.warn('Firestore sync setup failed, operating on local cache:', e);
    }
  }

  private initializeDefaults() {
    if (typeof window === 'undefined') return;
    const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';

    if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
      safeSetLocalStorage(STORAGE_KEYS.EVENTS, INITIAL_EVENTS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.TICKET_TYPES)) {
      safeSetLocalStorage(STORAGE_KEYS.TICKET_TYPES, INITIAL_TICKET_TYPES);
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
      safeSetLocalStorage(STORAGE_KEYS.BOOKINGS, isCleared ? [] : INITIAL_BOOKINGS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.ISSUED_TICKETS)) {
      safeSetLocalStorage(STORAGE_KEYS.ISSUED_TICKETS, isCleared ? [] : INITIAL_ISSUED_TICKETS);
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      safeSetLocalStorage(STORAGE_KEYS.USERS, INITIAL_USERS);
    }
    // Always enforce customer default & purge bulk PII from localStorage for non-admin sessions
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'usr_cust');
    if (this.getCurrentUser().role === 'customer') {
      localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
      localStorage.removeItem(STORAGE_KEYS.ISSUED_TICKETS);
      localStorage.removeItem(STORAGE_KEYS.LOGS);
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  private clearAdminSessionStorage() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION_USER);
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION_EPOCH);
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION_SIG);
    sessionStorage.removeItem(STORAGE_KEYS.ADMIN_LAST_ACTIVE);
    localStorage.removeItem(STORAGE_KEYS.BOOKINGS);
    localStorage.removeItem(STORAGE_KEYS.ISSUED_TICKETS);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
  }

  private assertAuthorizedRole(allowedRoles: UserRole[]): User | null {
    const active = this.getCurrentUser();
    if (!allowedRoles.includes(active.role)) {
      return null;
    }
    this.touchAdminSessionActivity();
    return active;
  }

  public touchAdminSessionActivity() {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION_USER)) {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_LAST_ACTIVE, String(Date.now()));
    }
  }

  public getAdminLoginLockStatus(): { locked: boolean; remainingSeconds: number; failedCount: number } {
    if (typeof window === 'undefined') return { locked: false, remainingSeconds: 0, failedCount: 0 };
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ADMIN_LOGIN_GUARD);
      if (!raw) return { locked: false, remainingSeconds: 0, failedCount: 0 };
      const parsed = JSON.parse(raw) as { failedCount?: number; lockedUntil?: number };
      const now = Date.now();
      if (parsed.lockedUntil && parsed.lockedUntil > now) {
        return {
          locked: true,
          remainingSeconds: Math.ceil((parsed.lockedUntil - now) / 1000),
          failedCount: parsed.failedCount || ADMIN_LOGIN_MAX_ATTEMPTS,
        };
      }
      if (parsed.lockedUntil && parsed.lockedUntil <= now) {
        localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGIN_GUARD);
        return { locked: false, remainingSeconds: 0, failedCount: 0 };
      }
      return { locked: false, remainingSeconds: 0, failedCount: parsed.failedCount || 0 };
    } catch {
      return { locked: false, remainingSeconds: 0, failedCount: 0 };
    }
  }

  public recordFailedAdminLogin(attemptedUsername: string): {
    locked: boolean;
    remainingAttempts: number;
    remainingSeconds: number;
  } {
    if (typeof window === 'undefined') {
      return { locked: false, remainingAttempts: ADMIN_LOGIN_MAX_ATTEMPTS, remainingSeconds: 0 };
    }
    const status = this.getAdminLoginLockStatus();
    if (status.locked) {
      return { locked: true, remainingAttempts: 0, remainingSeconds: status.remainingSeconds };
    }
    const nextFailed = status.failedCount + 1;
    if (nextFailed >= ADMIN_LOGIN_MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + ADMIN_LOGIN_LOCKOUT_MS;
      localStorage.setItem(
        STORAGE_KEYS.ADMIN_LOGIN_GUARD,
        JSON.stringify({ failedCount: nextFailed, lockedUntil })
      );
      this.recordLog({
        staffId: 'security_guard',
        staffName: 'Sistem Keamanan Portal',
        method: 'manual_supervisor',
        result: 'rate_limited',
        message: `Login admin dikunci 3 menit setelah 5x percobaan gagal (user: ${sanitizeText(attemptedUsername, 40) || '-'})`,
        deviceInfo: 'Admin Auth Firewall',
        gateName: 'Portal Admin',
      });
      return {
        locked: true,
        remainingAttempts: 0,
        remainingSeconds: Math.ceil(ADMIN_LOGIN_LOCKOUT_MS / 1000),
      };
    }
    localStorage.setItem(
      STORAGE_KEYS.ADMIN_LOGIN_GUARD,
      JSON.stringify({ failedCount: nextFailed, lockedUntil: 0 })
    );
    return {
      locked: false,
      remainingAttempts: ADMIN_LOGIN_MAX_ATTEMPTS - nextFailed,
      remainingSeconds: 0,
    };
  }

  public resetAdminLoginRateLimit() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.ADMIN_LOGIN_GUARD);
  }

  // --- Users & Current Active Role ---
  public getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      const parsed: User[] = data ? JSON.parse(data) : INITIAL_USERS;
      return parsed.map((u) =>
        u.id === 'usr_admin' && u.name.toLowerCase().includes('budi')
          ? { ...u, name: 'EO Alas Cerita' }
          : u
      );
    } catch {
      return INITIAL_USERS;
    }
  }

  public getCurrentUser(): User {
    const users = this.getUsers();
    const customerFallback = users.find((u) => u.role === 'customer') || users[0];

    try {
      const sessionUserId = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION_USER);
      const sessionEpoch = Number(sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION_EPOCH) || 0);
      const sessionSig = sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION_SIG) || '';
      const lastActive = Number(sessionStorage.getItem(STORAGE_KEYS.ADMIN_LAST_ACTIVE) || 0);
      const minRequiredEpoch = Math.max(MIN_VALID_ADMIN_EPOCH, this.cloudAdminEpoch);

      if (sessionUserId && sessionUserId !== 'usr_cust' && sessionEpoch >= minRequiredEpoch) {
        const expectedSig = computeSessionBindingToken(sessionUserId, sessionEpoch);
        const isNotIdleExpired = lastActive > 0 && Date.now() - lastActive <= ADMIN_IDLE_TIMEOUT_MS;
        if (sessionSig === expectedSig && isNotIdleExpired) {
          const matched = users.find((u) => u.id === sessionUserId);
          if (matched && matched.role !== 'customer') {
            return matched;
          }
        }
        // Invalid, tampered, or idle-expired admin session -> purge immediately
        this.clearAdminSessionStorage();
      }
    } catch {
      // sessionStorage unavailable -> fallback to customer
    }

    return customerFallback;
  }

  public setCurrentUser(userId: string) {
    if (typeof window !== 'undefined') {
      if (!userId || userId === 'usr_cust') {
        this.clearAdminSessionStorage();
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'usr_cust');
      } else {
        const newEpoch = Math.max(Date.now(), MIN_VALID_ADMIN_EPOCH, this.cloudAdminEpoch + 1);
        const sessionSig = computeSessionBindingToken(userId, newEpoch);
        this.cloudAdminEpoch = newEpoch;
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION_USER, userId);
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION_EPOCH, String(newEpoch));
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION_SIG, sessionSig);
        sessionStorage.setItem(STORAGE_KEYS.ADMIN_LAST_ACTIVE, String(Date.now()));
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'usr_cust');

        // Immediately invalidate any other older admin sessions active across other browsers/devices
        setDoc(
          doc(db, 'events', 'evt_alas_cerita_2026'),
          { adminSessionEpoch: newEpoch },
          { merge: true }
        ).catch((err) => logFirestoreError(err, 'write', 'events/evt_alas_cerita_2026'));

        // Immediately sync freshest server records upon Admin login
        void this.syncFromServer(true);
      }
    }
    this.notify();
  }

  public async revokeOtherAdminSessions(): Promise<{ success: boolean; message: string }> {
    const current = this.assertAuthorizedRole(['super_admin', 'gate_staff', 'gate_supervisor']);
    if (!current) {
      return { success: false, message: 'Akses ditolak: hanya admin aktif yang dapat mencabut sesi lain.' };
    }
    const newEpoch = Math.max(Date.now(), MIN_VALID_ADMIN_EPOCH, this.cloudAdminEpoch + 1);
    const sessionSig = computeSessionBindingToken(current.id, newEpoch);
    this.cloudAdminEpoch = newEpoch;

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION_USER, current.id);
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION_EPOCH, String(newEpoch));
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION_SIG, sessionSig);
      sessionStorage.setItem(STORAGE_KEYS.ADMIN_LAST_ACTIVE, String(Date.now()));
    }

    try {
      await setDoc(
        doc(db, 'events', 'evt_alas_cerita_2026'),
        { adminSessionEpoch: newEpoch },
        { merge: true }
      );
      this.notify();
      return {
        success: true,
        message: 'Seluruh sesi login admin di perangkat atau browser lain berhasil dikeluarkan (logout paksa).',
      };
    } catch (err) {
      logFirestoreError(err, 'write', 'events/evt_alas_cerita_2026');
      return {
        success: false,
        message: 'Gagal mengirim perintah logout ke server. Periksa koneksi internet Anda.',
      };
    }
  }

  // --- Events ---
  public getEvents(): Event[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
      const parsed: Event[] = data ? JSON.parse(data) : INITIAL_EVENTS;
      return parsed.map((evt) =>
        evt.id === 'evt_alas_cerita_2026'
          ? {
              ...evt,
              title: evt.title?.includes('Rerasan Mawi Makna')
                ? 'TALK SHOW • MINI WORKSHOP • KERONCONG MUSIC PERFORMANCE'
                : evt.title,
              posterUrl: '/assets/aistudio/WhatsApp_Image_2026-11-14_at_19.20.45_a24d6398.jpeg',
            }
          : evt
      );
    } catch {
      return INITIAL_EVENTS;
    }
  }

  public saveEvent(event: Event) {
    if (!this.assertAuthorizedRole(['super_admin'])) return;
    const events = this.getEvents();
    const idx = events.findIndex((e) => e.id === event.id);
    if (idx >= 0) {
      events[idx] = event;
    } else {
      events.unshift(event);
    }
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    this.notify();
  }

  public deleteEvent(eventId: string) {
    if (!this.assertAuthorizedRole(['super_admin'])) return;
    const events = this.getEvents().filter((e) => e.id !== eventId);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    this.notify();
  }

  private getTierPackageCapacity(tier: Pick<TicketType, 'id' | 'name'>): number {
    const lowerName = (tier.name || '').toLowerCase();
    if (tier.id === 'tt_alas_couple' || lowerName.includes('couple')) return 2;
    if (tier.id === 'tt_alas_circle' || lowerName.includes('circle')) return 3;
    return 1;
  }

  private isSingleTier(tier: Pick<TicketType, 'id' | 'name'>): boolean {
    return tier.id === 'tt_alas_single' || (tier.name || '').toLowerCase().includes('single');
  }

  public getTierAllocationStats(
    tier: TicketType,
    bookingsInput?: Booking[],
    issuedTicketsInput?: IssuedTicket[]
  ): {
    capacityPerPackage: number;
    soldPackages: number;
    heldPackages: number;
    totalUsedPackages: number;
    remainingPackages: number;
    percentSold: number;
    attendeeCount: number;
    checkedInCount: number;
    verifiedBookingsCount: number;
    awaitingVerificationCount: number;
    pendingBookingsCount: number;
    revenue: number;
    activePrice: number;
  } {
    const bookings = bookingsInput ?? this.getBookings();
    const issuedTickets = issuedTicketsInput ?? this.getIssuedTickets();
    const capacityPerPackage = this.getTierPackageCapacity(tier);
    const tierNameLower = (tier.name || '').toLowerCase();
    const isSingle = this.isSingleTier(tier);
    const nowMs = Date.now();

    const bookingTicketMap = new Map<string, IssuedTicket[]>();
    issuedTickets.forEach((t) => {
      if (!t.bookingId) return;
      const arr = bookingTicketMap.get(t.bookingId) || [];
      arr.push(t);
      bookingTicketMap.set(t.bookingId, arr);
    });

    const matchesBookingTier = (b: Booking): boolean => {
      if (b.ticketTypeId === tier.id) return true;
      const linkedTickets = bookingTicketMap.get(b.id) || [];
      if (
        linkedTickets.some(
          (t) => t.ticketTypeId === tier.id || (t.packageName || '').toLowerCase() === tierNameLower
        )
      ) {
        return true;
      }
      if (!b.ticketTypeId) {
        if (isSingle && (b.totalAmount === SINGLE_PROMO_PRICE || b.totalAmount === SINGLE_REGULAR_PRICE)) {
          return true;
        }
        if (tier.id === 'tt_alas_couple' && b.totalAmount === 155000) return true;
        if (tier.id === 'tt_alas_circle' && b.totalAmount === 225000) return true;
      }
      return false;
    };

    const paidBookings = bookings.filter((b) => b.paymentStatus === 'paid' && matchesBookingTier(b));
    const pendingBookings = bookings.filter(
      (b) => b.paymentStatus === 'pending' && new Date(b.expiresAt).getTime() > nowMs && matchesBookingTier(b)
    );

    const paidBookingIds = new Set(paidBookings.map((b) => b.id));
    const expiredBookingIds = new Set(
      bookings.filter((b) => b.paymentStatus === 'expired').map((b) => b.id)
    );

    const tierTickets = issuedTickets.filter((t) => {
      if (t.bookingId && expiredBookingIds.has(t.bookingId)) return false;
      return (
        t.ticketTypeId === tier.id ||
        (t.packageName || '').toLowerCase() === tierNameLower ||
        (t.bookingId ? paidBookingIds.has(t.bookingId) : false)
      );
    });

    // Orphan issued tickets (if any exist without an associated paid booking record)
    const orphanTicketsByBooking = new Map<string, IssuedTicket[]>();
    tierTickets.forEach((t) => {
      if (!t.bookingId || !paidBookingIds.has(t.bookingId)) {
        const key = t.bookingId || t.id;
        const arr = orphanTicketsByBooking.get(key) || [];
        arr.push(t);
        orphanTicketsByBooking.set(key, arr);
      }
    });

    let orphanPackages = 0;
    orphanTicketsByBooking.forEach((groupTickets) => {
      orphanPackages += Math.max(1, Math.ceil(groupTickets.length / capacityPerPackage));
    });

    const soldFromBookings = paidBookings.reduce((sum, b) => sum + Math.max(1, b.quantity || 1), 0);
    const soldPackages = soldFromBookings + orphanPackages;
    const heldPackages = pendingBookings.reduce((sum, b) => sum + Math.max(1, b.quantity || 1), 0);
    const totalUsedPackages = soldPackages + heldPackages;
    const remainingPackages = Math.max(0, tier.quota - totalUsedPackages);
    const percentSold = tier.quota > 0 ? Math.min(100, Math.round((totalUsedPackages / tier.quota) * 100)) : 0;

    // Count actual attendees across issuedTickets + any bookings without issued tickets yet
    let missingTicketAttendees = 0;
    paidBookings.forEach((b) => {
      const linked = bookingTicketMap.get(b.id) || [];
      if (linked.length === 0) {
        missingTicketAttendees += Math.max(1, b.quantity || 1) * capacityPerPackage;
      }
    });
    pendingBookings.forEach((b) => {
      missingTicketAttendees += Math.max(1, b.quantity || 1) * capacityPerPackage;
    });

    const attendeeCount = tierTickets.length + missingTicketAttendees;
    const checkedInCount = tierTickets.filter((t) => t.status === 'checked-in').length;
    const verifiedBookingsCount = paidBookings.filter((b) => b.verificationStatus === 'verified').length;
    const awaitingVerificationCount = paidBookings.filter((b) => b.verificationStatus !== 'verified').length;
    const revenue = paidBookings.reduce((sum, b) => sum + (b.totalAmount || 0), 0);

    const activePrice = isSingle
      ? totalUsedPackages < SINGLE_PROMO_LIMIT
        ? SINGLE_PROMO_PRICE
        : SINGLE_REGULAR_PRICE
      : tier.price;

    return {
      capacityPerPackage,
      soldPackages,
      heldPackages,
      totalUsedPackages,
      remainingPackages,
      percentSold,
      attendeeCount,
      checkedInCount,
      verifiedBookingsCount,
      awaitingVerificationCount,
      pendingBookingsCount: pendingBookings.length,
      revenue,
      activePrice,
    };
  }

  private getRawTicketTypes(): TicketType[] {
    try {
      if (this.ticketTypesCache) return this.ticketTypesCache;
      const data = localStorage.getItem(STORAGE_KEYS.TICKET_TYPES);
      const parsed: TicketType[] = data ? JSON.parse(data) : INITIAL_TICKET_TYPES;
      this.ticketTypesCache = parsed;
      return parsed;
    } catch {
      return INITIAL_TICKET_TYPES;
    }
  }

  private reconcileTicketTypesWithActualData(syncFirestore = false) {
    const rawTiers = this.getRawTicketTypes();
    if (rawTiers.length === 0) return;

    const bookings = this.getBookings();
    const issuedTickets = this.getIssuedTickets();
    let changed = false;

    const updatedTiers = rawTiers.map((tt) => {
      const stats = this.getTierAllocationStats(tt, bookings, issuedTickets);
      const targetDescription = this.isSingleTier(tt)
        ? 'Paket untuk 1 orang peserta. Pendaftar 1–13 seharga Rp70.000, pendaftar ke-14 ke atas seharga Rp80.000.'
        : tt.description;

      if (
        tt.availableQuota !== stats.remainingPackages ||
        (tt.heldQuota || 0) !== stats.heldPackages ||
        tt.price !== stats.activePrice ||
        tt.description !== targetDescription
      ) {
        changed = true;
      }

      if (syncFirestore) {
        const signature = `${stats.remainingPackages}|${stats.heldPackages}|${stats.activePrice}`;
        const prevSig = this.syncedTierSignatures.get(tt.id);
        if (
          prevSig !== signature &&
          (tt.availableQuota !== stats.remainingPackages ||
            (tt.heldQuota || 0) !== stats.heldPackages ||
            tt.price !== stats.activePrice)
        ) {
          this.syncedTierSignatures.set(tt.id, signature);
          updateDoc(doc(db, 'ticketTypes', tt.id), {
            availableQuota: stats.remainingPackages,
            heldQuota: stats.heldPackages,
            price: stats.activePrice,
            description: targetDescription,
          }).catch((err) => logFirestoreError(err, 'update', `ticketTypes/${tt.id}`));
        }
      }

      return {
        ...tt,
        price: stats.activePrice,
        availableQuota: stats.remainingPackages,
        heldQuota: stats.heldPackages,
        description: targetDescription,
      };
    });

    if (changed) {
      this.ticketTypesCache = updatedTiers;
      safeSetLocalStorage(STORAGE_KEYS.TICKET_TYPES, updatedTiers);
    }
  }

  // --- Single Tiered Pricing (1–13 = Rp 70.000, 14+ = Rp 80.000) ---
  public getSinglePricingInfo(): {
    registeredCount: number;
    nextNumber: number;
    promoLimit: number;
    promoRemaining: number;
    promoPrice: number;
    regularPrice: number;
    activePrice: number;
    isPromoActive: boolean;
  } {
    const rawSingle =
      this.getRawTicketTypes().find((t) => t.id === 'tt_alas_single') || INITIAL_TICKET_TYPES[0];
    const stats = this.getTierAllocationStats(rawSingle);
    const registeredCount = stats.totalUsedPackages;
    const nextNumber = registeredCount + 1;
    const isPromoActive = registeredCount < SINGLE_PROMO_LIMIT;
    const promoRemaining = Math.max(0, SINGLE_PROMO_LIMIT - registeredCount);
    const activePrice = isPromoActive ? SINGLE_PROMO_PRICE : SINGLE_REGULAR_PRICE;

    return {
      registeredCount,
      nextNumber,
      promoLimit: SINGLE_PROMO_LIMIT,
      promoRemaining,
      promoPrice: SINGLE_PROMO_PRICE,
      regularPrice: SINGLE_REGULAR_PRICE,
      activePrice,
      isPromoActive,
    };
  }

  public calculateSingleTotal(quantity: number, startingCount = this.getSinglePricingInfo().registeredCount): number {
    let total = 0;
    for (let i = 0; i < quantity; i++) {
      const registrantNumber = startingCount + 1 + i;
      total += registrantNumber <= SINGLE_PROMO_LIMIT ? SINGLE_PROMO_PRICE : SINGLE_REGULAR_PRICE;
    }
    return total;
  }

  // --- Ticket Types ---
  public getTicketTypes(eventId?: string): TicketType[] {
    try {
      const all = this.getRawTicketTypes();
      const bookings = this.getBookings();
      const issuedTickets = this.getIssuedTickets();

      const resolved = all.map((tt) => {
        const stats = this.getTierAllocationStats(tt, bookings, issuedTickets);
        return {
          ...tt,
          price: stats.activePrice,
          availableQuota: stats.remainingPackages,
          heldQuota: stats.heldPackages,
          description: this.isSingleTier(tt)
            ? 'Paket untuk 1 orang peserta. Pendaftar 1–13 seharga Rp70.000, pendaftar ke-14 ke atas seharga Rp80.000.'
            : tt.description,
        };
      });

      return eventId ? resolved.filter((tt) => tt.eventId === eventId) : resolved;
    } catch {
      return INITIAL_TICKET_TYPES;
    }
  }

  public saveTicketType(ticketType: TicketType) {
    if (!this.assertAuthorizedRole(['super_admin'])) return;
    const all = [...this.getTicketTypes()];
    const idx = all.findIndex((t) => t.id === ticketType.id);
    if (idx >= 0) {
      all[idx] = ticketType;
    } else {
      all.push(ticketType);
    }
    this.ticketTypesCache = all;
    safeSetLocalStorage(STORAGE_KEYS.TICKET_TYPES, all);
    setDoc(doc(db, 'ticketTypes', ticketType.id), sanitizeForFirestore(ticketType)).catch((err) =>
      logFirestoreError(err, 'write', `ticketTypes/${ticketType.id}`)
    );
    this.notify();
  }

  /**
   * Reconciles Single bookings #1–#13 so any earlier Rs/Rp 80.000 entries are
   * adjusted to Rp 70.000 both locally and in Cloud Firestore, updating Total Omset.
   */
  private reconcileSingleBookingPrices(bookings: Booking[], syncFirestore = false): Booking[] {
    const singleSorted = [...bookings]
      .filter((b) => {
        if (b.paymentStatus === 'expired') return false;
        const isExplicitSingle = b.ticketTypeId === 'tt_alas_single';
        const isLegacySingle =
          !b.ticketTypeId?.includes('couple') &&
          !b.ticketTypeId?.includes('circle') &&
          b.totalAmount === SINGLE_REGULAR_PRICE &&
          (b.quantity || 1) === 1;
        return isExplicitSingle || isLegacySingle;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const priceOverrides = new Map<string, number>();
    let slotCursor = 0;

    for (const b of singleSorted) {
      const qty = Math.max(1, b.quantity || 1);
      const startSlot = slotCursor;
      slotCursor += qty;

      if (startSlot < SINGLE_PROMO_LIMIT) {
        const expectedAmount = this.calculateSingleTotal(qty, startSlot);
        if (b.totalAmount > expectedAmount) {
          priceOverrides.set(b.id, expectedAmount);
          if (syncFirestore && !this.syncedBookingPriceIds.has(b.id)) {
            this.syncedBookingPriceIds.add(b.id);
            updateDoc(doc(db, 'bookings', b.id), { totalAmount: expectedAmount }).catch((err) =>
              logFirestoreError(err, 'update', `bookings/${b.id}`)
            );
          }
        }
      }
    }

    if (priceOverrides.size === 0) return bookings;
    return bookings.map((b) =>
      priceOverrides.has(b.id) ? { ...b, totalAmount: priceOverrides.get(b.id)! } : b
    );
  }

  // --- Device-Local Purchase History (Strictly scoped to THIS smartphone/browser) ---
  private recordDevicePurchase(booking: Booking, tickets: IssuedTicket[]) {
    if (typeof window === 'undefined') return;
    try {
      const rawBookings = localStorage.getItem(STORAGE_KEYS.MY_LOCAL_BOOKINGS);
      const localBookings: Booking[] = rawBookings ? JSON.parse(rawBookings) : [];
      const filteredBookings = localBookings.filter((b) => b.id !== booking.id);
      filteredBookings.unshift(booking);
      safeSetLocalStorage(STORAGE_KEYS.MY_LOCAL_BOOKINGS, filteredBookings);

      const rawTickets = localStorage.getItem(STORAGE_KEYS.MY_LOCAL_TICKETS);
      const localTickets: IssuedTicket[] = rawTickets ? JSON.parse(rawTickets) : [];
      const newIds = new Set(tickets.map((t) => t.id));
      const filteredTickets = localTickets.filter((t) => !newIds.has(t.id));
      safeSetLocalStorage(STORAGE_KEYS.MY_LOCAL_TICKETS, [...tickets, ...filteredTickets]);
    } catch {
      // ignore local storage restriction
    }
  }

  public getMyDevicePurchases(): Array<{ booking: Booking; tickets: IssuedTicket[] }> {
    if (typeof window === 'undefined') return [];
    try {
      const rawBookings = localStorage.getItem(STORAGE_KEYS.MY_LOCAL_BOOKINGS);
      const localBookings: Booking[] = rawBookings ? JSON.parse(rawBookings) : [];
      if (localBookings.length === 0) return [];

      const rawTickets = localStorage.getItem(STORAGE_KEYS.MY_LOCAL_TICKETS);
      const localTickets: IssuedTicket[] = rawTickets ? JSON.parse(rawTickets) : [];

      const liveBookings = this.getBookings();
      const liveTickets = this.getIssuedTickets();
      const liveBookingsMap = new Map(liveBookings.map((b) => [b.id, b]));

      const results: Array<{ booking: Booking; tickets: IssuedTicket[] }> = [];

      for (const localBkg of localBookings) {
        const liveBkg = liveBookingsMap.get(localBkg.id);
        // If cloud snapshot is synced and admin deleted this booking, omit it from device history
        if (this.hasFirestoreBookingsSync && !liveBkg) {
          continue;
        }

        const mergedBooking: Booking = liveBkg
          ? {
              ...localBkg,
              ...liveBkg,
              paymentProofUrl: liveBkg.paymentProofUrl || localBkg.paymentProofUrl,
            }
          : localBkg;

        const matchingLiveTickets = liveTickets.filter((t) => t.bookingId === localBkg.id);
        const matchingLocalTickets = localTickets.filter((t) => t.bookingId === localBkg.id);
        const tickets = matchingLiveTickets.length > 0 ? matchingLiveTickets : matchingLocalTickets;

        results.push({ booking: mergedBooking, tickets });
      }

      results.sort(
        (a, b) => new Date(b.booking.createdAt).getTime() - new Date(a.booking.createdAt).getTime()
      );
      return results;
    } catch {
      return [];
    }
  }

  // --- Bookings & Concurrency Quota Hold (FR-BKG-02) ---
  public getBookings(): Booking[] {
    try {
      if (this.bookingsCache) return this.bookingsCache;
      const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (data !== null) {
        const parsed: Booking[] = JSON.parse(data);
        const reconciled = this.reconcileSingleBookingPrices(parsed, true);
        this.bookingsCache = reconciled;
        return reconciled;
      }
      return isCleared ? [] : INITIAL_BOOKINGS;
    } catch {
      return [];
    }
  }

  /**
   * Delete a single booking and all its associated issued tickets from local & Firestore
   */
  public async deleteBooking(bookingId: string): Promise<{ success: boolean; message: string }> {
    if (!this.assertAuthorizedRole(['super_admin'])) {
      return { success: false, message: 'Akses ditolak: hanya Super Admin yang dapat menghapus transaksi.' };
    }
    const currentBookings = this.getBookings();
    const targetBooking = currentBookings.find((b) => b.id === bookingId);
    const updatedBookings = currentBookings.filter((b) => b.id !== bookingId);
    this.bookingsCache = updatedBookings;
    safeSetLocalStorage(STORAGE_KEYS.BOOKINGS, updatedBookings);

    // Also remove associated issued tickets
    const currentTickets = this.getIssuedTickets();
    const ticketsToDelete = currentTickets.filter((t) => t.bookingId === bookingId);
    const remainingTickets = currentTickets.filter((t) => t.bookingId !== bookingId);
    this.issuedTicketsCache = remainingTickets;
    safeSetLocalStorage(STORAGE_KEYS.ISSUED_TICKETS, remainingTickets);

    // Also remove checkInLogs for those tickets
    const currentLogs = this.getLogs();
    const ticketIdsToDelete = new Set(ticketsToDelete.map((t) => t.id));
    const remainingLogs = currentLogs.filter((l) => !l.issuedTicketId || !ticketIdsToDelete.has(l.issuedTicketId));
    this.logsCache = remainingLogs;
    safeSetLocalStorage(STORAGE_KEYS.LOGS, remainingLogs);

    // Delete in Firestore and resync live tier quotas
    try {
      await Promise.all([
        deleteDoc(doc(db, 'bookings', bookingId)),
        ...ticketsToDelete.map((t) => deleteDoc(doc(db, 'issuedTickets', t.id))),
      ]);
    } catch (err) {
      logFirestoreError(err, 'delete', `bookings/${bookingId}`);
    }

    this.reconcileTicketTypesWithActualData(true);
    this.notify();
    return {
      success: true,
      message: `Transaksi ${targetBooking?.invoiceCode || bookingId} beserta ${ticketsToDelete.length} tiket terkait berhasil dihapus.`,
    };
  }

  /**
   * Creates a checkout booking and locks temporary quota (FR-BKG-02)
   * With 30-minute expiration window
   */
  public createBooking(params: {
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    eventId: string;
    ticketTypeId: string;
    quantity: number;
    attendees: Array<{ name: string; email: string; phone: string; origin: string }>;
  }): { success: boolean; booking?: Booking; error?: string } {
    const safeQuantity = Math.max(1, Math.min(20, Math.floor(params.quantity || 1)));
    const ticketTypes = [...this.getTicketTypes()];
    const ttIndex = ticketTypes.findIndex((t) => t.id === params.ticketTypeId);
    if (ttIndex === -1) {
      return { success: false, error: 'Kategori tiket tidak ditemukan.' };
    }

    const targetTT = { ...ticketTypes[ttIndex] };
    if (targetTT.availableQuota < safeQuantity) {
      return {
        success: false,
        error: `Sisa kuota tiket tidak mencukupi (Tersisa: ${targetTT.availableQuota}, Diminta: ${safeQuantity}).`,
      };
    }

    // 2. Pessimistic local lock reduction: deduct available quota, add to heldQuota
    targetTT.availableQuota -= safeQuantity;
    targetTT.heldQuota = (targetTT.heldQuota || 0) + safeQuantity;
    ticketTypes[ttIndex] = targetTT;
    this.ticketTypesCache = ticketTypes;
    safeSetLocalStorage(STORAGE_KEYS.TICKET_TYPES, ticketTypes);

    // Calculate booking total amount (with Single tiered pricing: #1–13 = Rp 70.000, #14+ = Rp 80.000)
    const computedTotalAmount =
      params.ticketTypeId === 'tt_alas_single'
        ? this.calculateSingleTotal(safeQuantity)
        : targetTT.price * safeQuantity;

    // 3. Generate booking with collision-proof ID and 30 minute expiration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const invoiceNum = Math.floor(1000 + Math.random() * 9000);
    const invoiceCode = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${invoiceNum}`;
    const bookingId = `bkg_${Date.now()}_${generateUniqueSuffix(5)}`;

    const cleanCustomerName = sanitizeText(params.customerName, 120);
    const cleanCustomerEmail = sanitizeEmail(params.customerEmail);
    const cleanCustomerPhone = sanitizePhone(params.customerPhone);
    const cleanAttendees = params.attendees.map((att) => ({
      name: sanitizeText(att.name, 120) || cleanCustomerName,
      email: sanitizeEmail(att.email) || cleanCustomerEmail,
      phone: sanitizePhone(att.phone) || cleanCustomerPhone,
      origin: sanitizeText(att.origin, 150) || 'Umum',
    }));

    const newBooking: Booking = {
      id: bookingId,
      userId: params.userId,
      customerName: cleanCustomerName,
      customerEmail: cleanCustomerEmail,
      customerPhone: cleanCustomerPhone,
      eventId: params.eventId,
      invoiceCode,
      totalAmount: computedTotalAmount,
      paymentStatus: 'pending',
      createdAt: now.toISOString(),
      expiresAt,
      ticketTypeId: params.ticketTypeId,
      quantity: safeQuantity,
    };

    const bookings = [newBooking, ...this.getBookings()];
    this.bookingsCache = bookings;

    // Save temporary attendee draft both in-memory AND sessionStorage (safe for WhatsApp/Instagram mobile WebViews)
    this.pendingAttendeesMap.set(newBooking.id, cleanAttendees);
    try {
      sessionStorage.setItem(`booking_attendees_${newBooking.id}`, JSON.stringify(cleanAttendees));
    } catch {
      // memory map already holds attendees
    }

    this.notify();
    return { success: true, booking: newBooking };
  }

  /**
   * Process Payment & persist Booking + Proof + All Attendee Tickets to Cloud Firestore
   * Guarantees that submissions from ANY smartphone automatically aggregate into the single Admin Dashboard.
   */
  public async completePayment(
    bookingId: string,
    paymentMethod: PaymentMethod = 'qris',
    paymentProofUrl?: string,
    senderName?: string
  ): Promise<{ success: boolean; error?: string }> {
    const bookings = [...this.getBookings()];
    const bIndex = bookings.findIndex((b) => b.id === bookingId);
    if (bIndex === -1) return { success: false, error: 'Transaksi booking tidak ditemukan.' };

    const booking: Booking = { ...bookings[bIndex] };
    if (booking.paymentStatus === 'paid') return { success: true };

    if (paymentProofUrl) {
      const isValidProof = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(paymentProofUrl);
      if (!isValidProof || paymentProofUrl.length > 900_000) {
        return { success: false, error: 'Format atau ukuran gambar bukti transfer tidak valid.' };
      }
    }

    const now = new Date().toISOString();
    booking.paymentStatus = 'paid';
    booking.verificationStatus = 'pending_verification';
    booking.paymentMethod = sanitizeText(paymentMethod, 30) || 'qris';
    if (paymentProofUrl) {
      booking.paymentProofUrl = paymentProofUrl;
      booking.proofUploadedAt = now;
    }
    const cleanSender = sanitizeText(senderName || '', 120);
    if (cleanSender) {
      booking.senderName = cleanSender;
    }
    booking.paidAt = now;

    // Resolve attendees from in-memory map first, then sessionStorage fallback
    let attendeesList = this.pendingAttendeesMap.get(booking.id);
    if (!attendeesList) {
      try {
        const storedAttendees = sessionStorage.getItem(`booking_attendees_${booking.id}`);
        if (storedAttendees) attendeesList = JSON.parse(storedAttendees);
      } catch {
        // fallback below
      }
    }
    if (!attendeesList || attendeesList.length === 0) {
      attendeesList = [
        {
          name: booking.customerName,
          email: booking.customerEmail,
          phone: booking.customerPhone,
          origin: 'Umum',
        },
      ];
    }

    const ticketTypes = [...this.getTicketTypes()];
    const ttIndex = ticketTypes.findIndex((t) => t.id === booking.ticketTypeId);
    const ticketType = ttIndex >= 0 ? { ...ticketTypes[ttIndex] } : undefined;
    if (ticketType) {
      ticketType.heldQuota = Math.max(0, (ticketType.heldQuota || 0) - booking.quantity);
      ticketTypes[ttIndex] = ticketType;
    }

    const existingIssued = this.getIssuedTickets();
    const newIssued: IssuedTicket[] = [];
    const baseTimestamp = Date.now();

    attendeesList.forEach((att, idx) => {
      const origin = sanitizeText(att.origin || 'Umum', 150) || 'Umum';
      newIssued.push({
        id: `tkt_${baseTimestamp}_${idx}_${generateUniqueSuffix(4)}`,
        bookingId: booking.id,
        eventId: booking.eventId,
        ticketTypeId: booking.ticketTypeId,
        ticketTypeName: ticketType?.name || 'Standard Pass',
        attendeeName: sanitizeText(att.name, 120),
        attendeeEmail: sanitizeEmail(att.email),
        attendeePhone: sanitizePhone(att.phone),
        attendeeOrigin: origin,
        packageName: ticketType?.name || 'Single',
        packageMemberIndex: idx + 1,
        packageTotalMembers: attendeesList!.length,
        packageGroupName: `Paket ${ticketType?.name || 'Tiket'} (${attendeesList!.length} Orang)`,
        ticketNumber: generateRandomTicketNumber(),
        qrToken: generateUUID(),
        status: 'valid',
        verificationStatus: 'pending_verification',
        seat_or_gate: `Gate Utama Kalura Garden - Area ${ticketType?.name || 'Workshop'}`,
      });
    });

    // Write directly to Cloud Firestore and await confirmation BEFORE returning success to the buyer's phone
    try {
      const firestoreWrites: Promise<unknown>[] = [
        setDoc(doc(db, 'bookings', booking.id), sanitizeForFirestore(booking)),
        ...newIssued.map((t) => setDoc(doc(db, 'issuedTickets', t.id), sanitizeForFirestore(t))),
      ];

      if (ticketType) {
        const ttRef = doc(db, 'ticketTypes', ticketType.id);
        const isSingleTier = ticketType.id === 'tt_alas_single';
        const projectedSingleCount =
          this.getIssuedTickets().filter(
            (t) => t.ticketTypeId === 'tt_alas_single' || t.packageName?.toLowerCase() === 'single'
          ).length + (isSingleTier ? newIssued.length : 0);
        const nextSinglePrice =
          projectedSingleCount < SINGLE_PROMO_LIMIT ? SINGLE_PROMO_PRICE : SINGLE_REGULAR_PRICE;

        firestoreWrites.push(
          runTransaction(db, async (tx) => {
            const snap = await tx.get(ttRef);
            if (!snap.exists()) {
              tx.set(
                ttRef,
                sanitizeForFirestore(
                  isSingleTier ? { ...ticketType, price: nextSinglePrice } : ticketType
                )
              );
              return;
            }
            const currentData = snap.data() as TicketType;
            const updatedAvailable = Math.max(0, (currentData.availableQuota ?? ticketType.quota) - booking.quantity);
            if (isSingleTier) {
              tx.update(ttRef, { availableQuota: updatedAvailable, price: nextSinglePrice });
            } else {
              tx.update(ttRef, { availableQuota: updatedAvailable });
            }
          })
        );
      }

      await Promise.all(firestoreWrites);
    } catch (err) {
      logFirestoreError(err, 'write', `completePayment/${booking.id}`);
      return {
        success: false,
        error: 'Gagal mengirim data & bukti pembayaran ke server pusat Admin. Pastikan koneksi internet stabil dan coba kirim ulang.',
      };
    }

    // Update local state caches & cleanup temp map after confirmed cloud write
    bookings[bIndex] = booking;
    this.bookingsCache = bookings;

    const updatedIssued = [...newIssued, ...existingIssued];
    this.issuedTicketsCache = updatedIssued;

    if (this.getCurrentUser().role !== 'customer') {
      safeSetLocalStorage(STORAGE_KEYS.BOOKINGS, bookings);
      safeSetLocalStorage(STORAGE_KEYS.ISSUED_TICKETS, updatedIssued);
    }

    this.ticketTypesCache = ticketTypes;
    safeSetLocalStorage(STORAGE_KEYS.TICKET_TYPES, ticketTypes);

    // Record this purchase exclusively inside THIS device's local history
    this.recordDevicePurchase(booking, newIssued);

    this.pendingAttendeesMap.delete(booking.id);
    try {
      sessionStorage.removeItem(`booking_attendees_${booking.id}`);
    } catch {
      // ignore
    }

    this.notify();
    return { success: true };
  }

  /**
   * Admin approves and verifies booking payment proof, activating official E-Tickets
   */
  public verifyBookingAndTickets(bookingId: string, adminUser: User): { success: boolean; message: string } {
    const activeAdmin = this.assertAuthorizedRole(['super_admin']);
    if (!activeAdmin) {
      return { success: false, message: 'Akses ditolak: Anda harus login sebagai Super Admin.' };
    }
    const bookings = [...this.getBookings()];
    const bIndex = bookings.findIndex((b) => b.id === bookingId);
    const now = new Date().toISOString();
    if (bIndex >= 0) {
      bookings[bIndex] = {
        ...bookings[bIndex],
        verificationStatus: 'verified',
        verifiedAt: now,
        verifiedBy: adminUser.name,
      };
      this.bookingsCache = bookings;
      if (this.getCurrentUser().role !== 'customer') {
        safeSetLocalStorage(STORAGE_KEYS.BOOKINGS, bookings);
      }
      updateDoc(doc(db, 'bookings', bookingId), {
        verificationStatus: 'verified',
        verifiedAt: now,
        verifiedBy: adminUser.name,
      }).catch(() =>
        setDoc(doc(db, 'bookings', bookingId), sanitizeForFirestore(bookings[bIndex])).catch((err) =>
          logFirestoreError(err, 'update', `bookings/${bookingId}`)
        )
      );
    }

    const allTickets = [...this.getIssuedTickets()];
    let updatedCount = 0;
    allTickets.forEach((t, i) => {
      if (t.bookingId === bookingId) {
        const updatedTicket: IssuedTicket = {
          ...t,
          verificationStatus: 'verified',
          verifiedAt: now,
          verifiedBy: adminUser.name,
        };
        allTickets[i] = updatedTicket;
        updatedCount++;
        updateDoc(doc(db, 'issuedTickets', t.id), {
          verificationStatus: 'verified',
          verifiedAt: now,
          verifiedBy: adminUser.name,
        }).catch(() =>
          setDoc(doc(db, 'issuedTickets', t.id), sanitizeForFirestore(updatedTicket)).catch((err) =>
            logFirestoreError(err, 'update', `issuedTickets/${t.id}`)
          )
        );
      }
    });

    if (updatedCount > 0) {
      this.issuedTicketsCache = allTickets;
      if (this.getCurrentUser().role !== 'customer') {
        safeSetLocalStorage(STORAGE_KEYS.ISSUED_TICKETS, allTickets);
      }
    }

    this.notify();
    return { success: true, message: `Berhasil memverifikasi pembayaran dan menerbitkan ${updatedCount} tiket peserta.` };
  }

  /**
   * Cancel expired bookings and restore quota (FR-BKG-04 / Laravel Scheduler simulation)
   */
  public cancelExpiredBookings() {
    const bookings = [...this.getBookings()];
    const now = new Date().getTime();
    let updated = false;
    const ticketTypes = [...this.getTicketTypes()];

    bookings.forEach((b, idx) => {
      if (b.paymentStatus === 'pending' && new Date(b.expiresAt).getTime() < now) {
        bookings[idx] = { ...b, paymentStatus: 'expired' };
        updated = true;

        // Restore available quota
        const ttIdx = ticketTypes.findIndex((t) => t.id === b.ticketTypeId);
        if (ttIdx >= 0) {
          ticketTypes[ttIdx] = {
            ...ticketTypes[ttIdx],
            availableQuota: ticketTypes[ttIdx].availableQuota + b.quantity,
            heldQuota: Math.max(0, (ticketTypes[ttIdx].heldQuota || 0) - b.quantity),
          };
        }
      }
    });

    if (updated) {
      this.bookingsCache = bookings;
      this.ticketTypesCache = ticketTypes;
      safeSetLocalStorage(STORAGE_KEYS.BOOKINGS, bookings);
      safeSetLocalStorage(STORAGE_KEYS.TICKET_TYPES, ticketTypes);
      this.notify();
    }
  }

  // --- Issued Tickets & Gate Validation (FR-CHK-01, FR-CHK-02, FR-CHK-03) ---
  public getIssuedTickets(eventId?: string): IssuedTicket[] {
    try {
      if (this.issuedTicketsCache) {
        return eventId ? this.issuedTicketsCache.filter((t) => t.eventId === eventId) : this.issuedTicketsCache;
      }
      const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';
      const data = localStorage.getItem(STORAGE_KEYS.ISSUED_TICKETS);
      const all: IssuedTicket[] = data !== null ? JSON.parse(data) : (isCleared ? [] : INITIAL_ISSUED_TICKETS);
      this.issuedTicketsCache = all;
      return eventId ? all.filter((t) => t.eventId === eventId) : all;
    } catch {
      return [];
    }
  }

  /**
   * Delete an individual issued ticket from local & Firestore
   */
  public async deleteIssuedTicket(ticketId: string): Promise<{ success: boolean; message: string }> {
    if (!this.assertAuthorizedRole(['super_admin'])) {
      return { success: false, message: 'Akses ditolak: hanya Super Admin yang dapat menghapus tiket.' };
    }
    const currentTickets = this.getIssuedTickets();
    const targetTicket = currentTickets.find((t) => t.id === ticketId);
    const updatedTickets = currentTickets.filter((t) => t.id !== ticketId);
    this.issuedTicketsCache = updatedTickets;
    safeSetLocalStorage(STORAGE_KEYS.ISSUED_TICKETS, updatedTickets);

    // Also remove logs for this ticket
    const currentLogs = this.getLogs();
    const updatedLogs = currentLogs.filter((l) => l.issuedTicketId !== ticketId);
    this.logsCache = updatedLogs;
    safeSetLocalStorage(STORAGE_KEYS.LOGS, updatedLogs);

    try {
      await deleteDoc(doc(db, 'issuedTickets', ticketId));
    } catch (err) {
      logFirestoreError(err, 'delete', `issuedTickets/${ticketId}`);
    }

    this.reconcileTicketTypesWithActualData(true);
    this.notify();
    return {
      success: true,
      message: `E-Ticket ${targetTicket?.ticketNumber || ticketId} milik ${targetTicket?.attendeeName || 'peserta'} berhasil dihapus.`,
    };
  }

  /**
   * High-Speed Gate QR Validation with Pessimistic Locking & Anti-Double Scan
   * Latency target: < 500ms
   */
  public validateGateQR(
    qrToken: string,
    staff: User,
    deviceInfo = 'Gate Terminal Web Scanner'
  ): {
    result: CheckInResult;
    ticket?: IssuedTicket;
    message: string;
    checkedInAt?: string;
    checkedInBy?: string;
    latencyMs: number;
  } {
    const startTime = performance.now();
    if (!this.assertAuthorizedRole(['super_admin', 'gate_staff', 'gate_supervisor'])) {
      return {
        result: 'invalid_token',
        message: 'AKSES DITOLAK: Anda harus login sebagai Petugas Gate atau Admin resmi.',
        latencyMs: Math.round(performance.now() - startTime),
      };
    }
    const cleanToken = qrToken.trim();
    const allTickets = this.getIssuedTickets();

    const ticketIndex = allTickets.findIndex((t) => t.qrToken.toLowerCase() === cleanToken.toLowerCase());

    if (ticketIndex === -1) {
      const latencyMs = Math.round(performance.now() - startTime);
      this.recordLog({
        staffId: staff.id,
        staffName: staff.name,
        method: 'qr_scanner',
        result: 'invalid_token',
        message: 'QR Token tidak terdaftar atau palsu',
        deviceInfo,
        gateName: staff.staffGate || 'Gate Utama',
      });
      return {
        result: 'invalid_token',
        message: 'TIKET TIDAK TERDAFTAR: QR Code tidak ditemukan di database.',
        latencyMs,
      };
    }

    const ticket = allTickets[ticketIndex];

    // Anti-Double Scan Check
    if (ticket.status === 'checked-in') {
      const latencyMs = Math.round(performance.now() - startTime);
      this.recordLog({
        issuedTicketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        staffId: staff.id,
        staffName: staff.name,
        method: 'qr_scanner',
        result: 'duplicate_scan',
        message: `Percobaan scan ganda! Tiket telah masuk sebelumnya pada ${ticket.checkedInAt} oleh ${ticket.checkedInBy}`,
        deviceInfo,
        gateName: staff.staffGate || 'Gate Utama',
      });
      return {
        result: 'duplicate_scan',
        ticket,
        message: `PERINGATAN: TIKET SUDAH DIPAKAI! Sebelumnya telah check-in pada ${new Date(ticket.checkedInAt || '').toLocaleTimeString('id-ID')} WIB oleh ${ticket.checkedInBy || 'Petugas'}.`,
        checkedInAt: ticket.checkedInAt,
        checkedInBy: ticket.checkedInBy,
        latencyMs,
      };
    }

    if (ticket.status === 'revoked') {
      const latencyMs = Math.round(performance.now() - startTime);
      return {
        result: 'unpaid',
        ticket,
        message: 'TIKET TELAH DIBATALKAN / REVOKED OLEH SUPER ADMIN.',
        latencyMs,
      };
    }

    // Success check-in! Lock immediately
    const checkInTime = new Date().toISOString();
    const allTicketsCopy = [...allTickets];
    const updatedTicket: IssuedTicket = {
      ...ticket,
      status: 'checked-in',
      checkedInAt: checkInTime,
      checkedInBy: staff.name,
      gateName: staff.staffGate || 'Gate Utama',
      checkInMethod: 'qr_scanner',
    };

    allTicketsCopy[ticketIndex] = updatedTicket;
    this.issuedTicketsCache = allTicketsCopy;
    safeSetLocalStorage(STORAGE_KEYS.ISSUED_TICKETS, allTicketsCopy);

    // Sync check-in to Firestore
    updateDoc(doc(db, 'issuedTickets', ticket.id), {
      status: 'checked-in',
      checkedInAt: checkInTime,
      checkedInBy: staff.name,
      gateName: staff.staffGate || 'Gate Utama',
      checkInMethod: 'qr_scanner',
    }).catch((err) => logFirestoreError(err, 'update', `issuedTickets/${ticket.id}`));

    const latencyMs = Math.round(performance.now() - startTime);

    this.recordLog({
      issuedTicketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      attendeeName: ticket.attendeeName,
      staffId: staff.id,
      staffName: staff.name,
      method: 'qr_scanner',
      result: 'success',
      message: `Check-in sah berhasil untuk ${ticket.attendeeName} (${ticket.ticketTypeName})`,
      deviceInfo,
      gateName: staff.staffGate || 'Gate Utama',
    });

    this.notify();

    return {
      result: 'success',
      ticket,
      message: 'TIKET SAH & VALID: Silakan masuk.',
      checkedInAt: checkInTime,
      checkedInBy: staff.name,
      latencyMs,
    };
  }

  // --- Supervisor Manual Verification (FR-CHK-04 & NFR-SEC-02) ---
  /**
   * Search ticket by ticket_number (8 chars) or Attendee Name
   * Protected with Rate Limiting: max 5 attempts/minute
   */
  public searchTicketForSupervisor(
    query: string,
    supervisor: User
  ): {
    success: boolean;
    rateLimited?: boolean;
    remainingAttempts?: number;
    tickets?: IssuedTicket[];
    error?: string;
  } {
    if (!this.assertAuthorizedRole(['super_admin', 'gate_supervisor'])) {
      return {
        success: false,
        error: 'AKSES DITOLAK: Modul helpdesk hanya dapat diakses oleh Supervisor atau Super Admin.',
      };
    }
    // Check Rate Limiter
    const rateLimitCheck = this.checkRateLimit();
    if (!rateLimitCheck.allowed) {
      this.recordLog({
        staffId: supervisor.id,
        staffName: supervisor.name,
        method: 'manual_supervisor',
        result: 'rate_limited',
        message: 'Rate limit tercapai (Maksimal 5 pencarian per menit terlampaui)',
        deviceInfo: 'Supervisor Terminal',
        gateName: supervisor.staffGate || 'Posko Helpdesk',
      });
      return {
        success: false,
        rateLimited: true,
        remainingAttempts: 0,
        error: 'BATAS AMAN TERLAMPAUI: Maksimal 5 pencarian manual per menit. Mohon tunggu sejenak demi keamanan anti brute-force.',
      };
    }

    const cleanQuery = query.trim().toUpperCase();
    if (!cleanQuery) {
      return { success: false, error: 'Masukkan kode tiket atau nama pengunjung.' };
    }

    const all = this.getIssuedTickets();
    const matches = all.filter(
      (t) =>
        t.ticketNumber.toUpperCase().includes(cleanQuery) ||
        t.attendeeName.toUpperCase().includes(cleanQuery) ||
        (t.attendeeOrigin && t.attendeeOrigin.toUpperCase().includes(cleanQuery)) ||
        (t.attendeeNik && t.attendeeNik.toUpperCase().includes(cleanQuery)) ||
        t.attendeeEmail.toUpperCase().includes(cleanQuery)
    );

    return {
      success: true,
      remainingAttempts: rateLimitCheck.remaining,
      tickets: matches,
    };
  }

  /**
   * Confirm Manual Check-In by Supervisor with Asal/Lembaga verification
   */
  public supervisorManualCheckIn(params: {
    ticketId: string;
    enteredOrigin?: string;
    enteredNik?: string;
    enteredIdLast4?: string;
    supervisorNote: string;
    supervisor: User;
  }): { success: boolean; message: string; result: CheckInResult; ticket?: IssuedTicket } {
    if (!this.assertAuthorizedRole(['super_admin', 'gate_supervisor'])) {
      return {
        success: false,
        message: 'AKSES DITOLAK: Hanya Supervisor atau Super Admin yang dapat melakukan verifikasi manual.',
        result: 'invalid_token',
      };
    }
    const all = this.getIssuedTickets();
    const idx = all.findIndex((t) => t.id === params.ticketId);
    if (idx === -1) {
      return { success: false, message: 'Tiket tidak ditemukan.', result: 'invalid_token' };
    }

    const ticket = all[idx];
    const safeSupervisorNote = sanitizeText(params.supervisorNote, 300) || 'Verifikasi manual oleh supervisor.';
    const cleanEntered = sanitizeText(params.enteredOrigin || params.enteredNik || params.enteredIdLast4 || '', 150).toUpperCase();
    const storedOrigin = (ticket.attendeeOrigin || '').trim().toUpperCase();
    const storedNik = (ticket.attendeeNik || '').trim().toUpperCase();
    const storedLast4 = (ticket.attendeeIdLast4 || '').trim().toUpperCase();

    const isIdentityMatch =
      cleanEntered.length >= 2 &&
      ((storedOrigin && (storedOrigin === cleanEntered || storedOrigin.includes(cleanEntered))) ||
        (storedNik && (cleanEntered === storedNik || storedNik.endsWith(cleanEntered))) ||
        (storedLast4 && cleanEntered === storedLast4));

    if (!isIdentityMatch) {
      this.recordLog({
        issuedTicketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        staffId: params.supervisor.id,
        staffName: params.supervisor.name,
        method: 'manual_supervisor',
        result: 'invalid_token',
        message: `Gagal verifikasi identitas: Asal/Lembaga tidak cocok (Dimasukkan: ${cleanEntered})`,
        deviceInfo: 'Supervisor Helpdesk',
        gateName: params.supervisor.staffGate || 'Posko Helpdesk',
      });
      return {
        success: false,
        message: `VERIFIKASI GAGAL: Asal/Lembaga (${cleanEntered}) tidak sesuai dengan data terdaftar milik pengunjung.`,
        result: 'invalid_token',
      };
    }

    if (ticket.status === 'checked-in') {
      return {
        success: false,
        message: `PERINGATAN: Tiket ini telah check-in sebelumnya pada ${new Date(ticket.checkedInAt || '').toLocaleTimeString('id-ID')} WIB oleh ${ticket.checkedInBy}.`,
        result: 'duplicate_scan',
        ticket,
      };
    }

    // Success manual check-in
    const checkInTime = new Date().toISOString();
    const allCopy = [...all];
    const updatedTicket: IssuedTicket = {
      ...ticket,
      status: 'checked-in',
      checkedInAt: checkInTime,
      checkedInBy: `${params.supervisor.name} (Supervisor Helpdesk)`,
      gateName: params.supervisor.staffGate || 'Posko Helpdesk',
      checkInMethod: 'manual_supervisor',
      notes: safeSupervisorNote,
    };

    allCopy[idx] = updatedTicket;
    this.issuedTicketsCache = allCopy;
    safeSetLocalStorage(STORAGE_KEYS.ISSUED_TICKETS, allCopy);

    // Sync manual check-in to Firestore
    updateDoc(doc(db, 'issuedTickets', ticket.id), {
      status: 'checked-in',
      checkedInAt: checkInTime,
      checkedInBy: `${params.supervisor.name} (Supervisor Helpdesk)`,
      gateName: params.supervisor.staffGate || 'Posko Helpdesk',
      checkInMethod: 'manual_supervisor',
      notes: safeSupervisorNote,
    }).catch((err) => logFirestoreError(err, 'update', `issuedTickets/${ticket.id}`));

    this.recordLog({
      issuedTicketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      attendeeName: ticket.attendeeName,
      staffId: params.supervisor.id,
      staffName: params.supervisor.name,
      method: 'manual_supervisor',
      result: 'success',
      message: `Manual check-in berhasil diapprove supervisor. Catatan: ${safeSupervisorNote}`,
      deviceInfo: 'Supervisor Helpdesk Workstation',
      gateName: params.supervisor.staffGate || 'Posko Helpdesk',
    });

    this.notify();
    return {
      success: true,
      message: `VERIFIKASI MANUAL BERHASIL: Tiket ${ticket.ticketNumber} (${ticket.attendeeName}) telah dikonfirmasi masuk.`,
      result: 'success',
      ticket,
    };
  }

  // --- Rate Limiting Helper (NFR-SEC-02: max 5 / min) ---
  private checkRateLimit(): { allowed: boolean; remaining: number } {
    try {
      const now = Date.now();
      const raw = localStorage.getItem(STORAGE_KEYS.RATE_LIMIT_ATTEMPTS);
      let timestamps: number[] = raw ? JSON.parse(raw) : [];

      // Filter out timestamps older than 60 seconds
      timestamps = timestamps.filter((t) => now - t < 60000);

      if (timestamps.length >= 5) {
        return { allowed: false, remaining: 0 };
      }

      timestamps.push(now);
      localStorage.setItem(STORAGE_KEYS.RATE_LIMIT_ATTEMPTS, JSON.stringify(timestamps));
      return { allowed: true, remaining: 5 - timestamps.length };
    } catch {
      return { allowed: true, remaining: 5 };
    }
  }

  // --- Audit Logs (NFR-AUD-01) ---
  public getLogs(): CheckInLog[] {
    try {
      if (this.logsCache) return this.logsCache;
      const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (data !== null) {
        const parsed = JSON.parse(data);
        this.logsCache = parsed;
        return parsed;
      }
      return isCleared ? [] : INITIAL_LOGS;
    } catch {
      return [];
    }
  }

  private recordLog(log: Omit<CheckInLog, 'id' | 'scannedAt'>) {
    const logs = [...this.getLogs()];
    const newLog: CheckInLog = {
      id: `log_${Date.now()}_${generateUniqueSuffix(4)}`,
      scannedAt: new Date().toISOString(),
      ...log,
    };
    logs.unshift(newLog);
    const sliced = logs.slice(0, 150);
    this.logsCache = sliced;
    if (this.getCurrentUser().role !== 'customer') {
      safeSetLocalStorage(STORAGE_KEYS.LOGS, sliced);
    }

    // Sync log to Firestore
    setDoc(doc(db, 'checkInLogs', newLog.id), sanitizeForFirestore(newLog)).catch((err) =>
      logFirestoreError(err, 'write', `checkInLogs/${newLog.id}`)
    );

    this.notify();
  }

  // --- Concurrency / Race Condition Simulation (NFR-CON-01) ---
  /**
   * Demonstrates the difference between:
   * 1. Laravel DB::transaction with lockForUpdate() (Pessimistic Locking)
   * 2. Naive Read-then-Write without locking (Race Condition / Overselling)
   */
  public runConcurrencySimulation(usePessimisticLock: boolean): {
    totalRequests: number;
    availableBefore: number;
    successCount: number;
    failedCount: number;
    oversoldCount: number;
    logs: Array<{ requestIndex: number; success: boolean; message: string; delayMs: number }>;
  } {
    const totalRequests = 10;
    const initialSeats = 2; // only 2 seats available
    let availableQuota = initialSeats;
    let successCount = 0;
    let failedCount = 0;
    let oversoldCount = 0;
    const logs: Array<{ requestIndex: number; success: boolean; message: string; delayMs: number }> = [];

    if (usePessimisticLock) {
      // With lockForUpdate(): requests queue sequentially inside mutex/row lock
      for (let i = 1; i <= totalRequests; i++) {
        const delayMs = i * 15;
        if (availableQuota > 0) {
          availableQuota -= 1;
          successCount++;
          logs.push({
            requestIndex: i,
            success: true,
            message: `[THREAD ${i}] lockForUpdate() acquired: Kuota tersedia, booking berhasil (Sisa: ${availableQuota})`,
            delayMs,
          });
        } else {
          failedCount++;
          logs.push({
            requestIndex: i,
            success: false,
            message: `[THREAD ${i}] lockForUpdate() acquired: Kuota habis (0). Rollback transaksi, tolak pesanan.`,
            delayMs,
          });
        }
      }
    } else {
      // WITHOUT lock (Race Condition): all 10 threads read availableQuota == 2 at the same instant!
      for (let i = 1; i <= totalRequests; i++) {
        const delayMs = Math.floor(Math.random() * 20);
        // Thread reads initial quota without row lock:
        const perceivedQuota = initialSeats; // all read initial 2!
        if (perceivedQuota > 0 && Math.random() > 0.3) {
          // Unprotected decrement
          availableQuota -= 1;
          successCount++;
          logs.push({
            requestIndex: i,
            success: true,
            message: `[THREAD ${i}] (NO LOCK) Membaca kuota=2, commit booking! (Stok aktual menjadi: ${availableQuota})`,
            delayMs,
          });
        } else {
          failedCount++;
          logs.push({
            requestIndex: i,
            success: false,
            message: `[THREAD ${i}] Gagal akibat timeout sambungan`,
            delayMs,
          });
        }
      }
      if (availableQuota < 0) {
        oversoldCount = Math.abs(availableQuota);
      }
    }

    return {
      totalRequests,
      availableBefore: initialSeats,
      successCount,
      failedCount,
      oversoldCount,
      logs,
    };
  }
}

export const storageService = new StorageService();
