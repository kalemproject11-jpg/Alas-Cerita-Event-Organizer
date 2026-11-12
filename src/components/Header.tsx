import React from 'react';
import { User, UserRole } from '../types';
import {
  Lock,
  LayoutDashboard,
  LogOut,
  CalendarDays
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onOpenAdminLogin,
  onLogoutAdmin,
}) => {
  const isAdminOrStaff = currentUser.role !== 'customer';

  return (
    <header className="border-b border-pink-500/25 bg-[#1a0e1a]/95 backdrop-blur-md sticky top-0 z-40 shadow-lg shadow-pink-950/20 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Brand Wordmark & Logo */}
        <button
          type="button"
          onClick={() => onSelectTab('catalog')}
          className="flex items-center gap-2.5 sm:gap-3 shrink-0 text-left group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded-xl"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white p-1 shadow-md shadow-pink-500/20 flex items-center justify-center overflow-hidden border border-amber-300 shrink-0">
            <img
              src="/alas-cerita-logo.jpg"
              alt="Logo Alas Cerita"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-base sm:text-lg font-black tracking-tight bg-gradient-to-r from-pink-300 via-rose-200 to-amber-300 bg-clip-text text-transparent group-hover:brightness-110 transition-all whitespace-nowrap shrink-0">
            Alas Cerita
          </span>
        </button>

        {/* Zone 2: Single-line Navigation Links */}
        <nav className="flex items-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium min-w-0">
          <button
            type="button"
            onClick={() => onSelectTab('catalog')}
            className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1.5 transition-colors cursor-pointer ${
              activeTab === 'catalog'
                ? 'text-pink-300 border-b-2 border-pink-400 font-bold'
                : 'text-stone-300 hover:text-pink-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400 shrink-0" />
            <span>Katalog Event</span>
          </button>

          {isAdminOrStaff && (
            <button
              type="button"
              onClick={() => onSelectTab('admin_dashboard')}
              className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 py-1.5 transition-colors cursor-pointer ${
                activeTab === 'admin_dashboard'
                  ? 'text-amber-300 border-b-2 border-amber-400 font-bold'
                  : 'text-stone-300 hover:text-amber-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0" />
              <span className="sm:hidden">Portal Admin</span>
              <span className="hidden sm:inline">Portal Admin &amp; Gate</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdminOrStaff ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 bg-[#251323]/90 border border-pink-500/25 rounded-xl px-3 py-1.5 text-xs whitespace-nowrap">
                <span className="text-white font-semibold">{currentUser.name}</span>
                <span className="text-pink-400/50">&middot;</span>
                <span className="text-[11px] font-mono text-amber-300 font-bold">
                  {getRoleBadge(currentUser.role)}
                </span>
              </div>

              <button
                type="button"
                onClick={onLogoutAdmin}
                className="px-3 py-2 bg-[#251323] hover:bg-[#32192f] text-stone-200 hover:text-rose-300 border border-pink-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 min-h-[38px]"
                title="Keluar dari Portal Admin"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAdminLogin}
              className="px-3.5 sm:px-4 py-2 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 rounded-xl text-xs font-black transition-all shadow-md shadow-pink-500/25 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 min-h-[38px]"
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="sm:hidden">Admin</span>
              <span className="hidden sm:inline">Portal Admin &amp; Gate</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

function getRoleBadge(role: UserRole): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'customer':
      return 'Customer';
    case 'gate_staff':
      return 'Gate Staff';
    case 'gate_supervisor':
      return 'Supervisor';
  }
}
