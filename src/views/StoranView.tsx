import { useState, useEffect, useMemo, FormEvent, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah } from '../lib/utils';
import { Submission, NavigationTab } from '../types';
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notifyDataChange } from '../lib/syncHelper';
import {
  getSavedGeneratedAccounts,
  recordGeneratedCountToday,
  getGeneratedCountToday,
  verifyUserGeneratedEmail,
  filterExpiredStoredAccounts,
  getStoredAccountRemainingHours,
  GeneratedResultItem,
} from '../components/GmailGenerator';
import { useGmailStock } from '../hooks/useGmailStock';
import {
  AlertTriangle,
  Copy,
  Check,
  Trash2,
  Send,
  Sparkles,
  Plus,
  Minus,
  ChevronDown,
  Scale,
  ChevronRight,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StoranViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export function StoranView({ onNavigate }: StoranViewProps) {
  const { userProfile, currentUser } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { claimAccounts, availableStock, loading: stockLoading } = useGmailStock(true);
  const [recentlySubmittedEmails, setRecentlySubmittedEmails] = useState<Set<string>>(new Set());

  const pw1 = settings.password1Name || 'zero1122';
  const pw2 = settings.password2Name || 'prabujaya';

  // Password yang aktif dibuka oleh admin
  const availablePasswords = useMemo<string[]>(() => {
    const list: string[] = [];
    if (settings.passwordZero1122Open !== false) list.push(pw1);
    if (settings.passwordPrabujayaOpen !== false && pw2 !== pw1) list.push(pw2);
    return list.length > 0 ? list : [pw1];
  }, [settings.passwordZero1122Open, settings.passwordPrabujayaOpen, pw1, pw2]);

  // Pilihan password aktif
  const [selectedPassword, setSelectedPassword] = useState<string>(() => pw1);
  const [isPwDropdownOpen, setIsPwDropdownOpen] = useState(false);
  const pwDropdownRef = useRef<HTMLDivElement>(null);

  // Sync selected password jika password saat ini ditutup oleh admin
  useEffect(() => {
    if (!availablePasswords.includes(selectedPassword)) {
      setSelectedPassword(availablePasswords[0] || pw1);
    }
  }, [availablePasswords, selectedPassword, pw1]);

  const activePrice = settings.pricePerSubmission || 3000;

  // Syarat & Ketentuan Modal
  const [showTermsModal, setShowTermsModal] = useState(false);

  // Textarea input
  const [inputData, setInputData] = useState('');
  const [inputError, setInputError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Generated Gmail items
  const [generatedList, setGeneratedList] = useState<GeneratedResultItem[]>([]);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [generatingMore, setGeneratingMore] = useState(false);

  // User generator count & history tracking
  const [generateCount, setGenerateCount] = useState<number>(1);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState<boolean>(false);

  // Submissions history for this user
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pwDropdownRef.current && !pwDropdownRef.current.contains(event.target as Node)) {
        setIsPwDropdownOpen(false);
      }
    }
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Load user submissions realtime
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
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Submission, 'id'>) });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissions(list);
      },
      (err) => {
        console.warn('Submissions snapshot error in StoranView:', err);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  // Load generated Gmail list
  const loadGeneratedList = () => {
    const list = getSavedGeneratedAccounts(currentUser?.uid);
    const valid = filterExpiredStoredAccounts(list, submissions);
    setGeneratedList(valid);
    if (currentUser?.uid && valid.length !== list.length) {
      localStorage.setItem(`gmail_gen_saved_${currentUser.uid}`, JSON.stringify(valid));
    }
    if (valid.length > 0) {
      setHasGeneratedOnce(true);
    }
  };

  useEffect(() => {
    loadGeneratedList();
    const timer = setInterval(() => {
      loadGeneratedList();
    }, 30000);
    return () => clearInterval(timer);
  }, [currentUser, submissions]);

  // Set of submitted emails for this user
  const submittedEmailsSet = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((s) => {
      const clean = s.dataContent.split('|')[0].trim().toLowerCase();
      if (clean) set.add(clean);
    });
    recentlySubmittedEmails.forEach((e) => set.add(e));
    return set;
  }, [submissions, recentlySubmittedEmails]);

  // Use email directly for storan textarea
  const handleUseEmailForStoran = (email: string) => {
    const clean = email.trim().toLowerCase();
    setInputData((prev) => {
      const lines = prev.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      if (!lines.includes(clean)) {
        lines.push(clean);
      }
      return lines.join('\n');
    });
    setInputError('');
    showToast('info', 'Akun Dipilih', `${clean} dimasukkan ke kolom storan.`);
  };

  // Generated counts
  const totalGenerated = generatedList.length;
  const totalBelumDistor = useMemo(() => {
    return generatedList.filter((item) => {
      const clean = item.email.trim().toLowerCase();
      return !submittedEmailsSet.has(clean);
    }).length;
  }, [generatedList, submittedEmailsSet]);

  // Detected lines from textarea
  const detectedLines = useMemo(() => {
    return inputData
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }, [inputData]);

  // Copy single generated item
  const handleCopySingle = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItemId(id);
    showToast('info', 'Tersalin', `${text} disalin.`);
    setTimeout(() => setCopiedItemId(null), 1500);
  };

  // Delete single generated item
  const handleDeleteGenerated = (id: string) => {
    const updated = generatedList.filter((item) => item.id !== id);
    setGeneratedList(updated);
    if (currentUser?.uid) {
      localStorage.setItem(`gmail_gen_saved_${currentUser.uid}`, JSON.stringify(updated));
    }
    showToast('info', 'Dihapus', 'Akun dihapus dari daftar.');
  };

  // Salin Semua Gmail
  const handleCopyAllGenerated = () => {
    if (generatedList.length === 0) {
      showToast('warning', 'Kosong', 'Belum ada akun hasil generate.');
      return;
    }
    const all = generatedList.map((i) => i.email).join('\n');
    navigator.clipboard.writeText(all);
    showToast('success', 'Semua Disalin', `${generatedList.length} akun disalin ke clipboard.`);
  };

  // Salin Gmail Belum Distor
  const handleCopyUnsubmittedGenerated = () => {
    const unsubmitted = generatedList.filter((item) => {
      const clean = item.email.trim().toLowerCase();
      return !submittedEmailsSet.has(clean);
    });
    if (unsubmitted.length === 0) {
      showToast('info', 'Semua Telah Distor', 'Semua akun hasil generate Anda sudah distorkan.');
      return;
    }
    const text = unsubmitted.map((i) => i.email).join('\n');
    navigator.clipboard.writeText(text);
    setInputData(text);
    setInputError('');
    showToast(
      'success',
      'Gmail Ditempel',
      `${unsubmitted.length} akun otomatis ditempelkan ke kolom storan.`
    );
  };

  // Max generate can be configured by admin
  const maxAdminLimit = typeof settings.dailyGenerateLimit === 'number' && settings.dailyGenerateLimit > 0
    ? settings.dailyGenerateLimit
    : 10;
  const todayUsedQuota = getGeneratedCountToday(currentUser?.uid);
  const remainingQuota = Math.max(0, maxAdminLimit - todayUsedQuota);

  // Generate Handler - Strictly claim from admin stock
  const handleGenerateAccounts = async () => {
    if (settings.generatorOpen === false) {
      showToast('error', 'Ditutup', 'Fitur Generate Gmail sedang dinonaktifkan sementara oleh Admin.');
      return;
    }
    if (availableStock.length === 0) {
      showToast(
        'error',
        'Stok Admin Kosong',
        'Stok akun generator dari Admin saat ini kosong. Silakan hubungi admin atau tunggu admin mengisi stok.'
      );
      return;
    }
    if (remainingQuota <= 0) {
      showToast(
        'error',
        'Batas Tercapai',
        `Batas kuota generate harian Anda (${maxAdminLimit} akun) sudah penuh.`
      );
      return;
    }
    const countToGenerate = Math.min(generateCount, remainingQuota, availableStock.length);
    if (countToGenerate <= 0) {
      showToast('warning', 'Jumlah Tidak Valid', 'Tentukan jumlah akun yang valid.');
      return;
    }

    setGeneratingMore(true);
    try {
      const claimed = await claimAccounts(
        countToGenerate,
        currentUser?.uid,
        userProfile?.displayName || 'Freelancer',
        currentUser?.email || '',
        selectedPassword
      );

      if (!claimed || claimed.length === 0) {
        showToast('error', 'Stok Kosong', 'Tidak ada stok akun yang tersedia dari admin saat ini.');
        return;
      }

      recordGeneratedCountToday(claimed.length, currentUser?.uid);
      const newItems: GeneratedResultItem[] = claimed.map((c) => ({
        id: c.id,
        email: c.email,
        password: selectedPassword,
        generatedAt: new Date().toISOString(),
      }));

      const updated = filterExpiredStoredAccounts([...newItems, ...generatedList], submissions);
      setGeneratedList(updated);
      setHasGeneratedOnce(true);

      if (currentUser?.uid) {
        localStorage.setItem(`gmail_gen_saved_${currentUser.uid}`, JSON.stringify(updated));
      }

      showToast('success', 'Generate Berhasil', `Berhasil mengambil ${newItems.length} akun Gmail dari stok admin.`);
    } catch (e: unknown) {
      console.warn('Generate error:', e);
      showToast('error', 'Gagal Generate', e instanceof Error ? e.message : 'Terjadi kendala saat mengambil stok akun admin.');
    } finally {
      setGeneratingMore(false);
    }
  };

  // Validation & Direct Submit Form
  const handleDirectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInputError('');

    if (!settings.storanOpen) {
      showToast('error', 'Storan Tutup', 'Layanan storan saat ini sedang ditutup oleh admin.');
      setInputError('Layanan storan saat ini sedang ditutup.');
      return;
    }

    if (userProfile?.status === 'suspended') {
      showToast('error', 'Akun Dibatasi', 'Akun Anda sedang ditangguhkan. Tidak dapat mengirim storan.');
      return;
    }

    if (!currentUser) return;

    const rawLines = inputData
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) {
      setInputError('Kolom storan masih kosong. Masukkan minimal 1 akun Gmail.');
      return;
    }

    const cleanedEmails: string[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const lineNum = i + 1;
      if (line.includes(' ')) {
        setInputError(`Baris ${lineNum}: tidak boleh mengandung spasi.`);
        return;
      }
      let cleanEmail = line.toLowerCase();
      if (!cleanEmail.includes('@')) {
        cleanEmail = `${cleanEmail}@gmail.com`;
      }
      if (!cleanEmail.includes('@gmail.com') && !cleanEmail.includes('@googlemail.com')) {
        setInputError(`Baris ${lineNum}: bukan alamat Gmail yang valid (@gmail.com).`);
        return;
      }
      if (cleanedEmails.includes(cleanEmail)) {
        setInputError(`Baris ${lineNum}: Akun "${cleanEmail}" duplikat dalam pengiriman ini.`);
        return;
      }
      if (submittedEmailsSet.has(cleanEmail)) {
        setInputError(`Baris ${lineNum}: Akun "${cleanEmail}" sudah pernah Anda setorkan sebelumnya.`);
        return;
      }
      cleanedEmails.push(cleanEmail);
    }

    setSubmitting(true);
    try {
      for (const email of cleanedEmails) {
        const isFromLocal = generatedList.some(
          (g) => g.email.trim().toLowerCase() === email.toLowerCase()
        );
        const isFromGenerator = isFromLocal || (await verifyUserGeneratedEmail(email, currentUser.uid));
        if (!isFromGenerator) {
          setInputError(`Gagal kirim: Akun "${email}" bukan hasil generate akun Anda. Freelancer WAJIB menyetorkan akun dari hasil generate masing-masing!`);
          showToast(
            'error',
            'Wajib Hasil Generate Sendiri',
            `Akun "${email}" bukan hasil generate akun Anda! Freelancer wajib menyetorkan akun dari hasil generate masing-masing.`
          );
          setSubmitting(false);
          return;
        }
      }

      const now = new Date().toISOString();
      for (const email of cleanedEmails) {
        await addDoc(collection(db, 'submissions'), {
          userId: currentUser.uid,
          userEmail: currentUser.email || '',
          userName: userProfile?.displayName || 'Freelancer',
          dataContent: email,
          rewardAmount: activePrice,
          status: 'Pending',
          passwordUsed: selectedPassword,
          createdAt: now,
          adminNotes: `PW: ${selectedPassword}`,
        });
      }

      setRecentlySubmittedEmails((prev) => {
        const next = new Set(prev);
        cleanedEmails.forEach((e) => next.add(e.toLowerCase()));
        return next;
      });

      notifyDataChange('storan');
      showToast(
        'success',
        'Storan Berhasil Dikirim',
        `${cleanedEmails.length} akun Gmail berhasil dikirim dengan password ${selectedPassword}.`
      );
      setInputData('');
      setInputError('');
    } catch (err: unknown) {
      console.warn('Submission submit err:', err);
      showToast('error', 'Gagal Mengirim', 'Terjadi kendala saat menyimpan data ke database.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectPassword = (pw: string) => {
    setSelectedPassword(pw);
    setIsPwDropdownOpen(false);
    showToast('info', 'Password Terpilih', `Password: ${pw}`);
  };

  const otherPasswords = availablePasswords.filter((p) => p !== selectedPassword);

  return (
    <div className="space-y-4 max-w-3xl mx-auto select-none pb-20">
      {/* NOTIFIKASI STOR DIBUKA / DITUTUP */}
      <div
        className={`p-3.5 sm:p-4 rounded-[22px] border flex items-start gap-3 transition ${
          settings.storanOpen
            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
            : 'bg-amber-50/80 border-amber-200 text-amber-950'
        }`}
      >
        <div
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
            settings.storanOpen
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-amber-100 text-amber-600'
          }`}
        >
          <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs sm:text-sm font-black tracking-tight">
            {settings.storanOpen ? 'Storan Sedang DIBUKA' : 'Storan sedang ditutup'}
          </h3>
          <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">
            {settings.storanOpen
              ? `Jadwal: ${settings.storanSchedule || 'Senin - Jumat, 07.00 - 17.00 WIB'}`
              : settings.storanClosedReason ||
                'OPEN 9 OKTOBER ( Bisa Berubah ) more info di saluran'}
          </p>
        </div>
      </div>

      {/* CARD SYARAT & KETENTUAN SEPERTI DI BERANDA */}
      <button
        type="button"
        onClick={() => setShowTermsModal(true)}
        className="w-full bg-white rounded-[24px] p-4 shadow-sm border border-blue-100/50 flex items-center justify-between hover:border-blue-200 active:scale-98 transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0 border border-blue-100/60">
            <Scale className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#102033]">
              Syarat &amp; Ketentuan
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pilihan password: {availablePasswords.join(' & ')}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
      </button>

      {/* CARD UTAMA STOR */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] p-4 sm:p-6 sm:p-7 shadow-sm border border-blue-100/60 space-y-4">
        {/* JUDUL STOR */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Setor Daftar Gmail
          </h2>
        </div>

        {/* GENERATED GMAIL SECTION */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Generated Gmail</span>
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="text-slate-500">
                Total: {totalGenerated} &bull; Belum distor: <strong className="text-slate-900">{totalBelumDistor}</strong>
              </span>
            </div>
          </div>

          {/* Generator Disabled Alert */}
          {settings.generatorOpen === false && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <span>Fitur Generate Gmail sedang dinonaktifkan sementara oleh Admin.</span>
            </div>
          )}

          {/* Admin Stock Empty Alert */}
          {settings.generatorOpen !== false && availableStock.length === 0 && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
              <span>Stok akun generator dari Admin saat ini sedang kosong. Freelancer hanya dapat mengambil akun jika admin telah mengisi stok.</span>
            </div>
          )}

          {/* Input Menentukan Jumlah Generate */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block">
                Tentukan Jumlah Akun yang Di-generate:
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Maksimal generate: <strong>{maxAdminLimit} akun/hari</strong>. Sisa kuota Anda: <strong>{remainingQuota} akun</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setGenerateCount((prev) => Math.max(1, prev - 1))}
                  disabled={generateCount <= 1}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-40 transition cursor-pointer"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, remainingQuota)}
                  value={generateCount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) {
                      setGenerateCount(Math.max(1, Math.min(Math.max(1, remainingQuota), val)));
                    }
                  }}
                  className="w-12 text-center font-mono font-black text-xs sm:text-sm text-blue-700 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setGenerateCount((prev) => Math.min(Math.max(1, remainingQuota), prev + 1))}
                  disabled={generateCount >= Math.max(1, remainingQuota)}
                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs disabled:opacity-40 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* LIST GMAIL HASIL GENERATE */}
          {generatedList.length === 0 ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 font-medium">
              Belum ada akun hasil generate. Klik &quot;Generate&quot; untuk mengambil akun dari stok admin.
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {generatedList.map((item) => {
                const clean = item.email.trim().toLowerCase();
                const isSubmitted = submittedEmailsSet.has(clean);
                const isCopied = copiedItemId === item.id;
                const expiryInfo = getStoredAccountRemainingHours(item.email, submissions, item.generatedAt);
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl px-3.5 py-2.5 border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                      isSubmitted
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : 'bg-slate-50 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
                      <span
                        className={`font-mono text-xs sm:text-sm font-bold truncate ${
                          isSubmitted ? 'text-emerald-950 line-through opacity-75' : 'text-slate-900'
                        }`}
                      >
                        {item.email}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide shrink-0 transition-colors ${
                          isSubmitted
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-200 text-slate-700 border border-slate-300'
                        }`}
                        title={
                          isSubmitted
                            ? 'Akun sudah distorkan. Riwayat generate hilang dalam 24 jam setelah stor.'
                            : 'Akun belum distorkan. Otomatis hilang setelah 3 hari.'
                        }
                      >
                        {isSubmitted
                          ? `di STOR ${expiryInfo ? `(${expiryInfo.text})` : ''}`
                          : `belum di STOR ${expiryInfo ? `(${expiryInfo.text})` : ''}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {!isSubmitted && (
                        <button
                          type="button"
                          onClick={() => handleUseEmailForStoran(item.email)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
                          title="Gunakan akun ini untuk stor"
                        >
                          <Send className="w-3 h-3" />
                          <span>Pakai Stor</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopySingle(item.id, item.email)}
                        className={`p-1.5 rounded-lg border transition flex items-center justify-center cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                            : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                        }`}
                        title="Salin Gmail"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGenerated(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus dari daftar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TOMBOL GENERATED GMAIL */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyAllGenerated}
              className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Salin Semua Gmail</span>
            </button>
            <button
              type="button"
              onClick={handleCopyUnsubmittedGenerated}
              className="flex-1 min-w-[160px] py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-xs transition cursor-pointer active:scale-95 text-center border border-blue-200/70 flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-[#1677E8]" />
              <span>Salin Gmail Belum Distor</span>
            </button>
            <button
              type="button"
              disabled={generatingMore || settings.generatorOpen === false || remainingQuota <= 0 || availableStock.length === 0}
              onClick={handleGenerateAccounts}
              className="flex-1 min-w-[130px] py-2 px-3 rounded-xl bg-[#1677E8] hover:bg-[#0D5FC7] text-white font-bold text-xs transition cursor-pointer active:scale-95 text-center shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {generatingMore
                  ? 'Memproses...'
                  : availableStock.length === 0
                  ? 'Stok Admin Kosong'
                  : remainingQuota <= 0
                  ? `Batas Hari Ini (${maxAdminLimit}/${maxAdminLimit})`
                  : hasGeneratedOnce || generatedList.length > 0
                  ? `Generate Lagi (${generateCount} Akun)`
                  : `Generate (${generateCount} Akun)`}
              </span>
            </button>
          </div>
        </div>

        {/* FORM STOR */}
        <form onSubmit={handleDirectSubmit} className="space-y-3.5 pt-2">
          {/* PILIH PASSWORD DENGAN UKURAN AGAK PANJANG, PANAH DI KANAN */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div>
              <span className="text-xs font-black text-slate-800 block">
                Pilih Password:
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {availablePasswords.length > 1
                  ? 'Klik untuk memilih sandi akun storan'
                  : 'Hanya 1 password dibuka admin'}
              </p>
            </div>
            <div className="relative w-full sm:w-80 md:w-96" ref={pwDropdownRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (otherPasswords.length > 0) {
                    setIsPwDropdownOpen((prev) => !prev);
                  }
                }}
                className={`w-full px-4 py-2.5 bg-white border ${
                  isPwDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-300 hover:border-slate-400'
                } rounded-xl shadow-2xs flex items-center justify-between gap-3 font-mono text-xs sm:text-sm font-black text-slate-900 cursor-pointer select-none transition`}
                title="Klik 1 kali untuk membuka/menutup pilihan password"
              >
                <span className="truncate">{selectedPassword}</span>
                {otherPasswords.length > 0 ? (
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-150 shrink-0 ${
                      isPwDropdownOpen ? 'rotate-180 text-blue-600' : ''
                    }`}
                  />
                ) : (
                  <span className="text-[10px] font-sans font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                    Aktif
                  </span>
                )}
              </button>
              {isPwDropdownOpen && otherPasswords.length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white border border-slate-200 rounded-xl shadow-xl p-1 w-full"
                >
                  {otherPasswords.map((pw) => (
                    <button
                      key={pw}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelectPassword(pw);
                      }}
                      className="w-full text-left px-3.5 py-2.5 rounded-lg font-mono text-xs sm:text-sm font-bold text-slate-800 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer flex items-center justify-between"
                    >
                      <span>{pw}</span>
                      <span className="text-[10px] font-sans font-semibold text-slate-400">Pilih password ini</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <textarea
              rows={4}
              value={inputData}
              onChange={(e) => {
                if (!settings.storanOpen) return;
                setInputData(e.target.value);
                setInputError('');
              }}
              disabled={!settings.storanOpen}
              readOnly={!settings.storanOpen}
              placeholder={
                !settings.storanOpen
                  ? 'Storan saat ini sedang ditutup. Tidak dapat mengetik akun Gmail.'
                  : 'contoh1@gmail.com\ncontoh2@gmail.com'
              }
              className={`w-full p-3.5 rounded-2xl border font-mono text-xs sm:text-sm outline-none resize-none transition ${
                !settings.storanOpen
                  ? 'bg-slate-100/90 text-slate-400 border-dashed border-slate-300 cursor-not-allowed select-none'
                  : 'bg-slate-50/70 text-slate-900 border-slate-200 focus:bg-white focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20'
              }`}
              style={{ minHeight: '110px' }}
            />
            {inputError && (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                <span>{inputError}</span>
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
              <div className="space-y-0.5 text-slate-500 font-medium">
                <div className="font-bold text-slate-700">
                  Terdeteksi: {detectedLines.length} baris
                </div>
                <div className="text-[#1677E8] font-bold">
                  Password: <span className="font-mono text-orange-600 font-black">{selectedPassword}</span> &bull; {formatRupiah(activePrice)} Jika di ACC
                </div>
                <div className="text-[11px] text-slate-400">
                  Estimasi pengecekan 24 - 30 jam.
                </div>
              </div>
              <button
                type="submit"
                disabled={
                  !settings.storanOpen ||
                  userProfile?.status === 'suspended' ||
                  detectedLines.length === 0 ||
                  submitting
                }
                className="self-end sm:self-center px-6 py-2.5 rounded-2xl bg-[#1677E8] hover:bg-[#0D5FC7] text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 stroke-[2.4] translate-x-0.5 -translate-y-0.5" />
                <span>{submitting ? 'Mengirim...' : 'Kirim Setoran'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* MODAL SYARAT & KETENTUAN */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Scale className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black">Syarat &amp; Ketentuan Storan</h3>
                    <p className="text-xs text-blue-100">Aturan storan akun Gmail AZGmail</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 space-y-3 overflow-y-auto flex-1 text-xs text-slate-700">
                <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 text-blue-900 font-semibold leading-relaxed">
                  Pilihan password akun yang berlaku:{' '}
                  <strong className="font-mono text-orange-600 font-black">
                    {availablePasswords.join(' atau ')}
                  </strong>
                  . Pastikan akun dapat dibuka tanpa verifikasi 2 langkah (2FA).
                </div>

                <div className="space-y-2">
                  {(settings.rules || [
                    'Password akun Gmail dapat memilih password yang ditentukan admin.',
                    'Akun Gmail harus fresh, aktif, dan dapat login tanpa terhalang 2FA atau verifikasi nomor.',
                    'Dilarang mengaktifkan Verifikasi 2 Langkah (2-Step Verification) yang menghambat admin.',
                    'Kirimkan storan dalam format 1 baris untuk 1 akun Gmail.',
                    'Gunakan fitur "Generate Akun" untuk kombinasi nama yang rapi.',
                    'Dilarang mengirim email fiktif atau akun curian.',
                    'Admin berhak menolak akun yang dinonaktifkan atau salah sandi.',
                  ]).map((rule, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs leading-relaxed font-medium text-slate-800">{rule}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  className="px-5 py-2 rounded-xl bg-[#1677E8] hover:bg-[#0D5FC7] text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
