import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  X,
  Wallet,
  User,
  Phone,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Withdrawal } from '../../types';
import { formatRupiah, formatIndonesianDateTime } from '../../lib/utils';

interface AdminWithdrawConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  withdrawal: Withdrawal | null;
  onConfirmPaid: (withItem: Withdrawal) => Promise<void>;
  processing?: boolean;
}

export function AdminWithdrawConfirmModal({
  isOpen,
  onClose,
  withdrawal,
  onConfirmPaid,
  processing = false,
}: AdminWithdrawConfirmModalProps) {
  if (!isOpen || !withdrawal) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-tight text-white">
                  Konfirmasi Penarikan Saldo
                </h3>
                <p className="text-xs text-emerald-100">
                  Pastikan dana sudah Anda transfer ke e-wallet freelancer
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 text-xs text-slate-800">
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-center space-y-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Total Nominal yang Ditransfer:
              </span>
              <div className="text-3xl font-black text-emerald-700 font-mono tracking-tight">
                {formatRupiah(withdrawal.amount)}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold block">
                Metode: {withdrawal.method} E-Wallet
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Nama Freelancer:</span>
                </span>
                <strong className="text-slate-900">{withdrawal.userName || 'User'}</strong>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Email Akun:</span>
                <span className="font-mono text-slate-700">{withdrawal.userEmail}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Nomor {withdrawal.method}:</span>
                </span>
                <strong className="font-mono text-blue-700 text-sm select-all">
                  {withdrawal.targetNumber}
                </strong>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-200/70">
                <span className="text-slate-500">Atas Nama Rekening:</span>
                <strong className="text-slate-900 uppercase">{withdrawal.recipientName}</strong>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Waktu Pengajuan:</span>
                <span className="text-slate-600 font-mono text-[11px]">
                  {formatIndonesianDateTime(withdrawal.createdAt)}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Setelah dikonfirmasi, status penarikan akan berubah menjadi <strong>Selesai</strong> dan tercatat di riwayat payout.
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => onConfirmPaid(withdrawal)}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Ya, Konfirmasi Selesai</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
