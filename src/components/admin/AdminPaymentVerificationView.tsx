import React, { useState } from 'react';
import { Booking, IssuedTicket, Event, PaymentMethod, User } from '../../types';
import { storageService } from '../../services/storageService';
import { downloadTicketAsPNG } from '../../utils/ticketDownloader';
import { ETicketModal } from '../customer/ETicketModal';
import { 
  Download, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle2, 
  CreditCard, 
  Calendar, 
  Phone, 
  User as UserIcon, 
  FileText, 
  ExternalLink, 
  X, 
  QrCode,
  Building2,
  Smartphone,
  AlertCircle,
  Users,
  Check,
  Clock,
  IdCard,
  Mail,
  ShieldCheck,
  Share2,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface AdminPaymentVerificationViewProps {
  bookings: Booking[];
  issuedTickets: IssuedTicket[];
  events: Event[];
  currentUser?: User;
}

export const AdminPaymentVerificationView: React.FC<AdminPaymentVerificationViewProps> = ({
  bookings,
  issuedTickets,
  events,
  currentUser,
}) => {
  const [viewMode, setViewMode] = useState<'transactions' | 'attendees'>('transactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');
  const [selectedProofToView, setSelectedProofToView] = useState<{ url: string; title: string } | null>(null);
  const [selectedTicketForModal, setSelectedTicketForModal] = useState<IssuedTicket | null>(null);
  const [downloadingTicketId, setDownloadingTicketId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Simulation cleanup & individual deletion state
  const [confirmDeleteBooking, setConfirmDeleteBooking] = useState<Booking | null>(null);
  const [confirmDeleteTicket, setConfirmDeleteTicket] = useState<IssuedTicket | null>(null);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentEvent = events[0] || {
    id: 'evt_alas_cerita_2026',
    title: 'Alas Cerita — Talkshow: Rerasan Mawi Makna “Duduk Sejenak, Leren Kepenak”',
    venue: 'Kalura Secret Garden',
    city: 'Yogyakarta',
  };

  // Filter bookings
  const filteredBookings = bookings.filter((b) => {
    const matchQuery =
      b.invoiceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.customerEmail && b.customerEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (b.senderName && b.senderName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchMethod =
      selectedMethodFilter === 'all' ||
      b.paymentMethod === selectedMethodFilter;

    return matchQuery && matchMethod;
  });

  // Filter attendees across all issued tickets
  const filteredAttendees = issuedTickets.filter((t) => {
    const q = searchQuery.toLowerCase();
    const relatedBooking = bookings.find((b) => b.id === t.bookingId);
    return (
      t.attendeeName.toLowerCase().includes(q) ||
      (t.attendeeNik && t.attendeeNik.toLowerCase().includes(q)) ||
      (t.attendeePhone && t.attendeePhone.toLowerCase().includes(q)) ||
      (t.attendeeEmail && t.attendeeEmail.toLowerCase().includes(q)) ||
      t.ticketNumber.toLowerCase().includes(q) ||
      (t.packageName && t.packageName.toLowerCase().includes(q)) ||
      (relatedBooking && relatedBooking.invoiceCode.toLowerCase().includes(q)) ||
      (relatedBooking && relatedBooking.customerName.toLowerCase().includes(q))
    );
  });

  const bookingsWithProof = bookings.filter((b) => b.paymentProofUrl).length;
  const verifiedBookingsCount = bookings.filter((b) => b.verificationStatus === 'verified').length;
  const pendingBookingsCount = bookings.filter((b) => b.verificationStatus === 'pending_verification' || !b.verificationStatus).length;

  const handleVerifyBooking = (bookingId: string) => {
    const adminUser = currentUser || {
      id: 'usr_admin',
      name: 'Administrator Alas Cerita',
      email: 'admin@alascerita.com',
      phone: '08123456789',
      role: 'super_admin' as const,
    };

    const res = storageService.verifyBookingAndTickets(bookingId, adminUser);
    setFeedbackMessage(res.message);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleDownloadTicket = async (ticket: IssuedTicket) => {
    try {
      setDownloadingTicketId(ticket.id);
      await downloadTicketAsPNG(ticket, currentEvent);
    } catch (err) {
      console.error('Gagal mengunduh E-Ticket:', err);
    } finally {
      setDownloadingTicketId(null);
    }
  };

  const handleDownloadAllTicketsForBooking = async (bookingTickets: IssuedTicket[]) => {
    for (const ticket of bookingTickets) {
      await handleDownloadTicket(ticket);
    }
  };

  const executeDeleteBooking = async () => {
    if (!confirmDeleteBooking) return;
    setIsDeleting(true);
    try {
      const res = await storageService.deleteBooking(confirmDeleteBooking.id);
      setFeedbackMessage(res.message);
      setConfirmDeleteBooking(null);
    } catch (err) {
      setFeedbackMessage('Gagal menghapus transaksi.');
    } finally {
      setIsDeleting(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const executeDeleteTicket = async () => {
    if (!confirmDeleteTicket) return;
    setIsDeleting(true);
    try {
      const res = await storageService.deleteIssuedTicket(confirmDeleteTicket.id);
      setFeedbackMessage(res.message);
      setConfirmDeleteTicket(null);
    } catch (err) {
      setFeedbackMessage('Gagal menghapus tiket peserta.');
    } finally {
      setIsDeleting(false);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  const executeClearAllSimulation = async () => {
    setIsDeleting(true);
    try {
      const res = await storageService.clearAllSimulationData();
      setFeedbackMessage(res.message);
      setShowConfirmClearAll(false);
    } catch (err) {
      setFeedbackMessage('Gagal membersihkan data simulasi.');
    } finally {
      setIsDeleting(false);
      setTimeout(() => setFeedbackMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-black bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 bg-clip-text text-transparent">
            Verifikasi Pembayaran &amp; Biodata Peserta
          </h2>
          <p className="text-xs text-stone-300 mt-0.5">
            Rekap transaksi, bukti transfer, biodata lengkap peserta (Nama, NIK, HP, Email), dan unduh E-Ticket digital.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="text-pink-200">
            Total Peserta: <strong className="text-white tabular-nums">{issuedTickets.length} Orang</strong>
          </span>
          <span className="text-pink-500/50" aria-hidden="true">&middot;</span>
          <span className="text-amber-300">
            Antrean: <strong className="text-[#FACC15] tabular-nums">{pendingBookingsCount} Order</strong>
          </span>
        </div>
      </div>

      {feedbackMessage && (
        <div className="p-3.5 bg-gradient-to-r from-pink-950/90 to-amber-950/90 border border-pink-500/50 rounded-2xl text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMessage(null)}
            className="text-stone-300 hover:text-white text-xs cursor-pointer p-1"
            aria-label="Tutup notifikasi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main View Mode Selector & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2 bg-[#1e0e1d]/95 border border-pink-500/25 rounded-2xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setViewMode('transactions')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[40px] ${
              viewMode === 'transactions'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/25'
                : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
            }`}
          >
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>Rekap Transaksi ({bookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('attendees')}
            className={`flex items-center justify-center sm:justify-start gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap min-h-[40px] ${
              viewMode === 'attendees'
                ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-stone-950 font-black shadow-md shadow-amber-500/25'
                : 'text-stone-300 hover:text-white hover:bg-pink-950/40'
            }`}
          >
            <Users className="w-4 h-4 shrink-0" />
            <span>Biodata Peserta ({issuedTickets.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-pink-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={viewMode === 'transactions' ? 'Cari Invoice, Nama Pemesan...' : 'Cari Nama Peserta, NIK, No. HP...'}
            className="w-full pl-9 pr-3 py-2.5 text-xs bg-[#170a16] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
          />
        </div>
      </div>

      {/* TAB 1: REKAP TRANSAKSI & BUKTI BAYAR */}
      {viewMode === 'transactions' && (
        <div className="space-y-4">
          {/* Method Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
            <span className="text-[11px] text-pink-300/70 font-mono mr-1">Filter Metode:</span>
            <button
              onClick={() => setSelectedMethodFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedMethodFilter === 'all'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold shadow-sm'
                  : 'bg-[#221221] text-stone-300 hover:text-white border border-pink-950/60'
              }`}
            >
              Semua ({bookings.length})
            </button>
            <button
              onClick={() => setSelectedMethodFilter('qris')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedMethodFilter === 'qris'
                  ? 'bg-amber-400 text-stone-950 font-black shadow-sm'
                  : 'bg-[#221221] text-stone-300 hover:text-white border border-pink-950/60'
              }`}
            >
              QRIS
            </button>
            <button
              onClick={() => setSelectedMethodFilter('shopeepay')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedMethodFilter === 'shopeepay'
                  ? 'bg-pink-500 text-white font-bold shadow-sm'
                  : 'bg-[#221221] text-stone-300 hover:text-white border border-pink-950/60'
              }`}
            >
              ShopeePay
            </button>
            <button
              onClick={() => setSelectedMethodFilter('bri')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap ${
                selectedMethodFilter === 'bri'
                  ? 'bg-amber-400 text-stone-950 font-black shadow-sm'
                  : 'bg-[#221221] text-stone-300 hover:text-white border border-pink-950/60'
              }`}
            >
              Bank BRI
            </button>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="p-12 text-center bg-[#221221]/60 rounded-3xl border border-pink-500/20 space-y-3">
              <FileText className="w-10 h-10 text-pink-400/50 mx-auto" />
              <h3 className="text-sm font-bold text-white">Tidak Ada Transaksi Ditemukan</h3>
              <p className="text-xs text-stone-400">Coba ubah kata kunci pencarian atau filter metode pembayaran.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((b) => {
                const relatedTickets = issuedTickets.filter((t) => t.bookingId === b.id);
                const isPaid = b.paymentStatus === 'paid';
                const isVerified = b.verificationStatus === 'verified';

                return (
                  <div
                    key={b.id}
                    className="p-5 bg-[#221221]/95 border border-pink-500/25 rounded-3xl shadow-sm hover:border-pink-500/45 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5"
                  >
                    {/* Left: Booking & Customer Info */}
                    <div className="space-y-2.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-pink-200 bg-[#170a16] px-2.5 py-1 rounded-lg border border-pink-500/30">
                          {b.invoiceCode}
                        </span>

                        {isVerified ? (
                          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md border bg-pink-950/80 text-pink-300 border-pink-600/60 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-pink-400" />
                            <span>VERIFIKASI DISETUJUI</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-md border bg-amber-950/80 text-[#FACC15] border-amber-600/70 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" />
                            <span>MENUNGGU VERIFIKASI (1 × 24 JAM)</span>
                          </span>
                        )}

                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#170a16] text-stone-300 border border-pink-900/40">
                          Metode: <strong className="text-amber-300">{b.paymentMethod || 'QRIS'}</strong>
                        </span>

                        <span className="text-[10px] font-mono text-pink-300/60">
                          {new Date(b.createdAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })} WIB
                        </span>
                      </div>

                      {/* Penanggung Jawab / Buyer details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                        <div>
                          <span className="text-[10px] text-pink-300/60 block font-mono">Penanggung Jawab Pemesan:</span>
                          <span className="font-bold text-white truncate block">{b.customerName}</span>
                          <span className="text-[11px] text-stone-300 font-mono">{b.customerPhone} &bull; {b.customerEmail}</span>
                        </div>

                        <div>
                          <span className="text-[10px] text-pink-300/60 block font-mono">Total Tagihan &amp; Paket:</span>
                          <span className="font-bold text-stone-200">
                            {b.quantity} Paket ({relatedTickets.length} Peserta)
                          </span>
                          <span className="text-[11px] text-[#FACC15] block font-mono font-black">
                            Rp{b.totalAmount.toLocaleString('id-ID')}
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-pink-300/60 block font-mono">Pengirim &amp; Verifikasi:</span>
                          <span className="text-[11px] text-stone-300 block">
                            Atas Nama Rekening: <strong className="text-amber-300">{b.senderName || b.customerName}</strong>
                          </span>
                          {b.verifiedBy && (
                            <span className="text-[10px] text-pink-300 block font-mono">
                              Diverifikasi oleh: {b.verifiedBy}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* List of Attendees in this booking with NIK & Individual Download Button */}
                      {relatedTickets.length > 0 && (
                        <div className="pt-2 border-t border-pink-900/30 space-y-1.5">
                          <span className="text-[11px] font-mono text-pink-200/80 block font-semibold">
                            Biodata Peserta Terdaftar ({relatedTickets.length} Orang) &amp; Download Tiket:
                          </span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {relatedTickets.map((t) => (
                              <div 
                                key={t.id}
                                className="p-2.5 bg-[#170a16] rounded-2xl border border-pink-500/25 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0 space-y-0.5 text-xs">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-pink-300 text-[11px]">{t.ticketNumber}</span>
                                    <span className="font-bold text-white truncate">{t.attendeeName}</span>
                                    {t.packageName && (
                                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-amber-400 text-stone-950">
                                        Paket {t.packageName} #{t.packageMemberIndex || 1}/{t.packageTotalMembers || 1}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-[10px] font-mono text-stone-300 space-x-2">
                                    <span>NIK: <strong className="text-amber-300">{t.attendeeNik || ('**' + t.attendeeIdLast4)}</strong></span>
                                    <span>&bull;</span>
                                    <span>HP: {t.attendeePhone || '-'}</span>
                                  </div>
                                </div>

                                {/* Download & Preview Action */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleDownloadTicket(t)}
                                    disabled={downloadingTicketId === t.id}
                                    className="p-1.5 px-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 disabled:opacity-50 text-white rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                    title="Unduh E-Ticket (PNG) untuk dikirim ke peserta ini"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>{downloadingTicketId === t.id ? 'Mengunduh...' : 'Unduh'}</span>
                                  </button>

                                  <button
                                    onClick={() => setSelectedTicketForModal(t)}
                                    className="p-1.5 bg-[#251323] hover:bg-[#341a32] text-pink-200 rounded-lg text-[10px] transition-colors cursor-pointer border border-pink-500/30"
                                    title="Lihat E-Ticket"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Bukti Transfer Preview, Verifikasi & Download Action */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 border-pink-900/30">
                      {b.paymentProofUrl ? (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                          {/* Image Thumbnail */}
                          <div
                            onClick={() => setSelectedProofToView({ url: b.paymentProofUrl!, title: `Bukti Bayar ${b.invoiceCode} - ${b.customerName}` })}
                            className="w-20 h-20 rounded-2xl overflow-hidden bg-black border-2 border-amber-300/60 shrink-0 cursor-pointer relative group shadow-md"
                            title="Klik untuk memperbesar foto bukti transfer"
                          >
                            <img
                              src={b.paymentProofUrl}
                              alt="Bukti Transfer"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-5 h-5 text-white" />
                            </div>
                          </div>

                          {/* Actions: Download Proof, Verify Button & Delete Transaction */}
                          <div className="space-y-2 text-center sm:text-left w-full sm:w-auto">
                            <a
                              href={b.paymentProofUrl}
                              download={`Bukti_Transfer_${b.invoiceCode}_${b.customerName.replace(/\s+/g, '_')}.jpg`}
                              className="w-full px-3 py-1.5 bg-[#251323] hover:bg-[#341a32] text-pink-200 border border-pink-500/30 rounded-xl text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 text-amber-300" />
                              <span>Unduh Bukti</span>
                            </a>

                            {!isVerified ? (
                              <button
                                onClick={() => handleVerifyBooking(b.id)}
                                className="w-full px-3.5 py-2 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 rounded-xl text-xs font-black transition-all shadow-md shadow-pink-500/25 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Verifikasi Pembayaran</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDownloadAllTicketsForBooking(relatedTickets)}
                                className="w-full px-3 py-1.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-110 text-stone-950 rounded-xl text-xs font-black transition-all shadow-md shadow-amber-500/20 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Unduh Semua Tiket</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteBooking(b)}
                              className="w-full px-3 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/80 rounded-xl text-[11px] font-semibold transition-all inline-flex items-center justify-center gap-1 cursor-pointer"
                              title="Hapus transaksi ini dari sistem"
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              <span>Hapus Transaksi</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                          <div className="p-3 bg-[#170a16] rounded-xl border border-pink-500/25 text-pink-300/60 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-pink-400 shrink-0" />
                            <span>Belum ada file bukti transfer</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteBooking(b)}
                            className="px-3 py-2 bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-800/80 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                            title="Hapus transaksi ini dari sistem"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAFTAR SELURUH BIODATA PESERTA LENGKAP */}
      {viewMode === 'attendees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-pink-200/80">
            <span>
              Menampilkan <strong className="text-white tabular-nums">{filteredAttendees.length}</strong> dari <strong className="text-white tabular-nums">{issuedTickets.length}</strong> peserta terdaftar.
            </span>
            <span className="font-mono text-pink-300/70 text-[11px]">
              Setiap peserta memiliki E-Ticket mandiri yang dapat diunduh untuk dikirim via WhatsApp / Email.
            </span>
          </div>

          {/* Mobile Card View (< md) */}
          <div className="md:hidden space-y-3">
            {filteredAttendees.length === 0 ? (
              <div className="p-8 text-center bg-[#1e0e1d]/90 border border-pink-500/25 rounded-2xl text-stone-400 text-xs">
                Tidak ada data peserta yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredAttendees.map((t, idx) => {
                const relatedBooking = bookings.find((b) => b.id === t.bookingId);
                const isCheckedIn = t.status === 'checked-in';
                const isVerified = t.verificationStatus === 'verified' || relatedBooking?.verificationStatus === 'verified';

                return (
                  <div
                    key={t.id}
                    className="p-4 bg-[#1e0e1d]/95 border border-pink-500/25 rounded-2xl space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[11px] text-pink-300/60">#{idx + 1}</span>
                          <span className="font-mono font-bold text-pink-300 text-xs bg-pink-950/50 border border-pink-500/30 px-2 py-0.5 rounded">
                            {t.ticketNumber}
                          </span>
                          {t.packageName && (
                            <span className="font-mono text-[10px] font-bold text-amber-300">
                              Paket {t.packageName} ({t.packageMemberIndex || 1}/{t.packageTotalMembers || 1})
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1.5">{t.attendeeName}</h3>
                      </div>

                      {isCheckedIn ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded shrink-0">
                          MASUK GATE
                        </span>
                      ) : isVerified ? (
                        <span className="text-[10px] font-mono font-bold text-pink-300 bg-pink-950/80 border border-pink-600/60 px-2 py-0.5 rounded shrink-0">
                          TERVERIFIKASI
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-600/60 px-2 py-0.5 rounded shrink-0">
                          PROSES (1×24J)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-1.5 p-3 bg-[#150914] rounded-xl border border-pink-500/15 text-[11px] font-mono">
                      <div className="flex justify-between gap-2">
                        <span className="text-pink-300/60">NIK:</span>
                        <span className="text-amber-300 font-bold">{t.attendeeNik || ('**' + t.attendeeIdLast4)}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-pink-300/60">No. HP:</span>
                        <span className="text-stone-200">{t.attendeePhone || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-pink-300/60">Email:</span>
                        <span className="text-stone-200 truncate">{t.attendeeEmail || '-'}</span>
                      </div>
                      <div className="flex justify-between gap-2">
                        <span className="text-pink-300/60">Pemesan:</span>
                        <span className="text-stone-300 truncate">
                          {relatedBooking?.customerName || t.attendeeName} ({relatedBooking?.invoiceCode || '-'})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadTicket(t)}
                        disabled={downloadingTicketId === t.id}
                        className="flex-1 py-2.5 px-3 bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{downloadingTicketId === t.id ? 'Mengunduh...' : 'Unduh Tiket'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedTicketForModal(t)}
                        className="p-2.5 bg-[#251323] hover:bg-[#341a32] text-pink-200 rounded-xl transition-colors cursor-pointer border border-pink-500/30"
                        title="Lihat E-Ticket"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTicket(t)}
                        className="p-2.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 rounded-xl transition-colors cursor-pointer border border-rose-800/60"
                        title="Hapus tiket peserta ini"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop / Laptop Table View (>= md) */}
          <div className="hidden md:block bg-[#1e0e1d]/90 border border-pink-500/25 rounded-3xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#291327]/90 border-b border-pink-500/25 text-pink-200 font-mono uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">ID Tiket</th>
                    <th className="px-4 py-3">Nama Lengkap Peserta</th>
                    <th className="px-4 py-3">NIK (16 Digit)</th>
                    <th className="px-4 py-3">Kontak (HP &amp; Email)</th>
                    <th className="px-4 py-3">Paket / Bundle</th>
                    <th className="px-4 py-3">Penanggung Jawab / Invoice</th>
                    <th className="px-4 py-3">Status Verifikasi</th>
                    <th className="px-4 py-3 text-right">Aksi Unduh E-Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-900/30 font-sans">
                  {filteredAttendees.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-stone-400 text-xs">
                        Tidak ada data peserta yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
                      </td>
                    </tr>
                  ) : (
                    filteredAttendees.map((t, idx) => {
                      const relatedBooking = bookings.find((b) => b.id === t.bookingId);
                      const isCheckedIn = t.status === 'checked-in';
                      const isVerified = t.verificationStatus === 'verified' || relatedBooking?.verificationStatus === 'verified';

                      return (
                        <tr key={t.id} className="hover:bg-pink-950/20 transition-colors">
                          <td className="px-4 py-3.5 font-mono text-pink-300/50 text-xs tabular-nums">{idx + 1}</td>
                          <td className="px-4 py-3.5">
                            <span className="font-mono font-bold text-pink-300 text-xs bg-pink-950/40 border border-pink-500/30 px-2 py-0.5 rounded">
                              {t.ticketNumber}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-white text-xs whitespace-nowrap">
                            {t.attendeeName}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-amber-300 text-xs whitespace-nowrap tabular-nums">
                            {t.attendeeNik || ('**' + t.attendeeIdLast4)}
                          </td>
                          <td className="px-4 py-3.5 text-stone-200 text-xs whitespace-nowrap space-y-0.5 font-mono">
                            <div>{t.attendeePhone || '-'}</div>
                            <div className="text-pink-300/70 text-[11px]">{t.attendeeEmail || '-'}</div>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {t.packageName ? (
                              <span className="font-mono text-[10px] font-bold text-amber-300">
                                Paket {t.packageName} ({t.packageMemberIndex || 1}/{t.packageTotalMembers || 1})
                              </span>
                            ) : (
                              <span className="text-stone-300 text-xs">{t.ticketTypeName}</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                            <span className="text-stone-200 font-medium block">
                              {relatedBooking?.customerName || t.attendeeName}
                            </span>
                            <span className="font-mono text-pink-300/60 text-[10px] block">
                              {relatedBooking?.invoiceCode || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {isCheckedIn ? (
                              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                                SUDAH MASUK GATE
                              </span>
                            ) : isVerified ? (
                              <span className="text-[10px] font-mono font-bold text-pink-300 bg-pink-950/80 border border-pink-600/60 px-2 py-0.5 rounded">
                                TERVERIFIKASI
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 border border-amber-600/60 px-2 py-0.5 rounded">
                                MENUNGGU (1×24J)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadTicket(t)}
                                disabled={downloadingTicketId === t.id}
                                className="px-2.5 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                                title="Unduh file gambar E-Ticket PNG untuk dikirim ke peserta via email/WA"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>{downloadingTicketId === t.id ? 'Mengunduh...' : 'Unduh Tiket'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setSelectedTicketForModal(t)}
                                className="p-1.5 bg-[#251323] hover:bg-[#341a32] text-pink-200 rounded-lg text-xs transition-colors cursor-pointer border border-pink-500/30"
                                title="Lihat E-Ticket"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTicket(t)}
                                className="p-1.5 bg-rose-950/70 hover:bg-rose-900 text-rose-300 rounded-lg text-xs transition-colors cursor-pointer border border-rose-800/60"
                                title="Hapus tiket peserta ini"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Zoom Foto Bukti Transfer */}
      {selectedProofToView && (
        <div
          onClick={() => setSelectedProofToView(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[90vh] bg-stone-950 border border-stone-800 rounded-3xl p-5 shadow-2xl flex flex-col space-y-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white">{selectedProofToView.title}</h4>
                <span className="text-[11px] text-stone-400">Verifikasi Dokumen Bukti Transfer Pembeli</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={selectedProofToView.url}
                  download="Bukti_Transfer_AlasCerita.jpg"
                  className="px-3 py-1.5 bg-[#FA7022] hover:bg-[#e05e13] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File</span>
                </a>
                <button
                  onClick={() => setSelectedProofToView(null)}
                  className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-stone-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto max-h-[70vh] rounded-2xl bg-black border border-stone-800 p-2 flex items-center justify-center">
              <img
                src={selectedProofToView.url}
                alt="Bukti Transfer Penuh"
                className="max-w-full max-h-[65vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal View E-Ticket Pass (with Download action) */}
      {selectedTicketForModal && (
        <ETicketModal
          ticket={selectedTicketForModal}
          event={currentEvent}
          onClose={() => setSelectedTicketForModal(null)}
        />
      )}

      {/* Confirmation Modal: Delete Single Booking */}
      {confirmDeleteBooking && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#1c0f1c] border-2 border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-700/80 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Hapus Transaksi Ini?</h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Anda akan menghapus transaksi <strong className="text-amber-300">{confirmDeleteBooking.invoiceCode}</strong> atas nama <strong className="text-white">{confirmDeleteBooking.customerName}</strong>. Seluruh lembar tiket yang diterbitkan untuk pesanan ini juga akan terhapus.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteBooking(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-[#251323] hover:bg-[#341a32] text-stone-300 hover:text-white border border-pink-500/30 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteBooking}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:brightness-110 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-950/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Transaksi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Single Ticket */}
      {confirmDeleteTicket && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#1c0f1c] border-2 border-rose-500/40 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-700/80 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white">Hapus E-Ticket Peserta?</h3>
              <p className="text-xs text-stone-300 leading-relaxed">
                Hapus E-Ticket <strong className="text-pink-300 font-mono">{confirmDeleteTicket.ticketNumber}</strong> milik <strong className="text-white">{confirmDeleteTicket.attendeeName}</strong>? Akses tiket dan barcode QR ini tidak akan berlaku lagi di gate.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteTicket(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-[#251323] hover:bg-[#341a32] text-stone-300 hover:text-white border border-pink-500/30 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteTicket}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:brightness-110 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-950/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus Tiket'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Clear ALL Simulation Data */}
      {showConfirmClearAll && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#1c0f1c] border-2 border-amber-500/50 rounded-3xl p-6 shadow-2xl space-y-4 text-left">
            <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-600/70 flex items-center justify-center text-amber-300">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-300 bg-amber-950/70 border border-amber-600/60 px-2.5 py-0.5 rounded-full inline-block">
                PEMBERSIHAN DATA SIMULASI UNTUK LIVE PRODUKSI
              </span>
              <h3 className="text-xl font-black text-white">
                Hapus Semua Data Simulasi &amp; Reset ke Bersih?
              </h3>
              <p className="text-xs text-stone-200 leading-relaxed">
                Tindakan ini akan menghapus <strong>seluruh data transaksi simulasi, tiket uji coba, dan riwayat scan ganda</strong> dari sistem dan Cloud Firestore.
              </p>
              <div className="p-3 bg-[#170a16] rounded-xl border border-pink-500/25 space-y-1.5 text-xs">
                <span className="font-bold text-amber-300 block">Kondisi Setelah Dihapus:</span>
                <ul className="list-disc list-inside space-y-1 text-stone-300 text-[11px]">
                  <li>Total Transaksi: <strong>0 Transaksi</strong> (kosong)</li>
                  <li>Total Peserta: <strong>0 Orang</strong> (kosong)</li>
                  <li>Kuota Tiket Single: <strong>120 Tersedia</strong> (penuh)</li>
                  <li>Kuota Tiket Couple: <strong>70 Tersedia</strong> (penuh)</li>
                  <li>Kuota Tiket Circle: <strong>50 Tersedia</strong> (penuh)</li>
                </ul>
              </div>
              <p className="text-[11px] text-pink-300/80">
                * Setelah dibersihkan, website siap 100% menerima pembayaran dan pendaftaran asli dari masyarakat umum.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClearAll(false)}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-[#251323] hover:bg-[#341a32] text-stone-300 hover:text-white border border-pink-500/30 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeClearAllSimulation}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:brightness-110 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-rose-950/30 flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Membersihkan Database...' : 'Ya, Bersihkan Seluruh Data Simulasi'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
