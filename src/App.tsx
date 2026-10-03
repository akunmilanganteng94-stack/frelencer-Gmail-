import { useState, useEffect } from 'react';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { ContactAdminProvider } from './context/ContactAdminContext';
import { NavigationTab } from './types';
import { Navigation } from './components/Navigation';
import { FloatingRefreshButton } from './components/FloatingRefreshButton';
import { HomeView } from './views/HomeView';
import { StoranView } from './views/StoranView';
import { SaldoView } from './views/SaldoView';
import { RiwayatView } from './views/RiwayatView';
import { RulesView } from './views/RulesView';
import { AdminView } from './views/AdminView';
import { AuthView } from './views/AuthView';
import { ProfileView } from './views/ProfileView';
import { MisiReferralCard } from './components/MisiReferralCard';
import { ApkDownloadCard } from './components/ApkDownloadCard';
import { formatRupiah } from './lib/utils';
import {
  User,
  LogOut,
  Wallet,
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles,
  Share2,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

function MainApp() {
  const { currentUser, userProfile, loading: authLoading, logoutUser, isAdmin } = useAuth();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [isDesktopMode, setIsDesktopMode] = useState(false);

  // Sync tab with URL hash if present
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as NavigationTab;
      const validTabs: NavigationTab[] = [
        'home',
        'storan',
        'riwayat',
        'saldo',
        'akun',
        'admin',
        'rules',
        'referral',
      ];
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSelectTab = (tab: NavigationTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 animate-bounce mb-3">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <p className="text-xs font-bold text-slate-500">Memuat AZGmail...</p>
      </div>
    );
  }

  // If user is not logged in, show AuthView
  if (!currentUser) {
    return <AuthView />;
  }

  // Full-width Admin View when admin tab is selected
  if (activeTab === 'admin' && isAdmin) {
    return (
      <div className="min-h-screen bg-[#F4F6FB]">
        <AdminView onNavigate={handleSelectTab} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      {/* Navigation Header */}
      <Navigation
        currentTab={activeTab}
        onSelectTab={handleSelectTab}
        isDesktopMode={isDesktopMode}
        onToggleDesktopMode={() => setIsDesktopMode(!isDesktopMode)}
      />

      {/* Main App Container */}
      <main
        className={`flex-1 mx-auto w-full px-3.5 sm:px-4 py-4 sm:py-6 pb-24 sm:pb-28 transition-all ${
          isDesktopMode ? 'max-w-6xl' : 'max-w-md md:max-w-2xl lg:max-w-3xl'
        }`}
      >
        {/* Maintenance / Announcement Notice if any */}
        {settings.websiteStatus === 'maintenance' && (
          <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Sistem dalam pemeliharaan berkala. Beberapa fitur mungkin tertunda.</span>
          </div>
        )}

        {/* Tab Views */}
        {activeTab === 'home' && <HomeView onNavigate={handleSelectTab} />}
        {activeTab === 'storan' && <StoranView onNavigate={handleSelectTab} />}
        {activeTab === 'saldo' && <SaldoView />}
        {activeTab === 'riwayat' && <RiwayatView />}
        {activeTab === 'rules' && <RulesView onNavigate={handleSelectTab} />}
        {activeTab === 'referral' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-100 shadow-sm">
              <h2 className="text-xl font-black text-slate-900 mb-1">Misi &amp; Bonus Referral</h2>
              <p className="text-xs text-slate-500">
                Ajak teman Anda untuk menyetor akun Gmail dan raih bonus komisi saldo langsung.
              </p>
            </div>
            <MisiReferralCard variant="full" />
          </div>
        )}

        {/* Tab Akun Freelancer (Tanpa Saldo, dengan Statistik Akun, Ubah Password, dll) */}
        {activeTab === 'akun' && <ProfileView onNavigate={handleSelectTab} />}
      </main>

      {/* Floating Refresh Button */}
      <FloatingRefreshButton />
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
