import React, { useState } from 'react';
import { IssuedTicket, Event, User } from '../../types';
import { ETicketModal } from './ETicketModal';
import { Ticket, QrCode, Calendar, MapPin, CheckCircle2, Clock, Eye, AlertCircle, Download } from 'lucide-react';
import { downloadTicketAsPNG } from '../../utils/ticketDownloader';

interface MyTicketsViewProps {
  currentUser: User;
  tickets: IssuedTicket[];
  events: Event[];
  onOpenGateScannerWithTicket: (ticket: IssuedTicket) => void;
}

export const MyTicketsView: React.FC<MyTicketsViewProps> = ({
  currentUser,
  tickets,
  events,
  onOpenGateScannerWithTicket,
}) => {
  const [selectedTicket, setSelectedTicket] = useState<IssuedTicket | null>(null);

  // Filter tickets for current user or show all if admin/staff
  const userTickets = tickets.filter(
    (t) =>
      currentUser.role !== 'customer' ||
      t.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase() ||
      t.attendeeName.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0])
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 bg-clip-text text-transparent tracking-tight">Tiket Saya &amp; E-Pass</h1>
          <p className="text-xs sm:text-sm text-stone-300 mt-1">
            Daftar lembar tiket resmi yang telah lunas. Tunjukkan QR Code pada layar ponsel atau bawa hasil cetak saat masuk gate.
          </p>
        </div>

        <div className="text-xs font-mono text-pink-200 bg-[#251323] border border-pink-500/30 px-3.5 py-1.5 rounded-xl shrink-0">
          Total: <span className="text-[#FACC15] font-bold">{userTickets.length} Lembar Tiket</span>
        </div>
      </div>

      {userTickets.length === 0 ? (
        <div className="p-12 text-center bg-[#20101e]/60 rounded-2xl border border-pink-500/25 space-y-4">
          <Ticket className="w-12 h-12 text-pink-400/50 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Belum Ada Tiket yang Dibeli</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Anda belum memiliki tiket untuk akun ini. Silakan buka tab Katalog Event untuk memesan tiket.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userTickets.map((ticket) => {
            const event = events.find((e) => e.id === ticket.eventId);
            const isCheckedIn = ticket.status === 'checked-in';

            return (
              <div
                key={ticket.id}
                className="bg-[#1e0e1d]/90 border border-pink-500/25 rounded-2xl overflow-hidden hover:border-pink-500/45 transition-all flex flex-col justify-between shadow-md"
              >
                <div className="p-6 space-y-4">
                  {/* Top Bar on Card */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-pink-300 font-bold bg-[#170a16] px-2 py-0.5 rounded border border-pink-500/30">
                        {ticket.ticketNumber}
                      </span>
                      {ticket.packageName && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-400 text-stone-950">
                          Paket {ticket.packageName} ({ticket.packageMemberIndex || 1}/{ticket.packageTotalMembers || 1})
                        </span>
                      )}
                    </div>

                    {isCheckedIn ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-md shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>SUDAH CHECK-IN</span>
                      </span>
                    ) : ticket.verificationStatus === 'pending_verification' ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-950/80 border border-amber-600/70 px-2.5 py-1 rounded-md shrink-0">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>PROSES VERIFIKASI (1 × 24 JAM)</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[11px] font-bold text-pink-300 bg-pink-950/80 border border-pink-600/60 px-2.5 py-1 rounded-md shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5 text-pink-400" />
                        <span>VALID (SIAP SCAN)</span>
                      </span>
                    )}
                  </div>

                  {/* Event & Attendee Info */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white line-clamp-1">
                      {event?.title || 'Event Acara'}
                    </h3>

                    <div className="p-3 bg-[#170a16] rounded-xl border border-pink-500/20 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-pink-300/60">Pengunjung:</span>
                        <span className="text-white font-bold">{ticket.attendeeName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-pink-300/60">Kategori:</span>
                        <span className="text-[#FACC15] font-bold">{ticket.ticketTypeName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-pink-300/60">Asal / Lembaga:</span>
                        <span className="font-mono text-amber-300 font-bold text-right truncate">
                          {ticket.attendeeOrigin || ticket.attendeeNik || '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-pink-300/60">Email:</span>
                        <span className="text-stone-300 font-mono">{ticket.attendeeEmail}</span>
                      </div>
                      {ticket.packageName && (
                        <div className="flex items-center justify-between pt-1 border-t border-pink-900/30 text-[11px]">
                          <span className="text-pink-300/70">Status Bundle:</span>
                          <span className="text-amber-300 font-medium">Peserta ke-{ticket.packageMemberIndex} dari total {ticket.packageTotalMembers} orang</span>
                        </div>
                      )}
                    </div>

                    {ticket.verificationStatus === 'pending_verification' && (
                      <div className="p-2.5 bg-gradient-to-r from-pink-950/60 to-amber-950/60 border border-amber-500/40 rounded-xl text-[11px] text-amber-200 leading-relaxed flex items-start gap-2">
                        <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          Tiket sedang dalam proses verifikasi pembayaran. E-Ticket resmi akan dikirimkan ke email <strong className="text-white">{ticket.attendeeEmail}</strong> dalam kurun waktu 1 × 24 jam.
                        </span>
                      </div>
                    )}

                    <div className="space-y-1 pt-1 text-xs text-stone-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                        <span>{event ? new Date(event.startTime).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="line-clamp-1">{event?.venue}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 px-6 bg-[#170a16]/95 border-t border-pink-900/30 flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedTicket(ticket)}
                    className="flex-1 py-2 px-3 bg-[#261324] hover:bg-[#341a32] text-pink-200 border border-pink-500/30 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4 text-pink-300" />
                    <span>Lihat E-Ticket</span>
                  </button>

                  {/* Direct Download E-Ticket Button */}
                  <button
                    onClick={() => {
                      const ev = events.find((e) => e.id === ticket.eventId) || events[0];
                      if (ev) downloadTicketAsPNG(ticket, ev);
                    }}
                    className="flex-1 py-2 px-3 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-pink-500/25 whitespace-nowrap"
                    title="Unduh file gambar E-Ticket PNG untuk dikirimkan ke peserta"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Tiket (PNG)</span>
                  </button>

                  {currentUser.role !== 'customer' && (
                    <button
                      onClick={() => onOpenGateScannerWithTicket(ticket)}
                      title="Uji pindai tiket ini langsung di Gate Scanner"
                      className="py-2 px-3 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <QrCode className="w-4 h-4 text-amber-400" />
                      <span>Scan Gate</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* E-Ticket Modal preview */}
      {selectedTicket && (
        <ETicketModal
          ticket={selectedTicket}
          event={events.find((e) => e.id === selectedTicket.eventId) || events[0]}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
};
