import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useGmailStock } from '../hooks/useGmailStock';
import { useAuth } from '../context/AuthContext';
import { AZGmailLogo } from './GmailLogo';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Copy,
  Check,
  Mail,
  Lock,
  MessageCircle,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Trash2,
  Send,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GmailGeneratorProps {
  onOpenContactAdmin?: () => void;
  submittedEmails?: string[];
  userSubmissions?: { dataContent: string; createdAt: string }[];
  onSelectEmailForStoran?: (email: string) => void;
  embedded?: boolean;
}

export interface GeneratedResultItem {
  id: string;
  email: string;
  password: string;
  generatedAt?: string;
}

export function checkIsEmailGenerated(email: string, userId?: string): boolean {
  if (!email || !userId) return false;
  const rawTarget = email.trim().toLowerCase();
  const normalizedTarget = rawTarget.includes('@') ? rawTarget : `${rawTarget}@gmail.com`;
  const targetPrefix = normalizedTarget.split('@')[0];

  const activeKey = `gmail_gen_saved_${userId}`;
  try {
    const raw = localStorage.getItem(activeKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.some((item: any) => {
          const itemEmail = (item.email || '').trim().toLowerCase();
          return itemEmail === normalizedTarget || itemEmail.split('@')[0] === targetPrefix;
        })
      ) {
        return true;
      }
    }
  } catch {}

  const historyKey = `gmail_gen_all_${userId}`;
  try {
    const raw = localStorage.getItem(historyKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.some((e: string) => {
          const itemEmail = (e || '').trim().toLowerCase();
          return itemEmail === normalizedTarget || itemEmail.split('@')[0] === targetPrefix;
        })
      ) {
        return true;
      }
    }
  } catch {}

  return false;
}

export async function verifyUserGeneratedEmail(email: string, userId?: string): Promise<boolean> {
  if (!email || !userId) return false;
  const rawTarget = email.trim().toLowerCase();
  const normalizedTarget = rawTarget.includes('@') ? rawTarget : `${rawTarget}@gmail.com`;
  const targetPrefix = normalizedTarget.split('@')[0];

  if (checkIsEmailGenerated(normalizedTarget, userId)) {
    return true;
  }

  try {
    const userDocSnap = await getDoc(doc(db, 'users', userId));
    if (userDocSnap.exists()) {
      const uData = userDocSnap.data();
      const list: string[] = Array.isArray(uData?.generatedEmails) ? uData.generatedEmails : [];
      const match = list.some((e) => {
        const itemEmail = (e || '').trim().toLowerCase();
        return itemEmail === normalizedTarget || itemEmail.split('@')[0] === targetPrefix;
      });
      if (match) {
        try {
          const historyKey = `gmail_gen_all_${userId}`;
          const existingRaw = localStorage.getItem(historyKey);
          const existing: string[] = existingRaw ? JSON.parse(existingRaw) : [];
          if (!existing.includes(normalizedTarget)) {
            existing.push(normalizedTarget);
            localStorage.setItem(historyKey, JSON.stringify(existing));
          }
        } catch {}
        return true;
      }
    }
  } catch (errUser) {
    console.warn('Gagal verifikasi dari user profile:', errUser);
  }

  try {
    const q = query(
      collection(db, 'gmail_stock'),
      where('claimedBy', '==', userId)
    );
    const snap = await getDocs(q);
    const matched = snap.docs.some((docSnap) => {
      const docEmail = (docSnap.data().email || '').trim().toLowerCase();
      return docEmail === normalizedTarget || docEmail.split('@')[0] === targetPrefix;
    });
    if (matched) {
      try {
        const historyKey = `gmail_gen_all_${userId}`;
        const existingRaw = localStorage.getItem(historyKey);
        const existing: string[] = existingRaw ? JSON.parse(existingRaw) : [];
        if (!existing.includes(normalizedTarget)) {
          existing.push(normalizedTarget);
          localStorage.setItem(historyKey, JSON.stringify(existing));
        }
      } catch {}
      return true;
    }
  } catch (err) {
    console.warn('Gagal verifikasi email generate di database Firestore:', err);
  }

  try {
    const emailKey = normalizedTarget.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const claimedSnap = await getDoc(doc(db, 'claimed_emails', emailKey));
    if (claimedSnap.exists()) {
      const cData = claimedSnap.data();
      if (cData.claimedBy === userId) {
        return true;
      } else {
        return false;
      }
    }
  } catch (errClaimed) {
    console.warn('Gagal cek claimed_emails:', errClaimed);
  }

  return false;
}

