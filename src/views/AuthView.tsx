import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Shield,
  Gift,
} from 'lucide-react';
import { ApkDownloadCard } from '../components/ApkDownloadCard';
import {
  captureReferralFromUrl,
  getPendingReferralCode,
  setPendingReferralCode,
  normalizeReferralCode,
} from '../lib/referralHelper';
import { motion, AnimatePresence } from 'motion/react';

export function AuthView() {
  const { loginUser, registerUser, resetPassword, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    const raw = captureReferralFromUrl() || getPendingReferralCode();
    if (raw) {
      const clean = normalizeReferralCode(raw);
      setReferralCodeInput(clean);
      setPendingReferralCode(clean);
      setMode('register');
    }
  }, []);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setFormError('');
    try {
      const effectiveRef = normalizeReferralCode(referralCodeInput || getPendingReferralCode());
      await loginWithGoogle(effectiveRef);
      showToast('success', 'Login Google Berhasil', 'Selamat datang di AZGmail.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes('auth/popup-closed-by-user') ||
        errorMessage.includes('auth/cancelled-popup-request')
      ) {
        setFormError('Jendela masuk Google ditutup sebelum selesai.');
        return;
      }
      if (errorMessage.includes('auth/popup-blocked')) {
        setFormError('Jendela pop-up Google diblokir oleh browser. Izinkan pop-up di peramban Anda.');
        showToast('error', 'Popup Diblokir', 'Izinkan pop-up di pengaturan browser Anda.');
      } else {
        setFormError('Gagal masuk dengan Google. Anda juga dapat mendaftar/masuk dengan email & kata sandi.');
        showToast('error', 'Login Google', 'Gagal masuk dengan Google. Silakan coba lagi atau gunakan email.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (mode === 'register') {
      if (!name.trim()) {
        setFormError('Nama lengkap wajib diisi');
        return;
      }
      if (password.length < 6) {
        setFormError('Kata sandi minimal 6 karakter');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Konfirmasi kata sandi tidak cocok');
        return;
      }
    }

    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (mode === 'login') {
        await loginUser(cleanEmail, password);
        showToast('success', 'Login Berhasil', 'Selamat datang kembali.');
      } else if (mode === 'register') {
        const effectiveRef = normalizeReferralCode(referralCodeInput || getPendingReferralCode());
        await registerUser(name.trim(), cleanEmail, password, effectiveRef);
        showToast('success', 'Pendaftaran Berhasil', 'Akun kamu siap digunakan untuk mengirim storan.');
      } else if (mode === 'forgot') {
        await resetPassword(cleanEmail);
        showToast('success', 'Email Terkirim', 'Silakan periksa kotak masuk email kamu untuk reset kata sandi.');
        setMode('login');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      let friendlyMsg = 'Terjadi kesalahan, silakan coba lagi.';
      if (
        errorMessage.includes('auth/invalid-credential') ||
        errorMessage.includes('auth/wrong-password') ||
        errorMessage.includes('auth/user-not-found')
      ) {
        friendlyMsg =
          'Email atau kata sandi yang Anda masukkan salah. Jika belum memiliki akun, silakan klik menu "Daftar Akun" di atas.';
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        friendlyMsg = 'Email sudah terdaftar. Silakan gunakan menu "Masuk (Login)".';
      } else if (errorMessage.includes('auth/weak-password')) {
        friendlyMsg = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
      } else if (errorMessage.includes('auth/invalid-email')) {
        friendlyMsg = 'Format email tidak valid. Pastikan tidak ada spasi di awal atau akhir email.';
      } else {
        friendlyMsg = errorMessage;
      }
      setFormError(friendlyMsg);
      showToast('error', 'Gagal Masuk', friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF8FF] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1677E8] shadow-lg shadow-blue-500/25 mb-3 text-white">
            <Mail className="w-8 h-8 text-white stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight select-none">
            <span className="text-[#0D5FC7]">AZ</span>
            <span className="text-[#1677E8]">Gmail</span>
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 font-medium">
            Platform storan data aman, profesional, dan realtime
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-xl shadow-slate-200/60 rounded-3xl border border-slate-200/80">
          {mode !== 'forgot' && (
            <div className="flex rounded-xl bg-slate-100/90 p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormError('');
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Masuk (Login)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setFormError('');
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Daftar Akun
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setFormError('');
                }}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-2 cursor-pointer"
              >
                Kembali ke Login
              </button>
              <h2 className="text-lg font-bold text-slate-900">Lupa Kata Sandi</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan email kamu untuk menerima tautan pemulihan kata sandi.
              </p>
            </div>
          )}

          {mode !== 'forgot' && (
            <div className="mb-5 space-y-3">
              {(referralCodeInput || getPendingReferralCode()) && (
                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50/90 via-sky-50/80 to-blue-50/90 border border-blue-200 text-blue-900 text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-blue-950">Undangan Teman Terdeteksi!</div>
                      <div className="text-[11px] text-blue-800">
                        Kode Referral: <strong className="font-mono bg-blue-100/90 px-1.5 py-0.5 rounded text-blue-900 font-black">{referralCodeInput || getPendingReferralCode()}</strong> terhubung otomatis saat kamu mendaftar.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 text-slate-700 font-bold rounded-xl text-xs sm:text-sm shadow-xs transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
              >
                {googleLoading ? (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {mode === 'login'
                    ? 'Masuk dengan Google'
                    : 'Daftar dengan Google'}
                </span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-2.5 text-[11px] text-slate-400 font-semibold absolute uppercase tracking-wider">
                  atau dengan email
                </span>
              </div>
            </div>
          )}

          {formError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <motion.div
                  key="name-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-1.5"
                >
                  <label className="block text-xs font-bold text-slate-700">Nama Lengkap</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Nama lengkap Anda"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none transition bg-white"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Alamat Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none transition bg-white"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setFormError('');
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
                    >
                      Lupa sandi?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none transition bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    aria-label="Tampilkan sandi"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <AnimatePresence mode="wait">
              {mode === 'register' && (
                <>
                  <motion.div
                    key="confirm-pass-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <label className="block text-xs font-bold text-slate-700">
                      Konfirmasi Kata Sandi
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPass ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ketik ulang kata sandi"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm outline-none transition bg-white"
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    key="referral-code-field"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-blue-600" />
                        <span>Kode Referral Teman (Opsional)</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Bisa dikosongkan</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={referralCodeInput}
                        onChange={(e) => {
                          const val = normalizeReferralCode(e.target.value);
                          setReferralCodeInput(val);
                          if (val) {
                            setPendingReferralCode(val);
                          }
                        }}
                        placeholder="Contoh: AZG12345"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-mono uppercase tracking-wider outline-none transition bg-white"
                      />
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>
                      {mode === 'login'
                        ? 'Masuk Sekarang'
                        : mode === 'register'
                        ? 'Buat Akun Freelancer'
                        : 'Kirim Tautan Reset'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <ApkDownloadCard variant="compact" />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Data terlindungi dengan Firebase Authentication &amp; Firestore</span>
          </div>
        </div>
      </div>
    </div>
  );
}
