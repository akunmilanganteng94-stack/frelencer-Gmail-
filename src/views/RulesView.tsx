import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useContactAdmin } from '../context/ContactAdminContext';
import { NavigationTab } from '../types';
import {
  ClipboardList,
  ShieldAlert,
  KeyRound,
  ArrowLeft,
  Copy,
  Check,
  Send,
  MessageCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface RulesViewProps {
  onNavigate?: (tab: NavigationTab) => void;
}

export function RulesView({ onNavigate }: RulesViewProps) {
  const { settings } = useSettings();
  const { openContactModal } = useContactAdmin();
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);

  const pw1 = settings.storanPassword1 || 'zero1122';
  const pw2 = settings.storanPassword2 || 'prabujaya';

  const handleCopyPw1 = () => {
    navigator.clipboard.writeText(pw1);
    setCopied1(true);
    setTimeout(() => setCopied1(false), 2000);
  };

  const handleCopyPw2 = () => {
    navigator.clipboard.writeText(pw2);
    setCopied2(true);
    setTimeout(() => setCopied2(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="w-10 h-10 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer"
              title="Kembali ke Home"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                Panduan Resmi
              </span>
              <span className="text-xs text-slate-400">&bull;</span>
              <span className="text-xs text-slate-500 font-medium">
                {settings.rules?.length || 0} Aturan Wajib
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Rules &amp; Ketentuan Storan
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('storan')}
              className="px-4 py-2 bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>STOR Gmail Sekarang</span>
            </button>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-r from-blue-50 via-indigo-50 to-white p-5 sm:p-6 border border-blue-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-blue-900">
                Pilihan Password Gmail Wajib (Pilih Salah Satu)
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-1.5">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-blue-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400">PW 1:</span>
                  <span className="font-mono text-base sm:text-lg font-black text-blue-700 select-all">
                    {pw1}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPw1}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-700 transition cursor-pointer"
                    title="Salin zero1122"
                  >
                    {copied1 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-indigo-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-400">PW 2:</span>
                  <span className="font-mono text-base sm:text-lg font-black text-indigo-700 select-all">
                    {pw2}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPw2}
                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-indigo-700 transition cursor-pointer"
                    title="Salin prabujaya"
                  >
                    {copied2 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-600 font-medium sm:text-right max-w-sm">
            Semua akun Gmail yang dibuat dan disetor <strong className="font-bold text-slate-900">WAJIB</strong> menggunakan salah satu password di atas (<code className="font-mono font-bold">zero1122</code> atau <code className="font-mono font-bold">prabujaya</code>).
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Daftar Ketentuan &amp; Syarat Validasi Akun
            </h2>
            <p className="text-xs text-slate-500">
              Pastikan Anda membaca dan mematuhi setiap butir aturan berikut
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {settings.rules?.map((rule, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/70 hover:bg-blue-50/30 border border-slate-200/70 transition text-sm text-slate-800 leading-relaxed shadow-2xs"
            >
              <span className="w-6 h-6 rounded-xl bg-blue-100 text-blue-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                {idx + 1}
              </span>
              <span className="font-medium pt-0.5">{rule}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-rose-50/80 border border-rose-200/80 p-5 sm:p-6 space-y-3 text-rose-950 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm sm:text-base font-extrabold text-rose-900">
              Larangan Keras: Jangan Aktifkan Verifikasi 2 Langkah (2FA)
            </h3>
            <p className="text-xs sm:text-sm text-rose-800 leading-relaxed font-medium">
              Dilarang menyalakan 2-Step Verification, verifikasi nomor HP saat login ulang, ataupun kode verifikasi SMS. Admin memeriksa akun satu per satu via sistem verifikasi. Jika akun meminta kode SMS atau terkunci, akun akan <strong className="font-bold underline">langsung ditolak</strong> dan tidak mendapatkan komisi.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Estimasi Verifikasi
            </div>
            <div className="text-sm font-black text-slate-900 mt-0.5">
              24 - 30 Jam
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Status pending dalam pengecekan admin tunggu 24-30 jam hingga diverifikasi.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Pencairan Saldo
            </div>
            <div className="text-sm font-black text-slate-900 mt-0.5">
              Otomatis ke Saldo Akun
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Setelah akun berstatus Diterima, komisi otomatis masuk dan siap ditarik ke DANA / GoPay.
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#1e40af] via-blue-700 to-sky-700 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black tracking-tight">
            Sudah Paham dengan Ketentuan?
          </h3>
          <p className="text-xs sm:text-sm text-blue-100 font-medium mt-0.5">
            Mulai generate nama Gmail dan setorkan akun Anda untuk mendapatkan saldo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('storan')}
              className="px-5 py-2.5 bg-white text-blue-800 font-black rounded-xl text-xs hover:bg-blue-50 transition shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Buka Menu STOR</span>
            </button>
          )}
          <button
            type="button"
            onClick={openContactModal}
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs border border-white/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Tanya Admin WA</span>
          </button>
        </div>
      </div>
    </div>
  );
}
