import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Check,
  AlertCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { Submission } from '../types';
import { formatRupiah } from '../lib/utils';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';

interface AdminBulkConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: Submission[];
}

export function AdminBulkConfirmModal({
  isOpen,
  onClose,
  submissions,
}: AdminBulkConfirmModalProps) {
  const { showToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [processedTotalReward, setProcessedTotalReward] = useState(0);

  // Extract clean email from submission content
  const getCleanEmailFromSubmission = (dataContent: string): string => {
    if (!dataContent) return '';
    const parts = dataContent.split('|');
    return parts[0].trim().toLowerCase();
  };

  // Parse input lines
  const parsedEmails = useMemo(() => {
    if (!inputText.trim()) return [];
    const lines = inputText.split('\n');
    const result: string[] = [];
    const seen = new Set<string>();
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const email = line.split(/[|:,\s]/)[0].trim().toLowerCase();
      if (email && email.includes('@') && !seen.has(email)) {
        seen.add(email);
        result.push(email);
      }
    }
    return result;
  }, [inputText]);

  // Match parsed emails against submissions
  const matchAnalysis = useMemo(() => {
    const pendingSubsMap = new Map<string, Submission>();
    const acceptedSubsMap = new Map<string, Submission>();

    for (const sub of submissions) {
      const cleanEmail = getCleanEmailFromSubmission(sub.dataContent);
      if (sub.status === 'Pending') {
        if (!pendingSubsMap.has(cleanEmail)) {
          pendingSubsMap.set(cleanEmail, sub);
        }
      } else if (sub.status === 'Diterima') {
        if (!acceptedSubsMap.has(cleanEmail)) {
          acceptedSubsMap.set(cleanEmail, sub);
        }
      }
    }

    const readyToAccept: { email: string; submission: Submission }[] = [];
    const alreadyAccepted: { email: string; submission: Submission }[] = [];
    const notFound: string[] = [];

    for (const email of parsedEmails) {
      if (pendingSubsMap.has(email)) {
        readyToAccept.push({ email, submission: pendingSubsMap.get(email)! });
      } else if (acceptedSubsMap.has(email)) {
        alreadyAccepted.push({ email, submission: acceptedSubsMap.get(email)! });
      } else {
        notFound.push(email);
      }
    }

    const totalRewardToPay = readyToAccept.reduce(
      (sum, item) => sum + (item.submission.rewardAmount || 3000),
      0
    );

    return {
      readyToAccept,
      alreadyAccepted,
      notFound,
      totalRewardToPay,
    };
  }, [parsedEmails, submissions]);

  const handleProceedToPreview = () => {
    if (parsedEmails.length === 0) {
      showToast('warning', 'Data Kosong', 'Masukkan minimal 1 alamat Gmail yang valid.');
      return;
    }
    setStep('preview');
  };

  const handleExecuteBulkAccept = async () => {
    if (matchAnalysis.readyToAccept.length === 0) {
      showToast('warning', 'Tidak Ada Antrean', 'Tidak ada akun pending yang cocok untuk dikonfirmasi.');
      return;
    }

    setProcessing(true);
    let successCount = 0;
    let totalRewardPaid = 0;

    try {
      for (const item of matchAnalysis.readyToAccept) {
        const sub = item.submission;
        const subRef = doc(db, 'submissions', sub.id);
        const userRef = doc(db, 'users', sub.userId);

        await runTransaction(db, async (transaction) => {
          const subDoc = await transaction.get(subRef);
          if (!subDoc.exists()) return;
          if (subDoc.data().status === 'Diterima') return;

          const reward =
            typeof sub.rewardAmount === 'number' && sub.rewardAmount > 0 ? sub.rewardAmount : 3000;
          const userDoc = await transaction.get(userRef);

          transaction.update(subRef, {
            status: 'Diterima',
            reviewedAt: new Date().toISOString(),
            rejectionReason: '',
            adminNotes: 'Diterima via konfirmasi bulk admin',
          });

          if (!userDoc.exists()) {
            transaction.set(userRef, {
              uid: sub.userId,
              email: sub.userEmail,
              displayName: sub.userName || 'User',
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
        totalRewardPaid += sub.rewardAmount || 3000;
      }

      setProcessedCount(successCount);
      setProcessedTotalReward(totalRewardPaid);
      setStep('result');
      showToast(
        'success',
        'Konfirmasi Bulk Berhasil',
        `${successCount} akun Gmail berhasil diterima dan saldo pengguna telah diperbarui.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Sebagian', msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setInputText('');
    setStep('input');
    setProcessedCount(0);
    setProcessedTotalReward(0);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 p-5 sm:p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  Konfirmasi Terima Bulk
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  Massal
                </span>
              </div>
              <p className="text-blue-100 text-xs mt-0.5">
                Masukkan daftar Gmail valid untuk mengonfirmasi dan menambahkan saldo pengguna sekaligus
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {step === 'input' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 leading-relaxed space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-blue-950">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Petunjuk Input Massal:</span>
                </div>
                <p>
                  Tempel daftar alamat Gmail yang ingin Anda konfirmasi terima. Masukkan <strong>1 baris = 1 akun Gmail</strong>. Sistem akan mencocokkan akun tersebut dengan storan berstatus <strong>Pending</strong>, lalu otomatis mengubah status menjadi <strong>Diterima</strong> dan menambahkan saldo pengguna.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-800">
                    Masukkan Semua Gmail yang Ingin Dikonfirmasi (1 Baris 1 Akun):
                  </label>
                  <span className="text-[11px] text-slate-500 font-bold">
                    {parsedEmails.length} Akun Terdeteksi
                  </span>
                </div>
                <textarea
                  rows={9}
                  required
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`contoh1@gmail.com\ncontoh2@gmail.com\ncontoh3@gmail.com`}
                  className="w-full p-4 font-mono text-xs rounded-2xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 outline-none leading-relaxed bg-white shadow-2xs"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <span className="text-slate-400 text-[11px]">
                  Format didukung: <code>email@gmail.com</code> atau <code>email@gmail.com|pass</code>
                </span>
                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="text-rose-600 hover:text-rose-800 font-bold text-xs cursor-pointer"
                  >
                    Bersihkan Teks
                  </button>
                )}
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Siap Diterima</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {matchAnalysis.readyToAccept.length}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">
                    Saldo: {formatRupiah(matchAnalysis.totalRewardToPay)}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
                  <div className="text-[11px] font-bold text-blue-800 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-blue-600" />
                    <span>Sudah Diterima</span>
                  </div>
                  <div className="text-2xl font-black text-blue-700 mt-1">
                    {matchAnalysis.alreadyAccepted.length}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">
                    Tidak diduplikasi
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tidak Ditemukan</span>
                  </div>
                  <div className="text-2xl font-black text-amber-700 mt-1">
                    {matchAnalysis.notFound.length}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">
                    Belum disetor user
                  </div>
                </div>
              </div>

              {matchAnalysis.readyToAccept.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 flex items-center justify-between">
                    <span>Daftar Akun Pending yang Akan Diterima ({matchAnalysis.readyToAccept.length}):</span>
                    <span className="text-emerald-700 font-bold">
                      Total Imbalan: +{formatRupiah(matchAnalysis.totalRewardToPay)}
                    </span>
                  </h4>
                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
                    {matchAnalysis.readyToAccept.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 flex items-center justify-between gap-3 bg-slate-50/50 hover:bg-white"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-mono font-bold text-slate-900 truncate">
                            {item.email}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Pengirim: {item.submission.userName} ({item.submission.userEmail})
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[11px] shrink-0">
                          +{formatRupiah(item.submission.rewardAmount || 3000)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {matchAnalysis.notFound.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{matchAnalysis.notFound.length} Akun Tidak Ditemukan di Antrean Storan:</span>
                  </div>
                  <div className="max-h-24 overflow-y-auto font-mono text-[11px] text-amber-800 bg-white/70 p-2 rounded-xl border border-amber-200/60 leading-relaxed">
                    {matchAnalysis.notFound.join(', ')}
                  </div>
                  <p className="text-[10px] text-amber-700">
                    Akun-akun di atas akan dilewati karena tidak ada storan pending yang cocok.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'result' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">
                  Konfirmasi Terima Bulk Berhasil!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                  Sebanyak <strong>{processedCount} akun Gmail</strong> telah disetujui. Total saldo sebesar <strong>{formatRupiah(processedTotalReward)}</strong> telah langsung ditambahkan ke masing-masing akun pengguna.
                </p>
              </div>
              <div className="pt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Konfirmasi Lagi
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step !== 'result' && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
            {step === 'input' ? (
              <>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-white transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleProceedToPreview}
                  disabled={parsedEmails.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-500/20 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Lanjut Tinjau ({parsedEmails.length} Akun)</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => setStep('input')}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-white transition cursor-pointer"
                >
                  ← Kembali Edit List
                </button>
                <button
                  type="button"
                  disabled={processing || matchAnalysis.readyToAccept.length === 0}
                  onClick={handleExecuteBulkAccept}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {processing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memproses Konfirmasi...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>
                        Konfirmasi Terima {matchAnalysis.readyToAccept.length} Akun (
                        {formatRupiah(matchAnalysis.totalRewardToPay)})
                      </span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
