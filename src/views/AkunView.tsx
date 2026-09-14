import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useContactAdmin } from '../context/ContactAdminContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import { NavigationTab } from '../types';
import {
  User,
  Mail,
  Fingerprint,
  Wallet,
  Calendar,
  Edit2,
  Lock,
  LogOut,
  ShieldCheck,
  Check,
  Copy,
  MessageCircle,
  PhoneCall,
  ExternalLink,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AkunView({ onNavigate }: { onNavigate: (tab: NavigationTab) => void }) {
  const { userProfile, currentUser, isAdmin, logoutUser, updateProfileName, changePassword } = useAuth();
  const { settings } = useSettings();
  const { openContactModal } = useContactAdmin();
  const { showToast } = useToast();

  const [copiedUid, setCopiedUid] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [nameInput, setNameInput] = useState(userProfile?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passError, setPassError] = useState('');

  const rawNumber = settings.adminWhatsApp || '6285199219856';
  const formattedNumber = rawNumber.startsWith('62')
    ? `+62 ${rawNumber.substring(2, 5)}-${rawNumber.substring(5, 9)}-${rawNumber.substring(9)}`
    : rawNumber;

  const waUrl = `https://wa.me/${rawNumber}?text=${encodeURIComponent(
    'Halo Admin AZGmail, saya ingin bertanya terkait storan akun Gmail & saldo saya.'
  )}`;

  const copyUid = () => {
    if (currentUser?.uid) {
      navigator.clipboard.writeText(currentUser.uid);
      setCopiedUid(true);
      setTimeout(() => setCopiedUid(false), 2000);
      showToast('info', 'UID Tersalin', 'User ID berhasil disalin ke papan klip.');
    }
  };

  const copyWaNumber = () => {
    navigator.clipboard.writeText(rawNumber);
    setCopiedWa(true);
    setTimeout(() => setCopiedWa(false), 2000);
    showToast('info', 'Nomor Disalin', `Nomor WhatsApp ${rawNumber} berhasil disalin.`);
  };

  const handleOpenWhatsApp = () => {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
          <User className="w-7 h-7 text-blue-600" />
          <span>Profil Pengguna</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Informasi identitas akun freelancer, bantuan admin, saldo, dan keamanan login
        </p>
      </div>

      {/* Main Profile Info Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl sm:text-3xl shadow-lg shadow-blue-500/20">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-extrabold text-slate-900">
                  {userProfile?.displayName || 'Freelancer'}
                </h2>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                    Admin
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold">
                    Freelancer
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500 mt-0.5">{userProfile?.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    userProfile?.status === 'active'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  Akun {userProfile?.status === 'active' ? 'Aktif' : 'Dibatasi'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setNameInput(userProfile?.displayName || '');
                setShowEditModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Profil</span>
            </button>
            <button
              onClick={() => {
                setNewPassword('');
                setConfirmPassword('');
                setPassError('');
                setShowPasswordModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-2 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Ubah Password</span>
            </button>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t border-slate-100">
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white text-blue-600 flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs text-slate-400 font-bold block">Email Terdaftar</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                {userProfile?.email}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-3.5">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-xs">
                <Fingerprint className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs text-slate-400 font-bold block">User ID (UID)</span>
                <span className="text-xs font-mono font-bold text-slate-800 truncate block">
                  {currentUser?.uid}
                </span>
              </div>
            </div>
            <button
              onClick={copyUid}
              className="p-2 rounded-xl hover:bg-slate-200 text-slate-500 transition cursor-pointer"
              title="Salin UID"
            >
              {copiedUid ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white text-emerald-600 flex items-center justify-center shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold block">Saldo Saat Ini</span>
              <span className="text-sm sm:text-base font-black text-blue-700">
                {formatRupiah(userProfile?.balance || 0)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white text-amber-600 flex items-center justify-center shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 font-bold block">Tanggal Bergabung</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                {userProfile?.createdAt ? formatIndonesianDateTime(userProfile.createdAt) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* CHAT ADMIN SECTION (DIPINDAHKAN KE PROFIL) */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border border-emerald-200/80 p-5 sm:p-6 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/25 shrink-0">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Chat Admin WhatsApp
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                      Resmi
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hubungi admin resmi untuk kendala akun, storan Gmail, atau penarikan saldo
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat Sekarang</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={openContactModal}
                  className="px-3.5 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 font-bold rounded-xl text-xs sm:text-sm border border-emerald-200 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  <span>Detail Info</span>
                </button>
              </div>
            </div>

            {/* Quick WhatsApp Number Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-emerald-100 shadow-2xs">
              <div className="flex items-center gap-2.5 text-xs text-slate-700">
                <PhoneCall className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-slate-500 font-semibold">Nomor Admin:</span>
                <span className="font-mono font-black text-slate-900 text-sm">{formattedNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyWaNumber}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedWa ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Salin Nomor</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Operational schedule hint */}
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Jam Operasional: <strong>{settings.storanSchedule}</strong>
              </span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-indigo-600 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-indigo-950">Akses Administrator Terdeteksi</h4>
                <p className="text-xs text-indigo-700">
                  Kamu memiliki hak akses untuk mengelola submission, penarikan, pengguna, dan pengaturan sistem.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('admin')}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              Buka Admin Panel
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">AZGmail Freelancer • Session Aman</span>
          <button
            onClick={() => logoutUser()}
            className="px-4 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition flex items-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>

      {/* Edit Name Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">Ubah Nama Lengkap</h3>
              <form onSubmit={handleSaveName} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={savingName}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingName}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {savingName ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">Ubah Kata Sandi</h3>
              {passError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {passError}
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-3.5">
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none"
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={savingPassword}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
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
