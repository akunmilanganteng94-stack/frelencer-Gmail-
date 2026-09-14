import { NavigationTab } from '../types';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useContactAdmin } from '../context/ContactAdminContext';
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
              className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs border border-blue-100 p-1.5 overflow-hidden">
                <AZGmailLogo className="w-full h-full" />
              </div>
              <div>
                <div className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent leading-none">
                  AZGmail
                </div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Platform Freelance Google & Gmail
                </div>
              </div>
            </button>
            <div className="hidden sm:flex items-center gap-1.5 ml-3 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs transition-colors bg-white">
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.storanOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
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

      {/* Mobile / Android Responsive Bottom Navigation */}
      <nav
        aria-label="Bottom Navigation"
        className="md:hidden fixed bottom-3 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-40 select-none"
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
              Profil
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}

export function DesktopSidebar({
  currentTab,
  onSelectTab,
}: {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
}) {
  const { userProfile, isAdmin, logoutUser } = useAuth();
  const { settings } = useSettings();

  const mainItems: { id: NavigationTab; label: string; icon: typeof Home }[] = [
    { id: 'home', label: 'Home Dashboard', icon: Home },
    { id: 'storan', label: 'Setor Akun Gmail', icon: Send },
    { id: 'riwayat', label: 'Riwayat Storan', icon: FileText },
    { id: 'saldo', label: 'Saldo & Penarikan', icon: Wallet },
    { id: 'rules', label: 'Rules & Ketentuan', icon: ClipboardList },
    { id: 'akun', label: 'Profil & Akun', icon: UserIcon },
  ];

  return (
    <aside className="hidden md:flex md:w-64 flex-col fixed inset-y-0 left-0 pt-16 bg-white border-r border-slate-200/90 z-20">
      <div className="flex-1 flex flex-col justify-between p-4 overflow-y-auto">
        <div className="space-y-6">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-white border border-blue-100/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {userProfile?.displayName || 'User'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {userProfile?.email}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Saldo Aktif</span>
              <span className="font-extrabold text-blue-700">
                {formatRupiah(userProfile?.balance || 0)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Menu Utama
            </div>
            {mainItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="flex-1 text-left">{item.label}</span>
                </button>
              );
            })}
          </div>

          {isAdmin && (
            <div className="space-y-1 pt-2">
              <div className="px-3 text-[11px] font-bold text-indigo-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Administrator</span>
              </div>
              <button
                onClick={() => onSelectTab('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer ${
                  currentTab === 'admin'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-indigo-800 hover:bg-indigo-50/80 border border-indigo-100'
                }`}
              >
                <ShieldCheck className="w-5 h-5" />
                <span className="flex-1 text-left">Admin Panel</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-md font-bold">
                  PRO
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 space-y-2.5">
          <div className="flex items-center gap-2 px-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span className="truncate">{settings.storanSchedule.split('(')[0]}</span>
          </div>

          <button
            onClick={() => logoutUser()}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar Akun</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
