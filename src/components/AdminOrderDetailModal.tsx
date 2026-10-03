import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Layers,
  RotateCcw,
} from 'lucide-react';
import { Submission } from '../types';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';

interface AdminOrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: Submission | null;
  storName: 'STOR 1' | 'STOR 2' | string;
  onProcessToCekAdmin?: (sub: Submission) => void;
  onConfirmAccept?: (sub: Submission) => void;
  onReject?: (sub: Submission) => void;
  onResetToPending?: (sub: Submission) => void;
  processing?: boolean;
}

export function AdminOrderDetailModal({
  isOpen,
  onClose,
  submission,
  storName,
  onProcessToCekAdmin,
  onConfirmAccept,
  onReject,
  onResetToPending,
  processing = false,
}: AdminOrderDetailModalProps) {
  if (!isOpen || !submission) return null;

  const cleanEmail = submission.dataContent.split('|')[0].trim();
  const status = submission.status;

  let progressPercent = 33;
  let progressStep = 1;
  let statusBadgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
  let statusLabel = 'Pending (Menunggu Pengecekan)';

  if (status === 'Cek Admin') {
    progressPercent = 66;
    progressStep = 2;
    statusBadgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
    statusLabel = 'Diproses (Sedang Diperiksa Admin)';
  } else if (status === 'Diterima') {
    progressPercent = 100;
    progressStep = 3;
    statusBadgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
    statusLabel = 'Dikonfirmasi (Selesai & Saldo Masuk)';
  } else if (status === 'Ditolak') {
    progressPercent = 100;
    progressStep = 3;
    statusBadgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
    statusLabel = 'Ditolak';
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        >
          {/* Header Modal */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/30 text-blue-400 flex items-center justify-center border border-blue-400/30 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    {storName}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    #{submission.id.slice(0, 10)}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white truncate mt-0.5">
                  Detail Order Akun Gmail
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto text-slate-800">
            {/* Progress Bar Biru */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Status Alur Order:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${statusBadgeClass}`}>
                  {statusLabel}
                </span>
              </div>
              
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    status === 'Ditolak' ? 'bg-rose-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="grid grid-cols-3 text-center text-[11px] font-bold text-slate-500 pt-1">
                <div className={progressStep >= 1 ? 'text-blue-700 font-black' : ''}>
                  1. Masuk Pending
                </div>
                <div className={progressStep >= 2 ? 'text-blue-700 font-black' : ''}>
                  2. Cek Admin
                </div>
                <div
                  className={
                    progressStep >= 3
                      ? status === 'Ditolak'
                        ? 'text-rose-700 font-black'
                        : 'text-emerald-700 font-black'
                      : ''
                  }
                >
                  3. {status === 'Ditolak' ? 'Ditolak' : 'Selesai'}
                </div>
              </div>
            </div>

            {/* Informasi Akun & Order */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Alamat Akun Gmail
                </span>
                <div className="font-mono font-black text-slate-900 text-sm break-all">
                  {cleanEmail}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Penempatan Container
                </span>
                <div className="font-black text-blue-700 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  <span>{storName}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Pengirim / Freelancer
                </span>
                <div className="font-bold text-slate-900 truncate">
                  {submission.userName || 'Freelancer'}
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  {submission.userEmail}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">
                  Imbalan Komisi
                </span>
                <div className="font-black text-emerald-600 text-sm">
                  {formatRupiah(submission.rewardAmount || 3000)}
                </div>
              </div>
            </div>

            {/* Riwayat Waktu & Proses */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Riwayat Proses &amp; Waktu</span>
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Waktu Masuk Order:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {formatIndonesianDateTime(submission.createdAt)}
                  </span>
                </div>
                {submission.checkedAt && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Mulai Cek Admin:</span>
                    <span className="font-bold text-blue-700 font-mono">
                      {formatIndonesianDateTime(submission.checkedAt)}
                    </span>
                  </div>
                )}
                {submission.reviewedAt && (
                  <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Waktu Keputusan Selesai:</span>
                    <span className="font-bold text-slate-800 font-mono">
                      {formatIndonesianDateTime(submission.reviewedAt)}
                    </span>
                  </div>
                )}
                {submission.rejectionReason && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 mt-2">
                    <span className="font-bold block text-[11px]">Alasan Penolakan:</span>
                    <span>{submission.rejectionReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Tutup
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {status === 'Pending' && onProcessToCekAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    onProcessToCekAdmin(submission);
                    onClose();
                  }}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Proses Cek Admin</span>
                </button>
              )}
              {status !== 'Diterima' && onConfirmAccept && (
                <button
                  type="button"
                  onClick={() => {
                    onConfirmAccept(submission);
                    onClose();
                  }}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Konfirmasi Terima</span>
                </button>
              )}
              {status !== 'Ditolak' && onReject && (
                <button
                  type="button"
                  onClick={() => {
                    onReject(submission);
                    onClose();
                  }}
                  disabled={processing}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Tolak Order</span>
                </button>
              )}
              {(status === 'Cek Admin' || status === 'Ditolak') && onResetToPending && (
                <button
                  type="button"
                  onClick={() => {
                    onResetToPending(submission);
                    onClose();
                  }}
                  disabled={processing}
                  className="px-3.5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Kembalikan status ke Pending"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Pending</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
