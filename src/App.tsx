import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { ContactAdminProvider } from './context/ContactAdminContext';
import { NavigationTab } from './types';
import { Navigation, DesktopSidebar } from './components/Navigation';
import { ChannelPopup } from './components/ChannelPopup';
import { AuthView } from './views/AuthView';
import { HomeView } from './views/HomeView';
import { StoranView } from './views/StoranView';
import { RiwayatView } from './views/RiwayatView';
import { SaldoView } from './views/SaldoView';
import { AkunView } from './views/AkunView';
import { AdminView } from './views/AdminView';
import { motion, AnimatePresence } from 'motion/react';

function AppContent() {
  const { currentUser, loadingAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/25 mb-4 animate-pulse">
          <span className="text-white font-black text-2xl">FS</span>
        </div>
        <div className="text-base font-extrabold text-slate-900 tracking-tight">
          Freelancer Storan
        </div>
        <p className="text-xs text-slate-500 mt-1">Memuat sesi akun pengguna...</p>
      </div>
    );
  }

  // Not logged in -> Show Auth View (Login / Register / Forgot Password)
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
        <AuthView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col antialiased font-sans">
      {/* Official WhatsApp Channel Promo Popup */}
      <ChannelPopup />

      {/* Top Header & Mobile Bottom Navigation */}
      <Navigation currentTab={activeTab} onSelectTab={setActiveTab} />

      {/* Desktop Sidebar (visible on md+) */}
      <DesktopSidebar currentTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col">
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              {activeTab === 'home' && <HomeView onNavigate={setActiveTab} />}
              {activeTab === 'storan' && <StoranView />}
              {activeTab === 'riwayat' && <RiwayatView />}
              {activeTab === 'saldo' && <SaldoView />}
              {activeTab === 'akun' && <AkunView onNavigate={setActiveTab} />}
              {activeTab === 'admin' && <AdminView onNavigate={setActiveTab} />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <ContactAdminProvider>
            <AppContent />
          </ContactAdminProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
