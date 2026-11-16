import React, { useState, useEffect, useRef } from 'react';
import { User, Event, TicketType, Booking, IssuedTicket, CheckInLog } from '../../types';
import { storageService } from '../../services/storageService';
import { GateScanner } from '../gate/GateScanner';
import { MyTicketsView } from '../customer/MyTicketsView';
import { SupervisorHelpdesk } from '../gate/SupervisorHelpdesk';
import { AuditLogsView } from '../gate/AuditLogsView';
import { AdminDashboard } from './AdminDashboard';
import { AdminPaymentVerificationView } from './AdminPaymentVerificationView';
import {
  QrCode,
  Ticket,
  ShieldAlert,
  BarChart3,
  FileText,
  LogOut,
  Receipt,
  CheckCircle2,
  X,
  UserX,
  RefreshCw,
  BellRing,
  Volume2,
  VolumeX
} from 'lucide-react';

interface AdminUnifiedDashboardProps {
  currentUser: User;
  users: User[];
  events: Event[];
  ticketTypes: TicketType[];
  bookings: Booking[];
  issuedTickets: IssuedTicket[];
  logs: CheckInLog[];
  initialTicketToScan?: IssuedTicket | null;
  onClearInitialTicket?: () => void;
  onOpenGateScannerWithTicket: (ticket: IssuedTicket) => void;
  onOpenConcurrencyDemo?: () => void;
  onLogoutToPublic: () => void;
}

function playNewRegistrantChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playNote = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.14, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    playNote(587.33, 0, 0.16); // D5
    playNote(880, 0.12, 0.28); // A5
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Ignore audio context autoplay restrictions
  }
}

