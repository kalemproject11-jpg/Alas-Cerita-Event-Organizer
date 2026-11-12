import React, { useState } from 'react';
import { User, IssuedTicket, Event } from '../../types';
import { storageService } from '../../services/storageService';
import { soundEffects } from '../../services/soundEffects';
import {
  ShieldAlert,
  Search,
  UserCheck,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  Lock,
  FileText,
  Clock,
  ArrowRight
} from 'lucide-react';

interface SupervisorHelpdeskProps {
  currentUser: User;
  events: Event[];
  onOpenAuditLogs: () => void;
}

export const SupervisorHelpdesk: React.FC<SupervisorHelpdeskProps> = ({
  currentUser,
  events,
  onOpenAuditLogs,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<IssuedTicket[] | null>(null);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(5);
  
  // Selected ticket for manual verification
  const [selectedTicket, setSelectedTicket] = useState<IssuedTicket | null>(null);
  const [inputKTP4, setInputKTP4] = useState<string>('');
  const [supervisorNote, setSupervisorNote] = useState<string>('Layar HP pengunjung retak, KTP fisik asli diverifikasi.');
  const [verificationFeedback, setVerificationFeedback] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const isSupervisorOrAdmin =
    currentUser.role === 'gate_supervisor' || currentUser.role === 'super_admin';

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setRateLimitMessage(null);
    setVerificationFeedback(null);

    const res = storageService.searchTicketForSupervisor(searchQuery, currentUser);

    if (res.rateLimited) {
      setRateLimitMessage(res.error || 'Rate limit terlampaui.');
      setRemainingAttempts(0);
      setSearchResults(null);
      return;
    }

    if (!res.success) {
      setRateLimitMessage(res.error || 'Pencarian gagal.');
      return;
    }

    setRemainingAttempts(res.remainingAttempts ?? 5);
    setSearchResults(res.tickets || []);
  };

  const handleManualCheckIn = () => {
    if (!selectedTicket) return;
    setVerificationFeedback(null);

    if (!inputKTP4.trim() || inputKTP4.trim().length !== 4) {
      setVerificationFeedback({
        success: false,
        message: 'Masukkan 4 digit terakhir nomor KTP pengunjung.',
      });
      return;
    }

    const res = storageService.supervisorManualCheckIn({
      ticketId: selectedTicket.id,
      enteredIdLast4: inputKTP4.trim(),
      supervisorNote,
      supervisor: currentUser,
    });

    setVerificationFeedback({
      success: res.success,
      message: res.message,
    });

    if (res.success) {
      soundEffects.playSuccess();
      setSelectedTicket(res.ticket || null);
      // Refresh search results
      handleSearch();
    } else if (res.result === 'duplicate_scan') {
      soundEffects.playWarningDuplicate();
    } else {
      soundEffects.playErrorInvalid();
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>MODUL HELPDESK & JALUR DARURAT (SUPERVISOR OVERRIDE)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Verifikasi & Validasi Tiket Manual (KTP)
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Jalur darurat apabila QR Code gagal terbaca (layar retak, baterai habis, atau kendala jaringan).
          </p>
        </div>

        <button
          onClick={onOpenAuditLogs}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <FileText className="w-4 h-4 text-indigo-400" />
          <span>Buka Audit Log Keamanan &rarr;</span>
        </button>
      </div>

      {/* Security Notice on Role */}
      {!isSupervisorOrAdmin && (
        <div className="p-4 bg-amber-950/60 border border-amber-800/80 rounded-2xl flex items-start gap-3 text-amber-200 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-white font-semibold mb-0.5">Pemberitahuan Hak Akses (Role Management)</strong>
            <span>
              Anda saat ini login sebagai <strong>{currentUser.name}</strong> ({currentUser.role}).
              Sesuai spesifikasi FR-CHK-04, tindakan override manual wajib dilakukan oleh <strong>Gate Supervisor</strong> atau <strong>Super Admin</strong>.
              Gunakan pemilih peran di pojok kanan atas untuk beralih ke akun Supervisor jika diperlukan.
            </span>
          </div>
        </div>
      )}

      {/* Search Bar & Rate Limiting Widget (NFR-SEC-02) */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Pencarian ID Tiket Pendek (8 Karakter) atau Identitas Pemesan
          </span>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Anti Brute-Force Rate Limiter:</span>
            <span className={`font-bold ${remainingAttempts <= 1 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {remainingAttempts}/5 Percobaan / Menit
            </span>
          </div>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Contoh: TCK-7K9M, TCK-3X8W, atau ketik nama pembeli..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Cari Tiket
          </button>
        </form>

        {rateLimitMessage && (
          <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{rateLimitMessage}</span>
          </div>
        )}
      </div>

      {/* Search Results & Verification Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Matched Tickets (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Hasil Pencarian Tiket ({searchResults ? searchResults.length : 0})
          </span>

          {searchResults === null ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-500 text-xs">
              Ketikkan ID tiket (misal <code>TCK-7K9M</code> atau <code>TCK-3X8W</code>) dan tekan Cari.
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 text-xs">
              Tidak ditemukan tiket yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="space-y-3">
              {searchResults.map((t) => {
                const event = events.find((e) => e.id === t.eventId);
                const isCheckedIn = t.status === 'checked-in';
                const isSelected = selectedTicket?.id === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => {
                      setSelectedTicket(t);
                      setInputKTP4('');
                      setVerificationFeedback(null);
                    }}
                    className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/30 border-indigo-500 ring-1 ring-indigo-500'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-indigo-300">
                        {t.ticketNumber}
                      </span>
                      {isCheckedIn ? (
                        <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded">
                          Sudah Check-In
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded">
                          Belum Check-In (Valid)
                        </span>
                      )}
                    </div>

                    <div className="mt-2 space-y-1">
                      <span className="text-sm font-bold text-white block">{t.attendeeName}</span>
                      <span className="text-xs text-slate-400 block">{event?.title} &middot; {t.ticketTypeName}</span>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                      <span>4-Digit KTP Tersimpan: **{t.attendeeIdLast4}</span>
                      <span className="text-indigo-400 font-medium">Verifikasi Tiket &rarr;</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Physical KTP Verification & Approval Form (lg:col-span-6) */}
        <div className="lg:col-span-6 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Formulir Konfirmasi Supervisor & Verifikasi KTP Fisik
          </span>

          {selectedTicket ? (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-5">
              
              {/* Ticket Preview Card */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">ID Tiket:</span>
                  <span className="font-mono font-bold text-white text-sm">{selectedTicket.ticketNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nama Pengunjung:</span>
                  <span className="font-bold text-white">{selectedTicket.attendeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tier / Kelas:</span>
                  <span className="text-indigo-300 font-semibold">{selectedTicket.ticketTypeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status Check-In:</span>
                  <span className={selectedTicket.status === 'checked-in' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {selectedTicket.status.toUpperCase()}
                  </span>
                </div>
                {selectedTicket.checkedInAt && (
                  <div className="flex justify-between text-amber-300/80">
                    <span>Waktu Masuk Sebelumnya:</span>
                    <span>{new Date(selectedTicket.checkedInAt).toLocaleTimeString('id-ID')} WIB</span>
                  </div>
                )}
              </div>

              {/* Form Input: 4 Digits KTP */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white block">
                  Cocokkan 4 Digit Terakhir Nomor KTP Pengunjung (Fisik)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={4}
                    value={inputKTP4}
                    onChange={(e) => setInputKTP4(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 7821"
                    className="w-full px-4 py-2.5 text-base font-mono tracking-widest bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-[11px] text-slate-400 block">
                  Petugas supervisor wajib melihat KTP/SIM/Paspor fisik pengunjung sebelum memasukkan angka.
                </span>
              </div>

              {/* Form Input: Supervisor Note */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-white block">
                  Catatan Persetujuan Supervisor (Audit Trail)
                </label>
                <textarea
                  rows={2}
                  value={supervisorNote}
                  onChange={(e) => setSupervisorNote(e.target.value)}
                  placeholder="Alasan pengecekan manual..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Feedback Alert */}
              {verificationFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    verificationFeedback.success
                      ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                      : 'bg-rose-950/80 border-rose-800 text-rose-200'
                  }`}
                >
                  {verificationFeedback.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertOctagon className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  )}
                  <span>{verificationFeedback.message}</span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleManualCheckIn}
                disabled={selectedTicket.status === 'checked-in'}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {selectedTicket.status === 'checked-in'
                    ? 'Tiket Sudah Check-In (Tidak Dapat Diulang)'
                    : 'Konfirmasi Check-In Manual & Cetak Stempel Gate'}
                </span>
              </button>
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-500 text-xs space-y-2">
              <UserCheck className="w-10 h-10 mx-auto text-slate-600" />
              <p>Pilih salah satu tiket dari hasil pencarian di sebelah kiri untuk memulai proses verifikasi manual.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
