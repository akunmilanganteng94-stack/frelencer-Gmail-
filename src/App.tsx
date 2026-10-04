import { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ContactAdminProvider } from './context/ContactAdminContext';
import { NavigationTab } from './types';
import { Navigation } from './components/Navigation';
import { AuthView } from './views/AuthView';
import { HomeView } from './views/HomeView';
import { StoranView } from './views/StoranView';
import { RiwayatView } from './views/RiwayatView';
import { SaldoView } from './views/SaldoView';
import { RulesView } from './views/RulesView';
import { AkunView } from './views/AkunView';
import { AdminView } from './views/AdminView';
import { ReferralView } from './views/ReferralView';
import { captureReferralFromUrl } from './lib/referralHelper';
import { FloatingRefreshButton } from './components/FloatingRefreshButton';
import { APK_DOWNLOAD_URL } from './components/ApkDownloadCard';
import { Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function MainApp() {
  const { currentUser, loading, isAdmin } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');
  const [isDesktopMode, setIsDesktopMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('app_desktop_mode') === 'true';
    } catch {
      return false;
    }
  });

  const effectiveDesktopMode = isAdmin ? isDesktopMode : false;

  const toggleDesktopMode = () => {
    if (!isAdmin) return;
    setIsDesktopMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('app_desktop_mode', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    captureReferralFromUrl();
  }, []);

  useEffect(() => {
    if (!isAdmin && currentTab === 'admin') {
      setCurrentTab('home');
    }
  }, [isAdmin, currentTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#EEF8FF] flex flex-col items-center justify-center p-4 select-none">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 rounded-3xl bg-[#1677E8] text-white flex items-center justify-center shadow-xl shadow-blue-500/30">
            <Mail className="w-8 h-8 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight select-none">
              <span className="text-[#0D5FC7]">azyx</span>
              <span className="text-[#1677E8]">19</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Memuat aplikasi azyx19...</p>
          </div>
          <div className="w-6 h-6 border-2 border-[#1677E8] border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView />;
  }

  return (
    <div
      className={`min-h-screen bg-[#EEF8FF] text-[#102033] flex flex-col selection:bg-[#1677E8] selection:text-white font-sans antialiased transition-all ${
        effectiveDesktopMode ? 'min-w-[1024px]' : ''
      }`}
    >
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isDesktopMode={effectiveDesktopMode}
        onToggleDesktopMode={toggleDesktopMode}
      />

      <main
        className={`flex-1 w-full mx-auto px-3.5 sm:px-4 md:px-6 py-3 sm:py-4 pb-28 sm:pb-32 transition-all ${
          effectiveDesktopMode
            ? 'max-w-6xl'
            : 'max-w-md md:max-w-3xl lg:max-w-4xl'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {currentTab === 'home' && <HomeView onNavigate={setCurrentTab} />}
            {currentTab === 'storan' && <StoranView onNavigate={setCurrentTab} />}
            {currentTab === 'riwayat' && <RiwayatView />}
            {currentTab === 'saldo' && <SaldoView />}
            {currentTab === 'rules' && <RulesView onNavigate={setCurrentTab} />}
            {currentTab === 'akun' && <AkunView onNavigate={setCurrentTab} />}
            {currentTab === 'admin' && isAdmin && <AdminView onNavigate={setCurrentTab} />}
            {currentTab === 'referral' && <ReferralView onNavigate={setCurrentTab} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="hidden sm:block border-t border-blue-100/80 bg-white/70 py-4 text-xs text-slate-500 mb-20">
        <div
          className={`mx-auto px-4 flex items-center justify-between gap-3 transition-all ${
            effectiveDesktopMode ? 'max-w-6xl' : 'max-w-md md:max-w-3xl lg:max-w-4xl'
          }`}
        >
          <div className="flex items-center gap-1 font-bold">
            <span className="text-[#0D5FC7]">Azyx</span>
            <span className="text-[#1677E8]">19</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <button
              onClick={() => setCurrentTab('rules')}
              className="hover:text-[#1677E8] cursor-pointer"
            >
              Ketentuan
            </button>
            <span>&bull;</span>
            <button
              onClick={() => setCurrentTab('akun')}
              className="hover:text-[#1677E8] cursor-pointer"
            >
              Profil
            </button>
            <span>&bull;</span>
            <a
              href={APK_DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#1677E8] font-bold hover:underline cursor-pointer"
            >
              APK
            </a>
          </div>
        </div>
      </footer>

      <FloatingRefreshButton />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <SettingsProvider>
        <AuthProvider>
          <ContactAdminProvider>
            <MainApp />
          </ContactAdminProvider>
        </AuthProvider>
      </SettingsProvider>
    </ToastProvider>
  );
}
