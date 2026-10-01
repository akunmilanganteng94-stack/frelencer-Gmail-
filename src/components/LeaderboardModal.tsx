import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  X,
  Medal,
  Award,
  Crown,
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatRupiah, maskEmail } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

interface LeaderboardUser {
  id: string;
  displayName?: string;
  email?: string;
  totalEarned?: number;
  balance?: number;
  totalInvited?: number;
}

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    const q = query(
      collection(db, 'users'),
      orderBy('totalEarned', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: LeaderboardUser[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          list.push({
            id: doc.id,
            displayName: data.displayName || 'Freelancer',
            email: data.email || '',
            totalEarned: data.totalEarned || data.balance || 0,
            balance: data.balance || 0,
            totalInvited: data.totalInvited || 0,
          });
        });
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Leaderboard load err:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const getRankBadge = (index: number) => {
    if (index === 0) {
      return (
        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-black text-sm shrink-0 border border-amber-200">
          <Crown className="w-4 h-4 fill-amber-500 text-amber-600" />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-xs shrink-0 border border-slate-300">
          <Medal className="w-4 h-4 text-slate-600" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-black text-xs shrink-0 border border-orange-200">
          <Award className="w-4 h-4 text-orange-600" />
        </div>
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-xs shrink-0">
        #{index + 1}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden text-[#102033]"
          >
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white relative">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Leaderboard Storan
                  </h3>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Top kontributor penghasilan AZGmail
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
              {loading ? (
                <div className="space-y-2 py-4">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div
                      key={n}
                      className="h-14 bg-slate-100 rounded-2xl animate-pulse"
                    />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="py-8 text-center text-slate-500 space-y-2">
                  <Trophy className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold">
                    Belum ada data peringkat.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {users.map((u, idx) => {
                    const isSelf = currentUser?.uid === u.id;
                    return (
                      <div
                        key={u.id}
                        className={`p-3 rounded-2xl flex items-center justify-between gap-3 transition ${
                          isSelf
                            ? 'bg-blue-50/80 border-2 border-[#1677E8]/40 shadow-xs'
                            : 'bg-white border border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getRankBadge(idx)}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-800 truncate">
                                {u.displayName || 'Freelancer'}
                              </span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#1677E8] text-white">
                                  Anda
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {maskEmail(u.email || '')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-[#1677E8]">
                            {formatRupiah(u.totalEarned || 0)}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Total Reward
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500">
                Tingkatkan storan akun valid untuk menduduki peringkat teratas!
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
