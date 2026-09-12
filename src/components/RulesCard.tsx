import { useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import { ClipboardList, ShieldAlert, KeyRound, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function RulesCard({ compact = false }: { compact?: boolean }) {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const activePassword = settings.gmailDefaultPassword || 'sgsg1122';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden transition-all">
      {/* Header Bar: Selalu simpel & ringkas, dapat diklik */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-50/80 transition group cursor-pointer"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Rules & Ketentuan
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100/80 text-indigo-700">
                {settings.rules?.length || 0} Aturan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isOpen ? 'Klik untuk menyembunyikan ketentuan' : 'Klik untuk melihat syarat & ketentuan lengkap'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
            {isOpen ? 'Tutup' : 'Buka Ketentuan'}
          </span>
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-100 group-hover:text-indigo-700 flex items-center justify-center transition">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </button>

      {/* Expanded Content: Tampilan rules panjang saat user klik */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="p-5 sm:p-6 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/40">
              {/* Mandatory Password Highlight Box */}
              <div className="p-3.5 rounded-2xl bg-orange-50/90 border border-orange-200 text-orange-950 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div className="text-xs space-y-0.5">
                  <div className="font-extrabold text-orange-950">
                    Password Gmail WAJIB: <span className="font-mono bg-white px-2 py-0.5 rounded border border-orange-300 text-orange-600 text-sm font-bold">{activePassword}</span>
                  </div>
                  <p className="text-orange-800 text-[11px] leading-relaxed">
                    Semua akun Gmail yang didaftarkan wajib menggunakan password di atas. Admin dapat mengupdate password ini sewaktu-waktu.
                  </p>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-2">
                {settings.rules.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white hover:bg-indigo-50/40 border border-slate-200/70 transition text-xs text-slate-700 leading-relaxed shadow-2xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{rule}</span>
                  </div>
                ))}
              </div>

              {/* 2FA Warning */}
              {!compact && (
                <div className="pt-2 flex items-center gap-2 text-xs text-amber-900 bg-amber-50/90 p-3 rounded-2xl border border-amber-200/80">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-[11px] leading-relaxed">
                    <strong>Penting:</strong> Dilarang mengaktifkan 2-Step Verification (2FA). Akun yang terkunci kode SMS / verifikasi HP saat dicek admin akan langsung ditolak.
                  </span>
                </div>
              )}

              {/* Footer close trigger */}
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
                >
                  Tutup Rules & Ketentuan ↑
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

