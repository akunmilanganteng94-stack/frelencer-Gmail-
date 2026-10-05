import { useState, useMemo } from 'react';
import { Submission } from '../types';
import {
  formatRupiah,
  formatIndonesianDateTime,
  isTodayWIB,
  isEarlierThanTodayWIB,
} from '../lib/utils';
import { useToast } from '../context/ToastContext';
import {
  Mail,
  Copy,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  KeyRound,
  ListCheck,
  ListX,
  Layers,
  Eye,
  ClipboardCheck,
  Check,
  Users,
  ChevronDown,
  ChevronUp,
  Table,
} from 'lucide-react';

interface AdminAllStorTabProps {
  submissions: Submission[];
  defaultPassword?: string;
  password1Name?: string;
  password2Name?: string;
  onOpenBulkCheckModal?: () => void;
  onOpenBulkConfirmModal: () => void;
  onOpenBulkRejectModal?: () => void;
  onAcceptSubmission: (sub: Submission) => void;
  onCheckSubmission?: (sub: Submission) => void;
  onRejectSubmission: (sub: Submission) => void;
  processingSubId: string | null;
  onNavigateToYesterdayPending?: () => void;
}

type FilterStatusType =
  | 'All'
  | 'Pending_Kemarin'
  | 'Pending_Sekarang'
  | 'Pending'
  | 'Cek_Admin'
  | 'Diterima'
  | 'Ditolak';

