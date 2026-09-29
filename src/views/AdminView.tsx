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
  Search,
  Check,
  Ban,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  KeyRound,
  Copy,
  Layers,
  Sparkles,
  ListCheck,
  ListX,
  ClipboardCheck,
  Globe,
  History,
  X,
  Power,
  Gift,
  FileText,
  Send,
  Save,
  RotateCcw,
  CheckCircle2,
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
    deleteAccount,
    clearUsedAccounts,
    clearAllStock,
    seedInitialAccounts,
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

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userSortMode, setUserSortMode] = useState<'all' | 'highest_balance' | 'has_balance'>('all');

  const [tempPrice, setTempPrice] = useState(settings.pricePerSubmission);
  const [tempMinWithdrawal, setTempMinWithdrawal] = useState(settings.minWithdrawal);
  const [tempSchedule, setTempSchedule] = useState(settings.storanSchedule);
  const [tempAnnouncement, setTempAnnouncement] = useState(settings.announcement);
  const [tempGmailPassword, setTempGmailPassword] = useState(settings.gmailDefaultPassword || 'sgsg1122');
  const [tempWhatsApp, setTempWhatsApp] = useState(settings.adminWhatsApp || '6285199219856');
  const [tempDailyGenerateLimit, setTempDailyGenerateLimit] = useState(settings.dailyGenerateLimit || 10);
  const [tempStoranClosedReason, setTempStoranClosedReason] = useState(settings.storanClosedReason || '');
  const [rulesList, setRulesList] = useState<string[]>(settings?.rules || []);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Stock Generator management state
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

  useEffect(() => {
    if (!isAdmin) return;
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const uList: UserProfile[] = [];
        snap.forEach((d) => {
          uList.push(d.data() as UserProfile);
        });
        setUsersList(uList);
      },
      (err) => console.warn('Admin users listener warning:', err)
    );

    const unsubSubs = onSnapshot(
      collection(db, 'submissions'),
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

  // Stock Generator handlers
  const handleAutoReplenish = async (amount: number) => {
    setStockActionLoading(true);
    try {
      const added = await replenishStock(amount, settings.gmailDefaultPassword || 'sgsg1122');
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
      showToast('success', 'Akun Terpakai Dihapus', 'Semua akun berstatus terpakai telah berhasil dihapus dari database.');
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
      await addSingleAccount(newStockEmail.trim(), newStockPass.trim() || settings.gmailDefaultPassword || 'sgsg1122');
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
      const count = await addBulkAccounts(bulkInputText, settings.gmailDefaultPassword || 'sgsg1122');
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
            Kelola verifikasi akun Gmail, All Stok Generator, konfirmasi terima bulk, tolak bulk, dan saldo
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
              Perubahan status di bawah ini langsung aktif realtime di tampilan pengguna
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
            <span>Generator: {settings.generatorOpen !== false ? 'BUKA' : 'TUTUP'}</span>
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

      {/* ALL STOK GENERATOR TAB - FULLY IMPLEMENTED & FIXED */}
      {activeTab === 'stock' && (
        <div className="space-y-5">
          {/* Header Card */}
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
                  Kelola stok nama Gmail yang disediakan untuk freelancer di fitur Generator Khusus
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

          {/* Quick Metrics & Actions Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Stok di Database</span>
              <div className="text-2xl font-black text-slate-900 mt-1">{gmailStockList.length} Akun</div>
              <span className="text-[10px] text-slate-400">Semua akun generator</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-emerald-800 block">Stok Tersedia (Ready)</span>
              <div className="text-2xl font-black text-emerald-700 mt-1">{availableStock.length} Akun</div>
              <span className="text-[10px] text-emerald-600 font-semibold">Siap diambil user</span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Stok Terpakai / Diklaim</span>
              <div className="text-2xl font-black text-amber-700 mt-1">{usedStock.length} Akun</div>
              <span className="text-[10px] text-amber-600">Sudah digenerate user</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-600 block">Tindakan Pemeliharaan</span>
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetUsedStock}
                    disabled={stockActionLoading || usedStock.length === 0}
                    className="flex-1 py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold transition disabled:opacity-40 cursor-pointer"
                    title="Kembalikan semua akun terpakai menjadi Tersedia"
                  >
                    Reset Tersedia
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirmClearUsed(true)}
                    disabled={stockActionLoading || usedStock.length === 0}
                    className="flex-1 py-1.5 px-2 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1"
                    title="Hapus akun yang sudah terpakai"
                  >
                    <Trash2 className="w-3 h-3 text-amber-700" />
                    <span>Hapus Terpakai</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirmClearAll(true)}
                  disabled={stockActionLoading || gmailStockList.length === 0}
                  className="w-full py-1.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  title="Hapus seluruh stok generator akun"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus All Stok ({gmailStockList.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Filter & Search Bar */}
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
                  placeholder="Cari email Gmail, user klaim..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            </div>

            {/* Table of Stock */}
            {filteredStock.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700">Tidak ada stok akun yang cocok</p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => handleAutoReplenish(50)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Isi 50 Akun Baru
                  </button>
                </div>
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
                            {item.password || settings.gmailDefaultPassword || 'sgsg1122'}
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
                            {item.claimedByName ? (
                              <div>
                                <strong className="text-slate-800">{item.claimedByName}</strong>
                                {item.claimedByEmail && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    {item.claimedByEmail}
                                  </div>
                                )}
                              </div>
                            ) : item.claimedBy ? (
                              <span className="font-mono text-[11px] text-slate-500">
                                {item.claimedBy}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">-</span>
                            )}
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
                                  navigator.clipboard.writeText(
                                    `${item.email}|${item.password || settings.gmailDefaultPassword || 'sgsg1122'}`
                                  );
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
            {filteredStock.length > 100 && (
              <p className="text-[11px] text-slate-400 text-center pt-2">
                Menampilkan 100 akun pertama dari {filteredStock.length} akun. Gunakan pencarian untuk menemukan akun tertentu.
              </p>
            )}
          </div>
        </div>
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
                    className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer"
                  >
                    Tolak
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAcceptSubmission(sub)}
                    className="px-4 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
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
                <div className="text-sm font-black text-blue-700">
                  {formatRupiah(w.amount)} ke {w.method} ({w.targetNumber}) a.n. {w.recipientName}
                </div>
                {w.status === 'Pending' && (
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalWith(w);
                        setWithRejectionReason('Nomor e-wallet tidak valid');
                      }}
                      className="px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 cursor-pointer"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarkWithdrawalPaid(w)}
                      className="px-4 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold cursor-pointer"
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

      {/* PENGATURAN SISTEM TAB */}
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
                  Password Wajib Akun Gmail
                </label>
                <input
                  type="text"
                  value={tempGmailPassword}
                  onChange={(e) => setTempGmailPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 font-mono text-sm font-black text-orange-900 rounded-xl border border-orange-300 bg-white"
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
                  Jadwal & Jam Operasional Layanan
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
          </div>
        </div>
      )}

      {/* MODAL USER DETAIL WITH METRICS */}
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

              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 block">
                  Ringkasan Aktivitas Akun:
                </span>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-indigo-900 font-bold">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Jumlah Riwayat</span>
                    </div>
                    <div className="text-2xl font-black text-indigo-950 font-mono">
                      {selectedUserStats.totalRiwayat}{' '}
                      <span className="text-xs font-semibold text-indigo-700 font-sans">Riwayat</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                      <Wallet className="w-4 h-4 text-emerald-600" />
                      <span>Jumlah Penarikan</span>
                    </div>
                    <div className="text-2xl font-black text-emerald-950 font-mono">
                      {selectedUserStats.totalPenarikanCount}{' '}
                      <span className="text-xs font-semibold text-emerald-700 font-sans">Kali</span>
                    </div>
                  </div>

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

                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                      <Gift className="w-4 h-4 text-amber-600" />
                      <span>Undangan Teman</span>
                    </div>
                    <div className="text-2xl font-black text-amber-950 font-mono">
                      {selectedUserStats.totalUndangan}{' '}
                      <span className="text-xs font-semibold text-amber-700 font-sans">Teman</span>
                    </div>
                    <span className="text-[10px] text-amber-800 block">
                      {selectedUserStats.undanganBerhasil} Selesai • {selectedUserStats.menungguStor} Menunggu Stor
                    </span>
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
              exit={{ opacity: 0, scale: 0.95 }}
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
                  Tolak & Refund
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password (Opsional)</label>
                  <input
                    type="text"
                    placeholder={`Default: ${settings.gmailDefaultPassword || 'sgsg1122'}`}
                    value={newStockPass}
                    onChange={(e) => setNewStockPass(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-mono outline-none"
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
                    Tempel Daftar Gmail (1 Baris = 1 Akun, format email@gmail.com atau email@gmail.com|password)
                  </label>
                  <textarea
                    rows={8}
                    required
                    placeholder={`email1@gmail.com\nemail2@gmail.com|pass123\nemail3@gmail.com`}
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
              animate={{ opacity: 1, scale: 1, y: 0 }}
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
                  Sebanyak <strong className="text-amber-700 font-bold">{usedStock.length} akun</strong> yang telah digenerate / diklaim oleh pengguna akan dihapus permanen dari database. Akun yang masih <strong>Tersedia</strong> tetap aman.
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
              animate={{ opacity: 1, scale: 1, y: 0 }}
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
                  Perhatian: Tindakan ini akan mengosongkan dan menghapus <strong className="text-rose-600 font-black">SELURUH {gmailStockList.length} akun</strong> (baik akun tersedia maupun akun terpakai) dari database stok generator.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900 font-medium text-center">
                Stok akan menjadi 0. Anda dapat mengisi stok baru kapan saja dengan tombol <strong>+50 Stok Otomatis</strong> atau <strong>Import Massal</strong>.
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
