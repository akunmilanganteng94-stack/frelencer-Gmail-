import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  ShieldCheck,
  Send,
  Eye,
} from 'lucide-react';
import { Submission } from '../types';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';

interface CheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: Submission[];
  onNavigateStor?: () => void;
}

export function CheckerModal({
  isOpen,
  onClose,
  submissions,
  onNavigateStor,
}: CheckerModalProps) {
  const [queryEmail, setQueryEmail] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'Semua' | 'Pending' | 'Cek Admin' | 'Diterima' | 'Ditolak'
  >('Semua');

  const cleanQuery = queryEmail.trim().toLowerCase();

  const countPending = useMemo(
    () => submissions.filter((s) => s.status === 'Pending').length,
    [submissions]
  );
  const countCekStatus = useMemo(
    () => submissions.filter((s) => s.status === 'Cek Admin').length,
    [submissions]
  );
  const countDiterima = useMemo(
    () => submissions.filter((s) => s.status === 'Diterima').length,
    [submissions]
  );
  const countDitolak = useMemo(
    () => submissions.filter((s) => s.status === 'Ditolak').length,
    [submissions]
  );

  const displayedList = useMemo(() => {
    return submissions.filter((s) => {
      const matchesStatus =
        statusFilter === 'Semua' || s.status === statusFilter;
      if (!matchesStatus) return false;
      if (!cleanQuery) return true;
      const emailPart = s.dataContent.split('|')[0].trim().toLowerCase();
      return (
        emailPart.includes(cleanQuery) ||
        s.dataContent.toLowerCase().includes(cleanQuery) ||
        (s.rejectionReason &&
          s.rejectionReason.toLowerCase().includes(cleanQuery))
      );
    });
  }, [cleanQuery, statusFilter, submissions]);

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
            <div className="bg-gradient-to-r from-[#1677E8] to-[#0D5FC7] p-5 text-white relative">
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
                  <Search className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Cek Status Akun Gmail
                  </h3>
                  <p className="text-xs text-blue-100/90 mt-0.5">
                    Pending &bull; Cek Status &bull; Diterima / Ditolak
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* TABS FILTER STATUS */}
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
                {[
                  {
                    label: 'Semua',
                    val: 'Semua' as const,
                    count: submissions.length,
                  },
                  {
                    label: 'Pending',
                    val: 'Pending' as const,
                    count: countPending,
                  },
                  {
                    label: 'Cek Status',
                    val: 'Cek Admin' as const,
                    count: countCekStatus,
                  },
                  {
                    label: 'Diterima',
                    val: 'Diterima' as const,
                    count: countDiterima,
                  },
                  {
                    label: 'Ditolak',
                    val: 'Ditolak' as const,
                    count: countDitolak,
                  },
                ].map((tab) => {
                  const isActive = statusFilter === tab.val;
                  return (
                    <button
                      key={tab.val}
                      type="button"
                      onClick={() => setStatusFilter(tab.val)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        isActive
                          ? 'bg-white text-[#1677E8] shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                          isActive
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* SEARCH INPUT */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Cari Alamat Gmail
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={queryEmail}
                    onChange={(e) => setQueryEmail(e.target.value)}
                    placeholder="Ketik email untuk memfilter..."
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1677E8] focus:bg-white transition"
                  />
                  {queryEmail && (
                    <button
                      type="button"
                      onClick={() => setQueryEmail('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* LIST HASIL CEK STATUS */}
              <div className="space-y-2.5 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                  <span>Daftar Akun ({displayedList.length})</span>
                  <span className="text-[11px] text-[#1677E8]">
                    Realtime Sync
                  </span>
                </div>

                {displayedList.length === 0 ? (
                  <div className="p-5 rounded-2xl bg-slate-50 text-center space-y-2 border border-slate-100">
                    <HelpCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      Tidak Ada Data Akun
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {cleanQuery
                        ? `Gmail "${cleanQuery}" tidak ditemukan pada kategori ${statusFilter}.`
                        : `Belum ada akun dengan status ${statusFilter}.`}
                    </p>
                    {onNavigateStor && (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigateStor();
                        }}
                        className="mt-1 px-4 py-2 bg-[#1677E8] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#0D5FC7] transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Stor Akun Sekarang</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-mono text-xs font-bold text-slate-800 break-all">
                              {item.dataContent.split('|')[0].trim()}
                            </span>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {formatIndonesianDateTime(item.createdAt)}
                            </div>
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1 ${
                              item.status === 'Diterima'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.status === 'Ditolak'
                                ? 'bg-rose-100 text-rose-800'
                                : item.status === 'Cek Admin'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.status === 'Diterima' && (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {item.status === 'Ditolak' && (
                              <XCircle className="w-3 h-3" />
                            )}
                            {item.status === 'Cek Admin' && (
                              <Eye className="w-3 h-3" />
                            )}
                            {item.status === 'Pending' && (
                              <Clock className="w-3 h-3" />
                            )}
                            <span>
                              {item.status === 'Cek Admin'
                                ? 'Cek Status'
                                : item.status}
                            </span>
                          </span>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500">Reward Saldo:</span>
                          <span className="font-bold text-[#1677E8]">
                            {formatRupiah(item.rewardAmount || 3000)}
                          </span>
                        </div>

                        {item.rejectionReason && (
                          <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 text-[11px] font-medium border border-rose-100">
                            <strong>Alasan Tolak:</strong> {item.rejectionReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-[#EEF8FF] border border-blue-100 text-xs text-blue-900/90 space-y-1">
                <div className="font-bold flex items-center gap-1 text-[#1677E8]">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Informasi Verifikasi</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Alur status: <strong>Pending</strong> &rarr;{' '}
                  <strong>Cek Status (Cek Admin)</strong> &rarr;{' '}
                  <strong>Diterima / Ditolak</strong>. Saldo otomatis bertambah
                  saat akun berstatus Diterima.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
