import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useContactAdmin } from '../context/ContactAdminContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import { NavigationTab } from '../types';
import { MisiReferralBanner } from '../components/MisiReferralBanner';
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
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-3.5">
      <div>
        <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          <span>Profil Pengguna</span>
        </h1>
        <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
          Informasi identitas akun freelancer, misi referral, bantuan admin, saldo, dan keamanan login
        </p>
      </div>

      {/* Profile Card Header */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr from-[#1e40af] via-[#2563eb] to-[#38bdf8] text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md shadow-blue-500/25 shrink-0">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900">
                  {userProfile?.displayName || 'Freelancer'}
                </h2>
                {isAdmin ? (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                    Admin
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    Freelancer
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{userProfile?.email}</p>
              <div className="mt-1 flex items-center gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
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

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setNameInput(userProfile?.displayName || '');
                setShowEditModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
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
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Ubah Password</span>
            </button>
          </div>
        </div>

        {/* 4 Kotak Detail Identitas Ringkas */}
        <div className="mt-4 pt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-slate-100">
          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Email Terdaftar</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800 truncate block">
                {userProfile?.email}
              </span>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-white text-blue-600 flex items-center justify-center shadow-2xs shrink-0">
                <Fingerprint className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">User ID (UID)</span>
                <span className="text-xs font-mono font-bold text-slate-800 truncate block">
                  {currentUser?.uid}
                </span>
              </div>
            </div>
            <button
              onClick={copyUid}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition cursor-pointer shrink-0"
              title="Salin UID"
            >
              {copiedUid ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-emerald-600 flex items-center justify-center shadow-2xs shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Saldo Saat Ini</span>
              <span className="text-xs sm:text-sm font-black text-blue-700">
                {formatRupiah(userProfile?.balance || 0)}
              </span>
            </div>
          </div>

          <div className="p-2.5 sm:p-3 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white text-amber-600 flex items-center justify-center shadow-2xs shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Tanggal Bergabung</span>
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                {userProfile?.createdAt ? formatIndonesianDateTime(userProfile.createdAt) : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* BANNER MISI REFERRAL SIMPLE & SLEEK */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100">
          <MisiReferralBanner onNavigate={onNavigate} />
        </div>

        {/* WhatsApp Contact Box Ringkas */}
        <div className="mt-3.5 pt-3.5 border-t border-slate-100">
          <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white border border-emerald-200/80 p-3.5 sm:p-4 space-y-2.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-sm shadow-emerald-500/25 shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                      Chat Admin WhatsApp
                    </h3>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Resmi
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hubungi admin resmi untuk kendala akun, storan Gmail, atau penarikan saldo
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-lg text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat Sekarang</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={openContactModal}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 font-bold rounded-lg text-xs border border-emerald-200 shadow-2xs transition flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Detail Info</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-emerald-100 shadow-2xs">
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-slate-500 font-semibold text-[11px]">Nomor Admin:</span>
                <span className="font-mono font-black text-slate-900 text-xs sm:text-sm">{formattedNumber}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={copyWaNumber}
                  className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md text-[11px] font-bold border border-slate-200 transition flex items-center gap-1 cursor-pointer"
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

            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                Jam Operasional: <strong>{settings.storanSchedule}</strong>
              </span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="mt-3.5 p-3 rounded-xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-blue-950">Akses Administrator Terdeteksi</h4>
                <p className="text-[11px] text-blue-800">
                  Kamu memiliki hak akses untuk mengelola submission, penarikan, pengguna, dan pengaturan sistem.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate('admin')}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition cursor-pointer self-start sm:self-auto"
            >
              Buka Admin Panel
            </button>
          </div>
        )}

        <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">AZGmail Freelancer • Session Aman</span>
          <button
            onClick={() => logoutUser()}
            className="px-3 py-1.5 rounded-lg text-rose-600 hover:bg-rose-50 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-5 space-y-3"
            >
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Ubah Nama Lengkap</h3>
              <form onSubmit={handleSaveName} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    disabled={savingName}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingName}
                    className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {savingName ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-xl sm:rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-5 space-y-3"
            >
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Ubah Kata Sandi</h3>
              {passError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-lg font-medium">
                  {passError}
                </div>
              )}
              <form onSubmit={handleChangePassword} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Kata Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Konfirmasi Kata Sandi Baru
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Ketik ulang kata sandi"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    disabled={savingPassword}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingPassword}
                    className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
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
