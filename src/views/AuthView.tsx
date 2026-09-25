import { useState, FormEvent } from 'react';
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
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { AZGmailLogo } from '../components/GmailLogo';
import { motion, AnimatePresence } from 'motion/react';

interface ErrorDiagnosis {
  code: string;
  title: string;
  description: string;
  solution: string[];
  raw?: string;
}

export function AuthView() {
  const { loginUser, registerUser, resetPassword, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [diagnosis, setDiagnosis] = useState<ErrorDiagnosis | null>(null);
  const [copiedHost, setCopiedHost] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const copyDomain = async () => {
    if (!currentHostname) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(currentHostname);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentHostname;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedHost(true);
      showToast('success', 'Domain Disalin', currentHostname);
      setTimeout(() => setCopiedHost(false), 3000);
    } catch {
      showToast('info', 'Domain Anda', currentHostname);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setFormError('');
    setDiagnosis(null);
    try {
      await loginWithGoogle();
      showToast('success', 'Login Google Berhasil', 'Selamat datang di AZGmail.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      if (
        errorMessage.includes('auth/popup-closed-by-user') ||
        errorMessage.includes('auth/cancelled-popup-request')
      ) {
        console.info('Google sign-in popup dismissed by user.');
        setFormError('Jendela masuk Google ditutup sebelum selesai.');
        return;
      }

      console.error('Google Sign-In Error Details:', err);

      if (
        errorMessage.includes('auth/operation-not-allowed') ||
        errorMessage.includes('CONFIGURATION_NOT_FOUND') ||
        errorMessage.includes('configuration-not-found')
      ) {
        const diag: ErrorDiagnosis = {
          code: 'auth/operation-not-allowed',
          title: 'Penyedia Google Belum Diaktifkan di Firebase',
          description:
            'Firebase Authentication pada proyek Anda belum mengaktifkan fitur masuk dengan Google (Google Sign-in Provider).',
          solution: [
            'Buka Firebase Console > menu Authentication > tab "Sign-in method".',
            'Klik tombol "Add new provider" atau pilih penyedia "Google".',
            'Nyalakan sakelar "Enable" (Aktifkan).',
            'Wajib pilih atau masukkan "Project support email" (Email dukungan proyek).',
            'Klik tombol "Save" (Simpan).',
          ],
          raw: errorMessage,
        };
        setDiagnosis(diag);
        setFormError('Penyedia Google belum diaktifkan di Firebase Console.');
        showToast('error', 'Google Provider Belum Aktif', 'Aktifkan Google di menu Sign-in method Firebase.');
      } else if (errorMessage.includes('auth/unauthorized-domain')) {
        const diag: ErrorDiagnosis = {
          code: 'auth/unauthorized-domain',
          title: 'Domain Belum Diizinkan atau Masih Sinkronisasi',
          description: `Domain web yang sedang Anda buka (${currentHostname}) belum terverifikasi oleh Firebase.`,
          solution: [
            `Salin domain saat ini: "${currentHostname}" (klik tombol Salin di bawah).`,
            'Buka Firebase Console > Authentication > tab "Settings" > gulir ke "Authorized domains".',
            'Pastikan domain ditempelkan TANPA awalan "https://" dan TANPA garis miring "/" di belakang.',
            'PENTING: Setelah klik Add/Simpan, server Google butuh 1 hingga 3 menit untuk menyebarkan domain baru. Tunggu sebentar lalu refresh halaman.',
          ],
          raw: errorMessage,
        };
        setDiagnosis(diag);
        setFormError(`Domain "${currentHostname}" belum diizinkan atau masih proses propagasi di Firebase.`);
        showToast('error', 'Domain Belum Diizinkan', 'Periksa Authorized Domains di Firebase Console.');
      } else if (errorMessage.includes('auth/popup-blocked')) {
        const diag: ErrorDiagnosis = {
          code: 'auth/popup-blocked',
          title: 'Pop-up Browser Diblokir',
          description:
            'Peramban (browser) Anda memblokir jendela sembulan (pop-up) untuk masuk dengan Google.',
          solution: [
            'Periksa bilah alamat browser (address bar) di bagian kanan atas atau ikon gembok.',
            'Klik izin "Selalu izinkan pop-up untuk situs ini".',
            'Coba klik tombol "Masuk dengan Google" kembali, atau gunakan pendaftaran manual dengan email.',
          ],
          raw: errorMessage,
        };
        setDiagnosis(diag);
        setFormError('Jendela pop-up Google diblokir oleh browser.');
        showToast('error', 'Popup Diblokir', 'Izinkan pop-up di pengaturan browser Anda.');
      } else if (
        errorMessage.includes('auth/network-request-failed') ||
        errorMessage.includes('network error')
      ) {
        setFormError('Gagal terhubung ke server Google. Periksa koneksi internet atau matikan ekstensi AdBlock/VPN.');
        showToast('error', 'Koneksi Terputus', 'Periksa koneksi internet Anda.');
      } else if (errorMessage.includes('auth/invalid-credential')) {
        setFormError('Autentikasi Google dibatalkan atau tidak valid. Silakan coba kembali.');
        showToast('error', 'Login Google', 'Autentikasi akun Google tidak valid.');
      } else {
        const diag: ErrorDiagnosis = {
          code: 'auth/general-error',
          title: 'Kendala Autentikasi Google',
          description: errorMessage,
          solution: [
            'Pastikan koneksi internet stabil.',
            'Pastikan penyedia Google di Firebase Authentication > Sign-in method sudah berstatus Aktif.',
            'Pastikan Authorized Domains sudah memuat domain ini.',
            'Anda juga dapat mendaftar/masuk langsung dengan formulir Email & Kata Sandi di bawah.',
          ],
          raw: errorMessage,
        };
        setDiagnosis(diag);
        setFormError('Gagal login dengan Google: ' + errorMessage);
        showToast('error', 'Login Google', errorMessage);
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
        showToast('success', 'Login Berhasil', 'Selamat datang kembali di AZGmail.');
      } else if (mode === 'register') {
        await registerUser(name.trim(), cleanEmail, password);
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
          'Email atau kata sandi yang Anda masukkan salah. Jika belum memiliki akun, silakan klik menu "Daftar Akun" di atas, atau klik "Lupa sandi?" jika lupa kata sandi.';
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        friendlyMsg = 'Email sudah terdaftar. Silakan gunakan menu "Masuk (Login)".';
      } else if (errorMessage.includes('auth/weak-password')) {
        friendlyMsg = 'Kata sandi terlalu lemah. Gunakan minimal 6 karakter.';
      } else if (errorMessage.includes('auth/invalid-email')) {
        friendlyMsg = 'Format email tidak valid. Pastikan tidak ada spasi di awal atau akhir email.';
      } else if (errorMessage.includes('auth/too-many-requests')) {
        friendlyMsg = 'Terlalu banyak percobaan login yang gagal. Akun sementara dibatasi demi keamanan. Silakan tunggu beberapa saat atau gunakan "Lupa sandi?".';
      } else {
        console.error('Auth error:', errorMessage);
        friendlyMsg = errorMessage;
      }
      setFormError(friendlyMsg);
      showToast('error', 'Gagal Masuk', friendlyMsg);
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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[25px] bg-white shadow-lg shadow-blue-500/15 border border-blue-100 mb-3 p-1 overflow-hidden" style={{ borderRadius: '25px' }}>
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

          {diagnosis && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-slate-800 text-xs shadow-xs"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-amber-900 text-xs sm:text-sm">
                    {diagnosis.title}
                  </div>
                  <p className="text-slate-600 mt-1 text-[11px] leading-relaxed">
                    {diagnosis.description}
                  </p>

                  {/* Current domain badge with 1-click copy */}
                  <div className="mt-2.5 p-2 rounded-xl bg-white border border-amber-200/80 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Domain Anda Saat Ini
                      </span>
                      <code className="text-xs font-mono font-semibold text-blue-700 truncate block">
                        {currentHostname || 'Tidak terdeteksi'}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={copyDomain}
                      className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[11px] transition shadow-xs cursor-pointer"
                    >
                      {copiedHost ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Domain</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Step by step fix checklist */}
                  <div className="mt-2.5 space-y-1.5">
                    <span className="text-[11px] font-bold text-amber-900 block">
                      Solusi Perbaikan di Firebase Console:
                    </span>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 font-medium">
                      {diagnosis.solution.map((step, idx) => (
                        <li key={idx} className="leading-snug">
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {formError && !diagnosis && (
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
                disabled={loading || googleLoading}
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
            <span>Data terlindungi dengan Firebase Authentication &amp; Firestore</span>
          </div>
        </div>

        {/* Collapsible Firebase Domain & Provider Checklist */}
        <div className="mt-4 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs text-xs">
          <button
            type="button"
            onClick={() => setShowTroubleshoot(!showTroubleshoot)}
            className="w-full flex items-center justify-between font-bold text-slate-700 hover:text-blue-600 transition cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>Mengapa Login Google Belum Bisa? (Cek 3 Hal Ini)</span>
            </span>
            {showTroubleshoot ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showTroubleshoot && (
            <div className="mt-3 pt-3 border-t border-slate-100 space-y-3 text-slate-600">
              {/* Point 1: Google Provider Enabled */}
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <strong className="text-slate-800 font-semibold block">
                    Penyedia "Google" Harus Diaktifkan (Enabled)
                  </strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Buka Firebase Console &gt; Authentication &gt; tab <strong>Sign-in method</strong>. Pastikan status <strong>Google</strong> berwarna hijau/Enabled dan Email Dukungan Proyek (Project support email) sudah terisi.
                  </p>
                </div>
              </div>

              {/* Point 2: Domain Format */}
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <strong className="text-slate-800 font-semibold block">
                    Format Domain di Authorized Domains
                  </strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Di menu Authentication &gt; tab <strong>Settings</strong> &gt; <strong>Authorized domains</strong>, jangan sertakan <code>https://</code> atau tanda garis miring. Masukkan murni nama host.
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <code className="px-2 py-1 bg-slate-100 text-slate-800 rounded-md font-mono text-[11px] truncate flex-1">
                      {currentHostname || 'ais-...run.app'}
                    </code>
                    <button
                      type="button"
                      onClick={copyDomain}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md text-[11px] transition shrink-0 cursor-pointer"
                    >
                      {copiedHost ? 'Disalin!' : 'Salin'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Point 3: Propagation */}
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <strong className="text-slate-800 font-semibold block">
                    Waktu Sinkronisasi (Propagasi) Google CDN
                  </strong>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Setelah domain baru disimpan di Firebase, server Google memerlukan waktu <strong>1–3 menit</strong> agar domain aktif di seluruh dunia. Harap tunggu sebentar lalu muat ulang (Refresh / F5).
                  </p>
                </div>
              </div>

              {/* Alternative tip */}
              <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-[11px] text-blue-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Alternatif Instan:</strong> Anda juga dapat mendaftar langsung dengan mengetikkan Nama, Email, dan Sandi di formulir di atas lalu klik tombol <em>Buat Akun Freelancer</em>. Fitur ini langsung aktif seketika!
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
