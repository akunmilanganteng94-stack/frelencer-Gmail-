import { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Layers,
  Copy,
} from 'lucide-react';
import { Submission } from '../../types';
import {
  formatRupiah,
  formatIndonesianDateTime,
  isTodayWIB,
  isEarlierThanTodayWIB,
} from '../../lib/utils';
import { useToast } from '../../context/ToastContext';
import { getSubmissionStor, getCleanEmail } from './adminUtils';

interface AdminPendinganTabProps {
  submissions: Submission[];
  onCheckSubmission: (sub: Submission) => void;
  onAcceptSubmission: (sub: Submission) => void;
  onRejectSubmission: (sub: Submission) => void;
  onOpenDetailModal: (sub: Submission) => void;
  processingSubId: string | null;
}

export function AdminPendinganTab({
  submissions,
  onCheckSubmission,
  onAcceptSubmission,
  onRejectSubmission,
  onOpenDetailModal,
  processingSubId,
}: AdminPendinganTabProps) {
  const { showToast } = useToast();
  const [storFilter, setStorFilter] = useState<'both' | 'STOR 1' | 'STOR 2'>('both');
  const [dateFilter, setDateFilter] = useState<'all' | 'kemarin' | 'hari_ini'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Only Pending orders
  const pendingSubs = useMemo(
    () => submissions.filter((s) => s.status === 'Pending'),
    [submissions]
  );

  const filteredPending = useMemo(() => {
    return pendingSubs.filter((sub) => {
      const stor = getSubmissionStor(sub);
      if (storFilter !== 'both' && stor !== storFilter) return false;
      if (dateFilter === 'kemarin' && !isEarlierThanTodayWIB(sub.createdAt)) return false;
      if (dateFilter === 'hari_ini' && !isTodayWIB(sub.createdAt)) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      const email = getCleanEmail(sub.dataContent).toLowerCase();
      const user = (sub.userName || '').toLowerCase();
      return email.includes(q) || user.includes(q) || sub.id.toLowerCase().includes(q);
    });
  }, [pendingSubs, storFilter, dateFilter, searchQuery]);

  const handleCopyPendingEmails = () => {
    if (filteredPending.length === 0) {
      showToast('info', 'Kosong', 'Tidak ada akun pending untuk disalin.');
      return;
    }
    const text = filteredPending.map((s) => getCleanEmail(s.dataContent)).join('\n');
    navigator.clipboard.writeText(text);
    showToast('success', 'Disalin', `${filteredPending.length} akun Gmail berhasil disalin.`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
            <Clock className="w-3.5 h-3.5" />
            <span>Antrean Masuk</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Daftar Order Pendingan
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Daftar order akun Gmail yang masih pending dan belum diperiksa admin. Pilih tombol Proses untuk verifikasi.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopyPendingEmails}
            disabled={filteredPending.length === 0}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Copy className="w-4 h-4 text-blue-400" />
            <span>Salin Email ({filteredPending.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter STOR */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setStorFilter('both')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  storFilter === 'both' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                Semua STOR ({pendingSubs.length})
              </button>
              <button
                type="button"
                onClick={() => setStorFilter('STOR 1')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  storFilter === 'STOR 1' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                STOR 1 ({pendingSubs.filter((s) => getSubmissionStor(s) === 'STOR 1').length})
              </button>
              <button
                type="button"
                onClick={() => setStorFilter('STOR 2')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  storFilter === 'STOR 2' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                STOR 2 ({pendingSubs.filter((s) => getSubmissionStor(s) === 'STOR 2').length})
              </button>
            </div>

            {/* Filter Tanggal */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setDateFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  dateFilter === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('kemarin')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  dateFilter === 'kemarin' ? 'bg-amber-500 text-slate-950 font-black shadow-2xs' : 'text-slate-500'
                }`}
              >
                Kemarin
              </button>
              <button
                type="button"
                onClick={() => setDateFilter('hari_ini')}
                className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                  dateFilter === 'hari_ini' ? 'bg-blue-600 text-white font-black shadow-2xs' : 'text-slate-500'
                }`}
              >
                Hari Ini
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari ID order, akun Gmail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="text-base font-black text-slate-900">
            Daftar Order Belum Diperiksa ({filteredPending.length})
          </h3>
          <span className="text-xs text-slate-500 font-bold">
            Klik tombol "Proses" untuk mulai Cek Admin atau "Detail" untuk riwayat
          </span>
        </div>

        {filteredPending.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            <Clock className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="font-bold text-slate-700">Tidak ada order pending</p>
            <p className="text-slate-500 mt-0.5">Semua antrean storan sudah diperiksa admin.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">ID Order</th>
                  <th className="px-4 py-3">STOR</th>
                  <th className="px-4 py-3">Akun Gmail Disetor</th>
                  <th className="px-4 py-3">Pengirim / Freelancer</th>
                  <th className="px-4 py-3">Waktu Masuk</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPending.map((sub) => {
                  const stor = getSubmissionStor(sub);
                  const cleanEmail = getCleanEmail(sub.dataContent);
                  const isProcessing = processingSubId === sub.id;
                  const isKemarin = isEarlierThanTodayWIB(sub.createdAt);

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-slate-50/70 transition ${
                        isKemarin ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono font-bold text-slate-500">
                        #{sub.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 font-bold">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                            stor === 'STOR 1'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
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
                      <td className="px-4 py-3 text-slate-500 text-[11px] font-mono">
                        <div>{formatIndonesianDateTime(sub.createdAt)}</div>
                        {isKemarin && (
                          <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                            Kemarin
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                          Pending
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenDetailModal(sub)}
                            className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => onCheckSubmission(sub)}
                            disabled={isProcessing}
                            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Proses</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onAcceptSubmission(sub)}
                            disabled={isProcessing}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] border border-emerald-200 transition cursor-pointer disabled:opacity-50"
                          >
                            Terima
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectSubmission(sub)}
                            disabled={isProcessing}
                            className="px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition cursor-pointer disabled:opacity-50"
                          >
                            Tolak
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
