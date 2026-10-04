import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah, formatIndonesianDateTime, isEarlierThanTodayWIB } from '../lib/utils';
import { UserProfile, Submission, Withdrawal, NavigationTab } from '../types';
import { collection, onSnapshot, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGmailStock } from '../hooks/useGmailStock';
import { processReferralOnSubmissionAccepted } from '../lib/referralHelper';
import { subscribeDataChange } from '../lib/syncHelper';
import { AdminAllStorTab } from '../components/AdminAllStorTab';
import { AdminYesterdayPendingTab } from '../components/AdminYesterdayPendingTab';
import { AdminAllCekAdminTab } from '../components/AdminAllCekAdminTab';
import { AdminSettingsTab } from '../components/AdminSettingsTab';
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
  Search,
  Ban,
  Plus,
  Trash2,
  Copy,
  Layers,
  Sparkles,
  ListCheck,
  ListX,
  ClipboardCheck,
  History,
  X,
  Power,
  Send,
  CheckCircle2,
  Check,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Lock,
  Menu,
  ArrowRight,
  BarChart3,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

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
    addSingleAccount,
    addBulkAccounts,
    deleteAccount,
    clearUsedAccounts,
    clearAllStock,
    resetAllUsedToAvailable,
  } = useGmailStock(true);

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
  >('stats');

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
  const [confirmPayModalWith, setConfirmPayModalWith] = useState<Withdrawal | null>(null);
  const [expandedUserStorId, setExpandedUserStorId] = useState<string | null>(null);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userSortMode, setUserSortMode] = useState<'all' | 'highest_balance' | 'has_balance'>('all');
  const [userRiwayatModalTab, setUserRiwayatModalTab] = useState<'storan' | 'penarikan' | 'generated'>('storan');

  const [savingSettings, setSavingSettings] = useState(false);

  const [stockFilter, setStockFilter] = useState<'All' | 'available' | 'used'>('All');
  const [stockSearch, setStockSearch] = useState('');
  const [showAddSingleModal, setShowAddSingleModal] = useState(false);
  const [showAddBulkModal, setShowAddBulkModal] = useState(false);
  const [newStockEmail, setNewStockEmail] = useState('');
  const [newStockPass, setNewStockPass] = useState('');
  const [bulkInputText, setBulkInputText] = useState('');
  const [stockActionLoading, setStockActionLoading] = useState(false);
  const [showConfirmClearUsed, setShowConfirmClearUsed] = useState(false);
  const [showConfirmClearAll, setShowConfirmClearAll] = useState(false);
  const [stockDailyLimit, setStockDailyLimit] = useState<number>(settings.dailyGenerateLimit || 10);
  const [savingDailyLimit, setSavingDailyLimit] = useState<boolean>(false);

  useEffect(() => {
    if (settings.dailyGenerateLimit) {
      setStockDailyLimit(settings.dailyGenerateLimit);
    }
  }, [settings.dailyGenerateLimit]);

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
        snap.forEach((d) => uList.push(d.data() as UserProfile));
        setUsersList(uList);
      },
      (err) => {
        console.warn('Admin users snapshot listener notice:', err);
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
        console.warn('Admin submissions snapshot listener notice:', err);
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
        console.warn('Admin withdrawals snapshot listener notice:', err);
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
        console.warn('Admin referrals snapshot listener notice:', err);
      }
    );

    const unsubSync = subscribeDataChange(() => {});

    return () => {
      unsubUsers();
      unsubSubs();
      unsubWiths();
      unsubRefs();
      unsubSync();
    };
  }, [isAdmin]);

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
    if (sub.status === 'Diterima' || sub.status === 'Ditolak') {
      showToast('info', 'Sudah Diproses', 'Akun ini sudah memiliki riwayat.');
      return;
    }
    setProcessingSubId(sub.id);
    try {
      const subRef = doc(db, 'submissions', sub.id);
      const userRef = doc(db, 'users', sub.userId);
      const reward = sub.rewardAmount || settings.pricePerSubmission || 3000;

      await runTransaction(db, async (transaction) => {
        const subDoc = await transaction.get(subRef);
        if (!subDoc.exists()) throw new Error('Submission tidak ditemukan.');
        if (subDoc.data().status === 'Diterima' || subDoc.data().status === 'Ditolak') return;

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
    if (sub.status === 'Diterima' || sub.status === 'Ditolak') return;
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
    if (rejectModalSub.status === 'Diterima' || rejectModalSub.status === 'Ditolak') {
      setRejectModalSub(null);
      return;
    }
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

  const getUserStorSummary = (userId: string) => {
    const userSubs = submissionsList.filter((s) => s && s.userId === userId);
    const diterima = userSubs.filter((s) => s.status === 'Diterima').length;
    const pending = userSubs.filter((s) => s.status === 'Pending' || s.status === 'Cek Admin').length;
    const ditolak = userSubs.filter((s) => s.status === 'Ditolak').length;
    const total = userSubs.length;
    const recent = [...userSubs]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    return { total, diterima, pending, ditolak, recent, userSubs };
  };

  const handleMarkWithdrawalPaid = async (withItem: Withdrawal) => {
    if (withItem.status !== 'Pending') {
      showToast('info', 'Sudah Diproses', 'Penarikan ini sudah selesai/ditolak.');
      setConfirmPayModalWith(null);
      return;
    }
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
      setConfirmPayModalWith(null);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingWithId(null);
    }
  };

  const handleConfirmRejectWithdrawal = async () => {
    if (!rejectModalWith || !withRejectionReason.trim()) return;
    if (rejectModalWith.status !== 'Pending') {
      setRejectModalWith(null);
      return;
    }
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

  const handleSaveSettings = async (newSettings: Partial<typeof settings>) => {
    setSavingSettings(true);
    try {
      await updateSettings(newSettings);
      showToast('success', 'Pengaturan Disimpan', 'Konfigurasi sistem berhasil disimpan.');
    } catch (err: unknown) {
      showToast('error', 'Gagal Menyimpan', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateDailyLimit = async () => {
    const limit = Math.max(1, Number(stockDailyLimit) || 10);
    setSavingDailyLimit(true);
    try {
      await updateSettings({ dailyGenerateLimit: limit });
      showToast('success', 'Batas Diperbarui', `Batas maksimal generate per user diubah menjadi ${limit} akun/hari.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingDailyLimit(false);
    }
  };

  const handleResetUsedStock = async () => {
    setStockActionLoading(true);
    try {
      const count = await resetAllUsedToAvailable();
      showToast('success', 'Stok Direset', `${count} akun terpakai berhasil dikembalikan ke status Tersedia.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal Reset', err instanceof Error ? err.message : String(err));
    } finally {
      setStockActionLoading(false);
    }
  };

  const handleClearUsedStock = async () => {
    setStockActionLoading(true);
    try {
      await clearUsedAccounts();
      showToast('success', 'Akun Terpakai Dihapus', 'Semua akun terpakai telah dihapus.');
      setShowConfirmClearUsed(false);
    } catch (err: unknown) {
      showToast('error', 'Gagal Hapus', err instanceof Error ? err.message : String(err));
    } finally {
      setStockActionLoading(false);
    }
  };

  const handleClearAllStock = async () => {
    setStockActionLoading(true);
    try {
      await clearAllStock();
      showToast('success', 'Semua Stok Dihapus', 'Seluruh akun dalam stok generator telah dihapus.');
      setShowConfirmClearAll(false);
    } catch (err: unknown) {
      showToast('error', 'Gagal Hapus', err instanceof Error ? err.message : String(err));
    } finally {
      setStockActionLoading(false);
    }
  };

  const handleAddSingleStock = async (e: FormEvent) => {
    e.preventDefault();
    let email = newStockEmail.trim().toLowerCase();
    if (!email) return;
    if (!email.includes('@')) {
      email = `${email}@gmail.com`;
    }
    try {
      await addSingleAccount(email, newStockPass.trim() || settings.password1Name || 'zero1122');
      showToast('success', 'Akun Ditambahkan', `Akun ${email} berhasil ditambahkan ke stok.`);
      setShowAddSingleModal(false);
      setNewStockEmail('');
      setNewStockPass('');
    } catch (err: unknown) {
      showToast('error', 'Gagal Tambah', err instanceof Error ? err.message : String(err));
    }
  };

  const handleAddBulkStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!bulkInputText.trim()) return;
    try {
      const count = await addBulkAccounts(bulkInputText, newStockPass.trim() || settings.password1Name || 'zero1122');
      showToast('success', 'Import Berhasil', `${count} akun Gmail valid berhasil dimasukkan ke stok.`);
      setShowAddBulkModal(false);
      setBulkInputText('');
    } catch (err: unknown) {
      showToast('error', 'Gagal Import', err instanceof Error ? err.message : String(err));
    }
  };

  const filteredSubs = submissionsList.filter((sub) => {
    if (!sub) return false;
    const matchesFilter = subFilter === 'All' || sub.status === subFilter;
    const q = (subSearch || '').toLowerCase();
    return (
      matchesFilter &&
      ((sub.id || '').toLowerCase().includes(q) ||
        (sub.userName || '').toLowerCase().includes(q) ||
        (sub.userEmail || '').toLowerCase().includes(q) ||
        (sub.dataContent || '').toLowerCase().includes(q))
    );
  });

  const filteredWiths = useMemo(() => {
    return withdrawalsList
      .filter((w) => {
        if (!w) return false;
        const matchesFilter = withFilter === 'All' || w.status === withFilter;
        const q = (withSearch || '').toLowerCase();
        return (
          matchesFilter &&
          (!q ||
            (w.id || '').toLowerCase().includes(q) ||
            (w.userName || '').toLowerCase().includes(q) ||
            (w.userEmail || '').toLowerCase().includes(q) ||
            (w.targetNumber || '').includes(withSearch) ||
            (w.recipientName || '').toLowerCase().includes(q))
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [withdrawalsList, withFilter, withSearch]);

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

  const filteredStock = useMemo(() => {
    return gmailStockList.filter((item) => {
      if (!item) return false;
      const isAvail = item.status !== 'used' && !item.claimedBy;
      const matchesFilter =
        stockFilter === 'All' ||
        (stockFilter === 'available' && isAvail) ||
        (stockFilter === 'used' && !isAvail);
      const q = (stockSearch || '').toLowerCase().trim();
      return (
        matchesFilter &&
        (!q ||
          (item.email || '').toLowerCase().includes(q) ||
          (item.claimedByName || '').toLowerCase().includes(q) ||
          (item.claimedByEmail || '').toLowerCase().includes(q) ||
          (item.password && item.password.toLowerCase().includes(q)))
      );
    });
  }, [gmailStockList, stockFilter, stockSearch]);

  const selectedUserSubs = useMemo(() => {
    if (!selectedUser) return [];
    return submissionsList.filter((s) => s && s.userId === selectedUser.uid);
  }, [selectedUser, submissionsList]);

  const selectedUserWiths = useMemo(() => {
    if (!selectedUser) return [];
    return withdrawalsList.filter((w) => w && w.userId === selectedUser.uid);
  }, [selectedUser, withdrawalsList]);

  const selectedUserGenerated = useMemo(() => {
    if (!selectedUser) return [];
    const uid = selectedUser.uid;
    const fromStock = gmailStockList.filter((s) => s && s.claimedBy === uid);
    const stockEmails = new Set(fromStock.map((s) => s.email.toLowerCase()));
    const fromProfile: typeof fromStock = [];
    if (Array.isArray(selectedUser.generatedEmails)) {
      selectedUser.generatedEmails.forEach((e) => {
        const clean = (e || '').trim().toLowerCase();
        if (clean && !stockEmails.has(clean)) {
          fromProfile.push({
            id: `profile_${clean}`,
            email: clean,
            password: settings.password1Name || 'zero1122',
            status: 'used',
            claimedBy: uid,
            claimedByName: selectedUser.displayName || 'Freelancer',
            addedAt: selectedUser.createdAt || new Date().toISOString(),
          });
          stockEmails.add(clean);
        }
      });
    }
    return [...fromStock, ...fromProfile];
  }, [selectedUser, gmailStockList, settings.password1Name]);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-3">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold border border-blue-200 mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Administrator Control Panel</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Admin Panel AZGmail
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
              Kelola storan per user, stok generator, verifikasi bulk, dan pengaturan operasional
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulkCheckModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Cek Bulk</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBulkConfirmModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ListCheck className="w-4 h-4" />
            <span>Terima Bulk</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBulkRejectModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <ListX className="w-4 h-4" />
            <span>Tolak Bulk</span>
          </button>
        </div>
      </div>

        {/* SAKLAR OPERASIONAL */}
        <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-800">Saklar Operasional Layanan (Tutup / Buka)</div>
              <p className="text-[11px] text-slate-500">Perubahan status langsung aktif realtime di tampilan pengguna: Hijau = Buka, Abu-abu = Tutup</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* SAKLAR SEMUA STOR */}
            <button
              type="button"
              onClick={() => updateSettings({ storanOpen: !settings.storanOpen })}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition border cursor-pointer active:scale-95 shadow-xs ${
                settings.storanOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span className={`w-6 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${settings.storanOpen ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
              </span>
              <Power className="w-3.5 h-3.5" />
              <span>Semua STOR: {settings.storanOpen ? 'BUKA' : 'TUTUP'}</span>
            </button>

            {/* SAKLAR SEMUA WD */}
            <button
              type="button"
              onClick={() => updateSettings({ withdrawalOpen: settings.withdrawalOpen === false })}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition border cursor-pointer active:scale-95 shadow-xs ${
                settings.withdrawalOpen !== false
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span className={`w-6 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${settings.withdrawalOpen !== false ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
              </span>
              <Wallet className="w-3.5 h-3.5" />
              <span>Semua WD: {settings.withdrawalOpen !== false ? 'BUKA' : 'TUTUP'}</span>
            </button>

            {/* SAKLAR WD DANA */}
            <button
              type="button"
              onClick={() => updateSettings({ withdrawalDanaOpen: settings.withdrawalDanaOpen === false })}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition border cursor-pointer active:scale-95 shadow-xs ${
                settings.withdrawalDanaOpen !== false
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span className={`w-6 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${settings.withdrawalDanaOpen !== false ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
              </span>
              <Wallet className="w-3.5 h-3.5" />
              <span>WD DANA: {settings.withdrawalDanaOpen !== false ? 'BUKA' : 'TUTUP'}</span>
            </button>

            {/* SAKLAR WD GOPAY */}
            <button
              type="button"
              onClick={() => updateSettings({ withdrawalGopayOpen: settings.withdrawalGopayOpen === false })}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition border cursor-pointer active:scale-95 shadow-xs ${
                settings.withdrawalGopayOpen !== false
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span className={`w-6 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${settings.withdrawalGopayOpen !== false ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
              </span>
              <Wallet className="w-3.5 h-3.5" />
              <span>WD GoPay: {settings.withdrawalGopayOpen !== false ? 'BUKA' : 'TUTUP'}</span>
            </button>

            {/* SAKLAR GENERATOR */}
            <button
              type="button"
              onClick={() => updateSettings({ generatorOpen: settings.generatorOpen === false })}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition border cursor-pointer active:scale-95 shadow-xs ${
                settings.generatorOpen !== false
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span className={`w-6 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${settings.generatorOpen !== false ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
              </span>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generator: {settings.generatorOpen !== false ? 'BUKA' : 'TUTUP'}</span>
            </button>

            {/* SAKLAR PW 1 */}
            <button
              type="button"
              onClick={() => {
                const nextVal = settings.passwordZero1122Open === false;
                if (!nextVal && settings.passwordPrabujayaOpen === false) {
                  showToast('warning', 'Peringatan', 'Minimal salah satu password harus tetap dibuka!');
                  return;
                }
                updateSettings({ passwordZero1122Open: nextVal });
                showToast(nextVal ? 'success' : 'info', 'Status Password', `PW ${settings.password1Name || 'zero1122'}: ${nextVal ? 'DIBUKA' : 'DITUTUP'}`);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition border cursor-pointer active:scale-95 shadow-xs ${
                settings.passwordZero1122Open !== false
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span className={`w-6 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${settings.passwordZero1122Open !== false ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
              </span>
              <Lock className="w-3.5 h-3.5" />
              <span>PW {settings.password1Name || 'zero1122'}: {settings.passwordZero1122Open !== false ? 'BUKA' : 'TUTUP'}</span>
            </button>

            {/* SAKLAR PW 2 */}
            <button
              type="button"
              onClick={() => {
                const nextVal = settings.passwordPrabujayaOpen === false;
                if (!nextVal && settings.passwordZero1122Open === false) {
                  showToast('warning', 'Peringatan', 'Minimal salah satu password harus tetap dibuka!');
                  return;
                }
                updateSettings({ passwordPrabujayaOpen: nextVal });
                showToast(nextVal ? 'success' : 'info', 'Status Password', `PW ${settings.password2Name || 'prabujaya'}: ${nextVal ? 'DIBUKA' : 'DITUTUP'}`);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition border cursor-pointer active:scale-95 shadow-xs ${
                settings.passwordPrabujayaOpen !== false
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-500 hover:bg-slate-600 text-white border-slate-500 shadow-2xs'
              }`}
            >
              <span className={`w-6 h-3.5 rounded-full p-0.5 flex items-center transition-colors ${settings.passwordPrabujayaOpen !== false ? 'bg-emerald-800 justify-end' : 'bg-slate-700 justify-start'}`}>
                <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs" />
              </span>
              <Lock className="w-3.5 h-3.5" />
              <span>PW {settings.password2Name || 'prabujaya'}: {settings.passwordPrabujayaOpen !== false ? 'BUKA' : 'TUTUP'}</span>
            </button>
          </div>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-1 p-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          {[
            { id: 'stats', label: 'Statistik & Ringkasan', icon: TrendingUp },
            { id: 'all_stor', label: `All STOR (${submissionsList.length})`, icon: Layers },
            {
              id: 'yesterday_pending',
              label: `Pendingan Kemarin (${submissionsList.filter((s) => (s.status === 'Pending' || s.status === 'Cek Admin') && isEarlierThanTodayWIB(s.createdAt)).length})`,
              icon: History,
            },
            {
              id: 'all_cek_admin',
              label: `All Cek Admin (${submissionsList.filter((s) => s.status === 'Cek Admin').length})`,
              icon: ClipboardCheck,
            },
            { id: 'submissions', label: `Antrean Pending (${submissionsList.filter((s) => s.status === 'Pending').length})`, icon: UploadCloud },
            { id: 'withdrawals', label: `Penarikan (${withdrawalsList.filter((w) => w.status === 'Pending').length})`, icon: Wallet },
            { id: 'users', label: `Kelola User (${usersList.length})`, icon: Users },
            { id: 'stock', label: `All Stok Generator (${availableStock.length} Ready)`, icon: Sparkles },
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
            defaultPassword={settings.password1Name || 'zero1122'}
            password1Name={settings.password1Name || 'zero1122'}
            password2Name={settings.password2Name || 'prabujaya'}
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
            defaultPassword={settings.password1Name || 'zero1122'}
            password1Name={settings.password1Name || 'zero1122'}
            password2Name={settings.password2Name || 'prabujaya'}
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
            defaultPassword={settings.password1Name || 'zero1122'}
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

        {activeTab === 'stock' && (
          <div className="space-y-5">
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 rounded-3xl p-5 sm:p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                      All Stok Generator Akun Gmail
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 border border-white/30">
                      {gmailStockList.length} Total Akun
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-blue-100 mt-0.5">
                    Kelola stok nama Gmail yang disediakan untuk freelancer di fitur Generator
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(true)}
                  className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah 1 Akun</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBulkModal(true)}
                  className="px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Import Massal</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClearUsed(true)}
                  disabled={stockActionLoading || usedStock.length === 0}
                  className="px-3 py-2 rounded-xl bg-amber-500/25 hover:bg-amber-500/40 text-amber-100 border border-amber-300/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4 text-amber-200" />
                  <span>Hapus Terpakai ({usedStock.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClearAll(true)}
                  disabled={stockActionLoading || gmailStockList.length === 0}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs disabled:opacity-40"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus All ({gmailStockList.length})</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Stok di Database</span>
                <div className="text-2xl font-black text-slate-900 mt-1">{gmailStockList.length} Akun</div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Stok Tersedia (Ready)</span>
                <div className="text-2xl font-black text-emerald-700 mt-1">{availableStock.length} Akun</div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-2xs">
                <span className="text-[10px] font-bold uppercase text-amber-800 block">Stok Terpakai / Diklaim</span>
                <div className="text-2xl font-black text-amber-700 mt-1">{usedStock.length} Akun</div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase text-slate-600 block">Tindakan Pemeliharaan</span>
                <button
                  type="button"
                  onClick={handleResetUsedStock}
                  disabled={stockActionLoading || usedStock.length === 0}
                  className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition disabled:opacity-40 cursor-pointer mt-1"
                >
                  Reset Menjadi Tersedia
                </button>
              </div>
            </div>

            {/* PENGATURAN BATAS GENERATE USER / HARI */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-50 via-indigo-50/50 to-blue-50 border border-purple-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-600/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-black text-slate-900">
                      Batas Max Generate Akun Freelancer / Hari
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                      Saat ini: {settings.dailyGenerateLimit || 10} akun/hari
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    User hanya bisa generate akun dari stok admin hingga batas ini per hari. Perubahan langsung aktif realtime untuk semua user.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-xl border border-purple-200 shadow-2xs">
                  <span className="text-xs font-bold text-slate-500">Max:</span>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={stockDailyLimit}
                    onChange={(e) => setStockDailyLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 font-mono font-black text-sm text-purple-700 outline-none text-center"
                  />
                  <span className="text-xs font-bold text-slate-500">akun/hari</span>
                </div>
                <button
                  type="button"
                  onClick={handleUpdateDailyLimit}
                  disabled={savingDailyLimit}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition shadow-sm shadow-purple-600/25 flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {savingDailyLimit ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Simpan Batas</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Cari email Gmail..."
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {filteredStock.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                  <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
                  <p className="font-bold text-slate-700">Tidak ada stok akun yang cocok</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase">
                      <tr>
                        <th className="py-3 px-4 w-12 text-center">#</th>
                        <th className="py-3 px-4">Alamat Gmail</th>
                        <th className="py-3 px-4">Password</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Diklaim Oleh</th>
                        <th className="py-3 px-4">Waktu</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredStock.slice(0, 100).map((item, idx) => {
                        const isAvail = item.status === 'available';
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4 text-center text-slate-400 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-slate-900 select-all">
                                {item.email}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {item.password || settings.password1Name || 'zero1122'}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  isAvail
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-300'
                                }`}
                              >
                                {isAvail ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Tersedia</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Terpakai</span>
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {item.claimedByName || item.claimedBy || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {item.claimedAt
                                ? formatIndonesianDateTime(item.claimedAt)
                                : item.addedAt
                                ? formatIndonesianDateTime(item.addedAt)
                                : '-'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(`${item.email}|${item.password || settings.password1Name || 'zero1122'}`);
                                    showToast('info', 'Disalin', item.email);
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                  title="Salin Email|PW"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteAccount(item.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                  title="Hapus Akun Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STATS TAB (TAMPILAN AWAL UTAMA) */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* HERO STATS BANNER */}
            <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 rounded-3xl p-5 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner shrink-0">
                  <BarChart3 className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 text-white border border-white/20">
                      Tampilan Awal Eksekutif
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                      Realtime Live
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Statistik &amp; Pusat Kendali AZGmail
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-xl">
                    Ringkasan performa real-time, antrean verifikasi, pencairan saldo, dan akses instan ke semua modul admin.
                  </p>
                </div>
              </div>
            </div>

            {/* 4 KPI METRICS UTAMA */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500">Total Pengguna</span>
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">{usersList.length}</div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Aktif: {usersList.filter((u) => u.status !== 'suspended').length} user</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('users')}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Kelola &rarr;
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500">Total Saldo Pengguna</span>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-700 mt-1 truncate">
                    {formatRupiah(usersList.reduce((acc, u) => acc + (u.balance || 0), 0))}
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Antrean WD: {withdrawalsList.filter((w) => w.status === 'Pending').length}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('withdrawals')}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Cairkan &rarr;
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500">Total STOR Diterima</span>
                  <div className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
                    {submissionsList.filter((s) => s.status === 'Diterima').length}
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Nilai: {formatRupiah(submissionsList.filter((s) => s.status === 'Diterima').length * (settings.pricePerSubmission || 3000))}</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all_stor')}
                    className="text-blue-600 font-bold hover:underline"
                  >
                    Lihat STOR &rarr;
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-500">Total Dana Dicairkan</span>
                  <div className="text-2xl sm:text-3xl font-black text-sky-700 mt-1 truncate">
                    {formatRupiah(
                      withdrawalsList
                        .filter((w) => w.status === 'Selesai')
                        .reduce((acc, w) => acc + (w.amount || 0), 0)
                    )}
                  </div>
                </div>
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>{withdrawalsList.filter((w) => w.status === 'Selesai').length} pencairan</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('withdrawals')}
                    className="text-sky-700 font-bold hover:underline"
                  >
                    Riwayat WD &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* ANTREAN TINDAKAN MENDESAK */}
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    Antrean Tindakan &amp; Verifikasi Cepat
                  </h3>
                  <p className="text-xs text-slate-500">
                    Akun dan penarikan yang membutuhkan persetujuan atau pemeriksaan admin
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  {submissionsList.filter((s) => s.status === 'Pending' || s.status === 'Cek Admin').length +
                    withdrawalsList.filter((w) => w.status === 'Pending').length} tugas
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* KARTU PENDING */}
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/80 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-900">Antrean Pending</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    </div>
                    <div className="text-2xl font-black text-amber-950 mt-1">
                      {submissionsList.filter((s) => s.status === 'Pending').length}
                    </div>
                    <p className="text-[11px] text-amber-800 mt-0.5">Akun storan baru menunggu dicek</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('submissions')}
                    className="w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Periksa Antrean</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* KARTU PENDINGAN KEMARIN */}
                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-rose-900">Pendingan Kemarin</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    </div>
                    <div className="text-2xl font-black text-rose-950 mt-1">
                      {submissionsList.filter((s) => (s.status === 'Pending' || s.status === 'Cek Admin') && isEarlierThanTodayWIB(s.createdAt)).length}
                    </div>
                    <p className="text-[11px] text-rose-800 mt-0.5">Storan tertunda dari hari sebelumnya</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('yesterday_pending')}
                    className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Selesaikan Kemarin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* KARTU CEK ADMIN */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-900">All Cek Admin</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    </div>
                    <div className="text-2xl font-black text-blue-950 mt-1">
                      {submissionsList.filter((s) => s.status === 'Cek Admin').length}
                    </div>
                    <p className="text-[11px] text-blue-800 mt-0.5">Akun dalam proses audit mendalam</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('all_cek_admin')}
                    className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Buka Cek Admin</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* KARTU PENARIKAN PENDING */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-900">Penarikan (WD) Pending</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <div className="text-2xl font-black text-emerald-950 mt-1">
                      {withdrawalsList.filter((w) => w.status === 'Pending').length}
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      Total: {formatRupiah(withdrawalsList.filter((w) => w.status === 'Pending').reduce((acc, w) => acc + (w.amount || 0), 0))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('withdrawals')}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Proses Transfer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SUBMISSIONS TAB: Antrean Pending */}
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
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {filteredSubs.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200/80">
                  Tidak ada data storan dalam filter ini.
                </div>
              ) : (
                filteredSubs.map((sub) => {
                  const isFinished = sub.status === 'Diterima' || sub.status === 'Ditolak';
                  return (
                    <div key={sub.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                      <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-100">
                        <span className="font-bold text-slate-900">{sub.userName || sub.userEmail}</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="font-mono text-xs text-slate-800 font-bold break-all">
                            {sub.dataContent}
                          </span>
                          {sub.passwordUsed && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-mono font-bold block w-fit">
                              PW: {sub.passwordUsed}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-black text-blue-700 shrink-0">
                          {formatRupiah(sub.rewardAmount || 3000)}
                        </span>
                      </div>
                      {isFinished ? (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                            Riwayat Selesai ({sub.status})
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                          {sub.status === 'Pending' && (
                            <button
                              type="button"
                              onClick={() => handleCheckSubmission(sub)}
                              disabled={processingSubId === sub.id}
                              className="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold border border-blue-200 cursor-pointer"
                            >
                              Cek
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setRejectModalSub(sub);
                              setRejectionReason(PRESET_REASONS[0]);
                            }}
                            disabled={processingSubId === sub.id}
                            className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer"
                          >
                            Tolak
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAcceptSubmission(sub)}
                            disabled={processingSubId === sub.id}
                            className="px-4 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                          >
                            Terima
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* WITHDRAWALS TAB */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {[
                    { id: 'Pending', label: 'Pending', count: withdrawalsList.filter((w) => w.status === 'Pending').length },
                    { id: 'Selesai', label: 'Selesai', count: withdrawalsList.filter((w) => w.status === 'Selesai').length },
                    { id: 'Ditolak', label: 'Ditolak', count: withdrawalsList.filter((w) => w.status === 'Ditolak').length },
                    { id: 'All', label: 'Semua', count: withdrawalsList.length },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setWithFilter(f.id as typeof withFilter)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                        withFilter === f.id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-slate-200 text-slate-700">
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari user, no. e-wallet..."
                    value={withSearch}
                    onChange={(e) => setWithSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                  />
                </div>
              </div>
            </div>

            {filteredWiths.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 text-xs space-y-2 border border-slate-200/80">
                <Wallet className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700">Tidak ada data penarikan yang cocok</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredWiths.map((w) => {
                  const storSummary = getUserStorSummary(w.userId);
                  const isExpanded = expandedUserStorId === w.id;
                  const isWithFinished = w.status === 'Selesai' || w.status === 'Ditolak';

                  return (
                    <div
                      key={w.id}
                      className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs space-y-3.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#1e40af] via-blue-600 to-[#38bdf8] text-white flex items-center justify-center font-black text-sm shadow-xs shrink-0">
                            {w.userName ? w.userName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900 truncate">
                                {w.userName || 'Freelancer'}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                  w.status === 'Pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : w.status === 'Selesai'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {w.status}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 font-mono block truncate">
                              {w.userEmail}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center text-xs">
                          <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 flex items-center gap-1.5 font-medium shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-800 font-mono">
                              {formatIndonesianDateTime(w.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Nominal Penarikan
                          </span>
                          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                            {formatRupiah(w.amount)}
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tujuan {w.method}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-mono text-sm sm:text-base font-bold text-blue-900 select-all tracking-wider">
                              {w.targetNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(w.targetNumber);
                                showToast('info', 'Tersalin', `Nomor ${w.targetNumber} berhasil disalin.`);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 cursor-pointer"
                              title="Salin Nomor"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="text-xs font-bold text-slate-700 block mt-0.5">
                            a.n. {w.recipientName}
                          </span>
                        </div>
                      </div>

                      {/* RIWAYAT STOR USER */}
                      <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                              <Send className="w-3.5 h-3.5 text-blue-600" />
                              <span>Riwayat STOR User:</span>
                            </span>
                            <span className="px-2 py-0.2 rounded-full font-bold text-[10px] bg-white border border-slate-200 text-slate-800 shadow-2xs">
                              Total: <strong>{storSummary.total}</strong> Akun
                            </span>
                            <span className="px-2 py-0.2 rounded-full font-bold text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-800">
                              {storSummary.diterima} Diterima
                            </span>
                          </div>
                          {storSummary.recent.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setExpandedUserStorId(isExpanded ? null : w.id)}
                              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer self-start sm:self-center"
                            >
                              <span>{isExpanded ? 'Tutup Daftar' : `Lihat ${storSummary.recent.length} STOR Terakhir`}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          )}
                        </div>

                        {isExpanded && storSummary.recent.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                            {storSummary.recent.map((s) => (
                              <div
                                key={s.id}
                                className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2 text-[11px]"
                              >
                                <span className="font-mono font-bold text-slate-800 truncate">
                                  {s.dataContent.split('|')[0]}
                                </span>
                                <span
                                  className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${
                                    s.status === 'Diterima'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : s.status === 'Ditolak'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {s.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="text-[11px] text-slate-500">
                          {w.status === 'Selesai' && (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Riwayat: Sudah Ditransfer ({w.completedAt ? formatIndonesianDateTime(w.completedAt) : 'Selesai'})</span>
                            </span>
                          )}
                          {w.status === 'Ditolak' && (
                            <span className="text-rose-700 font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Riwayat: Ditolak {w.rejectionReason ? `(${w.rejectionReason})` : ''}</span>
                            </span>
                          )}
                        </div>

                        {isWithFinished ? (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                            Riwayat Penarikan Selesai (Terkunci)
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => {
                                setRejectModalWith(w);
                                setWithRejectionReason('Nomor e-wallet tidak valid');
                              }}
                              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition cursor-pointer"
                            >
                              Tolak
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmPayModalWith(w)}
                              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Konfirmasi &amp; Selesaikan</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    userSortMode === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Semua ({usersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setUserSortMode('highest_balance')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                    userSortMode === 'highest_balance' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-900'
                  }`}
                >
                  Saldo Terbanyak
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => {
                const userSubs = submissionsList.filter((s) => s && s.userId === u.uid);
                const userWiths = withdrawalsList.filter((w) => w && w.userId === u.uid);
                const userDiterima = userSubs.filter((s) => s.status === 'Diterima').length;
                const userCek = userSubs.filter((s) => s.status === 'Cek Admin').length;
                const userPending = userSubs.filter((s) => s.status === 'Pending').length;
                const userDitolak = userSubs.filter((s) => s.status === 'Ditolak').length;

                return (
                  <div
                    key={u.uid}
                    className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3.5 hover:shadow-md transition"
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

                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-bold">
                          <span className="text-slate-700 flex items-center gap-1">
                            <History className="w-3.5 h-3.5 text-blue-600" />
                            <span>Riwayat: {userSubs.length} Akun Disetor</span>
                          </span>
                          <span className="text-slate-400 font-normal">
                            {userWiths.length}x Tarik Saldo
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-bold">
                          <span className="py-1 px-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60" title="Diterima">
                            {userDiterima}
                          </span>
                          <span className="py-1 px-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200/60" title="Cek Status">
                            {userCek}
                          </span>
                          <span className="py-1 px-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/60" title="Pending">
                            {userPending}
                          </span>
                          <span className="py-1 px-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200/60" title="Ditolak">
                            {userDitolak}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUser(u);
                          setUserRiwayatModalTab('storan');
                        }}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Riwayat User</span>
                      </button>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenBalanceModal(u, 'add')}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                        >
                          Ubah Saldo
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleSuspendUser(u)}
                          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                            u.status === 'active'
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Aktifkan'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SETTINGS TAB -> DEDICATED ADMIN SETTINGS TAB */}
        {activeTab === 'settings' && (
          <AdminSettingsTab
            settings={settings}
            onSaveSettings={handleSaveSettings}
            savingSettings={savingSettings}
          />
        )}

        {/* MODAL USER DETAIL */}
        <AnimatePresence>
          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col"
              >
                <div className="bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] p-5 text-white flex items-center justify-between shrink-0 shadow-md">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-white border border-white/30 shrink-0">
                      {selectedUser.displayName ? selectedUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-white truncate">
                        {selectedUser.displayName || 'Tanpa Nama'}
                      </h3>
                      <p className="text-xs text-blue-100 truncate">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                        Saldo Aktif
                      </span>
                      <div className="text-base sm:text-lg font-black text-blue-700 mt-0.5">
                        {formatRupiah(selectedUser.balance || 0)}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                      <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                        Total Penghasilan
                      </span>
                      <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
                        {formatRupiah(selectedUser.totalEarned || 0)}
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Total Disetor
                      </span>
                      <div className="text-base sm:text-lg font-black text-slate-800 mt-0.5">
                        {selectedUserSubs.length} Akun
                      </div>
                    </div>
                    <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200">
                      <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                        Total Penarikan
                      </span>
                      <div className="text-base sm:text-lg font-black text-purple-700 mt-0.5">
                        {selectedUserWiths.length}x
                      </div>
                    </div>
                  </div>

                  <div className="flex border-b border-slate-200 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setUserRiwayatModalTab('storan')}
                      className={`pb-2.5 px-3 text-xs font-black transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                        userRiwayatModalTab === 'storan'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Riwayat Storan ({selectedUserSubs.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserRiwayatModalTab('penarikan')}
                      className={`pb-2.5 px-3 text-xs font-black transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                        userRiwayatModalTab === 'penarikan'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Wallet className="w-3.5 h-3.5" />
                      <span>Riwayat Penarikan ({selectedUserWiths.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setUserRiwayatModalTab('generated')}
                      className={`pb-2.5 px-3 text-xs font-black transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                        userRiwayatModalTab === 'generated'
                          ? 'border-blue-600 text-blue-600'
                          : 'border-transparent text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Akun Generated ({selectedUserGenerated.length})</span>
                    </button>
                  </div>

                  {userRiwayatModalTab === 'storan' && (
                    <div className="space-y-3">
                      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                        {selectedUserSubs.map((sub) => {
                          const parts = sub.dataContent.split('|');
                          const email = parts[0]?.trim() || '';
                          const pw = sub.passwordUsed || parts[1]?.trim() || settings.password1Name || 'zero1122';
                          return (
                            <div
                              key={sub.id}
                              className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-slate-900">{email}</span>
                                  <span className="px-2 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-mono font-bold">
                                    PW: {pw}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-400">
                                  {formatIndonesianDateTime(sub.createdAt)}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
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
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {userRiwayatModalTab === 'penarikan' && (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {selectedUserWiths.map((w) => (
                        <div
                          key={w.id}
                          className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-slate-900">{formatRupiah(w.amount)}</span>
                              <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                                {w.method}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {w.targetNumber} ({w.recipientName})
                            </span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              w.status === 'Selesai'
                                ? 'bg-emerald-100 text-emerald-800'
                                : w.status === 'Ditolak'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {w.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {userRiwayatModalTab === 'generated' && (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {selectedUserGenerated.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="font-mono text-xs font-bold text-slate-900">{item.email}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-mono font-bold">
                            PW: {item.password || settings.password1Name || 'zero1122'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenBalanceModal(selectedUser, 'add')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                  >
                    Ubah Saldo
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUser(null)}
                    className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200"
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
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleSaveUserBalance} className="space-y-3.5">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setBalanceMode('add')}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                        balanceMode === 'add' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
                      }`}
                    >
                      + Tambah Saldo
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceMode('set')}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border ${
                        balanceMode === 'set' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
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
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setBalanceModalUser(null)}
                      className="flex-1 py-2 rounded-xl border text-xs font-bold text-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={savingBalance}
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4"
              >
                <h3 className="text-base font-black">Tolak Akun Gmail</h3>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Alasan penolakan..."
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
                <h3 className="text-base font-black">Tolak Penarikan Saldo</h3>
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
                    Tolak &amp; Refund
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL KONFIRMASI PEMBAYARAN PENARIKAN */}
        <AnimatePresence>
          {confirmPayModalWith && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 space-y-4"
              >
                <h3 className="text-base font-black text-slate-900">Konfirmasi Transfer Penarikan</h3>
                <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
                  <div className="text-lg font-black text-blue-700">{formatRupiah(confirmPayModalWith.amount)}</div>
                  <div className="font-mono">{confirmPayModalWith.method}: {confirmPayModalWith.targetNumber}</div>
                  <div className="font-bold">a.n. {confirmPayModalWith.recipientName}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmPayModalWith(null)}
                    className="flex-1 py-2 rounded-xl border text-xs font-bold text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkWithdrawalPaid(confirmPayModalWith)}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                  >
                    Tandai Selesai
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL TAMBAH 1 AKUN STOK */}
        <AnimatePresence>
          {showAddSingleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Plus className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Tambah 1 Akun Stok</h3>
                      <p className="text-xs text-slate-500">Cukup ketik nama Gmail saja</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddSingleModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddSingleStock} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Akun Gmail:
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="contoh: user.gaming99 atau user@gmail.com"
                      value={newStockEmail}
                      onChange={(e) => setNewStockEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Password:
                    </label>
                    <input
                      type="text"
                      required
                      value={newStockPass || settings.password1Name || 'zero1122'}
                      onChange={(e) => setNewStockPass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSingleModal(false)}
                      className="flex-1 py-2 rounded-xl border text-xs font-bold text-slate-700"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                    >
                      Tambah Akun
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL IMPORT MASSAL STOK GENERATOR */}
        <AnimatePresence>
          {showAddBulkModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-900">Import Massal Stok Generator</h3>
                      <p className="text-xs text-slate-500">Cukup masukkan nama akun Gmail (1 baris = 1 akun)</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddBulkModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddBulkStock} className="space-y-3.5">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                    <strong>Tips:</strong> Cukup ketik nama Gmail saja (misal: <code>budi.santoso12</code>). Sistem otomatis melengkapinya menjadi <code>budi.santoso12@gmail.com</code>.
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Daftar Nama Akun Gmail (1 baris 1 nama):
                    </label>
                    <textarea
                      rows={6}
                      required
                      value={bulkInputText}
                      onChange={(e) => setBulkInputText(e.target.value)}
                      placeholder={'user.gaming99\nagus.pratama01\ncontoh123@gmail.com'}
                      className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">
                      Password yang Disematkan:
                    </label>
                    <input
                      type="text"
                      required
                      value={newStockPass || settings.password1Name || 'zero1122'}
                      onChange={(e) => setNewStockPass(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddBulkModal(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/25"
                    >
                      Import ke Stok
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL KONFIRMASI HAPUS TERPAKAI */}
        <AnimatePresence>
          {showConfirmClearUsed && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-3"
              >
                <h3 className="text-sm font-black text-slate-900">Hapus Semua Akun Terpakai?</h3>
                <p className="text-xs text-slate-500">
                  Akan menghapus {usedStock.length} akun yang telah diklaim pengguna dari database.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmClearUsed(false)}
                    className="flex-1 py-2 rounded-xl border text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleClearUsedStock}
                    className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                  >
                    Hapus
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL KONFIRMASI HAPUS SEMUA STOK */}
        <AnimatePresence>
          {showConfirmClearAll && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-white rounded-2xl p-5 space-y-3"
              >
                <h3 className="text-sm font-black text-rose-700">Hapus Seluruh Stok Generator?</h3>
                <p className="text-xs text-slate-500">
                  Tindakan ini akan mengosongkan semua {gmailStockList.length} akun dalam stok database.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirmClearAll(false)}
                    className="flex-1 py-2 rounded-xl border text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllStock}
                    className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
                  >
                    Hapus Semua
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
