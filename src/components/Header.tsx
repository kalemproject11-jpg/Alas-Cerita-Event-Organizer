import React from 'react';
import { User, UserRole } from '../types';
import { 
  Ticket, 
  QrCode, 
  ShieldAlert, 
  LayoutDashboard, 
  UserCheck, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  onSwitchUser: (userId: string) => void;
  users: User[];
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onResetData: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  users,
  activeTab,
  onSelectTab,
  onResetData,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-500/20">
            <Ticket className="w-5 h-5" />
          </div>
          <button 
            onClick={() => onSelectTab('catalog')}
            className="text-left group cursor-pointer focus:outline-none"
          >
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-indigo-400 transition-colors whitespace-nowrap">
              EventPass
            </span>
            <span className="hidden sm:inline-block text-xs text-slate-400 ml-2 font-mono">
              v1.0 Laravel & QR Engine
            </span>
          </button>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            onClick={() => onSelectTab('catalog')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'catalog'
                ? 'text-indigo-400 border-b-2 border-indigo-500 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Katalog Event
          </button>

          <button
            onClick={() => onSelectTab('my-tickets')}
            className={`whitespace-nowrap transition-colors py-1 ${
              activeTab === 'my-tickets'
                ? 'text-indigo-400 border-b-2 border-indigo-500 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Tiket Saya
          </button>

          <button
            onClick={() => onSelectTab('scanner')}
            className={`whitespace-nowrap flex items-center gap-1.5 transition-colors py-1 ${
              activeTab === 'scanner'
                ? 'text-emerald-400 border-b-2 border-emerald-500 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Gate Scanner</span>
          </button>

          <button
            onClick={() => onSelectTab('helpdesk')}
            className={`whitespace-nowrap flex items-center gap-1.5 transition-colors py-1 ${
              activeTab === 'helpdesk'
                ? 'text-amber-400 border-b-2 border-amber-500 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Helpdesk Supervisor</span>
          </button>

          <button
            onClick={() => onSelectTab('admin')}
            className={`whitespace-nowrap flex items-center gap-1.5 transition-colors py-1 ${
              activeTab === 'admin'
                ? 'text-indigo-400 border-b-2 border-indigo-500 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-400" />
            <span>Admin & Laporan</span>
          </button>
        </nav>

        {/* Zone 3: Active Actor Selector & Quick Utility */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Role Switcher */}
          <div className="flex items-center gap-2 bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs">
            <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="hidden lg:inline text-slate-400">Login Sebagai:</span>
            <select
              value={currentUser.id}
              onChange={(e) => onSwitchUser(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer pr-1"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                  {u.name} ({getRoleBadge(u.role)})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onResetData}
            title="Reset Database ke Data Contoh Awal"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Secondary Navigation Strip */}
      <div className="md:hidden border-t border-slate-800/80 bg-slate-900/60 px-4 py-2 flex items-center justify-between text-xs overflow-x-auto gap-3">
        <button
          onClick={() => onSelectTab('catalog')}
          className={`whitespace-nowrap px-2 py-1 rounded ${activeTab === 'catalog' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
        >
          Katalog
        </button>
        <button
          onClick={() => onSelectTab('my-tickets')}
          className={`whitespace-nowrap px-2 py-1 rounded ${activeTab === 'my-tickets' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
        >
          Tiket Saya
        </button>
        <button
          onClick={() => onSelectTab('scanner')}
          className={`whitespace-nowrap px-2 py-1 rounded ${activeTab === 'scanner' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
        >
          Scanner
        </button>
        <button
          onClick={() => onSelectTab('helpdesk')}
          className={`whitespace-nowrap px-2 py-1 rounded ${activeTab === 'helpdesk' ? 'bg-amber-600 text-white' : 'text-slate-400'}`}
        >
          Helpdesk
        </button>
        <button
          onClick={() => onSelectTab('admin')}
          className={`whitespace-nowrap px-2 py-1 rounded ${activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
        >
          Admin
        </button>
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
