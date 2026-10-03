import { useSettings } from '../context/SettingsContext';
import { NavigationTab } from '../types';
import { ClipboardList, ArrowRight } from 'lucide-react';

interface RulesCardProps {
  onNavigate?: (tab: NavigationTab) => void;
  onClick?: () => void;
}

export function RulesCard({ onNavigate, onClick }: RulesCardProps) {
  const { settings } = useSettings();
  const activePassword = settings.gmailDefaultPassword || 'zero1122 / prabujaya';

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (onNavigate) {
      onNavigate('rules');
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="bg-white hover:bg-slate-50/90 rounded-xl sm:rounded-2xl border border-slate-200/80 hover:border-blue-200 p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer group select-none"
    >
      <div className="flex items-center justify-between gap-2.5 sm:gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-2xs group-hover:scale-105 group-hover:bg-blue-100 transition-all shrink-0">
            <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight group-hover:text-blue-700 transition">
                Rules &amp; Ketentuan
              </h3>
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 shrink-0">
                {settings.rules?.length || 0} Aturan
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
              Password wajib:{' '}
              <strong className="font-mono text-orange-600 font-bold">
                {activePassword}
              </strong>{' '}
              &bull; Klik untuk baca aturan lengkap
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-xs font-bold text-blue-700 group-hover:underline">
            Buka Halaman Rules
          </span>
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition shadow-2xs">
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
