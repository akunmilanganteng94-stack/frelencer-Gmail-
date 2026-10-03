import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  CheckCircle2,
  Ban,
  Wallet,
  Calendar,
  Eye,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { formatRupiah, formatIndonesianDateTime } from '../../lib/utils';

interface AdminUsersTabProps {
  users: UserProfile[];
  onOpenBalanceModal: (user: UserProfile, mode: 'add' | 'set') => void;
  onToggleSuspendUser: (user: UserProfile) => void;
  onSelectUserDetail: (user: UserProfile) => void;
}

export function AdminUsersTab({
  users,
  onOpenBalanceModal,
  onToggleSuspendUser,
  onSelectUserDetail,
}: AdminUsersTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'has_balance'>('all');

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (statusFilter === 'active' && u.status === 'suspended') return false;
      if (statusFilter === 'suspended' && u.status !== 'suspended') return false;
      if (statusFilter === 'has_balance' && (u.balance || 0) <= 0) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      const name = (u.displayName || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      return name.includes(q) || email.includes(q) || u.uid.toLowerCase().includes(q);
    });
  }, [users, statusFilter, searchQuery]);

  const totalUserBalance = useMemo(
    () => users.reduce((sum, u) => sum + (u.balance || 0), 0),
    [users]
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            <Users className="w-3.5 h-3.5" />
            <span>Manajemen Pengguna</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Kelola Akun Freelancer
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Daftar seluruh akun freelancer yang terdaftar di AZYX19. Klik tombol Detail untuk melihat rincian akun dan riwayat lengkap.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
          <span className="text-xs text-slate-300">Total Saldo Beredar:</span>
          <span className="text-xl font-black text-white font-mono">{formatRupiah(totalUserBalance)}</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Semua ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'active' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Aktif ({users.filter((u) => u.status !== 'suspended').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('has_balance')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'has_balance' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Punya Saldo ({users.filter((u) => (u.balance || 0) > 0).length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('suspended')}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                statusFilter === 'suspended' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Suspended ({users.filter((u) => u.status === 'suspended').length})
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama, email user..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* Tabel Users */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">
            Daftar Pengguna ({filteredUsers.length})
          </h3>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">Tidak ada pengguna yang cocok</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Nama &amp; Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Saldo Aktif</th>
                  <th className="px-4 py-3">Total Penghasilan</th>
                  <th className="px-4 py-3">Tgl Daftar</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredUsers.map((u) => {
                  const isSuspended = u.status === 'suspended';
                  return (
                    <tr key={u.uid} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">{u.displayName || 'Freelancer'}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                            isSuspended
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {isSuspended ? 'Suspended' : 'Aktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-black text-blue-700 text-sm">
                        {formatRupiah(u.balance || 0)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {formatRupiah(u.totalEarned || 0)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                        {formatIndonesianDateTime(u.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectUserDetail(u)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-2xs transition flex items-center gap-1 cursor-pointer"
                            title="Buka Detail Akun User"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Detail Akun</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenBalanceModal(u, 'add')}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] border border-slate-200 transition cursor-pointer"
                          >
                            Ubah Saldo
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleSuspendUser(u)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border transition cursor-pointer ${
                              isSuspended
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {isSuspended ? 'Aktifkan' : 'Suspend'}
                          </button>
                        </div>
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
