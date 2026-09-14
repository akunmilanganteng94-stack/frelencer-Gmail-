import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Shield } from 'lucide-react';
import { AZGmailLogo } from '../components/GmailLogo';
import { motion, AnimatePresence } from 'motion/react';

export function AuthView() {
  const { loginUser, registerUser, resetPassword } = useAuth();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

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
    try {
      if (mode === 'login') {
        await loginUser(email, password);
        showToast('success', 'Login Berhasil', 'Selamat datang kembali di Freelancer Storan.');
      } else if (mode === 'register') {
        await registerUser(name, email, password);
        showToast('success', 'Pendaftaran Berhasil', 'Akun kamu siap digunakan untuk mengirim storan.');
      } else if (mode === 'forgot') {
        await resetPassword(email);
        showToast('success', 'Email Terkirim', 'Silakan periksa kotak masuk email kamu untuk reset kata sandi.');
        setMode('login');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Auth error:', errorMessage);
      let friendlyMsg = 'Terjadi kesalahan, silakan coba lagi.';
      if (
        errorMessage.includes('auth/invalid-credential') ||
        errorMessage.includes('auth/wrong-password') ||
        errorMessage.includes('auth/user-not-found')
      ) {
        friendlyMsg = 'Email atau kata sandi yang kamu masukkan salah.';
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        friendlyMsg = 'Email sudah terdaftar. Silakan gunakan menu Login.';
      } else if (errorMessage.includes('auth/weak-password')) {
        friendlyMsg = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
      } else if (errorMessage.includes('auth/invalid-email')) {
        friendlyMsg = 'Format email tidak valid.';
      }
      setFormError(friendlyMsg);
      showToast('error', 'Gagal', friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-lg shadow-blue-500/15 border border-blue-100 mb-3 p-2 overflow-hidden">
            <AZGmailLogo className="w-full h-full" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            AZGmail
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-medium">
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
                ← Kembali ke Login
              </button>
              <h2 className="text-lg font-bold text-slate-900">Lupa Kata Sandi</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Masukkan email kamu untuk menerima tautan pemulihan kata sandi.
              </p>
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
                      placeholder="Contoh: Azril Pratama"
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
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
              )}
            </AnimatePresence>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white font-bold rounded-xl text-sm shadow-md shadow-blue-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
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

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-500">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Data terlindungi dengan Firebase Authentication & Firestore</span>
          </div>
        </div>
      </div>
    </div>
  );
}
