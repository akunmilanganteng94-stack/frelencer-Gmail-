import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { useContactAdmin } from '../context/ContactAdminContext';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import { Submission, NavigationTab } from '../types';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CheckerModal } from '../components/CheckerModal';
import { LeaderboardModal } from '../components/LeaderboardModal';
import { LaporanModal } from '../components/LaporanModal';
import { ApkDownloadCard } from '../components/ApkDownloadCard';
import {
  Wallet,
  Download,
  History,
  Send,
  SearchCheck,
  FileText,
  Bot,
  MessageCircle,
  Trophy,
  Gift,
  Ticket,
  Scale,
  ChevronRight,
  Clock,
  X,
  ChevronLeft,
  RefreshCw,
  UploadCloud,
  Check,
  Megaphone,
} from 'lucide-react';

interface HomeViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export function HomeView({ onNavigate }: HomeViewProps) {
  const { userProfile, currentUser } = useAuth();
  const { settings } = useSettings();
  const { showToast } = useToast();
  const { openContactModal } = useContactAdmin();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  // Modals state
  const [isCheckerOpen, setIsCheckerOpen] = useState(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isLaporanOpen, setIsLaporanOpen] = useState(false);

  // Announcement state
  const [isAnnouncementDismissed, setIsAnnouncementDismissed] = useState(false);
  const [announcementPage, setAnnouncementPage] = useState(0);

  const pw1 = settings.password1Name || 'zero1122';
  const pw2 = settings.password2Name || 'prabujaya';

  // Realtime Submissions Listener
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
        list.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
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

  // Statistik Realtime
  const totalDiterima = useMemo(
    () => submissions.filter((s) => s.status === 'Diterima').length,
    [submissions]
  );
  const totalPending = useMemo(
    () => submissions.filter((s) => s.status === 'Pending').length,
    [submissions]
  );
  const totalDitolak = useMemo(
    () => submissions.filter((s) => s.status === 'Ditolak').length,
    [submissions]
  );
  const totalDiCek = useMemo(
    () => submissions.filter((s) => s.status === 'Cek Admin').length,
    [submissions]
  );

