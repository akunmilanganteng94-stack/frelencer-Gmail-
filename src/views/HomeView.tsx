import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import { Submission, NavigationTab } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { RulesCard } from '../components/RulesCard';
import {
  Wallet,
  CheckCircle2,
  Clock,
  XCircle,
  Tag,
  ArrowUpRight,
  Megaphone,
  UploadCloud,
  Send,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';

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
        // Sort descending by createdAt
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

  return (
    <div className="space-y-6">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-blue-500/20">
        {/* Background ambient accents */}
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-64 h-64 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold text-blue-100">
              <span
                className={`w-2 h-2 rounded-full ${
                  settings.storanOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              <span>{settings.storanOpen ? 'Layanan Aktif & Buka' : 'Layanan Sedang Tutup'}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Halo, {userProfile?.displayName || 'Freelancer'} 👋
            </h1>

            {/* Saldo Saat Ini dipindahkan di bawah teks Halo */}
            <div className="pt-2">
              <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                Saldo Saat Ini
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-0.5">
                {formatRupiah(userProfile?.balance || 0)}
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('storan')}
              className="px-5 py-3 rounded-2xl bg-white text-blue-700 font-bold text-sm shadow-md hover:bg-blue-50 transition flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              <span>Setor Akun Gmail</span>
            </button>
            <button
              onClick={() => onNavigate('saldo')}
              className="px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm backdrop-blur-md transition flex items-center gap-2 border border-white/20"
            >
              <Wallet className="w-4 h-4" />
              <span>Tarik Saldo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Operational Announcement Card */}
      <div className="rounded-2xl bg-white border border-blue-100 p-5 shadow-xs relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <Megaphone className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>📢 Pengumuman Storan</span>
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  settings.storanOpen
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                {settings.storanOpen ? '● Status: OPEN' : '● Status: CLOSE'}
              </span>
            </div>
            <div className="text-sm text-slate-600 whitespace-pre-line leading-relaxed font-medium">
              {settings.announcement ||
                'Storan OPEN setiap Senin–Jumat\nJam operasional: 07.00–17.00 WIB\nSabtu & Minggu storan CLOSE.'}
            </div>
            <div className="mt-2 text-xs text-slate-400 font-medium">
              Jadwal Operasional: {settings.storanSchedule}
            </div>
          </div>
        </div>
      </div>

      {/* 4 Statistics Grid: Harga per Submission, Total Diterima, Total Pending, Total Ditolak */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-base font-bold text-slate-900">Statistik Akun Kamu</h2>
          <span className="text-xs text-slate-500 font-medium">Real-time update</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Harga Per Submission */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-blue-200 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">Harga / Gmail</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Tag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-indigo-700 tracking-tight">
              {formatRupiah(settings.pricePerSubmission)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Reward per data valid</div>
          </div>

          {/* Card 3: Total Diterima */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-emerald-200 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">Total Diterima</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">
              {loading ? '-' : totalDiterima}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Data telah disetujui</div>
          </div>

          {/* Card 4: Total Pending */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-amber-200 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">Total Pending</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-600 tracking-tight">
              {loading ? '-' : totalPending}
            </div>
            <div className="text-[11px] text-amber-700 font-semibold mt-1">
              dalam pengecekan admin tunggu 24-30 jam
            </div>
          </div>

          {/* Card 5: Total Ditolak */}
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-rose-200 transition">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500">Total Ditolak</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 tracking-tight">
              {loading ? '-' : totalDitolak}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Data tidak memenuhi syarat</div>
          </div>
        </div>
      </div>

      {/* Grid: Recent Submissions + Rules Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Submissions List (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Gmail Terbaru</h3>
                <p className="text-xs text-slate-500">Status verifikasi data storan kamu</p>
              </div>
              <button
                onClick={() => onNavigate('riwayat')}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
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
                        <span>•</span>
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
              className="font-bold text-blue-600 hover:underline"
            >
              + Kirim Data Baru
            </button>
          </div>
        </div>

        {/* Rules Card (5 cols) */}
        <div className="lg:col-span-5">
          <RulesCard />
        </div>
      </div>
    </div>
  );
}
