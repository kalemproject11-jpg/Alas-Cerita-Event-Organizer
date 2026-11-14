import React, { useState } from 'react';
import { CheckInLog, CheckInResult } from '../../types';
import {
  FileText,
  Search,
  Download,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  Clock,
  Laptop
} from 'lucide-react';

interface AuditLogsViewProps {
  logs: CheckInLog[];
  onBack: () => void;
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs, onBack }) => {
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    const matchResult = filterResult === 'all' || log.result === filterResult;
    const matchMethod = filterMethod === 'all' || log.method === filterMethod;
    const matchSearch =
      (log.ticketNumber && log.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (log.attendeeName && log.attendeeName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchResult && matchMethod && matchSearch;
  });

  const exportToCSV = () => {
    const headers = ['ID Log', 'Waktu (ISO)', 'Kode Tiket', 'Nama Pengunjung', 'Metode', 'Hasil', 'Pesan', 'Petugas', 'Gate', 'Perangkat'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.scannedAt,
      l.ticketNumber || '-',
      l.attendeeName || '-',
      l.method,
      l.result,
      `"${l.message.replace(/"/g, '""')}"`,
      l.staffName,
      l.gateName,
      `"${l.deviceInfo.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_log_gate_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-pink-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>AUDIT TRAIL &amp; JEJAK KEAMANAN GATE (NFR-AUD-01)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Log Pemindaian &amp; Akses Pintu Masuk
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Mencatat setiap percobaan scan sah, penolakan tiket ganda, serta input manual oleh supervisor.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#221221] border border-pink-500/25 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-pink-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor tiket, nama pengunjung, nama petugas..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#150914] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterResult}
            onChange={(e) => setFilterResult(e.target.value)}
            className="px-3 py-2 text-xs bg-[#150914] border border-pink-500/30 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-400"
          >
            <option value="all">Semua Status</option>
            <option value="success">Berhasil (Sah)</option>
            <option value="duplicate_scan">Scan Ganda (Ditolak)</option>
            <option value="invalid_token">QR Tidak Sah / Palsu</option>
            <option value="rate_limited">Rate Limited</option>
          </select>

          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-3 py-2 text-xs bg-[#150914] border border-pink-500/30 rounded-xl text-stone-200 focus:outline-none focus:border-emerald-400"
          >
            <option value="all">Semua Metode</option>
            <option value="qr_scanner">QR Scanner</option>
            <option value="manual_supervisor">Manual Supervisor</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="bg-[#221221] border border-pink-500/25 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#150914] border-b border-pink-500/25 text-[11px] font-bold text-pink-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">ID Tiket</th>
                <th className="py-3 px-4">Pengunjung</th>
                <th className="py-3 px-4">Metode</th>
                <th className="py-3 px-4">Hasil Status</th>
                <th className="py-3 px-4">Petugas &amp; Gate</th>
                <th className="py-3 px-4">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-pink-500/15 font-mono">
              {filteredLogs.map((log) => {
                return (
                  <tr key={log.id} className="hover:bg-pink-950/25 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-stone-400 font-sans">
                      {new Date(log.scannedAt).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      WIB
                    </td>

                    <td className="py-3 px-4 font-bold text-pink-300 whitespace-nowrap">
                      {log.ticketNumber || '-'}
                    </td>

                    <td className="py-3 px-4 font-sans text-stone-100 font-medium whitespace-nowrap">
                      {log.attendeeName || '-'}
                    </td>

                    <td className="py-3 px-4 font-sans whitespace-nowrap text-stone-300">
                      {log.method === 'qr_scanner' ? 'QR Scanner' : 'Supervisor Manual'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.result === 'success' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80 font-sans">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SAH</span>
                        </span>
                      ) : log.result === 'duplicate_scan' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-rose-400 font-bold bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/80 font-sans">
                          <AlertOctagon className="w-3 h-3" />
                          <span>DOUBLE-SCAN</span>
                        </span>
                      ) : log.result === 'rate_limited' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-pink-300 font-bold bg-pink-950/80 px-2 py-0.5 rounded border border-pink-700/80 font-sans">
                          <AlertTriangle className="w-3 h-3" />
                          <span>RATE LIMIT</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-stone-300 font-bold bg-[#150914] px-2 py-0.5 rounded border border-pink-500/20 font-sans">
                          <span>INVALID</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-sans text-stone-200 whitespace-nowrap">
                      <div>{log.staffName}</div>
                      <div className="text-[10px] text-stone-400 font-mono">{log.gateName}</div>
                    </td>

                    <td className="py-3 px-4 font-sans text-stone-300 max-w-xs truncate">
                      {log.message}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="p-8 text-center text-stone-400 text-xs">
            Tidak ada data log yang cocok dengan filter.
          </div>
        )}
      </div>
    </div>
  );
};
