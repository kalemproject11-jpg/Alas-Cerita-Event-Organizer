import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, ArrowRight, X, User, Check } from 'lucide-react';
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
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const adminUsers = users.filter((u) => u.role !== 'customer');
  const superAdmin = adminUsers.find((u) => u.role === 'super_admin') || adminUsers[0];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    // Verify username admin and password admin
    if (
      (cleanUser === 'admin' && cleanPass === 'admin') ||
      (cleanUser === 'admin@alascerita.id' && cleanPass === 'admin') ||
      cleanPass === '1234'
    ) {
      onSuccessLogin(superAdmin);
      onClose();
      return;
    }

    // Check staff accounts (e.g. rian.gate, siti.supervisor)
    const staffMatch = adminUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanUser ||
        u.name.toLowerCase().includes(cleanUser)
    );
    if (staffMatch && (cleanPass === 'admin' || cleanPass === '1234')) {
      onSuccessLogin(staffMatch);
      onClose();
      return;
    }

    setErrorMessage('Username atau password salah. Gunakan username: admin dan password: admin');
  };

  const handleQuickLogin = (userToLogin: UserType) => {
    onSuccessLogin(userToLogin);
    onClose();
  };

  const handleAutoFill = () => {
    setUsername('admin');
    setPassword('admin');
    setErrorMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-[#1c0f1c] border-2 border-pink-500/35 rounded-3xl shadow-2xl p-5 sm:p-8 space-y-5">
        
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
          <div className="w-14 h-14 rounded-2xl bg-white p-1 mx-auto shadow-lg shadow-pink-500/20 border-2 border-amber-300 flex items-center justify-center overflow-hidden">
            <img src="/alas-cerita-logo.jpg" alt="Alas Cerita" className="w-full h-full object-contain" />
          </div>

          <div>
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300 inline-flex items-center gap-1.5 mb-1">
              <Lock className="w-3 h-3 text-pink-400" />
              <span>Akses Khusus Admin &amp; Gate</span>
            </span>
            <h2 className="text-xl font-black text-white">Login Portal Admin</h2>
            <p className="text-xs text-stone-300 mt-1">
              Verifikasi pembayaran, unduh E-Ticket, Gate Scanner, dan kontrol database khusus Panitia Resmi Alas Cerita.
            </p>
          </div>
        </div>

        {/* Credentials Info Box */}
        <div className="p-3 bg-[#251323]/90 border border-amber-400/35 rounded-2xl flex items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#FACC15] font-bold block">
              Kredensial Akses Admin:
            </span>
            <div className="font-mono text-stone-200 text-xs">
              User: <strong className="text-white">admin</strong>
              <span className="mx-1.5 text-pink-400/50">&middot;</span>
              Pass: <strong className="text-white">admin</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAutoFill}
            className="text-[11px] px-3 py-1.5 bg-pink-500/20 hover:bg-pink-500/30 text-pink-200 font-semibold rounded-lg border border-pink-400/40 transition-colors shrink-0 cursor-pointer"
          >
            Auto Isi
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-200 block mb-1.5">
              Username Admin:
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-pink-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username (admin)"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#150914] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-200">
                Password Admin:
              </label>
              <span className="text-[10px] font-mono text-stone-400">Default: admin</span>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-pink-400/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password (admin)"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#150914] border border-pink-500/30 rounded-xl text-white placeholder-stone-500 focus:outline-none focus:border-pink-400"
                required
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
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 text-xs font-black rounded-xl transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <span>Masuk ke Portal Admin</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick 1-Click Staff Login */}
        <div className="pt-2 border-t border-pink-900/40 space-y-2">
          <span className="text-[11px] font-mono text-stone-400 block text-center uppercase tracking-wider">
            Masuk Cepat Petugas
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin(superAdmin)}
              className="px-3 py-2.5 bg-[#251323] hover:bg-[#341a32] border border-pink-500/25 text-stone-200 rounded-xl text-xs font-medium transition-colors text-center cursor-pointer truncate"
            >
              Super Admin (EO)
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin(adminUsers.find((u) => u.role === 'gate_staff') || superAdmin)}
              className="px-3 py-2.5 bg-[#251323] hover:bg-[#341a32] border border-pink-500/25 text-stone-200 rounded-xl text-xs font-medium transition-colors text-center cursor-pointer truncate"
            >
              Petugas Gate Scanner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
