import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import { Submission, NavigationTab } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Wallet,
  Check,
  Clock,
  X,
  Mail,
  Download,
  History,
  Megaphone,
  UploadCloud,
  Send,
  ChevronRight,
  FileText,
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const { userProfile, currentUser } = useAuth();
  const { settings } = useSettings();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'submissions'),
      where('userId', '==', currentUser.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Submission[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<Submission, 'id'>) });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissions(list);
        setLoading(false);
      },
      (err) => {
        console.warn('Submissions load warning:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  const totalDiterima = submissions.filter((s) => s.status === 'Diterima').length;
  const totalPending = submissions.filter((s) => s.status === 'Pending').length;
  const totalDitolak = submissions.filter((s) => s.status === 'Ditolak').length;

  const isKhususClosed = settings.storanKhususOpen === false || !settings.storanOpen;
  const isBebasClosed = settings.storanBebasOpen === false || !settings.storanOpen;

  return (
    <div className="space-y-6">
      {/* Kartu Saldo Modern - Warna Biru Tua (tidak terlalu tua) dengan Gradient Biru Muda */}
      <div className="relative overflow-hidden rounded-[28px] sm:rounded-3xl bg-gradient-to-br from-[#1e3a8a] via-[#1d4ed8] to-[#38bdf8] p-6 sm:p-7 text-white shadow-xl shadow-blue-900/25 border border-blue-400/20">
        {/* Subtle decorative circles for depth */}
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-sky-300/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-44 h-44 rounded-full bg-blue-950/40 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-2">
            {/* Header Saldo dengan Ikon Wallet */}
            <div className="flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <Wallet className="w-4 h-4 text-sky-200" />
              </div>
              <span className="text-sm sm:text-base font-bold text-white tracking-wide uppercase">
                SALDO ANDA
              </span>
            </div>

            {/* Jumlah Saldo Utama */}
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-xs">
              {formatRupiah(userProfile?.balance || 0)}
            </div>

            {/* Subteks Harga / Gmail */}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <p className="text-xs sm:text-sm text-sky-100 font-normal">
                Harga Storan:{' '}
                <strong className="font-bold text-white">
                  {formatRupiah(settings.pricePerSubmission)}
                </strong>
              </p>
              <span className="text-sky-300/60 hidden sm:inline">•</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-xs text-sky-100 border border-white/15 font-medium">
                Khusus 3k · Bebas 2.7k
              </span>
            </div>
          </div>

          {/* Dua Tombol Rounded: Tarik Saldo & Riwayat */}
          <div className="flex items-center gap-3 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => onNavigate('saldo')}
              className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs sm:text-sm backdrop-blur-xs border border-white/30 shadow-sm transition duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-sky-200" />
              <span>Tarik Saldo</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('riwayat')}
              className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs sm:text-sm backdrop-blur-xs border border-white/30 shadow-sm transition duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <History className="w-4 h-4 text-sky-200" />
              <span>Riwayat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Menu: 4 Menu Items Horizontal (STOR, RIWAYAT, SALDO, RULES) */}
      <div className="rounded-3xl bg-white p-4 sm:p-6 border border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full">
          <button
            type="button"
            onClick={() => onNavigate('storan')}
            className="group flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl bg-blue-50/70 border border-blue-200/70 shadow-2xs hover:bg-blue-100/70 active:scale-95 transition cursor-pointer text-center relative"
          >
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#1e3a8a] via-blue-600 to-[#38bdf8] flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-all">
              <Send className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.2] translate-x-0.5 -translate-y-0.5" />
            </div>
            <span className="mt-2 text-xs sm:text-sm font-black tracking-wide text-blue-900 group-hover:text-blue-700 transition">
              STOR
            </span>
            {(isKhususClosed || isBebasClosed) && (
              <span className="mt-0.5 text-[9px] font-bold text-amber-700 bg-amber-100/80 px-1.5 py-0.2 rounded-full border border-amber-300">
                {isKhususClosed && isBebasClosed
                  ? 'Tutup'
                  : isKhususClosed
                  ? 'Khusus Tutup'
                  : 'Bebas Tutup'}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('riwayat')}
            className="group flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border border-transparent hover:bg-emerald-50/60 hover:border-emerald-100 active:scale-95 transition cursor-pointer text-center"
          >
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/25 group-hover:scale-105 transition-all">
              <Clock className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.2]" />
            </div>
            <span className="mt-2 text-xs sm:text-sm font-black tracking-wide text-slate-800 group-hover:text-emerald-700 transition">
              RIWAYAT
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('saldo')}
            className="group flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border border-transparent hover:bg-orange-50/60 hover:border-orange-100 active:scale-95 transition cursor-pointer text-center"
          >
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-orange-500/25 group-hover:scale-105 transition-all">
              <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.2]" />
            </div>
            <span className="mt-2 text-xs sm:text-sm font-black tracking-wide text-slate-800 group-hover:text-orange-600 transition">
              SALDO
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('rules')}
            className="group flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border border-transparent hover:bg-blue-50/60 hover:border-blue-100 active:scale-95 transition cursor-pointer text-center"
          >
            <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#1e3a8a] via-[#1d4ed8] to-[#38bdf8] flex items-center justify-center shadow-md shadow-blue-500/25 group-hover:scale-105 transition-all">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 text-white stroke-[2.2]" />
            </div>
            <span className="mt-2 text-xs sm:text-sm font-black tracking-wide text-slate-800 group-hover:text-blue-700 transition">
              RULES
            </span>
          </button>
        </div>
      </div>

      {/* Bagian Statistik Akun - DI ATAS PENGUMUMAN */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <span>Statistik Akun Anda</span>
            </h2>
            <p className="text-xs text-slate-500">Rincian status verifikasi data storan kamu</p>
          </div>
          <span className="text-[11px] text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-semibold border border-blue-100">
            Real-time update
          </span>
        </div>

        {/* 4 Kartu Statistik: 2 Kolom pada mobile & desktop */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
          {/* 1. DITERIMA */}
          <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">
                DITERIMA
              </span>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              {loading ? '-' : totalDiterima}
            </div>
          </div>

          {/* 2. PENDING */}
          <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">
                PENDING
              </span>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              {loading ? '-' : totalPending}
            </div>
          </div>

          {/* 3. DITOLAK */}
          <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">
                DITOLAK
              </span>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <X className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              {loading ? '-' : totalDitolak}
            </div>
          </div>

          {/* 4. HARGA */}
          <div className="bg-white rounded-[26px] p-4 sm:p-5 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between space-y-3 hover:shadow-md transition">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-semibold text-slate-600 uppercase tracking-wide">
                HARGA
              </span>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5 stroke-[2.5]" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              {formatRupiah(settings.pricePerSubmission)}
            </div>
          </div>
        </div>
      </div>

      {/* Operational Announcement Card (Pengumuman Storan) */}
      <div className="rounded-3xl bg-white border border-blue-100/90 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1e3a8a] via-blue-600 to-[#38bdf8] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
            <Megaphone className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Pengumuman Storan</span>
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    settings.storanOpen
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  {settings.storanOpen ? 'Storan: BUKA' : 'Storan: TUTUP'}
                </span>
              </div>
            </div>
            <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed font-medium">
              {settings.announcement ||
                'Storan OPEN setiap Senin - Jumat\nJam operasional: 07.00 - 17.00 WIB\nSabtu & Minggu storan CLOSE.'}
            </div>
            <div className="mt-2 text-xs text-slate-400 font-medium">
              Jadwal Operasional: {settings.storanSchedule}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Submissions List */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Gmail Terbaru</h3>
              <p className="text-xs text-slate-500">Status verifikasi data storan kamu</p>
            </div>
            <button
              onClick={() => onNavigate('riwayat')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-10 text-center text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium">Belum ada submission data.</p>
              <button
                onClick={() => onNavigate('storan')}
                className="px-4 py-2 bg-gradient-to-r from-[#1e3a8a] via-blue-600 to-[#38bdf8] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:opacity-95 transition cursor-pointer"
              >
                Kirim Data Pertama
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {submissions.slice(0, 4).map((sub) => (
                <div
                  key={sub.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-blue-100 hover:shadow-xs transition flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-800 truncate">
                        {sub.dataContent}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                      <span>{formatIndonesianDateTime(sub.createdAt)}</span>
                      <span> </span>
                      <span className="font-semibold text-blue-700">
                        {formatRupiah(sub.rewardAmount)}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
                      sub.status === 'Diterima'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sub.status === 'Ditolak'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Status pending: <strong>dalam pengecekan admin tunggu 24-30 jam</strong></span>
          <button
            onClick={() => onNavigate('storan')}
            className="font-bold text-blue-600 hover:underline cursor-pointer"
          >
            + Kirim Data Baru
          </button>
        </div>
      </div>
    </div>
  );
}
