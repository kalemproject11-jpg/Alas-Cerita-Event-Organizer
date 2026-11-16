import React, { useState, useEffect } from 'react';
import { Lock, KeyRound, AlertCircle, ArrowRight, X, User } from 'lucide-react';
import { User as UserType } from '../../types';

interface AdminAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessLogin: (user: UserType) => void;
  users: UserType[];
}

export const AdminAuthModal: React.FC<AdminAuthModalProps> = ({
  isOpen,
  onClose,
  onSuccessLogin,
  users,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supportsWebkitTextSecurity =
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('-webkit-text-security', 'disc');

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const adminUsers = users.filter((u) => u.role !== 'customer');
  const superAdmin = adminUsers.find((u) => u.role === 'super_admin') || adminUsers[0];

  const handleLogin = () => {
    setErrorMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      setErrorMessage('Masukkan username dan password terlebih dahulu.');
      return;
    }

    if (
      (cleanUser === 'alasceritaeo' && cleanPass === 'alcer5desember') ||
      (cleanUser === 'admin@alascerita.id' && cleanPass === 'alcer5desember')
    ) {
      setUsername('');
      setPassword('');
      onSuccessLogin(superAdmin);
      onClose();
      return;
    }

    const staffMatch = adminUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanUser ||
        u.name.toLowerCase() === cleanUser
    );
    if (staffMatch && cleanPass === 'alcer5desember') {
      setUsername('');
      setPassword('');
      onSuccessLogin(staffMatch);
      onClose();
      return;
    }

    setErrorMessage('Username atau password salah. Silakan periksa kembali.');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#1c0f1c] border-2 border-pink-500/35 rounded-3xl shadow-2xl p-5 sm:p-8 space-y-6">
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
            <h2 className="text-xl font-black text-white">Login Portal Admin</h2>
            <p className="text-xs text-stone-300 mt-1">
              Masukkan username dan password panitia resmi Alas Cerita untuk mengakses dashboard.
            </p>
          </div>
        </div>

        {/* Non-form credential container so browsers never trigger "Save password" prompts */}
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
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#150914] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400"
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
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                className={`w-full pl-10 pr-4 py-2.5 text-sm bg-[#150914] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400 ${
                  supportsWebkitTextSecurity ? '[-webkit-text-security:disc]' : ''
                }`}
              />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleLogin}
            className="w-full py-3.5 bg-pink-500 hover:bg-pink-400 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <span>Masuk ke Portal Admin</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
