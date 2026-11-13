import { User, Event, TicketType, Booking, IssuedTicket, CheckInLog, CheckInResult, PaymentMethod } from '../types';
import { INITIAL_USERS, INITIAL_EVENTS, INITIAL_TICKET_TYPES, INITIAL_BOOKINGS, INITIAL_ISSUED_TICKETS, INITIAL_LOGS, ALAS_CERITA_PERKS } from '../data/mockData';
import { db } from '../firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, getDocs, onSnapshot } from 'firebase/firestore';

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
};

// Safe alphanumeric character set for visual ticket_number (omits ambiguous 0, O, 1, I)
const TICKET_NUMBER_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateRandomTicketNumber(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += TICKET_NUMBER_CHARS.charAt(Math.floor(Math.random() * TICKET_NUMBER_CHARS.length));
  }
  return `TCK-${code}`;
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

class StorageService {
  private listeners: Set<() => void> = new Set();
  private isFirestoreSynced = false;

  constructor() {
    this.initializeDefaults();
    this.initFirestoreSync();
  }

  private initFirestoreSync() {
    if (typeof window === 'undefined' || this.isFirestoreSynced) return;
    this.isFirestoreSynced = true;

    try {
      const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';

      // 1. Listen to Ticket Types and live quotas
      onSnapshot(collection(db, 'ticketTypes'), (snapshot) => {
        if (!snapshot.empty) {
          const list: TicketType[] = [];
          snapshot.forEach((d) => list.push(d.data() as TicketType));
          localStorage.setItem(STORAGE_KEYS.TICKET_TYPES, JSON.stringify(list));
          this.notify();
        } else if (!isCleared) {
          // Seed initial tiers to Firestore once
          INITIAL_TICKET_TYPES.forEach((tt) => {
            setDoc(doc(db, 'ticketTypes', tt.id), tt).catch(() => {});
          });
        }
      }, (err) => console.warn('Firestore ticketTypes sync notice:', err.message));

      // 2. Listen to Bookings (real-time reflection of orders)
      onSnapshot(collection(db, 'bookings'), (snapshot) => {
        const list: Booking[] = [];
        snapshot.forEach((d) => list.push(d.data() as Booking));
        localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(list));
        this.notify();
      }, (err) => console.warn('Firestore bookings sync notice:', err.message));

      // 3. Listen to Issued Tickets (real-time check-in and multi-device ticket pool)
      onSnapshot(collection(db, 'issuedTickets'), (snapshot) => {
        const list: IssuedTicket[] = [];
        snapshot.forEach((d) => list.push(d.data() as IssuedTicket));
        localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify(list));
        this.notify();
      }, (err) => console.warn('Firestore issuedTickets sync notice:', err.message));

