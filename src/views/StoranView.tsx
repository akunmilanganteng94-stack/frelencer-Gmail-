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
    <div className="max-w-2xl mx-auto pb-12 sm:pb-16 px-1">
      {/* 1 KOTAK DI BELAKANG DENGAN RADIUS 17 */}
      <div className="rounded-[17px] bg-slate-50/80 backdrop-blur-md p-3.5 sm:p-5 border border-slate-200/80 shadow-[0_4px_24px_rgba(0,0,0,0.03)] space-y-5">
        {/* MOBILE APP HEADER */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[28px] p-5 sm:p-6 border border-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
          {/* Soft pastel ambient background glow */}
          <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-gradient-to-br from-blue-200/40 via-sky-200/30 to-blue-100/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-gradient-to-tr from-sky-200/40 via-teal-100/30 to-transparent blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] text-white flex items-center justify-center shadow-lg shadow-blue-600/25 shrink-0 ring-4 ring-white/70">
                <Send className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    Layanan Resmi
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                  Storan Akun Gmail / Google
                </h1>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Setor akun Gmail terverifikasi untuk mendapatkan imbalan saldo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <div className="px-3 py-1.5 rounded-2xl bg-slate-50/90 border border-slate-200/70 text-slate-700 text-xs font-semibold flex items-center gap-1.5 shadow-2xs">
                <KeyRound className="w-3.5 h-3.5 text-orange-500" />
                <span>PW:</span>
                <strong className="font-mono text-orange-600 font-bold">{activePassword}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* STATUS ALERT CARDS */}
        {!settings.storanOpen && (
          <div className="p-4 sm:p-5 rounded-3xl bg-rose-50/85 backdrop-blur-md border border-rose-200/90 text-rose-950 flex items-start gap-3.5 shadow-[0_4px_20px_rgba(244,63,94,0.08)]">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-sm">
              <div className="font-black text-rose-900">Layanan Storan Sedang Tutup</div>
              <p className="text-xs text-rose-800 mt-1 whitespace-pre-line leading-relaxed font-medium">
                {settings.storanClosedReason ||
                  `Admin sedang menutup penerimaan akun baru. Storan aktif setiap ${settings.storanSchedule}. Silakan kembali pada jam operasional.`}
              </p>
            </div>
          </div>
        )}

        {/* Pemberitahuan HANYA jika SEMUA fitur storan (Khusus & Bebas) ditutup bersamaan */}
        {settings.storanOpen && isKhususClosed && isBebasClosed && (
          <div className="p-4 sm:p-5 rounded-3xl bg-rose-50/85 backdrop-blur-md border border-rose-200/90 text-rose-950 flex items-start gap-3.5 shadow-[0_4px_20px_rgba(244,63,94,0.08)]">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <div className="text-xs leading-relaxed">
              <div className="font-black text-sm text-rose-900 mb-0.5">
                Semua Fitur STOR Gmail (Khusus & Bebas) Ditutup Sementara
              </div>
              <p className="text-rose-800 font-medium">
                Admin saat ini sedang menutup penerimaan akun baru untuk kedua jenis storan. Silakan tunggu hingga admin membukanya kembali.
              </p>
            </div>
          </div>
        )}

        {userProfile?.status === 'suspended' && (
          <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/90 backdrop-blur-md border border-amber-200/90 text-amber-900 flex items-start gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-sm">
              <div className="font-black text-amber-900">Akun Kamu Sedang Dibatasi (Suspended)</div>
              <p className="text-xs text-amber-800 mt-1 font-medium">
                Aktivitas akun kamu sedang ditangguhkan oleh administrator. Kamu tidak dapat mengirim Gmail baru saat ini.
              </p>
            </div>
          </div>
        )}

        {/* RULES CARD DI ATAS */}
        <RulesCard onNavigate={onNavigate} />

        {/* CARD: PILIHAN JENIS STORAN (SEGMENTED CONTROL SOFT UI) */}
        <div className="bg-white/85 backdrop-blur-xl rounded-[28px] p-3 sm:p-4 border border-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.03)] space-y-2">
          <div className="flex items-center justify-between px-1.5 pt-0.5">
            <div className="text-xs font-black text-slate-800 tracking-tight">
              <span>Jenis Storan:</span>
            </div>
            <span className="text-[11px] font-bold text-slate-400">Pilih salah satu</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isKhususClosed}
              onClick={() => {
                if (isKhususClosed) return;
                setStoranType('khusus');
                setInputError('');
              }}
              className={`py-3 px-3 rounded-2xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 relative cursor-pointer active:scale-98 ${
                isKhususClosed
                  ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 select-none shadow-none border border-slate-200'
                  : storanType === 'khusus'
                  ? 'bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] text-white shadow-md shadow-blue-600/25 ring-2 ring-blue-500/20'
                  : 'bg-slate-100/90 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <span>Gmail Khusus</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
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
              className={`py-3 px-3 rounded-2xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 relative cursor-pointer active:scale-98 ${
                isBebasClosed
                  ? 'opacity-60 cursor-not-allowed bg-slate-100 text-slate-400 select-none shadow-none border border-slate-200'
                  : storanType === 'bebas'
                  ? 'bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-600 text-white shadow-md shadow-teal-500/25 ring-2 ring-teal-500/20'
                  : 'bg-slate-100/90 hover:bg-slate-200/80 text-slate-700'
              }`}
            >
              <span>Gmail Bebas</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
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

        {/* GENERATOR ATAU KETENTUAN BEBAS CARD */}
        {storanType === 'khusus' && !isKhususClosed && (
          <GmailGenerator
            onOpenContactAdmin={openContactModal}
            submittedEmails={submissions.map((s) => s.dataContent.trim().toLowerCase())}
            onSelectEmailForStoran={handleSelectFromGenerator}
          />
        )}

        {storanType === 'bebas' && !isBebasClosed && (
          <div className="bg-gradient-to-r from-teal-50/90 via-emerald-50/80 to-teal-50/90 rounded-[28px] p-5 border border-teal-200/70 text-xs text-teal-950 flex items-start gap-3.5 shadow-[0_4px_20px_rgba(20,184,166,0.06)]">
            <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <strong className="block text-sm font-black text-teal-950 mb-1">
                Ketentuan STOR Gmail Bebas (Rp 2.700 / Akun)
              </strong>
              <p className="text-xs text-teal-900 leading-relaxed font-medium">
                Bebas memakai nama Gmail apa saja kreasi Anda (tanpa perlu generate). Password WAJIB{' '}
                <strong className="font-mono text-orange-600 font-bold bg-white px-1.5 py-0.5 rounded border border-orange-200 shadow-2xs">{activePassword}</strong>, dan pastikan tidak ada 2FA atau verifikasi nomor HP yang terkunci.
              </p>
            </div>
          </div>
        )}

        {/* FORM SETORAN CARD */}
        <div id="submission-form-card" className="bg-white/90 backdrop-blur-xl rounded-[32px] p-6 sm:p-7 border border-white/90 shadow-[0_12px_36px_rgb(0,0,0,0.04)] space-y-5">
          {submissions.some((s) => s.status === 'Pending' || s.status === 'Cek Admin') && (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-950 flex items-start gap-3 shadow-2xs">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-amber-950 flex items-center justify-between gap-2">
                  <span>Storan Akun Sedang Diproses ({submissions.filter((s) => s.status === 'Pending' || s.status === 'Cek Admin').length} Antrean)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/80 text-amber-900 uppercase">
                    Proses
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1 font-semibold">
                  dalam pengecekan admin tunggu 24-30 jam
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>Form Setor {storanType === 'khusus' ? 'Gmail Khusus (3k)' : 'Gmail Bebas (2.7k)'}</span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Masukkan 1 akun Gmail per baris (maksimal 5 akun per pengiriman)
              </p>
            </div>
            <span className={`text-xs font-black px-3 py-1.5 rounded-xl border self-start sm:self-center shadow-2xs ${
              storanType === 'khusus'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-teal-50 text-teal-700 border-teal-200'
            }`}>
              Rp {storanType === 'khusus' ? '3.000' : '2.700'} / Akun
            </span>
          </div>

          <form onSubmit={handleOpenConfirm} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>Alamat Akun Gmail yang Disetor (1 Baris = 1 Akun, Maks 5)</span>
                <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                  {inputData.split('\n').filter((l) => l.trim().length > 0).length}/5 Baris Terisi
                </span>
              </label>

              <div className="relative">
                <textarea
                  id="storan-textarea"
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-200/90 bg-slate-50/70 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-mono text-slate-900 outline-none resize-none transition-all disabled:bg-slate-100 disabled:text-slate-400 shadow-inner"
                  style={{ minHeight: '150px', lineHeight: '28px' }}
                />
              </div>

              {inputError && (
                <p className="text-xs text-rose-600 font-bold mt-2 px-1 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{inputError}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
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

            <div className="p-4 rounded-2xl bg-orange-50/80 border border-orange-200/80 text-xs text-orange-950 flex items-start gap-3 shadow-2xs">
              <KeyRound className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">
                <strong className="text-orange-950 font-bold">Ketentuan Password:</strong> Akun yang disetor WAJIB memakai password{' '}
                <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-orange-300 text-orange-600 font-bold shadow-2xs">{activePassword}</strong>.
                Jangan aktifkan 2FA (Verifikasi 2 Langkah).
              </span>
            </div>

            {inputData.split('\n').filter((l) => l.trim().length > 0).length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-sky-50/70 to-blue-50/90 border border-blue-100 flex items-center justify-between text-xs shadow-2xs">
                <span className="font-bold text-slate-700">
                  Estimasi Imbalan ({inputData.split('\n').filter((l) => l.trim().length > 0).length} Akun {storanType === 'khusus' ? 'Khusus' : 'Bebas'}):
                </span>
                <span className="font-black text-blue-700 text-base sm:text-lg">
                  {formatRupiah(
                    inputData.split('\n').filter((l) => l.trim().length > 0).length * pricePerAccount
                  )}
                </span>
              </div>
            )}

            {/* INLINE SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={
                isCurrentTypeClosed ||
                userProfile?.status === 'suspended' ||
                !inputData.trim() ||
                submitting
              }
              className={`w-full py-4 px-5 text-white font-black tracking-wide rounded-2xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none ${
                isCurrentTypeClosed || userProfile?.status === 'suspended'
                  ? 'bg-slate-400 cursor-not-allowed shadow-none'
                  : storanType === 'khusus'
                  ? 'bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 shadow-blue-600/25'
                  : 'bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-700 hover:to-emerald-800 shadow-teal-500/25'
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

        {/* ESTIMASI WAKTU VERIFIKASI & INFO CARD */}
        <div className="bg-gradient-to-br from-blue-50/80 via-sky-50/60 to-blue-50/50 rounded-[28px] p-5 sm:p-6 border border-blue-100/80 space-y-3 shadow-xs">
          <div className="flex items-center gap-2.5 text-blue-950 font-black text-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Estimasi Waktu Verifikasi</span>
          </div>
          <p className="text-xs text-blue-900 leading-relaxed font-medium">
            Semua akun Gmail yang disetor akan masuk status pending dalam pengecekan admin tunggu 24-30 jam.
          </p>
          <div className="pt-2 border-t border-blue-200/50 flex items-center justify-between text-xs text-blue-950 font-medium">
            <span>Jam Operasional:</span>
            <strong className="font-bold">{settings.storanSchedule}</strong>
          </div>
        </div>

        {/* FOOTER SUMMARY CARD */}
        <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/70 text-slate-600 text-xs flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              Riwayat storan dan fitur Cek Gmail status akun ada di tab <strong>Riwayat</strong>.
            </span>
          </div>
          <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl shrink-0 border border-blue-100">
            {submissions.length} Total Storan
          </span>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md bg-white rounded-[32px] shadow-2xl border border-slate-200 p-6 space-y-5"
            >
              <div className="flex items-center gap-3 text-blue-600">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Konfirmasi Setor Akun Gmail
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">Pastikan data akun sudah benar sebelum dikirim</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                    Daftar Akun ({validatedEmails.length} Akun):
                  </p>
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {validatedEmails.map((email, idx) => (
                    <div
                      key={email}
                      className="p-2.5 rounded-xl border border-slate-200 bg-white font-mono text-xs font-bold text-slate-800 break-all flex items-center gap-2 shadow-2xs"
                    >
                      <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-mono shrink-0">
                        {idx + 1}
                      </span>
                      <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span className="truncate">{email}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-1 text-xs text-slate-600">
                  <span>Jenis Storan:</span>
                  <span className={`font-bold px-2 py-0.5 rounded-md text-xs ${
                    storanType === 'khusus'
                      ? 'bg-blue-100 text-blue-800'
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
                  <span className="font-extrabold text-blue-700 text-sm">
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
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 font-bold text-sm text-white shadow-md shadow-blue-600/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
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
