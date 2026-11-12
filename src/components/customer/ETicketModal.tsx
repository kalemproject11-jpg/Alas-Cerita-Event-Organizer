import React, { useEffect, useState } from 'react';
import { IssuedTicket, Event } from '../../types';
import QRCode from 'qrcode';
import { X, Printer, Calendar, MapPin, CheckCircle2, ShieldCheck, UserCheck, AlertTriangle } from 'lucide-react';

interface ETicketModalProps {
  ticket: IssuedTicket;
  event: Event;
  onClose: () => void;
}

export const ETicketModal: React.FC<ETicketModalProps> = ({ ticket, event, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    // Generate QR Code from qrToken (UUID v4)
    QRCode.toDataURL(ticket.qrToken, {
      width: 280,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error(err));
  }, [ticket.qrToken]);

  const handlePrint = () => {
    window.print();
  };

  const isCheckedIn = ticket.status === 'checked-in';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6">
        
        {/* Header utility bar (hidden in print) */}
        <div className="px-6 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-medium text-slate-300">
              OFFICIAL E-TICKET PASS &middot; ENCRYPTED QR
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Unduh PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* E-Ticket Card Layout (Target for print & view) */}
        <div className="p-6 sm:p-8 space-y-6 bg-slate-900 text-white">
          {/* Ticket Header & Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
                {event.category} FESTIVAL PASS
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">{event.title}</h2>
              <p className="text-xs text-slate-400 mt-1">{event.organizer}</p>
            </div>

            {/* Check-in status pill/badge */}
            <div className="shrink-0">
              {isCheckedIn ? (
                <div className="p-2.5 px-3 bg-amber-950/80 border border-amber-800/80 rounded-xl text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>SUDAH CHECK-IN</span>
                  </div>
                  <span className="text-[10px] text-amber-400/80 font-mono block mt-0.5">
                    {new Date(ticket.checkedInAt || '').toLocaleTimeString('id-ID')} WIB
                  </span>
                </div>
              ) : (
                <div className="p-2.5 px-3 bg-emerald-950/80 border border-emerald-800/80 rounded-xl text-left">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>TIKET SAH & AKTIF</span>
                  </div>
                  <span className="text-[10px] text-emerald-400/80 block mt-0.5">
                    Tunjukkan QR di Pintu Masuk
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Ticket Body: QR Code & Visual Details */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            
            {/* Left QR Box */}
            <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-inner text-slate-950">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="E-Ticket QR Code" className="w-44 h-44 object-contain" />
              ) : (
                <div className="w-44 h-44 bg-slate-200 animate-pulse rounded-lg" />
              )}
              
              {/* Visual 8-character Ticket Number (FR-TKT-02) */}
              <div className="mt-2 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-600 block">ID TIKET VISUAL</span>
                <span className="text-base font-black font-mono tracking-widest text-slate-900">
                  {ticket.ticketNumber}
                </span>
              </div>
            </div>

            {/* Right Information Details */}
            <div className="sm:col-span-7 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/90">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Kategori Tiket</span>
                  <span className="text-sm font-bold text-indigo-300">{ticket.ticketTypeName}</span>
                </div>
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/90">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Pintu / Gate Masuk</span>
                  <span className="text-sm font-bold text-white">{ticket.seat_or_gate || 'Gate Utama'}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Nama Pengunjung</span>
                  <span className="text-[10px] font-mono text-indigo-400">4-Digit KTP: **{ticket.attendeeIdLast4}</span>
                </div>
                <span className="text-sm font-bold text-white block">{ticket.attendeeName}</span>
                <span className="text-xs text-slate-400 block">{ticket.attendeeEmail} &middot; {ticket.attendeePhone}</span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>
                    {new Date(event.startTime).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    WIB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span>{event.venue}, {event.city}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security & Entry Rules */}
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-[11px] text-slate-400 space-y-2">
            <div className="flex items-center gap-2 text-slate-200 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Ketentuan Validasi Pintu Masuk (Anti-Double Scan)</span>
            </div>
            <p>
              1. QR Code ini bersifat unik, terenkripsi kriptografi, dan hanya dapat dipindai <strong>1 kali</strong> di pintu masuk.
            </p>
            <p>
              2. Tangkapan layar yang dibagikan atau dipindai ulang akan otomatis ditolak dan memicu sirene peringatan scan ganda pada terminal petugas.
            </p>
            <p>
              3. Jika layar ponsel retak atau QR gagal terbaca, hubungi <strong>Posko Helpdesk Supervisor</strong> dengan menunjukkan ID Tiket Visual <strong>({ticket.ticketNumber})</strong> dan KTP fisik asli.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
