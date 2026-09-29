import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavigationTab, ReferralItem } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Gift, ArrowRight, Sparkles, Users } from 'lucide-react';

interface MisiReferralBannerProps {
  onNavigate: (tab: NavigationTab) => void;
  className?: string;
}

export function MisiReferralBanner({ onNavigate, className = '' }: MisiReferralBannerProps) {
  const { currentUser } = useAuth();
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'referrals'),
      where('inviterUid', '==', currentUser.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ReferralItem[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ReferralItem, 'id'>) });
        });
        setTotalCount(list.length);
        setCompletedCount(list.filter((r) => r.status === 'completed').length);
        setLoading(false);
      },
      (err) => {
        console.warn('Banner referrals snapshot error:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  const currentProgress = completedCount % 20;

  return (
    <div
      onClick={() => onNavigate('referral')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onNavigate('referral');
        }
      }}
      className={`group relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-r from-white via-blue-50/50 to-sky-50/70 border border-blue-200/80 hover:border-blue-400/80 p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all duration-200 cursor-pointer select-none active:scale-[0.99] ${className}`}
    >
      {/* Decorative background glow */}
      <div className="absolute right-0 top-0 w-36 h-36 bg-gradient-to-br from-[#38bdf8]/15 via-blue-500/10 to-transparent rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Left Side: Icon + Title + Description */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-[#1e40af] via-[#2563eb] to-[#38bdf8] text-white flex items-center justify-center shadow-xs shadow-blue-500/25 shrink-0 group-hover:scale-105 transition-transform">
            <Gift className="w-4 h-4 sm:w-5 sm:h-5 text-white stroke-[2.2]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight group-hover:text-blue-700 transition">
                Misi Referral
              </h3>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] sm:text-[10px] font-black bg-gradient-to-r from-[#1e40af] to-[#38bdf8] text-white shadow-2xs">
                Bonus 10.000
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 truncate mt-0.5">
              Undang 20 teman & dapatkan <strong className="text-blue-700 font-bold">Rp 10.000</strong> otomatis masuk ke saldo!
            </p>
          </div>
        </div>

        {/* Right Side: Mini Progress & Button */}
        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Users className="w-3 h-3 text-blue-600 inline" />
                <span>Progres:</span>
                <strong className="text-[#1e40af] font-mono font-black">
                  {loading ? '0' : currentProgress}/20
                </strong>
              </div>
              <div className="w-20 sm:w-24 h-1.5 rounded-full bg-slate-200 overflow-hidden mt-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#1e40af] to-[#38bdf8] transition-all duration-300"
                  style={{ width: `${Math.min(100, (currentProgress / 20) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="hidden md:inline text-xs font-bold text-blue-700 group-hover:underline">
              Buka Misi
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-50 text-blue-700 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition shadow-2xs shrink-0">
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
