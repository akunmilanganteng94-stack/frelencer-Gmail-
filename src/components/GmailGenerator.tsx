import { useState, useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useGmailStock } from '../hooks/useGmailStock';
import { useAuth } from '../context/AuthContext';
import { GmailLogo } from './GmailLogo';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GmailGeneratorProps {
  onOpenContactAdmin?: () => void;
  submittedEmails?: string[];
}

interface ResultItem {
  id: string;
  email: string;
  password: string;
  generatedAt?: string;
}

export function GmailGenerator({ onOpenContactAdmin, submittedEmails = [] }: GmailGeneratorProps) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { currentUser } = useAuth();
  const { availableStock, claimAccounts, loading } = useGmailStock();

  const [count, setCount] = useState<number>(1);
  const [generating, setGenerating] = useState<boolean>(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [copiedItem, setCopiedItem] = useState<{ id: string; type: string } | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  const activePassword = settings.gmailDefaultPassword || 'sgsg1122';
  const isFeatureOpen = settings.generatorOpen !== false;

  const storageKey = currentUser?.uid
    ? `gmail_gen_saved_${currentUser.uid}`
    : 'gmail_gen_saved_guest';

  // Load saved generated accounts on mount / when storageKey or submittedEmails change
  // Filter out any accounts that have already been submitted ("kecuali udah di stor")
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed: ResultItem[] = JSON.parse(raw);
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
    const clamped = Math.max(1, Math.min(25, newCount));
    setCount(clamped);
  };

  const handleGenerate = async () => {
    if (!isFeatureOpen) {
      showToast('warning', 'Fitur Ditutup', 'Fitur generator saat ini ditutup oleh admin.');
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
      const mapped: ResultItem[] = claimed.map((item) => ({
        id: item.id,
        email: item.email,
        password: item.password || activePassword,
        generatedAt: new Date().toISOString(),
      }));

      // Combine with existing unsubmitted accounts, filtering out already submitted ones
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

  // If feature closed by admin
  if (!isFeatureOpen) {
    return (
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <GmailLogo className="w-4 h-4" />
              <span>Generator Akun Gmail (Dari Stok Admin)</span>
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700">
              Fitur Sedang Ditutup Admin
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Admin sedang menonaktifkan fitur pengambilan akun otomatis dari stok. Anda dapat mendaftarkan akun Gmail Anda sendiri secara manual dengan password{' '}
          <strong className="font-mono text-rose-700 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
            {activePassword}
          </strong>{' '}
          lalu menyetorkannya pada form di bawah.
        </p>
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-center shrink-0">
            <GmailLogo className="w-6 h-6" />
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

        {/* Available Stock Indicator */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Stok: {loading ? '...' : `${availableStock.length} Tersedia`}</span>
          </div>
        </div>
      </div>

      {/* Control Panel: Count Selector (1-25) & Generate Button */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200/80 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="block text-xs font-black text-slate-800">
              Pilih Jumlah Akun yang Ingin Digenerate:
            </label>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Minimal 1 akun, maksimal 25 akun sekali generate
            </p>
          </div>

          {/* Stepper Input (1-25) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAdjustCount(count - 1)}
              disabled={count <= 1}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold transition shadow-2xs"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <input
              type="number"
              min={1}
              max={25}
              value={count}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) handleAdjustCount(val);
              }}
              className="w-16 h-8 text-center font-mono font-black text-sm text-indigo-700 bg-white border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
            />

            <button
              type="button"
              onClick={() => handleAdjustCount(count + 1)}
              disabled={count >= 25}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-slate-700 font-bold transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick presets pills (1, 5, 10, 15, 20, 25) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">Preset cepat:</span>
          {[1, 5, 10, 15, 20, 25].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setCount(num)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                count === num
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Generate Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || availableStock.length === 0}
            className="w-full sm:flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-black rounded-xl text-sm shadow-md shadow-indigo-600/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {generating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <GmailLogo className="w-4 h-4" />
            )}
            <span>Generate {count} Akun Dari Stok</span>
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

      {/* Results Display Area (Only Gmail and PW) */}
      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 pt-2"
          >
            {/* Action Bar for Generated Accounts */}
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

            {/* List of Accounts: strictly Gmail + PW */}
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
                    {/* Gmail & Password Display */}
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

                        {/* Status Label: belum di stor OR di stor */}
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

                    {/* Action buttons: copy email & password only (Gunakan button removed) */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
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

