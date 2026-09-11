import { useSettings } from '../context/SettingsContext';
import { ClipboardList, ShieldAlert, KeyRound } from 'lucide-react';

export function RulesCard({ compact = false }: { compact?: boolean }) {
  const { settings } = useSettings();
  const activePassword = settings.gmailDefaultPassword || 'sgsg1122';

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">📋 Rules Storan Akun Gmail</h3>
          <p className="text-xs text-slate-500">Patuhi ketentuan berikut agar akun lolos verifikasi dan dibayar</p>
        </div>
      </div>

      {/* Mandatory Password Highlight Box */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-200/80 text-rose-950 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
          <KeyRound className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-0.5">
          <div className="font-extrabold text-rose-900">
            Password Gmail WAJIB: <span className="font-mono bg-white px-2 py-0.5 rounded border border-rose-300 text-rose-700 text-sm">{activePassword}</span>
          </div>
          <p className="text-rose-800 text-[11px] leading-relaxed">
            Semua akun Gmail yang didaftarkan wajib menggunakan password di atas. Admin dapat mengupdate password ini sewaktu-waktu.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {settings.rules.map((rule, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 hover:bg-indigo-50/40 border border-slate-100 transition text-xs text-slate-700 leading-relaxed"
          >
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <span>{rule}</span>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-amber-900 bg-amber-50/80 p-3 rounded-2xl border border-amber-200/60">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-[11px] leading-relaxed">
            <strong>Penting:</strong> Dilarang mengaktifkan 2-Step Verification (2FA). Akun yang terkunci kode SMS / verifikasi HP saat dicek admin akan langsung ditolak.
          </span>
        </div>
      )}
    </div>
  );
}
