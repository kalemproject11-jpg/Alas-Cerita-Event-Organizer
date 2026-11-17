import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, KeyRound, AlertCircle, ArrowRight, X, User, ShieldAlert, RefreshCw, ShieldCheck, ArrowLeft } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import { User as UserType } from '../../types';
import { storageService } from '../../services/storageService';
import { verifyAdminPassword } from '../../utils/security';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (user: UserType) => void;
  users: UserType[];
}

const CAPTCHA_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateCaptchaText(length = 5): string {
  const result: string[] = [];
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(length);
    crypto.getRandomValues(arr);
    for (let i = 0; i < length; i++) {
      result.push(CAPTCHA_CHARS[arr[i] % CAPTCHA_CHARS.length]);
    }
  } else {
    for (let i = 0; i < length; i++) {
      result.push(CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)]);
    }
  }
  return result.join('');
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
  users,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lockSeconds, setLockSeconds] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [authStep, setAuthStep] = useState<'credentials' | 'google_2fa'>('credentials');
  const [pendingAdminUser, setPendingAdminUser] = useState<UserType | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const supportsWebkitTextSecurity =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('-webkit-text-security', 'disc');

  const drawCaptcha = useCallback((code: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Dark gradient background matching modal theme
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#160915');
    grad.addColorStop(0.5, '#241122');
    grad.addColorStop(1, '#0e2217');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle noise dots
    for (let i = 0; i < 36; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(244, 114, 182, 0.25)' : 'rgba(52, 211, 153, 0.25)';
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.6 + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Interference curves
    for (let i = 0; i < 3; i++) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(236, 72, 153, 0.35)' : 'rgba(16, 185, 129, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, Math.random() * h);
      ctx.bezierCurveTo(
        w * 0.33,
        Math.random() * h,
        w * 0.66,
        Math.random() * h,
        w,
        Math.random() * h
      );
      ctx.stroke();
    }

    // Render distorted characters
    const charColors = ['#f9a8d4', '#6ee7b7', '#ffffff', '#fbcfe8', '#a7f3d0'];
    const step = (w - 24) / Math.max(1, code.length);
    for (let i = 0; i < code.length; i++) {
      const ch = code[i];
      ctx.save();
      const x = 16 + i * step + (Math.random() * 4 - 2);
      const y = h / 2 + 7 + (Math.random() * 6 - 3);
      const angle = (Math.random() * 26 - 13) * (Math.PI / 180);
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = charColors[Math.floor(Math.random() * charColors.length)];
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 3;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }
  }, []);

  const refreshCaptcha = useCallback(() => {
    const nextCode = generateCaptchaText(5);
    setCaptchaCode(nextCode);
    setCaptchaInput('');
  }, []);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setErrorMessage(null);
      setAuthStep('credentials');
      setPendingAdminUser(null);
      refreshCaptcha();
      const lockStatus = storageService.getAdminLoginLockStatus();
      setLockSeconds(lockStatus.locked ? lockStatus.remainingSeconds : 0);
    }
  }, [isOpen, refreshCaptcha]);

  useEffect(() => {
    if (isOpen && authStep === 'credentials' && captchaCode) {
      drawCaptcha(captchaCode);
    }
  }, [isOpen, authStep, captchaCode, drawCaptcha]);

  useEffect(() => {
    if (!isOpen || lockSeconds <= 0) return;
    const timer = setInterval(() => {
      const lockStatus = storageService.getAdminLoginLockStatus();
      setLockSeconds(lockStatus.locked ? lockStatus.remainingSeconds : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, lockSeconds]);

  if (!isOpen) return null;

  const adminUsers = users.filter((u) => u.role !== 'customer');
  const superAdmin = adminUsers.find((u) => u.role === 'super_admin') || adminUsers[0];

  const handleLogin = async () => {
    setErrorMessage(null);

    const lockStatus = storageService.getAdminLoginLockStatus();
    if (lockStatus.locked) {
      setLockSeconds(lockStatus.remainingSeconds);
      setErrorMessage(`Terlalu banyak percobaan gagal. Tunggu ${lockStatus.remainingSeconds} detik sebelum mencoba lagi.`);
      return;
    }

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanCaptcha = captchaInput.trim().toUpperCase();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Masukkan username dan password terlebih dahulu.');
      return;
    }

    if (!cleanCaptcha) {
      setErrorMessage('Masukkan kode CAPTCHA terlebih dahulu.');
      return;
    }

    if (cleanCaptcha !== captchaCode) {
      refreshCaptcha();
      setErrorMessage('Kode CAPTCHA tidak sesuai. Silakan masukkan kode baru yang tampil.');
      return;
    }

    setIsVerifying(true);
    try {
      const passwordValid = await verifyAdminPassword(cleanPass);

      let matchedAdmin: UserType | undefined;
      if (passwordValid && cleanUser === 'ceritaalcer') {
        matchedAdmin = superAdmin;
      } else if (passwordValid) {
        matchedAdmin = adminUsers.find(
          (u) =>
            u.role !== 'super_admin' &&
            (u.email.toLowerCase() === cleanUser ||
              u.name.toLowerCase() === cleanUser)
        );
      }

      if (matchedAdmin) {
        storageService.resetAdminLoginRateLimit();
        setUsername('');
        setPassword('');
        setCaptchaInput('');

        // Check if Firebase Auth already holds a verified authorized admin Google session
        const alreadyVerifiedGoogle = await storageService.verifyFirebaseAdminUser(auth.currentUser);
        if (alreadyVerifiedGoogle) {
          onSuccessLogin(matchedAdmin);
          onClose();
        } else {
          setPendingAdminUser(matchedAdmin);
          setAuthStep('google_2fa');
        }
        return;
      }

      const failResult = storageService.recordFailedAdminLogin(cleanUser);
      setPassword('');
      refreshCaptcha();
      if (failResult.locked) {
        setLockSeconds(failResult.remainingSeconds);
        setErrorMessage(`Batas 5x percobaan terlampaui. Login dikunci sementara selama ${Math.ceil(failResult.remainingSeconds / 60)} menit.`);
      } else {
        setErrorMessage(`Username atau password salah. Sisa percobaan: ${failResult.remainingAttempts}x.`);
      }
    } catch {
      refreshCaptcha();
      setErrorMessage('Gagal memverifikasi kredensial keamanan.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleGoogleAdminAuth = () => {
    if (!pendingAdminUser || isVerifying) return;
    setErrorMessage(null);
    setIsVerifying(true);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    // Invoke signInWithPopup synchronously inside onClick handler to preserve user gesture token
    signInWithPopup(auth, provider)
      .then(async (credential) => {
        const isAllowed = await storageService.verifyFirebaseAdminUser(credential.user);
        if (!isAllowed) {
          const emailUsed = credential.user.email || 'tidak diketahui';
          await signOut(auth).catch(() => {});
          setErrorMessage(`Akun Google (${emailUsed}) tidak terdaftar sebagai Admin resmi.`);
          return;
        }
        const verifiedUser = pendingAdminUser;
        setPendingAdminUser(null);
        setAuthStep('credentials');
        onSuccessLogin(verifiedUser);
        onClose();
      })
      .catch((err: any) => {
        const code = err?.code || '';
        if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
          setErrorMessage('Verifikasi Google dibatalkan. Silakan klik tombol untuk melanjutkan.');
        } else if (code === 'auth/popup-blocked') {
          setErrorMessage('Pop-up login diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.');
        } else {
          setErrorMessage('Gagal memverifikasi akun Google Admin. Pastikan koneksi stabil dan coba kembali.');
        }
      })
      .finally(() => {
        setIsVerifying(false);
      });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#1c0f1c] border-2 border-pink-500/35 rounded-3xl shadow-2xl p-5 sm:p-8 space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-white rounded-lg hover:bg-pink-950/60 transition-colors cursor-pointer"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Logo Badge */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-white p-1 mx-auto shadow-lg shadow-pink-500/20 border-2 border-emerald-400 flex items-center justify-center overflow-hidden">
            <img src="/alas-cerita-logo.jpg" alt="Alas Cerita" className="w-full h-full object-contain" />
          </div>

          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300 inline-flex items-center gap-1.5 mb-1">
              <Lock className="w-3 h-3 text-pink-400" />
              <span>Akses Khusus Admin &amp; Gate</span>
            </span>
            <h2 className="text-xl font-black text-white">
              {authStep === 'google_2fa' ? 'Verifikasi Akun Google Admin' : 'Login Portal Admin'}
            </h2>
          </div>
        </div>

        {authStep === 'google_2fa' ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl space-y-1.5 text-center">
              <p className="text-xs font-bold text-emerald-300">
                Tahap 1 Lolos &bull; Diperlukan Autentikasi 2 Faktor
              </p>
              <p className="text-xs text-stone-200 leading-relaxed">
                Masuk menggunakan akun Google Admin resmi untuk membuka akses data peserta &amp; verifikasi pembayaran secara aman.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleAdminAuth}
              disabled={isVerifying}
              className="w-full py-3.5 bg-white hover:bg-stone-100 disabled:opacity-50 text-stone-900 text-xs font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2.5 cursor-pointer min-h-[46px]"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
              </svg>
              <span>{isVerifying ? 'Membuka Google Auth...' : 'Verifikasi Akun Google Admin'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setPendingAdminUser(null);
                setAuthStep('credentials');
                refreshCaptcha();
              }}
              disabled={isVerifying}
              className="w-full py-2.5 text-xs font-semibold text-stone-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Form Login</span>
            </button>
          </div>
        ) : (
          /* Non-form credential container so browsers never trigger "Save password" prompts */
          <div className="space-y-4">
            <div>
              <label htmlFor="portal-user-code" className="text-xs font-semibold text-stone-200 block mb-1.5">
                Username Admin
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-pink-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="portal-user-code"
                  name="portal_user_code"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Masukkan username"
                  disabled={lockSeconds > 0 || isVerifying}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#150914] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400 disabled:opacity-50"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="portal-access-key" className="text-xs font-semibold text-stone-200 block mb-1.5">
                Password Admin
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-pink-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="portal-access-key"
                  name="portal_access_key"
                  type={supportsWebkitTextSecurity ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Masukkan password"
                  disabled={lockSeconds > 0 || isVerifying}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm bg-[#150914] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400 disabled:opacity-50 ${
                    supportsWebkitTextSecurity ? '[-webkit-text-security:disc]' : ''
                  }`}
                />
              </div>
            </div>

            {/* Visual Canvas CAPTCHA */}
            <div>
              <label htmlFor="portal-captcha-code" className="text-xs font-semibold text-stone-200 block mb-1.5">
                Verifikasi CAPTCHA
              </label>
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <div className="flex items-center gap-2 shrink-0">
                  <canvas
                    ref={canvasRef}
                    width={156}
                    height={44}
                    onClick={refreshCaptcha}
                    title="Klik untuk mengganti kode CAPTCHA"
                    className="rounded-xl border border-emerald-500/40 cursor-pointer shrink-0 select-none"
                  />
                  <button
                    type="button"
                    onClick={refreshCaptcha}
                    disabled={lockSeconds > 0 || isVerifying}
                    className="p-2.5 bg-[#150914] hover:bg-pink-950/50 border border-pink-500/30 rounded-xl text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                    title="Ganti kode CAPTCHA baru"
                    aria-label="Ganti kode CAPTCHA baru"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative flex-1 min-w-[120px]">
                  <ShieldCheck className="w-4 h-4 text-emerald-400/70 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="portal-captcha-code"
                    name="portal_captcha_code"
                    type="text"
                    maxLength={5}
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    placeholder="Ketik kode"
                    disabled={lockSeconds > 0 || isVerifying}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-form-type="other"
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono font-bold tracking-widest uppercase bg-[#150914] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-emerald-400 disabled:opacity-50"
                  />
                </div>
              </div>
            </div>

            {lockSeconds > 0 && (
              <div className="p-3 bg-amber-950/75 border border-amber-500/60 rounded-xl text-amber-200 text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Akun dikunci sementara demi keamanan. Coba kembali dalam <strong className="font-mono">{lockSeconds} detik</strong>.
                </span>
              </div>
            )}

            {errorMessage && lockSeconds === 0 && (
              <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogin}
              disabled={lockSeconds > 0 || isVerifying}
              className="w-full py-3.5 bg-pink-500 hover:bg-pink-400 disabled:opacity-50 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
            >
              <span>
                {lockSeconds > 0
                  ? `Terkunci (${lockSeconds}s)`
                  : isVerifying
                  ? 'Memverifikasi...'
                  : 'Lanjut Verifikasi Admin'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
