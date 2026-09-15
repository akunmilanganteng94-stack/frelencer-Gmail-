import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  XCircle,
  AlertCircle,
  Sparkles,
  X,
  ListX,
  CheckCircle2,
  MessageSquareWarning,
  Check,
} from 'lucide-react';
import { Submission } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useToast } from '../context/ToastContext';

interface AdminBulkRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: Submission[];
}

const PRESET_REASONS = [
  'Password / sandi tidak cocok',
  'Meminta verifikasi nomor HP / 2FA aktif',
  'Akun dinonaktifkan / ditangguhkan Google',
  'Akun bukan fresh / sudah pernah digunakan',
  'Format data salah / tidak sesuai aturan',
  'Akun tidak dapat login / sesi kedaluwarsa',
];

export function AdminBulkRejectModal({
  isOpen,
  onClose,
  submissions,
}: AdminBulkRejectModalProps) {
  const { showToast } = useToast();
  const [inputText, setInputText] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [step, setStep] = useState<'input' | 'preview' | 'result'>('input');
  const [processing, setProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);

  // Extract clean email from submission content
  const getCleanEmailFromSubmission = (dataContent: string): string => {
    if (!dataContent) return '';
    const parts = dataContent.split('|');
    return parts[0].trim().toLowerCase();
  };

  // Parse input lines (1 line = 1 Gmail)
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
    const rejectedSubsMap = new Map<string, Submission>();
    const acceptedSubsMap = new Map<string, Submission>();

    for (const sub of submissions) {
      const cleanEmail = getCleanEmailFromSubmission(sub.dataContent);
      if (sub.status === 'Pending') {
        if (!pendingSubsMap.has(cleanEmail)) {
          pendingSubsMap.set(cleanEmail, sub);
        }
      } else if (sub.status === 'Ditolak') {
        if (!rejectedSubsMap.has(cleanEmail)) {
          rejectedSubsMap.set(cleanEmail, sub);
        }
      } else if (sub.status === 'Diterima') {
        if (!acceptedSubsMap.has(cleanEmail)) {
          acceptedSubsMap.set(cleanEmail, sub);
        }
      }
    }

    const readyToReject: { email: string; submission: Submission }[] = [];
    const alreadyRejected: { email: string; submission: Submission }[] = [];
    const alreadyAccepted: { email: string; submission: Submission }[] = [];
    const notFound: string[] = [];

    for (const email of parsedEmails) {
      if (pendingSubsMap.has(email)) {
        readyToReject.push({ email, submission: pendingSubsMap.get(email)! });
      } else if (rejectedSubsMap.has(email)) {
        alreadyRejected.push({ email, submission: rejectedSubsMap.get(email)! });
      } else if (acceptedSubsMap.has(email)) {
        alreadyAccepted.push({ email, submission: acceptedSubsMap.get(email)! });
      } else {
        notFound.push(email);
      }
    }

    return {
      readyToReject,
      alreadyRejected,
      alreadyAccepted,
      notFound,
    };
  }, [parsedEmails, submissions]);

  const handleProceedToPreview = () => {
    if (parsedEmails.length === 0) {
      showToast('warning', 'Data Kosong', 'Masukkan minimal 1 alamat Gmail yang valid.');
      return;
    }
    if (!rejectionReason.trim()) {
      showToast(
        'error',
        'Alasan Wajib Diisi',
        'Harap tuliskan atau pilih alasan penolakan sebelum melanjutkan.'
      );
      return;
    }
    setStep('preview');
  };

  const handleExecuteBulkReject = async () => {
    if (matchAnalysis.readyToReject.length === 0) {
      showToast('warning', 'Tidak Ada Akun', 'Tidak ada akun pending yang cocok untuk ditolak.');
      return;
    }
    if (!rejectionReason.trim()) {
      showToast('error', 'Wajib Alasan', 'Harap isi alasan penolakan.');
      return;
    }

    setProcessing(true);
    let successCount = 0;
    const trimmedReason = rejectionReason.trim();

    try {
      for (const item of matchAnalysis.readyToReject) {
        const sub = item.submission;
        const subRef = doc(db, 'submissions', sub.id);

        await updateDoc(subRef, {
          status: 'Ditolak',
          rejectionReason: trimmedReason,
          reviewedAt: new Date().toISOString(),
          adminNotes: 'Ditolak via tolak bulk admin',
        });

        successCount++;
      }

      setProcessedCount(successCount);
      setStep('result');
      showToast(
        'info',
        'Tolak Bulk Berhasil',
        `${successCount} akun Gmail berhasil ditolak dengan alasan: "${trimmedReason}".`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Memproses Sebagian', msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setInputText('');
    setRejectionReason('');
    setStep('input');
    setProcessedCount(0);
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
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 p-5 sm:p-6 text-white relative shrink-0">
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
              <ListX className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight">
                  Tolak Bulk Submission
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  Massal
                </span>
              </div>
              <p className="text-rose-100 text-xs mt-0.5">
                Tolak sekaligus beberapa akun Gmail (1 baris 1 Gmail) dan sertakan alasan penolakan
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {step === 'input' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 leading-relaxed space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-rose-950">
                  <Sparkles className="w-4 h-4 text-rose-600" />
                  <span>Petunjuk Tolak Massal:</span>
                </div>
                <p>
                  Tempel daftar alamat Gmail yang ingin ditolak. Masukkan <strong>1 baris = 1 akun Gmail</strong>. Sistem akan mencocokkan akun tersebut dengan storan berstatus <strong>Pending</strong>, lalu mengubah statusnya menjadi <strong>Ditolak</strong> dan menyematkan alasan yang Anda tulis ke akun pengguna terkait.
                </p>
              </div>

              {/* Input Gmail */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black text-slate-800">
                    Daftar Gmail yang Ditolak (1 Baris 1 Akun):
                  </label>
                  <span className="text-[11px] text-slate-500 font-bold">
                    {parsedEmails.length} Akun Terdeteksi
                  </span>
                </div>
                <textarea
                  rows={6}
                  required
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`contoh1@gmail.com\ncontoh2@gmail.com\ncontoh3@gmail.com`}
                  className="w-full p-3.5 font-mono text-xs rounded-2xl border border-slate-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 outline-none leading-relaxed bg-white shadow-2xs"
                />
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

              {/* Rejection Reason */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-800 flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1.5">
                      <MessageSquareWarning className="w-4 h-4 text-rose-600" />
                      <span>Alasan Penolakan (Wajib - Terlihat oleh Freelancer)</span>
                    </span>
                    <span className="text-rose-600 text-[11px] font-bold">*Wajib</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Contoh: Password salah / Terkena verifikasi nomor HP (2FA) / Akun bukan fresh"
                    className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 outline-none bg-white shadow-2xs"
                  />
                </div>

                {/* Quick Templates */}
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                    Pilih Template Alasan Cepat:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_REASONS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setRejectionReason(preset)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                          rejectionReason === preset
                            ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-rose-50 hover:text-rose-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Siap Ditolak</span>
                  </div>
                  <div className="text-2xl font-black text-rose-700 mt-1">
                    {matchAnalysis.readyToReject.length}
                  </div>
                  <div className="text-[10px] text-rose-600 mt-0.5">Status Pending</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 text-slate-500" />
                    <span>Sudah Ditolak</span>
                  </div>
                  <div className="text-2xl font-black text-slate-700 mt-1">
                    {matchAnalysis.alreadyRejected.length}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Tidak diubah</div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Sudah Diterima</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">
                    {matchAnalysis.alreadyAccepted.length}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Dilewati</div>
                </div>

                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                  <div className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Tidak Ada</span>
                  </div>
                  <div className="text-2xl font-black text-amber-700 mt-1">
                    {matchAnalysis.notFound.length}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Tidak terdaftar</div>
                </div>
              </div>

              {/* Alasan Preview */}
              <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs">
                <div className="font-bold text-rose-950 flex items-center gap-1.5 mb-1">
                  <MessageSquareWarning className="w-4 h-4 text-rose-600" />
                  <span>Alasan Penolakan yang Akan Disematkan:</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-rose-200 font-semibold text-rose-900">
                  {rejectionReason}
                </div>
              </div>

              {/* List Akun yang siap ditolak */}
              {matchAnalysis.readyToReject.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-900 flex items-center justify-between">
                    <span>Daftar Akun Pending yang Akan Ditolak ({matchAnalysis.readyToReject.length}):</span>
                    <span className="text-rose-600 font-bold">Status akan berubah ke Ditolak</span>
                  </h4>
                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 text-xs">
                    {matchAnalysis.readyToReject.map((item, idx) => (
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
                        <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-extrabold text-[11px] shrink-0">
                          Tolak
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Akun tidak ditemukan */}
              {matchAnalysis.notFound.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-1.5">
                  <div className="font-bold text-amber-950 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{matchAnalysis.notFound.length} Akun Tidak Ditemukan di Antrean Storan:</span>
                  </div>
                  <div className="max-h-20 overflow-y-auto font-mono text-[11px] text-amber-800 bg-white/70 p-2 rounded-xl border border-amber-200/60 leading-relaxed">
                    {matchAnalysis.notFound.join(', ')}
                  </div>
                  <p className="text-[10px] text-amber-700">
                    Akun-akun di atas akan dilewati karena tidak ada data storan yang cocok.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'result' && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-9 h-9 text-rose-600" />
              </div>
              <div>
                <h4 className="text-xl font-black text-slate-900">
                  Tolak Bulk Berhasil Diproses!
                </h4>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                  Sebanyak <strong>{processedCount} akun Gmail</strong> telah berhasil diubah statusnya menjadi <strong>Ditolak</strong>.
                </p>
                <div className="mt-3 p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 max-w-sm mx-auto">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">
                    Alasan Tersimpan:
                  </span>
                  <span className="font-bold text-slate-800">{rejectionReason}</span>
                </div>
              </div>
              <div className="pt-3 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Tolak Lagi
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
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
                  disabled={parsedEmails.length === 0 || !rejectionReason.trim()}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
                  disabled={processing || matchAnalysis.readyToReject.length === 0}
                  onClick={handleExecuteBulkReject}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md shadow-rose-600/20 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {processing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memproses Penolakan...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      <span>Konfirmasi Tolak {matchAnalysis.readyToReject.length} Akun</span>
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
