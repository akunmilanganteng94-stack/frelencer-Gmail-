import { NavigationTab } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { formatRupiah } from '../lib/utils';
import { AZGmailLogo } from './GmailLogo';
import {
  Home,
  FileText,
  Send,
  Wallet,
  User as UserIcon,
  ShieldCheck,
  LogOut,
  Clock,
  ClipboardList,
  History,
} from 'lucide-react';

interface NavigationProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}

export function Navigation({ currentTab, onSelectTab }: NavigationProps) {
  const { userProfile, isAdmin } = useAuth();
  const { settings } = useSettings();

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
            >
              <div
                className="w-10 h-10 rounded-[25px] bg-white flex items-center justify-center shadow-xs border border-blue-100 p-0.5 overflow-hidden shrink-0"
                style={{ borderRadius: '25px' }}
              >
                <AZGmailLogo className="w-full h-full" />
              </div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent leading-none select-none">
                AZGmail
              </span>
            </button>

            <div className="hidden sm:flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs transition-colors bg-white">
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.storanOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span className={settings.storanOpen ? 'text-emerald-700' : 'text-rose-700'}>
                {settings.storanOpen ? 'Storan BUKA' : 'Storan TUTUP'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-4">
            <button
              onClick={() => onSelectTab('saldo')}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50/90 hover:bg-blue-100/80 border border-blue-200/70 rounded-xl text-blue-900 transition text-xs sm:text-sm font-semibold cursor-pointer"
              title="Lihat Rincian Saldo"
            >
              <Wallet className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{formatRupiah(userProfile?.balance || 0)}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => onSelectTab('admin')}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  currentTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Admin Panel</span>
              </button>
            )}

            <button
              onClick={() => onSelectTab('akun')}
              className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-xl hover:bg-slate-100 transition text-slate-700 cursor-pointer"
              title="Pengaturan Akun & Profil"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                {userProfile?.displayName || 'User'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Bottom Floating Feature Navigation (Consistent across Mobile and Desktop) */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-3 sm:bottom-4 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-40 select-none"
      >
        <div className="bg-white rounded-[32px] shadow-[0_10px_35px_rgba(0,0,0,0.12)] border border-slate-100/90 px-3 py-2 flex items-end justify-between relative">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="flex-1 flex flex-col items-center justify-center py-1 transition-all group cursor-pointer"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                currentTab === 'home'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-transparent text-slate-400 group-hover:text-slate-600'
              }`}
            >
              <Home className="w-5 h-5" />
            </div>
            <span
              className={`text-[11px] leading-none mt-1 tracking-tight ${
                currentTab === 'home'
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-400 font-medium'
              }`}
            >
              Beranda
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('riwayat')}
            className="flex-1 flex flex-col items-center justify-center py-1 transition-all group cursor-pointer"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                currentTab === 'riwayat'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-transparent text-slate-400 group-hover:text-slate-600'
              }`}
            >
              <History className="w-5 h-5" />
            </div>
            <span
              className={`text-[11px] leading-none mt-1 tracking-tight ${
                currentTab === 'riwayat'
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-400 font-medium'
              }`}
            >
              Riwayat
            </span>
          </button>

          {/* Center Elevated Button */}
          <div className="flex-1 flex flex-col items-center justify-center -mt-7 sm:-mt-8 relative">
            <div className="absolute top-1 w-14 h-14 rounded-full bg-blue-500/35 blur-md -z-10 pointer-events-none" />
            <button
              type="button"
              onClick={() => onSelectTab('storan')}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform active:scale-95 cursor-pointer border-4 border-white ${
                currentTab === 'storan'
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/40 scale-105 ring-2 ring-blue-100'
                  : 'bg-gradient-to-tr from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 hover:scale-105'
              }`}
              title="Setor Akun Gmail"
            >
              <Send className="w-6 h-6 text-white translate-x-0.5 -translate-y-0.5 stroke-[2.3]" />
            </button>
            <span
              className={`text-[11px] leading-none mt-1.5 tracking-tight font-black ${
                currentTab === 'storan' ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              STOR
            </span>
          </div>

          <button
            type="button"
            onClick={() => onSelectTab('saldo')}
            className="flex-1 flex flex-col items-center justify-center py-1 transition-all group cursor-pointer"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                currentTab === 'saldo'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-transparent text-slate-400 group-hover:text-slate-600'
              }`}
            >
              <Wallet className="w-5 h-5" />
            </div>
            <span
              className={`text-[11px] leading-none mt-1 tracking-tight ${
                currentTab === 'saldo'
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-400 font-medium'
              }`}
            >
              Saldo
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('akun')}
            className="flex-1 flex flex-col items-center justify-center py-1 transition-all group cursor-pointer"
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                currentTab === 'akun'
                  ? 'bg-blue-50 text-blue-600'
                  : 'bg-transparent text-slate-400 group-hover:text-slate-600'
              }`}
            >
              <UserIcon className="w-5 h-5" />
            </div>
            <span
              className={`text-[11px] leading-none mt-1 tracking-tight ${
                currentTab === 'akun'
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-400 font-medium'
              }`}
            >
              Akun
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
