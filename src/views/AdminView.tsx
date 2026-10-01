import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah, formatIndonesianDateTime, formatRelativeTime, isEarlierThanTodayWIB } from '../lib/utils';
import { UserProfile, Submission, Withdrawal, NavigationTab } from '../types';
import { collection, onSnapshot, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useGmailStock } from '../hooks/useGmailStock';
import { processReferralOnSubmissionAccepted } from '../lib/referralHelper';
import { subscribeDataChange } from '../lib/syncHelper';
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
  Search,
  Check,
  Ban,
  Eye,
  RefreshCw,
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
  Gift,
  FileText,
  Send,
  Save,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Monitor,
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
    addSingleAccount,
    addBulkAccounts,
    deleteAccount,
    clearUsedAccounts,
    clearAllStock,
    replenishStock,
    resetAllUsedToAvailable,
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
  const [confirmPayModalWith, setConfirmPayModalWith] = useState<Withdrawal | null>(null);
  const [copiedWithNumber, setCopiedWithNumber] = useState(false);

  const [expandedUserStorId, setExpandedUserStorId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userSortMode, setUserSortMode] = useState<'all' | 'highest_balance' | 'has_balance'>('all');

  const [tempPrice, setTempPrice] = useState(settings.pricePerSubmission);
  const [tempMinWithdrawal, setTempMinWithdrawal] = useState(settings.minWithdrawal);
  const [tempSchedule, setTempSchedule] = useState(settings.storanSchedule);
  const [tempAnnouncement, setTempAnnouncement] = useState(settings.announcement);
  const [tempWhatsApp, setTempWhatsApp] = useState(settings.adminWhatsApp || '6285199219856');
  const [tempDailyGenerateLimit, setTempDailyGenerateLimit] = useState(settings.dailyGenerateLimit || 10);
  const [tempStoranClosedReason, setTempStoranClosedReason] = useState(settings.storanClosedReason || '');
  const [tempApkUrl, setTempApkUrl] = useState(settings.apkDownloadUrl || 'https://www.mediafire.com/file/35mid43yhsc7itc/Azgmail.apk/file');
  const [tempDanaOpen, setTempDanaOpen] = useState(settings.withdrawalDanaOpen !== false);
  const [tempGopayOpen, setTempGopayOpen] = useState(settings.withdrawalGopayOpen !== false);
  const [rulesList, setRulesList] = useState<string[]>(settings?.rules || []);
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

  const [balanceModalUser, setBalanceModalUser] = useState<UserProfile | null>(null);
  const [balanceMode, setBalanceMode] = useState<'add' | 'set'>('add');
  const [balanceAmountInput, setBalanceAmountInput] = useState<string>('');
  const [includeTotalEarned, setIncludeTotalEarned] = useState<boolean>(true);
  const [savingBalance, setSavingBalance] = useState<boolean>(false);

  const [isDesktopMode, setIsDesktopMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('admin_desktop_mode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleDesktopMode = () => {
    setIsDesktopMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin_desktop_mode', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!isAdmin) return;

    // Realtime listeners with includeMetadataChanges for instant arrival
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const uList: UserProfile[] = [];
        snap.forEach((d) => uList.push(d.data() as UserProfile));
        setUsersList(uList);
      },
      (err) => console.warn('Admin users listener warning:', err)
    );

    const unsubSubs = onSnapshot(
      collection(db, 'submissions'),
      { includeMetadataChanges: true },
      (snap) => {
        const sList: Submission[] = [];
        snap.forEach((d) => sList.push({ id: d.id, ...(d.data() as Omit<Submission, 'id'>) }));
        sList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSubmissionsList(sList);
      },
      (err) => console.warn('Admin submissions listener warning:', err)
    );

    const unsubWiths = onSnapshot(
      collection(db, 'withdrawals'),
      { includeMetadataChanges: true },
      (snap) => {
        const wList: Withdrawal[] = [];
        snap.forEach((d) => wList.push({ id: d.id, ...(d.data() as Omit<Withdrawal, 'id'>) }));
        wList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setWithdrawalsList(wList);
      },
      (err) => console.warn('Admin withdrawals listener warning:', err)
    );

    const unsubRefs = onSnapshot(
      collection(db, 'referrals'),
      (snap) => {
        const rList: { id: string; inviterUid: string; invitedUid: string; status: string }[] = [];
        snap.forEach((d) => rList.push({ id: d.id, ...(d.data() as any) }));
        setReferralsList(rList);
      },
      (err) => console.warn('Admin referrals listener warning:', err)
    );

    // Cross-tab sync listener
    const unsubSync = subscribeDataChange(() => {
      // Data updated in another tab/device, Firestore onSnapshot also handles this
    });

    return () => {
      unsubUsers();
      unsubSubs();
      unsubWiths();
      unsubRefs();
      unsubSync();
    };
  }, [isAdmin]);

  useEffect(() => {
    setTempPrice(settings.pricePerSubmission);
    setTempMinWithdrawal(settings.minWithdrawal);
    setTempSchedule(settings.storanSchedule);
    setTempAnnouncement(settings.announcement);
    setTempDailyGenerateLimit(settings.dailyGenerateLimit || 10);
    setTempWhatsApp(settings.adminWhatsApp || '6285199219856');
    setTempStoranClosedReason(settings.storanClosedReason || '');
    setTempApkUrl(settings.apkDownloadUrl || 'https://www.mediafire.com/file/35mid43yhsc7itc/Azgmail.apk/file');
    setTempDanaOpen(settings.withdrawalDanaOpen !== false);
    setTempGopayOpen(settings.withdrawalGopayOpen !== false);
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
    if (sub.status === 'Diterima' || sub.status === 'Ditolak') {
      showToast('info', 'Sudah Diproses', 'Akun ini sudah memiliki riwayat dan tidak dapat diubah lagi.');
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
        gmailDefaultPassword: 'sgsg1122',
        adminWhatsApp: tempWhatsApp.trim() || '6285199219856',
        dailyGenerateLimit: dailyLimitNum,
        storanClosedReason: tempStoranClosedReason.trim(),
        apkDownloadUrl: tempApkUrl.trim() || 'https://www.mediafire.com/file/35mid43yhsc7itc/Azgmail.apk/file',
        withdrawalDanaOpen: tempDanaOpen,
        withdrawalGopayOpen: tempGopayOpen,
      });
      showToast('success', 'Pengaturan Disimpan', 'Konfigurasi sistem berhasil disimpan.');
    } catch (err: unknown) {
      showToast('error', 'Gagal Menyimpan', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAutoReplenish = async (amount: number) => {
    setStockActionLoading(true);
    try {
      const added = await replenishStock(amount, 'sgsg1122');
      showToast('success', 'Stok Ditambahkan', `Berhasil menambahkan ${added} akun Gmail generator baru ke stok.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal Tambah Stok', err instanceof Error ? err.message : String(err));
    } finally {
      setStockActionLoading(false);
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
      showToast('success', 'Akun Terpakai Dihapus', 'Semua akun berstatus terpakai telah dihapus.');
      setShowConfirmClearUsed(false);
    } catch (err: unknown) {
      showToast('error', 'Gagal Hapus Akun Terpakai', err instanceof Error ? err.message : String(err));
    } finally {
      setStockActionLoading(false);
    }
  };

  const handleClearAllStock = async () => {
    setStockActionLoading(true);
    try {
      await clearAllStock();
      showToast('success', 'Semua Stok Dihapus', 'Seluruh akun dalam stok generator telah berhasil dihapus.');
      setShowConfirmClearAll(false);
    } catch (err: unknown) {
      showToast('error', 'Gagal Hapus Semua Stok', err instanceof Error ? err.message : String(err));
    } finally {
      setStockActionLoading(false);
    }
  };

  const handleAddSingleStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStockEmail.trim()) return;
    try {
      await addSingleAccount(newStockEmail.trim(), newStockPass.trim() || 'sgsg1122');
      showToast('success', 'Akun Ditambahkan', `Akun ${newStockEmail} berhasil ditambahkan ke stok.`);
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
      const count = await addBulkAccounts(bulkInputText, 'sgsg1122');
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
    const matchesSearch =
      (sub.id || '').toLowerCase().includes(q) ||
      (sub.userName || '').toLowerCase().includes(q) ||
      (sub.userEmail || '').toLowerCase().includes(q) ||
      (sub.dataContent || '').toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const filteredWiths = useMemo(() => {
    return withdrawalsList
      .filter((w) => {
        if (!w) return false;
        const matchesFilter = withFilter === 'All' || w.status === withFilter;
        const q = (withSearch || '').toLowerCase();
        const matchesSearch =
          !q ||
          (w.id || '').toLowerCase().includes(q) ||
          (w.userName || '').toLowerCase().includes(q) ||
          (w.userEmail || '').toLowerCase().includes(q) ||
          (w.targetNumber || '').includes(withSearch) ||
          (w.recipientName || '').toLowerCase().includes(q);
        return matchesFilter && matchesSearch;
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
      const matchesFilter =
        stockFilter === 'All' ||
        (stockFilter === 'available' && item.status === 'available') ||
        (stockFilter === 'used' && item.status === 'used');
      const q = (stockSearch || '').toLowerCase().trim();
      const matchesSearch =
        !q ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.claimedByName || '').toLowerCase().includes(q) ||
        (item.claimedByEmail || '').toLowerCase().includes(q) ||
        (item.password && item.password.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [gmailStockList, stockFilter, stockSearch]);

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

    const refSuccessful = userRefs.filter((r) => r.status === 'completed').length;
    const totalInvitedFriends = Math.max(userRefs.length, userRefsFromUsers.length);

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
      totalUndangan: totalInvitedFriends,
      undanganBerhasil: refSuccessful,
      menungguStor: Math.max(0, totalInvitedFriends - refSuccessful),
    };
  }, [selectedUser, submissionsList, withdrawalsList, referralsList, usersList]);

  return (
    <div className={isDesktopMode ? 'w-full overflow-x-auto pb-10' : ''}>
      <div className={`space-y-6 transition-all ${isDesktopMode ? 'min-w-[1140px] px-1' : ''}`}>
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
              Kelola verifikasi akun Gmail, All Stok Generator, konfirmasi terima bulk, tolak bulk, dan saldo
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleDesktopMode}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs border ${
                isDesktopMode
                  ? 'bg-slate-900 text-white border-slate-950 shadow-slate-900/30'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-2xs'
              }`}
              title={isDesktopMode ? 'Kembalikan ke Mode Ponsel (Mobile)' : 'Aktifkan Mode Desktop Keren'}
            >
              <Monitor className={`w-4 h-4 ${isDesktopMode ? 'text-emerald-400' : 'text-slate-500'}`} />
              <span>{isDesktopMode ? 'Mode Desktop (Aktif)' : 'Mode Desktop'}</span>
            </button>
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
                Perubahan status langsung aktif realtime di tampilan pengguna
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => updateSettings({ withdrawalDanaOpen: settings.withdrawalDanaOpen === false })}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
                settings.withdrawalDanaOpen !== false
                  ? 'bg-sky-50 text-sky-800 border-sky-300 hover:bg-sky-100'
                  : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>WD DANA: {settings.withdrawalDanaOpen !== false ? 'BUKA' : 'TUTUP'}</span>
            </button>
            <button
              type="button"
              onClick={() => updateSettings({ withdrawalGopayOpen: settings.withdrawalGopayOpen === false })}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
                settings.withdrawalGopayOpen !== false
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>WD GoPay: {settings.withdrawalGopayOpen !== false ? 'BUKA' : 'TUTUP'}</span>
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
              <span>Generator: {settings.generatorOpen !== false ? 'BUKA' : 'TUTUP'}</span>
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
              label: `Pendingan Kemarin (${submissionsList.filter((s) => (s.status === 'Pending' || s.status === 'Cek Admin') && isEarlierThanTodayWIB(s.createdAt)).length})`,
              icon: History,
            },
            {
              id: 'all_cek_admin',
              label: `All Cek Admin (${submissionsList.filter((s) => s.status === 'Cek Admin').length})`,
              icon: ClipboardCheck,
            },
            { id: 'stock', label: `All Stok Generator (${availableStock.length} Ready)`, icon: Sparkles },
            { id: 'stats', label: 'Statistik & Ringkasan', icon: TrendingUp },
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
            defaultPassword="sgsg1122"
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
            defaultPassword="sgsg1122"
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
            defaultPassword="sgsg1122"
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

        {/* ALL STOK GENERATOR TAB */}
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
                  onClick={() => handleAutoReplenish(50)}
                  disabled={stockActionLoading}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" />
                  <span>+50 Stok Otomatis</span>
                </button>
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
                  title="Hapus semua akun yang sudah terpakai"
                >
                  <Trash2 className="w-4 h-4 text-amber-200" />
                  <span>Hapus Terpakai ({usedStock.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmClearAll(true)}
                  disabled={stockActionLoading || gmailStockList.length === 0}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs disabled:opacity-40"
                  title="Hapus SEMUA akun generator di database"
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
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={handleResetUsedStock}
                    disabled={stockActionLoading || usedStock.length === 0}
                    className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition disabled:opacity-40 cursor-pointer"
                  >
                    Reset Menjadi Tersedia
                  </button>
                </div>
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
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
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
                        <th className="py-3 px-4">Waktu Klaim / Tambah</th>
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
                              {item.password || 'sgsg1122'}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                                  isAvail
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                                }`}
                              >
                                {isAvail ? 'Tersedia' : 'Terpakai'}
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
                                    navigator.clipboard.writeText(`${item.email}|sgsg1122`);
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

        {/* STATS TAB */}
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
                    className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-blue-500 text-xs outline-none"
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
                        <span className="font-mono text-xs text-slate-800 font-bold break-all">
                          {sub.dataContent}
                        </span>
                        <span className="text-xs font-black text-blue-700 shrink-0">
                          {formatRupiah(sub.rewardAmount || 3000)}
                        </span>
                      </div>

                      {/* Jika sudah Diterima / Ditolak, tidak bisa di terima/di tolak lagi, cukup tampilkan riwayatnya saja */}
                      {isFinished ? (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            {sub.status === 'Diterima' ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Riwayat: Sudah Diterima (+{formatRupiah(sub.rewardAmount || 3000)})</span>
                              </span>
                            ) : (
                              <span className="text-rose-700 font-bold flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                <span>Riwayat: Sudah Ditolak {sub.rejectionReason ? `(${sub.rejectionReason})` : ''}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                            Riwayat Selesai
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

        {/* WITHDRAWALS TAB: Penarikan Uang */}
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
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                          withFilter === f.id
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
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
                    className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
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
                      className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-2xs hover:shadow-xs transition space-y-3.5"
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
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : w.status === 'Selesai'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-100 text-rose-800 border border-rose-200'
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
                            <span className="text-[10px] font-semibold text-slate-400">
                              ({formatRelativeTime(w.createdAt)})
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/50 via-slate-50 to-blue-50/30 border border-blue-100/80">
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
                            Tujuan E-Wallet / Rekening
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-black uppercase bg-blue-600 text-white shadow-2xs">
                              {w.method}
                            </span>
                            <span className="font-mono text-sm sm:text-base font-bold text-blue-900 select-all tracking-wider">
                              {w.targetNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(w.targetNumber);
                                showToast('info', 'Tersalin', `Nomor ${w.targetNumber} berhasil disalin.`);
                              }}
                              className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                              title="Salin Nomor E-Wallet"
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

                      {/* Tombol aksi atau Riwayat Selesai */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="text-[11px] text-slate-500">
                          {w.status === 'Selesai' && (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Riwayat: Uang Sudah Diterima / Ditransfer ({w.completedAt ? formatIndonesianDateTime(w.completedAt) : 'Selesai'})</span>
                            </span>
                          )}
                          {w.status === 'Ditolak' && (
                            <span className="text-rose-700 font-bold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Riwayat: Uang Ditolak {w.rejectionReason ? `(${w.rejectionReason})` : ''} (Saldo Di-refund)</span>
                            </span>
                          )}
                        </div>

                        {/* Jika sudah Selesai / Ditolak, tidak bisa di terima/di tolak lagi, cukup tampilkan riwayatnya saja */}
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

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1e40af] via-blue-600 to-[#38bdf8] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Settings className="w-6 h-6 animate-spin-slow" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                      Pengaturan Sistem &amp; Layanan
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Realtime Sync
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Atur harga komisi per akun, batas penarikan, password default (sgsg1122), generator, dan aturan storan.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 self-start md:self-center">
                <button
                  type="button"
                  onClick={handleSaveAllSettings}
                  disabled={savingSettings}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] hover:from-[#1e3a8a] hover:to-sky-500 text-white text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
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

            <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                  <label className="text-xs font-black text-emerald-950 block">
                    Harga Komisi per Akun Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={tempPrice}
                    onChange={(e) => setTempPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm font-black text-slate-900 rounded-xl border border-emerald-300 bg-white"
                  />
                </div>
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-2">
                  <label className="text-xs font-black text-blue-950 block">
                    Minimal Penarikan Saldo (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={tempMinWithdrawal}
                    onChange={(e) => setTempMinWithdrawal(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm font-black text-slate-900 rounded-xl border border-blue-300 bg-white"
                  />
                </div>
                <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200 space-y-2">
                  <label className="text-xs font-black text-orange-950 block">
                    Password Wajib Akun Gmail (Hanya sgsg1122)
                  </label>
                  <input
                    type="text"
                    disabled
                    value="sgsg1122"
                    className="w-full px-3.5 py-2.5 font-mono text-sm font-black text-orange-900 rounded-xl border border-orange-300 bg-orange-100/50 cursor-not-allowed"
                  />
                </div>
                <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-2">
                  <label className="text-xs font-black text-purple-950 block">
                    Limit Harian Generate Akun per User
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={tempDailyGenerateLimit}
                    onChange={(e) => setTempDailyGenerateLimit(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-sm font-black text-slate-900 rounded-xl border border-purple-300 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Jadwal &amp; Jam Operasional Layanan
                  </label>
                  <input
                    type="text"
                    value={tempSchedule}
                    onChange={(e) => setTempSchedule(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">
                    Nomor WhatsApp Resmi Admin
                  </label>
                  <input
                    type="text"
                    value={tempWhatsApp}
                    onChange={(e) => setTempWhatsApp(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 font-mono bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Pesan Pengumuman Beranda (Banner Beranda)
                </label>
                <textarea
                  rows={3}
                  value={tempAnnouncement}
                  onChange={(e) => setTempAnnouncement(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Pesan / Alasan Jika Storan Sedang Ditutup
                </label>
                <textarea
                  rows={2}
                  value={tempStoranClosedReason}
                  onChange={(e) => setTempStoranClosedReason(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-bold text-slate-700 block flex items-between">
                  <span>Link Download Aplikasi Android (.APK)</span>
                </label>
                <input
                  type="url"
                  value={tempApkUrl}
                  onChange={(e) => setTempApkUrl(e.target.value)}
                  placeholder="https://www.mediafire.com/file/.../azyx19.apk/file"
                  className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* MODAL USER DETAIL */}
        <AnimatePresence>
          {selectedUser && selectedUserStats && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto"
              >
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
                animate={{ opacity: 1, scale: 1 }}
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
                    className="p-1 rounded-full text-white/80 hover:text-white cursor-pointer"
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
                      className="flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRejectSubmission}
                      className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
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
                    className="flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRejectWithdrawal}
                    className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold cursor-pointer"
                  >
                    Tolak &amp; Refund
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL TAMBAH 1 AKUN STOK GENERATOR */}
        <AnimatePresence>
          {showAddSingleModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900">Tambah 1 Akun ke Stok Generator</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddSingleModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddSingleStock} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Alamat Email Gmail</label>
                    <input
                      type="email"
                      required
                      placeholder="contoh.nama123@gmail.com"
                      value={newStockEmail}
                      onChange={(e) => setNewStockEmail(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                    <input
                      type="text"
                      disabled
                      value="sgsg1122"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-mono bg-slate-100 cursor-not-allowed text-slate-600"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSingleModal(false)}
                      className="flex-1 py-2 rounded-xl border text-xs font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                    >
                      Simpan Akun
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
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="text-base font-black text-slate-900">Import Massal Stok Generator</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddBulkModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddBulkStock} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tempel Daftar Gmail (1 Baris = 1 Akun)
                    </label>
                    <textarea
                      rows={8}
                      required
                      placeholder={`email1@gmail.com\nemail2@gmail.com\nemail3@gmail.com`}
                      value={bulkInputText}
                      onChange={(e) => setBulkInputText(e.target.value)}
                      className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 outline-none leading-relaxed"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddBulkModal(false)}
                      className="flex-1 py-2.5 rounded-xl border text-xs font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                    >
                      Import Sekarang
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL KONFIRMASI HAPUS AKUN TERPAKAI */}
        <AnimatePresence>
          {showConfirmClearUsed && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-black text-slate-900">
                    Hapus Akun Yang Sudah Terpakai?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Sebanyak <strong className="text-amber-700 font-bold">{usedStock.length} akun</strong> yang telah digenerate / diklaim oleh pengguna akan dihapus permanen dari database.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmClearUsed(false)}
                    disabled={stockActionLoading}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleClearUsedStock}
                    disabled={stockActionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {stockActionLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menghapus...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Ya, Hapus Terpakai</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* MODAL KONFIRMASI HAPUS ALL STOK GENERATOR */}
        <AnimatePresence>
          {showConfirmClearAll && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-200 p-6 space-y-4"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h3 className="text-base font-black text-rose-950">
                    Hapus SEMUA Stok Generator?
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Perhatian: Tindakan ini akan mengosongkan dan menghapus <strong className="text-rose-600 font-black">SELURUH {gmailStockList.length} akun</strong> dari database stok generator.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowConfirmClearAll(false)}
                    disabled={stockActionLoading}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer transition disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllStock}
                    disabled={stockActionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {stockActionLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menghapus Semua...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Ya, Hapus SEMUA Stok</span>
                      </>
                    )}
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
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-0 max-h-[92vh] flex flex-col"
              >
                <div className="bg-gradient-to-r from-[#1e40af] via-blue-600 to-[#38bdf8] p-5 text-white flex items-center justify-between shrink-0 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-black tracking-tight text-white">
                        Konfirmasi Transfer Penarikan
                      </h3>
                      <p className="text-[11px] text-blue-100 font-medium">
                        Verifikasi data e-wallet dan riwayat storan sebelum menyelesaikan
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmPayModalWith(null)}
                    className="p-1 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/90 via-sky-50/60 to-blue-50/90 border border-blue-200/90 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Nominal Yang Harus Ditransfer
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-blue-600 text-white shadow-2xs">
                        {confirmPayModalWith.method}
                      </span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {formatRupiah(confirmPayModalWith.amount)}
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-blue-200/80 flex items-center justify-between gap-3 shadow-2xs">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">
                          Nomor Tujuan {confirmPayModalWith.method}:
                        </span>
                        <div className="font-mono text-base sm:text-lg font-black text-blue-900 select-all tracking-wider">
                          {confirmPayModalWith.targetNumber}
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 block mt-0.5">
                          a.n. {confirmPayModalWith.recipientName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(confirmPayModalWith.targetNumber);
                          setCopiedWithNumber(true);
                          showToast('info', 'Nomor Disalin', `${confirmPayModalWith.targetNumber} tersalin ke clipboard.`);
                          setTimeout(() => setCopiedWithNumber(false), 2000);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 shrink-0 ${
                          copiedWithNumber
                            ? 'bg-emerald-600 text-white'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                        }`}
                      >
                        {copiedWithNumber ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedWithNumber ? 'Tersalin!' : 'Salin Nomor'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Waktu Pengajuan Penarikan
                        </span>
                        <span className="text-xs font-black text-slate-900 font-mono">
                          {formatIndonesianDateTime(confirmPayModalWith.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const summary = getUserStorSummary(confirmPayModalWith.userId);
                    return (
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                            <Send className="w-3.5 h-3.5 text-blue-600" />
                            <span>Riwayat STOR-an User</span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-bold">
                            Total {summary.total} Akun Disetor
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                            <span className="text-[10px] text-emerald-800 font-bold block">Diterima</span>
                            <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block">
                              {summary.diterima}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200">
                            <span className="text-[10px] text-amber-800 font-bold block">Pending</span>
                            <span className="text-base font-black text-amber-700 font-mono mt-0.5 block">
                              {summary.pending}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                            <span className="text-[10px] text-rose-800 font-bold block">Ditolak</span>
                            <span className="text-base font-black text-rose-700 font-mono mt-0.5 block">
                              {summary.ditolak}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmPayModalWith(null)}
                    disabled={processingWithId === confirmPayModalWith.id}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-white cursor-pointer transition disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMarkWithdrawalPaid(confirmPayModalWith)}
                    disabled={processingWithId === confirmPayModalWith.id}
                    className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {processingWithId === confirmPayModalWith.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Menyelesaikan...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ya, Tandai Sudah Ditransfer (Selesai)</span>
                      </>
                    )}
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
    </div>
  );
}
