import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardCheck,
  AlertCircle,
  X,
  CheckCircle2,
  History,
  Zap,
  Globe,
  Loader2,
} from 'lucide-react';
import { Submission } from '../types';
import { isEarlierThanTodayWIB, isTodayWIB } from '../lib/utils';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';

interface AdminBulkCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: Submission[];
}

export function AdminBulkCheckModal({
  isOpen,
  onClose,
  submissions,
}: AdminBulkCheckModalProps) {
  const { showToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  const getCleanEmailFromSubmission = (dataContent: string): string => {
    if (!dataContent) return '';
    const parts = dataContent.split('|');
    return parts[0].trim().toLowerCase();
  };

  const getSubmissionType = (sub: Submission): 'khusus' | 'bebas' => {
    if (sub.submissionType) return sub.submissionType;
    if (sub.rewardAmount === 2700) return 'bebas';
    return 'khusus';
  };

  const pendingYesterdaySubs = useMemo(() => {
    return submissions.filter(
      (s) => s.status === 'Pending' && isEarlierThanTodayWIB(s.createdAt)
    );
  }, [submissions]);

  const pendingTodaySubs = useMemo(() => {
    return submissions.filter(
      (s) => s.status === 'Pending' && isTodayWIB(s.createdAt)
    );
  }, [submissions]);

  const pendingYesterdayKhususEmails = useMemo(() => {
    return pendingYesterdaySubs
      .filter((s) => getSubmissionType(s) === 'khusus')
      .map((s) => getCleanEmailFromSubmission(s.dataContent))
      .filter(Boolean);
  }, [pendingYesterdaySubs]);

  const pendingYesterdayBebasEmails = useMemo(() => {
    return pendingYesterdaySubs
      .filter((s) => getSubmissionType(s) === 'bebas')
      .map((s) => getCleanEmailFromSubmission(s.dataContent))
      .filter(Boolean);
  }, [pendingYesterdaySubs]);

  const pendingTodayKhususEmails = useMemo(() => {
    return pendingTodaySubs
      .filter((s) => getSubmissionType(s) === 'khusus')
      .map((s) => getCleanEmailFromSubmission(s.dataContent))
      .filter(Boolean);
  }, [pendingTodaySubs]);

  const pendingTodayBebasEmails = useMemo(() => {
    return pendingTodaySubs
      .filter((s) => getSubmissionType(s) === 'bebas')
      .map((s) => getCleanEmailFromSubmission(s.dataContent))
      .filter(Boolean);
  }, [pendingTodaySubs]);

  const pendingYesterdayEmails = useMemo(() => {
    return pendingYesterdaySubs
      .map((s) => getCleanEmailFromSubmission(s.dataContent))
      .filter(Boolean);
  }, [pendingYesterdaySubs]);

  const pendingTodayEmails = useMemo(() => {
    return pendingTodaySubs
      .map((s) => getCleanEmailFromSubmission(s.dataContent))
      .filter(Boolean);
  }, [pendingTodaySubs]);

  const parsedEmails = useMemo(() => {
    if (!inputText.trim()) return [];
    const lines = inputText.split('\n');
    const result: string[] = [];
    const seen = new Set<string>();
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const parts = line.split('|');
      const email = parts[0].trim().toLowerCase();
      if (email.includes('@gmail.com') && !seen.has(email)) {
        seen.add(email);
        result.push(email);
      }
    }
    return result;
  }, [inputText]);

  const matchResult = useMemo(() => {
    const matchedSubs: Submission[] = [];
    const notFoundEmails: string[] = [];
    const alreadyCheckingSubs: Submission[] = [];

    const pendingByEmail = new Map<string, Submission>();
    const checkingByEmail = new Map<string, Submission>();

    submissions.forEach((sub) => {
      const em = getCleanEmailFromSubmission(sub.dataContent);
      if (em) {
        if (sub.status === 'Pending') {
          pendingByEmail.set(em, sub);
        } else if (sub.status === 'Cek Admin') {
          checkingByEmail.set(em, sub);
        }
      }
    });

    for (const email of parsedEmails) {
      if (pendingByEmail.has(email)) {
        const sub = pendingByEmail.get(email)!;
        matchedSubs.push(sub);
      } else if (checkingByEmail.has(email)) {
        alreadyCheckingSubs.push(checkingByEmail.get(email)!);
      } else {
        notFoundEmails.push(email);
      }
    }

    const khususCount = matchedSubs.filter((s) => getSubmissionType(s) === 'khusus').length;
    const bebasCount = matchedSubs.filter((s) => getSubmissionType(s) === 'bebas').length;

    return {
      matchedSubs,
      khususCount,
      bebasCount,
      notFoundEmails,
      alreadyCheckingSubs,
    };
  }, [parsedEmails, submissions]);

  const handleExecuteBulkCheck = async () => {
    if (matchResult.matchedSubs.length === 0) return;
    setProcessing(true);
    setProcessedCount(0);
    let successCount = 0;

    for (const sub of matchResult.matchedSubs) {
      try {
        await updateDoc(doc(db, 'submissions', sub.id), {
          status: 'Cek Admin',
          checkedAt: new Date().toISOString(),
        });
        successCount++;
        setProcessedCount(successCount);
      } catch (err) {
        console.error('Error updating submission to Cek Admin:', sub.id, err);
      }
    }

    setProcessing(false);
    setStep('result');
    showToast(
      'success',
      'Cek Bulk Berhasil',
      `${successCount} akun Gmail berhasil dipindahkan ke status 'Cek Admin'`
    );
  };

  const handleReset = () => {
    setInputText('');
    setStep('input');
    setProcessedCount(0);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        <div className="p-5 sm:p-6 bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white border border-white/20">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                <span>Cek Bulk Akun Gmail</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 uppercase tracking-wider">
                  Admin Tool
                </span>
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                Pindahkan status akun dari 'Pending' ke 'Cek Admin' secara massal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {step === 'input' && (
            <div className="space-y-4">
              <div className="space-y-2.5 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tombol Cepat Isi Akun Pending:</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Klik untuk memuat otomatis
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-700 w-full sm:w-auto">
                    Kemarin:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingYesterdayKhususEmails.length === 0) {
                        showToast('info', 'Tidak Ada Data', 'Tidak ada pendingan kemarin tipe Khusus');
                        return;
                      }
                      setInputText(pendingYesterdayKhususEmails.join('\n'));
                      showToast('success', 'Dimuat', `${pendingYesterdayKhususEmails.length} Gmail Khusus kemarin dimuat`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition cursor-pointer active:scale-95"
                  >
                    <Zap className="w-3 h-3 text-indigo-600" />
                    <span>Khusus ({pendingYesterdayKhususEmails.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingYesterdayBebasEmails.length === 0) {
                        showToast('info', 'Tidak Ada Data', 'Tidak ada pendingan kemarin tipe Bebas');
                        return;
                      }
                      setInputText(pendingYesterdayBebasEmails.join('\n'));
                      showToast('success', 'Dimuat', `${pendingYesterdayBebasEmails.length} Gmail Bebas kemarin dimuat`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 flex items-center gap-1 transition cursor-pointer active:scale-95"
                  >
                    <Globe className="w-3 h-3 text-teal-600" />
                    <span>Bebas ({pendingYesterdayBebasEmails.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingYesterdayEmails.length === 0) {
                        showToast('info', 'Tidak Ada Data', 'Tidak ada pendingan kemarin');
                        return;
                      }
                      setInputText(pendingYesterdayEmails.join('\n'));
                      showToast('success', 'Dimuat', `${pendingYesterdayEmails.length} Gmail kemarin dimuat`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200/80 hover:bg-slate-300 text-slate-800 transition cursor-pointer active:scale-95"
                  >
                    <span>Semua Kemarin ({pendingYesterdayEmails.length})</span>
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-200/60">
                  <span className="text-[11px] font-bold text-slate-700 w-full sm:w-auto">
                    Hari Ini:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingTodayKhususEmails.length === 0) {
                        showToast('info', 'Tidak Ada Data', 'Tidak ada pendingan hari ini tipe Khusus');
                        return;
                      }
                      setInputText(pendingTodayKhususEmails.join('\n'));
                      showToast('success', 'Dimuat', `${pendingTodayKhususEmails.length} Gmail Khusus hari ini dimuat`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition cursor-pointer active:scale-95"
                  >
                    <Zap className="w-3 h-3 text-indigo-600" />
                    <span>Khusus ({pendingTodayKhususEmails.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingTodayBebasEmails.length === 0) {
                        showToast('info', 'Tidak Ada Data', 'Tidak ada pendingan hari ini tipe Bebas');
                        return;
                      }
                      setInputText(pendingTodayBebasEmails.join('\n'));
                      showToast('success', 'Dimuat', `${pendingTodayBebasEmails.length} Gmail Bebas hari ini dimuat`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 flex items-center gap-1 transition cursor-pointer active:scale-95"
                  >
                    <Globe className="w-3 h-3 text-teal-600" />
                    <span>Bebas ({pendingTodayBebasEmails.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingTodayEmails.length === 0) {
                        showToast('info', 'Tidak Ada Data', 'Tidak ada pendingan hari ini');
                        return;
                      }
                      setInputText(pendingTodayEmails.join('\n'));
                      showToast('success', 'Dimuat', `${pendingTodayEmails.length} Gmail hari ini dimuat`);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200/80 hover:bg-slate-300 text-slate-800 transition cursor-pointer active:scale-95"
                  >
                    <span>Semua Hari Ini ({pendingTodayEmails.length})</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Tempel Alamat Gmail (1 Baris = 1 Gmail)</span>
                  </label>
                  <span className="text-[11px] font-semibold text-blue-600">
                    {parsedEmails.length} Gmail valid terdeteksi
                  </span>
                </div>
                <textarea
                  rows={7}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`contoh1@gmail.com\ncontoh2@gmail.com\ncontoh3@gmail.com`}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 font-mono text-xs sm:text-sm text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none transition"
                />
              </div>

              {parsedEmails.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-slate-500 block font-semibold">Total Input:</span>
                    <strong className="text-sm font-black text-slate-800">{parsedEmails.length} Akun</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-emerald-600 block font-bold">Cocok (Pending):</span>
                    <strong className="text-sm font-black text-emerald-700">{matchResult.matchedSubs.length} Akun</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-indigo-600 block font-bold">Khusus:</span>
                    <strong className="text-sm font-black text-indigo-700">{matchResult.khususCount} Akun</strong>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-blue-100">
                    <span className="text-[10px] text-teal-600 block font-bold">Bebas:</span>
                    <strong className="text-sm font-black text-teal-700">{matchResult.bebasCount} Akun</strong>
                  </div>
                </div>
              )}

              {matchResult.alreadyCheckingSubs.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>{matchResult.alreadyCheckingSubs.length} akun</strong> dari input sudah dalam status 'Cek Admin' sebelumnya.
                  </span>
                </div>
              )}

              {matchResult.notFoundEmails.length > 0 && parsedEmails.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs flex items-center justify-between">
                  <span>
                    <strong>{matchResult.notFoundEmails.length} akun</strong> tidak ditemukan di antrean Pending.
                  </span>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
                <ClipboardCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-900 leading-relaxed">
                  <strong className="block text-sm font-bold text-blue-950 mb-0.5">
                    Konfirmasi Cek Bulk ({matchResult.matchedSubs.length} Akun)
                  </strong>
                  Seluruh akun di bawah ini akan diubah statusnya menjadi <strong>'Cek Admin'</strong>. Di riwayat user, progres akan bergerak ke tahap pengecekan.
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {matchResult.matchedSubs.map((sub, idx) => {
                  const email = getCleanEmailFromSubmission(sub.dataContent);
                  const type = getSubmissionType(sub);
                  return (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-black flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <strong className="font-mono text-slate-900 block truncate">{email}</strong>
                          <span className="text-[10px] text-slate-500 truncate block">
                            User: {sub.userName || sub.userEmail}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          type === 'khusus'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {type === 'khusus' ? 'Khusus' : 'Bebas'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Cek Bulk Berhasil!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sebanyak <strong>{processedCount} akun Gmail</strong> telah berhasil dipindahkan ke status <strong>Cek Admin</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-sm mx-auto text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span>Total Akun Diproses:</span>
                  <strong className="text-slate-900">{processedCount} Akun</strong>
                </div>
                <div className="flex justify-between">
                  <span>Status Sekarang:</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                    Cek Admin
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          {step === 'input' && (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={matchResult.matchedSubs.length === 0}
                onClick={() => setStep('preview')}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
              >
                <span>Lanjut Preview ({matchResult.matchedSubs.length} Akun)</span>
              </button>
            </>
          )}

          {step === 'preview' && (
            <>
              <button
                type="button"
                disabled={processing}
                onClick={() => setStep('input')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={processing || matchResult.matchedSubs.length === 0}
                onClick={handleExecuteBulkCheck}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses ({processedCount}/{matchResult.matchedSubs.length})...</span>
                  </>
                ) : (
                  <>
                    <ClipboardCheck className="w-4 h-4" />
                    <span>Jalankan Cek Bulk Sekarang</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
            >
              Tutup Modal
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
