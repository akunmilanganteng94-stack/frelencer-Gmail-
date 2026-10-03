import {
  LayoutDashboard,
  Users,
  Boxes,
  ClipboardCheck,
  Clock,
  Settings,
  ShieldCheck,
  ArrowLeft,
  X,
  Wallet,
  Sparkles,
  ChevronLeft,
  Sliders,
} from 'lucide-react';

export type AdminMenuTab =
  | 'dashboard'
  | 'all_saklar'
  | 'users'
  | 'batch'
  | 'cek_admin'
  | 'pendingan'
  | 'generator_stock'
  | 'pengaturan';

interface AdminSidebarProps {
  activeTab: AdminMenuTab;
  onSelectTab: (tab: AdminMenuTab) => void;
  counts: {
    users: number;
    batch: number;
    cekAdmin: number;
    pending: number;
    withdrawals: number;
    generatorStock?: number;
    activeSwitches?: number;
  };
  onBackToApp: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  isDesktopOpen: boolean;
  onToggleDesktop: () => void;
}

export function AdminSidebar({
  activeTab,
  onSelectTab,
  counts,
  onBackToApp,
  isMobileOpen,
  onCloseMobile,
  isDesktopOpen,
  onToggleDesktop,
}: AdminSidebarProps) {
  const menuItems: {
    id: AdminMenuTab;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'all_saklar',
      label: 'All Saklar',
      icon: Sliders,
      badge: counts.activeSwitches,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
    },
    {
      id: 'users',
      label: 'Kelola Akun',
      icon: Users,
      badge: counts.users,
      badgeColor: 'bg-slate-700 text-slate-200',
    },
    {
      id: 'batch',
      label: 'Batch & Penjualan',
      icon: Boxes,
      badge: counts.batch,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-400/30',
    },
    {
      id: 'cek_admin',
      label: 'Pendingan All Cek Admin',
      icon: ClipboardCheck,
      badge: counts.cekAdmin,
      badgeColor: counts.cekAdmin > 0 ? 'bg-blue-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400',
    },
    {
      id: 'pendingan',
      label: 'Pendingan',
      icon: Clock,
      badge: counts.pending,
      badgeColor: counts.pending > 0 ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-400',
    },
    {
      id: 'generator_stock',
      label: 'Stok Generator',
      icon: Sparkles,
      badge: counts.generatorStock,
      badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-400/30',
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan & Payout',
      icon: Settings,
      badge: counts.withdrawals,
      badgeColor: counts.withdrawals > 0 ? 'bg-amber-500 text-slate-950 font-black' : undefined,
    },
  ];

  const content = (
    <div className="flex flex-col h-full bg-[#0B132B] text-slate-300 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight text-white flex items-center gap-1.5">
              <span>AZYX</span>
              <span className="text-blue-400">19</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Panel Admin Pro
            </p>
          </div>
        </div>

        {/* Desktop Collapse / Close Button */}
        <button
          type="button"
          onClick={onToggleDesktop}
          className="hidden lg:flex p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          title="Tutup Sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Mobile close button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
          Menu Utama
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectTab(item.id);
                onCloseMobile();
              }}
              className={`w-full px-3.5 py-3 rounded-2xl text-xs font-bold transition flex items-center justify-between gap-3 cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-blue-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>
              {typeof item.badge === 'number' && item.badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                    isActive ? 'bg-white text-blue-900' : item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Sub-menu Keuangan / Penarikan notice */}
        <div className="pt-4 mt-4 border-t border-slate-800">
          <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Penarikan Dana
          </div>
          <button
            type="button"
            onClick={() => {
              onSelectTab('pengaturan');
              onCloseMobile();
            }}
            className="w-full px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between text-slate-400 hover:bg-slate-800/60 hover:text-white cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Kelola Payouts</span>
            </div>
            {counts.withdrawals > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                {counts.withdrawals} Pending
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Footer User Back Action */}
      <div className="p-3.5 border-t border-slate-800 space-y-2">
        <button
          type="button"
          onClick={onBackToApp}
          className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Beranda</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar: Terbuka otomatis saat desktop, dan bisa ditutup/dibuka kembali */}
      {isDesktopOpen && (
        <aside className="hidden lg:flex w-64 min-h-screen shrink-0 border-r border-slate-800 sticky top-0 h-screen z-30 transition-all duration-200">
          {content}
        </aside>
      )}

      {/* Mobile Slide-Over Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85%] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
