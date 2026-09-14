import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';
import { ContactAdminProvider } from './context/ContactAdminContext';
import { Navigation, DesktopSidebar } from './components/Navigation';
import { HomeView } from './views/HomeView';
import { StoranView } from './views/StoranView';
import { RiwayatView } from './views/RiwayatView';
import { SaldoView } from './views/SaldoView';
import { RulesView } from './views/RulesView';
import { AkunView } from './views/AkunView';
import { AdminView } from './views/AdminView';
import { AuthView } from './views/AuthView';
import { NavigationTab } from './types';

function MainApp() {
  const { currentUser, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavigationTab>('home');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-500 tracking-wider">
            Memuat AZGmail Freelancer...
          </span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      <Navigation currentTab={currentTab} onSelectTab={setCurrentTab} />
      <DesktopSidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

      {/* Main Content Area */}
      <main className="flex-1 md:pl-64 pb-28 md:pb-12 pt-4 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
        {currentTab === 'home' && <HomeView onNavigate={setCurrentTab} />}
        {currentTab === 'storan' && <StoranView onNavigate={setCurrentTab} />}
        {currentTab === 'riwayat' && <RiwayatView />}
        {currentTab === 'saldo' && <SaldoView />}
        {currentTab === 'rules' && <RulesView />}
        {currentTab === 'akun' && <AkunView onNavigate={setCurrentTab} />}
        {currentTab === 'admin' && <AdminView onNavigate={setCurrentTab} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <SettingsProvider>
          <ContactAdminProvider>
            <MainApp />
          </ContactAdminProvider>
        </SettingsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
