import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, ExternalLink, Copy, Check, Clock, ShieldCheck, PhoneCall, Megaphone } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';

interface ContactAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContactAdminModal({ isOpen, onClose }: ContactAdminModalProps) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  const rawNumber = settings.adminWhatsApp || '6285199219856';
  const formattedNumber = rawNumber.startsWith('62')
    ? `+62 ${rawNumber.substring(2, 5)}-${rawNumber.substring(5, 9)}-${rawNumber.substring(9)}`
    : rawNumber;

  const waUrl = `https://wa.me/${rawNumber}?text=${encodeURIComponent(
    'Halo Admin AZGmail, saya ingin bertanya terkait storan akun Gmail & saldo saya.'
  )}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(rawNumber);
    setCopied(true);
    showToast('info', 'Nomor Disalin', `Nomor WhatsApp ${rawNumber} berhasil disalin.`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-800"
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white relative">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
                <MessageCircle className="w-7 h-7 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black tracking-tight">Hubungi Admin</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-400/30 border border-emerald-300/40 text-emerald-100">
                  Resmi
                </span>
              </div>
              <p className="text-emerald-100 text-xs mt-1">
                Layanan bantuan & konfirmasi seputar akun Gmail & pencairan saldo
              </p>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4">
              {/* WhatsApp Contact Card */}
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-3">
                <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp Resmi Admin:</span>
                </div>
                <div className="flex items-center justify-between gap-2 p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs">
                  <div>
                    <div className="font-mono text-base font-black text-slate-900">
                      {formattedNumber}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-medium">
                      wa.me/{rawNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition flex items-center gap-1.5 shrink-0"
                    title="Salin Nomor"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Tersalin</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Service Info */}
              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">Jam Pelayanan:</strong>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Senin - Jumat (07.00 - 17.00 WIB). Di luar jam tersebut pesan akan dibalas pada jam kerja berikutnya.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-800">Bantuan Tersedia:</strong>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Pengecekan akun Gmail yang disetor, kendala penarikan saldo, request stok akun generator, atau pertanyaan seputar rules.
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl text-sm shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Chat WhatsApp Sekarang</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface ContactAdminFloatingButtonProps {
  onClick?: () => void;
  onClickAdmin?: () => void;
  onClickChannel?: () => void;
}

export function ContactAdminFloatingButton({
  onClick,
  onClickAdmin,
  onClickChannel,
}: ContactAdminFloatingButtonProps) {
  const [showChannelBanner, setShowChannelBanner] = useState(true);
  const handleAdminClick = onClickAdmin || onClick || (() => {});

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col items-end gap-2.5 pointer-events-none">
      {/* Pop up badge / speech bubble saluran informasi di ATAS Admin WA */}
      <AnimatePresence>
        {showChannelBanner && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="pointer-events-auto bg-white/95 backdrop-blur-md text-slate-800 p-2.5 px-3 rounded-2xl shadow-xl border border-blue-200 text-xs flex items-center gap-2 max-w-[240px] sm:max-w-[280px]"
          >
            <div className="w-7 h-7 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Megaphone className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div
              className="min-w-0 flex-1 cursor-pointer"
              onClick={onClickChannel}
              title="Klik untuk membuka Saluran Informasi"
            >
              <div className="font-bold text-slate-900 text-[11px] sm:text-xs flex items-center gap-1">
                <span>Saluran Informasi WA</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              </div>
              <p className="text-[10px] text-slate-500 truncate hover:text-blue-600 font-medium">
                Klik untuk update & pengumuman
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowChannelBanner(false)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              title="Tutup pemberitahuan"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pop-up Button Saluran Informasi di ATAS Admin WA */}
      <button
        type="button"
        onClick={onClickChannel}
        className="pointer-events-auto px-3.5 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-full shadow-lg shadow-blue-500/25 flex items-center gap-2 font-bold text-xs sm:text-sm transition transform hover:scale-105 active:scale-95 border border-white/20"
        title="Buka Saluran Informasi WhatsApp Resmi"
      >
        <Megaphone className="w-4 h-4 animate-bounce shrink-0" />
        <span>Saluran Informasi</span>
      </button>

      {/* Tombol Admin WA */}
      <button
        type="button"
        onClick={handleAdminClick}
        className="pointer-events-auto px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-full shadow-lg shadow-emerald-600/30 flex items-center gap-2.5 font-bold text-xs sm:text-sm transition transform hover:scale-105 active:scale-95 border border-white/20"
        title="Hubungi Admin WhatsApp"
      >
        <MessageCircle className="w-5 h-5 animate-pulse shrink-0" />
        <span className="hidden sm:inline">Hubungi Admin</span>
        <span className="sm:hidden">Admin WA</span>
      </button>
    </div>
  );
}
