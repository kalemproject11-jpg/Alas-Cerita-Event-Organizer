import React, { useState } from 'react';
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
  Trash2,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  X
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

  const [showResetModal, setShowResetModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [isProcessingDb, setIsProcessingDb] = useState(false);
  const [dbFeedback, setDbFeedback] = useState<string | null>(null);

  const totalSold = issuedTickets.length;
  const totalCheckedIn = issuedTickets.filter((t) => t.status === 'checked-in').length;
  const totalPaidBookings = bookings.filter((b) => b.paymentStatus === 'paid');
  const totalRevenue = totalPaidBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalWithProof = bookings.filter((b) => b.paymentProofUrl).length;
  const pendingVerifications = bookings.filter(
    (b) => b.verificationStatus === 'pending_verification' || !b.verificationStatus
  ).length;

  const handleConfirmResetInitial = async () => {
    setIsProcessingDb(true);
    try {
      const res = await storageService.resetAllData();
      setDbFeedback(res.message);
      setShowResetModal(false);
    } catch {
      setDbFeedback('Gagal mengembalikan database ke data awal.');
    } finally {
      setIsProcessingDb(false);
      setTimeout(() => setDbFeedback(null), 5000);
    }
  };

  const handleConfirmClearSimulation = async () => {
    setIsProcessingDb(true);
    try {
      const res = await storageService.clearAllSimulationData();
      setDbFeedback(res.message);
      setShowClearModal(false);
    } catch {
      setDbFeedback('Gagal membersihkan data simulasi.');
    } finally {
      setIsProcessingDb(false);
      setTimeout(() => setDbFeedback(null), 5000);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Control Header */}
      <section className="p-5 sm:p-6 bg-gradient-to-br from-[#2c1326] via-[#21141c] to-[#2c2010] border border-pink-500/35 rounded-3xl shadow-xl space-y-5">
        {/* Row 1: Title & Admin Database Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white p-1 shrink-0 overflow-hidden shadow-md border-2 border-amber-300">
              <img src="/alas-cerita-logo.jpg" alt="Alas Cerita" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-pink-200">
                <span className="font-bold uppercase tracking-wider text-amber-300">Portal Admin &amp; Gate</span>
                <span aria-hidden="true">&middot;</span>
                <span className="text-stone-300 truncate">{currentUser.name}</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 bg-clip-text text-transparent mt-0.5 leading-snug">
                Dashboard Validasi Gate &amp; Verifikasi Pembayaran
              </h1>
              <p className="text-xs text-stone-300 mt-0.5 line-clamp-2">
                Kelola bukti transfer (QRIS, ShopeePay, BRI), biodata peserta, cetak E-Ticket, kontrol database, dan gate scanner.
              </p>
            </div>
          </div>

          {/* Admin Action Controls: Reset Awal, Hapus Simulasi, Keluar */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="px-3.5 py-2.5 bg-[#251323] hover:bg-[#341a32] text-amber-200 border border-amber-400/40 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px]"
              title="Kembalikan seluruh database ke data contoh awal"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Reset Data Awal</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="px-3.5 py-2.5 bg-rose-950/75 hover:bg-rose-900/90 text-rose-200 border border-rose-500/50 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px]"
              title="Kosongkan seluruh data simulasi agar bersih untuk produksi"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Hapus Simulasi</span>
            </button>

            <button
              type="button"
              onClick={onLogoutToPublic}
              className="col-span-2 sm:col-span-1 px-4 py-2.5 bg-[#2d1428] hover:bg-[#3a1a34] text-pink-200 hover:text-white border border-pink-500/40 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap min-h-[40px]"
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
            <span className="text-base sm:text-lg font-black font-mono text-amber-300 tabular-nums mt-0.5 block">
              {totalCheckedIn} / {totalSold} Masuk
            </span>
          </div>

          <div className="p-3.5 bg-[#1b0e1a]/85 border border-pink-500/25 rounded-2xl">
            <span className="text-[11px] font-mono text-pink-200/75 block">Antrean Verifikasi</span>
            <span className="text-base sm:text-lg font-black font-mono text-pink-300 tabular-nums mt-0.5 block">
              {pendingVerifications} Order
            </span>
          </div>

          <div className="p-3.5 bg-[#1b0e1a]/85 border border-amber-400/30 rounded-2xl">
            <span className="text-[11px] font-mono text-amber-200/80 block">Total Omset</span>
            <span className="text-base sm:text-lg font-black font-mono text-[#FACC15] tabular-nums mt-0.5 block truncate">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </section>

      {/* Feedback Banner for Reset / Clear */}
      {dbFeedback && (
        <div className="p-3.5 bg-gradient-to-r from-pink-950/90 to-amber-950/90 border border-amber-400/50 rounded-2xl text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
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
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/25'
                : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
            }`}
          >
            <Receipt className="w-4 h-4 shrink-0" />
            <span className="truncate">Verifikasi ({bookings.length})</span>
            {totalWithProof > 0 && (
              <span className="hidden md:inline text-[10px] font-mono px-1.5 py-0.5 bg-amber-400 text-stone-950 font-bold rounded">
                {totalWithProof} Struk
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('scanner')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer min-h-[42px] ${
              activeSubTab === 'scanner'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 font-black shadow-md shadow-amber-500/25'
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
                ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-md shadow-pink-600/25'
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
                ? 'bg-[#FACC15] text-stone-950 shadow-md shadow-amber-500/25 font-extrabold'
                : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
            }`}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="truncate">Helpdesk NIK</span>
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
                ? 'bg-amber-950 text-amber-200 border border-amber-500/40 shadow-md font-bold'
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

      {/* Modal: Konfirmasi Reset Database ke Data Awal */}
      {showResetModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#1c0f1c] border-2 border-amber-400/50 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-500/60 flex items-center justify-center text-amber-300">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300 block">
                PENGEMBALIAN DATA CONTOH
              </span>
              <h3 className="text-lg font-black text-white">
                Reset Database ke Data Awal?
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Tindakan ini akan mengembalikan transaksi, daftar peserta contoh, kuota paket, dan log gate di penyimpanan lokal serta Cloud Firestore ke kondisi contoh awal.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isProcessingDb}
                className="px-4 py-2.5 bg-[#251323] hover:bg-[#341a32] text-stone-300 hover:text-white border border-pink-500/30 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetInitial}
                disabled={isProcessingDb}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-110 text-stone-950 text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isProcessingDb ? 'Mereset Database...' : 'Ya, Reset ke Data Awal'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Hapus Semua Data Simulasi */}
      {showClearModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#1c0f1c] border-2 border-rose-500/50 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-600/70 flex items-center justify-center text-rose-300">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-rose-300 block">
                PEMBERSIHAN DATA SIMULASI UNTUK PRODUKSI
              </span>
              <h3 className="text-lg sm:text-xl font-black text-white">
                Hapus Semua Data Simulasi &amp; Kosongkan Dashboard?
              </h3>
              <p className="text-xs text-stone-200 leading-relaxed">
                Seluruh transaksi uji coba, e-ticket contoh, dan log check-in simulasi akan dihapus bersih dari sistem &amp; Cloud Firestore, sementara kuota tiket dikembalikan penuh (Single: 120, Couple: 70, Circle: 50).
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isProcessingDb}
                className="px-4 py-2.5 bg-[#251323] hover:bg-[#341a32] text-stone-300 hover:text-white border border-pink-500/30 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearSimulation}
                disabled={isProcessingDb}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:brightness-110 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isProcessingDb ? 'Membersihkan...' : 'Ya, Hapus Semua Simulasi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
