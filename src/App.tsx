import { useState } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
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
import { AZGmailLogo } from './components/GmailLogo';
import { motion, AnimatePresence } from 'motion/react';

function MainApp() {
  const { currentUser, loading } = useAuth();
  const { settings } = useSettings();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-[25px] bg-white p-1 shadow-lg border border-blue-100 flex items-center justify-center overflow-hidden" style={{ borderRadius: '25px' }}>
            <AZGmailLogo className="w-full h-full" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">AZGmail</h1>
            <p className="text-xs text-slate-500 mt-1">Memuat data aplikasi...</p>
          </div>
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-[#F4F7FC] text-slate-800 flex flex-col selection:bg-blue-600 selection:text-white font-sans">
      <Navigation currentTab={currentTab} onSelectTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 sm:pb-32">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {currentTab === 'home' && <HomeView onNavigate={setCurrentTab} />}
            {currentTab === 'storan' && <StoranView onNavigate={setCurrentTab} />}
            {currentTab === 'riwayat' && <RiwayatView />}
            {currentTab === 'saldo' && <SaldoView />}
            {currentTab === 'rules' && <RulesView onNavigate={setCurrentTab} />}
            {currentTab === 'akun' && <AkunView onNavigate={setCurrentTab} />}
            {currentTab === 'admin' && <AdminView onNavigate={setCurrentTab} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="hidden sm:block border-t border-slate-200/80 bg-white py-6 text-xs text-slate-500 mb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-[25px] bg-blue-50 flex items-center justify-center p-0.5 overflow-hidden" style={{ borderRadius: '25px' }}>
              <AZGmailLogo className="w-full h-full" />
            </div>
            <span className="font-bold text-slate-800">AZGmail</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <span>Operasional: {settings.storanSchedule}</span>
            <span>·</span>
            <button
              onClick={() => setCurrentTab('rules')}
              className="hover:text-blue-600 font-semibold cursor-pointer"
            >
              Ketentuan Storan
            </button>
            <span>·</span>
            <button
              onClick={() => setCurrentTab('akun')}
              className="hover:text-blue-600 font-semibold cursor-pointer"
            >
              Profil & Chat Admin
            </button>
          </div>
        </div>
      </footer>
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
