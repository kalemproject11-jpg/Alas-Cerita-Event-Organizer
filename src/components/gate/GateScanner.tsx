import React, { useState, useEffect, useRef } from 'react';
import { User, IssuedTicket, CheckInResult } from '../../types';
import { storageService } from '../../services/storageService';
import { soundEffects } from '../../services/soundEffects';
import jsQR from 'jsqr';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertOctagon,
  AlertTriangle,
  RotateCw,
  Zap,
  Upload,
  UserCheck,
  ShieldAlert,
  Volume2,
  Sparkles
} from 'lucide-react';

interface GateScannerProps {
  currentUser: User;
  tickets: IssuedTicket[];
  initialTicketToScan?: IssuedTicket | null;
  onClearInitialTicket?: () => void;
  onOpenSupervisorHelpdesk: () => void;
}

export const GateScanner: React.FC<GateScannerProps> = ({
  currentUser,
  tickets,
  initialTicketToScan,
  onClearInitialTicket,
  onOpenSupervisorHelpdesk,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');
  
  // Last scan result state
  const [scanResult, setScanResult] = useState<{
    result: CheckInResult;
    ticket?: IssuedTicket;
    message: string;
    checkedInAt?: string;
    checkedInBy?: string;
    latencyMs: number;
    scannedToken?: string;
  } | null>(null);

  // Session Statistics
  const [sessionStats, setSessionStats] = useState({
    totalScanned: 0,
    validPassed: 0,
    rejectedDouble: 0,
    rejectedInvalid: 0,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isScanningRef = useRef<boolean>(false);

  // Auto-scan initial ticket if passed from "Tiket Saya"
  useEffect(() => {
    if (initialTicketToScan) {
      executeValidation(initialTicketToScan.qrToken);
      if (onClearInitialTicket) onClearInitialTicket();
    }
  }, [initialTicketToScan]);

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Browser ini tidak mendukung akses kamera langsung.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        videoRef.current.play();
        setCameraActive(true);
        isScanningRef.current = true;
        requestAnimationFrame(tickScan);
      }
    } catch (err: unknown) {
      console.error(err);
      setCameraError('Izin akses kamera ditolak atau kamera tidak ditemukan.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    isScanningRef.current = false;
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Frame processing loop with jsQR
  const tickScan = () => {
    if (!isScanningRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        // Found QR Code! Execute validation
        executeValidation(code.data);
        // Pause momentarily to prevent multi-scanning in 1 second
        isScanningRef.current = false;
        setTimeout(() => {
          isScanningRef.current = true;
        }, 2000);
      }
    }

    if (cameraActive) {
      animationFrameRef.current = requestAnimationFrame(tickScan);
    }
  };

  // Execute Core Validation with Audio Feedback
  const executeValidation = (token: string) => {
    const res = storageService.validateGateQR(token, currentUser, `Terminal ${currentUser.name}`);
    
    setScanResult({
      ...res,
      scannedToken: token,
    });

    // Update session stats
    setSessionStats((prev) => ({
      totalScanned: prev.totalScanned + 1,
      validPassed: res.result === 'success' ? prev.validPassed + 1 : prev.validPassed,
      rejectedDouble: res.result === 'duplicate_scan' ? prev.rejectedDouble + 1 : prev.rejectedDouble,
      rejectedInvalid: res.result === 'invalid_token' ? prev.rejectedInvalid + 1 : prev.rejectedInvalid,
    }));

    // Trigger immediate auditory cues
    if (res.result === 'success') {
      soundEffects.playSuccess();
    } else if (res.result === 'duplicate_scan') {
      soundEffects.playWarningDuplicate();
    } else {
      soundEffects.playErrorInvalid();
    }
  };

  // Image Upload Scanner fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            executeValidation(code.data);
          } else {
            alert('Tidak ditemukan QR Code yang valid pada gambar ini.');
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Quick Test Samples
  const validTicketSample = tickets.find((t) => t.status === 'valid');
  const checkedInSample = tickets.find((t) => t.status === 'checked-in');

  return (
    <div className="space-y-8 pb-16">
      {/* Header & Gate Location info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>MODUL VALIDASI PINTU MASUK (GATE CHECK-IN)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-1">
            Pemindai Kamera QR Code & Anti-Double Scan
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Posko: <strong className="text-slate-200">{currentUser.staffGate || 'Gate A - Utama'}</strong> &middot; Petugas: <strong className="text-slate-200">{currentUser.name}</strong>
          </p>
        </div>

        {/* Supervisor Helpdesk Shortcut */}
        <button
          onClick={onOpenSupervisorHelpdesk}
          className="px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Kendala Lapangan? Buka Helpdesk &rarr;</span>
        </button>
      </div>

      {/* Main Grid: Viewport + Big Result Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Camera & Scanner (lg:col-span-7) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative aspect-video sm:aspect-4/3 w-full bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center">
            
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder Overlay when Camera is Active */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-64 h-64 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.6)]">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400" />
                  
                  {/* Scanning beam animation */}
                  <div className="w-full h-0.5 bg-emerald-400/80 shadow-[0_0_8px_#34d399] animate-bounce" />
                </div>
              </div>
            )}

            {/* Camera Idle State */}
            {!cameraActive && (
              <div className="p-8 text-center space-y-4 max-w-sm">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Kamera Belum Aktif</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Aktifkan kamera untuk memindai tiket pengunjung secara otomatis, atau gunakan simulasi scan cepat di bawah.
                  </p>
                </div>

                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/30 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Aktifkan Kamera Pemindai</span>
                </button>

                {cameraError && (
                  <p className="text-xs text-rose-400 bg-rose-950/60 p-2 rounded-lg border border-rose-900">
                    {cameraError}
                  </p>
                )}
              </div>
            )}

            {/* In-camera control bar */}
            {cameraActive && (
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-slate-950/80 backdrop-blur-md p-2 px-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>MEMINDAI QR TIKET...</span>
                </div>
                <button
                  onClick={stopCamera}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Matikan Kamera</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Test Barcode Buttons (Crucial for Evaluation & Testing) */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Uji Simulasi Scan Cepat (1-Klik)
              </span>
              <span className="text-[11px] font-mono text-indigo-400">Target Latensi: &lt;500ms</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => {
                  if (validTicketSample) executeValidation(validTicketSample.qrToken);
                }}
                disabled={!validTicketSample}
                className="p-2.5 bg-emerald-950/60 hover:bg-emerald-950/90 border border-emerald-800/80 text-emerald-300 rounded-xl text-left transition-colors cursor-pointer disabled:opacity-40"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>1. Tiket Valid</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 font-mono truncate">
                  {validTicketSample?.ticketNumber || 'Habis'} &middot; {validTicketSample?.attendeeName}
                </span>
              </button>

              <button
                onClick={() => {
                  if (checkedInSample) executeValidation(checkedInSample.qrToken);
                }}
                disabled={!checkedInSample}
                className="p-2.5 bg-rose-950/60 hover:bg-rose-950/90 border border-rose-800/80 text-rose-300 rounded-xl text-left transition-colors cursor-pointer disabled:opacity-40"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>2. Uji Scan Ganda</span>
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 font-mono truncate">
                  {checkedInSample?.ticketNumber || 'Belum ada'} (Pernah Scan)
                </span>
              </button>

              <button
                onClick={() => executeValidation('fake-uuid-9999-invalid-token-tampered')}
                className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>3. QR Palsu</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1 font-mono">
                  Token Tidak Terdaftar
                </span>
              </button>
            </div>

            {/* Upload QR File / Manual Token Input */}
            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <label className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-slate-300 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                <span>Unggah Foto / Screenshot QR</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={manualTokenInput}
                  onChange={(e) => setManualTokenInput(e.target.value)}
                  placeholder="Paste UUID qr_token..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => {
                    if (manualTokenInput.trim()) {
                      executeValidation(manualTokenInput.trim());
                      setManualTokenInput('');
                    }
                  }}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shrink-0 cursor-pointer"
                >
                  Pindai
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: High-Visibility Status Screen (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Main Status Display Banner */}
          {scanResult ? (
            <div
              className={`p-6 sm:p-8 rounded-2xl border transition-all text-center space-y-4 ${
                scanResult.result === 'success'
                  ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-100 shadow-2xl shadow-emerald-950/50'
                  : scanResult.result === 'duplicate_scan'
                  ? 'bg-rose-950/90 border-rose-500/90 text-rose-100 shadow-2xl shadow-rose-950/50'
                  : 'bg-amber-950/80 border-amber-500/80 text-amber-100'
              }`}
            >
              {/* Giant Icon */}
              <div className="mx-auto flex items-center justify-center">
                {scanResult.result === 'success' ? (
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-12 h-12" />
                  </div>
                ) : scanResult.result === 'duplicate_scan' ? (
                  <div className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-400 flex items-center justify-center text-rose-400 animate-pulse">
                    <AlertOctagon className="w-12 h-12" />
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-amber-400">
                    <AlertTriangle className="w-12 h-12" />
                  </div>
                )}
              </div>

              {/* Primary Status Title */}
              <div className="space-y-1">
                <span className="text-xs font-mono tracking-widest uppercase opacity-80 block">
                  {scanResult.result === 'success'
                    ? 'ACCESS GRANTED'
                    : scanResult.result === 'duplicate_scan'
                    ? 'SECURITY ALERT: DUPLICATE ENTRY'
                    : 'ACCESS REJECTED'}
                </span>
                <h2 className="text-2xl font-black tracking-tight">
                  {scanResult.result === 'success'
                    ? 'TIKET SAH · SILAKAN MASUK'
                    : scanResult.result === 'duplicate_scan'
                    ? 'TIKET TELAH DIGUNAKAN!'
                    : 'TIKET TIDAK VALID'}
                </h2>
              </div>

              {/* Attendee Details Card */}
              {scanResult.ticket && (
                <div className="p-4 bg-slate-950/70 rounded-xl border border-white/10 text-xs text-left space-y-2 font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Nama Pengunjung:</span>
                    <span className="text-white font-sans font-bold text-sm">
                      {scanResult.ticket.attendeeName}
                    </span>
                  </div>
                  {scanResult.ticket.packageName && (
                    <div className="flex justify-between items-center text-amber-300">
                      <span>Paket Bundle:</span>
                      <span className="font-bold text-[11px] bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded">
                        Paket {scanResult.ticket.packageName} ({scanResult.ticket.packageMemberIndex || 1} dari {scanResult.ticket.packageTotalMembers || 1})
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Kategori / Tier:</span>
                    <span className="text-indigo-300 font-bold">
                      {scanResult.ticket.ticketTypeName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>ID Tiket Visual:</span>
                    <span className="text-white font-bold">{scanResult.ticket.ticketNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>NIK Pengunjung:</span>
                    <span className="text-slate-200 font-semibold">{scanResult.ticket.attendeeNik || ('**' + scanResult.ticket.attendeeIdLast4)}</span>
                  </div>
                  {scanResult.ticket.seat_or_gate && (
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Akses Gate:</span>
                      <span className="text-emerald-400">{scanResult.ticket.seat_or_gate}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Exact Double-Scan Warning Message */}
              {scanResult.result === 'duplicate_scan' && (
                <div className="p-3 bg-rose-900/60 rounded-xl border border-rose-500/50 text-xs text-rose-200 text-left space-y-1">
                  <span className="font-bold flex items-center gap-1 text-white">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Detail Pelanggaran Double-Scan:</span>
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    Tiket ini telah dipindai sebelumnya pada <strong>{new Date(scanResult.checkedInAt || '').toLocaleTimeString('id-ID')} WIB</strong> oleh <strong>{scanResult.checkedInBy || 'Petugas'}</strong>.
                  </p>
                  <p className="text-[10px] text-rose-300 italic">
                    Tolak pengunjung dan arahkan ke meja koordinator supervisor jika ada sengketa identitas.
                  </p>
                </div>
              )}

              {/* Latency & Timestamp stats */}
              <div className="pt-2 flex items-center justify-between text-[11px] opacity-70 font-mono">
                <span>Latensi API: {scanResult.latencyMs}ms</span>
                <span>Waktu: {new Date().toLocaleTimeString('id-ID')}</span>
              </div>
            </div>
          ) : (
            /* Standby State */
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 text-slate-500 mx-auto flex items-center justify-center">
                <Volume2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Menunggu Pemindaian Tiket</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Arahkan QR Code pengunjung ke kamera atau klik salah satu tombol uji cepat di sebelah kiri.
                </p>
              </div>
            </div>
          )}

          {/* Gate Session Metrics */}
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
              Statistik Sesi Pintu Masuk
            </span>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block">Total Scan</span>
                <span className="text-lg font-bold text-white font-mono tabular-nums">
                  {sessionStats.totalScanned}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-emerald-400 block">Lolos Sah</span>
                <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
                  {sessionStats.validPassed}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-rose-400 block">Scan Ganda</span>
                <span className="text-lg font-bold text-rose-400 font-mono tabular-nums">
                  {sessionStats.rejectedDouble}
                </span>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-xs text-amber-400 block">QR Palsu</span>
                <span className="text-lg font-bold text-amber-400 font-mono tabular-nums">
                  {sessionStats.rejectedInvalid}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
