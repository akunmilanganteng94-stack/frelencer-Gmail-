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
  Check,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  KeyRound,
  Download,
  ListCheck,
  ListX,
  Layers,
  History,
  Zap,
  Split,
  Table,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

interface AdminAllStorTabProps {
  submissions: Submission[];
  defaultPassword?: string;
  onOpenBulkConfirmModal: () => void;
  onOpenBulkRejectModal?: () => void;
  onAcceptSubmission: (sub: Submission) => void;
  onRejectSubmission: (sub: Submission) => void;
  processingSubId: string | null;
}

type FilterStatusType =
  | 'All'
  | 'Pending_Kemarin'
  | 'Pending_Sekarang'
  | 'Pending'
  | 'Diterima'
  | 'Ditolak';

export function AdminAllStorTab({
  submissions,
  defaultPassword = 'sgsg1122',
  onOpenBulkConfirmModal,
  onOpenBulkRejectModal,
  onAcceptSubmission,
  onRejectSubmission,
  processingSubId,
}: AdminAllStorTabProps) {
  const { showToast } = useToast();
  const [filterStatus, setFilterStatus] = useState<FilterStatusType>('All');
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedMode, setCopiedMode] = useState<string | null>(null);

  const getCleanEmail = (content: string) => {
    if (!content) return '';
    return content.split('|')[0].trim();
  };

  // Grouping pending submissions into yesterday/earlier vs today
  const pendingYesterdayList = useMemo(
    () => submissions.filter((s) => s.status === 'Pending' && isEarlierThanTodayWIB(s.createdAt)),
    [submissions]
  );

  const pendingTodayList = useMemo(
    () => submissions.filter((s) => s.status === 'Pending' && isTodayWIB(s.createdAt)),
    [submissions]
  );

  const pendingList = useMemo(
    () => submissions.filter((s) => s.status === 'Pending'),
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
        matchesStatus = sub.status === 'Pending' && isEarlierThanTodayWIB(sub.createdAt);
      } else if (filterStatus === 'Pending_Sekarang') {
        matchesStatus = sub.status === 'Pending' && isTodayWIB(sub.createdAt);
      } else if (filterStatus !== 'All') {
        matchesStatus = sub.status === filterStatus;
      }

      const cleanEmail = getCleanEmail(sub.dataContent).toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        cleanEmail.includes(q) ||
        (sub.userName && sub.userName.toLowerCase().includes(q)) ||
        (sub.userEmail && sub.userEmail.toLowerCase().includes(q)) ||
        sub.id.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [submissions, filterStatus, searchQuery]);

  const handleCopyEmails = (
    mode:
      | 'pending_yesterday'
      | 'pending_today'
      | 'pending_only'
      | 'current_filter'
      | 'all_lines'
      | 'with_details'
  ) => {
    let targetList: Submission[] = [];
    let labelNotice = 'Semua Akun';

    if (mode === 'pending_yesterday') {
      targetList = pendingYesterdayList;
      labelNotice = 'Pendingan Kemarin';
    } else if (mode === 'pending_today') {
      targetList = pendingTodayList;
      labelNotice = 'Pendingan Sekarang (Hari Ini)';
    } else if (mode === 'pending_only') {
      targetList = pendingList;
      labelNotice = 'Semua Pending';
    } else if (mode === 'current_filter') {
      targetList = filteredList;
      labelNotice = 'Sesuai Filter';
    } else if (mode === 'all_lines') {
      targetList = submissions;
      labelNotice = 'Semua Storan';
    } else if (mode === 'with_details') {
      targetList = filteredList;
      labelNotice = 'Detail Lengkap';
    }

    if (targetList.length === 0) {
      showToast('warning', 'Tidak Ada Data', `Tidak ada akun Gmail ${labelNotice} untuk disalin.`);
      return;
    }

    let textToCopy = '';
    if (mode === 'with_details') {
      textToCopy = targetList
        .map(
          (s) =>
            `${getCleanEmail(s.dataContent)} | PW: ${defaultPassword} | Pengirim: ${s.userName} (${s.userEmail}) | Status: ${s.status}`
        )
        .join('\n');
    } else {
      textToCopy = targetList.map((s) => getCleanEmail(s.dataContent)).join('\n');
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedMode(mode);
    showToast(
      'success',
      `${labelNotice} Berhasil Disalin`,
      `${targetList.length} akun Gmail berhasil disalin (1 baris 1 akun).`
    );
    setTimeout(() => setCopiedMode(null), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner: All STOR User Feature & Quick Stats */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold text-blue-200 border border-white/20">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Fitur Manajemen: All STOR / Stok User</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Semua Gmail STOR-an User
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Pusat seluruh akun Gmail yang disetor freelancer. Salin daftar akun untuk pengecekan, pisahkan antrean pending kemarin dengan antrean sekarang, lalu konfirmasi atau tolak secara bulk (massal).
          </p>
        </div>

        {/* Big Actions: Konfirmasi Terima Bulk & Tolak Bulk */}
        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
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

      {/* FITUR KHUSUS: PEMISAH PENDINGAN KEMARIN VS PENDINGAN SEKARANG */}
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
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-extrabold border border-amber-300 animate-pulse">
                    Perlu Prioritas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Akun Gmail yang masih pending dari kemarin dipisahkan agar tidak tertumpuk dengan kiriman baru hari ini.
              </p>
            </div>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl self-start sm:self-center">
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Tabel Terpadu</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'split'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>Pisah 2 Kolom</span>
            </button>
          </div>
        </div>

        {/* 2 Dual Cards: Kemarin vs Sekarang */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: All Pendingan Kemarin */}
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
                <p className="text-xs text-amber-800/80 mt-1 leading-relaxed">
                  Storan yang disetor kemarin atau sebelumnya dan statusnya <strong>masih Pending</strong> (belum diperiksa/diterima).
                </p>
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
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  copiedMode === 'pending_yesterday'
                    ? 'bg-emerald-600 text-white'
                    : pendingYesterdayList.length > 0
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {copiedMode === 'pending_yesterday' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Salin Gmail Kemarin ({pendingYesterdayList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterStatus('Pending_Kemarin');
                  setViewMode('unified');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                  filterStatus === 'Pending_Kemarin'
                    ? 'bg-amber-700 text-white border-amber-700'
                    : 'bg-white hover:bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                <span>Lihat di Tabel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Card 2: Pendingan Sekarang (Hari Ini) */}
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
                <p className="text-xs text-blue-800/80 mt-1 leading-relaxed">
                  Storan fresh yang <strong>baru masuk hari ini</strong> (WIB) dan masih menunggu giliran pengecekan admin.
                </p>
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
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                  copiedMode === 'pending_today'
                    ? 'bg-emerald-600 text-white'
                    : pendingTodayList.length > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {copiedMode === 'pending_today' ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Salin Gmail Hari Ini ({pendingTodayList.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterStatus('Pending_Sekarang');
                  setViewMode('unified');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
                  filterStatus === 'Pending_Sekarang'
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white hover:bg-blue-100 text-blue-800 border-blue-300'
                }`}
              >
                <span>Lihat di Tabel</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Metric Counters Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Total Semua Storan</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">{submissions.length}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Akun disetor pengguna</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700">Total Pending</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-600 mt-1">{pendingList.length}</div>
          <div className="text-[11px] text-amber-700 mt-0.5 font-medium">
            {pendingYesterdayList.length} kemarin • {pendingTodayList.length} hari ini
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-2xs bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700">Diterima (Sudah Valid)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-1">{acceptedList.length}</div>
          <div className="text-[11px] text-emerald-600 mt-0.5">Saldo telah diberikan</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-rose-200/80 shadow-2xs bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700">Ditolak</span>
            <XCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">{rejectedList.length}</div>
          <div className="text-[11px] text-rose-500 mt-0.5">Tidak valid / error</div>
        </div>
      </div>

      {/* JIKA MODE SPLIT 2 KOLOM AKTIF: TAMPILKAN KEMARIN VS SEKARANG SECARA TERPISAH */}
      {viewMode === 'split' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* KOLOM KIRI: PENDINGAN KEMARIN */}
          <div className="bg-white rounded-3xl border border-amber-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-amber-100" />
                <div>
                  <h3 className="font-black text-sm sm:text-base">All Pendingan Kemarin</h3>
                  <p className="text-[11px] text-amber-100">
                    {pendingYesterdayList.length} akun Gmail masih pending
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyEmails('pending_yesterday')}
                disabled={pendingYesterdayList.length === 0}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Semua</span>
              </button>
            </div>

            <div className="p-3 bg-amber-50/60 border-b border-amber-100 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Prioritaskan akun di kolom ini karena telah menunggu sejak kemarin/sebelumnya.</span>
            </div>

            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[600px]">
              {pendingYesterdayList.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-400" />
                  <p className="font-bold text-slate-700">Tidak ada pendingan kemarin</p>
                  <p className="text-slate-500">Semua storan dari kemarin telah selesai diproses!</p>
                </div>
              ) : (
                pendingYesterdayList.map((sub, idx) => {
                  const cleanEmail = getCleanEmail(sub.dataContent);
                  return (
                    <div key={sub.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm select-all">
                            {cleanEmail}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cleanEmail);
                              showToast('info', 'Email Disalin', cleanEmail);
                            }}
                            className="text-slate-400 hover:text-indigo-600 transition p-1"
                            title="Salin Email"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-700">{sub.userName || 'Freelancer'}</span>
                          <span>•</span>
                          <span className="text-amber-700 font-semibold">{formatIndonesianDateTime(sub.createdAt)}</span>
                          <span>•</span>
                          <span className="font-bold text-indigo-600">{formatRupiah(sub.rewardAmount || 3000)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
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
                })
              )}
            </div>
          </div>

          {/* KOLOM KANAN: PENDINGAN SEKARANG */}
          <div className="bg-white rounded-3xl border border-blue-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-100" />
                <div>
                  <h3 className="font-black text-sm sm:text-base">Pendingan Sekarang (Hari Ini)</h3>
                  <p className="text-[11px] text-blue-100">
                    {pendingTodayList.length} akun Gmail fresh masuk hari ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyEmails('pending_today')}
                disabled={pendingTodayList.length === 0}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Semua</span>
              </button>
            </div>

            <div className="p-3 bg-blue-50/60 border-b border-blue-100 text-xs text-blue-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Storan akun Gmail yang baru masuk di sistem hari ini.</span>
            </div>

            <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[600px]">
              {pendingTodayList.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-xs space-y-2">
                  <Mail className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">Belum ada antrean baru hari ini</p>
                  <p className="text-slate-500">Storan baru yang disetor hari ini akan muncul di sini.</p>
                </div>
              ) : (
                pendingTodayList.map((sub, idx) => {
                  const cleanEmail = getCleanEmail(sub.dataContent);
                  return (
                    <div key={sub.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                          <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm select-all">
                            {cleanEmail}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(cleanEmail);
                              showToast('info', 'Email Disalin', cleanEmail);
                            }}
                            className="text-slate-400 hover:text-indigo-600 transition p-1"
                            title="Salin Email"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-700">{sub.userName || 'Freelancer'}</span>
                          <span>•</span>
                          <span className="text-blue-700 font-semibold">{formatIndonesianDateTime(sub.createdAt)}</span>
                          <span>•</span>
                          <span className="font-bold text-indigo-600">{formatRupiah(sub.rewardAmount || 3000)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
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
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Control Bar: Salin Semua STOR-an + Filter & Search */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-indigo-950">
                Fitur Salin Cepat STOR-an User:
              </div>
              <div className="text-[11px] text-indigo-700">
                Salin daftar alamat Gmail (1 baris 1 akun) berdasarkan filter atau antrean
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Salin Pending Kemarin */}
            <button
              type="button"
              onClick={() => handleCopyEmails('pending_yesterday')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                copiedMode === 'pending_yesterday'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
              }`}
            >
              {copiedMode === 'pending_yesterday' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <History className="w-3.5 h-3.5 text-amber-700" />
              )}
              <span>Salin Kemarin ({pendingYesterdayList.length})</span>
            </button>

            {/* Salin Pending Hari Ini */}
            <button
              type="button"
              onClick={() => handleCopyEmails('pending_today')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                copiedMode === 'pending_today'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300'
              }`}
            >
              {copiedMode === 'pending_today' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-blue-700" />
              )}
              <span>Salin Hari Ini ({pendingTodayList.length})</span>
            </button>

            {/* Salin Semua Filter Aktif */}
            <button
              type="button"
              onClick={() => handleCopyEmails('current_filter')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                copiedMode === 'current_filter'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {copiedMode === 'current_filter' ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>Salin Filter ({filteredList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyEmails('with_details')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              title="Salin lengkap dengan nama user, status, dan password"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Detail Lengkap</span>
            </button>
          </div>
        </div>

        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'All', label: `Semua (${submissions.length})` },
              {
                id: 'Pending_Kemarin',
                label: `⏳ Pending Kemarin (${pendingYesterdayList.length})`,
                highlight: pendingYesterdayList.length > 0 ? 'amber' : undefined,
              },
              {
                id: 'Pending_Sekarang',
                label: `⚡ Pending Sekarang (${pendingTodayList.length})`,
                highlight: pendingTodayList.length > 0 ? 'blue' : undefined,
              },
              { id: 'Pending', label: `Semua Pending (${pendingList.length})` },
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
              placeholder="Cari email Gmail, user, email..."
              className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs outline-none bg-white"
            />
          </div>
        </div>
      </div>

      {/* Banner informasi jika filter Pending Kemarin aktif */}
      {filterStatus === 'Pending_Kemarin' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <History className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-black text-amber-950">Menampilkan All Pendingan Kemarin:</span>{' '}
              <span>Terdapat <strong>{pendingYesterdayList.length} akun Gmail</strong> yang masih menunggu konfirmasi sejak kemarin atau sebelumnya.</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopyEmails('pending_yesterday')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-center"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Salin Semua Gmail Kemarin</span>
          </button>
        </div>
      )}

      {/* Banner informasi jika filter Pending Sekarang aktif */}
      {filterStatus === 'Pending_Sekarang' && (
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <Zap className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="font-black text-blue-950">Menampilkan Pendingan Sekarang (Hari Ini):</span>{' '}
              <span>Terdapat <strong>{pendingTodayList.length} akun Gmail</strong> yang disetorkan pada hari ini (WIB).</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => handleCopyEmails('pending_today')}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-center"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Salin Semua Gmail Hari Ini</span>
          </button>
        </div>
      )}

      {/* Table: All Gmail STOR-an User */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <Mail className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">Tidak ada data storan akun Gmail</p>
            <p className="text-slate-500">
              {searchQuery
                ? `Tidak ditemukan akun yang cocok dengan kata kunci "${searchQuery}".`
                : filterStatus === 'Pending_Kemarin'
                ? 'Tidak ada akun pending dari kemarin. Antrean kemarin telah tuntas!'
                : filterStatus === 'Pending_Sekarang'
                ? 'Belum ada akun pending yang masuk hari ini.'
                : 'Belum ada akun Gmail yang dikirimkan oleh pengguna.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5 w-12 text-center">#</th>
                  <th className="px-5 py-3.5">Akun Gmail Disetor</th>
                  <th className="px-5 py-3.5">User Pengirim</th>
                  <th className="px-5 py-3.5">Waktu Storan</th>
                  <th className="px-5 py-3.5">Imbalan</th>
                  <th className="px-5 py-3.5">Status & Kelompok</th>
                  <th className="px-5 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((sub, idx) => {
                  const cleanEmail = getCleanEmail(sub.dataContent);
                  const isPending = sub.status === 'Pending';
                  const isAccepted = sub.status === 'Diterima';
                  const isRejected = sub.status === 'Ditolak';
                  const isPendingYesterday = isPending && isEarlierThanTodayWIB(sub.createdAt);
                  const isPendingToday = isPending && isTodayWIB(sub.createdAt);

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
                        {sub.dataContent.includes('|') && (
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Raw: {sub.dataContent}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800">{sub.userName || 'Freelancer'}</div>
                        <div className="text-[11px] text-slate-400">{sub.userEmail}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                        <div>{formatIndonesianDateTime(sub.createdAt)}</div>
                      </td>
                      <td className="px-5 py-3.5 font-extrabold text-blue-700">
                        {formatRupiah(sub.rewardAmount || 3000)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                              isAccepted
                                ? 'bg-emerald-100 text-emerald-800'
                                : isRejected
                                ? 'bg-rose-100 text-rose-800'
                                : isPendingYesterday
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isAccepted && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {isRejected && <XCircle className="w-3.5 h-3.5" />}
                            {isPending && <Clock className="w-3.5 h-3.5" />}
                            <span>{sub.status}</span>
                          </span>

                          {/* Badge Kelompok: Kemarin vs Hari Ini untuk akun Pending */}
                          {isPendingYesterday && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              <History className="w-3 h-3" />
                              <span>Pending Kemarin</span>
                            </span>
                          )}
                          {isPendingToday && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              <Zap className="w-3 h-3" />
                              <span>Masuk Hari Ini</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
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
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                `${cleanEmail}|${defaultPassword}`
                              );
                              showToast('info', 'Disalin', `${cleanEmail}|${defaultPassword}`);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title="Salin Format Email|Password"
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

