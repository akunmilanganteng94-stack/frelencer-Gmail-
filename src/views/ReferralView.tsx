import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NavigationTab, ReferralItem } from '../types';
import { collection, query, where, onSnapshot, doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatRupiah, formatIndonesianDateTime, maskEmail } from '../lib/utils';
import {
  ArrowLeft,
  Gift,
  Copy,
  Check,
  Share2,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  Send,
  HelpCircle,
  Search,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { motion } from 'motion/react';

interface ReferralViewProps {
  onNavigate: (tab: NavigationTab) => void;
}

export function ReferralView({ onNavigate }: ReferralViewProps) {
  const { userProfile, currentUser } = useAuth();
  const { showToast } = useToast();
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'All' | 'completed' | 'pending_submission'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const referralCode = userProfile?.referralCode || 'AZGMAIL';

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'referrals'),
      where('inviterUid', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: ReferralItem[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ReferralItem, 'id'>) });
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReferrals(list);
        setLoading(false);

        // Auto sync reward if 20 milestones are met
        const completedCount = list.filter((r) => r.status === 'completed').length;
        const currentMilestones = userProfile?.referralRewardMilestones || [];
        const earnedMilestonesCount = Math.floor(completedCount / 20);

        let needsSync = false;
        for (let m = 1; m <= earnedMilestonesCount; m++) {
          if (!currentMilestones.includes(m * 20)) {
            needsSync = true;
            break;
          }
        }

        if (needsSync && currentUser.uid) {
          const userRef = doc(db, 'users', currentUser.uid);
          runTransaction(db, async (transaction) => {
            const uDoc = await transaction.get(userRef);
            if (!uDoc.exists()) return;
            const uData = uDoc.data();
            const milestones: number[] = Array.isArray(uData.referralRewardMilestones)
              ? uData.referralRewardMilestones
              : [];
            let bonus = 0;
            const updated = [...milestones];
            for (let m = 1; m <= earnedMilestonesCount; m++) {
              const val = m * 20;
              if (!updated.includes(val)) {
                updated.push(val);
                bonus += 10000;
              }
            }
            if (bonus > 0) {
              transaction.update(userRef, {
                balance: (uData.balance || 0) + bonus,
                totalEarned: (uData.totalEarned || 0) + bonus,
                referralRewardMilestones: updated,
              });
              showToast(
                'success',
                'Bonus Misi Referral Cair!',
                `Selamat! Target 20 referral tercapai. Bonus ${formatRupiah(bonus)} telah otomatis masuk ke saldo Anda.`
              );
            }
          }).catch(console.warn);
        }
      },
      (err) => {
        console.warn('Referrals snapshot warning:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, userProfile?.referralRewardMilestones, showToast]);

  const totalUndangan = referrals.length;
  const referralBerhasil = referrals.filter((r) => r.status === 'completed').length;
  const currentProgress = referralBerhasil % 20;
  const sisaMenujuBonus = 20 - currentProgress;
  const totalBonusDiterima = (userProfile?.referralRewardMilestones?.length || 0) * 10000;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    showToast('info', 'Kode Disalin', `Kode referral ${referralCode} berhasil disalin ke papan klip.`);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyShareLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?ref=${referralCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    showToast('success', 'Tautan Disalin', 'Tautan referral Anda berhasil disalin.');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/?ref=${referralCode}`;
    const text = `Halo! Yuk gabung freelance stor akun Gmail di AZGmail. Masukkan kode referral saya: *${referralCode}* saat daftar, atau klik link langsung: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const filteredReferrals = useMemo(() => {
    return referrals.filter((r) => {
      const matchesFilter = filterStatus === 'All' || r.status === filterStatus;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.invitedEmail.toLowerCase().includes(q) ||
        r.invitedName.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [referrals, filterStatus, searchQuery]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="w-10 h-10 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-95"
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                Program Reward
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                Otomatis Masuk Saldo
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
              Halaman Misi Referral
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0 self-start sm:self-center"
        >
          <Share2 className="w-4 h-4" />
          <span>Bagikan ke WhatsApp</span>
        </button>
      </div>

      {/* Hero Banner: Biru tua gak terlalu tua dan gradient biru muda */}
      <div className="relative overflow-hidden rounded-[28px] sm:rounded-3xl bg-gradient-to-br from-[#1e40af] via-[#2563eb] to-[#38bdf8] p-6 sm:p-8 text-white shadow-xl shadow-blue-900/25 border border-blue-400/20">
        <div className="absolute -right-8 -top-8 w-56 h-56 rounded-full bg-sky-300/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-48 h-48 rounded-full bg-blue-950/40 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-black text-white border border-white/30">
              <Gift className="w-3.5 h-3.5 text-sky-200" />
              <span>Undang 20 Teman = Bonus Rp 10.000</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-xs">
              Ajak Teman, Raih Saldo Tambahan!
            </h2>
            <p className="text-xs sm:text-sm text-sky-100 font-normal leading-relaxed">
              Bagikan kode referral Anda ke rekan freelancer. Ketika teman melakukan storan Gmail pertama yang berstatus <strong>Diterima</strong>, referral akan terhitung berhasil. Setiap mencapai kelipatan 20 teman berhasil, bonus <strong>Rp 10.000 otomatis masuk</strong> ke saldo Anda!
            </p>
          </div>

          <div className="bg-white/15 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/25 text-center shrink-0 self-start md:self-center shadow-inner">
            <span className="text-[11px] font-bold text-sky-100 uppercase tracking-wider block">
              Bonus Tiap 20 Teman
            </span>
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mt-1">
              Rp 10.000
            </div>
            <span className="text-[10px] text-sky-200 block mt-0.5">
              Tanpa Batas Pengulangan
            </span>
          </div>
        </div>
      </div>

      {/* Box Kode Referral & Link */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-blue-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Kode Referral Anda
            </span>
            <div className="flex items-center gap-3 mt-1">
              <span className="font-mono text-2xl sm:text-3xl font-black text-[#1e40af] tracking-widest bg-blue-50/80 px-4 py-1.5 rounded-2xl border border-blue-200 select-all">
                {referralCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3.5 py-2 bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {copiedCode ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiedLink ? 'Tautan Tersalin' : 'Salin Tautan'}</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>Share WhatsApp</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-500 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            Teman Anda cukup memasukkan kode referral di atas pada formulir pendaftaran akun atau mendaftar melalui tautan Anda.
          </span>
        </p>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 block">Total Undangan</span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {loading ? '-' : totalUndangan}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Teman yang sudah mendaftar</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-emerald-200/80 shadow-xs bg-emerald-50/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-800 block">Referral Berhasil</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1">
              {loading ? '-' : referralBerhasil}
            </div>
            <span className="text-[11px] text-emerald-600 block mt-0.5">Stor pertama diterima</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-blue-200/80 shadow-xs bg-blue-50/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-800 block">Total Bonus Diterima</span>
            <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1">
              {loading ? '-' : formatRupiah(totalBonusDiterima)}
            </div>
            <span className="text-[11px] text-blue-600 block mt-0.5">Otomatis masuk ke saldo</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Big Visual Progress Bar Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <span>Progres Target 20 Teman</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {sisaMenujuBonus === 0
                ? 'Target 20 teman tercapai! Bonus Rp 10.000 telah masuk ke saldo Anda.'
                : `Kurang ${sisaMenujuBonus} teman lagi yang storannya diterima untuk bonus Rp 10.000 berikutnya.`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl sm:text-3xl font-black text-[#1e40af] font-mono">
              {currentProgress}
            </span>
            <span className="text-sm font-bold text-slate-400 font-mono"> / 20 Teman</span>
          </div>
        </div>

        <div className="w-full h-4 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#38bdf8] transition-all duration-500 shadow-sm"
            style={{ width: `${Math.min(100, (currentProgress / 20) * 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
          <span>0 Teman</span>
          <span className="font-bold text-blue-700">10 Teman (50%)</span>
          <span className="font-bold text-emerald-700">20 Teman = Bonus Rp 10.000</span>
        </div>
      </div>

      {/* Syarat & Cara Kerja */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Syarat Misi */}
        <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-3xl p-5 border border-amber-200/80 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-amber-950 font-black text-sm">
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Syarat & Ketentuan Misi:</span>
          </div>
          <ul className="space-y-2 text-xs text-amber-950 leading-relaxed font-medium">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
              <span>
                <strong>Teman melakukan stor Gmail pertama yang diterima:</strong> Akun teman wajib disetor dan dinyatakan <em>Diterima</em> oleh admin.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
              <span>
                <strong>Bonus Otomatis Masuk:</strong> Begitu mencapai 20 referral berhasil, saldo Rp 10.000 otomatis langsung ditambahkan ke saldo dompet akun Anda.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
              <span>
                <strong>Berlaku Kelipatan:</strong> Terus undang teman tanpa batas (20 teman = Rp 10.000, 40 teman = Rp 20.000, dst).
              </span>
            </li>
          </ul>
        </div>

        {/* 4 Langkah Kerja */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 space-y-3 shadow-2xs">
          <div className="flex items-center gap-2 text-slate-900 font-black text-sm">
            <HelpCircle className="w-5 h-5 text-blue-600 shrink-0" />
            <span>Cara Kerja Misi Referral:</span>
          </div>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                1
              </span>
              <span>Bagikan kode referral unik atau tautan undangan Anda ke teman.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                2
              </span>
              <span>Teman mendaftar akun di AZGmail dengan memasukkan kode referral Anda.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                3
              </span>
              <span>Teman mengirim storan Gmail dan diverifikasi <strong>Diterima</strong> oleh admin.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                4
              </span>
              <span>Target 20 tercapai? <strong>Rp 10.000 langsung cair otomatis ke saldo Anda!</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Daftar Teman yang Diundang */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Daftar Teman yang Diundang
            </h3>
            <p className="text-xs text-slate-500">
              Pantau status storan pertama teman yang Anda undang
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterStatus('All')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                filterStatus === 'All'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua ({referrals.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Berhasil ({referralBerhasil})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending_submission')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                filterStatus === 'pending_submission'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Menunggu ({totalUndangan - referralBerhasil})</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Cari teman yang diundang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
          />
        </div>

        {/* List of Friends */}
        {loading ? (
          <div className="space-y-2 py-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">
              {searchQuery || filterStatus !== 'All'
                ? 'Tidak ada data teman yang cocok dengan pencarian / filter.'
                : 'Belum ada teman yang bergabung menggunakan kode referral Anda.'}
            </p>
            <p className="text-slate-500 max-w-sm mx-auto">
              Bagikan kode <strong>{referralCode}</strong> ke grup WhatsApp atau media sosial Anda untuk mengumpulkan 20 teman!
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl text-xs shadow-xs transition cursor-pointer"
              >
                Bagikan Sekarang ke WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReferrals.map((item, idx) => {
              const isCompleted = item.status === 'completed';
              return (
                <div
                  key={item.id || idx}
                  className="p-3.5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {item.invitedName || 'Freelancer'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ({maskEmail(item.invitedEmail)})
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                      <span>Bergabung: {formatIndonesianDateTime(item.createdAt)}</span>
                      {isCompleted && item.completedAt && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-semibold">
                            Stor diterima: {formatIndonesianDateTime(item.completedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black self-start sm:self-center shrink-0 flex items-center gap-1.5 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Referral Berhasil</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Menunggu Stor 1</span>
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
