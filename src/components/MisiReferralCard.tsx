import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ReferralItem } from '../types';
import { collection, query, where, onSnapshot, doc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatRupiah, formatIndonesianDateTime, maskEmail } from '../lib/utils';
import { applyReferralCodeForExistingUser } from '../lib/referralHelper';
import {
  Users,
  Copy,
  Check,
  Share2,
  Gift,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface MisiReferralCardProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export function MisiReferralCard({ variant = 'full', className = '' }: MisiReferralCardProps) {
  const { userProfile, currentUser } = useAuth();
  const { showToast } = useToast();
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showFriendsList, setShowFriendsList] = useState(false);

  const referralCode = userProfile?.referralCode || 'AZGMAIL';

  useEffect(() => {
    if (!currentUser) return;
    let listFromRef: ReferralItem[] = [];
    let listFromUsers: ReferralItem[] = [];

    const syncList = () => {
      const map = new Map<string, ReferralItem>();
      for (const item of listFromRef) {
        map.set(item.invitedUid || item.id, item);
      }
      for (const uItem of listFromUsers) {
        if (!map.has(uItem.invitedUid)) {
          map.set(uItem.invitedUid, uItem);
        }
      }
      const list = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setReferrals(list);
      setLoading(false);

      // Auto sync bonus if user reached milestone
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
          }
        }).catch(console.warn);
      }
    };

    const qRef = query(
      collection(db, 'referrals'),
      where('inviterUid', '==', currentUser.uid)
    );
    const unsubRef = onSnapshot(
      qRef,
      (snapshot) => {
        const list: ReferralItem[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...(docSnap.data() as Omit<ReferralItem, 'id'>) });
        });
        listFromRef = list;
        syncList();
      },
      () => syncList()
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
            invitedName: uData.displayName || 'Freelancer',
            status: 'pending_submission',
            createdAt: uData.createdAt || new Date().toISOString(),
          });
        });
        listFromUsers = list;
        syncList();
      },
      () => syncList()
    );

    return () => {
      unsubRef();
      unsubUsers();
    };
  }, [currentUser, userProfile?.referralRewardMilestones]);

  const totalUndangan = referrals.length;
  const referralBerhasil = referrals.filter((r) => r.status === 'completed').length;
  const currentProgress = referralBerhasil % 20;
  const totalBonusDiterima = (userProfile?.referralRewardMilestones?.length || 0) * 10000;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopiedCode(true);
    showToast('info', 'Kode Disalin', `Kode referral ${referralCode} berhasil disalin.`);
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
    const text = `Halo! Yuk gabung freelance stor akun Gmail di AZGmail. Masukkan kode referral saya: *${referralCode}* saat daftar, atau klik tautan: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`rounded-3xl bg-white border border-blue-200/80 p-5 sm:p-6 shadow-sm relative overflow-hidden space-y-4 ${className}`}
    >
      {/* Decorative gradient blur */}
      <div className="absolute top-0 right-0 w-60 h-60 bg-gradient-to-br from-blue-400/10 via-sky-400/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Header Banner Misi Referral */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1e40af] via-blue-600 to-[#38bdf8] text-white flex items-center justify-center shadow-md shadow-blue-500/25 shrink-0">
            <Gift className="w-6 h-6 text-white stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Misi Referral
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-blue-700 to-sky-500 text-white shadow-xs">
                Bonus 10.000
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Undang <strong>20 teman</strong> dan dapatkan bonus <strong>Rp 10.000</strong> langsung masuk ke saldo!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 self-start sm:self-center"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Bagikan ke WhatsApp</span>
        </button>
      </div>

      {/* Kode Referral Box */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-blue-50/90 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
            Kode Referral Anda:
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-lg sm:text-xl font-black text-[#1e40af] tracking-wider select-all">
              {referralCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 shadow-2xs transition flex items-center gap-1 cursor-pointer"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? 'Tersalin' : 'Salin Kode'}</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopyShareLink}
          className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer shadow-2xs"
        >
          {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5 text-slate-500" />}
          <span>{copiedLink ? 'Tautan Tersalin' : 'Salin Tautan Undangan'}</span>
        </button>
      </div>

      {/* Info Status Akun Referral Anda */}
      {userProfile?.referredBy && (
        <div className="px-3.5 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200/70 text-xs text-emerald-800 flex items-center gap-2 relative z-10">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            Anda terdaftar melalui referral dari: <strong>{userProfile.inviterName || userProfile.referredByCode || 'Teman'}</strong>
          </span>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 relative z-10">
        <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs text-center sm:text-left">
          <div className="text-[10px] sm:text-xs font-bold text-slate-500 flex items-center justify-center sm:justify-start gap-1">
            <Users className="w-3.5 h-3.5 text-blue-600 hidden sm:inline" />
            <span>Total Undangan</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
            {loading ? '-' : referralBerhasil}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold block mt-0.5">Stor diterima</span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/80 shadow-2xs text-center sm:text-left">
          <div className="text-[10px] sm:text-xs font-bold text-amber-800 flex items-center justify-center sm:justify-start gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 hidden sm:inline" />
            <span>Menunggu Stor</span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1">
            {loading ? '-' : Math.max(0, referrals.length - referralBerhasil)}
          </div>
          <span className="text-[10px] text-amber-700 block mt-0.5">Wajib stor & diterima</span>
        </div>

        <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/80 shadow-2xs text-center sm:text-left">
          <div className="text-[10px] sm:text-xs font-bold text-blue-800 flex items-center justify-center sm:justify-start gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 hidden sm:inline" />
            <span>Bonus Masuk</span>
          </div>
          <div className="text-base sm:text-lg font-black text-blue-700 mt-1 truncate">
            {loading ? '-' : formatRupiah(totalBonusDiterima)}
          </div>
          <span className="text-[10px] text-blue-600 block mt-0.5">Otomatis ke saldo</span>
        </div>
      </div>

      {/* Progress Bar Misi: 20 Teman */}
      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2 relative z-10">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-800 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>Progres Misi (Kelipatan 20 Teman):</span>
          </span>
          <span className="text-[#1e40af] font-black font-mono">
            {currentProgress} / 20 Teman
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-200 overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] transition-all duration-300 shadow-xs"
            style={{ width: `${Math.min(100, (currentProgress / 20) * 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Target: 20 teman melakukan storan pertama yang diterima</span>
          <span className="font-bold text-emerald-700">Bonus Rp 10.000</span>
        </div>
      </div>

      {/* Syarat & Ketentuan Info */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="font-bold">Syarat:</strong> Teman melakukan stor Gmail pertama yang diterima oleh admin. Begitu mencapai 20 referral yang berhasil diverifikasi, sistem akan <strong>otomatis memasukkan bonus Rp 10.000 ke saldo Anda</strong> tanpa perlu klaim manual.
        </div>
      </div>

      {/* Accordion List of Invited Friends */}
      {variant === 'full' && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowFriendsList(!showFriendsList)}
            className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-700 hover:text-blue-700 transition cursor-pointer"
          >
            <span>Daftar Undangan ({referrals.length} Teman)</span>
            {showFriendsList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showFriendsList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 pt-2"
              >
                {referrals.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    Belum ada teman yang bergabung menggunakan kode referral Anda. Bagikan kode Anda sekarang!
                  </p>
                ) : (
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {referrals.map((r, idx) => {
                      const isCompleted = r.status === 'completed';
                      return (
                        <div
                          key={r.id || idx}
                          className="p-2.5 rounded-xl border border-slate-200/80 bg-white flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 truncate">
                              {r.invitedName || 'Teman'} ({maskEmail(r.invitedEmail)})
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Daftar: {formatIndonesianDateTime(r.createdAt)}
                            </span>
                          </div>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                              isCompleted
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {isCompleted ? '✓ Berhasil (Diterima)' : 'Menunggu Stor'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
