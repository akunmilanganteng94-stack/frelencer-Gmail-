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
  const [copied, setCopied] = useState(false);
  const activePassword = settings.gmailDefaultPassword || 'sgsg1122';

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(activePassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                Panduan Resmi
              </span>
              <span className="text-xs text-slate-400"> </span>
              <span className="text-xs text-slate-500 font-medium">
                {settings.rules?.length || 0} Aturan Wajib
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Rules & Ketentuan Storan
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('storan')}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>STOR Gmail Sekarang</span>
            </button>
          )}
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-r from-orange-50 via-amber-50 to-white p-5 sm:p-6 border border-orange-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 shadow-2xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-orange-900">
                Password Gmail Wajib
              </div>
              <div className="flex items-center gap-2.5 mt-0.5">
                <span className="font-mono text-xl sm:text-2xl font-black text-orange-600 bg-white px-3 py-1 rounded-xl border border-orange-300 shadow-2xs select-all">
                  {activePassword}
                </span>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-orange-100 border border-orange-300 text-orange-700 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="text-xs text-orange-950 font-medium sm:text-right max-w-sm">
            Semua akun Gmail yang dibuat dan disetor <strong className="font-bold">WAJIB</strong> menggunakan password di atas. Jika password berbeda, akun akan otomatis ditolak saat pengecekan.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-xs">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Daftar Ketentuan & Syarat Validasi Akun
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
              className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50/70 hover:bg-indigo-50/30 border border-slate-200/70 transition text-sm text-slate-800 leading-relaxed shadow-2xs"
            >
              <span className="w-6 h-6 rounded-xl bg-purple-100 text-purple-800 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
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

      <div className="p-6 rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              className="px-5 py-2.5 bg-white text-blue-800 font-black rounded-xl text-xs hover:bg-blue-50 transition shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Buka Menu STOR</span>
            </button>
          )}
          <button
            type="button"
            onClick={openContactModal}
            className="px-4 py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold rounded-xl text-xs border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Tanya Admin WA</span>
          </button>
        </div>
      </div>
    </div>
  );
}
