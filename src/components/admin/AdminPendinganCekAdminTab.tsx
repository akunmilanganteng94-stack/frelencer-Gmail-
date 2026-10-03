import { useState, useMemo } from 'react';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  RotateCcw,
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

interface AdminPendinganCekAdminTabProps {
  submissions: Submission[];
  onAcceptSubmission: (sub: Submission) => void;
  onRejectSubmission: (sub: Submission) => void;
  onResetToPending?: (sub: Submission) => void;
  onOpenDetailModal: (sub: Submission) => void;
  processingSubId: string | null;
}

export function AdminPendinganCekAdminTab({
  submissions,
  onAcceptSubmission,
  onRejectSubmission,
  onResetToPending,
  onOpenDetailModal,
  processingSubId,
}: AdminPendinganCekAdminTabProps) {
  const { showToast } = useToast();
  const [storFilter, setStorFilter] = useState<'both' | 'STOR 1' | 'STOR 2'>('both');
  const [dateFilter, setDateFilter] = useState<'all' | 'kemarin' | 'hari_ini'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // All submissions currently in 'Cek Admin'
  const allCekAdmin = useMemo(
    () => submissions.filter((s) => s.status === 'Cek Admin'),
    [submissions]
  );

  const stor1CekAdmin = useMemo(
    () => allCekAdmin.filter((s) => getSubmissionStor(s) === 'STOR 1'),
    [allCekAdmin]
  );
  const stor2CekAdmin = useMemo(
    () => allCekAdmin.filter((s) => getSubmissionStor(s) === 'STOR 2'),
    [allCekAdmin]
  );

  const filterList = (list: Submission[]) => {
    return list.filter((sub) => {
      if (dateFilter === 'kemarin' && !isEarlierThanTodayWIB(sub.createdAt)) return false;
      if (dateFilter === 'hari_ini' && !isTodayWIB(sub.createdAt)) return false;
      const q = searchQuery.toLowerCase();
      if (!q) return true;
      const email = getCleanEmail(sub.dataContent).toLowerCase();
      const user = (sub.userName || '').toLowerCase();
      return email.includes(q) || user.includes(q) || sub.id.toLowerCase().includes(q);
    });
  };

  const stor1Filtered = useMemo(() => filterList(stor1CekAdmin), [stor1CekAdmin, dateFilter, searchQuery]);
  const stor2Filtered = useMemo(() => filterList(stor2CekAdmin), [stor2CekAdmin, dateFilter, searchQuery]);

  const handleCopyEmails = (list: Submission[], label: string) => {
    if (list.length === 0) {
      showToast('info', 'Kosong', `Tidak ada akun di ${label} untuk disalin.`);
      return;
    }
    const text = list.map((s) => getCleanEmail(s.dataContent)).join('\n');
    navigator.clipboard.writeText(text);
    showToast('success', 'Disalin', `${list.length} akun Gmail ${label} berhasil disalin.`);
  };

  const renderCekAdminTable = (list: Submission[], storName: 'STOR 1' | 'STOR 2') => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                storName === 'STOR 1' ? 'bg-blue-600' : 'bg-indigo-600'
              }`}
            />
            <h4 className="text-sm font-black text-slate-900">
              Antrean {storName} ({list.length} Akun)
            </h4>
          </div>
          <button
            type="button"
            onClick={() => handleCopyEmails(list, storName)}
            disabled={list.length === 0}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            <Copy className="w-3 h-3" />
            <span>Salin Gmail {storName}</span>
          </button>
        </div>

        {list.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-slate-200/80">
            Tidak ada order yang sedang di proses Cek Admin untuk {storName}.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">ID Order</th>
                  <th className="px-4 py-3">Akun Gmail</th>
                  <th className="px-4 py-3">Pengirim</th>
                  <th className="px-4 py-3">Waktu Masuk</th>
                  <th className="px-4 py-3">Imbalan</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {list.map((sub) => {
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
                      <td className="px-4 py-3 font-bold text-emerald-600">
                        {formatRupiah(sub.rewardAmount || 3000)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-300">
                          Diproses
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenDetailModal(sub)}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition cursor-pointer"
                          >
                            Detail
                          </button>
                          <button
                            type="button"
                            onClick={() => onAcceptSubmission(sub)}
                            disabled={isProcessing}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer disabled:opacity-50"
                          >
                            Terima
                          </button>
                          <button
                            type="button"
                            onClick={() => onRejectSubmission(sub)}
                            disabled={isProcessing}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] border border-rose-200 transition cursor-pointer disabled:opacity-50"
                          >
                            Tolak
                          </button>
                          {onResetToPending && (
                            <button
                              type="button"
                              onClick={() => onResetToPending(sub)}
                              disabled={isProcessing}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                              title="Reset ke Pending"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          )}
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
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Tahap Pemeriksaan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Pendingan All Cek Admin
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Seluruh order yang sedang diperiksa admin. Data terpisah bersih antara STOR 1 dan STOR 2.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 shrink-0">
          <span className="text-xs text-slate-300">Total Sedang Cek:</span>
          <span className="text-2xl font-black text-white font-mono">{allCekAdmin.length}</span>
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
                Semua STOR ({allCekAdmin.length})
              </button>
              <button
                type="button"
                onClick={() => setStorFilter('STOR 1')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  storFilter === 'STOR 1' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                STOR 1 ({stor1CekAdmin.length})
              </button>
              <button
                type="button"
                onClick={() => setStorFilter('STOR 2')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  storFilter === 'STOR 2' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600'
                }`}
              >
                STOR 2 ({stor2CekAdmin.length})
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

      {/* CONTAINER STOR 1 */}
      {(storFilter === 'both' || storFilter === 'STOR 1') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-blue-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                1
              </div>
              <h3 className="text-base font-black text-slate-900">
                CONTAINER STOR 1 &bull; CEK ADMIN
              </h3>
            </div>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {stor1Filtered.length} Order
            </span>
          </div>
          {renderCekAdminTable(stor1Filtered, 'STOR 1')}
        </div>
      )}

      {/* CONTAINER STOR 2 */}
      {(storFilter === 'both' || storFilter === 'STOR 2') && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-indigo-200/90 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs">
                2
              </div>
              <h3 className="text-base font-black text-slate-900">
                CONTAINER STOR 2 &bull; CEK ADMIN
              </h3>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
              {stor2Filtered.length} Order
            </span>
          </div>
          {renderCekAdminTable(stor2Filtered, 'STOR 2')}
        </div>
      )}
    </div>
  );
}
