import React, { useState, useEffect } from 'react';
import { Booking, Event, PaymentMethod } from '../../types';
import { storageService } from '../../services/storageService';
import confetti from 'canvas-confetti';
import {
  Clock,
  ShieldCheck,
  CheckCircle,
  Copy,
  Check,
  ArrowRight,
  Download,
  Upload,
  QrCode as QrIcon,
  CreditCard,
  Building2,
  Smartphone,
  AlertCircle,
  FileText,
  Image as ImageIcon,
  X,
  Eye
} from 'lucide-react';

interface CheckoutPaymentModalProps {
  booking: Booking;
  event: Event;
  onPaymentSuccess: () => void;
  onCancel: () => void;
}

export const CheckoutPaymentModal: React.FC<CheckoutPaymentModalProps> = ({
  booking,
  event,
  onPaymentSuccess,
  onCancel,
}) => {
  // Methods: 'qris' | 'shopeepay' | 'bri'
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('qris');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes hold
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [senderAccountName, setSenderAccountName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Countdown timer for 30-min quota hold
  useEffect(() => {
    const expiresAt = new Date(booking.expiresAt).getTime();
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        clearInterval(interval);
        storageService.cancelExpiredBookings();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [booking]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isExpired = timeLeft <= 0;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Ukuran file maksimal 10MB.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setProofImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmPayment = () => {
    setErrorMessage(null);

    // Requirement: Bukti transfer wajib diunggah sebagai syarat verifikasi
    if (!proofImage) {
      setErrorMessage('Harap lampirkan foto / tangkapan layar (screenshot) bukti transfer pembayaran terlebih dahulu sebagai syarat verifikasi E-Ticket.');
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      const res = storageService.completePayment(
        booking.id, 
        selectedMethod, 
        proofImage, 
        senderAccountName.trim() || booking.customerName
      );
      setIsProcessing(false);
      if (res.success) {
        setPaidSuccess(true);
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      } else {
        setErrorMessage(res.error || 'Gagal memproses verifikasi pembayaran.');
      }
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#1c0f1c] border-2 border-pink-500/35 rounded-3xl shadow-2xl overflow-hidden my-4 max-h-[92vh] flex flex-col">
        
        {/* Payment Header */}
        <div className="px-5 sm:px-7 py-4 bg-[#241322] border-b border-pink-500/25 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border-2 border-amber-300 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              <img src="/alas-cerita-logo.jpg" alt="Alas Cerita" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-sm font-bold bg-gradient-to-r from-pink-300 via-rose-200 to-amber-200 bg-clip-text text-transparent block">Pembayaran E-Ticket Resmi</span>
              <span className="text-[11px] text-pink-300/80 font-mono">Invoice: {booking.invoiceCode}</span>
            </div>
          </div>

          {/* 30-min countdown timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold ${
            isExpired
              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
              : 'bg-gradient-to-r from-pink-950/80 to-amber-950/80 text-[#FACC15] border-amber-400/50 shadow-sm'
          }`}>
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {isExpired ? 'Waktu Habis' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
            </span>
          </div>
        </div>

        {paidSuccess ? (
          /* Payment Success & 24h Verification Pending Confirmation View (Bahasa Baku) */
          <div className="p-6 sm:p-9 text-center space-y-6 overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-500/20 to-amber-500/20 text-amber-300 border-2 border-amber-400/50 mx-auto flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Clock className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-amber-300 bg-pink-950/80 border border-pink-500/40 px-3.5 py-1 rounded-full inline-block">
                Bukti Pembayaran Berhasil Diterima
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Terima Kasih, Pemesanan Anda Sedang Kami Proses
              </h3>
              <p className="text-stone-300 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                Terima kasih atas partisipasi Anda dalam acara <strong className="text-amber-300 font-bold">Alas Cerita</strong>. Bukti transfer dan biodata peserta Anda telah tersimpan dengan aman di sistem panitia.
              </p>
            </div>

            {/* Official Verification Notice Card (Bahasa Baku 1 x 24 Jam) */}
            <div className="p-4 sm:p-5 bg-gradient-to-br from-[#2d1428] via-[#241421] to-[#2c2010] rounded-2xl border-2 border-amber-400/50 text-left space-y-2.5 max-w-lg mx-auto shadow-md">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs font-mono">
                <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
                <span>PEMBERITAHUAN VERIFIKASI RESMI (1 × 24 JAM)</span>
              </div>
              <p className="text-xs text-stone-200 leading-relaxed">
                Pembayaran Anda saat ini sedang dalam <strong>tahap verifikasi administrasi</strong> oleh panitia pelaksana.
                Dokumen resmi <strong>E-Ticket</strong> beserta kode QR akses masuk pintu acara akan dikirimkan ke alamat email terdaftar:
              </p>
              <div className="p-2.5 bg-black/60 rounded-xl border border-pink-500/30 font-mono text-xs text-amber-300 font-bold flex items-center justify-between">
                <span className="text-stone-300">Alamat Email Tujuan:</span>
                <span className="text-amber-300">{booking.customerEmail}</span>
              </div>
              <p className="text-[11px] text-amber-200/90 italic">
                * Estimasi proses verifikasi dan pengiriman tiket digital adalah maksimal <strong>1 × 24 jam</strong> sejak bukti pembayaran diunggah.
              </p>
            </div>

            {/* Transaction Summary Card */}
            <div className="p-4 sm:p-5 bg-[#221221]/90 rounded-2xl border border-pink-500/25 text-xs text-left space-y-2.5 max-w-lg mx-auto font-mono">
              <div className="flex justify-between text-stone-300">
                <span>Nomor Invoice:</span>
                <span className="text-pink-300 font-bold">{booking.invoiceCode}</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Acara:</span>
                <span className="text-white font-sans font-medium text-right line-clamp-1">{event.title}</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Nama Penanggung Jawab:</span>
                <span className="text-white font-bold">{booking.customerName}</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Paket Dipesan:</span>
                <span className="text-white font-bold">{booking.quantity} Paket / Tiket</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Total Pembayaran:</span>
                <span className="text-[#FACC15] font-black text-sm">Rp{booking.totalAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-stone-300">
                <span>Metode Transfer:</span>
                <span className="text-pink-300 font-bold uppercase">{selectedMethod}</span>
              </div>
              <div className="flex justify-between text-stone-300 pt-2 border-t border-pink-900/40">
                <span>Status Verifikasi:</span>
                <span className="text-amber-300 font-bold flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  SEDANG DIVERIFIKASI PANITIA
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
              <button
                onClick={onPaymentSuccess}
                className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 text-stone-950 text-xs font-black rounded-xl transition-all shadow-md shadow-pink-500/25 hover:brightness-110 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Tutup &amp; Selesai</span>
              </button>
            </div>
          </div>
        ) : isExpired ? (
          /* Expired Notice */
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Waktu Pembayaran Habis</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              Batas waktu pembayaran 30 menit telah berakhir. Kuota tiket telah dikembalikan otomatis. Silakan lakukan pemesanan ulang.
            </p>
            <button
              onClick={onCancel}
              className="px-6 py-2.5 bg-stone-800 hover:bg-stone-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Kembali ke Katalog
            </button>
          </div>
        ) : (
          /* Main Payment Interface */
          <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1">
            
            {/* Total Amount Banner */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-[#2c1326] via-[#21141d] to-[#2c2010] rounded-2xl border-2 border-pink-500/30 flex items-center justify-between gap-4 shadow-md">
              <div>
                <span className="text-xs text-pink-200/80 block">Total Tagihan Tiket:</span>
                <span className="text-2xl sm:text-3xl font-black text-[#FACC15] font-mono tabular-nums">
                  Rp{booking.totalAmount.toLocaleString('id-ID')}
                </span>
                <span className="text-[11px] text-stone-300 block mt-0.5">
                  Pemesan: <strong className="text-white">{booking.customerName}</strong> &bull; {booking.quantity} Tiket
                </span>
              </div>

              <div className="hidden sm:block text-right">
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 bg-pink-950/80 border border-pink-500/40 px-2.5 py-1 rounded-lg font-bold">
                  Resmi Alas Cerita
                </span>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div>
              <label className="text-xs font-bold text-pink-200 block mb-2.5">
                Pilih Metode Pembayaran:
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* 1. QRIS */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('qris')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    selectedMethod === 'qris'
                      ? 'bg-gradient-to-br from-pink-950/70 to-amber-950/70 border-2 border-amber-400 shadow-md shadow-pink-500/20'
                      : 'bg-[#211220]/80 border-pink-900/30 hover:border-pink-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <QrIcon className={`w-5 h-5 ${selectedMethod === 'qris' ? 'text-amber-300' : 'text-pink-300/70'}`} />
                    <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/70 border border-amber-600/40 px-1.5 py-0.5 rounded">GPN</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">1. QRIS</span>
                    <span className="text-[10px] text-pink-200/70">Semua M-Banking / E-Wallet</span>
                  </div>
                </button>

                {/* 2. ShopeePay */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('shopeepay')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    selectedMethod === 'shopeepay'
                      ? 'bg-gradient-to-br from-pink-950/70 to-amber-950/70 border-2 border-amber-400 shadow-md shadow-pink-500/20'
                      : 'bg-[#211220]/80 border-pink-900/30 hover:border-pink-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Smartphone className={`w-5 h-5 ${selectedMethod === 'shopeepay' ? 'text-pink-400' : 'text-pink-300/70'}`} />
                    <span className="text-[10px] font-mono font-bold text-pink-300 bg-pink-950/70 border border-pink-600/40 px-1.5 py-0.5 rounded">Instan</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">2. ShopeePay</span>
                    <span className="text-[10px] text-pink-200/70">085747358169</span>
                  </div>
                </button>

                {/* 3. BRI */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('bri')}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    selectedMethod === 'bri'
                      ? 'bg-gradient-to-br from-pink-950/70 to-amber-950/70 border-2 border-amber-400 shadow-md shadow-pink-500/20'
                      : 'bg-[#211220]/80 border-pink-900/30 hover:border-pink-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Building2 className={`w-5 h-5 ${selectedMethod === 'bri' ? 'text-amber-300' : 'text-pink-300/70'}`} />
                    <span className="text-[10px] font-mono font-bold text-blue-300 bg-blue-950/70 border border-blue-600/40 px-1.5 py-0.5 rounded">Bank BRI</span>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">3. Bank BRI</span>
                    <span className="text-[10px] text-pink-200/70">306601019331502</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Method Details Pane */}
            <div className="p-5 bg-[#221221] rounded-2xl border border-pink-500/25 space-y-4">
              
              {/* === OPTION 1: QRIS === */}
              {selectedMethod === 'qris' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    {/* QR Code Container */}
                    <div className="relative p-2.5 bg-white rounded-2xl shadow-xl shrink-0 max-w-[210px] border-2 border-amber-300">
                      <img
                        src="/qris-payment.jpeg"
                        alt="QRIS BLUESEAA - ART"
                        className="w-full h-auto object-contain rounded-xl"
                      />
                    </div>

                    {/* QR Details & Instruction */}
                    <div className="space-y-3 text-xs flex-1">
                      <div>
                        <span className="text-[10px] uppercase font-mono tracking-wider text-[#FACC15] block font-bold">
                          Merchant Resmi:
                        </span>
                        <h4 className="text-base font-black text-white">BLUESEAA - ART</h4>
                        <span className="text-xs font-mono text-stone-300 block mt-0.5">
                          NMID: <strong className="text-amber-300">ID1026614898280</strong> (A01)
                        </span>
                      </div>

                      <div className="p-3 bg-[#1a0e1a] rounded-xl border border-pink-500/20 space-y-1.5 text-stone-300">
                        <span className="font-semibold text-pink-200 block text-[11px]">Petunjuk Pembayaran QRIS:</span>
                        <ol className="list-decimal list-inside space-y-1 text-[11px] text-stone-300">
                          <li>Buka m-Banking (BCA, BRImo, Mandiri, BNI, dll) atau E-Wallet (GoPay, ShopeePay, OVO, DANA).</li>
                          <li>Pilih menu <strong>Scan / Bayar QRIS</strong>.</li>
                          <li>Scan kode QR di samping dan masukkan nominal tagihan <strong className="text-amber-300">Rp{booking.totalAmount.toLocaleString('id-ID')}</strong>.</li>
                          <li>Setelah berhasil, simpan screenshot / struk dan upload di bawah.</li>
                        </ol>
                      </div>

                      <a
                        href="/qris-payment.jpeg"
                        download="QRIS-AlasCerita-BLUESEAA.jpeg"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-pink-500/20 to-amber-500/20 hover:from-pink-500/30 hover:to-amber-500/30 border border-pink-500/40 text-pink-200 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-300" />
                        <span>Unduh Barcode QRIS</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* === OPTION 2: SHOPEEPAY === */}
              {selectedMethod === 'shopeepay' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-pink-400 block font-bold">
                      Tujuan Transfer ShopeePay:
                    </span>
                    <h4 className="text-lg font-black text-white mt-0.5">ShopeePay Resmi</h4>
                  </div>

                  {/* Copyable Phone Number Box */}
                  <div className="p-4 bg-[#1a0e1a] rounded-2xl border border-pink-500/30 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-mono">Nomor Akun ShopeePay:</span>
                      <span className="text-xl sm:text-2xl font-mono font-bold text-amber-300 tracking-wider">
                        085747358169
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy('085747358169', 'shopee')}
                      className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md shadow-pink-500/25"
                    >
                      {copiedText === 'shopee' ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Salin Nomor</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-[#1a0e1a]/80 rounded-xl border border-pink-500/20 text-[11px] text-stone-300 space-y-1">
                    <span className="font-semibold text-pink-200 block">Petunjuk Transfer ShopeePay:</span>
                    <ol className="list-decimal list-inside space-y-1 text-stone-300">
                      <li>Buka aplikasi <strong>Shopee</strong> &gt; menu <strong>ShopeePay</strong>.</li>
                      <li>Pilih menu <strong>Transfer</strong> &gt; <strong>Kirim ke Kontak / No. HP</strong>.</li>
                      <li>Masukkan Nomor: <strong className="text-amber-300">085747358169</strong>.</li>
                      <li>Transfer nominal pas: <strong className="text-amber-300">Rp{booking.totalAmount.toLocaleString('id-ID')}</strong>.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* === OPTION 3: BANK BRI === */}
              {selectedMethod === 'bri' && (
                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-amber-300 block font-bold">
                      Rekening Resmi Bank BRI:
                    </span>
                    <h4 className="text-lg font-black text-white mt-0.5">Bank Rakyat Indonesia (BRI)</h4>
                  </div>

                  {/* Copyable Account Details Box */}
                  <div className="p-4 bg-[#1a0e1a] rounded-2xl border border-pink-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] text-stone-400 block font-mono">Nomor Rekening BRI:</span>
                      <span className="text-xl sm:text-2xl font-mono font-bold text-amber-300 tracking-wider block">
                        306601019331502
                      </span>
                      <span className="text-xs text-stone-300 font-semibold mt-0.5 block">
                        Atas Nama: <strong className="text-[#FACC15]">ARIQOH NUR AFISYAH</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy('306601019331502', 'bri')}
                      className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-stone-950 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md shadow-amber-500/25"
                    >
                      {copiedText === 'bri' ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Salin No. Rek</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3 bg-[#1a0e1a]/80 rounded-xl border border-pink-500/20 text-[11px] text-stone-300 space-y-1">
                    <span className="font-semibold text-pink-200 block">Petunjuk Transfer BRI:</span>
                    <ol className="list-decimal list-inside space-y-1 text-stone-300">
                      <li>Buka <strong>BRImo</strong> atau transfer ATM BRI.</li>
                      <li>Masukkan Nomor Rekening: <strong className="text-amber-300">306601019331502</strong>.</li>
                      <li>Pastikan nama tujuan transfer: <strong className="text-[#FACC15]">ARIQOH NUR AFISYAH</strong>.</li>
                      <li>Transfer nominal tepat: <strong className="text-amber-300">Rp{booking.totalAmount.toLocaleString('id-ID')}</strong>.</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* KOLOM UPLOAD BUKTI TRANSFER (WAJIB UNTUK VERIFIKASI ADMIN) */}
            <div className="p-5 bg-gradient-to-br from-[#271324]/90 via-[#20111e] to-[#2c2010]/80 border-2 border-dashed border-pink-400/50 rounded-3xl space-y-4 text-xs shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-300">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">
                      Kolom Upload Bukti Transfer Pembayaran
                    </span>
                    <span className="text-[11px] text-pink-200/80">
                      Wajib diunggah sebagai syarat verifikasi E-Ticket &amp; terekap di Dashboard Admin.
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-pink-950/80 border border-pink-500/40 px-2.5 py-0.5 rounded font-bold uppercase">
                  Syarat Tiket
                </span>
              </div>

              {/* Sender Name Input (Optional helper) */}
              <div>
                <label className="text-[11px] text-stone-300 block mb-1">
                  Nama Pemilik Rekening / Pengirim (Sesuai Bukti Bayar):
                </label>
                <input
                  type="text"
                  value={senderAccountName}
                  onChange={(e) => setSenderAccountName(e.target.value)}
                  placeholder={`Contoh: ${booking.customerName}`}
                  className="w-full px-3.5 py-2.5 bg-[#170a16] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400 text-xs font-medium"
                />
              </div>

              {/* File Upload Box & Instant Preview */}
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  id="proof-upload-input"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {proofImage ? (
                  /* Uploaded preview box */
                  <div className="p-3.5 bg-[#170a16] rounded-2xl border-2 border-amber-400/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        onClick={() => setShowPreviewModal(true)}
                        className="w-14 h-14 rounded-xl overflow-hidden bg-black border border-pink-500/40 shrink-0 cursor-pointer relative group"
                        title="Klik untuk melihat pratinjau penuh"
                      >
                        <img src={proofImage} alt="Bukti Transfer" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                          <CheckCircle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>Foto Bukti Siap Dikirim</span>
                        </div>
                        <span className="text-[11px] text-stone-400 block truncate">
                          Terekap ke Admin: Bukti_Bayar_{booking.invoiceCode}.jpg
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <label
                        htmlFor="proof-upload-input"
                        className="px-3 py-2 bg-pink-950/80 hover:bg-pink-900 border border-pink-600/40 text-pink-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                      >
                        Ganti Foto
                      </label>
                      <button
                        type="button"
                        onClick={() => setProofImage(null)}
                        className="p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
                        title="Hapus foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty state drop area */
                  <label
                    htmlFor="proof-upload-input"
                    className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-pink-500/35 hover:border-pink-400 rounded-2xl bg-[#1b0d1a]/80 hover:bg-[#251224]/80 cursor-pointer transition-all space-y-2 group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#291325] group-hover:bg-pink-500/20 border border-pink-500/30 group-hover:border-pink-400 flex items-center justify-center text-pink-300 group-hover:text-amber-300 transition-colors">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <span className="text-xs font-bold text-white block">
                        Klik untuk Pilih Foto / Screenshot Bukti Transfer
                      </span>
                      <span className="text-[11px] text-pink-200/70 block mt-0.5">
                        Mendukung format JPG, PNG, atau tangkapan layar m-Banking / E-Wallet (Maks 10MB)
                      </span>
                    </div>
                  </label>
                )}
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessing}
                className="w-full py-4 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 font-black rounded-2xl transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {isProcessing ? (
                  <span className="animate-pulse">Mengunggah Bukti &amp; Menerbitkan E-Ticket...</span>
                ) : (
                  <>
                    <span>Kirim Bukti Pembayaran &amp; Dapatkan E-Ticket</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                className="w-full sm:w-auto px-5 py-3 text-xs text-stone-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Zoom Foto Bukti Bayar */}
      {showPreviewModal && proofImage && (
        <div 
          onClick={() => setShowPreviewModal(false)}
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer"
        >
          <div className="relative max-w-lg max-h-[85vh] p-2 bg-stone-900 rounded-2xl border border-stone-700 overflow-hidden">
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute top-3 right-3 p-1.5 bg-black/70 text-white rounded-full hover:bg-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={proofImage} alt="Pratinjau Bukti Bayar" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
