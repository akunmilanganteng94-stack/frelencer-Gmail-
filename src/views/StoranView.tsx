import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useContactAdmin } from '../context/ContactAdminContext';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import { Submission, OperationType } from '../types';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { RulesCard } from '../components/RulesCard';
import { GmailGenerator } from '../components/GmailGenerator';
import {
  UploadCloud,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ShieldAlert,
  Send,
  HelpCircle,
  Sparkles,
  KeyRound,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function StoranView() {
  const { userProfile, currentUser } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { openContactModal } = useContactAdmin();
  const activePassword = settings.gmailDefaultPassword || 'sgsg1122';

  const [inputData, setInputData] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [inputError, setInputError] = useState('');

  // Real-time listener for user's submissions
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
        setLoadingHistory(false);
      },
      (err) => {
        console.warn('Snapshot error:', err);
        setLoadingHistory(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleOpenConfirm = (e: FormEvent) => {
    e.preventDefault();
    setInputError('');

    if (!settings.storanOpen) {
      showToast('error', 'Storan Ditutup', 'Layanan storan saat ini sedang tutup.');
      return;
    }

    if (userProfile?.status === 'suspended') {
      showToast('error', 'Akun Dibatasi', 'Akun kamu sedang dibatasi. Hubungi admin untuk informasi lebih lanjut.');
      return;
    }

    const trimmed = inputData.trim();
    if (!trimmed) {
      setInputError('Data akun Gmail tidak boleh kosong.');
      showToast('error', 'Validasi Gagal', 'Data akun Gmail wajib diisi.');
      return;
    }

    // Single line constraint check: no multiline
    if (trimmed.includes('\n')) {
      setInputError('Harap gunakan sistem satu baris untuk satu akun (tidak boleh ada enter/multiline).');
      showToast('error', 'Format Salah', 'Data harus dalam satu baris tunggal.');
      return;
    }

    // Gmail domain check
    const lower = trimmed.toLowerCase();
    if (!lower.includes('@gmail.com') && !lower.includes('@googlemail.com')) {
      setInputError('Format harus berupa akun Gmail (mengandung @gmail.com). Contoh: nama@gmail.com');
      showToast('warning', 'Domain Salah', 'Hanya menerima akun Gmail (@gmail.com).');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    if (!currentUser || !userProfile) return;

    setSubmitting(true);
    try {
      const newSubmissionData = {
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        userName: userProfile.displayName || 'Freelancer',
        dataContent: inputData.trim(),
        rewardAmount: settings.pricePerSubmission,
        status: 'Pending' as const,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, 'submissions'), newSubmissionData);

      showToast(
        'success',
        'Akun Gmail Berhasil Disetor',
        `Akun berhasil masuk ke antrean verifikasi admin. Estimasi 24–30 jam kerja.`
      );
      setInputData('');
      setShowConfirmModal(false);
    } catch (error) {
      setShowConfirmModal(false);
      handleFirestoreError(error, OperationType.CREATE, 'submissions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectFromGenerator = (email: string) => {
    setInputData(email);
    setInputError('');
    const formEl = document.getElementById('submission-form-card');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <UploadCloud className="w-7 h-7 text-indigo-600" />
            <span>Storan Akun Gmail / Google</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kirim akun Gmail fresh dengan password wajib:{' '}
            <span className="font-mono font-bold bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded border border-rose-200">
              {activePassword}
            </span>
            . Reward:{' '}
            <strong className="text-indigo-700 font-extrabold">{formatRupiah(settings.pricePerSubmission)}</strong> per akun valid.
          </p>
        </div>

        {/* Operational Banner Pill */}
        <div
          className={`self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 ${
            settings.storanOpen
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              settings.storanOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span>{settings.storanOpen ? 'Storan BUKA (Menerima Akun)' : 'Storan TUTUP'}</span>
        </div>
      </div>

      {/* Notice if Storan is CLOSE */}
      {!settings.storanOpen && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold">Layanan Storan Sedang Tutup</div>
            <p className="text-xs text-rose-700 mt-0.5">
              Admin sedang menutup penerimaan akun baru. Storan aktif setiap {settings.storanSchedule}. Silakan kembali pada jam operasional.
            </p>
          </div>
        </div>
      )}

      {/* Account suspended warning */}
      {userProfile?.status === 'suspended' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold">Akun Kamu Sedang Dibatasi (Suspended)</div>
            <p className="text-xs text-amber-800 mt-0.5">
              Aktivitas akun kamu sedang ditangguhkan oleh administrator. Kamu tidak dapat mengirim Gmail baru saat ini.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main Active Column (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Feature Generator Akun Gmail (Berada tepat di atas Form Storan Akun Gmail) */}
          <GmailGenerator
            onOpenContactAdmin={openContactModal}
            submittedEmails={submissions.map((s) => s.dataContent.trim().toLowerCase())}
          />

          {/* Submission Input Box */}
          <div id="submission-form-card" className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Form Setor Akun Gmail</span>
              </h2>
              <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                1 Baris = 1 Akun
              </span>
            </div>

            <form onSubmit={handleOpenConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alamat Akun Gmail yang Disetor
                </label>
                <div className="relative">
                  <input
                    type="text"
                    disabled={!settings.storanOpen || userProfile?.status === 'suspended'}
                    value={inputData}
                    onChange={(e) => {
                      setInputData(e.target.value);
                      setInputError('');
                    }}
                    placeholder="Contoh: dimas.pratama782@gmail.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm outline-none transition disabled:bg-slate-100 disabled:text-slate-400 font-mono"
                  />
                </div>
                {inputError && (
                  <p className="text-xs text-rose-600 font-semibold mt-1.5">{inputError}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Format: <strong>email@gmail.com</strong> (Password otomatis: <strong>{activePassword}</strong>)</span>
                  </span>
                </div>
              </div>

              {/* Password Wajib Alert Banner */}
              <div className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200/70 text-xs text-rose-900 flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong>Ketentuan Password:</strong> Akun yang disetor WAJIB memakai password{' '}
                  <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-300 text-rose-700">{activePassword}</strong>.
                  Jangan aktifkan 2FA (Verifikasi 2 Langkah).
                </span>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={
                  !settings.storanOpen ||
                  userProfile?.status === 'suspended' ||
                  !inputData.trim()
                }
                className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 hover:from-indigo-700 hover:to-blue-800 text-white font-black tracking-wide rounded-xl text-sm shadow-md shadow-indigo-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>STOR AKUN GMAIL</span>
              </button>
            </form>
          </div>

              {/* Recent Submissions In-Page List */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Riwayat Storan Akun Terkini</h3>
                    <p className="text-xs text-slate-500">Pantau status verifikasi dan alasan jika akun ditolak</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    {submissions.length} Total
                  </span>
                </div>

                {loadingHistory ? (
                  <div className="space-y-3 py-3">
                    {[1, 2, 3].map((n) => (
                      <div key={n} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    Belum ada akun Gmail yang disetor.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {submissions.slice(0, 5).map((sub) => (
                      <div
                        key={sub.id}
                        className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-white hover:border-indigo-200 hover:shadow-xs transition space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-xs font-bold text-slate-800 break-all flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>{sub.dataContent}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                              <span>{formatIndonesianDateTime(sub.createdAt)}</span>
                              <span>•</span>
                              <span className="font-bold text-indigo-700">
                                {formatRupiah(sub.rewardAmount)}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
                              sub.status === 'Diterima'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sub.status === 'Ditolak'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>

                        {/* Rejection reason if status === Ditolak */}
                        {sub.status === 'Ditolak' && sub.rejectionReason && (
                          <div className="p-2.5 rounded-xl bg-rose-50/90 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold">Alasan Penolakan:</strong>{' '}
                              {sub.rejectionReason}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
        </div>

        {/* Sidebar Column: Rules & Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <RulesCard />

          {/* SLA Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/60 rounded-2xl p-5 border border-indigo-100 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-900 font-bold text-sm">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Estimasi Waktu Verifikasi</span>
            </div>
            <p className="text-xs text-indigo-800 leading-relaxed">
              Semua akun Gmail yang disetor akan dicek login & status keaktifannya oleh admin dalam kurun waktu{' '}
              <strong>24–30 jam kerja</strong> (Senin–Jumat).
            </p>
            <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-xs text-indigo-900 font-medium">
              <span>Jam Operasional:</span>
              <strong>{settings.storanSchedule}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5"
            >
              <div className="flex items-center gap-3 text-indigo-600">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <HelpCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Konfirmasi Setor Akun Gmail
                  </h3>
                  <p className="text-xs text-slate-500">Periksa kembali data akun Anda</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Akun yang akan dikirim:
                </p>
                <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-xs font-bold text-slate-800 break-all flex items-center gap-2">
                  <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>{inputData}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-xs text-slate-600">
                  <span>Password Wajib:</span>
                  <span className="font-mono font-bold text-rose-600">{activePassword}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Imbalan jika diterima:</span>
                  <span className="font-extrabold text-indigo-700">
                    {formatRupiah(settings.pricePerSubmission)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Status 2FA:</span>
                  <span className="font-semibold text-emerald-700">Wajib Nonaktif</span>
                </div>
              </div>

              <p className="text-xs font-medium text-slate-600 text-center">
                Pastikan akun Gmail sudah berhasil dibuat di Google dan password sesuai ketentuan sebelum mengirim.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-sm text-slate-700 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Ya, Kirim Akun</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
