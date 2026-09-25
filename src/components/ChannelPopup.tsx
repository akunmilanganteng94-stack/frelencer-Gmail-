import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Megaphone, ExternalLink, X } from 'lucide-react';

const STORAGE_KEY = 'freelancer_storan_channel_popup_dismissed';

interface ChannelPopupProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function ChannelPopup({ isOpen: controlledIsOpen, onClose }: ChannelPopupProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  useEffect(() => {
    // Only auto-show if not externally controlled
    if (controlledIsOpen === undefined) {
      const isDismissed = localStorage.getItem(STORAGE_KEY);
      if (!isDismissed) {
        const timer = setTimeout(() => {
          setInternalIsOpen(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [controlledIsOpen]);

  const isModalOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleJoin = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
    window.open('https://whatsapp.com/channel/0029VbCwLl7J3jv1QSig1V0C', '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden text-slate-800"
          >
            {/* Header banner */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 text-white relative">
              <button
                type="button"
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
                <Megaphone className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold tracking-tight">Saluran Informasi Resmi</h3>
              <p className="text-blue-100 text-sm mt-1">Komunitas Freelancer Storan WhatsApp</p>
            </div>

            {/* Content body */}
            <div className="p-6 space-y-4">
              <p className="text-slate-600 text-sm leading-relaxed">
                Jangan lewatkan informasi terbaru, update layanan, jam buka operasional, dan pengumuman penting seputar storan & penarikan saldo.
              </p>

              <div className="bg-blue-50/80 rounded-xl p-3 border border-blue-100 text-xs text-blue-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>Update status storan realtime & info promo rate khusus anggota saluran!</span>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleJoin}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm shadow-md shadow-blue-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Gabung Sekarang</span>
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl text-sm transition cursor-pointer"
                >
                  Nanti
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
