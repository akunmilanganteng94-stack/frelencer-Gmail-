import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useGmailStock } from '../hooks/useGmailStock';
import { useAuth } from '../context/AuthContext';
import { GmailLogo, AZGmailLogo } from './GmailLogo';
import {
  Copy,
  Check,
  KeyRound,
  Mail,
  Lock,
  MessageCircle,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  Ban,
  Trash2,
  Send,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GmailGeneratorProps {
  onOpenContactAdmin?: () => void;
  submittedEmails?: string[];
  onSelectEmailForStoran?: (email: string) => void;
}

export interface GeneratedResultItem {
  id: string;
  email: string;
  password: string;
  generatedAt?: string;
}

export function checkIsEmailGenerated(email: string, userId?: string): boolean {
  if (!email) return false;
  const target = email.trim().toLowerCase();
  const activeKey = userId ? `gmail_gen_saved_${userId}` : 'gmail_gen_saved_guest';
  try {
    const raw = localStorage.getItem(activeKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.some((item: any) => (item.email || '').trim().toLowerCase() === target)) {
        return true;
      }
    }
  } catch {}

  const historyKey = userId ? `gmail_gen_all_${userId}` : 'gmail_gen_all_guest';
  try {
    const raw = localStorage.getItem(historyKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.some((e: string) => (e || '').trim().toLowerCase() === target)) {
        return true;
      }
    }
  } catch {}
  return false;
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
  onSelectEmailForStoran,
}: GmailGeneratorProps) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const { availableStock, claimAccounts } = useGmailStock();
  const [count, setCount] = useState<number>(1);
  const [generating, setGenerating] = useState<boolean>(false);
  const [results, setResults] = useState<GeneratedResultItem[]>([]);
  const [copiedItem, setCopiedItem] = useState<{ id: string; type: string } | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);
  const [todayGenerated, setTodayGenerated] = useState<number>(() =>
    getGeneratedCountToday(currentUser?.uid)
  );

  const activePassword = settings.gmailDefaultPassword || 'sgsg1122';
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
          const unsubmitted = parsed.filter(
            (item) =>
              !submittedEmails.some(
                (sub) => sub.trim().toLowerCase() === item.email.trim().toLowerCase()
              )
          );
          setResults(unsubmitted);
          localStorage.setItem(storageKey, JSON.stringify(unsubmitted));
        }
      }
    } catch (e) {
      console.warn('Gagal memuat akun yang tersimpan:', e);
    }
  }, [storageKey, submittedEmails]);

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
    if (availableStock.length === 0) {
      showToast(
        'error',
        'Stok Habis',
        'Stok akun Gmail admin sedang habis. Silakan hubungi admin untuk restock.'
      );
      return;
    }

    setGenerating(true);
    try {
      const claimed = await claimAccounts(count, currentUser?.uid);
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
      } catch (errHistory) {
        console.warn('Gagal simpan riwayat generator:', errHistory);
      }

      setResults((prev) => {
        const existingEmails = new Set(prev.map((r) => r.email.toLowerCase()));
        const newUnique = mapped.filter((m) => !existingEmails.has(m.email.toLowerCase()));
        const updated = [...prev, ...newUnique].filter(
          (item) =>
            !submittedEmails.some(
              (sub) => sub.trim().toLowerCase() === item.email.trim().toLowerCase()
            )
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
        `Berhasil mengambil ${mapped.length} akun Gmail dari stok admin. Akun akan tersimpan otomatis sampai Anda menyetorkannya.`
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
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AZGmailLogo className="w-4 h-4" />
              <span>Generator Akun Gmail (Dari Stok Admin)</span>
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
              Fitur Sedang Ditutup Admin
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-600 leading-relaxed space-y-2">
          <p>
            Ambil nama Gmail dari stok yang sudah disiapkan admin, lalu daftarkan akun Gmail asli memakai nama tersebut sebelum disetorkan pada kolom storan di bagian bawah halaman.
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-700 font-medium">
            <li>Tekan tombol Generate Gmail dan pilih jumlah yang Anda butuhkan.</li>
            <li>Salin nama Gmail satu per satu, atau salin semuanya sekaligus.</li>
            <li>Daftarkan akun Gmail dengan nama tersebut dan password wajib di atas.</li>
            <li>Tempel Gmail yang sudah jadi ke kolom storan di bawah, lalu kirim.</li>
          </ol>
          <p className="font-bold text-orange-600">Password wajib: sgsg1122</p>
        </div>
        {onOpenContactAdmin && (
          <button
            type="button"
            onClick={onOpenContactAdmin}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tanya Admin via WhatsApp</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-indigo-100 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0 p-1.5 overflow-hidden">
            <AZGmailLogo className="w-full h-full" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
              <span>Generator Akun Gmail</span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Stok Admin
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Ambil akun Gmail & password langsung dari stok yang disediakan admin
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
          <div
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              remainingQuota > 0
                ? 'bg-purple-50 border-purple-200 text-purple-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
            title={`Batas generate per hari: ${dailyLimit} akun/hari`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span>Kuota Hari Ini: {todayGenerated}/{dailyLimit}</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-700 space-y-2">
        <p className="font-medium text-slate-800 leading-relaxed">
          Ambil nama Gmail dari stok yang sudah disiapkan admin, lalu daftarkan akun Gmail asli memakai nama tersebut sebelum disetorkan pada kolom storan di bagian bawah halaman.
        </p>
        <ol className="list-decimal list-inside space-y-1 text-slate-600 font-medium">
          <li>Tekan tombol Generate Gmail dan pilih jumlah yang Anda butuhkan.</li>
          <li>Salin nama Gmail satu per satu, atau salin semuanya sekaligus.</li>
          <li>Daftarkan akun Gmail dengan nama tersebut dan password wajib di atas.</li>
          <li>Tempel Gmail yang sudah jadi ke kolom storan di bawah, lalu kirim.</li>
        </ol>
        <div className="pt-0.5 text-xs font-bold text-orange-600">
          Password wajib: sgsg1122
        </div>
      </div>

      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-black text-slate-800">
              Pilih Jumlah Akun yang Ingin Digenerate:
            </label>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Sisa kuota Anda hari ini: <strong className={remainingQuota > 0 ? 'text-indigo-600 font-bold' : 'text-rose-600 font-bold'}>{remainingQuota} akun</strong> (Batas harian: {dailyLimit} akun/hari)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAdjustCount(count - 1)}
              disabled={count <= 1 || remainingQuota <= 0}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold transition shadow-2xs cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
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
              className="w-16 h-8 text-center font-mono font-black text-sm text-indigo-700 bg-white border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:bg-slate-100 disabled:text-slate-400"
            />
            <button
              type="button"
              onClick={() => handleAdjustCount(count + 1)}
              disabled={count >= Math.max(1, Math.min(25, remainingQuota)) || remainingQuota <= 0}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {remainingQuota <= 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Batas kuota generate harian Anda ({dailyLimit} akun) telah tercapai hari ini. Kuota akan direset otomatis setiap hari (24 jam).
            </span>
          </div>
        )}

        {remainingQuota > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Preset cepat:</span>
            {[1, 5, 10, 15, 20, 25]
              .filter((num) => num <= remainingQuota)
              .map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setCount(num)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    count === num
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {num}
                </button>
              ))}
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || availableStock.length === 0 || remainingQuota <= 0}
            className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-black rounded-xl text-sm shadow-md shadow-indigo-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <AZGmailLogo className="w-4 h-4" />
            )}
            <span>
              {remainingQuota <= 0
                ? `Batas Kuota Hari Ini Tercapai (${dailyLimit}/${dailyLimit})`
                : `Generate ${count} Akun Dari Stok`}
            </span>
          </button>
          {availableStock.length === 0 && onOpenContactAdmin && (
            <button
              type="button"
              onClick={onOpenContactAdmin}
              className="w-full sm:w-auto py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs border border-emerald-200 transition flex items-center justify-center gap-1.5 shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
              <span>Minta Admin Restock</span>
            </button>
          )}
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
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-xs font-extrabold text-indigo-950 block">
                    {results.length} Akun Belum Disetor (Tersimpan)
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Tersimpan otomatis saat keluar web, hilang otomatis jika sudah disetor
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleCopyAll('email_only')}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition flex items-center gap-1 shadow-2xs"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin Semua Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyAll('email_pass')}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-2xs"
                >
                  <Copy className="w-3 h-3" />
                  <span>Salin (Email|PW)</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearResults}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  title="Hapus / Kosongkan Daftar Akun"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {results.map((item, idx) => {
                const isEmailCopied =
                  copiedItem?.id === item.id && copiedItem?.type === 'Email';
                const isPwCopied =
                  copiedItem?.id === item.id && copiedItem?.type === 'Password';
                const isStored = submittedEmails.some(
                  (submitted) => submitted.trim().toLowerCase() === item.email.trim().toLowerCase()
                );
                return (
                  <div
                    key={item.id || idx}
                    className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isStored
                        ? 'bg-slate-50 border-slate-200 opacity-80'
                        : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-2xs'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span
                          className={`font-mono text-xs sm:text-sm font-bold break-all flex items-center gap-1.5 ${
                            isStored ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{item.email}</span>
                        </span>
                        {isStored ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>di stor</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>belum di stor</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 pl-7 text-xs">
                        <span className="text-slate-400 font-semibold text-[11px]">PW:</span>
                        <span className="font-mono font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200 text-xs">
                          {item.password}
                        </span>
                        {isStored && (
                          <span className="text-[11px] font-semibold text-rose-600 flex items-center gap-1 ml-2">
                            <Ban className="w-3 h-3" />
                            <span>Sudah disetor (tidak dapat digunakan kembali)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      {!isStored && onSelectEmailForStoran && (
                        <button
                          type="button"
                          onClick={() => onSelectEmailForStoran(item.email)}
                          className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-2xs"
                          title="Gunakan akun ini untuk stor ke form di bawah"
                        >
                          <Send className="w-3 h-3" />
                          <span>Pilih Stor</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.email, item.id, 'Email')}
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold rounded-lg border border-slate-200 transition flex items-center gap-1"
                        title="Salin Alamat Email"
                      >
                        {isEmailCopied ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{isEmailCopied ? 'Tersalin' : 'Email'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyText(item.password, item.id, 'Password')}
                        className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition flex items-center gap-1"
                        title="Salin Password"
                      >
                        {isPwCopied ? (
                          <Check className="w-3 h-3 text-rose-600" />
                        ) : (
                          <KeyRound className="w-3 h-3" />
                        )}
                        <span>{isPwCopied ? 'Tersalin' : 'PW'}</span>
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
