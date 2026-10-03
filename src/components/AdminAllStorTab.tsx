import { useState, useMemo } from 'react';
import { Submission, SystemSettings } from '../types';
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
  History,
  Zap,
  Eye,
  ClipboardCheck,
  ArrowRight,
  Check,
} from 'lucide-react';

interface AdminAllStorTabProps {
  submissions: Submission[];
  defaultPassword?: string;
  settings?: SystemSettings;
  onUpdateSettings?: (newSettings: Partial<SystemSettings>) => Promise<void>;
  onOpenBulkCheckModal?: (passwordMode?: 'ALL' | 'zero1122' | 'prabujaya') => void;
  onOpenBulkConfirmModal: (passwordMode?: 'ALL' | 'zero1122' | 'prabujaya') => void;
  onOpenBulkRejectModal?: (passwordMode?: 'ALL' | 'zero1122' | 'prabujaya') => void;
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

export const getSubmissionPassword = (sub: Submission): 'zero1122' | 'prabujaya' | string => {
  if (sub.storanPassword) return sub.storanPassword;
  const notes = (sub.adminNotes || '').toLowerCase();
  if (notes.includes('prabujaya')) return 'prabujaya';
  if (notes.includes('zero1122')) return 'zero1122';
  if (sub.dataContent.includes('|')) {
    const p = sub.dataContent.split('|')[1]?.trim().toLowerCase();
    if (p === 'prabujaya') return 'prabujaya';
    if (p === 'zero1122') return 'zero1122';
  }
  return 'zero1122';
};

export function AdminAllStorTab({
  submissions,
  settings,
  onUpdateSettings,
  onOpenBulkCheckModal,
  onOpenBulkConfirmModal,
  onOpenBulkRejectModal,
  onAcceptSubmission,
  onCheckSubmission,
  onRejectSubmission,
  processingSubId,
  onNavigateToYesterdayPending,
}: AdminAllStorTabProps) {
  const { showToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<FilterStatusType>('All');
  const [passwordFilter, setPasswordFilter] = useState<'ALL' | 'zero1122' | 'prabujaya'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const getCleanEmail = (content: string) => {
    if (!content) return '';
    return content.split('|')[0].trim();
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

  const countZero = useMemo(
    () => submissions.filter((s) => getSubmissionPassword(s) === 'zero1122').length,
    [submissions]
  );
  const countPrabu = useMemo(
    () => submissions.filter((s) => getSubmissionPassword(s) === 'prabujaya').length,
    [submissions]
  );

  const filteredList = useMemo(() => {
    return submissions.filter((sub) => {
      if (passwordFilter !== 'ALL') {
        const subPw = getSubmissionPassword(sub);
        if (subPw !== passwordFilter) return false;
      }
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

      const cleanEmail = getCleanEmail(sub.dataContent).toLowerCase();
      const q = searchQuery.toLowerCase();
      return (
        cleanEmail.includes(q) ||
        (sub.userName && sub.userName.toLowerCase().includes(q)) ||
        (sub.userEmail && sub.userEmail.toLowerCase().includes(q)) ||
        sub.id.toLowerCase().includes(q)
      );
    });
  }, [submissions, passwordFilter, filterStatus, searchQuery]);

  const handleCopyEmails = (
    mode:
      | 'pending_yesterday'
      | 'pending_today'
      | 'current_filter'
      | 'all_lines',
    withPassword: boolean = false
  ) => {
    let targetList: Submission[] = [];
    let labelNotice = 'Semua Akun';

    if (mode === 'pending_yesterday') {
      targetList = pendingYesterdayList;
      labelNotice = 'Semua Pendingan Kemarin';
    } else if (mode === 'pending_today') {
      targetList = pendingTodayList;
      labelNotice = 'Semua Pendingan Hari Ini';
    } else if (mode === 'current_filter') {
      targetList = filteredList;
      labelNotice = passwordFilter !== 'ALL' ? `Sesuai Filter (PW: ${passwordFilter})` : 'Sesuai Filter';
    } else if (mode === 'all_lines') {
      targetList = submissions;
      labelNotice = 'Semua Storan';
    }

    if (targetList.length === 0) {
      showToast('warning', 'Tidak Ada Data', `Tidak ada akun Gmail ${labelNotice} untuk disalin.`);
      return;
    }

    const textToCopy = targetList
      .map((s) => {
        const email = getCleanEmail(s.dataContent);
        if (withPassword) {
          const pw = getSubmissionPassword(s);
          return `${email}|${pw}`;
        }
        return email;
      })
      .join('\n');

    navigator.clipboard.writeText(textToCopy);
    showToast(
      'success',
      `${labelNotice} Berhasil Disalin`,
      `${targetList.length} akun Gmail disalin ${withPassword ? 'dengan format email|password' : '(1 baris 1 akun)'}.`
    );
  };

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-blue-200 border border-white/20">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Manajemen Storan</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Semua Gmail STOR-an User
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Data antrean storan akun Gmail freelancer. Pilihan password: <strong>zero1122</strong> atau <strong>prabujaya</strong>.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-stretch sm:items-center gap-2.5 shrink-0">
          {onOpenBulkCheckModal && (
            <button
              type="button"
              onClick={() => onOpenBulkCheckModal(passwordFilter)}
              className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ClipboardCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Cek Bulk {passwordFilter !== 'ALL' ? `(${passwordFilter})` : ''}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenBulkConfirmModal(passwordFilter)}
            className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <ListCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Terima Bulk {passwordFilter !== 'ALL' ? `(${passwordFilter})` : ''}</span>
          </button>

          {onOpenBulkRejectModal && (
            <button
              type="button"
              onClick={() => onOpenBulkRejectModal(passwordFilter)}
              className="px-4 sm:px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-xs sm:text-sm shadow-lg shadow-rose-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <ListX className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Tolak Bulk {passwordFilter !== 'ALL' ? `(${passwordFilter})` : ''}</span>
            </button>
          )}
        </div>
      </div>

      {/* PILIH MODE PASSWORD & SAKLAR TUNGGAL STOR */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                <span>Filter Mode Password All STOR:</span>
              </h3>
            </div>
          </div>

          {/* 1 SAKLAR BUKA/TUTUP STOR TUNGGAL */}
          {onUpdateSettings && settings && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold text-slate-500">Saklar Utama STOR:</span>
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    storanOpen: settings.storanOpen === false ? true : false,
                  })
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer active:scale-95 shadow-2xs ${
                  settings.storanOpen !== false
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                }`}
              >
                STOR: {settings.storanOpen !== false ? 'BUKA' : 'TUTUP'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          {/* Semua Mode */}
          <button
            type="button"
            onClick={() => setPasswordFilter('ALL')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer select-none flex items-center justify-between ${
              passwordFilter === 'ALL'
                ? 'bg-slate-900 text-white border-slate-950 shadow-md ring-2 ring-slate-900/20'
                : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800'
            }`}
          >
            <div>
              <div
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  passwordFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'
                }`}
              >
                Semua Mode
              </div>
              <div className="text-base font-black tracking-tight mt-0.5">Semua Password</div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
                passwordFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
              }`}
            >
              {submissions.length}
            </span>
          </button>

          {/* Mode 1: zero1122 */}
          <button
            type="button"
            onClick={() => setPasswordFilter('zero1122')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer select-none flex items-center justify-between ${
              passwordFilter === 'zero1122'
                ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-2 ring-blue-500/20'
                : 'bg-blue-50/50 hover:bg-blue-50 border-blue-200/80 text-blue-950'
            }`}
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                Password 1
              </div>
              <div className="font-mono text-base font-black tracking-tight mt-0.5">zero1122</div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
                passwordFilter === 'zero1122' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
              }`}
            >
              {countZero}
            </span>
          </button>

          {/* Mode 2: prabujaya */}
          <button
            type="button"
            onClick={() => setPasswordFilter('prabujaya')}
            className={`p-3 rounded-2xl border text-left transition cursor-pointer select-none flex items-center justify-between ${
              passwordFilter === 'prabujaya'
                ? 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/20'
                : 'bg-indigo-50/50 hover:bg-indigo-50 border-indigo-200/80 text-indigo-950'
            }`}
          >
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                Password 2
              </div>
              <div className="font-mono text-base font-black tracking-tight mt-0.5">prabujaya</div>
            </div>
            <span
              className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono ${
                passwordFilter === 'prabujaya'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {countPrabu}
            </span>
          </button>
        </div>
      </div>

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

      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 flex items-center gap-2">
                <span>Pemisah Antrean: Pendingan Kemarin vs Sekarang</span>
                {pendingYesterdayList.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-300">
                    Perlu Prioritas ({pendingYesterdayList.length})
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className={`rounded-2xl p-5 border transition-all ${
              filterStatus === 'Pending_Kemarin'
                ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/30 shadow-md'
                : 'bg-amber-50/40 border-amber-200/90 hover:border-amber-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-200/80 text-amber-900">
                  <Clock className="w-3 h-3" />
                  <span>ALL PENDINGAN KEMARIN</span>
                </span>
                <div className="text-3xl font-black text-amber-700 mt-2 font-mono">
                  {pendingYesterdayList.length}{' '}
                  <span className="text-xs font-medium text-amber-600 font-sans">Akun Gmail</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <History className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-amber-200/70 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyEmails('pending_yesterday')}
                disabled={pendingYesterdayList.length === 0}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Copy className="w-3 h-3" />
                <span>Salin Semua Kemarin</span>
              </button>
              {onNavigateToYesterdayPending && (
                <button
                  type="button"
                  onClick={onNavigateToYesterdayPending}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <History className="w-3 h-3 text-amber-400" />
                  <span>Buka Tab Kemarin</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div
            className={`rounded-2xl p-5 border transition-all ${
              filterStatus === 'Pending_Sekarang'
                ? 'bg-blue-50/90 border-blue-400 ring-2 ring-blue-400/30 shadow-md'
                : 'bg-blue-50/40 border-blue-200/90 hover:border-blue-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-200/80 text-blue-900">
                  <Zap className="w-3 h-3" />
                  <span>PENDINGAN SEKARANG</span>
                </span>
                <div className="text-3xl font-black text-blue-700 mt-2 font-mono">
                  {pendingTodayList.length}{' '}
                  <span className="text-xs font-medium text-blue-600 font-sans">Akun Gmail</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-700 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200/70 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyEmails('pending_today')}
                disabled={pendingTodayList.length === 0}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-40"
              >
                <Copy className="w-3 h-3" />
                <span>Salin Semua Hari Ini</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1">
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
              let activeClass = 'bg-white text-indigo-700 shadow-2xs';
              if (isCurrent) {
                if (tab.highlight === 'amber') {
                  activeClass = 'bg-amber-600 text-white shadow-2xs';
                } else if (tab.highlight === 'blue') {
                  activeClass = 'bg-blue-600 text-white shadow-2xs';
                }
              }
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilterStatus(tab.id as FilterStatusType)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isCurrent
                      ? activeClass
                      : tab.highlight === 'amber'
                      ? 'text-amber-700 hover:bg-amber-100/60'
                      : tab.highlight === 'blue'
                      ? 'text-blue-700 hover:bg-blue-100/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari email Gmail, user..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs outline-none bg-white"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Mail className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">Tidak ada data storan akun Gmail</p>
            <p className="text-slate-500">
              {searchQuery
                ? `Tidak ditemukan akun yang cocok dengan kata kunci "${searchQuery}".`
                : filterStatus === 'Pending_Kemarin'
                ? 'Tidak ada akun pending dari kemarin.'
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
                  const subPw = getSubmissionPassword(sub);
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
                            title="Salin Email Saja"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                            subPw === 'prabujaya'
                              ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>{subPw}</span>
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
                              navigator.clipboard.writeText(`${cleanEmail}|${subPw}`);
                              showToast('info', 'Disalin', `${cleanEmail}|${subPw}`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title={`Salin Format ${cleanEmail}|${subPw}`}
                          >
                            <KeyRound className="w-3.5 h-3.5" />
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