  // Refresh Saldo Realtime
  const handleRefreshBalance = async () => {
    setRefreshingBalance(true);
    try {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          showToast(
            'success',
            'Saldo Diperbarui',
            `Saldo saat ini: ${formatRupiah(data.balance || 0)}`
          );
        } else {
          showToast('info', 'Saldo Disinkronkan', 'Data saldo Anda sudah dalam kondisi terbaru.');
        }
      }
    } catch (err) {
      console.warn('Refresh balance err:', err);
      showToast('info', 'Saldo Disinkronkan', 'Data saldo Anda sudah dalam kondisi terbaru.');
    } finally {
      setTimeout(() => setRefreshingBalance(false), 450);
    }
  };

  const announcementPages = useMemo(() => {
    const raw = settings.announcement || '';
    if (!raw.trim()) {
      return [
        `Storan OPEN setiap Senin - Jumat\nJam operasional: 07.00 - 17.00 WIB\nPilihan password wajib: ${pw1} atau ${pw2}.`,
      ];
    }
    const parts = raw.split(/\n\s*---\s*\n/);
    if (parts.length > 1) {
      return parts.map((p) => p.trim());
    }
    return [raw];
  }, [settings.announcement, pw1, pw2]);

  const totalAnnouncementPages = announcementPages.length;
  const currentAnnouncementText =
    announcementPages[announcementPage] || announcementPages[0];

  return (
    <div className="space-y-4 max-w-[480px] mx-auto select-none">
      {/* CARD SALDO */}
      <div className="rounded-[28px] sm:rounded-[30px] bg-gradient-to-r from-[#1677E8] via-[#126fe3] to-[#0D5FC7] p-5 sm:p-6 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden transition-all">
        <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-32 h-32 rounded-full bg-blue-950/25 blur-lg pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-xs flex items-center justify-center">
                <Wallet className="w-3.5 h-3.5 text-blue-100" />
              </div>
              <span className="text-xs font-bold tracking-wider text-blue-100 uppercase">
                SALDO ANDA
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefreshBalance}
              disabled={refreshingBalance}
              className="p-1 rounded-full text-blue-100/80 hover:text-white hover:bg-white/10 transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Perbarui Saldo Realtime"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshingBalance ? 'animate-spin text-white' : ''}`}
              />
            </button>
          </div>
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow-xs">
              {formatRupiah(userProfile?.balance || 0)}
            </div>
            <div className="text-xs font-medium text-blue-100/90 mt-1">
              Harga / Gmail: {formatRupiah(settings.pricePerSubmission || 3000)}
            </div>
          </div>
          <div className="pt-2 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('saldo')}
              className="flex-1 py-2 px-4 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-xs border border-white/20 shadow-xs text-xs font-bold text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-white stroke-[2.2]" />
              <span>Tarik Saldo</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('riwayat')}
              className="flex-1 py-2 px-4 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-xs border border-white/20 shadow-xs text-xs font-bold text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-white stroke-[2.2]" />
              <span>Riwayat</span>
            </button>
          </div>
        </div>
      </div>

      {/* MENU UTAMA */}
      <div className="bg-white rounded-[26px] p-3.5 sm:p-4 shadow-sm border border-blue-100/50">
        <div className="grid grid-cols-5 gap-1 text-center">
          <button
            type="button"
            onClick={() => onNavigate('storan')}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#EEF8FF] border border-blue-200/80 flex items-center justify-center text-[#1677E8] shadow-2xs group-hover:scale-105 transition-transform">
              <Send className="w-5 h-5 stroke-[2.4] translate-x-0.5 -translate-y-0.5" />
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-[#1677E8] mt-1.5">
              Stor
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('riwayat')}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#10B981] shadow-2xs group-hover:scale-105 transition-transform">
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-700 mt-1.5">
              Riwayat
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsCheckerOpen(true)}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-600 shadow-2xs group-hover:scale-105 transition-transform">
              <SearchCheck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-700 mt-1.5">
              Cek Status
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('saldo')}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#F59E0B] shadow-2xs group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-700 mt-1.5">
              Saldo
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('rules')}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-[#A855F7] shadow-2xs group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-700 mt-1.5">
              Rules
            </span>
          </button>
        </div>
      </div>

      {/* MENU TAMBAHAN */}
      <div className="bg-white rounded-[26px] p-3.5 sm:p-4 shadow-sm border border-blue-100/50">
        <div className="grid grid-cols-5 gap-1 text-center">
          <button
            type="button"
            onClick={openContactModal}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center text-[#1677E8] group-hover:border-blue-200 transition">
              <Bot className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-1.5 leading-tight">
              Azyx Support
            </span>
          </button>
          <a
            href="https://whatsapp.com/channel/0029VbCwLl7J3jv1QSig1V0C"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center text-[#10B981] group-hover:border-emerald-200 transition">
              <MessageCircle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-1.5 leading-tight">
              Komunitas
            </span>
          </a>
          <button
            type="button"
            onClick={() => setIsLeaderboardOpen(true)}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center text-[#F59E0B] group-hover:border-amber-200 transition">
              <Trophy className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-1.5 leading-tight">
              Leaderboard
            </span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('referral')}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center text-[#A855F7] group-hover:border-purple-200 transition">
              <Gift className="w-4 h-4 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-1.5 leading-tight">
              Referral
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsLaporanOpen(true)}
            className="flex flex-col items-center justify-center group active:scale-95 transition cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-center text-rose-500 group-hover:border-rose-200 transition">
              <Ticket className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-700 mt-1.5 leading-tight">
              Laporan
            </span>
          </button>
        </div>
      </div>

      {/* CARD SYARAT & KETENTUAN */}
      <button
        type="button"
        onClick={() => onNavigate('rules')}
        className="w-full bg-white rounded-[24px] p-4 shadow-sm border border-blue-100/50 flex items-center justify-between hover:border-blue-200 active:scale-98 transition cursor-pointer text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0 border border-blue-100/60">
            <Scale className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#102033]">
              Syarat &amp; Ketentuan
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Pilihan password: {pw1} &amp; {pw2}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
      </button>

      {/* STATISTIK */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div className="bg-white rounded-[22px] p-3.5 sm:p-4 shadow-sm border border-blue-100/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              DITERIMA
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#102033] mt-0.5">
              {loading ? '-' : totalDiterima}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-[#10B981] flex items-center justify-center shrink-0 border border-emerald-100">
            <Check className="w-5 h-5 stroke-[2.8]" />
          </div>
        </div>
        <div className="bg-white rounded-[22px] p-3.5 sm:p-4 shadow-sm border border-blue-100/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              PENDING
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#102033] mt-0.5">
              {loading ? '-' : totalPending}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-amber-50 text-[#F59E0B] flex items-center justify-center shrink-0 border border-amber-100">
            <Clock className="w-5 h-5 stroke-[2.8]" />
          </div>
        </div>
        <div className="bg-white rounded-[22px] p-3.5 sm:p-4 shadow-sm border border-blue-100/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              DITOLAK
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#102033] mt-0.5">
              {loading ? '-' : totalDitolak}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 text-[#EF4444] flex items-center justify-center shrink-0 border border-rose-100">
            <X className="w-5 h-5 stroke-[2.8]" />
          </div>
        </div>
        <div className="bg-white rounded-[22px] p-3.5 sm:p-4 shadow-sm border border-blue-100/50 flex items-center justify-between">
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              CEK STATUS
            </span>
            <div className="text-2xl sm:text-3xl font-black text-[#102033] mt-0.5">
              {loading ? '-' : totalDiCek}
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-50 text-[#1677E8] flex items-center justify-center shrink-0 border border-blue-100">
            <SearchCheck className="w-5 h-5 stroke-[2.6]" />
          </div>
        </div>
      </div>

      {/* PENGUMUMAN STORAN */}
      {!isAnnouncementDismissed && (
        <div className="rounded-[24px] bg-[#EEF8FF] border border-blue-200/70 p-4 sm:p-4.5 shadow-2xs relative overflow-hidden text-slate-800">
          <button
            type="button"
            onClick={() => setIsAnnouncementDismissed(true)}
            className="absolute top-3.5 right-3.5 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-blue-100/50 transition cursor-pointer"
            aria-label="Tutup Pengumuman"
            title="Tutup pengumuman"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1677E8] text-white flex items-center justify-center shrink-0 shadow-xs shadow-blue-500/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0 pr-5">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                  Pengumuman Storan
                </h3>
                <span
                  className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                    settings.storanOpen
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {settings.storanOpen ? 'OPEN' : 'CLOSE'}
                </span>
              </div>
              <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed font-medium">
                {currentAnnouncementText}
              </div>
              {settings.storanSchedule && (
                <div className="mt-1.5 text-[11px] text-blue-700 font-semibold">
                  Jadwal: {settings.storanSchedule}
                </div>
              )}
              {totalAnnouncementPages > 1 && (
                <div className="mt-3 pt-2 border-t border-blue-100/80 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1 font-bold text-slate-600">
                    <button
                      type="button"
                      disabled={announcementPage === 0}
                      onClick={() => setAnnouncementPage((p) => Math.max(0, p - 1))}
                      className="p-1 rounded-lg hover:bg-blue-100 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span>
                      {announcementPage + 1}/{totalAnnouncementPages}
                    </span>
                    <button
                      type="button"
                      disabled={announcementPage === totalAnnouncementPages - 1}
                      onClick={() =>
                        setAnnouncementPage((p) =>
                          Math.min(totalAnnouncementPages - 1, p + 1)
                        )
                      }
                      className="p-1 rounded-lg hover:bg-blue-100 disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RIWAYAT STOR TERBARU */}
      <div className="bg-white rounded-[24px] p-3.5 sm:p-4 border border-blue-100/50 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900">
              Gmail Terbaru
            </h3>
            <p className="text-[10px] sm:text-[11px] text-slate-400">
              Status verifikasi data storan kamu
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('riwayat')}
            className="text-xs font-bold text-[#1677E8] hover:text-[#0D5FC7] flex items-center gap-0.5 cursor-pointer"
          >
            <span>Lihat Semua</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-12 bg-slate-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="py-6 text-center text-slate-500 space-y-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1677E8] flex items-center justify-center mx-auto">
              <UploadCloud className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium">Belum ada submission data.</p>
            <button
              type="button"
              onClick={() => onNavigate('storan')}
              className="px-4 py-2 bg-[#1677E8] hover:bg-[#0D5FC7] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              Kirim Data Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {submissions.slice(0, 4).map((sub) => (
              <div
                key={sub.id}
                className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-blue-100 hover:shadow-2xs transition flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-bold text-slate-800 truncate">
                    {sub.dataContent}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                    <span>{formatIndonesianDateTime(sub.createdAt)}</span>
                    <span>&bull;</span>
                    <span className="font-bold text-[#1677E8]">
                      {formatRupiah(sub.rewardAmount)}
                    </span>
                  </div>
                </div>
                <span
                  className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    sub.status === 'Diterima'
                      ? 'bg-emerald-100 text-emerald-800'
                      : sub.status === 'Ditolak'
                      ? 'bg-rose-100 text-rose-800'
                      : sub.status === 'Cek Admin'
                      ? 'bg-blue-100 text-blue-800'
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

      <ApkDownloadCard variant="banner" />

      {/* Modals */}
      <CheckerModal
        isOpen={isCheckerOpen}
        onClose={() => setIsCheckerOpen(false)}
        submissions={submissions}
        onNavigateStor={() => onNavigate('storan')}
      />
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
      />
      <LaporanModal
        isOpen={isLaporanOpen}
        onClose={() => setIsLaporanOpen(false)}
        submissions={submissions}
        userProfile={userProfile}
        onNavigateRiwayat={() => onNavigate('riwayat')}
      />
    </div>
  );
}