export const AdminUnifiedDashboard: React.FC<AdminUnifiedDashboardProps> = ({
  currentUser,
  events,
  ticketTypes,
  bookings,
  issuedTickets,
  logs,
  initialTicketToScan,
  onClearInitialTicket,
  onOpenGateScannerWithTicket,
  onLogoutToPublic,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<
    'scanner' | 'payments' | 'tickets' | 'helpdesk' | 'reports' | 'logs'
  >('payments');

  const [isProcessingDb, setIsProcessingDb] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [dbFeedback, setDbFeedback] = useState<string | null>(null);
  const [newlyArrivedIds, setNewlyArrivedIds] = useState<Set<string>>(() => new Set());
  const [recentAlert, setRecentAlert] = useState<{
    bookingId: string;
    customerName: string;
    invoiceCode: string;
    attendeeCount: number;
    packageLabel: string;
  } | null>(null);

  const knownBookingIdsRef = useRef<Set<string> | null>(null);
  const defaultTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : '');

  // Detect newly arrived bookings/registrants in real time from Firestore
  useEffect(() => {
    const currentIds = new Set(bookings.map((b) => b.id));
    if (knownBookingIdsRef.current === null) {
      knownBookingIdsRef.current = currentIds;
      return;
    }

    const incomingNew = bookings.filter((b) => !knownBookingIdsRef.current!.has(b.id));
    knownBookingIdsRef.current = currentIds;

    if (incomingNew.length > 0) {
      const latest = incomingNew[0];
      const relatedTickets = issuedTickets.filter((t) => t.bookingId === latest.id);
      const tier = ticketTypes.find((tt) => tt.id === latest.ticketTypeId);
      const packageLabel =
        relatedTickets[0]?.packageName ||
        tier?.name ||
        `${latest.quantity || 1} Paket`;

      setNewlyArrivedIds((prev) => {
        const next = new Set(prev);
        incomingNew.forEach((b) => next.add(b.id));
        return next;
      });

      setRecentAlert({
        bookingId: latest.id,
        customerName: latest.customerName,
        invoiceCode: latest.invoiceCode,
        attendeeCount: relatedTickets.length || latest.quantity || 1,
        packageLabel,
      });

      if (soundEnabled) {
        playNewRegistrantChime();
      }

      if (typeof document !== 'undefined') {
        const originalTitle = defaultTitleRef.current || document.title;
        document.title = `(${incomingNew.length} Pendaftar Baru!) ${originalTitle}`;
        const restoreTimer = setTimeout(() => {
          document.title = originalTitle;
        }, 8000);
        return () => clearTimeout(restoreTimer);
      }
    }
  }, [bookings, issuedTickets, ticketTypes, soundEnabled]);

  // Periodic active-tab server sync (25s) as a resilient safety net alongside Firestore onSnapshot
  useEffect(() => {
    void storageService.syncFromServer(true);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void storageService.syncFromServer(false);
      }
    }, 25_000);
    return () => clearInterval(interval);
  }, []);

  const totalSold = issuedTickets.length;
  const totalCheckedIn = issuedTickets.filter((t) => t.status === 'checked-in').length;
  const totalPaidBookings = bookings.filter((b) => b.paymentStatus === 'paid');
  const totalRevenue = totalPaidBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalWithProof = bookings.filter((b) => b.paymentProofUrl).length;
  const pendingVerifications = bookings.filter(
    (b) => b.verificationStatus === 'pending_verification' || !b.verificationStatus
  ).length;

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const ok = await storageService.syncFromServer(true);
      setDbFeedback(
        ok
          ? 'Data pendaftar dan kuota terbaru berhasil diperbarui langsung dari server.'
          : 'Gagal terhubung ke server. Menampilkan data terakhir yang tersimpan.'
      );
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setDbFeedback(null), 4000);
    }
  };

  const handleRevokeOtherAdmins = async () => {
    setIsProcessingDb(true);
    try {
      const res = await storageService.revokeOtherAdminSessions();
      setDbFeedback(res.message);
    } catch {
      setDbFeedback('Gagal mengeluarkan sesi admin lain.');
    } finally {
      setIsProcessingDb(false);
      setTimeout(() => setDbFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Control Header */}
      <section className="p-5 sm:p-6 bg-gradient-to-br from-[#2c1326] via-[#21141c] to-[#0e2218] border border-pink-500/35 rounded-3xl shadow-xl space-y-5">
        {/* Row 1: Title & Admin Database Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white p-1 shrink-0 overflow-hidden shadow-md border-2 border-emerald-400">
              <img src="/alas-cerita-logo.jpg" alt="Alas Cerita" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-pink-200">
                <span className="font-bold uppercase tracking-wider text-emerald-300">Portal Admin &amp; Gate</span>
                <span aria-hidden="true">&middot;</span>
                <span className="text-stone-300 truncate">{currentUser.name}</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-pink-300 via-pink-200 to-emerald-300 bg-clip-text text-transparent mt-0.5 leading-snug">
                Dashboard Validasi Gate &amp; Verifikasi Pembayaran
              </h1>
              <p className="text-xs text-stone-300 mt-0.5 line-clamp-2">
                Pembaruan pendaftar berjalan otomatis secara realtime. Kelola bukti transfer, biodata peserta, cetak E-Ticket, dan gate scanner.
              </p>
            </div>
          </div>

          {/* Admin Action Controls */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2.5 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-200 border border-emerald-500/50 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px] disabled:opacity-60"
              title="Ambil data pendaftar terbaru dari server sekarang"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-300 shrink-0 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Menyegarkan...' : 'Segarkan Data'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className={`px-3 py-2.5 border text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px] ${
                soundEnabled
                  ? 'bg-pink-950/75 text-pink-200 border-pink-400/50 hover:bg-pink-900/80'
                  : 'bg-[#221221] text-stone-400 border-stone-700 hover:text-stone-200'
              }`}
              title={soundEnabled ? 'Matikan suara notifikasi pendaftar baru' : 'Aktifkan suara notifikasi pendaftar baru'}
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-pink-300 shrink-0" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              )}
              <span className="hidden sm:inline">{soundEnabled ? 'Suara Notif' : 'Notif Bisu'}</span>
            </button>

            <button
              type="button"
              onClick={handleRevokeOtherAdmins}
              disabled={isProcessingDb}
              className="px-3.5 py-2.5 bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 border border-amber-400/50 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px] disabled:opacity-60"
              title="Paksa logout seluruh admin yang sedang masuk di perangkat atau browser lain"
            >
              <UserX className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Keluarkan Admin Lain</span>
            </button>

            <button
              type="button"
              onClick={onLogoutToPublic}
              className="px-4 py-2.5 bg-[#2d1428] hover:bg-[#3a1a34] text-pink-200 hover:text-white border border-pink-500/40 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px]"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Keluar ke Publik</span>
            </button>
          </div>
        </div>

        {/* Row 2: Structured 4-Column KPI Strip (2x2 on Mobile, 4 cols on Laptop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-pink-500/20">
          <div className="p-3.5 bg-[#1b0e1a]/85 border border-pink-500/25 rounded-2xl">
            <span className="text-[11px] font-mono text-pink-200/75 block">Total Peserta</span>
            <span className="text-base sm:text-lg font-black font-mono text-white tabular-nums mt-0.5 block">
              {totalSold} Orang
            </span>
          </div>

          <div className="p-3.5 bg-[#1b0e1a]/85 border border-pink-500/25 rounded-2xl">
            <span className="text-[11px] font-mono text-pink-200/75 block">Kehadiran Gate</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-300 tabular-nums mt-0.5 block">
              {totalCheckedIn} / {totalSold} Masuk
            </span>
          </div>

          <div className="p-3.5 bg-[#1b0e1a]/85 border border-pink-500/25 rounded-2xl">
            <span className="text-[11px] font-mono text-pink-200/75 block">Antrean Verifikasi</span>
            <span className="text-base sm:text-lg font-black font-mono text-pink-300 tabular-nums mt-0.5 block">
              {pendingVerifications} Order
            </span>
          </div>

          <div className="p-3.5 bg-[#1b0e1a]/85 border border-emerald-400/35 rounded-2xl">
            <span className="text-[11px] font-mono text-emerald-200/80 block">Total Omset</span>
            <span className="text-base sm:text-lg font-black font-mono text-emerald-300 tabular-nums mt-0.5 block truncate">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </section>

      {/* Instant Realtime New Registrant Alert Banner */}
      {recentAlert && (
        <div className="p-4 bg-gradient-to-r from-emerald-950/95 via-[#182920] to-pink-950/95 border-2 border-emerald-400/70 rounded-2xl text-white text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 shrink-0">
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div className="space-y-0.5">
              <div className="font-black text-emerald-300 text-xs sm:text-sm">
                Pendaftar Baru Masuk Secara Realtime!
              </div>
              <div className="text-stone-200">
                <strong className="text-white">{recentAlert.customerName}</strong> ({recentAlert.invoiceCode}) memesan{' '}
                <strong className="text-pink-300">Paket {recentAlert.packageLabel}</strong> ({recentAlert.attendeeCount} peserta).
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {activeSubTab !== 'payments' && (
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('payments');
                  setRecentAlert(null);
                }}
                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black rounded-xl text-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                Lihat di Verifikasi
              </button>
            )}
            <button
              type="button"
              onClick={() => setRecentAlert(null)}
              className="p-1.5 text-stone-300 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              aria-label="Tutup pemberitahuan pendaftar baru"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Feedback Banner */}
      {dbFeedback && (
        <div className="p-3.5 bg-gradient-to-r from-pink-950/90 to-emerald-950/90 border border-emerald-400/50 rounded-2xl text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{dbFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setDbFeedback(null)}
            className="p-1 text-stone-300 hover:text-white cursor-pointer"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Responsive Sub-Navigation Tabs */}
      <div className="p-1.5 bg-[#1e0e1d]/95 border border-pink-500/25 rounded-2xl shadow-sm">
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('payments')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
              activeSubTab === 'payments'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/25'
                : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span className="truncate">Verifikasi ({bookings.length})</span>
            {totalWithProof > 0 && (
              <span className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 bg-emerald-400 text-stone-950 font-bold rounded">
                {totalWithProof} Struk
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('scanner')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
              activeSubTab === 'scanner'
                ? 'bg-emerald-600 text-white font-black shadow-md shadow-emerald-600/25'
                : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
            }`}
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span className="truncate">Gate Scanner</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('tickets')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
              activeSubTab === 'tickets'
                ? 'bg-pink-500 text-white shadow-md shadow-pink-500/25'
                : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
            }`}
          >
            <Ticket className="w-4 h-4 shrink-0" />
            <span className="truncate">E-Ticket ({issuedTickets.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('helpdesk')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
              activeSubTab === 'helpdesk'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25 font-extrabold'
                : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="truncate">Helpdesk Gate</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('reports')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
              activeSubTab === 'reports'
                ? 'bg-pink-950 text-pink-200 border border-pink-500/40 shadow-md font-bold'
                : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span className="truncate">Laporan &amp; Kuota</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('logs')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
              activeSubTab === 'logs'
                ? 'bg-emerald-950 text-emerald-200 border border-emerald-500/40 shadow-md font-bold'
                : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Audit Log ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* Dynamic Sub-Tab Viewport */}
      <div className="pt-1">
        {activeSubTab === 'payments' && (
          <AdminPaymentVerificationView
            currentUser={currentUser}
            bookings={bookings}
            issuedTickets={issuedTickets}
            events={events}
            highlightedBookingIds={newlyArrivedIds}
          />
        )}

        {activeSubTab === 'scanner' && (
          <GateScanner
            currentUser={currentUser}
            tickets={issuedTickets}
            initialTicketToScan={initialTicketToScan}
            onClearInitialTicket={onClearInitialTicket}
            onOpenSupervisorHelpdesk={() => setActiveSubTab('helpdesk')}
          />
        )}

        {activeSubTab === 'tickets' && (
          <MyTicketsView
            currentUser={currentUser}
            tickets={issuedTickets}
            events={events}
            onOpenGateScannerWithTicket={(t) => {
              onOpenGateScannerWithTicket(t);
              setActiveSubTab('scanner');
            }}
          />
        )}

        {activeSubTab === 'helpdesk' && (
          <SupervisorHelpdesk
            currentUser={currentUser}
            events={events}
            onOpenAuditLogs={() => setActiveSubTab('logs')}
          />
        )}

        {activeSubTab === 'reports' && (
          <AdminDashboard
            events={events}
            ticketTypes={ticketTypes}
            bookings={bookings}
            issuedTickets={issuedTickets}
            logs={logs}
            onOpenAuditLogs={() => setActiveSubTab('logs')}
          />
        )}

        {activeSubTab === 'logs' && (
          <AuditLogsView
            logs={logs}
            onBack={() => setActiveSubTab('scanner')}
          />
        )}
      </div>
    </div>
  );
};
