import React, { useState } from 'react';
import { IssuedTicket, Event, User } from '../../types';
import { ETicketModal } from './ETicketModal';
import { Ticket, QrCode, Calendar, MapPin, CheckCircle2, Clock, Eye, AlertCircle } from 'lucide-react';

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

  // Filter tickets for current user or show all if admin/demo
  const userTickets = tickets.filter(
    (t) =>
      t.attendeeEmail.toLowerCase() === currentUser.email.toLowerCase() ||
      t.attendeeName.toLowerCase().includes(currentUser.name.toLowerCase().split(' ')[0]) ||
      currentUser.role === 'super_admin'
  );

  return (
    <div className="space-y-8 pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Tiket Saya & E-Pass</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Daftar lembar tiket resmi yang telah lunas. Tunjukkan QR Code pada layar ponsel atau bawa hasil cetak saat masuk gate.
          </p>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg shrink-0">
          Total: <span className="text-indigo-400 font-bold">{userTickets.length} Lembar Tiket</span>
        </div>
      </div>

      {userTickets.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 space-y-4">
          <Ticket className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">Belum Ada Tiket yang Dibeli</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
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
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="p-6 space-y-4">
                  {/* Top Bar on Card */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono text-indigo-400 font-semibold">
                      {ticket.ticketNumber}
                    </span>

                    {isCheckedIn ? (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>SUDAH CHECK-IN</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800/80 px-2.5 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>VALID (SIAP SCAN)</span>
                      </span>
                    )}
                  </div>

                  {/* Event & Attendee Info */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white line-clamp-1">
                      {event?.title || 'Event Acara'}
                    </h3>

                    <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Pengunjung:</span>
                        <span className="text-white font-bold">{ticket.attendeeName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Kategori:</span>
                        <span className="text-indigo-300 font-medium">{ticket.ticketTypeName}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Verifikasi 4-Digit KTP:</span>
                        <span className="font-mono text-slate-300">**{ticket.attendeeIdLast4}</span>
                      </div>
                    </div>

                    <div className="space-y-1 pt-1 text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{event ? new Date(event.startTime).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span className="line-clamp-1">{event?.venue}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-4 px-6 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setSelectedTicket(ticket)}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-slate-300" />
                    <span>Buka E-Ticket & QR</span>
                  </button>

                  <button
                    onClick={() => onOpenGateScannerWithTicket(ticket)}
                    title="Uji pindai tiket ini langsung di Gate Scanner"
                    className="py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <QrCode className="w-4 h-4 text-emerald-400" />
                    <span>Uji Scan Gate</span>
                  </button>
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
