import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  User,
  Mail,
  Wallet,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Gift,
  ShieldCheck,
  Send,
  ArrowDownLeft,
} from 'lucide-react';
import { UserProfile, Submission, Withdrawal } from '../../types';
import { formatRupiah, formatIndonesianDateTime } from '../../lib/utils';
import { getSubmissionStor, getCleanEmail } from './adminUtils';

interface AdminUserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  submissions: Submission[];
  withdrawals: Withdrawal[];
  onOpenBalanceModal?: (user: UserProfile, mode: 'add' | 'set') => void;
  onToggleSuspendUser?: (user: UserProfile) => void;
}

export function AdminUserDetailModal({
  isOpen,
  onClose,
  user,
  submissions,
  withdrawals,
  onOpenBalanceModal,
  onToggleSuspendUser,
}: AdminUserDetailModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'storan' | 'payouts'>('info');

  const userSubmissions = useMemo(() => {
    if (!user) return [];
    return submissions.filter((s) => s.userId === user.uid);
  }, [submissions, user]);

  const userWithdrawals = useMemo(() => {
    if (!user) return [];
    return withdrawals.filter((w) => w.userId === user.uid);
  }, [withdrawals, user]);

  const totalDiterima = useMemo(
    () => userSubmissions.filter((s) => s.status === 'Diterima').length,
    [userSubmissions]
  );
  const totalPending = useMemo(
    () => userSubmissions.filter((s) => s.status === 'Pending' || s.status === 'Cek Admin').length,
    [userSubmissions]
  );
  const totalDitolak = useMemo(
    () => userSubmissions.filter((s) => s.status === 'Ditolak').length,
    [userSubmissions]
  );

  if (!isOpen || !user) return null;

  const isSuspended = user.status === 'suspended';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md shadow-blue-500/30 shrink-0">
                {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white truncate">
                    {user.displayName || 'Freelancer'}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      isSuspended
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {isSuspended ? 'Suspended' : 'Aktif'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-300 border border-white/20">
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-mono truncate mt-0.5">{user.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Sub Navigation Bar */}
          <div className="px-5 pt-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSubTab('info')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                activeSubTab === 'info'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Profil &amp; Keuangan
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('storan')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'storan'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Riwayat Storan</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-800 font-black">
                {userSubmissions.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('payouts')}
              className={`px-4 py-2 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'payouts'
                  ? 'border-blue-600 text-blue-700 bg-white rounded-t-xl'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Penarikan</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-black">
                {userWithdrawals.length}
              </span>
            </button>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-slate-800">
            {activeSubTab === 'info' && (
              <div className="space-y-4">
                {/* 4 Cards Saldo */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                      Saldo Tersedia
                    </span>
                    <div className="text-lg sm:text-xl font-black text-blue-900 font-mono mt-1">
                      {formatRupiah(user.balance || 0)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
                      Total Pendapatan
                    </span>
                    <div className="text-lg sm:text-xl font-black text-emerald-800 font-mono mt-1">
                      {formatRupiah(user.totalEarned || 0)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Total Ditarik
                    </span>
                    <div className="text-lg sm:text-xl font-black text-slate-800 font-mono mt-1">
                      {formatRupiah(user.totalWithdrawn || 0)}
                    </div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                      Pending Payout
                    </span>
                    <div className="text-lg sm:text-xl font-black text-amber-800 font-mono mt-1">
                      {formatRupiah(user.pendingWithdrawn || 0)}
                    </div>
                  </div>
                </div>

                {/* Detail Identitas User */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    <span>Identitas Akun</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">User ID (UID):</span>
                      <span className="font-mono font-bold text-slate-900 select-all">{user.uid}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">Email Akun:</span>
                      <span className="font-bold text-slate-900">{user.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">Tanggal Bergabung:</span>
                      <span className="font-medium text-slate-700">
                        {user.createdAt ? formatIndonesianDateTime(user.createdAt) : '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block text-[10px]">Kode Referral User:</span>
                      <span className="font-mono font-black text-blue-700">
                        {user.referralCode || '-'}
                      </span>
                    </div>
                    {user.referredBy && (
                      <div className="col-span-1 sm:col-span-2 p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
                        <span className="text-blue-900 font-semibold text-[11px]">
                          Diundang oleh: <strong>{user.inviterName || user.referredByCode || user.referredBy}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ringkasan Storan */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-blue-600" />
                    <span>Ringkasan Submission Storan</span>
                  </h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold block">Total</span>
                      <strong className="text-base font-black text-slate-900 font-mono">
                        {userSubmissions.length}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 font-bold block">Diterima</span>
                      <strong className="text-base font-black text-emerald-800 font-mono">
                        {totalDiterima}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="text-[10px] text-amber-700 font-bold block">Pending</span>
                      <strong className="text-base font-black text-amber-800 font-mono">
                        {totalPending}
                      </strong>
                    </div>
                    <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200">
                      <span className="text-[10px] text-rose-700 font-bold block">Ditolak</span>
                      <strong className="text-base font-black text-rose-800 font-mono">
                        {totalDitolak}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB RIWAYAT STORAN */}
            {activeSubTab === 'storan' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>Daftar Storan Akun ({userSubmissions.length})</span>
                </div>
                {userSubmissions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                    User ini belum pernah mengirimkan storan akun.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                        <tr>
                          <th className="px-3.5 py-2.5">Akun Gmail</th>
                          <th className="px-3.5 py-2.5">Container</th>
                          <th className="px-3.5 py-2.5">Waktu</th>
                          <th className="px-3.5 py-2.5">Imbalan</th>
                          <th className="px-3.5 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userSubmissions.map((sub) => {
                          const cleanEmail = getCleanEmail(sub.dataContent);
                          const stor = getSubmissionStor(sub);
                          let badge = 'bg-amber-100 text-amber-800';
                          if (sub.status === 'Cek Admin') badge = 'bg-blue-100 text-blue-800';
                          if (sub.status === 'Diterima') badge = 'bg-emerald-100 text-emerald-800';
                          if (sub.status === 'Ditolak') badge = 'bg-rose-100 text-rose-800';
                          return (
                            <tr key={sub.id} className="hover:bg-slate-50">
                              <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900">
                                {cleanEmail}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  {stor}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-[11px] text-slate-500">
                                {formatIndonesianDateTime(sub.createdAt)}
                              </td>
                              <td className="px-3.5 py-2.5 font-bold text-emerald-600">
                                {formatRupiah(sub.rewardAmount || 3000)}
                              </td>
                              <td className="px-3.5 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${badge}`}>
                                  {sub.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB RIWAYAT PENARIKAN */}
            {activeSubTab === 'payouts' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>Daftar Penarikan E-Wallet ({userWithdrawals.length})</span>
                </div>
                {userWithdrawals.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                    User ini belum pernah mengajukan penarikan saldo.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase">
                        <tr>
                          <th className="px-3.5 py-2.5">Nominal</th>
                          <th className="px-3.5 py-2.5">Metode</th>
                          <th className="px-3.5 py-2.5">Tujuan</th>
                          <th className="px-3.5 py-2.5">Waktu</th>
                          <th className="px-3.5 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {userWithdrawals.map((w) => (
                          <tr key={w.id} className="hover:bg-slate-50">
                            <td className="px-3.5 py-2.5 font-bold font-mono text-emerald-700">
                              {formatRupiah(w.amount)}
                            </td>
                            <td className="px-3.5 py-2.5 font-black text-blue-700">{w.method}</td>
                            <td className="px-3.5 py-2.5 font-mono">
                              <div>{w.targetNumber}</div>
                              <div className="text-[10px] text-slate-400">{w.recipientName}</div>
                            </td>
                            <td className="px-3.5 py-2.5 text-[11px] text-slate-500">
                              {formatIndonesianDateTime(w.createdAt)}
                            </td>
                            <td className="px-3.5 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  w.status === 'Selesai'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : w.status === 'Ditolak'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {w.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Tutup
            </button>
            <div className="flex items-center gap-2">
              {onOpenBalanceModal && (
                <button
                  type="button"
                  onClick={() => onOpenBalanceModal(user, 'add')}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
                >
                  Ubah Saldo
                </button>
              )}
              {onToggleSuspendUser && (
                <button
                  type="button"
                  onClick={() => onToggleSuspendUser(user)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition cursor-pointer active:scale-95 ${
                    isSuspended
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                      : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100'
                  }`}
                >
                  {isSuspended ? 'Buka Suspend Akun' : 'Suspend Akun'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
