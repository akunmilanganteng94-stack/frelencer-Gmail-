import { useState, useMemo } from 'react';
import { Submission, SubmissionType } from '../types';
import {
  formatRupiah,
  formatIndonesianDateTime,
  isTodayWIB,
  isEarlierThanTodayWIB,
} from '../lib/utils';
import { useToast } from '../context/ToastContext';
import { doc, runTransaction, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Mail,
  Copy,
  Check,
  Search,
  CheckCircle2,
  XCircle,
  KeyRound,
  ListCheck,
  ListX,
  History,
  Zap,
  Globe,
  ClipboardCheck,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface AdminAllCekAdminTabProps {
  submissions: Submission[];
  defaultPassword?: string;
  onOpenBulkCheckModal?: () => void;
  onOpenBulkConfirmModal: () => void;
  onOpenBulkRejectModal?: () => void;
  onAcceptSubmission: (sub: Submission) => void;
  onRejectSubmission: (sub: Submission) => void;
  processingSubId: string | null;
  onNavigateToYesterdayPending?: () => void;
  onNavigateToAllStor?: () => void;
}

export function AdminAllCekAdminTab({
  submissions,
  defaultPassword = 'sgsg1122',
  onOpenBulkCheckModal,
  onOpenBulkConfirmModal,
  onOpenBulkRejectModal,
  onAcceptSubmission,
  onRejectSubmission,
  processingSubId,
  onNavigateToYesterdayPending,
  onNavigateToAllStor,
}: AdminAllCekAdminTabProps) {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | SubmissionType>('All');
  const [timingFilter, setTimingFilter] = useState<'All' | 'kemarin' | 'hari_ini'>('All');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isBulkConfirming, setIsBulkConfirming] = useState(false);
  const [bulkConfirmProgress, setBulkConfirmProgress] = useState({ current: 0, total: 0 });
  const [showConfirmDirectModal, setShowConfirmDirectModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<'selected' | 'all'>('selected');

  const getCleanEmail = (content: string) => {
    if (!content) return '';
    return content.split('|')[0].trim();
  };

  const getSubmissionType = (sub: Submission): SubmissionType => {
    if (sub.submissionType) return sub.submissionType;
    if (sub.rewardAmount === 2700) return 'bebas';
    return 'khusus';
  };

  // Submissions with status "Cek Admin"
  const allCekAdminSubs = useMemo(() => {
    return submissions.filter((s) => s.status === 'Cek Admin');
  }, [submissions]);

  const khususCount = useMemo(() => {
    return allCekAdminSubs.filter((s) => getSubmissionType(s) === 'khusus').length;
  }, [allCekAdminSubs]);

  const bebasCount = useMemo(() => {
    return allCekAdminSubs.filter((s) => getSubmissionType(s) === 'bebas').length;
  }, [allCekAdminSubs]);

  const kemarinCount = useMemo(() => {
    return allCekAdminSubs.filter((s) => isEarlierThanTodayWIB(s.createdAt)).length;
  }, [allCekAdminSubs]);

  const hariIniCount = useMemo(() => {
    return allCekAdminSubs.filter((s) => isTodayWIB(s.createdAt)).length;
  }, [allCekAdminSubs]);

  const totalRewardEstimate = useMemo(() => {
    return allCekAdminSubs.reduce((acc, s) => acc + (s.rewardAmount || 3000), 0);
  }, [allCekAdminSubs]);

  // Filtered list
  const filteredSubs = useMemo(() => {
    return allCekAdminSubs.filter((sub) => {
      const email = getCleanEmail(sub.dataContent).toLowerCase();
      const userName = (sub.userName || '').toLowerCase();
      const userEmail = (sub.userEmail || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesSearch = !q || email.includes(q) || userName.includes(q) || userEmail.includes(q);
      const matchesType = typeFilter === 'All' || getSubmissionType(sub) === typeFilter;
      const matchesTiming =
        timingFilter === 'All' ||
        (timingFilter === 'kemarin' && isEarlierThanTodayWIB(sub.createdAt)) ||
        (timingFilter === 'hari_ini' && isTodayWIB(sub.createdAt));

      return matchesSearch && matchesType && matchesTiming;
    });
  }, [allCekAdminSubs, searchQuery, typeFilter, timingFilter]);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('info', 'Tersalin', `${text} berhasil disalin ke clipboard.`);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleCopyAllEmails = (type?: SubmissionType) => {
    let list = allCekAdminSubs;
    if (type) {
      list = list.filter((s) => getSubmissionType(s) === type);
    }
    const emails = list.map((s) => getCleanEmail(s.dataContent)).filter(Boolean);
    if (emails.length === 0) {
      showToast('info', 'Tidak Ada Akun', 'Tidak ada akun Gmail untuk disalin.');
      return;
    }
    navigator.clipboard.writeText(emails.join('\n'));
    showToast(
      'success',
      'Disalin ke Clipboard',
      `${emails.length} alamat Gmail ${type ? `tipe ${type}` : ''} berhasil disalin (1 baris = 1 akun).`
    );
  };

  // Toggle selection
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredSubs.length && filteredSubs.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubs.map((s) => s.id)));
    }
  };

  const handleResetToPending = async (sub: Submission) => {
    try {
      await updateDoc(doc(db, 'submissions', sub.id), {
        status: 'Pending',
      });
      showToast(
        'info',
        'Kembali ke Pending',
        `Akun ${getCleanEmail(sub.dataContent)} dikembalikan ke antrean Pending.`
      );
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    }
  };

  // Direct bulk confirm selected or all
  const handleExecuteDirectBulkConfirm = async () => {
    const targetSubs =
      confirmTarget === 'all'
        ? allCekAdminSubs
        : allCekAdminSubs.filter((s) => selectedIds.has(s.id));

    if (targetSubs.length === 0) {
      showToast('info', 'Tidak Ada Akun', 'Pilih akun yang ingin dikonfirmasi.');
      setShowConfirmDirectModal(false);
      return;
    }

    setIsBulkConfirming(true);
    setBulkConfirmProgress({ current: 0, total: targetSubs.length });

    let successCount = 0;
    let totalPaid = 0;

    for (let i = 0; i < targetSubs.length; i++) {
      const sub = targetSubs[i];
      try {
        const reward = sub.rewardAmount || (getSubmissionType(sub) === 'bebas' ? 2700 : 3000);
        const subRef = doc(db, 'submissions', sub.id);
        const userRef = doc(db, 'users', sub.userId);

        await runTransaction(db, async (transaction) => {
          const subDoc = await transaction.get(subRef);
          if (!subDoc.exists()) return;

          const userDoc = await transaction.get(userRef);

          transaction.update(subRef, {
            status: 'Diterima',
            reviewedAt: new Date().toISOString(),
            rejectionReason: '',
            adminNotes: 'Diterima via konfirmasi All Cek Admin',
          });

          if (!userDoc.exists()) {
            transaction.set(userRef, {
              uid: sub.userId,
              email: sub.userEmail,
              displayName: sub.userName || 'Freelancer',
              balance: reward,
              totalEarned: reward,
              totalWithdrawn: 0,
              pendingWithdrawn: 0,
              status: 'active',
              role: 'user',
              createdAt: new Date().toISOString(),
            });
          } else {
            const userData = userDoc.data();
            const currentBalance = userData.balance || 0;
            const currentEarned = userData.totalEarned || 0;
            transaction.update(userRef, {
              balance: currentBalance + reward,
              totalEarned: currentEarned + reward,
            });
          }
        });

        successCount++;
        totalPaid += reward;
      } catch (err) {
        console.error('Error confirming submission:', sub.id, err);
      }
      setBulkConfirmProgress({ current: i + 1, total: targetSubs.length });
    }

    setIsBulkConfirming(false);
    setShowConfirmDirectModal(false);
    setSelectedIds(new Set());

    showToast(
      'success',
      'Konfirmasi Berhasil',
      `Berhasil mengonfirmasi ${successCount} akun Gmail (${formatRupiah(totalPaid)} saldo disalurkan ke freelancer).`
    );
  };

  const selectedSubsList = useMemo(() => {
    return allCekAdminSubs.filter((s) => selectedIds.has(s.id));
  }, [allCekAdminSubs, selectedIds]);

  const selectedRewardTotal = useMemo(() => {
    return selectedSubsList.reduce((acc, s) => acc + (s.rewardAmount || 3000), 0);
  }, [selectedSubsList]);

  return (
    <div className="space-y-5">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-5 sm:p-6 rounded-3xl shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">All Cek Admin</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-white/20 text-white border border-white/30">
                  {allCekAdminSubs.length} Akun Sedang Dicek
                </span>
              </div>
              <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                Pemeriksaan akun Gmail yang disetor freelancer. Konfirmasi satu per satu atau langsung konfirmasi bulk.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenBulkConfirmModal}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md shadow-emerald-950/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
              title="Buka modal input teks massal untuk konfirmasi akun"
            >
              <ListCheck className="w-4 h-4" />
              <span>Modal Konfirmasi Bulk</span>
            </button>

            {onOpenBulkCheckModal && (
              <button
                type="button"
                onClick={onOpenBulkCheckModal}
                className="px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Buka modal cek bulk untuk memindahkan akun Pending ke Cek Admin"
              >
                <ClipboardCheck className="w-4 h-4" />
                <span>Input Cek Bulk</span>
              </button>
            )}

            {onOpenBulkRejectModal && (
              <button
                type="button"
                onClick={onOpenBulkRejectModal}
                className="px-3.5 py-2.5 rounded-xl bg-rose-500/80 hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="Buka modal tolak massal"
              >
                <ListX className="w-4 h-4" />
                <span>Tolak Bulk</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-2 border-t border-white/15">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">
              Total Cek Admin
            </span>
            <div className="text-lg sm:text-xl font-black mt-0.5">{allCekAdminSubs.length} Akun</div>
            <span className="text-[10px] text-blue-200">Dalam antrean aktif</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Khusus (3k)</span>
            </span>
            <div className="text-lg sm:text-xl font-black mt-0.5">{khususCount} Akun</div>
            <span className="text-[10px] text-blue-200">Rp 3.000 / akun</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block flex items-center gap-1">
              <Globe className="w-3 h-3 text-teal-300" />
              <span>Bebas (2.7k)</span>
            </span>
            <div className="text-lg sm:text-xl font-black mt-0.5">{bebasCount} Akun</div>
            <span className="text-[10px] text-blue-200">Rp 2.700 / akun</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block flex items-center gap-1">
              <History className="w-3 h-3 text-amber-300" />
              <span>Kemarin / Hari Ini</span>
            </span>
            <div className="text-lg sm:text-xl font-black mt-0.5">
              {kemarinCount} / {hariIniCount}
            </div>
            <span className="text-[10px] text-blue-200">Prioritas kemarin: {kemarinCount}</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-200 block">
              Estimasi Komisi
            </span>
            <div className="text-lg sm:text-xl font-black mt-0.5 text-emerald-300">
              {formatRupiah(totalRewardEstimate)}
            </div>
            <span className="text-[10px] text-blue-200">Jika semua diterima</span>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS & COPY BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5 text-indigo-600" />
            <span>Salin Cepat Alamat Gmail:</span>
          </span>

          <button
            type="button"
            onClick={() => handleCopyAllEmails()}
            disabled={allCekAdminSubs.length === 0}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Salin seluruh email yang berstatus Cek Admin (1 per baris)"
          >
            <Copy className="w-3 h-3" />
            <span>Semua Gmail ({allCekAdminSubs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyAllEmails('khusus')}
            disabled={khususCount === 0}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Salin hanya Gmail Khusus 3k"
          >
            <Zap className="w-3 h-3 text-indigo-600" />
            <span>Khusus ({khususCount})</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopyAllEmails('bebas')}
            disabled={bebasCount === 0}
            className="px-3 py-1.5 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Salin hanya Gmail Bebas 2.7k"
          >
            <Globe className="w-3 h-3 text-teal-600" />
            <span>Bebas ({bebasCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {allCekAdminSubs.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setConfirmTarget('all');
                setShowConfirmDirectModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Konfirmasi Semua ({allCekAdminSubs.length} Akun)</span>
            </button>
          )}
        </div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari alamat Gmail atau nama user..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Jenis */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              {(['All', 'khusus', 'bebas'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    typeFilter === t
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t === 'All' ? 'Semua Tipe' : t === 'khusus' ? 'Khusus (3k)' : 'Bebas (2.7k)'}
                </button>
              ))}
            </div>

            {/* Filter Waktu */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              {(
                [
                  { id: 'All', label: 'Semua Waktu' },
                  { id: 'kemarin', label: `Kemarin (${kemarinCount})` },
                  { id: 'hari_ini', label: `Hari Ini (${hariIniCount})` },
                ] as const
              ).map((timing) => (
                <button
                  key={timing.id}
                  type="button"
                  onClick={() => setTimingFilter(timing.id)}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    timingFilter === timing.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {timing.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MULTI SELECTION ACTION BAR */}
        {selectedIds.size > 0 && (
          <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                {selectedIds.size}
              </span>
              <span className="text-xs font-bold text-indigo-950">
                {selectedIds.size} akun Gmail terpilih ({formatRupiah(selectedRewardTotal)})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const emails = selectedSubsList.map((s) => getCleanEmail(s.dataContent));
                  navigator.clipboard.writeText(emails.join('\n'));
                  showToast('info', 'Tersalin', `${emails.length} Gmail terpilih disalin.`);
                }}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>Salin Terpilih</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmTarget('selected');
                  setShowConfirmDirectModal(true);
                }}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Konfirmasi Terpilih ({selectedIds.size} Akun)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="px-2.5 py-1.5 rounded-xl bg-transparent hover:bg-indigo-100 text-indigo-600 text-xs font-semibold cursor-pointer"
              >
                Batal Pilih
              </button>
            </div>
          </div>
        )}

        {/* TABLE */}
        {filteredSubs.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-2xl bg-slate-50 border border-slate-200/60 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {allCekAdminSubs.length === 0
                  ? 'Tidak Ada Akun dalam Antrean Cek Admin'
                  : 'Tidak Ada Akun yang Cocok dengan Filter'}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                {allCekAdminSubs.length === 0
                  ? 'Gunakan fitur Cek Bulk di tab All STOR atau tombol di atas untuk memindahkan akun dari antrean Pending ke Cek Admin.'
                  : 'Coba ubah kata kunci pencarian atau reset filter tipe/waktu.'}
              </p>
            </div>

            {allCekAdminSubs.length === 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {onOpenBulkCheckModal && (
                  <button
                    type="button"
                    onClick={onOpenBulkCheckModal}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Buka Cek Bulk Sekarang</span>
                  </button>
                )}
                {onNavigateToAllStor && (
                  <button
                    type="button"
                    onClick={onNavigateToAllStor}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                  >
                    Lihat Semua STOR
                  </button>
                )}
                {onNavigateToYesterdayPending && kemarinCount === 0 && (
                  <button
                    type="button"
                    onClick={onNavigateToYesterdayPending}
                    className="px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold transition cursor-pointer"
                  >
                    Lihat Pendingan Kemarin
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredSubs.length && filteredSubs.length > 0}
                      onChange={handleSelectAllFiltered}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Pilih Semua"
                    />
                  </th>
                  <th className="px-3 py-3.5 w-12 text-center">#</th>
                  <th className="px-4 py-3.5">Alamat Gmail</th>
                  <th className="px-4 py-3.5">Password</th>
                  <th className="px-4 py-3.5">Freelancer</th>
                  <th className="px-4 py-3.5">Waktu Mulai Cek</th>
                  <th className="px-4 py-3.5 text-right">Aksi Pengecekan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSubs.map((sub, idx) => {
                  const email = getCleanEmail(sub.dataContent);
                  const type = getSubmissionType(sub);
                  const isProcessing = processingSubId === sub.id;
                  const isChecked = selectedIds.has(sub.id);
                  const isKemarin = isEarlierThanTodayWIB(sub.createdAt);

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-blue-50/40 transition ${
                        isChecked ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(sub.id)}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      <td className="px-3 py-3.5 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-xs sm:text-sm">
                              {email}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyText(email, sub.id)}
                              className="text-slate-400 hover:text-indigo-600 transition cursor-pointer p-0.5"
                              title="Salin Alamat Gmail"
                            >
                              {copiedId === sub.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                type === 'khusus'
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : 'bg-teal-100 text-teal-800'
                              }`}
                            >
                              {type === 'khusus' ? 'Khusus 3k' : 'Bebas 2.7k'}
                            </span>

                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              Cek Admin
                            </span>

                            {isKemarin && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                                Kemarin
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">
                            {defaultPassword}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyText(defaultPassword, `pw-${sub.id}`)}
                            className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                            title="Salin Password"
                          >
                            {copiedId === `pw-${sub.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-slate-900 font-bold truncate max-w-[150px]">
                          {sub.userName || 'Freelancer'}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {sub.userEmail}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-slate-500 text-[11px]">
                        <div>{formatIndonesianDateTime(sub.checkedAt || sub.createdAt)}</div>
                        <span className="text-[10px] text-slate-400">
                          Disetor: {formatIndonesianDateTime(sub.createdAt)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* TOMBOL TERIMA (KONFIRMASI) */}
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => onAcceptSubmission(sub)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Terima akun dan cairkan saldo ke user"
                          >
                            {isProcessing ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>Terima</span>
                          </button>

                          {/* TOMBOL TOLAK */}
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => onRejectSubmission(sub)}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-50"
                            title="Tolak akun dengan alasan"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>

                          {/* KEMBALIKAN KE PENDING */}
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleResetToPending(sub)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                            title="Kembalikan status akun ke Pending"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
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

      {/* MODAL KONFIRMASI BULK LANGSUNG (MODAL KONFIRMASI DI TEMPAT) */}
      {showConfirmDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-emerald-600">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Konfirmasi Terima {confirmTarget === 'all' ? `Semua (${allCekAdminSubs.length})` : `${selectedIds.size}`} Akun?
                </h3>
                <p className="text-xs text-slate-500">
                  Saldo imbalan akan otomatis dikreditkan ke masing-masing freelancer
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Jumlah Akun:</span>
                <strong className="text-slate-900">
                  {confirmTarget === 'all' ? allCekAdminSubs.length : selectedIds.size} Akun
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Total Saldo Disalurkan:</span>
                <strong className="text-emerald-700 text-sm">
                  {formatRupiah(confirmTarget === 'all' ? totalRewardEstimate : selectedRewardTotal)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Status Baru:</span>
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  Diterima (Selesai)
                </span>
              </div>
            </div>

            {isBulkConfirming && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold text-slate-600">
                  <span>Memproses Konfirmasi...</span>
                  <span>
                    {bulkConfirmProgress.current} / {bulkConfirmProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 transition-all duration-150"
                    style={{
                      width: `${(bulkConfirmProgress.current / (bulkConfirmProgress.total || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isBulkConfirming}
                onClick={() => setShowConfirmDirectModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 font-bold text-xs text-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isBulkConfirming}
                onClick={handleExecuteDirectBulkConfirm}
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isBulkConfirming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ya, Konfirmasi Terima</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
