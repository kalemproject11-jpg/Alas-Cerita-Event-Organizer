import React from 'react';
import { User, UserRole } from '../types';
import { 
  Lock, 
  LayoutDashboard, 
  UserCheck, 
  RotateCcw,
  LogOut,
  CalendarDays,
  ShieldCheck
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onSwitchUser: (userId: string) => void;
  users: User[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onResetData: () => void;
  onOpenAdminLogin: () => void;
  onLogoutAdmin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  users,
  activeTab,
  onSelectTab,
  onResetData,
  onOpenAdminLogin,
  onLogoutAdmin,
}) => {
  const isAdminOrStaff = currentUser.role !== 'customer';

  return (
    <header className="border-b border-pink-500/25 bg-[#1a0e1a]/95 backdrop-blur-md sticky top-0 z-40 shadow-lg shadow-pink-950/20">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-6">
        
        {/* Zone 1: Logo & Brand Name (Alas Cerita Event Organizer) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-white p-1 shadow-md shadow-pink-500/20 flex items-center justify-center overflow-hidden border-2 border-amber-300 shrink-0">
            <img 
              src="/alas-cerita-logo.jpg" 
              alt="Logo Alas Cerita" 
              className="w-full h-full object-contain" 
            />
          </div>

          <button 
            onClick={() => onSelectTab('catalog')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-pink-400 via-rose-300 to-amber-300 bg-clip-text text-transparent group-hover:brightness-125 transition-all whitespace-nowrap">
                Alas Cerita
              </span>
              <span className="text-xs font-black text-[#FACC15] tracking-wider uppercase whitespace-nowrap drop-shadow-sm">
                Event Organizer
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-pink-200/70 font-mono mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-sm shadow-pink-500" />
              <span>Sistem E-Ticket &amp; Gate Validation</span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-4 sm:gap-6 text-sm font-medium">
          <button
            onClick={() => onSelectTab('catalog')}
            className={`whitespace-nowrap flex items-center gap-2 transition-colors py-1 cursor-pointer ${
              activeTab === 'catalog'
                ? 'text-pink-400 border-b-2 border-pink-500 font-bold'
                : 'text-stone-300 hover:text-pink-300'
            }`}
          >
            <CalendarDays className="w-4 h-4 text-pink-400" />
            <span>Katalog Event</span>
          </button>

          {/* When authenticated as admin, show direct link to the Unified Dashboard */}
          {isAdminOrStaff && (
            <button
              onClick={() => onSelectTab('admin_dashboard')}
              className={`whitespace-nowrap flex items-center gap-2 transition-colors py-1 cursor-pointer ${
                activeTab === 'admin_dashboard'
                  ? 'text-amber-300 border-b-2 border-amber-400 font-bold'
                  : 'text-stone-300 hover:text-amber-300'
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-amber-400" />
              <span>Dashboard Terpadu Gate &amp; Tiket</span>
            </button>
          )}
        </nav>

        {/* Zone 3: Admin Auth Gateway & Reset Data */}
        <div className="flex items-center gap-3 shrink-0">
          {isAdminOrStaff ? (
            /* Logged in as Admin/Staff view */
            <div className="flex items-center gap-2">
              <div className="hidden lg:flex items-center gap-2 bg-[#251323]/90 border border-pink-500/30 rounded-xl px-3 py-1.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-white font-medium">{currentUser.name}</span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-700/60 font-bold">
                  {getRoleBadge(currentUser.role)}
                </span>
              </div>

              <button
                onClick={onLogoutAdmin}
                className="px-3 py-1.5 bg-[#251323] hover:bg-[#32192f] text-stone-300 hover:text-rose-400 border border-pink-500/30 rounded-xl text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Keluar dari Dashboard Admin"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            /* Public Customer View: Prominent Admin Login Button */
            <button
              onClick={onOpenAdminLogin}
              className="px-3.5 py-2 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400 hover:brightness-110 text-stone-950 rounded-xl text-xs font-black transition-all shadow-md shadow-pink-500/25 flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Portal Admin &amp; Gate</span>
            </button>
          )}

          {/* Quick Reset Database Button */}
          <button
            onClick={onResetData}
            title="Reset Database ke Data Awal"
            className="p-2 text-stone-400 hover:text-pink-300 hover:bg-[#251323] rounded-xl transition-colors border border-transparent hover:border-pink-500/30 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
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
