import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { UserProfile, Submission, Withdrawal, NavigationTab } from '../types';
import { formatRupiah } from '../lib/utils';
import { collection, onSnapshot, doc, updateDoc, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { processReferralOnSubmissionAccepted } from '../lib/referralHelper';
import { subscribeDataChange } from '../lib/syncHelper';

// Modular Admin Components
import { AdminSidebar, AdminMenuTab } from '../components/admin/AdminSidebar';
import { AdminDashboardTab } from '../components/admin/AdminDashboardTab';
import { AdminBatchTab } from '../components/admin/AdminBatchTab';
import { AdminPendinganCekAdminTab } from '../components/admin/AdminPendinganCekAdminTab';
import { AdminPendinganTab } from '../components/admin/AdminPendinganTab';
import { AdminSettingsTab } from '../components/admin/AdminSettingsTab';
import { AdminUsersTab } from '../components/admin/AdminUsersTab';
import { AdminOrderDetailModal } from '../components/AdminOrderDetailModal';
import { AdminUserDetailModal } from '../components/admin/AdminUserDetailModal';
import { AdminStockGeneratorTab } from '../components/admin/AdminStockGeneratorTab';
import { AdminAllSaklarTab } from '../components/admin/AdminAllSaklarTab';
import { getSubmissionStor } from '../components/admin/adminUtils';

// Modals
import { AdminBulkCheckModal } from '../components/AdminBulkCheckModal';
import { AdminBulkConfirmModal } from '../components/AdminBulkConfirmModal';
import { AdminBulkRejectModal } from '../components/AdminBulkRejectModal';
import {
  Menu,
  ShieldCheck,
  X,
  MessageSquareWarning,
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
  const [activeTab, setActiveTab] = useState<AdminMenuTab>('dashboard');

  // Sidebar responsive & desktop collapsible state
  // Ketika mode desktop, garis 3 di panel admin nya otomatis ke buka dan bisa di tutup kembali
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Firestore Realtime Collections
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [submissionsList, setSubmissionsList] = useState<Submission[]>([]);
  const [withdrawalsList, setWithdrawalsList] = useState<Withdrawal[]>([]);
  const [stockCount, setStockCount] = useState<number>(0);

  // Processing state
  const [processingSubId, setProcessingSubId] = useState<string | null>(null);
  const [processingWithId, setProcessingWithId] = useState<string | null>(null);

  // Modals state
  const [detailModalSub, setDetailModalSub] = useState<Submission | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserProfile | null>(null);
  const [showBulkCheckModal, setShowBulkCheckModal] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);
  const [showBulkRejectModal, setShowBulkRejectModal] = useState(false);
  const [bulkPasswordMode, setBulkPasswordMode] = useState<'ALL' | 'zero1122' | 'prabujaya'>('ALL');

  // Single Reject Modal with MANUAL REASON
  const [rejectModalSub, setRejectModalSub] = useState<Submission | null>(null);
  const [rejectionReason, setRejectionReason] = useState(PRESET_REASONS[0]);

  // Balance Modal
  const [balanceModalUser, setBalanceModalUser] = useState<UserProfile | null>(null);
  const [balanceMode, setBalanceMode] = useState<'add' | 'set'>('add');
  const [balanceAmountInput, setBalanceAmountInput] = useState<string>('');
  const [savingBalance, setSavingBalance] = useState<boolean>(false);

  // Withdrawal Reject Modal
  const [rejectModalWith, setRejectModalWith] = useState<Withdrawal | null>(null);
  const [withRejectionReason, setWithRejectionReason] = useState('Nomor rekening/e-wallet tidak valid');

  // Realtime listeners
  useEffect(() => {
    if (!isAdmin || !currentUser) return;

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const uList: UserProfile[] = [];
        snap.forEach((d) => uList.push(d.data() as UserProfile));
        setUsersList(uList);
      },
      (err) => {
        console.warn('Realtime users listener notice:', err);
      }
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
      (err) => {
        console.warn('Realtime submissions listener notice:', err);
      }
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
      (err) => {
        console.warn('Realtime withdrawals listener notice:', err);
      }
    );

    const unsubStock = onSnapshot(
      collection(db, 'gmail_stock'),
      (snap) => {
        setStockCount(snap.size);
      },
      (err) => {
        console.warn('Realtime stock count notice:', err);
      }
    );

    const unsubSync = subscribeDataChange(() => {});

    return () => {
      unsubUsers();
      unsubSubs();
      unsubWiths();
      unsubStock();
      unsubSync();
    };
  }, [isAdmin, currentUser]);

  // Counts for sidebar badges
  const sidebarCounts = useMemo(() => {
    const activeSwitches = [
      settings.generatorOpen !== false,
      settings.storanOpen !== false,
      settings.storanPassword1Open !== false,
      settings.storanPassword2Open !== false,
      settings.withdrawalOpen !== false,
      settings.withdrawalDanaOpen !== false,
      settings.withdrawalGopayOpen !== false,
    ].filter(Boolean).length;

    return {
      users: usersList.length,
      batch: submissionsList.length,
      cekAdmin: submissionsList.filter((s) => s.status === 'Cek Admin').length,
      pending: submissionsList.filter((s) => s.status === 'Pending').length,
      withdrawals: withdrawalsList.filter((w) => w.status === 'Pending').length,
      generatorStock: stockCount,
      activeSwitches,
    };
  }, [usersList, submissionsList, withdrawalsList, stockCount, settings]);

  // Handlers
  const handleCheckSubmission = async (sub: Submission) => {
    if (sub.status === 'Diterima' || sub.status === 'Ditolak') return;
    setProcessingSubId(sub.id);
    try {
      await updateDoc(doc(db, 'submissions', sub.id), {
        status: 'Cek Admin',
        checkedAt: new Date().toISOString(),
      });
      showToast('info', 'Status: Cek Admin', `Akun ${sub.dataContent.split('|')[0].trim()} dipindahkan ke Cek Admin.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleAcceptSubmission = async (sub: Submission) => {
    if (sub.status === 'Diterima' || sub.status === 'Ditolak') return;
    setProcessingSubId(sub.id);
    try {
      await runTransaction(db, async (transaction) => {
        const subRef = doc(db, 'submissions', sub.id);
        const userRef = doc(db, 'users', sub.userId);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists()) {
          throw new Error('Data profil user pengirim tidak ditemukan.');
        }

        const userData = userDoc.data() as UserProfile;
        const reward = sub.rewardAmount || 3000;
        const currentBalance = userData.balance || 0;
        const currentEarned = userData.totalEarned || 0;

        transaction.update(userRef, {
          balance: currentBalance + reward,
          totalEarned: currentEarned + reward,
        });

        transaction.update(subRef, {
          status: 'Diterima',
          reviewedAt: new Date().toISOString(),
        });
      });

      try {
        await processReferralOnSubmissionAccepted(sub.userId, sub.id);
      } catch (refErr) {
        console.warn('Referral bonus processing skipped:', refErr);
      }

      showToast('success', 'Order Diterima', `Akun ${sub.dataContent.split('|')[0].trim()} diterima dan saldo bertambah.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal Menerima', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingSubId(null);
    }
  };

  // Konfirmasi tolak dengan ALASAN MANUAL / BEBAS
  const handleConfirmRejectSubmission = async () => {
    if (!rejectModalSub || !rejectionReason.trim()) {
      showToast('warning', 'Alasan Wajib', 'Masukkan atau pilih alasan penolakan.');
      return;
    }
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
      showToast('info', 'Order Ditolak', `Akun berhasil ditolak dengan alasan: "${rejectionReason.trim()}".`);
      setRejectModalSub(null);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleResetToPending = async (sub: Submission) => {
    setProcessingSubId(sub.id);
    try {
      await updateDoc(doc(db, 'submissions', sub.id), {
        status: 'Pending',
      });
      showToast('info', 'Status Direset', `Order ${sub.dataContent.split('|')[0].trim()} dikembalikan ke status Pending.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingSubId(null);
    }
  };

  const handleMarkWithdrawalPaid = async (withItem: Withdrawal) => {
    if (withItem.status !== 'Pending') return;
    setProcessingWithId(withItem.id);
    try {
      const withRef = doc(db, 'withdrawals', withItem.id);
      const userRef = doc(db, 'users', withItem.userId);

      await runTransaction(db, async (transaction) => {
        const uDoc = await transaction.get(userRef);
        const wDoc = await transaction.get(withRef);
        if (!wDoc.exists()) throw new Error('Penarikan tidak ditemukan');
        if (wDoc.data().status !== 'Pending') throw new Error('Sudah diproses');

        let pendingWd = 0;
        let totalWd = 0;
        if (uDoc.exists()) {
          const uData = uDoc.data() as UserProfile;
          pendingWd = Math.max(0, (uData.pendingWithdrawn || 0) - withItem.amount);
          totalWd = (uData.totalWithdrawn || 0) + withItem.amount;
          transaction.update(userRef, {
            pendingWithdrawn: pendingWd,
            totalWithdrawn: totalWd,
          });
        }

        transaction.update(withRef, {
          status: 'Selesai',
          completedAt: new Date().toISOString(),
        });
      });

      showToast('success', 'Transfer Berhasil', `Penarikan ${formatRupiah(withItem.amount)} ditandai Selesai.`);
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
        const uDoc = await transaction.get(userRef);
        if (uDoc.exists()) {
          const uData = uDoc.data() as UserProfile;
          const currentBal = uData.balance || 0;
          const currentPending = uData.pendingWithdrawn || 0;
          transaction.update(userRef, {
            balance: currentBal + rejectModalWith.amount,
            pendingWithdrawn: Math.max(0, currentPending - rejectModalWith.amount),
          });
        }

        transaction.update(withRef, {
          status: 'Ditolak',
          rejectionReason: withRejectionReason.trim(),
          completedAt: new Date().toISOString(),
        });
      });

      showToast('info', 'Penarikan Ditolak', `Saldo ${formatRupiah(rejectModalWith.amount)} telah dikembalikan.`);
      setRejectModalWith(null);
    } catch (err: unknown) {
      showToast('error', 'Gagal', err instanceof Error ? err.message : String(err));
    } finally {
      setProcessingWithId(null);
    }
  };

  const handleSaveBalance = async () => {
    if (!balanceModalUser) return;
    const amountNum = parseInt(balanceAmountInput, 10);
    if (isNaN(amountNum) || amountNum < 0) {
      showToast('warning', 'Nominal Tidak Valid', 'Masukkan nominal angka yang valid');
      return;
    }
    setSavingBalance(true);
    try {
      const userRef = doc(db, 'users', balanceModalUser.uid);
      const newBal = balanceMode === 'add' ? (balanceModalUser.balance || 0) + amountNum : amountNum;
      await updateDoc(userRef, { balance: newBal });
      showToast('success', 'Saldo Berhasil Diubah', `Saldo ${balanceModalUser.displayName} diubah menjadi ${formatRupiah(newBal)}`);
      setBalanceModalUser(null);
    } catch (err: unknown) {
      showToast('error', 'Gagal Mengubah Saldo', err instanceof Error ? err.message : String(err));
    } finally {
      setSavingBalance(false);
    }
  };

  const handleToggleSuspendUser = async (user: UserProfile) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const nextStatus = user.status === 'suspended' ? 'active' : 'suspended';
      await updateDoc(userRef, { status: nextStatus });
      showToast(nextStatus === 'suspended' ? 'warning' : 'success', 'Status Berubah', `Akun ${user.displayName} diubah menjadi ${nextStatus}.`);
    } catch (err: unknown) {
      showToast('error', 'Gagal Mengubah Status', err instanceof Error ? err.message : String(err));
    }
  };

  // Toggle button hamburger (garis 3) di desktop maupun mobile
  const handleToggleHamburger = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsDesktopSidebarOpen((prev) => !prev);
    } else {
      setIsMobileSidebarOpen((prev) => !prev);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Akses Dibatasi</h2>
        <p className="text-xs text-slate-500 max-w-sm">
          Akun Anda ({currentUser?.email}) bukan akun administrator terdaftar di AZYX19.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F4F6FB] text-slate-900 font-sans -mx-3.5 sm:-mx-4 md:-mx-6 -my-3 sm:-my-4">
      {/* 1. SIDEBAR ADMIN GELAP (Otomatis Buka di Desktop & Bisa Ditutup/Dibuka Kembali) */}
      <AdminSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={sidebarCounts}
        onBackToApp={() => onNavigate('home')}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isDesktopOpen={isDesktopSidebarOpen}
        onToggleDesktop={() => setIsDesktopSidebarOpen(false)}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Top Navbar dengan Garis 3 yang bisa diklik di Desktop & Mobile */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Tombol Garis 3 (Hamburger): Buka/Tutup di Desktop dan Mobile */}
            <button
              type="button"
              onClick={handleToggleHamburger}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer active:scale-95 flex items-center justify-center shadow-2xs"
              title={isDesktopSidebarOpen ? 'Tutup Sidebar' : 'Buka Sidebar'}
              aria-label="Toggle Sidebar"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 capitalize">
                {activeTab === 'all_saklar'
                  ? 'Pusat Kendali All Saklar'
                  : activeTab === 'batch'
                  ? 'Batch & Penjualan'
                  : activeTab === 'cek_admin'
                  ? 'Pendingan All Cek Admin'
                  : activeTab === 'pendingan'
                  ? 'Pendingan'
                  : activeTab === 'generator_stock'
                  ? 'All Stok Generator'
                  : activeTab === 'users'
                  ? 'Kelola Akun Freelancer'
                  : activeTab === 'pengaturan'
                  ? 'Pengaturan & Payouts'
                  : 'Dashboard Admin'}
              </h2>
              <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                Platform Freelance Storan Akun Gmail AZYX19
              </span>
            </div>
          </div>

          {/* Quick System Indicators */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs">
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  settings.storanOpen !== false
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                STOR: {settings.storanOpen !== false ? 'BUKA (1 SAKLAR)' : 'TUTUP'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  settings.generatorOpen !== false
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                GEN: {settings.generatorOpen !== false ? 'BUKA' : 'TUTUP'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
              A
            </div>
          </div>
        </header>

        {/* Dynamic Content Views */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'dashboard' && (
            <AdminDashboardTab
              submissions={submissionsList}
              withdrawals={withdrawalsList}
              users={usersList}
              settings={settings}
              onNavigateToTab={(t) => setActiveTab(t)}
              onOpenDetailModal={(sub) => setDetailModalSub(sub)}
            />
          )}

          {activeTab === 'all_saklar' && (
            <AdminAllSaklarTab
              settings={settings}
              onUpdateSettings={updateSettings}
            />
          )}

          {activeTab === 'users' && (
            <AdminUsersTab
              users={usersList}
              onOpenBalanceModal={(user, mode) => {
                setBalanceModalUser(user);
                setBalanceMode(mode);
                setBalanceAmountInput('');
              }}
              onToggleSuspendUser={handleToggleSuspendUser}
              onSelectUserDetail={(u) => setSelectedUserDetail(u)}
            />
          )}

          {activeTab === 'batch' && (
            <AdminBatchTab
              submissions={submissionsList}
              settings={settings}
              onUpdateSettings={updateSettings}
              onOpenBulkCheckModal={(mode) => {
                setBulkPasswordMode(mode || 'ALL');
                setShowBulkCheckModal(true);
              }}
              onOpenBulkConfirmModal={(mode) => {
                setBulkPasswordMode(mode || 'ALL');
                setShowBulkConfirmModal(true);
              }}
              onOpenBulkRejectModal={(mode) => {
                setBulkPasswordMode(mode || 'ALL');
                setShowBulkRejectModal(true);
              }}
              onAcceptSubmission={handleAcceptSubmission}
              onCheckSubmission={handleCheckSubmission}
              onRejectSubmission={(sub) => {
                setRejectModalSub(sub);
                setRejectionReason(PRESET_REASONS[0]);
              }}
              onOpenDetailModal={(sub) => setDetailModalSub(sub)}
              processingSubId={processingSubId}
            />
          )}

          {activeTab === 'cek_admin' && (
            <AdminPendinganCekAdminTab
              submissions={submissionsList}
              onAcceptSubmission={handleAcceptSubmission}
              onRejectSubmission={(sub) => {
                setRejectModalSub(sub);
                setRejectionReason(PRESET_REASONS[0]);
              }}
              onResetToPending={handleResetToPending}
              onOpenDetailModal={(sub) => setDetailModalSub(sub)}
              processingSubId={processingSubId}
            />
          )}

          {activeTab === 'pendingan' && (
            <AdminPendinganTab
              submissions={submissionsList}
              onCheckSubmission={handleCheckSubmission}
              onAcceptSubmission={handleAcceptSubmission}
              onRejectSubmission={(sub) => {
                setRejectModalSub(sub);
                setRejectionReason(PRESET_REASONS[0]);
              }}
              onOpenDetailModal={(sub) => setDetailModalSub(sub)}
              processingSubId={processingSubId}
            />
          )}

          {/* TAB ALL STOK GENERATOR */}
          {activeTab === 'generator_stock' && (
            <AdminStockGeneratorTab
              settings={settings}
              onUpdateSettings={updateSettings}
            />
          )}

          {activeTab === 'pengaturan' && (
            <AdminSettingsTab
              settings={settings}
              onUpdateSettings={updateSettings}
              withdrawals={withdrawalsList}
              onMarkWithdrawalPaid={handleMarkWithdrawalPaid}
              onRejectWithdrawal={(w) => {
                setRejectModalWith(w);
                setWithRejectionReason('Nomor rekening/e-wallet tidak valid');
              }}
              processingWithId={processingWithId}
            />
          )}
        </main>
      </div>

      {/* 3. MODAL DETAIL ORDER */}
      <AdminOrderDetailModal
        isOpen={Boolean(detailModalSub)}
        onClose={() => setDetailModalSub(null)}
        submission={detailModalSub}
        storName={detailModalSub ? getSubmissionStor(detailModalSub) : 'STOR 1'}
        onProcessToCekAdmin={handleCheckSubmission}
        onConfirmAccept={handleAcceptSubmission}
        onReject={(sub) => {
          setRejectModalSub(sub);
          setRejectionReason(PRESET_REASONS[0]);
        }}
        onResetToPending={handleResetToPending}
        processing={Boolean(processingSubId)}
      />

      {/* 4. MODAL DETAIL AKUN USER (ADMIN BISA LIHAT AKUN USER) */}
      <AdminUserDetailModal
        isOpen={Boolean(selectedUserDetail)}
        onClose={() => setSelectedUserDetail(null)}
        user={selectedUserDetail}
        submissions={submissionsList}
        withdrawals={withdrawalsList}
        onOpenBalanceModal={(user, mode) => {
          setBalanceModalUser(user);
          setBalanceMode(mode);
          setBalanceAmountInput('');
        }}
        onToggleSuspendUser={handleToggleSuspendUser}
      />

      {/* 5. BULK MODALS */}
      <AdminBulkCheckModal
        isOpen={showBulkCheckModal}
        onClose={() => setShowBulkCheckModal(false)}
        submissions={submissionsList}
        initialPasswordMode={bulkPasswordMode}
      />
      <AdminBulkConfirmModal
        isOpen={showBulkConfirmModal}
        onClose={() => setShowBulkConfirmModal(false)}
        submissions={submissionsList}
        initialPasswordMode={bulkPasswordMode}
      />
      <AdminBulkRejectModal
        isOpen={showBulkRejectModal}
        onClose={() => setShowBulkRejectModal(false)}
        submissions={submissionsList}
        initialPasswordMode={bulkPasswordMode}
      />

      {/* 6. SINGLE REJECT MODAL WITH MANUAL REASON (KALO MENOLAK, SATU-SATU BISA ALASAN MANUAL) */}
      <AnimatePresence>
        {rejectModalSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <MessageSquareWarning className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Tolak Order Akun Gmail</h3>
                    <p className="text-[11px] text-slate-500">Tuliskan alasan penolakan untuk freelancer</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalSub(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Akun Gmail:</span>
                <strong className="font-mono text-slate-900 text-sm">
                  {rejectModalSub.dataContent.split('|')[0].trim()}
                </strong>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  User: {rejectModalSub.userName || rejectModalSub.userEmail}
                </div>
              </div>

              {/* Ketik Alasan Manual */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                  <span>Alasan Penolakan (Ketik Bebas / Manual):</span>
                  <span className="text-rose-600 text-[10px] font-bold">*Wajib</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ketik alasan manual di sini (contoh: Sandi salah, meminta verifikasi HP nomor 0812..., atau akun dinonaktifkan Google)..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-none bg-white shadow-2xs leading-relaxed"
                />
              </div>

              {/* Template Cepat */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">
                  Atau Pilih Template Cepat:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                  {PRESET_REASONS.map((r, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setRejectionReason(r)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        rejectionReason === r
                          ? 'bg-rose-100 text-rose-800 border-rose-300 font-bold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalSub(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejectSubmission}
                  disabled={Boolean(processingSubId) || !rejectionReason.trim()}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shadow-md shadow-rose-500/20"
                >
                  {processingSubId ? 'Memproses...' : 'Tolak Sekarang'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. BALANCE MODAL */}
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
                <h3 className="text-base font-bold text-slate-900">Ubah Saldo Freelancer</h3>
                <button
                  type="button"
                  onClick={() => setBalanceModalUser(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-slate-600">
                User: <strong>{balanceModalUser.displayName}</strong> ({balanceModalUser.email})
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setBalanceMode('add')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    balanceMode === 'add' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  Tambah Saldo (+)
                </button>
                <button
                  type="button"
                  onClick={() => setBalanceMode('set')}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
                    balanceMode === 'set' ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  Tetapkan Saldo (=)
                </button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Nominal Rupiah (Rp):</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="Contoh: 15000"
                  value={balanceAmountInput}
                  onChange={(e) => setBalanceAmountInput(e.target.value)}
                  className="w-full p-2.5 text-xs font-mono font-bold rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setBalanceModalUser(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveBalance}
                  disabled={savingBalance}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  {savingBalance ? 'Menyimpan...' : 'Simpan Saldo'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. WITHDRAWAL REJECT MODAL */}
      <AnimatePresence>
        {rejectModalWith && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Tolak Permohonan Penarikan</h3>
                <button
                  type="button"
                  onClick={() => setRejectModalWith(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="text-xs text-slate-600">
                User: <strong>{rejectModalWith.userName}</strong> &bull; Nominal: <strong>{formatRupiah(rejectModalWith.amount)}</strong>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Alasan Penolakan (Manual):</label>
                <input
                  type="text"
                  value={withRejectionReason}
                  onChange={(e) => setWithRejectionReason(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalWith(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejectWithdrawal}
                  disabled={Boolean(processingWithId)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                >
                  Tolak &amp; Kembalikan Saldo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
