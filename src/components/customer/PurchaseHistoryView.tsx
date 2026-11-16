import React from 'react';
import { Booking, IssuedTicket } from '../../types';
import { CheckCircle2, Clock, Receipt } from 'lucide-react';

interface PurchaseHistoryViewProps {
  purchases: Array<{ booking: Booking; tickets: IssuedTicket[] }>;
}

export const PurchaseHistoryView: React.FC<PurchaseHistoryViewProps> = ({ purchases }) => {
  return (
    <div className="space-y-5 pb-16 max-w-3xl mx-auto">
      <div className="p-5 sm:p-6 bg-gradient-to-br from-[#2b1224] via-[#1f131f] to-[#0e2318] border border-pink-500/30 rounded-3xl shadow-xl">
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Riwayat Pembelian
        </h1>
      </div>

      {purchases.length === 0 ? (
        <div className="p-8 sm:p-10 text-center bg-[#20101e]/75 rounded-3xl border border-pink-500/25 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-pink-500/15 border border-pink-500/30 text-pink-300 flex items-center justify-center mx-auto">
            <Receipt className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-stone-200">
            Belum ada riwayat pembelian di perangkat ini.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map(({ booking, tickets }) => {
            const isVerified =
              booking.verificationStatus === 'verified' ||
              (tickets.length > 0 && tickets.every((t) => t.verificationStatus === 'verified'));

            return (
              <div
                key={booking.id}
                className="p-4 sm:p-5 bg-[#1e0e1d]/95 border border-pink-500/30 rounded-2xl shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="text-xs font-mono text-pink-300/75">
                    Nama Pembeli
                  </div>
                  <div className="text-base font-bold text-white break-words">
                    {booking.customerName}
                  </div>
                  <div className="text-xs font-mono text-stone-300">
                    No: {booking.customerPhone}
                  </div>
                </div>

                {isVerified ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase px-3 py-1.5 rounded-xl border bg-emerald-950/85 text-emerald-300 border-emerald-400/60 self-start sm:self-center shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Terverifikasi</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold uppercase px-3 py-1.5 rounded-xl border bg-pink-950/85 text-pink-200 border-pink-500/60 self-start sm:self-center shrink-0">
                    <Clock className="w-4 h-4 text-pink-400 shrink-0" />
                    <span>Menunggu Verifikasi</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
