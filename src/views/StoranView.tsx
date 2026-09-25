import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useContactAdmin } from '../context/ContactAdminContext';
import { formatRupiah } from '../lib/utils';
import { Submission, OperationType, NavigationTab } from '../types';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { RulesCard } from '../components/RulesCard';
import {
  GmailGenerator,
  verifyUserGeneratedEmail,
} from '../components/GmailGenerator';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldAlert,
  Send,
  HelpCircle,
  KeyRound,
  Mail,
  Sparkles,
  Globe,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StoranViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export function StoranView({ onNavigate }: StoranViewProps) {
  const { userProfile, currentUser } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { openContactModal } = useContactAdmin();

  const activePassword = settings.gmailDefaultPassword || 'sgsg1122';

  const [inputData, setInputData] = useState('');
  const [storanType, setStoranType] = useState<'khusus' | 'bebas'>(() => {
    const khususClosed = settings.storanKhususOpen === false || !settings.storanOpen;
    const bebasClosed = settings.storanBebasOpen === false || !settings.storanOpen;
    if (khususClosed && !bebasClosed) return 'bebas';
    return 'khusus';
  });
  const [validatedEmails, setValidatedEmails] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [inputError, setInputError] = useState('');

  const isKhususClosed = settings.storanKhususOpen === false || !settings.storanOpen;
  const isBebasClosed = settings.storanBebasOpen === false || !settings.storanOpen;
  const isCurrentTypeClosed =
    !settings.storanOpen ||
    (storanType === 'khusus' && isKhususClosed) ||
    (storanType === 'bebas' && isBebasClosed);

  useEffect(() => {
    if (isKhususClosed && !isBebasClosed && storanType === 'khusus') {
      setStoranType('bebas');
    } else if (isBebasClosed && !isKhususClosed && storanType === 'bebas') {
      setStoranType('khusus');
    }
  }, [isKhususClosed, isBebasClosed, storanType]);

  const pricePerAccount = storanType === 'khusus' ? 3000 : 2700;

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
        console.warn('Snapshot error:', err);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleOpenConfirm = async (e: FormEvent) => {
    e.preventDefault();
    setInputError('');

    if (!settings.storanOpen) {
      showToast('error', 'Layanan Tidak Tersedia', 'Layanan storan saat ini sedang tidak dapat diakses.');
      setInputError('Layanan storan saat ini tidak dapat diakses.');
      return;
    }
    if (storanType === 'khusus' && isKhususClosed) {
      showToast('error', 'Akses Dibatasi', 'Storan Gmail Khusus saat ini tidak dapat diakses.');
      setInputError('Storan Gmail Khusus saat ini tidak dapat diakses.');
      return;
    }
    if (storanType === 'bebas' && isBebasClosed) {
      showToast('error', 'Akses Dibatasi', 'Storan Gmail Bebas saat ini tidak dapat diakses.');
      setInputError('Storan Gmail Bebas saat ini tidak dapat diakses.');
      return;
    }
    if (userProfile?.status === 'suspended') {
      showToast('error', 'Akun Dibatasi', 'Akun kamu sedang dibatasi. Hubungi admin untuk informasi lebih lanjut.');
      return;
    }

    const rawLines = inputData
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) {
      setInputError('Kolom storan masih kosong. Silakan masukkan minimal 1 akun Gmail.');
      showToast('error', 'Validasi Gagal', 'Data akun Gmail wajib diisi.');
      return;
    }

    if (rawLines.length > 5) {
      setInputError('Maksimal 5 akun Gmail sekaligus per proses storan.');
      showToast('error', 'Melebihi Batas', 'Maksimal 5 akun Gmail per proses.');
      return;
    }

    const cleanedEmails: string[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      const lineNum = i + 1;

      if (line.includes(' ')) {
        setInputError(`Baris ${lineNum} ("${line}") mengandung spasi tidak valid.`);
        showToast('error', 'Format Salah', `Baris ${lineNum} tidak boleh mengandung spasi.`);
        return;
      }

      let cleanEmail = line.toLowerCase();
      if (!cleanEmail.includes('@')) {
        cleanEmail = `${cleanEmail}@gmail.com`;
      }

      if (!cleanEmail.includes('@gmail.com') && !cleanEmail.includes('@googlemail.com')) {
        setInputError(
          `Baris ${lineNum} ("${line}") bukan alamat Gmail valid (@gmail.com). Contoh: nama.akun@gmail.com`
        );
        showToast('warning', 'Domain Salah', `Baris ${lineNum}: Hanya menerima akun Gmail (@gmail.com).`);
        return;
      }

      if (cleanedEmails.includes(cleanEmail)) {
        setInputError(`Baris ${lineNum}: Akun "${cleanEmail}" duplikat (sudah ditulis di baris sebelumnya).`);
        showToast('warning', 'Akun Duplikat', `Akun ${cleanEmail} ditulis lebih dari 1 kali.`);
        return;
      }

      const alreadySubmitted = submissions.some(
        (sub) => sub.dataContent.trim().toLowerCase() === cleanEmail
      );
      if (alreadySubmitted) {
        setInputError(`Baris ${lineNum}: Akun "${cleanEmail}" sudah pernah Anda setorkan sebelumnya.`);
        showToast('warning', 'Sudah Pernah Disetor', `Akun ${cleanEmail} sudah ada di riwayat storan Anda.`);
        return;
      }

      cleanedEmails.push(cleanEmail);
    }

    try {
      if (storanType === 'khusus') {
        for (let i = 0; i < cleanedEmails.length; i++) {
          const email = cleanedEmails[i];
          const isGenerated = await verifyUserGeneratedEmail(email, currentUser?.uid);
          if (!isGenerated) {
            setInputError(
              `Baris ${i + 1} ("${email}") bukan hasil generate dari akun Anda! Untuk STOR Gmail Khusus (3k), semua akun harus diambil dari generator akun Anda.`
            );
            showToast(
              'error',
              'Nama Tidak Sesuai Generate',
              `Akun "${email}" tidak terdaftar dalam riwayat generate akun Anda. Pilih "STOR Gmail Bebas" jika menggunakan nama buatan sendiri.`
            );
            return;
          }
        }
      }

      setValidatedEmails(cleanedEmails);
      setInputData(cleanedEmails.join('\n'));
      setShowConfirmModal(true);
    } catch (err: any) {
      console.error('Error saat memvalidasi akun:', err);
      showToast('error', 'Gagal Memvalidasi Akun', err?.message || 'Terjadi kesalahan saat memvalidasi akun.');
    }
  };

  const handleConfirmSubmit = async () => {
    if (!currentUser || !userProfile || validatedEmails.length === 0) return;
    setSubmitting(true);

    try {
      if (!settings.storanOpen) {
        showToast('error', 'Layanan Tidak Tersedia', 'Layanan storan saat ini sedang tidak dapat diakses.');
        setShowConfirmModal(false);
        setSubmitting(false);
        return;
      }
      if (storanType === 'khusus' && isKhususClosed) {
        showToast('error', 'Akses Dibatasi', 'Storan Gmail Khusus saat ini tidak dapat diakses.');
        setShowConfirmModal(false);
        setSubmitting(false);
        return;
      }
      if (storanType === 'bebas' && isBebasClosed) {
        showToast('error', 'Akses Dibatasi', 'Storan Gmail Bebas saat ini tidak dapat diakses.');
        setShowConfirmModal(false);
        setSubmitting(false);
        return;
      }

      if (storanType === 'khusus') {
        for (const email of validatedEmails) {
          const isGenerated = await verifyUserGeneratedEmail(email, currentUser.uid);
          if (!isGenerated) {
            setInputError(`Akun "${email}" bukan hasil generate dari akun Anda!`);
            showToast(
              'error',
              'Nama Tidak Sesuai Generate',
              `Akun "${email}" harus sama persis dengan yang di-generate oleh akun Anda masing-masing.`
            );
            setShowConfirmModal(false);
            setSubmitting(false);
            return;
          }
        }
      }

      for (const email of validatedEmails) {
        const newSubmissionData = {
          userId: currentUser.uid,
          userEmail: currentUser.email || '',
          userName: userProfile.displayName || 'Freelancer',
          dataContent: email,
          rewardAmount: pricePerAccount,
          submissionType: storanType,
          status: 'Pending' as const,
          createdAt: new Date().toISOString(),
        };
        await addDoc(collection(db, 'submissions'), newSubmissionData);
      }

      if (storanType === 'khusus') {
        try {
          const activeKey = `gmail_gen_saved_${currentUser.uid}`;
          const raw = localStorage.getItem(activeKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const remaining = parsed.filter((item: any) => {
                const itemEmail = (item.email || '').trim().toLowerCase();
                return !validatedEmails.some(
                  (ve) => ve === itemEmail || ve.split('@')[0] === itemEmail.split('@')[0]
                );
              });
              localStorage.setItem(activeKey, JSON.stringify(remaining));
            }
          }
        } catch (cleanErr) {
          console.warn('Gagal update storage setelah stor:', cleanErr);
        }
      }

      showToast(
        'success',
        `${validatedEmails.length} Akun Gmail (${storanType === 'khusus' ? 'Khusus 3k' : 'Bebas 2.7k'}) Berhasil Disetor`,
        'dalam pengecekan admin tunggu 24-30 jam'
      );

      setInputData('');
      setValidatedEmails([]);
      setShowConfirmModal(false);
    } catch (error) {
      setShowConfirmModal(false);
      handleFirestoreError(error, OperationType.CREATE, 'submissions');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectFromGenerator = (email: string) => {
    if (isKhususClosed) {
      showToast('error', 'Akses Dibatasi', 'Layanan Storan Gmail Khusus saat ini tidak dapat diakses.');
      return;
    }
    const currentLines = inputData
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const lower = email.toLowerCase();
    if (currentLines.map((c) => c.toLowerCase()).includes(lower)) {
      showToast('info', 'Sudah Ada', `Akun ${email} sudah ada dalam daftar stor.`);
      return;
    }
    if (currentLines.length >= 5) {
      showToast('info', 'Batas 5 Akun Penuh', 'Kolom storan sudah berisi 5 akun (maksimal 5 akun per proses).');
      return;
    }

    const updated = [...currentLines, lower].join('\n');
    setInputData(updated);
    setInputError('');

    const formEl = document.getElementById('submission-form-card');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-blue-600 to-[#38bdf8] text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Send className="w-5 h-5 text-white" />
          </div>
          <span>Storan Akun Gmail / Google</span>
        </h1>
      </div>

      {!settings.storanOpen && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold">Layanan Storan Sedang Tutup</div>
            <p className="text-xs text-rose-700 mt-0.5 whitespace-pre-line leading-relaxed">
              {settings.storanClosedReason ||
                `Admin sedang menutup penerimaan akun baru. Storan aktif setiap ${settings.storanSchedule}. Silakan kembali pada jam operasional.`}
            </p>
          </div>
        </div>
      )}

      {/* Pemberitahuan jika salah satu atau kedua fitur ditutup */}
      {settings.storanOpen && isKhususClosed && !isBebasClosed && (
        <div className="p-4 rounded-2xl bg-amber-50/95 border border-amber-200 text-amber-950 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <div className="font-bold text-sm text-amber-900 mb-0.5">
              Fitur STOR Gmail Khusus (3k) Ditutup Sementara
            </div>
            <p className="text-amber-800">
              Admin sedang menutup sementara penerimaan akun Gmail Khusus (nama ter-generate). Silakan gunakan tab <strong>STOR Gmail Bebas (Rp 2.700 / Akun)</strong> di bawah ini untuk menyetorkan akun dengan nama kreasi Anda sendiri.
            </p>
          </div>
        </div>
      )}

      {settings.storanOpen && isBebasClosed && !isKhususClosed && (
        <div className="p-4 rounded-2xl bg-amber-50/95 border border-amber-200 text-amber-950 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <div className="font-bold text-sm text-amber-900 mb-0.5">
              Fitur STOR Gmail Bebas (2.7k) Ditutup Sementara
            </div>
            <p className="text-amber-800">
              Admin sedang menutup sementara penerimaan akun Gmail Bebas. Silakan gunakan tab <strong>STOR Gmail Khusus (Rp 3.000 / Akun)</strong> di bawah ini untuk menyetorkan akun menggunakan generator nama yang disediakan.
            </p>
          </div>
        </div>
      )}

      {settings.storanOpen && isKhususClosed && isBebasClosed && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <div className="font-bold text-sm text-rose-900 mb-0.5">
              Semua Fitur STOR Gmail (Khusus & Bebas) Ditutup Sementara
            </div>
            <p className="text-rose-800">
              Admin saat ini sedang menutup penerimaan akun baru untuk kedua jenis storan. Silakan tunggu hingga admin membukanya kembali.
            </p>
          </div>
        </div>
      )}

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
        <div className="lg:col-span-7 space-y-6">
          <RulesCard onNavigate={onNavigate} />

          <div className="bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 pl-1.5 text-xs font-black text-slate-800 tracking-tight shrink-0">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Jenis Storan:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 flex-1 sm:max-w-md">
              <button
                type="button"
                disabled={isKhususClosed}
                onClick={() => {
                  if (isKhususClosed) return;
                  setStoranType('khusus');
                  setInputError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 relative ${
                  isKhususClosed
                    ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 select-none shadow-none border border-slate-200'
                    : storanType === 'khusus'
                    ? 'bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white shadow-xs ring-2 ring-blue-500/20 cursor-pointer'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                }`}
              >
                <span>Gmail Khusus</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isKhususClosed
                      ? 'bg-rose-100 text-rose-700'
                      : storanType === 'khusus'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {isKhususClosed ? 'TUTUP' : '3k'}
                </span>
              </button>
              <button
                type="button"
                disabled={isBebasClosed}
                onClick={() => {
                  if (isBebasClosed) return;
                  setStoranType('bebas');
                  setInputError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 relative ${
                  isBebasClosed
                    ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 select-none shadow-none border border-slate-200'
                    : storanType === 'bebas'
                    ? 'bg-teal-600 text-white shadow-xs ring-2 ring-teal-500/20 cursor-pointer'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer'
                }`}
              >
                <span>Gmail Bebas</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    isBebasClosed
                      ? 'bg-rose-100 text-rose-700'
                      : storanType === 'bebas'
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {isBebasClosed ? 'TUTUP' : '2.7k'}
                </span>
              </button>
            </div>
          </div>

          {storanType === 'khusus' && !isKhususClosed && (
            <GmailGenerator
              onOpenContactAdmin={openContactModal}
              submittedEmails={submissions.map((s) => s.dataContent.trim().toLowerCase())}
              onSelectEmailForStoran={handleSelectFromGenerator}
            />
          )}

          {storanType === 'bebas' && !isBebasClosed && (
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 rounded-2xl p-4 border border-teal-200/80 text-xs text-teal-950 flex items-start gap-3 shadow-2xs">
              <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <strong className="block text-xs font-black text-teal-950 mb-0.5">
                  Ketentuan STOR Gmail Bebas (Rp 2.700 / Akun)
                </strong>
                <p className="text-[11px] text-teal-800 leading-relaxed">
                  Bebas memakai nama Gmail apa saja kreasi Anda (tanpa perlu generate). Password WAJIB{' '}
                  <strong className="font-mono text-orange-600 font-bold bg-white px-1 py-0.5 rounded border border-orange-200">{activePassword}</strong>, dan pastikan tidak ada 2FA atau verifikasi nomor HP yang terkunci.
                </p>
              </div>
            </div>
          )}

          <div id="submission-form-card" className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
            {submissions.some((s) => s.status === 'Pending' || s.status === 'Cek Admin') && (
              <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 flex items-start gap-3 shadow-2xs">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-amber-950 flex items-center justify-between gap-2">
                    <span>Storan Akun Sedang Diproses ({submissions.filter((s) => s.status === 'Pending' || s.status === 'Cek Admin').length} Antrean)</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200/70 text-amber-900 uppercase">
                      Proses
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1 font-semibold">
                    dalam pengecekan admin tunggu 24-30 jam
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Form Setor {storanType === 'khusus' ? 'Gmail Khusus (3k)' : 'Gmail Bebas (2.7k)'}</span>
              </h2>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                storanType === 'khusus'
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                  : 'bg-teal-50 text-teal-700 border-teal-100'
              }`}>
                Rp {storanType === 'khusus' ? '3.000' : '2.700'} / Akun
              </span>
            </div>

            <form onSubmit={handleOpenConfirm} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Alamat Akun Gmail yang Disetor (1 Baris = 1 Akun, Maks 5)</span>
                  <span className="text-[11px] font-semibold text-indigo-600">
                    {inputData.split('\n').filter((l) => l.trim().length > 0).length}/5 Baris Terisi
                  </span>
                </label>
                <div className="relative">
                  <textarea
                    rows={5}
                    disabled={isCurrentTypeClosed || userProfile?.status === 'suspended'}
                    value={inputData}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n');
                      if (lines.length > 5) {
                        setInputData(lines.slice(0, 5).join('\n'));
                      } else {
                        setInputData(e.target.value);
                      }
                      setInputError('');
                    }}
                    placeholder={
                      storanType === 'khusus'
                        ? "nama.khusus1@gmail.com\nnama.khusus2@gmail.com\n(harus dari hasil generate)"
                        : "namabebas1@gmail.com\nnamabebas2@gmail.com\n(bebas buatan sendiri, pw: sgsg1122)"
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-xs sm:text-sm font-mono text-slate-800 outline-none resize-none transition disabled:bg-slate-100 disabled:text-slate-400 shadow-xs"
                    style={{ minHeight: '140px', lineHeight: '26px' }}
                  />
                </div>
                {inputError && (
                  <p className="text-xs text-rose-600 font-semibold mt-1.5">{inputError}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>
                      {storanType === 'khusus'
                        ? '1 baris = 1 akun Gmail dari generator khusus (Rp 3.000 / akun).'
                        : '1 baris = 1 akun Gmail bebas (Rp 2.700 / akun, wajib password sgsg1122).'}
                    </span>
                  </span>
                  {inputData.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputData('');
                        setInputError('');
                      }}
                      className="text-slate-400 hover:text-rose-600 text-xs font-semibold cursor-pointer underline transition"
                    >
                      Kosongkan Kolom
                    </button>
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-orange-50/90 border border-orange-200 text-xs text-orange-950 flex items-start gap-2.5">
                <KeyRound className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  <strong className="text-orange-950">Ketentuan Password:</strong> Akun yang disetor WAJIB memakai password{' '}
                  <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-orange-300 text-orange-600 font-bold">{activePassword}</strong>.
                  Jangan aktifkan 2FA (Verifikasi 2 Langkah).
                </span>
              </div>

              {inputData.split('\n').filter((l) => l.trim().length > 0).length > 0 && (
                <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">
                    Estimasi Imbalan ({inputData.split('\n').filter((l) => l.trim().length > 0).length} Akun {storanType === 'khusus' ? 'Khusus' : 'Bebas'}):
                  </span>
                  <span className="font-black text-indigo-700 text-sm">
                    {formatRupiah(
                      inputData.split('\n').filter((l) => l.trim().length > 0).length * pricePerAccount
                    )}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isCurrentTypeClosed ||
                  userProfile?.status === 'suspended' ||
                  !inputData.trim() ||
                  submitting
                }
                className={`w-full py-3.5 px-4 text-white font-black tracking-wide rounded-xl text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  isCurrentTypeClosed || userProfile?.status === 'suspended'
                    ? 'bg-slate-400 cursor-not-allowed shadow-none'
                    : storanType === 'khusus'
                    ? 'bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-700 hover:from-indigo-700 hover:to-blue-800 shadow-indigo-500/25 cursor-pointer'
                    : 'bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 shadow-teal-500/25 cursor-pointer'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>
                  {isCurrentTypeClosed
                    ? 'Akses Tidak Tersedia'
                    : `STOR GMAIL ${storanType === 'khusus' ? 'KHUSUS (3K)' : 'BEBAS (2.7K)'} - (${inputData.split('\n').filter((l) => l.trim().length > 0).length || 1} AKUN)`}
                </span>
              </button>
            </form>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 text-slate-600 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Riwayat storan dan fitur Cek Gmail status akun ada di tab <strong>Riwayat</strong>.
              </span>
            </div>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg shrink-0">
              {submissions.length} Total Storan
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50/60 rounded-2xl p-5 border border-indigo-100 space-y-3">
            <div className="flex items-center gap-2.5 text-indigo-900 font-bold text-sm">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Estimasi Waktu Verifikasi</span>
            </div>
            <p className="text-xs text-indigo-800 leading-relaxed font-semibold">
              Semua akun Gmail yang disetor akan masuk status pending dalam pengecekan admin tunggu 24-30 jam.
            </p>
            <div className="pt-2 border-t border-indigo-200/60 flex items-center justify-between text-xs text-indigo-900 font-medium">
              <span>Jam Operasional:</span>
              <strong>{settings.storanSchedule}</strong>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1 }}
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
                  <p className="text-xs text-slate-500">Pastikan data akun sudah benar sebelum dikirim</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Daftar Akun ({validatedEmails.length} Akun):
                  </p>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {validatedEmails.map((email, idx) => (
                    <div
                      key={email}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs font-bold text-slate-800 break-all flex items-center gap-2 shadow-2xs"
                    >
                      <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-[10px] font-mono shrink-0">
                        {idx + 1}
                      </span>
                      <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate">{email}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-slate-600">
                  <span>Jenis Storan:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md text-xs ${
                    storanType === 'khusus'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-teal-100 text-teal-800'
                  }`}>
                    {storanType === 'khusus' ? 'Gmail Khusus (Rp 3.000/akun)' : 'Gmail Bebas (Rp 2.700/akun)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Password Wajib:</span>
                  <span className="font-mono font-bold text-orange-600">{activePassword}</span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Estimasi Imbalan ({validatedEmails.length} Akun):</span>
                  <span className="font-extrabold text-indigo-700 text-sm">
                    {formatRupiah(pricePerAccount * validatedEmails.length)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Status 2FA:</span>
                  <span className="font-semibold text-emerald-700">Wajib Nonaktif</span>
                </div>

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2 font-semibold">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>dalam pengecekan admin tunggu 24-30 jam</span>
                </div>
              </div>

              <p className="text-xs font-medium text-slate-600 text-center">
                Pastikan semua akun Gmail sudah berhasil dibuat di Google dan password sesuai ketentuan sebelum mengirim.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 font-bold text-sm text-slate-700 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-sm text-white shadow-md shadow-indigo-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Kirim {validatedEmails.length} Akun Sekarang</span>
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
