import React, { useState } from 'react';
import { Booking, IssuedTicket, Event } from '../../types';
import { CopyButton } from '../common/CopyButton';
import {
  Receipt,
  Clock,
  CheckCircle2,
  Eye,
  Ticket,
  MessageCircle,
  ArrowLeft,
  ShieldCheck,
  Image as ImageIcon,
  X,
  Smartphone,
} from 'lucide-react';

interface PurchaseHistoryViewProps {
  purchases: Array<{ booking: Booking; tickets: IssuedTicket[] }>;
  events: Event[];
  onBackToCatalog: () => void;
}

export const PurchaseHistoryView: React.FC<PurchaseHistoryViewProps> = ({
  purchases,
  events: _events,
  onBackToCatalog,
}) => {
  const [selectedProof, setSelectedProof] = useState<{ url: string; title: string } | null>(null);

  const getPackageLabel = (booking: Booking, tickets: IssuedTicket[]): string => {
    const fromTicket = tickets[0]?.packageName || tickets[0]?.ticketTypeName;
    if (fromTicket) return fromTicket;
    if (booking.ticketTypeId === 'tt_alas_couple') return 'Couple';
    if (booking.ticketTypeId === 'tt_alas_circle') return 'Circle';
    if (booking.ticketTypeId === 'tt_alas_single') return 'Single';
    return 'Tiket';
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 bg-gradient-to-br from-[#2b1224] via-[#1f131f] to-[#0e2318] border border-pink-500/30 rounded-3xl shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
            <Smartphone className="w-3.5 h-3.5 text-pink-400 shrink-0" />
            <span>Tersimpan Khusus di Perangkat Ini</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Riwayat Pembelian &amp; Pantau Verifikasi
          </h1>
          <p className="text-xs text-stone-300 max-w-2xl leading-relaxed">
            Hanya menampilkan invoice, bukti pembayaran, dan tiket yang dibeli langsung dari HP Anda untuk memantau status verifikasi secara real-time.
          </p>
        </div>

        <button
          type="button"
          onClick={onBackToCatalog}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap min-h-[42px]"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Kembali ke Halaman Event</span>
        </button>
      </div>

      {/* Empty State */}
      {purchases.length === 0 ? (
        <div className="p-8 sm:p-12 text-center bg-[#20101e]/75 rounded-3xl border border-pink-500/25 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-300 flex items-center justify-center mx-auto">
            <Receipt className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-bold text-white">
              Belum Ada Riwayat Pembelian di HP Ini
            </h2>
            <p className="text-xs text-stone-300 max-w-md mx-auto leading-relaxed">
              Setelah Anda menyelesaikan pendaftaran dan mengunggah bukti transfer dari perangkat ini, invoice beserta status verifikasinya akan muncul otomatis di sini.
            </p>
          </div>
          <button
            type="button"
            onClick={onBackToCatalog}
            className="px-6 py-3 bg-pink-500 hover:bg-pink-400 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-pink-500/25 cursor-pointer"
          >
            Pesan Tiket Alas Cerita
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {purchases.map(({ booking, tickets }) => {
            const isVerified =
              booking.verificationStatus === 'verified' ||
              (tickets.length > 0 && tickets.every((t) => t.verificationStatus === 'verified'));

            return (
              <div
                key={booking.id}
                className="p-5 sm:p-6 bg-[#1e0e1d]/95 border border-pink-500/30 rounded-3xl shadow-lg space-y-5"
              >
                {/* Top Row: Invoice + Status Badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-pink-500/20">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-pink-200 bg-[#150914] px-3 py-1 rounded-lg border border-pink-500/35 inline-flex items-center gap-1.5">
                      <span>{booking.invoiceCode}</span>
                      <CopyButton text={booking.invoiceCode} label="Salin nomor invoice" />
                    </span>

                    <span className="text-[11px] font-mono text-stone-400">
                      {new Date(booking.createdAt).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      WIB
                    </span>
                  </div>

                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase px-3 py-1 rounded-lg border bg-emerald-950/85 text-emerald-300 border-emerald-400/60 self-start sm:self-auto">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>TERVERIFIKASI PANITIA</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase px-3 py-1 rounded-lg border bg-pink-950/85 text-pink-200 border-pink-500/60 self-start sm:self-auto">
                      <Clock className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                      <span>MENUNGGU VERIFIKASI (1 × 24 JAM)</span>
                    </span>
                  )}
                </div>

                {/* Details + Proof Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                  {/* Left: Invoice Summary & Purchased Tickets */}
                  <div className="lg:col-span-8 space-y-4 min-w-0">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[#150914] rounded-2xl border border-pink-500/20 text-xs">
                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-mono text-pink-300/70 block">Data Pembeli:</span>
                        <span className="font-bold text-white block truncate">{booking.customerName}</span>
                        <span className="text-[11px] font-mono text-stone-300 block truncate">
                          HP: {booking.customerPhone}
                        </span>
                        <span className="text-[11px] font-mono text-pink-200/80 block truncate">
                          {booking.customerEmail}
                        </span>
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-mono text-pink-300/70 block">Paket yang Dibeli:</span>
                        <span className="font-bold text-white block">
                          Paket {getPackageLabel(booking, tickets)} &bull; {booking.quantity} Paket ({tickets.length || booking.quantity} Peserta)
                        </span>
                        <span className="text-base font-black font-mono text-emerald-300 block tabular-nums pt-0.5">
                          Rp. {booking.totalAmount.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <span className="text-[10px] font-mono text-pink-300/70 block">Pembayaran &amp; Pengirim:</span>
                        <span className="font-bold text-emerald-300 uppercase font-mono block">
                          Metode: {booking.paymentMethod || 'QRIS'}
                        </span>
                        <span className="text-[11px] text-stone-300 block truncate">
                          Rek. Pengirim: {booking.senderName || booking.customerName}
                        </span>
                      </div>
                    </div>

                    {/* Verification guidance / WA Business CP notice when pending */}
                    {!isVerified ? (
                      <div className="p-3.5 bg-gradient-to-r from-[#2b1224] to-[#11241a] border border-emerald-400/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                            <ShieldCheck className="w-4 h-4 shrink-0" />
                            <span>Bukti Sudah Masuk Antrean Verifikasi</span>
                          </div>
                          <p className="text-[11px] text-stone-200 leading-relaxed">
                            Mohon konfirmasi ke WhatsApp Business CP <strong className="font-mono text-pink-300">0819-3655-3249</strong> agar verifikasi segera diproses. E-Ticket juga dikirim ke email <strong>{booking.customerEmail}</strong>.
                          </p>
                        </div>

                        <a
                          href={`https://wa.me/6281936553249?text=${encodeURIComponent(
                            `Halo Admin Alas Cerita, saya ingin konfirmasi status verifikasi pembayaran:\n• Nama Pemesan: ${booking.customerName}\n• No. Invoice: ${booking.invoiceCode}\n• Email: ${booking.customerEmail}\n• Total Tagihan: Rp${booking.totalAmount.toLocaleString('id-ID')}\n\nMohon bantuannya untuk verifikasi. Terima kasih!`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2.5 bg-pink-500 hover:bg-pink-400 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-pink-500/25 inline-flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>Konfirmasi WA CP</span>
                        </a>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-[#0f2419] border border-emerald-400/50 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Pembayaran telah diverifikasi{booking.verifiedBy ? ` oleh ${booking.verifiedBy}` : ''}. E-Ticket resmi dikirimkan panitia ke email terdaftar (<strong className="text-white">{booking.customerEmail}</strong>) atau via WhatsApp panitia.
                        </span>
                      </div>
                    )}

                    {/* Purchased Package & Registered Attendees Summary (Read-only status monitoring) */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-pink-200 flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Rincian Paket &amp; Peserta Terdaftar ({tickets.length} Orang)</span>
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {tickets.map((t) => {
                          const ticketVerified = isVerified || t.verificationStatus === 'verified';
                          const isCheckedIn = t.status === 'checked-in';

                          return (
                            <div
                              key={t.id}
                              className="p-3.5 bg-[#150914] rounded-2xl border border-pink-500/25 flex flex-col justify-between gap-2.5"
                            >
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-pink-300 text-xs bg-pink-950/50 border border-pink-500/30 px-2 py-0.5 rounded">
                                    {t.ticketNumber}
                                  </span>
                                  {isCheckedIn ? (
                                    <span className="text-[10px] font-mono font-bold text-emerald-300">
                                      SUDAH CHECK-IN
                                    </span>
                                  ) : ticketVerified ? (
                                    <span className="text-[10px] font-mono font-bold text-emerald-300">
                                      TERVERIFIKASI
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono font-bold text-pink-300">
                                      MENUNGGU VERIFIKASI
                                    </span>
                                  )}
                                </div>

                                <div className="font-bold text-white text-sm truncate pt-0.5">
                                  {t.attendeeName}
                                </div>
                                <div className="text-[11px] font-mono text-emerald-300 truncate">
                                  {t.packageName ? `Paket ${t.packageName}` : t.ticketTypeName} &bull; {t.attendeeOrigin || 'Umum'}
                                </div>
                                {(t.attendeePhone || t.attendeeEmail) && (
                                  <div className="text-[10px] font-mono text-stone-400 truncate">
                                    {t.attendeePhone || '-'} &bull; {t.attendeeEmail || '-'}
                                  </div>
                                )}
                              </div>

                              <div className="pt-2 border-t border-pink-900/30 text-[11px] font-mono">
                                {ticketVerified ? (
                                  <span className="text-emerald-300">
                                    Pembayaran sah &bull; E-Ticket dikirim panitia ke email terdaftar.
                                  </span>
                                ) : (
                                  <span className="text-stone-400">
                                    Sedang dalam antrean verifikasi panitia (1 &times; 24 jam).
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right: Uploaded Payment Proof Preview */}
                  <div className="lg:col-span-4 bg-[#150914] border border-pink-500/25 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Bukti Pembayaran</span>
                      </span>
                      {booking.proofUploadedAt && (
                        <span className="text-[10px] font-mono text-stone-400">
                          Terkirim
                        </span>
                      )}
                    </div>

                    {booking.paymentProofUrl ? (
                      <div className="space-y-2.5">
                        <div
                          onClick={() =>
                            setSelectedProof({
                              url: booking.paymentProofUrl!,
                              title: `Bukti Pembayaran ${booking.invoiceCode}`,
                            })
                          }
                          className="w-full h-44 rounded-xl overflow-hidden bg-black border border-emerald-400/50 cursor-pointer relative group"
                          title="Klik untuk memperbesar bukti transfer"
                        >
                          <img
                            src={booking.paymentProofUrl}
                            alt={`Bukti Transfer ${booking.invoiceCode}`}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="px-3 py-1.5 bg-pink-500 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5">
                              <Eye className="w-3.5 h-3.5" />
                              <span>Perbesar Bukti</span>
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedProof({
                              url: booking.paymentProofUrl!,
                              title: `Bukti Pembayaran ${booking.invoiceCode}`,
                            })
                          }
                          className="w-full py-2 px-3 bg-[#251323] hover:bg-[#341a32] text-pink-200 border border-pink-500/30 rounded-xl text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Lihat Bukti Transfer</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-6 text-center rounded-xl border border-dashed border-pink-500/25 text-xs text-stone-400">
                        Bukti transfer tercatat di server panitia.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Zoom Bukti Pembayaran */}
      {selectedProof && (
        <div
          onClick={() => setSelectedProof(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl w-full max-h-[90vh] bg-[#1c0f1c] border border-pink-500/35 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white truncate">{selectedProof.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedProof(null)}
                className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-pink-950/50 cursor-pointer"
                aria-label="Tutup pratinjau"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-auto max-h-[75vh] bg-black rounded-2xl p-2 flex items-center justify-center border border-pink-500/20">
              <img
                src={selectedProof.url}
                alt={selectedProof.title}
                className="max-w-full max-h-[70vh] object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
