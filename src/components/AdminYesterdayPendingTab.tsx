import { useState, useMemo } from 'react';
import { Submission } from '../types';
import {
  formatRupiah,
  formatIndonesianDateTime,
  isEarlierThanTodayWIB,
} from '../lib/utils';
import { useToast } from '../context/ToastContext';
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
  KeyRound,
  Users,
  ChevronDown,
  ChevronUp,
  Table,
} from 'lucide-react';

interface AdminYesterdayPendingTabProps {
  submissions: Submission[];
  defaultPassword?: string;
  password1Name?: string;
  password2Name?: string;
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
  defaultPassword = 'zero1122',
  password1Name = 'zero1122',
  password2Name = 'prabujaya',
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
  const [passwordFilter, setPasswordFilter] = useState<string>('All');
  const [copiedStatus, setCopiedStatus] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'grouped_user' | 'flat_table'>('flat_table');
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set());

  const getCleanEmail = (content: string) => {
    if (!content) return '';
    return content.split('|')[0].trim();
  };

  const getSubPassword = (sub: Submission) => {
    if (sub.passwordUsed) return sub.passwordUsed;
    if (sub.adminNotes && sub.adminNotes.includes('PW:')) {
      const match = sub.adminNotes.match(/PW:\s*([^\s,]+)/i);
      if (match && match[1]) return match[1];
    }
    const parts = sub.dataContent.split('|');
    if (parts[1] && parts[1].trim()) return parts[1].trim();
    return defaultPassword;
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
      if (passwordFilter !== 'All') {
        const pw = getSubPassword(sub);
        if (pw !== passwordFilter) return false;
      }
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
  }, [yesterdayPendingList, passwordFilter, searchQuery]);

  const countPw1 = useMemo(
    () => yesterdayPendingList.filter((s) => getSubPassword(s) === password1Name).length,
    [yesterdayPendingList, password1Name]
  );

  const countPw2 = useMemo(
    () => yesterdayPendingList.filter((s) => getSubPassword(s) === password2Name).length,
    [yesterdayPendingList, password2Name]
  );

  const userGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        userName: string;
        userEmail: string;
        items: Submission[];
        totalReward: number;
      }
    >();

    for (const sub of filteredList) {
      const uid = sub.userId || 'unknown';
      if (!map.has(uid)) {
        map.set(uid, {
          userId: uid,
          userName: sub.userName || 'Freelancer',
          userEmail: sub.userEmail || '',
          items: [],
          totalReward: 0,
        });
      }
      const g = map.get(uid)!;
      g.items.push(sub);
      g.totalReward += sub.rewardAmount || 3000;
    }

    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [filteredList]);

  const toggleUserExpand = (uid: string) => {
    const next = new Set(expandedUserIds);
    if (next.has(uid)) {
      next.delete(uid);
    } else {
      next.add(uid);
    }
    setExpandedUserIds(next);
  };

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
            Prioritas penanganan akun yang disetor kemarin. Terpisah rapi per user.
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

      {/* CONTROLS */}
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
            <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grouped_user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grouped_user'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Pisah per User ({userGroups.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat_table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'flat_table'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
            </div>
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

        {/* PILIH PASSWORD & SALIN SEMUA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-black text-slate-700 mr-1 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Pilih Password:</span>
            </span>
            <button
              type="button"
              onClick={() => setPasswordFilter('All')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                passwordFilter === 'All'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua PW ({yesterdayPendingList.length})
            </button>
            <button
              type="button"
              onClick={() => setPasswordFilter(password1Name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                passwordFilter === password1Name
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              {password1Name} ({countPw1})
            </button>
            <button
              type="button"
              onClick={() => setPasswordFilter(password2Name)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition cursor-pointer ${
                passwordFilter === password2Name
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-indigo-50 text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
              }`}
            >
              {password2Name} ({countPw2})
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (filteredList.length === 0) {
                  showToast('warning', 'Kosong', 'Tidak ada akun untuk disalin.');
                  return;
                }
                const text = filteredList.map((s) => getCleanEmail(s.dataContent)).join('\n');
                navigator.clipboard.writeText(text);
                showToast('success', 'Semua Disalin', `${filteredList.length} akun disalin.`);
              }}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md shadow-amber-500/25 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Semua ({filteredList.length} Gmail)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (filteredList.length === 0) {
                  showToast('warning', 'Kosong', 'Tidak ada akun untuk disalin.');
                  return;
                }
                const text = filteredList
                  .map((s) => `${getCleanEmail(s.dataContent)}|${getSubPassword(s)}`)
                  .join('\n');
                navigator.clipboard.writeText(text);
                showToast('success', 'Disalin Format PW', `${filteredList.length} akun & PW disalin.`);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Salin + PW</span>
            </button>
          </div>
        </div>

        {/* PISAH PER USER */}
        {viewMode === 'grouped_user' && (
          <div className="space-y-4">
            {userGroups.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400 mb-2" />
                <p className="font-bold text-slate-700 text-sm">
                  {searchQuery
                    ? 'Tidak ada data pending kemarin yang sesuai pencarian.'
                    : 'Tidak ada antrean pendingan kemarin!'}
                </p>
              </div>
            ) : (
              userGroups.map((group, groupIdx) => {
                const isExpanded = !expandedUserIds.has(group.userId);
                return (
                  <div
                    key={group.userId}
                    className="bg-white rounded-2xl border border-amber-200/80 shadow-2xs overflow-hidden"
                  >
                    <div className="p-3.5 sm:p-4 bg-amber-50/50 border-b border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                          {groupIdx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-900">{group.userName}</span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                              {group.items.length} Akun Kemarin
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono">{group.userEmail}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => {
                            const emails = group.items.map((i) => getCleanEmail(i.dataContent)).join('\n');
                            navigator.clipboard.writeText(emails);
                            showToast('info', 'Disalin', `${group.items.length} akun disalin.`);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100/60 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition cursor-pointer"
                        >
                          Salin
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleUserExpand(group.userId)}
                          className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {group.items.map((sub, itemIdx) => {
                          const cleanEmail = getCleanEmail(sub.dataContent);
                          const pw = getSubPassword(sub);
                          return (
                            <div
                              key={sub.id}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-mono text-slate-400 text-[10px] w-5">
                                  #{itemIdx + 1}
                                </span>
                                <span className="font-mono font-bold text-slate-900 select-all truncate">
                                  {cleanEmail}
                                </span>
                                <span className="px-2 py-0.2 rounded bg-amber-100 text-amber-900 font-mono font-bold text-[10px]">
                                  PW: {pw}
                                </span>
                              </div>
                              <div className="flex items-center justify-end gap-1.5 self-end sm:self-center">
                                {onCheckSubmission && sub.status !== 'Cek Admin' && (
                                  <button
                                    type="button"
                                    onClick={() => onCheckSubmission(sub)}
                                    disabled={processingSubId === sub.id}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition cursor-pointer"
                                  >
                                    Cek
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onRejectSubmission(sub)}
                                  disabled={processingSubId === sub.id}
                                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition cursor-pointer"
                                >
                                  Tolak
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onAcceptSubmission(sub)}
                                  disabled={processingSubId === sub.id}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-2xs transition flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Terima</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TABEL LENGKAP */}
        {viewMode === 'flat_table' && (
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
                    const pw = getSubPassword(sub);

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
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-100 text-amber-900 border border-amber-200">
                            {pw}
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
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
