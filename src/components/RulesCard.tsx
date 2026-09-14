import { useSettings } from '../context/SettingsContext';
import { NavigationTab } from '../types';
import { ClipboardList, ArrowRight } from 'lucide-react';

interface RulesCardProps {
  onNavigate?: (tab: NavigationTab) => void;
  onClick?: () => void;
}

export function RulesCard({ onNavigate, onClick }: RulesCardProps) {
  const { settings } = useSettings();
  const activePassword = settings.gmailDefaultPassword || 'sgsg1122';

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
      className="bg-white hover:bg-slate-50/90 rounded-3xl border border-slate-200/80 hover:border-purple-200 p-4 sm:p-5 shadow-xs transition-all duration-200 cursor-pointer group select-none"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 group-hover:bg-purple-100 transition-all shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-slate-900 tracking-tight group-hover:text-purple-700 transition">
                Rules & Ketentuan
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 shrink-0">
                {settings.rules?.length || 0} Aturan
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              Password wajib:{' '}
              <strong className="font-mono text-orange-600 font-bold">
                {activePassword}
              </strong>{' '}
              • Klik untuk baca aturan lengkap
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-xs font-bold text-purple-700 group-hover:underline">
            Buka Halaman Rules
          </span>
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition shadow-2xs">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
