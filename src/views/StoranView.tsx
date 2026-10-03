import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah } from '../lib/utils';
import { Submission, NavigationTab } from '../types';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notifyDataChange } from '../lib/syncHelper';
import {
  getSavedGeneratedAccounts,
  recordGeneratedCountToday,
  getGeneratedCountToday,
  verifyUserGeneratedEmail,
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
  Plus,
  Minus,
  KeyRound,
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

  // Dua pilihan password untuk storan & status buka/tutup masing-masing
  const PW1 = settings.storanPassword1 || 'zero1122';
  const PW2 = settings.storanPassword2 || 'prabujaya';
  const pw1Open = settings.storanPassword1Open !== false;
  const pw2Open = settings.storanPassword2Open !== false;

  // 1 Saklar buka/tutup tunggal (terbuka jika master buka dan minimal 1 password buka)
  const isStoranOpen = settings.storanOpen !== false && (pw1Open || pw2Open);

  // User memilih SALAH SATU password saja (default menyesuaikan password yang buka)
  const [selectedPassword, setSelectedPassword] = useState<'zero1122' | 'prabujaya'>(() => {
    if (!pw1Open && pw2Open) return 'prabujaya';
    return 'zero1122';
  });

  // Otomatis sinkronkan password aktif jika salah satu ditutup admin
  useEffect(() => {
    if (!pw1Open && pw2Open && selectedPassword === 'zero1122') {
      setSelectedPassword('prabujaya');
    } else if (pw1Open && !pw2Open && selectedPassword === 'prabujaya') {
      setSelectedPassword('zero1122');
    }
  }, [pw1Open, pw2Open, selectedPassword]);

  const activePrice = settings.pricePerSubmission || 3000;

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

  // Set of submitted emails for this user & timestamp map untuk retensi 1 hari
  const submittedEmailsMap = useMemo(() => {
    const map = new Map<string, number>();
    submissions.forEach((s) => {
      const clean = s.dataContent.split('|')[0].trim().toLowerCase();
      if (clean) {
        const time = new Date(s.createdAt).getTime() || Date.now();
        const prev = map.get(clean) || 0;
        if (time > prev) map.set(clean, time);
      }
    });
    return map;
  }, [submissions]);

  const submittedEmailsSet = useMemo(() => {
    const set = new Set<string>();
    submissions.forEach((s) => {
      const clean = s.dataContent.split('|')[0].trim().toLowerCase();
      if (clean) set.add(clean);
    });
    return set;
  }, [submissions]);

  // Load generated Gmail list dengan aturan masa simpan (retensi):
  // - Belum di stor: disimpan 2 hari (48 jam)
  // - Sudah di stor: disimpan 1 hari (24 jam)
  // - Tidak akan hilang kecuali dihapus manual atau masa retensi habis
  const loadGeneratedList = () => {
    const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000; // 48 jam
    const ONE_DAY_MS = 1 * 24 * 60 * 60 * 1000;  // 24 jam

    const rawList = getSavedGeneratedAccounts(currentUser?.uid);
    if (!rawList || rawList.length === 0) {
      setGeneratedList([]);
      return;
    }

    const now = Date.now();
    let hasExpired = false;

    const filtered = rawList.filter((item) => {
      const clean = item.email.trim().toLowerCase();
      const submittedTime = submittedEmailsMap.get(clean);
      const genTime = item.generatedAt ? new Date(item.generatedAt).getTime() : now;

      if (submittedTime !== undefined) {
        // Sudah di-stor: hilang setelah 1 hari (24 jam)
        const ageSinceSubmit = now - submittedTime;
        const keep = ageSinceSubmit < ONE_DAY_MS;
        if (!keep) hasExpired = true;
        return keep;
      } else {
        // Belum di-stor: tidak akan hilang kecuali dihapus atau sudah 2 hari (48 jam)
        const ageSinceGen = now - genTime;
        const keep = ageSinceGen < TWO_DAYS_MS;
        if (!keep) hasExpired = true;
        return keep;
      }
    });

    setGeneratedList(filtered);
    if (filtered.length > 0) {
      setHasGeneratedOnce(true);
    }

    // Bersihkan storage lokal jika ada akun yang telah melewati masa retensi
    if (hasExpired && currentUser?.uid) {
      try {
        localStorage.setItem(`gmail_gen_saved_${currentUser.uid}`, JSON.stringify(filtered));
      } catch {}
    }
  };

  useEffect(() => {
    loadGeneratedList();
  }, [currentUser, submittedEmailsMap]);

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

  // Max generate limit configured by admin
  const maxAdminLimit = typeof settings.dailyGenerateLimit === 'number' && settings.dailyGenerateLimit > 0
    ? settings.dailyGenerateLimit
    : 10;
  const todayUsedQuota = getGeneratedCountToday(currentUser?.uid);
  const remainingQuota = Math.max(0, maxAdminLimit - todayUsedQuota);

  // Generate accounts
  const handleGenerateAccounts = async () => {
    if (settings.generatorOpen === false) {
      showToast('error', 'Ditutup', 'Fitur Generate Gmail sedang dinonaktifkan sementara oleh Admin.');
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
        selectedPassword
      );

      let newItems: GeneratedResultItem[] = [];
      if (claimed.length > 0) {
        recordGeneratedCountToday(claimed.length, currentUser?.uid);
        newItems = claimed.map((c) => ({
          id: c.id,
          email: c.email,
          password: selectedPassword,
          generatedAt: new Date().toISOString(),
        }));
      } else {
        for (let i = 0; i < countToGenerate; i++) {
          const randomHex = Math.random().toString(36).substring(2, 8);
          const generatedEmail = `user.${randomHex}@gmail.com`;
          newItems.push({
            id: `gen_${Date.now()}_${i}`,
            email: generatedEmail,
            password: selectedPassword,
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
        const allKey = `gmail_gen_all_${currentUser.uid}`;
        try {
          const rawHistory = localStorage.getItem(allKey);
          const historyArr: string[] = rawHistory ? JSON.parse(rawHistory) : [];
          const combined = Array.from(new Set([...historyArr, ...newItems.map((n) => n.email.trim().toLowerCase())]));
          localStorage.setItem(allKey, JSON.stringify(combined));
        } catch {}
      }

      showToast('success', 'Generate Berhasil', `${newItems.length} akun Gmail berhasil digenerate.`);
    } catch (e) {
      console.warn('Generate error:', e);
      showToast('error', 'Gagal', 'Terjadi kendala saat generate akun.');
    } finally {
      setGeneratingMore(false);
    }
  };

  // Validation & Direct Submit Form
  const handleDirectSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setInputError('');

    if (!isStoranOpen) {
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

    // Validasi ketat: User wajib Gmail hasil generate akunnya sendiri
    setSubmitting(true);
    try {
      for (const email of cleanedEmails) {
        const isFromGenerator = await verifyUserGeneratedEmail(email, currentUser.uid);
        if (!isFromGenerator) {
          setInputError(`Gagal kirim: Akun "${email}" bukan hasil generate akun Anda. Nama email tidak sesuai!`);
          showToast(
            'error',
            'Nama Tidak Sesuai',
            `Akun ${email} bukan hasil generate Anda! Nama email tidak sesuai.`
          );
          setSubmitting(false);
          return;
        }
      }

      // Langsung kirim dengan password yang dipilih user (1 baris)
      const now = new Date().toISOString();
      for (const email of cleanedEmails) {
        await addDoc(collection(db, 'submissions'), {
          userId: currentUser.uid,
          userEmail: currentUser.email || '',
          userName: userProfile?.displayName || 'Freelancer',
          dataContent: email,
          rewardAmount: activePrice,
          status: 'Pending',
          storanPassword: selectedPassword,
          createdAt: now,
          adminNotes: `PW: ${selectedPassword}`,
        });
      }

      // Beritahu admin secara realtime
      notifyDataChange('storan');
      showToast(
        'success',
        'Storan Berhasil Dikirim',
        `${cleanedEmails.length} akun Gmail berhasil dikirim ke antrean pengecekan.`
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

  return (
    <div className="space-y-4 max-w-3xl mx-auto select-none pb-20">
      {/* CARD UTAMA STOR */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] p-4 sm:p-6 sm:p-7 shadow-sm border border-blue-100/60 space-y-4">
        {/* NOTIFIKASI 1 SAKLAR STOR BUKA / TUTUP */}
        <div
          className={`p-3.5 sm:p-4 rounded-[22px] border flex items-start gap-3 transition ${
            isStoranOpen
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/80 border-amber-200 text-amber-950'
          }`}
        >
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isStoranOpen
                ? 'bg-emerald-100 text-emerald-600'
                : 'bg-amber-100 text-amber-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs sm:text-sm font-black tracking-tight">
              {isStoranOpen
                ? 'Storan Sedang DIBUKA (Pilihan Password: zero1122 & prabujaya)'
                : 'Layanan Storan Sedang DITUTUP oleh Admin'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-600 font-medium mt-0.5 leading-relaxed">
              {isStoranOpen
                ? `Jadwal: ${settings.storanSchedule || 'Senin - Jumat, 07.00 - 17.00 WIB'}`
                : settings.storanClosedReason ||
                  'Admin sedang menutup penerimaan storan baru. Silakan kembali pada jam operasional.'}
            </p>
          </div>
        </div>

        {/* JUDUL STOR & BUKA ATURAN DI PINGGIR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Setor Daftar Gmail
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1 leading-relaxed">
              Tempel daftar, satu Gmail per baris. Hanya Gmail hasil &quot;Generate Gmail&quot; milik akun ini yang bisa disetor.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('rules')}
            className="self-start sm:self-center px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-[#A855F7] hover:text-purple-700 font-bold text-xs border border-purple-200 transition cursor-pointer active:scale-95 shadow-2xs flex items-center gap-1.5 whitespace-nowrap shrink-0"
            title="Cek Rules dulu sebelum stor"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Buka Rules</span>
          </button>
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

          {settings.generatorOpen === false && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <span>Fitur Generate Gmail sedang dinonaktifkan sementara oleh Admin.</span>
            </div>
          )}

          {/* Input Menentukan Jumlah Generate */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-xs font-bold text-slate-800 block">
                Tentukan Jumlah Akun yang Di-generate:
              </label>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                Batas saat ini: <strong>{maxAdminLimit} akun/hari</strong>. Sisa kuota Anda: <strong>{remainingQuota} akun</strong>.
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
                    className={`rounded-xl px-2.5 py-2 border flex items-center justify-between gap-2 transition ${
                      isSubmitted
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-2xs'
                        : 'bg-slate-100 border-slate-300 text-slate-800'
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-1">
                      <span
                        className={`font-mono text-[11px] sm:text-xs font-bold select-all break-all leading-tight block ${
                          isSubmitted ? 'text-emerald-950' : 'text-slate-800'
                        }`}
                      >
                        {item.email}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide inline-flex items-center gap-0.5 border ${
                          isSubmitted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-slate-200 text-slate-700 border-slate-300'
                        }`}
                      >
                        {isSubmitted ? (
                          <>
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Sudah Distor</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-2.5 h-2.5 text-slate-500" />
                            <span>Belum Distor</span>
                          </>
                        )}
                      </span>

                      {/* Tombol Salin Hanya Logo Saja */}
                      <button
                        type="button"
                        onClick={() => handleCopySingle(item.id, item.email)}
                        className={`p-1.5 rounded-lg border transition cursor-pointer active:scale-90 ${
                          isCopied
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                            : isSubmitted
                            ? 'bg-white hover:bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-white hover:bg-slate-200 border-slate-300 text-slate-700'
                        }`}
                        title={isCopied ? 'Tersalin' : 'Salin alamat Gmail ini'}
                        aria-label="Salin Gmail"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 stroke-[2.2]" />
                        )}
                      </button>

                      {/* Tombol Hapus Logo Saja */}
                      <button
                        type="button"
                        onClick={() => handleDeleteGenerated(item.id)}
                        className={`p-1.5 rounded-lg transition cursor-pointer active:scale-90 ${
                          isSubmitted
                            ? 'text-emerald-700 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title="Hapus dari daftar lokal"
                        aria-label="Hapus Gmail"
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tombol Generated Gmail */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyAllGenerated}
              className="flex-1 min-w-[140px] py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer active:scale-95 text-center flex items-center justify-center gap-1.5 border border-slate-200"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Salin Semua Gmail</span>
            </button>
            <button
              type="button"
              onClick={handleCopyUnsubmittedGenerated}
              className="flex-1 min-w-[160px] py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-xs transition cursor-pointer active:scale-95 text-center border border-blue-200/70 flex items-center justify-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5 text-[#1677E8]" />
              <span>Salin Gmail Belum Distor</span>
            </button>
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

        {/* PEMILIHAN PASSWORD STOR - TIDAK TERPOTONG DI MOBILE MAUPUN DESKTOP */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/90 border border-blue-200/80 shadow-2xs space-y-2.5">
          {/* Header Baris Password: Judul di kiri, Salin PW di kanan */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <KeyRound className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-black text-slate-900 truncate">
                Pilihan Password Storan
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                Aktif: <strong className="font-mono text-blue-700">{selectedPassword}</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedPassword);
                  showToast('info', 'Tersalin', `Password ${selectedPassword} disalin ke clipboard.`);
                }}
                className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 transition flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
                title={`Salin password aktif: ${selectedPassword}`}
              >
                <Copy className="w-3 h-3 text-slate-500" />
                <span>Salin PW</span>
              </button>
            </div>
          </div>

          {/* Tombol Pilihan Password: Grid 2 Kolom Penuh (Tidak Akan Terpotong di Layar Mobile) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-white/90 border border-slate-200 rounded-xl shadow-2xs">
            <button
              type="button"
              disabled={!pw1Open}
              onClick={() => pw1Open && setSelectedPassword('zero1122')}
              className={`py-2 px-2.5 rounded-lg font-mono font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 text-center min-w-0 truncate active:scale-98 ${
                !pw1Open
                  ? 'opacity-40 bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                  : selectedPassword === 'zero1122'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-blue-700 hover:bg-slate-50'
              }`}
              title={pw1Open ? 'Pilih password zero1122' : 'Password zero1122 sedang ditutup oleh Admin'}
            >
              <span className="truncate">{PW1}</span>
              {!pw1Open ? (
                <span className="text-[9px] font-sans font-bold text-rose-500 shrink-0">(Tutup)</span>
              ) : selectedPassword === 'zero1122' ? (
                <Check className="w-3.5 h-3.5 text-white stroke-[2.5] shrink-0" />
              ) : null}
            </button>

            <button
              type="button"
              disabled={!pw2Open}
              onClick={() => pw2Open && setSelectedPassword('prabujaya')}
              className={`py-2 px-2.5 rounded-lg font-mono font-black text-xs transition cursor-pointer flex items-center justify-center gap-1.5 text-center min-w-0 truncate active:scale-98 ${
                !pw2Open
                  ? 'opacity-40 bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                  : selectedPassword === 'prabujaya'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-indigo-700 hover:bg-slate-50'
              }`}
              title={pw2Open ? 'Pilih password prabujaya' : 'Password prabujaya sedang ditutup oleh Admin'}
            >
              <span className="truncate">{PW2}</span>
              {!pw2Open ? (
                <span className="text-[9px] font-sans font-bold text-rose-500 shrink-0">(Tutup)</span>
              ) : selectedPassword === 'prabujaya' ? (
                <Check className="w-3.5 h-3.5 text-white stroke-[2.5] shrink-0" />
              ) : null}
            </button>
          </div>
        </div>

        {/* TEXTAREA SETOR */}
        <form onSubmit={handleDirectSubmit} className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <textarea
              rows={5}
              value={inputData}
              onChange={(e) => {
                if (!isStoranOpen) return;
                setInputData(e.target.value);
                setInputError('');
              }}
              disabled={!isStoranOpen}
              readOnly={!isStoranOpen}
              placeholder={
                !isStoranOpen
                  ? 'Storan saat ini sedang ditutup. Tidak dapat mengetik akun Gmail.'
                  : `contoh1@gmail.com\ncontoh2@gmail.com`
              }
              className={`w-full p-4 rounded-2xl border font-mono text-xs sm:text-sm outline-none resize-none transition ${
                !isStoranOpen
                  ? 'bg-slate-100/90 text-slate-400 border-dashed border-slate-300 cursor-not-allowed select-none'
                  : 'bg-slate-50/70 text-slate-900 border-slate-200 focus:bg-white focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20'
              }`}
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
                <div className="text-[#1677E8] font-bold flex items-center gap-1.5">
                  <span>PW Terpilih: <strong className="font-mono bg-blue-100/70 text-blue-900 px-1.5 py-0.2 rounded">{selectedPassword}</strong></span>
                  <span>&bull;</span>
                  <span>{formatRupiah(activePrice)} Jika di ACC</span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Estimasi pengecekan 24 - 30 jam.
                </div>
              </div>

              {/* BUTTON KIRIM SETORAN */}
              <button
                type="submit"
                disabled={
                  !isStoranOpen ||
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
    </div>
  );
}
