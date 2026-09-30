import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function FloatingRefreshButton() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={refreshing}
      className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-40 p-2.5 sm:p-3 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-blue-600 shadow-lg hover:shadow-xl border border-slate-200/90 backdrop-blur-md transition-all active:scale-90 cursor-pointer flex items-center gap-1.5 group select-none"
      title="Segarkan Halaman (Refresh)"
      aria-label="Refresh Halaman"
    >
      <RefreshCw
        className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-600 group-hover:text-blue-600 transition-colors ${
          refreshing ? 'animate-spin text-blue-600' : ''
        }`}
      />
      <span className="hidden group-hover:inline text-[11px] font-bold text-slate-700 pr-1">
        {refreshing ? 'Memuat...' : 'Refresh'}
      </span>
    </button>
  );
}
