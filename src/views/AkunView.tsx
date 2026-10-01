import { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatIndonesianDateTime } from '../lib/utils';
import { NavigationTab, Submission } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  User,
  Camera,
  Copy,
  Check,
  Trophy,
  KeyRound,
  ChevronRight,
  LogOut,
  Edit2,
  ShieldCheck,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AkunView({ onNavigate }: { onNavigate: (tab: NavigationTab) => void }) {
  const { userProfile, currentUser, isAdmin, logoutUser, updateProfileName, changePassword } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [copiedUid, setCopiedUid] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [nameInput, setNameInput] = useState(userProfile?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passError, setPassError] = useState('');

  // Submissions state for Statistik Total
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  // Avatar state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load avatar from localStorage
  useEffect(() => {
    if (currentUser?.uid) {
      const savedAvatar = localStorage.getItem(`user_avatar_${currentUser.uid}`);
      if (savedAvatar) {
        setAvatarUrl(savedAvatar);
      } else if (currentUser.photoURL) {
        setAvatarUrl(currentUser.photoURL);
      }
    }
  }, [currentUser]);

  // Load Submissions realtime for authentic user stats
  useEffect(() => {
    if (!currentUser) return;
    const qSubs = query(
      collection(db, 'submissions'),
      where('userId', '==', currentUser.uid)
    );
    const unsubSubs = onSnapshot(
      qSubs,
      (snapshot) => {
        const list: Submission[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as Omit<Submission, 'id'>) });
        });
        setSubmissions(list);
      },
      (err) => console.warn('Submissions load in profile notice:', err)
    );
    return () => {
      unsubSubs();
    };
  }, [currentUser]);

  // Statistik Realtime
  const totalStoran = submissions.length;
  const totalDiterima = submissions.filter((s) => s.status === 'Diterima').length;
  const totalDitolak = submissions.filter((s) => s.status === 'Ditolak').length;
  const totalPending = submissions.filter((s) => s.status === 'Pending' || s.status === 'Cek Admin').length;

  const copyUid = () => {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
      showToast('info', 'UID Tersalin', 'User ID berhasil disalin ke papan klip.');
    }
  };

  const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Ukuran Terlalu Besar', 'Maksimal ukuran foto adalah 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
        if (currentUser?.uid) {
          try {
            localStorage.setItem(`user_avatar_${currentUser.uid}`, result);
          } catch {
            console.warn('Storage limit reached for avatar');
          }
        }
        showToast('success', 'Foto Diperbarui', 'Foto profil berhasil diubah.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = () => {
    setAvatarUrl(null);
    if (currentUser?.uid) {
      localStorage.removeItem(`user_avatar_${currentUser.uid}`);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    showToast('info', 'Foto Dihapus', 'Foto profil telah dihapus.');
  };

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      await updateProfileName(nameInput);
      showToast('success', 'Profil Diperbarui', 'Nama tampilan kamu berhasil diubah.');
      setShowEditModal(false);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : 'Gagal memperbarui profil.');
    } finally {
      setSavingName(false);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPassError('');
    if (newPassword.length < 6) {
      setPassError('Kata sandi minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassError('Konfirmasi kata sandi tidak cocok.');
      return;
    }
    setSavingPassword(true);
    try {
      await changePassword(newPassword);
      showToast('success', 'Sandi Berhasil Diubah', 'Kata sandi akun kamu telah diperbarui.');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengubah kata sandi.';
      setPassError(msg);
      showToast('error', 'Gagal', msg);
    } finally {
      setSavingPassword(false);
    }
  };

  const displayName = userProfile?.displayName || 'User';
  const email = userProfile?.email || '';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  return (
    <div className="max-w-[480px] sm:max-w-md md:max-w-lg mx-auto space-y-4 select-none pb-12">
      {/* Hidden file input for photo upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoSelect}
        accept="image/*"
        className="hidden"
      />

      {/* CARD PROFILE UTAMA */}
      <div className="bg-white rounded-[28px] sm:rounded-[32px] overflow-hidden shadow-sm border border-blue-100/60">
        <div className="bg-gradient-to-r from-[#1677E8] via-[#126fe3] to-[#0D5FC7] px-6 pt-5 pb-14 text-white relative">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
              <User className="w-4 h-4 text-white stroke-[2.2]" />
            </div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
              Profil Saya
            </h1>
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 flex flex-col items-center text-center relative">
          <div className="-mt-12 relative mb-3">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-white shadow-md bg-gradient-to-tr from-[#1677E8] to-[#38bdf8] text-white flex items-center justify-center font-black text-3xl sm:text-4xl overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initial}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#1677E8] hover:bg-[#0D5FC7] text-white flex items-center justify-center shadow-md border-2 border-white transition cursor-pointer active:scale-90"
              title="Ganti Foto Profil"
              aria-label="Ganti Foto"
            >
              <Camera className="w-4 h-4 stroke-[2.2]" />
            </button>
          </div>

          <div className="space-y-0.5 max-w-xs">
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="text-lg sm:text-xl font-extrabold text-[#102033] tracking-tight truncate">
                {displayName}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setNameInput(displayName);
                  setShowEditModal(true);
                }}
                className="p-1 rounded-md text-slate-400 hover:text-[#1677E8] hover:bg-blue-50 transition cursor-pointer"
                title="Edit Nama Tampilan"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium truncate">
              {email}
            </p>
          </div>

          <div className="pt-4 flex items-center justify-center gap-2.5 w-full max-w-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3.5 rounded-xl bg-[#1677E8] hover:bg-[#0D5FC7] active:scale-95 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Ganti Foto</span>
            </button>
            <button
              type="button"
              onClick={handleDeletePhoto}
              className="flex-1 py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
            >
              <span>Hapus</span>
            </button>
          </div>
        </div>
      </div>

      {/* DATA USER */}
      <div className="bg-white rounded-[26px] p-4 sm:p-5 shadow-sm border border-blue-100/60 space-y-3">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider px-1">
          Informasi Akun
        </h3>
        <div className="space-y-2">
          {/* UID */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                UID
              </span>
              <span className="font-mono text-xs font-bold text-[#102033] truncate block mt-0.5">
                {currentUser?.uid || '-'}
              </span>
            </div>
            <button
              type="button"
              onClick={copyUid}
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#1677E8] hover:bg-blue-50 transition cursor-pointer shrink-0"
              title="Salin UID"
            >
              {copiedUid ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* EMAIL */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                EMAIL
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#102033] truncate block mt-0.5">
                {email || '-'}
              </span>
            </div>
          </div>

          {/* ROLE */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                ROLE
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#102033] block mt-0.5 capitalize">
                {userProfile?.role === 'admin' ? 'Admin' : 'User'}
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isAdmin
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {isAdmin ? 'Administrator' : 'Freelancer'}
            </span>
          </div>

          {/* TANGGAL GABUNG */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                TANGGAL GABUNG
              </span>
              <span className="text-xs sm:text-sm font-bold text-[#102033] block mt-0.5">
                {userProfile?.createdAt ? formatIndonesianDateTime(userProfile.createdAt) : '-'}
              </span>
            </div>
          </div>

          {/* KATA SANDI DIUBAH */}
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100 flex items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                KATA SANDI DIUBAH
              </span>
              <span className="text-xs font-bold text-emerald-700 block mt-0.5">
                Sudah Diatur
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* STATISTIK TOTAL */}
      <div className="bg-white rounded-[26px] p-4 sm:p-5 shadow-sm border border-blue-100/60 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-[#102033] tracking-tight">
            Statistik Total
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">
              Total Storan
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#1677E8] mt-1 font-mono">
              {totalStoran}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">
              Diterima
            </span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 font-mono">
              {totalDiterima}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">
              Ditolak
            </span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 mt-1 font-mono">
              {totalDitolak}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block">
              Pending
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#F59E0B] mt-1 font-mono">
              {totalPending}
            </div>
          </div>
        </div>
      </div>

      {/* KEAMANAN AKUN */}
      <div className="bg-white rounded-[26px] p-4 sm:p-5 shadow-sm border border-blue-100/60 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4 stroke-[2.2]" />
          </div>
          <h3 className="text-sm sm:text-base font-black text-[#102033] tracking-tight">
            Keamanan Akun
          </h3>
        </div>

        <button
          type="button"
          onClick={() => {
            setNewPassword('');
            setConfirmPassword('');
            setPassError('');
            setShowPasswordModal(true);
          }}
          className="w-full p-3.5 rounded-2xl bg-[#F8FAFC] hover:bg-slate-100 border border-slate-100 active:scale-98 transition flex items-center justify-between cursor-pointer group text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white text-[#1677E8] flex items-center justify-center shadow-2xs border border-slate-200/60">
              <KeyRound className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-[#102033] group-hover:text-[#1677E8] transition">
                Ganti Kata Sandi
              </span>
              <p className="text-[11px] text-slate-400">
                Perbarui kata sandi login akun Anda
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#1677E8] group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* KELUAR AKUN */}
      <button
        type="button"
        onClick={() => logoutUser()}
        className="w-full py-3.5 sm:py-4 px-5 rounded-[22px] bg-[#EF4444] hover:bg-[#DC2626] active:scale-98 text-white font-extrabold text-sm sm:text-base shadow-sm shadow-red-500/25 transition flex items-center justify-center gap-2.5 cursor-pointer"
      >
        <LogOut className="w-5 h-5 stroke-[2.2]" />
        <span>Keluar dari Akun</span>
      </button>

      {/* Admin Panel Link if Admin */}
      {isAdmin && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigate('admin')}
            className="w-full py-3 px-4 rounded-2xl bg-blue-50 hover:bg-blue-100 text-[#1677E8] font-bold text-xs border border-blue-200 transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Buka Admin Control Panel</span>
          </button>
        </div>
      )}

      {/* Edit Name Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-5 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-black text-[#102033]">
                  Ubah Nama Lengkap
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveName} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={savingName}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingName}
                    className="flex-1 py-2.5 rounded-xl bg-[#1677E8] hover:bg-[#0D5FC7] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    {savingName ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-slate-100 p-5 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-black text-[#102033]">
                  Ganti Kata Sandi
                </h3>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {passError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {passError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kata Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Ketik ulang kata sandi"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-[#1677E8] focus:ring-2 focus:ring-[#1677E8]/20 text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={savingPassword}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex-1 py-2.5 rounded-xl bg-[#1677E8] hover:bg-[#0D5FC7] text-white text-xs font-bold transition cursor-pointer shadow-xs"
                  >
                    {savingPassword ? 'Menyimpan...' : 'Perbarui Sandi'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
