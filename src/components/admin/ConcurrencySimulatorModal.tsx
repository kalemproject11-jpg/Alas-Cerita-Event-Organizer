import React, { useState } from 'react';
import { storageService } from '../../services/storageService';
import { X, Zap, ShieldCheck, AlertOctagon, CheckCircle2, Play, Code2 } from 'lucide-react';

interface ConcurrencySimulatorModalProps {
  onClose: () => void;
}

export const ConcurrencySimulatorModal: React.FC<ConcurrencySimulatorModalProps> = ({ onClose }) => {
  const [useLock, setUseLock] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<{
    totalRequests: number;
    availableBefore: number;
    successCount: number;
    failedCount: number;
    oversoldCount: number;
    logs: Array<{ requestIndex: number; success: boolean; message: string; delayMs: number }>;
  } | null>(null);

  const handleRunSimulation = () => {
    setIsRunning(true);
    setSimulationResult(null);

    setTimeout(() => {
      const res = storageService.runConcurrencySimulation(useLock);
      setSimulationResult(res);
      setIsRunning(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Simulasi Concurrency & Pessimistic Locking (War Tiket Engine)
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                Spesifikasi NFR-CON-01: Laravel DB::transaction &amp; lockForUpdate()
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Explanation Box */}
          <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800 space-y-2 text-xs text-slate-300">
            <span className="font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Skenario Pengujian Lomba Transaksi (High-Concurrency Flash Sale)</span>
            </span>
            <p className="leading-relaxed">
              Terdapat <strong>10 thread pemesanan bersamaan</strong> yang menembak server dalam milidetik yang sama, memperebutkan <strong>sisa 2 lembar tiket terakhir</strong>.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setUseLock(true);
                setSimulationResult(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                useLock
                  ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-emerald-300">
                  Mode 1: Dengan Pessimistic Locking (lockForUpdate)
                </span>
                {useLock && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Database mengunci baris (row-lock) saat query <code>SELECT ... FOR UPDATE</code>.
                Transaksi dieksekusi atomik. <strong>Mencegah overselling 100%.</strong>
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setUseLock(false);
                setSimulationResult(null);
              }}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                !useLock
                  ? 'bg-rose-950/40 border-rose-500 ring-1 ring-rose-500'
                  : 'bg-slate-950 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-rose-300">
                  Mode 2: Tanpa Locking (Race Condition Rentan)
                </span>
                {!useLock && <AlertOctagon className="w-4 h-4 text-rose-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Semua thread membaca sisa kuota = 2 secara paralel sebelum baris di-update.
                Terjadi <strong>overselling tiket</strong> (penjualan melebihi kapasitas stadion).
              </p>
            </button>
          </div>

          {/* Laravel Code Snippet Reference */}
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>Implementasi Backend Laravel 11/12 (BookingController.php)</span>
            </div>
            <pre className="text-[11px] font-mono text-indigo-200 bg-slate-900 p-3 rounded-xl overflow-x-auto leading-relaxed">
{useLock ? `// DENGAN PESSIMISTIC LOCKING:
return DB::transaction(function () use ($ticketTypeId, $qty, $user) {
    // Kunci baris tiket di level database engine
    $ticketType = TicketType::where('id', $ticketTypeId)->lockForUpdate()->firstOrFail();
    
    if ($ticketType->available_quota < $qty) {
        throw new QuotaExhaustedException('Kuota tiket habis');
    }
    
    $ticketType->decrement('available_quota', $qty);
    return Booking::create([...]);
});` : `// TANPA LOCKING (RENTAN RACE CONDITION):
$ticketType = TicketType::find($ticketTypeId); // Dirty Read!
if ($ticketType->available_quota >= $qty) {
    // Jeda beberapa milidetik: thread lain membaca kuota lama
    $ticketType->decrement('available_quota', $qty);
    return Booking::create([...]); // OVERSELLING TERJADI!
}`}
            </pre>
          </div>

          {/* Trigger Action */}
          <div className="text-center">
            <button
              onClick={handleRunSimulation}
              disabled={isRunning}
              className={`px-8 py-3 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 shadow-lg cursor-pointer ${
                useLock
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/30'
              }`}
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengeksekusi 10 Thread Konkuren...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Jalankan Simulasi War Tiket (10 Thread)</span>
                </>
              )}
            </button>
          </div>

          {/* Results Display */}
          {simulationResult && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Total Permintaan</span>
                  <span className="text-base font-bold font-mono text-white tabular-nums">
                    {simulationResult.totalRequests} Thread
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Kuota Tersedia</span>
                  <span className="text-base font-bold font-mono text-white tabular-nums">
                    {simulationResult.availableBefore} Tiket
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[11px] text-emerald-400 block">Transaksi Berhasil</span>
                  <span className="text-base font-bold font-mono text-emerald-400 tabular-nums">
                    {simulationResult.successCount}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className={`text-[11px] block ${simulationResult.oversoldCount > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                    Overselling Tiket
                  </span>
                  <span className={`text-base font-bold font-mono tabular-nums ${
                    simulationResult.oversoldCount > 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {simulationResult.oversoldCount > 0 ? `+${simulationResult.oversoldCount} (BOCOR!)` : '0 (Aman)'}
                  </span>
                </div>
              </div>

              {/* Log stream */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="text-xs font-mono text-slate-400 block font-semibold">
                  Jejak Thread Transaksi Database:
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto font-mono text-xs pr-2">
                  {simulationResult.logs.map((l, i) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg text-[11px] flex items-center justify-between ${
                        l.success
                          ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-900/40'
                          : 'bg-slate-900/60 text-slate-400 border border-slate-800'
                      }`}
                    >
                      <span>{l.message}</span>
                      <span className="text-[10px] text-slate-500 font-sans">{l.delayMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
