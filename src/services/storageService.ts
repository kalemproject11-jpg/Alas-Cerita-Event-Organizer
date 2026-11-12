import { User, Event, TicketType, Booking, IssuedTicket, CheckInLog, CheckInResult, PaymentMethod } from '../types';
import { INITIAL_USERS, INITIAL_EVENTS, INITIAL_TICKET_TYPES, INITIAL_BOOKINGS, INITIAL_ISSUED_TICKETS, INITIAL_LOGS } from '../data/mockData';

const STORAGE_KEYS = {
  USERS: 'eventpass_users_v2',
  CURRENT_USER_ID: 'eventpass_current_user_id_v2',
  EVENTS: 'eventpass_events_v2',
  TICKET_TYPES: 'eventpass_ticket_types_v2',
  BOOKINGS: 'eventpass_bookings_v2',
  ISSUED_TICKETS: 'eventpass_issued_tickets_v2',
  LOGS: 'eventpass_check_in_logs_v2',
  RATE_LIMIT_ATTEMPTS: 'eventpass_supervisor_rate_limit_v2',
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

  constructor() {
    this.initializeDefaults();
  }

  private initializeDefaults() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS.EVENTS)) {
      localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.TICKET_TYPES)) {
      localStorage.setItem(STORAGE_KEYS.TICKET_TYPES, JSON.stringify(INITIAL_TICKET_TYPES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BOOKINGS)) {
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.ISSUED_TICKETS)) {
      localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify(INITIAL_ISSUED_TICKETS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'usr_admin');
    }
    if (!localStorage.getItem(STORAGE_KEYS.LOGS)) {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
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

  public resetAllData() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(INITIAL_EVENTS));
    localStorage.setItem(STORAGE_KEYS.TICKET_TYPES, JSON.stringify(INITIAL_TICKET_TYPES));
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(INITIAL_BOOKINGS));
    localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify(INITIAL_ISSUED_TICKETS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(INITIAL_LOGS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'usr_admin');
    this.notify();
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
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'usr_admin';
    return users.find((u) => u.id === currentId) || users[0];
  }

  public setCurrentUser(userId: string) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    this.notify();
  }

  // --- Events ---
  public getEvents(): Event[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EVENTS);
      return data ? JSON.parse(data) : INITIAL_EVENTS;
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
      const data = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
      return data ? JSON.parse(data) : INITIAL_BOOKINGS;
    } catch {
      return INITIAL_BOOKINGS;
    }
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
  public completePayment(bookingId: string, paymentMethod: PaymentMethod = 'qris'): { success: boolean; error?: string } {
    const bookings = this.getBookings();
    const bIndex = bookings.findIndex((b) => b.id === bookingId);
    if (bIndex === -1) return { success: false, error: 'Transaksi booking tidak ditemukan.' };

    const booking = bookings[bIndex];
    if (booking.paymentStatus === 'paid') return { success: true };

    const now = new Date().toISOString();
    booking.paymentStatus = 'paid';
    booking.paymentMethod = paymentMethod;
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
    const attendeesList: Array<{ name: string; email: string; phone: string; idLast4: string }> = storedAttendees
      ? JSON.parse(storedAttendees)
      : Array.from({ length: booking.quantity }).map((_, i) => ({
          name: `${booking.customerName} #${i + 1}`,
          email: booking.customerEmail,
          phone: booking.customerPhone,
          idLast4: '8899',
        }));

    const ticketType = ticketTypes.find((t) => t.id === booking.ticketTypeId);
    const existingIssued = this.getIssuedTickets();
    const newIssued: IssuedTicket[] = [];

    attendeesList.forEach((att, idx) => {
      newIssued.push({
        id: `tkt_${Date.now()}_${idx}`,
        bookingId: booking.id,
        eventId: booking.eventId,
        ticketTypeId: booking.ticketTypeId,
        ticketTypeName: ticketType?.name || 'Standard Pass',
        attendeeName: att.name,
        attendeeEmail: att.email,
        attendeePhone: att.phone,
        attendeeIdLast4: att.idLast4 || '1234',
        ticketNumber: generateRandomTicketNumber(),
        qrToken: generateUUID(),
        status: 'valid',
        seat_or_gate: 'Gate Utama - Festival Area',
      });
    });

    localStorage.setItem(STORAGE_KEYS.ISSUED_TICKETS, JSON.stringify([...newIssued, ...existingIssued]));
    this.notify();
    return { success: true };
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
      const data = localStorage.getItem(STORAGE_KEYS.ISSUED_TICKETS);
      const all: IssuedTicket[] = data ? JSON.parse(data) : INITIAL_ISSUED_TICKETS;
      return eventId ? all.filter((t) => t.eventId === eventId) : all;
    } catch {
      return INITIAL_ISSUED_TICKETS;
    }
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
        t.attendeeEmail.toUpperCase().includes(cleanQuery)
    );

    return {
      success: true,
      remainingAttempts: rateLimitCheck.remaining,
      tickets: matches,
    };
  }

  /**
   * Confirm Manual Check-In by Supervisor with KTP Last 4 Digits verification
   */
  public supervisorManualCheckIn(params: {
    ticketId: string;
    enteredIdLast4: string;
    supervisorNote: string;
    supervisor: User;
  }): { success: boolean; message: string; result: CheckInResult; ticket?: IssuedTicket } {
    const all = this.getIssuedTickets();
    const idx = all.findIndex((t) => t.id === params.ticketId);
    if (idx === -1) {
      return { success: false, message: 'Tiket tidak ditemukan.', result: 'invalid_token' };
    }

    const ticket = all[idx];

    // Verify 4-digit ID
    if (ticket.attendeeIdLast4 !== params.enteredIdLast4.trim()) {
      this.recordLog({
        issuedTicketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        attendeeName: ticket.attendeeName,
        staffId: params.supervisor.id,
        staffName: params.supervisor.name,
        method: 'manual_supervisor',
        result: 'invalid_token',
        message: `Gagal verifikasi identitas: 4 digit KTP tidak cocok (Dimasukkan: ${params.enteredIdLast4})`,
        deviceInfo: 'Supervisor Helpdesk',
        gateName: params.supervisor.staffGate || 'Posko Helpdesk',
      });
      return {
        success: false,
        message: `VERIFIKASI KTP GAGAL: 4 Digit terakhir KTP (${params.enteredIdLast4}) tidak sesuai dengan data pemesan asli.`,
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
      const data = localStorage.getItem(STORAGE_KEYS.LOGS);
      return data ? JSON.parse(data) : INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
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