export function filterExpiredStoredAccounts(
  accounts: GeneratedResultItem[],
  submissions: { dataContent: string; createdAt: string }[]
): GeneratedResultItem[] {
  if (!Array.isArray(accounts)) return [];
  const now = Date.now();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const submissionTimeMap = new Map<string, number>();

  if (Array.isArray(submissions)) {
    submissions.forEach((sub) => {
      const email = (sub.dataContent || '').split('|')[0].trim().toLowerCase();
      const time = new Date(sub.createdAt).getTime();
      if (!isNaN(time) && email) {
        const prev = submissionTimeMap.get(email);
        if (!prev || time > prev) {
          submissionTimeMap.set(email, time);
        }
      }
    });
  }

  return accounts.filter((item) => {
    const cleanEmail = (item.email || '').trim().toLowerCase();
    const submittedTime = submissionTimeMap.get(cleanEmail);
    if (!submittedTime) {
      return true;
    }
    const elapsed = now - submittedTime;
    return elapsed < TWENTY_FOUR_HOURS_MS;
  });
}

export function getStoredAccountRemainingHours(
  email: string,
  submissions: { dataContent: string; createdAt: string }[]
): number | null {
  const cleanEmail = email.trim().toLowerCase();
  let latestTime: number | null = null;

  if (Array.isArray(submissions)) {
    submissions.forEach((sub) => {
      const subEmail = (sub.dataContent || '').split('|')[0].trim().toLowerCase();
      if (subEmail === cleanEmail) {
        const t = new Date(sub.createdAt).getTime();
        if (!isNaN(t) && (latestTime === null || t > latestTime)) {
          latestTime = t;
        }
      }
    });
  }

  if (latestTime === null) return null;
  const elapsed = Date.now() - latestTime;
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  const remainingMs = TWENTY_FOUR_HOURS_MS - elapsed;
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / (60 * 60 * 1000));
}

