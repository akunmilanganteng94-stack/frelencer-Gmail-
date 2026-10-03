import { motion, AnimatePresence } from 'motion/react';
import {
  FileText,
  X,
  Eye,
} from 'lucide-react';
import { Submission, UserProfile } from '../types';
import { formatRupiah } from '../lib/utils';

interface LaporanModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: Submission[];
  userProfile: UserProfile | null;
  onNavigateRiwayat: () => void;
}

export function LaporanModal({
  isOpen,
  onClose,
  submissions,
  userProfile,
  onNavigateRiwayat,
}: LaporanModalProps) {
  const totalSubmissions = submissions.length;
  const totalDiterima = submissions.filter((s) => s.status === 'Diterima').length;
  const totalPending = submissions.filter((s) => s.status === 'Pending').length;
  const totalDiCek = submissions.filter((s) => s.status === 'Cek Admin').length;
  const totalDitolak = submissions.filter((s) => s.status === 'Ditolak').length;

  const successRate =
    totalSubmissions > 0
      ? Math.round((totalDiterima / totalSubmissions) * 100)
      : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs select-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-md bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden text-[#102033]"
          >
            <div className="bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 p-5 text-white relative">
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Laporan Akun &amp; Transaksi
                  </h3>
                  <p className="text-xs text-rose-100 mt-0.5">
                    Ringkasan performa storan dan keuangan Anda
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 grid grid-cols-2 gap-3 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Saldo Tersedia
                  </span>
                  <div className="text-base font-black text-[#1677E8] mt-0.5">
                    {formatRupiah(userProfile?.balance || 0)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Total Ditarik
                  </span>
                  <div className="text-base font-black text-emerald-600 mt-0.5">
                    {formatRupiah(userProfile?.totalWithdrawn || 0)}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Statistik Storan Akun</span>
                  <span className="text-emerald-600 font-extrabold">
                    Success Rate: {successRate}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800">
                      Diterima
                    </span>
                    <span className="text-base font-black text-emerald-700">
                      {totalDiterima}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800">
                      Pending
                    </span>
                    <span className="text-base font-black text-amber-700">
                      {totalPending}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-800">
                      Di Cek
                    </span>
                    <span className="text-base font-black text-blue-700">
                      {totalDiCek}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-800">
                      Ditolak
                    </span>
                    <span className="text-base font-black text-rose-700">
                      {totalDitolak}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">
                    Total Seluruh Gmail Distor
                  </span>
                  <span className="font-black text-slate-900 text-sm">
                    {totalSubmissions} Akun
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateRiwayat();
                }}
                className="w-full py-3 bg-[#1677E8] hover:bg-[#0D5FC7] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Eye className="w-4 h-4" />
                <span>Buka Seluruh Riwayat Storan</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
