import { useState, useEffect, useMemo, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah, formatIndonesianDateTime, isTodayWIB, isEarlierThanTodayWIB } from '../lib/utils';
import {
  UserProfile,
  Submission,
  Withdrawal,
  NavigationTab,
  GmailStockItem,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GmailLogo } from '../components/GmailLogo';

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

  const [showBulkCheckModal, setShowBulkCheckModal] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);

  const [subFilter, setSubFilter] = useState<'All' | 'Pending' | 'Cek Admin' | 'Diterima' | 'Ditolak'>('Pending');
  const [subSearch, setSubSearch] = useState('');

  // Single submission rejection modal state
  const [rejectModalSub, setRejectModalSub] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingSubId, setProcessingSubId] = useState<string | null>(null);

  // Single withdrawal rejection modal state
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
  const [rulesList] = useState<string[]>(settings?.rules || []);
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
  const [, setSavingStock] = useState(false);

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
    if (settings.gmailDefaultPassword) {
      setTempGmailPassword(settings.gmailDefaultPassword);
    }
  }, [settings.gmailDefaultPassword]);

  useEffect(() => {
    if (settings.adminWhatsApp) {
      setTempWhatsApp(settings.adminWhatsApp);
    }
  }, [settings.adminWhatsApp]);

  useEffect(() => {
    if (settings.storanClosedReason !== undefined) {
      setTempStoranClosedReason(settings.storanClosedReason);
    }
  }, [settings.storanClosedReason]);

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
        console.warn('Admin users snapshot notice:', err?.message || err);
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
        console.warn('Admin submissions snapshot notice:', err?.message || err);
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
        console.warn('Admin withdrawals snapshot notice:', err?.message || err);
      }
    );

    return () => {
      unsubUsers();
      unsubSubs();
      unsubWiths();
    };
  }, [isAdmin]);

  useEffect(() => {
    setTempPrice(settings.pricePerSubmission);
    setTempMinWithdrawal(settings.minWithdrawal);
    setTempSchedule(settings.storanSchedule);
    setTempAnnouncement(settings.announcement);
    setTempDailyGenerateLimit(settings.dailyGenerateLimit || 10);
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
      const reward =
        typeof sub.rewardAmount === 'number' && sub.rewardAmount > 0
          ? sub.rewardAmount
          : settings.pricePerSubmission || 3000;

      await runTransaction(db, async (transaction) => {
        const subDoc = await transaction.get(subRef);
        if (!subDoc.exists()) throw new Error('Submission tidak ditemukan.');
        if (subDoc.data().status === 'Diterima') {
          return;
        }

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
          const currentBalance = userData.balance || 0;
          const currentEarned = userData.totalEarned || 0;
          transaction.update(userRef, {
            balance: currentBalance + reward,
            totalEarned: currentEarned + reward,
          });
        }
      });

      showToast(
        'success',
        'Submission Diterima',
        `Saldo ${formatRupiah(reward)} otomatis masuk ke akun ${sub.userName || sub.userEmail}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Menerima', msg);
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleCheckSubmission = async (sub: Submission) => {
    setProcessingSubId(sub.id);
    try {
      const subRef = doc(db, 'submissions', sub.id);
      await updateDoc(subRef, {
        status: 'Cek Admin',
        checkedAt: new Date().toISOString(),
      });
      showToast(
        'info',
        'Status: Cek Admin',
        `Akun ${sub.dataContent.split('|')[0].trim()} ditandai sedang dalam pemeriksaan admin.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Mengubah Status', msg);
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleConfirmRejectSubmission = async () => {
    if (!rejectModalSub) return;
    if (!rejectionReason.trim()) {
      showToast('error', 'Wajib Alasan', 'Harap isi alasan penolakan submission.');
      return;
    }

    setProcessingSubId(rejectModalSub.id);
    try {
      await updateDoc(doc(db, 'submissions', rejectModalSub.id), {
        status: 'Ditolak',
        rejectionReason: rejectionReason.trim(),
        reviewedAt: new Date().toISOString(),
      });
      showToast('info', 'Submission Ditolak', 'Alasan penolakan berhasil disimpan untuk user.');
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
        const withDoc = await transaction.get(withRef);
        if (!withDoc.exists()) throw new Error('Penarikan tidak ditemukan.');
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User tidak ditemukan.');

        const userData = userDoc.data();
        const pendingWithdrawn = Math.max(0, (userData.pendingWithdrawn || 0) - withItem.amount);
        const totalWithdrawn = (userData.totalWithdrawn || 0) + withItem.amount;

        transaction.update(withRef, {
          status: 'Selesai',
          completedAt: new Date().toISOString(),
          rejectionReason: '',
        });

        transaction.update(userRef, {
          pendingWithdrawn,
          totalWithdrawn,
        });
      });

      showToast(
        'success',
        'Penarikan Ditandai Selesai',
        `Pembayaran ${formatRupiah(withItem.amount)} ke ${withItem.method} telah berhasil diselesaikan.`
      );
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingWithId(null);
    }
  };

  const handleConfirmRejectWithdrawal = async () => {
    if (!rejectModalWith) return;
    if (!withRejectionReason.trim()) {
      showToast('error', 'Wajib Alasan', 'Harap isi alasan penolakan penarikan.');
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
          const newBalance = (userData.balance || 0) + rejectModalWith.amount;
          const newPending = Math.max(0, (userData.pendingWithdrawn || 0) - rejectModalWith.amount);
          transaction.update(userRef, {
            balance: newBalance,
            pendingWithdrawn: newPending,
          });
        }
        transaction.update(withRef, {
          status: 'Ditolak',
          rejectionReason: withRejectionReason.trim(),
          completedAt: new Date().toISOString(),
        });
      });

      showToast(
        'info',
        'Penarikan Ditolak',
        `Saldo ${formatRupiah(rejectModalWith.amount)} telah otomatis dikembalikan ke akun user.`
      );
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
      await updateDoc(doc(db, 'users', targetUser.uid), {
        status: newStatus,
      });
      showToast(
        'success',
        'Status User Diubah',
        `Pengguna ${targetUser.displayName} sekarang berstatus ${newStatus === 'active' ? 'Aktif' : 'Dibatasi (Suspended)'}.`
      );
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
      showToast('error', 'Nominal Tidak Valid', 'Masukkan nominal saldo yang benar (angka positif).');
      return;
    }

    setSavingBalance(true);
    try {
      const currentBal = balanceModalUser.balance || 0;
      let newBal = currentBal;
      let newTotalEarned = balanceModalUser.totalEarned || 0;

      if (balanceMode === 'add') {
        newBal = currentBal + parsed;
        if (includeTotalEarned) {
          newTotalEarned = newTotalEarned + parsed;
        }
      } else {
        newBal = parsed;
      }

      const updatePayload: Record<string, any> = {
        balance: newBal,
      };
      if (balanceMode === 'add' && includeTotalEarned) {
        updatePayload.totalEarned = newTotalEarned;
      }

      await updateDoc(doc(db, 'users', balanceModalUser.uid), updatePayload);

      setUsersList((prev) =>
        prev.map((u) =>
          u.uid === balanceModalUser.uid
            ? { ...u, balance: newBal, totalEarned: updatePayload.totalEarned ?? u.totalEarned }
            : u
        )
      );

      if (selectedUser?.uid === balanceModalUser.uid) {
        setSelectedUser({
          ...selectedUser,
          balance: newBal,
          totalEarned: updatePayload.totalEarned ?? selectedUser.totalEarned,
        });
      }

      showToast(
        'success',
        'Saldo Berhasil Diperbarui',
        balanceMode === 'add'
          ? `Berhasil menambah ${formatRupiah(parsed)} ke saldo ${balanceModalUser.displayName}. Saldo baru: ${formatRupiah(newBal)}.`
          : `Saldo ${balanceModalUser.displayName} berhasil diubah menjadi ${formatRupiah(newBal)}.`
      );
      setBalanceModalUser(null);
      setBalanceAmountInput('');
    } catch (err: unknown) {
      showToast('error', 'Gagal Memperbarui Saldo', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingBalance(false);
    }
  };

  const handleSaveAllSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSettings({
        pricePerSubmission: Number(tempPrice),
        minWithdrawal: Number(tempMinWithdrawal),
        storanSchedule: tempSchedule.trim(),
        announcement: tempAnnouncement.trim(),
        rules: rulesList.filter((r) => r.trim().length > 0),
        gmailDefaultPassword: tempGmailPassword.trim() || 'sgsg1122',
        adminWhatsApp: tempWhatsApp.trim() || '6285199219856',
        dailyGenerateLimit: Math.max(1, Number(tempDailyGenerateLimit) || 10),
        storanClosedReason: tempStoranClosedReason.trim(),
      });
      showToast(
        'success',
        'Pengaturan Disimpan',
        'Semua konfigurasi sistem dan aturan berhasil diperbarui.'
      );
    } catch (err: unknown) {
      showToast('error', 'Gagal Menyimpan', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleWithdrawal = async () => {
    const nextVal = settings.withdrawalOpen === false;
    try {
      await updateSettings({ withdrawalOpen: nextVal });
      showToast(
        nextVal ? 'success' : 'info',
        `Penarikan ${nextVal ? 'DIBUKA' : 'DITUTUP'}`,
        `Fitur penarikan saldo sekarang ${nextVal ? 'dibuka (aktif)' : 'ditutup sementara'}.`
      );
    } catch (err: unknown) {
      showToast('error', 'Gagal Mengubah Status', err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleGenerator = async () => {
    const nextVal = settings.generatorOpen === false;
    try {
      await updateSettings({ generatorOpen: nextVal });
      showToast(
        nextVal ? 'success' : 'info',
        `Generator Akun ${nextVal ? 'DIBUKA' : 'DITUTUP'}`,
        `Fitur generator akun Gmail sekarang ${nextVal ? 'dibuka (aktif)' : 'ditutup sementara'}.`
      );
    } catch (err: unknown) {
      showToast('error', 'Gagal Mengubah Status', err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleStoranKhusus = async () => {
    const nextVal = settings.storanKhususOpen === false;
    try {
      await updateSettings({ storanKhususOpen: nextVal });
      showToast(
        nextVal ? 'success' : 'info',
        `STOR Khusus ${nextVal ? 'DIBUKA' : 'DITUTUP'}`,
        `Layanan STOR an Khusus (3k / generate) sekarang ${nextVal ? 'dibuka (aktif)' : 'ditutup sementara'}.`
      );
    } catch (err: unknown) {
      showToast('error', 'Gagal Mengubah Status', err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleStoranBebas = async () => {
    const nextVal = settings.storanBebasOpen === false;
    try {
      await updateSettings({ storanBebasOpen: nextVal });
      showToast(
        nextVal ? 'success' : 'info',
        `STOR Bebas ${nextVal ? 'DIBUKA' : 'DITUTUP'}`,
        `Layanan STOR an Bebas (2.7k) sekarang ${nextVal ? 'dibuka (aktif)' : 'ditutup sementara'}.`
      );
    } catch (err: unknown) {
      showToast('error', 'Gagal Mengubah Status', err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggleSemuaStoran = async () => {
    const nextVal = !settings.storanOpen;
    try {
      await updateSettings({ storanOpen: nextVal });
      showToast(
        nextVal ? 'success' : 'info',
        `Semua STOR ${nextVal ? 'DIBUKA' : 'DITUTUP'}`,
        `Layanan semua storan sekarang ${nextVal ? 'dibuka (aktif)' : 'ditutup sementara'}.`
      );
    } catch (err: unknown) {
      showToast('error', 'Gagal Mengubah Status', err instanceof Error ? err.message : String(err));
    }
  };

  const handleSaveSingleStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!newStockEmail.trim()) {
      showToast('error', 'Form Belum Lengkap', 'Alamat email Gmail wajib diisi.');
      return;
    }
    const emailVal = newStockEmail.trim().toLowerCase();
    if (!emailVal.endsWith('@gmail.com') || emailVal.includes(' ')) {
      showToast('error', 'Format Tidak Valid', 'Email harus beralamat @gmail.com valid tanpa spasi.');
      return;
    }
    setSavingStock(true);
    try {
      await addSingleAccount(
        emailVal,
        newStockPass.trim() || settings.gmailDefaultPassword || 'sgsg1122'
      );
      showToast('success', 'Akun Ditambahkan', `Akun ${emailVal} berhasil dimasukkan ke stok.`);
      setNewStockEmail('');
      setNewStockPass('');
      setShowAddSingleModal(false);
    } catch (err: unknown) {
      showToast('error', 'Error', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingStock(false);
    }
  };

  const handleSaveBulkStock = async (e: FormEvent) => {
    e.preventDefault();
    if (!bulkInputText.trim()) {
      showToast('error', 'Data Kosong', 'Silakan tempel daftar email Gmail per baris.');
      return;
    }
    setSavingStock(true);
    try {
      const added = await addBulkAccounts(
        bulkInputText,
        settings.gmailDefaultPassword || 'sgsg1122'
      );
      if (added > 0) {
        showToast(
          'success',
          'Import Massal Berhasil',
          `Berhasil memasukkan ${added} akun Gmail ke stok generator.`
        );
        setBulkInputText('');
        setShowAddBulkModal(false);
      } else {
        showToast(
          'error',
          'Tidak Ada Akun Baru',
          'Semua email sudah terdaftar di stok atau format baris tidak valid.'
        );
      }
    } catch (err: unknown) {
      showToast('error', 'Error', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingStock(false);
    }
  };

  const handleUpdateStockItem = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingStockItem) return;
    if (!editStockEmail.trim()) {
      showToast('error', 'Email Kosong', 'Alamat email tidak boleh kosong.');
      return;
    }
    setSavingStock(true);
    try {
      await updateAccount(editingStockItem.id, {
        email: editStockEmail.trim().toLowerCase(),
        password: editStockPass.trim() || settings.gmailDefaultPassword || 'sgsg1122',
        status: editStockStatus,
      });
      showToast('success', 'Akun Diperbarui', `Perubahan akun ${editStockEmail} berhasil disimpan.`);
      setEditingStockItem(null);
    } catch (err: unknown) {
      showToast('error', 'Error', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingStock(false);
    }
  };

  const handleDeleteStockItem = (item: GmailStockItem) => {
    setStockConfirm({
      title: 'Hapus Akun Gmail Ini?',
      description: `Apakah Anda yakin ingin menghapus akun "${item.email}" dari stok generator? Akun ini akan dihapus secara permanen dari database.`,
      confirmText: 'Ya, Hapus Akun',
      confirmColor: 'red',
      action: async () => {
        await deleteAccount(item.id);
        showToast('success', 'Akun Dihapus', `Akun ${item.email} telah dihapus dari stok.`);
      },
    });
  };

  const handleClearAllUsed = () => {
    if (usedStock.length === 0) {
      showToast('info', 'Info', 'Tidak ada stok terpakai yang perlu dibersihkan.');
      return;
    }
    setStockConfirm({
      title: 'Hapus Akun Terpakai?',
      description: `Bersihkan dan hapus ${usedStock.length} akun yang sudah terpakai dari database? Akun yang masih "Tersedia" tidak akan terhapus.`,
      confirmText: `Ya, Hapus ${usedStock.length} Akun Terpakai`,
      confirmColor: 'amber',
      action: async () => {
        await clearUsedAccounts();
        showToast('success', 'Dibersihkan', 'Berhasil membersihkan seluruh akun terpakai.');
      },
    });
  };

  const handleResetStarterStock = () => {
    setStockConfirm({
      title: 'Isi 30 Akun Contoh?',
      description: 'Tambahkan 30 akun Gmail contoh baru ke dalam stok generator?',
      confirmText: 'Ya, Tambahkan 30 Akun',
      confirmColor: 'indigo',
      action: async () => {
        await seedInitialAccounts();
        showToast(
          'success',
          'Stok Ditambahkan',
          'Berhasil memasukkan 30 akun contoh baru ke database.'
        );
      },
    });
  };

  const handleDeleteAllStock = () => {
    if (gmailStockList.length === 0) {
      showToast('info', 'Info', 'Stok generator sudah kosong.');
      return;
    }
    setStockConfirm({
      title: 'Kosongkan Semua Stok Generator?',
      description: `PERINGATAN: Anda yakin ingin menghapus SELURUH ${gmailStockList.length} akun dari stok generator? Generator akan dikosongkan.`,
      confirmText: `Ya, Kosongkan Semua (${gmailStockList.length} Akun)`,
      confirmColor: 'red',
      action: async () => {
        await clearAllStock();
        showToast('success', 'Stok Dikosongkan', 'Seluruh akun Gmail generator berhasil dihapus.');
      },
    });
  };

  const handleExecuteConfirm = async () => {
    if (!stockConfirm) return;
    setIsConfirmingAction(true);
    try {
      await stockConfirm.action();
      setStockConfirm(null);
    } catch (err: unknown) {
      showToast('error', 'Gagal Memproses', err instanceof Error ? err.message : String(err));
    } finally {
      setIsConfirmingAction(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const submissionHariIni = submissionsList.filter((s) => s.createdAt.startsWith(todayStr)).length;
  const submissionPending = submissionsList.filter((s) => s.status === 'Pending').length;
  const pendingYesterdayCount = submissionsList.filter(
    (s) => s.status === 'Pending' && isEarlierThanTodayWIB(s.createdAt)
  ).length;
  const cekAdminCount = submissionsList.filter((s) => s.status === 'Cek Admin').length;
  const submissionDiterima = submissionsList.filter((s) => s.status === 'Diterima').length;
  const submissionDitolak = submissionsList.filter((s) => s.status === 'Ditolak').length;

  const totalSaldoUser = usersList.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalPembayaranSelesai = withdrawalsList
    .filter((w) => w.status === 'Selesai')
    .reduce((acc, w) => acc + (w.amount || 0), 0);

  const filteredSubs = submissionsList.filter((sub) => {
    const matchesFilter = subFilter === 'All' || sub.status === subFilter;
    const matchesSearch =
      sub.id.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.userName?.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.userEmail?.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.dataContent.toLowerCase().includes(subSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredWiths = withdrawalsList.filter((w) => {
    const matchesFilter = withFilter === 'All' || w.status === withFilter;
    const matchesSearch =
      w.id.toLowerCase().includes(withSearch.toLowerCase()) ||
      w.userName?.toLowerCase().includes(withSearch.toLowerCase()) ||
      w.userEmail?.toLowerCase().includes(withSearch.toLowerCase()) ||
      w.targetNumber.includes(withSearch) ||
      w.recipientName.toLowerCase().includes(withSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredUsers = useMemo(() => {
    let list = usersList.filter(
      (u) =>
        u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.uid.toLowerCase().includes(userSearch.toLowerCase())
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
    const matchesFilter =
      stockFilter === 'All' ||
      (stockFilter === 'available' && item.status === 'available') ||
      (stockFilter === 'used' && item.status === 'used');
    const matchesSearch =
      item.email.toLowerCase().includes(stockSearch.toLowerCase()) ||
      (item.password && item.password.toLowerCase().includes(stockSearch.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200 mb-2">
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
            title="Pindahkan status banyak antrean ke 'Cek Admin' (1 baris 1 Gmail)"
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Cek Bulk</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBulkConfirmModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Konfirmasi terima banyak akun sekaligus (1 baris 1 Gmail)"
          >
            <ListCheck className="w-4 h-4" />
            <span>Terima Bulk</span>
          </button>
          <button
            type="button"
            onClick={() => setShowBulkRejectModal(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white text-xs font-black shadow-md shadow-rose-500/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Tolak banyak akun sekaligus (1 baris 1 Gmail) dengan alasan penolakan"
          >
            <ListX className="w-4 h-4" />
            <span>Tolak Bulk</span>
          </button>
        </div>
      </div>

      {/* SAKLAR OPERASIONAL LAYANAN (TUTUP / BUKA) */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
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
          {/* 1. TUTUP / BUKA PENARIKAN */}
          <button
            type="button"
            onClick={handleToggleWithdrawal}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
              settings.withdrawalOpen !== false
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
            title="Klik untuk membuka atau menutup pengajuan penarikan saldo (WD)"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.withdrawalOpen !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <Wallet className="w-3.5 h-3.5" />
            <span>Penarikan: {settings.withdrawalOpen !== false ? 'BUKA' : 'TUTUP'}</span>
          </button>

          {/* 2. TUTUP / BUKA GENERATE */}
          <button
            type="button"
            onClick={handleToggleGenerator}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
              settings.generatorOpen !== false
                ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
            title="Klik untuk membuka atau menutup generator nama akun Gmail"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.generatorOpen !== false ? 'bg-purple-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate: {settings.generatorOpen !== false ? 'BUKA' : 'TUTUP'}</span>
          </button>

          {/* 3. TUTUP / BUKA STOR AN KHUSUS */}
          <button
            type="button"
            onClick={handleToggleStoranKhusus}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
              settings.storanKhususOpen !== false
                ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
            title="Klik untuk membuka atau menutup storan Gmail Khusus (3k / akun)"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.storanKhususOpen !== false ? 'bg-blue-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <Layers className="w-3.5 h-3.5" />
            <span>STOR Khusus: {settings.storanKhususOpen !== false ? 'BUKA' : 'TUTUP'}</span>
          </button>

          {/* 4. TUTUP / BUKA STORAN BEBAS */}
          <button
            type="button"
            onClick={handleToggleStoranBebas}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
              settings.storanBebasOpen !== false
                ? 'bg-teal-50 text-teal-800 border-teal-300 hover:bg-teal-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
            title="Klik untuk membuka atau menutup storan Gmail Bebas (2.7k / akun)"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.storanBebasOpen !== false ? 'bg-teal-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <Globe className="w-3.5 h-3.5" />
            <span>STOR Bebas: {settings.storanBebasOpen !== false ? 'BUKA' : 'TUTUP'}</span>
          </button>

          {/* 5. MASTER SEMUA STOR */}
          <button
            type="button"
            onClick={handleToggleSemuaStoran}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition border cursor-pointer active:scale-95 shadow-2xs ${
              settings.storanOpen
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
            title="Master switch untuk seluruh penerimaan akun baru"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.storanOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>Semua STOR: {settings.storanOpen ? 'BUKA' : 'TUTUP'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 p-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        {[
          { id: 'all_stor', label: `All STOR / Stok User (${submissionsList.length})`, icon: Layers },
          {
            id: 'yesterday_pending',
            label: `Pendingan Kemarin (${pendingYesterdayCount})`,
            icon: History,
            highlight: pendingYesterdayCount > 0 ? 'amber' : undefined,
          },
          {
            id: 'all_cek_admin',
            label: `All Cek Admin (${cekAdminCount})`,
            icon: ClipboardCheck,
            highlight: cekAdminCount > 0 ? 'blue' : undefined,
          },
          { id: 'stats', label: 'Statistik & Ringkasan', icon: TrendingUp },
          { id: 'stock', label: `Stok Generator (${availableStock.length})`, icon: Sparkles },
          { id: 'submissions', label: `Antrean Pending (${submissionPending})`, icon: UploadCloud },
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
          let btnClass = isActive
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50';
          if (isActive && tab.highlight === 'amber') {
            btnClass = 'bg-amber-600 text-white shadow-xs';
          } else if (!isActive && tab.highlight === 'amber') {
            btnClass = 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200';
          } else if (isActive && tab.highlight === 'blue') {
            btnClass = 'bg-blue-600 text-white shadow-xs';
          } else if (!isActive && tab.highlight === 'blue') {
            btnClass = 'text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200';
          }
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${btnClass}`}
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
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Total Pengguna</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{usersList.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Akun terdaftar di database</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Submission Hari Ini</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-700">{submissionHariIni}</div>
              <div className="text-[11px] text-slate-400 mt-1">Tanggal: {todayStr}</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Total Saldo User</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700">
                {formatRupiah(totalSaldoUser)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Kewajiban saldo aktif</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Total Dicairkan</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-sky-700">
                {formatRupiah(totalPembayaranSelesai)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Penarikan berstatus Selesai</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-amber-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-700">Submission Pending</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-3xl font-black text-amber-600 mt-2">{submissionPending}</div>
              <p className="text-xs text-slate-500 mt-1">Perlu segera diverifikasi admin</p>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700">Submission Diterima</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-black text-emerald-600 mt-2">{submissionDiterima}</div>
              <p className="text-xs text-slate-500 mt-1">Data sah dan saldo terbayar</p>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-700">Submission Ditolak</span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-3xl font-black text-rose-600 mt-2">{submissionDitolak}</div>
              <p className="text-xs text-slate-500 mt-1">Format salah / duplikat / curang</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Total Stok Akun</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{gmailStockList.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Total akun di database</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-emerald-200/70 shadow-xs bg-emerald-50/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-700">Stok Tersedia (Fresh)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700">{availableStock.length}</div>
              <div className="text-[11px] text-emerald-600 mt-1">Siap diambil saat generate</div>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500">Stok Terpakai</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-700">{usedStock.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Sudah digenerate pengguna</div>
            </div>
            <div className={`rounded-3xl p-5 border shadow-xs transition ${
              settings.generatorOpen !== false
                ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold">Fitur Generator</span>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  settings.generatorOpen !== false ? 'bg-purple-600 animate-pulse' : 'bg-rose-600'
                }`} />
              </div>
              <div className="text-xl font-black tracking-tight">
                {settings.generatorOpen !== false ? 'BUKA (Aktif)' : 'TUTUP (Nonaktif)'}
              </div>
              <button
                type="button"
                onClick={() =>
                  updateSettings({ generatorOpen: settings.generatorOpen === false ? true : false })
                }
                className="mt-2 text-xs font-black underline hover:opacity-80 transition cursor-pointer"
              >
                {settings.generatorOpen !== false ? 'Tutup Fitur Generator' : 'Aktifkan Kembali Generator'}
              </button>
            </div>
          </div>

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
                        ? 'bg-white text-indigo-700 shadow-xs'
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
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
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
                {usedStock.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllUsed}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    title="Hapus semua akun berstatus terpakai"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Terpakai ({usedStock.length})</span>
                  </button>
                )}
                {gmailStockList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteAllStock}
                    className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    title="Kosongkan seluruh akun di generator"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Semua Stok ({gmailStockList.length})</span>
                  </button>
                )}
                {gmailStockList.length === 0 && (
                  <button
                    type="button"
                    onClick={handleResetStarterStock}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Isi 30 Akun Contoh</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={stockSearch}
                onChange={(e) => setStockSearch(e.target.value)}
                placeholder="Cari email Gmail di stok..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
            {loadingStock ? (
              <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Memuat stok akun Gmail...</span>
              </div>
            ) : filteredStock.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {stockSearch ? 'Tidak ada akun yang cocok' : 'Belum ada stok akun Gmail'}
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Tambahkan akun Gmail baru agar freelancer dapat melakukan generate akun.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3.5 w-12 text-center">#</th>
                      <th className="px-5 py-3.5">Alamat Gmail</th>
                      <th className="px-5 py-3.5">Password</th>
                      <th className="px-5 py-3.5">Status</th>
                      <th className="px-5 py-3.5">Keterangan</th>
                      <th className="px-5 py-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStock.map((item, idx) => {
                      const isAvail = item.status === 'available';
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition">
                          <td className="px-5 py-3.5 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                            <div className="flex items-center gap-2">
                              <span>{item.email}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(item.email);
                                  showToast('info', 'Disalin', item.email);
                                }}
                                className="text-slate-400 hover:text-indigo-600 transition cursor-pointer"
                                title="Salin email"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {item.password || settings.gmailDefaultPassword || 'sgsg1122'}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {isAvail ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>Tersedia</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span>Terpakai</span>
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                            {item.usedAt ? (
                              <span>Diambil: {formatIndonesianDateTime(item.usedAt)}</span>
                            ) : (
                              <span>Dibuat: {formatIndonesianDateTime(item.addedAt || item.createdAt || new Date().toISOString())}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStockItem(item);
                                  setEditStockEmail(item.email);
                                  setEditStockPass(
                                    item.password || settings.gmailDefaultPassword || 'sgsg1122'
                                  );
                                  setEditStockStatus(item.status);
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                title="Ubah Akun"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStockItem(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title="Hapus Akun"
                              >
                                <Trash2 className="w-4 h-4" />
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
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowBulkConfirmModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <ListCheck className="w-3.5 h-3.5" />
                    <span>Terima Bulk</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBulkRejectModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition flex items-center gap-1 cursor-pointer"
                  >
                    <ListX className="w-3.5 h-3.5" />
                    <span>Tolak Bulk</span>
                  </button>
                </div>
              </div>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari user, email, data..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {filteredSubs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 text-xs font-medium">
              Tidak ada data submission yang cocok.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubs.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">
                        {sub.userName || 'Freelancer'}
                      </span>
                      <span className="text-slate-400 ml-1.5">({sub.userEmail})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        {formatIndonesianDateTime(sub.createdAt)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
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
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 break-all select-all flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>{sub.dataContent}</span>
                  </div>

                  {sub.status === 'Ditolak' && sub.rejectionReason && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                      <strong>Alasan Penolakan:</strong> {sub.rejectionReason}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span>Imbalan: <strong className="text-blue-700">{formatRupiah(sub.rewardAmount || 3000)}</strong></span>
                    </div>
                    {(sub.status === 'Pending' || sub.status === 'Cek Admin') && (
                      <div className="flex items-center gap-2">
                        {sub.status === 'Pending' && (
                          <button
                            type="button"
                            onClick={() => handleCheckSubmission(sub)}
                            disabled={processingSubId === sub.id}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Cek Admin</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalSub(sub);
                            setRejectionReason(PRESET_REASONS[0]);
                          }}
                          disabled={processingSubId === sub.id}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition cursor-pointer"
                        >
                          Tolak
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAcceptSubmission(sub)}
                          disabled={processingSubId === sub.id}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Terima (+{formatRupiah(sub.rewardAmount || 3000)})</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          {/* Status Penarikan Banner & Toggle */}
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs transition ${
              settings.withdrawalOpen !== false
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  settings.withdrawalOpen !== false
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-black flex items-center gap-2">
                  <span>Status Layanan Penarikan Saldo:</span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-xs font-extrabold ${
                      settings.withdrawalOpen !== false
                        ? 'bg-emerald-200/80 text-emerald-900'
                        : 'bg-rose-200/80 text-rose-900'
                    }`}
                  >
                    {settings.withdrawalOpen !== false ? 'SEDANG BUKA' : 'SEDANG TUTUP'}
                  </span>
                </div>
                <p className="text-xs opacity-85 mt-0.5">
                  {settings.withdrawalOpen !== false
                    ? 'Pengguna dapat mengajukan penarikan saldo DANA dan GoPay.'
                    : 'Pengajuan penarikan baru ditutup sementara bagi semua freelancer.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleWithdrawal}
              className={`px-4 py-2 rounded-xl text-xs font-black shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ${
                settings.withdrawalOpen !== false
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{settings.withdrawalOpen !== false ? 'Tutup Penarikan' : 'Buka Penarikan'}</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                {(['Pending', 'Selesai', 'Ditolak', 'All'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setWithFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      withFilter === f
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari user, nomor, penerima..."
                  value={withSearch}
                  onChange={(e) => setWithSearch(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {filteredWiths.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200/80 text-xs font-medium">
              Tidak ada data penarikan yang cocok.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWiths.map((w) => (
                <div
                  key={w.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{w.userName || 'User'}</span>
                      <span className="text-slate-400 ml-1.5">({w.userEmail})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400">
                        {formatIndonesianDateTime(w.createdAt)}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold">Nominal Tarik:</span>
                      <strong className="text-sm font-black text-blue-700">
                        {formatRupiah(w.amount)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Metode & Tujuan:</span>
                      <strong className="text-slate-800">
                        {w.method} · {w.targetNumber}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Nama Pemilik:</span>
                      <strong className="text-slate-800">{w.recipientName}</strong>
                    </div>
                  </div>

                  {w.status === 'Pending' && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalWith(w);
                          setWithRejectionReason('Nomor e-wallet tidak valid atau nama tidak sesuai');
                        }}
                        disabled={processingWithId === w.id}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition cursor-pointer"
                      >
                        Tolak & Refund Saldo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMarkWithdrawalPaid(w)}
                        disabled={processingWithId === w.id}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Konfirmasi Pembayaran Selesai</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Cari berdasarkan nama, email, UID..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2 rounded-xl border border-slate-300 focus:border-indigo-500 text-xs outline-none"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setUserSortMode('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  userSortMode === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua User ({usersList.length})
              </button>
              <button
                type="button"
                onClick={() => setUserSortMode('highest_balance')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  userSortMode === 'highest_balance'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25 ring-2 ring-amber-300'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Saldo Terbanyak</span>
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
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenBalanceModal(u, 'add')}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1 border border-indigo-200 cursor-pointer"
                    >
                      <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ubah Saldo</span>
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

      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 max-w-4xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pengaturan Operasional & Harga</h2>
            <p className="text-xs text-slate-500">
              Perubahan disimpan langsung ke database Firestore dan aktif secara realtime
            </p>
          </div>

          <div className="space-y-5">
            {/* SAKLAR BUKA / TUTUP FITUR OPERASIONAL */}
            <div className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Power className="w-4 h-4 text-indigo-600" />
                    <span>Kontrol Buka / Tutup Layanan (Operasional)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Saklar realtime untuk mengaktifkan atau menonaktifkan fitur bagi pengguna
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. TUTUP / BUKA PENARIKAN */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        settings.withdrawalOpen !== false
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">Penarikan Saldo</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                            settings.withdrawalOpen !== false
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {settings.withdrawalOpen !== false ? 'BUKA' : 'TUTUP'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Pencairan dana ke DANA / GoPay
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleWithdrawal}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shrink-0 ${
                      settings.withdrawalOpen !== false
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs'
                    }`}
                  >
                    {settings.withdrawalOpen !== false ? 'Tutup' : 'Buka'}
                  </button>
                </div>

                {/* 2. TUTUP / BUKA GENERATE */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        settings.generatorOpen !== false
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">Generator Akun</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                            settings.generatorOpen !== false
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {settings.generatorOpen !== false ? 'BUKA' : 'TUTUP'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Ambil nama Gmail dari stok admin
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleGenerator}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shrink-0 ${
                      settings.generatorOpen !== false
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-purple-600 hover:bg-purple-700 text-white shadow-2xs'
                    }`}
                  >
                    {settings.generatorOpen !== false ? 'Tutup' : 'Buka'}
                  </button>
                </div>

                {/* 3. TUTUP / BUKA STOR AN KHUSUS */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        settings.storanKhususOpen !== false
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      <Layers className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">STOR an Khusus</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                            settings.storanKhususOpen !== false
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {settings.storanKhususOpen !== false ? 'BUKA (3k)' : 'TUTUP'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Setoran akun hasil generate (Rp 3.000)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleStoranKhusus}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shrink-0 ${
                      settings.storanKhususOpen !== false
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                    }`}
                  >
                    {settings.storanKhususOpen !== false ? 'Tutup' : 'Buka'}
                  </button>
                </div>

                {/* 4. TUTUP / BUKA STORAN BEBAS */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        settings.storanBebasOpen !== false
                          ? 'bg-teal-50 text-teal-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 truncate">STOR an Bebas</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                            settings.storanBebasOpen !== false
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {settings.storanBebasOpen !== false ? 'BUKA (2.7k)' : 'TUTUP'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Setoran nama bebas kreasi (Rp 2.700)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleStoranBebas}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shrink-0 ${
                      settings.storanBebasOpen !== false
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                        : 'bg-teal-600 hover:bg-teal-700 text-white shadow-2xs'
                    }`}
                  >
                    {settings.storanBebasOpen !== false ? 'Tutup' : 'Buka'}
                  </button>
                </div>
              </div>

              {/* 5. MASTER SWITCH SEMUA STOR */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-100 to-indigo-50/40 border border-slate-300/70 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-3 h-3 rounded-full shrink-0 ${
                      settings.storanOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>Master Switch Semua Layanan Storan</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-black ${
                          settings.storanOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {settings.storanOpen ? 'BUKA' : 'TUTUP'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Saklar utama untuk mengizinkan atau memblokir seluruh penerimaan akun Gmail baru
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleSemuaStoran}
                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer active:scale-95 shrink-0 ${
                    settings.storanOpen
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {settings.storanOpen ? 'Tutup Semua STOR' : 'Buka Semua STOR'}
                </button>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Harga Imbalan Per Submission (Rp)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={tempPrice}
                  onChange={(e) => setTempPrice(Number(e.target.value))}
                  className="w-48 px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm bg-white"
                />
                <span className="text-xs text-slate-500">
                  Default: Rp3.000.
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Minimum Penarikan Saldo (Rp)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={tempMinWithdrawal}
                  onChange={(e) => setTempMinWithdrawal(Number(e.target.value))}
                  className="w-48 px-3.5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm bg-white"
                />
                <span className="text-xs text-slate-500">Default: Rp4.000</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50/70 border border-rose-200/90 space-y-2.5">
              <label className="block text-xs font-black text-rose-950 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-rose-600" />
                <span>Password Wajib Akun Gmail</span>
              </label>
              <input
                type="text"
                required
                value={tempGmailPassword}
                onChange={(e) => setTempGmailPassword(e.target.value)}
                className="w-full sm:w-60 px-3.5 py-2.5 rounded-xl border border-rose-300 font-mono font-black text-rose-700 text-sm bg-white focus:ring-2 focus:ring-rose-500/20 outline-none"
              />
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-2.5">
              <label className="block text-xs font-black text-emerald-950 flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-600" />
                <span>Nomor WhatsApp Admin</span>
              </label>
              <input
                type="text"
                required
                value={tempWhatsApp}
                onChange={(e) => setTempWhatsApp(e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full sm:w-72 px-3.5 py-2.5 rounded-xl border border-emerald-300 font-mono font-black text-emerald-900 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jam Operasional Storan
              </label>
              <input
                type="text"
                value={tempSchedule}
                onChange={(e) => setTempSchedule(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Isi Pengumuman Storan
              </label>
              <textarea
                rows={4}
                value={tempAnnouncement}
                onChange={(e) => setTempAnnouncement(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveAllSettings}
                disabled={savingSettings}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {savingSettings ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SINGLE SUBMISSION REJECT MODAL (PREVIOUSLY MISSING!) */}
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
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-black">Tolak Akun Gmail</h3>
                    <p className="text-xs text-rose-100 font-mono truncate max-w-[240px]">
                      {rejectModalSub.dataContent.split('|')[0].trim()}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalSub(null)}
                  className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-black text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <MessageSquareWarning className="w-4 h-4 text-rose-600" />
                    <span>Pilih / Tulis Alasan Penolakan:</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {PRESET_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setRejectionReason(reason)}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer ${
                          rejectionReason === reason
                            ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-rose-50'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Tuliskan alasan penolakan yang akan dilihat user..."
                    className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalSub(null)}
                    disabled={processingSubId === rejectModalSub.id}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRejectSubmission}
                    disabled={processingSubId === rejectModalSub.id || !rejectionReason.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {processingSubId === rejectModalSub.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        <span>Konfirmasi Tolak</span>
                      </>
                    )}
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
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="bg-gradient-to-r from-rose-600 to-red-700 p-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black">Tolak Penarikan Saldo</h3>
                  <p className="text-xs text-rose-100">
                    Nominal: {formatRupiah(rejectModalWith.amount)} ke {rejectModalWith.method}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalWith(null)}
                  className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  Saldo sebesar <strong>{formatRupiah(rejectModalWith.amount)}</strong> akan otomatis dikembalikan ke akun pengguna.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Alasan Penolakan:
                  </label>
                  <textarea
                    rows={3}
                    value={withRejectionReason}
                    onChange={(e) => setWithRejectionReason(e.target.value)}
                    placeholder="Contoh: Nomor e-wallet tidak terdaftar atau nama pemilik tidak cocok."
                    className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20 outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalWith(null)}
                    disabled={processingWithId === rejectModalWith.id}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRejectWithdrawal}
                    disabled={processingWithId === rejectModalWith.id || !withRejectionReason.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {processingWithId === rejectModalWith.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span>Tolak & Refund</span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* USER DETAIL MODAL */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    {selectedUser.displayName ? selectedUser.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{selectedUser.displayName}</h3>
                    <p className="text-xs text-slate-500">{selectedUser.email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Saldo Aktif:</span>
                  <strong className="text-sm font-black text-indigo-700">
                    {formatRupiah(selectedUser.balance || 0)}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Total Penghasilan:</span>
                  <strong className="text-sm font-black text-slate-800">
                    {formatRupiah(selectedUser.totalEarned || 0)}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Total Dicairkan:</span>
                  <strong className="text-sm font-black text-slate-800">
                    {formatRupiah(selectedUser.totalWithdrawn || 0)}
                  </strong>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block text-[11px]">Status Akun:</span>
                  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                    selectedUser.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedUser.status === 'active' ? 'Aktif' : 'Suspended'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="text-slate-400 font-semibold">User ID (UID):</div>
                <div className="font-mono text-slate-800 select-all">{selectedUser.uid}</div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenBalanceModal(selectedUser, 'add');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Ubah / Tambah Saldo
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
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
                <h3 className="text-base font-bold text-slate-900">
                  Ubah Saldo Pengguna
                </h3>
                <button
                  type="button"
                  onClick={() => setBalanceModalUser(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                User: <strong>{balanceModalUser.displayName}</strong> ({balanceModalUser.email})
                <br />
                Saldo saat ini: <strong className="text-indigo-600">{formatRupiah(balanceModalUser.balance || 0)}</strong>
              </p>

              <form onSubmit={handleSaveUserBalance} className="space-y-3.5">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBalanceMode('add')}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      balanceMode === 'add'
                        ? 'bg-indigo-600 text-white border-indigo-600'
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
                        ? 'bg-indigo-600 text-white border-indigo-600'
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-sm outline-none focus:border-indigo-500"
                  />
                </div>

                {balanceMode === 'add' && (
                  <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeTotalEarned}
                      onChange={(e) => setIncludeTotalEarned(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
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
                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition cursor-pointer"
                  >
                    {savingBalance ? 'Menyimpan...' : 'Simpan Saldo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD SINGLE STOCK MODAL */}
      <AnimatePresence>
        {showAddSingleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">Tambah Akun ke Stok Generator</h3>
              <form onSubmit={handleSaveSingleStock} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Gmail (@gmail.com)
                  </label>
                  <input
                    type="email"
                    required
                    value={newStockEmail}
                    onChange={(e) => setNewStockEmail(e.target.value)}
                    placeholder="contoh.nama@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newStockPass}
                    onChange={(e) => setNewStockPass(e.target.value)}
                    placeholder={`Default: ${settings.gmailDefaultPassword || 'sgsg1122'}`}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSingleModal(false)}
                    className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white cursor-pointer"
                  >
                    Tambah
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD BULK STOCK MODAL */}
      <AnimatePresence>
        {showAddBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">Import Massal Stok Gmail</h3>
              <p className="text-xs text-slate-500">
                Tempel daftar akun Gmail (1 baris 1 email, atau email|password):
              </p>
              <form onSubmit={handleSaveBulkStock} className="space-y-3">
                <textarea
                  rows={6}
                  required
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  placeholder="akun1@gmail.com&#10;akun2@gmail.com&#10;akun3@gmail.com|pass123"
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 outline-none focus:border-indigo-500"
                />
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBulkModal(false)}
                    className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white cursor-pointer"
                  >
                    Import Sekarang
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT STOCK MODAL */}
      <AnimatePresence>
        {editingStockItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">Ubah Akun Stok</h3>
              <form onSubmit={handleUpdateStockItem} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editStockEmail}
                    onChange={(e) => setEditStockEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={editStockPass}
                    onChange={(e) => setEditStockPass(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStockStatus}
                    onChange={(e) => setEditStockStatus(e.target.value as 'available' | 'used')}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 outline-none"
                  >
                    <option value="available">Tersedia (Fresh)</option>
                    <option value="used">Terpakai</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingStockItem(null)}
                    className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-indigo-600 text-white cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRMATION DIALOG */}
      <AnimatePresence>
        {stockConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-slate-900">{stockConfirm.title}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{stockConfirm.description}</p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStockConfirm(null)}
                  disabled={isConfirmingAction}
                  className="flex-1 py-2.5 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteConfirm}
                  disabled={isConfirmingAction}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl text-white cursor-pointer ${
                    stockConfirm.confirmColor === 'red'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : stockConfirm.confirmColor === 'amber'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isConfirmingAction ? 'Memproses...' : stockConfirm.confirmText}
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
