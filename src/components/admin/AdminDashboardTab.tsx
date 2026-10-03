import { useMemo } from 'react';
import {
  Layers,
  Clock,
  Eye,
  CheckCircle2,
  Users,
  Wallet,
  ArrowRight,
  TrendingUp,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Submission, Withdrawal, UserProfile, SystemSettings } from '../../types';
import { formatRupiah, formatIndonesianDateTime } from '../../lib/utils';
import { getSubmissionStor, getCleanEmail } from './adminUtils';

interface AdminDashboardTabProps {
  submissions: Submission[];
  withdrawals: Withdrawal[];
  users: UserProfile[];
  settings: SystemSettings;
  onNavigateToTab: (tab: 'users' | 'batch' | 'cek_admin' | 'pendingan' | 'generator_stock' | 'pengaturan') => void;
  onOpenDetailModal: (sub: Submission) => void;
}

export function AdminDashboardTab({
  submissions,
  withdrawals,
  users,
  settings,
  onNavigateToTab,
  onOpenDetailModal,
}: AdminDashboardTabProps) {
  // Statistics
  const totalSubmissions = submissions.length;
  const pendingSubs = useMemo(() => submissions.filter((s) => s.status === 'Pending'), [submissions]);
  const cekAdminSubs = useMemo(() => submissions.filter((s) => s.status === 'Cek Admin'), [submissions]);
  const acceptedSubs = useMemo(() => submissions.filter((s) => s.status === 'Diterima'), [submissions]);

  const stor1Subs = useMemo(
    () => submissions.filter((s) => getSubmissionStor(s) === 'STOR 1'),
    [submissions]
  );
  const stor2Subs = useMemo(
    () => submissions.filter((s) => getSubmissionStor(s) === 'STOR 2'),
    [submissions]
  );

  const pendingWithdrawals = useMemo(
    () => withdrawals.filter((w) => w.status === 'Pending'),
    [withdrawals]
  );

  const recentSubmissions = useMemo(() => submissions.slice(0, 10), [submissions]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Admin Console AZYX19</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white">
            Selamat Datang di Panel Admin
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Kelola transaksi storan akun Gmail freelancer, antrean Cek Admin, pembayaran saldo, stok generator, dan pengaturan STOR.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateToTab('pendingan')}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition flex items-center gap-2 shadow-lg shadow-blue-600/30 cursor-pointer active:scale-95"
          >
            <Clock className="w-4 h-4" />
            <span>Lihat Pendingan ({pendingSubs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateToTab('generator_stock')}
            className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-purple-600/25 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>Stok Generator</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Total Storan</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {totalSubmissions}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{acceptedSubs.length} Akun Dikonfirmasi</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Pendingan Masuk</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 font-mono tracking-tight">
            {pendingSubs.length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Perlu diperiksa admin
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Diproses (Cek Admin)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-700 font-mono tracking-tight">
            {cekAdminSubs.length}
          </div>
          <div className="text-[11px] text-blue-600 font-bold">
            Tahap verifikasi aktif
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">User Terdaftar</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {users.length}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Freelancer terverifikasi
          </div>
        </div>
      </div>

      {/* Container STOR 1 & STOR 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Container STOR 1 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                1
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Container STOR 1</h3>
                <span className="text-[11px] text-slate-400">Kode Akses: {settings.storanPassword1 || 'zero1122'}</span>
              </div>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                settings.storanOpen !== false
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              {settings.storanOpen !== false ? 'STATUS BUKA' : 'STATUS TUTUP'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block">Total</span>
              <span className="font-mono font-black text-slate-900 text-base">{stor1Subs.length}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
              <span className="text-[10px] text-amber-700 font-bold block">Pending</span>
              <span className="font-mono font-black text-amber-800 text-base">
                {stor1Subs.filter((s) => s.status === 'Pending').length}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100">
              <span className="text-[10px] text-blue-700 font-bold block">Diproses</span>
              <span className="font-mono font-black text-blue-800 text-base">
                {stor1Subs.filter((s) => s.status === 'Cek Admin').length}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-bold block">Selesai</span>
              <span className="font-mono font-black text-emerald-800 text-base">
                {stor1Subs.filter((s) => s.status === 'Diterima').length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('batch')}
            className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Buka Antrean STOR 1</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Container STOR 2 */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                2
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Container STOR 2</h3>
                <span className="text-[11px] text-slate-400">Kode Akses: {settings.storanPassword2 || 'prabujaya'}</span>
              </div>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                settings.storanOpen !== false
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}
            >
              {settings.storanOpen !== false ? 'STATUS BUKA' : 'STATUS TUTUP'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold block">Total</span>
              <span className="font-mono font-black text-slate-900 text-base">{stor2Subs.length}</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
              <span className="text-[10px] text-amber-700 font-bold block">Pending</span>
              <span className="font-mono font-black text-amber-800 text-base">
                {stor2Subs.filter((s) => s.status === 'Pending').length}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100">
              <span className="text-[10px] text-blue-700 font-bold block">Diproses</span>
              <span className="font-mono font-black text-blue-800 text-base">
                {stor2Subs.filter((s) => s.status === 'Cek Admin').length}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-bold block">Selesai</span>
              <span className="font-mono font-black text-emerald-800 text-base">
                {stor2Subs.filter((s) => s.status === 'Diterima').length}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateToTab('batch')}
            className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Buka Antrean STOR 2</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabel Aktivitas Order Terbaru */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900">Aktivitas Order Terbaru</h3>
            <p className="text-xs text-slate-500">10 antrean akun Gmail terakhir yang disetor freelancer</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('batch')}
            className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentSubmissions.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-xs">
            <Mail className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p>Belum ada order storan</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">ID Order</th>
                  <th className="px-4 py-3">STOR</th>
                  <th className="px-4 py-3">Akun Gmail</th>
                  <th className="px-4 py-3">Pengirim</th>
                  <th className="px-4 py-3">Waktu Masuk</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSubmissions.map((sub) => {
                  const stor = getSubmissionStor(sub);
                  const cleanEmail = getCleanEmail(sub.dataContent);
                  let badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
                  if (sub.status === 'Cek Admin') badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
                  if (sub.status === 'Diterima') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                  if (sub.status === 'Ditolak') badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">
                        #{sub.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            stor === 'STOR 1' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}
                        >
                          {stor}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {cleanEmail}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {sub.userName || 'Freelancer'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {formatIndonesianDateTime(sub.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badgeColor}`}>
                          {sub.status === 'Cek Admin' ? 'Diproses' : sub.status === 'Diterima' ? 'Dikonfirmasi' : sub.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onOpenDetailModal(sub)}
                          className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition cursor-pointer"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
