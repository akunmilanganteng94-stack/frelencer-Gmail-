import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah, formatIndonesianDateTime, isEarlierThanTodayWIB } from '../lib/utils';
import {
  UserProfile,
  Submission,
  Withdrawal,
  NavigationTab,
  GmailStockItem,
  SystemSettings,
} from '../types';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGmailStock } from '../hooks/useGmailStock';
import { processReferralOnSubmissionAccepted, saveReferralCodeMapping } from '../lib/referralHelper';
import { AdminAllStorTab } from '../components/AdminAllStorTab';
import { AdminYesterdayPendingTab } from '../components/AdminYesterdayPendingTab';
import { AdminAllCekAdminTab } from '../components/AdminAllCekAdminTab';
import { AdminBulkConfirmModal } from '../components/AdminBulkConfirmModal';
import { AdminBulkRejectModal } from '../components/AdminBulkRejectModal';
import { AdminBulkCheckModal } from '../components/AdminBulkCheckModal';
import {
  ShieldCheck,
  Users,
  UploadCloud,
  Wallet,
  Settings,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Check,
  Ban,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  KeyRound,
  Copy,
  Mail,
  Layers,
  Edit3,
  MessageCircle,
  Sparkles,
  ListCheck,
  ListX,
  ClipboardCheck,
  Globe,
  Flame,
  History,
  X,
  MessageSquareWarning,
  Power,
  Gift,
  FileText,
  Send,
  Save,
  RotateCcw,
  Sliders,
  Calendar,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_REASONS = [
  'Password / sandi tidak cocok',
  'Meminta verifikasi nomor HP / 2FA aktif',
  'Akun dinonaktifkan / ditangguhkan Google',
  'Akun bukan fresh / sudah pernah digunakan',
  'Format data salah / tidak sesuai aturan',
  'Akun tidak dapat login / sesi kedaluwarsa',
];

export function AdminView({ onNavigate }: { onNavigate: (tab: NavigationTab) => void }) {
  const { isAdmin, currentUser } = useAuth();
  const { settings, updateSettings } = useSettings();
  const { showToast } = useToast();
  const {
    stock: gmailStockList,
    availableStock,
    usedStock,
    loading: loadingStock,
    addSingleAccount,
    addBulkAccounts,
    updateAccount,
    deleteAccount,
    clearUsedAccounts,
    clearAllStock,
    seedInitialAccounts,
  } = useGmailStock();

  const [activeTab, setActiveTab] = useState<
    | 'all_stor'
    | 'yesterday_pending'
    | 'all_cek_admin'
    | 'stats'
    | 'submissions'
    | 'withdrawals'
    | 'users'
    | 'settings'
    | 'stock'
  >('all_stor');

  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [submissionsList, setSubmissionsList] = useState<Submission[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<Withdrawal[]>([]);
  const [referralsList, setReferralsList] = useState<{ id: string; inviterUid: string; invitedUid: string; status: string }[]>([]);

  const [showBulkCheckModal, setShowBulkCheckModal] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);

  const [subFilter, setSubFilter] = useState<'All' | 'Pending' | 'Cek Admin' | 'Diterima' | 'Ditolak'>('Pending');
  const [subSearch, setSubSearch] = useState('');

  const [rejectModalSub, setRejectModalSub] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingSubId, setProcessingSubId] = useState<string | null>(null);

  const [withFilter, setWithFilter] = useState<'All' | 'Pending' | 'Selesai' | 'Ditolak'>('Pending');
  const [withSearch, setWithSearch] = useState('');
  const [rejectModalWith, setRejectModalWith] = useState<Withdrawal | null>(null);
  const [withRejectionReason, setWithRejectionReason] = useState('');
  const [processingWithId, setProcessingWithId] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userSortMode, setUserSortMode] = useState<'all' | 'highest_balance' | 'has_balance'>('all');

  const [tempPrice, setTempPrice] = useState(settings.pricePerSubmission);
  const [tempMinWithdrawal, setTempMinWithdrawal] = useState(settings.minWithdrawal);
  const [tempSchedule, setTempSchedule] = useState(settings.storanSchedule);
  const [tempAnnouncement, setTempAnnouncement] = useState(settings.announcement);
  const [tempGmailPassword, setTempGmailPassword] = useState(
    settings.gmailDefaultPassword || 'sgsg1122'
  );
  const [tempWhatsApp, setTempWhatsApp] = useState(
    settings.adminWhatsApp || '6285199219856'
  );
  const [tempDailyGenerateLimit, setTempDailyGenerateLimit] = useState(
    settings.dailyGenerateLimit || 10
  );
  const [tempStoranClosedReason, setTempStoranClosedReason] = useState(
    settings.storanClosedReason || ''
  );
  const [rulesList, setRulesList] = useState<string[]>(settings?.rules || []);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const [stockFilter, setStockFilter] = useState<'All' | 'available' | 'used'>('All');
  const [stockSearch, setStockSearch] = useState('');
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const [showAddBulkModal, setShowAddBulkModal] = useState(false);
  const [newStockEmail, setNewStockEmail] = useState('');
  const [newStockPass, setNewStockPass] = useState('');
  const [bulkInputText, setBulkInputText] = useState('');
  const [editingStockItem, setEditingStockItem] = useState<GmailStockItem | null>(null);
  const [editStockEmail, setEditStockEmail] = useState('');
  const [editStockPass, setEditStockPass] = useState('');
  const [editStockStatus, setEditStockStatus] = useState<'available' | 'used'>('available');

  interface StockConfirmDialog {
    title: string;
    description: string;
    confirmText: string;
    confirmColor: 'red' | 'amber' | 'indigo';
    action: () => Promise<void>;
  }
  const [stockConfirm, setStockConfirm] = useState<StockConfirmDialog | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  const [balanceModalUser, setBalanceModalUser] = useState<UserProfile | null>(null);
  const [balanceMode, setBalanceMode] = useState<'add' | 'set'>('add');
  const [balanceAmountInput, setBalanceAmountInput] = useState<string>('');
  const [includeTotalEarned, setIncludeTotalEarned] = useState<boolean>(true);
  const [savingBalance, setSavingBalance] = useState<boolean>(false);

  useEffect(() => {
    if (!isAdmin) return;

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const uList: UserProfile[] = [];
        snap.forEach((d) => {
          const u = d.data() as UserProfile;
          uList.push(u);
        });
        setUsersList(uList);
      },
      (err) => {
        console.warn('Admin users listener warning:', err);
      }
    );

    const unsubSubs = onSnapshot(
      collection(db, 'submissions'),
      (snap) => {
        const sList: Submission[] = [];
        snap.forEach((d) => sList.push({ id: d.id, ...(d.data() as Omit<Submission, 'id'>) }));
        sList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissionsList(sList);
      },
      (err) => {
        console.warn('Admin submissions listener warning:', err);
      }
    );

    const unsubWiths = onSnapshot(
      collection(db, 'withdrawals'),
      (snap) => {
        const wList: Withdrawal[] = [];
        snap.forEach((d) => wList.push({ id: d.id, ...(d.data() as Omit<Withdrawal, 'id'>) }));
        wList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWithdrawalsList(wList);
      },
      (err) => {
        console.warn('Admin withdrawals listener warning:', err);
      }
    );

    const unsubRefs = onSnapshot(
      collection(db, 'referrals'),
      (snap) => {
        const rList: { id: string; inviterUid: string; invitedUid: string; status: string }[] = [];
        snap.forEach((d) => rList.push({ id: d.id, ...(d.data() as any) }));
        setReferralsList(rList);
      },
      (err) => {
        console.warn('Admin referrals listener warning:', err);
      }
    );

    return () => {
      unsubUsers();
      unsubSubs();
      unsubWiths();
      unsubRefs();
    };
  }, [isAdmin]);

  useEffect(() => {
    setTempPrice(settings.pricePerSubmission);
    setTempMinWithdrawal(settings.minWithdrawal);
    setTempSchedule(settings.storanSchedule);
    setTempAnnouncement(settings.announcement);
    setTempDailyGenerateLimit(settings.dailyGenerateLimit || 10);
    setTempGmailPassword(settings.gmailDefaultPassword || 'sgsg1122');
    setTempWhatsApp(settings.adminWhatsApp || '6285199219856');
    setTempStoranClosedReason(settings.storanClosedReason || '');
    if (settings.rules && Array.isArray(settings.rules) && settings.rules.length > 0) {
      setRulesList(settings.rules);
    }
  }, [settings]);

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <Ban className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Akses Terbatas</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Halaman ini khusus untuk administrator sistem ({currentUser?.email}).
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  const handleAcceptSubmission = async (sub: Submission) => {
    setProcessingSubId(sub.id);
    try {
      const subRef = doc(db, 'submissions', sub.id);
      const userRef = doc(db, 'users', sub.userId);
      const reward = sub.rewardAmount || settings.pricePerSubmission || 3000;

      await runTransaction(db, async (transaction) => {
        const subDoc = await transaction.get(subRef);
        if (!subDoc.exists()) throw new Error('Submission tidak ditemukan.');
        if (subDoc.data().status === 'Diterima') return;

        const userDoc = await transaction.get(userRef);
        transaction.update(subRef, {
          status: 'Diterima',
          reviewedAt: new Date().toISOString(),
          rejectionReason: '',
        });

        if (!userDoc.exists()) {
          transaction.set(userRef, {
            uid: sub.userId,
            email: sub.userEmail,
            displayName: sub.userName || 'User',
            balance: reward,
            totalEarned: reward,
            totalWithdrawn: 0,
            pendingWithdrawn: 0,
            status: 'active',
            role: 'user',
            createdAt: new Date().toISOString(),
          });
        } else {
          const userData = userDoc.data();
          transaction.update(userRef, {
            balance: (userData.balance || 0) + reward,
            totalEarned: (userData.totalEarned || 0) + reward,
          });
        }
      });

      processReferralOnSubmissionAccepted(sub.userId, sub.id).catch(console.warn);
      showToast('success', 'Submission Diterima', `Saldo ${formatRupiah(reward)} otomatis masuk ke akun user.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleCheckSubmission = async (sub: Submission) => {
    setProcessingSubId(sub.id);
    try {
      await updateDoc(doc(db, 'submissions', sub.id), {
        status: 'Cek Admin',
        checkedAt: new Date().toISOString(),
      });
      showToast('info', 'Status: Cek Admin', `Akun ${sub.dataContent.split('|')[0].trim()} ditandai Cek Admin.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleConfirmRejectSubmission = async () => {
    if (!rejectModalSub || !rejectionReason.trim()) return;
    setProcessingSubId(rejectModalSub.id);
    try {
      await updateDoc(doc(db, 'submissions', rejectModalSub.id), {
        status: 'Ditolak',
        rejectionReason: rejectionReason.trim(),
        reviewedAt: new Date().toISOString(),
      });
      showToast('info', 'Submission Ditolak', 'Alasan penolakan berhasil disimpan.');
      setRejectModalSub(null);
      setRejectionReason('');
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleMarkWithdrawalPaid = async (withItem: Withdrawal) => {
    setProcessingWithId(withItem.id);
    try {
      const withRef = doc(db, 'withdrawals', withItem.id);
      const userRef = doc(db, 'users', withItem.userId);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          transaction.update(userRef, {
            pendingWithdrawn: Math.max(0, (userData.pendingWithdrawn || 0) - withItem.amount),
            totalWithdrawn: (userData.totalWithdrawn || 0) + withItem.amount,
          });
        }
        transaction.update(withRef, {
          status: 'Selesai',
          completedAt: new Date().toISOString(),
          rejectionReason: '',
        });
      });
      showToast('success', 'Selesai', `Penarikan ${formatRupiah(withItem.amount)} ditandai selesai.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingWithId(null);
    }
  };

  const handleConfirmRejectWithdrawal = async () => {
    if (!rejectModalWith || !withRejectionReason.trim()) return;
    setProcessingWithId(rejectModalWith.id);
    try {
      const withRef = doc(db, 'withdrawals', rejectModalWith.id);
      const userRef = doc(db, 'users', rejectModalWith.userId);
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          transaction.update(userRef, {
            balance: (userData.balance || 0) + rejectModalWith.amount,
            pendingWithdrawn: Math.max(0, (userData.pendingWithdrawn || 0) - rejectModalWith.amount),
          });
        }
        transaction.update(withRef, {
          status: 'Ditolak',
          rejectionReason: withRejectionReason.trim(),
          completedAt: new Date().toISOString(),
        });
      });
      showToast('info', 'Penarikan Ditolak', `Saldo ${formatRupiah(rejectModalWith.amount)} telah di-refund.`);
      setRejectModalWith(null);
      setWithRejectionReason('');
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingWithId(null);
    }
  };

  const handleToggleSuspendUser = async (targetUser: UserProfile) => {
    const newStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'users', targetUser.uid), { status: newStatus });
      showToast('success', 'Status Berubah', `User sekarang ${newStatus === 'active' ? 'Aktif' : 'Suspended'}.`);
      if (selectedUser?.uid === targetUser.uid) {
        setSelectedUser({ ...selectedUser, status: newStatus });
      }
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    }
  };

  const handleOpenBalanceModal = (targetUser: UserProfile, mode: 'add' | 'set' = 'add') => {
    setBalanceModalUser(targetUser);
    setBalanceMode(mode);
    setBalanceAmountInput(mode === 'set' ? String(targetUser.balance || 0) : '');
    setIncludeTotalEarned(true);
  };

  const handleSaveUserBalance = async (e: FormEvent) => {
    e.preventDefault();
    if (!balanceModalUser) return;
    const parsed = parseInt(balanceAmountInput.replace(/[^0-9]/g, ''), 10);
    if (isNaN(parsed) || parsed < 0) {
      showToast('error', 'Nominal Salah', 'Masukkan angka saldo valid.');
      return;
    }
    setSavingBalance(true);
    try {
      const currentBal = balanceModalUser.balance || 0;
      const newBal = balanceMode === 'add' ? currentBal + parsed : parsed;
      const updatePayload: Record<string, any> = { balance: newBal };
      if (balanceMode === 'add' && includeTotalEarned) {
        updatePayload.totalEarned = (balanceModalUser.totalEarned || 0) + parsed;
      }
      await updateDoc(doc(db, 'users', balanceModalUser.uid), updatePayload);
      showToast('success', 'Saldo Diperbarui', `Saldo ${balanceModalUser.displayName} menjadi ${formatRupiah(newBal)}.`);
      setBalanceModalUser(null);
      setBalanceAmountInput('');
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingBalance(false);
    }
  };

  const handleSaveAllSettings = async () => {
    setSavingSettings(true);
    try {
      const priceNum = Math.max(0, Number(tempPrice) || 3000);
      const minWdNum = Math.max(0, Number(tempMinWithdrawal) || 4000);
      const dailyLimitNum = Math.max(1, Number(tempDailyGenerateLimit) || 10);
      const cleanedRules = rulesList.map((r) => r.trim()).filter((r) => r.length > 0);

      await updateSettings({
        pricePerSubmission: priceNum,
        minWithdrawal: minWdNum,
        storanSchedule: tempSchedule.trim() || 'Senin - Jumat, 07.00 - 17.00 WIB (Sabtu & Minggu CLOSE)',
        announcement: tempAnnouncement.trim(),
        rules: cleanedRules.length > 0 ? cleanedRules : (settings.rules || []),
        gmailDefaultPassword: tempGmailPassword.trim() || 'sgsg1122',
        adminWhatsApp: tempWhatsApp.trim() || '6285199219856',
        dailyGenerateLimit: dailyLimitNum,
        storanClosedReason: tempStoranClosedReason.trim(),
      });
      showToast('success', 'Pengaturan Disimpan', 'Konfigurasi sistem berhasil disimpan dan aktif realtime.');
    } catch (err: unknown) {
      showToast('error', 'Gagal Menyimpan', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddRule = () => {
    if (!newRuleInput.trim()) return;
    setRulesList((prev) => [...prev, newRuleInput.trim()]);
    setNewRuleInput('');
    showToast('info', 'Aturan Ditambahkan', 'Klik "Simpan Semua Pengaturan" untuk menerapkan secara permanen.');
  };

  const handleRemoveRule = (index: number) => {
    setRulesList((prev) => prev.filter((_, i) => i !== index));
    showToast('info', 'Aturan Dihapus', 'Klik "Simpan Semua Pengaturan" untuk menerapkan secara permanen.');
  };

  const handleUpdateRule = (index: number, val: string) => {
    setRulesList((prev) => prev.map((r, i) => (i === index ? val : r)));
  };

  const handleResetToDefaultRules = () => {
    const DEFAULT_RULES = [
      'Password akun Gmail WAJIB menggunakan: sgsg1122 (atau sesuai konfigurasi aktif dari Admin).',
      'Akun Gmail harus fresh, aktif, dan dapat login tanpa terhalang 2FA atau verifikasi nomor yang terkunci.',
      'Dilarang mengaktifkan Verifikasi 2 Langkah (2-Step Verification) atau kunci keamanan yang menghambat verifikasi admin.',
      'Kirimkan storan dalam sistem 1 baris untuk 1 akun Gmail (Format: email@gmail.com atau email@gmail.com|password).',
      'Gunakan fitur "Generator Akun Gmail" untuk kombinasi nama dan alamat email yang rapi serta otomatis.',
      'Dilarang mengirim email fiktif, akun hasil retas/curian, atau akun yang belum terdaftar di Google.',
      'Admin berhak menolak akun yang gagal login, terkena disabled, atau tidak menggunakan password wajib.',
    ];
    setRulesList(DEFAULT_RULES);
    showToast('info', 'Aturan Direset', 'Daftar aturan dikembalikan ke default standar.');
  };

  const handleToggleOperational = async (key: keyof SystemSettings, currentVal: boolean | undefined, label: string) => {
    try {
      const newVal = currentVal === false ? true : !currentVal;
      await updateSettings({ [key]: newVal });
      showToast('success', `${label} Diperbarui`, `Status ${label} kini ${newVal ? 'BUKA' : 'TUTUP'}.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal Mengubah Saklar', err instanceof Error ? err.message : String(err));
    }
  };

  const filteredSubs = submissionsList.filter((sub) => {
    if (!sub) return false;
    const matchesFilter = subFilter === 'All' || sub.status === subFilter;
    const q = (subSearch || '').toLowerCase();
    const matchesSearch =
      (sub.id || '').toLowerCase().includes(q) ||
      (sub.userName || '').toLowerCase().includes(q) ||
      (sub.userEmail || '').toLowerCase().includes(q) ||
      (sub.dataContent || '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const filteredWiths = withdrawalsList.filter((w) => {
    if (!w) return false;
    const matchesFilter = withFilter === 'All' || w.status === withFilter;
    const q = (withSearch || '').toLowerCase();
    const matchesSearch =
      (w.id || '').toLowerCase().includes(q) ||
      (w.userName || '').toLowerCase().includes(q) ||
      (w.userEmail || '').toLowerCase().includes(q) ||
      (w.targetNumber || '').includes(withSearch) ||
      (w.recipientName || '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const filteredUsers = useMemo(() => {
    const q = (userSearch || '').toLowerCase();
    let list = usersList.filter(
      (u) =>
        (u.displayName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.uid || '').toLowerCase().includes(q)
    );
    if (userSortMode === 'has_balance') {
      list = list.filter((u) => (u.balance || 0) > 0);
    }
    if (userSortMode === 'highest_balance') {
      list = [...list].sort((a, b) => (b.balance || 0) - (a.balance || 0));
    }
    return list;
  }, [usersList, userSearch, userSortMode]);

  const filteredStock = gmailStockList.filter((item) => {
    if (!item) return false;
    const matchesFilter =
      stockFilter === 'All' ||
      (stockFilter === 'available' && item.status === 'available') ||
      (stockFilter === 'used' && item.status === 'used');
    const q = (stockSearch || '').toLowerCase();
    const matchesSearch =
      (item.email || '').toLowerCase().includes(q) ||
      (item.password && item.password.toLowerCase().includes(q));
    return matchesFilter && Boolean(matchesSearch);
  });

  // Calculate stats for the selected user detail modal
  const selectedUserStats = useMemo(() => {
    if (!selectedUser) return null;
    const uid = selectedUser.uid;
    const userSubs = submissionsList.filter((s) => s && s.userId === uid);
    const userWiths = withdrawalsList.filter((w) => w && w.userId === uid);
    const userRefs = referralsList.filter((r) => r && r.inviterUid === uid);
    const userRefsFromUsers = usersList.filter((u) => u && u.referredBy === uid);

    const storDiterima = userSubs.filter((s) => s.status === 'Diterima').length;
    const storPending = userSubs.filter((s) => s.status === 'Pending' || s.status === 'Cek Admin').length;
    const storDitolak = userSubs.filter((s) => s.status === 'Ditolak').length;

    const wdPending = userWiths.filter((w) => w.status === 'Pending').length;
    const wdSelesai = userWiths.filter((w) => w.status === 'Selesai').length;
    const totalWdAmount = userWiths.reduce((acc, w) => acc + (w.amount || 0), 0);

    // Completed: friends who have submitted a stor AND that stor was accepted
    const refSuccessful = userRefs.filter((r) => r.status === 'completed').length;
    const totalInvitedFriends = Math.max(
      userRefs.length,
      userRefsFromUsers.length
    );

    return {
      totalRiwayat: userSubs.length,
      totalPenarikanCount: userWiths.length,
      totalPenarikanNominal: totalWdAmount,
      penarikanPendingCount: wdPending,
      penarikanSelesaiCount: wdSelesai,
      totalStor: userSubs.length,
      storDiterima,
      storPending,
      storDitolak,
      totalUndangan: refSuccessful, // Friends whose STOR is accepted
      totalTerdaftar: totalInvitedFriends,
      undanganBerhasil: refSuccessful,
    };
  }, [selectedUser, submissionsList, withdrawalsList, referralsList, usersList]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>Administrator Control Panel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Admin Panel AZGmail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Kelola verifikasi akun Gmail, fitur All STOR User, konfirmasi terima bulk, tolak bulk, dan saldo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulkCheckModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Cek Bulk</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBulkConfirmModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ListCheck className="w-4 h-4" />
            <span>Terima Bulk</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBulkRejectModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-black shadow-md shadow-rose-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ListX className="w-4 h-4" />
            <span>Tolak Bulk</span>
          </button>
        </div>
      </div>

      {/* SAKLAR OPERASIONAL LAYANAN */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <Power className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <span>Saklar Operasional Layanan (Tutup / Buka)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Klik saklar status di bawah ini untuk membuka atau menutup akses layanan realtime
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => updateSettings({ withdrawalOpen: settings.withdrawalOpen === false })}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
              settings.withdrawalOpen !== false
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Penarikan: {settings.withdrawalOpen !== false ? 'BUKA' : 'TUTUP'}</span>
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ generatorOpen: settings.generatorOpen === false })}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
              settings.generatorOpen !== false
                ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate: {settings.generatorOpen !== false ? 'BUKA' : 'TUTUP'}</span>
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ storanKhususOpen: settings.storanKhususOpen === false })}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
              settings.storanKhususOpen !== false
                ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>STOR Khusus: {settings.storanKhususOpen !== false ? 'BUKA' : 'TUTUP'}</span>
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ storanBebasOpen: settings.storanBebasOpen === false })}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
              settings.storanBebasOpen !== false
                ? 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>STOR Bebas: {settings.storanBebasOpen !== false ? 'BUKA' : 'TUTUP'}</span>
          </button>

          <button
            type="button"
            onClick={() => updateSettings({ storanOpen: !settings.storanOpen })}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
              settings.storanOpen
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            <span>Semua STOR: {settings.storanOpen ? 'BUKA' : 'TUTUP'}</span>
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex flex-wrap gap-1 p-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        {[
          { id: 'all_stor', label: `All STOR (${submissionsList.length})`, icon: Layers },
          {
            id: 'yesterday_pending',
            label: `Pendingan Kemarin (${submissionsList.filter((s) => s.status === 'Pending' && isEarlierThanTodayWIB(s.createdAt)).length})`,
            icon: History,
          },
          {
            id: 'all_cek_admin',
            label: `All Cek Admin (${submissionsList.filter((s) => s.status === 'Cek Admin').length})`,
            icon: ClipboardCheck,
          },
          { id: 'stats', label: 'Statistik & Ringkasan', icon: TrendingUp },
          { id: 'stock', label: `Stok Generator (${availableStock.length})`, icon: Sparkles },
          { id: 'submissions', label: `Antrean Pending (${submissionsList.filter((s) => s.status === 'Pending').length})`, icon: UploadCloud },
          {
            id: 'withdrawals',
            label: `Penarikan (${withdrawalsList.filter((w) => w.status === 'Pending').length})`,
            icon: Wallet,
          },
          { id: 'users', label: `Kelola User (${usersList.length})`, icon: Users },
          { id: 'settings', label: 'Pengaturan Sistem', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'all_stor' && (
        <AdminAllStorTab
          submissions={submissionsList}
          defaultPassword={settings.gmailDefaultPassword || 'sgsg1122'}
          onOpenBulkCheckModal={() => setShowBulkCheckModal(true)}
          onOpenBulkConfirmModal={() => setShowBulkConfirmModal(true)}
          onOpenBulkRejectModal={() => setShowBulkRejectModal(true)}
          onAcceptSubmission={handleAcceptSubmission}
          onCheckSubmission={handleCheckSubmission}
          onRejectSubmission={(sub) => {
            setRejectModalSub(sub);
            setRejectionReason(PRESET_REASONS[0]);
          }}
          processingSubId={processingSubId}
          onNavigateToYesterdayPending={() => setActiveTab('yesterday_pending')}
        />
      )}

      {activeTab === 'yesterday_pending' && (
        <AdminYesterdayPendingTab
          submissions={submissionsList}
          defaultPassword={settings.gmailDefaultPassword || 'sgsg1122'}
          onOpenBulkCheckModal={() => setShowBulkCheckModal(true)}
          onOpenBulkConfirmModal={() => setShowBulkConfirmModal(true)}
          onOpenBulkRejectModal={() => setShowBulkRejectModal(true)}
          onAcceptSubmission={handleAcceptSubmission}
          onCheckSubmission={handleCheckSubmission}
          onRejectSubmission={(sub) => {
            setRejectModalSub(sub);
            setRejectionReason(PRESET_REASONS[0]);
          }}
          processingSubId={processingSubId}
        />
      )}

      {activeTab === 'all_cek_admin' && (
        <AdminAllCekAdminTab
          submissions={submissionsList}
          defaultPassword={settings.gmailDefaultPassword || 'sgsg1122'}
          onOpenBulkCheckModal={() => setShowBulkCheckModal(true)}
          onOpenBulkConfirmModal={() => setShowBulkConfirmModal(true)}
          onOpenBulkRejectModal={() => setShowBulkRejectModal(true)}
          onAcceptSubmission={handleAcceptSubmission}
          onRejectSubmission={(sub) => {
            setRejectModalSub(sub);
            setRejectionReason(PRESET_REASONS[0]);
          }}
          processingSubId={processingSubId}
          onNavigateToYesterdayPending={() => setActiveTab('yesterday_pending')}
          onNavigateToAllStor={() => setActiveTab('all_stor')}
        />
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-500">Total Pengguna</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{usersList.length}</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-500">Total Saldo User</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {formatRupiah(usersList.reduce((acc, u) => acc + (u.balance || 0), 0))}
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-500">Total STOR Diterima</span>
              <div className="text-2xl font-black text-blue-700 mt-1">
                {submissionsList.filter((s) => s.status === 'Diterima').length}
              </div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <span className="text-xs font-bold text-slate-500">Total Dicairkan</span>
              <div className="text-2xl font-black text-sky-700 mt-1">
                {formatRupiah(
                  withdrawalsList
                    .filter((w) => w.status === 'Selesai')
                    .reduce((acc, w) => acc + (w.amount || 0), 0)
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
                {[
                  { id: 'All', label: `Semua (${gmailStockList.length})` },
                  { id: 'available', label: `Tersedia (${availableStock.length})` },
                  { id: 'used', label: `Terpakai (${usedStock.length})` },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStockFilter(f.id as typeof stockFilter)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      stockFilter === f.id
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(true)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah 1 Akun</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBulkModal(true)}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  <span>Import Massal</span>
                </button>
              </div>
            </div>
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Cari email Gmail di stok..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
                  {(['Pending', 'Cek Admin', 'Diterima', 'Ditolak', 'All'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setSubFilter(f)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                        subFilter === f
                          ? 'bg-white text-blue-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari user, email, data..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-blue-500 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filteredSubs.map((sub) => (
              <div key={sub.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-900">{sub.userName || sub.userEmail}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {sub.status}
                  </span>
                </div>
                <div className="font-mono text-xs text-slate-800 font-bold">{sub.dataContent}</div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRejectModalSub(sub);
                      setRejectionReason(PRESET_REASONS[0]);
                    }}
                    className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAcceptSubmission(sub)}
                    className="px-4 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                  >
                    Terima
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs">
            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
              {(['Pending', 'Selesai', 'Ditolak', 'All'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setWithFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    withFilter === f ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredWiths.map((w) => (
              <div key={w.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{w.userName} ({w.userEmail})</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {w.status}
                  </span>
                </div>
                <div className="text-sm font-black text-blue-700">{formatRupiah(w.amount)} ke {w.method} ({w.targetNumber}) a.n. {w.recipientName}</div>
                {w.status === 'Pending' && (
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalWith(w);
                        setWithRejectionReason('Nomor e-wallet tidak valid');
                      }}
                      className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkWithdrawalPaid(w)}
                      className="px-4 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                    >
                      Selesai
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari user..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUserSortMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  userSortMode === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Semua ({usersList.length})
              </button>
              <button
                type="button"
                onClick={() => setUserSortMode('highest_balance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  userSortMode === 'highest_balance' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-900'
                }`}
              >
                Saldo Terbanyak
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map((u) => (
              <div
                key={u.uid}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-extrabold text-sm text-slate-900 truncate">
                        {u.displayName || 'Tanpa Nama'}
                      </h4>
                      <p className="text-xs text-slate-500 truncate">{u.email}</p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {u.status === 'active' ? 'Aktif' : 'Suspended'}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[11px] block">Saldo Aktif:</span>
                      <strong className="text-blue-700 font-extrabold">
                        {formatRupiah(u.balance || 0)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">Total Penghasilan:</span>
                      <strong className="text-slate-800">
                        {formatRupiah(u.totalEarned || 0)}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-blue-200"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenBalanceModal(u, 'add')}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      Ubah Saldo
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSuspendUser(u)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      u.status === 'active'
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {u.status === 'active' ? 'Suspend' : 'Aktifkan'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PENGATURAN SISTEM TAB */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1e40af] via-blue-600 to-[#38bdf8] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Settings className="w-6 h-6 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Pengaturan Sistem & Layanan
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Realtime Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atur saklar buka/tutup layanan, harga komisi per akun, batas penarikan, password default, generator, dan aturan storan.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-start md:self-center">
              <button
                type="button"
                onClick={() => {
                  setTempPrice(settings.pricePerSubmission);
                  setTempMinWithdrawal(settings.minWithdrawal);
                  setTempSchedule(settings.storanSchedule);
                  setTempAnnouncement(settings.announcement);
                  setTempDailyGenerateLimit(settings.dailyGenerateLimit || 10);
                  setTempGmailPassword(settings.gmailDefaultPassword || 'sgsg1122');
                  setTempWhatsApp(settings.adminWhatsApp || '6285199219856');
                  setTempStoranClosedReason(settings.storanClosedReason || '');
                  setRulesList(settings.rules || []);
                  showToast('info', 'Form Direset', 'Nilai form dikembalikan sesuai pengaturan saat ini.');
                }}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Batal perubahan & muat ulang dari server"
              >
                <RotateCcw className="w-4 h-4 text-slate-500" />
                <span>Reset Form</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAllSettings}
                disabled={savingSettings}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 text-white text-xs font-black shadow-md shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {savingSettings ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Simpan Pengaturan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 1. SAKLAR OPERASIONAL LAYANAN */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Power className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Saklar Layanan & Status Operasional Realtime
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Perubahan saklar langsung berdampak ke seluruh pengguna saat itu juga
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
                Klik tombol untuk buka/tutup
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Saklar Master Semua STOR */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Semua Layanan STOR</span>
                    <span className="text-[11px] text-slate-500 block">Master switch penerimaan akun</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      settings.storanOpen
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {settings.storanOpen ? 'BUKA' : 'TUTUP'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleOperational('storanOpen', settings.storanOpen, 'Semua Layanan STOR')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                    settings.storanOpen
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{settings.storanOpen ? 'Tutup Semua STOR' : 'Buka Semua STOR'}</span>
                </button>
              </div>

              {/* Saklar STOR Khusus */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Layanan STOR Khusus</span>
                    <span className="text-[11px] text-slate-500 block">Akun dari stok generator</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      settings.storanKhususOpen !== false
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {settings.storanKhususOpen !== false ? 'BUKA' : 'TUTUP'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleOperational('storanKhususOpen', settings.storanKhususOpen, 'STOR Khusus')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                    settings.storanKhususOpen !== false
                      ? 'bg-slate-700 hover:bg-slate-800 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{settings.storanKhususOpen !== false ? 'Tutup STOR Khusus' : 'Buka STOR Khusus'}</span>
                </button>
              </div>

              {/* Saklar STOR Bebas */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Layanan STOR Bebas</span>
                    <span className="text-[11px] text-slate-500 block">Akun buatan mandiri user</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      settings.storanBebasOpen !== false
                        ? 'bg-teal-100 text-teal-800 border border-teal-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {settings.storanBebasOpen !== false ? 'BUKA' : 'TUTUP'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleOperational('storanBebasOpen', settings.storanBebasOpen, 'STOR Bebas')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                    settings.storanBebasOpen !== false
                      ? 'bg-slate-700 hover:bg-slate-800 text-white'
                      : 'bg-teal-600 hover:bg-teal-700 text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>{settings.storanBebasOpen !== false ? 'Tutup STOR Bebas' : 'Buka STOR Bebas'}</span>
                </button>
              </div>

              {/* Saklar Penarikan Saldo */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Penarikan Saldo (WD)</span>
                    <span className="text-[11px] text-slate-500 block">Pencairan saldo ke e-wallet</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      settings.withdrawalOpen !== false
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {settings.withdrawalOpen !== false ? 'BUKA' : 'TUTUP'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleOperational('withdrawalOpen', settings.withdrawalOpen, 'Penarikan Saldo')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                    settings.withdrawalOpen !== false
                      ? 'bg-slate-700 hover:bg-slate-800 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{settings.withdrawalOpen !== false ? 'Tutup Penarikan' : 'Buka Penarikan'}</span>
                </button>
              </div>

              {/* Saklar Generator Gmail */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Generator Akun Gmail</span>
                    <span className="text-[11px] text-slate-500 block">Buat nama & alamat otomatis</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      settings.generatorOpen !== false
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}
                  >
                    {settings.generatorOpen !== false ? 'BUKA' : 'TUTUP'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleOperational('generatorOpen', settings.generatorOpen, 'Generator Akun Gmail')}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                    settings.generatorOpen !== false
                      ? 'bg-slate-700 hover:bg-slate-800 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{settings.generatorOpen !== false ? 'Tutup Generator' : 'Buka Generator'}</span>
                </button>
              </div>
            </div>

            {/* Input Alasan Saat Storan Tutup */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Pesan / Alasan Jika Storan Sedang Ditutup (Tampil ke Pengguna)
              </label>
              <textarea
                rows={2}
                value={tempStoranClosedReason}
                onChange={(e) => setTempStoranClosedReason(e.target.value)}
                placeholder="Contoh: Admin sedang menutup penerimaan akun baru. Storan aktif setiap Senin - Jumat..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none leading-relaxed"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                Pesan ini akan muncul di halaman storan ketika salah satu atau semua jenis storan ditutup oleh admin.
              </span>
            </div>
          </div>

          {/* 2. KEUANGAN & KOMISI REWARD */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Tarif Komisi Storan & Batas Penarikan Dana
                </h3>
                <p className="text-[11px] text-slate-500">
                  Atur reward per akun yang diterima dan batas minimal saldo pencairan user
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-emerald-950 block">
                    Harga Komisi per Akun Diterima (Rp)
                  </label>
                  <span className="text-xs font-extrabold text-emerald-700 bg-white px-2 py-0.5 rounded-lg border border-emerald-300">
                    {formatRupiah(Number(tempPrice) || 0)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-emerald-700">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(Number(e.target.value))}
                    placeholder="3000"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-black text-slate-900 rounded-xl border border-emerald-300 bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
                <p className="text-[11px] text-emerald-800">
                  Setiap setoran berstatus <strong className="font-bold">Diterima</strong> akan otomatis menambahkan nominal ini ke saldo pengguna.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-blue-950 block">
                    Minimal Penarikan Saldo (Rp)
                  </label>
                  <span className="text-xs font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-300">
                    {formatRupiah(Number(tempMinWithdrawal) || 0)}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-blue-700">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={tempMinWithdrawal}
                    onChange={(e) => setTempMinWithdrawal(Number(e.target.value))}
                    placeholder="4000"
                    className="w-full pl-10 pr-4 py-2.5 text-sm font-black text-slate-900 rounded-xl border border-blue-300 bg-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                  />
                </div>
                <p className="text-[11px] text-blue-800">
                  Batas saldo terendah yang dapat diajukan oleh pengguna saat meminta pencairan dana e-wallet.
                </p>
              </div>
            </div>
          </div>

          {/* 3. KONFIGURASI AKUN GMAIL & GENERATOR */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Konfigurasi Akun Gmail & Limit Generator
                </h3>
                <p className="text-[11px] text-slate-500">
                  Password wajib yang harus digunakan user dan batas limit generate akun harian
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-orange-950 block">
                    Password Wajib Akun Gmail
                  </label>
                  <button
                    type="button"
                    onClick={() => setTempGmailPassword('sgsg1122')}
                    className="text-[10px] font-bold text-orange-700 hover:text-orange-900 underline cursor-pointer"
                  >
                    Gunakan sgsg1122
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={tempGmailPassword}
                    onChange={(e) => setTempGmailPassword(e.target.value)}
                    placeholder="sgsg1122"
                    className="w-full px-3.5 py-2.5 font-mono text-sm font-black text-orange-900 rounded-xl border border-orange-300 bg-white focus:ring-2 focus:ring-orange-500/20 outline-none"
                  />
                </div>
                <p className="text-[11px] text-orange-900">
                  Password ini ditampilkan di Halaman Rules dan form generator. Akun dengan password berbeda berhak ditolak admin.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-purple-950 block">
                    Limit Harian Generate Akun per User
                  </label>
                  <span className="text-xs font-extrabold text-purple-700 bg-white px-2 py-0.5 rounded-lg border border-purple-300">
                    {tempDailyGenerateLimit} Akun/Hari
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={tempDailyGenerateLimit}
                    onChange={(e) => setTempDailyGenerateLimit(Number(e.target.value))}
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 text-sm font-black text-slate-900 rounded-xl border border-purple-300 bg-white focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                </div>
                <p className="text-[11px] text-purple-800">
                  Mencegah spam dan menjaga ketersediaan generator agar merata untuk seluruh anggota.
                </p>
              </div>
            </div>
          </div>

          {/* 4. JADWAL, PENGUMUMAN & KONTAK BANTUAN */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Jadwal Operasional, Pengumuman & Kontak WhatsApp
                </h3>
                <p className="text-[11px] text-slate-500">
                  Informasi jam layanan dan nomor bantuan langsung admin
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">
                  Jadwal & Jam Operasional Layanan
                </label>
                <input
                  type="text"
                  value={tempSchedule}
                  onChange={(e) => setTempSchedule(e.target.value)}
                  placeholder="Senin - Jumat, 07.00 - 17.00 WIB (Sabtu & Minggu CLOSE)"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
                <span className="text-[10px] text-slate-400 block">
                  Ditampilkan di footer dan header halaman Storan pengguna.
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nomor WhatsApp Resmi Admin
                  </label>
                  {tempWhatsApp && (
                    <button
                      type="button"
                      onClick={() => window.open(`https://wa.me/${tempWhatsApp.replace(/[^0-9]/g, '')}`, '_blank', 'noopener,noreferrer')}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Send className="w-3 h-3" />
                      <span>Tes Buka WhatsApp</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={tempWhatsApp}
                  onChange={(e) => setTempWhatsApp(e.target.value)}
                  placeholder="6285199219856"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none font-mono"
                />
                <span className="text-[10px] text-slate-400 block">
                  Format internasional dengan 62 (contoh: 6285199219856). Terhubung ke tombol "Hubungi Admin".
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold text-slate-700 block">
                Pesan Pengumuman Beranda (Banner Beranda)
              </label>
              <textarea
                rows={3}
                value={tempAnnouncement}
                onChange={(e) => setTempAnnouncement(e.target.value)}
                placeholder="Storan Akun Gmail OPEN setiap Senin - Jumat! Jam operasional: 07.00 - 17.00 WIB..."
                className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none leading-relaxed"
              />
              <span className="text-[10px] text-slate-400 block">
                Pesan pengumuman penting yang muncul di bagian atas halaman Beranda seluruh pengguna.
              </span>
            </div>
          </div>

          {/* 5. KELOLA ATURAN & KETENTUAN STORAN (RULES) */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Kelola Aturan & Ketentuan Storan ({rulesList.length} Butir Aktif)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Teks aturan yang tampil di halaman "Rules" dan popup panduan pengguna
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetToDefaultRules}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Kembalikan 7 Aturan Standar</span>
              </button>
            </div>

            {/* Input Tambah Aturan Baru */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newRuleInput}
                onChange={(e) => setNewRuleInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddRule();
                  }
                }}
                placeholder="Tulis butir aturan baru di sini, lalu klik Tambah..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              />
              <button
                type="button"
                onClick={handleAddRule}
                disabled={!newRuleInput.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Aturan</span>
              </button>
            </div>

            {/* Daftar Butir Aturan */}
            <div className="space-y-2.5 pt-1">
              {rulesList.map((rule, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition"
                >
                  <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={rule}
                      onChange={(e) => handleUpdateRule(idx, e.target.value)}
                      className="w-full text-xs text-slate-800 bg-transparent border-0 focus:ring-0 focus:outline-none p-0 font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer shrink-0"
                    title="Hapus butir aturan ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Save Action Bar */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Save className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Simpan Seluruh Perubahan Konfigurasi</h4>
                <p className="text-xs text-slate-400">
                  Pastikan data harga, password, jadwal, dan aturan sudah sesuai sebelum menyimpan.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveAllSettings}
              disabled={savingSettings}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-400 hover:from-blue-600 hover:to-sky-500 text-slate-950 font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {savingSettings ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Menyimpan ke Database...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Simpan Semua Pengaturan</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* USER DETAIL MODAL WITH REQUIRED STATS: JUMLAH RIWAYAT, PENARIKAN, STOR, UNDANGAN TEMEN */}
      <AnimatePresence>
        {selectedUser && selectedUserStats && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#1e40af] via-blue-600 to-[#38bdf8] text-white flex items-center justify-center font-black text-lg shadow-sm">
                    {selectedUser.displayName ? selectedUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{selectedUser.displayName}</h3>
                    <p className="text-xs text-slate-500">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Saldo & Status Overview */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-800 block">Saldo Aktif:</span>
                  <div className="text-lg font-black text-blue-700 mt-0.5">
                    {formatRupiah(selectedUser.balance || 0)}
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 block">Total Penghasilan:</span>
                  <div className="text-lg font-black text-slate-900 mt-0.5">
                    {formatRupiah(selectedUser.totalEarned || 0)}
                  </div>
                </div>
              </div>

              {/* 4 DETAIL STATISTIK YANG DIMINTA USER: RIWAYAT, PENARIKAN, STOR, UNDANGAN TEMEN */}
              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                  Ringkasan Aktivitas Akun:
                </span>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {/* 1. JUMLAH RIWAYAT */}
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Jumlah Riwayat</span>
                    </div>
                    <div className="text-2xl font-black text-indigo-950 font-mono">
                      {selectedUserStats.totalRiwayat}{' '}
                      <span className="text-xs font-semibold text-indigo-700 font-sans">Riwayat</span>
                    </div>
                    <span className="text-[10px] text-indigo-700 block">
                      Catatan transaksi storan
                    </span>
                  </div>

                  {/* 2. JUMLAH PENARIKAN */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Jumlah Penarikan</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-950 font-mono">
                      {selectedUserStats.totalPenarikanCount}{' '}
                      <span className="text-xs font-semibold text-emerald-700 font-sans">Kali</span>
                    </div>
                    <span className="text-[10px] text-emerald-800 block">
                      Total: {formatRupiah(selectedUserStats.totalPenarikanNominal)} ({selectedUserStats.penarikanSelesaiCount} Selesai)
                    </span>
                  </div>

                  {/* 3. JUMLAH STOR */}
                  <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-sky-900 font-bold">
                      <Send className="w-4 h-4 text-sky-600" />
                      <span>Jumlah STOR</span>
                    </div>
                    <div className="text-2xl font-black text-sky-950 font-mono">
                      {selectedUserStats.totalStor}{' '}
                      <span className="text-xs font-semibold text-sky-700 font-sans">Akun</span>
                    </div>
                    <span className="text-[10px] text-sky-800 block">
                      {selectedUserStats.storDiterima} Diterima • {selectedUserStats.storPending} Pending • {selectedUserStats.storDitolak} Ditolak
                    </span>
                  </div>

                  {/* 4. UNDANGAN TEMEN */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                      <Gift className="w-4 h-4 text-amber-600" />
                      <span>Undangan Temen</span>
                    </div>
                    <div className="text-2xl font-black text-amber-950 font-mono">
                      {selectedUserStats.totalUndangan}{' '}
                      <span className="text-xs font-semibold text-amber-700 font-sans">Teman</span>
                    </div>
                    <span className="text-[10px] text-amber-800 block">
                      {selectedUserStats.undanganBerhasil} Masuk (Stor 1 Diterima)
                      {selectedUserStats.totalTerdaftar > selectedUserStats.undanganBerhasil && (
                        <> • {selectedUserStats.totalTerdaftar - selectedUserStats.undanganBerhasil} Menunggu Stor</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info Tambahan Akun */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-400">UID:</span>
                  <span className="font-mono font-bold select-all text-slate-900">{selectedUser.uid}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kode Referral User:</span>
                  <strong className="font-mono text-blue-700">{selectedUser.referralCode || '-'}</strong>
                </div>
                {selectedUser.referredByCode && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Diundang Oleh:</span>
                    <strong className="text-emerald-700">{selectedUser.inviterName || selectedUser.referredByCode}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Terdaftar Pada:</span>
                  <span>{formatIndonesianDateTime(selectedUser.createdAt)}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenBalanceModal(selectedUser, 'add')}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Ubah Saldo
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BALANCE MODAL */}
      <AnimatePresence>
        {balanceModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Ubah Saldo Pengguna</h3>
                <button
                  type="button"
                  onClick={() => setBalanceModalUser(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                User: <strong>{balanceModalUser.displayName}</strong> ({balanceModalUser.email})<br />
                Saldo saat ini: <strong className="text-blue-600">{formatRupiah(balanceModalUser.balance || 0)}</strong>
              </p>

              <form onSubmit={handleSaveUserBalance} className="space-y-3.5">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBalanceMode('add')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      balanceMode === 'add'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    + Tambah Saldo
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceMode('set')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      balanceMode === 'set'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Setel Saldo Tetap
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {balanceMode === 'add' ? 'Nominal Tambahan (Rp)' : 'Nominal Saldo Baru (Rp)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={balanceAmountInput}
                    onChange={(e) => setBalanceAmountInput(e.target.value)}
                    placeholder="Contoh: 10000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {balanceMode === 'add' && (
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTotalEarned}
                      onChange={(e) => setIncludeTotalEarned(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Sertakan ke Total Penghasilan (Total Earned)</span>
                  </label>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setBalanceModalUser(null)}
                    disabled={savingBalance}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingBalance || !balanceAmountInput.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {savingBalance ? 'Menyimpan...' : 'Simpan Saldo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SINGLE SUBMISSION REJECT MODAL */}
      <AnimatePresence>
        {rejectModalSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-rose-600 to-red-700 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black">Tolak Akun Gmail</h3>
                  <p className="text-xs text-rose-100 font-mono truncate max-w-[240px]">
                    {rejectModalSub.dataContent.split('|')[0].trim()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalSub(null)}
                  className="p-1 rounded-full text-white/80 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Tuliskan alasan penolakan..."
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalSub(null)}
                    className="flex-1 py-2 rounded-xl border text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRejectSubmission}
                    className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SINGLE WITHDRAWAL REJECT MODAL */}
      <AnimatePresence>
        {rejectModalWith && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4"
            >
              <h3 className="text-base font-black text-slate-900">Tolak Penarikan Saldo</h3>
              <textarea
                rows={3}
                value={withRejectionReason}
                onChange={(e) => setWithRejectionReason(e.target.value)}
                placeholder="Alasan penolakan..."
                className="w-full p-3 text-xs rounded-xl border border-slate-300 outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalWith(null)}
                  className="flex-1 py-2 rounded-xl border text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejectWithdrawal}
                  className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                >
                  Tolak & Refund
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BULK MODALS */}
      <AdminBulkCheckModal
        isOpen={showBulkCheckModal}
        onClose={() => setShowBulkCheckModal(false)}
        submissions={submissionsList}
      />
      <AdminBulkConfirmModal
        isOpen={showBulkConfirmModal}
        onClose={() => setShowBulkConfirmModal(false)}
        submissions={submissionsList}
      />
      <AdminBulkRejectModal
        isOpen={showBulkRejectModal}
        onClose={() => setShowBulkRejectModal(false)}
        submissions={submissionsList}
      />
    </div>
  );
}
