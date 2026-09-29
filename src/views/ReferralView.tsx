import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NavigationTab, ReferralItem } from '../types';
import { collection, query, where, onSnapshot, doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatRupiah, formatIndonesianDateTime, maskEmail } from '../lib/utils';
import { applyReferralCodeForExistingUser } from '../lib/referralHelper';
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
  HelpCircle,
  Search,
  TrendingUp,
} from 'lucide-react';

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
    let refItemsFromReferrals: ReferralItem[] = [];
    let refItemsFromUsers: ReferralItem[] = [];

    const mergeAndProcess = () => {
      const map = new Map<string, ReferralItem>();
      for (const item of refItemsFromReferrals) {
        if (item.invitedUid) {
          map.set(item.invitedUid, item);
        } else {
          map.set(item.id, item);
        }
      }
      for (const uItem of refItemsFromUsers) {
        if (!map.has(uItem.invitedUid)) {
          map.set(uItem.invitedUid, uItem);
        }
      }
      const combined = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReferrals(combined);
      setLoading(false);

      const completedCount = combined.filter((r) => r.status === 'completed').length;
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
    };

    const qReferrals = query(
      collection(db, 'referrals'),
      where('inviterUid', '==', currentUser.uid)
    );
    const unsubReferrals = onSnapshot(
      qReferrals,
      (snapshot) => {
        const list: ReferralItem[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ReferralItem, 'id'>) });
        });
        refItemsFromReferrals = list;
        mergeAndProcess();
      },
      () => mergeAndProcess()
    );

    const qUsers = query(
      collection(db, 'users'),
      where('referredBy', '==', currentUser.uid)
    );
    const unsubUsers = onSnapshot(
      qUsers,
      (snapshot) => {
        const list: ReferralItem[] = [];
        snapshot.forEach((docSnap) => {
          const uData = docSnap.data();
          list.push({
            id: docSnap.id,
            inviterUid: currentUser.uid,
            inviterEmail: currentUser.email || '',
            invitedUid: docSnap.id,
            invitedEmail: uData.email || '',
            invitedName: uData.displayName || uData.email?.split('@')[0] || 'Member Freelancer',
            referralCodeUsed: uData.referredByCode || referralCode,
            status: 'pending_submission',
            createdAt: uData.createdAt || new Date().toISOString(),
          });
        });
        refItemsFromUsers = list;
        mergeAndProcess();
      },
      () => mergeAndProcess()
    );

    return () => {
      unsubReferrals();
      unsubUsers();
    };
  }, [currentUser, userProfile?.referralRewardMilestones, referralCode, showToast]);

  const totalTerdaftar = referrals.length;
  const referralBerhasil = referrals.filter((r) => r.status === 'completed').length;
  const totalUndangan = referralBerhasil; // Friends whose stor is accepted and counted in user A
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
    <div className="space-y-3 sm:space-y-3.5 max-w-4xl mx-auto pb-10">
      {/* Top Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="w-8 h-8 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-95"
            title="Kembali ke Beranda"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                Program Reward
              </span>
              <span className="text-[10px] text-slate-400">•</span>
              <span className="text-[10px] text-slate-500 font-medium">
                Otomatis Masuk Saldo
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Halaman Misi Referral
            </h1>
          </div>
        </div>
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 self-start sm:self-center"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Bagikan ke WhatsApp</span>
        </button>
      </div>

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-[#1e40af] via-[#2563eb] to-[#38bdf8] p-4 sm:p-5 text-white shadow-md shadow-blue-900/20 border border-blue-400/20">
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-sky-300/20 blur-2xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-blue-950/40 blur-xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black text-white border border-white/30">
              <Gift className="w-3 h-3 text-sky-200" />
              <span>Undang 20 Teman = Bonus Rp 10.000</span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight drop-shadow-xs">
              Ajak Teman, Raih Saldo Tambahan!
            </h2>
            <p className="text-[11px] sm:text-xs text-sky-100 font-normal leading-relaxed">
              Bagikan kode referral Anda ke rekan freelancer. Ketika teman melakukan storan Gmail pertama yang berstatus <strong>Diterima</strong>, referral akan terhitung berhasil. Setiap mencapai kelipatan 20 teman berhasil, bonus <strong>Rp 10.000 otomatis masuk</strong> ke saldo Anda!
            </p>
          </div>
          <div className="bg-white/15 backdrop-blur-md rounded-xl p-3 sm:p-3.5 border border-white/25 text-center shrink-0 self-start md:self-center shadow-inner">
            <span className="text-[10px] font-bold text-sky-100 uppercase tracking-wider block">
              Bonus Tiap 20 Teman
            </span>
            <div className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-0.5">
              Rp 10.000
            </div>
            <span className="text-[9px] text-sky-200 block mt-0.5">
              Tanpa Batas Pengulangan
            </span>
          </div>
        </div>
      </div>

      {/* Box Kode Referral & Link */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-blue-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Kode Referral Anda
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-[#1e40af] tracking-widest bg-blue-50/80 px-3 py-1 rounded-xl border border-blue-200 select-all">
                {referralCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 text-white rounded-lg text-xs font-bold shadow-2xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopyShareLink}
              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedLink ? 'Tautan Tersalin' : 'Salin Tautan'}</span>
            </button>
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Share WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Info Referral Anda */}
        {userProfile?.referredBy && (
          <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5 pt-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Anda terdaftar melalui referral dari: <strong>{userProfile.inviterName || userProfile.referredByCode || 'Teman'}</strong>
            </span>
          </p>
        )}
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Total Undangan</span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
              {loading ? '-' : totalUndangan}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Stor diterima</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-amber-200/80 shadow-2xs bg-amber-50/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-800 block uppercase tracking-wider">Menunggu Stor</span>
            <div className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">
              {loading ? '-' : Math.max(0, totalTerdaftar - referralBerhasil)}
            </div>
            <span className="text-[10px] text-amber-700 block mt-0.5">Wajib stor & diterima</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-blue-200/80 shadow-2xs bg-blue-50/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-blue-800 block uppercase tracking-wider">Total Bonus Diterima</span>
            <div className="text-lg sm:text-xl font-black text-blue-700 mt-0.5">
              {loading ? '-' : formatRupiah(totalBonusDiterima)}
            </div>
            <span className="text-[10px] text-blue-600 block mt-0.5">Otomatis masuk ke saldo</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Progress Bar Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Progres Target 20 Teman</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {sisaMenujuBonus === 0
                ? 'Target 20 teman tercapai! Bonus Rp 10.000 telah masuk ke saldo Anda.'
                : `Kurang ${sisaMenujuBonus} teman lagi yang storannya diterima untuk bonus Rp 10.000 berikutnya.`}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-[#1e40af] font-mono">
              {currentProgress}
            </span>
            <span className="text-xs font-bold text-slate-400 font-mono"> / 20 Teman</span>
          </div>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden p-0.5 border border-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#38bdf8] transition-all duration-500 shadow-2xs"
            style={{ width: `${Math.min(100, (currentProgress / 20) * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
          <span>0 Teman</span>
          <span className="font-bold text-blue-700">10 Teman (50%)</span>
          <span className="font-bold text-emerald-700">20 Teman = Bonus Rp 10.000</span>
        </div>
      </div>

      {/* Syarat & Cara Kerja */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-amber-200/80 space-y-2 shadow-2xs">
          <div className="flex items-center gap-1.5 text-amber-950 font-black text-xs sm:text-sm">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Syarat & Ketentuan Misi:</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-amber-950 leading-relaxed font-medium">
            <li className="flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
              <span>
                <strong>Teman melakukan stor Gmail pertama yang diterima:</strong> Akun teman wajib disetor dan dinyatakan <em>Diterima</em> oleh admin.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
              <span>
                <strong>Bonus Otomatis Masuk:</strong> Begitu mencapai 20 referral berhasil, saldo Rp 10.000 otomatis langsung ditambahkan ke dompet akun Anda.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1" />
              <span>
                <strong>Berlaku Kelipatan:</strong> Terus undang teman tanpa batas (20 teman = Rp 10.000, 40 teman = Rp 20.000, dst).
              </span>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 space-y-2 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-900 font-black text-xs sm:text-sm">
            <HelpCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Cara Kerja Misi Referral:</span>
          </div>
          <div className="space-y-1.5 text-[11px] text-slate-600">
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                1
              </span>
              <span>Bagikan kode referral unik atau tautan undangan Anda ke rekan Anda.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                2
              </span>
              <span>Teman mendaftar akun di AZGmail dengan memasukkan kode referral Anda.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                3
              </span>
              <span>Teman mengirim storan Gmail dan diverifikasi <strong>Diterima</strong> oleh admin.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[9px] shrink-0 mt-0.5">
                4
              </span>
              <span>Target 20 tercapai? <strong>Rp 10.000 langsung cair otomatis ke saldo Anda!</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Daftar Teman yang Diundang */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900">
              Daftar Teman yang Diundang
            </h3>
            <p className="text-[11px] text-slate-500">
              Pantau status storan pertama teman yang Anda undang
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterStatus('All')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer ${
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
              className={`px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer flex items-center gap-1 ${
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
              className={`px-2.5 py-1 rounded-md text-[11px] transition cursor-pointer flex items-center gap-1 ${
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
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari teman yang diundang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none bg-white"
          />
        </div>

        {/* List of Friends */}
        {loading ? (
          <div className="space-y-2 py-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredReferrals.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs space-y-1.5">
            <Users className="w-8 h-8 mx-auto text-slate-300" />
            <p className="font-bold text-slate-700">
              {searchQuery || filterStatus !== 'All'
                ? 'Tidak ada data teman yang cocok dengan pencarian / filter.'
                : 'Belum ada teman yang bergabung menggunakan kode referral Anda.'}
            </p>
            <p className="text-slate-500 max-w-sm mx-auto text-[11px]">
              Bagikan kode <strong>{referralCode}</strong> ke grup WhatsApp atau media sosial Anda untuk mengumpulkan 20 teman!
            </p>
            <div className="pt-1.5">
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-lg text-xs shadow-2xs transition cursor-pointer"
              >
                Bagikan Sekarang ke WhatsApp
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            {filteredReferrals.map((item, idx) => {
              const isCompleted = item.status === 'completed';
              return (
                <div
                  key={item.id || idx}
                  className="p-2.5 sm:p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                        {item.invitedName || 'Freelancer'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({maskEmail(item.invitedEmail)})
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-1.5">
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
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black self-start sm:self-center shrink-0 flex items-center gap-1 ${
                      isCompleted
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {isCompleted ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Referral Berhasil</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-600" />
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
