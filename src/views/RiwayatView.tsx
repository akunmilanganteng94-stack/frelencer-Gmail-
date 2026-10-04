import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { Submission, SubmissionStatus, NavigationTab } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import { getSavedGeneratedAccounts, GeneratedResultItem } from '../components/GmailGenerator';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
  Eye,
  X,
  AlertCircle,
  Sparkles,
  Mail,
  Lock,
  Send,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RiwayatViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

function SubmissionProgressStepper({
  status,
  isExpanded = false,
  rejectionReason,
}: {
  status: SubmissionStatus;
  isExpanded?: boolean;
  rejectionReason?: string;
}) {
  const isPending = status === 'Pending';
  const isCekAdmin = status === 'Cek Admin';
  const isDiterima = status === 'Diterima';
  const isDitolak = status === 'Ditolak';

  const step1Done = isCekAdmin || isDiterima || isDitolak;
  const step2Done = isDiterima || isDitolak;

  return (
    <div
      className={`w-full rounded-xl transition-all ${
        isExpanded ? 'p-3 bg-slate-50 border border-slate-200' : 'p-2 bg-slate-100/70 border border-slate-200/60'
      }`}
    >
      <div className="flex items-center justify-between gap-1 text-[10px] font-bold">
        {/* Step 1: Pending */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              isPending
                ? 'bg-amber-500 text-white shadow-xs shadow-amber-500/40 animate-pulse ring-2 ring-amber-300'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isPending ? '1' : <Check className="w-3 h-3 stroke-[3]" />}
          </div>
          <div>
            <div className={`text-[10px] leading-tight font-black ${isPending ? 'text-amber-900' : 'text-slate-700'}`}>
              Pending
            </div>
            <div className="text-[9px] text-slate-500 font-normal">Antrean</div>
          </div>
        </div>

        {/* Connector Line 1 */}
        <div className={`flex-1 h-0.5 mx-1 rounded-full ${step1Done ? 'bg-blue-400' : 'bg-slate-300'}`} />

        {/* Step 2: Cek Admin */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              isCekAdmin
                ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/40 animate-pulse ring-2 ring-blue-300'
                : step2Done
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {isCekAdmin ? '2' : step2Done ? <Check className="w-3 h-3 stroke-[3]" /> : '2'}
          </div>
          <div>
            <div
              className={`text-[10px] leading-tight font-black ${
                isCekAdmin ? 'text-blue-900' : step2Done ? 'text-slate-700' : 'text-slate-400'
              }`}
            >
              Cek Admin
            </div>
            <div className="text-[9px] text-slate-500 font-normal">Verifikasi</div>
          </div>
        </div>

        {/* Connector Line 2 */}
        <div
          className={`flex-1 h-0.5 mx-1 rounded-full ${
            step2Done
              ? isDiterima
                ? 'bg-emerald-500'
                : 'bg-rose-500'
              : 'bg-slate-300'
          }`}
        />

        {/* Step 3: Diterima / Ditolak */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              isDiterima
                ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/40'
                : isDitolak
                ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/40'
                : 'bg-slate-200 text-slate-500'
            }`}
          >
            {isDiterima ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : isDitolak ? (
              <X className="w-3 h-3 stroke-[3]" />
            ) : (
              '3'
            )}
          </div>
          <div>
            <div
              className={`text-[10px] leading-tight font-black ${
                isDiterima ? 'text-emerald-900' : isDitolak ? 'text-rose-900' : 'text-slate-400'
              }`}
            >
              {isDiterima ? 'Diterima' : isDitolak ? 'Ditolak' : 'Keputusan'}
            </div>
            <div className="text-[9px] text-slate-500 font-normal">
              {isDiterima ? '+Rp 3.000' : isDitolak ? 'Tidak Valid' : 'Hasil Akhir'}
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-200/80 text-[11px] text-slate-600">
          {isPending && (
            <p className="flex items-center gap-1.5 text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <Clock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>Proses 1/3 (Pending):</strong> Akun Gmail Anda sudah berhasil masuk ke sistem antrean admin. Menunggu giliran untuk diperiksa.
              </span>
            </p>
          )}
          {isCekAdmin && (
            <p className="flex items-center gap-1.5 text-blue-800 bg-blue-50 p-2.5 rounded-xl border border-blue-200">
              <Eye className="w-4 h-4 shrink-0 text-blue-600" />
              <span>
                <strong>Proses 2/3 (Cek Admin):</strong> Akun sedang aktif diperiksa oleh admin (verifikasi login, password, dan kesegaran akun).
              </span>
            </p>
          )}
          {isDiterima && (
            <p className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>
                <strong>Proses 3/3 (Diterima):</strong> Akun lolos verifikasi! Reward komisi Rp 3.000 otomatis sudah masuk ke saldo dompet Anda.
              </span>
            </p>
          )}
          {isDitolak && (
            <div className="text-rose-800 bg-rose-50 p-2.5 rounded-xl border border-rose-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Proses 3/3 (Ditolak oleh Admin):</span>
              </div>
              <p className="text-xs">{rejectionReason || 'Akun tidak memenuhi syarat verifikasi admin.'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RiwayatView({ onNavigate }: RiwayatViewProps) {
  const { currentUser } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [mainTab, setMainTab] = useState<'storan' | 'generate'>('storan');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [generatedList, setGeneratedList] = useState<GeneratedResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'Semua' | SubmissionStatus>('Semua');
  const [activePwFilter, setActivePwFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [genSearchQuery, setGenSearchQuery] = useState('');
  const [genFilter, setGenFilter] = useState<'semua' | 'belum_stor' | 'sudah_stor'>('semua');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedSubForCheck, setSelectedSubForCheck] = useState<Submission | null>(null);

  const pw1 = settings.password1Name || 'zero1122';
  const pw2 = settings.password2Name || 'prabujaya';

  // Sync password filter if one is closed by admin
  useEffect(() => {
    if (activePwFilter === pw1 && settings.passwordZero1122Open === false) {
      setActivePwFilter('Semua');
    }
    if (activePwFilter === pw2 && settings.passwordPrabujayaOpen === false) {
      setActivePwFilter('Semua');
    }
  }, [settings.passwordZero1122Open, settings.passwordPrabujayaOpen, activePwFilter, pw1, pw2]);

  const getSubPw = (sub: Submission): string => {
    if (sub.passwordUsed) return sub.passwordUsed;
    if (sub.adminNotes && sub.adminNotes.includes('PW:')) {
      const match = sub.adminNotes.match(/PW:\s*([^\s,]+)/i);
      if (match && match[1]) return match[1];
    }
    const parts = sub.dataContent.split('|');
    if (parts[1] && parts[1].trim()) return parts[1].trim();
    return pw1;
  };

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', currentUser.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Submission[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Submission, 'id'>) });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissions(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Riwayat snapshot warning:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.uid) {
      const list = getSavedGeneratedAccounts(currentUser.uid);
      setGeneratedList(list);
    }
  }, [currentUser]);

  const submittedEmailsSet = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((s) => {
      const clean = s.dataContent.split('|')[0].trim().toLowerCase();
      if (clean) set.add(clean);
    });
    return set;
  }, [submissions]);

  const copyToClipboard = (text: string, label = 'Tersalin') => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    showToast('info', 'Tersalin', `${label} disalin ke clipboard.`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const matchesFilter = activeFilter === 'Semua' || sub.status === activeFilter;
      const pw = getSubPw(sub);
      const matchesPw = activePwFilter === 'Semua' || pw === activePwFilter;
      const cleanEmail = sub.dataContent.split('|')[0].trim().toLowerCase();
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        sub.id.toLowerCase().includes(q) ||
        cleanEmail.includes(q) ||
        pw.toLowerCase().includes(q) ||
        (sub.rejectionReason && sub.rejectionReason.toLowerCase().includes(q)) ||
        (sub.adminNotes && sub.adminNotes.toLowerCase().includes(q));
      return matchesFilter && matchesPw && matchesSearch;
    });
  }, [submissions, activeFilter, activePwFilter, searchQuery]);

  // Filtered generated list
  const filteredGenerated = useMemo(() => {
    return generatedList.filter((item) => {
      const clean = item.email.trim().toLowerCase();
      const isStored = submittedEmailsSet.has(clean);
      if (genFilter === 'belum_stor' && isStored) return false;
      if (genFilter === 'sudah_stor' && !isStored) return false;
      const q = genSearchQuery.toLowerCase().trim();
      if (!q) return true;
      return clean.includes(q) || (item.password || '').toLowerCase().includes(q);
    });
  }, [generatedList, submittedEmailsSet, genFilter, genSearchQuery]);

  const countSemua = submissions.length;
  const countPending = submissions.filter((s) => s.status === 'Pending').length;
  const countCekAdmin = submissions.filter((s) => s.status === 'Cek Admin').length;
  const countDiterima = submissions.filter((s) => s.status === 'Diterima').length;
  const countDitolak = submissions.filter((s) => s.status === 'Ditolak').length;
  const countPw1 = submissions.filter((s) => getSubPw(s) === pw1).length;
  const countPw2 = submissions.filter((s) => getSubPw(s) === pw2).length;

  const countGenSemua = generatedList.length;
  const countGenBelum = generatedList.filter((i) => !submittedEmailsSet.has(i.email.trim().toLowerCase())).length;
  const countGenSudah = generatedList.filter((i) => submittedEmailsSet.has(i.email.trim().toLowerCase())).length;

  const handleDeleteGeneratedItem = (id: string) => {
    const updated = generatedList.filter((i) => i.id !== id);
    setGeneratedList(updated);
    if (currentUser?.uid) {
      localStorage.setItem(`gmail_gen_saved_${currentUser.uid}`, JSON.stringify(updated));
    }
    showToast('info', 'Dihapus', 'Akun dihapus dari riwayat generate lokal.');
  };

  const handleUseForStoran = (email: string) => {
    navigator.clipboard.writeText(email);
    showToast('success', 'Akun Dipilih', `${email} disalin. Membuka form Storan...`);
    if (onNavigate) {
      onNavigate('storan');
    }
  };

  const handleCopyAllGen = (onlyUnsubmitted = false) => {
    const targetList = onlyUnsubmitted
      ? generatedList.filter((i) => !submittedEmailsSet.has(i.email.trim().toLowerCase()))
      : generatedList;
    if (targetList.length === 0) {
      showToast('warning', 'Kosong', 'Tidak ada akun untuk disalin.');
      return;
    }
    const text = targetList.map((i) => i.email).join('\n');
    navigator.clipboard.writeText(text);
    showToast('success', 'Semua Disalin', `${targetList.length} alamat Gmail disalin ke clipboard.`);
  };

  return (
    <div className="space-y-3 sm:space-y-3.5 max-w-4xl mx-auto select-none pb-16">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <span>Pusat Riwayat Akun</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            Pantau alur status storan (Pending &rarr; Cek Admin &rarr; Diterima/Ditolak) dan riwayat generate akun Anda
          </p>
        </div>
      </div>

      {/* TOP MAIN TAB SWITCHER */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl">
        <button
          type="button"
          onClick={() => setMainTab('storan')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === 'storan'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Riwayat Storan ({submissions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMainTab('generate')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-black transition flex items-center justify-center gap-2 cursor-pointer ${
            mainTab === 'generate'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Riwayat Generate ({generatedList.length})</span>
          {countGenBelum > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
              {countGenBelum} belum stor
            </span>
          )}
        </button>
      </div>

      {/* ========================================= */}
      {/* TAB 1: RIWAYAT STORAN */}
      {/* ========================================= */}
      {mainTab === 'storan' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-2xs space-y-2.5">
            {/* Status filter tabs */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-xl">
                {(
                  [
                    { label: 'Semua Status', value: 'Semua', count: countSemua },
                    { label: 'Pending', value: 'Pending', count: countPending },
                    { label: 'Cek Admin', value: 'Cek Admin', count: countCekAdmin },
                    { label: 'Diterima', value: 'Diterima', count: countDiterima },
                    { label: 'Ditolak', value: 'Ditolak', count: countDitolak },
                  ] as const
                ).map((tab) => {
                  const isActive = activeFilter === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setActiveFilter(tab.value)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          isActive ? 'bg-blue-100 text-blue-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full md:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari email Gmail..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-500 text-xs outline-none transition bg-white"
                />
              </div>
            </div>

            {/* Pemisahan Kolom Password */}
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Password:</span>
              <button
                type="button"
                onClick={() => setActivePwFilter('Semua')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activePwFilter === 'Semua'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua PW ({countSemua})
              </button>
              {settings.passwordZero1122Open !== false && (
                <button
                  type="button"
                  onClick={() => setActivePwFilter(pw1)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    activePwFilter === pw1
                      ? 'bg-orange-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {pw1} ({countPw1})
                </button>
              )}
              {settings.passwordPrabujayaOpen !== false && (
                <button
                  type="button"
                  onClick={() => setActivePwFilter(pw2)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                    activePwFilter === pw2
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  {pw2} ({countPw2})
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={n} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak ada data riwayat Gmail</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || activeFilter !== 'Semua' || activePwFilter !== 'Semua'
                  ? 'Tidak ditemukan data yang sesuai dengan filter atau kata kunci.'
                  : 'Kamu belum memiliki riwayat storan akun Gmail. Mulai kirim di menu Storan.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredSubmissions.map((sub) => {
                const cleanEmail = sub.dataContent.split('|')[0].trim();
                const pw = getSubPw(sub);
                return (
                  <div
                    key={sub.id}
                    className="p-3 sm:p-3.5 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-2xs transition space-y-2.5 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-xs sm:text-sm font-black text-slate-900 truncate">
                          {cleanEmail}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 shrink-0">
                          PW: {pw}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatIndonesianDateTime(sub.createdAt)}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${
                            sub.status === 'Diterima'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : sub.status === 'Ditolak'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : sub.status === 'Cek Admin'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {sub.status === 'Diterima' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {sub.status === 'Ditolak' && <XCircle className="w-3 h-3 text-rose-600" />}
                          {sub.status === 'Cek Admin' && <Eye className="w-3 h-3 text-blue-600" />}
                          {sub.status === 'Pending' && <Clock className="w-3 h-3 text-amber-600" />}
                          <span>{sub.status}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(cleanEmail, cleanEmail)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                          title="Salin Akun"
                        >
                          {copiedId === cleanEmail ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedSubForCheck(sub)}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition cursor-pointer flex items-center gap-1 font-bold text-[11px]"
                          title="Cek Detail Alur Proses"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Alur Proses</span>
                        </button>
                      </div>
                    </div>

                    {/* Alur Proses 3 Langkah: Pending -> Cek Admin -> Diterima / Ditolak */}
                    <SubmissionProgressStepper status={sub.status} />

                    {sub.status === 'Ditolak' && sub.rejectionReason && (
                      <div className="text-[11px] text-rose-800 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>
                          <strong>Alasan Ditolak:</strong> {sub.rejectionReason}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================= */}
      {/* TAB 2: RIWAYAT GENERATE AKUN */}
      {/* ========================================= */}
      {mainTab === 'generate' && (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setGenFilter('semua')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    genFilter === 'semua'
                      ? 'bg-white text-purple-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({countGenSemua})
                </button>
                <button
                  type="button"
                  onClick={() => setGenFilter('belum_stor')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    genFilter === 'belum_stor'
                      ? 'bg-slate-700 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Belum di STOR ({countGenBelum})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGenFilter('sudah_stor')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                    genFilter === 'sudah_stor'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>di STOR ({countGenSudah})</span>
                </button>
              </div>

              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={genSearchQuery}
                  onChange={(e) => setGenSearchQuery(e.target.value)}
                  placeholder="Cari email hasil generate..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:border-purple-500 text-xs outline-none bg-white"
                />
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-[11px] text-slate-500">
                Status awal: <strong className="text-slate-700">belum di STOR (abu-abu)</strong>. Setelah dikirim ke menu Storan, otomatis berubah menjadi <strong className="text-emerald-700">di STOR (hijau)</strong>.
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyAllGen(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin Semua</span>
                </button>
                {countGenBelum > 0 && (
                  <button
                    type="button"
                    onClick={() => handleCopyAllGen(true)}
                    className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold border border-purple-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Salin yang Belum Distor ({countGenBelum})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredGenerated.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200/80 shadow-2xs space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Tidak ada riwayat akun generate</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {genSearchQuery || genFilter !== 'semua'
                  ? 'Tidak ditemukan akun yang cocok dengan filter atau pencarian Anda.'
                  : 'Anda belum pernah generate akun Gmail. Generate akun otomatis dari stok admin di menu Beranda atau Storan.'}
              </p>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition cursor-pointer"
                >
                  Buka Generator Akun
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/80 shadow-2xs space-y-2">
              {filteredGenerated.map((item, idx) => {
                const clean = item.email.trim().toLowerCase();
                const isStored = submittedEmailsSet.has(clean);
                const isCopied = copiedId === item.email;
                const isPwCopied = copiedId === (item.password || pw1);

                return (
                  <div
                    key={item.id || idx}
                    className={`px-3 py-2.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                      isStored
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : 'bg-slate-50 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span
                        className={`font-mono text-xs sm:text-sm font-bold truncate flex items-center gap-1.5 ${
                          isStored ? 'text-emerald-950 line-through opacity-80' : 'text-slate-900'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{item.email}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 shrink-0 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>PW: {item.password || pw1}</span>
                      </span>

                      {/* BADGE: abu-abu "belum di STOR" vs hijau "di STOR" */}
                      {isStored ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>di STOR</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs shrink-0">
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>belum di STOR</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {!isStored && (
                        <button
                          type="button"
                          onClick={() => handleUseForStoran(item.email)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                          title="Gunakan akun ini untuk stor"
                        >
                          <Send className="w-3 h-3" />
                          <span>Pakai Stor</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.email, item.email)}
                        className="px-2 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Salin Gmail"
                      >
                        {isCopied ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{isCopied ? 'Tersalin' : 'Gmail'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(item.password || pw1, 'Password')}
                        className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Salin Password"
                      >
                        {isPwCopied ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Lock className="w-3 h-3 text-amber-600" />
                        )}
                        <span>{isPwCopied ? 'Tersalin' : 'PW'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGeneratedItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus dari daftar riwayat ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DETAIL RIWAYAT STOR */}
      <AnimatePresence>
        {selectedSubForCheck && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Alur &amp; Detail Storan Gmail</h3>
                    <p className="text-[11px] text-slate-500">Informasi status verifikasi dan jejak progres akun</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSubForCheck(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                {/* Visual Status Stepper */}
                <SubmissionProgressStepper
                  status={selectedSubForCheck.status}
                  isExpanded={true}
                  rejectionReason={selectedSubForCheck.rejectionReason}
                />

                <div className="p-3.5 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-200/80">
                  <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Alamat Gmail:</div>
                  <div className="font-mono text-sm font-black text-slate-900 select-all break-all">
                    {selectedSubForCheck.dataContent.split('|')[0].trim()}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/60 mt-1.5">
                    <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-mono text-[11px] font-bold">
                      PW: {getSubPw(selectedSubForCheck)}
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Imbalan: {formatRupiah(selectedSubForCheck.rewardAmount || 3000)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Waktu Dikirim:</span>
                    <strong className="text-slate-800 block mt-0.5">
                      {formatIndonesianDateTime(selectedSubForCheck.createdAt)}
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Status Saat Ini:</span>
                    <strong
                      className={`block mt-0.5 font-black ${
                        selectedSubForCheck.status === 'Diterima'
                          ? 'text-emerald-700'
                          : selectedSubForCheck.status === 'Ditolak'
                          ? 'text-rose-700'
                          : selectedSubForCheck.status === 'Cek Admin'
                          ? 'text-blue-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {selectedSubForCheck.status}
                    </strong>
                  </div>
                </div>

                {selectedSubForCheck.adminNotes && (
                  <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900">
                    <span className="text-[10px] text-blue-700 font-black uppercase tracking-wider block">Catatan Admin:</span>
                    <span className="font-mono text-xs mt-0.5 block">{selectedSubForCheck.adminNotes}</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedSubForCheck(null)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-black rounded-xl transition cursor-pointer"
              >
                Tutup Detail
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