export function AdminAllStorTab({
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
}: AdminAllStorTabProps) {
  const { showToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<FilterStatusType>('All');
  const [passwordFilter, setPasswordFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
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

  const pendingYesterdayList = useMemo(
    () =>
      submissions.filter(
        (s) => (s.status === 'Pending' || s.status === 'Cek Admin') && isEarlierThanTodayWIB(s.createdAt)
      ),
    [submissions]
  );

  const pendingTodayList = useMemo(
    () =>
      submissions.filter(
        (s) => (s.status === 'Pending' || s.status === 'Cek Admin') && isTodayWIB(s.createdAt)
      ),
    [submissions]
  );

  const pendingList = useMemo(
    () => submissions.filter((s) => s.status === 'Pending'),
    [submissions]
  );

  const cekAdminList = useMemo(
    () => submissions.filter((s) => s.status === 'Cek Admin'),
    [submissions]
  );

  const acceptedList = useMemo(
    () => submissions.filter((s) => s.status === 'Diterima'),
    [submissions]
  );

  const rejectedList = useMemo(
    () => submissions.filter((s) => s.status === 'Ditolak'),
    [submissions]
  );

  const filteredList = useMemo(() => {
    return submissions.filter((sub) => {
      let matchesStatus = true;
      if (filterStatus === 'Pending_Kemarin') {
        matchesStatus =
          (sub.status === 'Pending' || sub.status === 'Cek Admin') &&
          isEarlierThanTodayWIB(sub.createdAt);
      } else if (filterStatus === 'Pending_Sekarang') {
        matchesStatus =
          (sub.status === 'Pending' || sub.status === 'Cek Admin') && isTodayWIB(sub.createdAt);
      } else if (filterStatus === 'Cek_Admin') {
        matchesStatus = sub.status === 'Cek Admin';
      } else if (filterStatus !== 'All') {
        matchesStatus = sub.status === filterStatus;
      }

      if (!matchesStatus) return false;

      if (passwordFilter !== 'All') {
        const pw = getSubPassword(sub);
        if (pw !== passwordFilter) return false;
      }

      const cleanEmail = getCleanEmail(sub.dataContent).toLowerCase();
      const q = searchQuery.toLowerCase();
      return (
        cleanEmail.includes(q) ||
        (sub.userName && sub.userName.toLowerCase().includes(q)) ||
        (sub.userEmail && sub.userEmail.toLowerCase().includes(q)) ||
        (sub.passwordUsed && sub.passwordUsed.toLowerCase().includes(q)) ||
        sub.id.toLowerCase().includes(q)
      );
    });
  }, [submissions, filterStatus, passwordFilter, searchQuery]);

  const countPw1 = useMemo(
    () => submissions.filter((s) => getSubPassword(s) === password1Name).length,
    [submissions, password1Name]
  );

  const countPw2 = useMemo(
    () => submissions.filter((s) => getSubPassword(s) === password2Name).length,
    [submissions, password2Name]
  );

  // Group filtered submissions by User
  const userGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        userId: string;
        userName: string;
        userEmail: string;
        items: Submission[];
        pendingCount: number;
        acceptedCount: number;
        rejectedCount: number;
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
          pendingCount: 0,
          acceptedCount: 0,
          rejectedCount: 0,
          totalReward: 0,
        });
      }
      const g = map.get(uid)!;
      g.items.push(sub);
      if (sub.status === 'Pending' || sub.status === 'Cek Admin') g.pendingCount++;
      if (sub.status === 'Diterima') g.acceptedCount++;
      if (sub.status === 'Ditolak') g.rejectedCount++;
      g.totalReward += sub.rewardAmount || 3000;
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount;
      return b.items.length - a.items.length;
    });
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

  const handleCopyUserEmails = (userItems: Submission[], userName: string) => {
    if (userItems.length === 0) return;
    const textToCopy = userItems.map((s) => getCleanEmail(s.dataContent)).join('\n');
    navigator.clipboard.writeText(textToCopy);
    showToast(
      'success',
      'Akun User Disalin',
      `${userItems.length} akun dari user ${userName} disalin (1 baris 1 akun).`
    );
  };

  const handleCopyAllFiltered = () => {
    if (filteredList.length === 0) {
      showToast('warning', 'Kosong', 'Tidak ada akun Gmail untuk disalin pada filter ini.');
      return;
    }
    const textToCopy = filteredList.map((s) => getCleanEmail(s.dataContent)).join('\n');
    navigator.clipboard.writeText(textToCopy);
    showToast(
      'success',
      'Semua Disalin',
      `${filteredList.length} akun Gmail berhasil disalin (1 baris 1 email).`
    );
  };

  const handleCopyAllWithPassword = () => {
    if (filteredList.length === 0) {
      showToast('warning', 'Kosong', 'Tidak ada akun Gmail untuk disalin pada filter ini.');
      return;
    }
    const textToCopy = filteredList
      .map((s) => `${getCleanEmail(s.dataContent)}|${getSubPassword(s)}`)
      .join('\n');
    navigator.clipboard.writeText(textToCopy);
    showToast(
      'success',
      'Semua Disalin (Format PW)',
      `${filteredList.length} akun Gmail & password berhasil disalin.`
    );
  };

  const handleAcceptAllPendingUser = async (userItems: Submission[], userName: string) => {
    const pendingItems = userItems.filter((s) => s.status === 'Pending' || s.status === 'Cek Admin');
    if (pendingItems.length === 0) {
      showToast('info', 'Tidak Ada Pending', `Tidak ada antrean pending untuk ${userName}.`);
      return;
    }
    for (const item of pendingItems) {
      await onAcceptSubmission(item);
    }
    const totalReward = pendingItems.reduce((acc, curr) => acc + (curr.rewardAmount || 3000), 0);
    showToast(
      'success',
      'Semua Diterima',
      `Total: ${pendingItems.length} akun pending user ${userName} berhasil diterima! (Total Saldo: ${formatRupiah(totalReward)})`
    );
  };

  return (
    <div className="space-y-5">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-blue-200 border border-white/20">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Manajemen Storan Terorganisir</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Semua Gmail STOR-an User
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Data storan terpisah rapi per user. Pilihan password: <strong className="text-amber-300">{password1Name}</strong> atau <strong className="text-amber-300">{password2Name}</strong>.
          </p>
        </div>
        <div className="relative z-10 flex flex-wrap items-stretch sm:items-center gap-2.5 shrink-0">
          {onOpenBulkCheckModal && (
            <button
              type="button"
              onClick={onOpenBulkCheckModal}
              className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Cek Bulk</span>
            </button>
          )}
          <button
            type="button"
            onClick={onOpenBulkConfirmModal}
            className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ListCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Terima Bulk</span>
          </button>
          {onOpenBulkRejectModal && (
            <button
              type="button"
              onClick={onOpenBulkRejectModal}
              className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ListX className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Tolak Bulk</span>
            </button>
          )}
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-3xl p-4 border border-blue-200 shadow-2xs bg-blue-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Pending
            </span>
            <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              Antrean
            </span>
          </div>
          <div className="text-2xl font-black text-blue-900 mt-1">{pendingList.length}</div>
          <div className="text-[11px] text-blue-700 mt-0.5 font-medium">
            {pendingYesterdayList.length} kemarin &bull; {pendingTodayList.length} hari ini
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-indigo-200 shadow-2xs bg-indigo-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Cek Admin
            </span>
            <span className="text-[10px] font-black bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
              Proses Cek
            </span>
          </div>
          <div className="text-2xl font-black text-indigo-800 mt-1">{cekAdminList.length}</div>
          <div className="text-[11px] text-indigo-600 mt-0.5 font-medium">Sedang diperiksa admin</div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-emerald-200 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Diterima
            </span>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Sukses
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-800 mt-1">{acceptedList.length}</div>
          <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">Saldo otomatis masuk</div>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-rose-200 shadow-2xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> Ditolak
            </span>
            <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full">
              Gagal
            </span>
          </div>
          <div className="text-2xl font-black text-rose-800 mt-1">{rejectedList.length}</div>
          <div className="text-[11px] text-rose-700 mt-0.5 font-medium">Tidak memenuhi syarat</div>
        </div>
      </div>

      {/* FILTER & PENGATURAN TAMPILAN */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'All', label: `Semua (${submissions.length})` },
              {
                id: 'Pending_Kemarin',
                label: `Pending Kemarin (${pendingYesterdayList.length})`,
                highlight: pendingYesterdayList.length > 0 ? 'amber' : undefined,
              },
              {
                id: 'Pending_Sekarang',
                label: `Pending Hari Ini (${pendingTodayList.length})`,
                highlight: pendingTodayList.length > 0 ? 'blue' : undefined,
              },
              { id: 'Pending', label: `Pending (${pendingList.length})` },
              { id: 'Cek_Admin', label: `Cek Admin (${cekAdminList.length})` },
              { id: 'Diterima', label: `Diterima (${acceptedList.length})` },
              { id: 'Ditolak', label: `Ditolak (${rejectedList.length})` },
            ].map((tab) => {
              const isCurrent = filterStatus === tab.id;
              let activeClass = 'bg-white text-indigo-700 shadow-2xs font-bold';
              if (isCurrent) {
                if (tab.highlight === 'amber') {
                  activeClass = 'bg-amber-600 text-white shadow-2xs font-bold';
                } else if (tab.highlight === 'blue') {
                  activeClass = 'bg-blue-600 text-white shadow-2xs font-bold';
                }
              }
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id as FilterStatusType)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    isCurrent
                      ? activeClass
                      : tab.highlight === 'amber'
                      ? 'text-amber-700 hover:bg-amber-100/60 font-semibold'
                      : tab.highlight === 'blue'
                      ? 'text-blue-700 hover:bg-blue-100/60 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search & Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari email, user, pw..."
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs outline-none bg-white"
              />
            </div>
            <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('grouped_user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'grouped_user'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan dipisahkan per user"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Pisah per User ({userGroups.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat_table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'flat_table'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Tampilkan daftar tabel biasa"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>
            </div>
          </div>
        </div>

        {/* BARIS PILIH PASSWORD & TOMBOL SALIN */}
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
              Semua PW ({submissions.length})
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
              onClick={handleCopyAllFiltered}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-500/25 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Salin semua akun Gmail yang tampil (1 baris 1 email)"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Salin Semua ({filteredList.length} Gmail)</span>
            </button>
            <button
              type="button"
              onClick={handleCopyAllWithPassword}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title="Salin format email|password"
            >
              <span>Salin + PW</span>
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: PISAH PER USER */}
      {viewMode === 'grouped_user' && (
        <div className="space-y-4">
          {userGroups.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-xs space-y-2 border border-slate-200/80">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700 text-sm">Tidak ada data storan user</p>
              <p className="text-slate-500">
                {searchQuery
                  ? `Tidak ditemukan akun yang cocok dengan kata kunci "${searchQuery}".`
                  : 'Belum ada antrean storan dalam kategori filter ini.'}
              </p>
            </div>
          ) : (
            userGroups.map((group, groupIdx) => {
              const isExpanded = !expandedUserIds.has(group.userId);
              return (
                <div
                  key={group.userId}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden transition-all duration-200 hover:border-blue-200"
                >
                  {/* USER HEADER CARD */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-blue-50/30 to-slate-50 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                        {groupIdx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-sm sm:text-base text-slate-900 truncate">
                            {group.userName}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-900 border border-blue-200">
                            {group.items.length} Akun Disetor
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono truncate">{group.userEmail}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold">
                        {group.pendingCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                            {group.pendingCount} Pending
                          </span>
                        )}
                        {group.acceptedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {group.acceptedCount} Diterima
                          </span>
                        )}
                        {group.rejectedCount > 0 && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-800 border border-rose-300">
                            {group.rejectedCount} Ditolak
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 rounded-lg bg-white border border-slate-200 text-blue-700 font-black shadow-2xs">
                          {formatRupiah(group.totalReward)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyUserEmails(group.items, group.userName)}
                          className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition flex items-center gap-1 cursor-pointer"
                          title="Salin semua akun milik user ini (1 baris 1 email)"
                        >
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Salin Akun</span>
                        </button>
                        {group.pendingCount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleAcceptAllPendingUser(group.items, group.userName)}
                            className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition flex items-center gap-1 cursor-pointer active:scale-95"
                            title="Terima semua akun berstatus pending dari user ini"
                          >
                            <Check className="w-3 h-3" />
                            <span>Terima Semua ({group.pendingCount})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleUserExpand(group.userId)}
                          className="p-1 rounded-xl hover:bg-slate-200/70 text-slate-500 transition cursor-pointer"
                          title={isExpanded ? 'Ciutkan Daftar' : 'Buka Daftar'}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* USER STORAN ITEMS TABLE */}
                  {isExpanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="px-4 py-2.5 w-10 text-center">#</th>
                            <th className="px-4 py-2.5">Alamat Gmail</th>
                            <th className="px-4 py-2.5">Password Pilihan</th>
                            <th className="px-4 py-2.5">Waktu Stor</th>
                            <th className="px-4 py-2.5">Reward</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {group.items.map((sub, itemIdx) => {
                            const cleanEmail = getCleanEmail(sub.dataContent);
                            const passwordUsed = getSubPassword(sub);
                            const isPending = sub.status === 'Pending';
                            const isCekAdmin = sub.status === 'Cek Admin';
                            const isAccepted = sub.status === 'Diterima';
                            const isRejected = sub.status === 'Ditolak';
                            const isKemarin = (isPending || isCekAdmin) && isEarlierThanTodayWIB(sub.createdAt);
                            return (
                              <tr
                                key={sub.id}
                                className={`hover:bg-blue-50/30 transition ${
                                  isKemarin ? 'bg-amber-50/20' : ''
                                }`}
                              >
                                <td className="px-4 py-3 text-center text-slate-400 font-mono text-[11px]">
                                  {itemIdx + 1}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                    <span className="font-mono font-bold text-slate-900 select-all text-xs">
                                      {cleanEmail}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(cleanEmail);
                                        showToast('info', 'Email Disalin', cleanEmail);
                                      }}
                                      className="text-slate-400 hover:text-blue-600 p-0.5 cursor-pointer"
                                      title="Salin Email"
                                    >
                                      <Copy className="w-3 h-3" />
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-mono text-[11px] font-bold border shadow-2xs bg-amber-50 text-amber-900 border-amber-200`}
                                    title={`Password dipilih user: ${passwordUsed}`}
                                  >
                                    <KeyRound className="w-3 h-3 text-amber-600" />
                                    <span>{passwordUsed}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-500 text-[11px]">
                                  <div>{formatIndonesianDateTime(sub.createdAt)}</div>
                                  {isKemarin && (
                                    <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                                      Kemarin
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 font-extrabold text-blue-700">
                                  {formatRupiah(sub.rewardAmount || 3000)}
                                </td>
                                <td className="px-4 py-3">
                                  <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                      isAccepted
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : isRejected
                                        ? 'bg-rose-100 text-rose-800'
                                        : isCekAdmin
                                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                        : isKemarin
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {isAccepted && <CheckCircle2 className="w-3 h-3" />}
                                    {isRejected && <XCircle className="w-3 h-3" />}
                                    {isCekAdmin && <Eye className="w-3 h-3" />}
                                    {isPending && <Clock className="w-3 h-3" />}
                                    <span>{sub.status === 'Cek Admin' ? 'Cek Status' : sub.status}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {(isPending || isCekAdmin) ? (
                                      <>
                                        {onCheckSubmission && isPending && (
                                          <button
                                            type="button"
                                            onClick={() => onCheckSubmission(sub)}
                                            disabled={processingSubId === sub.id}
                                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 transition cursor-pointer"
                                            title="Tandai Cek Admin"
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
                                          <Check className="w-3 h-3" />
                                          <span>Terima</span>
                                        </button>
                                      </>
                                    ) : (
                                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                        Riwayat {sub.status}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(`${cleanEmail}|${passwordUsed}`);
                                        showToast('info', 'Disalin', `${cleanEmail}|${passwordUsed}`);
                                      }}
                                      className="p-1 text-slate-400 hover:text-indigo-600 rounded-lg transition cursor-pointer"
                                      title="Salin Format Email|Password"
                                    >
                                      <KeyRound className="w-3 h-3" />
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
              );
            })
          )}
        </div>
      )}

      {/* VIEW MODE 2: FLAT TABLE */}
      {viewMode === 'flat_table' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {filteredList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs space-y-2">
              <Mail className="w-10 h-10 mx-auto text-slate-300" />
              <p className="font-bold text-slate-700">Tidak ada data storan akun Gmail</p>
              <p className="text-slate-500">
                {searchQuery
                  ? `Tidak ditemukan akun yang cocok dengan kata kunci "${searchQuery}".`
                  : 'Belum ada akun Gmail dalam kategori ini.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5 w-12 text-center">#</th>
                    <th className="px-5 py-3.5">Akun Gmail Disetor</th>
                    <th className="px-5 py-3.5">Password</th>
                    <th className="px-5 py-3.5">User Pengirim</th>
                    <th className="px-5 py-3.5">Waktu Storan</th>
                    <th className="px-5 py-3.5">Imbalan</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((sub, idx) => {
                    const cleanEmail = getCleanEmail(sub.dataContent);
                    const passwordUsed = getSubPassword(sub);
                    const isPending = sub.status === 'Pending';
                    const isCekAdmin = sub.status === 'Cek Admin';
                    const isAccepted = sub.status === 'Diterima';
                    const isRejected = sub.status === 'Ditolak';
                    const isPendingYesterday =
                      (isPending || isCekAdmin) && isEarlierThanTodayWIB(sub.createdAt);
                    const isPendingToday = (isPending || isCekAdmin) && isTodayWIB(sub.createdAt);

                    return (
                      <tr
                        key={sub.id}
                        className={`hover:bg-slate-50/70 transition ${
                          isPendingYesterday ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-mono font-bold text-slate-900 select-all">
                              {cleanEmail}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(cleanEmail);
                                showToast('info', 'Email Disalin', cleanEmail);
                              }}
                              className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-0.5"
                              title="Salin Email"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg font-mono text-[11px] font-bold border shadow-2xs bg-amber-50 text-amber-900 border-amber-200`}
                          >
                            <KeyRound className="w-3 h-3 text-amber-600" />
                            <span>{passwordUsed}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-800">{sub.userName || 'Freelancer'}</div>
                          <div className="text-[11px] text-slate-400">{sub.userEmail}</div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                          <div>{formatIndonesianDateTime(sub.createdAt)}</div>
                          {isPendingYesterday && (
                            <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              Kemarin
                            </span>
                          )}
                          {isPendingToday && (
                            <span className="text-[10px] text-blue-700 font-bold bg-blue-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              Hari Ini
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 font-extrabold text-blue-700">
                          {formatRupiah(sub.rewardAmount || 3000)}
                        </td>
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                              isAccepted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : isCekAdmin
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : isPendingYesterday
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isAccepted && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isRejected && <XCircle className="w-3.5 h-3.5" />}
                            {isCekAdmin && <Eye className="w-3.5 h-3.5" />}
                            {isPending && <Clock className="w-3.5 h-3.5" />}
                            <span>{sub.status}</span>
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(isPending || isCekAdmin) ? (
                              <>
                                {onCheckSubmission && isPending && (
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
                              </>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                                Riwayat {sub.status}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(`${cleanEmail}|${passwordUsed}`);
                                showToast('info', 'Disalin', `${cleanEmail}|${passwordUsed}`);
                              }}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                              title="Salin Format Email|Password"
                            >
                              <KeyRound className="w-3 h-3" />
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
      )}
    </div>
  );
}