      // 4. Listen to Gate Check-In Logs
      onSnapshot(collection(db, 'checkInLogs'), (snapshot) => {
        const list: CheckInLog[] = [];
        snapshot.forEach((d) => list.push(d.data() as CheckInLog));
        // Sort latest first
        list.sort((a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime());
        localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(list.slice(0, 150)));
        this.notify();
      }, (err) => console.warn('Firestore checkInLogs sync notice:', err.message));
    } catch (e) {
      console.warn('Firestore sync setup failed, operating on local cache:', e);
    }
  }

  private initializeDefaults() {
    if (typeof window === 'undefined') return;
    const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';

    if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TICKET_TYPES)) {
      localStorage.setItem(STORAGE_KEYS.TICKET_TYPES, JSON.stringify(INITIAL_TICKET_TYPES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(isCleared ? [] : INITIAL_BOOKINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ISSUED_TICKETS)) {
      localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify(isCleared ? [] : INITIAL_ISSUED_TICKETS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'usr_cust');
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(isCleared ? [] : INITIAL_LOGS));
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

  public async resetAllData(): Promise<{ success: boolean; message: string }> {
    if (typeof window === 'undefined') {
      return { success: true, message: 'Database dikembalikan ke data awal.' };
    }
    localStorage.removeItem(STORAGE_KEYS.SIMULATION_CLEARED);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
    localStorage.setItem(STORAGE_KEYS.TICKET_TYPES, JSON.stringify(INITIAL_TICKET_TYPES));
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
    localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify(INITIAL_ISSUED_TICKETS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));

    // Clean existing Firestore documents first, then re-seed initial sample data
    try {
      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      for (const d of bookingsSnap.docs) {
        await deleteDoc(doc(db, 'bookings', d.id));
      }

      const ticketsSnap = await getDocs(collection(db, 'issuedTickets'));
      for (const d of ticketsSnap.docs) {
        await deleteDoc(doc(db, 'issuedTickets', d.id));
      }

      const logsSnap = await getDocs(collection(db, 'checkInLogs'));
      for (const d of logsSnap.docs) {
        await deleteDoc(doc(db, 'checkInLogs', d.id));
      }

      for (const tt of INITIAL_TICKET_TYPES) {
        await setDoc(doc(db, 'ticketTypes', tt.id), tt);
      }
      for (const b of INITIAL_BOOKINGS) {
        await setDoc(doc(db, 'bookings', b.id), b);
      }
      for (const t of INITIAL_ISSUED_TICKETS) {
        await setDoc(doc(db, 'issuedTickets', t.id), t);
      }
      for (const l of INITIAL_LOGS) {
        await setDoc(doc(db, 'checkInLogs', l.id), l);
      }
    } catch (err) {
      console.warn('Firestore reset warning:', err);
    }

    this.notify();
    return {
      success: true,
      message: 'Database berhasil dikembalikan ke data awal contoh.',
    };
  }

  /**
   * Clears ALL simulation/dummy data permanently for live production use:
   * - Empties bookings (0 orders)
   * - Empties issued tickets (0 attendees)
   * - Empties gate check-in logs
   * - Restores ticket types to pristine 100% full capacity
   * - Cleans cloud Firestore documents
   */
  public async clearAllSimulationData(): Promise<{ success: boolean; message: string }> {
    if (typeof window === 'undefined') return { success: true, message: 'Data simulasi telah dibersihkan.' };

    // 1. Mark simulation as cleared permanently
    localStorage.setItem(STORAGE_KEYS.SIMULATION_CLEARED, 'true');

    // 2. Clear bookings, issuedTickets, logs in localStorage
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));

    // 3. Reset ticket tiers to full pristine quotas (ready for 100% production sales)
    const pristineTiers: TicketType[] = [
      {
        id: 'tt_alas_single',
        eventId: 'evt_alas_cerita_2026',
        name: 'Single',
        price: 80000,
        quota: 120,
        availableQuota: 120,
        heldQuota: 0,
        saleStart: '2026-11-01T00:00:00Z',
        saleEnd: '2026-12-04T23:59:59Z',
        description: 'Paket untuk 1 orang peserta. Semua paket mendapat fasilitas lengkap yang sama.',
        perks: ALAS_CERITA_PERKS,
      },
      {
        id: 'tt_alas_couple',
        eventId: 'evt_alas_cerita_2026',
        name: 'Couple',
        price: 155000,
        quota: 70,
        availableQuota: 70,
        heldQuota: 0,
        saleStart: '2026-11-01T00:00:00Z',
        saleEnd: '2026-12-04T23:59:59Z',
        description: 'Paket untuk 2 orang hadir bersama. Semua paket mendapat fasilitas lengkap yang sama.',
        perks: ALAS_CERITA_PERKS,
      },
      {
        id: 'tt_alas_circle',
        eventId: 'evt_alas_cerita_2026',
        name: 'Circle',
        price: 225000,
        quota: 50,
        availableQuota: 50,
        heldQuota: 0,
        saleStart: '2026-11-01T00:00:00Z',
        saleEnd: '2026-12-04T23:59:59Z',
        description: 'Paket untuk 3 orang / circle hadir bersama. Semua paket mendapat fasilitas lengkap yang sama.',
        perks: ALAS_CERITA_PERKS,
      },
    ];
    localStorage.setItem(STORAGE_KEYS.TICKET_TYPES, JSON.stringify(pristineTiers));

    // 4. Delete Firestore simulation documents in cloud
    try {
      for (const tier of pristineTiers) {
        await setDoc(doc(db, 'ticketTypes', tier.id), tier);
      }

      const bookingsSnap = await getDocs(collection(db, 'bookings'));
      for (const d of bookingsSnap.docs) {
        await deleteDoc(doc(db, 'bookings', d.id));
      }

      const ticketsSnap = await getDocs(collection(db, 'issuedTickets'));
      for (const d of ticketsSnap.docs) {
        await deleteDoc(doc(db, 'issuedTickets', d.id));
      }

      const logsSnap = await getDocs(collection(db, 'checkInLogs'));
      for (const d of logsSnap.docs) {
        await deleteDoc(doc(db, 'checkInLogs', d.id));
      }
    } catch (e) {
      console.warn('Firestore cloud cleanup notification:', e);
    }

    this.notify();
    return { 
      success: true, 
      message: 'Seluruh data simulasi berhasil dihapus. Dashboard transaksi dan peserta kini kosong dan siap digunakan untuk penjualan tiket asli!' 
    };
  }

  // --- Users & Current Active Role ---
  public getUsers(): User[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  public getCurrentUser(): User {
    const users = this.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'usr_cust';
    return users.find((u) => u.id === currentId) || users.find((u) => u.role === 'customer') || users[0];
  }

  public setCurrentUser(userId: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    this.notify();
  }

  // --- Events ---
  public getEvents(): Event[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
      const parsed: Event[] = data ? JSON.parse(data) : INITIAL_EVENTS;
      return parsed.map((evt) =>
        evt.id === 'evt_alas_cerita_2026'
          ? { ...evt, posterUrl: '/assets/aistudio/alas-cerita-poster_fb646400.jpeg' }
          : evt
      );
    } catch {
      return INITIAL_EVENTS;
    }
  }

  public saveEvent(event: Event) {
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
    const events = this.getEvents().filter((e) => e.id !== eventId);
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    this.notify();
  }

  // --- Ticket Types ---
  public getTicketTypes(eventId?: string): TicketType[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TICKET_TYPES);
      const all: TicketType[] = data ? JSON.parse(data) : INITIAL_TICKET_TYPES;
      return eventId ? all.filter((tt) => tt.eventId === eventId) : all;
    } catch {
      return INITIAL_TICKET_TYPES;
    }
  }

  public saveTicketType(ticketType: TicketType) {
    const all = this.getTicketTypes();
    const idx = all.findIndex((t) => t.id === ticketType.id);
    if (idx >= 0) {
      all[idx] = ticketType;
    } else {
      all.push(ticketType);
    }
    localStorage.setItem(STORAGE_KEYS.TICKET_TYPES, JSON.stringify(all));
    this.notify();
  }

  // --- Bookings & Concurrency Quota Hold (FR-BKG-02) ---
  public getBookings(): Booking[] {
    try {
      const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      if (data !== null) return JSON.parse(data);
      return isCleared ? [] : INITIAL_BOOKINGS;
    } catch {
      return [];
    }
  }

  /**
   * Delete a single booking and all its associated issued tickets from local & Firestore
   */
  public async deleteBooking(bookingId: string): Promise<{ success: boolean; message: string }> {
    const currentBookings = this.getBookings();
    const targetBooking = currentBookings.find((b) => b.id === bookingId);
    const updatedBookings = currentBookings.filter((b) => b.id !== bookingId);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(updatedBookings));

    // Also remove associated issued tickets
    const currentTickets = this.getIssuedTickets();
    const ticketsToDelete = currentTickets.filter((t) => t.bookingId === bookingId);
    const remainingTickets = currentTickets.filter((t) => t.bookingId !== bookingId);
    localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify(remainingTickets));

    // Also remove checkInLogs for those tickets
    const currentLogs = this.getLogs();
    const ticketIdsToDelete = new Set(ticketsToDelete.map((t) => t.id));
    const remainingLogs = currentLogs.filter((l) => !l.issuedTicketId || !ticketIdsToDelete.has(l.issuedTicketId));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(remainingLogs));

    // Delete in Firestore
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
      for (const t of ticketsToDelete) {
        await deleteDoc(doc(db, 'issuedTickets', t.id));
      }
    } catch (err) {
      console.warn('Firestore single booking deletion warning:', err);
    }

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
    attendees: Array<{ name: string; email: string; phone: string; idLast4: string }>;
  }): { success: boolean; booking?: Booking; error?: string } {
    // 1. Check ticket type quota with lock simulation
    const ticketTypes = this.getTicketTypes();
    const ttIndex = ticketTypes.findIndex((t) => t.id === params.ticketTypeId);
    if (ttIndex === -1) {
      return { success: false, error: 'Kategori tiket tidak ditemukan.' };
    }

    const targetTT = ticketTypes[ttIndex];
    if (targetTT.availableQuota < params.quantity) {
      return {
        success: false,
        error: `Sisa kuota tiket tidak mencukupi (Tersisa: ${targetTT.availableQuota}, Diminta: ${params.quantity}).`,
      };
    }

    // 2. Pessimistic lock reduction: deduct available quota, add to heldQuota
    targetTT.availableQuota -= params.quantity;
    targetTT.heldQuota = (targetTT.heldQuota || 0) + params.quantity;
    ticketTypes[ttIndex] = targetTT;
    localStorage.setItem(STORAGE_KEYS.TICKET_TYPES, JSON.stringify(ticketTypes));

    // 3. Generate booking with 30 minute expiration
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const invoiceNum = Math.floor(1000 + Math.random() * 9000);
    const invoiceCode = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${invoiceNum}`;

    const newBooking: Booking = {
      id: `bkg_${Date.now()}`,
      userId: params.userId,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      customerPhone: params.customerPhone,
      eventId: params.eventId,
      invoiceCode,
      totalAmount: targetTT.price * params.quantity,
      paymentStatus: 'pending',
      createdAt: now.toISOString(),
      expiresAt,
      ticketTypeId: params.ticketTypeId,
      quantity: params.quantity,
    };

    const bookings = this.getBookings();
    bookings.unshift(newBooking);
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

    // Save temporary attendee draft in session/local for when payment completes
    sessionStorage.setItem(`booking_attendees_${newBooking.id}`, JSON.stringify(params.attendees));

    this.notify();
    return { success: true, booking: newBooking };
  }

  /**
   * Process Payment / Webhook callback (FR-TKT-01 & FR-TKT-02)
   * Changes payment_status to 'paid', converts held quota to permanently sold,
   * and generates issued_tickets with dual identity (qr_token UUID + ticket_number 8-char).
   */
  public completePayment(
    bookingId: string, 
    paymentMethod: PaymentMethod = 'qris',
    paymentProofUrl?: string,
    senderName?: string
  ): { success: boolean; error?: string } {
    const bookings = this.getBookings();
    const bIndex = bookings.findIndex((b) => b.id === bookingId);
    if (bIndex === -1) return { success: false, error: 'Transaksi booking tidak ditemukan.' };

    const booking = bookings[bIndex];
    if (booking.paymentStatus === 'paid') return { success: true };

    const now = new Date().toISOString();
    booking.paymentStatus = 'paid';
    booking.verificationStatus = 'pending_verification';
    booking.paymentMethod = paymentMethod;
    if (paymentProofUrl) {
      booking.paymentProofUrl = paymentProofUrl;
      booking.proofUploadedAt = now;
    }
    if (senderName) {
      booking.senderName = senderName;
    }
    booking.paidAt = now;
    bookings[bIndex] = booking;
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));

    // Release heldQuota permanently
    const ticketTypes = this.getTicketTypes();
    const ttIndex = ticketTypes.findIndex((t) => t.id === booking.ticketTypeId);
    if (ttIndex >= 0) {
      ticketTypes[ttIndex].heldQuota = Math.max(0, (ticketTypes[ttIndex].heldQuota || 0) - booking.quantity);
      localStorage.setItem(STORAGE_KEYS.TICKET_TYPES, JSON.stringify(ticketTypes));
    }

    // Generate Issued Tickets
    const storedAttendees = sessionStorage.getItem(`booking_attendees_${booking.id}`);
    const attendeesList: Array<{ name: string; email: string; phone: string; nik?: string; idLast4?: string }> = storedAttendees
      ? JSON.parse(storedAttendees)
      : Array.from({ length: booking.quantity }).map((_, i) => ({
          name: `${booking.customerName} #${i + 1}`,
          email: booking.customerEmail,
          phone: booking.customerPhone,
          nik: '347101230495000' + (i + 1),
          idLast4: '000' + (i + 1),
        }));

    const ticketType = ticketTypes.find((t) => t.id === booking.ticketTypeId);
    const existingIssued = this.getIssuedTickets();
    const newIssued: IssuedTicket[] = [];

    attendeesList.forEach((att, idx) => {
      const nik = att.nik || att.idLast4 || `347101230495000${idx + 1}`;
      newIssued.push({
        id: `tkt_${Date.now()}_${idx}`,
        bookingId: booking.id,
        eventId: booking.eventId,
        ticketTypeId: booking.ticketTypeId,
        ticketTypeName: ticketType?.name || 'Standard Pass',
        attendeeName: att.name,
        attendeeEmail: att.email,
        attendeePhone: att.phone,
        attendeeNik: nik,
        attendeeIdLast4: nik.slice(-4),
        packageName: ticketType?.name || 'Single',
        packageMemberIndex: idx + 1,
        packageTotalMembers: attendeesList.length,
        packageGroupName: `Paket ${ticketType?.name || 'Tiket'} (${attendeesList.length} Orang)`,
        ticketNumber: generateRandomTicketNumber(),
        qrToken: generateUUID(),
        status: 'valid',
        verificationStatus: 'pending_verification',
        seat_or_gate: `Gate Utama Kalura Garden - Area ${ticketType?.name || 'Workshop'}`,
      });
    });

    localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify([...newIssued, ...existingIssued]));

    // Sync to Firestore for real-time multi-device reflection
    newIssued.forEach((t) => {
      setDoc(doc(db, 'issuedTickets', t.id), t).catch(() => {});
    });
    setDoc(doc(db, 'bookings', booking.id), booking).catch(() => {});
    if (ttIndex >= 0 && ticketTypes[ttIndex]) {
      setDoc(doc(db, 'ticketTypes', ticketTypes[ttIndex].id), ticketTypes[ttIndex]).catch(() => {});
    }

    this.notify();
    return { success: true };
  }

  /**
   * Admin approves and verifies booking payment proof, activating official E-Tickets
   */
  public verifyBookingAndTickets(bookingId: string, adminUser: User): { success: boolean; message: string } {
    const bookings = this.getBookings();
    const bIndex = bookings.findIndex((b) => b.id === bookingId);
    const now = new Date().toISOString();
    if (bIndex >= 0) {
      bookings[bIndex].verificationStatus = 'verified';
      bookings[bIndex].verifiedAt = now;
      bookings[bIndex].verifiedBy = adminUser.name;
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      setDoc(doc(db, 'bookings', bookingId), bookings[bIndex]).catch(() => {});
    }

    const allTickets = this.getIssuedTickets();
    let updatedCount = 0;
    allTickets.forEach((t) => {
      if (t.bookingId === bookingId) {
        t.verificationStatus = 'verified';
        t.verifiedAt = now;
        t.verifiedBy = adminUser.name;
        updatedCount++;
        setDoc(doc(db, 'issuedTickets', t.id), t).catch(() => {});
      }
    });

    if (updatedCount > 0) {
      localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify(allTickets));
    }

    this.notify();
    return { success: true, message: `Berhasil memverifikasi pembayaran dan menerbitkan ${updatedCount} tiket peserta.` };
  }

  /**
   * Cancel expired bookings and restore quota (FR-BKG-04 / Laravel Scheduler simulation)
   */
  public cancelExpiredBookings() {
    const bookings = this.getBookings();
    const now = new Date().getTime();
    let updated = false;
    const ticketTypes = this.getTicketTypes();

    bookings.forEach((b) => {
      if (b.paymentStatus === 'pending' && new Date(b.expiresAt).getTime() < now) {
        b.paymentStatus = 'expired';
        updated = true;

        // Restore available quota
        const tt = ticketTypes.find((t) => t.id === b.ticketTypeId);
        if (tt) {
          tt.availableQuota += b.quantity;
          tt.heldQuota = Math.max(0, (tt.heldQuota || 0) - b.quantity);
        }
      }
    });

    if (updated) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
      localStorage.setItem(STORAGE_KEYS.TICKET_TYPES, JSON.stringify(ticketTypes));
      this.notify();
    }
  }

  // --- Issued Tickets & Gate Validation (FR-CHK-01, FR-CHK-02, FR-CHK-03) ---
  public getIssuedTickets(eventId?: string): IssuedTicket[] {
    try {
      const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';
      const data = localStorage.getItem(STORAGE_KEYS.ISSUED_TICKETS);
      const all: IssuedTicket[] = data !== null ? JSON.parse(data) : (isCleared ? [] : INITIAL_ISSUED_TICKETS);
      return eventId ? all.filter((t) => t.eventId === eventId) : all;
    } catch {
      return [];
    }
  }

  /**
   * Delete an individual issued ticket from local & Firestore
   */
  public async deleteIssuedTicket(ticketId: string): Promise<{ success: boolean; message: string }> {
    const currentTickets = this.getIssuedTickets();
    const targetTicket = currentTickets.find((t) => t.id === ticketId);
    const updatedTickets = currentTickets.filter((t) => t.id !== ticketId);
    localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify(updatedTickets));

    // Also remove logs for this ticket
    const currentLogs = this.getLogs();
    const updatedLogs = currentLogs.filter((l) => l.issuedTicketId !== ticketId);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));

    try {
      await deleteDoc(doc(db, 'issuedTickets', ticketId));
    } catch (err) {
      console.warn('Firestore ticket deletion warning:', err);
    }

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
    ticket.status = 'checked-in';
    ticket.checkedInAt = checkInTime;
    ticket.checkedInBy = staff.name;
    ticket.gateName = staff.staffGate || 'Gate Utama';
    ticket.checkInMethod = 'qr_scanner';

    allTickets[ticketIndex] = ticket;
    localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify(allTickets));

    // Sync check-in to Firestore
    updateDoc(doc(db, 'issuedTickets', ticket.id), {
      status: 'checked-in',
      checkedInAt: checkInTime,
      checkedInBy: staff.name,
      gateName: staff.staffGate || 'Gate Utama',
      checkInMethod: 'qr_scanner',
    }).catch(() => {});

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
   * Confirm Manual Check-In by Supervisor with NIK (Nomor Induk Kependudukan) verification
   */
  public supervisorManualCheckIn(params: {
    ticketId: string;
    enteredNik?: string;
    enteredIdLast4?: string; // support backward compatibility
    supervisorNote: string;
    supervisor: User;
  }): { success: boolean; message: string; result: CheckInResult; ticket?: IssuedTicket } {
    const all = this.getIssuedTickets();
    const idx = all.findIndex((t) => t.id === params.ticketId);
    if (idx === -1) {
      return { success: false, message: 'Tiket tidak ditemukan.', result: 'invalid_token' };
    }

    const ticket = all[idx];
    const cleanEntered = (params.enteredNik || params.enteredIdLast4 || '').trim().toUpperCase();
    const storedNik = (ticket.attendeeNik || '').trim().toUpperCase();
    const storedLast4 = (ticket.attendeeIdLast4 || '').trim().toUpperCase();

    // Verify NIK: matches full NIK, ends with entered digits, or matches last 4
    const isNikMatch = 
      cleanEntered === storedNik ||
      storedNik.endsWith(cleanEntered) ||
      cleanEntered === storedLast4;

    if (!isNikMatch) {
      this.recordLog({
        issuedTicketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        staffId: params.supervisor.id,
        staffName: params.supervisor.name,
        method: 'manual_supervisor',
        result: 'invalid_token',
        message: `Gagal verifikasi identitas: NIK tidak cocok (Dimasukkan: ${cleanEntered})`,
        deviceInfo: 'Supervisor Helpdesk',
        gateName: params.supervisor.staffGate || 'Posko Helpdesk',
      });
      return {
        success: false,
        message: `VERIFIKASI NIK GAGAL: Nomor NIK (${cleanEntered}) tidak sesuai dengan NIK terdaftar milik pengunjung.`,
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
    ticket.status = 'checked-in';
    ticket.checkedInAt = checkInTime;
    ticket.checkedInBy = `${params.supervisor.name} (Supervisor Helpdesk)`;
    ticket.gateName = params.supervisor.staffGate || 'Posko Helpdesk';
    ticket.checkInMethod = 'manual_supervisor';
    ticket.notes = params.supervisorNote;

    all[idx] = ticket;
    localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify(all));

    // Sync manual check-in to Firestore
    updateDoc(doc(db, 'issuedTickets', ticket.id), {
      status: 'checked-in',
      checkedInAt: checkInTime,
      checkedInBy: `${params.supervisor.name} (Supervisor Helpdesk)`,
      gateName: params.supervisor.staffGate || 'Posko Helpdesk',
      checkInMethod: 'manual_supervisor',
      notes: params.supervisorNote,
    }).catch(() => {});

    this.recordLog({
      issuedTicketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      attendeeName: ticket.attendeeName,
      staffId: params.supervisor.id,
      staffName: params.supervisor.name,
      method: 'manual_supervisor',
      result: 'success',
      message: `Manual check-in berhasil diapprove supervisor. Catatan: ${params.supervisorNote}`,
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
      const isCleared = localStorage.getItem(STORAGE_KEYS.SIMULATION_CLEARED) === 'true';
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (data !== null) return JSON.parse(data);
      return isCleared ? [] : INITIAL_LOGS;
    } catch {
      return [];
    }
  }

  private recordLog(log: Omit<CheckInLog, 'id' | 'scannedAt'>) {
    const logs = this.getLogs();
    const newLog: CheckInLog = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      scannedAt: new Date().toISOString(),
      ...log,
    };
    logs.unshift(newLog);
    // Keep last 150 logs in memory
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 150)));

    // Sync log to Firestore
    setDoc(doc(db, 'checkInLogs', newLog.id), newLog).catch(() => {});

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
