import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Submission, Withdrawal, ReferralItem, NavigationTab } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatIndonesianDateTime, formatRupiah, maskEmail } from '../lib/utils';
import { ApkDownloadCard } from '../components/ApkDownloadCard';
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  Edit2,
  Check,
  X,
  LogOut,
  Sparkles,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  Copy,
  Gift,
  Share2,
  Users,
  ChevronRight,
  Shield,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProfileViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export function ProfileView({ onNavigate }: ProfileViewProps) {
  const { currentUser, userProfile, logoutUser, updateProfileName, changePassword, resetPassword, isAdmin } =
    useAuth();
  const { showToast } = useToast();

  // Submissions & Withdrawals for Live Statistics
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameInput, setEditNameInput] = useState(userProfile?.displayName || '');
  const [savingName, setSavingName] = useState(false);

  // Change Password State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);
  const [sendingResetEmail, setSendingResetEmail] = useState(false);

  // Mini Referral Modal State ("misi refferal nya jangan panjang cukup kecil dan pencet")
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Copied UID state
  const [copiedUid, setCopiedUid] = useState(false);

  // Referral code for this user
  const referralCode = userProfile?.referralCode || 'AZGMAIL';

  // Realtime listeners for user stats & referrals
  useEffect(() => {
    if (!currentUser) return;

    const qSub = query(collection(db, 'submissions'), where('userId', '==', currentUser.uid));
    const unsubSub = onSnapshot(
      qSub,
      (snap) => {
        const list: Submission[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Submission, 'id'>) }));
        setSubmissions(list);
        setLoadingStats(false);
      },
      (err) => {
        console.warn('Submissions snapshot error in ProfileView:', err);
        setLoadingStats(false);
      }
    );

    const qWith = query(collection(db, 'withdrawals'), where('userId', '==', currentUser.uid));
    const unsubWith = onSnapshot(
      qWith,
      (snap) => {
        const list: Withdrawal[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Withdrawal, 'id'>) }));
        setWithdrawals(list);
      },
      (err) => {
        console.warn('Withdrawals snapshot error in ProfileView:', err);
      }
    );

    const qRef = query(collection(db, 'referrals'), where('inviterUid', '==', currentUser.uid));
    const unsubRef = onSnapshot(
      qRef,
      (snap) => {
        const rList: ReferralItem[] = [];
        snap.forEach((d) => rList.push({ id: d.id, ...(d.data() as Omit<ReferralItem, 'id'>) }));
        setReferrals(rList);
      },
      (err) => {
        console.warn('Referrals snapshot error in ProfileView:', err);
      }
    );

    return () => {
      unsubSub();
      unsubWith();
      unsubRef();
    };
  }, [currentUser]);

  // Sync edit name input when userProfile updates
  useEffect(() => {
    if (userProfile?.displayName) {
      setEditNameInput(userProfile.displayName);
    }
  }, [userProfile?.displayName]);

  // Calculated Statistics (TANPA SALDO)
  const stats = useMemo(() => {
    const total = submissions.length;
    const accepted = submissions.filter((s) => s.status === 'Diterima').length;
    const cekAdmin = submissions.filter((s) => s.status === 'Cek Admin').length;
    const pending = submissions.filter((s) => s.status === 'Pending').length;
    const rejected = submissions.filter((s) => s.status === 'Ditolak').length;
    const approvalRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    return {
      total,
      accepted,
      cekAdmin,
      pending,
      rejected,
      approvalRate,
    };
  }, [submissions]);

  // Handle Save Name
  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!editNameInput.trim()) {
      showToast('warning', 'Nama Kosong', 'Nama tampilan tidak boleh kosong.');
      return;
    }
    setSavingName(true);
    try {
      await updateProfileName(editNameInput.trim());
      setIsEditingName(false);
      showToast('success', 'Nama Diperbarui', 'Nama profil Anda berhasil disimpan.');
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingName(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      showToast('warning', 'Password Kosong', 'Masukkan password baru Anda.');
      return;
    }
    if (newPassword.length < 6) {
      showToast('warning', 'Password Terlalu Pendek', 'Password minimal terdiri dari 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('warning', 'Password Tidak Cocok', 'Konfirmasi password tidak cocok.');
      return;
    }

    setChangingPass(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
      showToast('success', 'Password Berhasil Diubah', 'Password akun Anda berhasil diperbarui.');
    } catch (err: unknown) {
      console.warn('Change password error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('requires-recent-login')) {
        showToast(
          'error',
          'Perlu Login Ulang',
          'Sesi login Anda sudah terlalu lama. Silakan logout dan login kembali untuk mengganti password.'
        );
      } else {
        showToast('error', 'Gagal Mengubah Password', errMsg);
      }
    } finally {
      setChangingPass(false);
    }
  };

  // Handle Send Reset Password Link
  const handleSendResetEmail = async () => {
    if (!currentUser?.email) return;
    setSendingResetEmail(true);
    try {
      await resetPassword(currentUser.email);
      showToast('success', 'Email Terkirim', `Link reset password dikirim ke ${currentUser.email}.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal Mengirim Email', err instanceof Error ? err.message : String(err));
    } finally {
      setSendingResetEmail(false);
    }
  };

  const handleCopyUid = () => {
    if (!currentUser?.uid) return;
    navigator.clipboard.writeText(currentUser.uid);
    setCopiedUid(true);
    showToast('info', 'Tersalin', 'User ID (UID) disalin ke clipboard.');
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleCopyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    showToast('success', 'Tersalin', `Kode referral ${referralCode} disalin.`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyReferralLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}?ref=${encodeURIComponent(referralCode)}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast('success', 'Tersalin', 'Link undangan referral disalin.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto pb-6">
      {/* 1. HEADER PROFIL (BERSIH, RAPI, PROFESIONAL, TANPA SALDO, TANPA INFO BAWAH) */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-blue-500/30 border border-white/20 shrink-0">
            {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {isEditingName ? (
                <form onSubmit={handleSaveName} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editNameInput}
                    onChange={(e) => setEditNameInput(e.target.value)}
                    className="px-2.5 py-1 text-sm font-bold bg-white text-slate-900 rounded-lg outline-none max-w-[180px]"
                    placeholder="Nama Lengkap"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={savingName}
                    className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <>
                  <h2 className="text-lg sm:text-xl font-black tracking-tight text-white truncate">
                    {userProfile?.displayName || 'Freelancer'}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0"
                    title="Ubah Nama Profil"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-400 text-slate-950 tracking-wider">
                  Admin
                </span>
              )}
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {userProfile?.status === 'suspended' ? 'Ditangguhkan' : 'Terverifikasi'}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-medium">
              Freelancer Mitra Terdaftar AZGmail
            </p>
          </div>
        </div>
      </div>

      {/* 2. STATISTIK AKUN FREELANCER (RAPI, MINIMALIS, PROFESIONAL) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-900">
              Statistik Akun
            </h3>
          </div>
          <span className="text-[11px] font-bold text-slate-400 font-mono">
            {stats.total} Total Storan
          </span>
        </div>

        {loadingStats ? (
          <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Memuat data performa akun...</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            {/* Total Storan */}
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[9px] font-bold uppercase text-slate-400 block tracking-wider">
                Total
              </span>
              <strong className="text-base sm:text-lg font-black font-mono text-slate-900 block mt-0.5">
                {stats.total}
              </strong>
              <span className="text-[9px] text-slate-400">Akun</span>
            </div>

            {/* Diterima */}
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <span className="text-[9px] font-bold uppercase text-emerald-700 block tracking-wider">
                Diterima
              </span>
              <strong className="text-base sm:text-lg font-black font-mono text-emerald-700 block mt-0.5">
                {stats.accepted}
              </strong>
              <span className="text-[9px] text-emerald-600">Valid</span>
            </div>

            {/* Cek Admin */}
            <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-100">
              <span className="text-[9px] font-bold uppercase text-blue-700 block tracking-wider">
                Proses
              </span>
              <strong className="text-base sm:text-lg font-black font-mono text-blue-700 block mt-0.5">
                {stats.cekAdmin}
              </strong>
              <span className="text-[9px] text-blue-600">Cek Admin</span>
            </div>

            {/* Pending */}
            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-100">
              <span className="text-[9px] font-bold uppercase text-amber-700 block tracking-wider">
                Pending
              </span>
              <strong className="text-base sm:text-lg font-black font-mono text-amber-800 block mt-0.5">
                {stats.pending}
              </strong>
              <span className="text-[9px] text-amber-700">Antrean</span>
            </div>

            {/* Ditolak */}
            <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-100">
              <span className="text-[9px] font-bold uppercase text-rose-700 block tracking-wider">
                Ditolak
              </span>
              <strong className="text-base sm:text-lg font-black font-mono text-rose-700 block mt-0.5">
                {stats.rejected}
              </strong>
              <span className="text-[9px] text-rose-600">Gagal</span>
            </div>

            {/* Rasio Approval Rate */}
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100">
              <span className="text-[9px] font-bold uppercase text-indigo-700 block tracking-wider">
                Rate
              </span>
              <strong className="text-base sm:text-lg font-black font-mono text-indigo-700 block mt-0.5">
                {stats.approvalRate}%
              </strong>
              <span className="text-[9px] text-indigo-600">Approval</span>
            </div>
          </div>
        )}
      </div>

      {/* 3. UBAH PASSWORD (PROFESIONAL & RAPI) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Ubah Password
              </h3>
              <p className="text-[11px] text-slate-400">
                Ganti kata sandi akun secara berkala
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition cursor-pointer active:scale-95"
          >
            {showPasswordSection ? 'Tutup' : 'Ubah Password'}
          </button>
        </div>

        <AnimatePresence>
          {showPasswordSection && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleChangePassword}
              className="pt-3 border-t border-slate-100 space-y-3 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Password Baru:</label>
                  <div className="relative">
                    <input
                      type={showNewPass ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 karakter..."
                      className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-slate-200 focus:border-purple-600 outline-none bg-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPass(!showNewPass)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Konfirmasi Password Baru:</label>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:border-purple-600 outline-none bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={sendingResetEmail}
                  className="text-xs font-bold text-purple-700 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{sendingResetEmail ? 'Mengirim...' : 'Kirim Link ke Email'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false);
                      setNewPassword('');
                      setConfirmPassword('');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={changingPass}
                    className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {changingPass ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* 4. MISI REFERRAL: KECIL & PENCET (TIDAK PANJANG SESUAI PERMINTAAN) */}
      <div
        onClick={() => setShowReferralModal(true)}
        className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-200/80 hover:border-amber-300 rounded-3xl p-4 transition cursor-pointer active:scale-98 flex items-center justify-between gap-3 shadow-2xs group"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <Gift className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                Misi Referral &amp; Bonus
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900 shrink-0">
                {referrals.length} Teman
              </span>
            </div>
            <p className="text-[11px] text-slate-600 truncate mt-0.5">
              Kode: <strong className="font-mono text-amber-800">{referralCode}</strong> &bull; Klik untuk detail &amp; link
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-800 shrink-0 bg-white/80 px-3 py-1.5 rounded-xl border border-amber-200">
          <span>Pencet</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* MODAL MISI REFERRAL SAAT DIPENCET */}
      <AnimatePresence>
        {showReferralModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-slate-900">
                      Misi &amp; Bonus Referral
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Ajak teman menyetor akun Gmail di AZGmail
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Kode & Link Undangan */}
              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] text-amber-700 font-bold uppercase block">
                      Kode Referral Anda:
                    </span>
                    <strong className="text-base font-mono font-black text-amber-900">
                      {referralCode}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyReferralCode}
                    className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 transition cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Tersalin' : 'Salin Kode'}</span>
                  </button>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      Link Langsung:
                    </span>
                    <span className="text-xs text-slate-700 font-mono truncate block">
                      ?ref={referralCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyReferralLink}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1 shadow-2xs shrink-0"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
                  </button>
                </div>
              </div>

              {/* Teman Diundang */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span>Daftar Teman Bergabung:</span>
                  <span className="text-amber-700">{referrals.length} orang</span>
                </div>
                {referrals.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 text-center text-xs text-slate-400">
                    Belum ada teman yang menggunakan kode referral Anda.
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {referrals.map((item) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{item.invitedName || 'Freelancer'}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{maskEmail(item.invitedEmail)}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {item.status === 'completed' ? 'Selesai' : 'Terdaftar'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowReferralModal(false)}
                className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Tutup
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. GANTI NAVIGASI FITUR DENGAN PANEL ADMIN KHUSUS ROLE ADMIN (USER KOSONGIN) */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-3xl p-5 border border-slate-800 text-white shadow-md flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-600/30 shrink-0">
              <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white">
                Panel Administrator
              </h3>
              <p className="text-[11px] text-slate-300">
                Kelola batch, validasi storan, payouts &amp; stok generator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-xs font-bold transition cursor-pointer shadow-sm shrink-0"
          >
            Buka Panel
          </button>
        </div>
      )}

      {/* 6. UNDUH APK ANDROID */}
      <ApkDownloadCard />

      {/* 7. NAMA GMAIL, UID, TGL BERGABUNG DI BAWAH (SESUAI PERMINTAAN) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Informasi Akun
        </h4>

        <div className="space-y-2.5 text-xs divide-y divide-slate-100">
          {/* Nama Gmail */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Nama Gmail:</span>
            </span>
            <span className="font-mono font-bold text-slate-900 select-all">
              {currentUser?.email}
            </span>
          </div>

          {/* UID Pengguna */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>UID Pengguna:</span>
            </span>
            <button
              type="button"
              onClick={handleCopyUid}
              className="inline-flex items-center gap-1 font-mono font-bold text-blue-700 hover:text-blue-800 transition cursor-pointer"
              title="Salin UID"
            >
              <span>{currentUser?.uid}</span>
              {copiedUid ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          </div>

          {/* Tanggal Bergabung */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tgl Bergabung:</span>
            </span>
            <span className="text-slate-700 font-medium text-[11px]">
              {formatIndonesianDateTime(userProfile?.createdAt || new Date().toISOString())}
            </span>
          </div>
        </div>
      </div>

      {/* 8. KELUAR AKUN PALING BAWAH WARNA MERAH (SESUAI PERMINTAAN) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={logoutUser}
          className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
        >
          <LogOut className="w-4 h-4 stroke-[2.2]" />
          <span>Keluar Akun</span>
        </button>
      </div>
    </div>
  );
}
