import { NavigationTab } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Send,
  Wallet,
  User as UserIcon,
  ShieldCheck,
  History,
  Mail,
  MessageCircle,
  Monitor,
  Smartphone,
} from 'lucide-react';

interface NavigationProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isDesktopMode?: boolean;
  onToggleDesktopMode?: () => void;
}

export function Navigation({
  currentTab,
  onSelectTab,
  isDesktopMode = false,
  onToggleDesktopMode,
}: NavigationProps) {
  const { isAdmin } = useAuth();
  const waChannelUrl = 'https://whatsapp.com/channel/0029VbCwLl7J3jv1QSig1V0C';

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-blue-100/60 shadow-2xs">
        <div
          className={`mx-auto px-4 h-16 flex items-center justify-between transition-all ${
            isDesktopMode ? 'max-w-6xl' : 'max-w-md md:max-w-3xl lg:max-w-4xl'
          }`}
        >
          {/* Sebelah kiri */}
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group active:scale-98 transition"
          >
            <div className="w-10 h-10 rounded-full bg-[#1677E8] flex items-center justify-center text-white shadow-xs shadow-blue-500/25 shrink-0 group-hover:scale-105 transition-transform">
              <Mail className="w-5 h-5 text-white stroke-[2.2]" />
            </div>
            <div className="flex items-center text-lg sm:text-xl font-black tracking-tight select-none">
              <span className="text-[#0D5FC7]">Azyx</span>
              <span className="text-[#1677E8]">19</span>
            </div>
          </button>

          {/* Sebelah kanan */}
          <div className="flex items-center gap-2">
            {/* Tombol Toggle Mode Desktop (Khusus Admin, di user dihapus) */}
            {isAdmin && onToggleDesktopMode && (
              <button
                type="button"
                onClick={onToggleDesktopMode}
                className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer border shadow-2xs ${
                  isDesktopMode
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title={isDesktopMode ? 'Beralih ke Tampilan Mobile' : 'Aktifkan Mode Desktop'}
              >
                {isDesktopMode ? (
                  <>
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden sm:inline">Mode Mobile</span>
                  </>
                ) : (
                  <>
                    <Monitor className="w-3.5 h-3.5 text-blue-600" />
                    <span>Mode Desktop</span>
                  </>
                )}
              </button>
            )}

            {/* Tombol Saluran WA */}
            <a
              href={waChannelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-2xs px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Gabung Saluran WhatsApp Resmi"
            >
              <MessageCircle className="w-4 h-4 text-[#10B981] fill-[#10B981]/20 stroke-[2.2]" />
              <span className="text-slate-800">Saluran WA</span>
            </a>

            {/* Admin Panel button if admin */}
            {isAdmin && (
              <button
                type="button"
                onClick={() => onSelectTab('admin')}
                className={`p-1.5 rounded-full border transition cursor-pointer active:scale-95 ${
                  currentTab === 'admin'
                    ? 'bg-[#1677E8] text-white border-[#1677E8] shadow-xs'
                    : 'bg-blue-50 text-[#1677E8] border-blue-200 hover:bg-blue-100'
                }`}
                title="Panel Admin"
              >
                <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* BOTTOM NAVIGATION (FIXED DI BAGIAN BAWAH LAYAR) */}
      <nav
        aria-label="Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 select-none pointer-events-none"
      >
        <div
          className={`mx-auto pointer-events-auto transition-all ${
            isDesktopMode ? 'max-w-xl' : 'max-w-[480px] sm:max-w-md md:max-w-lg'
          }`}
        >
          <div className="bg-white/95 backdrop-blur-md rounded-t-[26px] shadow-[0_-4px_25px_rgba(0,0,0,0.08)] border-t border-slate-100/90 px-3 pt-2 pb-3 sm:pb-4 flex items-end justify-between relative">
            {/* 1. Beranda */}
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className="flex-1 flex flex-col items-center justify-center py-1 transition-all group cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  currentTab === 'home'
                    ? 'text-[#1677E8]'
                    : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                <Home className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span
                className={`text-[11px] leading-none mt-0.5 tracking-tight ${
                  currentTab === 'home'
                    ? 'text-[#1677E8] font-bold'
                    : 'text-slate-400 font-medium'
                }`}
              >
                Beranda
              </span>
            </button>

            {/* 2. Riwayat */}
            <button
              type="button"
              onClick={() => onSelectTab('riwayat')}
              className="flex-1 flex flex-col items-center justify-center py-1 transition-all group cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  currentTab === 'riwayat'
                    ? 'text-[#1677E8]'
                    : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                <History className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span
                className={`text-[11px] leading-none mt-0.5 tracking-tight ${
                  currentTab === 'riwayat'
                    ? 'text-[#1677E8] font-bold'
                    : 'text-slate-400 font-medium'
                }`}
              >
                Riwayat
              </span>
            </button>

            {/* 3. TOMBOL STOR DI TENGAH */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-6 sm:-mt-7 relative">
              <div className="absolute top-1 w-14 h-14 rounded-full bg-blue-500/30 blur-md -z-10 pointer-events-none" />
              <button
                type="button"
                onClick={() => onSelectTab('storan')}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform active:scale-95 cursor-pointer border-4 border-white ${
                  currentTab === 'storan'
                    ? 'bg-[#1677E8] text-white shadow-xl shadow-blue-500/40 ring-2 ring-blue-300'
                    : 'bg-[#1677E8] text-white shadow-lg shadow-blue-500/30 hover:scale-105'
                }`}
                title="Stor Akun Gmail"
              >
                <Send className="w-6 h-6 text-white translate-x-0.5 -translate-y-0.5 stroke-[2.4]" />
              </button>
              <span className="text-[11px] leading-none mt-1 tracking-tight font-black text-[#1677E8]">
                Stor
              </span>
            </div>

            {/* 4. Saldo */}
            <button
              type="button"
              onClick={() => onSelectTab('saldo')}
              className="flex-1 flex flex-col items-center justify-center py-1 transition-all group cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  currentTab === 'saldo'
                    ? 'text-[#1677E8]'
                    : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                <Wallet className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span
                className={`text-[11px] leading-none mt-0.5 tracking-tight ${
                  currentTab === 'saldo'
                    ? 'text-[#1677E8] font-bold'
                    : 'text-slate-400 font-medium'
                }`}
              >
                Saldo
              </span>
            </button>

            {/* 5. Profil */}
            <button
              type="button"
              onClick={() => onSelectTab('akun')}
              className="flex-1 flex flex-col items-center justify-center py-1 transition-all group cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  currentTab === 'akun'
                    ? 'text-[#1677E8]'
                    : 'text-slate-400 group-hover:text-slate-600'
                }`}
              >
                <UserIcon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span
                className={`text-[11px] leading-none mt-0.5 tracking-tight ${
                  currentTab === 'akun'
                    ? 'text-[#1677E8] font-bold'
                    : 'text-slate-400 font-medium'
                }`}
              >
                Profil
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