export function getSavedGeneratedAccounts(userId?: string): GeneratedResultItem[] {
  const activeKey = userId ? `gmail_gen_saved_${userId}` : 'gmail_gen_saved_guest';
  try {
    const raw = localStorage.getItem(activeKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function getTodayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getGeneratedCountToday(userId?: string): number {
  try {
    const key = `gmail_gen_daily_${userId || 'guest'}_${getTodayDateKey()}`;
    const raw = localStorage.getItem(key);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch {
    return 0;
  }
}

export function recordGeneratedCountToday(count: number, userId?: string) {
  try {
    const key = `gmail_gen_daily_${userId || 'guest'}_${getTodayDateKey()}`;
    const current = getGeneratedCountToday(userId);
    localStorage.setItem(key, String(current + count));
  } catch (e) {
    console.warn('Gagal mencatat kuota generate hari ini:', e);
  }
}

export function GmailGenerator({
  onOpenContactAdmin,
  submittedEmails = [],
  userSubmissions = [],
  onSelectEmailForStoran,
  embedded = false,
}: GmailGeneratorProps) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const { claimAccounts } = useGmailStock();
  const [count, setCount] = useState<number>(1);
  const [generating, setGenerating] = useState<boolean>(false);
  const [results, setResults] = useState<GeneratedResultItem[]>([]);
  const [copiedItem, setCopiedItem] = useState<{ id: string; type: string } | null>(null);
  const [, setCopiedAll] = useState<boolean>(false);
  const [todayGenerated, setTodayGenerated] = useState<number>(() =>
    getGeneratedCountToday(currentUser?.uid)
  );

  const activePassword = settings.gmailDefaultPassword || settings.password1Name || 'zero1122';
  const isFeatureOpen = settings.generatorOpen !== false;
  const dailyLimit =
    typeof settings.dailyGenerateLimit === 'number' && settings.dailyGenerateLimit > 0
      ? settings.dailyGenerateLimit
      : 10;
  const remainingQuota = Math.max(0, dailyLimit - todayGenerated);

  const storageKey = currentUser?.uid
    ? `gmail_gen_saved_${currentUser.uid}`
    : 'gmail_gen_saved_guest';
  const historyKey = currentUser?.uid
    ? `gmail_gen_all_${currentUser.uid}`
    : 'gmail_gen_all_guest';

  useEffect(() => {
    setTodayGenerated(getGeneratedCountToday(currentUser?.uid));
  }, [currentUser?.uid]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: GeneratedResultItem[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = filterExpiredStoredAccounts(parsed, userSubmissions);
          setResults(valid);
          localStorage.setItem(storageKey, JSON.stringify(valid));
        }
      }
    } catch (e) {
      console.warn('Gagal memuat akun yang tersimpan:', e);
    }
  }, [storageKey, userSubmissions]);

  const handleAdjustCount = (newCount: number) => {
    const maxAllowed = Math.max(1, Math.min(25, remainingQuota > 0 ? remainingQuota : 1));
    const clamped = Math.max(1, Math.min(maxAllowed, newCount));
    setCount(clamped);
  };

  const handleGenerate = async () => {
    if (!isFeatureOpen) {
      showToast('warning', 'Fitur Ditutup', 'Fitur generator saat ini ditutup oleh admin.');
      return;
    }
    if (remainingQuota <= 0) {
      showToast(
        'warning',
        'Batas Kuota Tercapai',
        `Anda telah mencapai batas maksimal generate (${dailyLimit} akun/hari). Kuota akan direset otomatis besok.`
      );
      return;
    }
    if (count > remainingQuota) {
      showToast(
        'warning',
        'Melebihi Sisa Kuota',
        `Sisa kuota generate Anda hari ini tinggal ${remainingQuota} akun. Silakan kurangi jumlah generate.`
      );
      return;
    }

    setGenerating(true);
    try {
      const claimed = await claimAccounts(
        count,
        currentUser?.uid,
        currentUser?.displayName || 'Freelancer',
        currentUser?.email || '',
        activePassword
      );

      const mapped: GeneratedResultItem[] = claimed.map((item) => ({
        id: item.id,
        email: item.email,
        password: item.password || activePassword,
        generatedAt: new Date().toISOString(),
      }));

      recordGeneratedCountToday(mapped.length, currentUser?.uid);
      setTodayGenerated((prev) => prev + mapped.length);

      try {
        const existingAllRaw = localStorage.getItem(historyKey);
        const existingAll: string[] = existingAllRaw ? JSON.parse(existingAllRaw) : [];
        const newEmails = mapped.map((m) => m.email.toLowerCase().trim());
        const combinedAll = Array.from(new Set([...existingAll, ...newEmails]));
        localStorage.setItem(historyKey, JSON.stringify(combinedAll));

        if (currentUser?.uid) {
          const userRef = doc(db, 'users', currentUser.uid);
          await updateDoc(userRef, {
            generatedEmails: arrayUnion(...newEmails),
          });
        }
      } catch (errHistory) {
        console.warn('Gagal simpan riwayat generator:', errHistory);
      }

      setResults((prev) => {
        const existingEmails = new Set(prev.map((r) => r.email.toLowerCase()));
        const newUnique = mapped.filter((m) => !existingEmails.has(m.email.toLowerCase()));
        const updated = filterExpiredStoredAccounts(
          [...prev, ...newUnique],
          userSubmissions
        );
        try {
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {
          console.warn('Gagal menyimpan ke localStorage:', e);
        }
        return updated;
      });

      showToast(
        'success',
        'Akun Berhasil Digenerate',
        `Berhasil mengambil ${mapped.length} akun Gmail dari stok. Akun tersimpan otomatis dan siap disetorkan.`
      );
    } catch (err: unknown) {
      showToast('error', 'Gagal Generate', err instanceof Error ? err.message : String(err));
    } finally {
      setGenerating(false);
    }
  };

  const handleClearResults = () => {
    setResults([]);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn(e);
    }
    showToast('info', 'Dibersihkan', 'Daftar akun yang digenerate telah dikosongkan.');
  };

  const handleCopyText = (text: string, id: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem({ id, type });
    showToast('info', 'Tersalin', `${type} berhasil disalin ke clipboard.`);
    setTimeout(() => setCopiedItem(null), 1800);
  };

  const handleCopyAll = (mode: 'email_only' | 'email_pass') => {
    if (results.length === 0) return;
    const text = results
      .map((r) => (mode === 'email_only' ? r.email : `${r.email}|${r.password}`))
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    showToast(
      'success',
      'Semua Disalin',
      `${results.length} akun berhasil disalin (${mode === 'email_only' ? 'Email saja' : 'Email & PW'}).`
    );
    setTimeout(() => setCopiedAll(false), 2000);
  };

  if (!isFeatureOpen) {
    return (
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <AZGmailLogo className="w-3.5 h-3.5" />
              <span>Generator Akun Gmail</span>
            </h3>
            <span className="text-[10px] font-semibold px-2 py-0.2 rounded-md bg-rose-100 text-rose-700">
              Fitur Sedang Ditutup Admin
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-600 leading-relaxed space-y-1">
          <p>
            Fitur generator nama Gmail saat ini sedang ditutup oleh admin.
          </p>
        </div>
        {onOpenContactAdmin && (
          <button
            type="button"
            onClick={onOpenContactAdmin}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tanya Admin via WhatsApp</span>
          </button>
        )}
      </div>
    );
  }

  const hasGeneratedBefore = todayGenerated > 0 || results.length > 0;

  return (
    <div className={embedded ? 'space-y-3.5' : 'bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-blue-100 shadow-2xs space-y-3.5'}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center shrink-0 p-1 overflow-hidden">
            <AZGmailLogo className="w-full h-full" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-1.5">
              <span>Generator Akun Gmail</span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60">
                Rp 3.000 / Akun
              </span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Generate nama akun otomatis untuk disetorkan pada form STOR Gmail
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <div
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 ${
              remainingQuota > 0
                ? 'bg-blue-50 border-blue-200 text-blue-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
            title={`Batas generate per hari: ${dailyLimit} akun/hari`}
          >
            <span>Kuota Hari Ini: {todayGenerated}/{dailyLimit}</span>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-slate-50 to-blue-50/40 border border-slate-200/80 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="block text-xs font-black text-slate-800">
              Pilih Jumlah Akun yang Ingin Digenerate:
            </label>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
              Sisa kuota Anda hari ini: <strong className={remainingQuota > 0 ? 'text-blue-600 font-bold' : 'text-rose-600 font-bold'}>{remainingQuota} akun</strong> (Batas max: {dailyLimit}/hari)
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleAdjustCount(count - 1)}
              disabled={count <= 1 || remainingQuota <= 0}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold transition shadow-2xs cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              min={1}
              max={Math.max(1, remainingQuota)}
              disabled={remainingQuota <= 0}
              value={count}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) handleAdjustCount(val);
              }}
              className="w-14 h-7 text-center font-mono font-black text-xs sm:text-sm text-blue-700 bg-white border border-blue-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 disabled:text-slate-400"
            />
            <button
              type="button"
              onClick={() => handleAdjustCount(count + 1)}
              disabled={count >= Math.max(1, Math.min(25, remainingQuota)) || remainingQuota <= 0}
              className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {remainingQuota <= 0 && (
          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Batas kuota generate harian Anda ({dailyLimit} akun) telah tercapai hari ini. Kuota akan direset otomatis setiap hari (24 jam).
            </span>
          </div>
        )}

        {remainingQuota > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mr-1">Preset:</span>
            {[1, 5, 10, 15, 20, 25]
              .filter((num) => num <= remainingQuota)
              .map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCount(num)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    count === num
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {num}
                </button>
              ))}
          </div>
        )}

        <div className="pt-1.5 flex flex-col sm:flex-row items-center gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || remainingQuota <= 0}
            className="w-full sm:flex-1 py-2.5 px-3.5 bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 text-white font-black rounded-lg sm:rounded-xl text-xs sm:text-sm shadow-sm shadow-blue-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {generating ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {remainingQuota <= 0
                ? `Batas Kuota Hari Ini Tercapai (${dailyLimit}/${dailyLimit})`
                : hasGeneratedBefore
                ? `Generate Lagi (${count} Akun)`
                : `Generate (${count} Akun)`}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 pt-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-100 border border-slate-200 rounded-xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <div>
                  <span className="text-xs font-black text-slate-900 block">
                    {results.length} Akun Belum Disetor (Tersimpan)
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyAll('email_only')}
                  className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-300 transition flex items-center gap-1 shadow-2xs cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin Semua Gmail</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearResults}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Hapus / Kosongkan Daftar Akun"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {results.map((item, idx) => {
                const isEmailCopied =
                  copiedItem?.id === item.id && copiedItem?.type === 'Email';
                const isPasswordCopied =
                  copiedItem?.id === item.id && copiedItem?.type === 'Password';
                const isStored = submittedEmails.some(
                  (submitted) => submitted.trim().toLowerCase() === item.email.trim().toLowerCase()
                );
                const remainingHours = getStoredAccountRemainingHours(item.email, userSubmissions);

                return (
                  <div
                    key={item.id || idx}
                    className={`p-2.5 sm:p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      isStored
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : 'bg-gray-100 border-gray-300 hover:border-gray-400 text-gray-800'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-700 text-[10px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span
                          className={`font-mono text-xs sm:text-sm font-bold break-all flex items-center gap-1.5 ${
                            isStored ? 'line-through text-slate-400' : 'text-gray-900'
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span>{item.email}</span>
                        </span>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-xs font-mono font-bold shadow-2xs"
                          title="Password akun Gmail ini"
                        >
                          <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>PW: {item.password || activePassword}</span>
                        </span>
                        {isStored ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs"
                            title="Akun sudah distorkan. Otomatis terhapus setelah 24 jam."
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>di stor {remainingHours !== null ? `(hapus dlm ${remainingHours}j)` : ''}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-200 text-gray-700 border border-gray-300 shadow-2xs">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span>belum di STOR</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center shrink-0">
                      {!isStored && onSelectEmailForStoran && (
                        <button
                          type="button"
                          onClick={() => onSelectEmailForStoran(item.email)}
                          className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="Gunakan akun ini untuk stor"
                        >
                          <Send className="w-3 h-3" />
                          <span>Pilih Stor</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.email, item.id, 'Email')}
                        className="px-2.5 py-1.5 bg-white hover:bg-gray-50 text-gray-700 hover:text-blue-700 text-xs font-bold rounded-lg border border-gray-300 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Salin Alamat Gmail"
                      >
                        {isEmailCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-gray-500" />
                        )}
                        <span>{isEmailCopied ? 'Tersalin' : 'Salin Gmail'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.password || activePassword, item.id, 'Password')}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-lg border border-amber-200 transition flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Salin Password Akun"
                      >
                        {isPasswordCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-amber-600" />
                        )}
                        <span>{isPasswordCopied ? 'Tersalin' : 'Salin PW'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setResults((prev) => prev.filter((r) => r.id !== item.id));
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                        title="Hapus akun dari daftar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
