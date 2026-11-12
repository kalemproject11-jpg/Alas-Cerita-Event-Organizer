import React, { useState } from 'react';
import { User, Event, TicketType, Booking, IssuedTicket, CheckInLog } from '../../types';
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
  Download,
  CheckCircle2,
  Lock,
  ChevronRight,
  SlidersHorizontal,
  Trash2
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
  users,
  events,
  ticketTypes,
  bookings,
  issuedTickets,
  logs,
  initialTicketToScan,
  onClearInitialTicket,
  onOpenGateScannerWithTicket,
  onOpenConcurrencyDemo,
  onLogoutToPublic,
}) => {
  // Inner Sub-Tab: 'scanner' | 'payments' | 'tickets' | 'helpdesk' | 'reports' | 'logs'
  const [activeSubTab, setActiveSubTab] = useState<'scanner' | 'payments' | 'tickets' | 'helpdesk' | 'reports' | 'logs'>('payments');

  const totalSold = issuedTickets.length;
  const totalCheckedIn = issuedTickets.filter((t) => t.status === 'checked-in').length;
  const totalPaidBookings = bookings.filter((b) => b.paymentStatus === 'paid');
  const totalRevenue = totalPaidBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalWithProof = bookings.filter((b) => b.paymentProofUrl).length;

  return (
    <div className="space-y-8 pb-20">
      
      {/* Top Banner: Unified Gate & Admin Control Center */}
      <div className="p-6 bg-gradient-to-r from-[#2c1326] via-[#21141c] to-[#2c2010] border-2 border-pink-500/35 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white p-1 shrink-0 overflow-hidden shadow-md border-2 border-amber-300">
            <img src="/alas-cerita-logo.jpg" alt="Alas Cerita" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-pink-300 uppercase bg-pink-950/80 px-2.5 py-0.5 rounded border border-pink-500/40">
                PANEL TERPADU PANITIA &amp; GATE
              </span>
              <span className="text-xs text-pink-500/50">&middot;</span>
              <span className="text-xs text-amber-300 font-mono font-semibold">
                Online: {currentUser.name}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 bg-clip-text text-transparent mt-1">
              Dashboard Validasi Gate &amp; Verifikasi Pembayaran
            </h1>
            <p className="text-xs text-stone-300 mt-0.5">
              Akses khusus panitia pelaksana Alas Cerita untuk validasi bukti transfer (QRIS, ShopeePay, BRI), cetak e-ticket, dan gate scanner di Kalura Secret Garden.
            </p>
          </div>
        </div>

        {/* Quick KPI pills & Logout Button */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="px-3.5 py-2 bg-[#231221]/90 border border-pink-500/25 rounded-xl text-center shadow-sm">
            <span className="text-[10px] text-pink-200/80 block font-mono">Kehadiran Gate</span>
            <span className="text-sm font-black font-mono text-amber-300 tabular-nums">
              {totalCheckedIn} / {totalSold} Masuk
            </span>
          </div>

          <div className="px-3.5 py-2 bg-[#231221]/90 border border-pink-500/25 rounded-xl text-center shadow-sm">
            <span className="text-[10px] text-pink-200/80 block font-mono">Total Omset</span>
            <span className="text-sm font-black font-mono text-[#FACC15] tabular-nums">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </span>
          </div>

          <button
            onClick={() => setActiveSubTab('payments')}
            className="px-3.5 py-2 bg-rose-950/70 hover:bg-rose-900/90 text-rose-200 border border-rose-600/70 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm shadow-rose-950/20"
            title="Kelola atau bersihkan data simulasi di panel verifikasi"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Kelola / Hapus Simulasi</span>
          </button>

          <button
            onClick={onLogoutToPublic}
            className="px-4 py-2 bg-[#2d1428] hover:bg-[#3a1a34] text-pink-200 hover:text-white border border-pink-500/40 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Keluar ke Publik</span>
          </button>
        </div>
      </div>

      {/* Unified Navigation Switcher (Sub-Tabs) */}
      <div className="flex items-center gap-2 p-1.5 bg-[#1e0e1d]/95 border border-pink-500/25 rounded-2xl overflow-x-auto shadow-sm">
        
        {/* Sub-Tab 1: Verifikasi Pembayaran & Bukti Transfer & Biodata Peserta */}
        <button
          onClick={() => setActiveSubTab('payments')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'payments'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/30'
              : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Verifikasi Pembayaran &amp; Biodata Peserta ({issuedTickets.length} Peserta)</span>
          {totalWithProof > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-400 text-stone-950 font-bold rounded-full border border-amber-300">
              {totalWithProof} Struk
            </span>
          )}
        </button>

        {/* Sub-Tab 2: Gate Scanner */}
        <button
          onClick={() => setActiveSubTab('scanner')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'scanner'
              ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 font-black shadow-md shadow-amber-500/30'
              : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Gate Scanner (Kamera QR)</span>
        </button>

        {/* Sub-Tab 3: Manajemen & Cetak Tiket */}
        <button
          onClick={() => setActiveSubTab('tickets')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'tickets'
              ? 'bg-gradient-to-r from-pink-600 to-pink-500 text-white shadow-md shadow-pink-600/30'
              : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>Manajemen &amp; Cetak Tiket ({issuedTickets.length})</span>
        </button>

        {/* Sub-Tab 4: Helpdesk Supervisor */}
        <button
          onClick={() => setActiveSubTab('helpdesk')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'helpdesk'
              ? 'bg-[#FACC15] text-stone-950 shadow-md shadow-amber-500/30 font-extrabold'
              : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Helpdesk Supervisor &amp; NIK</span>
        </button>

        {/* Sub-Tab 5: Laporan EO */}
        <button
          onClick={() => setActiveSubTab('reports')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'reports'
              ? 'bg-pink-950 text-pink-200 border border-pink-500/40 shadow-md font-bold'
              : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Laporan EO &amp; Kuota</span>
        </button>

        {/* Sub-Tab 6: Audit Log Keamanan */}
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'logs'
              ? 'bg-amber-950 text-amber-200 border border-amber-500/40 shadow-md font-bold'
              : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Audit Log Keamanan ({logs.length})</span>
        </button>
      </div>

      {/* Dynamic Content based on Active Sub-Tab */}
      <div className="pt-2">
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
    </div>
  );
};
