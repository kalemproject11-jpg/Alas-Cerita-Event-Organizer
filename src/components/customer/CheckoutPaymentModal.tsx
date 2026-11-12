import React, { useState, useEffect } from 'react';
import { Booking, Event, PaymentMethod } from '../../types';
import { storageService } from '../../services/storageService';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  Clock,
  ShieldCheck,
  CheckCircle,
  Copy,
  Check,
  ArrowRight,
  ExternalLink,
  QrCode as QrIcon,
  CreditCard,
  Building,
  Smartphone
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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('qris');
  const [copiedVA, setCopiedVA] = useState(false);
  const [qrisDataUrl, setQrisDataUrl] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(30 * 60); // 30 minutes in seconds
  const [isProcessing, setIsProcessing] = useState(false);
  const [paidSuccess, setPaidSuccess] = useState(false);

  // Generate real QRIS QR code
  useEffect(() => {
    const qrisPayload = `00020101021226680016ID.EVENTPASS.WWW01189360098412345678900215INV${booking.id}5204581253033605407${booking.totalAmount}5802ID5914EVENTPASS LIVE6007JAKARTA6304`;
    QRCode.toDataURL(qrisPayload, {
      width: 240,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrisDataUrl(url))
      .catch((err) => console.error(err));
  }, [booking]);

  // Countdown timer for 30-min quota hold (FR-BKG-02)
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

  const vaNumber = `8077708${booking.customerPhone.replace(/\D/g, '').slice(-8).padStart(8, '0')}`;

  const handleCopyVA = () => {
    navigator.clipboard.writeText(vaNumber);
    setCopiedVA(true);
    setTimeout(() => setCopiedVA(false), 2000);
  };

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const res = storageService.completePayment(booking.id, selectedMethod);
      setIsProcessing(false);
      if (res.success) {
        setPaidSuccess(true);
        try {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch {
          // ignore
        }
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Payment Gateway Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              EP
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Payment Gateway (Midtrans Snap Simulator)</span>
              <span className="text-[11px] text-slate-400 font-mono">Invoice: {booking.invoiceCode}</span>
            </div>
          </div>

          {/* 30-min countdown timer badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-mono font-medium ${
            isExpired
              ? 'bg-rose-950/80 text-rose-300 border-rose-800'
              : 'bg-amber-950/60 text-amber-300 border-amber-800/80'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>
              {isExpired ? 'Waktu Habis' : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`}
            </span>
          </div>
        </div>

        {paidSuccess ? (
          /* Payment Success Confirmation View */
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 mx-auto flex items-center justify-center">
              <CheckCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-white">Pembayaran Berhasil Dikonfirmasi!</h3>
              <p className="text-slate-300 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
                Webhook payment gateway telah terverifikasi dengan Signature Key HTTP 200 OK.
                E-Tiket dengan kode QR terenkripsi dan ID Tiket 8-karakter telah diterbitkan ke akun Anda.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-left space-y-2 max-w-md mx-auto font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Event:</span>
                <span className="text-white font-sans font-medium">{event.title}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Jumlah Tiket:</span>
                <span className="text-white">{booking.quantity} Lembar</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Lunas:</span>
                <span className="text-emerald-400 font-bold">Rp {booking.totalAmount.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Status:</span>
                <span className="text-emerald-400 font-semibold">PAID (E-Ticket Issued)</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={onPaymentSuccess}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-lg shadow-emerald-600/30 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Buka Tiket Saya & Unduh E-Ticket</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : isExpired ? (
          /* Expired Notice */
          <div className="p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 mx-auto flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Batas Waktu Pembayaran Telah Habis</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Sesuai ketentuan FR-BKG-04, kuota yang ditahan telah dikembalikan otomatis ke sistem. Silakan ulangi pemesanan.
            </p>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              Kembali ke Katalog
            </button>
          </div>
        ) : (
          /* Payment Selection & Instruction View */
          <div className="p-6 space-y-6">
            {/* Amount Summary */}
            <div className="flex items-center justify-between p-4 bg-slate-950/80 rounded-xl border border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 block">{event.title}</span>
                <span className="text-xs text-slate-300 font-medium">Tagihan Total ({booking.quantity} Tiket)</span>
              </div>
              <span className="text-xl font-bold text-white font-mono tabular-nums">
                Rp {booking.totalAmount.toLocaleString('id-ID')}
              </span>
            </div>

            {/* Payment Methods Tabs */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Pilih Metode Pembayaran Otomatis
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('qris')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    selectedMethod === 'qris'
                      ? 'border-indigo-500 bg-indigo-950/40 text-white'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <QrIcon className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-bold">QRIS Instant</span>
                  <span className="text-[10px] text-slate-400">Semua E-Wallet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('bca_va')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    selectedMethod === 'bca_va'
                      ? 'border-indigo-500 bg-indigo-950/40 text-white'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Building className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-bold">BCA Virtual Acc</span>
                  <span className="text-[10px] text-slate-400">Verifikasi Otomatis</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('gopay')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                    selectedMethod === 'gopay'
                      ? 'border-indigo-500 bg-indigo-950/40 text-white'
                      : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-bold">GoPay / E-Wallet</span>
                  <span className="text-[10px] text-slate-400">Aplikasi Gojek</span>
                </button>
              </div>
            </div>

            {/* Method Details */}
            {selectedMethod === 'qris' && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
                <span className="text-xs text-slate-300 font-medium block">
                  Pindai QRIS Menggunakan BCA, Mandiri, GoPay, OVO, Dana, atau ShopeePay
                </span>

                <div className="inline-block p-3 bg-white rounded-xl shadow-md">
                  {qrisDataUrl ? (
                    <img src={qrisDataUrl} alt="QRIS Code" className="w-48 h-48 mx-auto" />
                  ) : (
                    <div className="w-48 h-48 bg-slate-200 animate-pulse" />
                  )}
                </div>

                <p className="text-[11px] text-slate-400">
                  NMID: ID1020038849104 · Sisa Waktu Bayar: {minutes}:{String(seconds).padStart(2, '0')}
                </p>
              </div>
            )}

            {selectedMethod === 'bca_va' && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs text-slate-400 block">Nomor Rekening Virtual Account:</span>
                <div className="flex items-center justify-between p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-base font-mono font-bold text-white tracking-wider">{vaNumber}</span>
                  <button
                    onClick={handleCopyVA}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                  >
                    {copiedVA ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1">
                  <p>1. Buka m-BCA &gt; m-Transfer &gt; BCA Virtual Account</p>
                  <p>2. Masukkan nomor VA di atas, total tagihan akan muncul otomatis.</p>
                </div>
              </div>
            )}

            {selectedMethod === 'gopay' && (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
                <Smartphone className="w-8 h-8 text-indigo-400 mx-auto" />
                <span className="text-xs text-slate-200 font-medium block">
                  Buka aplikasi Gojek atau pindai barcode dengan fitur bayar GoPay
                </span>
                <p className="text-[11px] text-slate-400">
                  Setelah menekan bayar di bawah, sistem otomatis mensimulasikan notifikasi push GoPay.
                </p>
              </div>
            )}

            {/* Action Simulator */}
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isProcessing}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Memproses Webhook Signature (SHA-512)...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Simulasikan Pembayaran Berhasil (HTTP 200 Webhook)</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={onCancel}
                  className="hover:text-slate-300 transition-colors"
                >
                  Batal & Kembalikan Kuota
                </button>
                <span>Enkripsi TLS 256-bit PCI-DSS</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
