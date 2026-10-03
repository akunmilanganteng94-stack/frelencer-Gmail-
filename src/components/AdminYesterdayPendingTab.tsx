import { useState, useMemo } from 'react';
import { Submission } from '../types';
import {
  formatRupiah,
  formatIndonesianDateTime,
  isEarlierThanTodayWIB,
} from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { getSubmissionPassword } from './AdminAllStorTab';
import {
  Copy,
  Check,
  Search,
  ListCheck,
  ListX,
  History,
  CheckCircle2,
  Eye,
  ClipboardCheck,
} from 'lucide-react';

interface AdminYesterdayPendingTabProps {
  submissions: Submission[];
  defaultPassword?: string;
  onOpenBulkCheckModal?: () => void;
  onOpenBulkConfirmModal: () => void;
  onOpenBulkRejectModal: () => void;
  onAcceptSubmission: (sub: Submission) => void;
  onCheckSubmission?: (sub: Submission) => void;
  onRejectSubmission: (sub: Submission) => void;
  processingSubId: string | null;
}

export function AdminYesterdayPendingTab({
  submissions,
  onOpenBulkCheckModal,
  onOpenBulkConfirmModal,
  onOpenBulkRejectModal,
  onAcceptSubmission,
  onCheckSubmission,
  onRejectSubmission,
  processingSubId,
}: AdminYesterdayPendingTabProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getCleanEmail = (content: string) => {
    if (!content) return '';
    return content.split('|')[0].trim();
  };

  const yesterdayPendingList = useMemo(() => {
    return submissions.filter(
      (s) =>
        (s.status === 'Pending' || s.status === 'Cek Admin') &&
        isEarlierThanTodayWIB(s.createdAt)
    );
  }, [submissions]);

  const filteredList = useMemo(() => {
    return yesterdayPendingList.filter((sub) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const email = getCleanEmail(sub.dataContent).toLowerCase();
      const userName = (sub.userName || '').toLowerCase();
      const userEmail = (sub.userEmail || '').toLowerCase();
      return (
        email.includes(q) ||
        userName.includes(q) ||
        userEmail.includes(q) ||
        sub.id.toLowerCase().includes(q)
      );
    });
  }, [yesterdayPendingList, searchQuery]);

  const totalReward = useMemo(() => {
    return yesterdayPendingList.reduce((sum, s) => sum + (s.rewardAmount || 3000), 0);
  }, [yesterdayPendingList]);

  const handleCopyList = (list: Submission[], label: string, modeKey: string) => {
    if (list.length === 0) {
      showToast('warning', 'Kosong', `Tidak ada antrean ${label} untuk disalin.`);
      return;
    }
    const emailsText = list
      .map((s) => getCleanEmail(s.dataContent))
      .filter(Boolean)
      .join('\n');
    navigator.clipboard.writeText(emailsText);
    setCopiedStatus(modeKey);
    setTimeout(() => setCopiedStatus(null), 2500);
    showToast(
      'success',
      `${label} Disalin`,
      `${list.length} akun Gmail berhasil disalin (1 baris 1 akun).`
    );
  };

  const handleCopySelected = () => {
    const selectedSubs = yesterdayPendingList.filter((s) => selectedIds.has(s.id));
    if (selectedSubs.length === 0) {
      showToast('warning', 'Belum Ada yang Dipilih', 'Pilih minimal 1 akun terlebih dahulu.');
      return;
    }
    handleCopyList(selectedSubs, 'Pilihan Terpilih', 'selected');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map((s) => s.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-amber-950 via-amber-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-amber-200 border border-white/20">
            <History className="w-3.5 h-3.5 text-amber-400" />
            <span>Dedicated Tab: Antrean Kemarin &amp; Sebelumnya</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>Pendingan Kemarin</span>
            <span className="px-3 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-sm">
              {yesterdayPendingList.length} Akun
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-amber-100 max-w-xl leading-relaxed">
            Prioritas penanganan akun yang disetor kemarin. Pilihan password: <strong>zero1122</strong> atau <strong>prabujaya</strong>.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-stretch sm:items-center gap-2.5 shrink-0">
          {onOpenBulkCheckModal && (
            <button
              type="button"
              onClick={onOpenBulkCheckModal}
              className="px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Cek Bulk</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenBulkConfirmModal}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ListCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Terima Bulk</span>
          </button>

          <button
            type="button"
            onClick={onOpenBulkRejectModal}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ListX className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Tolak Bulk</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-50/90 rounded-3xl p-5 border border-amber-200 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
              <History className="w-4 h-4 text-amber-600" />
              <span>Total Antrean Kemarin</span>
            </span>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-950 font-mono">
              {yesterdayPendingList.length}{' '}
              <span className="text-xs font-medium text-amber-700 font-sans">Total Akun</span>
            </div>
            <div className="text-xs font-bold text-amber-900 mt-1">
              Total Kewajiban: {formatRupiah(totalReward)}
            </div>
          </div>
          <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => handleCopyList(yesterdayPendingList, 'Semua Akun Kemarin', 'all')}
              disabled={yesterdayPendingList.length === 0}
              className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              {copiedStatus === 'all' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Salin Semua Kemarin ({yesterdayPendingList.length})</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.size > 0 && (
              <button
                type="button"
                onClick={handleCopySelected}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Pilihan ({selectedIds.size})</span>
              </button>
            )}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Cari email / user kemarin..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2 text-xs font-medium rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredList.length > 0 && selectedIds.size === filteredList.length}
                    onChange={toggleSelectAll}
                    className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">No</th>
                <th className="py-3 px-4">Alamat Gmail Disetor</th>
                <th className="py-3 px-4">Password</th>
                <th className="py-3 px-4">Pengirim / Freelancer</th>
                <th className="py-3 px-4">Waktu Setor</th>
                <th className="py-3 px-4">Reward</th>
                <th className="py-3 px-4 text-right">Aksi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                    <p className="font-bold text-slate-700 text-sm">
                      {searchQuery
                        ? 'Tidak ada data pending kemarin yang sesuai pencarian.'
                        : 'Tidak ada antrean pendingan kemarin!'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredList.map((sub, idx) => {
                  const cleanEmail = getCleanEmail(sub.dataContent);
                  const isSelected = selectedIds.has(sub.id);
                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-amber-50/40 transition ${
                        isSelected ? 'bg-amber-50/60' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(sub.id)}
                          className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-400">
                        #{idx + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm select-all">
                            {cleanEmail}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cleanEmail);
                              showToast('info', 'Disalin', cleanEmail);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-600 transition cursor-pointer"
                            title="Salin Email"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                            getSubmissionPassword(sub) === 'prabujaya'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {getSubmissionPassword(sub)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{sub.userName || 'Freelancer'}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{sub.userEmail}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-semibold text-amber-800">
                          {formatIndonesianDateTime(sub.createdAt)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-black text-indigo-700">
                          {formatRupiah(sub.rewardAmount || 3000)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {(sub.status === 'Diterima' || sub.status === 'Ditolak') ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                            Riwayat {sub.status}
                          </span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {onCheckSubmission && sub.status !== 'Cek Admin' && (
                              <button
                                type="button"
                                onClick={() => onCheckSubmission(sub)}
                                disabled={processingSubId === sub.id}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition cursor-pointer flex items-center gap-1"
                                title="Tandai akun sedang dicek"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Cek</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onRejectSubmission(sub)}
                              disabled={processingSubId === sub.id}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition cursor-pointer disabled:opacity-50"
                            >
                              Tolak
                            </button>
                            <button
                              type="button"
                              onClick={() => onAcceptSubmission(sub)}
                              disabled={processingSubId === sub.id}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Terima</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
