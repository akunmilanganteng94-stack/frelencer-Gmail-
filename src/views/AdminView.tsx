import { useState, useEffect, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { formatRupiah, formatIndonesianDateTime } from '../lib/utils';
import {
  UserProfile,
  Submission,
  Withdrawal,
  NavigationTab,
  OperationType,
  GmailStockItem,
} from '../types';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  runTransaction,
} from 'firebase/firestore';
import { db, handleFirestoreError } from '../lib/firebase';
import { useGmailStock } from '../hooks/useGmailStock';
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
  AlertTriangle,
  Search,
  Filter,
  Check,
  Ban,
  ArrowRight,
  Eye,
  RefreshCw,
  Plus,
  Trash2,
  Lock,
  KeyRound,
  Copy,
  Mail,
  Layers,
  Edit3,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GmailLogo } from '../components/GmailLogo';

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
    'stats' | 'submissions' | 'withdrawals' | 'users' | 'settings' | 'stock'
  >('stats');

  // Realtime datasets
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [submissionsList, setSubmissionsList] = useState<Submission[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<Withdrawal[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Submissions review state
  const [subFilter, setSubFilter] = useState<'All' | 'Pending' | 'Diterima' | 'Ditolak'>('Pending');
  const [subSearch, setSubSearch] = useState('');
  const [rejectModalSub, setRejectModalSub] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingSubId, setProcessingSubId] = useState<string | null>(null);

  // Withdrawals review state
  const [withFilter, setWithFilter] = useState<'All' | 'Pending' | 'Selesai' | 'Ditolak'>('Pending');
  const [withSearch, setWithSearch] = useState('');
  const [rejectModalWith, setRejectModalWith] = useState<Withdrawal | null>(null);
  const [withRejectionReason, setWithRejectionReason] = useState('');
  const [processingWithId, setProcessingWithId] = useState<string | null>(null);

  // User detail inspection
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Settings form state
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
  const [rulesList, setRulesList] = useState<string[]>(settings.rules);
  const [newRuleInput, setNewRuleInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Stock management UI state
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
  const [savingStock, setSavingStock] = useState(false);

  // In-app confirmation dialog for stock operations (replaces window.confirm)
  interface StockConfirmDialog {
    title: string;
    description: string;
    confirmText: string;
    confirmColor: 'red' | 'amber' | 'indigo';
    action: () => Promise<void>;
  }
  const [stockConfirm, setStockConfirm] = useState<StockConfirmDialog | null>(null);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);

  // Balance management modal state
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

  // Listeners for collections
  useEffect(() => {
    if (!isAdmin) return;

    // Listen to users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uList: UserProfile[] = [];
      snap.forEach((d) => uList.push(d.data() as UserProfile));
      setUsersList(uList);
    });

    // Listen to submissions
    const unsubSubs = onSnapshot(collection(db, 'submissions'), (snap) => {
      const sList: Submission[] = [];
      snap.forEach((d) => sList.push({ id: d.id, ...(d.data() as Omit<Submission, 'id'>) }));
      sList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSubmissionsList(sList);
    });

    // Listen to withdrawals
    const unsubWiths = onSnapshot(collection(db, 'withdrawals'), (snap) => {
      const wList: Withdrawal[] = [];
      snap.forEach((d) => wList.push({ id: d.id, ...(d.data() as Omit<Withdrawal, 'id'>) }));
      wList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setWithdrawalsList(wList);
      setLoadingData(false);
    });

    return () => {
      unsubUsers();
      unsubSubs();
      unsubWiths();
    };
  }, [isAdmin]);

  // Synchronize settings state when settings change
  useEffect(() => {
    setTempPrice(settings.pricePerSubmission);
    setTempMinWithdrawal(settings.minWithdrawal);
    setTempSchedule(settings.storanSchedule);
    setTempAnnouncement(settings.announcement);
    setTempDailyGenerateLimit(settings.dailyGenerateLimit || 10);
    setRulesList(settings.rules);
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
          className="px-5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs"
        >
          Kembali ke Dashboard
        </button>
      </div>
    );
  }

  // --- ACTIONS: SUBMISSIONS ---
  const handleAcceptSubmission = async (sub: Submission) => {
    setProcessingSubId(sub.id);
    try {
      const subRef = doc(db, 'submissions', sub.id);
      const userRef = doc(db, 'users', sub.userId);

      await runTransaction(db, async (transaction) => {
        const subDoc = await transaction.get(subRef);
        if (!subDoc.exists()) throw new Error('Submission tidak ditemukan.');

        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User tidak ditemukan.');

        const userData = userDoc.data();
        const currentBalance = userData.balance || 0;
        const currentEarned = userData.totalEarned || 0;

        // Update submission status
        transaction.update(subRef, {
          status: 'Diterima',
          reviewedAt: new Date().toISOString(),
          rejectionReason: '',
        });

        // Add reward to user balance & totalEarned
        transaction.update(userRef, {
          balance: currentBalance + sub.rewardAmount,
          totalEarned: currentEarned + sub.rewardAmount,
        });
      });

      showToast(
        'success',
        'Submission Diterima',
        `Saldo ${formatRupiah(sub.rewardAmount)} otomatis ditambahkan ke akun ${sub.userName || sub.userEmail}.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast('error', 'Gagal Menerima', msg);
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

  // --- ACTIONS: WITHDRAWALS ---
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

      // Refund balance back to user
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

  // --- ACTIONS: USER MANAGEMENT ---
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

      // Optimistic update
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

  // --- ACTIONS: SETTINGS ---
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
      });
      showToast('success', 'Pengaturan Disimpan', 'Konfigurasi sistem, WhatsApp, limit generate, & password Gmail berhasil diperbarui.');
    } catch (err: unknown) {
      showToast('error', 'Gagal Menyimpan', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingSettings(false);
    }
  };

  // --- ACTIONS: GMAIL STOCK MANAGEMENT ---
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

  // Statistical calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const submissionHariIni = submissionsList.filter((s) => s.createdAt.startsWith(todayStr)).length;
  const submissionPending = submissionsList.filter((s) => s.status === 'Pending').length;
  const submissionDiterima = submissionsList.filter((s) => s.status === 'Diterima').length;
  const submissionDitolak = submissionsList.filter((s) => s.status === 'Ditolak').length;

  const totalSaldoUser = usersList.reduce((acc, u) => acc + (u.balance || 0), 0);
  const totalPenarikanPending = withdrawalsList
    .filter((w) => w.status === 'Pending')
    .reduce((acc, w) => acc + (w.amount || 0), 0);
  const totalPembayaranSelesai = withdrawalsList
    .filter((w) => w.status === 'Selesai')
    .reduce((acc, w) => acc + (w.amount || 0), 0);

  // Filtered submissions list
  const filteredSubs = submissionsList.filter((sub) => {
    const matchesFilter = subFilter === 'All' || sub.status === subFilter;
    const matchesSearch =
      sub.id.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.userName?.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.userEmail?.toLowerCase().includes(subSearch.toLowerCase()) ||
      sub.dataContent.toLowerCase().includes(subSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Filtered withdrawals list
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

  // Filtered users list
  const filteredUsers = usersList.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.uid.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Filtered Gmail stock list
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
      {/* Header */}
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
            Kelola verifikasi akun Gmail, setting password wajib (default sgsg1122), pencairan saldo, dan data pengguna
          </p>
        </div>

        {/* Global OPEN/CLOSE switches */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Storan Switch */}
          <button
            onClick={() => updateSettings({ storanOpen: !settings.storanOpen })}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition border ${
              settings.storanOpen
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.storanOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>Storan: {settings.storanOpen ? 'OPEN' : 'CLOSE'}</span>
          </button>

          {/* Penarikan Switch */}
          <button
            onClick={() => updateSettings({ withdrawalOpen: !settings.withdrawalOpen })}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition border ${
              settings.withdrawalOpen
                ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                settings.withdrawalOpen ? 'bg-blue-500' : 'bg-amber-500'
              }`}
            />
            <span>Penarikan: {settings.withdrawalOpen ? 'OPEN' : 'CLOSE'}</span>
          </button>

          {/* Generator Switch */}
          <button
            onClick={() =>
              updateSettings({ generatorOpen: settings.generatorOpen === false ? true : false })
            }
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition border ${
              settings.generatorOpen !== false
                ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100'
                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <GmailLogo className="w-3.5 h-3.5" />
            <span
              className={`w-2 h-2 rounded-full ${
                settings.generatorOpen !== false ? 'bg-purple-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span>Generator: {settings.generatorOpen !== false ? 'OPEN' : 'CLOSE'}</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-1 p-1 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        {[
          { id: 'stats', label: 'Statistik & Ringkasan', icon: TrendingUp },
          { id: 'stock', label: `Stok Generator (${availableStock.length})`, icon: Layers },
          { id: 'submissions', label: `Gmail (${submissionPending})`, icon: UploadCloud },
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
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: STATS & RINGKASAN */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total User */}
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

            {/* Submission Hari Ini */}
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

            {/* Total Saldo User */}
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

            {/* Total Pembayaran Selesai */}
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

          {/* Breakdown Submission Stats */}
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

          {/* Quick Action Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-blue-900 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">Ada {submissionPending} antrean submission menunggu</h3>
              <p className="text-xs text-indigo-200 mt-0.5">
                Pastikan pengecekan data diselesaikan dalam 24–30 jam sesuai standar SLA operasional.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('submissions')}
              className="px-5 py-2.5 rounded-xl bg-white text-indigo-950 font-bold text-xs hover:bg-indigo-50 transition"
            >
              Periksa Sekarang →
            </button>
          </div>
        </div>
      )}

      {/* TAB: MANAJEMEN STOK AKUN GMAIL */}
      {activeTab === 'stock' && (
        <div className="space-y-5">
          {/* Top Stock Summary & Generator Status Banner */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Stok */}
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

            {/* Stok Tersedia */}
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

            {/* Stok Terpakai */}
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

            {/* Status Fitur Generator */}
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

          {/* Quick Setting: Nominal Limit Generate User per Hari */}
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-3xl p-4 sm:p-5 border border-indigo-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-black text-indigo-950 flex items-center gap-2">
                  <span>Nominal Batas Generate User per Hari:</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white font-mono font-bold text-xs">
                    {settings.dailyGenerateLimit || 10} Akun/User/Hari
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Setiap freelancer dibatasi maksimal mengambil nominal akun ini per hari. Ubah angka di samping lalu klik Simpan.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={tempDailyGenerateLimit}
                onChange={(e) => setTempDailyGenerateLimit(Math.max(1, Number(e.target.value)))}
                className="w-24 px-3 py-2 rounded-xl border border-indigo-300 font-mono font-bold text-xs bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  const val = Math.max(1, Number(tempDailyGenerateLimit) || 10);
                  await updateSettings({ dailyGenerateLimit: val });
                  showToast('success', 'Batas Kuota Disimpan', `Batas generate akun user diubah menjadi ${val} akun/hari.`);
                }}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition shrink-0 cursor-pointer"
              >
                Simpan Kuota
              </button>
            </div>
          </div>

          {/* Action Toolbar & Filters */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              {/* Filter Tabs */}
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      stockFilter === f.id
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(true)}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah 1 Akun</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddBulkModal(true)}
                  className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  <span>Import Massal</span>
                </button>
                {usedStock.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllUsed}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
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
                    className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
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
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Isi 30 Akun Contoh</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search Input */}
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

          {/* Stock Table / List */}
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
                  {stockSearch
                    ? `Tidak ditemukan akun dengan kata kunci "${stockSearch}".`
                    : 'Tambahkan akun Gmail baru agar freelancer dapat melakukan generate akun.'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSingleModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition"
                  >
                    + Tambah Akun Sekarang
                  </button>
                  {gmailStockList.length === 0 && (
                    <button
                      type="button"
                      onClick={handleResetStarterStock}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                    >
                      Isi 30 Akun Contoh
                    </button>
                  )}
                </div>
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
                                className="text-slate-400 hover:text-indigo-600 transition"
                                title="Salin email"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 font-mono text-slate-600">
                            <div className="flex items-center gap-2">
                              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {item.password || settings.gmailDefaultPassword || 'sgsg1122'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const pw = item.password || settings.gmailDefaultPassword || 'sgsg1122';
                                  navigator.clipboard.writeText(pw);
                                  showToast('info', 'Disalin', `Password: ${pw}`);
                                }}
                                className="text-slate-400 hover:text-indigo-600 transition"
                                title="Salin password"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
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
                              <span>
                                Diambil: {formatIndonesianDateTime(item.usedAt)}
                              </span>
                            ) : (
                              <span>Dibuat: {formatIndonesianDateTime(item.createdAt)}</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit button */}
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
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                title="Ubah Akun"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => handleDeleteStockItem(item)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
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

      {/* TAB 2: KELOLA SUBMISSION */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* Filter */}
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                {(['Pending', 'Diterima', 'Ditolak', 'All'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSubFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      subFilter === f
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Search */}
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

          {/* Submissions queue table / card */}
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

                  {/* Submission Content */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Akun Gmail Disetor:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(sub.dataContent);
                            showToast('info', 'Disalin', 'Alamat Gmail berhasil disalin.');
                          }}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-md"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Salin Email</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(settings.gmailDefaultPassword || 'sgsg1122');
                            showToast('info', 'Disalin', `Password (${settings.gmailDefaultPassword || 'sgsg1122'}) berhasil disalin.`);
                          }}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-md"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Salin Pass ({settings.gmailDefaultPassword || 'sgsg1122'})</span>
                        </button>
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 break-all select-all flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{sub.dataContent}</span>
                    </div>
                  </div>

                  {/* Rejection reason if any */}
                  {sub.status === 'Ditolak' && sub.rejectionReason && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                      <strong>Alasan Penolakan:</strong> {sub.rejectionReason}
                    </div>
                  )}

                  {/* Action row */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="text-xs text-slate-600">
                      Imbalan: <strong className="text-blue-700">{formatRupiah(sub.rewardAmount)}</strong>
                    </div>

                    {/* Buttons if Pending */}
                    {sub.status === 'Pending' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRejectModalSub(sub)}
                          disabled={processingSubId === sub.id}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition"
                        >
                          Tolak
                        </button>
                        <button
                          onClick={() => handleAcceptSubmission(sub)}
                          disabled={processingSubId === sub.id}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Terima (+{formatRupiah(sub.rewardAmount)})</span>
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

      {/* TAB 3: KELOLA PENARIKAN */}
      {activeTab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              {/* Filter */}
              <div className="flex gap-1.5 p-1 bg-slate-100 rounded-xl">
                {(['Pending', 'Selesai', 'Ditolak', 'All'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setWithFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      withFilter === f
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Search */}
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

                  {/* Details of payment */}
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
                        {w.method} • {w.targetNumber}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold">Nama Pemilik:</span>
                      <strong className="text-slate-800">{w.recipientName}</strong>
                    </div>
                  </div>

                  {w.status === 'Ditolak' && w.rejectionReason && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                      <strong>Alasan Ditolak:</strong> {w.rejectionReason}
                    </div>
                  )}

                  {/* Actions for Pending */}
                  {w.status === 'Pending' && (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setRejectModalWith(w)}
                        disabled={processingWithId === w.id}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition"
                      >
                        Tolak & Refund Saldo
                      </button>
                      <button
                        onClick={() => handleMarkWithdrawalPaid(w)}
                        disabled={processingWithId === w.id}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
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

      {/* TAB 4: KELOLA USER */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
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
            <span className="text-xs text-slate-500 font-semibold">{filteredUsers.length} User</span>
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
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">
                        UID: {u.uid}
                      </p>
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
                      className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenBalanceModal(u, 'add')}
                      className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition flex items-center gap-1 border border-indigo-200"
                      title="Ubah atau Tambah Saldo Pengguna"
                    >
                      <Wallet className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Ubah/Tambah Saldo</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleSuspendUser(u)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
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

      {/* TAB 5: PENGATURAN SISTEM */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 max-w-4xl">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pengaturan Operasional & Harga</h2>
            <p className="text-xs text-slate-500">
              Perubahan disimpan langsung ke database Firestore dan aktif secara realtime
            </p>
          </div>

          <div className="space-y-5">
            {/* Harga Per Submission */}
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
                  Default: Rp3.000. Harga ini otomatis digunakan pada submission berikutnya.
                </span>
              </div>
            </div>

            {/* Minimum Penarikan */}
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

            {/* Password Wajib Akun Gmail (Fitur Khusus Admin) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 to-orange-50/70 border border-rose-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-rose-950 flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-rose-600" />
                  <span>Password Wajib Akun Gmail (Ketentuan Freelancer)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setTempGmailPassword('sgsg1122')}
                  className="text-[11px] font-bold text-rose-700 hover:text-rose-900 underline"
                >
                  Reset ke 'sgsg1122'
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="text"
                  required
                  value={tempGmailPassword}
                  onChange={(e) => setTempGmailPassword(e.target.value)}
                  placeholder="Contoh: sgsg1122"
                  className="w-full sm:w-60 px-3.5 py-2.5 rounded-xl border border-rose-300 font-mono font-black text-rose-700 text-sm bg-white focus:ring-2 focus:ring-rose-500/20 outline-none"
                />
                <span className="text-xs text-rose-800 leading-tight">
                  Freelancer wajib mendaftarkan akun Gmail dengan password ini. Jika diubah, form storan dan generator akun otomatis mengikuti.
                </span>
              </div>
            </div>

            {/* Nomor WhatsApp Admin */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-emerald-950 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  <span>Nomor WhatsApp Admin (Pop-up Hubungi Admin)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setTempWhatsApp('6285199219856')}
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline"
                >
                  Reset ke '6285199219856'
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative w-full sm:w-72">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                    wa.me/
                  </span>
                  <input
                    type="text"
                    required
                    value={tempWhatsApp}
                    onChange={(e) => setTempWhatsApp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="6285199219856"
                    className="w-full pl-16 pr-3.5 py-2.5 rounded-xl border border-emerald-300 font-mono font-black text-emerald-900 text-sm bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none"
                  />
                </div>
                <span className="text-xs text-emerald-800 leading-tight">
                  Tautan otomatis mengarah ke <code className="bg-white px-1 py-0.5 rounded text-emerald-900 font-mono">wa.me/{tempWhatsApp}</code> saat freelancer menekan tombol Hubungi Admin.
                </span>
              </div>
            </div>

            {/* Fitur Generator Akun Gmail Toggle */}
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <label className="block text-xs font-black text-purple-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span>Fitur Generator Akun Gmail ({settings.generatorOpen !== false ? 'BUKA' : 'TUTUP'})</span>
                </label>
                <p className="text-xs text-purple-800 mt-0.5">
                  Admin dapat menutup fitur generator kapan saja jika stok Gmail sedang habis atau dibatasi.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateSettings({ generatorOpen: settings.generatorOpen === false ? true : false })
                }
                className={`px-4 py-2 rounded-xl text-xs font-black transition shrink-0 ${
                  settings.generatorOpen !== false
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                }`}
              >
                {settings.generatorOpen !== false ? '✓ Generator Sedang Buka (Klik Tutup)' : '✕ Generator Ditutup (Klik Buka)'}
              </button>
            </div>

            {/* Nominal Limit Generate User per Hari */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/90 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-indigo-950 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span>Nominal Limit Generate User per Hari</span>
                </label>
                <button
                  type="button"
                  onClick={() => setTempDailyGenerateLimit(10)}
                  className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 underline"
                >
                  Reset ke 10 akun
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={tempDailyGenerateLimit}
                    onChange={(e) => setTempDailyGenerateLimit(Math.max(1, Number(e.target.value)))}
                    className="w-32 px-3.5 py-2.5 rounded-xl border border-indigo-300 font-mono font-black text-indigo-900 text-sm bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <span className="text-xs font-bold text-indigo-900">Akun / Hari</span>
                </div>
                <span className="text-xs text-indigo-800 leading-tight">
                  Jumlah maksimal akun Gmail yang dapat di-generate oleh setiap akun freelancer per hari (24 jam). Jika kuota harian habis, user harus menunggu hari berikutnya.
                </span>
              </div>
            </div>

            {/* Jam Operasional */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Jam Operasional Storan
              </label>
              <input
                type="text"
                value={tempSchedule}
                onChange={(e) => setTempSchedule(e.target.value)}
                placeholder="Senin–Jumat: 07.00–17.00 WIB"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
              />
            </div>

            {/* Pengumuman Storan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Isi Pengumuman Storan (📢 Tampil di Halaman Depan)
              </label>
              <textarea
                rows={4}
                value={tempAnnouncement}
                onChange={(e) => setTempAnnouncement(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
              />
            </div>

            {/* Rules Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  Daftar Rules Storan (📋)
                </label>
                <span className="text-[11px] text-slate-400">{rulesList.length} Aturan</span>
              </div>

              <div className="space-y-2">
                {rulesList.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 w-5">{i + 1}.</span>
                    <input
                      type="text"
                      value={r}
                      onChange={(e) => {
                        const updated = [...rulesList];
                        updated[i] = e.target.value;
                        setRulesList(updated);
                      }}
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setRulesList(rulesList.filter((_, idx) => idx !== i))}
                      className="text-rose-500 hover:text-rose-700 p-1"
                      title="Hapus aturan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add rule row */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  placeholder="Tambah aturan baru..."
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-300"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newRuleInput.trim()) {
                      setRulesList([...rulesList, newRuleInput.trim()]);
                      setNewRuleInput('');
                    }
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah</span>
                </button>
              </div>
            </div>

            {/* Save CTA */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={handleSaveAllSettings}
                disabled={savingSettings}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition disabled:opacity-50 flex items-center gap-2"
              >
                {savingSettings ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TOLAK SUBMISSION (Wajib alasan) */}
      <AnimatePresence>
        {rejectModalSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2.5 text-rose-600">
                <XCircle className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900">Tolak Submission Data</h3>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                <div className="text-slate-500">
                  User: <strong>{rejectModalSub.userName}</strong> ({rejectModalSub.userEmail})
                </div>
                <div className="font-mono text-slate-700 break-all">
                  {rejectModalSub.dataContent}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Penolakan (Wajib & Terlihat oleh User)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Format data tidak valid / Data duplikat / Tidak memenuhi syarat rules"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalSub(null);
                    setRejectionReason('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejectSubmission}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
                >
                  Konfirmasi Tolak
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL TOLAK PENARIKAN (Refund) */}
      <AnimatePresence>
        {rejectModalWith && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-2.5 text-rose-600">
                <XCircle className="w-6 h-6" />
                <h3 className="text-base font-bold text-slate-900">Tolak Permohonan Penarikan</h3>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                Saldo sebesar <strong>{formatRupiah(rejectModalWith.amount)}</strong> akan otomatis
                dikembalikan ke saldo pengguna.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alasan Penolakan Penarikan
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Nomor e-wallet tidak aktif / Nama akun tidak sesuai / Limit transfer"
                  value={withRejectionReason}
                  onChange={(e) => setWithRejectionReason(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalWith(null);
                    setWithRejectionReason('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejectWithdrawal}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition"
                >
                  Tolak & Refund Saldo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DETAIL USER */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Detail Pengguna</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Nama:</span>
                  <strong className="text-slate-800">{selectedUser.displayName}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Email:</span>
                  <strong className="text-slate-800">{selectedUser.email}</strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">UID:</span>
                  <span className="font-mono text-slate-800">{selectedUser.uid}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Saldo Aktif:</span>
                  <div className="flex items-center gap-2">
                    <strong className="text-blue-700 font-extrabold">
                      {formatRupiah(selectedUser.balance || 0)}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleOpenBalanceModal(selectedUser, 'add')}
                      className="px-2 py-0.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-bold transition flex items-center gap-1"
                    >
                      <Wallet className="w-3 h-3" />
                      <span>Ubah / Tambah</span>
                    </button>
                  </div>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Total Penghasilan:</span>
                  <strong className="text-slate-800">
                    {formatRupiah(selectedUser.totalEarned || 0)}
                  </strong>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Status Akun:</span>
                  <strong
                    className={selectedUser.status === 'active' ? 'text-emerald-700' : 'text-rose-700'}
                  >
                    {selectedUser.status.toUpperCase()}
                  </strong>
                </div>
              </div>

              {/* Submissions by this user */}
              <div className="pt-2">
                <h4 className="text-xs font-bold text-slate-700 mb-2">Riwayat Submission User Ini:</h4>
                <div className="max-h-36 overflow-y-auto space-y-1.5">
                  {submissionsList
                    .filter((s) => s.userId === selectedUser.uid)
                    .map((s) => (
                      <div
                        key={s.id}
                        className="p-2 bg-slate-50 rounded-lg text-[11px] flex items-center justify-between"
                      >
                        <span className="font-mono truncate max-w-[200px]">{s.dataContent}</span>
                        <span className="font-bold">{s.status}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL TAMBAH 1 AKUN STOK GMAIL */}
        {showAddSingleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  <span>Tambah Akun Gmail ke Stok</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddSingleModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSingleStock} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Email Gmail *
                  </label>
                  <input
                    type="email"
                    required
                    value={newStockEmail}
                    onChange={(e) => setNewStockEmail(e.target.value)}
                    placeholder="contoh@gmail.com"
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Wajib diakhiri dengan @gmail.com
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password Akun (Opsional)
                  </label>
                  <input
                    type="text"
                    value={newStockPass}
                    onChange={(e) => setNewStockPass(e.target.value)}
                    placeholder={`Default: ${settings.gmailDefaultPassword || 'sgsg1122'}`}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Kosongkan untuk otomatis memakai password wajib sistem ({settings.gmailDefaultPassword || 'sgsg1122'}).
                  </p>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSingleModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingStock}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {savingStock ? 'Menyimpan...' : 'Simpan ke Stok'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL IMPORT MASSAL (BULK) */}
        {showAddBulkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-5 h-5 text-blue-600" />
                  <span>Import Massal Akun Gmail</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddBulkModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBulkStock} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Tempel daftar alamat email Gmail di bawah. Format didukung: <strong>1 email per baris</strong> atau format <strong>email|password</strong>.
                </p>

                <textarea
                  rows={8}
                  required
                  value={bulkInputText}
                  onChange={(e) => setBulkInputText(e.target.value)}
                  placeholder={`budi1@gmail.com\nbudi2@gmail.com|${settings.gmailDefaultPassword || 'sgsg1122'}\nbudi3@gmail.com`}
                  className="w-full p-3 text-xs font-mono rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none leading-relaxed"
                />

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Jumlah baris terdeteksi:{' '}
                    <strong>
                      {bulkInputText.split('\n').filter((l) => l.trim().length > 0).length}
                    </strong>
                  </span>
                  <span className="text-indigo-600 font-semibold">Password default: {settings.gmailDefaultPassword || 'sgsg1122'}</span>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddBulkModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingStock || !bulkInputText.trim()}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {savingStock ? 'Mengimpor...' : 'Import Semua Akun'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL EDIT / UBAH AKUN GMAIL */}
        {editingStockItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-indigo-600" />
                  <span>Ubah Data Akun Stok</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingStockItem(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateStockItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Email Gmail *
                  </label>
                  <input
                    type="email"
                    required
                    value={editStockEmail}
                    onChange={(e) => setEditStockEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Password Akun
                  </label>
                  <input
                    type="text"
                    required
                    value={editStockPass}
                    onChange={(e) => setEditStockPass(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Status Akun
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditStockStatus('available')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        editStockStatus === 'available'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      ✓ Tersedia (Fresh)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditStockStatus('used')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                        editStockStatus === 'used'
                          ? 'bg-slate-200 text-slate-800 border-slate-400'
                          : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      Terpakai
                    </button>
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingStockItem(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingStock}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
                  >
                    {savingStock ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* MODAL KONFIRMASI AKSI STOK (HAPUS / KOSONGKAN / BERSIHKAN) */}
        {stockConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                    stockConfirm.confirmColor === 'red'
                      ? 'bg-rose-100 text-rose-600'
                      : stockConfirm.confirmColor === 'amber'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}
                >
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {stockConfirm.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {stockConfirm.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  disabled={isConfirmingAction}
                  onClick={() => setStockConfirm(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isConfirmingAction}
                  onClick={handleExecuteConfirm}
                  className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50 ${
                    stockConfirm.confirmColor === 'red'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                      : stockConfirm.confirmColor === 'amber'
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                  }`}
                >
                  {isConfirmingAction ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Memproses...</span>
                    </>
                  ) : (
                    <span>{stockConfirm.confirmText}</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* MODAL EDIT / TAMBAH SALDO USER */}
        {balanceModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Kelola Saldo Pengguna</h3>
                    <p className="text-[11px] text-slate-500 truncate max-w-[240px]">
                      {balanceModalUser.displayName} ({balanceModalUser.email})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBalanceModalUser(null)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveUserBalance} className="mt-4 space-y-4">
                {/* Mode Selector: Tambah Saldo (+) vs Ubah / Set Saldo (=) */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setBalanceMode('add');
                      setBalanceAmountInput('');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      balanceMode === 'add'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Saldo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBalanceMode('set');
                      setBalanceAmountInput(String(balanceModalUser.balance || 0));
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      balanceMode === 'set'
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Ubah/Set Saldo</span>
                  </button>
                </div>

                {/* Current Balance Display */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Saldo Saat Ini:</span>
                  <strong className="text-blue-700 font-extrabold text-sm">
                    {formatRupiah(balanceModalUser.balance || 0)}
                  </strong>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {balanceMode === 'add'
                      ? 'Nominal yang Ingin Ditambahkan (Rp):'
                      : 'Nominal Saldo Baru (Rp):'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      required
                      placeholder="Contoh: 10000"
                      value={balanceAmountInput}
                      onChange={(e) => setBalanceAmountInput(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Preset Cepat:</span>
                  {[2000, 5000, 10000, 25000, 50000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        if (balanceMode === 'add') {
                          setBalanceAmountInput(String(val));
                        } else {
                          setBalanceAmountInput(String((balanceModalUser.balance || 0) + val));
                        }
                      }}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[11px] font-bold border border-slate-200 transition"
                    >
                      +{formatRupiah(val).replace('Rp ', '')}
                    </button>
                  ))}
                </div>

                {/* Calculation Preview */}
                {balanceAmountInput && !isNaN(parseInt(balanceAmountInput, 10)) && (
                  <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs space-y-1">
                    <div className="flex justify-between text-slate-600">
                      <span>Estimasi Saldo Baru:</span>
                      <strong className="text-indigo-900 font-black text-sm">
                        {formatRupiah(
                          balanceMode === 'add'
                            ? (balanceModalUser.balance || 0) + parseInt(balanceAmountInput, 10)
                            : parseInt(balanceAmountInput, 10)
                        )}
                      </strong>
                    </div>
                  </div>
                )}

                {/* Include Total Earned Checkbox (only when adding balance) */}
                {balanceMode === 'add' && (
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeTotalEarned}
                      onChange={(e) => setIncludeTotalEarned(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span>Tambahkan juga ke <strong>Total Penghasilan (Total Earned)</strong></span>
                  </label>
                )}

                {/* Submit & Cancel Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={savingBalance}
                    onClick={() => setBalanceModalUser(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingBalance || !balanceAmountInput}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
                  >
                    {savingBalance ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Simpan Saldo</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
