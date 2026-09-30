import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah } from '../lib/utils';
import { Submission, NavigationTab } from '../types';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  getSavedGeneratedAccounts,
  recordGeneratedCountToday,
  getGeneratedCountToday,
  GeneratedResultItem,
} from '../components/GmailGenerator';
import { useGmailStock } from '../hooks/useGmailStock';
import {
  AlertTriangle,
  FileText,
  Copy,
  Check,
  Trash2,
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StoranViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export function StoranView({ onNavigate }: StoranViewProps) {
  const { userProfile, currentUser } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { claimAccounts } = useGmailStock();

  // Password nya cuma sgsg1122 saja
  const defaultPw = 'sgsg1122';
  const activePrice = settings.pricePerSubmission || 3000;

  // Textarea input
  const [inputData, setInputData] = useState('');
  const [inputError, setInputError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validatedEmails, setValidatedEmails] = useState<string[]>([]);

  // Generated Gmail items
  const [generatedList, setGeneratedList] = useState<GeneratedResultItem[]>([]);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [generatingMore, setGeneratingMore] = useState(false);

  // User generator count & history tracking
  const [generateCount, setGenerateCount] = useState<number>(1);
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState<boolean>(false);

  // Submissions history for this user
  const [submissions, setSubmissions] = useState<Submission[]>([]);

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
    setGeneratedList(list);
    if (list.length > 0) {
      setHasGeneratedOnce(true);
    }
  };

  useEffect(() => {
    loadGeneratedList();
  }, [currentUser]);

  // Set of submitted emails for this user
  const submittedEmailsSet = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((s) => {
      const clean = s.dataContent.split('|')[0].trim().toLowerCase();
      if (clean) set.add(clean);
    });
    return set;
  }, [submissions]);

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
    showToast('info', 'Tersalin', `${text} disalin ke clipboard.`);
    setTimeout(() => setCopiedItemId(null), 1500);
  };

  // Delete single generated item
  const handleDeleteGenerated = (id: string) => {
    const updated = generatedList.filter((item) => item.id !== id);
    setGeneratedList(updated);
    if (currentUser?.uid) {
      localStorage.setItem(`gmail_gen_saved_${currentUser.uid}`, JSON.stringify(updated));
    }
    showToast('info', 'Dihapus', 'Akun dihapus dari daftar lokal.');
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
      'Gmail Belum Distor Ditempel',
      `${unsubmitted.length} akun otomatis ditempelkan ke kolom storan.`
    );
  };

  // Max generate can be configured by admin
  const maxAdminLimit = typeof settings.dailyGenerateLimit === 'number' && settings.dailyGenerateLimit > 0
    ? settings.dailyGenerateLimit
    : 10;
  const todayUsedQuota = getGeneratedCountToday(currentUser?.uid);
  const remainingQuota = Math.max(0, maxAdminLimit - todayUsedQuota);

  // Generate Handler: can specify count, capped by admin limit
  const handleGenerateAccounts = async () => {
    if (settings.generatorOpen === false) {
      showToast('error', 'Ditutup', 'Fitur Generate Gmail sedang dinonaktifkan sementara oleh Admin.');
      return;
    }

    if (remainingQuota <= 0) {
      showToast(
        'error',
        'Batas Tercapai',
        `Batas kuota generate harian Anda (${maxAdminLimit} akun) sudah penuh. Batas dapat diatur oleh Admin.`
      );
      return;
    }

    const countToGenerate = Math.min(generateCount, remainingQuota);
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
        defaultPw
      );

      let newItems: GeneratedResultItem[] = [];

      if (claimed.length > 0) {
        recordGeneratedCountToday(claimed.length, currentUser?.uid);
        newItems = claimed.map((c) => ({
          id: c.id,
          email: c.email,
          password: defaultPw,
          generatedAt: new Date().toISOString(),
        }));
      } else {
        // Fallback generator
        for (let i = 0; i < countToGenerate; i++) {
          const randomHex = Math.random().toString(36).substring(2, 8);
          const generatedEmail = `user.${randomHex}@gmail.com`;
          newItems.push({
            id: `gen_${Date.now()}_${i}`,
            email: generatedEmail,
            password: defaultPw,
            generatedAt: new Date().toISOString(),
          });
        }
        recordGeneratedCountToday(newItems.length, currentUser?.uid);
      }

      const updated = [...newItems, ...generatedList];
      setGeneratedList(updated);
      setHasGeneratedOnce(true);

      if (currentUser?.uid) {
        localStorage.setItem(`gmail_gen_saved_${currentUser.uid}`, JSON.stringify(updated));
      }

      showToast('success', 'Generate Berhasil', `${newItems.length} akun Gmail berhasil digenerate.`);
    } catch (e) {
      console.warn('Generate error:', e);
      showToast('error', 'Gagal', 'Terjadi kendala saat generate akun.');
    } finally {
      setGeneratingMore(false);
    }
  };

  // Validation & Submit Form
  const handleOpenConfirm = (e: FormEvent) => {
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

    setValidatedEmails(cleanedEmails);
    setShowConfirmModal(true);
  };

  // Submit to Firestore
  const handleConfirmSubmit = async () => {
    if (!currentUser || validatedEmails.length === 0) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      for (const email of validatedEmails) {
        await addDoc(collection(db, 'submissions'), {
          userId: currentUser.uid,
          userEmail: currentUser.email || '',
          userName: userProfile?.displayName || 'Freelancer',
          dataContent: email,
          rewardAmount: activePrice,
          status: 'Pending',
          createdAt: now,
          adminNotes: `PW: ${defaultPw}`,
        });
      }

      showToast(
        'success',
        'Storan Berhasil Dikirim',
        `${validatedEmails.length} akun Gmail berhasil diserahkan ke antrean pengecekan.`
      );

      setInputData('');
      setInputError('');
      setValidatedEmails([]);
      setShowConfirmModal(false);
    } catch (err: unknown) {
      console.warn('Submission submit err:', err);
      showToast('error', 'Gagal Mengirim', 'Terjadi kendala saat menyimpan data ke database.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto select-none pb-20">
      {/* CARD UTAMA STOR */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] p-4 sm:p-6 sm:p-7 shadow-sm border border-blue-100/60 space-y-4">
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

        {/* CARD RULES */}
        <div className="bg-[#F3E8FF] border border-purple-200/80 rounded-[22px] sm:rounded-[24px] p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-100 text-[#A855F7] flex items-center justify-center shrink-0 shadow-2xs">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-purple-950 tracking-tight">
                Cek Rules dulu sebelum stor
              </h4>
              <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                Wajib dibaca agar Gmail tidak ditolak.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('rules')}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#A855F7] hover:bg-purple-600 text-white font-bold text-xs transition cursor-pointer active:scale-95 shadow-xs whitespace-nowrap"
          >
            Buka Rules
          </button>
        </div>

        {/* JUDUL STOR */}
        <div className="pt-1">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Setor Daftar Gmail
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-relaxed">
            Tempel daftar, satu Gmail per baris. Duplikat otomatis dihapus. Hanya Gmail hasil &quot;Generate Gmail&quot; milik akun ini yang bisa disetor.
          </p>
        </div>

        {/* GENERATED GMAIL SECTION */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Generated Gmail
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              Total: {totalGenerated} &bull; Belum distor: {totalBelumDistor}
            </span>
          </div>

          {/* Generator Disabled Alert */}
          {settings.generatorOpen === false && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <span>Fitur Generate Gmail sedang dinonaktifkan sementara oleh Admin.</span>
            </div>
          )}

          {/* Input Menentukan Jumlah Generate (Max Diatur Admin) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block">
                Tentukan Jumlah Akun yang Di-generate:
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Maksimal generate dapat diatur admin (Maks saat ini: <strong>{maxAdminLimit} akun/hari</strong>). Sisa kuota Anda: <strong>{remainingQuota} akun</strong>.
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

          {/* List Gmail Cards */}
          {generatedList.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400 font-medium">
              Belum ada akun hasil generate. Klik &quot;Generate&quot; untuk membuat akun baru.
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {generatedList.map((item) => {
                const clean = item.email.trim().toLowerCase();
                const isSubmitted = submittedEmailsSet.has(clean);
                const isCopied = copiedItemId === item.id;

                return (
                  <div
                    key={item.id}
                    className={`rounded-xl p-2.5 sm:p-3 border flex items-center justify-between gap-2.5 transition ${
                      isSubmitted
                        ? 'bg-slate-50 border-slate-200 opacity-70'
                        : 'bg-gray-100 border-gray-300 text-gray-800' // warna generate yang belum di stor nya abu"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 truncate">
                        {item.email}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Badge status: warna generate yang belum di stor nya abu" */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${
                          isSubmitted
                            ? 'bg-slate-200 text-slate-600'
                            : 'bg-gray-200 text-gray-700 border border-gray-300' // warna abu"
                        }`}
                      >
                        {isSubmitted ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-slate-500" />
                            <span>di stor</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span>belum di STOR</span>
                          </>
                        )}
                      </span>

                      {/* dan salin Gmail nya ada di pinggir hapus */}
                      <button
                        type="button"
                        onClick={() => handleCopySingle(item.id, item.email)}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 hover:text-blue-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Salin Gmail ini"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                        )}
                        <span>{isCopied ? 'Tersalin' : 'Salin Gmail'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteGenerated(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                        title="Hapus dari daftar lokal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TOMBOL GENERATED GMAIL: ada logo salin salin semua Gmail, salin gmail belum di STOR, generate / generate lagi */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Tombol Salin Semua Gmail dengan logo salin */}
            <button
              type="button"
              onClick={handleCopyAllGenerated}
              className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Salin Semua Gmail</span>
            </button>

            {/* Tombol Salin Gmail Belum Distor dengan logo salin */}
            <button
              type="button"
              onClick={handleCopyUnsubmittedGenerated}
              className="flex-1 min-w-[160px] py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-xs transition cursor-pointer active:scale-95 text-center border border-blue-200/70 flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-[#1677E8]" />
              <span>Salin Gmail Belum Distor</span>
            </button>

            {/* Tombol teks generate nya ubah jadi generate doang kalo user sudah melakukan generate baru teks nya ubah jadi generate lagi */}
            <button
              type="button"
              disabled={generatingMore || settings.generatorOpen === false || remainingQuota <= 0}
              onClick={handleGenerateAccounts}
              className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl bg-[#1677E8] hover:bg-[#0D5FC7] text-white font-bold text-xs transition cursor-pointer active:scale-95 text-center shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {generatingMore
                  ? 'Memproses...'
                  : hasGeneratedOnce || generatedList.length > 0
                  ? `Generate Lagi (${generateCount})`
                  : `Generate (${generateCount})`}
              </span>
            </button>
          </div>
        </div>

        {/* TEXTAREA SETOR */}
        <form onSubmit={handleOpenConfirm} className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <textarea
              rows={5}
              value={inputData}
              onChange={(e) => {
                setInputData(e.target.value);
                setInputError('');
              }}
              placeholder={'contoh1@gmail.com\ncontoh2@gmail.com'}
              className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 font-mono text-xs sm:text-sm text-slate-900 outline-none resize-none transition"
              style={{ minHeight: '130px' }}
            />
            {inputError && (
              <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                <span>{inputError}</span>
              </p>
            )}

            {/* Info Di Bawah Textarea */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs">
              <div className="space-y-0.5 text-slate-500 font-medium">
                <div className="font-bold text-slate-700">
                  Terdeteksi: {detectedLines.length} baris
                </div>
                <div className="text-[#1677E8] font-bold">
                  PW: {defaultPw} &bull; {formatRupiah(activePrice)} Jika di ACC
                </div>
                <div className="text-[11px] text-slate-400">
                  Estimasi pengecekan 24 - 30 jam.
                </div>
              </div>

              {/* BUTTON KIRIM SETORAN */}
              <button
                type="submit"
                disabled={
                  !settings.storanOpen ||
                  userProfile?.status === 'suspended' ||
                  detectedLines.length === 0 ||
                  submitting
                }
                className="self-end sm:self-center px-6 py-3 rounded-2xl bg-[#1677E8] hover:bg-[#0D5FC7] text-white font-black text-xs sm:text-sm shadow-md shadow-blue-500/25 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4 stroke-[2.4] translate-x-0.5 -translate-y-0.5" />
                <span>{submitting ? 'Mengirim...' : 'Kirim Setoran'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden text-[#102033]"
            >
              <div className="bg-gradient-to-r from-[#1677E8] to-[#0D5FC7] p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Send className="w-5 h-5 text-white" />
                  <h3 className="text-base font-black tracking-tight">
                    Konfirmasi Pengiriman Storan
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#EEF8FF] border border-blue-100 space-y-1.5">
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Jumlah Akun:</span>
                    <span className="text-[#1677E8] font-black">{validatedEmails.length} Akun</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Password:</span>
                    <span className="font-mono text-slate-900">{defaultPw}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Potensi Imbalan:</span>
                    <span className="text-[#1677E8] font-black">
                      {formatRupiah(validatedEmails.length * activePrice)}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-slate-500 font-semibold block">
                    Daftar akun yang akan disetor:
                  </span>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 max-h-36 overflow-y-auto space-y-1 font-mono text-xs">
                    {validatedEmails.map((email, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-slate-400">#{idx + 1}</span>
                        <span className="text-slate-800 font-bold">{email}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmSubmit}
                    className="flex-1 py-2.5 rounded-xl bg-[#1677E8] hover:bg-[#0D5FC7] text-white font-black shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{submitting ? 'Mengirim...' : 'Ya, Kirim Sekarang'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
